import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useAppSettings,
  useCgeUsersOptions,
  useMailIdentities,
  useSaveAppSettings,
  useSaveMailIdentity,
} from "@/hooks/use-cge-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SettingsSectionTitle } from "@/components/settings/SettingsSectionTitle";
import { Switch } from "@/components/ui/switch";

export function SettingsMailIdentities() {
  const { data: identities = [], isLoading } = useMailIdentities();
  const { data: cges = [] } = useCgeUsersOptions();
  const { data: settings } = useAppSettings();
  const saveSettings = useSaveAppSettings();
  const save = useSaveMailIdentity();

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inboundDomain, setInboundDomain] = useState("");

  const identityByUser = useMemo(() => {
    const m = new Map(identities.map((i) => [i.user_id, i]));
    return m;
  }, [identities]);

  const labelFor = (uid: string) => cges.find((c) => c.user_id === uid)?.label || uid.slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <SettingsSectionTitle
          title="CGE send-as emails"
          tip="Each CGE sends follow-up email as their company address via Resend. Soft/campaign mail still uses the shared brand From. Set inbound domain for Reply-To routing (e.g. inbound.yourdomain.com)."
        />
      </div>

      <div className="rounded-xl border p-4 space-y-3">
        <Label>Inbound reply domain</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-md"
            placeholder="inbound.yourdomain.com"
            value={inboundDomain || settings?.cge_mail_inbound_domain || ""}
            onChange={(e) => setInboundDomain(e.target.value)}
          />
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={saveSettings.isPending}
            onClick={async () => {
              try {
                await saveSettings.mutateAsync({
                  cge_mail_inbound_domain: (inboundDomain || settings?.cge_mail_inbound_domain || "").trim(),
                });
                toast.success("Inbound domain saved");
              } catch (e: unknown) {
                toast.error(e instanceof Error ? e.message : "Save failed");
              }
            }}
          >
            Save domain
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Point MX for this subdomain to Resend Inbound, then webhook to{" "}
          <code className="text-[11px]">/functions/v1/cge-mail-inbound</code> with header{" "}
          <code className="text-[11px]">x-cge-webhook-secret</code>.
        </p>
      </div>

      <div className="rounded-xl border p-4 grid md:grid-cols-3 gap-3 items-end">
        <div className="space-y-1.5">
          <Label>CGE user</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Select CGE" />
            </SelectTrigger>
            <SelectContent>
              {cges.map((c) => (
                <SelectItem key={c.user_id} value={c.user_id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Send-as email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="aiden@company.com" />
        </div>
        <div className="space-y-1.5">
          <Label>Display name</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Aiden Hudson" />
        </div>
        <Button
          className="rounded-xl md:col-span-3 w-fit"
          disabled={!userId || !email.includes("@") || save.isPending}
          onClick={async () => {
            try {
              const existing = identityByUser.get(userId);
              await save.mutateAsync({
                id: existing?.id,
                user_id: userId,
                email,
                display_name: displayName || labelFor(userId),
                active: true,
              });
              toast.success("Mail identity saved");
              setEmail("");
              setDisplayName("");
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : "Save failed");
            }
          }}
        >
          Save identity
        </Button>
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">CGE</th>
              <th className="text-left p-3">Send-as</th>
              <th className="text-left p-3">Display name</th>
              <th className="text-left p-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="p-6 text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {identities.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="p-3">{labelFor(i.user_id)}</td>
                <td className="p-3">{i.email}</td>
                <td className="p-3">{i.display_name || "—"}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={i.active}
                      onCheckedChange={async (checked) => {
                        try {
                          await save.mutateAsync({
                            id: i.id,
                            user_id: i.user_id,
                            email: i.email,
                            display_name: i.display_name,
                            active: checked,
                          });
                          toast.success(checked ? "Activated" : "Deactivated");
                        } catch (e: unknown) {
                          toast.error(e instanceof Error ? e.message : "Update failed");
                        }
                      }}
                    />
                    <Badge variant="outline">{i.active ? "active" : "off"}</Badge>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && identities.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  No mail identities yet. Assign a company send-as address to each CGE.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
