-- Soft-disable services instead of DELETE (preserves FK rows: bookings, ratings, etc.)
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.services.is_suspended IS 'When true, service is suspended (hidden); bookings and history remain.';

CREATE INDEX IF NOT EXISTS idx_services_is_suspended ON public.services(is_suspended);
