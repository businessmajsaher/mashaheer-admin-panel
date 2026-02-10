-- Add platform commission fixed amount to platform_settings table
-- This is a fixed commission amount (in KWD) deducted from each influencer payment

ALTER TABLE public.platform_settings
ADD COLUMN IF NOT EXISTS platform_commission_fixed numeric DEFAULT 0 CHECK (platform_commission_fixed >= 0);

-- Add comment
COMMENT ON COLUMN public.platform_settings.platform_commission_fixed IS 'Fixed platform commission amount in KWD deducted from each influencer payment (default: 0)';

