export interface Order {
  id: string;
  user_id: string;
  influencer_id: string;
  service_id: string;
  status: string;
  total: number;
  created_at: string;
  // Add more fields as needed
} 