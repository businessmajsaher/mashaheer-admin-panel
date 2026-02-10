-- ============================================================================
-- VERIFY RLS POLICIES ARE APPLIED
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. Check if RLS is enabled on tables (should show 't' for true)
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Count total policies created (should be ~170)
SELECT 
    COUNT(*) as total_policies,
    COUNT(DISTINCT tablename) as tables_with_policies
FROM pg_policies 
WHERE schemaname = 'public';

-- 3. Check if helper functions exist (should return 4 rows)
SELECT 
    routine_name as function_name,
    CASE WHEN routine_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('get_user_role', 'is_admin', 'is_influencer', 'is_customer')
ORDER BY routine_name;

-- 4. Sample policies on key tables
SELECT 
    tablename,
    policyname,
    cmd as operation,
    CASE WHEN cmd = 'ALL' THEN 'SELECT, INSERT, UPDATE, DELETE'
         WHEN cmd = 'SELECT' THEN 'READ ONLY'
         WHEN cmd = 'INSERT' THEN 'CREATE'
         WHEN cmd = 'UPDATE' THEN 'UPDATE'
         WHEN cmd = 'DELETE' THEN 'DELETE'
         ELSE cmd END as access_type
FROM pg_policies 
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'bookings', 'services', 'admin_actions', 'discount_coupons')
ORDER BY tablename, policyname;

-- 5. Summary: Tables with RLS enabled vs total tables
SELECT 
    COUNT(*) FILTER (WHERE rowsecurity = true) as tables_with_rls_enabled,
    COUNT(*) as total_public_tables,
    ROUND(100.0 * COUNT(*) FILTER (WHERE rowsecurity = true) / COUNT(*), 2) as percentage_enabled
FROM pg_tables 
WHERE schemaname = 'public';

