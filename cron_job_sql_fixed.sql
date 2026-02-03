-- Fixed Cron Job SQL Command
-- Copy this entire block and use in Supabase Cron Job

SELECT net.http_post(
  url := 'https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE'
  ),
  body := '{}'::jsonb
);

-- IMPORTANT: Replace YOUR_SERVICE_ROLE_KEY_HERE with your actual service role key
-- Get it from: Supabase Dashboard → Settings → API → service_role key

-- Alternative: If you want to use a setting (may not work in all Supabase versions)
-- SELECT net.http_post(
--   url := 'https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation',
--   headers := jsonb_build_object(
--     'Content-Type', 'application/json',
--     'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.secrets WHERE name = 'service_role_key' LIMIT 1)
--   ),
--   body := '{}'::jsonb
-- );

