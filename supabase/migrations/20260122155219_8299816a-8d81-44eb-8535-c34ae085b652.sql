-- Create a view to join profiles with user_roles for easier querying
CREATE OR REPLACE VIEW public.team_members AS
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

-- Create function to update user role (admin only)
CREATE OR REPLACE FUNCTION public.update_user_role(_user_id uuid, _new_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can update user roles';
  END IF;
  
  -- Prevent admin from changing their own role
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot change your own role';
  END IF;
  
  -- Update or insert the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _new_role)
  ON CONFLICT (user_id) 
  DO UPDATE SET role = _new_role;
END;
$$;