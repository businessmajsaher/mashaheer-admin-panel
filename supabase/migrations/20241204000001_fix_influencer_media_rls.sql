-- Fix RLS policies for influencer_media table
-- This ensures admins can insert media for any influencer

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view influencer media" ON public.influencer_media;
DROP POLICY IF EXISTS "Influencers can manage own media" ON public.influencer_media;
DROP POLICY IF EXISTS "Admins have full access to influencer media" ON public.influencer_media;
DROP POLICY IF EXISTS "Users can view their own media" ON public.influencer_media;
DROP POLICY IF EXISTS "Users can insert their own media" ON public.influencer_media;
DROP POLICY IF EXISTS "Users can update their own media" ON public.influencer_media;
DROP POLICY IF EXISTS "Users can delete their own media" ON public.influencer_media;
DROP POLICY IF EXISTS "Admins can manage all media" ON public.influencer_media;
DROP POLICY IF EXISTS "Admins can manage all influencer media" ON public.influencer_media;

-- Anyone can view influencer media (public portfolio)
CREATE POLICY "Anyone can view influencer media"
  ON public.influencer_media FOR SELECT
  USING (true);

-- Admins can INSERT media for any influencer (must be first for INSERT operations)
CREATE POLICY "Admins can insert influencer media"
  ON public.influencer_media FOR INSERT
  WITH CHECK (public.is_admin());

-- Admins can UPDATE/DELETE any influencer media
CREATE POLICY "Admins can update influencer media"
  ON public.influencer_media FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete influencer media"
  ON public.influencer_media FOR DELETE
  USING (public.is_admin());

-- Influencers can manage their own media
CREATE POLICY "Influencers can manage own media"
  ON public.influencer_media FOR ALL
  USING (
    influencer_id = (select auth.uid()) 
    AND public.is_influencer()
  )
  WITH CHECK (
    influencer_id = (select auth.uid()) 
    AND public.is_influencer()
  );

