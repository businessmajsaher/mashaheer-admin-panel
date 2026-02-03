# Quick Start: Automatic Status Changes

## Simple 3-Step Setup

### Step 1: Run SQL Migration ⚡

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy the entire contents of `create_booking_automation.sql`
3. Paste and click **"Run"**

This creates all the necessary database tables and fields.

### Step 2: Deploy Edge Function 🚀

```bash
cd /Users/akshaykc/Documents/development/mashaheer-admin-panel
supabase functions deploy process-booking-automation
```

### Step 3: Set Up Cron Job ⏰

**Easiest Method - Using Supabase Cron:**

1. Go to **Supabase Dashboard** → **Database** → **Cron Jobs**
2. Click **"New Cron Job"**
3. Fill in:
   ```
   Name: booking-automation
   Schedule: */5 * * * *
   ```
4. SQL Command (replace YOUR_PROJECT_REF):
   ```sql
   SELECT net.http_post(
     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-booking-automation',
     headers := jsonb_build_object(
       'Content-Type', 'application/json',
       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
     ),
     body := '{}'::jsonb
   );
   ```
5. Click **"Create"**

**To find YOUR_PROJECT_REF:**
- Go to **Project Settings** → **General**
- Look for **"Reference ID"**

## How It Works

```
Every 5 Minutes:
┌─────────────────────────────────┐
│  Cron Job Triggers              │
│  Edge Function                  │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  Check All Bookings             │
│  Compare Deadlines vs Now        │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  Update Statuses Automatically  │
│  • Auto-reject (12hr timeout)   │
│  • Auto-cancel (payment timeout)│
│  • Auto-refund (script timeout) │
│  • Auto-approve (deadline)      │
└─────────────────────────────────┘
```

## Test It Manually

Before setting up cron, test the function:

```bash
# Get your service role key from Supabase Dashboard → Settings → API
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-booking-automation
```

You should see a response like:
```json
{
  "success": true,
  "timestamp": "2024-12-04T10:30:00Z",
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

## What Gets Automated

| When | What Happens |
|------|-------------|
| **12 hrs after booking** | If influencer hasn't approved → `auto-reject` |
| **12 hrs after influencer approves** | If customer hasn't paid → `auto-cancel` |
| **8 hrs × (days-1) after payment** | If script not submitted → `auto-refund` |
| **10:30 PM on appointment day** | Latest script → `Auto-Approved` → `To Be Publish` |
| **11:59 PM on appointment day** | If not published → Create black mark |

## Verify It's Working

1. **Check Function Logs:**
   - Supabase Dashboard → Edge Functions → process-booking-automation → Logs

2. **Check Bookings:**
   ```sql
   SELECT id, status_id, influencer_approval_deadline 
   FROM bookings 
   WHERE influencer_approval_deadline < NOW();
   ```

3. **Watch Status Changes:**
   - Create a test booking
   - Manually set deadline to past time
   - Wait for cron to run (or trigger manually)
   - Check if status changed

## Troubleshooting

**Function not running?**
- Check cron job is enabled
- Verify function is deployed
- Check function logs for errors

**Status not changing?**
- Verify deadlines are set in database
- Check status names match exactly
- Review function logs

**Need help?**
- See `HOW_AUTOMATION_WORKS.md` for detailed explanation
- Check `BOOKING_AUTOMATION_SETUP.md` for full setup guide

