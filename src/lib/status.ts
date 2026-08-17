export type StatusTone = "success" | "warning" | "danger" | "info" | "violet" | "neutral";

const TONE_CLASS: Record<StatusTone, string> = {
  success: "border-transparent bg-primary/15 text-primary",
  warning: "border-transparent bg-amber-500/15 text-amber-900 dark:text-amber-200",
  danger: "border-transparent bg-destructive/15 text-destructive",
  info: "border-transparent bg-sky-500/15 text-sky-800 dark:text-sky-300",
  violet: "border-transparent bg-violet-500/15 text-violet-800 dark:text-violet-300",
  neutral: "border-transparent bg-muted text-muted-foreground",
};

const STATUS_TONE: Record<string, StatusTone> = {
  paid: "success",
  unpaid: "danger",
  pending: "warning",
  authorized: "info",
  partially_paid: "warning",
  partially_refunded: "violet",
  refunded: "violet",
  voided: "neutral",
  void: "neutral",
  expired: "neutral",

  fulfilled: "success",
  unfulfilled: "warning",
  partial: "info",
  partially_fulfilled: "info",
  restocked: "neutral",
  in_progress: "info",
  on_hold: "warning",

  open: "info",
  snoozed: "warning",
  recovered: "success",
  closed: "neutral",

  draft: "neutral",
  scheduled: "info",
  sending: "info",
  paused: "warning",
  done: "success",
  failed: "danger",
  sent: "success",
  bounced: "danger",
  skipped: "neutral",
  queued: "warning",
  cancelled: "neutral",
  canceled: "neutral",

  success: "success",
  error: "danger",
  running: "info",

  active: "success",
  off: "neutral",
  inactive: "neutral",

  call: "info",
  phone: "info",
  whatsapp: "success",
  email: "info",
  sms: "warning",
  voicemail: "violet",
  connected: "success",
  no_answer: "warning",
  busy: "warning",
  left_voicemail: "violet",
  callback: "info",
  not_interested: "danger",
  wrong_number: "neutral",
  replied: "success",
  booked_call: "info",
  order_placed: "success",
  unsubscribed: "danger",
  other: "neutral",
  logged: "neutral",
};

export function formatStatusLabel(value?: string | null): string {
  const trimmed = (value || "").trim();
  if (!trimmed) return "—";
  return trimmed.replace(/_/g, " ");
}

export function statusKey(value?: string | null): string {
  return (value || "").trim().toLowerCase().replace(/\s+/g, "_");
}

export function statusBadgeClass(value?: string | null): string {
  const tone = STATUS_TONE[statusKey(value)] ?? "neutral";
  return TONE_CLASS[tone];
}
