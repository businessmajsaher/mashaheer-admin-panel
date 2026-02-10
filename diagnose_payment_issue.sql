-- COMPREHENSIVE PAYMENT DIAGNOSTIC
-- Run this to find out why payments aren't being created

-- ============================================
-- 1. CHECK IF PAYMENTS TABLE EXISTS AND HAS DATA
-- ============================================
SELECT 
  'payments table' as check_type,
  COUNT(*) as total_records,
  COUNT(DISTINCT booking_id) as unique_bookings,
  COUNT(DISTINCT payee_id) as unique_influencers,
  MIN(created_at) as oldest_payment,
  MAX(created_at) as newest_payment
FROM payments;

-- ============================================
-- 2. CHECK TRANSACTIONS TABLE (ALTERNATIVE STORAGE?)
-- ============================================
SELECT 
  'transactions table' as check_type,
  COUNT(*) as total_records,
  COUNT(DISTINCT booking_id) as unique_bookings,
  status,
  COUNT(*) as count_by_status
FROM transactions
GROUP BY status
ORDER BY count_by_status DESC;

-- ============================================
-- 3. FIND BOOKINGS THAT SHOULD HAVE PAYMENTS
-- ============================================
-- These are bookings in payment-related statuses but without payment records
SELECT 
  b.id as booking_id,
  b.created_at as booking_created,
  bs.name as booking_status,
  b.customer_id,
  b.influencer_id,
  CASE 
    WHEN b.influencer_id IS NULL THEN '❌ Missing influencer_id'
    WHEN b.customer_id IS NULL THEN '❌ Missing customer_id'
    ELSE '✅ Ready for payment'
  END as payment_readiness
FROM bookings b
JOIN booking_statuses bs ON b.status_id = bs.id
LEFT JOIN payments p ON p.booking_id = b.id
WHERE bs.name IN (
  'payment confirmed',
  'Payment Confirmed',
  'paid',
  'Paid',
  'Completed',
  'completed',
  'awaiting payment',
  'Awaiting Payment'
)
  AND p.id IS NULL
ORDER BY b.created_at DESC
LIMIT 20;

-- ============================================
-- 4. CHECK RLS POLICIES ON PAYMENTS TABLE
-- ============================================
-- RLS might be blocking inserts from the webhook
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has filter'
    ELSE 'No filter'
  END as has_filter,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has with_check'
    ELSE 'No with_check'
  END as has_with_check
FROM pg_policies
WHERE tablename = 'payments'
ORDER BY policyname;

-- ============================================
-- 5. CHECK IF PAYMENTS TABLE HAS RLS ENABLED
-- ============================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'payments'
  AND schemaname = 'public';

-- ============================================
-- 6. RECENT BOOKINGS WITH INFLUENCER (SHOULD HAVE PAYMENTS)
-- ============================================
SELECT 
  b.id,
  b.created_at,
  bs.name as status,
  b.customer_id,
  b.influencer_id,
  p.id as payment_id,
  p.status as payment_status,
  CASE 
    WHEN p.id IS NULL THEN '❌ No payment record'
    ELSE '✅ Has payment'
  END as payment_status_check
FROM bookings b
JOIN booking_statuses bs ON b.status_id = bs.id
LEFT JOIN payments p ON p.booking_id = b.id
WHERE b.influencer_id IS NOT NULL
  AND b.customer_id IS NOT NULL
ORDER BY b.created_at DESC
LIMIT 20;

-- ============================================
-- 7. SUMMARY STATISTICS
-- ============================================
SELECT 
  'Total Bookings' as metric,
  COUNT(*)::text as value
FROM bookings
UNION ALL
SELECT 
  'Bookings with Influencer',
  COUNT(*)::text
FROM bookings
WHERE influencer_id IS NOT NULL
UNION ALL
SELECT 
  'Bookings in Payment Status',
  COUNT(*)::text
FROM bookings b
JOIN booking_statuses bs ON b.status_id = bs.id
WHERE bs.name IN (
  'payment confirmed', 'Payment Confirmed', 'paid', 'Paid',
  'Completed', 'completed', 'awaiting payment', 'Awaiting Payment'
)
UNION ALL
SELECT 
  'Bookings Needing Payment Records',
  COUNT(*)::text
FROM bookings b
JOIN booking_statuses bs ON b.status_id = bs.id
LEFT JOIN payments p ON p.booking_id = b.id
WHERE bs.name IN (
  'payment confirmed', 'Payment Confirmed', 'paid', 'Paid',
  'Completed', 'completed'
)
  AND p.id IS NULL
UNION ALL
SELECT 
  'Total Payments',
  COUNT(*)::text
FROM payments
UNION ALL
SELECT 
  'Total Transactions',
  COUNT(*)::text
FROM transactions;
