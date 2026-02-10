# Booking Delivery Date Fix & Cron Job Testing Guide

## Issues Fixed

### Issue 1: Delivery Date Passed But Status Not Updated
**Problem**: When `scheduled_time` (delivery date) has passed, bookings still show "Awaiting your approval/pay now" instead of "auto-cancelled" or "auto-rejected".

**Solution**: Updated the edge function to check if `scheduled_time` has passed in addition to deadline checks.

### Issue 2: Date Display Inconsistency
**Problem**: Date shows differently in different places (e.g., 14th Dec vs 13th Dec).
**Solution**: This is a timezone issue - see timezone fix section below.

### Issue 3: Cron Jobs Not Working
**Solution**: See comprehensive testing guide below.

---

## Updated Edge Function Logic

The automation now checks **both** deadlines AND delivery dates:

1. **Auto-reject**: 
   - If `scheduled_time` has passed AND status is "awaiting approval from influencer"
   - OR if `influencer_approval_deadline` has passed

2. **Auto-cancel**:
   - If `scheduled_time` has passed AND status is "awaiting payment"  
   - OR if `payment_deadline` has passed

---

## Step 1: Update Edge Function

The edge function has been updated. Deploy it:

```bash
cd /Users/akshaykc/Documents/development/mashaheer-admin-panel
supabase functions deploy process-booking-automation
```

---

## Step 2: Test the Fix

### Test Query - Check Bookings with Passed Delivery Dates

```sql
-- Find bookings where delivery date has passed but status hasn't been updated
SELECT 
  b.id,
  bs.name as current_status,
  b.scheduled_time as delivery_date,
  b.influencer_approval_deadline,
  b.payment_deadline,
  CASE 
    WHEN b.scheduled_time < NOW() AND bs.name = 'awaiting approval from influencer' 
      THEN 'Should be auto-rejected'
    WHEN b.scheduled_time < NOW() AND bs.name = 'awaiting payment' 
      THEN 'Should be auto-cancelled'
    ELSE 'OK'
  END as expected_action,
  c.name as customer_name,
  i.name as influencer_name
FROM bookings b
JOIN booking_statuses bs ON b.status_id = bs.id
LEFT JOIN profiles c ON b.customer_id = c.id
LEFT JOIN profiles i ON b.influencer_id = i.id
WHERE 
  b.scheduled_time < NOW()
  AND bs.name IN ('awaiting approval from influencer', 'awaiting payment')
ORDER BY b.scheduled_time DESC;
```

### Manually Trigger Automation (For Testing)

```bash
# Replace with your actual values
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-booking-automation
```

---

## Step 3: Fix Date Display (Timezone Issue)

### The Problem

Dates are stored in UTC in the database, but displayed in local time. If you see different dates in different places, it's likely a timezone conversion issue.

### Solution for Flutter Apps

Always convert UTC dates to user's local timezone:

```dart
// ❌ BAD - Direct parsing may cause timezone issues
final date = DateTime.parse(booking.scheduled_time);

// ✅ GOOD - Explicitly handle UTC
final utcDate = DateTime.parse(booking.scheduled_time).toUtc();
final localDate = utcDate.toLocal();

// Format with timezone awareness
final formatted = DateFormat('dd MMM yyyy', 'en_US').format(localDate);
```

### Solution for React Admin Panel

```typescript
// ❌ BAD
const date = new Date(booking.scheduled_time);
const formatted = date.toLocaleDateString();

// ✅ GOOD - Use dayjs with timezone
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const formatted = dayjs(booking.scheduled_time)
  .utc()
  .local()
  .format('DD MMM YYYY');
```

### Check Database Timezone

```sql
-- Check what timezone your database is using
SHOW timezone;

-- Check a booking's scheduled_time in different timezones
SELECT 
  id,
  scheduled_time AT TIME ZONE 'UTC' as utc_time,
  scheduled_time AT TIME ZONE 'Asia/Kuwait' as kuwait_time,
  scheduled_time AT TIME ZONE 'America/New_York' as ny_time
FROM bookings
LIMIT 5;
```

---

## Step 4: Cron Job Testing Guide

### Method 1: Check if Cron Job Exists

```sql
-- Check existing cron jobs
SELECT 
  jobid,
  schedule,
  command,
  active
FROM pg_cron.job
WHERE jobname LIKE '%booking%' OR command LIKE '%booking-automation%';
```

### Method 2: Check Cron Job Execution History

```sql
-- Check recent cron job runs
SELECT 
  runid,
  jobid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM pg_cron.job_run_details
WHERE command LIKE '%booking-automation%'
ORDER BY start_time DESC
LIMIT 10;
```

### Method 3: Test Function Manually

```bash
# Get your service role key from Supabase Dashboard > Settings > API
export SERVICE_ROLE_KEY="your-service-role-key"
export PROJECT_REF="your-project-ref"

# Test the function
curl -X POST \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  "https://$PROJECT_REF.supabase.co/functions/v1/process-booking-automation"
```

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

### Method 4: Check Function Logs

1. Go to **Supabase Dashboard** → **Edge Functions** → **process-booking-automation**
2. Click **"Logs"** tab
3. Look for recent executions (should show every 5 minutes if cron is working)

**What to look for:**
- ✅ `=== BOOKING AUTOMATION PROCESSOR ===` - Function started
- ✅ `Auto-rejected booking ...` - Status updates
- ✅ `Auto-cancelled booking ...` - Status updates
- ❌ `Error:` - Any errors

### Method 5: Create/Update Cron Job

If cron job doesn't exist or isn't working:

```sql
-- Option A: Using pg_cron extension (if enabled)
SELECT cron.schedule(
  'booking-automation',
  '*/5 * * * *', -- Every 5 minutes
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

-- Option B: Check if pg_net extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_net';
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

### Method 6: Alternative - External Cron Service

If Supabase cron doesn't work, use external service:

1. Go to [cron-job.org](https://cron-job.org) or [EasyCron](https://www.easycron.com)
2. Create account and new cron job
3. Settings:
   - **URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-booking-automation`
   - **Schedule**: Every 5 minutes (`*/5 * * * *`)
   - **Method**: POST
   - **Headers**:
     ```
     Content-Type: application/json
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     ```
   - **Body**: `{}`

### Method 7: Verify Automation is Working

```sql
-- Check bookings that should be auto-updated
SELECT 
  b.id,
  bs.name as current_status,
  b.scheduled_time,
  CASE 
    WHEN b.scheduled_time < NOW() AND bs.name = 'awaiting approval from influencer' 
      THEN 'SHOULD BE AUTO-REJECTED'
    WHEN b.scheduled_time < NOW() AND bs.name = 'awaiting payment' 
      THEN 'SHOULD BE AUTO-CANCELLED'
    ELSE 'OK'
  END as expected_action,
  b.updated_at,
  NOW() - b.updated_at as time_since_last_update
FROM bookings b
JOIN booking_statuses bs ON b.status_id = bs.id
WHERE 
  b.scheduled_time < NOW()
  AND bs.name IN ('awaiting approval from influencer', 'awaiting payment')
ORDER BY b.scheduled_time DESC;

-- Check recently auto-updated bookings
SELECT 
  b.id,
  bs.name as status,
  b.scheduled_time,
  b.updated_at,
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

---

## Step 5: Status Display Format

The status should display as:

- **In Customer App**: "auto-cancelled by <customer name>"
- **In Influencer App**: "auto-rejected from <influencer name>"

### Implementation

```typescript
// In your status display component
function formatStatus(booking: Booking) {
  const statusName = booking.status?.name || '';
  
  if (statusName === 'auto-cancel') {
    return `auto-cancelled by ${booking.customer?.name || 'system'}`;
  }
  
  if (statusName === 'auto-reject') {
    return `auto-rejected from ${booking.influencer?.name || 'system'}`;
  }
  
  return statusName;
}
```

```dart
// In Flutter
String formatStatus(Booking booking) {
  final statusName = booking.status?.name ?? '';
  
  if (statusName == 'auto-cancel') {
    return 'auto-cancelled by ${booking.customer?.name ?? 'system'}';
  }
  
  if (statusName == 'auto-reject') {
    return 'auto-rejected from ${booking.influencer?.name ?? 'system'}';
  }
  
  return statusName;
}
```

---

## Testing Checklist

- [ ] Edge function deployed successfully
- [ ] Manual function test returns success
- [ ] Cron job exists and is active
- [ ] Cron job execution history shows recent runs
- [ ] Function logs show executions every 5 minutes
- [ ] Bookings with passed delivery dates are being updated
- [ ] Status displays correctly in apps
- [ ] Dates display consistently (timezone fixed)
- [ ] Auto-cancelled bookings show "auto-cancelled by <customer name>"
- [ ] Auto-rejected bookings show "auto-rejected from <influencer name>"

---

## Troubleshooting

### Cron Job Not Running?

1. **Check if pg_cron is enabled:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. **Check cron job status:**
   ```sql
   SELECT * FROM pg_cron.job WHERE jobname LIKE '%booking%';
   ```

3. **Enable cron job if disabled:**
   ```sql
   UPDATE pg_cron.job SET active = true WHERE jobname = 'booking-automation';
   ```

4. **Use external cron service** (easiest if pg_cron not available)

### Function Not Updating Bookings?

1. **Check function logs** for errors
2. **Verify status names match exactly:**
   ```sql
   SELECT name FROM booking_statuses 
   WHERE name IN ('awaiting approval from influencer', 'awaiting payment', 'auto-reject', 'auto-cancel');
   ```

3. **Check if bookings have scheduled_time set:**
   ```sql
   SELECT COUNT(*) FROM bookings WHERE scheduled_time IS NULL;
   ```

4. **Manually test with a specific booking:**
   ```sql
   -- Set a test booking's delivery date to past
   UPDATE bookings 
   SET scheduled_time = NOW() - INTERVAL '1 day'
   WHERE id = 'test-booking-id';
   ```

### Dates Still Showing Incorrectly?

1. **Ensure consistent timezone handling** in all apps
2. **Always convert UTC to local** before displaying
3. **Use a date library** (dayjs, moment, intl) that handles timezones properly
4. **Store dates consistently** - always in UTC in database

---

## Next Steps

1. ✅ Deploy updated edge function
2. ✅ Test manually to verify it works
3. ✅ Set up/verify cron job is running
4. ✅ Monitor logs for 24 hours
5. ✅ Fix timezone display in apps
6. ✅ Update status display format in apps

---

**Last Updated**: After fixing delivery date check in edge function

