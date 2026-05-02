-- Allow admins to create lend requests on behalf of any user
CREATE POLICY "Admins create lend requests"
ON public.lend_requests
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert lend items"
ON public.lend_request_items
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));