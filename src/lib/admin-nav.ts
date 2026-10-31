import {
  LayoutDashboard, CalendarDays, Users, FolderKanban, Wallet, FileSignature,
  Megaphone, Settings, UserCheck,
  type LucideIcon,
} from "lucide-react";

/**
 * Admin navigation: a few hubs in the sidebar, related pages as tabs inside
 * each hub. Routes are unchanged, so deep links, emails and bookmarks that
 * point at /admin/invoices etc. keep working.
 */

export interface AdminTab {
  href: string;
  label: string;
}

export interface AdminHub {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Where the sidebar item lands */
  href: string;
  tabs: AdminTab[];
  /** Shown in the phone bottom bar */
  primary?: boolean;
}

export const ADMIN_HUBS: AdminHub[] = [
  {
    key: "home", label: "Home", icon: LayoutDashboard, href: "/admin", primary: true,
    tabs: [{ href: "/admin", label: "Overview" }],
  },
  {
    key: "clients", label: "Clients", icon: Users, href: "/admin/clients", primary: true,
    tabs: [
      { href: "/admin/clients", label: "Directory" },
      { href: "/admin/sales", label: "Pipeline" },
      { href: "/admin/communications", label: "Messages" },
      { href: "/admin/chat", label: "Website chat" },
    ],
  },
  {
    key: "calendar", label: "Schedule", icon: CalendarDays, href: "/admin/calendar",
    tabs: [
      { href: "/admin/calendar", label: "Calendar" },
      { href: "/admin/bookings", label: "Bookings" },
    ],
  },
  {
    key: "work", label: "Projects", icon: FolderKanban, href: "/admin/projects", primary: true,
    tabs: [
      { href: "/admin/projects", label: "Projects" },
      { href: "/admin/tasks", label: "Tasks" },
      { href: "/admin/sops", label: "SOPs" },
    ],
  },
  {
    key: "documents", label: "Documents", icon: FileSignature, href: "/admin/documents",
    tabs: [{ href: "/admin/documents", label: "Documents" }],
  },
  {
    key: "finance", label: "Finance", icon: Wallet, href: "/admin/invoices", primary: true,
    tabs: [
      { href: "/admin/invoices", label: "Invoices" },
      { href: "/admin/payments", label: "Payments" },
      { href: "/admin/subscriptions", label: "Subscriptions" },
      { href: "/admin/finance", label: "Books" },
    ],
  },
  {
    key: "growth", label: "Marketing", icon: Megaphone, href: "/admin/social",
    tabs: [
      { href: "/admin/social", label: "Social" },
      { href: "/admin/announcements", label: "Announcements" },
      { href: "/admin/portfolio", label: "Portfolio" },
      { href: "/admin/products", label: "Products" },
    ],
  },
  {
    key: "team", label: "Team", icon: UserCheck, href: "/admin/team",
    tabs: [{ href: "/admin/team", label: "Team" }],
  },
  {
    key: "system", label: "System", icon: Settings, href: "/admin/settings",
    tabs: [
      { href: "/admin/settings", label: "Settings" },
      { href: "/admin/sites", label: "Site health" },
      { href: "/admin/logs", label: "Activity log" },
      { href: "/admin/database", label: "Database" },
    ],
  },
];

function matches(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/");
}

/** The hub and tab for a pathname. Nested routes (documents/[id]/edit) map to their parent tab. */
export function resolveAdminRoute(pathname: string): { hub?: AdminHub; tab?: AdminTab } {
  for (const hub of ADMIN_HUBS) {
    const tab = hub.tabs.find((t) => matches(pathname, t.href));
    if (tab) return { hub, tab };
  }
  return {};
}
