-- Test Script for Delivery Date Fix
-- Run this to verify bookings with passed delivery dates

-- 1. Find bookings where delivery date has passed but status hasn't been updated
SELECT 
  b.id,
  bs.name as current_status,
  b.scheduled_time as delivery_date,
  CASE 
    WHEN b.scheduled_time < NOW() THEN '✅ PASSED'
    ELSE '⏳ FUTURE'
  END as delivery_status,
  b.influencer_approval_deadline,
  b.payment_deadline,
  CASE 
    WHEN b.scheduled_time < NOW() AND bs.name = 'awaiting approval from influencer' 
      THEN '⚠️ SHOULD BE AUTO-REJECTED'
    WHEN b.scheduled_time < NOW() AND bs.name = 'awaiting payment' 
      THEN '⚠️ SHOULD BE AUTO-CANCELLED'
    ELSE '✅ OK'
  END as expected_action,
  c.name as customer_name,
  i.name as influencer_name,
  b.updated_at,
  NOW() - b.updated_at as time_since_update
FROM bookings b
JOIN booking_statuses bs ON b.status_id = bs.id
LEFT JOIN profiles c ON b.customer_id = c.id
LEFT JOIN profiles i ON b.influencer_id = i.id
WHERE 
  b.scheduled_time < NOW()
  AND bs.name IN ('awaiting approval from influencer', 'awaiting payment')
ORDER BY b.scheduled_time DESC;

-- 2. Check bookings that were recently auto-updated
SELECT 
  b.id,
  bs.name as status,
  b.scheduled_time,
  b.updated_at,
  NOW() - b.updated_at as time_since_update,
  c.name as customer_name,
  i.name as influencer_name
FROM bookings b
JOIN booking_statuses bs ON b.status_id = bs.id
LEFT JOIN profiles c ON b.customer_id = c.id
LEFT JOIN profiles i ON b.influencer_id = i.id
WHERE bs.name IN ('auto-reject', 'auto-cancel')
  AND b.updated_at > NOW() - INTERVAL '24 hours'
ORDER BY b.updated_at DESC
LIMIT 20;

-- 3. Count bookings by status (to see distribution)
SELECT 
  bs.name as status,
  COUNT(*) as count,
  COUNT(CASE WHEN b.scheduled_time < NOW() THEN 1 END) as with_passed_delivery
FROM bookings b
JOIN booking_statuses bs ON b.status_id = bs.id
WHERE bs.name IN (
  'awaiting approval from influencer',
  'awaiting payment',
  'auto-reject',
  'auto-cancel'
)
GROUP BY bs.name
ORDER BY bs.name;

-- 4. Test: Manually set a booking's delivery date to past (for testing)
-- Uncomment and replace with actual booking ID to test
-- UPDATE bookings 
-- SET scheduled_time = NOW() - INTERVAL '1 day'
-- WHERE id = 'your-booking-id-here'
-- RETURNING id, scheduled_time;

-- 5. Verify status names exist
SELECT name, id, description 
FROM booking_statuses 
WHERE name IN (
  'awaiting approval from influencer',
  'awaiting payment',
  'auto-reject',
  'auto-cancel'
)
ORDER BY name;

