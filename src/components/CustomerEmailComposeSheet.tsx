import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useMyMailIdentity, useSendCgeMail } from "@/hooks/use-cge-data";
import { toast } from "sonner";

export function CustomerEmailComposeSheet({
  open,
  onOpenChange,
  customerId,
  taskId,
  customerName,
  customerEmail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  taskId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
}) {
  const { user } = useAuth();
  const { data: mailIdentity } = useMyMailIdentity(user?.id);
  const sendMail = useSendCgeMail();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (open) {
      setSubject("");
      setBody("");
    }
  }, [open, customerId]);

  const canSend =
    Boolean(mailIdentity) &&
    Boolean(customerEmail?.trim()) &&
    Boolean(subject.trim()) &&
    Boolean(body.trim()) &&
    !sendMail.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md z-[60] flex flex-col gap-0 overflow-hidden max-h-dvh">
        <SheetHeader className="text-left flex flex-col gap-1 shrink-0 pr-8">
          <SheetTitle className="font-heading text-xl">Email</SheetTitle>
          <SheetDescription>
            Send from your CGE mailbox. Outreach is logged automatically when sent.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 pb-2">
          {!mailIdentity && (
            <p className="text-sm text-destructive rounded-xl border border-destructive/30 bg-destructive/5 p-3">
              No active send-as email. Ask an admin to assign your mail identity.
            </p>
          )}
          {!customerEmail?.trim() && (
            <p className="text-sm text-muted-foreground rounded-xl border p-3">This customer has no email on file.</p>
          )}

          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground">From</p>
            <Input
              value={mailIdentity ? `${mailIdentity.display_name} <${mailIdentity.email}>` : "—"}
              readOnly
              className="rounded-xl bg-muted/40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground">To</p>
            <Input
              value={customerEmail || "—"}
              readOnly
              className="rounded-xl bg-muted/40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground">Subject</p>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject…"
              className="rounded-xl"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground">Message</p>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={customerName ? `Hi ${customerName.split(" ")[0]},…` : "Write your message…"}
              className="min-h-[160px] rounded-xl"
            />
          </div>

          <Button
            className="w-full rounded-xl"
            disabled={!canSend}
            onClick={async () => {
              try {
                const res = await sendMail.mutateAsync({
                  customer_id: customerId,
                  subject: subject.trim(),
                  body_text: body,
                  task_id: taskId ?? null,
                });
                toast.success(`Sent as ${res.from || mailIdentity?.email}`);
                onOpenChange(false);
              } catch (e: unknown) {
                toast.error(e instanceof Error ? e.message : "Send failed");
              }
            }}
          >
            <Send className="h-4 w-4 mr-2" />
            {sendMail.isPending ? "Sending…" : "Send email"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
