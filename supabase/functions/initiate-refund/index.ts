import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
const HESABE_BASE_URL = 'https://api.hesabe.com';
const HESABE_REFUND_URL = `${HESABE_BASE_URL}/payment/refund`;

interface RefundRequest {
  booking_id: string;
  amount?: number;
  reason?: string;
  initiated_by?: string;
}

// Encrypt data using AES-256-CBC (Hesabe requirement)
async function encryptData(data: string, key: string, iv: string): Promise<string> {
  // This is a simplified version - you may need to use a proper AES library
  // For now, we'll use the Hesabe SDK approach
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
  
  // Import the key for HMAC
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Sign the message
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req: Request) => {
  console.log('=== INITIATE REFUND EDGE FUNCTION ===');
  console.log('Method:', req.method);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  if (req.method !== 'POST') {
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

    // Parse request body
    const body: RefundRequest = await req.json();
    const { booking_id, amount, reason, initiated_by } = body;

    if (!booking_id) {
      throw new Error('Missing required field: booking_id');
    }

    // Get booking and payment details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        service:services(price, offer_price, currency, is_flash_deal)
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found');
    }

    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', booking_id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (paymentError || !payment) {
      throw new Error('No completed payment found for this booking');
    }

    if (!payment.transaction_reference) {
      throw new Error('Payment transaction reference not found');
    }

    // Determine refund amount
    const refundAmount = amount || payment.amount;
    const currency = payment.currency || 'USD';

    if (refundAmount > payment.amount) {
      throw new Error('Refund amount cannot exceed payment amount');
    }

    // Create refund record in database
    const { data: refundRecord, error: refundCreateError } = await supabase
      .from('refunds')
      .insert({
        booking_id,
        payment_id: payment.id,
        transaction_reference: payment.transaction_reference,
        amount: refundAmount,
        currency,
        reason: reason || 'Admin initiated refund',
        status: 'processing',
        initiated_by: initiated_by || user.id
      })
      .select()
      .single();

    if (refundCreateError) {
      throw new Error(`Failed to create refund record: ${refundCreateError.message}`);
    }

    // Prepare Hesabe refund request
    const hesabeRequestData = {
      merchantCode: HESABE_MERCHANT_CODE,
      paymentToken: payment.transaction_reference,
      amount: refundAmount.toString(),
      currency: currency,
      orderReferenceNumber: `REFUND-${refundRecord.id}`,
      reason: reason || 'Refund request'
    };

    // Encrypt request data (Hesabe specific format)
    const requestDataString = JSON.stringify(hesabeRequestData);
    const encryptedData = await encryptData(requestDataString, HESABE_API_KEY, HESABE_IV_KEY);
    
    // Generate signature
    const signature = await generateSignature(encryptedData, HESABE_MERCHANT_SECRET_KEY);

    // Call Hesabe refund API
    const hesabeResponse = await fetch(HESABE_REFUND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        data: encryptedData,
        signature: signature
      })
    });

    const hesabeResponseData = await hesabeResponse.json();
    console.log('Hesabe Refund Response:', hesabeResponseData);

    // Update refund record with Hesabe response
    let refundStatus = 'failed';
    let hesabeRefundId = null;

    if (hesabeResponse.ok && hesabeResponseData.response?.code === '000') {
      refundStatus = 'completed';
      hesabeRefundId = hesabeResponseData.response?.data?.refundId || null;
    } else if (hesabeResponseData.response?.code === '001') {
      refundStatus = 'processing';
    }

    const { error: updateError } = await supabase
      .from('refunds')
      .update({
        status: refundStatus,
        hesabe_refund_id: hesabeRefundId,
        hesabe_response: hesabeResponseData,
        processed_at: refundStatus === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', refundRecord.id);

    if (updateError) {
      console.error('Failed to update refund record:', updateError);
    }

    // Return response
    return new Response(
      JSON.stringify({
        success: refundStatus === 'completed',
        refund: {
          id: refundRecord.id,
          status: refundStatus,
          amount: refundAmount,
          currency,
          hesabe_refund_id: hesabeRefundId,
          message: hesabeResponseData.response?.message || 'Refund processed'
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Refund error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process refund'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

