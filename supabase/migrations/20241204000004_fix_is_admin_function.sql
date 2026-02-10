-- Fix is_admin() function to check both profiles table and auth.users.raw_user_meta_data
-- This ensures the function works regardless of where the role is stored

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (select auth.uid()) AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = (select auth.uid()) 
    AND (raw_user_meta_data->>'role')::text = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Also update is_influencer() function for consistency
CREATE OR REPLACE FUNCTION public.is_influencer()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (select auth.uid()) AND role = 'influencer'
  ) OR EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = (select auth.uid()) 
    AND (raw_user_meta_data->>'role')::text = 'influencer'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Also update is_customer() function for consistency
CREATE OR REPLACE FUNCTION public.is_customer()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (select auth.uid()) AND role = 'customer'
  ) OR EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = (select auth.uid()) 
    AND (raw_user_meta_data->>'role')::text = 'customer'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Add comment
COMMENT ON FUNCTION public.is_admin() IS 
  'Checks if current user is admin by checking both profiles table and auth.users.raw_user_meta_data';

COMMENT ON FUNCTION public.is_influencer() IS 
  'Checks if current user is influencer by checking both profiles table and auth.users.raw_user_meta_data';

COMMENT ON FUNCTION public.is_customer() IS 
  'Checks if current user is customer by checking both profiles table and auth.users.raw_user_meta_data';

