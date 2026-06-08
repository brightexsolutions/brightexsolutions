"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { useTheme } from "next-themes";
import {
  Sun, Moon, Monitor, LogOut, Menu, Bell, ChevronRight, Settings, User,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// ─── Route → breadcrumb label map ─────────────────────────────────────────────
const ROUTE_LABELS: Record<string, string> = {
  "/admin":               "Dashboard",
  "/admin/calendar":      "Calendar",
  "/admin/clients":       "Clients",
  "/admin/sales":         "Sales Pipeline",
  "/admin/communications":"Communications",
  "/admin/projects":      "Projects",
  "/admin/tasks":         "Tasks",
  "/admin/invoices":      "Invoices",
  "/admin/payments":      "Payments",
  "/admin/finance":       "Finance",
  "/admin/subscriptions": "Subscriptions",
  "/admin/products":      "Products",
  "/admin/bookings":      "Bookings",
  "/admin/team":          "Team",
  "/admin/social":        "Social Media",
  "/admin/announcements": "Announcements",
  "/admin/portfolio":     "Portfolio",
  "/admin/chat":          "Brixo Chat",
  "/admin/sites":         "Site Monitoring",
  "/admin/settings":      "Settings",
  "/admin/logs":          "Activity Log",
};

function buildBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const crumbs: { label: string; href: string }[] = [{ label: "Admin", href: "/admin" }];
  if (pathname === "/admin") return crumbs;
  const label = ROUTE_LABELS[pathname] ?? pathname.split("/").pop()?.replace(/-/g, " ") ?? "";
  crumbs.push({ label: label.charAt(0).toUpperCase() + label.slice(1), href: pathname });
  return crumbs;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AdminHeaderProps {
  onMenuClick?: () => void;
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const breadcrumbs = buildBreadcrumbs(pathname);
  const pageTitle = breadcrumbs[breadcrumbs.length - 1].label;

  async function handleSignOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  const ThemeIcon = !mounted ? Monitor :
    theme === "light" ? Sun :
    theme === "dark" ? Moon : Monitor;

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center gap-3 px-4 sm:px-6 shrink-0 sticky top-0 z-30">
      {/* Mobile menu */}
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
        >
          <Menu size={17} />
        </button>
      )}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 min-w-0 flex-1">
        {breadcrumbs.map((crumb, i) => (
          <div key={crumb.href} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight size={13} className="text-muted-foreground/40 shrink-0" />}
            {i < breadcrumbs.length - 1 ? (
              <button
                onClick={() => router.push(crumb.href)}
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors truncate"
              >
                {crumb.label}
              </button>
            ) : (
              <span className="text-[13px] font-semibold text-foreground truncate">{crumb.label}</span>
            )}
          </div>
        ))}
      </nav>

      {/* Page title on mobile */}
      <span className="sm:hidden font-semibold text-foreground text-sm truncate">{pageTitle}</span>

      {/* Right actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Notifications */}
        <button className="relative w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Bell size={15} />
          {/* Uncomment when you wire up notifications:
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-brand-gold" /> */}
        </button>

        {/* Theme */}
        <DropdownMenu>
          <DropdownMenuTrigger className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ThemeIcon size={15} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun size={13} className="mr-2" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon size={13} className="mr-2" /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Monitor size={13} className="mr-2" /> System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-muted transition-colors ml-1">
            <div className="w-7 h-7 rounded-full bg-brand-gold/20 border border-brand-gold/30 flex items-center justify-center shrink-0">
              <span className="text-brand-gold text-[11px] font-bold">G</span>
            </div>
            <span className="hidden sm:block text-[13px] font-medium text-foreground max-w-[80px] truncate">Godwin</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-3 py-2.5 border-b border-border">
              <p className="text-[13px] font-semibold text-foreground">Godwin Brown</p>
              <p className="text-[11px] text-muted-foreground">Administrator</p>
            </div>
            <DropdownMenuItem onClick={() => router.push("/admin/settings")}>
              <Settings size={13} className="mr-2" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut size={13} className="mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
