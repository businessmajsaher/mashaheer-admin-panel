import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, name, password, loginUrl } = await req.json()

    if (!email || !name || !password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, name, password' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create email content
    const emailContent = {
      to: email,
      subject: 'Welcome to Mashaheer - Your Influencer Account is Ready!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%); border-radius: 8px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Mashaheer!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your influencer journey starts here</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #1890ff;">
            <h2 style="color: #262626; margin: 0 0 15px 0; font-size: 22px;">Hello ${name}!</h2>
            <p style="color: #595959; margin: 0 0 15px 0; line-height: 1.6; font-size: 16px;">
              Your influencer account has been successfully created and verified. You can now access your influencer app and start managing your profile, connecting with brands, and growing your influence.
            </p>
            <p style="color: #595959; margin: 0; line-height: 1.6; font-size: 16px;">
              We're excited to have you join our community of talented influencers!
            </p>
          </div>
          
          <div style="background: #fff; border: 2px solid #e6f7ff; border-radius: 8px; padding: 25px; margin-bottom: 25px;">
            <h3 style="color: #262626; margin: 0 0 20px 0; font-size: 18px; text-align: center;">🔐 Your Login Credentials</h3>
            <div style="background: #f0f8ff; padding: 20px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #d6e4ff;">
              <div style="margin-bottom: 10px;">
                <strong style="color: #1890ff; font-size: 14px;">EMAIL ADDRESS:</strong>
                <div style="color: #262626; font-size: 16px; font-weight: 500; margin-top: 5px;">${email}</div>
              </div>
              <div>
                <strong style="color: #1890ff; font-size: 14px;">PASSWORD:</strong>
                <div style="color: #262626; font-size: 16px; font-weight: 500; margin-top: 5px; font-family: monospace; background: #f5f5f5; padding: 8px; border-radius: 4px; display: inline-block;">${password}</div>
              </div>
            </div>
            <div style="background: #fff2e8; border: 1px solid #ffd591; border-radius: 6px; padding: 15px;">
              <p style="color: #d46b08; margin: 0; font-size: 14px; font-weight: 500;">
                ⚠️ <strong>Security Notice:</strong> Please change your password after your first login for security purposes.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" 
               style="background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3); transition: all 0.3s ease;">
              🚀 Access Your Influencer App
            </a>
          </div>
          
          <div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h4 style="color: #1890ff; margin: 0 0 15px 0; font-size: 16px;">What's Next?</h4>
            <ul style="color: #595959; margin: 0; padding-left: 20px; line-height: 1.6;">
              <li>Complete your influencer profile with bio and social media links</li>
              <li>Upload your portfolio and showcase your work</li>
              <li>Set your collaboration preferences and rates</li>
              <li>Start connecting with brands and opportunities</li>
              <li>Explore our marketplace for collaboration opportunities</li>
              <li>Track your performance and earnings</li>
            </ul>
          </div>
          
          <div style="border-top: 1px solid #f0f0f0; padding-top: 20px; margin-top: 30px; text-align: center;">
            <p style="color: #8c8c8c; font-size: 12px; margin: 0;">
              This is an automated message from Mashaheer. Please do not reply to this email.
            </p>
            <p style="color: #8c8c8c; font-size: 12px; margin: 5px 0 0 0;">
              If you have any questions, please contact our support team.
            </p>
          </div>
        </div>
      `
    }

    // Initialize Resend with API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || 're_XUZU3pCV_JV94kXsEuDi9LHpiWrJT1WeQ'
    const resend = new Resend(resendApiKey)
    
    console.log('📧 Sending welcome email to:', email)
    console.log('📧 Email subject:', emailContent.subject)
    console.log('📧 Login URL:', loginUrl)
    
    // Send email using Resend
    const result = await resend.emails.send({
      from: 'Mashaheer <noreply@mashaheer.co>',
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
    })
    
    console.log('✅ Email sent successfully:', result)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Welcome email sent successfully',
        email: email,
        emailId: result.id,
        resendResponse: result
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error sending welcome email:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send welcome email' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
