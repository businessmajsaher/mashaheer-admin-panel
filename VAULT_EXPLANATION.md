# Can We Use Vault?

## Short Answer
**Maybe, but it's not necessary.** The direct key method works fine and is simpler.

## Check if Vault is Available

Run `check_and_setup_vault.sql` to see if Vault is available in your Supabase project.

## Two Scenarios

### Scenario 1: Vault is Available ✅

If Vault exists, you can:

1. **Store the key:**
   ```sql
   INSERT INTO vault.secrets (name, secret)
   VALUES ('service_role_key', 'YOUR_SERVICE_ROLE_KEY')
   ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;
   ```

2. **Use it in cron:**
   ```sql
   SELECT net.http_post(
     'https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation',
     jsonb_build_object(
       'Content-Type', 'application/json',
       'Authorization', 'Bearer ' || (
         SELECT secret FROM vault.secrets WHERE name = 'service_role_key'
       )
     )::jsonb,
     '{}'::jsonb
   );
   ```

**Note:** Column name might be `secret`, `decrypted_secret`, or something else - check the actual structure first.

### Scenario 2: Vault is NOT Available ❌

**Most Supabase projects don't have Vault enabled by default.**

In this case:
- ✅ **Use direct key method** (what you're doing now)
- ✅ **Use external cron service** (cron-job.org)
- ✅ **Use shell script** (run-booking-automation.sh)

## Recommendation

**Use the direct key method** because:
1. ✅ Works immediately
2. ✅ No setup needed
3. ✅ Only admins can see the key
4. ✅ Simpler to maintain
5. ✅ Vault may not be available anyway

## Security Note

The direct key in cron job SQL is secure enough because:
- Only database admins can access cron job SQL
- The key is not exposed in application code
- Edge functions use environment variables (automatic)
- External cron services store keys securely

## Bottom Line

**You don't need Vault.** The direct key method is the standard approach for Supabase cron jobs and works perfectly fine.

If you want to check if Vault is available, run `check_and_setup_vault.sql` first.

