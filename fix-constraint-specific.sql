-- Fix the specific file_type constraint that only allows 'image' and 'video'
-- Run this in your Supabase SQL Editor

-- Drop the current restrictive constraint
ALTER TABLE public.influencer_media DROP CONSTRAINT influencer_media_file_type_check;

-- Create a new, more flexible constraint that allows common file types
ALTER TABLE public.influencer_media ADD CONSTRAINT influencer_media_file_type_check 
CHECK (file_type IN ('image', 'video', 'audio', 'document', 'other'));

-- Verify the new constraint
SELECT 
    conname,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.influencer_media'::regclass 
AND contype = 'c' 
AND conname LIKE '%file_type%'; 