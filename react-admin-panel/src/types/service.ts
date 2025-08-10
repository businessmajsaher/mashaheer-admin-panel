export interface Service {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  min_duration_days: number;
  is_flash_deal: boolean;
  flash_from?: string;
  flash_to?: string;
  location_required: boolean;
  about_us?: string;
  service_type: 'normal' | 'dual' | 'flash';
  primary_influencer_id: string;
  invited_influencer_id?: string;
  category_id?: string;
  platform_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateServiceData {
  title: string;
  description: string;
  thumbnail?: File;
  min_duration_days: number;
  is_flash_deal: boolean;
  flash_from?: string;
  flash_to?: string;
  location_required: boolean;
  about_us?: string;
  service_type: 'normal' | 'dual' | 'flash';
  influencer_id: string;
  duo_influencer_id?: string;
  category_id?: string;
  platform_id?: string;
}

export interface UpdateServiceData {
  title?: string;
  description?: string;
  thumbnail?: File;
  min_duration_days?: number;
  is_flash_deal?: boolean;
  flash_from?: string;
  flash_to?: string;
  location_required?: boolean;
  about_us?: string;
  service_type?: 'normal' | 'dual' | 'flash';
  influencer_id?: string;
  duo_influencer_id?: string;
  category_id?: string;
  platform_id?: string;
}

export interface ServiceFilters {
  category_id?: string;
  service_type?: string;
  influencer_id?: string;
  search?: string;
} 