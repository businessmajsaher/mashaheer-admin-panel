-- Fix RLS policies for reviews table
-- This ensures admins can approve/reject reviews

-- Drop ALL existing policies for reviews
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'reviews'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.reviews', r.policyname);
  END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can view approved reviews (public)
CREATE POLICY "Anyone can view approved reviews"
  ON public.reviews FOR SELECT
  USING (is_approved = true AND (is_rejected IS NULL OR is_rejected = false));

-- Policy 2: Admins can view all reviews
CREATE POLICY "Admins can view all reviews"
  ON public.reviews FOR SELECT
  USING (public.is_admin());

-- Policy 3: Admins can INSERT reviews (for moderation purposes)
CREATE POLICY "Admins can insert reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (public.is_admin());

-- Policy 4: Admins can UPDATE any reviews (to approve/reject)
CREATE POLICY "Admins can update reviews"
  ON public.reviews FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Policy 5: Admins can DELETE any reviews
CREATE POLICY "Admins can delete reviews"
  ON public.reviews FOR DELETE
  USING (public.is_admin());

-- Policy 6: Users can create reviews
CREATE POLICY "Users can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (reviewer_id = (select auth.uid()));

-- Policy 7: Users can update their own reviews (before approval)
CREATE POLICY "Users can update own reviews"
  ON public.reviews FOR UPDATE
  USING (
    reviewer_id = (select auth.uid()) AND
    (is_approved IS NULL OR is_approved = false) AND
    (is_rejected IS NULL OR is_rejected = false)
  )
  WITH CHECK (
    reviewer_id = (select auth.uid()) AND
    (is_approved IS NULL OR is_approved = false) AND
    (is_rejected IS NULL OR is_rejected = false)
  );

-- Policy 8: Users can delete their own reviews (before approval)
CREATE POLICY "Users can delete own reviews"
  ON public.reviews FOR DELETE
  USING (
    reviewer_id = (select auth.uid()) AND
    (is_approved IS NULL OR is_approved = false)
  );

-- Add comments
COMMENT ON POLICY "Admins can update reviews" ON public.reviews IS 
  'Allows admins to approve or reject reviews';

