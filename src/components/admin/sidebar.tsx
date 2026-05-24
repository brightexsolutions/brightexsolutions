"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, FolderOpen, Users, TrendingUp, MessageSquare,
  FileText, CreditCard, Calendar, Globe, Package, BarChart3,
  Megaphone, Settings, ChevronLeft, ChevronRight, BookOpen,
  DollarSign, UserCheck, Rss,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
      { href: "/admin/calendar", icon: Calendar, label: "Calendar" },
    ],
  },
  {
    label: "Clients & Pipeline",
    items: [
      { href: "/admin/clients", icon: Users, label: "Clients" },
      { href: "/admin/sales", icon: TrendingUp, label: "Sales Pipeline" },
      { href: "/admin/communications", icon: MessageSquare, label: "Communications" },
    ],
  },
  {
    label: "Projects & Work",
    items: [
      { href: "/admin/projects", icon: FolderOpen, label: "Projects" },
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
      { href: "/admin/bookings", icon: BookOpen, label: "Bookings" },
    ],
  },
  {
    label: "Team & Content",
    items: [
      { href: "/admin/team", icon: UserCheck, label: "Team" },
      { href: "/admin/social", icon: BarChart3, label: "Social Media" },
      { href: "/admin/announcements", icon: Megaphone, label: "Announcements" },
      { href: "/admin/chat", icon: MessageSquare, label: "Brixo Chat" },
    ],
  },
  {
    label: "Infrastructure",
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

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border min-h-[65px]">
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
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-sidebar-foreground/40 text-[10px] font-semibold uppercase tracking-widest px-2 mb-2">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
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
          </div>
        ))}
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
