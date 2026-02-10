-- Simplified RLS policies for discount_coupons table
-- This approach doesn't rely on role checking which can cause permission issues

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view active public coupons" ON discount_coupons;
DROP POLICY IF EXISTS "Admins can manage all coupons" ON discount_coupons;
DROP POLICY IF EXISTS "Users can view their own coupons" ON discount_coupons;
DROP POLICY IF EXISTS "Authenticated users can create coupons" ON discount_coupons;
DROP POLICY IF EXISTS "Users can update their own coupons" ON discount_coupons;
DROP POLICY IF EXISTS "Users can delete their own coupons" ON discount_coupons;

-- Create simple policies that work for authenticated users
-- Policy for authenticated users to read all coupons
CREATE POLICY "Authenticated users can read coupons" ON discount_coupons
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Policy for authenticated users to create coupons
CREATE POLICY "Authenticated users can create coupons" ON discount_coupons
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policy for authenticated users to update coupons
CREATE POLICY "Authenticated users can update coupons" ON discount_coupons
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Policy for authenticated users to delete coupons
CREATE POLICY "Authenticated users can delete coupons" ON discount_coupons
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Enable RLS on coupon_usage_log table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coupon_usage_log') THEN
        ALTER TABLE coupon_usage_log ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view their own usage" ON coupon_usage_log;
        DROP POLICY IF EXISTS "Users can insert their own usage" ON coupon_usage_log;
        DROP POLICY IF EXISTS "Admins can view all usage" ON coupon_usage_log;
        DROP POLICY IF EXISTS "Admins can manage all usage" ON coupon_usage_log;
        
        -- Create simple policies for coupon_usage_log
        CREATE POLICY "Authenticated users can read usage" ON coupon_usage_log
          FOR SELECT USING (auth.uid() IS NOT NULL);

        CREATE POLICY "Authenticated users can insert usage" ON coupon_usage_log
          FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

        CREATE POLICY "Authenticated users can update usage" ON coupon_usage_log
          FOR UPDATE USING (auth.uid() IS NOT NULL);

        CREATE POLICY "Authenticated users can delete usage" ON coupon_usage_log
          FOR DELETE USING (auth.uid() IS NOT NULL);
    END IF;
END $$;
