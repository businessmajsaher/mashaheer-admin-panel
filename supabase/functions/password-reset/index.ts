import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY');

// Simple API key check for admin operations
async function checkAuthorization(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized: Missing token');
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  if (!token) {
    throw new Error('Unauthorized: Invalid token');
  }
  
  return { token };
}

serve(async (req: Request) => {
  console.log('=== PASSWORD RESET EDGE FUNCTION ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  if (req.method !== 'POST') {
    console.log('Invalid method:', req.method);
    return new Response('Method Not Allowed', {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    console.log('Processing password reset request...');
    
    // Check authorization for admin operations
    await checkAuthorization(req);
    console.log('Authorization passed');
    
    // Parse request body
    const rawBody = await req.text();
    console.log('Request body:', rawBody);
    
    let bodyData;
    try {
      bodyData = JSON.parse(rawBody);
      console.log('Parsed body data:', bodyData);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({
        error: 'Invalid JSON in request body',
        details: parseError.message
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    const { email, redirect_url } = bodyData;
    
    console.log('Email:', email);
    console.log('Redirect URL:', redirect_url);
    
    if (!email) {
      console.log('Missing required field: email');
      return new Response(JSON.stringify({
        error: 'Missing required field: email'
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

    // Check if user exists
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error fetching users:', userError);
      return new Response(JSON.stringify({
        error: 'Failed to check user existence',
        details: userError.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const user = userData.users.find(u => u.email === email);
    
    if (!user) {
      console.log('User not found:', email);
      return new Response(JSON.stringify({
        error: 'User not found',
        message: 'No account found with this email address'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Generate password reset token
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirect_url || `${SUPABASE_URL}/auth/v1/verify?redirect_to=${encodeURIComponent('https://your-domain.com/password-reset-callback.html')}`
      }
    });

    if (resetError) {
      console.error('Password reset error:', resetError);
      return new Response(JSON.stringify({
        error: 'Failed to generate password reset link',
        details: resetError.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log('Password reset link generated successfully');

    return new Response(JSON.stringify({
      success: true,
      message: 'Password reset link generated successfully',
      reset_link: resetData.properties?.action_link,
      user: {
        id: user.id,
        email: user.email
      }
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error: any) {
    console.error('=== EDGE FUNCTION ERROR ===');
    console.error('Error type:', typeof error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
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

