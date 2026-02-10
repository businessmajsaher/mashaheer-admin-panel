# Fix: Payment Not Found in Webhook

## Problem

Webhook receives payment notification but can't find the payment record:
- Reference: `MH_630ca2ab-66f4-4db8-82a6-5e407d16f801_1766037163`
- Error: "Payment not found for reference"

## Solution

Updated webhook to use **multiple lookup strategies** to find payments:

### Lookup Strategies

1. **Exact Match**: Try exact match on `transaction_reference`
2. **MH_ Format Extraction**: If reference starts with `MH_`, extract booking ID
   - Format: `MH_<booking-id>_<timestamp>`
   - Extracts: `630ca2ab-66f4-4db8-82a6-5e407d16f801`
   - Searches by `booking_id` for pending/processing payments
3. **UUID Pattern Matching**: Extract UUID from reference and search by booking ID
4. **Debug Logging**: Logs recent payments if not found

## Updated Code

The webhook now:
- ✅ Handles `MH_` prefix format
- ✅ Extracts booking ID from reference
- ✅ Searches by booking_id if exact match fails
- ✅ Updates `transaction_reference` with webhook reference
- ✅ Logs debugging info when payment not found

## Deploy Updated Function

```bash
cd /Users/akshaykc/Documents/development/mashaheer-admin-panel
supabase functions deploy hesabe-payment-webhook
```

## How It Works Now

### Example Reference: `MH_630ca2ab-66f4-4db8-82a6-5e407d16f801_1766037163`

1. **Tries exact match** on `transaction_reference`
2. **Detects `MH_` prefix** → Extracts booking ID: `630ca2ab-66f4-4db8-82a6-5e407d16f801`
3. **Searches payments** by `booking_id = 630ca2ab-66f4-4db8-82a6-5e407d16f801`
4. **Finds payment** (if exists with that booking_id)
5. **Updates payment** with webhook reference and status

## Testing

After deployment, the webhook should:
- ✅ Find payments even if reference format doesn't match exactly
- ✅ Extract booking ID from `MH_` format
- ✅ Update payment status correctly
- ✅ Update booking status when payment succeeds

## If Payment Still Not Found

The webhook will log:
- Recent payments in database (for debugging)
- What lookup strategies were tried
- The reference number received

Check Supabase logs to see:
- What payments exist
- What reference format they use
- Why lookup might be failing

## Next Steps

1. ✅ Deploy updated function
2. ✅ Test with real payment
3. ✅ Check logs to verify payment is found
4. ✅ Verify payment status updates correctly

---

**Last Updated**: Payment lookup fix for MH_ reference format

