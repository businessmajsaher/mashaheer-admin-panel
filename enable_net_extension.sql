-- Enable pg_net extension for HTTP requests
-- Run this in Supabase SQL Editor

-- Method 1: Try pg_net (newer)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Method 2: If pg_net doesn't work, try http (older)
-- CREATE EXTENSION IF NOT EXISTS http;

-- Verify extension is enabled
SELECT 
  extname as extension_name,
  extversion as version
FROM pg_extension 
WHERE extname IN ('pg_net', 'http', 'net');

-- Test the extension (optional)
-- SELECT net.http_post(
--   url := 'https://httpbin.org/post',
--   headers := '{"Content-Type": "application/json"}'::jsonb,
--   body := '{"test": "data"}'::jsonb
-- );
