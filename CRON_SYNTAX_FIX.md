# Fixed Cron Job SQL Syntax

## The Problem
The `:=` syntax is for PL/pgSQL functions, not for direct SQL queries in cron jobs.

## ✅ Correct SQL Syntax

Use this **exact format**:

```sql
SELECT net.http_post(
  'https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation',
  jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
  ),
  '{}'::jsonb
);
```

## Key Changes

1. ❌ Remove `url :=` → ✅ Just use the URL as first parameter
2. ❌ Remove `headers :=` → ✅ Just use headers as second parameter  
3. ❌ Remove `body :=` → ✅ Just use body as third parameter
4. ❌ Remove Vault reference → ✅ Use direct key

## Step-by-Step

1. **Get Your Service Role Key:**
   - Supabase Dashboard → Settings → API
   - Copy the `service_role` key

2. **Update Cron Job:**
   - Database → Cron Jobs
   - Edit "booking-automation"
   - Replace SQL with the corrected version above
   - Replace `YOUR_SERVICE_ROLE_KEY` with your actual key
   - Save

## Alternative: If net.http_post Still Doesn't Work

If you continue having issues with `net.http_post`, use an external cron service:

**cron-job.org** (Recommended):
- URL: `https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation`
- Method: POST
- Headers:
  ```
  Content-Type: application/json
  Authorization: Bearer YOUR_SERVICE_ROLE_KEY
  ```
- Body: `{}`
- Schedule: `*/5 * * * *`

This avoids all SQL syntax issues.

