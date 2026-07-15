"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, FolderOpen, Users, TrendingUp, MessageSquare,
  FileText, CreditCard, Calendar, Globe, Package, BarChart3,
  Megaphone, BookOpen, CheckSquare, DollarSign, UserCheck,
  Rss, Settings, ScrollText, Search, ChevronLeft, ChevronRight,
  LogOut, User, ChevronDown, Database, FileSignature,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

// ─── Nav structure ─────────────────────────────────────────────────────────────

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
      { href: "/admin/calendar", icon: Calendar, label: "Calendar" },
    ],
  },
  {
    label: "Clients & Sales",
    items: [
      { href: "/admin/clients", icon: Users, label: "Clients" },
      { href: "/admin/sales", icon: TrendingUp, label: "Sales Pipeline" },
      { href: "/admin/bookings", icon: BookOpen, label: "Bookings" },
      { href: "/admin/communications", icon: MessageSquare, label: "Communications" },
      { href: "/admin/documents", icon: FileSignature, label: "Documents" },
    ],
  },
  {
    label: "Projects",
    items: [
      { href: "/admin/projects", icon: FolderOpen, label: "Projects" },
      { href: "/admin/tasks", icon: CheckSquare, label: "Tasks", badge: true },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/admin/invoices", icon: FileText, label: "Invoices" },
      { href: "/admin/payments", icon: CreditCard, label: "Payments" },
      { href: "/admin/finance", icon: DollarSign, label: "Finance" },
      { href: "/admin/subscriptions", icon: Rss, label: "Subscriptions" },
    ],
  },
  {
    label: "Products",
    items: [
      { href: "/admin/products", icon: Package, label: "Products" },
    ],
  },
  {
    label: "Content & Marketing",
    items: [
      { href: "/admin/social", icon: BarChart3, label: "Social Media" },
      { href: "/admin/announcements", icon: Megaphone, label: "Announcements" },
      { href: "/admin/portfolio", icon: Globe, label: "Portfolio" },
      { href: "/admin/chat", icon: MessageSquare, label: "Brixo Chat" },
    ],
  },
  {
    label: "Team",
    items: [
      { href: "/admin/team", icon: UserCheck, label: "Team" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/sites", icon: Globe, label: "Site Monitoring" },
      { href: "/admin/database", icon: Database, label: "Database" },
      { href: "/admin/settings", icon: Settings, label: "Settings" },
      { href: "/admin/logs", icon: ScrollText, label: "Activity Log" },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AdminSidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [taskBadge, setTaskBadge] = useState<{ active: number; total: number } | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    navGroups.forEach((g) => {
      const hasActive = g.items.some((item) =>
        "exact" in item && item.exact ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/")
      );
      // Always open the first two groups + any group with active item
      init[g.label] = hasActive || g.label === "Overview" || g.label === "Clients & Sales" || g.label === "Projects";
    });
    return init;
  });

  useEffect(() => {
    fetch("/api/admin/tasks/count")
      .then((r) => r.ok ? r.json() : null)
      .then((j) => j && setTaskBadge(j))
      .catch(() => {});
  }, [pathname]);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  function toggleGroup(label: string) {
    setOpenGroups((p) => ({ ...p, [label]: !p[label] }));
  }

  async function handleSignOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar border-r border-sidebar-border transition-[width] duration-300 shrink-0 overflow-hidden",
        collapsed ? "w-[60px]" : "w-[228px]"
      )}
    >
      {/* ── Brand ── */}
      <div className={cn(
        "flex items-center border-b border-sidebar-border shrink-0",
        collapsed ? "h-14 justify-center px-0" : "h-14 gap-2.5 px-4"
      )}>
        <div className="w-7 h-7 rounded-lg bg-brand-gold flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-[#0b1120] font-black text-xs font-display tracking-tight">B</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-sidebar-foreground leading-none truncate">Brightex</p>
            <p className="text-[10px] text-sidebar-foreground/55 leading-none mt-0.5">Admin Console</p>
          </div>
        )}
      </div>

      {/* ── Search shortcut ── */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-1 shrink-0">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent/60 hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors text-xs"
          >
            <Search size={12} />
            <span className="flex-1 text-left">Search…</span>
            <kbd className="text-[9px] bg-sidebar-border/50 px-1 py-0.5 rounded font-mono opacity-60">⌘K</kbd>
          </button>
        </div>
      )}
      {collapsed && (
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
            className="w-9 h-8 rounded-lg bg-sidebar-accent/60 hover:bg-sidebar-accent flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors"
          >
            <Search size={13} />
          </button>
        </div>
      )}

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 scrollbar-overlay">
        {navGroups.map((group) => {
          const isOpen = openGroups[group.label] ?? false;
          const hasActive = group.items.some((item) => isActive(item.href, "exact" in item ? item.exact : undefined));

          return (
            <div key={group.label} className="mb-1">
              {/* Group header */}
              {!collapsed ? (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1.5 rounded-md transition-colors",
                    "text-sidebar-foreground/45 hover:text-sidebar-foreground/70",
                  )}
                >
                  <span className={cn(
                    "text-[10px] font-semibold uppercase tracking-[0.1em]",
                    hasActive && "text-sidebar-foreground/70"
                  )}>
                    {group.label}
                  </span>
                  <ChevronDown size={11} className={cn("transition-transform duration-200 opacity-50", isOpen ? "" : "-rotate-90")} />
                </button>
              ) : (
                <div className="h-px bg-sidebar-border/50 mx-2 my-2" />
              )}

              {/* Items */}
              {(collapsed || isOpen) && (
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item.href, "exact" in item ? item.exact : undefined);
                    const hasBadge = "badge" in item && item.badge && taskBadge;

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          title={collapsed ? item.label : undefined}
                          className={cn(
                            "relative flex items-center gap-2.5 rounded-lg transition-all duration-150",
                            collapsed ? "justify-center h-9 w-9 mx-auto" : "px-2.5 py-2 h-9",
                            active
                              ? "bg-sidebar-accent text-sidebar-foreground font-semibold"
                              : "text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground/95"
                          )}
                        >
                          {/* Active indicator bar */}
                          {active && !collapsed && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-gold rounded-full" />
                          )}
                          <item.icon size={15} className={cn("shrink-0", active ? "text-brand-gold" : "")} />
                          {!collapsed && (
                            <>
                              <span className="text-[13px] truncate flex-1 leading-none">{item.label}</span>
                              {hasBadge && taskBadge && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold border border-brand-gold/20 shrink-0">
                                  {taskBadge.active}/{taskBadge.total}
                                </span>
                              )}
                            </>
                          )}
                          {/* Tooltip dot for active in collapsed mode */}
                          {active && collapsed && (
                            <span className="absolute right-0.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-brand-gold" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── User / footer ── */}
      <div className="border-t border-sidebar-border shrink-0 p-2 space-y-0.5">
        {/* User row */}
        <div className={cn(
          "flex items-center rounded-lg px-2 py-2 gap-2.5",
          collapsed ? "justify-center" : ""
        )}>
          <div className="w-7 h-7 rounded-full bg-brand-gold/20 border border-brand-gold/30 flex items-center justify-center shrink-0">
            <span className="text-brand-gold text-xs font-bold">G</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-sidebar-foreground truncate leading-none">Godwin Brown</p>
              <p className="text-[10px] text-sidebar-foreground/55 truncate leading-none mt-0.5">Administrator</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleSignOut}
              className="w-7 h-7 rounded-md flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors shrink-0"
              title="Sign out"
            >
              <LogOut size={12} />
            </button>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className={cn(
            "w-full flex items-center gap-2 rounded-lg px-2 py-2 text-[12px] text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/60 transition-colors",
            collapsed ? "justify-center" : ""
          )}
        >
          {collapsed ? <ChevronRight size={13} /> : (
            <>
              <ChevronLeft size={13} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
