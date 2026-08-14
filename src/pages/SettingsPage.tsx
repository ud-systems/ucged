import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAppSettings, useEmailTemplates, useSaveAppSettings, useTriggerShopifySync } from "@/hooks/use-cge-data";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsUserManagement } from "@/components/settings/SettingsUserManagement";
import { SettingsAssignments } from "@/components/settings/SettingsAssignments";
import { SettingsSyncHealth } from "@/components/settings/SettingsSyncHealth";
import { SettingsMailIdentities } from "@/components/settings/SettingsMailIdentities";
import { SettingsSectionTitle } from "@/components/settings/SettingsSectionTitle";
import { toast } from "sonner";

const KEYS = [
  "shopify_store_domain",
  "shopify_access_token",
  "shopify_client_id",
  "shopify_client_secret",
  "shopify_webhook_secret",
  "shopify_cron_secret",
  "datapulse_access_code",
  "datapulse_access_expires_at",
  "datapulse_validation_url",
  "datapulse_license_mode",
  "resend_from_email",
  "brand_logo_url",
  "cge_mail_inbound_domain",
  "sync_frequency",
] as const;

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "shopify";
  const { data: settings } = useAppSettings();
  const save = useSaveAppSettings();
  const sync = useTriggerShopifySync();
  const { data: templates = [] } = useEmailTemplates();
  const [form, setForm] = useState<Record<string, string>>({});
  const [softBusy, setSoftBusy] = useState(false);
  const [ownershipBusy, setOwnershipBusy] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  if (!isAdmin) return <Navigate to="/queue" replace />;

  return (
    <div className="p-6 lg:p-8 space-y-6 w-full max-w-none">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Shopify credentials, users, assignments, sync health, and soft-email templates.
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setParams(v === "shopify" ? {} : { tab: v });
        }}
      >
        <TabsList className="inline-flex w-fit h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="shopify">Shopify & DataPulse</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="mail">Mail identities</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="sync">Sync health</TabsTrigger>
          <TabsTrigger value="email">Soft email</TabsTrigger>
        </TabsList>

        <TabsContent value="shopify" className="mt-4">
          <section className="space-y-4 rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SettingsSectionTitle
                title="Shopify & DataPulseFlow"
                tip="Store credentials and DataPulseFlow license values for this CGE Supabase project (separate from uddash). Use Re-match to refresh salesperson ownership from Shopify labels."
              />
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={ownershipBusy}
                onClick={async () => {
                  setOwnershipBusy(true);
                  try {
                    const { error } = await supabase.rpc("backfill_salesperson_assignments_cgeapp");
                    if (error) throw error;
                    toast.success("Ownership labels backfilled from salesperson matches");
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : "Ownership backfill failed");
                  } finally {
                    setOwnershipBusy(false);
                  }
                }}
              >
                Re-match salesperson ownership
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-4">
              {KEYS.map((key) => (
                <div key={key} className="space-y-1.5 min-w-0">
                  <Label htmlFor={key}>{key}</Label>
                  <Input
                    id={key}
                    type={key.includes("token") || key.includes("secret") || key.includes("code") ? "password" : "text"}
                    value={form[key] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                className="rounded-xl"
                disabled={save.isPending}
                onClick={async () => {
                  try {
                    const payload: Record<string, string> = {};
                    for (const k of KEYS) payload[k] = form[k] ?? "";
                    await save.mutateAsync(payload);
                    toast.success("Settings saved");
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : "Save failed");
                  }
                }}
              >
                Save settings
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={sync.isPending}
                onClick={async () => {
                  try {
                    await sync.mutateAsync("customers");
                    toast.success("Customer sync started");
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : "Sync failed");
                  }
                }}
              >
                Sync customers
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={sync.isPending}
                onClick={async () => {
                  try {
                    await sync.mutateAsync("orders");
                    toast.success("Order sync started");
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : "Sync failed");
                  }
                }}
              >
                Sync orders
              </Button>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <section className="rounded-2xl border bg-card p-5">
            <SettingsUserManagement />
          </section>
        </TabsContent>

        <TabsContent value="mail" className="mt-4">
          <section className="rounded-2xl border bg-card p-5">
            <SettingsMailIdentities />
          </section>
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <section className="rounded-2xl border bg-card p-5">
            <SettingsAssignments />
          </section>
        </TabsContent>

        <TabsContent value="sync" className="mt-4">
          <section className="rounded-2xl border bg-card p-5">
            <SettingsSyncHealth />
          </section>
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          <section className="space-y-3 rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SettingsSectionTitle
                title="Soft email templates (day 60 / 75)"
                tip="Day-60/75 soft prevention emails sent by Resend via the cge-soft-email function. Use {{name}} placeholders in template bodies."
              />
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={softBusy}
                onClick={async () => {
                  setSoftBusy(true);
                  try {
                    const { data, error } = await supabase.functions.invoke("cge-soft-email", { body: {} });
                    if (error) throw error;
                    toast.success(`Soft email run: sent ${data?.sent ?? 0} / ${data?.attempted ?? 0}`);
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : "Soft email run failed");
                  } finally {
                    setSoftBusy(false);
                  }
                }}
              >
                Run soft emails now
              </Button>
            </div>
            <div className="space-y-3">
              {templates.map((t: { id: string; template_key: string; day_offset: number; segment: string; subject: string }) => (
                <div key={t.id} className="rounded-xl border p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <p className="font-medium">{t.template_key}</p>
                    <p className="text-xs text-muted-foreground">
                      day {t.day_offset} · {t.segment}
                    </p>
                  </div>
                  <p className="mt-1">{t.subject}</p>
                </div>
              ))}
              {templates.length === 0 && (
                <p className="text-sm text-muted-foreground">No templates yet — apply CGE migrations.</p>
              )}
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
