import { supabase } from './supabaseClient';

export const signIn = async (email: string, password: string) => {
  return supabase.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
  return supabase.auth.signOut();
};

export const getSession = async () => {
  return supabase.auth.getSession();
};

export const resetPassword = async (email: string, redirectUrl?: string) => {
  try {
    // Get the current session to get the access token
    const { data: session } = await supabase.auth.getSession();
    
    if (!session.session) {
      throw new Error('No active session found');
    }

    // Call the password reset edge function
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/password-reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.session.access_token}`
      },
      body: JSON.stringify({
        email,
        redirect_url: redirectUrl
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send password reset email');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Password reset error:', error);
    throw error;
  }
}; 