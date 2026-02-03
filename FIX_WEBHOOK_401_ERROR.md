# Fix: Webhook 401 Error

## Problem

The webhook is returning **401 Unauthorized** error. The log shows:
- URL: `hesabe-payment-webhook` 
- Status: 401
- This means the function still requires authentication

## Solution

### Issue 1: Function Name Mismatch

The log shows the function is called `hesabe-payment-webhook`, but we created `hesabe-webhook`. 

**Option A: Update Config for Both Names**

The `config.toml` has been updated to include both function names. Redeploy:

```bash
supabase functions deploy hesabe-webhook
```

If `hesabe-payment-webhook` exists as a separate function, also deploy it:

```bash
supabase functions deploy hesabe-payment-webhook
```

**Option B: Use Correct Function Name**

If Hesabe is calling `hesabe-payment-webhook`, you need to either:
1. Rename your function to match, OR
2. Update Hesabe to call `hesabe-webhook`

### Issue 2: Config Not Applied

The `verify_jwt = false` setting might not be applied. Try:

```bash
# Redeploy with explicit flag (if supported)
supabase functions deploy hesabe-payment-webhook --no-verify-jwt

# Or redeploy normally (config.toml should be read)
supabase functions deploy hesabe-payment-webhook
```

### Issue 3: Verify Config File Location

Make sure `supabase/config.toml` exists and contains:

```toml
[functions.hesabe-payment-webhook]
verify_jwt = false
```

## Quick Fix Steps

1. **Check which function name Hesabe is calling:**
   - Look at the log: `hesabe-payment-webhook` or `hesabe-webhook`?

2. **Update config.toml** (already done - includes both names)

3. **Redeploy the function:**
   ```bash
   # If it's hesabe-payment-webhook:
   supabase functions deploy hesabe-payment-webhook
   
   # If it's hesabe-webhook:
   supabase functions deploy hesabe-webhook
   ```

4. **Wait 1-2 minutes** for changes to propagate

5. **Test again:**
   ```bash
   ./scripts/verify_webhook_access.sh
   ```

## Alternative: Create Function with Correct Name

If `hesabe-payment-webhook` doesn't exist, create it:

```bash
# Copy the webhook function
cp -r supabase/functions/hesabe-webhook supabase/functions/hesabe-payment-webhook

# Deploy it
supabase functions deploy hesabe-payment-webhook
```

## Verify It's Fixed

After redeploying, check the logs again. You should see:
- ✅ HTTP 200 (not 401)
- ✅ "=== HESABE WEBHOOK RECEIVED ===" in logs
- ✅ Payment processing works

## Check Function Status

```bash
# List all functions
supabase functions list

# Check if function exists
supabase functions get hesabe-payment-webhook
```

---

**Last Updated**: Fix for 401 error on webhook

