-- Create refunds table to track refund requests and status
CREATE TABLE IF NOT EXISTS public.refunds (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  payment_id uuid,
  transaction_reference text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD'::text,
  reason text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  hesabe_refund_id text,
  hesabe_response jsonb,
  initiated_by uuid,
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT refunds_pkey PRIMARY KEY (id),
  CONSTRAINT refunds_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE,
  CONSTRAINT refunds_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL,
  CONSTRAINT refunds_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Add comments for documentation
COMMENT ON TABLE public.refunds IS 'Tracks refund requests and their status';
COMMENT ON COLUMN public.refunds.booking_id IS 'Reference to the booking being refunded';
COMMENT ON COLUMN public.refunds.payment_id IS 'Reference to the payment being refunded';
COMMENT ON COLUMN public.refunds.transaction_reference IS 'Original transaction reference from payment gateway';
COMMENT ON COLUMN public.refunds.hesabe_refund_id IS 'Refund ID returned from Hesabe API';
COMMENT ON COLUMN public.refunds.hesabe_response IS 'Full response from Hesabe API';
COMMENT ON COLUMN public.refunds.status IS 'Refund status: pending, processing, completed, failed, cancelled';
COMMENT ON COLUMN public.refunds.initiated_by IS 'Admin user who initiated the refund';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_refunds_booking_id ON public.refunds(booking_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON public.refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON public.refunds(created_at);

-- Enable RLS
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow admins to manage refunds)
CREATE POLICY "Admins can view all refunds" ON public.refunds
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create refunds" ON public.refunds
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update refunds" ON public.refunds
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

