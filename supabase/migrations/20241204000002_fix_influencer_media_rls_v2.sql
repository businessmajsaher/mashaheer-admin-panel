-- Fix RLS policies for influencer_media table - Version 2
-- This ensures admins can insert media for any influencer
-- More explicit policy checks

-- First, verify the is_admin function exists and works
-- Use different delimiter to avoid conflict with nested $$
DO $func$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_admin'
  ) THEN
    CREATE OR REPLACE FUNCTION public.is_admin()
    RETURNS boolean AS $inner$
      SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = (select auth.uid()) AND role = 'admin'
      );
    $inner$ LANGUAGE sql SECURITY DEFINER STABLE;
  END IF;
END $func$;

-- Drop ALL existing policies to start fresh
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'influencer_media'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.influencer_media', r.policyname);
  END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.influencer_media ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can view influencer media (public portfolio)
CREATE POLICY "Anyone can view influencer media"
  ON public.influencer_media FOR SELECT
  USING (true);

-- Policy 2: Admins can INSERT media for ANY influencer
-- This is critical - admins need to be able to insert media for influencers they're managing
-- Using the is_admin() function for consistency
CREATE POLICY "Admins can insert influencer media"
  ON public.influencer_media FOR INSERT
  WITH CHECK (public.is_admin());

-- Policy 3: Admins can UPDATE any influencer media
CREATE POLICY "Admins can update influencer media"
  ON public.influencer_media FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Policy 4: Admins can DELETE any influencer media
CREATE POLICY "Admins can delete influencer media"
  ON public.influencer_media FOR DELETE
  USING (public.is_admin());

-- Policy 5: Influencers can manage their own media
CREATE POLICY "Influencers can manage own media"
  ON public.influencer_media FOR ALL
  USING (
    influencer_id = (select auth.uid()) 
    AND public.is_influencer()
  )
  WITH CHECK (
    influencer_id = (select auth.uid()) 
    AND public.is_influencer()
  );

-- Add comment
COMMENT ON POLICY "Admins can insert influencer media" ON public.influencer_media IS 
  'Allows admins to insert media files for any influencer when managing their profiles';

