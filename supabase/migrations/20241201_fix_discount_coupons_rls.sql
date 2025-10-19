-- Fix RLS policies for discount_coupons table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view active public coupons" ON discount_coupons;
DROP POLICY IF EXISTS "Admins can manage all coupons" ON discount_coupons;

-- Create new policies
-- Policy for public read access to active public coupons
CREATE POLICY "Public can view active public coupons" ON discount_coupons
  FOR SELECT USING (is_active = true AND is_public = true);

-- Policy for admin full access
CREATE POLICY "Admins can manage all coupons" ON discount_coupons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin' OR
        auth.users.raw_user_meta_data->>'role' = 'super_admin'
      )
    )
  );

-- Policy for authenticated users to view their own created coupons
CREATE POLICY "Users can view their own coupons" ON discount_coupons
  FOR SELECT USING (created_by = auth.uid());

-- Policy for authenticated users to create coupons
CREATE POLICY "Authenticated users can create coupons" ON discount_coupons
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policy for users to update their own coupons
CREATE POLICY "Users can update their own coupons" ON discount_coupons
  FOR UPDATE USING (created_by = auth.uid());

-- Policy for users to delete their own coupons
CREATE POLICY "Users can delete their own coupons" ON discount_coupons
  FOR DELETE USING (created_by = auth.uid());

-- Enable RLS on coupon_usage_log table
ALTER TABLE coupon_usage_log ENABLE ROW LEVEL SECURITY;

-- Create policies for coupon_usage_log
CREATE POLICY "Users can view their own usage" ON coupon_usage_log
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own usage" ON coupon_usage_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all usage" ON coupon_usage_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin' OR
        auth.users.raw_user_meta_data->>'role' = 'super_admin'
      )
    )
  );
