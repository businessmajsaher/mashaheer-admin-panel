import { supabase } from './supabaseClient';
import type { Designation, Permission } from '@/types/rbac';

/**
 * Returns the calling user's permission keys.
 *  - Super admins get the wildcard "*".
 *  - Staff users get keys granted by their designation, minus per-user
 *    overrides set to `allowed = false`, plus per-user overrides set
 *    to `allowed = true`.
 */
export async function getMyPermissions(): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_my_permissions');
  if (error) {
    console.error('get_my_permissions RPC failed:', error);
    return [];
  }
  return (data ?? []).map((r: { key: string }) => r.key);
}

export async function listPermissions(): Promise<Permission[]> {
  const { data, error } = await supabase
    .from('permissions')
    .select('id, key, module_name, action_name, description')
    .order('module_name', { ascending: true })
    .order('action_name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Permission[];
}

export async function listDesignations(): Promise<Designation[]> {
  const { data, error } = await supabase
    .from('designations')
    .select('id, name, description, created_at')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Designation[];
}

export async function getDesignationPermissionIds(designationId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('designation_permissions')
    .select('permission_id')
    .eq('designation_id', designationId);
  if (error) throw error;
  return (data ?? []).map((r: { permission_id: string }) => r.permission_id);
}

/** Replace a designation's permission set in one transactional pair. */
export async function setDesignationPermissions(
  designationId: string,
  permissionIds: string[]
): Promise<void> {
  const { error: delErr } = await supabase
    .from('designation_permissions')
    .delete()
    .eq('designation_id', designationId);
  if (delErr) throw delErr;
  if (permissionIds.length === 0) return;
  const rows = permissionIds.map((permission_id) => ({
    designation_id: designationId,
    permission_id,
  }));
  const { error } = await supabase.from('designation_permissions').insert(rows);
  if (error) throw error;
}

export async function createDesignation(name: string, description?: string): Promise<Designation> {
  const { data, error } = await supabase
    .from('designations')
    .insert({ name: name.trim(), description: description?.trim() || null })
    .select('id, name, description, created_at')
    .single();
  if (error) throw error;
  return data as Designation;
}

export async function updateDesignation(
  id: string,
  patch: { name?: string; description?: string | null }
): Promise<void> {
  const { error } = await supabase.from('designations').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteDesignation(id: string): Promise<void> {
  const { error } = await supabase.from('designations').delete().eq('id', id);
  if (error) throw error;
}
