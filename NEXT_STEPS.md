# Next Steps - Booking Automation Setup

## ✅ Completed
1. ✅ Database migration SQL created (`create_booking_automation.sql`)
2. ✅ Edge function created and deployed (`process-booking-automation`)
3. ✅ Admin panel updated with revision time frames display
4. ✅ Black marks service created
5. ✅ Booking types updated

## 🔄 Next Steps (In Order)

### Step 1: Run Database Migration ⚡
**Status: Ready to run**

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy entire contents of `create_booking_automation.sql`
3. Paste and click **"Run"**
4. Verify new statuses were created:
   ```sql
   SELECT name, "order" FROM booking_statuses ORDER BY "order";
   ```

### Step 2: Set Up Cron Job ⏰
**Status: Critical - Automation won't work without this**

1. Go to **Supabase Dashboard** → **Database** → **Cron Jobs**
2. Click **"New Cron Job"**
3. Fill in:
   ```
   Name: booking-automation
   Schedule: */5 * * * *  (every 5 minutes)
   ```
4. SQL Command:
   ```sql
   SELECT net.http_post(
     url := 'https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation',
     headers := jsonb_build_object(
       'Content-Type', 'application/json',
       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
     ),
     body := '{}'::jsonb
   );
   ```
5. Click **"Create"**

**Alternative:** If Supabase Cron doesn't work, use external service:
- [cron-job.org](https://cron-job.org)
- Schedule: Every 5 minutes
- URL: `https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation`
- Method: POST
- Headers: `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`

### Step 3: Test the Automation 🧪
**Status: Verify everything works**

1. **Test function manually:**
   ```bash
   curl -X POST \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation
   ```

2. **Check function logs:**
   - Dashboard → Edge Functions → process-booking-automation → Logs
   - Should see execution results

3. **Create test booking:**
   - Create a booking in admin panel
   - Verify deadlines are calculated automatically
   - Manually set a deadline to past time
   - Wait for cron to run (or trigger manually)
   - Verify status changed

### Step 4: Update Application Logic 📝
**Status: Need to implement**

Update your booking creation/update logic to set deadlines:

**When booking is created:**
- Set `influencer_approval_deadline` = created_at + 12 hours

**When influencer approves:**
- Set `payment_deadline` = approval_time + 12 hours

**When payment is confirmed:**
- Calculate `days_gap` = (scheduled_time - created_at) in days
- Set `script_submission_deadline` = payment_time + (8 hours × (days_gap - 1))
- Set `auto_approval_deadline` = appointment day 10:30 PM
- Set `appointment_end_time` = appointment day 11:59 PM

### Step 5: Implement AI Script Generation 🤖
**Status: Placeholder exists - needs integration**

The edge function has a placeholder for AI script generation. You need to:
1. Integrate with your AI service (OpenAI, Anthropic, etc.)
2. Update the function to generate scripts when influencer doesn't respond in 30 mins
3. Send generated script to customer and influencer

### Step 6: Add Push Notifications 📱
**Status: Not implemented**

Implement push notifications for:
- Customer: When refund is initiated
- Influencer: When deadlines are approaching
- Both: When AI script is generated

### Step 7: Create Black Marks Admin Page 📊
**Status: Service created, UI needed**

Create an admin page to:
- View all black marks
- Filter by influencer
- See black mark history
- Export reports

## 🎯 Priority Order

1. **HIGH PRIORITY:**
   - ✅ Run database migration
   - ⏳ Set up cron job
   - ⏳ Test automation

2. **MEDIUM PRIORITY:**
   - ⏳ Update application logic to set deadlines
   - ⏳ Monitor automation for first week

3. **LOW PRIORITY:**
   - ⏳ AI script generation
   - ⏳ Push notifications
   - ⏳ Black marks admin page

## 📋 Quick Checklist

- [ ] Run `create_booking_automation.sql` in Supabase
- [ ] Set up cron job (every 5 minutes)
- [ ] Test function manually
- [ ] Update booking creation logic to set deadlines
- [ ] Update booking update logic when status changes
- [ ] Monitor logs for first 24 hours
- [ ] Test with real bookings
- [ ] Document any custom rules

## 🔍 Monitoring

**Check automation is working:**
```sql
-- View bookings with expired deadlines
SELECT 
  id,
  status_id,
  influencer_approval_deadline,
  payment_deadline,
  script_submission_deadline
FROM bookings
WHERE 
  (influencer_approval_deadline < NOW() AND status_id = 'awaiting approval status id')
  OR (payment_deadline < NOW() AND status_id = 'awaiting payment status id')
  OR (script_submission_deadline < NOW() AND status_id = 'awaiting script status id');
```

**View function execution results:**
- Dashboard → Edge Functions → process-booking-automation → Logs
- Look for success messages and counts

## 🆘 Troubleshooting

**Automation not running?**
- Check cron job is enabled
- Verify function is deployed
- Check function logs for errors

**Status not changing?**
- Verify deadlines are set in database
- Check status names match exactly
- Review function logs

**Need help?**
- Check `HOW_AUTOMATION_WORKS.md`
- Review `BOOKING_AUTOMATION_SETUP.md`

