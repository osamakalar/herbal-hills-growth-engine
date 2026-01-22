-- Drop the overly permissive policy
DROP POLICY "Service role can manage conversations" ON public.whatsapp_conversations;

-- Create restrictive policies - no public access, only service role can access
-- (Service role bypasses RLS by default, so we deny all for regular users)
CREATE POLICY "No public access to conversations"
ON public.whatsapp_conversations
FOR ALL
USING (false)
WITH CHECK (false);