# Deploy Hesabe Payment Webhook

## Issue

Hesabe is calling `hesabe-payment-webhook` but it's returning 401 (Unauthorized).

## Solution

The function `hesabe-payment-webhook` exists in Supabase but needs to be:
1. Created locally (already done - copied from hesabe-webhook)
2. Configured for public access (config.toml updated)
3. Deployed with the config

## Deploy Command

```bash
cd /Users/akshaykc/Documents/development/mashaheer-admin-panel
supabase functions deploy hesabe-payment-webhook
```

This will:
- ✅ Deploy the function code
- ✅ Apply `verify_jwt = false` from config.toml
- ✅ Make it publicly accessible

## Verify After Deployment

```bash
# Test the webhook
curl -X POST \
  -H "Content-Type: application/json" \
  https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/hesabe-payment-webhook \
  -d '{
    "token": "test-123",
    "reference_number": "test-ref",
    "status": "SUCCESSFUL"
  }'
```

**Expected:** HTTP 200 (not 401)

## Check Logs

After deployment, check Supabase Dashboard:
- Edge Functions → hesabe-payment-webhook → Logs
- Should see successful requests (200 status)

---

**Last Updated**: Deploy payment webhook fix

