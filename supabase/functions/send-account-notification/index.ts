import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';
// Import jose for JWT signing
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts';

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
    notification_type: 'verification_approved' | 'verification_rejected' | 'account_update';
    message: string;
}

// Function to get access token from Service Account JSON
async function getAccessToken(serviceAccountJson: any) {
    try {
        const alg = 'RS256';
        const privateKey = await jose.importPKCS8(serviceAccountJson.private_key, alg);

        const jwt = await new jose.SignJWT({
            iss: serviceAccountJson.client_email,
            scope: 'https://www.googleapis.com/auth/firebase.messaging',
            aud: 'https://oauth2.googleapis.com/token'
        })
            .setProtectedHeader({ alg })
            .setIssuedAt()
            .setExpirationTime('1h')
            .sign(privateKey);

        const params = new URLSearchParams();
        params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
        params.append('assertion', jwt);

        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        const data = await res.json();
        return data.access_token;
    } catch (err) {
        console.error('Error generating access token:', err);
        throw err;
    }
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { user_id, notification_type, message }: NotificationRequest = await req.json();

        if (!user_id || !notification_type) {
            throw new Error('Missing required fields: user_id, notification_type');
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

        const results = {
            emailSent: false,
            fcmSent: false,
            notificationCreated: false,
            errors: [] as string[]
        };

        // 1. Send Email Notification
        if (profile.email) {
            try {
                const emailSubject = getEmailSubject(notification_type);
                const emailHtml = generateEmailTemplate(
                    profile.name || 'User',
                    notification_type,
                    message
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

        // 2. Send FCM Push Notification (V1 API)
        if (profile.fcm_token) {
            try {
                const serviceAccountStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');

                if (serviceAccountStr) {
                    const serviceAccount = JSON.parse(serviceAccountStr);
                    const projectId = serviceAccount.project_id;
                    const accessToken = await getAccessToken(serviceAccount);

                    if (!accessToken) throw new Error('Failed to generate access token');

                    const fcmTitle = getFCMTitle(notification_type);
                    const fcmBody = message;

                    const fcmResponse = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}`
                        },
                        body: JSON.stringify({
                            message: {
                                token: profile.fcm_token,
                                notification: {
                                    title: fcmTitle,
                                    body: fcmBody
                                },
                                data: {
                                    type: notification_type,
                                    click_action: 'FLUTTER_NOTIFICATION_CLICK'
                                },
                                android: {
                                    priority: 'high'
                                },
                                apns: {
                                    payload: {
                                        aps: {
                                            sound: 'default'
                                        }
                                    }
                                }
                            }
                        })
                    });

                    if (fcmResponse.ok) {
                        results.fcmSent = true;
                        console.log(`✅ FCM notification sent to user ${user_id}`);
                    } else {
                        const fcmError = await fcmResponse.text();
                        throw new Error(`FCM V1 API error: ${fcmError}`);
                    }
                } else {
                    console.log(`⚠️ FIREBASE_SERVICE_ACCOUNT_JSON not set. Skipping FCM.`);
                    results.errors.push('FCM configuration missing');
                }
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

function getEmailSubject(type: string): string {
    const subjects: Record<string, string> = {
        'verification_approved': 'Account Verified - Welcome to Mashaheer',
        'verification_rejected': 'Account Verification Update',
        'account_update': 'Account Status Update'
    };
    return subjects[type] || 'Account Notification';
}

function getFCMTitle(type: string): string {
    const titles: Record<string, string> = {
        'verification_approved': 'Account Verified ✓',
        'verification_rejected': 'Verification Update',
        'account_update': 'Account Update'
    };
    return titles[type] || 'Account Update';
}

function generateEmailTemplate(
    userName: string,
    type: string,
    message: string
): string {
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
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${Deno.env.get('APP_URL') || 'https://mashaheer.co'}"
             style="background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            Go to App
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
