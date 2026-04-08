-- Fix missing profiles
-- This migration ensures every user in auth.users has a corresponding profile in public.profiles
-- This fixes the foreign key violation when inserting into settlements table

-- Some auth users may not have an email (e.g. guest / phone-only accounts). profiles.email is NOT NULL,
-- so we generate a stable placeholder email in that case.
WITH u AS (
  SELECT
    au.*,
    COALESCE(NULLIF(au.email, ''), au.id::text || '@temp.mashaheer.com') AS email_value
  FROM auth.users au
)
INSERT INTO public.profiles (id, email, name, role)
SELECT
  u.id,
  u.email_value,
  -- Try various possible locations for name in metadata, fallback to email prefix
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email_value, '@', 1)
  ),
  -- Use role from metadata, ensure it matches valid enum values, default to 'customer'
  (CASE
    WHEN (u.raw_user_meta_data->>'role') IN ('admin', 'influencer', 'customer')
    THEN (u.raw_user_meta_data->>'role')
    ELSE 'customer'
  END)::user_role
FROM u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- Note: We rely on existing triggers to handle timestamps or other default fields
