# Booking Automation Setup Guide

This guide explains how to set up the automated booking status management system with time-based rules.

## Overview

The system automatically manages booking statuses based on time constraints:
- **Auto-reject**: Influencer doesn't approve within 12 hrs
- **Auto-cancel**: Customer doesn't pay within 12 hrs after influencer approval
- **Auto-refund**: Script not submitted within deadline (8 hrs × (days_gap - 1))
- **Auto-approve**: Latest script auto-approved before appointment day 10:30 PM
- **Black marks**: Created when influencer doesn't publish by deadline

## Database Setup

### 1. Run the Migration

Apply the booking automation migration:

```sql
-- Run in Supabase SQL Editor
supabase/migrations/20241204000002_add_booking_automation_statuses.sql
```

This will:
- Add new booking statuses
- Add automation tracking fields to bookings table
- Create black_marks table
- Create trigger to calculate deadlines automatically

### 2. Verify Statuses

Check that all new statuses are created:

```sql
SELECT name, description, "order" 
FROM booking_statuses 
ORDER BY "order";
```

You should see:
- auto-reject
- auto-cancel
- Auto-Approved
- Script not sent by influencer–auto refund request
- To Be Publish
- Published
- Reject

## Edge Function Setup

### 3. Deploy the Automation Function

Deploy the booking automation processor:

```bash
supabase functions deploy process-booking-automation
```

### 4. Set Up Cron Job

The automation function needs to run periodically. Set up a cron job:

**Option A: Using Supabase Cron (Recommended)**

1. Go to **Database** → **Cron Jobs** in Supabase Dashboard
2. Create a new cron job:
   - **Name**: `process-booking-automation`
   - **Schedule**: `*/5 * * * *` (every 5 minutes)
   - **SQL Command**:
   ```sql
   SELECT net.http_post(
     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-booking-automation',
     headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
     body := '{}'::jsonb
   );
   ```

**Option B: External Cron Service**

Use a service like:
- **cron-job.org**
- **EasyCron**
- **GitHub Actions** (for scheduled workflows)

Call the function URL every 5 minutes:
```
POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-booking-automation
Headers:
  Authorization: Bearer YOUR_SERVICE_ROLE_KEY
```

## Automation Rules

### Timeline Example

**Booking Created**: Dec 28, 10:00 AM
**Appointment**: Dec 30, 11:59 PM
**Days Gap**: 2 days

1. **Influencer Approval Deadline**: Dec 28, 10:00 PM (12 hrs)
2. **Payment Deadline**: Dec 29, 10:00 AM (12 hrs after approval)
3. **Script Submission Deadline**: Dec 29, 6:00 PM (8 hrs × (2-1) = 8 hrs after payment)
4. **Auto-Approval Deadline**: Dec 30, 10:30 PM
5. **Appointment End**: Dec 30, 11:59 PM

### Script Rejection Flow

1. Customer rejects script → 30-min timer starts
2. If influencer responds within 30 mins → New script submitted
3. If influencer doesn't respond → AI generates script (after 30 mins)
4. After 3 rejections → 4th script auto-approved
5. Before appointment 10:30 PM → Latest script auto-approved if still pending

## Admin Panel Features

### Revision Time Frames Display

The Bookings page now shows:
- All deadline timestamps (non-editable)
- Color-coded status (green = active, red = expired)
- Script submission/rejection history
- AI script generation count

### Black Marks

Black marks are automatically created when:
- Influencer doesn't publish by appointment end time
- Script not submitted within deadline (triggers refund)

View black marks in the admin panel (to be implemented in separate page).

## Testing

### Test Auto-Reject

1. Create a booking
2. Wait 12+ hours without influencer approval
3. Run automation function
4. Booking should change to "auto-reject" status

### Test Auto-Cancel

1. Create booking and have influencer approve
2. Wait 12+ hours without payment
3. Run automation function
4. Booking should change to "auto-cancel" status

### Test Auto-Refund

1. Create booking, influencer approves, customer pays
2. Wait for script submission deadline to pass
3. Run automation function
4. Booking should change to "Script not sent by influencer–auto refund request"
5. Refund record should be created

## Monitoring

Check automation logs:

```sql
-- View recent automation runs (if logging is implemented)
SELECT * FROM automation_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

Monitor edge function logs in Supabase Dashboard:
- **Edge Functions** → **process-booking-automation** → **Logs**

## Important Notes

1. **First Draft Required**: The system assumes the first draft is provided by the influencer
2. **AI Script Generation**: Currently placeholder - needs integration with AI service
3. **Push Notifications**: Need to implement notification system for customers
4. **Manual Refund Check**: Some cases require manual review (marked as "NEED TO CHECK")

## Next Steps

1. ✅ Database migration
2. ✅ Edge function deployment
3. ⏳ Set up cron job
4. ⏳ Test automation rules
5. ⏳ Implement AI script generation
6. ⏳ Add push notifications
7. ⏳ Create black marks admin page

