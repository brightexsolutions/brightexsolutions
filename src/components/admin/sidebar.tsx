"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, FolderOpen, Users, TrendingUp, MessageSquare,
  FileText, CreditCard, Calendar, Globe, Package, BarChart3,
  Megaphone, ChevronLeft, ChevronRight, BookOpen,
  DollarSign, UserCheck, Rss, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Overview",
    defaultOpen: true,
    items: [
      { href: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
      { href: "/admin/calendar", icon: Calendar, label: "Calendar" },
    ],
  },
  {
    label: "Clients & Pipeline",
    defaultOpen: true,
    items: [
      { href: "/admin/clients", icon: Users, label: "Clients" },
      { href: "/admin/sales", icon: TrendingUp, label: "Sales Pipeline" },
      { href: "/admin/communications", icon: MessageSquare, label: "Communications" },
    ],
  },
  {
    label: "Projects & Work",
    defaultOpen: true,
    items: [
      { href: "/admin/projects", icon: FolderOpen, label: "Projects" },
    ],
  },
  {
    label: "Finance",
    defaultOpen: false,
    items: [
      { href: "/admin/invoices", icon: FileText, label: "Invoices" },
      { href: "/admin/payments", icon: CreditCard, label: "Payments" },
      { href: "/admin/finance", icon: DollarSign, label: "Finance" },
      { href: "/admin/subscriptions", icon: Rss, label: "Subscriptions" },
    ],
  },
  {
    label: "Products",
    defaultOpen: false,
    items: [
      { href: "/admin/products", icon: Package, label: "Products" },
      { href: "/admin/bookings", icon: BookOpen, label: "Bookings" },
    ],
  },
  {
    label: "Team & Content",
    defaultOpen: false,
    items: [
      { href: "/admin/team", icon: UserCheck, label: "Team" },
      { href: "/admin/social", icon: BarChart3, label: "Social Media" },
      { href: "/admin/announcements", icon: Megaphone, label: "Announcements" },
      { href: "/admin/chat", icon: MessageSquare, label: "Brixo Chat" },
    ],
  },
  {
    label: "Infrastructure",
    defaultOpen: false,
    items: [
      { href: "/admin/sites", icon: Globe, label: "Site Monitoring" },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AdminSidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  // Track which groups are open; auto-open group that contains the active route
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navGroups.forEach((g) => {
      const hasActive = g.items.some((item) =>
        item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/")
      );
      initial[g.label] = hasActive || g.defaultOpen;
    });
    return initial;
  });

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border min-h-16">
        <div className="w-8 h-8 rounded-sm bg-brand-gold flex items-center justify-center shrink-0">
          <span className="text-brand-navy font-bold text-sm font-display">B</span>
        </div>
        {!collapsed && (
          <span className="font-display font-bold text-sidebar-foreground text-sm truncate">
            Brightex Admin
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navGroups.map((group) => {
          const isOpen = openGroups[group.label] ?? group.defaultOpen;
          const hasActiveItem = group.items.some((item) => isActive(item.href, item.exact));

          return (
            <div key={group.label}>
              {/* Group header — only shown when sidebar is expanded */}
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-sm text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors group"
                >
                  <span className={cn(
                    "text-[10px] font-semibold uppercase tracking-widest transition-colors",
                    hasActiveItem && "text-sidebar-foreground/60"
                  )}>
                    {group.label}
                  </span>
                  <ChevronDown
                    size={12}
                    className={cn("transition-transform duration-200", isOpen ? "rotate-0" : "-rotate-90")}
                  />
                </button>
              )}

              {/* Items — always visible when sidebar is icon-only; controlled by isOpen when expanded */}
              {(collapsed || isOpen) && (
                <ul className="space-y-0.5 mt-0.5 mb-2">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "flex items-center gap-3 px-2 py-2 rounded-sm text-sm transition-colors",
                          isActive(item.href, item.exact)
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                        )}
                      >
                        <item.icon size={16} className="shrink-0" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {/* In icon-only mode, add a small separator between groups */}
              {collapsed && <div className="h-px bg-sidebar-border/50 mx-2 my-1" />}
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-2">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-2 py-2 rounded-sm text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors text-xs"
        >
          {collapsed ? <ChevronRight size={14} /> : (
            <>
              <ChevronLeft size={14} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
