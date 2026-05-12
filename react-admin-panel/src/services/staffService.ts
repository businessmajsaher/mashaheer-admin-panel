import { supabase } from './supabaseClient';
import type { StaffPermissionOverride, StaffUser, StaffUserListItem } from '@/types/rbac';

async function getAuthToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No active session. Please log in again.');
  return token;
}

async function callEdgeFunction<T>(
  name: string,
  body: Record<string, unknown>
): Promise<T> {
  const token = await getAuthToken();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg = (json.error as string) || (json.details as string) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json as T;
}

export async function listStaffUsers(): Promise<StaffUserListItem[]> {
  const { data, error } = await supabase
    .from('staff_users')
    .select(
      `id, auth_user_id, full_name, email, designation_id, is_active,
       force_password_reset, created_by, created_at, updated_at,
       designation:designations(id, name)`
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as StaffUserListItem[];
}

export async function getStaffUser(id: string): Promise<StaffUserListItem | null> {
  const { data, error } = await supabase
    .from('staff_users')
    .select(
      `id, auth_user_id, full_name, email, designation_id, is_active,
       force_password_reset, created_by, created_at, updated_at,
       designation:designations(id, name)`
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as StaffUserListItem | null;
}

export async function createStaffUser(input: {
  email: string;
  full_name: string;
  designation_id?: string | null;
  login_url?: string;
  is_active?: boolean;
}): Promise<{
  success: boolean;
  staff: StaffUser;
  email_sent: boolean;
  email_error?: string;
}> {
  return callEdgeFunction('admin-create-staff', {
    email: input.email.trim().toLowerCase(),
    full_name: input.full_name.trim(),
    designation_id: input.designation_id ?? null,
    is_active: input.is_active !== false,
    login_url: input.login_url,
  });
}

export async function updateStaffUser(
  id: string,
  patch: { full_name?: string; designation_id?: string | null; is_active?: boolean }
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (patch.full_name !== undefined) updates.full_name = patch.full_name.trim();
  if (patch.designation_id !== undefined) updates.designation_id = patch.designation_id;
  if (patch.is_active !== undefined) updates.is_active = patch.is_active;
  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase.from('staff_users').update(updates).eq('id', id);
  if (error) throw error;

  // Keep auth.users.user_metadata.designation_id in sync so the JWT
  // is fresh after the staff user next signs in.
  if (patch.designation_id !== undefined) {
    const { data: row } = await supabase
      .from('staff_users')
      .select('auth_user_id')
      .eq('id', id)
      .maybeSingle();
    if (row?.auth_user_id) {
      try {
        await supabase.auth.admin.updateUserById(row.auth_user_id, {
          user_metadata: { designation_id: patch.designation_id },
        });
      } catch {
        /* not allowed from client without service role — harmless */
      }
    }
  }
}

export async function setStaffActive(id: string, isActive: boolean): Promise<void> {
  return updateStaffUser(id, { is_active: isActive });
}

export async function resetStaffPassword(staffUserId: string, loginUrl?: string): Promise<{
  success: boolean;
  email_sent: boolean;
  email: string;
  email_error?: string;
}> {
  return callEdgeFunction('admin-reset-staff-password', {
    staff_user_id: staffUserId,
    login_url: loginUrl,
  });
}

export async function listStaffOverrides(staffUserId: string): Promise<StaffPermissionOverride[]> {
  const { data, error } = await supabase
    .from('staff_permissions')
    .select('id, staff_user_id, permission_id, allowed, created_at')
    .eq('staff_user_id', staffUserId);
  if (error) throw error;
  return (data ?? []) as StaffPermissionOverride[];
}

/**
 * Replace per-staff overrides in one go.
 * `allowGrants` = permissions explicitly granted on top of designation.
 * `denyOverrides` = permissions explicitly revoked from designation.
 */
export async function replaceStaffOverrides(
  staffUserId: string,
  allowGrants: string[],
  denyOverrides: string[]
): Promise<void> {
  const { error: delErr } = await supabase
    .from('staff_permissions')
    .delete()
    .eq('staff_user_id', staffUserId);
  if (delErr) throw delErr;

  const rows = [
    ...allowGrants.map((permission_id) => ({
      staff_user_id: staffUserId,
      permission_id,
      allowed: true,
    })),
    ...denyOverrides.map((permission_id) => ({
      staff_user_id: staffUserId,
      permission_id,
      allowed: false,
    })),
  ];
  if (rows.length === 0) return;
  const { error } = await supabase.from('staff_permissions').insert(rows);
  if (error) throw error;
}
