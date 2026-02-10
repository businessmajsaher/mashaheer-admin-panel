# Supabase Edge Functions

This directory contains Edge Functions for the Mashaheer Admin Panel.

## Functions

### create-influencer

Creates a new influencer account with the following steps:
1. Creates a new user in Supabase Auth
2. Creates a profile record in the profiles table
3. Creates social media links and stats
4. Creates a default wallet

## Deployment

To deploy these Edge Functions, you need to:

1. **Install Supabase CLI** (if not already installed):
   ```bash
   # Using Homebrew (macOS)
   brew install supabase/tap/supabase
   
   # Or download from: https://supabase.com/docs/guides/cli
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project** (from the project root):
   ```bash
   supabase link --project-ref wilshhncdehbnyldsjzs
   ```

4. **Deploy the functions**:
   ```bash
   supabase functions deploy create-influencer
   ```

5. **Set environment variables** in your Supabase dashboard:
   - Go to Settings > Edge Functions
   - Set the following secrets:
     - `SUPABASE_URL`: Your Supabase project URL
     - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (found in Settings > API)

## Testing

You can test the function locally using:

```bash
supabase functions serve create-influencer --env-file .env.local
```

## Environment Variables

Create a `.env.local` file in the project root with:

```env
SUPABASE_URL=https://wilshhncdehbnyldsjzs.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## Function Endpoint

After deployment, the function will be available at:
`https://wilshhncdehbnyldsjzs.supabase.co/functions/v1/create-influencer`

## Usage

The function expects a POST request with:

```json
{
  "email": "influencer@example.com",
  "password": "securepassword",
  "name": "Influencer Name",
  "bio": "Optional bio",
  "is_verified": false,
  "profile_image_url": "https://example.com/image.jpg",
  "social_links": [
    {
      "platform_id": "uuid",
      "handle": "@username",
      "profile_url": "https://platform.com/username",
      "followers_count": 1000,
      "engagement_rate": 2.5
    }
  ]
}
``` 