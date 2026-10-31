"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { cn } from "@/lib/utils";
import { ADMIN_HUBS, resolveAdminRoute } from "@/lib/admin-nav";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

/**
 * M3 navigation drawer. Collapsed, it becomes a navigation rail: icon in a
 * pill indicator with the label underneath.
 */
export function AdminSidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const activeHub = resolveAdminRoute(pathname).hub?.key;
  const [taskBadge, setTaskBadge] = useState<{ active: number; total: number } | null>(null);

  useEffect(() => {
    fetch("/api/admin/tasks/count")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setTaskBadge(j))
      .catch(() => {});
  }, [pathname]);

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
        "flex flex-col h-full bg-sidebar text-sidebar-foreground shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
        collapsed ? "w-[88px]" : "w-[256px]"
      )}
    >
      {/* Brand */}
      <div className={cn("flex items-center h-16 shrink-0", collapsed ? "justify-center" : "gap-3 px-5")}>
        <div className="size-9 rounded-xl bg-brand-gold flex items-center justify-center shrink-0">
          <span className="text-brand-navy font-black text-sm font-display">B</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-none">Brightex</p>
            <p className="text-xs text-sidebar-foreground/55 leading-none mt-1">Workspace</p>
          </div>
        )}
      </div>

      {/* Search: opens the command palette */}
      <div className={cn("shrink-0 pb-2", collapsed ? "px-3" : "px-3")}>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
          className={cn(
            "flex items-center gap-3 h-11 rounded-full bg-sidebar-accent/70 hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors",
            collapsed ? "w-full justify-center" : "w-full px-4"
          )}
          aria-label="Search"
        >
          <Search size={18} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-sm">Search or jump to</span>
              <kbd className="text-[10px] font-mono opacity-60">⌘K</kbd>
            </>
          )}
        </button>
      </div>

      <nav aria-label="Admin" className="flex-1 overflow-y-auto scrollbar-overlay px-3 py-2">
        <ul className={cn(collapsed ? "space-y-3" : "space-y-1")}>
          {ADMIN_HUBS.map((hub) => {
            const active = hub.key === activeHub;
            const badge = hub.key === "work" && taskBadge?.active ? taskBadge.active : null;
            const Icon = hub.icon;

            if (collapsed) {
              return (
                <li key={hub.key}>
                  <Link href={hub.href} className="group flex flex-col items-center gap-1 py-0.5" aria-current={active ? "page" : undefined}>
                    <span
                      className={cn(
                        "relative flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                        active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 group-hover:bg-sidebar-accent"
                      )}
                    >
                      <Icon size={20} />
                      {badge && (
                        <span className="absolute -top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-semibold leading-4 text-center">
                          {badge}
                        </span>
                      )}
                    </span>
                    <span className={cn("text-[11px] leading-none", active ? "font-semibold" : "text-sidebar-foreground/70")}>
                      {hub.label}
                    </span>
                  </Link>
                </li>
              );
            }

            return (
              <li key={hub.key}>
                <Link
                  href={hub.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 h-12 px-4 rounded-full text-sm transition-colors",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <Icon size={20} className="shrink-0" />
                  <span className="flex-1 truncate">{hub.label}</span>
                  {badge && (
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        active ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/70"
                      )}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Account */}
      <div className="shrink-0 p-3 space-y-1">
        <div className={cn("flex items-center gap-3 rounded-2xl p-2", collapsed ? "justify-center" : "bg-sidebar-accent/50")}>
          <div className="size-9 rounded-full bg-brand-gold text-brand-navy flex items-center justify-center text-sm font-semibold shrink-0">
            G
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate leading-tight">Godwin Brown</p>
                <p className="text-xs text-sidebar-foreground/55 truncate leading-tight">Owner</p>
              </div>
              <button
                onClick={handleSignOut}
                className="size-9 rounded-full flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </>
          )}
        </div>
        <button
          onClick={onToggle}
          className={cn(
            "w-full flex items-center gap-3 h-10 rounded-full text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors",
            collapsed ? "justify-center" : "px-4"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <><PanelLeftClose size={18} /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}
