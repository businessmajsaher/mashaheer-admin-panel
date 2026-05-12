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

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .maybeSingle();

    const roleFromProfile =
      callerProfile?.role != null ? String(callerProfile.role).toLowerCase() : '';
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
    const userId = typeof body.user_id === 'string' ? body.user_id.trim() : '';
    const newEmail = typeof body.email === 'string' ? body.email.trim() : '';

    if (!userId || !newEmail) {
      return new Response(JSON.stringify({ error: 'Missing user_id or email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle();

    if (!targetProfile || String(targetProfile.role).toLowerCase() !== 'customer') {
      return new Response(JSON.stringify({ error: 'Customer not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { error: updErr } = await supabase.auth.admin.updateUserById(userId, {
      email: newEmail,
      email_confirm: true
    });

    if (updErr) {
      return new Response(
        JSON.stringify({
          error: 'Failed to update login email in authentication',
          details: updErr.message
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(JSON.stringify({ success: true, email: newEmail }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status = message.includes('Unauthorized') ? 403 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
