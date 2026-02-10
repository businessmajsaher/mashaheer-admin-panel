import { supabase } from './supabaseClient';

export interface BlackMark {
  id: string;
  booking_id: string;
  influencer_id: string;
  service_id: string;
  reason: string;
  created_at: string;
  created_by?: string;
  // Joined data
  booking?: {
    id: string;
    scheduled_time: string;
  };
  influencer?: {
    name: string;
    email: string;
  };
  service?: {
    title: string;
  };
}

export const blackMarkService = {
  // Get all black marks
  async getBlackMarks(page: number = 1, limit: number = 10, filters?: {
    influencer_id?: string;
    booking_id?: string;
  }) {
    let query = supabase
      .from('black_marks')
      .select(`
        *,
        booking:bookings(id, scheduled_time),
        influencer:profiles!black_marks_influencer_id_fkey(name, email),
        service:services(title)
      `, { count: 'exact' });

    if (filters?.influencer_id) {
      query = query.eq('influencer_id', filters.influencer_id);
    }
    if (filters?.booking_id) {
      query = query.eq('booking_id', filters.booking_id);
    }

    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      data: data as BlackMark[],
      total: count || 0,
      page,
      limit
    };
  },

  // Get black marks by influencer
  async getBlackMarksByInfluencer(influencerId: string) {
    const { data, error } = await supabase
      .from('black_marks')
      .select(`
        *,
        booking:bookings(id, scheduled_time),
        service:services(title)
      `)
      .eq('influencer_id', influencerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as BlackMark[];
  },

  // Create black mark
  async createBlackMark(blackMarkData: {
    booking_id: string;
    influencer_id: string;
    service_id: string;
    reason: string;
  }) {
    const { data, error } = await supabase
      .from('black_marks')
      .insert(blackMarkData)
      .select()
      .single();

    if (error) throw error;
    return data as BlackMark;
  }
};

