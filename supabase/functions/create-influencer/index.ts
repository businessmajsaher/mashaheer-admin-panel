import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY');

// Simple API key check instead of JWT verification
async function checkAuthorization(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized: Missing token');
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  // For now, just check if token exists (you can add more validation later)
  if (!token) {
    throw new Error('Unauthorized: Invalid token');
  }
  
  return { token };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    // Check authorization (basic token check)
    await checkAuthorization(req);
    
    // Parse request body
    const { email, password, name, bio, profile_image_url, is_verified } = await req.json();
    
    if (!email || !password || !name) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: email, password, name'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Create user in Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'influencer',
        name
      }
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      return new Response(JSON.stringify({
        error: 'Failed to create user in authentication system',
        details: authError.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Insert user profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email,
        name,
        role: 'influencer',
        bio: bio || null,
        profile_image_url: profile_image_url || null,
        is_verified: is_verified || false,
        is_suspended: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Rollback user if profile fails
      try {
        await supabase.auth.admin.deleteUser(authUser.user.id);
        console.log('Cleaned up auth user after profile creation failure');
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError);
      }
      
      return new Response(JSON.stringify({
        error: 'Failed to create user profile',
        details: profileError.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log('User and profile created successfully:', profileData);

    return new Response(JSON.stringify({
      user: {
        id: authUser.user.id,
        email,
        name,
        role: 'influencer'
      }
    }), {
      status: 201,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error: any) {
    console.error('Edge Function error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal Server Error'
    }), {
      status: error.message?.includes('Unauthorized') ? 403 : 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}); 