# Deploy Refund Function - Step by Step Guide

## Step 1: Set Hesabe Environment Variables in Supabase

1. Go to your **Supabase Dashboard**
2. Navigate to: **Project Settings** → **Edge Functions** → **Secrets**
3. Click **"Add a new secret"** and add each of these:

```
Name: HESABE_MERCHANT_CODE
Value: 842217
```

```
Name: HESABE_MERCHANT_SECRET_KEY
Value: PkW64zMe5NVdrlPVNnjo2Jy9nOb7v1Xg
```

```
Name: HESABE_API_KEY
Value: c333729b-d060-4b74-a49d-7686a8353481
```

```
Name: HESABE_IV_KEY
Value: 5NVdrlPVNnjo2Jy9
```

## Step 2: Deploy the Edge Function

### Option A: Using Supabase CLI (Recommended)

```bash
# Make sure you're in the project root directory
cd /Users/akshaykc/Documents/development/mashaheer-admin-panel

# Deploy the function
supabase functions deploy initiate-refund
```

### Option B: Using Supabase Dashboard

1. Go to **Edge Functions** in your Supabase dashboard
2. Click **"Create a new function"**
3. Name it: `initiate-refund`
4. Copy the contents from `supabase/functions/initiate-refund/index.ts`
5. Paste into the function editor
6. Click **"Deploy"**

## Step 3: Verify Deployment

After deployment, you should see:
- ✅ Function listed in Edge Functions
- ✅ Status shows "Active"
- ✅ No errors in the function logs

## Step 4: Test the Refund Functionality

1. **Start your admin panel** (if not already running):
   ```bash
   cd react-admin-panel
   npm run dev
   ```

2. **Navigate to Bookings page** in the admin panel

3. **Find a booking with a completed payment**:
   - Look for bookings that have payments with status "completed"
   - You should see a **"Refund"** button in the Actions column

4. **Test the refund flow**:
   - Click the **"Refund"** button
   - Review the booking and payment details
   - Enter a refund amount (defaults to full payment amount)
   - Enter a refund reason
   - Click **"Initiate Refund"**

## Troubleshooting

### If the Refund button doesn't appear:
- Check that the booking has a payment with status "completed"
- Check browser console for errors
- Verify the booking query includes payment information

### If you get authentication errors:
- Make sure you're logged in as an admin user
- Check that your user profile has `role = 'admin'`

### If the edge function fails:
- Check the function logs in Supabase Dashboard
- Verify all environment variables are set correctly
- Check that the Hesabe API credentials are valid

## Next Steps After Testing

1. **Update Hesabe encryption** (if needed):
   - Review Hesabe API documentation
   - Update the encryption method in `supabase/functions/initiate-refund/index.ts` if their API requires a specific format

2. **Test with real payments**:
   - Use Hesabe sandbox/test environment first
   - Verify refunds are processed correctly
   - Check refund status updates in the database

3. **Monitor refunds**:
   - Check the `refunds` table regularly
   - Review failed refunds and handle manually if needed

