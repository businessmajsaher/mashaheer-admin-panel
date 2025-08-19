-- Fix RLS policies for influencer_media table
-- Run this in your Supabase SQL Editor

-- First, let's check the current policies
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
WHERE tablename = 'influencer_media';

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can view their own media" ON public.influencer_media;
DROP POLICY IF EXISTS "Users can insert their own media" ON public.influencer_media;
DROP POLICY IF EXISTS "Users can update their own media" ON public.influencer_media;
DROP POLICY IF EXISTS "Users can delete their own media" ON public.influencer_media;
DROP POLICY IF EXISTS "Admins can manage all media" ON public.influencer_media;

-- Create new, more permissive policies for admin users
-- Policy for admins to do everything
CREATE POLICY "Admins can manage all media" ON public.influencer_media
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Policy for users to view their own media
CREATE POLICY "Users can view their own media" ON public.influencer_media
    FOR SELECT USING (auth.uid() = influencer_id);

-- Policy for users to insert their own media
CREATE POLICY "Users can insert their own media" ON public.influencer_media
    FOR INSERT WITH CHECK (auth.uid() = influencer_id);

-- Policy for users to update their own media
CREATE POLICY "Users can update their own media" ON public.influencer_media
    FOR UPDATE USING (auth.uid() = influencer_id);

-- Policy for users to delete their own media
CREATE POLICY "Users can delete their own media" ON public.influencer_media
    FOR DELETE USING (auth.uid() = influencer_id);

-- Alternative: If you want to temporarily disable RLS for testing
-- ALTER TABLE public.influencer_media DISABLE ROW LEVEL SECURITY;

-- Check the updated policies
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
WHERE tablename = 'influencer_media'; 