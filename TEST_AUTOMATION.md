# How to Test Booking Automation

## ✅ Your Cron Job is Running!

Now let's verify the automation is working correctly.

## Method 1: Check Function Logs (Easiest)

1. **Go to Supabase Dashboard**
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

**If you see logs appearing every 5 minutes** → ✅ Automation is running!

## Method 2: Test Auto-Reject (Create Test Booking)

### Step 1: Create a Test Booking

1. Go to your admin panel → Bookings
2. Create a new booking with:
   - Status: "awaiting approval from influencer"
   - Set appointment date in the future

### Step 2: Manually Set Expired Deadline

Run this SQL in Supabase SQL Editor:

```sql
-- Get the booking ID from your admin panel first
-- Replace YOUR_BOOKING_ID with actual booking ID

UPDATE bookings
SET influencer_approval_deadline = NOW() - INTERVAL '1 hour'
WHERE id = 'YOUR_BOOKING_ID'
RETURNING id, status_id, influencer_approval_deadline;
```

### Step 3: Wait for Cron to Run

- Wait up to 5 minutes (or trigger manually - see Method 3)
- Check the booking status - it should change to `auto-reject`

### Step 4: Verify Status Changed

```sql
-- Check if status changed
SELECT 
  b.id,
  bs.name as status,
  b.influencer_approval_deadline,
  b.updated_at
FROM bookings b
JOIN booking_statuses bs ON b.status_id = bs.id
WHERE b.id = 'YOUR_BOOKING_ID';
```

## Method 3: Trigger Function Manually (Immediate Test)

Test the function immediately without waiting:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 9754a7a9e6c7d1ab1a841afe4be0f2f00c3fcb76ca08fcb256a6f2ee9b749fae" \
  https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation
```

Or use the test script:
```bash
# Edit test-automation.sh and add your key, then:
./test-automation.sh
```

## Method 4: Check All Expired Deadlines

See what bookings should be processed:

```sql
-- Find bookings with expired deadlines
SELECT 
  b.id,
  bs.name as current_status,
  b.influencer_approval_deadline,
  b.payment_deadline,
  b.script_submission_deadline,
  CASE 
    WHEN b.influencer_approval_deadline < NOW() THEN 'Should auto-reject'
    WHEN b.payment_deadline < NOW() THEN 'Should auto-cancel'
    WHEN b.script_submission_deadline < NOW() THEN 'Should auto-refund'
    ELSE 'No expired deadlines'
  END as expected_action
FROM bookings b
JOIN booking_statuses bs ON b.status_id = bs.id
WHERE 
  (b.influencer_approval_deadline < NOW() AND bs.name = 'awaiting approval from influencer')
  OR (b.payment_deadline < NOW() AND bs.name = 'awaiting payment')
  OR (b.script_submission_deadline < NOW() AND bs.name IN ('payment confirmed', 'awaiting script'))
ORDER BY b.created_at DESC;
```

## Method 5: Monitor Recent Automation Activity

```sql
-- Check bookings updated in last hour (likely by automation)
SELECT 
  b.id,
  bs.name as status,
  b.updated_at,
  b.influencer_approval_deadline,
  b.payment_deadline
FROM bookings b
JOIN booking_statuses bs ON b.status_id = bs.id
WHERE b.updated_at > NOW() - INTERVAL '1 hour'
ORDER BY b.updated_at DESC
LIMIT 20;
```

## Quick Test Checklist

- [ ] Function logs appear every 5 minutes
- [ ] No errors in logs
- [ ] Create test booking with expired deadline
- [ ] Wait 5 minutes (or trigger manually)
- [ ] Verify status changed
- [ ] Check automation results in logs

## Expected Results

When automation runs, you should see in logs:
- `autoRejected: X` - Bookings auto-rejected
- `autoCancelled: X` - Bookings auto-cancelled  
- `autoRefunded: X` - Refunds created
- `autoApproved: X` - Scripts auto-approved
- `published: X` - Bookings marked as published
- `blackMarked: X` - Black marks created
- `errors: []` - Should be empty

## Troubleshooting

**No logs appearing?**
- Check cron job is enabled
- Verify function is deployed
- Check cron job schedule

**Status not changing?**
- Verify deadlines are set correctly
- Check status names match exactly
- Review function logs for errors

**Function errors?**
- Check logs for specific error messages
- Verify all required statuses exist
- Check database permissions

## Success Indicators

✅ **Automation is working if:**
- Logs appear every 5 minutes
- `success: true` in response
- Statuses change when deadlines expire
- No errors in logs

