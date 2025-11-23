-- Fix RLS policies for service_categories table
-- This ensures admins can insert/update/delete categories

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view service categories" ON public.service_categories;
DROP POLICY IF EXISTS "Only admins can manage service categories" ON public.service_categories;
DROP POLICY IF EXISTS "Admins can manage service categories" ON public.service_categories;

-- Ensure RLS is enabled
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can view service categories (public reference table)
CREATE POLICY "Anyone can view service categories"
  ON public.service_categories FOR SELECT
  USING (true);

-- Policy 2: Admins can INSERT categories
CREATE POLICY "Admins can insert service categories"
  ON public.service_categories FOR INSERT
  WITH CHECK (public.is_admin());

-- Policy 3: Admins can UPDATE categories
CREATE POLICY "Admins can update service categories"
  ON public.service_categories FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Policy 4: Admins can DELETE categories
CREATE POLICY "Admins can delete service categories"
  ON public.service_categories FOR DELETE
  USING (public.is_admin());

-- Add comment
COMMENT ON POLICY "Admins can insert service categories" ON public.service_categories IS 
  'Allows admins to insert new service categories';

