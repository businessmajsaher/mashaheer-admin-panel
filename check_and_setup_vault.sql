-- Check if Vault is available and set it up
-- Run this to check Vault availability

-- Step 1: Check if vault extension exists
SELECT EXISTS (
  SELECT FROM pg_extension WHERE extname = 'vault'
) as vault_extension_exists;

-- Step 2: Check if vault schema exists
SELECT EXISTS (
  SELECT FROM information_schema.schemata WHERE schema_name = 'vault'
) as vault_schema_exists;

-- Step 3: Check if vault.secrets table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'vault' AND table_name = 'secrets'
) as vault_secrets_exists;

-- Step 4: If vault exists, check its structure
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'vault' AND table_name = 'secrets') THEN
    RAISE NOTICE 'Vault exists! Checking structure...';
    -- This will show the actual column names
    PERFORM * FROM vault.secrets LIMIT 0;
  ELSE
    RAISE NOTICE 'Vault does not exist. You need to use direct key method.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error checking vault: %', SQLERRM;
END $$;

-- If vault exists, you can store the key like this:
-- INSERT INTO vault.secrets (name, secret)
-- VALUES ('service_role_key', 'YOUR_SERVICE_ROLE_KEY')
-- ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;

-- Then use it like this (adjust column name based on actual structure):
-- SELECT net.http_post(
--   'https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation',
--   jsonb_build_object(
--     'Content-Type', 'application/json',
--     'Authorization', 'Bearer ' || (SELECT secret FROM vault.secrets WHERE name = 'service_role_key')
--   )::jsonb,
--   '{}'::jsonb
-- );

