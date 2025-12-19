-- Debug why payments aren't showing in Cash Out
-- Run this to see what's being filtered out

-- ============================================
-- 1. Check payments that SHOULD appear in Cash Out
-- ============================================
SELECT 
  p.id,
  p.booking_id,
  p.status,
  LOWER(TRIM(p.status)) as normalized_status,
  p.amount,
  p.currency,
  p.payee_id,
  p.payer_id,
  p.paid_at,
  p.created_at,
  payee.name as influencer_name,
  CASE 
    WHEN p.payee_id IS NULL THEN '❌ Missing payee_id'
    WHEN LOWER(TRIM(p.status)) NOT IN ('completed', 'paid', 'success', 'successful') THEN '❌ Wrong status: ' || p.status
    ELSE '✅ Should appear in Cash Out'
  END as cash_out_status
FROM payments p
LEFT JOIN profiles payee ON p.payee_id = payee.id
ORDER BY p.created_at DESC
LIMIT 20;

-- ============================================
-- 2. Count by eligibility criteria
-- ============================================
SELECT 
  'Total Payments' as check_type,
  COUNT(*) as count
FROM payments
UNION ALL
SELECT 
  'Has payee_id',
  COUNT(*)
FROM payments
WHERE payee_id IS NOT NULL
UNION ALL
SELECT 
  'Status = completed',
  COUNT(*)
FROM payments
WHERE LOWER(TRIM(status)) = 'completed'
UNION ALL
SELECT 
  'Status = paid',
  COUNT(*)
FROM payments
WHERE LOWER(TRIM(status)) = 'paid'
UNION ALL
SELECT 
  'Status = success',
  COUNT(*)
FROM payments
WHERE LOWER(TRIM(status)) = 'success'
UNION ALL
SELECT 
  'Status = successful',
  COUNT(*)
FROM payments
WHERE LOWER(TRIM(status)) = 'successful'
UNION ALL
SELECT 
  'Eligible (has payee_id + correct status)',
  COUNT(*)
FROM payments
WHERE 
  payee_id IS NOT NULL
  AND LOWER(TRIM(status)) IN ('completed', 'paid', 'success', 'successful');

-- ============================================
-- 3. Check all unique status values
-- ============================================
SELECT 
  status,
  LOWER(TRIM(status)) as normalized,
  COUNT(*) as count
FROM payments
GROUP BY status, LOWER(TRIM(status))
ORDER BY count DESC;

-- ============================================
-- 4. Check date ranges (if date filter is applied)
-- ============================================
-- Current month payments
SELECT 
  'Current Month' as period,
  COUNT(*) as payment_count,
  SUM(amount) as total_amount
FROM payments
WHERE 
  payee_id IS NOT NULL
  AND LOWER(TRIM(status)) IN ('completed', 'paid', 'success', 'successful')
  AND DATE(COALESCE(paid_at, created_at)) >= DATE_TRUNC('month', CURRENT_DATE)
  AND DATE(COALESCE(paid_at, created_at)) <= CURRENT_DATE
UNION ALL
-- Current week payments
SELECT 
  'Current Week',
  COUNT(*),
  SUM(amount)
FROM payments
WHERE 
  payee_id IS NOT NULL
  AND LOWER(TRIM(status)) IN ('completed', 'paid', 'success', 'successful')
  AND DATE(COALESCE(paid_at, created_at)) >= DATE_TRUNC('week', CURRENT_DATE)
  AND DATE(COALESCE(paid_at, created_at)) <= CURRENT_DATE
UNION ALL
-- All time (no date filter)
SELECT 
  'All Time',
  COUNT(*),
  SUM(amount)
FROM payments
WHERE 
  payee_id IS NOT NULL
  AND LOWER(TRIM(status)) IN ('completed', 'paid', 'success', 'successful');

-- ============================================
-- 5. Sample eligible payments with dates
-- ============================================
SELECT 
  p.id,
  p.status,
  p.amount,
  p.paid_at,
  p.created_at,
  DATE(COALESCE(p.paid_at, p.created_at)) as payment_date,
  DATE_TRUNC('month', CURRENT_DATE) as month_start,
  DATE_TRUNC('week', CURRENT_DATE) as week_start,
  CASE 
    WHEN DATE(COALESCE(p.paid_at, p.created_at)) >= DATE_TRUNC('month', CURRENT_DATE) THEN '✅ In current month'
    ELSE '❌ Outside current month'
  END as month_filter,
  CASE 
    WHEN DATE(COALESCE(p.paid_at, p.created_at)) >= DATE_TRUNC('week', CURRENT_DATE) THEN '✅ In current week'
    ELSE '❌ Outside current week'
  END as week_filter
FROM payments p
WHERE 
  p.payee_id IS NOT NULL
  AND LOWER(TRIM(p.status)) IN ('completed', 'paid', 'success', 'successful')
ORDER BY p.created_at DESC
LIMIT 10;
