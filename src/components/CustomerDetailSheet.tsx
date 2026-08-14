import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Mail, Phone, Smartphone } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerCallSheet } from "@/components/CustomerCallSheet";
import { CustomerEmailComposeSheet } from "@/components/CustomerEmailComposeSheet";
import { useAuth } from "@/contexts/AuthContext";
import {
  type FollowUpRow,
  type QueueRow,
  useCustomerOrders,
  useLogOutreach,
  useOutreachEvents,
} from "@/hooks/use-cge-data";
import { formatMoney } from "@/lib/format-money";
import { smsHref, whatsappHref } from "@/lib/phone";
import { SEGMENT_LABELS, segmentBadgeClass, type CgeSegment } from "@/lib/segments";
import { toast } from "sonner";

export type FollowUpCustomerRow = QueueRow | FollowUpRow;

function rfmLabel(row: FollowUpCustomerRow): string | null {
  if ("rfm_group" in row && row.rfm_group) return row.rfm_group;
  if ("customer_rfm_group" in row && row.customer_rfm_group) return row.customer_rfm_group;
  return null;
}

function spLabel(row: FollowUpCustomerRow): string | null {
  if ("sp_assigned" in row && row.sp_assigned) return row.sp_assigned;
  if (row.ownership_label) return row.ownership_label;
  return null;
}

export function CustomerFollowUpPanel({
  row,
  onOpenFullCustomer,
  showOpenFullCustomer = true,
}: {
  row: FollowUpCustomerRow;
  onOpenFullCustomer?: () => void;
  showOpenFullCustomer?: boolean;
}) {
  const { user } = useAuth();
  const { data: orders = [] } = useCustomerOrders(row.customer_id);
  const { data: events = [] } = useOutreachEvents(row.customer_id);
  const logOutreach = useLogOutreach();
  const [channel, setChannel] = useState<"call" | "whatsapp" | "sms" | "email">("call");
  const [outcome, setOutcome] = useState("replied");
  const [notes, setNotes] = useState("");
  const [callOpen, setCallOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [scheduledCallAt, setScheduledCallAt] = useState<string | null>(row.scheduled_call_at ?? null);

  useEffect(() => {
    setScheduledCallAt(row.scheduled_call_at ?? null);
  }, [row.id, row.scheduled_call_at]);

  const rfm = rfmLabel(row);
  const sp = spLabel(row);

  return (
    <div>
      <div className="flex flex-col gap-3 text-left">
        <div className="flex items-start gap-3">
          <div className="size-12 rounded-full bg-primary/15 text-primary grid place-items-center font-heading font-semibold shrink-0">
            {(row.customer_name || "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-xl font-semibold leading-tight">{row.customer_name}</h2>
            <p className="text-sm text-muted-foreground truncate">{row.customer_email || "No email"}</p>
            <p className="text-sm text-muted-foreground">{row.customer_phone || "No phone"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={segmentBadgeClass(row.segment)}>
            {SEGMENT_LABELS[row.segment as CgeSegment] || row.segment}
          </Badge>
          {rfm && <Badge variant="secondary">{rfm}</Badge>}
          <Badge variant="outline">{sp || "Unassigned"}</Badge>
        </div>
        {showOpenFullCustomer && (
          <Button variant="outline" className="w-full rounded-xl" asChild>
            <Link to={`/customers/${row.customer_id}`} onClick={onOpenFullCustomer}>
              <ExternalLink className="h-4 w-4 mr-2" /> Open full customer
            </Link>
          </Button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button
          type="button"
          className="justify-between rounded-xl border-0 bg-neutral-800 text-white hover:bg-neutral-900"
          onClick={() => setCallOpen(true)}
        >
          Call
          <Phone className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          className="justify-between rounded-xl border-0 bg-neutral-700 text-white hover:bg-neutral-800 disabled:opacity-50"
          disabled={!row.customer_email}
          onClick={() => setEmailOpen(true)}
        >
          Email
          <Mail className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          className="justify-between rounded-xl border-0 bg-[#25D366] text-white hover:bg-[#1EBE5A]"
          onClick={() => {
            const href = whatsappHref(row.customer_phone);
            if (!href) {
              toast.error("No phone number on file");
              return;
            }
            window.open(href, "_blank", "noopener,noreferrer");
          }}
        >
          WhatsApp
          <WhatsAppIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          className="justify-between rounded-xl border-0 bg-neutral-500 text-white hover:bg-neutral-600"
          onClick={() => {
            const href = smsHref(row.customer_phone);
            if (!href) {
              toast.error("No phone number on file");
              return;
            }
            window.location.href = href;
          }}
        >
          SMS
          <Smartphone className="h-4 w-4" />
        </Button>
      </div>

      {scheduledCallAt && (
        <p className="mt-2 text-xs text-muted-foreground">
          Call scheduled ·{" "}
          <span className="font-medium text-foreground">{new Date(scheduledCallAt).toLocaleString()}</span>
        </p>
      )}
      <p className="mt-1 text-[11px] text-muted-foreground">WhatsApp / SMS open on your device — log the outcome below.</p>

      <Tabs defaultValue="log" className="mt-6">
        <TabsList className="w-full bg-muted/80 overflow-x-auto flex-nowrap justify-start">
          <TabsTrigger
            value="log"
            className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            Log contact
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            History
          </TabsTrigger>
          <TabsTrigger
            value="orders"
            className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="space-y-3 mt-4">
          <Select value={channel} onValueChange={(v: "call" | "whatsapp" | "sms" | "email") => setChannel(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="call">Call</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>
          <Select value={outcome} onValueChange={setOutcome}>
            <SelectTrigger>
              <SelectValue placeholder="Outcome" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no_answer">No answer</SelectItem>
              <SelectItem value="replied">Replied</SelectItem>
              <SelectItem value="booked_call">Booked call</SelectItem>
              <SelectItem value="order_placed">Order placed</SelectItem>
              <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
              <SelectItem value="wrong_number">Wrong number</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes…" className="min-h-[100px]" />
          <Button
            className="w-full rounded-xl"
            disabled={logOutreach.isPending || !user}
            onClick={async () => {
              try {
                await logOutreach.mutateAsync({
                  task_id: row.id,
                  customer_id: row.customer_id,
                  cge_user_id: user!.id,
                  channel,
                  outcome,
                  notes,
                });
                setNotes("");
                toast.success("Outreach logged");
              } catch (e: unknown) {
                const message = e instanceof Error ? e.message : "Failed to log outreach";
                toast.error(message);
              }
            }}
          >
            Save outreach
          </Button>
        </TabsContent>

        <TabsContent value="activity" className="space-y-3 mt-4">
          {events.length === 0 && <p className="text-sm text-muted-foreground">No outreach logged yet.</p>}
          {events.map((ev: { id: string; channel: string; created_at: string; outcome?: string; notes?: string }) => (
            <div key={ev.id} className="rounded-xl border p-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="font-medium capitalize">{ev.channel}</span>
                <span className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleString()}</span>
              </div>
              <p className="text-muted-foreground capitalize">{ev.outcome || "logged"}</p>
              {ev.notes && <p className="mt-1">{ev.notes}</p>}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="orders" className="space-y-3 mt-4">
          {orders.length === 0 && <p className="text-sm text-muted-foreground">No orders on file.</p>}
          {orders.some((o: { from_related_account?: boolean }) => o.from_related_account) && (
            <p className="text-xs text-muted-foreground">Including orders from a related Shopify account.</p>
          )}
          {orders.map(
            (o: {
              id: string;
              order_number?: string | null;
              financial_status?: string | null;
              total?: number | string | null;
              current_total?: number | string | null;
              currency_code?: string | null;
              shopify_created_at?: string | null;
              from_related_account?: boolean;
            }) => (
              <div key={o.id} className="rounded-xl border p-3 text-sm flex justify-between">
                <div>
                  <p className="font-medium">
                    #{o.order_number || o.id.slice(0, 8)}
                    {o.from_related_account ? (
                      <span className="ml-2 text-[10px] uppercase text-muted-foreground">related</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{o.financial_status}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium tabular-nums">
                    {formatMoney(o.current_total ?? o.total ?? 0, o.currency_code)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.shopify_created_at ? new Date(o.shopify_created_at).toLocaleDateString() : "—"}
                  </p>
                </div>
              </div>
            ),
          )}
        </TabsContent>
      </Tabs>

      <CustomerCallSheet
        open={callOpen}
        onOpenChange={setCallOpen}
        customerId={row.customer_id}
        taskId={row.id}
        customerName={row.customer_name}
        phone={row.customer_phone || ""}
        scheduledCallAt={scheduledCallAt}
        onScheduledChange={setScheduledCallAt}
      />
      <CustomerEmailComposeSheet
        open={emailOpen}
        onOpenChange={setEmailOpen}
        customerId={row.customer_id}
        taskId={row.id}
        customerName={row.customer_name}
        customerEmail={row.customer_email}
      />
    </div>
  );
}

export function CustomerDetailSheet({
  row,
  open,
  onOpenChange,
}: {
  row: FollowUpCustomerRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!row) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto max-h-dvh">
        <SheetHeader className="sr-only">
          <SheetTitle>{row.customer_name}</SheetTitle>
        </SheetHeader>
        <CustomerFollowUpPanel row={row} onOpenFullCustomer={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
