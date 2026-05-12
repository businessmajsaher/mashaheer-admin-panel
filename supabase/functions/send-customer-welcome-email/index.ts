// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "https://esm.sh/resend@2.0.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { email, recipientEmail, name, appUrl, password, emailKind } = body as {
      email?: string
      recipientEmail?: string
      name?: string
      appUrl?: string
      password?: string
      emailKind?: string
    }

    const isPasswordReset = emailKind === "admin_password_reset"

    if (!email || !name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, name" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    if (isPasswordReset && !password) {
      return new Response(
        JSON.stringify({ error: "Missing required field: password" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    const loginUrl = appUrl || Deno.env.get("CUSTOMER_APP_URL") || `${req.headers.get("origin") || ""}/login`

    const nameEscaped = escapeHtml(name.trim())
    const loginEmailEscaped = escapeHtml(email.trim())
    const passwordEscaped = isPasswordReset && password ? escapeHtml(password) : ""
    const recipientEscaped =
      isPasswordReset && recipientEmail && recipientEmail.trim()
        ? escapeHtml(recipientEmail.trim())
        : ""
    const mismatchNote =
      isPasswordReset &&
      recipientEscaped &&
      recipientEmail &&
      recipientEmail.trim().toLowerCase() !== email.trim().toLowerCase()
        ? `<div style="background:#e6f7ff;border:1px solid #91d5ff;border-radius:8px;padding:14px;margin-bottom:18px;">
             <p style="color:#0958d9;margin:0;font-size:14px;line-height:1.6;">
               This message was sent to <strong>${recipientEscaped}</strong>. Sign in with the <strong>email shown under â€œYour login credentialsâ€</strong> â€” that is the address tied to your account.
             </p>
           </div>`
        : ""

    const welcomeHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%); border-radius: 8px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Mashaheer!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">We're excited to help you book amazing experiences.</p>
          </div>

          <div style="background: #f6ffed; padding: 24px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #52c41a;">
            <h2 style="color: #262626; margin: 0 0 15px 0; font-size: 22px;">Hello ${nameEscaped}!</h2>
            <p style="color: #595959; margin: 0 0 15px 0; line-height: 1.6; font-size: 16px;">
              Your customer account has been successfully created. You can now explore our creator marketplace, browse services, and make bookings directly from the Mashaheer app.
            </p>
            <p style="color: #595959; margin: 0; line-height: 1.6; font-size: 16px;">
              Log in to personalize your profile, manage bookings, and stay updated with exclusive offers.
            </p>
          </div>

          <div style="background: #ffffff; border: 1px solid #f0f0f0; border-radius: 8px; padding: 24px; margin-bottom: 25px;">
            <h3 style="color: #262626; margin: 0 0 18px 0; font-size: 18px;">Here's how to get started:</h3>
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
              ðŸŒŸ Explore the Mashaheer App
            </a>
          </div>

          <div style="background: #fafafa; padding: 20px; border-radius: 8px; border: 1px solid #f0f0f0;">
            <h4 style="color: #389e0d; margin: 0 0 12px 0; font-size: 16px;">Need help?</h4>
            <p style="color: #595959; margin: 0; line-height: 1.6; font-size: 14px;">
              If you have any questions, reply to this email or reach out to our support teamâ€” we're here to help!
            </p>
          </div>

          <div style="border-top: 1px solid #f0f0f0; padding-top: 20px; margin-top: 30px; text-align: center;">
            <p style="color: #8c8c8c; font-size: 12px; margin: 0;">
              You're receiving this email because you created a customer account on Mashaheer.
            </p>
            <p style="color: #8c8c8c; font-size: 12px; margin: 4px 0 0 0;">
              Â© ${new Date().getFullYear()} Mashaheer. All rights reserved.
            </p>
          </div>
        </div>
      `

    const resetHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%); border-radius: 8px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Your password was reset</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Mashaheer customer account</p>
          </div>

          ${mismatchNote}

          <div style="background: #f6ffed; padding: 24px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #52c41a;">
            <h2 style="color: #262626; margin: 0 0 15px 0; font-size: 22px;">Hello ${nameEscaped}!</h2>
            <p style="color: #595959; margin: 0; line-height: 1.6; font-size: 16px;">
              An administrator generated a new password for your account. Use the credentials below to sign in. For security, please change your password after you log in.
            </p>
          </div>

          <div style="background: #fff; border: 2px solid #d9f7be; border-radius: 8px; padding: 25px; margin-bottom: 25px;">
            <h3 style="color: #262626; margin: 0 0 20px 0; font-size: 18px; text-align: center;">Your login credentials</h3>
            <div style="background: #f6ffed; padding: 20px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #b7eb8f;">
              <div style="margin-bottom: 10px;">
                <strong style="color: #389e0d; font-size: 14px;">EMAIL (use this to sign in)</strong>
                <div style="color: #262626; font-size: 16px; font-weight: 500; margin-top: 5px;">${loginEmailEscaped}</div>
              </div>
              <div>
                <strong style="color: #389e0d; font-size: 14px;">NEW PASSWORD</strong>
                <div style="color: #262626; font-size: 16px; font-weight: 500; margin-top: 5px; font-family: monospace; background: #f5f5f5; padding: 8px; border-radius: 4px; display: inline-block;">${passwordEscaped}</div>
              </div>
            </div>
            <div style="background: #fffbe6; border: 1px solid #ffe58f; border-radius: 6px; padding: 15px;">
              <p style="color: #ad6800; margin: 0; font-size: 14px; font-weight: 500;">
                <strong>Security tip:</strong> Change this password from your account settings after signing in.
              </p>
            </div>
          </div>

          <div style="border-top: 1px solid #f0f0f0; padding-top: 20px; margin-top: 30px; text-align: center;">
            <p style="color: #8c8c8c; font-size: 12px; margin: 0;">
              You're receiving this email because an admin reset your Mashaheer customer password.
            </p>
            <p style="color: #8c8c8c; font-size: 12px; margin: 4px 0 0 0;">
              Â© ${new Date().getFullYear()} Mashaheer. All rights reserved.
            </p>
          </div>
        </div>
      `

    const deliverTo =
      isPasswordReset && recipientEmail && recipientEmail.trim()
        ? recipientEmail.trim()
        : email.trim()

    const emailContent = {
      to: deliverTo,
      subject: isPasswordReset
        ? "Mashaheer â€” Your new password"
        : "Welcome to Mashaheer â€” Your Customer Account Is Ready!",
      html: isPasswordReset ? resetHtml : welcomeHtml,
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY")
    if (!resendApiKey) {
      throw new Error("Missing RESEND_API_KEY secret")
    }

    const resend = new Resend(resendApiKey)
    const result = await resend.emails.send({
      from: "Mashaheer <noreply@mashaheer.co>",
      to: deliverTo,
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
    console.error("âŒ Error sending customer welcome email:", error)

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


