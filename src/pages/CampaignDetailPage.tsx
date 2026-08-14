import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useCampaign, useSaveCampaign, useSendCampaign } from "@/hooks/use-cge-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function CampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { data, isLoading } = useCampaign(campaignId);
  const send = useSendCampaign();
  const save = useSaveCampaign();
  const campaign = data?.campaign;
  const recipients = data?.recipients ?? [];
  const [subjectOverride, setSubjectOverride] = useState<string | null>(null);

  if (isLoading) return <div className="p-6 lg:p-8 text-muted-foreground">Loading…</div>;
  if (!campaign) {
    return (
      <div className="p-6 lg:p-8 space-y-3">
        <p>Campaign not found.</p>
        <Button asChild variant="outline">
          <Link to="/campaigns">Back</Link>
        </Button>
      </div>
    );
  }

  const subject = subjectOverride ?? campaign.subject_override ?? "";

  return (
    <div className="p-6 lg:p-8 space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
        <Link to="/campaigns">
          <ArrowLeft className="h-4 w-4 mr-1" /> Campaigns
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">{campaign.name}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline" className="capitalize">
              {campaign.status}
            </Badge>
            <Badge variant="secondary">{String((campaign.audience as { preset?: string })?.preset || "audience")}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
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
            className="rounded-xl"
            disabled={send.isPending || ["done", "sending"].includes(campaign.status)}
            onClick={async () => {
              try {
                if (subject !== (campaign.subject_override || "")) {
                  await save.mutateAsync({ id: campaign.id, name: campaign.name, subject_override: subject || null });
                }
                await send.mutateAsync(campaign.id);
                toast.success("Send batch started");
              } catch (e: unknown) {
                toast.error(e instanceof Error ? e.message : "Send failed");
              }
            }}
          >
            {send.isPending ? "Sending…" : "Send now"}
          </Button>
        </div>
      </div>

      {campaign.error_message && (
        <p className="text-sm text-destructive rounded-xl border border-destructive/30 bg-destructive/5 p-3">{campaign.error_message}</p>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-card p-4 space-y-2">
          <p className="text-xs text-muted-foreground">Subject override</p>
          <Input
            value={subject}
            onChange={(e) => setSubjectOverride(e.target.value)}
            placeholder="Leave blank to use template subject"
          />
          <p className="text-xs text-muted-foreground">
            Stats: {JSON.stringify(campaign.stats || {})}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 text-sm space-y-1">
          <p>
            <span className="text-muted-foreground">Audience:</span>{" "}
            {JSON.stringify(campaign.audience)}
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

      <div className="rounded-2xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Error</th>
            </tr>
          </thead>
          <tbody>
            {recipients.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{r.email}</td>
                <td className="p-3 capitalize">{r.status}</td>
                <td className="p-3 text-muted-foreground text-xs">{r.error_message || "—"}</td>
              </tr>
            ))}
            {recipients.length === 0 && (
              <tr>
                <td colSpan={3} className="p-8 text-center text-muted-foreground">
                  Recipients appear after you send (audience is expanded at send time).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
