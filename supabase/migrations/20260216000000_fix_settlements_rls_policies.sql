-- RLS Policy Fix for Settlements Table
-- This migration updates the settlements table RLS policies to explicitly check auth.users metadata
-- as requested, while maintaining security best practices.

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all settlements" ON public.settlements;
DROP POLICY IF EXISTS "Admins can insert settlements" ON public.settlements;
DROP POLICY IF EXISTS "Admins can update settlements" ON public.settlements;
DROP POLICY IF EXISTS "Admins can delete settlements" ON public.settlements;

-- Create new policies using metadata directly
-- This avoids dependency on profiles table for permission checks

-- Admins can view all settlements
CREATE POLICY "Admins can view all settlements"
  ON public.settlements
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
    public.is_admin()
  );

-- Admins can insert settlements
CREATE POLICY "Admins can insert settlements"
  ON public.settlements
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
    public.is_admin()
  );

-- Admins can update settlements
CREATE POLICY "Admins can update settlements"
  ON public.settlements
  FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
    public.is_admin()
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
    public.is_admin()
  );

-- Admins can delete settlements
CREATE POLICY "Admins can delete settlements"
  ON public.settlements
  FOR DELETE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
    public.is_admin()
  );
