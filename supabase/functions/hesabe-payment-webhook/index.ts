// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HesabeWebhookPayload {
  blocks?: any[];
  token?: string;
  amount?: string;
  reference_number?: string;
  status?: string;
  payment_type?: string;
  service_type?: string;
  datetime?: string;
  // Alternative field names that might be used
  transaction_token?: string;
  order_reference_number?: string;
}

/** Statuses we still consider "open" for MH_ / booking lookups (Flutter may use paid vs pending). */
const OPEN_PAYMENT_STATUSES = ['pending', 'processing', 'paid', 'initiated', 'created'];

/**
 * Hesabe sometimes sends Slack-style `blocks` with fields instead of (or in addition to) top-level keys.
 */
function extractFromBlocks(blocks: unknown): Partial<HesabeWebhookPayload> {
  const out: Partial<HesabeWebhookPayload> = {};
  if (!Array.isArray(blocks)) return out;
  for (const block of blocks as any[]) {
    if (block?.type === 'header' && block?.text?.text) {
      const h = String(block.text.text).toUpperCase();
      if (h.includes('SUCCESSFUL')) out.status = out.status || 'SUCCESSFUL';
      else if (h.includes('FAIL') || h.includes('DECLIN')) out.status = out.status || 'FAILED';
    }
    if (block?.type !== 'section' || !Array.isArray(block?.fields)) continue;
    for (const field of block.fields) {
      const text =
        typeof field?.text === 'string' ? field.text : field?.text?.text;
      if (typeof text !== 'string') continue;
      const lines = text.split('\n').map((l: string) => l.trim());
      const labelRaw = lines[0] || '';
      const label = labelRaw.replace(/\*/g, '').replace(/:$/, '').trim().toLowerCase();
      const value = (lines[1] ?? labelRaw.replace(/^\*[^*]+\*\s*/, '')).trim();

      if (label.includes('transaction token')) out.token = out.token || value;
      else if (label.includes('order reference')) out.reference_number = out.reference_number || value;
      else if (label === 'amount' || (label.includes('amount') && !label.includes('auth')))
        out.amount = out.amount || value.replace(/^KWD\s*/i, '').trim();
      else if (label.includes('payment type')) out.payment_type = out.payment_type || value;
      else if (label.includes('date') && label.includes('time')) out.datetime = out.datetime || value;
    }
  }
  return out;
}

async function readWebhookBody(req: Request): Promise<any> {
  const ct = (req.headers.get('content-type') || '').toLowerCase();
  const rawText = await req.text();
  if (!rawText?.trim()) {
    console.warn('Empty webhook body');
    return {};
  }
  if (ct.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(rawText);
    const obj: Record<string, string> = {};
    params.forEach((v, k) => {
      obj[k] = v;
    });
    if (obj.data) {
      try {
        const inner = JSON.parse(obj.data);
        return { ...obj, ...inner };
      } catch {
        console.warn('Could not parse form field `data` as JSON');
      }
    }
    return obj;
  }
  try {
    return JSON.parse(rawText);
  } catch (e) {
    console.warn('Body is not JSON. First 240 chars:', rawText.slice(0, 240), e);
    return {};
  }
}

function mergeHesabePayload(raw: any): HesabeWebhookPayload {
  const fromBlocks = extractFromBlocks(raw?.blocks);
  return { ...fromBlocks, ...raw } as HesabeWebhookPayload;
}

function parseBookingIdFromReference(referenceNumber: string): string | null {
  if (referenceNumber.startsWith('MH_')) {
    const parts = referenceNumber.split('_');
    if (parts.length >= 2) return parts[1];
    return null;
  }
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const uuidMatch = referenceNumber.match(uuidPattern);
  return uuidMatch ? uuidMatch[0] : null;
}

serve(async (req: Request) => {
  console.log('=== HESABE WEBHOOK RECEIVED ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed. Only POST is accepted.' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  // Optional: Verify Hesabe signature if secret is configured
  const HESABE_WEBHOOK_SECRET = Deno.env.get('HESABE_WEBHOOK_SECRET');
  if (HESABE_WEBHOOK_SECRET) {
    const signature = req.headers.get('x-hesabe-signature') || req.headers.get('X-Hesabe-Signature');
    if (signature) {
      // TODO: Implement signature verification based on Hesabe's method
      // This would verify the webhook is actually from Hesabe
      console.log('Signature received:', signature);
    }
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const rawBody = await readWebhookBody(req);
    const payload = mergeHesabePayload(rawBody);
    console.log('Webhook Payload (merged):', JSON.stringify(payload, null, 2));

    const referenceNumber = String(
      payload.reference_number ||
        payload.order_reference_number ||
        (rawBody as any).orderReferenceNumber ||
        (rawBody as any).referenceNumber ||
        ''
    ).trim();
    const status = String(payload.status || '')
      .trim()
      .toUpperCase();
    const transactionToken = String(
      payload.token ||
        payload.transaction_token ||
        (rawBody as any).transactionToken ||
        referenceNumber ||
        ''
    ).trim();
    const amount = payload.amount ?? (rawBody as any).amount;
    const paymentType = payload.payment_type;
    const datetime = payload.datetime;

    // reference + status are required; token is optional (some Hesabe callbacks omit it)
    if (!referenceNumber || !status) {
      console.error('Missing required fields:', { transactionToken, referenceNumber, status });
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          received: { transactionToken, referenceNumber, status, keys: Object.keys(rawBody || {}) }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Processing webhook:', {
      transactionToken,
      referenceNumber,
      status,
      amount,
      paymentType,
      datetime
    });

    // Find payment by reference number (order_reference_number)
    // Try multiple lookup strategies
    let payment: any = null;
    let paymentError: any = null;

    // Strategy 1: Exact match on transaction_reference
    let result = await supabase
      .from('payments')
      .select('*, booking:bookings(id, customer_id, influencer_id, scheduled_time, service:services(title))')
      .eq('transaction_reference', referenceNumber)
      .maybeSingle();

    if (result.error) {
      paymentError = result.error;
      console.error('Error finding payment (exact match):', paymentError);
    } else if (result.data) {
      payment = result.data;
      console.log('Found payment by exact reference match:', payment.id);
    }

    // Strategy 2: If reference starts with MH_, try extracting booking ID
    if (!payment && referenceNumber.startsWith('MH_')) {
      console.log('Reference starts with MH_, trying to extract booking ID...');
      // Format: MH_<booking-id>_<timestamp>
      const parts = referenceNumber.split('_');
      if (parts.length >= 2) {
        const bookingId = parts[1]; // Second part should be booking ID
        console.log('Extracted booking ID:', bookingId);
        
        // Try to find payment by booking_id (most recent pending payment)
        result = await supabase
          .from('payments')
          .select('*, booking:bookings(id, customer_id, influencer_id, scheduled_time, service:services(title))')
          .eq('booking_id', bookingId)
          .in('status', OPEN_PAYMENT_STATUSES)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (result.error) {
          console.error('Error finding payment by booking ID:', result.error);
        } else if (result.data) {
          payment = result.data;
          console.log('Found payment by booking ID:', payment.id);
        }
      }
    }

    // Strategy 3: Try partial match (reference contains booking ID)
    if (!payment && referenceNumber.includes('-')) {
      // Try to find UUID pattern in reference (booking ID format)
      const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      const uuidMatch = referenceNumber.match(uuidPattern);
      if (uuidMatch) {
        const possibleBookingId = uuidMatch[0];
        console.log('Found UUID pattern in reference, trying booking ID:', possibleBookingId);

        result = await supabase
          .from('payments')
          .select('*, booking:bookings(id, customer_id, influencer_id, scheduled_time, service:services(title))')
          .eq('booking_id', possibleBookingId)
          .in('status', OPEN_PAYMENT_STATUSES)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (result.error) {
          console.error('Error finding payment by extracted booking ID:', result.error);
        } else if (result.data) {
          payment = result.data;
          console.log('Found payment by extracted booking ID:', payment.id);
        }
      }
    }

    // Strategy 4: Latest payment for booking when open-status lookup missed (e.g. status stored differently)
    if (!payment) {
      const bid = parseBookingIdFromReference(referenceNumber);
      if (bid) {
        console.log('Strategy 4: latest payment for booking (any status):', bid);
        result = await supabase
          .from('payments')
          .select('*, booking:bookings(id, customer_id, influencer_id, scheduled_time, service:services(title))')
          .eq('booking_id', bid)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (result.error) {
          console.error('Error finding payment (strategy 4):', result.error);
        } else if (result.data) {
          payment = result.data;
          console.log('Found payment by strategy 4 (latest for booking):', payment.id);
        }
      }
    }

    if (paymentError && !payment) {
      return new Response(
        JSON.stringify({ error: 'Database error while finding payment' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!payment) {
      console.warn('Payment not found for reference:', referenceNumber);
      console.warn('Tried: exact match, booking ID extraction, UUID pattern matching, latest-for-booking');

      // Try to extract booking ID and create payment if it doesn't exist
      const bookingId = parseBookingIdFromReference(referenceNumber);
      // If we have booking ID, try to create payment record
      if (bookingId && (status === 'SUCCESSFUL' || status === 'SUCCESS' || status === 'PAID')) {
        console.log('Attempting to create payment record for booking:', bookingId);
        
        // Get booking details
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .select('customer_id, influencer_id')
          .eq('id', bookingId)
          .single();

        if (!bookingError && booking) {
          // Create payment record
          const { data: newPayment, error: createError } = await supabase
            .from('payments')
            .insert({
              booking_id: bookingId,
              payer_id: booking.customer_id,
              payee_id: booking.influencer_id,
              amount: parseFloat(amount || '0'),
              currency: 'KWD',
              status: 'completed',
              transaction_reference: referenceNumber,
              payment_method: paymentType || 'KNET',
              paid_at: datetime ? new Date(datetime).toISOString() : new Date().toISOString()
            })
            .select()
            .single();

          if (!createError && newPayment) {
            console.log('âœ… Created payment record:', newPayment.id);
            payment = newPayment;
            
            // Update booking status to payment confirmed
            const { data: paymentConfirmedStatus } = await supabase
              .from('booking_statuses')
              .select('id')
              .ilike('name', 'payment confirmed')
              .maybeSingle();

            if (paymentConfirmedStatus) {
              await supabase
                .from('bookings')
                .update({
                  status_id: paymentConfirmedStatus.id,
                  updated_at: new Date().toISOString()
                })
                .eq('id', bookingId);
              
              console.log('âœ… Updated booking status to payment confirmed');
            }
          } else {
            console.error('Failed to create payment record:', createError);
          }
        }
      }

      // If still no payment, log and return
      if (!payment) {
        // Log available payments for debugging
        const { data: recentPayments } = await supabase
          .from('payments')
          .select('id, booking_id, transaction_reference, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5);
        
        console.log('Recent payments in database:', recentPayments);
        
        // Still return 200 to Hesabe so they don't retry
        return new Response(
          JSON.stringify({ 
            message: 'Payment not found and could not be created',
            reference_number: referenceNumber,
            booking_id: bookingId || 'unknown',
            note: 'Payment record should be created before sending to Hesabe'
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    console.log('Found payment:', payment.id);

    // Determine payment status
    let paymentStatus = 'pending';
    if (status === 'SUCCESSFUL' || status === 'SUCCESS' || status === 'PAID') {
      paymentStatus = 'completed';
    } else if (status === 'FAILED' || status === 'FAILURE') {
      paymentStatus = 'failed';
    } else if (status === 'PENDING' || status === 'PROCESSING') {
      paymentStatus = 'processing';
    }

    // Update payment record
    const updateData: any = {
      status: paymentStatus,
      updated_at: new Date().toISOString()
    };

    // If payment is successful, set paid_at timestamp
    if (paymentStatus === 'completed') {
      updateData.paid_at = datetime 
        ? new Date(datetime).toISOString() 
        : new Date().toISOString();
      
      // Update transaction_reference if it's missing or different
      // Use the reference_number from webhook as it's the authoritative source
      if (referenceNumber && referenceNumber !== payment.transaction_reference) {
        updateData.transaction_reference = referenceNumber;
        console.log('Updating transaction_reference from', payment.transaction_reference, 'to', referenceNumber);
      }
      
      // Also update with transaction token if provided and different
      if (transactionToken && transactionToken !== payment.transaction_reference && transactionToken !== referenceNumber) {
        // Store token separately or update if reference wasn't set
        if (!payment.transaction_reference) {
          updateData.transaction_reference = transactionToken;
        }
      }
    }

    const { error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', payment.id);

    if (updateError) {
      console.error('Error updating payment:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update payment record' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Payment updated successfully:', payment.id, 'Status:', paymentStatus);

    // If payment is successful, update booking status
    if (paymentStatus === 'completed' && payment.booking) {
      const booking = payment.booking;
      
      // Get "payment confirmed" status ID
      const { data: statusData } = await supabase
        .from('booking_statuses')
        .select('id')
        .ilike('name', 'payment confirmed')
        .maybeSingle();

      if (statusData) {
        const { error: bookingUpdateError } = await supabase
          .from('bookings')
          .update({
            status_id: statusData.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.id);

        if (bookingUpdateError) {
          console.error('Error updating booking status:', bookingUpdateError);
        } else {
          console.log('Booking status updated to payment confirmed:', booking.id);

          // Send payment receipt and notifications to customer and influencer
          try {
            const receiptUrl = `${SUPABASE_URL}/functions/v1/send-payment-receipt`;
            const notificationUrl = `${SUPABASE_URL}/functions/v1/send-booking-notification`;
            
            // 1. Send payment receipt email to customer
            try {
              await fetch(receiptUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
                },
                body: JSON.stringify({
                  payment_id: payment.id,
                  user_id: booking.customer_id,
                  booking_id: booking.id
                })
              });
              console.log('âœ… Payment receipt sent to customer');
            } catch (receiptError) {
              console.error('Error sending payment receipt:', receiptError);
            }

            // 2. Send notification email and FCM to customer
            try {
              await fetch(notificationUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
                },
                body: JSON.stringify({
                  user_id: booking.customer_id,
                  booking_id: booking.id,
                  notification_type: 'payment_success',
                  status_name: 'Payment Confirmed',
                  message: 'Your payment has been confirmed successfully.',
                  booking_details: {
                    id: booking.id,
                    scheduled_time: booking.scheduled_time,
                    service_title: booking.service?.title
                  }
                })
              });
              console.log('âœ… Notification sent to customer');
            } catch (notifError) {
              console.error('Error sending customer notification:', notifError);
            }

            // 3. Send notification email and FCM to influencer
            try {
              await fetch(notificationUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
                },
                body: JSON.stringify({
                  user_id: booking.influencer_id,
                  booking_id: booking.id,
                  notification_type: 'payment_success',
                  status_name: 'Payment Confirmed',
                  message: 'Payment has been confirmed for your booking.',
                  booking_details: {
                    id: booking.id,
                    scheduled_time: booking.scheduled_time,
                    service_title: booking.service?.title
                  }
                })
              });
              console.log('âœ… Notification sent to influencer');
            } catch (notifError) {
              console.error('Error sending influencer notification:', notifError);
            }
          } catch (notificationError) {
            console.error('Error sending notifications:', notificationError);
            // Don't fail the webhook if notifications fail
          }
        }
      }
    }

    // Return success response to Hesabe
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processed successfully',
        payment_id: payment.id,
        status: paymentStatus
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

