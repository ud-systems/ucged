import { supabase } from "@/integrations/supabase/client";

let edgeTokenRefreshInFlight: Promise<string | null> | null = null;

function jwtExpMs(accessToken: string): number | null {
  try {
    const segment = accessToken.split(".")[1];
    if (!segment) return null;
    const b64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export async function getAccessTokenForEdgeFunctions(): Promise<string | null> {
  if (edgeTokenRefreshInFlight) return edgeTokenRefreshInFlight;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;

  const expMs = jwtExpMs(session.access_token);
  const skewMs = 120_000;
  if (expMs != null && expMs > Date.now() + skewMs) {
    return session.access_token;
  }

  const fallbackToken = session.access_token;

  edgeTokenRefreshInFlight = (async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data.session?.access_token) {
        return data.session.access_token;
      }
      if (error && /Invalid Refresh Token|Refresh Token Not Found/i.test(error.message || "")) {
        await supabase.auth.signOut({ scope: "local" });
        return null;
      }
      return fallbackToken;
    } finally {
      edgeTokenRefreshInFlight = null;
    }
  })();

  return edgeTokenRefreshInFlight;
}

export function parseEdgeFunctionErrorPayload(data: unknown, error: unknown): string | null {
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.error === "string" && d.error) return d.error;
    if (typeof d.errors === "string" && d.errors) return d.errors;
  }
  if (error && typeof error === "object") {
    const e = error as { message?: string; context?: { body?: string } };
    if (e.context?.body) {
      try {
        const b = JSON.parse(e.context.body) as Record<string, unknown>;
        if (typeof b.error === "string" && b.error) return b.error;
        if (typeof b.errors === "string" && b.errors) return b.errors;
      } catch {
        /* ignore */
      }
    }
    if (typeof e.message === "string") return e.message;
  }
  return null;
}
