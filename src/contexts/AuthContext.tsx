import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { isPreview, supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { resolveCapabilities, type AppCapability } from "@/lib/auth-capabilities";
import { PREVIEW_USER } from "@/lib/ui-preview";

export type UserRole = "admin" | "cge" | "salesperson";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roles: UserRole[];
  initials: string;
  salesperson_name?: string;
  hasDbRole: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  capabilities: AppCapability[];
  hasCapability: (capability: AppCapability) => boolean;
  isAdmin: boolean;
  isCge: boolean;
  refreshSessionUser: () => Promise<void>;
  isPreview: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getInitials(email: string, name?: string): string {
  if (name) return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  return email.slice(0, 2).toUpperCase();
}

const rolePriority: UserRole[] = ["admin", "cge", "salesperson"];

function pickPrimaryRole(roles: UserRole[]): UserRole {
  for (const role of rolePriority) {
    if (roles.includes(role)) return role;
  }
  return "cge";
}

async function fetchUserRole(userId: string): Promise<{ role: UserRole; roles: UserRole[]; salesperson_name?: string } | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role, salesperson_name")
    .eq("user_id", userId);
  if (error || !data) return null;
  const roles = Array.from(new Set(data.map((row) => row.role as UserRole)));
  if (!roles.length) return null;
  const named = data.find((row) => (row.salesperson_name || "").trim().length > 0);
  return {
    role: pickPrimaryRole(roles),
    roles,
    salesperson_name: named?.salesperson_name || undefined,
  };
}

function buildAppUser(authUser: User, role: UserRole, opts?: { roles?: UserRole[]; salesperson_name?: string; hasDbRole?: boolean }): AppUser {
  const email = authUser.email || "";
  const salesperson_name = opts?.salesperson_name;
  const name = authUser.user_metadata?.full_name || authUser.user_metadata?.name || salesperson_name || email.split("@")[0];
  return {
    id: authUser.id,
    name,
    email,
    role,
    roles: opts?.roles?.length ? opts.roles : [role],
    initials: getInitials(email, name),
    salesperson_name,
    hasDbRole: opts?.hasDbRole ?? true,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(isPreview ? PREVIEW_USER : null);
  const [loading, setLoading] = useState(!isPreview);

  const applySession = useCallback(async (session: { user: User } | null, setLoadingFlag: boolean) => {
    if (isPreview) {
      setUser(PREVIEW_USER);
      if (setLoadingFlag) setLoading(false);
      return;
    }
    if (session?.user) {
      const roleData = await fetchUserRole(session.user.id);
      if (roleData) {
        setUser(buildAppUser(session.user, roleData.role, { roles: roleData.roles, salesperson_name: roleData.salesperson_name, hasDbRole: true }));
      } else {
        setUser(buildAppUser(session.user, "cge", { hasDbRole: false }));
      }
    } else {
      setUser(null);
    }
    if (setLoadingFlag) setLoading(false);
  }, []);

  const refreshSessionUser = useCallback(async () => {
    if (isPreview) {
      setUser(PREVIEW_USER);
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    await applySession(session as { user: User } | null, false);
  }, [applySession]);

  useEffect(() => {
    if (isPreview) {
      setUser(PREVIEW_USER);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        if (cancelled) return;
        void applySession(session as { user: User } | null, true);
      }, 0);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const login = async (email: string, password: string): Promise<string | null> => {
    if (isPreview) {
      setUser(PREVIEW_USER);
      return null;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    return error ? error.message : null;
  };

  const logout = async () => {
    if (isPreview) {
      // Stay in preview — reload keeps demo user
      setUser(PREVIEW_USER);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
  };

  const capabilities = user ? resolveCapabilities(user.roles) : [];

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        capabilities,
        hasCapability: (c) => capabilities.includes(c),
        isAdmin: !!user?.roles.includes("admin"),
        isCge: !!user?.roles.includes("cge"),
        refreshSessionUser,
        isPreview,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
