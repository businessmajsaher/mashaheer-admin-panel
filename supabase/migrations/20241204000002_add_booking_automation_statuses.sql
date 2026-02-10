-- Add new booking statuses for automation
-- First, check existing statuses and add new ones

-- Insert new statuses if they don't exist
INSERT INTO public.booking_statuses (name, description, "order")
VALUES 
  ('auto-reject', 'Automatically rejected due to influencer timeout', 10),
  ('auto-cancel', 'Automatically cancelled due to customer payment timeout', 11),
  ('Auto-Approved', 'Script automatically approved after 3 rejections or deadline', 12),
  ('Script not sent by influencer–auto refund request', 'Script not submitted within time window - refund requested', 13),
  ('To Be Publish', 'Script approved, waiting for influencer to publish', 14),
  ('Published', 'Content has been published by influencer', 15),
  ('Reject', 'Script rejected by customer', 16)
ON CONFLICT (name) DO NOTHING;

-- Add fields to bookings table for automation tracking
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
ADD COLUMN IF NOT EXISTS days_gap integer; -- Calculated: appointment_date - booking_date

-- Add comments
COMMENT ON COLUMN public.bookings.influencer_approval_deadline IS 'Deadline for influencer to accept/reject booking (12 hrs from booking)';
COMMENT ON COLUMN public.bookings.payment_deadline IS 'Deadline for customer to pay (12 hrs after influencer accepts)';
COMMENT ON COLUMN public.bookings.script_submission_deadline IS 'Deadline for influencer to submit first script (8 hrs × (days_gap - 1))';
COMMENT ON COLUMN public.bookings.auto_approval_deadline IS 'Deadline for auto-approval (appointment day 10:30 PM)';
COMMENT ON COLUMN public.bookings.appointment_end_time IS 'End of appointment (appointment day 11:59 PM)';
COMMENT ON COLUMN public.bookings.script_rejection_count IS 'Number of times script has been rejected (max 3)';
COMMENT ON COLUMN public.bookings.days_gap IS 'Number of days between booking and appointment';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_influencer_approval_deadline ON public.bookings(influencer_approval_deadline) WHERE influencer_approval_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_payment_deadline ON public.bookings(payment_deadline) WHERE payment_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_script_submission_deadline ON public.bookings(script_submission_deadline) WHERE script_submission_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_auto_approval_deadline ON public.bookings(auto_approval_deadline) WHERE auto_approval_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_appointment_end_time ON public.bookings(appointment_end_time) WHERE appointment_end_time IS NOT NULL;

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

-- Add comments
COMMENT ON TABLE public.black_marks IS 'Tracks black marks against influencers for not publishing content';
COMMENT ON COLUMN public.black_marks.reason IS 'Reason for black mark (e.g., "Content not published by deadline")';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_black_marks_influencer_id ON public.black_marks(influencer_id);
CREATE INDEX IF NOT EXISTS idx_black_marks_booking_id ON public.black_marks(booking_id);
CREATE INDEX IF NOT EXISTS idx_black_marks_created_at ON public.black_marks(created_at);

-- Enable RLS
ALTER TABLE public.black_marks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for black marks
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

-- Function to calculate deadlines when booking is created or updated
CREATE OR REPLACE FUNCTION calculate_booking_deadlines()
RETURNS TRIGGER AS $$
DECLARE
  days_between integer;
  appointment_date timestamp with time zone;
BEGIN
  -- Calculate days gap
  IF NEW.scheduled_time IS NOT NULL THEN
    days_between := EXTRACT(EPOCH FROM (NEW.scheduled_time - NEW.created_at)) / 86400;
    NEW.days_gap := GREATEST(1, days_between::integer);
    
    -- Set appointment end time (appointment day 11:59 PM)
    appointment_date := DATE_TRUNC('day', NEW.scheduled_time) + INTERVAL '1 day' - INTERVAL '1 second';
    NEW.appointment_end_time := appointment_date;
    
    -- Set auto-approval deadline (appointment day 10:30 PM)
    NEW.auto_approval_deadline := DATE_TRUNC('day', NEW.scheduled_time) + INTERVAL '22 hours 30 minutes';
  END IF;
  
  -- Set influencer approval deadline (12 hrs from booking creation)
  IF NEW.influencer_approval_deadline IS NULL AND NEW.created_at IS NOT NULL THEN
    NEW.influencer_approval_deadline := NEW.created_at + INTERVAL '12 hours';
  END IF;
  
  -- Set payment deadline (12 hrs after influencer accepts - handled in application logic)
  -- Set script submission deadline (8 hrs × (days_gap - 1) after payment - handled in application logic)
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_calculate_booking_deadlines ON public.bookings;
CREATE TRIGGER trigger_calculate_booking_deadlines
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_booking_deadlines();

