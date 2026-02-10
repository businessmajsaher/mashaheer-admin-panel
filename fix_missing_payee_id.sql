-- Fix payments missing payee_id by updating from booking
-- This will make them appear in Cash Out

-- Step 1: Check which payments are missing payee_id but booking has influencer_id
SELECT 
  p.id as payment_id,
  p.booking_id,
  p.payee_id as current_payee_id,
  b.influencer_id as booking_influencer_id,
  CASE 
    WHEN p.payee_id IS NULL AND b.influencer_id IS NOT NULL THEN 'Can fix'
    WHEN p.payee_id IS NULL AND b.influencer_id IS NULL THEN 'Cannot fix - booking missing influencer_id'
    WHEN p.payee_id IS NOT NULL THEN 'Already has payee_id'
    ELSE 'Unknown'
  END as status
FROM payments p
LEFT JOIN bookings b ON p.booking_id = b.id
WHERE p.id IN (
  '7f2333ed-6cf6-4100-b6e3-a3ba9c06c48d',
  '2e89b638-812e-4f95-8d6c-5e8b3d73d7e7'
)
ORDER BY p.created_at DESC;

-- Step 2: Update payments missing payee_id (if booking has influencer_id)
UPDATE payments p
SET payee_id = b.influencer_id
FROM bookings b
WHERE 
  p.booking_id = b.id
  AND p.payee_id IS NULL
  AND b.influencer_id IS NOT NULL;

-- Step 3: Verify the fix
SELECT 
  p.id,
  p.booking_id,
  p.status,
  p.payee_id,
  p.amount,
  CASE 
    WHEN p.payee_id IS NOT NULL THEN '✅ Fixed - Should appear in Cash Out'
    ELSE '❌ Still missing payee_id'
  END as fix_status
FROM payments p
WHERE p.id IN (
  '7f2333ed-6cf6-4100-b6e3-a3ba9c06c48d',
  '2e89b638-812e-4f95-8d6c-5e8b3d73d7e7'
);

-- Step 4: Count how many were fixed
SELECT 
  'Payments fixed' as metric,
  COUNT(*)::text as value
FROM payments p
JOIN bookings b ON p.booking_id = b.id
WHERE 
  p.payee_id IS NOT NULL
  AND p.payee_id = b.influencer_id
  AND LOWER(TRIM(p.status)) IN ('completed', 'paid', 'success', 'successful');
