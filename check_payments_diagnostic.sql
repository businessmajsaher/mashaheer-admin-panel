-- Payment Diagnostic Queries
-- Run this in Supabase SQL Editor to diagnose why payments aren't showing in Cash Out

-- 1. Count all payments by status
SELECT 
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM payments
GROUP BY status
ORDER BY count DESC;

-- 2. Check payments with payee_id (required for Cash Out)
SELECT 
  COUNT(*) as total_payments,
  COUNT(payee_id) as payments_with_payee_id,
  COUNT(*) - COUNT(payee_id) as payments_without_payee_id
FROM payments;

-- 3. Payments that SHOULD appear in Cash Out
-- (Must have: payee_id set + status in ['completed', 'paid', 'success', 'successful'])
SELECT 
  p.id,
  p.booking_id,
  p.payer_id,
  p.payee_id,
  p.amount,
  p.currency,
  p.status,
  p.payment_method,
  p.transaction_reference,
  p.paid_at,
  p.created_at,
  payer.name as payer_name,
  payee.name as payee_name,
  b.id as booking_exists
FROM payments p
LEFT JOIN profiles payer ON p.payer_id = payer.id
LEFT JOIN profiles payee ON p.payee_id = payee.id
LEFT JOIN bookings b ON p.booking_id = b.id
WHERE 
  p.payee_id IS NOT NULL
  AND LOWER(TRIM(p.status)) IN ('completed', 'paid', 'success', 'successful')
ORDER BY p.created_at DESC
LIMIT 50;

-- 4. Payments that are EXCLUDED from Cash Out (with reasons)
SELECT 
  p.id,
  p.status,
  p.payee_id,
  CASE 
    WHEN p.payee_id IS NULL THEN 'Missing payee_id'
    WHEN LOWER(TRIM(p.status)) NOT IN ('completed', 'paid', 'success', 'successful') THEN 'Status not eligible: ' || p.status
    ELSE 'Should be included'
  END as exclusion_reason,
  p.amount,
  p.currency,
  p.paid_at,
  p.created_at
FROM payments p
WHERE 
  p.payee_id IS NULL
  OR LOWER(TRIM(p.status)) NOT IN ('completed', 'paid', 'success', 'successful')
ORDER BY p.created_at DESC
LIMIT 50;

-- 5. Recent payments (last 20) with full details
SELECT 
  p.id,
  p.booking_id,
  p.status,
  p.amount,
  p.currency,
  p.payee_id,
  payee.name as payee_name,
  payee.email as payee_email,
  p.payer_id,
  payer.name as payer_name,
  p.payment_method,
  p.transaction_reference,
  p.paid_at,
  p.created_at,
  CASE 
    WHEN p.payee_id IS NULL THEN '❌ Missing payee_id'
    WHEN LOWER(TRIM(p.status)) NOT IN ('completed', 'paid', 'success', 'successful') THEN '❌ Status: ' || p.status
    ELSE '✅ Should appear in Cash Out'
  END as cash_out_status
FROM payments p
LEFT JOIN profiles payee ON p.payee_id = payee.id
LEFT JOIN profiles payer ON p.payer_id = payer.id
ORDER BY p.created_at DESC
LIMIT 20;

-- 6. Summary statistics
SELECT 
  'Total Payments' as metric,
  COUNT(*)::text as value
FROM payments
UNION ALL
SELECT 
  'Payments with payee_id',
  COUNT(*)::text
FROM payments
WHERE payee_id IS NOT NULL
UNION ALL
SELECT 
  'Eligible for Cash Out',
  COUNT(*)::text
FROM payments
WHERE 
  payee_id IS NOT NULL
  AND LOWER(TRIM(status)) IN ('completed', 'paid', 'success', 'successful')
UNION ALL
SELECT 
  'Total Amount (Eligible)',
  COALESCE(SUM(amount), 0)::text
FROM payments
WHERE 
  payee_id IS NOT NULL
  AND LOWER(TRIM(status)) IN ('completed', 'paid', 'success', 'successful');

-- 7. Check for payments with different status formats (case sensitivity issues)
SELECT 
  status,
  LOWER(TRIM(status)) as normalized_status,
  COUNT(*) as count
FROM payments
GROUP BY status, LOWER(TRIM(status))
ORDER BY count DESC;
