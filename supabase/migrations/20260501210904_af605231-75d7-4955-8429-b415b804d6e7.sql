-- Allow users to cancel their own pending print/lend requests by updating status
CREATE POLICY "Users cancel own pending print requests"
ON public.print_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'cancelled');

CREATE POLICY "Users cancel own pending lend requests"
ON public.lend_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'cancelled');