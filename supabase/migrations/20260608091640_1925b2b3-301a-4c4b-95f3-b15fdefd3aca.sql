
CREATE OR REPLACE FUNCTION public.admin_list_lockers()
RETURNS SETOF public.lockers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY SELECT * FROM public.lockers ORDER BY number;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_lockers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_lockers() TO authenticated;
