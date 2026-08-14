import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAccessTokenForEdgeFunctions, parseEdgeFunctionErrorPayload } from "@/lib/supabase-edge-auth";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2, UserMinus } from "lucide-react";
import { SettingsSectionTitle } from "@/components/settings/SettingsSectionTitle";
import { useOffboardCge } from "@/hooks/use-cge-data";

export type ListedAppUser = {
  id: string;
  email: string | null;
  full_name: string;
  created_at: string;
  role: "admin" | "salesperson" | "cge" | null;
  salesperson_name: string | null;
  has_role_row: boolean;
};

const MIN_PASSWORD_LEN = 8;
const PAGE_SIZE = 8;

async function invokeAdminUsers<T>(body: Record<string, unknown>): Promise<T> {
  const accessToken = await getAccessTokenForEdgeFunctions();
  if (!accessToken) throw new Error("Your session expired. Please sign in again.");
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const parsed = parseEdgeFunctionErrorPayload(data, error);
  if (parsed) throw new Error(parsed);
  return data as T;
}

type FormState = {
  email: string;
  password: string;
  full_name: string;
  role: "admin" | "salesperson" | "cge";
  salesperson_name: string;
};

const emptyForm = (): FormState => ({
  email: "",
  password: "",
  full_name: "",
  role: "cge",
  salesperson_name: "",
});

export function SettingsUserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ListedAppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<ListedAppUser | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ListedAppUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [offboardTarget, setOffboardTarget] = useState<ListedAppUser | null>(null);
  const [successorId, setSuccessorId] = useState<string>("");
  const [offboarding, setOffboarding] = useState(false);
  const offboard = useOffboardCge();
  const [page, setPage] = useState(1);

  const cgeSuccessors = useMemo(
    () => users.filter((u) => u.role === "cge" && u.id !== offboardTarget?.id),
    [users, offboardTarget],
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invokeAdminUsers<{ users: ListedAppUser[] }>({ action: "list" });
      setUsers(res.users || []);
      setPage(1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load users");
      setUsers([]);
      setPage(1);
    } finally {
      setLoading(false);
    }
  }, []);

  const pageCount = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const pageUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return users.slice(start, start + PAGE_SIZE);
  }, [users, page]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function openCreate() {
    setFormMode("create");
    setEditing(null);
    setForm(emptyForm());
    setFormOpen(true);
  }

  function openEdit(u: ListedAppUser) {
    setFormMode("edit");
    setEditing(u);
    setForm({
      email: u.email || "",
      password: "",
      full_name: u.full_name || "",
      role: u.role || "cge",
      salesperson_name: u.salesperson_name || "",
    });
    setFormOpen(true);
  }

  function validateForm(): string | null {
    if (!form.email.trim().includes("@")) return "Enter a valid email address.";
    if (formMode === "create" && form.password.length < MIN_PASSWORD_LEN) {
      return `Password must be at least ${MIN_PASSWORD_LEN} characters.`;
    }
    if (form.password.length > 0 && form.password.length < MIN_PASSWORD_LEN) {
      return `Password must be at least ${MIN_PASSWORD_LEN} characters.`;
    }
    if (form.role === "salesperson" && !form.salesperson_name.trim()) {
      return "Salesperson display name is required (must match Shopify SP_Assigned / referred_by).";
    }
    return null;
  }

  async function saveForm() {
    const err = validateForm();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      if (formMode === "create") {
        await invokeAdminUsers({
          action: "create",
          email: form.email.trim(),
          password: form.password,
          full_name: form.full_name.trim(),
          role: form.role,
          salesperson_name: form.salesperson_name.trim() || null,
        });
        toast.success("User created");
      } else if (editing) {
        await invokeAdminUsers({
          action: "update",
          user_id: editing.id,
          email: form.email.trim(),
          ...(form.password ? { password: form.password } : {}),
          full_name: form.full_name.trim(),
          role: form.role,
          salesperson_name: form.salesperson_name.trim() || null,
        });
        toast.success("User updated");
      }
      setFormOpen(false);
      await loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await invokeAdminUsers({ action: "delete", user_id: deleteTarget.id });
      toast.success("User deleted");
      setDeleteTarget(null);
      await loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SettingsSectionTitle
          title="Users"
          tip="Create admins, CGEs, and salespersons. Salesperson display names must match Shopify ownership labels (SP_Assigned / referred_by)."
        />
        <Button className="rounded-xl" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add user
        </Button>
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Shopify label</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="p-6 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  Loading…
                </td>
              </tr>
            )}
            {!loading &&
              pageUsers.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3 font-medium">{u.full_name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{u.email || "—"}</td>
                  <td className="p-3 capitalize">{u.role || "—"}</td>
                  <td className="p-3">{u.salesperson_name || "—"}</td>
                  <td className="p-3 text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {u.role === "cge" && u.id !== currentUser?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Offboard CGE"
                        onClick={() => {
                          setOffboardTarget(u);
                          setSuccessorId("");
                        }}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={u.id === currentUser?.id}
                      onClick={() => setDeleteTarget(u)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!loading && users.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, users.length)} of {users.length}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              Page {page} of {pageCount}
            </span>
            <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">{formMode === "create" ? "Add user" : "Edit user"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{formMode === "create" ? "Password" : "New password (optional)"}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v: FormState["role"]) => setForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="cge">CGE</SelectItem>
                  <SelectItem value="salesperson">Salesperson</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(form.role === "salesperson" || form.role === "cge") && (
              <div className="space-y-1.5">
                <Label>{form.role === "salesperson" ? "Shopify salesperson name" : "Display name (optional)"}</Label>
                <Input
                  value={form.salesperson_name}
                  onChange={(e) => setForm((f) => ({ ...f, salesperson_name: e.target.value }))}
                  placeholder={form.role === "salesperson" ? "e.g. Neil Gill" : "Optional"}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void saveForm()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {deleteTarget?.email || "this account"} and their role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={() => void confirmDelete()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!offboardTarget}
        onOpenChange={(o) => {
          if (!o) setOffboardTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Offboard CGE</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Deactivates send-as email, removes CGE role, reassigns open tasks/threads, and bans login.
              Email history stays in the system.
            </p>
            <p className="font-medium">{offboardTarget?.full_name || offboardTarget?.email}</p>
            <div className="space-y-1.5">
              <Label>Successor (optional)</Label>
              <Select value={successorId || "__none__"} onValueChange={(v) => setSuccessorId(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Leave unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Leave unassigned</SelectItem>
                  {cgeSuccessors.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOffboardTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={offboarding || offboard.isPending}
              onClick={async () => {
                if (!offboardTarget) return;
                setOffboarding(true);
                try {
                  const result = await offboard.mutateAsync({
                    user_id: offboardTarget.id,
                    successor_user_id: successorId || null,
                    ban_auth: true,
                  });
                  toast.success(
                    `Offboarded — tasks ${String((result as { tasks_reassigned?: number })?.tasks_reassigned ?? 0)}, threads ${String((result as { threads_reassigned?: number })?.threads_reassigned ?? 0)}`,
                  );
                  setOffboardTarget(null);
                  await loadUsers();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Offboard failed");
                } finally {
                  setOffboarding(false);
                }
              }}
            >
              {offboarding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Offboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
