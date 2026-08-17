import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAccessTokenForEdgeFunctions, readEdgeFunctionError } from "@/lib/supabase-edge-auth";
import { useAuth } from "@/contexts/AuthContext";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Eye, EyeOff, Loader2, Pencil, Plus, Search, Trash2, UserMinus } from "lucide-react";
import { SettingsSectionTitle } from "@/components/settings/SettingsSectionTitle";
import { useOffboardCge } from "@/hooks/use-cge-data";
import {
  DataTableShell,
  PagePagination,
  RecordCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/layout";

export type ListedAppUser = {
  id: string;
  email: string | null;
  full_name: string;
  created_at: string;
  role: "admin" | "salesperson" | "cge" | "supervisor" | null;
  roles?: Array<"admin" | "salesperson" | "cge" | "supervisor">;
  salesperson_name: string | null;
  has_salesperson?: boolean;
  has_role_row: boolean;
};

function roleLabel(u: ListedAppUser) {
  if (!u.role) return "—";
  if (u.role === "supervisor" && (u.has_salesperson || u.roles?.includes("salesperson"))) {
    return "Supervisor + Salesperson";
  }
  if (u.role === "cge") return "CGE";
  return u.role.charAt(0).toUpperCase() + u.role.slice(1);
}

const MIN_PASSWORD_LEN = 8;
const PAGE_SIZE = 8;

async function invokeAdminUsers<T>(body: Record<string, unknown>): Promise<T> {
  const accessToken = await getAccessTokenForEdgeFunctions();
  if (!accessToken) throw new Error("Your session expired. Please sign in again.");
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const parsed = await readEdgeFunctionError(data, error);
  if (parsed) throw new Error(parsed);
  if (error) throw new Error(error.message || "Request failed");
  return data as T;
}

type FormState = {
  email: string;
  password: string;
  full_name: string;
  role: "admin" | "salesperson" | "cge" | "supervisor";
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
  const [search, setSearch] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const cgeSuccessors = useMemo(
    () => users.filter((u) => u.role === "cge" && u.id !== offboardTarget?.id),
    [users, offboardTarget],
  );

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const hay = [u.full_name, u.email, u.role, u.salesperson_name, ...(u.roles ?? []), roleLabel(u)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [users, search]);

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

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pageUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, page]);

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
    setShowPassword(false);
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
    setShowPassword(false);
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-2">
        <SettingsSectionTitle
          title="Users"
          tip="Create admins, supervisors, CGEs, and salespersons. For a Shopify salesperson who should log in as supervisor (e.g. Rob Lister), set Role to Supervisor and keep their Shopify salesperson name — CGE keeps both."
        />
        <Button className="rounded-xl w-full sm:w-auto" onClick={openCreate}>
          <Plus data-icon="inline-start" /> Add user
        </Button>
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          className="pl-9 rounded-xl bg-card"
          placeholder="Search name, email, role…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="flex flex-col gap-3 md:gap-0">
        <div className="flex flex-col gap-3 md:hidden">
          {pageUsers.map((u) => (
            <RecordCard key={u.id}>
              <p className="font-medium truncate">{u.full_name || "—"}</p>
              <p className="text-xs text-muted-foreground truncate">{u.email || "—"}</p>
              <p className="text-xs capitalize mt-1">{roleLabel(u)} · {u.salesperson_name || "no label"}</p>
              <div className="flex justify-end gap-1 mt-2">
                <Button variant="ghost" size="icon" className="size-11" onClick={() => openEdit(u)} title="Edit">
                  <Pencil />
                </Button>
                {u.role === "cge" && u.id !== currentUser?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    title="Offboard CGE"
                    onClick={() => {
                      setOffboardTarget(u);
                      setSuccessorId("");
                    }}
                  >
                    <UserMinus />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  disabled={u.id === currentUser?.id}
                  onClick={() => setDeleteTarget(u)}
                  title="Delete"
                >
                  <Trash2 />
                </Button>
              </div>
            </RecordCard>
          ))}
          {!loading && filteredUsers.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {users.length === 0 ? "No users yet." : "No users match your search."}
            </p>
          )}
        </div>
        <DataTableShell loading={loading} className="hidden md:block">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden lg:table-cell">Shopify label</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading &&
                pageUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium max-w-[10rem] truncate">{u.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[14rem] truncate">{u.email || "—"}</TableCell>
                    <TableCell>{roleLabel(u)}</TableCell>
                    <TableCell className="hidden lg:table-cell truncate max-w-[10rem]">{u.salesperson_name || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Edit">
                          <Pencil />
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
                            <UserMinus />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={u.id === currentUser?.id}
                          onClick={() => setDeleteTarget(u)}
                          title="Delete"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              {!loading && filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="p-6 text-center text-muted-foreground">
                    {users.length === 0 ? "No users yet." : "No users match your search."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DataTableShell>
      </div>

      {!loading && filteredUsers.length > 0 && (
        <PagePagination page={page} pageCount={pageCount} onPageChange={setPage} />
      )}

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setShowPassword(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">{formMode === "create" ? "Add user" : "Edit user"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label>Full name</Label>
              <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{formMode === "create" ? "Password" : "New password (optional)"}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v: FormState["role"]) => setForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="cge">CGE</SelectItem>
                  <SelectItem value="salesperson">Salesperson</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(form.role === "salesperson" || form.role === "cge" || form.role === "supervisor") && (
              <div className="flex flex-col gap-1.5">
                <Label>
                  {form.role === "cge" ? "Display name (optional)" : "Shopify salesperson name"}
                </Label>
                <Input
                  value={form.salesperson_name}
                  onChange={(e) => setForm((f) => ({ ...f, salesperson_name: e.target.value }))}
                  placeholder="e.g. Rob Lister"
                />
                {form.role === "supervisor" && (
                  <p className="text-xs text-muted-foreground">
                    Leave this matching Shopify SP_Assigned / referred_by so their customer book still maps. Login stays Supervisor.
                  </p>
                )}
                {form.role === "salesperson" && (
                  <p className="text-xs text-muted-foreground">
                    Must match Shopify SP_Assigned / referred_by.
                  </p>
                )}
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
            <AlertDialogAction
              disabled={deleting}
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => void confirmDelete()}
            >
              {deleting ? "Deleting…" : "Delete"}
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
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-muted-foreground">
              Deactivates send-as email, removes CGE role, reassigns open tasks/threads, and bans login.
              Email history stays in the system.
            </p>
            <p className="font-medium">{offboardTarget?.full_name || offboardTarget?.email}</p>
            <div className="flex flex-col gap-1.5">
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
