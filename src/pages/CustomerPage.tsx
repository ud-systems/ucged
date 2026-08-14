import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Copy, Mail, Phone, Send, Smartphone, Sparkles } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { CustomerCallSheet } from "@/components/CustomerCallSheet";
import { CustomerEmailComposeSheet } from "@/components/CustomerEmailComposeSheet";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCustomerBundle,
  useCustomerEmailThreads,
  useEmailMessages,
  useGrokDraft,
  useLogOutreach,
  useMarkThreadRead,
  useMyMailIdentity,
  useOutreachEvents,
  useSendCgeMail,
} from "@/hooks/use-cge-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UnreadCountPill } from "@/components/UnreadCountPill";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DataTableShell,
  PageFrame,
  PagePagination,
  RecordCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/layout";
import { daysQuietFromOrders, formatDaysQuiet } from "@/lib/days-quiet";
import { formatMoney } from "@/lib/format-money";
import { SEGMENT_LABELS, segmentBadgeClass, type CgeSegment } from "@/lib/segments";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function ownershipLabel(sp: string | null | undefined, referred: string | null | undefined) {
  const a = (sp || "").trim();
  if (a && a.toLowerCase() !== "unassigned") return a;
  const b = (referred || "").trim();
  return b || "Unassigned";
}

export default function CustomerPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, hasCapability } = useAuth();
  const { data: bundle, isLoading } = useCustomerBundle(customerId, 500);
  const customer = bundle?.customer as
    | {
        id: string;
        name?: string | null;
        email?: string | null;
        phone?: string | null;
        sp_assigned?: string | null;
        referred_by?: string | null;
        total_orders?: number | null;
        total_revenue?: number | string | null;
        spend_currency?: string | null;
        rfm_group?: string | null;
        rfm_recency_days?: number | null;
        tags?: string[] | string | null;
        customer_note?: string | null;
      }
    | null
    | undefined;
  const orders = (bundle?.orders ?? []) as Array<{
    id: string;
    order_number?: string | null;
    financial_status?: string | null;
    fulfillment_status?: string | null;
    shopify_created_at?: string | null;
    processed_at?: string | null;
    current_total?: number | string | null;
    total?: number | string | null;
    currency_code?: string | null;
    from_related_account?: boolean;
  }>;
  const openTask = bundle?.open_task as
    | {
        id: string;
        segment?: string | null;
        status?: string | null;
        assigned_cge_user_id?: string | null;
        priority?: number | null;
        recency_days?: number | null;
        scheduled_call_at?: string | null;
      }
    | null
    | undefined;
  const { data: events = [] } = useOutreachEvents(customerId);
  const { data: mailIdentity } = useMyMailIdentity(user?.id);
  const { data: threads = [] } = useCustomerEmailThreads(customerId);
  const logOutreach = useLogOutreach();
  const grok = useGrokDraft();
  const sendMail = useSendCgeMail();
  const markRead = useMarkThreadRead();
  const [channel, setChannel] = useState<"call" | "whatsapp" | "sms" | "email">("call");
  const [outcome, setOutcome] = useState("replied");
  const [notes, setNotes] = useState("");
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftWarnings, setDraftWarnings] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "orders");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(searchParams.get("thread"));
  const [callOpen, setCallOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const { data: messages = [] } = useEmailMessages(selectedThreadId);

  const ORDERS_PAGE_SIZE = 25;
  const ordersPageCount = Math.max(1, Math.ceil(orders.length / ORDERS_PAGE_SIZE));
  const pagedOrders = useMemo(() => {
    const start = (ordersPage - 1) * ORDERS_PAGE_SIZE;
    return orders.slice(start, start + ORDERS_PAGE_SIZE);
  }, [orders, ordersPage]);

  useEffect(() => {
    setOrdersPage(1);
  }, [customerId]);

  useEffect(() => {
    if (ordersPage > ordersPageCount) setOrdersPage(ordersPageCount);
  }, [ordersPage, ordersPageCount]);

  useEffect(() => {
    const t = searchParams.get("tab");
    const th = searchParams.get("thread");
    if (t) setActiveTab(t);
    if (th) setSelectedThreadId(th);
  }, [searchParams]);

  useEffect(() => {
    if (selectedThreadId && threads.some((t) => t.id === selectedThreadId && t.unread_inbound)) {
      void markRead.mutateAsync(selectedThreadId);
    }
  }, [selectedThreadId, threads]);

  const tel = useMemo(() => customer?.phone?.replace(/\s+/g, "") || "", [customer?.phone]);
  const wa = tel.replace(/^\+/, "");
  const owner = ownershipLabel(customer?.sp_assigned, customer?.referred_by);
  const displayCurrency = useMemo(() => {
    const spend = (customer as { spend_currency?: string | null } | null | undefined)?.spend_currency;
    if (spend) return spend;
    return orders.find((o) => o.currency_code)?.currency_code ?? null;
  }, [customer, orders]);

  /** Prefer RPC days quiet, then live last-order date; never show the 9999 sentinel. */
  const daysQuiet = useMemo(() => {
    if (bundle?.days_quiet != null) return bundle.days_quiet;
    return daysQuietFromOrders(orders, customer?.rfm_recency_days);
  }, [bundle?.days_quiet, orders, customer?.rfm_recency_days]);

  if (isLoading) {
    return (
      <PageFrame>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </PageFrame>
    );
  }
  if (!customer) {
    return (
      <PageFrame>
        <p>Customer not found.</p>
        <Button variant="outline" onClick={() => navigate("/queue")}>
          Back to queue
        </Button>
      </PageFrame>
    );
  }

  return (
    <PageFrame className="w-full max-w-none">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
        <Link to="/queue">
          <ArrowLeft data-icon="inline-start" /> Queue
        </Link>
      </Button>

      <div data-page-header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex flex-col gap-2">
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight">{customer.name || "Customer"}</h1>
          <p className="text-sm text-muted-foreground break-all">
            {customer.email || "No email"}
            <span className="mx-2 text-border">·</span>
            {customer.phone || "No phone"}
          </p>
          <div className="flex flex-wrap gap-2">
            {openTask?.segment && (
              <Badge variant="outline" className={segmentBadgeClass(openTask.segment)}>
                {SEGMENT_LABELS[openTask.segment as CgeSegment] || openTask.segment}
              </Badge>
            )}
            {customer.rfm_group && <Badge variant="secondary">{customer.rfm_group}</Badge>}
            <Badge variant="outline">Salesperson: {owner}</Badge>
            {customer.referred_by && customer.referred_by !== owner && (
              <Badge variant="outline">Referred: {customer.referred_by}</Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 shrink-0">
          <Button
            type="button"
            className="justify-between rounded-xl border-0 bg-neutral-800 text-white hover:bg-neutral-900"
            onClick={() => setCallOpen(true)}
          >
            Call
            <Phone data-icon="inline-end" />
          </Button>
          <Button
            type="button"
            className="justify-between rounded-xl border-0 bg-neutral-700 text-white hover:bg-neutral-800 disabled:opacity-50"
            disabled={!customer.email}
            onClick={() => setEmailOpen(true)}
          >
            Email
            <Mail data-icon="inline-end" />
          </Button>
          <Button
            className="justify-between rounded-xl border-0 bg-[#25D366] text-white hover:bg-[#1EBE5A] disabled:opacity-50"
            asChild
            disabled={!wa}
          >
            <a href={wa ? `https://wa.me/${wa}` : undefined} target="_blank" rel="noreferrer">
              WhatsApp
              <WhatsAppIcon data-icon="inline-end" />
            </a>
          </Button>
          <Button
            className="justify-between rounded-xl border-0 bg-neutral-500 text-white hover:bg-neutral-600 disabled:opacity-50"
            asChild
            disabled={!tel}
          >
            <a href={tel ? `sms:${tel}` : undefined}>
              SMS
              <Smartphone data-icon="inline-end" />
            </a>
          </Button>
        </div>
      </div>

      {(openTask as { scheduled_call_at?: string | null } | null | undefined)?.scheduled_call_at && (
        <p className="text-xs text-muted-foreground -mt-2">
          Call scheduled ·{" "}
          <span className="font-medium text-foreground">
            {new Date(
              (openTask as { scheduled_call_at: string }).scheduled_call_at,
            ).toLocaleString()}
          </span>
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Orders on file</p>
          <p className="font-heading text-2xl font-semibold">{orders.length}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Shopify order count</p>
          <p className="font-heading text-2xl font-semibold">{customer.total_orders ?? "—"}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Lifetime</p>
          <p className="font-heading text-2xl font-semibold tabular-nums">
            {formatMoney(customer.total_revenue || 0, displayCurrency)}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Days quiet</p>
          <p className="font-heading text-2xl font-semibold">{formatDaysQuiet(daysQuiet)}</p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          const next = new URLSearchParams(searchParams);
          next.set("tab", v);
          setSearchParams(next, { replace: true });
        }}
        className="w-full"
      >
        <TabsList className="inline-flex w-full md:w-fit h-auto flex-nowrap overflow-x-auto justify-start gap-1">
          <TabsTrigger value="orders" className="shrink-0">Orders ({orders.length})</TabsTrigger>
          <TabsTrigger value="activity" className="shrink-0">Activity</TabsTrigger>
          {hasCapability("send_mail") && <TabsTrigger value="email" className="shrink-0">Email</TabsTrigger>}
          <TabsTrigger value="log" className="shrink-0">Log outreach</TabsTrigger>
          {hasCapability("use_grok") && <TabsTrigger value="grok" className="shrink-0">AI Draft</TabsTrigger>}
        </TabsList>

        <TabsContent value="orders" className="mt-4 flex flex-col gap-3">
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-2xl border bg-card p-6">
              No orders found for this customer
              {customer.total_orders
                ? ` (Shopify customer metric shows ${customer.total_orders}, but no order records are attached to this profile — they may live on a duplicate account).`
                : "."}
            </p>
          ) : (
            <>
              {orders.some((o: { from_related_account?: boolean }) => o.from_related_account) && (
                <p className="text-xs text-muted-foreground rounded-xl border bg-muted/30 px-3 py-2">
                  Including orders from a related Shopify account (same email local-part / phone). This profile’s
                  Shopify metric may not match the linked order history.
                </p>
              )}
              <div className="flex flex-col gap-3 md:gap-0">
                <div className="flex flex-col gap-3 md:hidden">
                  {pagedOrders.map((o: {
                    id: string;
                    order_number?: string | null;
                    financial_status?: string | null;
                    fulfillment_status?: string | null;
                    shopify_created_at?: string | null;
                    current_total?: number | string | null;
                    total?: number | string | null;
                    currency_code?: string | null;
                    from_related_account?: boolean;
                  }) => (
                    <RecordCard key={o.id} onClick={() => navigate(`/orders/${o.id}`)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {o.order_number || o.id.slice(0, 8)}
                            {o.from_related_account ? (
                              <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">related</span>
                            ) : null}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize mt-1">
                            {o.financial_status || "—"} · {o.fulfillment_status || "—"}
                          </p>
                        </div>
                        <p className="font-medium tabular-nums shrink-0">
                          {formatMoney(o.current_total ?? o.total ?? 0, o.currency_code || displayCurrency)}
                        </p>
                      </div>
                    </RecordCard>
                  ))}
                </div>
                <DataTableShell className="hidden md:block">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden lg:table-cell">Fulfillment</TableHead>
                        <TableHead className="hidden lg:table-cell">Date</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedOrders.map((o: {
                        id: string;
                        order_number?: string | null;
                        financial_status?: string | null;
                        fulfillment_status?: string | null;
                        shopify_created_at?: string | null;
                        current_total?: number | string | null;
                        total?: number | string | null;
                        currency_code?: string | null;
                        from_related_account?: boolean;
                      }) => (
                        <TableRow
                          key={o.id}
                          className="cursor-pointer"
                          onClick={() => navigate(`/orders/${o.id}`)}
                        >
                          <TableCell className="font-medium">
                            {o.order_number || o.id.slice(0, 8)}
                            {o.from_related_account ? (
                              <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                                related
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell className="capitalize text-muted-foreground">{o.financial_status || "—"}</TableCell>
                          <TableCell className="hidden lg:table-cell capitalize text-muted-foreground">
                            {o.fulfillment_status || "—"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            {o.shopify_created_at ? new Date(o.shopify_created_at).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {formatMoney(o.current_total ?? o.total ?? 0, o.currency_code || displayCurrency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </DataTableShell>
              </div>
              {orders.length > ORDERS_PAGE_SIZE && (
                <PagePagination page={ordersPage} pageCount={ordersPageCount} onPageChange={setOrdersPage} />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4 flex flex-col gap-3">
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground rounded-2xl border bg-card p-6">No outreach logged yet.</p>
          )}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {events.map((ev: { id: string; channel: string; outcome?: string; notes?: string; created_at: string }) => (
              <div key={ev.id} className="rounded-xl border bg-card p-4 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium capitalize">{ev.channel}</span>
                  <span className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleString()}</span>
                </div>
                <p className="text-muted-foreground capitalize mt-1">{ev.outcome || "logged"}</p>
                {ev.notes && <p className="mt-2">{ev.notes}</p>}
              </div>
            ))}
          </div>
        </TabsContent>

        {hasCapability("send_mail") && (
          <TabsContent value="email" className="mt-4 flex flex-col gap-4">
            {!mailIdentity && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm px-4 py-3">
                No active send-as email on your account. Ask an admin to assign one under Settings → Mail identities.
              </div>
            )}

            <div className="grid lg:grid-cols-[240px_1fr] gap-4 items-start">
              <div className="rounded-2xl border bg-card overflow-hidden">
                <button
                  type="button"
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs border-b hover:bg-accent/40",
                    !selectedThreadId && "bg-primary/10",
                  )}
                  onClick={() => setSelectedThreadId(null)}
                >
                  New conversation
                </button>
                <ul className="max-h-[360px] overflow-y-auto divide-y">
                  {threads.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        className={cn(
                          "w-full text-left px-3 py-2.5 hover:bg-accent/40",
                          selectedThreadId === t.id && "bg-primary/10",
                        )}
                        onClick={() => setSelectedThreadId(t.id)}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-sm font-medium truncate">{t.subject || "(no subject)"}</p>
                          {t.unread_inbound && <UnreadCountPill count={1} className="shrink-0" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {t.last_message_at ? new Date(t.last_message_at).toLocaleString() : "—"}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border bg-card p-4 flex flex-col gap-3 min-w-0">
                {selectedThreadId && (
                  <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto pr-1">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={cn(
                          "rounded-xl border p-3 text-sm",
                          m.direction === "outbound" ? "bg-primary/5 sm:ml-6" : "bg-muted/40 sm:mr-6",
                        )}
                      >
                        <div className="flex justify-between gap-2 text-xs text-muted-foreground mb-1">
                          <span>
                            {m.direction === "outbound" ? "You" : "Customer"} · {m.from_email}
                          </span>
                          <span>{new Date(m.created_at).toLocaleString()}</span>
                        </div>
                        {m.body_html ? (
                          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: m.body_html }} />
                        ) : (
                          <p className="whitespace-pre-wrap">{m.body_text}</p>
                        )}
                      </div>
                    ))}
                    {messages.length === 0 && <p className="text-sm text-muted-foreground">No messages in this thread yet.</p>}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-muted-foreground">Subject</p>
                  <Input
                    value={draftSubject}
                    onChange={(e) => setDraftSubject(e.target.value)}
                    placeholder="Subject"
                    disabled={Boolean(selectedThreadId) && messages.length > 0}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-muted-foreground">Message</p>
                  <Textarea
                    className="min-h-[120px]"
                    value={draftBody}
                    onChange={(e) => setDraftBody(e.target.value)}
                    placeholder="Write your follow-up…"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {hasCapability("use_grok") && (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      disabled={grok.isPending}
                      onClick={async () => {
                        try {
                          const out = await grok.mutateAsync({
                            customer_id: customer.id,
                            channel: "email",
                            intent: "re-engage after quiet period",
                            tone: "warm professional",
                          });
                          setDraftSubject(out.subject || draftSubject);
                          setDraftBody(out.body || "");
                          toast.success("AI draft inserted");
                        } catch (e: unknown) {
                          toast.error(e instanceof Error ? e.message : "AI draft failed");
                        }
                      }}
                    >
                      <Sparkles className="h-4 w-4 mr-2" /> Draft with AI
                    </Button>
                  )}
                  <Button
                    className="rounded-xl"
                    disabled={
                      sendMail.isPending ||
                      !mailIdentity ||
                      !customer.email ||
                      !draftBody.trim() ||
                      (!selectedThreadId && !draftSubject.trim())
                    }
                    onClick={async () => {
                      try {
                        const subject =
                          draftSubject.trim() ||
                          threads.find((t) => t.id === selectedThreadId)?.subject ||
                          "Following up";
                        const res = await sendMail.mutateAsync({
                          customer_id: customer.id,
                          subject,
                          body_text: draftBody,
                          thread_id: selectedThreadId,
                          task_id: openTask?.id ?? null,
                        });
                        setSelectedThreadId(res.thread_id);
                        setDraftBody("");
                        if (!selectedThreadId) setDraftSubject("");
                        toast.success(`Sent as ${res.from || mailIdentity.email}`);
                      } catch (e: unknown) {
                        toast.error(e instanceof Error ? e.message : "Send failed");
                      }
                    }}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sendMail.isPending ? "Sending…" : "Send in CGE"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        )}

        <TabsContent value="log" className="mt-4">
          <div className="rounded-2xl border bg-card p-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4 md:items-end">
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-muted-foreground">Channel</p>
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
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-muted-foreground">Outcome</p>
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
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2 xl:col-span-1">
              <p className="text-xs text-muted-foreground">Notes</p>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes…"
                className="min-h-[42px] h-[42px] resize-none"
              />
            </div>
            <Button
              className="rounded-xl w-full xl:w-auto"
              disabled={logOutreach.isPending || !user}
              onClick={async () => {
                try {
                  await logOutreach.mutateAsync({
                    task_id: openTask?.id,
                    customer_id: customer.id,
                    cge_user_id: user!.id,
                    channel,
                    outcome,
                    notes,
                  });
                  toast.success("Outreach logged");
                  setNotes("");
                } catch (e: unknown) {
                  toast.error(e instanceof Error ? e.message : "Failed to log");
                }
              }}
            >
              Save outreach
            </Button>
          </div>
        </TabsContent>

        {hasCapability("use_grok") && (
          <TabsContent value="grok" className="mt-4 flex flex-col gap-4">
            <div className="rounded-2xl border bg-card p-5 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">
                <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                  <p className="text-xs text-muted-foreground">Channel</p>
                  <Select value={channel} onValueChange={(v: "call" | "whatsapp" | "sms" | "email") => setChannel(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="rounded-xl"
                  disabled={grok.isPending}
                  onClick={async () => {
                    try {
                      const out = await grok.mutateAsync({
                        customer_id: customer.id,
                        channel,
                        intent: "re-engage after quiet period",
                        tone: "warm professional",
                      });
                      setDraftSubject(out.subject || "");
                      setDraftBody(out.body || "");
                      setDraftWarnings(out.warnings || []);
                      toast.success("Draft ready — review before sending");
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : "AI draft failed");
                    }
                  }}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {grok.isPending ? "Generating…" : "Generate with AI"}
                </Button>
              </div>

              {draftWarnings.length > 0 && (
                <ul className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex flex-col gap-1">
                  {draftWarnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}

              {channel === "email" && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-muted-foreground">Subject</p>
                  <Input value={draftSubject} onChange={(e) => setDraftSubject(e.target.value)} />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-muted-foreground">Draft (human sends — AI never auto-sends)</p>
                <Textarea className="min-h-[160px]" value={draftBody} onChange={(e) => setDraftBody(e.target.value)} />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  disabled={!draftBody}
                  onClick={async () => {
                    await navigator.clipboard.writeText(
                      channel === "email" && draftSubject ? `Subject: ${draftSubject}\n\n${draftBody}` : draftBody,
                    );
                    toast.success("Copied");
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" /> Copy
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  disabled={!draftBody}
                  onClick={() => {
                    setNotes((n) => (n ? `${n}\n\n${draftBody}` : draftBody));
                    toast.message("Inserted into outreach notes");
                  }}
                >
                  Insert into notes
                </Button>
                {channel === "email" && hasCapability("send_mail") && (
                  <Button
                    className="rounded-xl"
                    disabled={!draftBody || !mailIdentity}
                    onClick={() => {
                      setActiveTab("email");
                      const next = new URLSearchParams(searchParams);
                      next.set("tab", "email");
                      setSearchParams(next, { replace: true });
                      toast.message("Open the Email tab to Send in CGE");
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" /> Use Email tab
                  </Button>
                )}
                {channel === "whatsapp" && wa && (
                  <Button className="rounded-xl" asChild disabled={!draftBody}>
                    <a href={`https://wa.me/${wa}?text=${encodeURIComponent(draftBody)}`} target="_blank" rel="noreferrer">
                      <WhatsAppIcon className="h-4 w-4 mr-2" /> Open WhatsApp
                    </a>
                  </Button>
                )}
                {channel === "sms" && tel && (
                  <Button className="rounded-xl" asChild disabled={!draftBody}>
                    <a href={`sms:${tel}?body=${encodeURIComponent(draftBody)}`}>
                      <Smartphone className="h-4 w-4 mr-2" /> Open SMS
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      <CustomerCallSheet
        open={callOpen}
        onOpenChange={setCallOpen}
        customerId={customer.id}
        taskId={openTask?.id}
        customerName={customer.name}
        phone={customer.phone || ""}
        scheduledCallAt={(openTask as { scheduled_call_at?: string | null } | null | undefined)?.scheduled_call_at}
      />
      <CustomerEmailComposeSheet
        open={emailOpen}
        onOpenChange={setEmailOpen}
        customerId={customer.id}
        taskId={openTask?.id}
        customerName={customer.name}
        customerEmail={customer.email}
      />
    </PageFrame>
  );
}
