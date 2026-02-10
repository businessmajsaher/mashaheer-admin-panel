-- Enable pg_net extension
-- Run this FIRST in Supabase SQL Editor

-- Try to enable pg_net
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Verify it's enabled
SELECT 
  extname as extension_name,
  extversion as version,
  'Enabled' as status
FROM pg_extension 
WHERE extname = 'pg_net';

-- If the above returns no rows, the extension is not available in your project
-- In that case, use an external cron service instead (see CRON_JOB_SETUP.md)

