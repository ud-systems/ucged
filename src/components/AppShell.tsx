import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ListChecks,
  Settings,
  LogOut,
  Search,
  ChevronDown,
  History,
  ShoppingBag,
  Mail,
  Megaphone,
  Inbox,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import { QUEUE_SEGMENT_ROUTES, queuePathForSegment } from "@/lib/segments";
import type { AppCapability } from "@/lib/auth-capabilities";

type NavItem = {
  to: string;
  label: string;
  icon: typeof ListChecks;
  capability: AppCapability;
};

const primaryNav: NavItem[] = [
  { to: "/follow-ups", label: "Follow-ups", icon: History, capability: "view_followups" },
  { to: "/inbox", label: "Inbox", icon: Inbox, capability: "view_mail_inbox" },
  { to: "/orders", label: "Orders", icon: ShoppingBag, capability: "view_orders" },
  { to: "/templates", label: "Templates", icon: Mail, capability: "manage_templates" },
  { to: "/campaigns", label: "Campaigns", icon: Megaphone, capability: "manage_campaigns" },
];

const settingsNav: NavItem = {
  to: "/settings",
  label: "Settings",
  icon: Settings,
  capability: "manage_settings",
};

const dashboardNav: NavItem = {
  to: "/dashboard",
  label: "Dashboard",
  icon: LayoutDashboard,
  capability: "view_dashboard",
};

function navClass(isActive: boolean) {
  return cn(
    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-body transition-colors relative",
    isActive
      ? "bg-sidebar-accent text-foreground font-medium"
      : "text-sidebar-foreground hover:bg-muted/60",
  );
}

export function AppShell() {
  const { user, logout, hasCapability, isPreview } = useAuth();
  const location = useLocation();
  const queueOpen = location.pathname.startsWith("/queue");
  const [queueExpanded, setQueueExpanded] = useState(true);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const confirmSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
      setSignOutOpen(false);
    }
  };

  return (
    <div className="h-dvh overflow-hidden flex bg-background">
      <aside className="w-[260px] h-full shrink-0 border-r bg-sidebar flex flex-col overflow-hidden">
        <div className="px-4 py-5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary grid place-items-center shrink-0">
            <img src="/white logo.png" alt="Logo" className="h-5 w-5 object-contain" />
          </div>
          <div>
            <p className="font-heading font-semibold text-sm leading-tight">CGE Workspace</p>
            <p className="text-xs text-muted-foreground">
              {isPreview ? "UI preview · mock data" : "Customer Growth Engine"}
            </p>
          </div>
        </div>

        <div className="px-3 pb-3">
          <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 h-9 text-sm text-muted-foreground">
            <Search className="h-3.5 w-3.5" />
            <span>Search</span>
            <kbd className="ml-auto text-[10px] border rounded px-1.5 py-0.5">/</kbd>
          </div>
        </div>

        <nav className="px-2 space-y-1 flex-1 overflow-y-auto">
          <p className="px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Sales operations
          </p>

          {hasCapability(dashboardNav.capability) && (
            <NavLink to={dashboardNav.to} className={({ isActive }) => navClass(isActive)}>
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r bg-primary" />
                  )}
                  <dashboardNav.icon className="h-4 w-4" />
                  {dashboardNav.label}
                </>
              )}
            </NavLink>
          )}

          {hasCapability("view_queue") && (
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => setQueueExpanded((v) => !v)}
                className={cn(navClass(queueOpen), "w-full")}
              >
                {queueOpen && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r bg-primary" />}
                <ListChecks className="h-4 w-4" />
                <span className="flex-1 text-left">Queue</span>
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", queueExpanded && "rotate-180")} />
              </button>
              {queueExpanded && (
                <div className="ml-3 border-l pl-2 space-y-0.5">
                  {QUEUE_SEGMENT_ROUTES.map((item) => {
                    const to = queuePathForSegment(item.segment);
                    return (
                      <NavLink
                        key={item.segment}
                        to={to}
                        end={item.segment === "all"}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center rounded-lg px-3 py-1.5 text-xs transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                          )
                        }
                      >
                        {item.label}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {primaryNav
            .filter((item) => hasCapability(item.capability))
            .map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => navClass(isActive)}>
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r bg-primary" />}
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}

          {hasCapability(settingsNav.capability) && user?.role !== "salesperson" && (
            <NavLink to={settingsNav.to} className={({ isActive }) => navClass(isActive)}>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r bg-primary" />}
                  <settingsNav.icon className="h-4 w-4" />
                  {settingsNav.label}
                </>
              )}
            </NavLink>
          )}
        </nav>

        <div className="border-t p-3 flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-primary/15 text-primary grid place-items-center text-xs font-semibold">
            {user?.initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            title="Sign out"
            aria-label="Sign out"
            onClick={() => setSignOutOpen(true)}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 min-h-0 overflow-y-auto">
        <Outlet />
      </main>

      <AlertDialog open={signOutOpen} onOpenChange={(open) => !signingOut && setSignOutOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign in again to use the CGE workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={signingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={signingOut} onClick={() => void confirmSignOut()}>
              {signingOut ? "Signing out…" : "Sign out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
