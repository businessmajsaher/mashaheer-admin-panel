# Verify Automation is Working

## ✅ Cron Job is Set Up!

Your cron job "booking-automation" is running. Here's how to verify it's working:

## Step 1: Check Function Logs

1. Go to **Supabase Dashboard**
2. Navigate to **Edge Functions** → **process-booking-automation**
3. Click **"Logs"** tab
4. You should see logs every 5 minutes showing:
   ```json
   {
     "success": true,
     "timestamp": "2024-12-06T...",
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

## Step 2: Test with a Sample Booking

1. **Create a test booking** in your admin panel
2. **Manually set a deadline to past time** (for testing):
   ```sql
   UPDATE bookings 
   SET influencer_approval_deadline = NOW() - INTERVAL '1 hour'
   WHERE id = 'YOUR_BOOKING_ID';
   ```
3. **Wait for next cron run** (up to 5 minutes) or trigger manually
4. **Check if status changed** to `auto-reject`

## Step 3: Monitor Automation Results

### Check Recent Automation Activity

```sql
-- View bookings that were auto-updated recently
SELECT 
  id,
  status_id,
  updated_at,
  influencer_approval_deadline,
  payment_deadline,
  script_submission_deadline
FROM bookings
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;
```

### Check for Expired Deadlines

```sql
-- Find bookings with expired deadlines that should be processed
SELECT 
  b.id,
  bs.name as current_status,
  b.influencer_approval_deadline,
  b.payment_deadline,
  b.script_submission_deadline,
  b.auto_approval_deadline
FROM bookings b
JOIN booking_statuses bs ON b.status_id = bs.id
WHERE 
  (b.influencer_approval_deadline < NOW() AND bs.name = 'awaiting approval from influencer')
  OR (b.payment_deadline < NOW() AND bs.name = 'awaiting payment')
  OR (b.script_submission_deadline < NOW() AND bs.name IN ('payment confirmed', 'awaiting script'))
ORDER BY b.created_at DESC;
```

## Step 4: Verify Status Changes

Check if statuses are changing automatically:

```sql
-- View all bookings with automation statuses
SELECT 
  b.id,
  bs.name as status,
  b.created_at,
  b.updated_at,
  b.influencer_approval_deadline,
  b.payment_deadline
FROM bookings b
JOIN booking_statuses bs ON b.status_id = bs.id
WHERE bs.name IN (
  'auto-reject',
  'auto-cancel',
  'Auto-Approved',
  'Script not sent by influencer–auto refund request',
  'To Be Publish',
  'Published'
)
ORDER BY b.updated_at DESC
LIMIT 20;
```

## What to Look For

### ✅ Success Indicators:
- Function logs show execution every 5 minutes
- No errors in the logs
- Bookings with expired deadlines get status updates
- `results` object shows counts (even if 0)

### ⚠️ Warning Signs:
- No logs appearing
- Errors in function logs
- Statuses not changing when deadlines expire
- `errors` array has items

## Troubleshooting

### No Logs Appearing?
- Check cron job is enabled in Supabase Dashboard
- Verify the function URL is correct
- Check Service Role Key is valid

### Status Not Changing?
- Verify deadlines are set in bookings table
- Check status names match exactly in `booking_statuses`
- Review function logs for specific errors
- Ensure RLS policies allow updates

### Function Errors?
- Check function logs for detailed error messages
- Verify all required statuses exist
- Check database permissions

## Next Steps

1. ✅ **Monitor for 24 hours** - Watch logs to ensure it's running consistently
2. ✅ **Test with real bookings** - Create actual bookings and watch automation work
3. ✅ **Review automation results** - Check that statuses are changing correctly
4. ✅ **Adjust schedule if needed** - Can change from 5 minutes to 1 minute or 10 minutes

## Automation Schedule

Current: **Every 5 minutes**

You can adjust this:
- **More frequent** (1 minute): `* * * * *` - More responsive, more API calls
- **Less frequent** (10 minutes): `*/10 * * * *` - Less API calls, slight delay
- **Current** (5 minutes): `*/5 * * * *` - Good balance

## Success! 🎉

Your automation system is now running. It will:
- ✅ Check bookings every 5 minutes
- ✅ Update statuses automatically
- ✅ Create refunds when needed
- ✅ Generate black marks
- ✅ Handle all time-based rules

Just monitor the logs and let it run!

