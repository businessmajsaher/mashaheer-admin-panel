import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getMyPermissions } from '@/services/permissionService';

interface PermissionContextValue {
  /** Raw keys returned by `get_my_permissions` (super admin: ["*"]). */
  permissions: string[];
  /** True while initial load is in-flight. */
  loading: boolean;
  /** True for super admins. */
  isSuperAdmin: boolean;
  /** Refetch (call after RBAC changes). */
  refresh: () => Promise<void>;
  /** Check a single permission key. */
  has: (key: string) => boolean;
  /** Convenience: any of the keys. */
  hasAny: (...keys: string[]) => boolean;
  /** Convenience: every key. */
  hasAll: (...keys: string[]) => boolean;
  /** Convenience: any action under a module. */
  canAccessModule: (moduleKey: string) => boolean;
}

const PermissionContext = createContext<PermissionContextValue | undefined>(undefined);

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setLoading(false);
      return;
    }
    if (user.super_admin) {
      setPermissions(['*']);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const keys = await getMyPermissions();
      setPermissions(keys);
    } catch (e) {
      console.error('PermissionContext load failed:', e);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [authLoading, load]);

  const value: PermissionContextValue = useMemo(() => {
    const isSuper = permissions.includes('*');
    const set = new Set(permissions);
    const has = (key: string) => isSuper || set.has(key);
    return {
      permissions,
      loading,
      isSuperAdmin: isSuper,
      refresh: load,
      has,
      hasAny: (...keys: string[]) => keys.some((k) => has(k)),
      hasAll: (...keys: string[]) => keys.every((k) => has(k)),
      canAccessModule: (moduleKey: string) => {
        if (isSuper) return true;
        const prefix = `${moduleKey}.`;
        for (const k of set) if (k.startsWith(prefix)) return true;
        return false;
      },
    };
  }, [permissions, loading, load]);

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
};

export function usePermissions(): PermissionContextValue {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermissions must be used within PermissionProvider');
  return ctx;
}

export function useHasPermission(key: string): boolean {
  return usePermissions().has(key);
}
