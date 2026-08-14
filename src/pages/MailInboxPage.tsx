import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useInboundMessagePreviews, useMailInbox, useMarkThreadRead } from "@/hooks/use-cge-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FollowUpSearchSheet } from "@/components/FollowUpSearchSheet";
import { UnreadCountPill } from "@/components/UnreadCountPill";
import {
  DataTableShell,
  PageFrame,
  PageHeader,
  PagePagination,
  RecordCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/layout";
import { useStaggerIn } from "@/hooks/use-stagger-in";

export default function MailInboxPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const markRead = useMarkThreadRead();
  const listRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetching } = useMailInbox({
    viewerUserId: user?.id,
    unreadOnly,
    page,
    pageSize: 25,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / 25));
  const unreadIds = useMemo(
    () =>
      rows
        .filter((row) => Boolean((row as { unread_inbound?: boolean }).unread_inbound))
        .map((row) => String((row as { id?: string }).id || ""))
        .filter(Boolean),
    [rows],
  );
  const { data: previews } = useInboundMessagePreviews(unreadIds);

  useStaggerIn(listRef, "[data-stagger-item]", [rows, page, unreadOnly]);

  const openThread = (r: { id: string; customer_id: string; unread_inbound?: boolean }) => {
    if (r.unread_inbound) void markRead.mutateAsync(r.id);
    navigate(`/customers/${r.customer_id}?tab=email&thread=${r.id}`);
  };

  return (
    <PageFrame>
      <PageHeader
        title="Inbox"
        count={total}
        description="Customer replies on follow-up threads assigned in your scope."
        actions={
          <Button className="rounded-xl w-full sm:w-auto" onClick={() => setFollowUpOpen(true)}>
            Follow up
          </Button>
        }
      />

      <label className="flex items-center gap-2 text-sm w-fit min-h-10">
        <Checkbox
          checked={unreadOnly}
          onCheckedChange={(c) => {
            setUnreadOnly(Boolean(c));
            setPage(1);
          }}
        />
        Unread only
      </label>

      <div ref={listRef} className="flex flex-col gap-3 md:gap-0">
        <div className="flex flex-col gap-3 md:hidden">
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
              <RecordCard key={r.id} onClick={() => openThread(r)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{r.customer_name || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.customer_email || ""}</p>
                  </div>
                  {r.unread_inbound ? <UnreadCountPill count={1} /> : <Badge variant="outline">Read</Badge>}
                </div>
                <p className="text-sm mt-2 truncate">{r.subject || "(no subject)"}</p>
                {r.unread_inbound && previews?.[r.id] ? (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{previews[r.id]}</p>
                ) : null}
                <p className="text-xs text-muted-foreground mt-2">
                  {r.last_message_at ? new Date(r.last_message_at).toLocaleString() : "—"}
                </p>
              </RecordCard>
            );
          })}
          {!isLoading && rows.length === 0 && (
            <p className="p-10 text-center text-sm text-muted-foreground">
              No open email threads yet. Send a follow-up from a customer page.
            </p>
          )}
        </div>

        <DataTableShell loading={isLoading || isFetching} className="hidden md:block">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Last message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
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
                  <TableRow key={r.id} data-stagger-item className="cursor-pointer" onClick={() => openThread(r)}>
                    <TableCell>
                      <p className="font-medium truncate max-w-[14rem]">{r.customer_name || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[14rem]">{r.customer_email || ""}</p>
                    </TableCell>
                    <TableCell className="min-w-0">
                      <p className="font-medium truncate max-w-[20rem]">{r.subject || "(no subject)"}</p>
                      {r.unread_inbound && previews?.[r.id] ? (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{previews[r.id]}</p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {r.unread_inbound ? <UnreadCountPill count={1} /> : <Badge variant="outline">Read</Badge>}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {r.last_message_at ? new Date(r.last_message_at).toLocaleString() : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="p-10 text-center text-muted-foreground">
                    No open email threads yet. Send a follow-up from a customer page.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DataTableShell>
      </div>

      <PagePagination page={page} pageCount={pageCount} onPageChange={setPage} />

      <FollowUpSearchSheet open={followUpOpen} onOpenChange={setFollowUpOpen} />
    </PageFrame>
  );
}
