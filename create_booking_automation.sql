-- Booking Automation Setup
-- Run this in Supabase SQL Editor

-- First, find the highest order value
DO $$
DECLARE
  max_order integer;
BEGIN
  SELECT COALESCE(MAX("order"), 0) INTO max_order FROM public.booking_statuses;
  
  -- Add new booking statuses with order values after existing ones
  INSERT INTO public.booking_statuses (name, description, "order")
  VALUES 
    ('auto-reject', 'Automatically rejected due to influencer timeout', max_order + 1),
    ('auto-cancel', 'Automatically cancelled due to customer payment timeout', max_order + 2),
    ('Auto-Approved', 'Script automatically approved after 3 rejections or deadline', max_order + 3),
    ('Script not sent by influencer–auto refund request', 'Script not submitted within time window - refund requested', max_order + 4),
    ('To Be Publish', 'Script approved, waiting for influencer to publish', max_order + 5),
    ('Published', 'Content has been published by influencer', max_order + 6),
    ('Reject', 'Script rejected by customer', max_order + 7)
  ON CONFLICT (name) DO NOTHING;
END $$;

-- Add automation fields to bookings
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS influencer_approval_deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS script_submission_deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS auto_approval_deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS appointment_end_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS script_rejection_count smallint DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_script_submitted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_script_rejected_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_rejection_reason text,
ADD COLUMN IF NOT EXISTS influencer_response_deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_ai_generated_script boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_script_count smallint DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS published_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS days_gap integer;

-- Create black marks table
CREATE TABLE IF NOT EXISTS public.black_marks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  influencer_id uuid NOT NULL,
  service_id uuid NOT NULL,
  reason text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT black_marks_pkey PRIMARY KEY (id),
  CONSTRAINT black_marks_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE,
  CONSTRAINT black_marks_influencer_id_fkey FOREIGN KEY (influencer_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT black_marks_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE,
  CONSTRAINT black_marks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_black_marks_influencer_id ON public.black_marks(influencer_id);
CREATE INDEX IF NOT EXISTS idx_black_marks_booking_id ON public.black_marks(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_influencer_approval_deadline ON public.bookings(influencer_approval_deadline) WHERE influencer_approval_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_payment_deadline ON public.bookings(payment_deadline) WHERE payment_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_script_submission_deadline ON public.bookings(script_submission_deadline) WHERE script_submission_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_auto_approval_deadline ON public.bookings(auto_approval_deadline) WHERE auto_approval_deadline IS NOT NULL;

-- Enable RLS for black marks
ALTER TABLE public.black_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all black marks" ON public.black_marks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create black marks" ON public.black_marks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

