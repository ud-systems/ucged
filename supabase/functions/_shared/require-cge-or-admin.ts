import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type AuthResult =
  | { ok: true; user: User; adminClient: SupabaseClient; isAdmin: boolean; isCge: boolean }
  | { ok: false; response: Response };

/**
 * Validates Bearer JWT and requires admin or CGE role.
 */
export async function requireCgeOrAdmin(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<AuthResult> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !supabaseAnon) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const anonClient = createClient(SUPABASE_URL, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await anonClient.auth.getUser();
  if (userErr || !user) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", user.id);
  const roleList = (roles || []).map((r: { role: string }) => r.role);
  const isAdmin = roleList.includes("admin");
  const isCge = roleList.includes("cge");

  if (!isAdmin && !isCge) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "CGE or admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  return { ok: true, user, adminClient, isAdmin, isCge };
}
