-- Fix RLS policies for services table
-- This ensures admins can insert/update/delete services for any influencer

-- Drop ALL existing policies for services
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'services'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.services', r.policyname);
  END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can view services (public marketplace)
CREATE POLICY "Anyone can view services"
  ON public.services FOR SELECT
  USING (true);

-- Policy 2: Admins can INSERT services for ANY influencer
CREATE POLICY "Admins can insert services"
  ON public.services FOR INSERT
  WITH CHECK (public.is_admin());

-- Policy 3: Admins can UPDATE any services
CREATE POLICY "Admins can update services"
  ON public.services FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Policy 4: Admins can DELETE any services
CREATE POLICY "Admins can delete services"
  ON public.services FOR DELETE
  USING (public.is_admin());

-- Policy 5: Influencers can create their own services
CREATE POLICY "Influencers can create services"
  ON public.services FOR INSERT
  WITH CHECK (
    primary_influencer_id = (select auth.uid()) AND
    public.is_influencer()
  );

-- Policy 6: Influencers can update their own services
CREATE POLICY "Influencers can update own services"
  ON public.services FOR UPDATE
  USING (
    (primary_influencer_id = (select auth.uid()) OR invited_influencer_id = (select auth.uid())) AND
    public.is_influencer()
  )
  WITH CHECK (
    (primary_influencer_id = (select auth.uid()) OR invited_influencer_id = (select auth.uid())) AND
    public.is_influencer()
  );

-- Policy 7: Influencers can delete their own services
CREATE POLICY "Influencers can delete own services"
  ON public.services FOR DELETE
  USING (
    primary_influencer_id = (select auth.uid()) AND
    public.is_influencer()
  );

-- Add comments
COMMENT ON POLICY "Admins can insert services" ON public.services IS 
  'Allows admins to insert services for any influencer when managing their profiles';

COMMENT ON POLICY "Influencers can create services" ON public.services IS 
  'Allows influencers to create their own services';

