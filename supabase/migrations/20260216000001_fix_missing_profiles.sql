-- Fix missing profiles
-- This migration ensures every user in auth.users has a corresponding profile in public.profiles
-- This fixes the foreign key violation when inserting into settlements table

INSERT INTO public.profiles (id, email, name, role)
SELECT 
  au.id,
  au.email,
  -- Try various possible locations for name in metadata, fallback to email prefix
  COALESCE(
    au.raw_user_meta_data->>'full_name', 
    au.raw_user_meta_data->>'name', 
    split_part(au.email, '@', 1)
  ),
  -- Use role from metadata, ensure it matches valid enum values, default to 'customer'
  (CASE 
    WHEN (au.raw_user_meta_data->>'role') IN ('admin', 'influencer', 'customer') 
    THEN (au.raw_user_meta_data->>'role')
    ELSE 'customer' 
  END)::user_role
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
);

-- Note: We rely on existing triggers to handle timestamps or other default fields
