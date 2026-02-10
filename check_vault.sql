-- Check if Vault is available in your Supabase project
-- Run this in SQL Editor

-- Check if vault schema exists
SELECT EXISTS (
  SELECT FROM information_schema.schemata 
  WHERE schema_name = 'vault'
) as vault_schema_exists;

-- Check if vault.secrets table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'vault' 
  AND table_name = 'secrets'
) as vault_secrets_table_exists;

-- If both return true, you can use Vault to store secrets
-- If false, use direct key method (current approach)
