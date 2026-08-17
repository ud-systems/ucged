import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useCampaign, useSaveCampaign, useSendCampaign } from "@/hooks/use-cge-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DataTableShell,
  PageFrame,
  PageHeader,
  RecordCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/layout";
import { useStaggerIn } from "@/hooks/use-stagger-in";

export default function CampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { data, isLoading } = useCampaign(campaignId);
  const send = useSendCampaign();
  const save = useSaveCampaign();
  const campaign = data?.campaign;
  const recipients = data?.recipients ?? [];
  const [subjectOverride, setSubjectOverride] = useState<string | null>(null);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useStaggerIn(listRef, "[data-stagger-item]", [recipients]);

  if (isLoading) {
    return (
      <PageFrame>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 rounded-2xl" />
      </PageFrame>
    );
  }
  if (!campaign) {
    return (
      <PageFrame>
        <p>Campaign not found.</p>
        <Button asChild variant="outline">
          <Link to="/campaigns">Back</Link>
        </Button>
      </PageFrame>
    );
  }

  const subject = subjectOverride ?? campaign.subject_override ?? "";

  return (
    <PageFrame>
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
        <Link to="/campaigns">
          <ArrowLeft data-icon="inline-start" /> Campaigns
        </Link>
      </Button>

      <PageHeader
        title={campaign.name}
        description={
          <span className="flex flex-wrap gap-2 mt-1">
            <StatusBadge value={campaign.status} />
            <Badge variant="secondary">{String((campaign.audience as { preset?: string })?.preset || "audience")}</Badge>
          </span>
        }
        actions={
          <>
            <Button
              variant="outline"
              className="rounded-xl w-full sm:w-auto"
              disabled={save.isPending}
              onClick={async () => {
                try {
                  await save.mutateAsync({
                    id: campaign.id,
                    name: campaign.name,
                    subject_override: subject || null,
                    status: "scheduled",
                    scheduled_at: campaign.scheduled_at || new Date(Date.now() + 3600000).toISOString(),
                  });
                  toast.success("Marked scheduled");
                } catch (e: unknown) {
                  toast.error(e instanceof Error ? e.message : "Failed");
                }
              }}
            >
              Schedule
            </Button>
            <Button
              className="rounded-xl w-full sm:w-auto"
              disabled={send.isPending || ["done", "sending"].includes(campaign.status)}
              onClick={() => setSendConfirmOpen(true)}
            >
              {send.isPending ? "Sending…" : "Send now"}
            </Button>
          </>
        }
      />

      {campaign.error_message && (
        <p className="text-sm text-destructive rounded-xl border border-destructive/30 bg-destructive/5 p-3">{campaign.error_message}</p>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-card p-4 flex flex-col gap-2 min-w-0">
          <p className="text-xs text-muted-foreground">Subject override</p>
          <Input
            value={subject}
            onChange={(e) => setSubjectOverride(e.target.value)}
            placeholder="Leave blank to use template subject"
          />
          <p className="text-xs text-muted-foreground break-all">
            Stats: {JSON.stringify(campaign.stats || {})}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 text-sm flex flex-col gap-1 min-w-0">
          <p className="break-all">
            <span className="text-muted-foreground">Audience:</span> {JSON.stringify(campaign.audience)}
          </p>
          <p>
            <span className="text-muted-foreground">Scheduled:</span>{" "}
            {campaign.scheduled_at ? new Date(campaign.scheduled_at).toLocaleString() : "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Recipients loaded:</span> {recipients.length}
          </p>
        </div>
      </div>

      <div ref={listRef} className="flex flex-col gap-3 md:gap-0">
        <div className="flex flex-col gap-3 md:hidden">
          {recipients.map((r) => (
            <RecordCard key={r.id}>
              <p className="font-medium truncate">{r.email}</p>
              <StatusBadge value={r.status} className="mt-1" />
              {r.error_message ? <p className="text-xs text-destructive mt-1 line-clamp-2">{r.error_message}</p> : null}
            </RecordCard>
          ))}
          {recipients.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Recipients appear after you send (audience is expanded at send time).
            </p>
          )}
        </div>
        <DataTableShell className="hidden md:block">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipients.map((r) => (
                <TableRow key={r.id} data-stagger-item>
                  <TableCell className="max-w-[16rem] truncate">{r.email}</TableCell>
                  <TableCell>
                    <StatusBadge value={r.status} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-xs max-w-[16rem] truncate">
                    {r.error_message || "—"}
                  </TableCell>
                </TableRow>
              ))}
              {recipients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="p-8 text-center text-muted-foreground">
                    Recipients appear after you send (audience is expanded at send time).
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DataTableShell>
      </div>

      <AlertDialog open={sendConfirmOpen} onOpenChange={(open) => !send.isPending && setSendConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this campaign now?</AlertDialogTitle>
            <AlertDialogDescription>
              Emails will go out to the campaign audience via Resend. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={send.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={send.isPending}
              onClick={async () => {
                try {
                  if (subject !== (campaign.subject_override || "")) {
                    await save.mutateAsync({ id: campaign.id, name: campaign.name, subject_override: subject || null });
                  }
                  await send.mutateAsync(campaign.id);
                  toast.success("Send batch started");
                  setSendConfirmOpen(false);
                } catch (e: unknown) {
                  toast.error(e instanceof Error ? e.message : "Send failed");
                }
              }}
            >
              {send.isPending ? "Sending…" : "Send now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageFrame>
  );
}
