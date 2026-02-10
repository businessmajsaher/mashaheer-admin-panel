# Webhook Auto-Create Payment Feature

## Problem

Webhook receives payment notification but payment record doesn't exist in database. This happens when:
- Payment record wasn't created before sending to Hesabe
- Payment was created but with different reference format
- Payment record was deleted or lost

## Solution

The webhook now **automatically creates the payment record** if:
1. Payment is not found
2. Booking ID can be extracted from reference
3. Payment status is SUCCESSFUL
4. Booking exists in database

## How It Works

### When Payment Not Found

1. **Extract booking ID** from reference:
   - `MH_630ca2ab-66f4-4db8-82a6-5e407d16f801_1766047349`
   - Extracts: `630ca2ab-66f4-4db8-82a6-5e407d16f801`

2. **Get booking details** from database

3. **Create payment record** with:
   - `booking_id`: Extracted booking ID
   - `transaction_reference`: Reference from webhook
   - `status`: `completed` (since webhook says SUCCESSFUL)
   - `amount`: From webhook
   - `paid_at`: From webhook datetime

4. **Update booking status** to "payment confirmed"

## Updated Webhook Logic

```typescript
if (!payment) {
  // Extract booking ID
  if (referenceNumber.startsWith('MH_')) {
    bookingId = referenceNumber.split('_')[1];
  }
  
  // If payment is successful and booking exists, create payment
  if (bookingId && status === 'SUCCESSFUL') {
    // Get booking
    const booking = await getBooking(bookingId);
    
    // Create payment record
    const newPayment = await createPayment({
      booking_id: bookingId,
      payer_id: booking.customer_id,
      payee_id: booking.influencer_id,
      amount: amount,
      status: 'completed',
      transaction_reference: referenceNumber,
      paid_at: datetime
    });
    
    // Update booking status
    await updateBookingStatus(bookingId, 'payment confirmed');
  }
}
```

## Benefits

✅ **Handles missing payment records** - Creates payment if not found  
✅ **No data loss** - Payment is saved even if frontend didn't create it  
✅ **Automatic booking update** - Updates booking status automatically  
✅ **Backward compatible** - Still works if payment exists  

## Important Notes

### ⚠️ Best Practice

**Still create payment record BEFORE sending to Hesabe** for:
- Better tracking
- Payment history
- Error handling
- Status management

### ✅ Fallback Safety

The webhook auto-creation is a **safety net** for:
- Edge cases
- Legacy payments
- Missing records
- Recovery scenarios

## Testing

### Test Auto-Creation

1. **Don't create payment** before sending to Hesabe
2. **Make payment** through Hesabe
3. **Webhook receives** payment notification
4. **Webhook creates** payment record automatically ✅
5. **Booking status** updates to "payment confirmed" ✅

### Verify Payment Created

```sql
-- Check payment was created
SELECT 
  id,
  booking_id,
  transaction_reference,
  status,
  amount,
  paid_at,
  created_at
FROM payments
WHERE booking_id = '630ca2ab-66f4-4db8-82a6-5e407d16f801'
ORDER BY created_at DESC;
```

## Deployment

The webhook has been updated. Deploy it:

```bash
supabase functions deploy hesabe-payment-webhook
```

## Summary

✅ **Webhook now auto-creates payment** if not found  
✅ **Extracts booking ID** from reference  
✅ **Creates payment record** with webhook data  
✅ **Updates booking status** automatically  
✅ **Still works** if payment exists (updates it)  

**Result**: Payment records are always saved, even if frontend didn't create them first!

---

**Last Updated**: Auto-create payment feature in webhook

