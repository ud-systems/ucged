import type { UserRole } from "@/contexts/AuthContext";

export type AppCapability =
  | "view_queue"
  | "view_dashboard"
  | "view_followups"
  | "view_orders"
  | "manage_settings"
  | "manage_cge_assignments"
  | "manage_templates"
  | "manage_campaigns"
  | "use_grok"
  | "send_mail"
  | "view_mail_inbox"
  | "trigger_sync"
  | "view_sync_health";

const roleCapabilities: Record<UserRole, AppCapability[]> = {
  admin: [
    "view_queue",
    "view_dashboard",
    "view_followups",
    "view_orders",
    "manage_settings",
    "manage_cge_assignments",
    "manage_templates",
    "manage_campaigns",
    "use_grok",
    "send_mail",
    "view_mail_inbox",
    "trigger_sync",
    "view_sync_health",
  ],
  cge: [
    "view_queue",
    "view_dashboard",
    "view_followups",
    "view_orders",
    "use_grok",
    "send_mail",
    "view_mail_inbox",
  ],
  salesperson: [],
};

export function resolveCapabilities(roles: UserRole[]): AppCapability[] {
  const set = new Set<AppCapability>();
  for (const role of roles) {
    for (const capability of roleCapabilities[role] ?? []) {
      set.add(capability);
    }
  }
  return [...set];
}
