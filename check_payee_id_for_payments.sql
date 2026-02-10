-- Check if payments have payee_id (required for Cash Out)

-- Check the specific payments that aren't showing
SELECT 
  p.id,
  p.booking_id,
  p.status,
  p.amount,
  p.payee_id,
  p.payer_id,
  p.paid_at,
  p.created_at,
  CASE 
    WHEN p.payee_id IS NULL THEN '❌ MISSING payee_id - This is why it''s not showing!'
    ELSE '✅ Has payee_id'
  END as payee_status,
  payee.name as influencer_name,
  payer.name as customer_name
FROM payments p
LEFT JOIN profiles payee ON p.payee_id = payee.id
LEFT JOIN profiles payer ON p.payer_id = payer.id
WHERE p.id IN (
  '7f2333ed-6cf6-4100-b6e3-a3ba9c06c48d',
  '2e89b638-812e-4f95-8d6c-5e8b3d73d7e7'
);

-- Check all payments and their payee_id status
SELECT 
  COUNT(*) as total_payments,
  COUNT(payee_id) as payments_with_payee_id,
  COUNT(*) - COUNT(payee_id) as payments_missing_payee_id
FROM payments;

-- Show payments missing payee_id
SELECT 
  p.id,
  p.booking_id,
  p.status,
  p.amount,
  p.payee_id,
  p.paid_at,
  b.influencer_id as booking_influencer_id,
  CASE 
    WHEN p.payee_id IS NULL AND b.influencer_id IS NOT NULL THEN '⚠️ Can fix: booking has influencer_id'
    WHEN p.payee_id IS NULL AND b.influencer_id IS NULL THEN '❌ Cannot fix: booking also missing influencer_id'
    ELSE '✅ Has payee_id'
  END as fix_status
FROM payments p
LEFT JOIN bookings b ON p.booking_id = b.id
WHERE p.payee_id IS NULL
ORDER BY p.created_at DESC
LIMIT 20;
