# Cron Job Setup - Alternative Methods

## Problem
Supabase's `net` extension may not be enabled in your project. Here are working alternatives:

## Solution 1: Enable pg_net Extension (Recommended)

1. Go to **Supabase Dashboard** → **Database** → **Extensions**
2. Search for **"pg_net"** or **"http"**
3. Enable the extension
4. Then use this SQL in your cron job:

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

**To get your Service Role Key:**
- Dashboard → Settings → API → `service_role` key (secret)

## Solution 2: Use External Cron Service (Easiest)

### Option A: cron-job.org (Free)

1. Go to [cron-job.org](https://cron-job.org) and create account
2. Click **"Create cronjob"**
3. Fill in:
   - **Title**: Booking Automation
   - **Address (URL)**: `https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation`
   - **Schedule**: Every 5 minutes
   - **Request Method**: POST
   - **Request Headers**: 
     ```
     Content-Type: application/json
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     ```
   - **Request Body**: `{}`
4. Click **"Create cronjob"**

### Option B: EasyCron

1. Go to [EasyCron](https://www.easycron.com)
2. Create account and new cron job
3. Use same settings as above

### Option C: GitHub Actions (If you use GitHub)

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
            https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation
```

Add `SUPABASE_SERVICE_ROLE_KEY` to GitHub Secrets.

## Solution 3: Use pg_cron with Direct Function Call

If you have `pg_cron` enabled, you can create a PostgreSQL function:

```sql
-- Create a function that calls the edge function
CREATE OR REPLACE FUNCTION call_booking_automation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response text;
BEGIN
  -- Use pg_net if available, otherwise use curl via shell
  -- This requires pg_net extension
  SELECT content INTO response
  FROM http((
    'POST',
    'https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation',
    ARRAY[
      http_header('Content-Type', 'application/json'),
      http_header('Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY')
    ],
    'application/json',
    '{}'
  )::http_request);
END;
$$;

-- Schedule it with pg_cron
SELECT cron.schedule(
  'booking-automation',
  '*/5 * * * *',
  $$SELECT call_booking_automation();$$
);
```

## Solution 4: Manual Testing Script

Create a simple script you can run manually or via system cron:

**`run-automation.sh`:**
```bash
#!/bin/bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation
```

Make it executable:
```bash
chmod +x run-automation.sh
```

Run manually:
```bash
./run-automation.sh
```

Or add to system cron:
```bash
crontab -e
# Add this line:
*/5 * * * * /path/to/run-automation.sh
```

## Recommended: Use cron-job.org (Easiest)

**Why:**
- ✅ No database extensions needed
- ✅ Free tier available
- ✅ Easy to set up
- ✅ Can monitor execution history
- ✅ Can pause/resume easily

**Steps:**
1. Sign up at [cron-job.org](https://cron-job.org)
2. Create new cron job
3. Use the settings from Solution 2, Option A above
4. Done!

## Verify It's Working

After setting up, test manually:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation
```

You should see:
```json
{
  "success": true,
  "timestamp": "2024-12-06T...",
  "results": {
    "autoRejected": 0,
    "autoCancelled": 0,
    ...
  }
}
```

## Get Your Service Role Key

1. Go to **Supabase Dashboard**
2. **Settings** → **API**
3. Find **"service_role"** key (it's secret - keep it safe!)
4. Copy it and use in the Authorization header

