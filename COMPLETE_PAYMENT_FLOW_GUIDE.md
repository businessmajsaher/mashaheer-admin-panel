# Complete Payment Flow Guide - Booking to Payment Completion

## Overview

This guide shows the **complete payment flow** from booking creation to payment completion, including how to save payment records at each step.

---

## Complete Payment Flow

```
1. Booking Created
   ↓
2. Influencer Approves Booking
   ↓
3. Customer Initiates Payment
   ├─ Create Payment Record (status: pending)
   ├─ Generate Order Reference (MH_<booking-id>_<timestamp>)
   └─ Send to Hesabe
   ↓
4. Customer Pays on Hesabe
   ↓
5. Hesabe Calls Webhook
   ├─ Find Payment by Reference
   ├─ Update Payment Status (pending → completed)
   ├─ Set paid_at timestamp
   └─ Update Booking Status (awaiting payment → payment confirmed)
   ↓
6. Payment Complete ✅
```

---

## Step-by-Step Implementation

### Step 1: Create Payment Record (Frontend)

**When**: Customer clicks "Pay Now" for a booking

**Location**: Frontend (React/Flutter)

```typescript
// services/paymentService.ts
import { supabase } from './supabaseClient';

export const paymentService = {
  /**
   * Complete payment flow: Create payment record and initiate Hesabe payment
   */
  async initiatePaymentForBooking(bookingId: string, amount: number) {
    try {
      // 1. Get booking details
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          id,
          customer_id,
          influencer_id,
          service_id,
          status_id,
          status:booking_statuses(name)
        `)
        .eq('id', bookingId)
        .single();

      if (bookingError || !booking) {
        throw new Error('Booking not found');
      }

      // 2. Check if payment already exists
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', bookingId)
        .in('status', ['pending', 'processing', 'completed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingPayment && existingPayment.status === 'completed') {
        throw new Error('Payment already completed for this booking');
      }

      // 3. Generate order reference with booking ID
      // Format: MH_<booking-id>_<timestamp>
      const timestamp = Math.floor(Date.now() / 1000);
      const orderReference = `MH_${bookingId}_${timestamp}`;

      // 4. Create payment record in database
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          booking_id: bookingId,
          payer_id: booking.customer_id,
          payee_id: booking.influencer_id,
          amount: amount,
          currency: 'KWD',
          status: 'pending', // Will be updated by webhook
          transaction_reference: orderReference, // CRITICAL: Includes booking ID
          payment_method: 'KNET'
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Payment creation error:', paymentError);
        throw new Error(`Failed to create payment: ${paymentError.message}`);
      }

      console.log('✅ Payment record created:', payment.id);
      console.log('📝 Order reference:', orderReference);

      // 5. Update booking status to "awaiting payment" (if not already)
      const { data: awaitingPaymentStatus } = await supabase
        .from('booking_statuses')
        .select('id')
        .eq('name', 'awaiting payment')
        .single();

      if (awaitingPaymentStatus && booking.status_id !== awaitingPaymentStatus.id) {
        await supabase
          .from('bookings')
          .update({ 
            status_id: awaitingPaymentStatus.id,
            payment_deadline: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() // 12 hours from now
          })
          .eq('id', bookingId);
      }

      // 6. Prepare Hesabe payment request
      const hesabePaymentData = {
        merchantCode: '842217',
        amount: amount.toString(),
        currency: 'KWD',
        orderReferenceNumber: orderReference, // Includes booking ID
        webhookUrl: 'https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/hesabe-payment-webhook',
        // Add other Hesabe required fields
      };

      // 7. Send to Hesabe API
      const hesabeResponse = await this.sendToHesabe(hesabePaymentData);

      return {
        success: true,
        payment_id: payment.id,
        order_reference: orderReference,
        hesabe_payment_url: hesabeResponse.payment_url, // Redirect user here
        payment: payment
      };

    } catch (error: any) {
      console.error('Payment initiation error:', error);
      throw error;
    }
  },

  /**
   * Send payment request to Hesabe API
   */
  async sendToHesabe(paymentData: any) {
    // TODO: Implement Hesabe API call
    // This should call Hesabe payment initiation endpoint
    // and return payment URL for redirect
    
    const response = await fetch('https://api.hesabe.com/payment/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Hesabe authentication headers
      },
      body: JSON.stringify(paymentData)
    });

    if (!response.ok) {
      throw new Error('Failed to initiate Hesabe payment');
    }

    return await response.json();
  },

  /**
   * Get payment status for a booking
   */
  async getPaymentStatus(bookingId: string) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
};
```

### Step 2: Use in React Component

```typescript
// pages/Bookings/PaymentButton.tsx
import { paymentService } from '@/services/paymentService';
import { message } from 'antd';

const PaymentButton: React.FC<{ booking: Booking }> = ({ booking }) => {
  const [loading, setLoading] = useState(false);

  const handlePayNow = async () => {
    setLoading(true);
    try {
      // Get booking amount (from service or booking)
      const amount = booking.service?.price || 0;

      // Initiate payment
      const result = await paymentService.initiatePaymentForBooking(
        booking.id,
        amount
      );

      message.success('Redirecting to payment...');

      // Redirect to Hesabe payment page
      if (result.hesabe_payment_url) {
        window.location.href = result.hesabe_payment_url;
      } else {
        // If Hesabe returns a form, submit it
        // Or handle redirect based on Hesabe response format
      }

    } catch (error: any) {
      message.error(error.message || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="primary"
      loading={loading}
      onClick={handlePayNow}
    >
      Pay Now
    </Button>
  );
};
```

### Step 3: Webhook Handles Payment Completion

The webhook (already created) will:
1. Receive payment status from Hesabe
2. Find payment by reference number
3. Update payment status
4. Update booking status

**No changes needed** - webhook already handles this!

---

## Alternative: Edge Function for Payment Initiation

If you prefer to handle Hesabe API calls server-side:

### Create Edge Function: `initiate-payment`

```typescript
// supabase/functions/initiate-payment/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Hesabe credentials
const HESABE_MERCHANT_CODE = Deno.env.get('HESABE_MERCHANT_CODE') || '842217';
const HESABE_API_KEY = Deno.env.get('HESABE_API_KEY')!;
const HESABE_IV_KEY = Deno.env.get('HESABE_IV_KEY')!;
const HESABE_MERCHANT_SECRET_KEY = Deno.env.get('HESABE_MERCHANT_SECRET_KEY')!;

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { booking_id, amount, currency = 'KWD' } = await req.json();

    // 1. Get booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('customer_id, influencer_id')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found');
    }

    // 2. Generate order reference
    const timestamp = Math.floor(Date.now() / 1000);
    const orderReference = `MH_${booking_id}_${timestamp}`;

    // 3. Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        booking_id,
        payer_id: booking.customer_id,
        payee_id: booking.influencer_id,
        amount,
        currency,
        status: 'pending',
        transaction_reference: orderReference,
        payment_method: 'KNET'
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error(`Failed to create payment: ${paymentError.message}`);
    }

    // 4. Prepare Hesabe request
    const hesabeData = {
      merchantCode: HESABE_MERCHANT_CODE,
      amount: amount.toString(),
      currency,
      orderReferenceNumber: orderReference,
      webhookUrl: `${SUPABASE_URL}/functions/v1/hesabe-payment-webhook`
    };

    // 5. Encrypt and send to Hesabe (implement Hesabe encryption)
    // ... Hesabe API call ...

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        order_reference: orderReference,
        // hesabe_payment_url: ...
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## Flutter Implementation

```dart
// services/payment_service.dart
class PaymentService {
  final SupabaseClient _supabase;

  PaymentService(this._supabase);

  Future<Map<String, dynamic>> initiatePaymentForBooking({
    required String bookingId,
    required double amount,
    String currency = 'KWD',
  }) async {
    // 1. Get booking
    final booking = await _supabase
        .from('bookings')
        .select('customer_id, influencer_id')
        .eq('id', bookingId)
        .single()
        .execute();

    if (booking.data == null) {
      throw Exception('Booking not found');
    }

    // 2. Generate order reference
    final timestamp = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    final orderReference = 'MH_${bookingId}_$timestamp';

    // 3. Create payment record
    final payment = await _supabase
        .from('payments')
        .insert({
          'booking_id': bookingId,
          'payer_id': booking.data!['customer_id'],
          'payee_id': booking.data!['influencer_id'],
          'amount': amount,
          'currency': currency,
          'status': 'pending',
          'transaction_reference': orderReference,
          'payment_method': 'KNET',
        })
        .select()
        .single()
        .execute();

    if (payment.data == null) {
      throw Exception('Failed to create payment');
    }

    // 4. Update booking status
    final awaitingPaymentStatus = await _supabase
        .from('booking_statuses')
        .select('id')
        .eq('name', 'awaiting payment')
        .single()
        .execute();

    if (awaitingPaymentStatus.data != null) {
      await _supabase
          .from('bookings')
          .update({
            'status_id': awaitingPaymentStatus.data!['id'],
            'payment_deadline': DateTime.now()
                .add(Duration(hours: 12))
                .toIso8601String(),
          })
          .eq('id', bookingId)
          .execute();
    }

    // 5. Send to Hesabe
    final hesabeResponse = await _sendToHesabe(
      orderReference: orderReference,
      amount: amount,
      currency: currency,
    );

    return {
      'payment_id': payment.data!['id'],
      'order_reference': orderReference,
      'hesabe_payment_url': hesabeResponse['payment_url'],
    };
  }

  Future<Map<String, dynamic>> _sendToHesabe({
    required String orderReference,
    required double amount,
    required String currency,
  }) async {
    // Implement Hesabe API call
    // Return payment URL for redirect
    throw UnimplementedError('Implement Hesabe API call');
  }
}
```

---

## Payment Record Structure

### Database Schema

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  booking_id UUID NOT NULL,
  payer_id UUID NOT NULL,      -- customer_id
  payee_id UUID NOT NULL,       -- influencer_id
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'KWD',
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  payment_method TEXT,           -- KNET, Credit Card, etc.
  transaction_reference TEXT,   -- MH_<booking-id>_<timestamp>
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Payment Status Flow

```
pending → processing → completed
   ↓
failed (if payment fails)
```

---

## Complete Flow Example

### Scenario: Customer Pays for Booking

```typescript
// 1. Customer clicks "Pay Now" for booking
const bookingId = '630ca2ab-66f4-4db8-82a6-5e407d16f801';
const amount = 20.00;

// 2. Frontend creates payment record
const result = await paymentService.initiatePaymentForBooking(bookingId, amount);

// Payment record created:
// {
//   id: 'payment-uuid',
//   booking_id: '630ca2ab-66f4-4db8-82a6-5e407d16f801',
//   transaction_reference: 'MH_630ca2ab-66f4-4db8-82a6-5e407d16f801_1766037163',
//   status: 'pending',
//   amount: 20.00,
//   currency: 'KWD'
// }

// 3. Redirect to Hesabe
window.location.href = result.hesabe_payment_url;

// 4. Customer pays on Hesabe

// 5. Hesabe calls webhook:
// POST /functions/v1/hesabe-payment-webhook
// {
//   "reference_number": "MH_630ca2ab-66f4-4db8-82a6-5e407d16f801_1766037163",
//   "status": "SUCCESSFUL",
//   "amount": "20.000",
//   "token": "84221717660371649376855338517"
// }

// 6. Webhook finds payment by reference
// 7. Webhook updates payment:
//    - status: 'completed'
//    - paid_at: '2025-12-18 08:52:45'
// 8. Webhook updates booking:
//    - status_id: 'payment confirmed'
// 9. Webhook sends notifications
```

---

## Payment Status Updates

### When Payment is Created

```typescript
// Payment record in database
{
  id: 'payment-uuid',
  booking_id: 'booking-uuid',
  status: 'pending',
  transaction_reference: 'MH_booking-uuid_timestamp',
  created_at: '2025-12-18T08:50:00Z'
}
```

### When Payment Succeeds (Webhook Updates)

```typescript
// Payment record updated
{
  id: 'payment-uuid',
  booking_id: 'booking-uuid',
  status: 'completed', // ✅ Updated
  transaction_reference: 'MH_booking-uuid_timestamp',
  paid_at: '2025-12-18T08:52:45Z', // ✅ Added
  updated_at: '2025-12-18T08:52:45Z' // ✅ Updated
}

// Booking status updated
{
  id: 'booking-uuid',
  status_id: 'payment-confirmed-status-id' // ✅ Updated
}
```

---

## Error Handling

### Payment Creation Fails

```typescript
try {
  await paymentService.initiatePaymentForBooking(bookingId, amount);
} catch (error) {
  if (error.message.includes('Booking not found')) {
    // Handle booking not found
  } else if (error.message.includes('Payment already completed')) {
    // Payment already exists
  } else {
    // Other errors
  }
}
```

### Payment Not Found in Webhook

The webhook already handles this with multiple lookup strategies:
1. Exact match
2. Booking ID extraction
3. UUID pattern matching

If still not found, webhook logs recent payments for debugging.

---

## Testing

### Test Payment Creation

```typescript
// Test creating payment
const testBookingId = '630ca2ab-66f4-4db8-82a6-5e407d16f801';

const result = await paymentService.initiatePaymentForBooking(
  testBookingId,
  20.00
);

console.log('Payment ID:', result.payment_id);
console.log('Order Reference:', result.order_reference);
// Should output: MH_630ca2ab-66f4-4db8-82a6-5e407d16f801_1766037163
```

### Verify Payment Record

```sql
-- Check payment was created
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

---

## Summary

### ✅ Complete Flow:

1. **Frontend**: Create payment record with `transaction_reference = MH_<booking-id>_<timestamp>`
2. **Frontend**: Send to Hesabe with `orderReferenceNumber = MH_<booking-id>_<timestamp>`
3. **Customer**: Pays on Hesabe
4. **Hesabe**: Calls webhook with `reference_number = MH_<booking-id>_<timestamp>`
5. **Webhook**: Finds payment by reference ✅
6. **Webhook**: Updates payment status to `completed` ✅
7. **Webhook**: Updates booking status to `payment confirmed` ✅
8. **Webhook**: Sends notifications ✅

### ✅ Payment Record Saved:

- ✅ Created when payment is initiated
- ✅ Updated when webhook receives confirmation
- ✅ Includes booking ID in reference
- ✅ Tracks payment status throughout flow

---

**Last Updated**: Complete payment flow with record saving

