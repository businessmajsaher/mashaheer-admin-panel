-- Fix RLS policies for social_media_platforms table
-- This ensures admins can insert/update/delete platforms

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view social media platforms" ON public.social_media_platforms;
DROP POLICY IF EXISTS "Only admins can manage platforms" ON public.social_media_platforms;
DROP POLICY IF EXISTS "Admins can manage platforms" ON public.social_media_platforms;

-- Ensure RLS is enabled
ALTER TABLE public.social_media_platforms ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can view platforms (public reference table)
CREATE POLICY "Anyone can view social media platforms"
  ON public.social_media_platforms FOR SELECT
  USING (true);

-- Policy 2: Admins can INSERT platforms
CREATE POLICY "Admins can insert social media platforms"
  ON public.social_media_platforms FOR INSERT
  WITH CHECK (public.is_admin());

-- Policy 3: Admins can UPDATE platforms
CREATE POLICY "Admins can update social media platforms"
  ON public.social_media_platforms FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Policy 4: Admins can DELETE platforms
CREATE POLICY "Admins can delete social media platforms"
  ON public.social_media_platforms FOR DELETE
  USING (public.is_admin());

-- Add comment
COMMENT ON POLICY "Admins can insert social media platforms" ON public.social_media_platforms IS 
  'Allows admins to insert new social media platforms';

