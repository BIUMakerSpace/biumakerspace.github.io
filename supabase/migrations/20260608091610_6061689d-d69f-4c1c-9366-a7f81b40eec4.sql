
-- 1. Lockers: restrict base table SELECT to admins or owner
DROP POLICY IF EXISTS "Authenticated view lockers" ON public.lockers;
CREATE POLICY "Owner or admin view locker"
  ON public.lockers FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR occupied_by = auth.uid());

-- 2. Public status view (no PIN / name / email) for everyone signed in
DROP VIEW IF EXISTS public.lockers_status;
CREATE VIEW public.lockers_status AS
  SELECT id, number, label, (occupied_by IS NOT NULL) AS is_occupied, occupied_by, occupied_at
  FROM public.lockers;
GRANT SELECT ON public.lockers_status TO authenticated, anon;

-- 3. Replace the loose "User claims free locker" UPDATE policy with a SECURITY DEFINER RPC
DROP POLICY IF EXISTS "User claims free locker" ON public.lockers;

CREATE OR REPLACE FUNCTION public.claim_locker(p_number integer, p_pin text)
RETURNS public.lockers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_name text;
  v_email text;
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

REVOKE ALL ON FUNCTION public.claim_locker(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_locker(integer, text) TO authenticated;

-- 4. Tighten the release policy so users can ONLY null out columns (cannot rewrite PIN/name/email to others' values mid-release)
-- existing "User releases own locker" stays; pair with a trigger that on a non-admin user UPDATE forces sensitive cols to NULL
CREATE OR REPLACE FUNCTION public.lockers_guard_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins and service_role bypass this guard
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  -- For everyone else, only allow release (clearing fields)
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

DROP TRIGGER IF EXISTS lockers_guard_user_update ON public.lockers;
CREATE TRIGGER lockers_guard_user_update
  BEFORE UPDATE ON public.lockers
  FOR EACH ROW EXECUTE FUNCTION public.lockers_guard_user_update();

-- 5. Catalog item sources: allow signed-in users to read (catalog UI relies on it)
CREATE POLICY "Authenticated read catalog_item_sources"
  ON public.catalog_item_sources FOR SELECT
  TO authenticated
  USING (true);

-- 6. lend_request_item_sources: allow users to read sources of their own requests
CREATE POLICY "Users read own lend request item sources"
  ON public.lend_request_item_sources FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.lend_request_items lri
    JOIN public.lend_requests lr ON lr.id = lri.request_id
    WHERE lri.id = lend_request_item_sources.lend_request_item_id
      AND lr.user_id = auth.uid()
  ));
