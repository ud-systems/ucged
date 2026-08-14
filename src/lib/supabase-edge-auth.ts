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

function messageFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const d = payload as Record<string, unknown>;
  if (typeof d.error === "string" && d.error.trim()) return d.error.trim();
  if (typeof d.errors === "string" && d.errors.trim()) return d.errors.trim();
  if (typeof d.message === "string" && d.message.trim()) return d.message.trim();
  return null;
}

function isGenericEdgeStatusMessage(message: string): boolean {
  return /Edge Function returned a non-2xx status code/i.test(message);
}

export function parseEdgeFunctionErrorPayload(data: unknown, error: unknown): string | null {
  const fromData = messageFromPayload(data);
  if (fromData) return fromData;
  if (error && typeof error === "object") {
    const e = error as { message?: string; context?: { body?: string } };
    if (typeof e.context?.body === "string" && e.context.body) {
      try {
        const fromBody = messageFromPayload(JSON.parse(e.context.body));
        if (fromBody) return fromBody;
      } catch {
        /* ignore */
      }
    }
    if (typeof e.message === "string" && e.message && !isGenericEdgeStatusMessage(e.message)) {
      return e.message;
    }
  }
  return null;
}

/** Reads FunctionsHttpError.context (a Response) so toasts can show the function body. */
export async function readEdgeFunctionError(data: unknown, error: unknown): Promise<string | null> {
  const sync = parseEdgeFunctionErrorPayload(data, error);
  if (sync) return sync;
  if (!error || typeof error !== "object") return null;
  const ctx = (error as { context?: unknown }).context;
  if (ctx && typeof ctx === "object" && typeof (ctx as Response).json === "function") {
    try {
      const payload = await (ctx as Response).clone().json();
      const fromJson = messageFromPayload(payload);
      if (fromJson) return fromJson;
    } catch {
      try {
        const text = await (ctx as Response).clone().text();
        const fromText = messageFromPayload(JSON.parse(text));
        if (fromText) return fromText;
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

export function friendlyAiDraftError(raw: string | null | undefined): string {
  const text = (raw || "").trim();
  const lower = text.toLowerCase();
  if (/credits or licenses|doesn't have any credits|no api credits|prepaid credits/.test(lower)) {
    return "Grok has no API credits yet. Add prepaid credits at console.x.ai, then try again.";
  }
  if (/invalid api key|incorrect api key|unauthorized/.test(lower)) {
    return "The Grok API key is invalid. Ask an admin to update it.";
  }
  if (/model not found/.test(lower)) {
    return "The Grok model is unavailable. Ask an admin to update the AI model.";
  }
  if (/rate limit/.test(lower)) {
    return "Too many AI drafts just now. Wait a few minutes and try again.";
  }
  if (!text || isGenericEdgeStatusMessage(text)) {
    return "Couldn't generate an AI draft. Check Grok credits and try again.";
  }
  return text;
}
