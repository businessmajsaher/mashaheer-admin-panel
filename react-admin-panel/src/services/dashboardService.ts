import { supabase } from './supabaseClient';

export interface TopInfluencer {
  influencer_id: string;
  name: string;
  email: string;
  profile_image_url?: string;
  total_bookings: number;
  completed_bookings: number;
  total_revenue: number;
  average_rating: number;
  review_count: number;
  completion_rate: number;
}

export interface PaymentLog {
  id: string;
  booking_id: string;
  payer_id: string;
  payee_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method?: string;
  transaction_reference?: string;
  paid_at?: string;
  created_at: string;
  // Joined data
  payer?: {
    name: string;
    email: string;
  };
  payee?: {
    name: string;
    email: string;
  };
  booking?: {
    id: string;
    service_id: string;
  };
  service?: {
    title: string;
  };
}

export const dashboardService = {
  // Get top performing influencers
  async getTopInfluencers(limit: number = 10): Promise<TopInfluencer[]> {
    // Get completed status IDs first
    const { data: completedStatuses } = await supabase
      .from('booking_statuses')
      .select('id')
      .in('name', ['Published', 'completed', 'To Be Publish', 'Auto-Approved']);
    
    const completedStatusIds = completedStatuses?.map(s => s.id) || [];

    // Get influencers with their performance metrics using a single query
    const { data: influencers, error } = await supabase
      .from('profiles')
      .select(`
        id,
        name,
        email,
        profile_image_url,
        bookings:bookings!influencer_id(count),
        completed_bookings:bookings!influencer_id(count)
      `)
      .eq('role', 'influencer')
      .eq('is_suspended', false);

    if (error) throw error;

    // Calculate performance metrics for each influencer
    const influencersWithMetrics = await Promise.all(
      (influencers || []).map(async (influencer) => {
        // Get bookings count
        const { count: totalBookings } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('influencer_id', influencer.id);

        // Get completed bookings
        const { count: completedBookings } = completedStatusIds.length > 0
          ? await supabase
              .from('bookings')
              .select('*', { count: 'exact', head: true })
              .eq('influencer_id', influencer.id)
              .in('status_id', completedStatusIds)
          : { count: 0 };

        // Get total revenue from payments
        const { data: payments } = await supabase
          .from('payments')
          .select('amount, currency')
          .eq('payee_id', influencer.id)
          .eq('status', 'completed');

        const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;

        // Get ratings
        const { data: rating } = await supabase
          .from('influencer_ratings')
          .select('average_rating, review_count')
          .eq('influencer_id', influencer.id)
          .single();

        const completionRate = totalBookings && totalBookings > 0
          ? ((completedBookings || 0) / totalBookings) * 100
          : 0;

        return {
          influencer_id: influencer.id,
          name: influencer.name,
          email: influencer.email,
          profile_image_url: influencer.profile_image_url,
          total_bookings: totalBookings || 0,
          completed_bookings: completedBookings || 0,
          total_revenue: totalRevenue,
          average_rating: Number(rating?.average_rating) || 0,
          review_count: rating?.review_count || 0,
          completion_rate: completionRate
        };
      })
    );

    // Sort by performance score (combination of revenue, bookings, rating)
    const sorted = influencersWithMetrics.sort((a, b) => {
      const scoreA = (a.total_revenue * 0.5) + (a.total_bookings * 100) + (a.average_rating * 50);
      const scoreB = (b.total_revenue * 0.5) + (b.total_bookings * 100) + (b.average_rating * 50);
      return scoreB - scoreA;
    });

    return sorted.slice(0, limit);
  },

  // Get payment logs
  async getPaymentLogs(page: number = 1, limit: number = 20): Promise<{
    data: PaymentLog[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { data, error, count } = await supabase
      .from('payments')
      .select(`
        *,
        payer:profiles!payments_payer_id_fkey(id, name, email),
        payee:profiles!payments_payee_id_fkey(id, name, email),
        booking:bookings!payments_booking_id_fkey(
          id,
          service_id,
          service:services!bookings_service_id_fkey(title)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    // Transform data to match PaymentLog interface
    const transformedData = (data || []).map((payment: any) => ({
      ...payment,
      service: payment.booking?.service
    }));

    return {
      data: transformedData as PaymentLog[],
      total: count || 0,
      page,
      limit
    };
  },

  // Get recent payment logs (last 10)
  async getRecentPaymentLogs(): Promise<PaymentLog[]> {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        payer:profiles!payments_payer_id_fkey(id, name, email),
        payee:profiles!payments_payee_id_fkey(id, name, email),
        booking:bookings!payments_booking_id_fkey(
          id,
          service_id,
          service:services!bookings_service_id_fkey(title)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    
    // Transform data to match PaymentLog interface
    return (data || []).map((payment: any) => ({
      ...payment,
      service: payment.booking?.service
    })) as PaymentLog[];
  }
};

