-- Explicit Data API grants.
--
-- Supabase projects created after 2026-05-30 (and every project from 2026-10-30) no longer
-- grant table privileges to the API roles by default: a new table in `public` is invisible to
-- supabase-js until it is granted explicitly, and requests fail with
-- "permission denied for table ...". The earlier migrations were written and tested against
-- the old default (all privileges for anon, authenticated and service_role). This grants what
-- the app needs explicitly, slightly narrower than the old default (see 1). Row-level security
-- is enabled on every table, so the policies still decide which rows each user can read or change.
--
-- Safe to run on projects that still have the old default: re-granting is a no-op.

-- 1. Base tables (all except lockers, whose SELECT stays column-limited, see 2):
--    - anon (signed-out visitors) may only read; no policy lets anon write, so it gets no write
--      privilege either. A future policy written too broadly then still can't open writes.
--    - authenticated may read and write, as far as the policies allow.
--    TRUNCATE is never granted: it bypasses row-level security.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'lockers'
  LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END
$$;

-- 2. lockers: SELECT keeps the column grants from the baseline (no PIN or occupant contact
--    details for API roles); signed-in users get write access as far as the policies allow.
GRANT INSERT, UPDATE, DELETE ON public.lockers TO authenticated;
GRANT ALL ON public.lockers TO service_role;

-- 3. The lockers_status view already has its SELECT grant (baseline); service_role for imports.
GRANT SELECT ON public.lockers_status TO service_role;

-- 4. Sequences (none today; keeps future serial columns working the same way).
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 5. Helper functions that run as the calling user inside triggers and policies. The RPCs the
--    app calls already have explicit grants in earlier migrations.
GRANT EXECUTE ON FUNCTION public.is_api_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.general_category_for(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO service_role;
