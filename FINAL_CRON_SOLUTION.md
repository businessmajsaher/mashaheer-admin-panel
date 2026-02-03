# Final Solution: Cron Job Setup

## The Problem
The `net` extension is not available/enabled in your Supabase project. 

## ✅ Best Solution: Use External Cron Service

**I strongly recommend using cron-job.org** - it's free, reliable, and doesn't require any database setup.

### Step-by-Step: cron-job.org Setup

1. **Go to [cron-job.org](https://cron-job.org)**
   - Sign up (free account)
   - Click **"Create cronjob"**

2. **Fill in the form:**
   ```
   Title: Booking Automation
   
   Address (URL): 
   https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation
   
   Schedule: 
   */5 * * * *  (every 5 minutes)
   
   Request Method: POST
   
   Request Headers (one per line):
   Content-Type: application/json
   Authorization: Bearer YOUR_SERVICE_ROLE_KEY
   
   Request Body:
   {}
   ```

3. **Get Your Service Role Key:**
   - Supabase Dashboard → **Settings** → **API**
   - Find **"service_role"** key (it's secret)
   - Copy it and paste in the Authorization header above

4. **Click "Create cronjob"**
   - Done! It will run every 5 minutes automatically

5. **Test it:**
   - Click "Run now" to test immediately
   - Check Supabase Edge Function logs to verify it worked

## Alternative: Try Enabling Extension First

If you want to try enabling the extension:

1. **Run this SQL in Supabase SQL Editor:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_net;
   ```

2. **Check if it worked:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```

3. **If it returns a row**, the extension is enabled. Then use:
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

4. **If it returns no rows**, the extension is not available. Use cron-job.org instead.

## Why External Cron is Better

✅ **No database dependencies** - Works regardless of extensions  
✅ **Better monitoring** - See execution history, success/failure rates  
✅ **Easy to manage** - Pause, resume, edit schedule easily  
✅ **Free tier available** - No cost for basic usage  
✅ **More reliable** - Dedicated infrastructure  
✅ **Email alerts** - Get notified if jobs fail  

## Quick Test

Test your function manually first:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation
```

If this works, the cron job will work too.

## Recommendation

**Use cron-job.org** - it's the simplest and most reliable solution. The extension approach requires database configuration that may not be available in all Supabase projects.

