-- Signed-out visitors (anon) only ever read: no policy lets them write. Remove write
-- privileges so a too-broad policy added later still can't open writes.
DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM anon', t);
  END LOOP;
END $$;
