# Frontend Payment Integration Guide

## Quick Answer

**Yes!** You can (and should) include the booking ID in the payment request. Here's how:

## The Solution

**Create the payment record BEFORE sending to Hesabe**, with the booking ID in the `transaction_reference`:

```typescript
// Format: MH_<booking-id>_<timestamp>
const orderReference = `MH_${bookingId}_${timestamp}`;
```

## Complete Example

### Step 1: Use Payment Service

```typescript
import { paymentService } from '@/services/paymentService';

// When user wants to pay for a booking
async function initiatePayment(bookingId: string, amount: number) {
  try {
    // 1. Create payment record with booking ID in reference
    const { payment_id, order_reference } = await paymentService.createPaymentForBooking({
      booking_id: bookingId,
      amount: amount,
      currency: 'KWD',
      payment_method: 'KNET'
    });

    console.log('Payment created:', payment_id);
    console.log('Order reference (includes booking ID):', order_reference);
    // Output: MH_630ca2ab-66f4-4db8-82a6-5e407d16f801_1766037163

    // 2. Send payment to Hesabe with the order reference
    const hesabeResponse = await initiateHesabePayment({
      amount: amount,
      currency: 'KWD',
      orderReferenceNumber: order_reference, // Includes booking ID!
      webhookUrl: 'https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/hesabe-payment-webhook'
    });

    // 3. Redirect user to Hesabe payment page
    if (hesabeResponse.payment_url) {
      window.location.href = hesabeResponse.payment_url;
    }

    return { success: true, payment_id, order_reference };
  } catch (error) {
    console.error('Payment initiation error:', error);
    throw error;
  }
}
```

### Step 2: Hesabe Payment Request

```typescript
async function initiateHesabePayment(data: {
  amount: number;
  currency: string;
  orderReferenceNumber: string;
  webhookUrl: string;
}) {
  // Prepare Hesabe payment request
  const hesabeRequest = {
    merchantCode: '842217',
    amount: data.amount.toString(),
    currency: data.currency,
    orderReferenceNumber: data.orderReferenceNumber, // MH_<booking-id>_<timestamp>
    webhookUrl: data.webhookUrl,
    // ... other Hesabe required fields
  };

  // Send to Hesabe API
  const response = await fetch('https://api.hesabe.com/payment/initiate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // ... Hesabe authentication headers
    },
    body: JSON.stringify(hesabeRequest)
  });

  return await response.json();
}
```

## How It Works

```
Frontend                          Database                    Hesabe                    Webhook
   │                                 │                          │                         │
   ├─ Create Payment ───────────────>│                          │                         │
   │  (with MH_<booking-id>_<ts>)   │                          │                         │
   │                                 │                          │                         │
   ├─ Send to Hesabe ───────────────────────────────────────>│                         │
   │  (orderReferenceNumber)         │                          │                         │
   │                                 │                          │                         │
   │                                 │                          ├─ Process Payment        │
   │                                 │                          │                         │
   │                                 │                          ├─ Call Webhook ──────────>│
   │                                 │                          │  (reference_number)    │
   │                                 │                          │                         │
   │                                 │<─ Update Payment ────────┼─────────────────────────┤
   │                                 │  (status: completed)      │                         │
   │                                 │                          │                         │
   │<─ Payment Success ──────────────┼──────────────────────────┼─────────────────────────┤
```

## Key Points

### ✅ What Happens:

1. **Frontend creates payment** with `transaction_reference = MH_<booking-id>_<timestamp>`
2. **Frontend sends to Hesabe** with `orderReferenceNumber = MH_<booking-id>_<timestamp>`
3. **Hesabe processes payment** and calls webhook
4. **Webhook receives** `reference_number = MH_<booking-id>_<timestamp>`
5. **Webhook finds payment** by exact match ✅
6. **Webhook updates** payment status and booking status ✅

### ✅ Benefits:

- **Always finds payment** - Reference includes booking ID
- **No lookup issues** - Exact match works
- **Traceable** - Can identify booking from reference
- **Reliable** - Multiple fallback strategies in webhook

## Flutter Example

```dart
// services/payment_service.dart
class PaymentService {
  Future<Map<String, dynamic>> createPaymentForBooking({
    required String bookingId,
    required double amount,
    String currency = 'KWD',
  }) async {
    // 1. Get booking
    final booking = await _getBooking(bookingId);
    
    // 2. Generate reference with booking ID
    final timestamp = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    final orderReference = 'MH_${bookingId}_$timestamp';
    
    // 3. Create payment record
    final payment = await _supabase
        .from('payments')
        .insert({
          'booking_id': bookingId,
          'payer_id': booking['customer_id'],
          'payee_id': booking['influencer_id'],
          'amount': amount,
          'currency': currency,
          'status': 'pending',
          'transaction_reference': orderReference, // Includes booking ID!
          'payment_method': 'KNET',
        })
        .select()
        .single()
        .execute();
    
    // 4. Return for Hesabe payment
    return {
      'payment_id': payment.data['id'],
      'order_reference': orderReference,
    };
  }
  
  // Use order_reference when calling Hesabe
  Future<void> initiateHesabePayment(String orderReference, double amount) async {
    // Include orderReference in Hesabe request
    // Hesabe will send this back in webhook
  }
}
```

## Testing

### Test Payment Creation

```typescript
// Test the payment creation
const testBookingId = '630ca2ab-66f4-4db8-82a6-5e407d16f801';

const result = await paymentService.createPaymentForBooking({
  booking_id: testBookingId,
  amount: 20.00,
  currency: 'KWD'
});

console.log('Order Reference:', result.order_reference);
// Should output: MH_630ca2ab-66f4-4db8-82a6-5e407d16f801_1766037163
```

### Verify in Database

```sql
-- Check payment was created correctly
SELECT 
  id,
  booking_id,
  transaction_reference,
  status,
  amount
FROM payments
WHERE booking_id = '630ca2ab-66f4-4db8-82a6-5e407d16f801'
ORDER BY created_at DESC;
```

## Summary

**Answer**: Yes! Include booking ID in the payment reference when creating the payment record.

**Format**: `MH_<booking-id>_<timestamp>`

**Flow**:
1. Frontend: Create payment with `transaction_reference = MH_<booking-id>_<timestamp>`
2. Frontend: Send to Hesabe with `orderReferenceNumber = MH_<booking-id>_<timestamp>`
3. Hesabe: Calls webhook with `reference_number = MH_<booking-id>_<timestamp>`
4. Webhook: Finds payment by exact match ✅

**Result**: Payment is always found because the reference includes the booking ID!

---

**Last Updated**: Frontend payment integration with booking ID

