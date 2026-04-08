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
  const redirectTo =
    redirectUrl || `${window.location.origin}/password-reset-callback`;

  try {
    const { data: session } = await supabase.auth.getSession();

    if (session.session) {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/password-reset`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.session.access_token}`
            },
            body: JSON.stringify({
              email,
              redirect_url: redirectTo
            })
          }
        );

        if (response.ok) {
          return await response.json();
        }
        const errorData = await response.json().catch(() => ({}));
        const msg = String((errorData as { error?: string }).error || '').toLowerCase();
        if (response.status === 429 || msg.includes('rate') || msg.includes('too many')) {
          throw new Error('Too many reset requests. Please wait before requesting another email.');
        }
        throw new Error((errorData as { error?: string }).error || `HTTP ${response.status}`);
      } catch (edgeErr: unknown) {
        const edgeMsg = (edgeErr as { message?: string })?.message || '';
        if (edgeMsg.toLowerCase().includes('too many') || edgeMsg.toLowerCase().includes('rate limit')) {
          throw edgeErr;
        }
        console.warn('password-reset edge function failed, using Supabase email:', edgeErr);
      }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });

    if (error) {
      const msg = error.message || '';
      if (
        msg.toLowerCase().includes('rate limit') ||
        msg.toLowerCase().includes('too many') ||
        (error as { status?: number }).status === 429
      ) {
        throw new Error(
          'Too many reset requests. Please wait before requesting another email.'
        );
      }
      throw error;
    }

    return { success: true, message: 'Password reset email sent' };
  } catch (error: unknown) {
    console.error('Password reset error:', error);
    throw error;
  }
}; 