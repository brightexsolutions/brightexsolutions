"use client";

import { useState, Suspense } from "react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/header";
import { CommandPalette } from "@/components/admin/command-palette";
import { usePathname } from "next/navigation";

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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:flex">
        <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative w-64 h-full">
            <AdminSidebar collapsed={false} onToggle={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 overflow-hidden">
        <AdminHeader onMenuClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-6">
          <Suspense fallback={<AdminPageSkeleton />}>
            {children}
          </Suspense>
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}
