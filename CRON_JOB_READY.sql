-- READY-TO-USE Cron Job SQL
-- Copy this entire block into Supabase Dashboard → Database → Cron Jobs

SELECT net.http_post(
  'https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation',
  jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer 9754a7a9e6c7d1ab1a841afe4be0f2f00c3fcb76ca08fcb256a6f2ee9b749fae'
  )::jsonb,
  '{}'::jsonb
);

