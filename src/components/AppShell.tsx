import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { MissedMailDialog } from "@/components/MissedMailDialog";
import { WorkspaceNav, WorkspaceNavFooter } from "@/components/WorkspaceNav";

function pageTitle(pathname: string) {
  if (pathname.startsWith("/customers/")) return "Customer";
  if (pathname.startsWith("/orders/") && pathname !== "/orders") return "Order";
  if (pathname.startsWith("/campaigns/") && pathname !== "/campaigns") return "Campaign";
  if (pathname.startsWith("/queue")) return "Queue";
  if (pathname.startsWith("/follow-ups")) return "Follow-ups";
  if (pathname.startsWith("/inbox")) return "Inbox";
  if (pathname.startsWith("/orders")) return "Orders";
  if (pathname.startsWith("/templates")) return "Templates";
  if (pathname.startsWith("/campaigns")) return "Campaigns";
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  if (pathname.startsWith("/settings")) return "Settings";
  return "CGE";
}

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const closeNav = useCallback(() => setNavOpen(false), []);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

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
      <aside className="hidden lg:flex w-[260px] h-full shrink-0 border-r bg-sidebar flex-col overflow-hidden">
        <WorkspaceNav pathname={location.pathname} />
        <WorkspaceNavFooter onSignOut={() => setSignOutOpen(true)} />
      </aside>

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 border-b bg-background/95 backdrop-blur px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open navigation"
            onClick={() => setNavOpen(true)}
          >
            <Menu />
          </Button>
          <p className="font-heading text-sm font-semibold truncate min-w-0 flex-1">{pageTitle(location.pathname)}</p>
          <div className="size-8 rounded-full bg-primary/15 text-primary grid place-items-center text-[10px] font-semibold shrink-0">
            {user?.initials}
          </div>
        </header>

        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <Sheet
        open={navOpen}
        onOpenChange={setNavOpen}
      >
        <SheetContent side="left" className="p-0 w-full sm:max-w-sm flex flex-col">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <WorkspaceNav pathname={location.pathname} onNavigate={closeNav} animate={navOpen} />
          <WorkspaceNavFooter
            onSignOut={() => {
              closeNav();
              setSignOutOpen(true);
            }}
          />
        </SheetContent>
      </Sheet>

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
      <MissedMailDialog />
    </div>
  );
}
