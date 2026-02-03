# Payment Creation with Booking ID - Frontend Guide

## Overview

When creating a payment for a booking, you need to:
1. **Create payment record** in database FIRST (with booking_id)
2. **Generate order reference** that includes booking ID
3. **Send to Hesabe** with the reference number
4. **Hesabe webhook** will use this reference to find the payment

## Current Flow

The reference format you're using: `MH_<booking-id>_<timestamp>`

Example: `MH_630ca2ab-66f4-4db8-82a6-5e407d16f801_1766037163`

This is **perfect** - it includes the booking ID!

## Recommended Payment Creation Flow

### Step 1: Create Payment Record in Database

**Before** sending payment to Hesabe, create the payment record:

```typescript
// In your payment service or booking service
async function createPaymentForBooking(bookingId: string, amount: number, currency: string = 'KWD') {
  const { data: booking } = await supabase
    .from('bookings')
    .select('customer_id, influencer_id, service_id')
    .eq('id', bookingId)
    .single();

  if (!booking) {
    throw new Error('Booking not found');
  }

  // Generate order reference with booking ID
  const timestamp = Math.floor(Date.now() / 1000);
  const orderReference = `MH_${bookingId}_${timestamp}`;

  // Create payment record
  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      booking_id: bookingId,
      payer_id: booking.customer_id,
      payee_id: booking.influencer_id,
      amount: amount,
      currency: currency,
      status: 'pending',
      transaction_reference: orderReference, // Set this BEFORE sending to Hesabe
      payment_method: 'KNET' // or whatever method
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create payment: ${error.message}`);
  }

  return {
    payment,
    orderReference // Use this in Hesabe payment request
  };
}
```

### Step 2: Send Payment to Hesabe

Use the `orderReference` (which includes booking ID) in your Hesabe payment request:

```typescript
// When initiating Hesabe payment
const { payment, orderReference } = await createPaymentForBooking(
  bookingId,
  amount,
  'KWD'
);

// Include orderReference in Hesabe payment request
const hesabePaymentData = {
  merchantCode: '842217',
  amount: amount.toString(),
  currency: 'KWD',
  orderReferenceNumber: orderReference, // MH_<booking-id>_<timestamp>
  webhookUrl: 'https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/hesabe-payment-webhook',
  // ... other Hesabe required fields
};

// Send to Hesabe API
const response = await fetch('https://api.hesabe.com/payment/initiate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // ... Hesabe auth headers
  },
  body: JSON.stringify(hesabePaymentData)
});
```

### Step 3: Webhook Will Find Payment

When Hesabe calls the webhook with `reference_number: "MH_630ca2ab-66f4-4db8-82a6-5e407d16f801_1766037163"`:

1. **Exact match** on `transaction_reference` ✅
2. **Extract booking ID** from `MH_` format ✅
3. **Find payment** by booking_id ✅
4. **Update payment** status ✅

## Complete Example: React/TypeScript

```typescript
// services/paymentService.ts
import { supabase } from './supabaseClient';

export interface CreatePaymentRequest {
  booking_id: string;
  amount: number;
  currency?: string;
}

export interface PaymentResponse {
  payment_id: string;
  order_reference: string;
  hesabe_payment_url?: string;
}

export const paymentService = {
  async createPayment(request: CreatePaymentRequest): Promise<PaymentResponse> {
    const { booking_id, amount, currency = 'KWD' } = request;

    // 1. Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('customer_id, influencer_id, service_id')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found');
    }

    // 2. Generate order reference with booking ID
    const timestamp = Math.floor(Date.now() / 1000);
    const orderReference = `MH_${booking_id}_${timestamp}`;

    // 3. Create payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        booking_id: booking_id,
        payer_id: booking.customer_id,
        payee_id: booking.influencer_id,
        amount: amount,
        currency: currency,
        status: 'pending',
        transaction_reference: orderReference, // CRITICAL: Set before Hesabe
        payment_method: 'KNET'
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error(`Failed to create payment: ${paymentError.message}`);
    }

    // 4. Prepare Hesabe payment request
    const hesabeRequest = {
      merchantCode: '842217',
      amount: amount.toString(),
      currency: currency,
      orderReferenceNumber: orderReference, // Include booking ID
      webhookUrl: 'https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/hesabe-payment-webhook',
      // ... other Hesabe fields
    };

    // 5. Send to Hesabe (or return orderReference for frontend to send)
    return {
      payment_id: payment.id,
      order_reference: orderReference,
      // hesabe_payment_url: ... (if Hesabe returns redirect URL)
    };
  }
};
```

## Flutter Example

```dart
// services/payment_service.dart
class PaymentService {
  Future<Map<String, dynamic>> createPayment({
    required String bookingId,
    required double amount,
    String currency = 'KWD',
  }) async {
    // 1. Get booking details
    final bookingResponse = await _supabase
        .from('bookings')
        .select('customer_id, influencer_id')
        .eq('id', bookingId)
        .single()
        .execute();

    if (bookingResponse.data == null) {
      throw Exception('Booking not found');
    }

    final booking = bookingResponse.data;

    // 2. Generate order reference with booking ID
    final timestamp = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    final orderReference = 'MH_${bookingId}_$timestamp';

    // 3. Create payment record
    final paymentResponse = await _supabase
        .from('payments')
        .insert({
          'booking_id': bookingId,
          'payer_id': booking['customer_id'],
          'payee_id': booking['influencer_id'],
          'amount': amount,
          'currency': currency,
          'status': 'pending',
          'transaction_reference': orderReference, // Set before Hesabe
          'payment_method': 'KNET',
        })
        .select()
        .single()
        .execute();

    if (paymentResponse.data == null) {
      throw Exception('Failed to create payment');
    }

    // 4. Return order reference for Hesabe payment
    return {
      'payment_id': paymentResponse.data['id'],
      'order_reference': orderReference,
    };
  }

  // Then use order_reference when calling Hesabe API
  Future<void> initiateHesabePayment(String orderReference, double amount) async {
    final hesabeRequest = {
      'merchantCode': '842217',
      'amount': amount.toString(),
      'currency': 'KWD',
      'orderReferenceNumber': orderReference, // Includes booking ID
      'webhookUrl': 'https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/hesabe-payment-webhook',
    };

    // Send to Hesabe API
    // ...
  }
}
```

## Key Points

### ✅ DO:
1. **Create payment record FIRST** before sending to Hesabe
2. **Set `transaction_reference`** with booking ID format: `MH_<booking-id>_<timestamp>`
3. **Use same reference** in Hesabe `orderReferenceNumber`
4. **Webhook will find it** by exact match or booking ID extraction

### ❌ DON'T:
1. Don't create payment after Hesabe response
2. Don't use random reference numbers
3. Don't forget to include booking ID in reference
4. Don't send to Hesabe without creating payment record first

## Reference Number Format

**Format**: `MH_<booking-id>_<timestamp>`

**Example**: `MH_630ca2ab-66f4-4db8-82a6-5e407d16f801_1766037163`

**Breakdown**:
- `MH_` - Prefix (Mashaheer)
- `630ca2ab-66f4-4db8-82a6-5e407d16f801` - Booking ID (UUID)
- `1766037163` - Timestamp (Unix timestamp)

## Webhook Matching

The webhook will:
1. ✅ Try exact match on `transaction_reference`
2. ✅ Extract booking ID from `MH_` format
3. ✅ Search by `booking_id` if exact match fails
4. ✅ Update payment status when found

## Testing

### Test Payment Creation

```typescript
// Test creating payment with booking ID
const testBookingId = '630ca2ab-66f4-4db8-82a6-5e407d16f801';
const { payment, orderReference } = await createPaymentForBooking(
  testBookingId,
  20.00,
  'KWD'
);

console.log('Payment created:', payment.id);
console.log('Order reference:', orderReference);
// Should output: MH_630ca2ab-66f4-4db8-82a6-5e407d16f801_1766037163
```

### Verify Payment Exists

```sql
-- Check payment was created with correct reference
SELECT 
  id,
  booking_id,
  transaction_reference,
  status,
  amount,
  created_at
FROM payments
WHERE booking_id = '630ca2ab-66f4-4db8-82a6-5e407d16f801'
ORDER BY created_at DESC;
```

## Summary

**Flow**:
1. Frontend: Create payment record with `transaction_reference = MH_<booking-id>_<timestamp>`
2. Frontend: Send payment to Hesabe with `orderReferenceNumber = MH_<booking-id>_<timestamp>`
3. Hesabe: Processes payment
4. Hesabe: Calls webhook with `reference_number = MH_<booking-id>_<timestamp>`
5. Webhook: Finds payment by exact match ✅
6. Webhook: Updates payment status ✅
7. Webhook: Updates booking status ✅

**Result**: Payment is always found because reference includes booking ID!

---

**Last Updated**: Payment creation with booking ID guide

