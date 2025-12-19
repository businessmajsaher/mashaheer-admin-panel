-- Check if payment records exist in the payments table

-- ============================================
-- 1. QUICK COUNT - Total number of payments
-- ============================================
SELECT 
  COUNT(*) as total_payments,
  COUNT(DISTINCT booking_id) as unique_bookings,
  COUNT(DISTINCT payee_id) as unique_influencers,
  COUNT(DISTINCT payer_id) as unique_customers
FROM payments;

-- ============================================
-- 2. PAYMENTS BY STATUS
-- ============================================
SELECT 
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  MIN(created_at) as oldest_payment,
  MAX(created_at) as newest_payment
FROM payments
GROUP BY status
ORDER BY count DESC;

-- ============================================
-- 3. RECENT PAYMENTS (Last 20)
-- ============================================
SELECT 
  p.id,
  p.booking_id,
  p.status,
  p.amount,
  p.currency,
  p.payment_method,
  p.transaction_reference,
  p.paid_at,
  p.created_at,
  p.updated_at,
  payer.name as payer_name,
  payee.name as payee_name
FROM payments p
LEFT JOIN profiles payer ON p.payer_id = payer.id
LEFT JOIN profiles payee ON p.payee_id = payee.id
ORDER BY p.created_at DESC
LIMIT 20;

-- ============================================
-- 4. PAYMENTS ELIGIBLE FOR CASH OUT
-- ============================================
-- These are payments that should appear in Cash Out
SELECT 
  COUNT(*) as eligible_payments,
  SUM(amount) as total_earnings,
  COUNT(DISTINCT payee_id) as influencers_with_payments
FROM payments
WHERE 
  payee_id IS NOT NULL
  AND LOWER(TRIM(status)) IN ('completed', 'paid', 'success', 'successful');

-- ============================================
-- 5. DETAILED ELIGIBLE PAYMENTS
-- ============================================
SELECT 
  p.id,
  p.booking_id,
  p.status,
  p.amount,
  p.currency,
  p.paid_at,
  p.created_at,
  payee.name as influencer_name,
  payee.email as influencer_email,
  payer.name as customer_name
FROM payments p
LEFT JOIN profiles payee ON p.payee_id = payee.id
LEFT JOIN profiles payer ON p.payer_id = payer.id
WHERE 
  p.payee_id IS NOT NULL
  AND LOWER(TRIM(p.status)) IN ('completed', 'paid', 'success', 'successful')
ORDER BY p.created_at DESC
LIMIT 20;

-- ============================================
-- 6. PAYMENTS BY DATE (Last 7 Days)
-- ============================================
SELECT 
  DATE(created_at) as payment_date,
  COUNT(*) as payment_count,
  SUM(amount) as total_amount,
  COUNT(DISTINCT payee_id) as unique_influencers
FROM payments
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY payment_date DESC;

-- ============================================
-- 7. CHECK IF SPECIFIC BOOKING HAS PAYMENT
-- ============================================
-- Replace 'YOUR_BOOKING_ID_HERE' with actual booking ID
-- Example: WHERE p.booking_id = '630ca2ab-66f4-4db8-82a6-5e407d16f801'
SELECT 
  p.id as payment_id,
  p.booking_id,
  p.status,
  p.amount,
  p.currency,
  p.transaction_reference,
  p.paid_at,
  p.created_at,
  payee.name as influencer_name
FROM payments p
LEFT JOIN profiles payee ON p.payee_id = payee.id
WHERE p.booking_id = 'YOUR_BOOKING_ID_HERE'  -- Replace with actual booking ID
ORDER BY p.created_at DESC;

-- ============================================
-- 8. SUMMARY STATISTICS
-- ============================================
SELECT 
  'Total Payments' as metric,
  COUNT(*)::text as value
FROM payments
UNION ALL
SELECT 
  'Completed Payments',
  COUNT(*)::text
FROM payments
WHERE LOWER(TRIM(status)) IN ('completed', 'paid', 'success', 'successful')
UNION ALL
SELECT 
  'Pending Payments',
  COUNT(*)::text
FROM payments
WHERE LOWER(TRIM(status)) IN ('pending', 'processing')
UNION ALL
SELECT 
  'Failed Payments',
  COUNT(*)::text
FROM payments
WHERE LOWER(TRIM(status)) IN ('failed', 'failure')
UNION ALL
SELECT 
  'Total Amount (All)',
  COALESCE(SUM(amount), 0)::text
FROM payments
UNION ALL
SELECT 
  'Total Amount (Completed)',
  COALESCE(SUM(amount), 0)::text
FROM payments
WHERE LOWER(TRIM(status)) IN ('completed', 'paid', 'success', 'successful')
UNION ALL
SELECT 
  'Earliest Payment',
  MIN(created_at)::text
FROM payments
UNION ALL
SELECT 
  'Latest Payment',
  MAX(created_at)::text
FROM payments;
