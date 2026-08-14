import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCampaigns, useEmailSuppressions, useEmailTemplates, useSaveCampaign } from "@/hooks/use-cge-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUEUE_SEGMENT_ROUTES } from "@/lib/segments";
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

export default function CampaignsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: campaigns = [], isLoading } = useCampaigns();
  const { data: templates = [] } = useEmailTemplates();
  const { data: suppressions = [] } = useEmailSuppressions();
  const save = useSaveCampaign();
  const listRef = useRef<HTMLDivElement>(null);

  const marketingTemplates = templates.filter((t) => (t.template_kind || "soft") !== "soft" && t.active !== false);
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [preset, setPreset] = useState("queue_segment");
  const [segment, setSegment] = useState("vip_inactive");
  const [quietDays, setQuietDays] = useState("90");
  const [scheduledAt, setScheduledAt] = useState("");

  useStaggerIn(listRef, "[data-stagger-item]", [campaigns]);

  return (
    <PageFrame>
      <PageHeader
        title="Campaigns"
        description="Design audience + template, then send now or schedule (Resend)."
      />

      <div className="rounded-2xl border bg-card p-4 sm:p-5 flex flex-col gap-4">
        <h2 className="font-heading text-lg font-semibold">New campaign</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <p className="text-xs text-muted-foreground">Name</p>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VIP win-back" />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
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
          <div className="flex flex-col gap-1.5 min-w-0">
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
            <div className="flex flex-col gap-1.5 min-w-0">
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
            <div className="flex flex-col gap-1.5 min-w-0">
              <p className="text-xs text-muted-foreground">Quiet days</p>
              <Input value={quietDays} onChange={(e) => setQuietDays(e.target.value)} />
            </div>
          )}
          <div className="flex flex-col gap-1.5 min-w-0">
            <p className="text-xs text-muted-foreground">Schedule (optional)</p>
            <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
        </div>
        <Button
          className="rounded-xl w-full sm:w-auto"
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

      <div ref={listRef} className="flex flex-col gap-3 md:gap-0">
        <div className="flex flex-col gap-3 md:hidden">
          {campaigns.map((c) => (
            <RecordCard key={c.id} onClick={() => navigate(`/campaigns/${c.id}`)}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium truncate min-w-0">{c.name}</p>
                <Badge variant="outline" className="capitalize shrink-0">
                  {c.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {String((c.audience as { preset?: string })?.preset || "—")}
                {(c.audience as { segment?: string })?.segment
                  ? ` · ${(c.audience as { segment?: string }).segment}`
                  : ""}
              </p>
            </RecordCard>
          ))}
          {!isLoading && campaigns.length === 0 && (
            <p className="p-10 text-center text-sm text-muted-foreground">
              No campaigns yet. Create a marketing template first, then a campaign.
            </p>
          )}
        </div>

        <DataTableShell loading={isLoading} className="hidden md:block">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Audience</TableHead>
                <TableHead className="hidden lg:table-cell">Scheduled</TableHead>
                <TableHead className="text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id} data-stagger-item>
                  <TableCell className="font-medium max-w-[14rem] truncate">{c.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-xs truncate max-w-[12rem]">
                    {String((c.audience as { preset?: string })?.preset || "—")}
                    {(c.audience as { segment?: string })?.segment
                      ? ` · ${(c.audience as { segment?: string }).segment}`
                      : ""}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {c.scheduled_at ? new Date(c.scheduled_at).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline" className="rounded-xl">
                      <Link to={`/campaigns/${c.id}`}>Open</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && campaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="p-10 text-center text-muted-foreground">
                    No campaigns yet. Create a marketing template first, then a campaign.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DataTableShell>
      </div>

      <div className="rounded-2xl border bg-card p-4 sm:p-5">
        <h2 className="font-heading text-lg font-semibold mb-2">Email suppressions</h2>
        <p className="text-xs text-muted-foreground mb-3">Hard bounces, complaints, and manual blocks excluded from campaigns.</p>
        {suppressions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No suppressions yet.</p>
        ) : (
          <ul className="text-sm flex flex-col gap-1 max-h-40 overflow-y-auto">
            {suppressions.slice(0, 50).map((s: { id: string; email: string; reason: string }) => (
              <li key={s.id} className="flex justify-between gap-2 border-b py-1.5 min-w-0">
                <span className="truncate">{s.email}</span>
                <span className="text-muted-foreground capitalize shrink-0">{s.reason.replace("_", " ")}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageFrame>
  );
}
