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
  // Automation fields
  influencer_approval_deadline?: string;
  payment_deadline?: string;
  script_submission_deadline?: string;
  auto_approval_deadline?: string;
  appointment_end_time?: string;
  last_script_submitted_at?: string;
  last_script_rejected_at?: string;
  last_rejection_reason?: string;
  influencer_response_deadline?: string;
  is_ai_generated_script?: boolean;
  ai_script_count?: number;
  is_published?: boolean;
  published_at?: string;
  days_gap?: number;
  // Joined data from queries
  service?: {
    title: string;
    thumbnail?: string;
    description?: string;
    min_duration_days?: number;
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
