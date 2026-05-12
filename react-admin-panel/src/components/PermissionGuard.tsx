import React from 'react';
import { usePermissions } from '@/context/PermissionContext';

interface Props {
  /** Single permission required. */
  permission?: string;
  /** Any of these permissions grants access. */
  anyOf?: string[];
  /** All of these permissions are required. */
  allOf?: string[];
  /** What to render when not allowed. Defaults to null. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Conditionally renders children based on permissions.
 * Super admins always pass.
 *
 * <PermissionGuard permission="users.delete"><Button danger>Delete</Button></PermissionGuard>
 */
export const PermissionGuard: React.FC<Props> = ({
  permission,
  anyOf,
  allOf,
  fallback = null,
  children,
}) => {
  const { has, hasAny, hasAll, isSuperAdmin } = usePermissions();

  let allowed = isSuperAdmin;
  if (!allowed) {
    if (permission) allowed = has(permission);
    if (!allowed && anyOf?.length) allowed = hasAny(...anyOf);
    if (!allowed && allOf?.length) allowed = hasAll(...allOf);
    if (!permission && !anyOf?.length && !allOf?.length) allowed = true;
  }

  return <>{allowed ? children : fallback}</>;
};
