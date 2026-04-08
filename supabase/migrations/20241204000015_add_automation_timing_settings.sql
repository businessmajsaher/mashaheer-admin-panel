-- Add automation timing settings to platform_settings table
-- These settings control the timing for automatic booking status changes

ALTER TABLE public.platform_settings
ADD COLUMN IF NOT EXISTS influencer_approval_hours numeric DEFAULT 12 CHECK (influencer_approval_hours > 0),
ADD COLUMN IF NOT EXISTS payment_deadline_hours numeric DEFAULT 12 CHECK (payment_deadline_hours > 0),
ADD COLUMN IF NOT EXISTS script_submission_base_hours numeric DEFAULT 8 CHECK (script_submission_base_hours > 0),
ADD COLUMN IF NOT EXISTS influencer_response_minutes numeric DEFAULT 30 CHECK (influencer_response_minutes > 0),
ADD COLUMN IF NOT EXISTS auto_approval_hour integer DEFAULT 22 CHECK (auto_approval_hour >= 0 AND auto_approval_hour <= 23),
ADD COLUMN IF NOT EXISTS auto_approval_minute integer DEFAULT 30 CHECK (auto_approval_minute >= 0 AND auto_approval_minute <= 59),
ADD COLUMN IF NOT EXISTS appointment_end_hour integer DEFAULT 23 CHECK (appointment_end_hour >= 0 AND appointment_end_hour <= 23),
ADD COLUMN IF NOT EXISTS appointment_end_minute integer DEFAULT 59 CHECK (appointment_end_minute >= 0 AND appointment_end_minute <= 59);

-- Add comments
COMMENT ON COLUMN public.platform_settings.influencer_approval_hours IS 'Hours for influencer to approve/reject booking (default: 12)';
COMMENT ON COLUMN public.platform_settings.payment_deadline_hours IS 'Hours for customer to pay after influencer approval (default: 12)';
COMMENT ON COLUMN public.platform_settings.script_submission_base_hours IS 'Base hours for script submission (multiplied by days_gap - 1, default: 8)';
COMMENT ON COLUMN public.platform_settings.influencer_response_minutes IS 'Minutes for influencer to respond after script rejection (default: 30)';
COMMENT ON COLUMN public.platform_settings.auto_approval_hour IS 'Hour of day for auto-approval deadline (default: 22 = 10 PM)';
COMMENT ON COLUMN public.platform_settings.auto_approval_minute IS 'Minute of hour for auto-approval deadline (default: 30)';
COMMENT ON COLUMN public.platform_settings.appointment_end_hour IS 'Hour of day for appointment end time (default: 23 = 11 PM)';
COMMENT ON COLUMN public.platform_settings.appointment_end_minute IS 'Minute of hour for appointment end time (default: 59)';

-- Insert default settings if none exist
INSERT INTO public.platform_settings (
  commission_percentage,
  influencer_approval_hours,
  payment_deadline_hours,
  script_submission_base_hours,
  influencer_response_minutes,
  auto_approval_hour,
  auto_approval_minute,
  appointment_end_hour,
  appointment_end_minute
)
SELECT 
  0,
  12,
  12,
  8,
  30,
  22,
  30,
  23,
  59
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);


