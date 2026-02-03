-- Fix RLS Policies for Payments Table
-- This ensures the webhook (using service role) can insert payments

-- 1. Check current RLS status
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'payments'
  AND schemaname = 'public';

-- 2. Check existing policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'payments';

-- 3. Allow service role to insert payments (webhook uses service role)
-- Note: Service role bypasses RLS, but if RLS is enabled, we need policies for other roles
-- The webhook should work with service role, but let's ensure policies are correct

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Allow service role to insert payments" ON payments;
DROP POLICY IF EXISTS "Allow authenticated users to insert payments" ON payments;

-- Create policy to allow inserts (service role bypasses RLS anyway, but this is for safety)
CREATE POLICY "Allow service role and authenticated users to insert payments"
ON payments
FOR INSERT
TO authenticated, service_role
WITH CHECK (true);

-- Allow service role to update payments
CREATE POLICY "Allow service role to update payments"
ON payments
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Allow service role to select payments
CREATE POLICY "Allow service role to select payments"
ON payments
FOR SELECT
TO service_role
USING (true);

-- 4. Verify RLS is enabled (it should be for security)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 5. Verify policies were created
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has filter'
    ELSE 'No filter (allows all)'
  END as filter_status
FROM pg_policies
WHERE tablename = 'payments';
