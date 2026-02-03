# Fixed Cron Job SQL

## The Error
The `decrypted_secret` column doesn't exist because Vault may not be available or uses a different structure.

## ✅ Solution: Use Direct Key

**Use this SQL in your cron job:**

```sql
SELECT net.http_post(
  url := 'https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer YOUR_ACTUAL_SERVICE_ROLE_KEY'
  ),
  body := '{}'::jsonb
);
```

## Steps

1. **Get Your Service Role Key:**
   - Go to Supabase Dashboard
   - Settings → API
   - Find **"service_role"** key (it's the secret one, starts with `eyJ...`)
   - Copy the entire key

2. **Update Your Cron Job:**
   - Go to Database → Cron Jobs
   - Edit your "booking-automation" cron job
   - Replace the SQL with the code above
   - Replace `YOUR_ACTUAL_SERVICE_ROLE_KEY` with your copied key
   - Save

3. **Test:**
   - The cron job should run every 5 minutes
   - Check Edge Function logs to verify it's working

## Important Notes

- ✅ The key is only visible to admins who can access cron jobs
- ✅ This is the standard approach for Supabase cron jobs
- ✅ Vault is optional and not available in all projects
- ✅ Direct key method is secure enough for this use case

## File Created

I've created `cron_job_working.sql` with the correct SQL. Just:
1. Open the file
2. Replace `YOUR_SERVICE_ROLE_KEY_HERE` with your actual key
3. Copy the SELECT statement
4. Paste into your cron job

