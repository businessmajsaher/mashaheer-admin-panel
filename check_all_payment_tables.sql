-- Check ALL tables that might contain payment data

-- 1. Check payments table
SELECT 
  'payments' as table_name,
  COUNT(*) as record_count,
  COUNT(DISTINCT booking_id) as unique_bookings,
  COUNT(DISTINCT payee_id) as unique_influencers
FROM payments;

-- 2. Check transactions table (alternative payment storage?)
SELECT 
  'transactions' as table_name,
  COUNT(*) as record_count,
  COUNT(DISTINCT booking_id) as unique_bookings
FROM transactions;

-- 2b. Transactions by status
SELECT 
  status,
  COUNT(*) as count_by_status,
  SUM(amount) as total_amount
FROM transactions
GROUP BY status
ORDER BY count_by_status DESC;

-- 3. Check if there are any bookings with payment-related statuses
SELECT 
  bs.name as status_name,
  COUNT(*) as booking_count
FROM bookings b
JOIN booking_statuses bs ON b.status_id = bs.id
WHERE bs.name IN (
  'awaiting payment',
  'payment confirmed',
  'paid',
  'completed',
  'Confirmed'
)
GROUP BY bs.name
ORDER BY booking_count DESC;

-- 4. Check bookings table for recent activity
SELECT 
  b.id,
  b.created_at,
  bs.name as status,
  b.customer_id,
  b.influencer_id,
  b.service_id
FROM bookings b
JOIN booking_statuses bs ON b.status_id = bs.id
ORDER BY b.created_at DESC
LIMIT 20;

-- 5. Check if webhook logs exist (if you have a webhook_logs table)
-- This might not exist, but checking anyway
SELECT 
  'webhook_logs' as table_name,
  COUNT(*) as record_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'webhook_logs';

-- 6. Check for any payment-related data in bookings (if stored there)
SELECT 
  'bookings with payment info' as check_type,
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN influencer_id IS NOT NULL THEN 1 END) as bookings_with_influencer,
  COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END) as bookings_with_customer
FROM bookings;

-- 7. Check RLS policies on payments table (to see if inserts are blocked)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'payments';
