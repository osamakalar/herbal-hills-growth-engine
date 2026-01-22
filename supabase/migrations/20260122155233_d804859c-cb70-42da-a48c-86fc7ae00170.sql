-- Fix the view to use security invoker instead of security definer
DROP VIEW IF EXISTS public.team_members;

CREATE VIEW public.team_members 
WITH (security_invoker = on)
AS
SELECT 
  p.id as profile_id,
  p.user_id,
  p.full_name,
  p.phone,
  p.avatar_url,
  p.is_active,
  p.created_at,
  p.updated_at,
  COALESCE(ur.role, 'health_rep'::app_role) as role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id;

-- Grant access to the view
GRANT SELECT ON public.team_members TO authenticated;