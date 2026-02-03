# Fix: Enable Public Access for Hesabe Webhook

## Problem

The "Allow unauthenticated access" option is not found in the Supabase Dashboard.

## Solution

Use `config.toml` file to configure the function. This is the proper way to enable public access.

---

## Quick Fix (2 Steps)

### Step 1: Deploy Function with Config

The `supabase/config.toml` file has been created. Just deploy:

```bash
cd /Users/akshaykc/Documents/development/mashaheer-admin-panel
supabase functions deploy hesabe-webhook
```

### Step 2: Verify It Works

```bash
./scripts/verify_webhook_access.sh
```

Should return HTTP 200 or 400 (not 401).

---

## What's in config.toml

The configuration file at `supabase/config.toml` contains:

```toml
[functions.hesabe-webhook]
verify_jwt = false
```

This tells Supabase to:
- ✅ Allow requests without JWT authentication
- ✅ Make the function publicly accessible
- ✅ Accept webhooks from Hesabe

---

## How It Works

1. **Deploy function** with `supabase functions deploy`
2. **Supabase reads** `config.toml` automatically
3. **Applies** `verify_jwt = false` setting
4. **Function becomes** publicly accessible

---

## Alternative: Manual Config Check

If you want to verify the config is correct:

```bash
# Check if config.toml exists
cat supabase/config.toml

# Should show:
# [functions.hesabe-webhook]
# verify_jwt = false
```

---

## Troubleshooting

### Issue: Still getting 401 after deployment

**Solutions:**
1. **Verify config.toml exists** in `supabase/` directory
2. **Check function name** matches exactly: `hesabe-webhook`
3. **Redeploy** the function:
   ```bash
   supabase functions deploy hesabe-webhook --no-verify-jwt
   ```
4. **Wait 1-2 minutes** for changes to propagate

### Issue: config.toml not being read

**Solutions:**
1. **Check file location**: Must be in `supabase/config.toml` (not `supabase/functions/config.toml`)
2. **Verify syntax**: TOML format must be correct
3. **Check Supabase CLI version**: Update if needed:
   ```bash
   supabase --version
   # Should be 1.8.0 or higher
   ```

### Issue: Function not found

**Solution:**
1. Deploy the function first:
   ```bash
   supabase functions deploy hesabe-webhook
   ```
2. Then verify with test script

---

## Verification

### Test 1: Check Function is Public

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/hesabe-webhook \
  -d '{"token":"test","reference_number":"test","status":"SUCCESSFUL"}'
```

**Expected:** HTTP 200 or 400 (not 401)

### Test 2: Check Logs

1. Go to Supabase Dashboard → Edge Functions → hesabe-webhook → Logs
2. Look for:
   - ✅ "=== HESABE WEBHOOK RECEIVED ==="
   - ✅ No authentication errors

---

## Summary

✅ **Config file created**: `supabase/config.toml`  
✅ **Setting applied**: `verify_jwt = false`  
✅ **Next step**: Deploy function  
✅ **Verify**: Run test script  

The function will be publicly accessible after deployment!

---

**Last Updated**: Config.toml method for public access

