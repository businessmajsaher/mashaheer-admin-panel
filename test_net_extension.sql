-- Test if pg_net extension is working
-- Run this first to verify the extension

-- Check if extension exists
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- Check if net schema exists
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'net';

-- Test the http_post function (simple test)
SELECT net.http_post(
  'https://httpbin.org/post',
  '{"Content-Type": "application/json"}'::jsonb,
  '{"test": "data"}'::jsonb
);

-- If the test works, then use the cron job SQL
-- If it fails, the extension is not properly enabled

