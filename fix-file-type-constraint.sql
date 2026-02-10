-- Fix file_type constraint issue
-- Run this in your Supabase SQL Editor

-- First, let's see what the current constraint is
SELECT 
    conname,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.influencer_media'::regclass 
AND contype = 'c' 
AND conname LIKE '%file_type%';

-- Drop the problematic constraint
ALTER TABLE public.influencer_media DROP CONSTRAINT IF EXISTS influencer_media_file_type_check;

-- Create a new, more flexible constraint (optional)
-- This allows common file types
ALTER TABLE public.influencer_media ADD CONSTRAINT influencer_media_file_type_check 
CHECK (file_type IN ('image', 'video', 'audio', 'document', 'other'));

-- Alternative: If you don't want any constraint on file_type, just leave it without constraint
-- (The above constraint creation is optional)

-- Verify the constraint is fixed
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.influencer_media'::regclass; 