import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSyncLogs, useTriggerShopifySync } from "@/hooks/use-cge-data";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";

const PAGE_SIZE = 10;

export default function SyncHealthPage() {
  const { isAdmin } = useAuth();
  const { data: logs = [], isLoading } = useSyncLogs();
  const sync = useTriggerShopifySync();
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const pageLogs = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return logs.slice(start, start + PAGE_SIZE);
  }, [logs, page]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  if (!isAdmin) return <Navigate to="/queue" replace />;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Sync health</h1>
          <p className="text-sm text-muted-foreground mt-1">
            DataPulseFlow ingestion into this CGE Supabase project. Do not remove uddash webhooks when registering CGE ones.
          </p>
        </div>
        <Button
          className="rounded-xl"
          disabled={sync.isPending}
          onClick={async () => {
            try {
              await sync.mutateAsync();
              toast.success("Full sync invoked");
              setPage(1);
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : "Sync failed");
            }
          }}
        >
          Run sync
        </Button>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Records</th>
              <th className="text-left p-3">Started</th>
              <th className="text-left p-3">Error</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="p-4" colSpan={5}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading &&
              pageLogs.map((log: {
                id: string;
                sync_type: string;
                status: string;
                records_synced?: number;
                started_at?: string;
                error_message?: string | null;
              }) => (
                <tr key={log.id} className="border-t">
                  <td className="p-3 font-medium">{log.sync_type}</td>
                  <td className="p-3">
                    <StatusBadge value={log.status} />
                  </td>
                  <td className="p-3 text-right tabular-nums">{log.records_synced ?? 0}</td>
                  <td className="p-3 text-muted-foreground">
                    {log.started_at ? new Date(log.started_at).toLocaleString() : "—"}
                  </td>
                  <td className="p-3 text-destructive text-xs max-w-xs truncate">{log.error_message || ""}</td>
                </tr>
              ))}
            {!isLoading && logs.length === 0 && (
              <tr>
                <td className="p-8 text-center text-muted-foreground" colSpan={5}>
                  No sync logs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && logs.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, logs.length)} of {logs.length}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              Page {page} of {pageCount}
            </span>
            <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
