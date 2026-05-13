// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, name, password, loginUrl, designation, kind } = await req.json();
    if (!email || !name || !password) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, name, password" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const isReset = kind === "admin_password_reset";
    const safeName = escapeHtml(String(name));
    const safeEmail = escapeHtml(String(email));
    const safePassword = escapeHtml(String(password));
    const safeDesignation = designation ? escapeHtml(String(designation)) : "";
    const url =
      loginUrl ||
      Deno.env.get("ADMIN_APP_URL") ||
      `${req.headers.get("origin") || ""}/admin/login`;

    const subject = isReset
      ? "Mashaheer Admin — Your password has been reset"
      : "Welcome to Mashaheer Admin — Your staff account is ready";

    const intro = isReset
      ? "Your administrator generated a new password for your Mashaheer Admin account. Use the credentials below to sign in. For security, change this password from your profile after you log in."
      : "You have been added to the Mashaheer Admin panel by your administrator. Use the credentials below to sign in. You will be asked to change your password after the first login.";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
        <div style="text-align:center;margin-bottom:30px;padding:20px;background:linear-gradient(135deg,#1890ff 0%,#096dd9 100%);border-radius:8px;">
          <h1 style="color:white;margin:0;font-size:28px;">${
            isReset ? "Password reset" : "Welcome to Mashaheer Admin"
          }</h1>
          <p style="color:rgba(255,255,255,0.9);margin:10px 0 0 0;font-size:16px;">
            Staff &amp; administrator portal
          </p>
        </div>

        <div style="background:#f0f5ff;padding:24px;border-radius:8px;margin-bottom:25px;border-left:4px solid #1890ff;">
          <h2 style="color:#262626;margin:0 0 15px 0;font-size:22px;">Hello ${safeName}!</h2>
          <p style="color:#595959;margin:0;line-height:1.6;font-size:16px;">${intro}</p>
        </div>

        <div style="background:#fff;border:2px solid #d6e4ff;border-radius:8px;padding:24px;margin-bottom:25px;">
          <h3 style="color:#262626;margin:0 0 18px 0;font-size:18px;text-align:center;">Your login credentials</h3>
          <div style="background:#f0f5ff;padding:18px;border-radius:6px;border:1px solid #adc6ff;">
            <div style="margin-bottom:10px;">
              <strong style="color:#1890ff;font-size:14px;">EMAIL (use this to sign in)</strong>
              <div style="color:#262626;font-size:16px;font-weight:500;margin-top:5px;">${safeEmail}</div>
            </div>
            <div>
              <strong style="color:#1890ff;font-size:14px;">${
                isReset ? "NEW PASSWORD" : "TEMPORARY PASSWORD"
              }</strong>
              <div style="color:#262626;font-size:16px;font-weight:500;margin-top:5px;font-family:monospace;background:#f5f5f5;padding:8px;border-radius:4px;display:inline-block;">${safePassword}</div>
            </div>
            ${
              safeDesignation
                ? `<div style="margin-top:10px;"><strong style="color:#1890ff;font-size:14px;">DESIGNATION</strong><div style="color:#262626;font-size:16px;font-weight:500;margin-top:5px;">${safeDesignation}</div></div>`
                : ""
            }
          </div>
          <div style="background:#fffbe6;border:1px solid #ffe58f;border-radius:6px;padding:14px;margin-top:14px;">
            <p style="color:#ad6800;margin:0;font-size:14px;font-weight:500;">
              <strong>Security tip:</strong> ${
                isReset
                  ? "Change this password from your profile after signing in."
                  : "You will be asked to change your password after the first login."
              }
            </p>
          </div>
        </div>

        <div style="text-align:center;margin:30px 0;">
          <a href="${url}" style="background:#1890ff;color:white;padding:14px 30px;text-decoration:none;border-radius:6px;font-weight:500;display:inline-block;">
            Open admin panel
          </a>
        </div>

        <div style="border-top:1px solid #f0f0f0;padding-top:20px;margin-top:30px;text-align:center;">
          <p style="color:#8c8c8c;font-size:12px;margin:0;">
            You're receiving this because an administrator ${
              isReset ? "reset your password" : "created your staff account"
            } in Mashaheer Admin.
          </p>
          <p style="color:#8c8c8c;font-size:12px;margin:4px 0 0 0;">
            © ${new Date().getFullYear()} Mashaheer. All rights reserved.
          </p>
        </div>
      </div>
    `;

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) throw new Error("Missing RESEND_API_KEY secret");

    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: "Mashaheer Admin <noreply@mashaheer.co>",
      to: email,
      subject,
      html,
    });

    return new Response(
      JSON.stringify({ success: true, email, emailId: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("send-staff-welcome-email error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message || "Failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
