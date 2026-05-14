import type { User } from '@supabase/supabase-js';

/**
 * True when JWT metadata marks this user as a super admin.
 * Matches DB convention: raw_user_meta_data.is_super_admin (boolean or string).
 * Legacy keys such as super_admin are ignored — use is_super_admin and auth.users.is_super_admin.
 */
export function isSuperAdmin(user: User | null | undefined): boolean {
  if (!user) return false;

  const buckets: Array<Record<string, unknown> | undefined> = [
    user.user_metadata as Record<string, unknown> | undefined,
    user.app_metadata as Record<string, unknown> | undefined,
  ];

  for (const bucket of buckets) {
    if (!bucket) continue;
    const raw = bucket.is_super_admin;
    if (raw === true) return true;
    if (typeof raw === 'string' && raw.trim().toLowerCase() === 'true') return true;
    if (typeof raw === 'number' && raw === 1) return true;
  }
  return false;
}
