-- Add commission_percentage field to profiles table
-- This allows each influencer to have their own commission rate (0-100%)
-- This is different from service-level commission and platform-level commission

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS commission_percentage numeric DEFAULT 0 CHECK (commission_percentage >= 0 AND commission_percentage <= 100);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.commission_percentage IS 'Influencer-specific commission percentage (0-100) deducted from their earnings. Default: 0. This is per-influencer commission, separate from service-level and platform-level commissions.';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_commission_percentage ON public.profiles(commission_percentage);
