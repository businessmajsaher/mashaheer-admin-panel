import type { User } from '@supabase/supabase-js';

/**
 * Returns true if the auth user is flagged as super_admin.
 *
 * Tolerant of common ways admins set the flag in Supabase Dashboard:
 *  - user_metadata.super_admin === true                  (boolean, recommended)
 *  - user_metadata.super_admin === "true"                (string, common typo)
 *  - app_metadata.super_admin === true | "true"          (admin-only buckets)
 *  - Same logic for is_super_admin / superAdmin aliases  (safety net)
 */
export function isSuperAdmin(user: User | null | undefined): boolean {
  if (!user) return false;

  const buckets: Array<Record<string, unknown> | undefined> = [
    user.user_metadata as Record<string, unknown> | undefined,
    user.app_metadata as Record<string, unknown> | undefined,
  ];

  const keys = ['super_admin', 'is_super_admin', 'superAdmin'];

  for (const bucket of buckets) {
    if (!bucket) continue;
    for (const key of keys) {
      const raw = bucket[key];
      if (raw === true) return true;
      if (typeof raw === 'string' && raw.trim().toLowerCase() === 'true') return true;
      if (typeof raw === 'number' && raw === 1) return true;
    }
  }
  return false;
}
