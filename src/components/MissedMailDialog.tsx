import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadMailSummary } from "@/hooks/use-cge-data";
import { formatRelativeTime, markMissedMailDismissed, wasMissedMailDismissed } from "@/lib/mail-unread";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UnreadCountPill } from "@/components/UnreadCountPill";

export function MissedMailDialog() {
  const { user, hasCapability } = useAuth();
  const navigate = useNavigate();
  const canInbox = hasCapability("view_mail_inbox");
  const { data } = useUnreadMailSummary(canInbox ? user?.id : undefined);
  const [open, setOpen] = useState(false);

  const total = data?.total ?? 0;
  const threads = data?.threads ?? [];

  useEffect(() => {
    if (!user?.id || !canInbox || !data) return;
    if (total <= 0) return;
    if (wasMissedMailDismissed(user.id)) return;
    setOpen(true);
  }, [user?.id, canInbox, data, total]);

  const dismiss = () => {
    if (user?.id) markMissedMailDismissed(user.id);
    setOpen(false);
  };

  const openThread = (customerId: string, threadId: string) => {
    dismiss();
    navigate(`/customers/${customerId}?tab=email&thread=${threadId}`);
  };

  if (!canInbox) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
        else setOpen(true);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            Missed replies
            <UnreadCountPill count={total} />
          </DialogTitle>
          <DialogDescription>
            Customers responded while you were away. Open a conversation to read and reply.
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-[50vh] overflow-y-auto divide-y rounded-xl border">
          {threads.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className="w-full text-left px-3 py-3 hover:bg-accent/40 transition-colors"
                onClick={() => openThread(t.customer_id, t.id)}
              >
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <p className="text-sm font-medium truncate min-w-0">{t.customer_name}</p>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {formatRelativeTime(t.last_message_at)}
                  </span>
                </div>
                <p className="text-xs text-foreground/80 truncate mt-0.5">{t.subject}</p>
                {t.preview ? (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.preview}</p>
                ) : null}
              </button>
            </li>
          ))}
        </ul>

        {total > threads.length && (
          <p className="text-xs text-muted-foreground">
            Showing {threads.length} of {total} unread conversations.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={dismiss}>
            Dismiss
          </Button>
          <Button
            onClick={() => {
              dismiss();
              navigate("/inbox");
            }}
          >
            Review inbox
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
