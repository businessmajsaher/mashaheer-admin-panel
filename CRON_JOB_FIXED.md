# Fixed Cron Job Setup

## The Problem
The URL had a leading space, causing the error. Here's the corrected SQL:

## Corrected SQL Command

**For Supabase Cron Job:**

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

**Important:** 
- ✅ No space before the URL
- ✅ Replace `YOUR_SERVICE_ROLE_KEY` with your actual key
- ✅ Get key from: Dashboard → Settings → API → `service_role` key

## Step-by-Step Setup

1. **Get Your Service Role Key:**
   - Go to Supabase Dashboard
   - Settings → API
   - Copy the `service_role` key (it's secret - keep it safe!)

2. **Create Cron Job:**
   - Go to Database → Cron Jobs
   - Click "New Cron Job"
   - Name: `booking-automation`
   - Schedule: `*/5 * * * *` (every 5 minutes)
   - SQL Command: Use the corrected SQL above (with your actual key)

3. **Test It:**
   - After creating, wait 5 minutes
   - Check Edge Function logs: Dashboard → Edge Functions → process-booking-automation → Logs
   - You should see execution logs

## Alternative: Use Environment Variable (If Available)

Some Supabase projects allow using environment variables. Try this:

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

**Note:** This may not work if the setting isn't configured. In that case, use the direct key method above.

## Still Having Issues?

If the `net` extension continues to cause problems, use an external cron service:

1. **cron-job.org** (Recommended - Free)
   - URL: `https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation`
   - Method: POST
   - Headers: 
     ```
     Content-Type: application/json
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     ```
   - Body: `{}`
   - Schedule: Every 5 minutes

2. **Use the shell script:**
   - Edit `run-booking-automation.sh`
   - Add your service role key
   - Add to system cron or run manually

