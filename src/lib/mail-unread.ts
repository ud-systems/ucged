export const MISSED_MAIL_DISMISS_PREFIX = "cge-missed-mail-dismissed:";

export function missedMailDismissKey(userId: string) {
  return `${MISSED_MAIL_DISMISS_PREFIX}${userId}`;
}

export function wasMissedMailDismissed(userId: string) {
  try {
    return sessionStorage.getItem(missedMailDismissKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function markMissedMailDismissed(userId: string) {
  try {
    sessionStorage.setItem(missedMailDismissKey(userId), "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearMissedMailDismissed(userId?: string | null) {
  try {
    if (userId) {
      sessionStorage.removeItem(missedMailDismissKey(userId));
      return;
    }
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(MISSED_MAIL_DISMISS_PREFIX)) keys.push(key);
    }
    for (const key of keys) sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function formatUnreadCount(count: number) {
  if (count <= 0) return "";
  return count > 99 ? "99+" : String(count);
}

export function previewMailBody(text?: string | null, html?: string | null, max = 120) {
  const fromText = (text || "").replace(/\s+/g, " ").trim();
  const fromHtml = stripHtml(html || "").replace(/\s+/g, " ").trim();
  const raw = fromText || fromHtml;
  if (!raw) return "";
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max).trimEnd()}…`;
}

export function formatRelativeTime(iso?: string | null) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"');
}

export type UnreadMailPreview = {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  subject: string;
  last_message_at: string | null;
  preview: string;
  unread_count: number;
};
