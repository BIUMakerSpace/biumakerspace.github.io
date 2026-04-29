
REVOKE EXECUTE ON FUNCTION public.handle_lend_status_change() FROM PUBLIC, anon, authenticated;

-- Replace broad "public" SELECT with no-listing policy: images load via direct URL but storage.objects rows aren't listable
DROP POLICY IF EXISTS "Blog images are public" ON storage.objects;
DROP POLICY IF EXISTS "Catalog images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view catalog images" ON storage.objects;
