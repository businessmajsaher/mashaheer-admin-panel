import { supabase } from './supabaseClient';

export interface CouponValidationResult {
  isValid: boolean;
  discountAmount: number;
  coupon?: {
    id: string;
    code: string;
    name: string;
    discount_type: 'percentage' | 'fixed_amount';
    discount_value: number;
    minimum_order_amount: number;
    maximum_discount_amount?: number;
  };
  error?: string;
}

export interface OrderItem {
  id: string;
  price: number;
  quantity: number;
  product_id?: string;
  category_id?: string;
}

export interface CouponUsageData {
  coupon_id: string;
  user_id: string;
  order_id?: string;
  discount_amount: number;
}

/**
 * Validate a coupon code and calculate discount
 */
export const validateCoupon = async (
  couponCode: string,
  orderItems: OrderItem[],
  userId?: string,
  orderTotal: number = 0
): Promise<CouponValidationResult> => {
  try {
    // Calculate order total if not provided
    if (orderTotal === 0) {
      orderTotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    // Fetch coupon details
    const { data: coupon, error } = await supabase
      .from('discount_coupons')
      .select('*')
      .eq('code', couponCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !coupon) {
      return {
        isValid: false,
        discountAmount: 0,
        error: 'Invalid coupon code'
      };
    }

    // Check if coupon is expired
    const now = new Date();
    if (coupon.valid_until && new Date(coupon.valid_until) <= now) {
      return {
        isValid: false,
        discountAmount: 0,
        error: 'Coupon has expired'
      };
    }

    // Check if coupon is not yet active
    if (new Date(coupon.valid_from) > now) {
      return {
        isValid: false,
        discountAmount: 0,
        error: 'Coupon is not yet active'
      };
    }

    // Check usage limits
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return {
        isValid: false,
        discountAmount: 0,
        error: 'Coupon usage limit reached'
      };
    }

    // Check minimum order amount
    if (coupon.minimum_order_amount > orderTotal) {
      return {
        isValid: false,
        discountAmount: 0,
        error: `Minimum order amount of $${coupon.minimum_order_amount} required`
      };
    }

    // Check user restrictions
    if (userId) {
      const userRestrictionValid = await validateUserRestrictions(coupon, userId);
      if (!userRestrictionValid) {
        return {
          isValid: false,
          discountAmount: 0,
          error: 'Coupon not available for your account type'
        };
      }

      // Check per-user usage limit
      const userUsageCount = await getUserCouponUsage(coupon.id, userId);
      if (userUsageCount >= coupon.usage_limit_per_user) {
        return {
          isValid: false,
          discountAmount: 0,
          error: 'You have already used this coupon'
        };
      }
    }

    // Check product/category restrictions
    const productRestrictionValid = validateProductRestrictions(coupon, orderItems);
    if (!productRestrictionValid) {
      return {
        isValid: false,
        discountAmount: 0,
        error: 'Coupon not applicable to items in your cart'
      };
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
      discountAmount = (orderTotal * coupon.discount_value) / 100;
      
      // Apply maximum discount limit if set
      if (coupon.maximum_discount_amount && discountAmount > coupon.maximum_discount_amount) {
        discountAmount = coupon.maximum_discount_amount;
      }
    } else {
      discountAmount = coupon.discount_value;
    }

    // Ensure discount doesn't exceed order total
    discountAmount = Math.min(discountAmount, orderTotal);

    return {
      isValid: true,
      discountAmount,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        minimum_order_amount: coupon.minimum_order_amount,
        maximum_discount_amount: coupon.maximum_discount_amount
      }
    };

  } catch (error: any) {
    console.error('Coupon validation error:', error);
    return {
      isValid: false,
      discountAmount: 0,
      error: 'Failed to validate coupon'
    };
  }
};

/**
 * Validate user restrictions for a coupon
 */
const validateUserRestrictions = async (coupon: any, userId: string): Promise<boolean> => {
  if (coupon.user_restrictions === 'all') {
    return true;
  }

  if (coupon.user_restrictions === 'specific_users') {
    return coupon.restricted_user_ids?.includes(userId) || false;
  }

  if (coupon.user_restrictions === 'new_users' || coupon.user_restrictions === 'existing_users') {
    // Get user creation date
    const { data: user, error } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('id', userId)
      .single();

    if (error || !user) return false;

    const userCreatedAt = new Date(user.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (coupon.user_restrictions === 'new_users') {
      return userCreatedAt > thirtyDaysAgo;
    } else {
      return userCreatedAt <= thirtyDaysAgo;
    }
  }

  return true;
};

/**
 * Get user's usage count for a specific coupon
 */
const getUserCouponUsage = async (couponId: string, userId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('coupon_usage_log')
    .select('id')
    .eq('coupon_id', couponId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user coupon usage:', error);
    return 0;
  }

  return data?.length || 0;
};

/**
 * Validate product restrictions for a coupon
 */
const validateProductRestrictions = (coupon: any, orderItems: OrderItem[]): boolean => {
  if (coupon.applicable_to === 'all') {
    return true;
  }

  if (coupon.applicable_to === 'specific_products') {
    const allowedProductIds = coupon.product_ids || [];
    return orderItems.some(item => allowedProductIds.includes(item.product_id));
  }

  if (coupon.applicable_to === 'categories') {
    const allowedCategoryIds = coupon.category_ids || [];
    return orderItems.some(item => allowedCategoryIds.includes(item.category_id));
  }

  return true;
};

/**
 * Record coupon usage
 */
export const recordCouponUsage = async (usageData: CouponUsageData): Promise<boolean> => {
  try {
    // Record usage in log
    const { error: logError } = await supabase
      .from('coupon_usage_log')
      .insert([{
        coupon_id: usageData.coupon_id,
        user_id: usageData.user_id,
        order_id: usageData.order_id,
        discount_amount: usageData.discount_amount
      }]);

    if (logError) throw logError;

    // Update usage count in coupon
    const { error: updateError } = await supabase.rpc('increment_coupon_usage', {
      coupon_id: usageData.coupon_id
    });

    if (updateError) throw updateError;

    return true;
  } catch (error: any) {
    console.error('Error recording coupon usage:', error);
    return false;
  }
};

/**
 * Get available coupons for a user
 */
export const getAvailableCoupons = async (userId?: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('discount_coupons')
      .select('*')
      .eq('is_active', true)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter by user restrictions
    const filteredCoupons = [];
    for (const coupon of data || []) {
      if (userId) {
        const userRestrictionValid = await validateUserRestrictions(coupon, userId);
        if (userRestrictionValid) {
          filteredCoupons.push(coupon);
        }
      } else {
        // For non-logged in users, only show coupons with no user restrictions
        if (coupon.user_restrictions === 'all') {
          filteredCoupons.push(coupon);
        }
      }
    }

    return filteredCoupons;
  } catch (error: any) {
    console.error('Error fetching available coupons:', error);
    return [];
  }
};

/**
 * Get coupon analytics
 */
export const getCouponAnalytics = async (couponId: string): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('coupon_usage_log')
      .select('*')
      .eq('coupon_id', couponId)
      .order('used_at', { ascending: false });

    if (error) throw error;

    const totalUsage = data?.length || 0;
    const totalDiscount = data?.reduce((sum, usage) => sum + usage.discount_amount, 0) || 0;
    const averageDiscount = totalUsage > 0 ? totalDiscount / totalUsage : 0;

    return {
      totalUsage,
      totalDiscount,
      averageDiscount,
      recentUsage: data?.slice(0, 10) || []
    };
  } catch (error: any) {
    console.error('Error fetching coupon analytics:', error);
    return {
      totalUsage: 0,
      totalDiscount: 0,
      averageDiscount: 0,
      recentUsage: []
    };
  }
};
