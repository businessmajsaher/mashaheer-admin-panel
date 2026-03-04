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

const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  return session;
};

const supabaseUrl = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) throw new Error('Supabase URL not configured');
  return url;
};

const callFunction = async (name: string, options: RequestInit, queryParams?: Record<string, string>) => {
  const session = await getSession();
  let url = `${supabaseUrl()}/functions/v1/${name}`;
  if (queryParams) {
    const params = new URLSearchParams(queryParams);
    url += `?${params.toString()}`;
  }
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
};

export const refundService = {
  // Initiate a refund via Hesabe
  async initiateRefund(request: RefundRequest): Promise<Refund> {
    const result = await callFunction('initiate-refund', {
      method: 'POST',
      body: JSON.stringify(request)
    });
    return result.refund;
  },

  // Get refunds for a booking (from local DB)
  async getRefundsByBooking(bookingId: string): Promise<Refund[]> {
    const { data, error } = await supabase
      .from('refunds')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Refund[];
  },

  // Get all refunds with filters (from local DB)
  async getRefunds(page: number = 1, limit: number = 10, filters?: {
    booking_id?: string;
    status?: string;
  }) {
    let query = supabase
      .from('refunds')
      .select(`
        *,
        booking:bookings(
          id,
          service:services(title),
          customer:profiles!bookings_customer_id_fkey(name, email)
        ),
        payment:payments(id, amount, currency, transaction_reference)
      `, { count: 'exact' });

    if (filters?.booking_id) query = query.eq('booking_id', filters.booking_id);
    if (filters?.status) query = query.eq('status', filters.status);

    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data as Refund[], total: count || 0, page, limit };
  },

  // Get refund by local ID
  async getRefund(id: string): Promise<Refund> {
    const { data, error } = await supabase
      .from('refunds')
      .select(`
        *,
        booking:bookings(id, service:services(title)),
        payment:payments(id, amount, currency, transaction_reference)
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Refund;
  },

  // Get Hesabe refund list (from Hesabe API)
  async getHesabeRefundList(params?: {
    date_from?: string;
    date_to?: string;
    page?: string;
    search?: string;
  }) {
    const queryParams: Record<string, string> = {};
    if (params?.date_from) queryParams.date_from = params.date_from;
    if (params?.date_to) queryParams.date_to = params.date_to;
    if (params?.page) queryParams.page = params.page;
    if (params?.search) queryParams.search = params.search;

    return callFunction('hesabe-refund-list', { method: 'GET' }, queryParams);
  },

  // Get Hesabe refund details
  async getHesabeRefundDetails(hesabeRefundId: string) {
    return callFunction('hesabe-refund-details', { method: 'GET' }, { refund_id: hesabeRefundId });
  },

  // Cancel a refund (only when status = 0 / pending)
  async cancelRefund(hesabeRefundId: string, localRefundId: string) {
    return callFunction('hesabe-refund-cancel', {
      method: 'POST',
      body: JSON.stringify({ hesabe_refund_id: hesabeRefundId, local_refund_id: localRefundId })
    });
  },

  // Cancel a local-only refund (no Hesabe ID yet)
  async cancelLocalRefund(localRefundId: string) {
    const { error } = await supabase
      .from('refunds')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', localRefundId);
    if (error) throw error;
    return { success: true };
  }
};
