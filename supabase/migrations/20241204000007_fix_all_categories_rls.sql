-- Fix RLS policies for ALL category tables
-- This ensures admins can insert/update/delete categories in all category tables

-- ============================================================================
-- SERVICE_CATEGORIES TABLE
-- ============================================================================
-- Drop ALL existing policies for service_categories
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'service_categories'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.service_categories', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view service categories"
  ON public.service_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert service categories"
  ON public.service_categories FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update service categories"
  ON public.service_categories FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete service categories"
  ON public.service_categories FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- RATING_CATEGORIES TABLE
-- ============================================================================
-- Drop ALL existing policies for rating_categories
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'rating_categories'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.rating_categories', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.rating_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active rating categories"
  ON public.rating_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can insert rating categories"
  ON public.rating_categories FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update rating categories"
  ON public.rating_categories FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete rating categories"
  ON public.rating_categories FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- COUPON_CATEGORIES TABLE
-- ============================================================================
-- Drop ALL existing policies for coupon_categories
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'coupon_categories'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.coupon_categories', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.coupon_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view coupon categories"
  ON public.coupon_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert coupon categories"
  ON public.coupon_categories FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update coupon categories"
  ON public.coupon_categories FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete coupon categories"
  ON public.coupon_categories FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- SUPPORT_CATEGORIES TABLE
-- ============================================================================
-- Drop ALL existing policies for support_categories
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'support_categories'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.support_categories', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.support_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active support categories"
  ON public.support_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can insert support categories"
  ON public.support_categories FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update support categories"
  ON public.support_categories FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete support categories"
  ON public.support_categories FOR DELETE
  USING (public.is_admin());

-- Add comments
COMMENT ON POLICY "Admins can insert service categories" ON public.service_categories IS 
  'Allows admins to insert new service categories';

COMMENT ON POLICY "Admins can insert rating categories" ON public.rating_categories IS 
  'Allows admins to insert new rating categories';

COMMENT ON POLICY "Admins can insert coupon categories" ON public.coupon_categories IS 
  'Allows admins to insert new coupon categories';

COMMENT ON POLICY "Admins can insert support categories" ON public.support_categories IS 
  'Allows admins to insert new support categories';

