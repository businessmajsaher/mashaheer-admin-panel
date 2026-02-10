# Update SQL Files

## 1. Cron Job SQL (Final Version)

**File:** `cron_job_final.sql`

Use this in your Supabase Cron Job. Replace `YOUR_SERVICE_ROLE_KEY` with your actual key from:
- Dashboard → Settings → API → `service_role` key

```sql
SELECT net.http_post(
  url := 'https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
  ),
  body := '{}'::jsonb
);
```

## 2. Update Existing Bookings SQL

**File:** `update_existing_bookings.sql`

Run this to calculate deadlines for existing bookings that don't have them set yet.

**What it does:**
- Calculates `days_gap` for all bookings
- Sets `influencer_approval_deadline` (12 hrs from creation)
- Sets `appointment_end_time` (appointment day 11:59 PM)
- Sets `auto_approval_deadline` (appointment day 10:30 PM)
- Sets `payment_deadline` if status is "awaiting payment"
- Sets `script_submission_deadline` if payment is confirmed

**When to run:**
- After running `create_booking_automation.sql`
- To backfill deadlines for existing bookings
- Safe to run multiple times (won't overwrite existing deadlines)

## Quick Reference

| File | Purpose | When to Run |
|------|---------|-------------|
| `create_booking_automation.sql` | Initial setup | Once, first time |
| `cron_job_final.sql` | Cron job command | Use in cron job setup |
| `update_existing_bookings.sql` | Backfill deadlines | After initial setup, for existing bookings |

