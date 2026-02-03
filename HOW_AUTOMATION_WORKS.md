# How Automatic Status Changes Work

## Overview

The automatic status change system uses a **cron job** (scheduled task) that runs periodically to check bookings and update their statuses based on time deadlines.

## How It Works

### 1. **Database Triggers** (Automatic)
When a booking is created or updated, a database trigger automatically calculates deadlines:
- **Influencer Approval Deadline**: 12 hours from booking creation
- **Payment Deadline**: 12 hours after influencer accepts (set by application)
- **Script Submission Deadline**: 8 hours × (days_gap - 1) after payment (set by application)
- **Auto-Approval Deadline**: Appointment day at 10:30 PM
- **Appointment End Time**: Appointment day at 11:59 PM

### 2. **Edge Function** (Runs Every 5 Minutes)
The `process-booking-automation` function:
1. Checks all bookings with pending deadlines
2. Compares current time with deadlines
3. Updates booking statuses automatically
4. Creates refunds/black marks when needed

### 3. **Status Change Rules**

| Condition | Action | New Status |
|-----------|--------|------------|
| Influencer doesn't approve in 12 hrs | Auto-reject | `auto-reject` |
| Customer doesn't pay in 12 hrs after approval | Auto-cancel | `auto-cancel` |
| Script not submitted by deadline | Auto-refund | `Script not sent by influencer–auto refund request` |
| Latest script before 10:30 PM appointment day | Auto-approve | `To Be Publish` |
| Appointment ends, not published | Create black mark | Keep status, add black mark |

## Setup Instructions

### Step 1: Run Database Migration

```sql
-- Copy and paste into Supabase SQL Editor
-- File: create_booking_automation.sql
```

This creates:
- New booking statuses
- Automation fields in bookings table
- Black marks table
- Database trigger for deadline calculation

### Step 2: Deploy Edge Function

```bash
cd /Users/akshaykc/Documents/development/mashaheer-admin-panel
supabase functions deploy process-booking-automation
```

### Step 3: Set Up Cron Job

You have **3 options**:

#### Option A: Supabase Cron (Easiest)

1. Go to **Supabase Dashboard** → **Database** → **Cron Jobs**
2. Click **"New Cron Job"**
3. Fill in:
   ```
   Name: process-booking-automation
   Schedule: */5 * * * *  (every 5 minutes)
   ```
4. SQL Command:
   ```sql
   SELECT net.http_post(
     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-booking-automation',
     headers := jsonb_build_object(
       'Content-Type', 'application/json',
       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
     ),
     body := '{}'::jsonb
   );
   ```
5. Replace `YOUR_PROJECT_REF` with your actual Supabase project reference
6. Click **"Create"**

#### Option B: External Cron Service (cron-job.org)

1. Go to [cron-job.org](https://cron-job.org)
2. Create account and new cron job
3. Settings:
   - **URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-booking-automation`
   - **Schedule**: Every 5 minutes
   - **Method**: POST
   - **Headers**: 
     ```
     Content-Type: application/json
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     ```
   - **Body**: `{}`

#### Option C: GitHub Actions (For Developers)

Create `.github/workflows/booking-automation.yml`:

```yaml
name: Booking Automation

on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:  # Manual trigger

jobs:
  automate:
    runs-on: ubuntu-latest
    steps:
      - name: Call Automation Function
        run: |
          curl -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-booking-automation
```

### Step 4: Test the Automation

1. **Create a test booking** with appointment in the future
2. **Wait for deadlines** or manually update deadlines to past dates
3. **Check function logs**:
   - Go to **Supabase Dashboard** → **Edge Functions** → **process-booking-automation** → **Logs**
4. **Verify status changes** in your bookings table

## Manual Testing

You can manually trigger the automation function:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-booking-automation
```

Or use Postman/Thunder Client:
- **Method**: POST
- **URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-booking-automation`
- **Headers**: 
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`

## Monitoring

### Check Function Logs

1. Go to **Supabase Dashboard**
2. **Edge Functions** → **process-booking-automation**
3. Click **"Logs"** tab
4. See execution results and any errors

### Check Automation Results

The function returns a JSON response:

```json
{
  "success": true,
  "timestamp": "2024-12-04T10:30:00Z",
  "results": {
    "autoRejected": 2,
    "autoCancelled": 1,
    "autoRefunded": 0,
    "autoApproved": 3,
    "published": 1,
    "blackMarked": 0,
    "errors": []
  }
}
```

### Query Bookings with Deadlines

```sql
-- Check bookings with expired deadlines
SELECT 
  id,
  status_id,
  influencer_approval_deadline,
  payment_deadline,
  script_submission_deadline,
  auto_approval_deadline,
  appointment_end_time
FROM bookings
WHERE 
  influencer_approval_deadline < NOW()
  OR payment_deadline < NOW()
  OR script_submission_deadline < NOW()
  OR auto_approval_deadline < NOW()
ORDER BY created_at DESC;
```

## Troubleshooting

### Automation Not Running

1. **Check cron job status** in Supabase Dashboard
2. **Verify function is deployed**: `supabase functions list`
3. **Check function logs** for errors
4. **Test manually** using curl/Postman

### Status Not Changing

1. **Verify deadlines are set** in bookings table
2. **Check status IDs** match in `booking_statuses` table
3. **Review function logs** for specific errors
4. **Ensure RLS policies** allow updates

### Function Errors

Common issues:
- **Missing status**: Status name doesn't exist in `booking_statuses`
- **RLS blocking**: Row Level Security preventing updates
- **Invalid deadline**: NULL or invalid timestamp

## Best Practices

1. **Run every 5 minutes**: Balance between responsiveness and server load
2. **Monitor logs**: Check daily for errors
3. **Test in staging**: Test automation rules before production
4. **Backup data**: Before running migrations
5. **Document custom rules**: If you modify automation logic

## Next Steps

1. ✅ Run database migration
2. ✅ Deploy edge function
3. ⏳ Set up cron job (choose one of the 3 options above)
4. ⏳ Test with sample bookings
5. ⏳ Monitor for first 24 hours
6. ⏳ Adjust schedule if needed (can run more/less frequently)

