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
  return { supabase, caller: data.user };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { supabase, caller } = await requireSuperAdmin(req);

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.full_name || body.name || "").trim();
    const designationId = body.designation_id ? String(body.designation_id) : null;
    const loginUrl = body.login_url ? String(body.login_url) : undefined;
    const isActive = body.is_active === false ? false : true;

    if (!email || !fullName) {
      return new Response(JSON.stringify({ error: "Missing required: email, full_name" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (designationId) {
      const { data: desig, error: desigErr } = await supabase
        .from("designations").select("id, name").eq("id", designationId).maybeSingle();
      if (desigErr) throw desigErr;
      if (!desig) {
        return new Response(JSON.stringify({ error: "Invalid designation_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const tempPassword = generatePassword(14);

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name: fullName,
        role: "staff",
        designation_id: designationId,
        email_verified: true,
      },
    });

    if (createErr || !created?.user) {
      return new Response(JSON.stringify({
        error: "Failed to create auth user",
        details: createErr?.message || "unknown",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authUserId = created.user.id;

    const { data: staffRow, error: staffErr } = await supabase
      .from("staff_users")
      .insert({
        auth_user_id: authUserId,
        full_name: fullName,
        email,
        designation_id: designationId,
        is_active: isActive,
        force_password_reset: true,
        created_by: caller.id,
      })
      .select("id, full_name, email, designation_id, is_active")
      .single();

    if (staffErr) {
      // Roll back auth user so the system stays consistent.
      try { await supabase.auth.admin.deleteUser(authUserId); } catch (_) {}
      return new Response(JSON.stringify({
        error: "Failed to create staff_users row",
        details: staffErr.message,
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch designation name for the email
    let designationName: string | null = null;
    if (designationId) {
      const { data: d } = await supabase.from("designations").select("name").eq("id", designationId).maybeSingle();
      designationName = d?.name ?? null;
    }

    const appUrl = loginUrl || Deno.env.get("ADMIN_APP_URL") || `${SUPABASE_URL.replace(/\/$/, "")}/admin/login`;
    const mailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-staff-welcome-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      body: JSON.stringify({
        email,
        name: fullName,
        password: tempPassword,
        loginUrl: appUrl,
        designation: designationName,
        kind: "staff_welcome",
      }),
    });
    const mailPayload = await mailRes.json().catch(() => ({}));
    const mailOk = mailRes.ok && mailPayload.success !== false;

    return new Response(JSON.stringify({
      success: true,
      staff: { id: staffRow.id, auth_user_id: authUserId, ...staffRow },
      email_sent: mailOk,
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
