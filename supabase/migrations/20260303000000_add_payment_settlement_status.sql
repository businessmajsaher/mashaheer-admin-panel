-- Add is_settled to track individual payment settlements
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS is_settled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS settled_at timestamp with time zone;

-- Update existing settled payments using the settlements table
-- For any payment that falls within an existing settlement period for that payee, mark it as settled
UPDATE public.payments p
SET 
    is_settled = true,
    settled_at = s.settled_at
FROM public.settlements s
WHERE p.payee_id = s.influencer_id
  AND (p.paid_at IS NOT NULL OR p.created_at IS NOT NULL)
  AND COALESCE(p.paid_at, p.created_at)::date BETWEEN s.period_start AND s.period_end;

-- Create an index for quicker filtering by settlement status
CREATE INDEX IF NOT EXISTS idx_payments_is_settled ON public.payments(is_settled);
