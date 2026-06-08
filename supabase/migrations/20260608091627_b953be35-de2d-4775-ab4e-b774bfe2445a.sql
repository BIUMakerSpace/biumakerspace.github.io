
DROP VIEW IF EXISTS public.lockers_status;
CREATE VIEW public.lockers_status
  WITH (security_invoker = true) AS
  SELECT id, number, label,
         (occupied_by IS NOT NULL) AS is_occupied,
         occupied_by, occupied_at
  FROM public.lockers;
GRANT SELECT ON public.lockers_status TO authenticated, anon;

-- Allow everyone signed in to see basic locker status rows via base policy too (view uses invoker rights)
DROP POLICY IF EXISTS "Owner or admin view locker" ON public.lockers;
CREATE POLICY "Authenticated view lockers limited"
  ON public.lockers FOR SELECT
  TO authenticated
  USING (true);

-- Hide sensitive columns at the column-grant level from non-admin users.
-- (Admins use service-role or are checked in app; sensitive columns are only returned to service_role / postgres.)
REVOKE SELECT (pin_code, occupant_email, occupant_name) ON public.lockers FROM authenticated, anon;
GRANT  SELECT (id, number, label, occupied_by, occupied_at, created_at, updated_at)
       ON public.lockers TO authenticated;
GRANT  SELECT (id, number, label, occupied_by, occupied_at) ON public.lockers TO anon;
