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

interface PaymentReceiptRequest {
  payment_id: string;
  user_id: string;
  booking_id: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { payment_id, user_id, booking_id }: PaymentReceiptRequest = await req.json();

    if (!payment_id || !user_id || !booking_id) {
      throw new Error('Missing required fields: payment_id, user_id, booking_id');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        booking:bookings(
          id,
          scheduled_time,
          service:services(title),
          customer:profiles!customer_id(name, email),
          influencer:profiles!influencer_id(name, email)
        )
      `)
      .eq('id', payment_id)
      .single();

    if (paymentError || !payment) {
      throw new Error(`Payment not found: ${paymentError?.message}`);
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('id', user_id)
      .single();

    if (profileError || !profile) {
      throw new Error(`User profile not found: ${profileError?.message}`);
    }

    if (!profile.email) {
      throw new Error('User email not found');
    }

    // Generate receipt email
    const receiptHtml = generateReceiptEmail(
      profile.name || 'Customer',
      payment,
      payment.booking
    );

    // Send receipt email
    const resend = new Resend(RESEND_API_KEY);
    await resend.emails.send({
      from: 'Mashaheer <noreply@mashaheer.co>',
      to: profile.email,
      subject: `Payment Receipt - ${payment.transaction_reference || 'Payment Confirmed'}`,
      html: receiptHtml
    });

    console.log(`✅ Payment receipt sent to ${profile.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment receipt sent successfully',
        email: profile.email
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Payment receipt error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to send payment receipt'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function generateReceiptEmail(
  userName: string,
  payment: any,
  booking: any
): string {
  const serviceTitle = booking?.service?.title || 'Service';
  const scheduledTime = booking?.scheduled_time 
    ? new Date(booking.scheduled_time).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'TBD';
  
  const paymentDate = payment.paid_at 
    ? new Date(payment.paid_at).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

  const amount = parseFloat(payment.amount || '0').toFixed(3);
  const currency = payment.currency || 'KWD';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
      <div style="background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">✓ Payment Receipt</h1>
      </div>
      
      <div style="background: #ffffff; padding: 30px; border: 1px solid #f0f0f0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #262626; margin: 0 0 20px 0;">Hello ${userName}!</h2>
        
        <p style="color: #595959; margin: 0 0 20px 0; font-size: 16px;">
          Thank you for your payment. Your transaction has been successfully processed.
        </p>

        <div style="background: #f6ffed; border: 1px solid #b7eb8f; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #389e0d; margin: 0 0 15px 0; font-size: 18px;">Payment Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #595959; font-size: 14px;"><strong>Transaction Reference:</strong></td>
              <td style="padding: 8px 0; color: #262626; font-size: 14px; text-align: right;">${payment.transaction_reference || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #595959; font-size: 14px;"><strong>Amount:</strong></td>
              <td style="padding: 8px 0; color: #262626; font-size: 16px; font-weight: 600; text-align: right;">${currency} ${amount}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #595959; font-size: 14px;"><strong>Payment Method:</strong></td>
              <td style="padding: 8px 0; color: #262626; font-size: 14px; text-align: right;">${payment.payment_method || 'KNET'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #595959; font-size: 14px;"><strong>Payment Date:</strong></td>
              <td style="padding: 8px 0; color: #262626; font-size: 14px; text-align: right;">${paymentDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #595959; font-size: 14px;"><strong>Status:</strong></td>
              <td style="padding: 8px 0; color: #52c41a; font-size: 14px; font-weight: 600; text-align: right;">✓ Completed</td>
            </tr>
          </table>
        </div>

        <div style="background: #ffffff; border: 1px solid #f0f0f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #262626; margin: 0 0 15px 0; font-size: 16px;">Booking Details</h3>
          <p style="color: #595959; margin: 5px 0;"><strong>Service:</strong> ${serviceTitle}</p>
          <p style="color: #595959; margin: 5px 0;"><strong>Scheduled:</strong> ${scheduledTime}</p>
          ${booking?.customer?.name ? `<p style="color: #595959; margin: 5px 0;"><strong>Customer:</strong> ${booking.customer.name}</p>` : ''}
          ${booking?.influencer?.name ? `<p style="color: #595959; margin: 5px 0;"><strong>Influencer:</strong> ${booking.influencer.name}</p>` : ''}
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${Deno.env.get('APP_URL') || 'https://mashaheer.co'}/bookings/${payment.booking_id}"
             style="background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            View Booking
          </a>
        </div>

        <div style="border-top: 1px solid #f0f0f0; padding-top: 20px; margin-top: 30px; text-align: center;">
          <p style="color: #8c8c8c; font-size: 12px; margin: 0;">
            This is an automated receipt from Mashaheer. Please keep this email for your records.
          </p>
          <p style="color: #8c8c8c; font-size: 12px; margin: 5px 0 0 0;">
            If you have any questions about this payment, please contact our support team.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}


