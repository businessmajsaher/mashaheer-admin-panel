import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Hesabe API credentials
const HESABE_MERCHANT_CODE = Deno.env.get('HESABE_MERCHANT_CODE') || '842217';
const HESABE_MERCHANT_SECRET_KEY = Deno.env.get('HESABE_MERCHANT_SECRET_KEY') || 'PkW64zMe5NVdrlPVNnjo2Jy9nOb7v1Xg';
const HESABE_API_KEY = Deno.env.get('HESABE_API_KEY') || 'c333729b-d060-4b74-a49d-7686a8353481';
const HESABE_IV_KEY = Deno.env.get('HESABE_IV_KEY') || '5NVdrlPVNnjo2Jy9';

// Hesabe API endpoints
const HESABE_BASE_URL = 'https://merchantapisandbox.hesabe.com';
const HESABE_INVOICE_URL = `${HESABE_BASE_URL}/api/v1/invoice`;

// Encrypt data using AES-256-CBC (Hesabe requirement)
async function encryptData(data: string, key: string, iv: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);
  const keyBytes = encoder.encode(key.substring(0, 32));
  const ivBytes = encoder.encode(iv.substring(0, 16));
  
  // In production, use proper AES-256-CBC encryption
  // For now, return base64 encoded (Hesabe may have their own encryption method)
  return btoa(data);
}

// Generate Hesabe request signature using Deno's built-in crypto
async function generateSignature(data: string, secretKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(data);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req: Request) => {
  console.log('=== GET HESABE INVOICE EDGE FUNCTION ===');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Get authorization token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Unauthorized: Missing token');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify admin user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized: Invalid token');
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    // Get invoice ID from query parameters
    const url = new URL(req.url);
    const invoiceId = url.searchParams.get('invoice_id');

    if (!invoiceId) {
      throw new Error('Missing required parameter: invoice_id');
    }

    // Prepare request data for Hesabe
    const requestData = {
      merchantCode: HESABE_MERCHANT_CODE,
      invoiceId: invoiceId
    };

    // Encrypt request data
    const requestDataString = JSON.stringify(requestData);
    const encryptedData = await encryptData(requestDataString, HESABE_API_KEY, HESABE_IV_KEY);
    
    // Generate signature
    const signature = await generateSignature(encryptedData, HESABE_MERCHANT_SECRET_KEY);

    // Call Hesabe invoice API
    const hesabeResponse = await fetch(`${HESABE_INVOICE_URL}/${invoiceId}?data=${encryptedData}`, {
      method: 'GET',
      headers: {
        'accessCode': HESABE_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const hesabeResponseData = await hesabeResponse.json();
    console.log('Hesabe Invoice Response:', hesabeResponseData);

    if (!hesabeResponse.ok) {
      throw new Error(hesabeResponseData.message || 'Failed to fetch invoice details');
    }

    // Extract payment gateway charges from transaction
    const transaction = hesabeResponseData.transaction;
    const pgCharge = transaction ? parseFloat(transaction.commission || '0') : 0;
    const netAmount = transaction ? parseFloat(transaction.net_amount || '0') : 0;
    const grossAmount = transaction ? parseFloat(transaction.amount || '0') : 0;

    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        invoice: {
          id: hesabeResponseData.id,
          amount: grossAmount,
          net_amount: netAmount,
          pg_charge: pgCharge,
          commission: pgCharge,
          service_charge: parseFloat(hesabeResponseData.service_charge || '0'),
          transaction: transaction
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Get invoice error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to fetch invoice details'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

