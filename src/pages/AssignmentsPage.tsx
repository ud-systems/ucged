import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCgeSalespersonLinks, useCgeUsersOptions, useSalespeopleOptions } from "@/hooks/use-cge-data";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function AssignmentsPage() {
  const { isAdmin } = useAuth();
  const { data: links = [], isLoading } = useCgeSalespersonLinks();
  const { data: cges = [] } = useCgeUsersOptions();
  const { data: salespeople = [] } = useSalespeopleOptions();
  const [cgeId, setCgeId] = useState("");
  const [spId, setSpId] = useState("");
  const qc = useQueryClient();

  if (!isAdmin) return <Navigate to="/queue" replace />;

  const labelFor = (id: string, list: { user_id: string; label: string }[]) =>
    list.find((x) => x.user_id === id)?.label || id.slice(0, 8);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="font-heading text-3xl font-semibold">CGE ↔ Salesperson</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Each CGE sees Shopify customers owned by their linked salespersons (via SP_Assigned / referred_by).
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Select value={cgeId} onValueChange={setCgeId}>
            <SelectTrigger><SelectValue placeholder="Select CGE" /></SelectTrigger>
            <SelectContent>
              {cges.map((c) => (
                <SelectItem key={c.user_id} value={c.user_id}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={spId} onValueChange={setSpId}>
            <SelectTrigger><SelectValue placeholder="Select salesperson" /></SelectTrigger>
            <SelectContent>
              {salespeople.map((s) => (
                <SelectItem key={s.user_id} value={s.user_id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
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
              <tr><td className="p-4 text-muted-foreground" colSpan={3}>Loading…</td></tr>
            )}
            {links.map((link: any) => (
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
              <tr><td className="p-6 text-muted-foreground text-center" colSpan={3}>No links yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
