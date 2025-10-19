export interface Booking {
  id: string;
  service_id: string;
  influencer_id: string;
  customer_id: string;
  status_id: string;
  scheduled_time: string;
  completed_time?: string;
  notes?: string;
  script?: string;
  script_created_at?: string;
  script_approved_at?: string;
  feedback?: string;
  script_rejected_count?: number;
  created_at: string;
  updated_at: string;
  // Joined data from queries
  service?: {
    title: string;
    thumbnail?: string;
    description?: string;
  };
  influencer?: {
    name: string;
    email: string;
  };
  customer?: {
    name: string;
    email: string;
  };
  status?: {
    id: string;
    name: string;
    description?: string;
  };
}

export interface CreateBookingData {
  service_id: string;
  influencer_id: string;
  customer_id: string;
  status_id: string;
  scheduled_time: string;
  notes?: string;
}

export interface UpdateBookingData {
  status_id?: string;
  scheduled_time?: string;
  completed_time?: string;
  notes?: string;
  script?: string;
  feedback?: string;
}

export interface BookingFilters {
  service_id?: string;
  influencer_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface BookingStatus {
  id: string;
  name: string;
  description?: string;
  order?: number;
  created_at: string;
}
