-- Working Cron Job SQL - Use Direct Service Role Key
-- Copy this entire block into your Supabase Cron Job

SELECT net.http_post(
  url := 'https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE'
  ),
  body := '{}'::jsonb
);

-- INSTRUCTIONS:
-- 1. Get your Service Role Key from: Supabase Dashboard → Settings → API → service_role key
-- 2. Replace YOUR_SERVICE_ROLE_KEY_HERE above with your actual key
-- 3. Copy the entire SELECT statement (without this comment)
-- 4. Paste into your cron job SQL field
-- 5. Save the cron job

-- Example (with fake key - replace with yours):
-- 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpbHNoaG5jZGVoYm55bGRzanpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTYzODk2ODAwMCwiZXhwIjoxOTU0NTQ0MDAwfQ.example'

