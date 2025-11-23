# Row Level Security (RLS) Policies Setup

## Overview
This document describes the comprehensive RLS policies implemented for all tables in the Mashaheer platform. These policies ensure that users can only access data they're authorized to see based on their role (admin, influencer, customer) and ownership.

## Migration File
**Location:** `supabase/migrations/20241102000000_enable_rls_all_tables.sql`

## Helper Functions
The migration includes helper functions to check user roles:
- `get_user_role()` - Returns the current user's role
- `is_admin()` - Returns true if user is admin
- `is_influencer()` - Returns true if user is influencer
- `is_customer()` - Returns true if user is customer

## Policy Patterns

### 1. **Admin Access**
- Admins have **full access** (SELECT, INSERT, UPDATE, DELETE) to all tables
- Policy pattern: `"Admins have full access to [table]"`
- Uses `public.is_admin()` helper function

### 2. **Own Data Access**
- Users can view/update/delete their own records
- Examples:
  - Customers see their own bookings, carts, orders
  - Influencers see their own services, bookings, media
  - Users see their own messages, notifications, favorites

### 3. **Public Read Access**
- Some tables allow public read for marketplace/browsing:
  - `services` - Anyone can view (public marketplace)
  - `profiles` - Anyone can view (browsing influencers/customers)
  - `social_links`, `social_stats` - Public profiles
  - `influencer_media` - Public portfolios
  - `ratings`, `reviews` - Public reviews

### 4. **Reference Tables**
- Lookup/reference tables are public read, admin-only write:
  - `booking_statuses`, `service_categories`, `service_types`
  - `social_media_platforms`, `rating_categories`
  - `support_categories`, `coupon_categories`

### 5. **System Operations**
- Some operations allow system/service role to insert:
  - `booking_analytics` - System logs events
  - `notifications` - System creates notifications
  - `profile_views` - System logs views
  - `transactions` - System creates payment records

## Table-by-Table Summary

### User & Profile Tables
- **profiles**: Own profile + public read, admins full access
- **fcm_tokens**: Own tokens only
- **profile_views**: Own stats, system can log

### Booking & Order Tables
- **bookings**: Customers see their bookings, influencers see their bookings
- **cart_items**: Customers manage their cart items
- **carts**: Customers manage their carts
- **transactions**: Users see transactions for their bookings

### Service Tables
- **services**: Public read, influencers manage their own
- **service_categories**: Public read, admin-only write
- **service_types**: Public read, admin-only write
- **service_platforms**: Public read, influencers manage for their services

### Communication Tables
- **chat_rooms**: Users see rooms they're in
- **chat_messages**: Users see messages in their rooms
- **messages**: Users see messages they sent/received
- **group_chats**: Members see their groups
- **group_messages**: Members see messages in their groups

### Review & Rating Tables
- **ratings**: Public read, customers create for their bookings
- **reviews**: Public read, users create their own
- **influencer_ratings**: Public read, system updates

### Payment Tables
- **payments**: Users see payments they're involved in (payer/payee)
- **transactions**: Users see transactions for their bookings

### Support Tables
- **support_tickets**: Users see their tickets, admins see all
- **support_ticket_responses**: Users see responses to their tickets
- **faq_items**: Public read active FAQs, admin-only write
- **help_sections**: Public read active sections, admin-only write

### Coupon & Discount Tables
- **discount_coupons**: Public read active coupons, admin-only write
- **coupon_usage_log**: Users see their usage, system can log

### Contract Tables
- **contract_templates**: Public read active templates, admin-only write
- **contract_instances**: Users see contracts they're part of
- **contract_signatures**: Users see signatures on their contracts

### Social Media Tables
- **social_links**: Public read, users manage their own
- **social_stats**: Public read, users update their own
- **social_media_platforms**: Public read, admin-only write

### Moderation & Admin Tables
- **moderation_queue**: Users see their reports, admins review
- **admin_actions**: Admin-only access

## Applying the Migration

### Option 1: Using Supabase CLI
```bash
cd /path/to/your/project
supabase db push
```

### Option 2: Manual Application
1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase/migrations/20241102000000_enable_rls_all_tables.sql`
3. Paste and run in SQL Editor

### Option 3: Using Migration Tool
```bash
supabase migration up
```

## Testing RLS Policies

### Test as Customer
```sql
-- Set role context (in Supabase SQL Editor, you'll be authenticated as a user)
SELECT * FROM bookings WHERE customer_id = auth.uid();
SELECT * FROM services; -- Should work (public read)
```

### Test as Influencer
```sql
SELECT * FROM services WHERE primary_influencer_id = auth.uid();
SELECT * FROM bookings WHERE influencer_id = auth.uid();
```

### Test as Admin
```sql
SELECT * FROM profiles; -- Should see all
SELECT * FROM admin_actions; -- Should work
```

## Important Notes

1. **Service Role Bypass**: The service role key bypasses RLS. Use it carefully in edge functions and server-side code.

2. **Auth Context**: RLS policies rely on `auth.uid()` which requires an authenticated session. Unauthenticated requests will be blocked.

3. **Public Access**: Some tables allow public read (services, profiles) for marketplace functionality. This is intentional.

4. **System Operations**: Some policies allow `WITH CHECK (true)` for system operations (notifications, analytics). These should be called via service role.

5. **Performance**: RLS policies add overhead. Monitor query performance and add indexes as needed.

## Troubleshooting

### Issue: "Permission denied for table"
- **Cause**: RLS is enabled but no policy matches
- **Solution**: Check if user role matches policy conditions, verify `auth.uid()` is set

### Issue: "Cannot insert - policy violation"
- **Cause**: INSERT policy doesn't match
- **Solution**: Verify `WITH CHECK` clause allows the data being inserted

### Issue: "Admin can't access table"
- **Cause**: Admin policy might not be created or role check failing
- **Solution**: Verify `is_admin()` function works: `SELECT public.is_admin();`

## Next Steps

1. **Apply the migration** to your database
2. **Test each role** (customer, influencer, admin) to ensure policies work
3. **Monitor logs** for any policy violations
4. **Adjust policies** as needed based on your specific requirements
5. **Add indexes** on foreign key columns used in policies for better performance

## Security Best Practices

1. ✅ Always test policies with different user roles
2. ✅ Use service role only in server-side code/edge functions
3. ✅ Regularly audit who can access what data
4. ✅ Keep policies simple and maintainable
5. ✅ Document any custom policies you add

