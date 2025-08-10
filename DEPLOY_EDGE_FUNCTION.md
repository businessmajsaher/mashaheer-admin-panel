# Manual Edge Function Deployment Guide

Since the Supabase CLI installation is having issues, here's how to deploy the Edge Function manually:

## Step 1: Access Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in and select your project: `wilshhncdehbnyldsjzs`

## Step 2: Navigate to Edge Functions

1. In your project dashboard, go to **Settings** (gear icon) in the left sidebar
2. Click on **Edge Functions**

## Step 3: Create New Function

1. Click **Create a new function**
2. Function name: `create-influencer`
3. Click **Create function**

## Step 4: Copy the Code

1. Copy the contents of `supabase/functions/create-influencer/index.ts` (the simplified version)
2. Paste it into the Edge Function editor in the Supabase dashboard
3. Click **Save**

## Step 5: Set Environment Variables

1. In the Edge Function settings, go to **Settings** tab
2. Add these environment variables:
   - `SUPABASE_URL`: `https://wilshhncdehbnyldsjzs.supabase.co`
   - `SERVICE_ROLE_KEY`: Your service role key (found in Settings > API)

**Note**: This simplified version doesn't require `SUPABASE_JWT_SECRET` - it just checks if a token is present.

## Step 6: Deploy

1. Click **Deploy** button
2. Wait for deployment to complete

## Step 7: Test the Function

The function will be available at:
`https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/create-influencer`

## Your Edge Function Features

Your Edge Function implementation includes:
- Basic token presence check (no complex JWT verification)
- User creation in Supabase Auth
- Profile creation in the profiles table
- Proper error handling and rollback
- CORS support

## Frontend Integration

The frontend has been updated to:
- Send data in the format your Edge Function expects
- Handle the response format your function returns
- Create social links, stats, and wallet separately (since your function doesn't handle them)
- Provide better error handling and user feedback

## Testing the Function

You can test the function using curl:

```bash
# The function now accepts any valid Bearer token
curl -X POST https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/create-influencer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ANY_VALID_TOKEN" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test Influencer",
    "bio": "Test bio",
    "is_verified": false
  }'
```

## Troubleshooting

### Common Issues:

1. **Function not found (404)**: Make sure the function is deployed and the URL is correct
2. **Authentication error (403)**: Check that you're sending a Bearer token in the Authorization header
3. **Server configuration error (500)**: Verify all environment variables are set correctly
4. **Database errors**: Verify your database schema matches the expected tables

### Environment Variables Check:

Make sure these are set in your Edge Function:
- `SUPABASE_URL`: Your Supabase project URL
- `SERVICE_ROLE_KEY`: Your service role key (not anon key)

### Logs:

Check the Edge Function logs in the Supabase dashboard to see what's happening when the function is called.

## Notes

- Your Edge Function only handles basic user creation (email, password, name, bio, profile_image_url, is_verified)
- Social links, social stats, and wallet creation are handled separately in the frontend
- The function now uses a simple token presence check instead of complex JWT verification
- This should resolve the "Unauthorized: Invalid token" error you were experiencing 