"use client";

import { useState, useEffect, useSyncExternalStore, Suspense } from "react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/header";
import { CommandPalette } from "@/components/admin/command-palette";
import { ConfirmProvider } from "@/components/admin/confirm-dialog";
import { AssistantFab } from "@/components/admin/assistant-fab";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_HUBS, resolveAdminRoute } from "@/lib/admin-nav";

export function AdminPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-muted rounded-sm" />
          <div className="h-4 w-72 bg-muted/60 rounded-sm" />
        </div>
        <div className="h-9 w-28 bg-muted rounded-sm" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-muted rounded-sm" />
              <div className="h-8 w-8 bg-muted rounded-sm" />
            </div>
            <div className="h-7 w-20 bg-muted rounded-sm" />
            <div className="h-3 w-32 bg-muted/60 rounded-sm" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card">
        <div className="p-4 border-b border-border">
          <div className="h-5 w-36 bg-muted rounded-sm" />
        </div>
        <div className="divide-y divide-border">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="h-9 w-9 bg-muted rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-muted rounded-sm" />
                <div className="h-3 w-64 bg-muted/60 rounded-sm" />
              </div>
              <div className="h-6 w-16 bg-muted rounded-sm shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Drawer vs rail choice, remembered per device
const RAIL_KEY = "admin:rail";
function readRail() {
  try { return localStorage.getItem(RAIL_KEY) === "1"; } catch { return false; }
}
function writeRail(on: boolean) {
  try { localStorage.setItem(RAIL_KEY, on ? "1" : "0"); } catch {}
  window.dispatchEvent(new Event("admin-rail"));
}
function subscribeRail(cb: () => void) {
  window.addEventListener("admin-rail", cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener("admin-rail", cb); window.removeEventListener("storage", cb); };
}

function BottomBar({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  const active = resolveAdminRoute(pathname).hub?.key;
  return (
    <nav
      aria-label="Primary"
      className="lg:hidden shrink-0 grid grid-cols-5 bg-card border-t border-border pb-[env(safe-area-inset-bottom)]"
    >
      {ADMIN_HUBS.filter((h) => h.primary).map((hub) => {
        const on = hub.key === active;
        const Icon = hub.icon;
        return (
          <Link key={hub.key} href={hub.href} className="flex flex-col items-center gap-1 pt-3 pb-3" aria-current={on ? "page" : undefined}>
            <span className={cn("flex h-8 w-16 items-center justify-center rounded-full transition-colors", on ? "bg-brand-gold/20 text-foreground" : "text-muted-foreground")}>
              <Icon size={22} />
            </span>
            <span className={cn("text-xs", on ? "font-semibold text-foreground" : "text-muted-foreground")}>{hub.label}</span>
          </Link>
        );
      })}
      <button onClick={onMore} className="flex flex-col items-center gap-1 pt-3 pb-3 text-muted-foreground">
        <span className="flex h-8 w-16 items-center justify-center rounded-full"><MoreHorizontal size={22} /></span>
        <span className="text-xs">More</span>
      </button>
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const collapsed = useSyncExternalStore(subscribeRail, readRail, () => false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();

  function toggleCollapsed() {
    writeRail(!collapsed);
  }

  // Auto-close mobile sidebar whenever the user navigates to a new page
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  // Installable app: the service worker also handles push notifications
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }
  }, []);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <ConfirmProvider>
    <div className="admin-shell flex h-dvh overflow-hidden bg-sidebar">
      <div className="hidden lg:flex">
        <AdminSidebar collapsed={collapsed} onToggle={toggleCollapsed} />
      </div>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative h-full w-[280px] max-w-[85vw] rounded-r-2xl overflow-hidden shadow-xl">
            <AdminSidebar collapsed={false} onToggle={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* M3 surface: content sits on a rounded sheet beside the navigation */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-background lg:my-2 lg:mr-2 lg:rounded-3xl">
        <AdminHeader onMenuClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
        <main id="admin-main" className="admin-main flex-1 min-h-0 overflow-y-auto scrollbar-overlay p-4 sm:p-6">
          <Suspense fallback={<AdminPageSkeleton />}>
            {children}
          </Suspense>
        </main>
        <BottomBar onMore={() => setMobileSidebarOpen(true)} />
      </div>

      <CommandPalette />
      <AssistantFab />
    </div>
    </ConfirmProvider>
  );
}
