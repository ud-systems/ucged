import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Eye, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  useEmailTemplates,
  useGrokDraft,
  useImportMarketingTemplatePack,
  useSaveEmailTemplate,
  type EmailTemplate,
} from "@/hooks/use-cge-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { defaultMarketingHtml, mergeTemplateVars, TEMPLATE_SAMPLE } from "@/lib/email-template-html";
import { MARKETING_CAMPAIGN_TEMPLATES } from "@/lib/marketing-campaign-templates";
import { cn } from "@/lib/utils";
import { PageFrame, PageHeader, PagePagination } from "@/components/layout";
import { useStaggerIn } from "@/hooks/use-stagger-in";
import { useAuth } from "@/contexts/AuthContext";

const PAGE_SIZE = 12;

function kindBadgeClass(kind: string | null | undefined) {
  switch (kind) {
    case "marketing":
      return "border-transparent bg-primary/15 text-primary";
    case "outreach":
      return "border-transparent bg-sky-500/15 text-sky-800 dark:text-sky-300";
    case "soft":
    default:
      return "border-transparent bg-amber-500/15 text-amber-900 dark:text-amber-200";
  }
}

const emptyDraft = (): Partial<EmailTemplate> & { template_key: string; subject: string; html_body: string } => ({
  template_key: "",
  name: "",
  template_kind: "marketing",
  subject: "Something new for {{name}}",
  html_body: defaultMarketingHtml(),
  text_body: "Hi {{name}}, We put together a few picks we think you'll like. Reply anytime.",
  active: true,
  segment: null,
  day_offset: null,
  variables: ["name", "salesperson", "last_order", "email"],
});

export default function TemplatesPage() {
  const { hasCapability } = useAuth();
  const canManage = hasCapability("manage_templates");
  const { data: templates = [], isLoading } = useEmailTemplates();
  const save = useSaveEmailTemplate();
  const importPack = useImportMarketingTemplatePack();
  const grok = useGrokDraft();
  const [kindFilter, setKindFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showHtmlBody, setShowHtmlBody] = useState(false);
  const [showTextBody, setShowTextBody] = useState(false);

  const editorOpen = selectedId != null;

  const filtered = useMemo(() => {
    if (kindFilter === "all") return templates;
    return templates.filter((t) => (t.template_kind || "soft") === kindFilter);
  }, [templates, kindFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [kindFilter]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const previewSubject = mergeTemplateVars(draft.subject || "");
  const previewBody = mergeTemplateVars(draft.html_body || "");

  const open = (t: EmailTemplate) => {
    setShowHtmlBody(false);
    setShowTextBody(false);
    setDraft({
      id: t.id,
      template_key: t.template_key,
      name: t.name || t.template_key,
      template_kind: t.template_kind || "soft",
      segment: t.segment,
      day_offset: t.day_offset,
      subject: t.subject,
      html_body: t.html_body || "",
      text_body: t.text_body || "",
      active: t.active !== false,
      variables: t.variables,
    });
    if (canManage) {
      setSelectedId(t.id);
    } else {
      setSelectedId(null);
      setPreviewOpen(true);
    }
  };

  const closeEditor = () => {
    setSelectedId(null);
    setPreviewOpen(false);
    setShowHtmlBody(false);
    setShowTextBody(false);
  };

  const listRef = useRef<HTMLDivElement>(null);
  useStaggerIn(listRef, "[data-stagger-item]", [paged, kindFilter, page]);

  return (
    <PageFrame>
      <PageHeader
        title="Templates"
        description="Soft automation (day 60/75) and marketing HTML in one studio."
        actions={
          canManage ? (
            <>
              <Button
                variant="outline"
                className="rounded-xl w-full sm:w-auto"
                disabled={importPack.isPending}
                onClick={() => {
                  if (
                    !window.confirm(
                      `Import / refresh ${MARKETING_CAMPAIGN_TEMPLATES.length} Unique Distribution wholesale campaign templates? Existing keys will be updated.`,
                    )
                  ) {
                    return;
                  }
                  importPack.mutate();
                }}
              >
                {importPack.isPending
                  ? "Importing…"
                  : (
                    <>
                      <span className="sm:hidden">Import pack ({MARKETING_CAMPAIGN_TEMPLATES.length})</span>
                      <span className="hidden sm:inline">Import wholesale pack ({MARKETING_CAMPAIGN_TEMPLATES.length})</span>
                    </>
                  )}
              </Button>
              <Button
                className="rounded-xl w-full sm:w-auto"
                onClick={() => {
                  setSelectedId("new");
                  setDraft(emptyDraft());
                  setShowHtmlBody(false);
                  setShowTextBody(false);
                }}
              >
                New marketing template
              </Button>
            </>
          ) : undefined
        }
      />

      <Tabs value={kindFilter} onValueChange={setKindFilter}>
        <TabsList className="bg-transparent gap-1 h-auto p-0 flex w-full overflow-x-auto justify-start">
          {[
            ["all", "All"],
            ["soft", "Soft automation"],
            ["marketing", "Marketing"],
            ["outreach", "Outreach"],
          ].map(([v, l]) => (
            <TabsTrigger
              key={v}
              value={v}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2 shrink-0"
            >
              {l}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div ref={listRef} className="flex flex-col gap-3">
        <div className="rounded-2xl border bg-card overflow-hidden w-full">
          {isLoading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
          <ul className="divide-y">
            {paged.map((t) => (
              <li key={t.id} data-stagger-item>
                <button
                  type="button"
                  onClick={() => open(t)}
                  className={`w-full text-left px-4 py-3.5 hover:bg-accent/40 motion-safe:transition-colors ${
                    selectedId === t.id ? "bg-primary/10" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{t.name || t.template_key}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{t.subject}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] shrink-0 capitalize", kindBadgeClass(t.template_kind))}
                    >
                      {t.template_kind || "soft"}
                    </Badge>
                  </div>
                </button>
              </li>
            ))}
            {!isLoading && filtered.length === 0 && (
              <li className="p-6 text-sm text-muted-foreground">No templates in this filter.</li>
            )}
          </ul>
        </div>

        {filtered.length > PAGE_SIZE && (
          <PagePagination page={page} pageCount={pageCount} onPageChange={setPage} />
        )}
      </div>

      <Sheet
        open={editorOpen}
        onOpenChange={(openSheet) => {
          if (!openSheet) closeEditor();
        }}
      >
        <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col gap-0 overflow-hidden max-h-dvh">
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0 text-left">
            <SheetTitle className="font-heading">
              {selectedId === "new" ? "New marketing template" : draft.name || draft.template_key || "Edit template"}
            </SheetTitle>
            <SheetDescription>
              Edit subject and HTML. Variables: {"{{name}} {{salesperson}} {{last_order}} {{email}}"}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-muted-foreground">Name</p>
                <Input value={draft.name || ""} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-muted-foreground">Key</p>
                <Input
                  value={draft.template_key}
                  disabled={Boolean(draft.id) && draft.template_kind === "soft"}
                  onChange={(e) => setDraft((d) => ({ ...d, template_key: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-muted-foreground">Kind</p>
                <Select
                  value={draft.template_kind || "marketing"}
                  onValueChange={(v) => setDraft((d) => ({ ...d, template_kind: v }))}
                  disabled={draft.template_kind === "soft" && Boolean(draft.id)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="soft">Soft</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="outreach">Outreach</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <p className="text-xs text-muted-foreground">Subject</p>
                <Input value={draft.subject} onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowHtmlBody((v) => !v)}
                >
                  {showHtmlBody ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  HTML body
                </button>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    disabled={grok.isPending}
                    onClick={async () => {
                      try {
                        const out = await grok.mutateAsync({
                          mode: "template",
                          channel: "email",
                          subject: draft.subject,
                          html_body: draft.html_body,
                          tone: "warm professional",
                        });
                        if (out.subject) setDraft((d) => ({ ...d, subject: out.subject || d.subject }));
                        if (out.body) {
                          const html = /<p|<br|<div|<table/i.test(out.body)
                            ? out.body
                            : `<p>${out.body.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br/>")}</p>`;
                          setDraft((d) => ({
                            ...d,
                            html_body: html,
                            text_body: out.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
                          }));
                          setShowHtmlBody(true);
                        }
                        toast.success("Draft improved — review before saving");
                      } catch (e: unknown) {
                        toast.error(e instanceof Error ? e.message : "Improve failed");
                      }
                    }}
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    Improve with AI
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    disabled={!draft.html_body?.trim()}
                    onClick={() => setPreviewOpen(true)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Preview
                  </Button>
                </div>
              </div>
              {showHtmlBody && (
                <Textarea
                  className="min-h-[220px] font-mono text-xs"
                  value={draft.html_body}
                  onChange={(e) => setDraft((d) => ({ ...d, html_body: e.target.value }))}
                />
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowTextBody((v) => !v)}
              >
                {showTextBody ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                Text body
              </button>
              {showTextBody && (
                <Textarea
                  className="min-h-[80px]"
                  value={draft.text_body || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, text_body: e.target.value }))}
                />
              )}
            </div>
          </div>

          <div className="shrink-0 border-t px-6 py-4 flex flex-wrap gap-2 bg-background">
            <Button
              className="rounded-xl"
              disabled={save.isPending || !draft.template_key || !draft.subject}
              onClick={async () => {
                try {
                  await save.mutateAsync(draft);
                  toast.success("Template saved");
                  closeEditor();
                } catch (e: unknown) {
                  toast.error(e instanceof Error ? e.message : "Save failed");
                }
              }}
            >
              Save template
            </Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={closeEditor}>
              Cancel
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col gap-0 overflow-hidden max-h-dvh">
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0 text-left">
            <SheetTitle className="font-heading">Template preview</SheetTitle>
            <SheetDescription>
              Sample merge for {TEMPLATE_SAMPLE.name}. This is how the styled HTML will look in the inbox.
            </SheetDescription>
          </SheetHeader>
          <div className="px-6 py-3 border-b bg-muted/30 shrink-0">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Subject</p>
            <p className="text-sm font-medium mt-0.5">{previewSubject || "(no subject)"}</p>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden bg-[#F3F7F0]">
            <iframe
              title="Email template preview"
              className="w-full h-full min-h-[50vh] sm:min-h-[70vh] border-0 bg-[#F3F7F0]"
              sandbox=""
              srcDoc={previewBody}
            />
          </div>
        </SheetContent>
      </Sheet>
    </PageFrame>
  );
}
