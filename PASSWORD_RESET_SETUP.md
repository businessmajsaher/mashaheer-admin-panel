# Password Reset Setup Guide

This guide explains how to set up password reset functionality for your Flutter client apps using the Mashaheer admin panel.

## Overview

The password reset system consists of:
1. **Supabase Edge Function** - Handles password reset requests
2. **HTML Callback Page** - Redirects users to the Flutter app
3. **Admin Panel Integration** - Allows admins to send password reset emails

## Setup Instructions

### 1. Deploy the Edge Function

Deploy the password reset edge function to your Supabase project:

```bash
# Navigate to your project directory
cd /path/to/your/project

# Deploy the edge function
supabase functions deploy password-reset
```

### 2. Configure Environment Variables

Make sure your Supabase project has the following environment variables set:
- `SUPABASE_URL` - Your Supabase project URL
- `SERVICE_ROLE_KEY` - Your Supabase service role key

### 3. Host the HTML Callback Page

Upload the `password-reset-callback.html` file to your web server or hosting service. This page will handle the redirect to your Flutter app.

**Important**: Update the following in the HTML file:
- `APP_SCHEME` - Your Flutter app's deep link scheme (currently set to `com.alfaresi.mahasheer`)
- `APP_STORE_URL` - Your iOS App Store URL
- `PLAY_STORE_URL` - Your Google Play Store URL

### 4. Configure Supabase Auth Settings

In your Supabase dashboard:

1. Go to **Authentication** > **URL Configuration**
2. Add your callback page URL to the **Redirect URLs**:
   ```
   https://your-domain.com/password-reset-callback.html
   ```
3. Set the **Site URL** to your main domain

### 5. Update Flutter App Deep Links

In your Flutter app, configure deep link handling for password reset:

```dart
// Example deep link handler
void handleDeepLink(String link) {
  final uri = Uri.parse(link);
  
  if (uri.scheme == 'com.alfaresi.mahasheer' && 
      uri.host == 'reset-callback') {
    final code = uri.queryParameters['code'];
    final type = uri.queryParameters['type'];
    
    if (code != null && type == 'recovery') {
      // Handle password reset in your app
      handlePasswordReset(code);
    }
  }
}
```

## Usage

### For Admins

1. **In the Admin Panel**:
   - Go to **Users** or **Influencers** page
   - Click the **Reset Password** button for any user
   - Enter the user's email address
   - Click **Send Reset Email**

2. **The Process**:
   - Admin clicks "Reset Password"
   - System generates a password reset link
   - User receives an email with the link
   - User clicks the link
   - Browser opens the callback page
   - Callback page redirects to Flutter app
   - Flutter app handles the password reset

### For Users

1. **Receive Email**: User gets a password reset email
2. **Click Link**: User clicks the reset link in the email
3. **Redirect**: Browser opens and redirects to Flutter app
4. **Reset Password**: User can reset their password in the app

## Customization

### Custom App Scheme

Update the `APP_SCHEME` in `password-reset-callback.html`:

```javascript
const APP_SCHEME = 'your.app.scheme';
```

### Custom Styling

The callback page uses a modern, responsive design. You can customize:
- Colors and gradients
- Logo and branding
- Loading animations
- Error messages

### Custom Redirect Logic

Modify the redirect logic in the HTML file to match your app's deep link structure:

```javascript
const appUrl = `${APP_SCHEME}://reset-callback?code=${encodeURIComponent(code)}&type=${type || 'recovery'}`;
```

## Security Considerations

1. **HTTPS Required**: Always use HTTPS for the callback page
2. **Token Expiration**: Password reset tokens expire after 1 hour by default
3. **Rate Limiting**: Consider implementing rate limiting for password reset requests
4. **Admin Authorization**: Only authenticated admins can send password reset emails

## Troubleshooting

### Common Issues

1. **App Not Opening**:
   - Check if the app scheme is correct
   - Verify the app is installed on the device
   - Test deep links manually

2. **Invalid Link**:
   - Check if the token has expired
   - Verify the redirect URL is configured correctly
   - Ensure the edge function is deployed

3. **Email Not Sent**:
   - Check Supabase auth settings
   - Verify the edge function logs
   - Ensure the user exists in the system

### Debug Mode

Enable debug logging in the callback page by opening browser developer tools. The page logs all URL parameters and redirect attempts.

## API Reference

### Edge Function Endpoint

```
POST /functions/v1/password-reset
```

**Headers**:
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Body**:
```json
{
  "email": "user@example.com",
  "redirect_url": "https://your-domain.com/password-reset-callback.html"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password reset link generated successfully",
  "reset_link": "https://...",
  "user": {
    "id": "user-id",
    "email": "user@example.com"
  }
}
```

## Support

For issues or questions:
1. Check the Supabase function logs
2. Verify your configuration
3. Test with a simple deep link first
4. Check browser console for errors

