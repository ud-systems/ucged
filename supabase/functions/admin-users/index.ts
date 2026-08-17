import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/require-admin.ts";

const MIN_PASSWORD_LEN = 8;

type AppRole = "admin" | "salesperson" | "cge" | "supervisor";

function jsonErr(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonOk(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function roleWriteError(message: string) {
  if (/invalid input value for enum/i.test(message) && /supervisor/i.test(message)) {
    return "The supervisor role is not enabled in the database yet. Run ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor'; in the SQL Editor, then try again.";
  }
  return message;
}

function pickRoleRow(rows: { role: AppRole; salesperson_name: string | null }[]) {
  if (!rows.length) return null;
  const admin = rows.find((r) => r.role === "admin");
  if (admin) return admin;
  const supervisor = rows.find((r) => r.role === "supervisor");
  if (supervisor) return supervisor;
  const cge = rows.find((r) => r.role === "cge");
  if (cge) return cge;
  return rows[0];
}

function shopifyLabelFromRows(rows: { role: AppRole; salesperson_name: string | null }[]) {
  const sp = rows.find((r) => r.role === "salesperson");
  const named = rows.find((r) => (r.salesperson_name || "").trim());
  return (sp?.salesperson_name || named?.salesperson_name || null);
}

async function upsertRole(
  supabase: SupabaseClient,
  user_id: string,
  role: AppRole,
  salesperson_name: string | null,
) {
  const { data: existing } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", user_id)
    .eq("role", role)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from("user_roles")
      .update({ salesperson_name })
      .eq("user_id", user_id)
      .eq("role", role);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("user_roles").insert({ user_id, role, salesperson_name });
  if (error) throw error;
}

async function deleteRolesNotIn(supabase: SupabaseClient, user_id: string, keep: AppRole[]) {
  const { data: rows, error: readErr } = await supabase.from("user_roles").select("role").eq("user_id", user_id);
  if (readErr) throw readErr;
  const keepSet = new Set(keep);
  for (const row of rows || []) {
    const role = row.role as AppRole;
    if (keepSet.has(role)) continue;
    const { error } = await supabase.from("user_roles").delete().eq("user_id", user_id).eq("role", role);
    if (error) throw error;
  }
}

async function handleList(supabase: SupabaseClient) {
  const { data: rolesData, error: rolesErr } = await supabase
    .from("user_roles")
    .select("id, user_id, role, salesperson_name");
  if (rolesErr) return jsonErr(rolesErr.message, 500);

  const rolesByUser = new Map<string, { role: AppRole; salesperson_name: string | null }[]>();
  for (const r of rolesData || []) {
    const list = rolesByUser.get(r.user_id) || [];
    list.push({ role: r.role as AppRole, salesperson_name: r.salesperson_name });
    rolesByUser.set(r.user_id, list);
  }

  const allUsers: { id: string; email?: string; created_at: string; user_metadata?: Record<string, unknown> }[] = [];
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) return jsonErr(error.message, 500);
    const batch = data.users;
    allUsers.push(...batch);
    if (batch.length < perPage) break;
    page++;
  }

  const users = allUsers.map((u) => {
    const rows = rolesByUser.get(u.id) || [];
    const roleRow = pickRoleRow(rows);
    const meta = u.user_metadata || {};
    const full_name = String(meta.full_name || meta.name || "");
    const has_salesperson = rows.some((r) => r.role === "salesperson");
    return {
      id: u.id,
      email: u.email ?? null,
      full_name,
      created_at: u.created_at,
      role: roleRow?.role ?? null,
      roles: rows.map((r) => r.role),
      salesperson_name: shopifyLabelFromRows(rows),
      has_salesperson,
      has_role_row: !!roleRow,
    };
  });

  return jsonOk({ users });
}

async function handleCreate(
  supabase: SupabaseClient,
  body: Record<string, unknown>,
) {
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const full_name = String(body.full_name || "").trim();
  const role = body.role as AppRole;
  let salesperson_name = body.salesperson_name != null ? String(body.salesperson_name).trim() : "";

  if (!email || !email.includes("@")) return jsonErr("A valid email is required", 400);
  if (password.length < MIN_PASSWORD_LEN) {
    return jsonErr(`Password must be at least ${MIN_PASSWORD_LEN} characters`, 400);
  }
  if (role !== "admin" && role !== "salesperson" && role !== "cge" && role !== "supervisor") return jsonErr("Invalid role", 400);
  if (role === "salesperson" && !salesperson_name) {
    salesperson_name = full_name || email.split("@")[0] || "Salesperson";
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      ...(full_name ? { full_name, name: full_name } : {}),
    },
  });
  if (authError) return jsonErr(authError.message, 400);
  const user = authData.user;
  if (!user) return jsonErr("User creation failed", 500);

  const displayName = salesperson_name || full_name || null;
  const { error: roleErr } = await supabase.from("user_roles").insert({
    user_id: user.id,
    role,
    salesperson_name: role === "admin" ? null : displayName,
  });
  if (roleErr) {
    await supabase.auth.admin.deleteUser(user.id);
    return jsonErr(roleWriteError(roleErr.message), 500);
  }

  if (role === "supervisor" && salesperson_name) {
    const { error: spErr } = await supabase.from("user_roles").insert({
      user_id: user.id,
      role: "salesperson",
      salesperson_name,
    });
    if (spErr) {
      await supabase.auth.admin.deleteUser(user.id);
      return jsonErr(roleWriteError(spErr.message), 500);
    }
  }

  return jsonOk({ success: true, user: { id: user.id, email: user.email } });
}

async function handleUpdate(
  supabase: SupabaseClient,
  body: Record<string, unknown>,
  callerId: string,
) {
  const user_id = String(body.user_id || "");
  if (!user_id) return jsonErr("user_id is required", 400);

  const emailRaw = body.email;
  const hasEmail = emailRaw !== undefined && emailRaw !== null && String(emailRaw).trim() !== "";
  const email = hasEmail ? String(emailRaw).trim().toLowerCase() : undefined;
  const password = body.password != null ? String(body.password) : "";
  const hasFullName = body.full_name !== undefined;
  const full_name = hasFullName ? String(body.full_name ?? "").trim() : undefined;
  const roleProvided = body.role !== undefined && body.role !== null && String(body.role).trim() !== "";
  const role = roleProvided ? (String(body.role) as AppRole) : undefined;
  const spProvided = body.salesperson_name !== undefined;
  const salesperson_name_in = spProvided ? String(body.salesperson_name ?? "").trim() : undefined;

  if (email !== undefined && !email.includes("@")) return jsonErr("A valid email is required", 400);
  if (password.length > 0 && password.length < MIN_PASSWORD_LEN) {
    return jsonErr(`Password must be at least ${MIN_PASSWORD_LEN} characters`, 400);
  }

  const { data: existingWrap, error: getErr } = await supabase.auth.admin.getUserById(user_id);
  if (getErr || !existingWrap.user) return jsonErr("User not found", 404);
  const existingUser = existingWrap.user;

  const adminUpdate: {
    email?: string;
    password?: string;
    user_metadata?: Record<string, unknown>;
  } = {};
  if (email !== undefined) adminUpdate.email = email;
  if (password.length > 0) adminUpdate.password = password;

  if (hasFullName) {
    adminUpdate.user_metadata = {
      ...(existingUser.user_metadata || {}),
      full_name: full_name || null,
      name: full_name || null,
    };
  }

  if (Object.keys(adminUpdate).length > 0) {
    const { error } = await supabase.auth.admin.updateUserById(user_id, adminUpdate);
    if (error) return jsonErr(error.message, 400);
  }

  if (role !== undefined) {
    if (role !== "admin" && role !== "salesperson" && role !== "cge" && role !== "supervisor") return jsonErr("Invalid role", 400);

    const { data: currentRows } = await supabase
      .from("user_roles")
      .select("role, salesperson_name")
      .eq("user_id", user_id);
    const wasAdmin = currentRows?.some((r) => r.role === "admin");
    const existingShopifyLabel =
      currentRows?.find((r) => r.role === "salesperson")?.salesperson_name?.trim() || "";

    if (wasAdmin && role !== "admin" && callerId === user_id) {
      const { count } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) <= 1) return jsonErr("Cannot demote the only admin", 400);
    }

    const meta = existingUser.user_metadata as Record<string, string | undefined>;
    const fallbackName =
      meta?.full_name || meta?.name || existingUser.email?.split("@")[0] || null;

    let shopifyLabel =
      salesperson_name_in !== undefined ? salesperson_name_in : existingShopifyLabel;
    if (role === "salesperson" && !shopifyLabel) {
      shopifyLabel = fallbackName || "Salesperson";
    }

    const loginDisplay =
      role === "admin" ? null : (role === "salesperson" ? shopifyLabel : fallbackName);

    try {
      await upsertRole(supabase, user_id, role, loginDisplay);
      const keep: AppRole[] = [role];
      if (role === "supervisor" && shopifyLabel) {
        await upsertRole(supabase, user_id, "salesperson", shopifyLabel);
        keep.push("salesperson");
      }
      await deleteRolesNotIn(supabase, user_id, keep);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update role";
      return jsonErr(roleWriteError(msg), 500);
    }
  } else if (spProvided && salesperson_name_in !== undefined) {
    const { data: spRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user_id)
      .eq("role", "salesperson")
      .maybeSingle();
    if (!spRow) return jsonErr("User is not a salesperson", 400);
    const { error } = await supabase
      .from("user_roles")
      .update({ salesperson_name: salesperson_name_in || null })
      .eq("user_id", user_id)
      .eq("role", "salesperson");
    if (error) return jsonErr(error.message, 500);
  }

  return jsonOk({ success: true });
}

async function handleDelete(
  supabase: SupabaseClient,
  body: Record<string, unknown>,
  callerId: string,
) {
  const user_id = String(body.user_id || "");
  if (!user_id) return jsonErr("user_id is required", 400);
  if (user_id === callerId) return jsonErr("You cannot delete your own account", 400);

  const { data: rows } = await supabase.from("user_roles").select("role").eq("user_id", user_id);
  const isAdmin = rows?.some((r) => r.role === "admin");
  if (isAdmin) {
    const { count } = await supabase
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) return jsonErr("Cannot delete the only admin user", 400);
  }

  const { error } = await supabase.auth.admin.deleteUser(user_id);
  if (error) return jsonErr(error.message, 400);
  return jsonOk({ success: true });
}

/** Ban login without deleting history (used by CGE offboarding). */
async function handleBan(
  supabase: SupabaseClient,
  body: Record<string, unknown>,
  callerId: string,
) {
  const user_id = String(body.user_id || "");
  if (!user_id) return jsonErr("user_id is required", 400);
  if (user_id === callerId) return jsonErr("You cannot ban your own account", 400);

  const { error } = await supabase.auth.admin.updateUserById(user_id, {
    ban_duration: "876000h",
  });
  if (error) return jsonErr(error.message, 400);
  return jsonOk({ success: true, banned: true });
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return jsonErr("Method not allowed", 405);
    }

    const denied = await requireAdmin(req, corsHeaders);
    if (denied) return denied;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON) {
      return jsonErr("Server misconfigured", 500);
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonErr("Invalid JSON body", 400);
    }

    const action = String(body.action || "");
    const authHeader = req.headers.get("Authorization") || "";
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerErr } = await anonClient.auth.getUser();
    if (callerErr || !caller) return jsonErr("Unauthorized", 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    switch (action) {
      case "list":
        return await handleList(supabase);
      case "create":
        return await handleCreate(supabase, body);
      case "update":
        return await handleUpdate(supabase, body, caller.id);
      case "delete":
        return await handleDelete(supabase, body, caller.id);
      case "ban":
        return await handleBan(supabase, body, caller.id);
      default:
        return jsonErr('Unknown action. Use "list", "create", "update", "delete", or "ban".', 400);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return jsonErr(msg, 500);
  }
});
