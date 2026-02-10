-- Create settlements table to track influencer cash out settlements
CREATE TABLE IF NOT EXISTS public.settlements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  influencer_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  period_type text NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  total_earnings numeric NOT NULL DEFAULT 0,
  total_pg_charges numeric NOT NULL DEFAULT 0,
  total_platform_commission numeric NOT NULL DEFAULT 0,
  net_payout numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'KWD',
  payment_count integer NOT NULL DEFAULT 0,
  settled_by uuid,
  settled_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT settlements_pkey PRIMARY KEY (id),
  CONSTRAINT settlements_influencer_id_fkey FOREIGN KEY (influencer_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT settlements_settled_by_fkey FOREIGN KEY (settled_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT settlements_unique_period UNIQUE (influencer_id, period_start, period_end, period_type)
);

-- Add comments
COMMENT ON TABLE public.settlements IS 'Tracks influencer cash out settlements by period';
COMMENT ON COLUMN public.settlements.influencer_id IS 'Influencer who received the settlement';
COMMENT ON COLUMN public.settlements.period_start IS 'Start date of the settlement period';
COMMENT ON COLUMN public.settlements.period_end IS 'End date of the settlement period';
COMMENT ON COLUMN public.settlements.period_type IS 'Type of period: weekly or monthly';
COMMENT ON COLUMN public.settlements.net_payout IS 'Final amount paid to influencer after deductions';
COMMENT ON COLUMN public.settlements.settled_by IS 'Admin user who marked the settlement';
COMMENT ON COLUMN public.settlements.settled_at IS 'When the settlement was marked as settled';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_settlements_influencer_id ON public.settlements(influencer_id);
CREATE INDEX IF NOT EXISTS idx_settlements_period ON public.settlements(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_settlements_settled_at ON public.settlements(settled_at);

-- Enable RLS
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can view all settlements
CREATE POLICY "Admins can view all settlements"
  ON public.settlements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can insert settlements
CREATE POLICY "Admins can insert settlements"
  ON public.settlements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update settlements
CREATE POLICY "Admins can update settlements"
  ON public.settlements
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

