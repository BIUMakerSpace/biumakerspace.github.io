-- Security and integrity hardening on top of the baseline.
--
-- Convention: guard triggers are SECURITY INVOKER and only restrict callers whose
-- current_user is an API role ('anon' / 'authenticated'). SECURITY DEFINER RPCs
-- below run as the function owner, so the RPCs are the sanctioned path for
-- privileged state changes (inventory moves, author names, request creation).

CREATE FUNCTION public.is_api_role()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT current_user IN ('anon', 'authenticated')
$$;

-- ============================================================================
-- 1. Request statuses are a closed set
-- ============================================================================

ALTER TABLE public.print_requests ADD CONSTRAINT print_requests_status_check
  CHECK (status IN ('pending', 'approved', 'printing', 'ready', 'completed', 'rejected', 'cancelled'));
ALTER TABLE public.lend_requests ADD CONSTRAINT lend_requests_status_check
  CHECK (status IN ('pending', 'approved', 'delivered', 'returned', 'rejected', 'cancelled'));
ALTER TABLE public.item_requests ADD CONSTRAINT item_requests_status_check
  CHECK (status IN ('pending', 'approved', 'ordered', 'received', 'rejected'));

-- ============================================================================
-- 2. Users can't create requests in a privileged state or edit admin fields
-- ============================================================================

CREATE FUNCTION public.guard_request_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_status TEXT;
BEGIN
  IF NOT public.is_api_role() THEN
    RETURN NEW;
  END IF;
  v_is_admin := public.has_role(auth.uid(), 'admin');

  IF TG_OP = 'INSERT' THEN
    IF NOT v_is_admin THEN
      NEW.status := 'pending';
      NEW.admin_notes := NULL;
    END IF;
    IF TG_TABLE_NAME = 'lend_requests' THEN
      IF NEW.status IN ('delivered', 'returned') THEN
        RAISE EXCEPTION 'Lend requests start as pending or approved; use deliver_lend_request()';
      END IF;
      NEW.delivered_at := NULL;
      NEW.returned_at := NULL;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF TG_TABLE_NAME = 'lend_requests' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND (NEW.status IN ('delivered', 'returned') OR OLD.status = 'delivered') THEN
      RAISE EXCEPTION 'Use deliver_lend_request() / return_lend_request() to change delivery state';
    END IF;
    NEW.delivered_at := OLD.delivered_at;
    NEW.returned_at := OLD.returned_at;
  END IF;

  IF NOT v_is_admin THEN
    -- RLS only lets owners cancel a pending request; make sure nothing else changes with it.
    v_status := NEW.status;
    NEW := OLD;
    NEW.status := v_status;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_request_write BEFORE INSERT OR UPDATE ON public.print_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_request_write();
CREATE TRIGGER guard_request_write BEFORE INSERT OR UPDATE ON public.lend_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_request_write();
CREATE TRIGGER guard_request_write BEFORE INSERT OR UPDATE ON public.item_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_request_write();

-- ============================================================================
-- 3. Catalog items are archived, not deleted, once they have lending history
-- ============================================================================

ALTER TABLE public.catalog_items ADD COLUMN archived_at TIMESTAMPTZ;

ALTER TABLE public.lend_request_items
  DROP CONSTRAINT lend_request_items_item_id_fkey,
  ADD CONSTRAINT lend_request_items_item_id_fkey
    FOREIGN KEY (item_id) REFERENCES public.catalog_items(id) ON DELETE RESTRICT;

ALTER TABLE public.lend_request_items
  ADD CONSTRAINT lend_request_items_quantity_check CHECK (quantity > 0);

CREATE INDEX idx_lend_request_items_request ON public.lend_request_items(request_id);
CREATE INDEX idx_lend_request_items_item ON public.lend_request_items(item_id);

-- ============================================================================
-- 4. Lend requests are created atomically through RPCs
-- ============================================================================

-- Direct inserts are replaced by create_lend_request() / admin_create_lend_request().
DROP POLICY "Users create own lend requests" ON public.lend_requests;
DROP POLICY "Admins create lend requests" ON public.lend_requests;
DROP POLICY "Users insert own lend items" ON public.lend_request_items;
DROP POLICY "Admins insert lend items" ON public.lend_request_items;

-- Shared by both creation RPCs. p_items: [{"item_id": uuid, "quantity": int}, ...]
CREATE FUNCTION public._insert_lend_request(
  p_user_id UUID,
  p_status TEXT,
  p_requester_name TEXT,
  p_requester_email TEXT,
  p_requester_phone TEXT,
  p_notes TEXT,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id UUID;
  v_item RECORD;
  v_catalog public.catalog_items;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'יש לבחור לפחות פריט אחד';
  END IF;

  INSERT INTO public.lend_requests
    (user_id, status, requester_name, requester_email, requester_phone, notes)
  VALUES
    (p_user_id, p_status, p_requester_name, p_requester_email, p_requester_phone, NULLIF(btrim(p_notes), ''))
  RETURNING id INTO v_request_id;

  FOR v_item IN
    SELECT (e ->> 'item_id')::UUID AS item_id, (e ->> 'quantity')::INTEGER AS quantity
    FROM jsonb_array_elements(p_items) AS e
  LOOP
    IF v_item.item_id IS NULL OR v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'כמות לא תקינה';
    END IF;

    SELECT * INTO v_catalog FROM public.catalog_items WHERE id = v_item.item_id;
    IF v_catalog.id IS NULL OR v_catalog.archived_at IS NOT NULL THEN
      RAISE EXCEPTION 'פריט לא קיים בקטלוג';
    END IF;
    IF v_item.quantity > v_catalog.quantity_available THEN
      RAISE EXCEPTION 'אין מספיק מלאי עבור "%" (זמין: %)', v_catalog.name, v_catalog.quantity_available;
    END IF;

    INSERT INTO public.lend_request_items (request_id, item_id, quantity)
    VALUES (v_request_id, v_item.item_id, v_item.quantity);
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM public.lend_request_items
    WHERE request_id = v_request_id
    GROUP BY item_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'פריט מופיע יותר מפעם אחת בבקשה';
  END IF;

  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public._insert_lend_request(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.create_lend_request(
  p_requester_name TEXT,
  p_requester_email TEXT,
  p_requester_phone TEXT,
  p_notes TEXT,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF coalesce(btrim(p_requester_name), '') = ''
     OR coalesce(btrim(p_requester_email), '') = ''
     OR coalesce(btrim(p_requester_phone), '') = '' THEN
    RAISE EXCEPTION 'יש למלא שם, אימייל וטלפון';
  END IF;
  RETURN public._insert_lend_request(
    auth.uid(), 'pending', btrim(p_requester_name), btrim(p_requester_email),
    btrim(p_requester_phone), p_notes, p_items
  );
END;
$$;

-- Admin hands equipment to a user directly; the request starts approved and
-- requester details come from the user's profile.
CREATE FUNCTION public.admin_create_lend_request(
  p_user_id UUID,
  p_notes TEXT,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'משתמש לא נמצא';
  END IF;
  RETURN public._insert_lend_request(
    p_user_id, 'approved',
    coalesce(v_profile.full_name, v_profile.email, 'משתמש'),
    coalesce(v_profile.email, ''),
    coalesce(v_profile.phone, ''),
    p_notes, p_items
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_lend_request(TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_create_lend_request(UUID, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_lend_request(TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_lend_request(UUID, TEXT, JSONB) TO authenticated;

-- ============================================================================
-- 5. Deliver / return are atomic RPCs (replace the deliver/return edge functions)
-- ============================================================================

-- p_items: [{"lend_request_item_id": uuid, "picks": [{"source_id": uuid, "quantity": int}, ...]}, ...]
-- Every item of the request must be covered exactly by positive picks.
CREATE FUNCTION public.deliver_lend_request(p_request_id UUID, p_items JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_pick RECORD;
  v_bad RECORD;
  v_item_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT status INTO v_status FROM public.lend_requests WHERE id = p_request_id FOR UPDATE;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'בקשה לא נמצאה';
  END IF;
  IF v_status <> 'approved' THEN
    RAISE EXCEPTION 'ניתן למסור רק בקשה מאושרת (מצב נוכחי: %)', v_status;
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Invalid picks';
  END IF;

  DROP TABLE IF EXISTS _picks;
  CREATE TEMP TABLE _picks ON COMMIT DROP AS
  SELECT (it ->> 'lend_request_item_id')::UUID AS lend_request_item_id,
         (p ->> 'source_id')::UUID AS source_id,
         (p ->> 'quantity')::INTEGER AS quantity
  FROM jsonb_array_elements(p_items) AS it,
       jsonb_array_elements(coalesce(it -> 'picks', '[]'::JSONB)) AS p;

  IF EXISTS (SELECT 1 FROM _picks WHERE quantity IS NULL OR quantity <= 0 OR source_id IS NULL) THEN
    RAISE EXCEPTION 'כמות לא תקינה';
  END IF;
  IF EXISTS (
    SELECT 1 FROM _picks pk
    LEFT JOIN public.lend_request_items lri
      ON lri.id = pk.lend_request_item_id AND lri.request_id = p_request_id
    WHERE lri.id IS NULL
  ) THEN
    RAISE EXCEPTION 'פריט לא שייך לבקשה';
  END IF;

  -- Each request item must be fully covered.
  SELECT lri.quantity AS needed, coalesce(sum(pk.quantity), 0) AS picked, ci.name
  INTO v_bad
  FROM public.lend_request_items lri
  JOIN public.catalog_items ci ON ci.id = lri.item_id
  LEFT JOIN _picks pk ON pk.lend_request_item_id = lri.id
  WHERE lri.request_id = p_request_id
  GROUP BY lri.id, lri.quantity, ci.name
  HAVING coalesce(sum(pk.quantity), 0) <> lri.quantity
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'כמות לא תואמת עבור "%" (נדרש %, נבחר %)', v_bad.name, v_bad.needed, v_bad.picked;
  END IF;

  -- Take stock from each source (merging duplicate picks of the same source).
  FOR v_pick IN
    SELECT lri.item_id, pk.source_id, sum(pk.quantity)::INTEGER AS quantity
    FROM _picks pk
    JOIN public.lend_request_items lri ON lri.id = pk.lend_request_item_id
    GROUP BY lri.item_id, pk.source_id
  LOOP
    UPDATE public.catalog_item_sources
    SET quantity = quantity - v_pick.quantity
    WHERE item_id = v_pick.item_id AND source_id = v_pick.source_id AND quantity >= v_pick.quantity;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'מלאי לא מספיק במקור שנבחר';
    END IF;
  END LOOP;

  INSERT INTO public.lend_request_item_sources (lend_request_item_id, source_id, quantity)
  SELECT lend_request_item_id, source_id, sum(quantity)::INTEGER
  FROM _picks
  GROUP BY lend_request_item_id, source_id;

  UPDATE public.lend_requests
  SET status = 'delivered', delivered_at = now()
  WHERE id = p_request_id;

  -- The sync triggers ran before the status flip; recompute with the final state.
  FOR v_item_id IN SELECT DISTINCT item_id FROM public.lend_request_items WHERE request_id = p_request_id LOOP
    PERFORM public.recompute_catalog_item_quantities(v_item_id);
  END LOOP;
END;
$$;

-- p_overrides: [{"lris_id": uuid, "source_id": uuid}, ...] returns that delivered
-- portion to a different source than it came from (e.g. stored somewhere else now).
CREATE FUNCTION public.return_lend_request(p_request_id UUID, p_overrides JSONB DEFAULT '[]'::JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_item_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT status INTO v_status FROM public.lend_requests WHERE id = p_request_id FOR UPDATE;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'בקשה לא נמצאה';
  END IF;
  IF v_status <> 'delivered' THEN
    RAISE EXCEPTION 'ניתן להחזיר רק בקשה שנמסרה (מצב נוכחי: %)', v_status;
  END IF;

  DROP TABLE IF EXISTS _returns;
  CREATE TEMP TABLE _returns ON COMMIT DROP AS
  SELECT lris.id AS lris_id,
         lri.item_id,
         coalesce(ov.source_id, lris.source_id) AS source_id,
         lris.quantity
  FROM public.lend_request_item_sources lris
  JOIN public.lend_request_items lri ON lri.id = lris.lend_request_item_id
  LEFT JOIN (
    SELECT (o ->> 'lris_id')::UUID AS lris_id, (o ->> 'source_id')::UUID AS source_id
    FROM jsonb_array_elements(coalesce(p_overrides, '[]'::JSONB)) AS o
  ) ov ON ov.lris_id = lris.id
  WHERE lri.request_id = p_request_id;

  IF EXISTS (
    SELECT 1 FROM _returns r LEFT JOIN public.item_sources s ON s.id = r.source_id WHERE s.id IS NULL
  ) THEN
    RAISE EXCEPTION 'מקור לא קיים';
  END IF;

  INSERT INTO public.catalog_item_sources (item_id, source_id, quantity)
  SELECT item_id, source_id, sum(quantity)::INTEGER
  FROM _returns
  GROUP BY item_id, source_id
  ON CONFLICT (item_id, source_id)
  DO UPDATE SET quantity = public.catalog_item_sources.quantity + EXCLUDED.quantity;

  DELETE FROM public.lend_request_item_sources WHERE id IN (SELECT lris_id FROM _returns);

  UPDATE public.lend_requests
  SET status = 'returned', returned_at = now()
  WHERE id = p_request_id;

  FOR v_item_id IN SELECT DISTINCT item_id FROM public.lend_request_items WHERE request_id = p_request_id LOOP
    PERFORM public.recompute_catalog_item_quantities(v_item_id);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.deliver_lend_request(UUID, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.return_lend_request(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deliver_lend_request(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_lend_request(UUID, JSONB) TO authenticated;

-- ============================================================================
-- 6. Author names come from the author's profile, not the client
-- ============================================================================

CREATE FUNCTION public.set_author_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.author_name := OLD.author_name;
    RETURN NEW;
  END IF;
  SELECT coalesce(nullif(btrim(full_name), ''), email, 'מייקר')
  INTO NEW.author_name
  FROM public.profiles WHERE id = NEW.user_id;
  NEW.author_name := coalesce(NEW.author_name, 'מייקר');
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_author_name() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER set_author_name BEFORE INSERT OR UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_author_name();
CREATE TRIGGER set_author_name BEFORE INSERT OR UPDATE ON public.forum_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_author_name();
CREATE TRIGGER set_author_name BEFORE INSERT OR UPDATE ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.set_author_name();

-- author_name is now filled in by the trigger; let clients omit it.
ALTER TABLE public.blog_posts ALTER COLUMN author_name SET DEFAULT '';
ALTER TABLE public.forum_questions ALTER COLUMN author_name SET DEFAULT '';
ALTER TABLE public.forum_replies ALTER COLUMN author_name SET DEFAULT '';

-- ============================================================================
-- 7. Only http(s) links (stops javascript: URLs rendered as <a href> for admins)
-- ============================================================================

ALTER TABLE public.item_requests ADD CONSTRAINT item_requests_reference_link_check
  CHECK (reference_link IS NULL OR reference_link ~* '^https?://\S+$');
ALTER TABLE public.wishlist_items ADD CONSTRAINT wishlist_items_link_check
  CHECK (link IS NULL OR link ~* '^https?://\S+$');

-- ============================================================================
-- 8. Storage limits and naming guardrails
-- ============================================================================

-- No SVG: it can carry script and is served from a public bucket.
UPDATE storage.buckets
SET file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']
WHERE id IN ('catalog-images', 'blog-images');

-- Browsers report many different (or empty) MIME types for .stl files, so only cap the size.
UPDATE storage.buckets SET file_size_limit = 50 * 1024 * 1024 WHERE id = 'stl-files';

-- Admins clean up replaced/archived catalog images and users their cancelled STL files.
CREATE POLICY "Users delete own STL" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'stl-files' AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE UNIQUE INDEX item_sources_name_lower_key ON public.item_sources (lower(name));
