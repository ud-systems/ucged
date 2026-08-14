import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCampaigns, useEmailSuppressions, useEmailTemplates, useSaveCampaign } from "@/hooks/use-cge-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUEUE_SEGMENT_ROUTES } from "@/lib/segments";

export default function CampaignsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: campaigns = [], isLoading } = useCampaigns();
  const { data: templates = [] } = useEmailTemplates();
  const { data: suppressions = [] } = useEmailSuppressions();
  const save = useSaveCampaign();

  const marketingTemplates = templates.filter((t) => (t.template_kind || "soft") !== "soft" && t.active !== false);
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [preset, setPreset] = useState("queue_segment");
  const [segment, setSegment] = useState("vip_inactive");
  const [quietDays, setQuietDays] = useState("90");
  const [scheduledAt, setScheduledAt] = useState("");

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Campaigns</h1>
        <p className="text-sm text-muted-foreground mt-1">Design audience + template, then send now or schedule (Resend).</p>
      </div>

      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <h2 className="font-heading text-lg font-semibold">New campaign</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Name</p>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VIP win-back" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Template</p>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {marketingTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name || t.template_key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Audience preset</p>
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="queue_segment">Queue segment</SelectItem>
                <SelectItem value="never_purchased">Never purchased</SelectItem>
                <SelectItem value="quiet_days">Quiet N days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {preset === "queue_segment" && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Segment</p>
              <Select value={segment} onValueChange={setSegment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUEUE_SEGMENT_ROUTES.filter((s) => s.segment !== "all").map((s) => (
                    <SelectItem key={s.segment} value={s.segment}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {preset === "quiet_days" && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Quiet days</p>
              <Input value={quietDays} onChange={(e) => setQuietDays(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Schedule (optional)</p>
            <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
        </div>
        <Button
          className="rounded-xl"
          disabled={!name || !templateId || save.isPending}
          onClick={async () => {
            try {
              const audience: Record<string, unknown> = { preset };
              if (preset === "queue_segment") audience.segment = segment;
              if (preset === "quiet_days") audience.quiet_days = Number(quietDays) || 90;
              const row = await save.mutateAsync({
                name,
                template_id: templateId,
                status: scheduledAt ? "scheduled" : "draft",
                scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
                audience,
                created_by: user?.id,
              });
              toast.success("Campaign created");
              setName("");
              navigate(`/campaigns/${row.id}`);
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : "Create failed");
            }
          }}
        >
          Create campaign
        </Button>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Audience</th>
              <th className="text-left p-3">Scheduled</th>
              <th className="text-right p-3">Open</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="p-6 text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {campaigns.map((c) => (
              <tr key={c.id} className="border-t hover:bg-accent/40">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3">
                  <Badge variant="outline" className="capitalize">
                    {c.status}
                  </Badge>
                </td>
                <td className="p-3 text-muted-foreground text-xs">
                  {String((c.audience as { preset?: string })?.preset || "—")}
                  {(c.audience as { segment?: string })?.segment
                    ? ` · ${(c.audience as { segment?: string }).segment}`
                    : ""}
                </td>
                <td className="p-3 text-muted-foreground">
                  {c.scheduled_at ? new Date(c.scheduled_at).toLocaleString() : "—"}
                </td>
                <td className="p-3 text-right">
                  <Button asChild size="sm" variant="outline" className="rounded-xl">
                    <Link to={`/campaigns/${c.id}`}>Open</Link>
                  </Button>
                </td>
              </tr>
            ))}
            {!isLoading && campaigns.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-muted-foreground">
                  No campaigns yet. Create a marketing template first, then a campaign.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <h2 className="font-heading text-lg font-semibold mb-2">Email suppressions</h2>
        <p className="text-xs text-muted-foreground mb-3">Hard bounces, complaints, and manual blocks excluded from campaigns.</p>
        {suppressions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No suppressions yet.</p>
        ) : (
          <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
            {suppressions.slice(0, 50).map((s: { id: string; email: string; reason: string }) => (
              <li key={s.id} className="flex justify-between gap-2 border-b py-1.5">
                <span>{s.email}</span>
                <span className="text-muted-foreground capitalize">{s.reason.replace("_", " ")}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
