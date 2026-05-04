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
  template_id?: string;
  contract_id?: string;
  customer_id: string;
  influencer_id: string;
  booking_id?: string;
  status: 'draft' | 'pending' | 'signed' | 'completed' | 'cancelled';
  signed_at?: string;
  completed_at?: string;
  created_at: string;
  /** Final HTML after variable substitution */
  generated_content?: string | null;
  /** Optional stored PDF URL (if backend stores one) */
  pdf_url?: string | null;
  signed_pdf_url?: string | null;
  document_url?: string | null;
  variables_data?: Record<string, any>;
  variables?: Record<string, any>;
  /** Present when loaded with booking details */
  signatures?: {
    signer_type?: string | null;
    signature_data?: string | null;
    signed_at?: string | null;
  }[];
  contract_templates?: {
    title: string;
    template_type: string;
  };
  customer?: {
    name: string;
    email: string;
  };
  influencer?: {
    name: string;
    email: string;
  };
}

export interface ContractTemplate {
  id: string;
  title: string;
  template_type: 'collaboration' | 'content_creation';
  content: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContractSignature {
  id: string;
  contract_instance_id: string;
  signer_id: string;
  signer_type: 'customer' | 'influencer' | 'admin';
  signature_data: string;
  signed_at: string;
}
