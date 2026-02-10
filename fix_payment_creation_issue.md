# Payment Creation Issue - Diagnosis

## Problem
The `payments` table has **0 records**, which means payments are not being created when customers make payments.

## Root Cause Analysis

Based on the code review, payments should be created by the Hesabe webhook (`supabase/functions/hesabe-webhook/index.ts`) when:
1. A successful payment notification is received from Hesabe
2. The webhook extracts the booking ID from the transaction reference
3. It creates a payment record in the `payments` table

## Possible Issues

### 1. **Webhook Not Being Called**
- Check if the Hesabe webhook URL is correctly configured
- Verify webhook is receiving requests (check Supabase Edge Function logs)

### 2. **RLS (Row Level Security) Blocking Inserts**
- The payments table might have RLS policies that prevent the webhook from inserting
- Check RLS policies with: `SELECT * FROM pg_policies WHERE tablename = 'payments';`

### 3. **Webhook Errors**
- Check Supabase Edge Function logs for errors
- Look for errors in the `hesabe-webhook` function logs

### 4. **Booking ID Not in Transaction Reference**
- The webhook extracts booking ID from transaction reference
- If the format is wrong, payment won't be created

## Diagnostic Steps

### Step 1: Check if Webhook is Receiving Requests
1. Go to Supabase Dashboard → Edge Functions → `hesabe-webhook`
2. Check the "Logs" tab
3. Look for recent invocations

### Step 2: Check RLS Policies
Run this query in Supabase SQL Editor:
```sql
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'payments';
```

### Step 3: Check for Bookings That Should Have Payments
```sql
-- Find bookings that are in "payment confirmed" or "completed" status
-- but don't have payment records
SELECT 
  b.id as booking_id,
  b.created_at,
  bs.name as status,
  b.customer_id,
  b.influencer_id
FROM bookings b
JOIN booking_statuses bs ON b.status_id = bs.id
LEFT JOIN payments p ON p.booking_id = b.id
WHERE bs.name IN ('payment confirmed', 'Completed', 'paid')
  AND p.id IS NULL
ORDER BY b.created_at DESC
LIMIT 20;
```

### Step 4: Check Transactions Table
```sql
-- Check if payments are being stored in transactions table instead
SELECT 
  COUNT(*) as total_transactions,
  status,
  COUNT(*) as count
FROM transactions
GROUP BY status;
```

## Solutions

### Solution 1: Fix RLS Policies (if blocking)
If RLS is blocking inserts, you may need to:
1. Allow service role to insert (webhook uses service role)
2. Or create a policy that allows inserts from edge functions

### Solution 2: Manually Create Payment Records
If you have bookings that should have payments, you can manually create them:
```sql
-- Example: Create payment for a booking
-- Replace booking_id, customer_id, influencer_id, amount with actual values
INSERT INTO payments (
  booking_id,
  payer_id,
  payee_id,
  amount,
  currency,
  status,
  payment_method,
  transaction_reference,
  paid_at
)
SELECT 
  b.id,
  b.customer_id,
  b.influencer_id,
  100.000, -- Replace with actual amount
  'KWD',
  'completed',
  'KNET',
  'MANUAL-' || b.id,
  NOW()
FROM bookings b
WHERE b.id = 'YOUR_BOOKING_ID_HERE'
  AND NOT EXISTS (
    SELECT 1 FROM payments p WHERE p.booking_id = b.id
  );
```

### Solution 3: Check Webhook Configuration
1. Verify the webhook URL is correct in Hesabe dashboard
2. Ensure the webhook is enabled
3. Check if webhook is receiving requests (check logs)

## Next Steps

1. Run the diagnostic queries in `check_all_payment_tables.sql`
2. Check Supabase Edge Function logs for `hesabe-webhook`
3. Verify RLS policies on payments table
4. Check if there are bookings that should have payments but don't
