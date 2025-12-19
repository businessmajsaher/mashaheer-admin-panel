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

    // Parse webhook payload
    const payload: HesabeWebhookPayload = await req.json();
    console.log('Webhook Payload:', JSON.stringify(payload, null, 2));

    // Extract transaction details
    const transactionToken = payload.token || payload.transaction_token;
    const referenceNumber = payload.reference_number || payload.order_reference_number;
    const status = payload.status?.toUpperCase();
    const amount = payload.amount;
    const paymentType = payload.payment_type;
    const datetime = payload.datetime;

    // Validate required fields
    if (!transactionToken || !referenceNumber || !status) {
      console.error('Missing required fields:', { transactionToken, referenceNumber, status });
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          received: { transactionToken, referenceNumber, status }
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
          .in('status', ['pending', 'processing'])
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
          .in('status', ['pending', 'processing'])
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
      console.warn('Tried: exact match, booking ID extraction, UUID pattern matching');
      
      // Try to extract booking ID and create payment if it doesn't exist
      let bookingId: string | null = null;
      
      if (referenceNumber.startsWith('MH_')) {
        const parts = referenceNumber.split('_');
        if (parts.length >= 2) {
          bookingId = parts[1];
        }
      } else {
        // Try UUID pattern
        const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
        const uuidMatch = referenceNumber.match(uuidPattern);
        if (uuidMatch) {
          bookingId = uuidMatch[0];
        }
      }

      // If we have booking ID, try to create payment record
      if (bookingId && status === 'SUCCESSFUL') {
        console.log('Attempting to create payment record for booking:', bookingId);
        console.log('Status check:', { status, isSuccessful: status === 'SUCCESSFUL' });
        
        // Get booking details
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .select('customer_id, influencer_id')
          .eq('id', bookingId)
          .single();

        if (bookingError) {
          console.error('❌ Error fetching booking:', bookingError);
          console.error('Booking ID:', bookingId);
        } else if (!booking) {
          console.error('❌ Booking not found for ID:', bookingId);
        } else {
          console.log('✅ Booking found:', {
            booking_id: bookingId,
            customer_id: booking.customer_id,
            influencer_id: booking.influencer_id
          });

          // Validate required fields
          if (!booking.customer_id) {
            console.error('❌ Booking missing customer_id');
          } else if (!booking.influencer_id) {
            console.error('❌ Booking missing influencer_id');
          } else {
            // Create payment record
            const paymentData = {
              booking_id: bookingId,
              payer_id: booking.customer_id,
              payee_id: booking.influencer_id,
              amount: parseFloat(amount || '0'),
              currency: 'KWD',
              status: 'completed',
              transaction_reference: referenceNumber,
              payment_method: paymentType || 'KNET',
              paid_at: datetime ? new Date(datetime).toISOString() : new Date().toISOString()
            };
            
            console.log('Attempting to insert payment with data:', paymentData);
            
            const { data: newPayment, error: createError } = await supabase
              .from('payments')
              .insert(paymentData)
              .select()
              .single();

            if (createError) {
              console.error('❌ Failed to create payment record');
              console.error('Error details:', {
                message: createError.message,
                code: createError.code,
                details: createError.details,
                hint: createError.hint
              });
              console.error('Payment data attempted:', paymentData);
            } else if (newPayment) {
              console.log('✅ Created payment record:', newPayment.id);
              payment = newPayment;
              
              // Update booking status to payment confirmed
              const { data: paymentConfirmedStatus } = await supabase
                .from('booking_statuses')
                .select('id')
                .eq('name', 'payment confirmed')
                .maybeSingle();

              if (paymentConfirmedStatus) {
                const { error: bookingUpdateError } = await supabase
                  .from('bookings')
                  .update({
                    status_id: paymentConfirmedStatus.id,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', bookingId);
                
                if (bookingUpdateError) {
                  console.error('Error updating booking status:', bookingUpdateError);
                } else {
                  console.log('✅ Updated booking status to payment confirmed');
                }
              } else {
                console.warn('⚠️ Payment confirmed status not found in booking_statuses');
              }
            } else {
              console.error('❌ Payment insert returned no data and no error');
            }
          }
        }
      } else {
        if (!bookingId) {
          console.warn('⚠️ No booking ID extracted from reference:', referenceNumber);
        }
        if (status !== 'SUCCESSFUL') {
          console.warn('⚠️ Status is not SUCCESSFUL:', status);
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
    if (status === 'SUCCESSFUL' || status === 'SUCCESS') {
      paymentStatus = 'completed';
    } else if (status === 'FAILED' || status === 'FAILURE') {
      paymentStatus = 'failed';
    } else if (status === 'PENDING' || status === 'PROCESSING') {
      paymentStatus = 'processing';
    }

    // Update payment record
    // Note: updated_at column doesn't exist in payments table, so we don't update it
    const updateData: any = {
      status: paymentStatus
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
        .eq('name', 'payment confirmed')
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
              console.log('✅ Payment receipt sent to customer');
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
              console.log('✅ Notification sent to customer');
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
              console.log('✅ Notification sent to influencer');
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

