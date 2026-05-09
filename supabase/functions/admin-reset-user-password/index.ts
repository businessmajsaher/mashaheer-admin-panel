// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')!;

function generateRandomPassword(length = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const all = lowercase + uppercase + numbers + symbols;

  const pick = (set: string, n: number) => set[n % set.length];

  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  const chars: string[] = [
    pick(lowercase, bytes[0]),
    pick(uppercase, bytes[1]),
    pick(numbers, bytes[2]),
    pick(symbols, bytes[3])
  ];
  for (let i = 4; i < length; i++) {
    chars.push(pick(all, bytes[i]));
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const rb = new Uint8Array(1);
    crypto.getRandomValues(rb);
    const j = rb[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Unauthorized: Missing token');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const {
      data: { user: caller },
      error: authError
    } = await supabase.auth.getUser(token);
    if (authError || !caller) {
      throw new Error('Unauthorized: Invalid token');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .maybeSingle();

    const roleFromProfile = profile?.role != null ? String(profile.role).toLowerCase() : '';
    const meta = caller.user_metadata as Record<string, unknown> | undefined;
    const appMeta = caller.app_metadata as Record<string, unknown> | undefined;
    const roleFromMeta = [meta?.role, appMeta?.role].find((r) => typeof r === 'string') as
      | string
      | undefined;
    const isAdmin =
      roleFromProfile === 'admin' ||
      (typeof roleFromMeta === 'string' && roleFromMeta.toLowerCase() === 'admin');

    if (!isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    const body = await req.json();
    const emailRaw = typeof body.email === 'string' ? body.email.trim() : '';
    const nameRaw = typeof body.name === 'string' ? body.name.trim() : '';
    const login_url =
      typeof body.login_url === 'string' && body.login_url.trim()
        ? body.login_url.trim()
        : undefined;

    if (!emailRaw) {
      return new Response(JSON.stringify({ error: 'Missing required field: email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: customerProfile, error: profileLookupError } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .ilike('email', emailRaw)
      .eq('role', 'customer')
      .maybeSingle();

    if (profileLookupError) {
      console.error('Profile lookup error:', profileLookupError);
      return new Response(
        JSON.stringify({
          error: 'Failed to look up user',
          details: profileLookupError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!customerProfile || String(customerProfile.role).toLowerCase() !== 'customer') {
      return new Response(
        JSON.stringify({
          error: 'User not found',
          message: 'No customer account found with this email address'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const displayName =
      nameRaw ||
      (typeof customerProfile.name === 'string' && customerProfile.name
        ? customerProfile.name
        : 'Customer');

    const newPassword = generateRandomPassword(12);

    const { error: updateError } = await supabase.auth.admin.updateUserById(customerProfile.id, {
      password: newPassword
    });

    if (updateError) {
      console.error('updateUserById error:', updateError);
      return new Response(
        JSON.stringify({
          error: 'Failed to update password',
          details: updateError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Login must use auth.users.email; profiles.email can drift after admin edits.
    const { data: authAfterUpdate, error: authLookupError } = await supabase.auth.admin.getUserById(
      customerProfile.id
    );
    if (authLookupError || !authAfterUpdate?.user?.email) {
      console.error('getUserById after password update:', authLookupError);
      return new Response(
        JSON.stringify({
          error: 'Password was updated but could not load login email. Contact support.',
          details: authLookupError?.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const loginEmail = authAfterUpdate.user.email.trim();
    const profileEmail = (customerProfile.email ?? emailRaw).trim();
    const recipientEmail =
      profileEmail.toLowerCase() !== loginEmail.toLowerCase() ? profileEmail : undefined;

    const appUrl =
      login_url ||
      Deno.env.get('CUSTOMER_APP_URL') ||
      `${SUPABASE_URL.replace(/\/$/, '')}/login`;

    const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-customer-welcome-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        email: loginEmail,
        recipientEmail,
        name: displayName,
        password: newPassword,
        emailKind: 'admin_password_reset',
        appUrl
      })
    });

    const emailPayload = await emailRes.json().catch(() => ({}));

    if (!emailRes.ok || emailPayload.success === false) {
      const msg =
        (emailPayload as { error?: string }).error ||
        `Email service returned HTTP ${emailRes.status}`;
      console.error('Credential email failed:', msg);
      return new Response(
        JSON.stringify({
          error:
            'Password was updated in the system, but sending the email failed. You can try again to email a new password, or share credentials manually.',
          details: msg,
          partial_success: true
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'New password generated and sent to the user by email',
        user: {
          id: customerProfile.id,
          email: loginEmail,
          ...(recipientEmail ? { profile_email: profileEmail } : {})
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status = message.includes('Unauthorized') ? 403 : 500;
    console.error('admin-reset-user-password:', message);
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
