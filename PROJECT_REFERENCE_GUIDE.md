# Supabase Project Reference Guide

## What is Project Reference?

The **Project Reference** (also called "Reference ID") is your Supabase project's unique identifier. It's used in:
- API URLs
- Edge Function URLs
- Dashboard links
- Configuration files

## Your Project Reference

**Your Project Reference**: `wilshhncdehbnyldsjzs`

## Where It's Used

### 1. Supabase API URL
```
https://wilshhncdehbnyldsjzs.supabase.co
```

### 2. Edge Function URLs
```
https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/hesabe-webhook
https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/process-booking-automation
```

### 3. Dashboard URL
```
https://supabase.com/dashboard/project/wilshhncdehbnyldsjzs
```

## How to Find Your Project Reference

### Method 1: From Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **General**
4. Look for **"Reference ID"** or **"Project Reference"**

### Method 2: From Your Project URL

Your Supabase project URL contains the reference:
```
https://wilshhncdehbnyldsjzs.supabase.co
                    ↑
            This is your project reference
```

### Method 3: From Codebase

Check these files:
- `supabase/.temp/project-ref` - Contains: `wilshhncdehbnyldsjzs`
- `supabase/README.md` - Shows project reference in examples
- Any file with `supabase.co` URLs

## Quick Reference

| Item | Value |
|------|-------|
| **Project Reference** | `wilshhncdehbnyldsjzs` |
| **API URL** | `https://wilshhncdehbnyldsjzs.supabase.co` |
| **Webhook URL** | `https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/hesabe-webhook` |
| **Dashboard** | `https://supabase.com/dashboard/project/wilshhncdehbnyldsjzs` |

## Using in Scripts

When running scripts that need the project reference:

```bash
# Set as environment variable
export SUPABASE_PROJECT_REF="wilshhncdehbnyldsjzs"

# Or use directly in commands
curl https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/hesabe-webhook
```

## Example: Webhook URL

For the Hesabe webhook, your full URL is:

```
https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/hesabe-webhook
```

This is what you would:
- Include in payment requests to Hesabe
- Use for testing webhooks
- Configure in any external services

---

**Last Updated**: Project reference information

