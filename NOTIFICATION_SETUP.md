# Booking Notification System Setup

## Overview

The notification system sends **email notifications** and **FCM push notifications** to both influencers and customers when:
1. **Automatic status changes** occur (via cron job automation)
2. **Manual status updates** are made (via admin panel)

## Features

### ✅ Email Notifications
- Professional HTML email templates
- Sent via Resend API
- Includes booking details and status information
- Personalized messages for each notification type

### ✅ FCM Push Notifications
- Push notifications to mobile apps
- Uses FCM tokens stored in user profiles
- Notification records stored in database

### ✅ Database Notifications
- All notifications stored in `notifications` table
- Tracks read/unread status
- Available for in-app notification center

## Notification Types

1. **status_change** - Manual status update by admin
2. **auto_reject** - Booking auto-rejected (influencer timeout)
3. **auto_cancel** - Booking auto-cancelled (payment timeout)
4. **auto_refund** - Refund auto-initiated (script not submitted)
5. **auto_approve** - Script auto-approved
6. **script_rejected** - Script rejected by customer
7. **payment_required** - Payment required
8. **script_approved** - Script approved by customer

## Setup Instructions

### Step 1: Deploy Notification Edge Function

```bash
# Set environment variables
supabase secrets set RESEND_API_KEY=your_resend_api_key

# Deploy the function
supabase functions deploy send-booking-notification
```

### Step 2: Update Automation Function

The `process-booking-automation` function has been updated to send notifications for:
- Auto-reject events
- Auto-cancel events
- Auto-refund events
- Auto-approve events

Redeploy the automation function:
```bash
supabase functions deploy process-booking-automation
```

### Step 3: Frontend Integration

The booking service has been updated to automatically send notifications when status is manually changed via the admin panel.

No additional frontend changes needed - notifications are sent automatically.

## How It Works

### Automatic Notifications (Cron Job)

1. Cron job runs `process-booking-automation` every 5 minutes
2. Function detects status changes (auto-reject, auto-cancel, etc.)
3. For each change, calls `send-booking-notification` for both:
   - Customer (booking.customer_id)
   - Influencer (booking.influencer_id)
4. Notification function:
   - Sends email via Resend
   - Creates FCM notification (token stored in profile)
   - Creates notification record in database

### Manual Notifications (Admin Panel)

1. Admin updates booking status via admin panel
2. `bookingService.updateBookingStatus()` is called
3. Function detects status change
4. Automatically calls `send-booking-notification` for both users
5. Same notification flow as automatic notifications

## Notification Function API

**Endpoint**: `/functions/v1/send-booking-notification`

**Method**: POST

**Headers**:
```
Authorization: Bearer <service_role_key or user_token>
Content-Type: application/json
```

**Body**:
```json
{
  "user_id": "uuid",
  "booking_id": "uuid",
  "notification_type": "status_change",
  "status_name": "Awaiting Payment",
  "message": "Your booking status has been updated.",
  "booking_details": {
    "service_title": "Instagram Post",
    "scheduled_time": "2024-12-30T10:00:00Z",
    "influencer_name": "John Doe",
    "customer_name": "Jane Smith"
  }
}
```

## Email Templates

Email notifications include:
- Professional HTML design
- Booking details (service, scheduled time)
- Status information
- Call-to-action button to view booking
- Branded Mashaheer styling

## FCM Integration

FCM tokens are stored in:
- `profiles.fcm_token` - Current token
- `fcm_tokens` table - Token history

To send FCM notifications:
1. Get FCM token from user profile
2. Use Firebase Admin SDK or FCM HTTP API
3. Send push notification to device

**Note**: The current implementation stores the notification in the database. The mobile app should:
- Poll for new notifications
- Or implement FCM listener to receive push notifications directly

## Testing

### Test Email Notification

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/send-booking-notification \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "user-uuid",
    "booking_id": "booking-uuid",
    "notification_type": "status_change",
    "status_name": "Payment Confirmed",
    "message": "Your booking payment has been confirmed."
  }'
```

### Verify Notifications

1. Check `notifications` table in database
2. Check email inbox (if email provided)
3. Check FCM token in user profile
4. Check edge function logs in Supabase dashboard

## Troubleshooting

**Notifications not sending?**
- Check RESEND_API_KEY is set correctly
- Verify user has email in profile
- Check edge function logs for errors
- Verify authentication token is valid

**FCM not working?**
- Ensure user has FCM token in profile
- Check Firebase project configuration
- Verify FCM server key is set
- Check mobile app FCM integration

**Email not received?**
- Check spam folder
- Verify email address in profile
- Check Resend API logs
- Verify RESEND_API_KEY is valid

## Future Enhancements

1. **FCM Direct Integration**: Implement Firebase Admin SDK in edge function
2. **Notification Preferences**: Allow users to choose notification types
3. **SMS Notifications**: Add SMS support for critical updates
4. **Notification History**: Show notification history in admin panel
5. **Batch Notifications**: Optimize for bulk notifications


