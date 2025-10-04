export interface Contract {
  id: string;
  title: string;
  template_type: string;
  content: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContractInstance {
  id: string;
  contract_id: string;
  customer_id: string;
  influencer_id: string;
  booking_id?: string;
  status: 'draft' | 'pending' | 'signed' | 'completed' | 'cancelled';
  signed_at?: string;
  completed_at?: string;
  created_at: string;
  variables_data: Record<string, any>;
}

export interface ContractTemplate {
  id: string;
  title: string;
  template_type: 'advertising' | 'collaboration' | 'sponsorship' | 'custom';
  content: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
