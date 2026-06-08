
CREATE OR REPLACE FUNCTION public.get_my_locker()
RETURNS SETOF public.lockers
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT * FROM public.lockers WHERE occupied_by = auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION public.get_my_locker() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_locker() TO authenticated;
