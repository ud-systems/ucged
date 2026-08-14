import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useClearScheduledCall, useLogOutreach, useScheduleCall } from "@/hooks/use-cge-data";
import { toast } from "sonner";

function toDatetimeLocalValue(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CustomerCallSheet({
  open,
  onOpenChange,
  customerId,
  taskId,
  customerName,
  phone,
  scheduledCallAt,
  onScheduledChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  taskId?: string | null;
  customerName?: string | null;
  phone: string;
  scheduledCallAt?: string | null;
  onScheduledChange?: (iso: string | null) => void;
}) {
  const { user } = useAuth();
  const scheduleCall = useScheduleCall();
  const clearSchedule = useClearScheduledCall();
  const logOutreach = useLogOutreach();
  const [when, setWhen] = useState("");
  const [notes, setNotes] = useState("");
  const [dialing, setDialing] = useState(false);

  useEffect(() => {
    if (open) {
      setWhen(toDatetimeLocalValue(scheduledCallAt) || "");
      setNotes("");
    }
  }, [open, scheduledCallAt]);

  const tel = phone.replace(/\s+/g, "");
  const canSchedule = Boolean(taskId);
  const existingLabel = (() => {
    if (!scheduledCallAt) return null;
    const d = new Date(scheduledCallAt);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleString();
  })();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md z-[60] flex flex-col gap-0 overflow-hidden">
        <SheetHeader className="text-left space-y-1 shrink-0 pr-8">
          <SheetTitle className="font-heading text-xl">Call</SheetTitle>
          <SheetDescription>
            {customerName ? `Reach ${customerName}` : "Call or schedule a callback"}
            {tel ? ` · ${tel}` : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 flex-1 min-h-0 overflow-y-auto space-y-5 pb-2">
          <div className="space-y-2">
            <Button
              type="button"
              className="w-full justify-between rounded-xl border-0 bg-neutral-800 text-white hover:bg-neutral-900"
              disabled={!tel || !user || dialing}
              onClick={async () => {
                if (!user || !tel) return;
                setDialing(true);
                try {
                  await logOutreach.mutateAsync({
                    task_id: taskId ?? null,
                    customer_id: customerId,
                    cge_user_id: user.id,
                    channel: "call",
                    outcome: "other",
                    notes: "Dialed",
                  });
                } catch {
                  // still allow dialing
                } finally {
                  setDialing(false);
                  window.location.href = `tel:${tel}`;
                }
              }}
            >
              Call now
              <Phone className="h-4 w-4" />
            </Button>
            {!tel && <p className="text-xs text-muted-foreground">No phone number on file.</p>}
          </div>

          <div className="border-t pt-5 space-y-3">
            <div>
              <h3 className="font-heading text-base font-semibold">Schedule call</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Saves an internal callback reminder for this follow-up (no calendar invite).
              </p>
            </div>

            {!canSchedule && (
              <p className="text-sm text-muted-foreground rounded-xl border p-3">
                No open follow-up task for this customer — scheduling needs an active task.
              </p>
            )}

            {existingLabel && canSchedule && (
              <div className="rounded-xl border bg-muted/40 px-3 py-2 text-sm flex items-center justify-between gap-2">
                <span>
                  Scheduled · <span className="font-medium">{existingLabel}</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0"
                  disabled={clearSchedule.isPending}
                  onClick={async () => {
                    if (!taskId) return;
                    try {
                      await clearSchedule.mutateAsync({ task_id: taskId, customer_id: customerId });
                      onScheduledChange?.(null);
                      setWhen("");
                      toast.success("Schedule cleared");
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : "Failed to clear");
                    }
                  }}
                >
                  Clear
                </Button>
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Date & time</p>
              <Input
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                className="rounded-xl"
                disabled={!canSchedule}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Notes (optional)</p>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What to cover…"
                className="min-h-[80px] rounded-xl"
                disabled={!canSchedule}
              />
            </div>
            <Button
              className="w-full rounded-xl"
              disabled={!canSchedule || !when || !user || scheduleCall.isPending}
              onClick={async () => {
                if (!user || !when || !taskId) return;
                try {
                  const iso = new Date(when).toISOString();
                  await scheduleCall.mutateAsync({
                    task_id: taskId,
                    customer_id: customerId,
                    cge_user_id: user.id,
                    scheduled_call_at: iso,
                    notes,
                  });
                  onScheduledChange?.(iso);
                  toast.success("Call scheduled");
                  onOpenChange(false);
                } catch (e: unknown) {
                  toast.error(e instanceof Error ? e.message : "Failed to schedule");
                }
              }}
            >
              {scheduleCall.isPending ? "Saving…" : existingLabel ? "Reschedule" : "Save schedule"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
