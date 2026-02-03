# Automation Timing Settings Setup

## Overview

The App Settings page now allows admins to configure the timing values for automatic booking status changes. These settings control how long users have to complete various actions before the system automatically changes booking statuses.

## Database Migration

### Step 1: Run the Migration

Run the following SQL in your Supabase SQL Editor:

```sql
-- File: supabase/migrations/20241204000003_add_automation_timing_settings.sql
```

This migration:
- Adds timing configuration columns to the `platform_settings` table
- Sets default values for all timing settings
- Creates a default settings record if none exists

## Settings Available

### 1. **Influencer Approval Deadline** (Hours)
- **Default**: 12 hours
- **Description**: Time for influencer to approve/reject booking after creation
- **When Used**: Booking created → Influencer has X hours to approve

### 2. **Payment Deadline** (Hours)
- **Default**: 12 hours
- **Description**: Time for customer to pay after influencer approval
- **When Used**: Influencer approves → Customer has X hours to pay

### 3. **Script Submission Base Hours**
- **Default**: 8 hours
- **Description**: Base hours for script submission (multiplied by `days_gap - 1`)
- **Formula**: `8 hours × (days_gap - 1)`
- **Example**: If days_gap = 2, deadline = 8 × (2-1) = 8 hours
- **When Used**: Payment confirmed → Influencer has X hours to submit script

### 4. **Influencer Response Time** (Minutes)
- **Default**: 30 minutes
- **Description**: Time for influencer to respond after script rejection (before AI takes over)
- **When Used**: Customer rejects script → Influencer has X minutes to revise

### 5. **Auto-Approval Time** (Hour:Minute)
- **Default**: 22:30 (10:30 PM)
- **Description**: Time of day when latest script is auto-approved if still pending
- **When Used**: On appointment day at this time, if script still pending → Auto-approve

### 6. **Appointment End Time** (Hour:Minute)
- **Default**: 23:59 (11:59 PM)
- **Description**: Time of day when appointment ends and service closes
- **When Used**: On appointment day at this time → Check if published, create black mark if not

## How to Use

1. **Navigate to Settings**:
   - Go to `/settings` in the admin panel
   - Or click "Settings" in the navigation menu

2. **Configure Timing Values**:
   - Adjust any timing value as needed
   - All fields have tooltips explaining their purpose
   - Default values are shown as placeholders

3. **Save Settings**:
   - Click "Save Settings" button
   - Settings are saved to the database
   - Changes take effect for new bookings immediately

## Important Notes

⚠️ **Existing Bookings**: 
- Settings changes only affect **new bookings** created after the update
- Existing bookings keep their original deadlines

⚠️ **Edge Function Update Required**:
- The `process-booking-automation` edge function needs to be updated to read these settings
- Currently, it uses hardcoded values (12 hrs, 8 hrs, etc.)
- Future update: Function will read from `platform_settings` table

## Future Enhancements

1. **Dynamic Settings in Edge Function**:
   - Update `process-booking-automation` to read settings from database
   - Calculate deadlines dynamically based on settings

2. **Settings History**:
   - Track when settings were changed
   - Show who made the changes
   - Allow reverting to previous values

3. **Validation**:
   - Prevent invalid combinations (e.g., auto-approval time after appointment end time)
   - Warn if settings are too restrictive

## API Usage

Settings can also be accessed programmatically:

```typescript
import { settingsService } from '@/services/settingsService';

// Get current settings
const settings = await settingsService.getSettings();

// Update settings
await settingsService.updateSettings({
  influencer_approval_hours: 24,
  payment_deadline_hours: 12,
  // ... other settings
});
```

## Troubleshooting

**Settings not saving?**
- Check browser console for errors
- Verify you have admin permissions
- Check Supabase RLS policies allow updates

**Settings not showing?**
- Run the migration SQL first
- Refresh the page
- Check if `platform_settings` table exists

**Default values not working?**
- Ensure migration created default record
- Check database for existing settings
- Verify form initial values match database defaults


