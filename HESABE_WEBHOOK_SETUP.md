# Hesabe Payment Webhook Setup Guide

## Overview

This guide explains how to set up and configure the Hesabe payment webhook to receive payment status updates.

## Webhook Endpoint

**URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/hesabe-webhook`

**Method**: POST

**Content-Type**: application/json

## Webhook Payload Format

Hesabe sends webhook data in the following format:

```json
{
   "blocks": [
       {
           "type": "header",
           "text": {
               "type": "plain_text",
               "text": "TRANSACTION SUCCESSFUL",
               "emoji": true
           }
       },
       {
           "type": "section",
           "fields": [
               {
                   "type": "mrkdwn",
                   "text": "*Date & Time:*\n2023-09-20T10:09:36"
               },
               {
                   "type": "mrkdwn",
                   "text": "*Transaction Token:*\n84221716951937729753667644493"
               }
           ]
       },
       {
           "type": "section",
           "fields": [
               {
                   "type": "mrkdwn",
                   "text": "*Order Reference Number:*\n1695193758"
               },
               {
                   "type": "mrkdwn",
                   "text": "*Service Type:*\nPayment Gateway"
               }
           ]
       },
       {
           "type": "section",
           "fields": [
               {
                   "type": "mrkdwn",
                   "text": "*Amount:*\nKWD 49"
               },
               {
                   "type": "mrkdwn",
                   "text": "*Payment Type:*\nKNET"
               }
           ]
       }
   ],
   "token": "84221716951937729753667644493",
   "amount": "49.000",
   "reference_number": "1695193758",
   "status": "SUCCESSFUL",
   "payment_type": "KNET",
   "service_type": "Payment Gateway",
   "datetime": "2023-09-20 10:09:36"
}
```

## Setup Steps

### Step 1: Deploy the Webhook Function

```bash
cd /Users/akshaykc/Documents/development/mashaheer-admin-panel
supabase functions deploy hesabe-webhook
```

### Step 2: Enable Public Access (CRITICAL)

**The webhook URL is included in the payment request, so Hesabe will automatically call it. However, the Supabase function must be publicly accessible.**

**Method: Using config.toml (Recommended)**

The `supabase/config.toml` file has been created with the correct configuration. Simply deploy the function:

```bash
supabase functions deploy hesabe-webhook
```

The configuration file contains:
```toml
[functions.hesabe-webhook]
verify_jwt = false  # This makes it publicly accessible
```

**Why?** Hesabe cannot send Supabase authentication headers, so the function must accept unauthenticated requests.

**Verification:**
```bash
# Run the verification script
./scripts/verify_webhook_access.sh
```

Should return HTTP 200 or 400 (not 401).

### Step 3: Webhook URL in Payment Request

**No Hesabe Dashboard configuration needed!** The webhook URL is automatically included in the payment request when you initiate a payment. Hesabe will call this URL when payment status changes.

**Webhook URL Format:**
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/hesabe-webhook
```

Make sure this URL is included in your payment initiation request to Hesabe.

### Step 3: Test the Webhook

#### Option A: Using curl

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/hesabe-webhook \
  -d '{
    "token": "84221716951937729753667644493",
    "amount": "49.000",
    "reference_number": "1695193758",
    "status": "SUCCESSFUL",
    "payment_type": "KNET",
    "service_type": "Payment Gateway",
    "datetime": "2023-09-20 10:09:36"
  }'
```

#### Option B: Using Postman

1. Create new POST request
2. URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/hesabe-webhook`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "token": "84221716951937729753667644493",
  "amount": "49.000",
  "reference_number": "1695193758",
  "status": "SUCCESSFUL",
  "payment_type": "KNET",
  "service_type": "Payment Gateway",
  "datetime": "2023-09-20 10:09:36"
}
```

## How It Works

### 1. Webhook Receives Payment Status

When Hesabe processes a payment, it sends a webhook to your endpoint with:
- `token` - Transaction token
- `reference_number` - Order reference number (matches `transaction_reference` in payments table)
- `status` - Payment status (SUCCESSFUL, FAILED, PENDING)
- `amount` - Payment amount
- `payment_type` - Payment method (KNET, etc.)
- `datetime` - Transaction date/time

### 2. Function Processes Webhook

The webhook handler:
1. **Extracts** transaction details from payload
2. **Finds** payment record by `reference_number` (matches `transaction_reference`)
3. **Updates** payment status:
   - `SUCCESSFUL` → `completed`
   - `FAILED` → `failed`
   - `PENDING` → `processing`
4. **Updates** booking status to "payment confirmed" if payment is successful
5. **Sends** notifications to customer and influencer

### 3. Payment Status Mapping

| Hesabe Status | Database Status | Description |
|---------------|----------------|-------------|
| SUCCESSFUL | completed | Payment successful |
| SUCCESS | completed | Payment successful (alternative) |
| FAILED | failed | Payment failed |
| FAILURE | failed | Payment failed (alternative) |
| PENDING | processing | Payment pending |
| PROCESSING | processing | Payment processing |

## Database Updates

### Payments Table

When webhook is received:
- `status` is updated to match payment status
- `paid_at` is set if payment is successful
- `transaction_reference` is updated if token is provided

### Bookings Table

If payment is successful:
- `status_id` is updated to "payment confirmed"
- `updated_at` is updated

## Testing with Real Payment

### Step 1: Create a Test Payment

```sql
-- Create a test payment record
INSERT INTO payments (
  booking_id,
  payer_id,
  payee_id,
  amount,
  currency,
  status,
  transaction_reference,
  payment_method
) VALUES (
  'your-booking-id',
  'customer-id',
  'influencer-id',
  49.00,
  'KWD',
  'pending',
  '1695193758',  -- This should match reference_number in webhook
  'KNET'
) RETURNING *;
```

### Step 2: Trigger Webhook

Use the test command above with the `reference_number` matching your test payment.

### Step 3: Verify Updates

```sql
-- Check payment status
SELECT 
  id,
  status,
  paid_at,
  transaction_reference,
  updated_at
FROM payments
WHERE transaction_reference = '1695193758';

-- Check booking status
SELECT 
  b.id,
  bs.name as status,
  b.updated_at
FROM bookings b
JOIN booking_statuses bs ON b.status_id = bs.id
WHERE b.id = 'your-booking-id';
```

## Troubleshooting

### Webhook Not Receiving Data

1. **Check function logs:**
   - Supabase Dashboard → Edge Functions → hesabe-webhook → Logs
   - Look for incoming requests

2. **Verify webhook URL in Hesabe:**
   - Ensure URL is correct
   - Check if HTTPS is required
   - Verify webhook is enabled

3. **Check CORS:**
   - Webhook should accept POST requests
   - CORS headers are included in response

### Payment Not Found

**Error**: "Payment not found for reference: XXXX"

**Solution**:
- Verify `reference_number` in webhook matches `transaction_reference` in payments table
- Check if payment was created before webhook was sent
- Ensure reference number format matches exactly

### Status Not Updating

**Issue**: Payment status not updating in database

**Solution**:
1. Check function logs for errors
2. Verify RLS policies allow updates
3. Check if payment record exists
4. Verify status mapping is correct

### Booking Status Not Updating

**Issue**: Booking status not changing to "payment confirmed"

**Solution**:
1. Verify "payment confirmed" status exists:
   ```sql
   SELECT * FROM booking_statuses WHERE name = 'payment confirmed';
   ```
2. Check if booking_id is correctly linked
3. Review function logs for booking update errors

## Webhook Security

### Recommended: Add Webhook Signature Verification

To verify webhooks are from Hesabe, add signature verification:

```typescript
// In webhook handler, add signature verification
const receivedSignature = req.headers.get('X-Hesabe-Signature');
const expectedSignature = generateSignature(JSON.stringify(payload), SECRET_KEY);

if (receivedSignature !== expectedSignature) {
  return new Response(
    JSON.stringify({ error: 'Invalid signature' }),
    { status: 401 }
  );
}
```

**Note**: Check Hesabe documentation for their signature method.

## Monitoring

### Check Recent Webhook Calls

```sql
-- View recent payment updates
SELECT 
  id,
  status,
  paid_at,
  transaction_reference,
  updated_at
FROM payments
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;
```

### Check Function Logs

1. Go to Supabase Dashboard
2. Edge Functions → hesabe-webhook → Logs
3. Look for:
   - ✅ "Webhook Payload:" - Shows received data
   - ✅ "Payment updated successfully" - Confirms update
   - ❌ Error messages - Indicates issues

## Webhook Response

The webhook returns:

**Success (200)**:
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "payment_id": "uuid",
  "status": "completed"
}
```

**Error (400/500)**:
```json
{
  "error": "Error message",
  "message": "Detailed error description"
}
```

## Next Steps

1. ✅ Deploy webhook function
2. ✅ Configure webhook URL in Hesabe dashboard
3. ✅ Test with sample payload
4. ✅ Monitor logs for real transactions
5. ✅ Verify payments are updating correctly

---

**Last Updated**: Hesabe webhook handler implementation

