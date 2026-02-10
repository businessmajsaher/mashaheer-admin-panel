# Deploy Payment Notifications

## Quick Deployment Guide

Deploy all functions needed for payment notifications:

```bash
# 1. Deploy payment receipt function
supabase functions deploy send-payment-receipt

# 2. Update notification function (with FCM support)
supabase functions deploy send-booking-notification

# 3. Update webhook (with receipt and notification calls)
supabase functions deploy hesabe-payment-webhook

# 4. Also update the other webhook if you use it
supabase functions deploy hesabe-webhook
```

## Set FCM Server Key (Optional)

If you want FCM push notifications:

```bash
# Get from Firebase Console → Project Settings → Cloud Messaging
supabase secrets set FCM_SERVER_KEY=your_fcm_server_key
```

## Verify Deployment

After deployment, test with a real payment or use the test endpoints in `PAYMENT_NOTIFICATION_SETUP.md`.

## What Gets Sent

When payment is successful:

1. ✅ **Payment Receipt Email** → Customer
2. ✅ **Notification Email** → Customer  
3. ✅ **FCM Push** → Customer (if token exists)
4. ✅ **Notification Email** → Influencer
5. ✅ **FCM Push** → Influencer (if token exists)

---

**Ready to deploy!** 🚀


