import { supabase } from './supabaseClient';

export interface RefundRequest {
  booking_id: string;
  amount?: number;
  reason?: string;
}

export interface Refund {
  id: string;
  booking_id: string;
  payment_id?: string;
  transaction_reference?: string;
  amount: number;
  currency: string;
  reason?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  hesabe_refund_id?: string;
  hesabe_response?: any;
  initiated_by?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export const refundService = {
  // Initiate a refund via Hesabe
  async initiateRefund(request: RefundRequest): Promise<Refund> {
    // Get the current user's session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Get Supabase URL from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }
    
    const functionUrl = `${supabaseUrl}/functions/v1/initiate-refund`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to initiate refund');
    }

    const result = await response.json();
    return result.refund;
  },

  // Get refunds for a booking
  async getRefundsByBooking(bookingId: string): Promise<Refund[]> {
    const { data, error } = await supabase
      .from('refunds')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Refund[];
  },

  // Get all refunds with filters
  async getRefunds(page: number = 1, limit: number = 10, filters?: {
    booking_id?: string;
    status?: string;
  }) {
    let query = supabase
      .from('refunds')
      .select(`
        *,
        booking:bookings(id, service_id),
        payment:payments(id, amount, currency, transaction_reference)
      `, { count: 'exact' });

    if (filters?.booking_id) {
      query = query.eq('booking_id', filters.booking_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      data: data as Refund[],
      total: count || 0,
      page,
      limit
    };
  },

  // Get refund by ID
  async getRefund(id: string): Promise<Refund> {
    const { data, error } = await supabase
      .from('refunds')
      .select(`
        *,
        booking:bookings(id, service_id),
        payment:payments(id, amount, currency, transaction_reference)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Refund;
  }
};

