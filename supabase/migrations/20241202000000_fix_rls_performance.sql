-- ============================================================================
-- Fix RLS Performance Issues
-- ============================================================================
-- This migration fixes performance issues identified by Supabase linter:
-- 1. Replaces auth.uid() with (select auth.uid()) to prevent re-evaluation per row
-- 2. Consolidates multiple permissive policies on booking_analytics table
-- ============================================================================

-- Update helper functions to use optimized auth.uid() calls
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role::text FROM public.profiles WHERE id = (select auth.uid());
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (select auth.uid()) AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_influencer()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (select auth.uid()) AND role = 'influencer'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_customer()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (select auth.uid()) AND role = 'customer'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- Fix booking_analytics multiple permissive policies
-- ============================================================================

-- Drop existing policies on booking_analytics
DROP POLICY IF EXISTS "Users can view analytics for own bookings" ON public.booking_analytics;
DROP POLICY IF EXISTS "System can insert analytics" ON public.booking_analytics;
DROP POLICY IF EXISTS "Admins have full access to analytics" ON public.booking_analytics;
DROP POLICY IF EXISTS "Users and admins can view analytics" ON public.booking_analytics;
DROP POLICY IF EXISTS "Admins and system can insert analytics" ON public.booking_analytics;
DROP POLICY IF EXISTS "Admins can update analytics" ON public.booking_analytics;
DROP POLICY IF EXISTS "Admins can delete analytics" ON public.booking_analytics;

-- Create consolidated policies
CREATE POLICY "Users and admins can view analytics"
  ON public.booking_analytics FOR SELECT
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_analytics.booking_id
      AND (b.customer_id = (select auth.uid()) OR b.influencer_id = (select auth.uid()))
    )
  );

CREATE POLICY "Admins and system can insert analytics"
  ON public.booking_analytics FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update analytics"
  ON public.booking_analytics FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete analytics"
  ON public.booking_analytics FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- Note on auth_rls_initplan issues
-- ============================================================================
-- The main migration file (20241102000000_enable_rls_all_tables.sql) already
-- uses (select auth.uid()) in all policies. If you're still seeing
-- auth_rls_initplan warnings, it means the database has old policies that
-- use auth.uid() directly.
--
-- To fix all auth_rls_initplan issues, re-run the main migration:
--   supabase migration repair
--   supabase db push
--
-- The main migration includes a DO block that drops all existing policies
-- and recreates them with the optimized format.
--
-- This migration specifically fixes:
-- 1. booking_analytics INSERT policy (removed OR true to prevent multiple
--    permissive policies warning)
-- 2. Helper functions are already optimized

