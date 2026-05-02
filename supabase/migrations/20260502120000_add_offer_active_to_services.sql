-- Manual offer flag for services (UI: "Manual offer active"; mutually exclusive with flash deal in app)
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS offer_active boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.services.offer_active IS 'When true, admin-enabled promotional offer applies (offer_price from discount %). App enforces exclusivity with is_flash_deal.';
