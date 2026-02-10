# How to Enable Net Extension in Supabase

## Method 1: Via Supabase Dashboard (Easiest)

1. Go to **Supabase Dashboard**
2. Navigate to **Database** → **Extensions**
3. Search for **"pg_net"** or **"http"**
4. Click **"Enable"** next to the extension
5. Wait for it to enable (usually instant)

## Method 2: Via SQL Editor

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run this SQL:

```sql
-- Enable pg_net extension
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Verify it's enabled
SELECT * FROM pg_extension WHERE extname = 'pg_net';
```

## Method 3: Check Available Extensions

If `pg_net` is not available, check what HTTP extensions are available:

```sql
-- List all available extensions
SELECT * FROM pg_available_extensions WHERE name LIKE '%http%' OR name LIKE '%net%';

-- Or check installed extensions
SELECT * FROM pg_extension;
```

## Alternative: Use http Extension

If `pg_net` is not available, Supabase might use the `http` extension instead:

```sql
-- Try enabling http extension
CREATE EXTENSION IF NOT EXISTS http;

-- Then use it like this:
SELECT http_post(
  'https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation',
  '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
  '{}'::jsonb
);
```

## Verify Extension is Working

After enabling, test it:

```sql
-- Test pg_net
SELECT net.http_post(
  url := 'https://httpbin.org/post',
  headers := '{"Content-Type": "application/json"}'::jsonb,
  body := '{"test": "data"}'::jsonb
);

-- Or test http extension
SELECT content FROM http_post(
  'https://httpbin.org/post',
  '{"Content-Type": "application/json"}'::jsonb,
  '{"test": "data"}'::jsonb
);
```

## If Extension is Not Available

Some Supabase projects may not have HTTP extensions enabled. In that case:

1. **Use external cron service** (recommended):
   - cron-job.org
   - EasyCron
   - See `CRON_JOB_SETUP.md`

2. **Use pg_cron with shell command** (if available):
   ```sql
   SELECT cron.schedule(
     'booking-automation',
     '*/5 * * * *',
     $$SELECT pg_cmd_exec('curl -X POST -H "Authorization: Bearer KEY" URL');$$
   );
   ```

3. **Use the shell script** I created:
   - `run-booking-automation.sh`
   - Add to system cron

## Recommended Approach

Even if you enable the extension, I still recommend using **cron-job.org** because:
- ✅ More reliable
- ✅ Better monitoring
- ✅ Easier to manage
- ✅ No database dependencies
- ✅ Free tier available

