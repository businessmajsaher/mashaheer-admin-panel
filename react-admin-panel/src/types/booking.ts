export interface Booking {
  id: string;
  service_id: string;
  influencer_id: string;
  customer_id: string;
  status: 'pending' | 'approved' | 'completed' | 'canceled' | 'script_for_approval';
  booking_date: string;
  duration_days: number;
  total_amount: number;
  location?: string;
  special_requirements?: string;
  script_content?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBookingData {
  service_id: string;
  influencer_id: string;
  customer_id: string;
  booking_date: string;
  duration_days: number;
  total_amount: number;
  location?: string;
  special_requirements?: string;
}

export interface UpdateBookingData {
  status?: 'pending' | 'approved' | 'completed' | 'canceled' | 'script_for_approval';
  booking_date?: string;
  duration_days?: number;
  total_amount?: number;
  location?: string;
  special_requirements?: string;
  script_content?: string;
}

export interface BookingFilters {
  service_id?: string;
  influencer_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
} 