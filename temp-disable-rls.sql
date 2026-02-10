-- Temporary solution: Disable RLS on discount_coupons table for testing
-- WARNING: This removes security, use only for development/testing

-- Disable RLS on discount_coupons table
ALTER TABLE discount_coupons DISABLE ROW LEVEL SECURITY;

-- Disable RLS on coupon_usage_log table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coupon_usage_log') THEN
        ALTER TABLE coupon_usage_log DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;
