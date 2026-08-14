import { useMemo, useState } from "react";
import { useCgeSalespersonLinks, useCgeUsersOptions, useSalespeopleOptions } from "@/hooks/use-cge-data";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SettingsSectionTitle } from "@/components/settings/SettingsSectionTitle";

export function SettingsAssignments() {
  const { data: links = [], isLoading } = useCgeSalespersonLinks();
  const { data: cges = [] } = useCgeUsersOptions();
  const { data: salespeople = [] } = useSalespeopleOptions();
  const [cgeId, setCgeId] = useState("");
  const [spId, setSpId] = useState("");
  const qc = useQueryClient();

  const cgeOptions = useMemo(
    () => cges.map((c) => ({ value: c.user_id, label: c.label })),
    [cges],
  );
  const salespersonOptions = useMemo(
    () => salespeople.map((s) => ({ value: s.user_id, label: s.label })),
    [salespeople],
  );

  const labelFor = (id: string, list: { user_id: string; label: string }[]) =>
    list.find((x) => x.user_id === id)?.label || id.slice(0, 8);

  return (
    <div className="space-y-4">
      <SettingsSectionTitle
        title="CGE ↔ Salesperson"
        tip="Link CGEs to salespersons so each CGE sees customers owned via Shopify SP_Assigned / referred_by."
      />

      <div className="grid sm:grid-cols-2 gap-3">
        <SearchableSelect
          value={cgeId}
          onValueChange={setCgeId}
          options={cgeOptions}
          placeholder="Select CGE"
          searchPlaceholder="Search CGE…"
          emptyText="No CGE users found."
        />
        <SearchableSelect
          value={spId}
          onValueChange={setSpId}
          options={salespersonOptions}
          placeholder="Select salesperson"
          searchPlaceholder="Search salesperson…"
          emptyText="No salespersons found."
        />
      </div>
      <Button
        className="rounded-xl"
        disabled={!cgeId || !spId}
        onClick={async () => {
          const { error } = await supabase.from("cge_salesperson_assignments").upsert(
            { cge_user_id: cgeId, salesperson_user_id: spId },
            { onConflict: "cge_user_id,salesperson_user_id" },
          );
          if (error) toast.error(error.message);
          else {
            toast.success("Link created");
            void qc.invalidateQueries({ queryKey: ["cge-sp-links"] });
          }
        }}
      >
        Link CGE to salesperson
      </Button>

      <div className="rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">CGE</th>
              <th className="text-left p-3">Salesperson</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="p-4 text-muted-foreground" colSpan={3}>
                  Loading…
                </td>
              </tr>
            )}
            {links.map((link: { id: string; cge_user_id: string; salesperson_user_id: string }) => (
              <tr key={link.id} className="border-t">
                <td className="p-3">{labelFor(link.cge_user_id, cges)}</td>
                <td className="p-3">{labelFor(link.salesperson_user_id, salespeople)}</td>
                <td className="p-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      const { error } = await supabase.from("cge_salesperson_assignments").delete().eq("id", link.id);
                      if (error) toast.error(error.message);
                      else {
                        toast.success("Removed");
                        void qc.invalidateQueries({ queryKey: ["cge-sp-links"] });
                      }
                    }}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
            {!isLoading && links.length === 0 && (
              <tr>
                <td className="p-6 text-muted-foreground text-center" colSpan={3}>
                  No links yet. Create salesperson + CGE users first, then link them.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
