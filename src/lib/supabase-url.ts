export function getSupabaseBrowserUrl(): string {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
    if (isLocal && envUrl) return envUrl;
    // Same-origin proxy path when deployed behind /api/db
    if (!isLocal) return `${window.location.origin}/api/db`;
  }
  return envUrl || "";
}

export function getSupabaseAuthStorageKey(): string {
  const ref = (import.meta.env.VITE_SUPABASE_PROJECT_REF as string | undefined)?.trim();
  return ref ? `sb-${ref}-cge-auth` : "sb-cge-auth";
}
