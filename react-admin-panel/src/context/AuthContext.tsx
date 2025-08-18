import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/services/supabaseClient';

interface User {
  id: string;
  email: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔍 AuthContext: Starting session check...');
    
    // Add a timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ AuthContext: Session check timed out after 10 seconds');
      setLoading(false);
    }, 10000);
    
    // Check session on mount
    supabase.auth.getSession().then(async ({ data, error }) => {
      console.log('🔍 AuthContext getSession result:', { data, error });
      if (error) {
        console.error('❌ AuthContext session error:', error);
        setLoading(false);
        return;
      }
      
      if (data.session?.user) {
        console.log('✅ AuthContext: User found in session');
        setUser({
          id: data.session.user.id,
          email: data.session.user.email ?? '',
          role: data.session.user.user_metadata?.role || 'user',
        });
      } else if (data.session?.access_token) {
        console.log('🔍 AuthContext: Access token found, fetching user...');
        // Fetch user info if not present in session
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('❌ AuthContext getUser error:', userError);
        } else if (userData.user) {
          console.log('✅ AuthContext: User fetched successfully');
          setUser({
            id: userData.user.id,
            email: userData.user.email ?? '',
            role: userData.user.user_metadata?.role || 'user',
          });
        }
      } else {
        console.log('ℹ️ AuthContext: No session found');
      }
      console.log('🔍 AuthContext: Setting loading to false');
      clearTimeout(timeoutId);
      setLoading(false);
    }).catch(err => {
      console.error('❌ AuthContext getSession catch error:', err);
      clearTimeout(timeoutId);
      setLoading(false);
    });
    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          role: session.user.user_metadata?.role || 'user',
        });
      } else {
        setUser(null);
      }
    });
    return () => {
      clearTimeout(timeoutId);
      listener?.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Immediately fetch session and set user after signIn
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) {
      setUser({
        id: sessionData.session.user.id,
        email: sessionData.session.user.email ?? '',
        role: sessionData.session.user.user_metadata?.role || 'user',
      });
    } else if (sessionData.session?.access_token) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        setUser({
          id: userData.user.id,
          email: userData.user.email ?? '',
          role: userData.user.user_metadata?.role || 'user',
        });
      }
    }
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
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