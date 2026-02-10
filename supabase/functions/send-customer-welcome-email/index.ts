import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "https://esm.sh/resend@2.0.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { email, name, appUrl } = await req.json()

    if (!email || !name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, name" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    const loginUrl = appUrl || Deno.env.get("CUSTOMER_APP_URL") || `${req.headers.get("origin") || ""}/login`

    const emailContent = {
      to: email,
      subject: "Welcome to Mashaheer — Your Customer Account Is Ready!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%); border-radius: 8px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Mashaheer!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">We’re excited to help you book amazing experiences.</p>
          </div>

          <div style="background: #f6ffed; padding: 24px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #52c41a;">
            <h2 style="color: #262626; margin: 0 0 15px 0; font-size: 22px;">Hello ${name}!</h2>
            <p style="color: #595959; margin: 0 0 15px 0; line-height: 1.6; font-size: 16px;">
              Your customer account has been successfully created. You can now explore our creator marketplace, browse services, and make bookings directly from the Mashaheer app.
            </p>
            <p style="color: #595959; margin: 0; line-height: 1.6; font-size: 16px;">
              Log in to personalize your profile, manage bookings, and stay updated with exclusive offers.
            </p>
          </div>

          <div style="background: #ffffff; border: 1px solid #f0f0f0; border-radius: 8px; padding: 24px; margin-bottom: 25px;">
            <h3 style="color: #262626; margin: 0 0 18px 0; font-size: 18px;">Here’s how to get started:</h3>
            <ol style="color: #595959; margin: 0; padding-left: 20px; line-height: 1.6;">
              <li>Log in using the email you registered with.</li>
              <li>Complete your profile to receive personalized recommendations.</li>
              <li>Browse creators, compare offerings, and save your favorites.</li>
              <li>Book a service and manage your schedule in one place.</li>
            </ol>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${loginUrl}"
               style="background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%); color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(82, 196, 26, 0.3); transition: all 0.3s ease;">
              🌟 Explore the Mashaheer App
            </a>
          </div>

          <div style="background: #fafafa; padding: 20px; border-radius: 8px; border: 1px solid #f0f0f0;">
            <h4 style="color: #389e0d; margin: 0 0 12px 0; font-size: 16px;">Need help?</h4>
            <p style="color: #595959; margin: 0; line-height: 1.6; font-size: 14px;">
              If you have any questions, reply to this email or reach out to our support team— we’re here to help!
            </p>
          </div>

          <div style="border-top: 1px solid #f0f0f0; padding-top: 20px; margin-top: 30px; text-align: center;">
            <p style="color: #8c8c8c; font-size: 12px; margin: 0;">
              You’re receiving this email because you created a customer account on Mashaheer.
            </p>
            <p style="color: #8c8c8c; font-size: 12px; margin: 4px 0 0 0;">
              © ${new Date().getFullYear()} Mashaheer. All rights reserved.
            </p>
          </div>
        </div>
      `,
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY")
    if (!resendApiKey) {
      throw new Error("Missing RESEND_API_KEY secret")
    }

    const resend = new Resend(resendApiKey)
    const result = await resend.emails.send({
      from: "Mashaheer <noreply@mashaheer.co>",
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: "Customer welcome email sent successfully",
        email,
        emailId: result.id,
        resendResponse: result,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("❌ Error sending customer welcome email:", error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to send welcome email",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }
})


