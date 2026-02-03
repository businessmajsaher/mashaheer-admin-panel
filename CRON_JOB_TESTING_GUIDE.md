# Cron Job Testing Guide - Step by Step

This guide shows you exactly how to test if your booking automation cron job is working.

---

## Quick Test (5 Minutes)

### Step 1: Test Function Manually

```bash
# Replace with your actual values
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-booking-automation
```

**Where to find these values:**
- **SERVICE_ROLE_KEY**: Supabase Dashboard → Settings → API → `service_role` key (secret)
- **PROJECT_REF**: Supabase Dashboard → Settings → General → Reference ID

**Expected Response:**
```json
{
  "success": true,
  "timestamp": "2024-12-14T10:00:00.000Z",
  "results": {
    "autoRejected": 0,
    "autoCancelled": 0,
    "autoRefunded": 0,
    "autoApproved": 0,
    "published": 0,
    "blackMarked": 0,
    "errors": []
  }
}
```

✅ **If you see this response, your function works!**

---

## Method 1: Check Function Logs (Easiest)

### Steps:

1. Go to **Supabase Dashboard**
2. Click **Edge Functions** in left sidebar
3. Click **process-booking-automation**
4. Click **Logs** tab
5. Look for recent entries

### What to Look For:

✅ **Good Signs:**
- Logs appear every 5 minutes
- Each log shows: `=== BOOKING AUTOMATION PROCESSOR ===`
- `"success": true` in responses
- No error messages

❌ **Bad Signs:**
- No logs appearing
- Error messages
- `"success": false`

### Example Good Log:
```
=== BOOKING AUTOMATION PROCESSOR ===
Time: 2024-12-14T10:00:00.000Z
Auto-rejected booking abc123
✅ Notification sent to user_xyz
{
  "success": true,
  "results": {
    "autoRejected": 1,
    "autoCancelled": 0,
    ...
  }
}
```

---

## Method 2: Check Cron Job in Database

### Step 1: Check if Cron Job Exists

```sql
-- Run in Supabase SQL Editor
SELECT 
  jobid,
  schedule,
  command,
  active,
  jobname
FROM pg_cron.job
WHERE jobname LIKE '%booking%' 
   OR command LIKE '%booking-automation%';
```

**Expected Result:**
- Should show 1 row with `active = true`
- `schedule` should be `*/5 * * * *` (every 5 minutes)
- `command` should contain `process-booking-automation`

### Step 2: Check Execution History

```sql
-- Check recent cron job runs
SELECT 
  runid,
  jobid,
  status,
  return_message,
  start_time,
  end_time,
  end_time - start_time as duration
FROM pg_cron.job_run_details
WHERE command LIKE '%booking-automation%'
ORDER BY start_time DESC
LIMIT 10;
```

**What to Look For:**
- ✅ `status = 'succeeded'` - Job ran successfully
- ✅ Recent `start_time` (within last hour)
- ❌ `status = 'failed'` - Job failed
- ❌ No recent entries - Cron not running

---

## Method 3: Check if pg_cron Extension is Enabled

```sql
-- Check if pg_cron extension exists
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check if pg_net extension exists (needed for HTTP calls)
SELECT * FROM pg_extension WHERE extname = 'pg_net';
```

**If extensions don't exist:**
```sql
-- Enable pg_net (for HTTP calls)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Enable pg_cron (for scheduled jobs)
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

**Note:** You may need Superuser privileges. If you can't enable, use external cron service (Method 6).

---

## Method 4: Create/Update Cron Job

### If Cron Job Doesn't Exist:

```sql
-- Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY
SELECT cron.schedule(
  'booking-automation',                    -- Job name
  '*/5 * * * *',                          -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-booking-automation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### If Cron Job Exists but is Disabled:

```sql
-- Enable the cron job
UPDATE pg_cron.job 
SET active = true 
WHERE jobname = 'booking-automation';
```

### Update Existing Cron Job:

```sql
-- Delete old job
SELECT cron.unschedule('booking-automation');

-- Create new job with correct values
SELECT cron.schedule(
  'booking-automation',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-booking-automation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

---

## Method 5: Test with Real Booking Data

### Step 1: Create a Test Booking

```sql
-- Find a booking that should be auto-updated
SELECT 
  b.id,
  bs.name as current_status,
  b.scheduled_time,
  b.influencer_approval_deadline,
  b.payment_deadline
FROM bookings b
JOIN booking_statuses bs ON b.status_id = bs.id
WHERE bs.name IN ('awaiting approval from influencer', 'awaiting payment')
  AND (
    (b.influencer_approval_deadline < NOW() AND bs.name = 'awaiting approval from influencer')
    OR (b.payment_deadline < NOW() AND bs.name = 'awaiting payment')
    OR (b.scheduled_time < NOW())
  )
LIMIT 5;
```

### Step 2: Manually Set Deadline to Past (For Testing)

```sql
-- Replace 'your-booking-id' with actual booking ID
UPDATE bookings 
SET influencer_approval_deadline = NOW() - INTERVAL '1 hour'
WHERE id = 'your-booking-id'
  AND status_id = (SELECT id FROM booking_statuses WHERE name = 'awaiting approval from influencer' LIMIT 1)
RETURNING id, influencer_approval_deadline;
```

### Step 3: Trigger Function Manually

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-booking-automation
```

### Step 4: Check if Status Changed

```sql
-- Check if booking status was updated
SELECT 
  b.id,
  bs.name as status,
  b.updated_at,
  NOW() - b.updated_at as time_since_update
FROM bookings b
JOIN booking_statuses bs ON b.status_id = bs.id
WHERE b.id = 'your-booking-id';
```

**Expected:**
- Status should be `auto-reject` or `auto-cancel`
- `updated_at` should be recent (within last minute)

---

## Method 6: Use External Cron Service (If Supabase Cron Doesn't Work)

If `pg_cron` is not available or not working, use an external service:

### Option A: cron-job.org (Free)

1. Go to [cron-job.org](https://cron-job.org)
2. Sign up (free account)
3. Click **"Create cronjob"**
4. Fill in:
   - **Title**: `Booking Automation`
   - **Address (URL)**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-booking-automation`
   - **Schedule**: Every 5 minutes
   - **Request Method**: POST
   - **Request Headers**: 
     ```
     Content-Type: application/json
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     ```
   - **Request Body**: `{}`
5. Click **"Create"**

### Option B: EasyCron (Free Tier Available)

1. Go to [EasyCron.com](https://www.easycron.com)
2. Sign up
3. Create new cron job with same settings as above

### Option C: GitHub Actions (For Developers)

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
            https://${{ secrets.SUPABASE_PROJECT_REF }}.supabase.co/functions/v1/process-booking-automation
```

Add secrets in GitHub:
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_REF`

---

## Method 7: Monitor Automation Results

### Check Recent Automation Activity

```sql
-- View bookings updated in last hour
SELECT 
  b.id,
  bs.name as status,
  b.updated_at,
  b.scheduled_time,
  c.name as customer_name,
  i.name as influencer_name
FROM bookings b
JOIN booking_statuses bs ON b.status_id = bs.id
LEFT JOIN profiles c ON b.customer_id = c.id
LEFT JOIN profiles i ON b.influencer_id = i.id
WHERE bs.name IN ('auto-reject', 'auto-cancel')
  AND b.updated_at > NOW() - INTERVAL '1 hour'
ORDER BY b.updated_at DESC;
```

### Count Automation Results

```sql
-- Count bookings by automation status
SELECT 
  bs.name as status,
  COUNT(*) as count,
  MAX(b.updated_at) as last_update
FROM bookings b
JOIN booking_statuses bs ON b.status_id = bs.id
WHERE bs.name IN (
  'auto-reject',
  'auto-cancel',
  'Auto-Approved',
  'Script not sent by influencer–auto refund request'
)
GROUP BY bs.name
ORDER BY count DESC;
```

---

## Troubleshooting

### Problem: No Logs Appearing

**Solutions:**
1. Check if cron job exists: `SELECT * FROM pg_cron.job WHERE jobname = 'booking-automation';`
2. Check if cron job is active: `SELECT active FROM pg_cron.job WHERE jobname = 'booking-automation';`
3. Check function logs manually (Method 1)
4. Try external cron service (Method 6)

### Problem: Cron Job Shows "Failed"

**Solutions:**
1. Check `return_message` in `pg_cron.job_run_details`
2. Verify SERVICE_ROLE_KEY is correct
3. Verify function URL is correct
4. Test function manually (Step 1)

### Problem: Function Works Manually But Not via Cron

**Solutions:**
1. Check cron job command syntax
2. Verify SERVICE_ROLE_KEY in cron job matches manual test
3. Check for permission issues
4. Review cron job execution history

### Problem: Status Not Updating

**Solutions:**
1. Verify bookings have deadlines set:
   ```sql
   SELECT COUNT(*) FROM bookings 
   WHERE influencer_approval_deadline IS NULL 
     AND status_id = (SELECT id FROM booking_statuses WHERE name = 'awaiting approval from influencer');
   ```

2. Check if status names match exactly:
   ```sql
   SELECT name FROM booking_statuses 
   WHERE name IN ('awaiting approval from influencer', 'awaiting payment', 'auto-reject', 'auto-cancel');
   ```

3. Check function logs for errors
4. Verify RLS policies allow updates

---

## Quick Verification Checklist

- [ ] Function works when called manually (curl command)
- [ ] Function logs show executions
- [ ] Cron job exists in database
- [ ] Cron job is active (`active = true`)
- [ ] Cron job execution history shows recent runs
- [ ] Execution status is "succeeded"
- [ ] Bookings are being updated automatically
- [ ] No errors in function logs

---

## Testing Schedule

1. **Immediate**: Test function manually (Step 1)
2. **5 minutes**: Check function logs (Method 1)
3. **10 minutes**: Check cron execution history (Method 2)
4. **1 hour**: Verify bookings are being updated (Method 7)
5. **24 hours**: Monitor for consistency

---

## Success Indicators

✅ **Cron is working if:**
- Logs appear every 5 minutes
- Execution history shows recent successful runs
- Bookings with expired deadlines get updated
- No errors in logs or execution history

❌ **Cron is NOT working if:**
- No logs appearing
- No execution history
- Bookings not updating
- Errors in logs

---

## Need Help?

If cron jobs still don't work after trying all methods:

1. **Use external cron service** (Method 6) - Most reliable
2. **Check Supabase status page** - Service might be down
3. **Contact Supabase support** - If pg_cron extension issues
4. **Check function code** - Ensure function is deployed correctly

---

**Last Updated**: Comprehensive cron job testing guide

