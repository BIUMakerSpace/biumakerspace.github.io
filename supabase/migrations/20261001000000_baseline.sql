-- Baseline schema for the BIU MakerSpace site.
--
-- Squashed from the 26 Lovable-era migrations (recoverable from git at 8b7d932^).
-- Differences from that history are intentional and marked "FIX:" below:
--   * one inventory-sync trigger per table (the old DB had two of each firing)
--   * the dead lend_status_inventory trigger/function is gone
--   * locker PIN/occupant columns are actually hidden (column REVOKE has no effect
--     while a table-level SELECT grant exists)
--   * claim_locker() works for regular users (the guard trigger used to block it)
--   * has_role() is executable by anon so public policies that mention it don't error

-- ============================================================================
-- Roles & profiles
-- ============================================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- SECURITY DEFINER so RLS policies on user_roles itself don't recurse.
CREATE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

COMMENT ON FUNCTION public.has_role(UUID, public.app_role) IS
  'SECURITY DEFINER role check used inside RLS policies. Execute is required by design.';

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC;
-- FIX: anon too, otherwise policies like "is_active OR has_role(...)" fail for visitors.
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon, authenticated;

CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- Catalog & inventory
-- ============================================================================

CREATE TABLE public.catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  -- Maintained by triggers from catalog_item_sources / lend_request_item_sources.
  quantity_total INT NOT NULL DEFAULT 1,
  quantity_available INT NOT NULL DEFAULT 1,
  category TEXT NOT NULL DEFAULT 'other',
  general_category TEXT NOT NULL DEFAULT 'tools_other',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT catalog_items_category_check CHECK (category = ANY (ARRAY[
    'sensors', 'actuators', 'displays', 'leds', 'input', 'microcontrollers',
    'communication', 'storage_memory', 'passive_components', 'wires_connectors',
    'power', 'tools', 'switches', 'other'
  ])),
  CONSTRAINT catalog_items_general_category_check CHECK (general_category IN (
    'sensors', 'electronics', 'compute', 'connectivity_power', 'tools_other'
  ))
);

CREATE TABLE public.item_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- On-shelf stock of an item per source (on-loan units are not counted here).
CREATE TABLE public.catalog_item_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES public.item_sources(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_id, source_id)
);

CREATE INDEX idx_catalog_item_sources_item ON public.catalog_item_sources(item_id);
CREATE INDEX idx_catalog_item_sources_source ON public.catalog_item_sources(source_id);

CREATE TRIGGER item_sources_updated_at
  BEFORE UPDATE ON public.item_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER catalog_item_sources_updated_at
  BEFORE UPDATE ON public.catalog_item_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_item_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view catalog" ON public.catalog_items
  FOR SELECT USING (true);
CREATE POLICY "Admins manage catalog" ON public.catalog_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated view sources" ON public.item_sources
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage sources" ON public.item_sources
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read catalog_item_sources" ON public.catalog_item_sources
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage item sources" ON public.catalog_item_sources
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- Print requests
-- ============================================================================

CREATE TABLE public.print_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  requester_phone TEXT NOT NULL,
  purpose TEXT NOT NULL,
  filament_color TEXT NOT NULL,
  stl_file_path TEXT NOT NULL,
  stl_file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_print_updated BEFORE UPDATE ON public.print_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.print_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own print requests" ON public.print_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all print requests" ON public.print_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own print requests" ON public.print_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update print requests" ON public.print_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users cancel own pending print requests" ON public.print_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'cancelled');

-- ============================================================================
-- Lend requests
-- ============================================================================

CREATE TABLE public.lend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  requester_phone TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  delivered_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.lend_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.lend_requests(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1
);

-- Which source each delivered unit came from; rows exist only while on loan.
CREATE TABLE public.lend_request_item_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lend_request_item_id UUID NOT NULL REFERENCES public.lend_request_items(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES public.item_sources(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lris_lri ON public.lend_request_item_sources(lend_request_item_id);

CREATE TRIGGER trg_lend_updated BEFORE UPDATE ON public.lend_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.lend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lend_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lend_request_item_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own lend requests" ON public.lend_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all lend requests" ON public.lend_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own lend requests" ON public.lend_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins create lend requests" ON public.lend_requests
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update lend requests" ON public.lend_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users cancel own pending lend requests" ON public.lend_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'cancelled');

CREATE POLICY "Users view own lend items" ON public.lend_request_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.lend_requests lr WHERE lr.id = request_id AND lr.user_id = auth.uid())
  );
CREATE POLICY "Admins view all lend items" ON public.lend_request_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own lend items" ON public.lend_request_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.lend_requests lr WHERE lr.id = request_id AND lr.user_id = auth.uid())
  );
CREATE POLICY "Admins insert lend items" ON public.lend_request_items
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage lend item sources" ON public.lend_request_item_sources
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users read own lend request item sources" ON public.lend_request_item_sources
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.lend_request_items lri
    JOIN public.lend_requests lr ON lr.id = lri.request_id
    WHERE lri.id = lend_request_item_sources.lend_request_item_id
      AND lr.user_id = auth.uid()
  ));

-- ============================================================================
-- Inventory sync: quantity_available = on-shelf units across sources,
-- quantity_total = on-shelf + currently on loan (delivered requests).
-- ============================================================================

CREATE FUNCTION public.recompute_catalog_item_quantities(p_item_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sources INTEGER;
  v_on_loan INTEGER;
BEGIN
  SELECT COALESCE(SUM(quantity), 0) INTO v_sources
  FROM public.catalog_item_sources WHERE item_id = p_item_id;

  SELECT COALESCE(SUM(lris.quantity), 0) INTO v_on_loan
  FROM public.lend_request_item_sources lris
  JOIN public.lend_request_items lri ON lri.id = lris.lend_request_item_id
  JOIN public.lend_requests lr ON lr.id = lri.request_id
  WHERE lri.item_id = p_item_id AND lr.status = 'delivered';

  UPDATE public.catalog_items
  SET quantity_total = v_sources + v_on_loan,
      quantity_available = v_sources
  WHERE id = p_item_id;
END;
$$;

CREATE FUNCTION public.sync_catalog_item_quantities()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recompute_catalog_item_quantities(COALESCE(NEW.item_id, OLD.item_id));
  RETURN NULL;
END;
$$;

CREATE FUNCTION public.sync_after_lris_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_id UUID;
BEGIN
  SELECT item_id INTO v_item_id FROM public.lend_request_items
  WHERE id = COALESCE(NEW.lend_request_item_id, OLD.lend_request_item_id);

  IF v_item_id IS NOT NULL THEN
    PERFORM public.recompute_catalog_item_quantities(v_item_id);
  END IF;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recompute_catalog_item_quantities(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_catalog_item_quantities() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_after_lris_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER catalog_item_sources_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.catalog_item_sources
  FOR EACH ROW EXECUTE FUNCTION public.sync_catalog_item_quantities();

CREATE TRIGGER lend_request_item_sources_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.lend_request_item_sources
  FOR EACH ROW EXECUTE FUNCTION public.sync_after_lris_change();

-- ============================================================================
-- Item requests (users asking the makerspace to buy something)
-- ============================================================================

CREATE TABLE public.item_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  requester_phone TEXT NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  reference_link TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER item_requests_updated_at BEFORE UPDATE ON public.item_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.item_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create own item requests" ON public.item_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own item requests" ON public.item_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all item requests" ON public.item_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update item requests" ON public.item_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- Blog & forum
-- ============================================================================

CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.forum_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.forum_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER blog_posts_updated_at BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER forum_questions_updated_at BEFORE UPDATE ON public.forum_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blog posts" ON public.blog_posts
  FOR SELECT USING (true);
CREATE POLICY "Users create own blog posts" ON public.blog_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own blog posts" ON public.blog_posts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users delete own blog posts" ON public.blog_posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view questions" ON public.forum_questions
  FOR SELECT USING (true);
CREATE POLICY "Users create own questions" ON public.forum_questions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own questions" ON public.forum_questions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users delete own questions" ON public.forum_questions
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view replies" ON public.forum_replies
  FOR SELECT USING (true);
CREATE POLICY "Users create own replies" ON public.forum_replies
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own replies" ON public.forum_replies
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users delete own replies" ON public.forum_replies
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- Admin lookups: filament colors, email templates, wishlist
-- ============================================================================

CREATE TABLE public.filament_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  hex TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  link TEXT,
  created_by UUID,
  estimated_cost NUMERIC,
  quantity_pref TEXT NOT NULL DEFAULT 'one' CHECK (quantity_pref IN ('one', 'few', 'many')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_filament_colors_updated_at BEFORE UPDATE ON public.filament_colors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_email_templates_updated_at BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_wishlist_items_updated_at BEFORE UPDATE ON public.wishlist_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.filament_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active colors" ON public.filament_colors
  FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage colors" ON public.filament_colors
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage email templates" ON public.email_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage wishlist" ON public.wishlist_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- Lockers
-- ============================================================================

CREATE TABLE public.lockers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INTEGER NOT NULL UNIQUE,
  label TEXT,
  occupied_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  occupant_name TEXT,
  occupant_email TEXT,
  pin_code TEXT,
  occupied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER lockers_updated_at BEFORE UPDATE ON public.lockers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- FIX: PIN and occupant columns must be hidden from API roles. A column-level
-- REVOKE is a no-op while a table-level SELECT grant exists (Supabase grants one
-- by default), so drop table-level SELECT and grant only the safe columns.
-- Admins read the sensitive columns via admin_list_lockers(), owners via get_my_locker().
REVOKE SELECT ON public.lockers FROM anon, authenticated;
GRANT SELECT (id, number, label, occupied_by, occupied_at, created_at, updated_at)
  ON public.lockers TO authenticated;
GRANT SELECT (id, number, label, occupied_by, occupied_at) ON public.lockers TO anon;

ALTER TABLE public.lockers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view lockers limited" ON public.lockers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "User releases own locker" ON public.lockers
  FOR UPDATE TO authenticated
  USING (occupied_by = auth.uid())
  WITH CHECK (occupied_by IS NULL OR occupied_by = auth.uid());
CREATE POLICY "Admins manage lockers" ON public.lockers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE VIEW public.lockers_status
  WITH (security_invoker = true) AS
  SELECT id, number, label,
         (occupied_by IS NOT NULL) AS is_occupied,
         occupied_by, occupied_at
  FROM public.lockers;

GRANT SELECT ON public.lockers_status TO authenticated, anon;

-- Direct updates from API roles may only release a locker; claiming goes
-- through claim_locker(). FIX: SECURITY INVOKER so current_user tells us who is
-- calling: inside SECURITY DEFINER RPCs it is the function owner, not
-- 'authenticated', so claim_locker() is no longer blocked by this guard.
CREATE FUNCTION public.lockers_guard_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.occupied_by IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'Use claim_locker() to claim a locker';
  END IF;
  NEW.occupant_name := NULL;
  NEW.occupant_email := NULL;
  NEW.pin_code := NULL;
  NEW.occupied_at := NULL;
  NEW.number := OLD.number;
  NEW.label := OLD.label;
  RETURN NEW;
END;
$$;

CREATE TRIGGER lockers_guard_user_update
  BEFORE UPDATE ON public.lockers
  FOR EACH ROW EXECUTE FUNCTION public.lockers_guard_user_update();

CREATE FUNCTION public.claim_locker(p_number INTEGER, p_pin TEXT)
RETURNS public.lockers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_name TEXT;
  v_email TEXT;
  v_row public.lockers;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_pin IS NULL OR length(btrim(p_pin)) < 3 THEN
    RAISE EXCEPTION 'PIN too short';
  END IF;
  IF EXISTS (SELECT 1 FROM public.lockers WHERE occupied_by = v_user) THEN
    RAISE EXCEPTION 'You already have a locker assigned';
  END IF;

  SELECT full_name, email INTO v_name, v_email
  FROM public.profiles WHERE id = v_user;

  UPDATE public.lockers
  SET occupied_by = v_user,
      occupant_name = COALESCE(v_name, v_email),
      occupant_email = v_email,
      pin_code = btrim(p_pin),
      occupied_at = now()
  WHERE number = p_number AND occupied_by IS NULL
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Locker not available';
  END IF;

  RETURN v_row;
END;
$$;

CREATE FUNCTION public.admin_list_lockers()
RETURNS SETOF public.lockers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY SELECT * FROM public.lockers ORDER BY number;
END;
$$;

CREATE FUNCTION public.get_my_locker()
RETURNS SETOF public.lockers
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY SELECT * FROM public.lockers WHERE occupied_by = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.claim_locker(INTEGER, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_lockers() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_locker() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_locker(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_lockers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_locker() TO authenticated;

-- ============================================================================
-- Storage
-- ============================================================================

INSERT INTO storage.buckets (id, name, public) VALUES
  ('stl-files', 'stl-files', false),
  ('catalog-images', 'catalog-images', true),
  ('blog-images', 'blog-images', true);

-- STL files: private; users write/read their own folder, admins read everything.
CREATE POLICY "Users upload own STL" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'stl-files' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Users read own STL" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'stl-files' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Admins read all STL" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'stl-files' AND public.has_role(auth.uid(), 'admin')
  );

-- Catalog images: public bucket, admins write.
CREATE POLICY "Public read catalog images" ON storage.objects
  FOR SELECT USING (bucket_id = 'catalog-images');
CREATE POLICY "Admins upload catalog images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'catalog-images' AND public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Admins update catalog images" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'catalog-images' AND public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Admins delete catalog images" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'catalog-images' AND public.has_role(auth.uid(), 'admin')
  );

-- Blog images: public bucket (served by public URL, not listable); users manage their own folder.
CREATE POLICY "Users upload own blog images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'blog-images' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Users delete own blog images" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'blog-images' AND auth.uid()::text = (storage.foldername(name))[1]
  );
