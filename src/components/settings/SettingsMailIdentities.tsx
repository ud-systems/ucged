import { useEffect, useMemo, useState } from "react";
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
import {
  DataTableShell,
  RecordCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/layout";

export function SettingsMailIdentities() {
  const { data: identities = [], isLoading } = useMailIdentities();
  const { data: cges = [], isFetching: cgesLoading } = useCgeUsersOptions();
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

  const fillFromCge = (uid: string) => {
    setUserId(uid);
    const cge = cges.find((c) => c.user_id === uid);
    const existing = identityByUser.get(uid);
    setEmail((existing?.email || cge?.email || "").trim());
    setDisplayName((existing?.display_name || cge?.full_name || cge?.label || "").trim());
  };

  // If CGE list enriches with emails after selection, fill empty email field.
  useEffect(() => {
    if (!userId || email.trim()) return;
    const cge = cges.find((c) => c.user_id === userId);
    if (cge?.email) setEmail(cge.email);
  }, [userId, email, cges]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SettingsSectionTitle
          title="CGE send-as emails"
          tip="Each CGE sends follow-up email as their company address via Resend. Soft/campaign mail still uses the shared brand From. Selecting a CGE autofills their login email and name (edit before save if needed). Set inbound domain for Reply-To routing (e.g. inbound.yourdomain.com)."
        />
      </div>

      <div className="rounded-xl border p-4 flex flex-col gap-3">
        <Label>Inbound reply domain</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            className="w-full max-w-md"
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
          Point MX for this subdomain to Resend Inbound, then Resend webhook{" "}
          <code className="text-[11px]">email.received</code> →{" "}
          <code className="text-[11px]">/functions/v1/cge-mail-inbound</code>. Leave inbound secret empty for
          Resend (they cannot send custom headers).
        </p>
      </div>

      <div className="rounded-xl border p-4 grid md:grid-cols-3 gap-3 items-end">
        <div className="flex flex-col gap-1.5">
          <Label>CGE user</Label>
          <Select value={userId} onValueChange={fillFromCge}>
            <SelectTrigger>
              <SelectValue placeholder="Select CGE" />
            </SelectTrigger>
            <SelectContent>
              {cges.map((c) => (
                <SelectItem key={c.user_id} value={c.user_id}>
                  {c.label}
                  {c.email ? ` · ${c.email}` : cgesLoading ? " · …" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Send-as email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Loads from CGE login email"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Display name</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Loads from CGE name"
          />
        </div>
        <Button
          className="rounded-xl md:col-span-3 w-full sm:w-fit"
          disabled={!userId || !email.includes("@") || save.isPending}
          onClick={async () => {
            try {
              const existing = identityByUser.get(userId);
              await save.mutateAsync({
                id: existing?.id,
                user_id: userId,
                email: email.trim().toLowerCase(),
                display_name: displayName.trim() || labelFor(userId),
                active: true,
              });
              toast.success("Mail identity saved");
              setUserId("");
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

      <div className="flex flex-col gap-3 md:gap-0">
        <div className="flex flex-col gap-3 md:hidden">
          {identities.map((i) => (
            <RecordCard key={i.id}>
              <p className="font-medium truncate">{labelFor(i.user_id)}</p>
              <p className="text-xs text-muted-foreground truncate">{i.email}</p>
              <p className="text-xs truncate mt-1">{i.display_name || "—"}</p>
              <div className="flex items-center gap-2 mt-2">
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
            </RecordCard>
          ))}
          {!isLoading && identities.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No mail identities yet. Assign a company send-as address to each CGE.
            </p>
          )}
        </div>
        <DataTableShell loading={isLoading} className="hidden md:block">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>CGE</TableHead>
                <TableHead>Send-as</TableHead>
                <TableHead className="hidden lg:table-cell">Display name</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {identities.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="truncate max-w-[10rem]">{labelFor(i.user_id)}</TableCell>
                  <TableCell className="truncate max-w-[14rem]">{i.email}</TableCell>
                  <TableCell className="hidden lg:table-cell truncate max-w-[10rem]">{i.display_name || "—"}</TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && identities.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="p-8 text-center text-muted-foreground">
                    No mail identities yet. Assign a company send-as address to each CGE.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DataTableShell>
      </div>
    </div>
  );
}
