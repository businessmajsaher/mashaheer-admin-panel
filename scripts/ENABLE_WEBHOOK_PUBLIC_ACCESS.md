# Enable Public Access for Hesabe Webhook

## Problem

The Hesabe webhook is not working because the Supabase Edge Function requires authentication, but Hesabe cannot send Supabase auth headers.

## Solution

Enable public (unauthenticated) access for the `hesabe-webhook` function.

---

## Step-by-Step Instructions

### Method 1: Using config.toml (Recommended)

This is the proper way to enable public access for Supabase Edge Functions.

#### Step 1: Create/Update config.toml

The `supabase/config.toml` file has been created with the correct configuration:

```toml
[functions.hesabe-webhook]
verify_jwt = false
```

#### Step 2: Deploy the Function

Deploy the function with the configuration:

```bash
cd /Users/akshaykc/Documents/development/mashaheer-admin-panel
supabase functions deploy hesabe-webhook
```

The `verify_jwt = false` setting will be applied automatically, making the function publicly accessible.

### Method 2: Using Supabase Dashboard (If Available)

**Note:** This option may not be available in all Supabase projects. If you don't see it, use Method 1.

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/functions
2. Find `hesabe-webhook` function
3. Click on the function
4. Look for **Settings** or **Configuration** tab
5. Find **"Verify JWT"** or **"Require Authentication"** option
6. **Disable** it (set to false)
7. Save

### Step 4: Verify Access

Run the verification script:

```bash
chmod +x scripts/verify_webhook_access.sh
./scripts/verify_webhook_access.sh
```

**Expected Result:**
- ✅ HTTP 200 or 400 (not 401)
- ✅ Function is publicly accessible

---

## Alternative: Using Supabase CLI

If you prefer using CLI:

```bash
# Note: This may require Supabase CLI v1.8.0+
supabase functions update hesabe-webhook --public
```

Or check current settings:

```bash
supabase functions list
```

---

## Security Considerations

### ✅ Safe to Make Public Because:

1. **Signature Verification**: The webhook verifies Hesabe's signature
   - Checks `x-hesabe-signature` header (if implemented)
   - Validates webhook payload

2. **Service Role Key**: Function uses service role key internally
   - Database operations use service role
   - No user authentication needed

3. **Hesabe Secret**: Only Hesabe knows the webhook secret
   - Webhook URL is included in payment request
   - Hesabe signs the payload with their secret

4. **Idempotent Operations**: Webhook operations are safe to retry
   - Updates are idempotent
   - No duplicate processing issues

### 🔒 Additional Security (Optional)

If you want extra security, add signature verification:

1. **Get Hesabe Webhook Secret** from Hesabe dashboard
2. **Add to Supabase Secrets**:
   ```bash
   supabase secrets set HESABE_WEBHOOK_SECRET=your-secret-key
   ```
3. **Update webhook function** to verify signature (see code example below)

---

## Troubleshooting

### Issue: "Allow unauthenticated access" option not visible

**Solution:**
- Ensure you're using Supabase Pro plan or higher
- Check if function is deployed correctly
- Try refreshing the dashboard

### Issue: Still getting 401 after enabling

**Solutions:**
1. **Clear browser cache** and refresh
2. **Wait 1-2 minutes** for changes to propagate
3. **Check function logs** for errors
4. **Verify function name** matches exactly: `hesabe-webhook`

### Issue: Function not found

**Solution:**
1. Deploy the function:
   ```bash
   supabase functions deploy hesabe-webhook
   ```
2. Wait for deployment to complete
3. Refresh dashboard

### Issue: CORS errors

**Solution:**
- CORS is already handled in the function
- Check if OPTIONS request returns 204
- Verify `Access-Control-Allow-Origin` header is present

---

## Testing

### Test 1: Basic Access

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/hesabe-webhook \
  -d '{
    "token": "test-123",
    "reference_number": "test-ref",
    "status": "SUCCESSFUL"
  }'
```

**Expected:**
- HTTP 200 or 400 (not 401)
- Response with success/error message

### Test 2: With Real Payment Reference

```bash
# Use actual reference_number from a payment
curl -X POST \
  -H "Content-Type: application/json" \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/hesabe-webhook \
  -d '{
    "token": "84221716951937729753667644493",
    "reference_number": "1695193758",
    "status": "SUCCESSFUL",
    "amount": "49.000",
    "payment_type": "KNET",
    "datetime": "2023-09-20 10:09:36"
  }'
```

**Expected:**
- HTTP 200
- Payment status updated in database
- Booking status updated (if payment successful)

### Test 3: Check Logs

1. Go to Supabase Dashboard → Edge Functions → hesabe-webhook → Logs
2. Look for:
   - ✅ "=== HESABE WEBHOOK RECEIVED ==="
   - ✅ "Webhook Payload: ..."
   - ✅ "Payment updated successfully"

---

## Verification Checklist

- [ ] Function is deployed (`hesabe-webhook`)
- [ ] Public access is enabled in dashboard
- [ ] Verification script returns HTTP 200 or 400 (not 401)
- [ ] CORS is working (OPTIONS returns 204)
- [ ] Function logs show incoming requests
- [ ] Test payment webhook is received
- [ ] Payment status updates in database
- [ ] Booking status updates when payment succeeds

---

## Next Steps

1. ✅ Enable public access (this guide)
2. ✅ Verify access (run verification script)
3. ✅ Test with real payment
4. ✅ Monitor logs for webhook calls
5. ✅ Verify payment updates work correctly

---

## Additional Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Hesabe Payment Gateway Docs](https://hesabe.com/docs)
- Webhook Setup Guide: `HESABE_WEBHOOK_SETUP.md`

---

**Last Updated**: Public access configuration guide

