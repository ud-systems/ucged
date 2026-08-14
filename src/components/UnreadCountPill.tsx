import { formatUnreadCount } from "@/lib/mail-unread";
import { cn } from "@/lib/utils";

export function UnreadCountPill({ count, className }: { count: number; className?: string }) {
  const label = formatUnreadCount(count);
  if (!label) return null;
  return (
    <span
      className={cn(
        "inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-none text-primary-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}
