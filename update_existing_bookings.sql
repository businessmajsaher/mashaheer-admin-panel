-- Update Existing Bookings with Deadlines
-- Run this to calculate deadlines for existing bookings

-- Update bookings that don't have deadlines set yet
UPDATE public.bookings
SET 
  -- Calculate days gap
  days_gap = GREATEST(1, EXTRACT(EPOCH FROM (scheduled_time - created_at)) / 86400)::integer,
  
  -- Set influencer approval deadline (12 hrs from creation)
  influencer_approval_deadline = CASE 
    WHEN influencer_approval_deadline IS NULL THEN created_at + INTERVAL '12 hours'
    ELSE influencer_approval_deadline
  END,
  
  -- Set appointment end time (appointment day 11:59 PM)
  appointment_end_time = CASE 
    WHEN appointment_end_time IS NULL AND scheduled_time IS NOT NULL 
    THEN DATE_TRUNC('day', scheduled_time) + INTERVAL '1 day' - INTERVAL '1 second'
    ELSE appointment_end_time
  END,
  
  -- Set auto-approval deadline (appointment day 10:30 PM)
  auto_approval_deadline = CASE 
    WHEN auto_approval_deadline IS NULL AND scheduled_time IS NOT NULL 
    THEN DATE_TRUNC('day', scheduled_time) + INTERVAL '22 hours 30 minutes'
    ELSE auto_approval_deadline
  END,
  
  -- Set payment deadline if influencer has approved (12 hrs after approval)
  -- This should be set by application logic when status changes to "awaiting payment"
  payment_deadline = CASE 
    WHEN payment_deadline IS NULL 
      AND status_id IN (
        SELECT id FROM booking_statuses WHERE name = 'awaiting payment'
      )
    THEN updated_at + INTERVAL '12 hours'
    ELSE payment_deadline
  END,
  
  -- Set script submission deadline if payment is confirmed
  -- This should be set by application logic when payment is confirmed
  script_submission_deadline = CASE 
    WHEN script_submission_deadline IS NULL 
      AND days_gap IS NOT NULL
      AND status_id IN (
        SELECT id FROM booking_statuses WHERE name IN ('payment confirmed', 'awaiting script')
      )
    THEN updated_at + (INTERVAL '8 hours' * GREATEST(1, days_gap - 1))
    ELSE script_submission_deadline
  END
  
WHERE 
  -- Only update bookings that need deadlines
  (
    influencer_approval_deadline IS NULL 
    OR appointment_end_time IS NULL 
    OR auto_approval_deadline IS NULL
    OR (payment_deadline IS NULL AND status_id IN (SELECT id FROM booking_statuses WHERE name = 'awaiting payment'))
    OR (script_submission_deadline IS NULL AND status_id IN (SELECT id FROM booking_statuses WHERE name IN ('payment confirmed', 'awaiting script')))
  )
  AND scheduled_time IS NOT NULL;

-- Verify the updates
SELECT 
  id,
  days_gap,
  influencer_approval_deadline,
  payment_deadline,
  script_submission_deadline,
  auto_approval_deadline,
  appointment_end_time,
  created_at,
  scheduled_time
FROM bookings
WHERE scheduled_time IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

