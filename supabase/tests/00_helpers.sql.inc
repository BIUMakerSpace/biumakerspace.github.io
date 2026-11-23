-- Shared test helpers, \ir-included by each test file (not run on its own).
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

-- Create an auth user (the on_auth_user_created trigger adds profile + 'user' role).
CREATE FUNCTION pg_temp.make_user(p_email TEXT, p_name TEXT, p_admin BOOLEAN DEFAULT false)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
  VALUES (v_id, p_email, jsonb_build_object('full_name', p_name), 'authenticated', 'authenticated');
  IF p_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_id, 'admin');
  END IF;
  RETURN v_id;
END $$;

-- Act as a signed-in API user for the rest of the transaction (or until as_postgres()).
CREATE FUNCTION pg_temp.as_user(p_uid UUID) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::TEXT, true);
  PERFORM set_config('role', 'authenticated', true);
END $$;

CREATE FUNCTION pg_temp.as_postgres() RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);
END $$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pg_temp TO authenticated;
