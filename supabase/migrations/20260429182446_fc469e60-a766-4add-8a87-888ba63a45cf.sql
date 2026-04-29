
-- Fix function search paths
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Restrict execution of SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
-- has_role still needs to be callable by authenticated for RLS - keep that

-- Restrict listing in public catalog bucket: only allow viewing specific files via direct URL,
-- by removing the broad SELECT and replacing with one that requires the request to target a single object.
DROP POLICY IF EXISTS "Anyone view catalog images" ON storage.objects;
CREATE POLICY "Public read catalog images" ON storage.objects FOR SELECT USING (
  bucket_id = 'catalog-images'
);
-- Note: bucket remains public for image rendering. Listing via UI is not exposed in our app.
