-- Supabase leaves TRUNCATE, REFERENCES, TRIGGER (and MAINTAIN on Postgres 17) on public tables
-- for the API roles even with "Automatically expose new tables" off. The Data API never uses them,
-- and TRUNCATE skips row-level security, so remove them from signed-out and signed-in users.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

DO $$ BEGIN
  IF current_setting('server_version_num')::int >= 170000 THEN
    EXECUTE 'REVOKE MAINTAIN ON ALL TABLES IN SCHEMA public FROM anon, authenticated';
  END IF;
END $$;

-- Tables created by later migrations get none of these either; grant what they need explicitly.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;
