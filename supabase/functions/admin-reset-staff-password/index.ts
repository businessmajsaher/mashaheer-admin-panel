// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY")!;

function generatePassword(length = 14): string {
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digit = "0123456789";
  const symbol = "!@#$%^&*";
  const all = lower + upper + digit + symbol;
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  const pick = (set: string, n: number) => set[n % set.length];
  const out = [
    pick(lower, buf[0]),
    pick(upper, buf[1]),
    pick(digit, buf[2]),
    pick(symbol, buf[3]),
  ];
  for (let i = 4; i < length; i++) out.push(pick(all, buf[i]));
  for (let i = out.length - 1; i > 0; i--) {
    const r = new Uint8Array(1);
    crypto.getRandomValues(r);
    const j = r[0] % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join("");
}

async function requireSuperAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized: Missing token");
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized: Invalid token");
  const { data: ok } = await supabase.rpc("is_super_admin", { uid: data.user.id });
  if (!ok) throw new Error("Unauthorized: Super admin required");
  return { supabase };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { supabase } = await requireSuperAdmin(req);

    const body = await req.json();
    const staffUserId = body.staff_user_id ? String(body.staff_user_id) : "";
    const loginUrl = body.login_url ? String(body.login_url) : undefined;

    if (!staffUserId) {
      return new Response(JSON.stringify({ error: "Missing staff_user_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: staff, error: staffErr } = await supabase
      .from("staff_users")
      .select("id, full_name, email, auth_user_id, designation_id")
      .eq("id", staffUserId)
      .maybeSingle();
    if (staffErr) throw staffErr;
    if (!staff) {
      return new Response(JSON.stringify({ error: "Staff not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newPassword = generatePassword(14);
    const { error: updErr } = await supabase.auth.admin.updateUserById(staff.auth_user_id, {
      password: newPassword,
    });
    if (updErr) {
      return new Response(JSON.stringify({
        error: "Failed to update password", details: updErr.message,
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Force change on next login.
    await supabase
      .from("staff_users")
      .update({ force_password_reset: true })
      .eq("id", staff.id);

    // Use canonical email from auth.users so we never email the wrong one.
    const { data: authAfter } = await supabase.auth.admin.getUserById(staff.auth_user_id);
    const loginEmail = authAfter?.user?.email || staff.email;

    let designationName: string | null = null;
    if (staff.designation_id) {
      const { data: d } = await supabase.from("designations").select("name").eq("id", staff.designation_id).maybeSingle();
      designationName = d?.name ?? null;
    }

    const appUrl = loginUrl || Deno.env.get("ADMIN_APP_URL") || `${SUPABASE_URL.replace(/\/$/, "")}/admin/login`;
    const mailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-staff-welcome-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      body: JSON.stringify({
        email: loginEmail,
        name: staff.full_name,
        password: newPassword,
        loginUrl: appUrl,
        designation: designationName,
        kind: "admin_password_reset",
      }),
    });
    const mailPayload = await mailRes.json().catch(() => ({}));
    const mailOk = mailRes.ok && mailPayload.success !== false;

    return new Response(JSON.stringify({
      success: true,
      email_sent: mailOk,
      email: loginEmail,
      email_error: mailOk ? undefined : (mailPayload.error || `HTTP ${mailRes.status}`),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message.includes("Unauthorized") ? 403 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
