-- Create function to increment coupon usage count
CREATE OR REPLACE FUNCTION increment_coupon_usage(coupon_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE discount_coupons 
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = coupon_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get coupon statistics
CREATE OR REPLACE FUNCTION get_coupon_stats(coupon_id UUID)
RETURNS TABLE (
  total_usage INTEGER,
  total_savings DECIMAL,
  average_savings DECIMAL,
  last_used TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_usage,
    COALESCE(SUM(discount_amount), 0) as total_savings,
    COALESCE(AVG(discount_amount), 0) as average_savings,
    MAX(used_at) as last_used
  FROM coupon_usage_log
  WHERE coupon_id = $1;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate coupon
CREATE OR REPLACE FUNCTION validate_coupon_code(
  coupon_code TEXT,
  user_id UUID DEFAULT NULL,
  order_total DECIMAL DEFAULT 0
)
RETURNS TABLE (
  is_valid BOOLEAN,
  discount_amount DECIMAL,
  error_message TEXT,
  coupon_data JSONB
) AS $$
DECLARE
  coupon_record RECORD;
  calculated_discount DECIMAL;
  user_usage_count INTEGER;
  is_expired BOOLEAN;
  is_not_started BOOLEAN;
  meets_minimum BOOLEAN;
BEGIN
  -- Get coupon details
  SELECT * INTO coupon_record
  FROM discount_coupons
  WHERE code = UPPER(coupon_code)
    AND is_active = true;
  
  -- Check if coupon exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::DECIMAL, 'Invalid coupon code'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check if coupon is expired
  is_expired := coupon_record.valid_until IS NOT NULL AND coupon_record.valid_until <= NOW();
  IF is_expired THEN
    RETURN QUERY SELECT false, 0::DECIMAL, 'Coupon has expired'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check if coupon is not yet active
  is_not_started := coupon_record.valid_from > NOW();
  IF is_not_started THEN
    RETURN QUERY SELECT false, 0::DECIMAL, 'Coupon is not yet active'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check usage limits
  IF coupon_record.usage_limit IS NOT NULL AND coupon_record.usage_count >= coupon_record.usage_limit THEN
    RETURN QUERY SELECT false, 0::DECIMAL, 'Coupon usage limit reached'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check minimum order amount
  meets_minimum := order_total >= coupon_record.minimum_order_amount;
  IF NOT meets_minimum THEN
    RETURN QUERY SELECT false, 0::DECIMAL, 'Minimum order amount not met'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check per-user usage limit if user_id is provided
  IF user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO user_usage_count
    FROM coupon_usage_log
    WHERE coupon_id = coupon_record.id AND user_id = user_id;
    
    IF user_usage_count >= coupon_record.usage_limit_per_user THEN
      RETURN QUERY SELECT false, 0::DECIMAL, 'You have already used this coupon'::TEXT, NULL::JSONB;
      RETURN;
    END IF;
  END IF;
  
  -- Calculate discount amount
  IF coupon_record.discount_type = 'percentage' THEN
    calculated_discount := (order_total * coupon_record.discount_value) / 100;
    
    -- Apply maximum discount limit if set
    IF coupon_record.maximum_discount_amount IS NOT NULL AND calculated_discount > coupon_record.maximum_discount_amount THEN
      calculated_discount := coupon_record.maximum_discount_amount;
    END IF;
  ELSE
    calculated_discount := coupon_record.discount_value;
  END IF;
  
  -- Ensure discount doesn't exceed order total
  calculated_discount := LEAST(calculated_discount, order_total);
  
  -- Return success with coupon data
  RETURN QUERY SELECT 
    true,
    calculated_discount,
    NULL::TEXT,
    jsonb_build_object(
      'id', coupon_record.id,
      'code', coupon_record.code,
      'name', coupon_record.name,
      'discount_type', coupon_record.discount_type,
      'discount_value', coupon_record.discount_value,
      'minimum_order_amount', coupon_record.minimum_order_amount,
      'maximum_discount_amount', coupon_record.maximum_discount_amount
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to get coupon analytics
CREATE OR REPLACE FUNCTION get_coupon_analytics(
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  total_coupons INTEGER,
  active_coupons INTEGER,
  expired_coupons INTEGER,
  total_usage INTEGER,
  total_savings DECIMAL,
  average_savings DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH coupon_stats AS (
    SELECT 
      COUNT(*) as total_coupons,
      COUNT(*) FILTER (WHERE is_active = true AND (valid_until IS NULL OR valid_until > NOW())) as active_coupons,
      COUNT(*) FILTER (WHERE valid_until IS NOT NULL AND valid_until <= NOW()) as expired_coupons
    FROM discount_coupons
  ),
  usage_stats AS (
    SELECT 
      COUNT(*) as total_usage,
      COALESCE(SUM(discount_amount), 0) as total_savings,
      COALESCE(AVG(discount_amount), 0) as average_savings
    FROM coupon_usage_log cul
    WHERE (start_date IS NULL OR cul.used_at >= start_date)
      AND (end_date IS NULL OR cul.used_at <= end_date)
  )
  SELECT 
    cs.total_coupons::INTEGER,
    cs.active_coupons::INTEGER,
    cs.expired_coupons::INTEGER,
    us.total_usage::INTEGER,
    us.total_savings,
    us.average_savings
  FROM coupon_stats cs, usage_stats us;
END;
$$ LANGUAGE plpgsql;
