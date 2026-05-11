export interface Designation {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
}

export interface Permission {
  id: string;
  /** e.g. "users.view" */
  key: string;
  module_name: string;
  action_name: string;
  description?: string | null;
}

export interface StaffUser {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  designation_id: string | null;
  is_active: boolean;
  force_password_reset: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Convenience join used in the admin list. */
export interface StaffUserListItem extends StaffUser {
  designation?: { id: string; name: string } | null;
}

export interface StaffPermissionOverride {
  id: string;
  staff_user_id: string;
  permission_id: string;
  allowed: boolean;
  created_at: string;
}

/** All modules used by the admin sidebar. Keep in sync with seed. */
export const MODULE_KEYS = [
  'dashboard',
  'users',
  'influencers',
  'categories',
  'services',
  'contracts',
  'reviews',
  'bookings',
  'cash_out',
  'refunds',
  'platforms',
  'discounts',
  'legal_notices',
  'privacy_policy',
  'contact_support',
  'help_support',
  'settings',
  'staff',
] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

export const BASE_ACTIONS = ['view', 'create', 'edit', 'delete'] as const;
export type BaseAction = (typeof BASE_ACTIONS)[number];
