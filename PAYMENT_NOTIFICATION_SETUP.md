# Payment Notification Setup

## Overview

When a payment is successfully processed via the Hesabe webhook, the system now automatically:

1. ✅ **Updates booking status** to "payment confirmed"
2. ✅ **Sends payment receipt email** to customer
3. ✅ **Sends notification email** to customer and influencer
4. ✅ **Sends FCM push notification** to customer and influencer

## Flow

```
Payment Webhook Received
    ↓
Update Payment Status
    ↓
Update Booking Status → "payment confirmed"
    ↓
┌─────────────────────────────────────┐
│ 1. Send Payment Receipt Email       │
│    (Customer only)                  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 2. Send Notification Email + FCM    │
│    (Customer)                       │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 3. Send Notification Email + FCM    │
│    (Influencer)                     │
└─────────────────────────────────────┘
```

## Functions Created/Updated

### 1. `send-payment-receipt` (New)

**Purpose**: Sends a professional payment receipt email to the customer.

**Endpoint**: `/functions/v1/send-payment-receipt`

**Request Body**:
```json
{
  "payment_id": "uuid",
  "user_id": "uuid",
  "booking_id": "uuid"
}
```

**Features**:
- Professional HTML receipt template
- Payment details (amount, reference, method, date)
- Booking details (service, scheduled time)
- Download/print friendly format

### 2. `send-booking-notification` (Updated)

**Updates**:
- Added `payment_success` notification type
- Implemented FCM push notification sending
- Added FCM title helper function

**FCM Integration**:
- Uses FCM HTTP API (no Firebase Admin SDK needed)
- Requires `FCM_SERVER_KEY` environment variable
- Sends push notification with booking data

### 3. `hesabe-payment-webhook` (Updated)

**Updates**:
- Calls `send-payment-receipt` for customer
- Calls `send-booking-notification` for both customer and influencer
- Improved error handling (doesn't fail webhook if notifications fail)

## Setup Instructions

### Step 1: Deploy Payment Receipt Function

```bash
supabase functions deploy send-payment-receipt
```

### Step 2: Update Notification Function

```bash
supabase functions deploy send-booking-notification
```

### Step 3: Set FCM Server Key (Optional but Recommended)

```bash
# Get your FCM Server Key from Firebase Console
# Firebase Console → Project Settings → Cloud Messaging → Server Key

supabase secrets set FCM_SERVER_KEY=your_fcm_server_key_here
```

**Note**: If `FCM_SERVER_KEY` is not set, FCM notifications will be skipped but email notifications will still work.

### Step 4: Redeploy Webhook

```bash
supabase functions deploy hesabe-payment-webhook
```

## Email Templates

### Payment Receipt Email

**Subject**: `Payment Receipt - {transaction_reference}`

**Content**:
- Payment confirmation message
- Payment details table (reference, amount, method, date, status)
- Booking details (service, scheduled time, customer/influencer names)
- View booking button
- Professional styling with green success theme

### Payment Success Notification Email

**Subject**: `Payment Confirmed - Booking Updated`

**Content**:
- Payment confirmed message
- Booking status update
- Booking details
- View booking button
- Standard notification styling

## FCM Push Notifications

### Customer Notification

**Title**: `Payment Confirmed ✓`
**Body**: `Your payment has been confirmed successfully.`
**Data**:
```json
{
  "type": "payment_success",
  "booking_id": "uuid",
  "status_name": "Payment Confirmed",
  "click_action": "FLUTTER_NOTIFICATION_CLICK"
}
```

### Influencer Notification

**Title**: `Payment Confirmed ✓`
**Body**: `Payment has been confirmed for your booking.`
**Data**: Same structure as customer notification

## Testing

### Test Payment Receipt

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/send-payment-receipt \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "payment_id": "payment-uuid",
    "user_id": "user-uuid",
    "booking_id": "booking-uuid"
  }'
```

### Test Notification

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/send-booking-notification \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "user-uuid",
    "booking_id": "booking-uuid",
    "notification_type": "payment_success",
    "status_name": "Payment Confirmed",
    "message": "Your payment has been confirmed successfully."
  }'
```

### Test Complete Flow

1. Make a test payment through Hesabe
2. Check webhook logs for:
   - Payment receipt sent ✅
   - Customer notification sent ✅
   - Influencer notification sent ✅
3. Verify:
   - Customer receives receipt email
   - Customer receives notification email
   - Customer receives FCM push (if token exists)
   - Influencer receives notification email
   - Influencer receives FCM push (if token exists)

## Environment Variables

Required:
- `RESEND_API_KEY` - For sending emails
- `SUPABASE_URL` - Auto-configured
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-configured

Optional:
- `FCM_SERVER_KEY` - For FCM push notifications
- `APP_URL` - For email links (defaults to https://mashaheer.co)

## Troubleshooting

### Payment Receipt Not Sent

- Check `send-payment-receipt` function logs
- Verify payment record exists
- Verify user email exists in profile
- Check RESEND_API_KEY is set

### FCM Notifications Not Working

- Verify `FCM_SERVER_KEY` is set
- Check user has `fcm_token` in profile
- Verify FCM server key is valid
- Check FCM API response in logs

### Email Not Received

- Check spam folder
- Verify email address in profile
- Check Resend API logs
- Verify RESEND_API_KEY is valid

## Summary

✅ **Payment receipt email** - Professional receipt sent to customer  
✅ **Notification emails** - Sent to both customer and influencer  
✅ **FCM push notifications** - Sent to both customer and influencer  
✅ **Error handling** - Webhook doesn't fail if notifications fail  
✅ **Complete flow** - All notifications sent automatically on payment success  

---

**Last Updated**: Payment notification system with receipt and FCM support


