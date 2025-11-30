# Refund Functionality Setup Guide

This guide explains how to set up and use the refund functionality integrated with Hesabe payment gateway.

## Overview

The refund system allows admins to initiate refunds for bookings directly from the admin panel. It integrates with Hesabe payment gateway to process refunds automatically.

## Database Setup

### 1. Run the Migration

Apply the refunds table migration:

```bash
# In Supabase SQL Editor, run:
supabase/migrations/20241204000001_create_refunds_table.sql
```

This creates the `refunds` table with the following structure:
- Tracks refund requests and status
- Links to bookings and payments
- Stores Hesabe API responses
- Includes RLS policies for admin access

## Hesabe API Configuration

### 2. Set Environment Variables

Add the following environment variables to your Supabase project:

1. Go to **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**
2. Add the following secrets:

```
HESABE_MERCHANT_CODE=842217
HESABE_MERCHANT_SECRET_KEY=PkW64zMe5NVdrlPVNnjo2Jy9nOb7v1Xg
HESABE_API_KEY=c333729b-d060-4b74-a49d-7686a8353481
HESABE_IV_KEY=5NVdrlPVNnjo2Jy9
```

### 3. Deploy the Edge Function

Deploy the refund edge function:

```bash
# From the project root
supabase functions deploy initiate-refund
```

Or use the Supabase CLI:

```bash
supabase functions deploy initiate-refund --project-ref your-project-ref
```

## Features

### Admin Panel Features

1. **Refund Button**: Appears in the Bookings table for bookings with completed payments
2. **Refund Modal**: Allows admins to:
   - View booking and payment details
   - Enter refund amount (validated against payment amount)
   - Enter refund reason
   - Initiate refund via Hesabe API

3. **Payment Information Display**: 
   - Shows payment details in booking details modal
   - Displays payment method, amount, transaction reference
   - Shows payment status

4. **Refund History**:
   - Displays all refunds for a booking
   - Shows refund status (pending, processing, completed, failed)
   - Displays Hesabe refund ID when available

## Usage

### Initiating a Refund

1. Navigate to **Bookings** page in admin panel
2. Find a booking with a completed payment
3. Click the **Refund** button in the Actions column
4. In the refund modal:
   - Review booking and payment information
   - Enter refund amount (defaults to full payment amount)
   - Enter refund reason (required)
   - Click **Initiate Refund**

### Refund Status

Refunds can have the following statuses:
- **pending**: Refund request created but not yet processed
- **processing**: Refund is being processed by Hesabe
- **completed**: Refund successfully processed
- **failed**: Refund processing failed
- **cancelled**: Refund was cancelled

## API Integration

### Hesabe Refund API

The edge function handles:
- Authentication and authorization (admin only)
- Payment verification
- Hesabe API encryption and signature generation
- Refund request to Hesabe
- Response handling and database updates

### Request Flow

1. Admin initiates refund from UI
2. Frontend calls `refundService.initiateRefund()`
3. Service calls Supabase Edge Function `/functions/v1/initiate-refund`
4. Edge function:
   - Verifies admin access
   - Gets booking and payment details
   - Creates refund record in database
   - Calls Hesabe refund API
   - Updates refund status based on response

## Security

- **RLS Policies**: Only admins can view and create refunds
- **Authentication**: Edge function verifies admin role
- **Validation**: Refund amount cannot exceed payment amount
- **Audit Trail**: All refunds are logged with initiator and timestamps

## Troubleshooting

### Refund Not Appearing

- Check if payment status is "completed"
- Verify booking has a transaction reference
- Check browser console for errors

### Hesabe API Errors

- Verify environment variables are set correctly
- Check Hesabe API documentation for encryption requirements
- Review edge function logs in Supabase dashboard

### Edge Function Deployment Issues

- Ensure Supabase CLI is installed and configured
- Verify project reference is correct
- Check function logs: `supabase functions logs initiate-refund`

## Notes

- The Hesabe encryption implementation may need adjustment based on their specific API requirements
- Test refunds in Hesabe sandbox environment first
- Monitor refund status and handle edge cases (partial refunds, multiple refunds, etc.)

