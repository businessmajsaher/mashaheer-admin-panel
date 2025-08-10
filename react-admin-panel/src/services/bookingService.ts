import { supabase } from './supabaseClient';
import { Booking, CreateBookingData, UpdateBookingData, BookingFilters } from '../types/booking';

export const bookingService = {
  // Get all bookings with filters and pagination
  async getBookings(page: number = 1, limit: number = 10, filters?: BookingFilters) {
    let query = supabase
      .from('bookings')
      .select(`
        *,
        service:services(title, thumbnail),
        primary_influencer:profiles!primary_influencer_id(name, email),
        customer:profiles!customer_id(name, email),
        status:booking_statuses(name)
      `, { count: 'exact' });

    // Apply filters
    if (filters?.service_id) {
      query = query.eq('service_id', filters.service_id);
    }
    if (filters?.influencer_id) {
      query = query.eq('primary_influencer_id', filters.influencer_id);
    }
    if (filters?.status) {
      query = query.eq('status_id', filters.status);
    }
    if (filters?.date_from) {
      query = query.gte('scheduled_time', filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte('scheduled_time', filters.date_to);
    }
    if (filters?.search) {
      query = query.or(`notes.ilike.%${filters.search}%`);
    }

    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      data: data as Booking[],
      total: count || 0,
      page,
      limit
    };
  },

  // Get single booking by ID
  async getBooking(id: string) {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        service:services(title, thumbnail, description),
        primary_influencer:profiles!primary_influencer_id(name, email),
        customer:profiles!customer_id(name, email),
        status:booking_statuses(name)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Booking;
  },

  // Create new booking
  async createBooking(bookingData: CreateBookingData) {
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        service_id: bookingData.service_id,
        primary_influencer_id: bookingData.influencer_id,
        customer_id: bookingData.customer_id,
        status_id: 'pending', // You'll need to get the actual status ID
        scheduled_time: bookingData.booking_date,
        notes: bookingData.special_requirements
      })
      .select()
      .single();

    if (error) throw error;
    return data as Booking;
  },

  // Update booking
  async updateBooking(id: string, bookingData: UpdateBookingData) {
    const updateData: any = {};
    if (bookingData.status !== undefined) updateData.status_id = bookingData.status;
    if (bookingData.booking_date !== undefined) updateData.scheduled_time = bookingData.booking_date;
    if (bookingData.special_requirements !== undefined) updateData.notes = bookingData.special_requirements;

    const { data, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Booking;
  },

  // Update booking status
  async updateBookingStatus(id: string, status: 'pending' | 'approved' | 'completed' | 'canceled') {
    // You'll need to map status strings to actual status IDs
    const statusMap = {
      'pending': 'status_id_1',
      'approved': 'status_id_2', 
      'completed': 'status_id_3',
      'canceled': 'status_id_4'
    };

    const { data, error } = await supabase
      .from('bookings')
      .update({ status_id: statusMap[status] })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Booking;
  },

  // Delete booking
  async deleteBooking(id: string) {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
}; 