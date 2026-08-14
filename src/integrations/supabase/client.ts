import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { processLock } from "@supabase/auth-js";
import type { Database } from "./types";
import { getSupabaseAuthStorageKey, getSupabaseBrowserUrl } from "@/lib/supabase-url";
import { isUiPreviewMode } from "@/lib/ui-preview";

const SUPABASE_URL = getSupabaseBrowserUrl() || "https://preview.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.preview";
const STORAGE_KEY = getSupabaseAuthStorageKey();

export const isPreview = isUiPreviewMode();

export const supabase: SupabaseClient<Database> = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    storageKey: STORAGE_KEY,
    persistSession: !isPreview,
    autoRefreshToken: !isPreview,
    detectSessionInUrl: !isPreview,
    debug: false,
    lock: processLock,
  },
  global: {
    headers: {
      "X-Client-Info": isPreview ? "cge-webapp-preview" : "cge-webapp",
    },
  },
});
