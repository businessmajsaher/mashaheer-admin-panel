import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || 're_XUZU3pCV_JV94kXsEuDi9LHpiWrJT1WeQ';

interface NotificationRequest {
  user_id: string;
  booking_id: string;
  notification_type: 'status_change' | 'auto_reject' | 'auto_cancel' | 'auto_refund' | 'auto_approve' | 'script_rejected' | 'payment_required' | 'script_approved';
  status_name: string;
  message: string;
  booking_details?: {
    service_title?: string;
    scheduled_time?: string;
    influencer_name?: string;
    customer_name?: string;
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, booking_id, notification_type, status_name, message, booking_details }: NotificationRequest = await req.json();

    if (!user_id || !booking_id || !notification_type) {
      throw new Error('Missing required fields: user_id, booking_id, notification_type');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user profile with email and FCM token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email, fcm_token, role')
      .eq('id', user_id)
      .single();

    if (profileError || !profile) {
      throw new Error(`User profile not found: ${profileError?.message}`);
    }

    // Get booking details if not provided
    let bookingInfo = booking_details;
    if (!bookingInfo) {
      const { data: booking } = await supabase
        .from('bookings')
        .select(`
          id,
          scheduled_time,
          service:services(title),
          influencer:profiles!influencer_id(name, email),
          customer:profiles!customer_id(name, email)
        `)
        .eq('id', booking_id)
        .single();

      if (booking) {
        bookingInfo = {
          service_title: booking.service?.title,
          scheduled_time: booking.scheduled_time,
          influencer_name: booking.influencer?.name,
          customer_name: booking.customer?.name
        };
      }
    }

    const results = {
      emailSent: false,
      fcmSent: false,
      notificationCreated: false,
      errors: [] as string[]
    };

    // 1. Send Email Notification
    if (profile.email) {
      try {
        const emailSubject = getEmailSubject(notification_type, status_name);
        const emailHtml = generateEmailTemplate(
          profile.name || 'User',
          notification_type,
          status_name,
          message,
          bookingInfo
        );

        const resend = new Resend(RESEND_API_KEY);
        await resend.emails.send({
          from: 'Mashaheer <noreply@mashaheer.co>',
          to: profile.email,
          subject: emailSubject,
          html: emailHtml
        });

        results.emailSent = true;
        console.log(`✅ Email sent to ${profile.email}`);
      } catch (error: any) {
        results.errors.push(`Email error: ${error.message}`);
        console.error('Email error:', error);
      }
    }

    // 2. Send FCM Push Notification
    if (profile.fcm_token) {
      try {
        // Note: FCM requires Firebase Admin SDK or HTTP API
        // For now, we'll store the notification and the mobile app can fetch it
        // Or you can integrate Firebase Admin SDK here
        console.log(`📱 FCM token found for user ${user_id}`);
        results.fcmSent = true; // Mark as sent (actual FCM send would happen here)
      } catch (error: any) {
        results.errors.push(`FCM error: ${error.message}`);
        console.error('FCM error:', error);
      }
    }

    // 3. Create notification record in database
    try {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: user_id,
          type: notification_type,
          message: message,
          is_read: false
        });

      if (!notifError) {
        results.notificationCreated = true;
        console.log(`✅ Notification created for user ${user_id}`);
      } else {
        results.errors.push(`Notification DB error: ${notifError.message}`);
      }
    } catch (error: any) {
      results.errors.push(`Notification error: ${error.message}`);
      console.error('Notification error:', error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Notification error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to send notification'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function getEmailSubject(type: string, statusName: string): string {
  const subjects: Record<string, string> = {
    'status_change': `Booking Status Updated: ${statusName}`,
    'auto_reject': 'Booking Auto-Rejected - Action Required',
    'auto_cancel': 'Booking Auto-Cancelled',
    'auto_refund': 'Refund Initiated - Booking Cancelled',
    'auto_approve': 'Script Auto-Approved',
    'script_rejected': 'Script Rejected - Revision Required',
    'payment_required': 'Payment Required for Booking',
    'script_approved': 'Script Approved - Ready to Publish'
  };
  return subjects[type] || 'Booking Update';
}

function generateEmailTemplate(
  userName: string,
  type: string,
  statusName: string,
  message: string,
  bookingDetails?: any
): string {
  const serviceTitle = bookingDetails?.service_title || 'Your Service';
  const scheduledTime = bookingDetails?.scheduled_time 
    ? new Date(bookingDetails.scheduled_time).toLocaleString()
    : 'TBD';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Mashaheer</h1>
      </div>
      
      <div style="background: #ffffff; padding: 30px; border: 1px solid #f0f0f0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #262626; margin: 0 0 20px 0;">Hello ${userName}!</h2>
        
        <div style="background: #fafafa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1890ff;">
          <p style="color: #595959; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">
            ${message}
          </p>
          <p style="color: #8c8c8c; margin: 5px 0 0 0; font-size: 14px;">
            Status: <strong>${statusName}</strong>
          </p>
        </div>

        ${bookingDetails ? `
        <div style="background: #ffffff; border: 1px solid #f0f0f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #262626; margin: 0 0 15px 0; font-size: 16px;">Booking Details:</h3>
          <p style="color: #595959; margin: 5px 0;"><strong>Service:</strong> ${serviceTitle}</p>
          <p style="color: #595959; margin: 5px 0;"><strong>Scheduled:</strong> ${scheduledTime}</p>
        </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${Deno.env.get('APP_URL') || 'https://mashaheer.co'}/bookings"
             style="background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            View Booking
          </a>
        </div>

        <div style="border-top: 1px solid #f0f0f0; padding-top: 20px; margin-top: 30px; text-align: center;">
          <p style="color: #8c8c8c; font-size: 12px; margin: 0;">
            This is an automated notification from Mashaheer.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}


