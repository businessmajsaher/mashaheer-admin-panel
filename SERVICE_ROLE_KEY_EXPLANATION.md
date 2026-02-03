# Service Role Key - How It Works

## Edge Functions (Automatic)

**Edge functions automatically get these from Supabase:**
- `SUPABASE_URL` - Automatically available
- `SUPABASE_SERVICE_ROLE_KEY` - Automatically available

**You don't need to set these manually** - Supabase provides them automatically to all edge functions.

## Cron Jobs (Manual)

**For cron jobs, you have 2 options:**

### Option 1: Use Direct Key (Current Method)

```sql
SELECT net.http_post(
  url := 'https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'  -- Your actual key
  ),
  body := '{}'::jsonb
);
```

**Pros:** Simple, works immediately  
**Cons:** Key is visible in SQL (but only admins can see it)

### Option 2: Use Vault Secrets (More Secure)

If you want to store it in Supabase Vault:

1. **Store the key in Vault:**
   ```sql
   -- Insert service role key into vault
   INSERT INTO vault.secrets (name, secret)
   VALUES (
     'service_role_key',
     'YOUR_SERVICE_ROLE_KEY_HERE'
   )
   ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;
   ```

2. **Use it in cron job:**
   ```sql
   SELECT net.http_post(
     url := 'https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation',
     headers := jsonb_build_object(
       'Content-Type', 'application/json',
       'Authorization', 'Bearer ' || (
         SELECT decrypted_secret 
         FROM vault.secrets 
         WHERE name = 'service_role_key' 
         LIMIT 1
       )
     ),
     body := '{}'::jsonb
   );
   ```

**Note:** Vault may not be available in all Supabase projects. Check if `vault.secrets` table exists first.

## Check What's Available

### Check if Vault exists:
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'vault' 
  AND table_name = 'secrets'
);
```

### Check current settings:
```sql
-- This usually doesn't work, but you can try:
SELECT current_setting('app.settings.service_role_key', true);
```

## Recommendation

**For now, use Option 1 (direct key):**
- ✅ Works immediately
- ✅ Only admins can see the SQL
- ✅ Simpler to set up
- ✅ No additional setup needed

**If you want more security later:**
- Use Option 2 (Vault) if available
- Or use external cron service (cron-job.org) which stores secrets securely

## Edge Function vs Cron Job

| Context | How to Access |
|---------|---------------|
| **Edge Function** | `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` - Automatic |
| **Cron Job SQL** | Must provide key directly or use Vault |
| **External Cron** | Store in their secure settings |

## Your Current Setup

Since your cron job is working, you're using **Option 1** (direct key), which is fine for now. The key is only visible to admins who can access the cron job SQL.

