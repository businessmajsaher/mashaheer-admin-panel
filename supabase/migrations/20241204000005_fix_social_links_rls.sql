-- Fix RLS policies for social_links table
-- This ensures admins can insert/update/delete social links for any influencer

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view social links" ON public.social_links;
DROP POLICY IF EXISTS "Users can manage own social links" ON public.social_links;
DROP POLICY IF EXISTS "Admins have full access to social links" ON public.social_links;

-- Ensure RLS is enabled
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can view social links (public profiles)
CREATE POLICY "Anyone can view social links"
  ON public.social_links FOR SELECT
  USING (true);

-- Policy 2: Admins can INSERT social links for ANY user
CREATE POLICY "Admins can insert social links"
  ON public.social_links FOR INSERT
  WITH CHECK (public.is_admin());

-- Policy 3: Admins can UPDATE any social links
CREATE POLICY "Admins can update social links"
  ON public.social_links FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Policy 4: Admins can DELETE any social links
CREATE POLICY "Admins can delete social links"
  ON public.social_links FOR DELETE
  USING (public.is_admin());

-- Policy 5: Users can manage their own social links
CREATE POLICY "Users can manage own social links"
  ON public.social_links FOR ALL
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Add comment
COMMENT ON POLICY "Admins can insert social links" ON public.social_links IS 
  'Allows admins to insert social links for any influencer when managing their profiles';

