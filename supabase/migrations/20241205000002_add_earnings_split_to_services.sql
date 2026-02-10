-- Add earnings split percentage for dual services
-- This allows specifying how earnings are split between primary and invited influencers

ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS primary_influencer_earnings_percentage numeric DEFAULT 50 CHECK (primary_influencer_earnings_percentage >= 0 AND primary_influencer_earnings_percentage <= 100),
ADD COLUMN IF NOT EXISTS invited_influencer_earnings_percentage numeric DEFAULT 50 CHECK (invited_influencer_earnings_percentage >= 0 AND invited_influencer_earnings_percentage <= 100);

-- Add comments for documentation
COMMENT ON COLUMN public.services.primary_influencer_earnings_percentage IS 'Percentage of earnings (0-100) for primary influencer in dual services. Must sum to 100 with invited_influencer_earnings_percentage.';
COMMENT ON COLUMN public.services.invited_influencer_earnings_percentage IS 'Percentage of earnings (0-100) for invited influencer in dual services. Must sum to 100 with primary_influencer_earnings_percentage.';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_services_primary_influencer_earnings_percentage ON public.services(primary_influencer_earnings_percentage);
CREATE INDEX IF NOT EXISTS idx_services_invited_influencer_earnings_percentage ON public.services(invited_influencer_earnings_percentage);

-- Add constraint to ensure percentages sum to 100 for dual services
-- Note: This constraint will only apply when both influencers are present (dual service)
-- We'll handle validation in the application layer for better UX

