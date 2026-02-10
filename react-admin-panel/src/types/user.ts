export interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'influencer' | 'admin';
  bio?: string;
  profile_image_url?: string;
  is_verified: boolean;
  is_suspended: boolean;
  suspension_reason?: string;
  created_by_admin_id?: string;
  is_approved: boolean;
  created_at: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  role: 'customer' | 'influencer' | 'admin';
  bio?: string;
  profile_image_url?: string;
}

export interface UpdateUserData {
  name?: string;
  bio?: string;
  profile_image_url?: string;
  is_verified?: boolean;
  is_suspended?: boolean;
  suspension_reason?: string;
  is_approved?: boolean;
} 