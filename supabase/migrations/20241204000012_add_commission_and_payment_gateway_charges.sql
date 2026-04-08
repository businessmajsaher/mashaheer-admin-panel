-- Add commission and payment gateway charge fields to services table
-- These charges will be deducted from the influencer's payout
-- Payment gateway charges differ for Card and KNET payment methods

ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS commission_percentage numeric DEFAULT 0 CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
ADD COLUMN IF NOT EXISTS payment_gateway_charge_card_percentage numeric DEFAULT 0 CHECK (payment_gateway_charge_card_percentage >= 0 AND payment_gateway_charge_card_percentage <= 100),
ADD COLUMN IF NOT EXISTS payment_gateway_charge_knet_percentage numeric DEFAULT 0 CHECK (payment_gateway_charge_knet_percentage >= 0 AND payment_gateway_charge_knet_percentage <= 100);

-- Add comments for documentation
COMMENT ON COLUMN public.services.commission_percentage IS 'Platform commission percentage (0-100) deducted from service price';
COMMENT ON COLUMN public.services.payment_gateway_charge_card_percentage IS 'Payment gateway charge percentage (0-100) for card payments, deducted from service price';
COMMENT ON COLUMN public.services.payment_gateway_charge_knet_percentage IS 'Payment gateway charge percentage (0-100) for KNET payments, deducted from service price';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_services_commission_percentage ON public.services(commission_percentage);
CREATE INDEX IF NOT EXISTS idx_services_payment_gateway_charge_card_percentage ON public.services(payment_gateway_charge_card_percentage);
CREATE INDEX IF NOT EXISTS idx_services_payment_gateway_charge_knet_percentage ON public.services(payment_gateway_charge_knet_percentage);

