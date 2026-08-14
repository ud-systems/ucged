import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMailInbox, useMarkThreadRead } from "@/hooks/use-cge-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FollowUpSearchSheet } from "@/components/FollowUpSearchSheet";

export default function MailInboxPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const markRead = useMarkThreadRead();

  const { data, isLoading, isFetching } = useMailInbox({
    viewerUserId: user?.id,
    unreadOnly,
    page,
    pageSize: 25,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="p-6 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Inbox <span className="text-muted-foreground font-normal text-xl ml-1">{total}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Customer replies on follow-up threads assigned in your scope.</p>
        </div>
        <Button className="rounded-xl shrink-0" onClick={() => setFollowUpOpen(true)}>
          Follow up
        </Button>
      </div>

      <label className="flex items-center gap-2 text-sm w-fit">
        <Checkbox
          checked={unreadOnly}
          onCheckedChange={(c) => {
            setUnreadOnly(Boolean(c));
            setPage(1);
          }}
        />
        Unread only
      </label>

      <div className="rounded-2xl border bg-card overflow-hidden relative">
        {(isLoading || isFetching) && (
          <div className="absolute inset-0 bg-background/40 z-10 grid place-items-center text-sm text-muted-foreground">Loading…</div>
        )}
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">Customer</th>
              <th className="text-left p-3">Subject</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Last message</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const r = row as {
                id: string;
                customer_id: string;
                customer_name?: string;
                customer_email?: string;
                subject?: string;
                unread_inbound?: boolean;
                last_message_at?: string;
              };
              return (
                <tr
                  key={r.id}
                  className="border-t cursor-pointer hover:bg-accent/40"
                  onClick={() => {
                    if (r.unread_inbound) void markRead.mutateAsync(r.id);
                    navigate(`/customers/${r.customer_id}?tab=email&thread=${r.id}`);
                  }}
                >
                  <td className="p-3">
                    <p className="font-medium">{r.customer_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{r.customer_email || ""}</p>
                  </td>
                  <td className="p-3">{r.subject || "(no subject)"}</td>
                  <td className="p-3">
                    {r.unread_inbound ? <Badge>Unread</Badge> : <Badge variant="outline">Read</Badge>}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {r.last_message_at ? new Date(r.last_message_at).toLocaleString() : "—"}
                  </td>
                </tr>
              );
            })}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-10 text-center text-muted-foreground">
                  No open email threads yet. Send a follow-up from a customer page.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Page {page} of {pageCount}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>

      <FollowUpSearchSheet open={followUpOpen} onOpenChange={setFollowUpOpen} />
    </div>
  );
}
