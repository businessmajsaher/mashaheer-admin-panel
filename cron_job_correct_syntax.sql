-- Correct Cron Job SQL Syntax
-- Use this EXACT format in Supabase Cron Jobs

SELECT net.http_post(
  'https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation',
  jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE'
  ),
  '{}'::jsonb
);

-- INSTRUCTIONS:
-- 1. Replace YOUR_SERVICE_ROLE_KEY_HERE with your actual service role key
-- 2. Copy the entire SELECT statement above
-- 3. Paste into Supabase Cron Job SQL field
-- 4. Save

-- Get your Service Role Key from:
-- Supabase Dashboard → Settings → API → service_role key

