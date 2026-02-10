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
      throw new Error('No active session found. Please log in again.');
    }

    // Try using the edge function first (for admin-controlled reset)
    try {
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
    } catch (edgeFunctionError: any) {
      // Fallback to Supabase's built-in resetPasswordForEmail if edge function fails
      console.warn('Edge function failed, falling back to resetPasswordForEmail:', edgeFunctionError);
      
      const redirectTo = redirectUrl || `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) throw error;
      
      return { success: true, message: 'Password reset email sent' };
    }
  } catch (error: any) {
    console.error('Password reset error:', error);
    throw error;
  }
}; 