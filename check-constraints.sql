-- Check constraints on influencer_media table
-- Run this in your Supabase SQL Editor

-- Check all constraints on the influencer_media table
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.influencer_media'::regclass;

-- Check the specific check constraint
SELECT 
    conname,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.influencer_media'::regclass 
AND contype = 'c' 
AND conname LIKE '%file_type%';

-- Check the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'influencer_media'
ORDER BY ordinal_position; 