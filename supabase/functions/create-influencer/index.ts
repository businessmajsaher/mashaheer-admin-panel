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
  // Log the complete request details
  console.log('=== EDGE FUNCTION REQUEST LOG ===');
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
    console.log('Processing POST request...');
    
    // Check authorization (basic token check)
    await checkAuthorization(req);
    console.log('Authorization passed');
    
    // Log the raw request body for debugging
    const rawBody = await req.text();
    console.log('=== REQUEST BODY DETAILS ===');
    console.log('Raw request body length:', rawBody.length);
    console.log('Raw request body:', rawBody);
    console.log('Raw body type:', typeof rawBody);
    console.log('Raw body is empty?', rawBody === '');
    
    // Parse request body
    let bodyData;
    try {
      bodyData = JSON.parse(rawBody);
      console.log('=== PARSED BODY DATA ===');
      console.log('Parsed body data:', bodyData);
      console.log('Parsed body type:', typeof bodyData);
      console.log('Parsed body keys:', Object.keys(bodyData));
      console.log('Is bodyData an object?', typeof bodyData === 'object' && bodyData !== null);
    } catch (parseError) {
      console.error('=== JSON PARSE ERROR ===');
      console.error('Failed to parse JSON:', parseError);
      console.error('Parse error message:', parseError.message);
      return new Response(JSON.stringify({
        error: 'Invalid JSON in request body',
        details: parseError.message,
        rawBody: rawBody.substring(0, 200) + (rawBody.length > 200 ? '...' : '')
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    const { email, password, name, bio, profile_image_url, is_verified } = bodyData;
    
    // Log individual fields for debugging
    console.log('=== EXTRACTED FIELDS ===');
    console.log('Email:', email, 'Type:', typeof email, 'Present:', !!email);
    console.log('Password:', password ? '[HIDDEN]' : 'missing', 'Type:', typeof password, 'Present:', !!password);
    console.log('Name:', name, 'Type:', typeof name, 'Present:', !!name);
    console.log('Bio:', bio, 'Type:', typeof bio, 'Present:', !!bio);
    console.log('Profile Image URL:', profile_image_url, 'Type:', typeof profile_image_url, 'Present:', !!profile_image_url);
    console.log('Is Verified:', is_verified, 'Type:', typeof is_verified, 'Present:', !!is_verified);
    
    if (!email || !password || !name) {
      console.log('=== MISSING REQUIRED FIELDS ===');
      console.log('Missing required fields. Email:', !!email, 'Password:', !!password, 'Name:', !!name);
      console.log('Email value:', email);
      console.log('Password value:', password ? '[HIDDEN]' : 'missing');
      console.log('Name value:', name);
      console.log('All body keys:', Object.keys(bodyData));
      console.log('Body data stringified:', JSON.stringify(bodyData, null, 2));
      
      return new Response(JSON.stringify({
        error: 'Missing required fields: email, password, name',
        received: {
          email: !!email,
          password: !!password,
          name: !!name,
          bodyKeys: Object.keys(bodyData),
          emailValue: email,
          nameValue: name,
          passwordPresent: !!password
        }
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log('=== ALL REQUIRED FIELDS PRESENT ===');
    console.log('Proceeding with user creation...');

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

    console.log('=== SUCCESS ===');
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
    console.error('=== EDGE FUNCTION ERROR ===');
    console.error('Error type:', typeof error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error object:', error);
    
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