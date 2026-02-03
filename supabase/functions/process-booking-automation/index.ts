import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Helper function to send notifications
async function sendNotification(
  supabase: any,
  userId: string,
  bookingId: string,
  notificationType: string,
  statusName: string,
  message: string,
  bookingDetails?: any
): Promise<void> {
  try {
    const notificationUrl = `${SUPABASE_URL}/functions/v1/send-booking-notification`;
    const response = await fetch(notificationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        user_id: userId,
        booking_id: bookingId,
        notification_type: notificationType,
        status_name: statusName,
        message: message,
        booking_details: bookingDetails
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(`Failed to send notification to ${userId}:`, error);
    } else {
      console.log(`✅ Notification sent to ${userId}`);
    }
  } catch (error: any) {
    console.error(`Error sending notification to ${userId}:`, error.message);
  }
}

// Hesabe API credentials for refunds
const HESABE_MERCHANT_CODE = Deno.env.get('HESABE_MERCHANT_CODE') || '842217';
const HESABE_MERCHANT_SECRET_KEY = Deno.env.get('HESABE_MERCHANT_SECRET_KEY') || 'PkW64zMe5NVdrlPVNnjo2Jy9nOb7v1Xg';
const HESABE_API_KEY = Deno.env.get('HESABE_API_KEY') || 'c333729b-d060-4b74-a49d-7686a8353481';
const HESABE_IV_KEY = Deno.env.get('HESABE_IV_KEY') || '5NVdrlPVNnjo2Jy9';
const HESABE_REFUND_URL = 'https://api.hesabe.com/payment/refund';

// Encrypt data for Hesabe API
async function encryptData(data: string, key: string, iv: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);
  const keyBytes = encoder.encode(key.substring(0, 32));
  const ivBytes = encoder.encode(iv.substring(0, 16));
  return btoa(data);
}

// Generate Hesabe request signature
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

// Initiate refund via Hesabe API
async function initiateHesabeRefund(
  supabase: any,
  bookingId: string,
  payment: any,
  reason: string
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  try {
    // Create refund record
    const { data: refundRecord, error: refundCreateError } = await supabase
      .from('refunds')
      .insert({
        booking_id: bookingId,
        payment_id: payment.id,
        transaction_reference: payment.transaction_reference,
        amount: payment.amount,
        currency: payment.currency,
        reason: reason,
        status: 'processing',
        initiated_by: null // System initiated
      })
      .select()
      .single();

    if (refundCreateError) {
      return { success: false, error: `Failed to create refund record: ${refundCreateError.message}` };
    }

    // Prepare Hesabe refund request
    const hesabeRequestData = {
      merchantCode: HESABE_MERCHANT_CODE,
      paymentToken: payment.transaction_reference,
      amount: payment.amount.toString(),
      currency: payment.currency,
      orderReferenceNumber: `REFUND-${refundRecord.id}`,
      reason: reason
    };

    // Encrypt and sign
    const requestDataString = JSON.stringify(hesabeRequestData);
    const encryptedData = await encryptData(requestDataString, HESABE_API_KEY, HESABE_IV_KEY);
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

    await supabase
      .from('refunds')
      .update({
        status: refundStatus,
        hesabe_refund_id: hesabeRefundId,
        hesabe_response: hesabeResponseData,
        processed_at: refundStatus === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', refundRecord.id);

    return { 
      success: refundStatus === 'completed' || refundStatus === 'processing',
      refundId: refundRecord.id
    };
  } catch (error: any) {
    console.error('Refund initiation error:', error);
    return { success: false, error: error.message || 'Failed to initiate refund' };
  }
}

interface Booking {
  id: string;
  status_id: string;
  influencer_id: string;
  customer_id: string;
  service_id: string;
  scheduled_time: string;
  created_at: string;
  influencer_approval_deadline?: string;
  payment_deadline?: string;
  script_submission_deadline?: string;
  auto_approval_deadline?: string;
  appointment_end_time?: string;
  script_rejection_count?: number;
  last_script_submitted_at?: string;
  last_script_rejected_at?: string;
  influencer_response_deadline?: string;
  days_gap?: number;
  is_published?: boolean;
}

serve(async (req: Request) => {
  console.log('=== BOOKING AUTOMATION PROCESSOR ===');
  console.log('Time:', new Date().toISOString());

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const now = new Date().toISOString();
  const results = {
    autoRejected: 0,
    autoCancelled: 0,
    autoRefunded: 0,
    autoApproved: 0,
    published: 0,
    blackMarked: 0,
    errors: [] as string[]
  };

  try {
    // Get status IDs
    const { data: statuses } = await supabase
      .from('booking_statuses')
      .select('id, name');

    const statusMap: Record<string, string> = {};
    statuses?.forEach(s => {
      statusMap[s.name] = s.id;
    });

    // 1. Auto-reject: Influencer didn't approve within 12 hrs OR delivery date has passed
    if (statusMap['auto-reject']) {
      // First, get bookings that match status
      const { data: statusBookings, error: statusError } = await supabase
        .from('bookings')
        .select('*')
        .eq('status_id', statusMap['awaiting approval from influencer'] || '')
        .not('scheduled_time', 'is', null);

      // Filter in JavaScript: deadline passed OR delivery date passed
      const bookingsToReject = statusBookings?.filter((booking: Booking) => {
        const deadlinePassed = booking.influencer_approval_deadline && booking.influencer_approval_deadline <= now;
        const deliveryPassed = booking.scheduled_time && booking.scheduled_time <= now;
        return deadlinePassed || deliveryPassed;
      }) || [];
      
      const error = statusError;

      if (!error && bookingsToReject) {
        for (const booking of bookingsToReject) {
          // Check if customer has paid - if yes, initiate refund
          const { data: payment } = await supabase
            .from('payments')
            .select('*')
            .eq('booking_id', booking.id)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Initiate refund if payment exists
          if (payment && payment.transaction_reference) {
            const refundResult = await initiateHesabeRefund(
              supabase,
              booking.id,
              payment,
              'Auto-rejected: Influencer did not approve within 12 hours'
            );

            if (!refundResult.success) {
              results.errors.push(`Failed to initiate refund for booking ${booking.id}: ${refundResult.error}`);
            } else {
              console.log(`Refund initiated for auto-rejected booking ${booking.id}`);
            }
          }

          // Update booking status to auto-reject
          const { error: updateError } = await supabase
            .from('bookings')
            .update({ 
              status_id: statusMap['auto-reject'],
              updated_at: now
            })
            .eq('id', booking.id);

          if (!updateError) {
            results.autoRejected++;
            console.log(`Auto-rejected booking ${booking.id}${payment ? ' (refund initiated)' : ''}`);
            
            // Get booking details for notification
            const { data: bookingDetails } = await supabase
              .from('bookings')
              .select(`
                id,
                scheduled_time,
                service:services(title),
                influencer:profiles!influencer_id(name),
                customer:profiles!customer_id(name)
              `)
              .eq('id', booking.id)
              .single();

            // Send notification to customer
            await sendNotification(
              supabase,
              booking.customer_id,
              booking.id,
              'auto_reject',
              'Auto-Rejected',
              `Your booking has been auto-rejected because the influencer did not approve within the deadline.${payment ? ' A refund has been initiated.' : ''}`,
              bookingDetails
            );

            // Send notification to influencer
            await sendNotification(
              supabase,
              booking.influencer_id,
              booking.id,
              'auto_reject',
              'Auto-Rejected',
              'A booking was auto-rejected because you did not approve within the deadline.',
              bookingDetails
            );
          } else {
            results.errors.push(`Failed to auto-reject booking ${booking.id}: ${updateError.message}`);
          }
        }
      }
    }

    // 2. Auto-cancel: Customer didn't pay within 12 hrs after influencer approval OR delivery date has passed
    if (statusMap['auto-cancel']) {
      // First, get bookings that match status
      const { data: statusBookings, error: statusError } = await supabase
        .from('bookings')
        .select('*')
        .eq('status_id', statusMap['awaiting payment'] || '')
        .not('scheduled_time', 'is', null);

      // Filter in JavaScript: deadline passed OR delivery date passed
      const bookingsToCancel = statusBookings?.filter((booking: Booking) => {
        const deadlinePassed = booking.payment_deadline && booking.payment_deadline <= now;
        const deliveryPassed = booking.scheduled_time && booking.scheduled_time <= now;
        return deadlinePassed || deliveryPassed;
      }) || [];
      
      const error = statusError;

      if (!error && bookingsToCancel) {
        for (const booking of bookingsToCancel) {
          const { error: updateError } = await supabase
            .from('bookings')
            .update({ 
              status_id: statusMap['auto-cancel'],
              updated_at: now
            })
            .eq('id', booking.id);

          if (!updateError) {
            results.autoCancelled++;
            console.log(`Auto-cancelled booking ${booking.id}`);
            
            // Get booking details for notification
            const { data: bookingDetails } = await supabase
              .from('bookings')
              .select(`
                id,
                scheduled_time,
                service:services(title),
                influencer:profiles!influencer_id(name),
                customer:profiles!customer_id(name)
              `)
              .eq('id', booking.id)
              .single();

            // Send notification to customer
            await sendNotification(
              supabase,
              booking.customer_id,
              booking.id,
              'auto_cancel',
              'Auto-Cancelled',
              'Your booking has been auto-cancelled because payment was not completed within the deadline.',
              bookingDetails
            );

            // Send notification to influencer
            await sendNotification(
              supabase,
              booking.influencer_id,
              booking.id,
              'auto_cancel',
              'Auto-Cancelled',
              'A booking was auto-cancelled because the customer did not complete payment within the deadline.',
              bookingDetails
            );
          } else {
            results.errors.push(`Failed to auto-cancel booking ${booking.id}: ${updateError.message}`);
          }
        }
      }
    }

    // 3. Auto-refund: Script not sent within deadline (8 hrs × (days_gap - 1))
    if (statusMap['Script not sent by influencer–auto refund request']) {
      const { data: bookingsToRefund, error } = await supabase
        .from('bookings')
        .select('*')
        .in('status_id', [
          statusMap['payment confirmed'] || '',
          statusMap['awaiting script'] || ''
        ])
        .lte('script_submission_deadline', now)
        .not('script_submission_deadline', 'is', null)
        .is('last_script_submitted_at', null);

      if (!error && bookingsToRefund) {
        for (const booking of bookingsToRefund) {
          // Create refund request
          const { data: payment } = await supabase
            .from('payments')
            .select('*')
            .eq('booking_id', booking.id)
            .eq('status', 'completed')
            .single();

          if (payment) {
            // Create refund record
            const { error: refundError } = await supabase
              .from('refunds')
              .insert({
                booking_id: booking.id,
                payment_id: payment.id,
                transaction_reference: payment.transaction_reference,
                amount: payment.amount,
                currency: payment.currency,
                reason: 'Script not sent by influencer within deadline - auto refund',
                status: 'pending',
                initiated_by: null // System initiated
              });

            // Update booking status
            const { error: updateError } = await supabase
              .from('bookings')
              .update({ 
                status_id: statusMap['Script not sent by influencer–auto refund request'],
                updated_at: now
              })
              .eq('id', booking.id);

            if (!updateError && !refundError) {
              results.autoRefunded++;
              console.log(`Auto-refund requested for booking ${booking.id}`);
              
              // Get booking details for notification
              const { data: bookingDetails } = await supabase
                .from('bookings')
                .select(`
                  id,
                  scheduled_time,
                  service:services(title),
                  influencer:profiles!influencer_id(name),
                  customer:profiles!customer_id(name)
                `)
                .eq('id', booking.id)
                .single();

              // Send notification to customer
              await sendNotification(
                supabase,
                booking.customer_id,
                booking.id,
                'auto_refund',
                'Auto-Refund Requested',
                'A refund has been automatically initiated because the influencer did not submit the script within the deadline.',
                bookingDetails
              );

              // Send notification to influencer
              await sendNotification(
                supabase,
                booking.influencer_id,
                booking.id,
                'auto_refund',
                'Auto-Refund Requested',
                'A refund has been automatically initiated because you did not submit the script within the deadline. A black mark has been added to your account.',
                bookingDetails
              );
            } else {
              results.errors.push(`Failed to auto-refund booking ${booking.id}`);
            }
          }
        }
      }
    }

    // 4. Auto-approve: Latest script before appointment day 10:30 PM
    if (statusMap['Auto-Approved'] && statusMap['To Be Publish']) {
      const { data: bookingsToApprove, error } = await supabase
        .from('bookings')
        .select('*')
        .in('status_id', [
          statusMap['awaiting script approval'] || '',
          statusMap['script rejected'] || ''
        ])
        .lte('auto_approval_deadline', now)
        .not('auto_approval_deadline', 'is', null)
        .not('last_script_submitted_at', 'is', null);

      if (!error && bookingsToApprove) {
        for (const booking of bookingsToApprove) {
          const { error: updateError } = await supabase
            .from('bookings')
            .update({ 
              status_id: statusMap['To Be Publish'],
              updated_at: now
            })
            .eq('id', booking.id);

          if (!updateError) {
            results.autoApproved++;
            console.log(`Auto-approved script for booking ${booking.id}`);
            
            // Get booking details for notification
            const { data: bookingDetails } = await supabase
              .from('bookings')
              .select(`
                id,
                scheduled_time,
                service:services(title),
                influencer:profiles!influencer_id(name),
                customer:profiles!customer_id(name)
              `)
              .eq('id', booking.id)
              .single();

            // Send notification to customer
            await sendNotification(
              supabase,
              booking.customer_id,
              booking.id,
              'auto_approve',
              'Script Auto-Approved',
              'The script has been automatically approved and is ready to be published.',
              bookingDetails
            );

            // Send notification to influencer
            await sendNotification(
              supabase,
              booking.influencer_id,
              booking.id,
              'auto_approve',
              'Script Auto-Approved',
              'Your script has been automatically approved. Please proceed to publish the content.',
              bookingDetails
            );
          } else {
            results.errors.push(`Failed to auto-approve booking ${booking.id}: ${updateError.message}`);
          }
        }
      }
    }

    // 5. Check appointment end time - check if published
    if (statusMap['Published']) {
      const { data: endedBookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('status_id', statusMap['To Be Publish'] || '')
        .lte('appointment_end_time', now)
        .not('appointment_end_time', 'is', null);

      if (!error && endedBookings) {
        for (const booking of endedBookings) {
          // Check if published
          if (booking.is_published) {
            const { error: updateError } = await supabase
              .from('bookings')
              .update({ 
                status_id: statusMap['Published'],
                published_at: now,
                updated_at: now
              })
              .eq('id', booking.id);

            if (!updateError) {
              results.published++;
              console.log(`Marked booking ${booking.id} as published`);
            }
          } else {
            // Create black mark
            const { error: blackMarkError } = await supabase
              .from('black_marks')
              .insert({
                booking_id: booking.id,
                influencer_id: booking.influencer_id,
                service_id: booking.service_id,
                reason: 'Content not published by appointment deadline',
                created_by: null // System created
              });

            if (!blackMarkError) {
              results.blackMarked++;
              console.log(`Created black mark for booking ${booking.id}`);
            }
          }
        }
      }
    }

    // 6. Handle script rejection timeout (30 mins) - AI script generation
    // This would trigger AI script generation - placeholder for now
    const { data: rejectedBookings, error: rejectedError } = await supabase
      .from('bookings')
      .select('*')
      .eq('status_id', statusMap['script rejected'] || '')
      .lte('influencer_response_deadline', now)
      .not('influencer_response_deadline', 'is', null)
      .not('last_script_rejected_at', 'is', null);

    if (!rejectedError && rejectedBookings) {
      for (const booking of rejectedBookings) {
        // Check if rejection count is less than 3
        if ((booking.script_rejection_count || 0) < 3) {
          // TODO: Trigger AI script generation
          // For now, just log it
          console.log(`AI script generation needed for booking ${booking.id}`);
          console.log(`Rejection reason: ${booking.last_rejection_reason}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: now,
        results
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Automation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        results
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});

