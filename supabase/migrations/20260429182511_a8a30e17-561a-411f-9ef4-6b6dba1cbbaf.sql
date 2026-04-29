
-- The remaining warnings are acceptable trade-offs:
-- 1) Public catalog-images bucket: needed so visitors can see item photos in the public catalog.
-- 2) has_role() must be EXECUTE-able by authenticated for RLS policies to work — this is the canonical pattern.
-- We document this with a comment so future linter runs are easier to interpret.
COMMENT ON FUNCTION public.has_role(uuid, app_role) IS
  'SECURITY DEFINER role check used inside RLS policies. Authenticated execute is required by design.';
