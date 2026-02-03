# Influencer App: Self-Signup & Onboarding Guide

This guide details how to implement the missing "Sign Up" feature for the Mashaheer Influencer App to comply with App Store guidelines. Since you already have an onboarding flow in the Admin Panel (`create-influencer-complete` Edge Function), we will replicate this logic for the mobile app using a **Public Sign-Up Flow**.

## 1. Architecture Overview

Unlike the Admin context where a super-admin creates users, the Public App requires:
1.  **Supabase Auth**: Users sign up themselves (creating an `auth.users` record).
2.  **Database Trigger**: Automatically creates the corresponding `public.profiles` and `public.wallets` records.
3.  **Client-Side Logic**: The app handles profile completion (media, socials) using RLS policies.

---

## 2. Database Setup (Crucial First Step)

You need to add a database trigger to handle new user sign-ups automatically. Run the following SQL in the Supabase SQL Editor:

### A. Create the Trigger Function
This function runs automatically whenever a new user signs up via the app.

```sql
-- 1. Create the function to handle new user insertion
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create the public profile
  INSERT INTO public.profiles (
    id,
    email,
    name,
    role,
    country,
    is_verified,
    is_approved,
    is_suspended,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name', -- Extract name from metadata
    COALESCE(new.raw_user_meta_data->>'role', 'influencer'), -- Default to influencer
    COALESCE(new.raw_user_meta_data->>'country', 'OTHER'),
    FALSE, -- Not verified by default
    FALSE, -- Not approved by default
    FALSE, 
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent errors if admin created it first

  -- Create the default wallet
  INSERT INTO public.wallets (
    user_id,
    balance,
    currency,
    created_at
  )
  VALUES (
    new.id,
    0,
    'USD',
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### B. Attach the Trigger
```sql
-- 2. Attach the trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### C. Verify RLS Policies
Ensure newly signed-up influencers can edit their own profiles.

```sql
-- Allow users to update their own profile (Bio, Image, Country)
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own social links
CREATE POLICY "Users can manage own social links" ON public.social_links
  FOR ALL USING (auth.uid() = user_id);

-- Allow users to insert their own media
CREATE POLICY "Users can manage own media" ON public.influencer_media
  FOR ALL USING (auth.uid() = influencer_id);
```

---

## 3. Flutter App Implementation

Implementation Logic for your Flutter App.

### Step 1: Sign Up Screen
Create a screen with fields: **Name**, **Email**, **Password**, **Country**.

```dart
// Example Flutter Sign-Up Logic
Future<void> signUpInfluencer() async {
  try {
    final response = await Supabase.instance.client.auth.signUp(
      email: emailController.text,
      password: passwordController.text,
      data: {
        'name': nameController.text, // Passed to trigger
        'country': selectedCountryCode, // Passed to trigger
        'role': 'influencer', // Passed to trigger
      },
    );

    if (response.user != null) {
      // Success! Navigate to Onboarding/Profile Completion
      Navigator.pushReplacementNamed(context, '/complete_profile');
    }
  } catch (e) {
    print('Sign Up Error: $e');
    // Show error dialog
  }
}
```

### Step 2: Profile Completion (Wizard)
Upon login, if `user.profile.is_verified` is `false`, show a "Complete Your Profile" wizard matching the Admin Panel fields.

**Wizard Steps:**
1.  **Bio & Profile Image**:
    *   Upload image to `avatars` bucket.
    *   Update `profiles` table: `await supabase.from('profiles').update({'bio': '...', 'profile_image_url': '...'}).eq('id', userId);`
2.  **Social Media Links**:
    *   Loop through user inputs.
    *   Insert into `social_links` table.
3.  **Portfolio (Media Files)**:
    *   Allow selecting Images/Videos.
    *   Upload to `influencer-media` bucket.
    *   Insert into `influencer_media` table (file_url, file_type, mime_type).

### Step 3: "Under Review" State
After the user completes the wizard, show a blocked screen:

> **"Account Under Review"**
> "Thank you for signing up! Our team is verifying your influencer profile. You will be notified once approved."

This satisfies Apple's requirement related to "Account Creation" while maintaining your vetting process.

---

> "We have added a public Sign-Up flow as requested. Influencers can now create an account directly in the app. Note that new accounts enter a 'Pending Verification' state until our admin team manually verifies their influencer status to maintain platform quality."

---

## 5. Verification Notification

The backend has been configured to send automated notifications when an admin verifies a profile.

### Notifications Sent:
1.  **Email**: Sent via Resend using the `send-account-notification` Edge Function.
2.  **Push Notification**: Sent via FCM (Firebase Cloud Messaging) to the user's registered device.

### Handling the Notification in Flutter:
Ensure your app listens for the FCM message to refresh the user state (moving them from "Under Review" to "Dashboard").

**FCM Payload Data:**
```json
{
  "type": "verification_approved",
  "click_action": "FLUTTER_NOTIFICATION_CLICK"
}
```

When this notification is received, your app should:
1.  Reload the user profile from Supabase: `await supabase.from('profiles').select('*').eq('id', uid).single();`
2.  Check if `is_verified` is now `true`.
3.  Navigate the user to the Home/Dashboard screen.

