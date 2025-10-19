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
        influencer:profiles!influencer_id(name, email),
        customer:profiles!customer_id(name, email),
        status:booking_statuses(id, name, description)
      `, { count: 'exact' });

    // Apply filters
    if (filters?.service_id) {
      query = query.eq('service_id', filters.service_id);
    }
    if (filters?.influencer_id) {
      query = query.eq('influencer_id', filters.influencer_id);
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
        influencer:profiles!influencer_id(name, email),
        customer:profiles!customer_id(name, email),
        status:booking_statuses(id, name, description)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Booking;
  },

  // Get all booking statuses
  async getBookingStatuses() {
    const { data, error } = await supabase
      .from('booking_statuses')
      .select('*')
      .order('order', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Create new booking
  async createBooking(bookingData: CreateBookingData) {
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        service_id: bookingData.service_id,
        influencer_id: bookingData.influencer_id,
        customer_id: bookingData.customer_id,
        status_id: bookingData.status_id,
        scheduled_time: bookingData.scheduled_time,
        notes: bookingData.notes
      })
      .select()
      .single();

    if (error) throw error;
    return data as Booking;
  },

  // Update booking
  async updateBooking(id: string, bookingData: UpdateBookingData) {
    const updateData: any = {};
    if (bookingData.status_id !== undefined) updateData.status_id = bookingData.status_id;
    if (bookingData.scheduled_time !== undefined) updateData.scheduled_time = bookingData.scheduled_time;
    if (bookingData.completed_time !== undefined) updateData.completed_time = bookingData.completed_time;
    if (bookingData.notes !== undefined) updateData.notes = bookingData.notes;
    if (bookingData.script !== undefined) updateData.script = bookingData.script;
    if (bookingData.feedback !== undefined) updateData.feedback = bookingData.feedback;

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
  async updateBookingStatus(id: string, status_id: string) {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status_id })
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
