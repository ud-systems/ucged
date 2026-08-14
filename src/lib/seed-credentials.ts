/**
 * Shopify + DataPulse credentials copied from uddash `app_settings`.
 * Sourced into `.credentials.local.json` (gitignored). Used for Settings preview
 * and for seeding the CGE Supabase project when ready.
 */
import localCredentials from "../../.credentials.local.json";

export const UDDASH_APP_SETTINGS = localCredentials as Record<string, string>;
