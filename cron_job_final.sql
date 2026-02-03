-- Final Cron Job SQL Command
-- Use this in Supabase Dashboard → Database → Cron Jobs
-- Replace YOUR_SERVICE_ROLE_KEY with your actual service role key

SELECT net.http_post(
  url := 'https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
  ),
  body := '{}'::jsonb
);

-- To get your Service Role Key:
-- 1. Go to Supabase Dashboard → Settings → API
-- 2. Copy the "service_role" key (it's the secret one)
-- 3. Replace YOUR_SERVICE_ROLE_KEY above with that key

