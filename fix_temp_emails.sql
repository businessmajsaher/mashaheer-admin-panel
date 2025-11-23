-- Fix temporary emails in auth.users by syncing from profiles table
-- This script updates auth.users.email to match profiles.email for users with temporary emails

-- First, let's see which users have temporary emails
SELECT 
  au.id,
  au.email as auth_email,
  p.email as profile_email,
  p.name,
  p.role
FROM auth.users au
JOIN public.profiles p ON au.id = p.id
WHERE au.email LIKE '%@temp.mashaheer.com'
  AND p.email NOT LIKE '%@temp.mashaheer.com'
ORDER BY au.created_at DESC;

-- Update auth.users email to match profiles email for users with temporary emails
-- Note: This requires superuser privileges or a function with SECURITY DEFINER
UPDATE auth.users au
SET 
  email = p.email,
  email_confirmed_at = COALESCE(au.email_confirmed_at, now()),
  updated_at = now()
FROM public.profiles p
WHERE au.id = p.id
  AND au.email LIKE '%@temp.mashaheer.com'
  AND p.email NOT LIKE '%@temp.mashaheer.com'
  AND p.email IS NOT NULL
  AND p.email != '';

-- Verify the updates
SELECT 
  au.id,
  au.email as auth_email,
  p.email as profile_email,
  p.name,
  p.role,
  CASE 
    WHEN au.email = p.email THEN '✅ Synced'
    ELSE '❌ Mismatch'
  END as status
FROM auth.users au
JOIN public.profiles p ON au.id = p.id
WHERE au.email LIKE '%@temp.mashaheer.com' OR p.email LIKE '%@temp.mashaheer.com'
ORDER BY au.created_at DESC;

