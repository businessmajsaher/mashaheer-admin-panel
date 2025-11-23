-- Test script to diagnose influencer_media RLS issues
-- Run this in Supabase SQL Editor to check current policies and test admin access

-- 1. Check current policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'influencer_media'
ORDER BY policyname;

-- 2. Check if is_admin function exists
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'is_admin';

-- 3. Test is_admin function (replace with your admin user ID)
-- SELECT public.is_admin() as is_admin_check;

-- 4. Check current user's role
SELECT 
    id,
    email,
    role,
    name
FROM public.profiles
WHERE id = (select auth.uid());

-- 5. Check RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'influencer_media';

-- 6. List all policies on influencer_media
SELECT 
    policyname,
    cmd as operation,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'influencer_media';

