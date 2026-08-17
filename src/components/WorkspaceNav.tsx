import { useRef, useState } from "react";
import { NavLink } from "react-router-dom";
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
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadMailSummary } from "@/hooks/use-cge-data";
import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { QUEUE_SEGMENT_ROUTES, queuePathForSegment } from "@/lib/segments";
import type { AppCapability } from "@/lib/auth-capabilities";
import { UnreadCountPill } from "@/components/UnreadCountPill";

gsap.registerPlugin(useGSAP);

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
  { to: "/templates", label: "Templates", icon: Mail, capability: "view_templates" },
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

export function WorkspaceNav({
  pathname,
  onNavigate,
  animate,
}: {
  pathname: string;
  onNavigate?: () => void;
  animate?: boolean;
}) {
  const { user, hasCapability, isPreview } = useAuth();
  const queueOpen = pathname.startsWith("/queue");
  const [queueExpanded, setQueueExpanded] = useState(true);
  const canInbox = hasCapability("view_mail_inbox");
  const { data: unreadMail } = useUnreadMailSummary(canInbox ? user?.id : undefined);
  const inboxUnread = unreadMail?.total ?? 0;
  const navRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!animate) return;
      const items = navRef.current?.querySelectorAll("[data-nav-item]");
      if (!items?.length) return;
      if (prefersReducedMotion()) {
        gsap.set(items, { autoAlpha: 1, x: 0 });
        return;
      }
      gsap.from(items, {
        autoAlpha: 0,
        x: -12,
        duration: 0.3,
        stagger: 0.04,
        ease: "power3.out",
        clearProps: "transform",
      });
    },
    { scope: navRef, dependencies: [animate] },
  );

  return (
    <div ref={navRef} className="h-full flex flex-col overflow-hidden bg-sidebar">
      <div className="px-4 py-5 flex items-center gap-3" data-nav-item>
        <div className="size-9 rounded-xl bg-primary grid place-items-center shrink-0">
          <img src="/white logo.png" alt="Logo" className="size-5 object-contain" />
        </div>
        <div className="min-w-0">
          <p className="font-heading font-semibold text-sm leading-tight truncate">CGE Workspace</p>
          <p className="text-xs text-muted-foreground truncate">
            {isPreview ? "UI preview · mock data" : "Customer Growth Engine"}
          </p>
        </div>
      </div>

      <div className="px-3 pb-3" data-nav-item>
        <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 h-9 text-sm text-muted-foreground">
          <Search className="size-3.5" />
          <span>Search</span>
          <kbd className="ml-auto text-[10px] border rounded px-1.5 py-0.5 hidden sm:inline">/</kbd>
        </div>
      </div>

      <nav className="px-2 flex flex-col gap-1 flex-1 overflow-y-auto">
        <p className="px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase" data-nav-item>
          Sales operations
        </p>

        {hasCapability(dashboardNav.capability) && (
          <NavLink
            to={dashboardNav.to}
            data-nav-item
            onClick={onNavigate}
            className={({ isActive }) => navClass(isActive)}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r bg-primary" />
                )}
                <dashboardNav.icon className="size-4" />
                {dashboardNav.label}
              </>
            )}
          </NavLink>
        )}

        {hasCapability("view_queue") && (
          <div className="flex flex-col gap-0.5" data-nav-item>
            <button
              type="button"
              onClick={() => setQueueExpanded((v) => !v)}
              className={cn(navClass(queueOpen), "w-full")}
            >
              {queueOpen && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r bg-primary" />}
              <ListChecks className="size-4" />
              <span className="flex-1 text-left">Queue</span>
              <ChevronDown className={cn("size-3.5 transition-transform", queueExpanded && "rotate-180")} />
            </button>
            {queueExpanded && (
              <div className="ml-3 border-l pl-2 flex flex-col gap-0.5">
                {QUEUE_SEGMENT_ROUTES.map((item) => {
                  const to = queuePathForSegment(item.segment);
                  return (
                    <NavLink
                      key={item.segment}
                      to={to}
                      end={item.segment === "all"}
                      onClick={onNavigate}
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
            <NavLink
              key={item.to}
              to={item.to}
              data-nav-item
              onClick={onNavigate}
              className={({ isActive }) => navClass(isActive)}
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r bg-primary" />}
                  <item.icon className="size-4" />
                  <span className="flex-1">{item.label}</span>
                  {item.to === "/inbox" && <UnreadCountPill count={inboxUnread} />}
                </>
              )}
            </NavLink>
          ))}

        {hasCapability(settingsNav.capability) && user?.role !== "salesperson" && (
          <NavLink
            to={settingsNav.to}
            data-nav-item
            onClick={onNavigate}
            className={({ isActive }) => navClass(isActive)}
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r bg-primary" />}
                <settingsNav.icon className="size-4" />
                {settingsNav.label}
              </>
            )}
          </NavLink>
        )}
      </nav>
    </div>
  );
}

export function WorkspaceNavFooter({ onSignOut }: { onSignOut: () => void }) {
  const { user } = useAuth();
  return (
    <div className="border-t p-3 flex items-center gap-2">
      <div className="size-9 rounded-full bg-primary/15 text-primary grid place-items-center text-xs font-semibold shrink-0">
        {user?.initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{user?.name}</p>
        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
      </div>
      <Button variant="ghost" size="icon" title="Sign out" aria-label="Sign out" onClick={onSignOut}>
        <LogOut />
      </Button>
    </div>
  );
}
