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
    if (!staffUserId) {
      return new Response(JSON.stringify({ error: "Missing staff_user_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: staff, error: staffErr } = await supabase
      .from("staff_users")
      .select("id, auth_user_id, email, full_name, designation_id, is_active")
      .eq("id", staffUserId)
      .maybeSingle();
    if (staffErr) throw staffErr;
    if (!staff) {
      return new Response(JSON.stringify({ error: "Staff not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hasEmail = Object.prototype.hasOwnProperty.call(body, "email");
    const hasFullName = Object.prototype.hasOwnProperty.call(body, "full_name");
    const hasDesignation = Object.prototype.hasOwnProperty.call(body, "designation_id");
    const hasActive = Object.prototype.hasOwnProperty.call(body, "is_active");

    if (!hasEmail && !hasFullName && !hasDesignation && !hasActive) {
      return new Response(JSON.stringify({ error: "No fields to update" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newEmail = hasEmail ? String(body.email || "").trim().toLowerCase() : null;
    if (hasEmail && !newEmail) {
      return new Response(JSON.stringify({ error: "Email cannot be empty" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let desigId: string | null = null;
    if (hasDesignation) {
      desigId = body.designation_id === null || body.designation_id === "" ? null : String(body.designation_id);
      if (desigId) {
        const { data: desig, error: desigErr } = await supabase
          .from("designations")
          .select("id")
          .eq("id", desigId)
          .maybeSingle();
        if (desigErr) throw desigErr;
        if (!desig) {
          return new Response(JSON.stringify({ error: "Invalid designation_id" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    if (hasEmail && newEmail && newEmail !== String(staff.email || "").toLowerCase()) {
      const { error: authErr } = await supabase.auth.admin.updateUserById(staff.auth_user_id, {
        email: newEmail,
        email_confirm: true,
      });
      if (authErr) {
        return new Response(
          JSON.stringify({
            error: "Failed to update auth email",
            details: authErr.message,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const profilePatch: Record<string, string> = { email: newEmail };
      if (hasFullName && String(body.full_name || "").trim()) {
        profilePatch.name = String(body.full_name).trim();
      }

      const { error: profErr } = await supabase
        .from("profiles")
        .update(profilePatch)
        .eq("id", staff.auth_user_id);
      if (profErr) {
        console.error("admin-update-staff: profiles email sync failed:", profErr);
      }
    }

    const staffPatch: Record<string, unknown> = {};
    if (hasEmail && newEmail) staffPatch.email = newEmail;
    if (hasFullName) staffPatch.full_name = String(body.full_name || "").trim();
    if (hasDesignation) staffPatch.designation_id = desigId;
    if (hasActive) staffPatch.is_active = !!body.is_active;

    if (Object.keys(staffPatch).length > 0) {
      const { error: suErr } = await supabase.from("staff_users").update(staffPatch).eq("id", staff.id);
      if (suErr) throw suErr;
    }

    if (hasDesignation) {
      const { data: authUser, error: guErr } = await supabase.auth.admin.getUserById(staff.auth_user_id);
      if (guErr) throw guErr;
      const meta = { ...(authUser?.user?.user_metadata ?? {}) };
      meta.designation_id = desigId;
      const { error: metaErr } = await supabase.auth.admin.updateUserById(staff.auth_user_id, {
        user_metadata: meta,
      });
      if (metaErr) {
        console.error("admin-update-staff: user_metadata sync failed:", metaErr);
      }
    }

    if (hasFullName && !(hasEmail && newEmail && newEmail !== String(staff.email || "").toLowerCase())) {
      const fn = String(body.full_name || "").trim();
      const { error: profNameErr } = await supabase
        .from("profiles")
        .update({ name: fn })
        .eq("id", staff.auth_user_id);
      if (profNameErr) {
        console.error("admin-update-staff: profiles name sync failed:", profNameErr);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message.includes("Unauthorized") ? 403 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
