-- Quick Test: Create a Booking with Expired Deadline
-- Run this to test auto-reject functionality

-- Step 1: Create a test booking (or use existing one)
-- Get a booking ID from your admin panel first

-- Step 2: Set expired deadline for testing
UPDATE bookings
SET 
  influencer_approval_deadline = NOW() - INTERVAL '1 hour',
  status_id = (SELECT id FROM booking_statuses WHERE name = 'awaiting approval from influencer' LIMIT 1)
WHERE id = 'YOUR_BOOKING_ID_HERE'
RETURNING 
  id,
  status_id,
  influencer_approval_deadline,
  created_at;

-- Step 3: Wait 5 minutes or trigger function manually
-- Then check if status changed:

SELECT 
  b.id,
  bs.name as current_status,
  b.influencer_approval_deadline,
  b.updated_at,
  CASE 
    WHEN bs.name = 'auto-reject' THEN '✅ Auto-rejected successfully!'
    WHEN b.influencer_approval_deadline < NOW() THEN '⏳ Should be auto-rejected soon'
    ELSE '❌ Not processed yet'
  END as status
FROM bookings b
JOIN booking_statuses bs ON b.status_id = bs.id
WHERE b.id = 'YOUR_BOOKING_ID_HERE';

