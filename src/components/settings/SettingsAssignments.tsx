import { useMemo, useState } from "react";
import { useCgeSalespersonLinks, useCgeUsersOptions, useSalespeopleOptions } from "@/hooks/use-cge-data";
import { supabase } from "@/integrations/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SettingsSectionTitle } from "@/components/settings/SettingsSectionTitle";
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

export function SettingsAssignments() {
  const { data: links = [], isLoading } = useCgeSalespersonLinks();
  const { data: cges = [] } = useCgeUsersOptions();
  const { data: salespeople = [] } = useSalespeopleOptions();
  const [cgeId, setCgeId] = useState("");
  const [spId, setSpId] = useState("");
  const [removeTarget, setRemoveTarget] = useState<{
    id: string;
    cge_user_id: string;
    salesperson_user_id: string;
  } | null>(null);
  const [removing, setRemoving] = useState(false);
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
    <div className="flex flex-col gap-4">
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

      <div className="flex flex-col gap-3 md:gap-0">
        <div className="flex flex-col gap-3 md:hidden">
          {links.map((link: { id: string; cge_user_id: string; salesperson_user_id: string }) => (
            <RecordCard key={link.id}>
              <p className="font-medium truncate">{labelFor(link.cge_user_id, cges)}</p>
              <p className="text-xs text-muted-foreground truncate">{labelFor(link.salesperson_user_id, salespeople)}</p>
              <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setRemoveTarget(link)}>
                Remove
              </Button>
            </RecordCard>
          ))}
          {!isLoading && links.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No links yet. Create salesperson + CGE users first, then link them.
            </p>
          )}
        </div>
        <DataTableShell loading={isLoading} className="hidden md:block">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>CGE</TableHead>
                <TableHead>Salesperson</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link: { id: string; cge_user_id: string; salesperson_user_id: string }) => (
                <TableRow key={link.id}>
                  <TableCell className="truncate max-w-[12rem]">{labelFor(link.cge_user_id, cges)}</TableCell>
                  <TableCell className="truncate max-w-[12rem]">{labelFor(link.salesperson_user_id, salespeople)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setRemoveTarget(link)}>
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && links.length === 0 && (
                <TableRow>
                  <TableCell className="p-6 text-muted-foreground text-center" colSpan={3}>
                    No links yet. Create salesperson + CGE users first, then link them.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DataTableShell>
      </div>

      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && !removing && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget
                ? `${labelFor(removeTarget.cge_user_id, cges)} will no longer see customers owned by ${labelFor(removeTarget.salesperson_user_id, salespeople)}.`
                : "This CGE will no longer see that salesperson's customers."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={removing}
              className={buttonVariants({ variant: "destructive" })}
              onClick={async () => {
                if (!removeTarget) return;
                setRemoving(true);
                try {
                  const { error } = await supabase.from("cge_salesperson_assignments").delete().eq("id", removeTarget.id);
                  if (error) toast.error(error.message);
                  else {
                    toast.success("Removed");
                    void qc.invalidateQueries({ queryKey: ["cge-sp-links"] });
                    setRemoveTarget(null);
                  }
                } finally {
                  setRemoving(false);
                }
              }}
            >
              {removing ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
