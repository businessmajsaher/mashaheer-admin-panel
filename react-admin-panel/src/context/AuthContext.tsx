import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AuthSession, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/services/supabaseClient';
import { isSuperAdmin } from '@/utils/superAdmin';

interface User {
  id: string;
  email: string;
  role?: string;
  /** JWT/metadata + mirrors auth.users.is_super_admin for dashboard super admins. */
  is_super_admin?: boolean;
  /** True when an active row exists in public.staff_users. */
  is_staff?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User | null }>;
  signOut: () => Promise<void>;
}

/**
 * Looks up `public.staff_users` for the given auth user id. Returns
 * `true` when an *active* row exists. Used by login + ProtectedRoute
 * so staff (non-super-admin) users may access the dashboard.
 *
 * IMPORTANT: must never be awaited from inside `onAuthStateChange`
 * (supabase-js v2 holds an auth lock during subscriber notification
 * and any other supabase call awaited from inside the listener can
 * deadlock the entire client). Always defer via setTimeout(0) or
 * call from a normal app context (signIn, useEffect, etc.).
 */
async function fetchIsStaff(authUserId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('staff_users')
    .select('id, is_active')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (error) {
    console.warn('fetchIsStaff failed (will treat as non-staff):', error.message);
    return false;
  }
  return !!(data && data.is_active);
}

function toBaseUser(u: SupabaseUser): User {
  const sa = isSuperAdmin(u);
  return {
    id: u.id,
    email: u.email ?? '',
    role: (u.user_metadata?.role as string) || 'user',
    is_super_admin: sa,
    // For super admins, treat as staff too (full access). Real staff
    // status is hydrated separately via fetchIsStaff.
    is_staff: sa,
  };
}

async function hydrateUser(u: SupabaseUser): Promise<User> {
  const base = toBaseUser(u);
  if (base.is_super_admin) return base;
  const isStaff = await fetchIsStaff(u.id);
  return { ...base, is_staff: isStaff };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ AuthContext: Supabase not configured, skipping session check');
      setLoading(false);
      return;
    }

    // Hard ceiling so the dashboard never hangs forever if something
    // upstream gets wedged (slow network, deadlocked lock, etc.).
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('⚠️ AuthContext: Session check timed out after 8s');
        setLoading(false);
      }
    }, 8000);

    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (error) {
          console.error('❌ AuthContext session error:', error);
          setLoading(false);
          return;
        }

        if (data.session?.user) {
          const hydrated = await hydrateUser(data.session.user);
          if (!isMounted) return;
          setUser(hydrated);
        }
      } catch (err) {
        console.error('❌ AuthContext getSession catch error:', err);
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) setLoading(false);
      }
    };

    void checkSession();

    // CRITICAL: do NOT make this callback async, and do NOT await
    // any supabase call from inside it. supabase-js v2 holds an
    // internal lock while iterating subscribers; awaiting another
    // supabase call here deadlocks the entire client (login then
    // hangs on "Signing in...").
    //
    // We update the user synchronously with what's already in the
    // session, then schedule the staff lookup on the next tick so
    // it runs OUTSIDE the auth lock.
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event: string, session: AuthSession | null) => {
        if (!isMounted) return;
        console.log('🔍 AuthContext: Auth state changed:', event, session?.user?.email);

        if (!session?.user) {
          setUser(null);
          setLoading(false);
          return;
        }

        const u = session.user;
        const base = toBaseUser(u);
        setUser(base);
        setLoading(false);

        // Super admins don't need the staff lookup.
        if (base.is_super_admin) return;

        setTimeout(() => {
          if (!isMounted) return;
          fetchIsStaff(u.id)
            .then((isStaff) => {
              if (!isMounted) return;
              setUser((prev) => (prev && prev.id === u.id ? { ...prev, is_staff: isStaff } : prev));
            })
            .catch((err) => console.warn('Deferred fetchIsStaff failed:', err));
        }, 0);
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      listener?.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ user: User | null }> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const supaUser = data.user;
      if (!supaUser) {
        setLoading(false);
        return { user: null };
      }

      // Hydrate outside the auth lock (signInWithPassword already
      // released it before resolving this promise).
      const hydrated = await hydrateUser(supaUser);
      setUser(hydrated);
      setLoading(false);
      return { user: hydrated };
    } catch (error) {
      console.error('❌ AuthContext: Sign in failed:', error);
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('❌ AuthContext: Sign out failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
