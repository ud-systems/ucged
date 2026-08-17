import { useEffect, useMemo, useState } from "react";
import { useSyncLogs, useTriggerShopifySync } from "@/hooks/use-cge-data";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { SettingsSectionTitle } from "@/components/settings/SettingsSectionTitle";
import {
  DataTableShell,
  PagePagination,
  RecordCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/layout";

const PAGE_SIZE = 10;

export function SettingsSyncHealth() {
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-2">
        <SettingsSectionTitle
          title="Sync health"
          tip="DataPulseFlow ingestion into this CGE Supabase project. Do not remove uddash webhooks when registering CGE ones."
        />
        <Button
          className="rounded-xl w-full sm:w-auto"
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

      <div className="flex flex-col gap-3 md:gap-0">
        <div className="flex flex-col gap-3 md:hidden">
          {pageLogs.map(
            (log: {
              id: string;
              sync_type: string;
              status: string;
              records_synced?: number;
              started_at?: string;
              error_message?: string | null;
            }) => (
              <RecordCard key={log.id}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium truncate">{log.sync_type}</p>
                  <StatusBadge value={log.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {log.records_synced ?? 0} records · {log.started_at ? new Date(log.started_at).toLocaleString() : "—"}
                </p>
                {log.error_message ? <p className="text-xs text-destructive mt-1 line-clamp-2">{log.error_message}</p> : null}
              </RecordCard>
            ),
          )}
          {!isLoading && logs.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">No sync logs yet.</p>
          )}
        </div>
        <DataTableShell loading={isLoading} className="hidden md:block">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Records</TableHead>
                <TableHead className="hidden lg:table-cell">Started</TableHead>
                <TableHead className="hidden lg:table-cell">Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading &&
                pageLogs.map(
                  (log: {
                    id: string;
                    sync_type: string;
                    status: string;
                    records_synced?: number;
                    started_at?: string;
                    error_message?: string | null;
                  }) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.sync_type}</TableCell>
                      <TableCell>
                        <StatusBadge value={log.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{log.records_synced ?? 0}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {log.started_at ? new Date(log.started_at).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-destructive text-xs max-w-xs truncate">
                        {log.error_message || ""}
                      </TableCell>
                    </TableRow>
                  ),
                )}
              {!isLoading && logs.length === 0 && (
                <TableRow>
                  <TableCell className="p-8 text-center text-muted-foreground" colSpan={5}>
                    No sync logs yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DataTableShell>
      </div>

      {!isLoading && logs.length > 0 && (
        <PagePagination page={page} pageCount={pageCount} onPageChange={setPage} />
      )}
    </div>
  );
}
