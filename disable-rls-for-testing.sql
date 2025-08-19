-- Temporarily disable RLS for testing
-- Run this in your Supabase SQL Editor

-- Disable RLS on influencer_media table
ALTER TABLE public.influencer_media DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'influencer_media';

-- To re-enable RLS later, run:
-- ALTER TABLE public.influencer_media ENABLE ROW LEVEL SECURITY; 