"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, LogOut, Menu, Settings, Sparkles, ClipboardList } from "lucide-react";
import { NotificationBell } from "@/components/admin/notification-bell";
import { PushNotificationsToggle } from "@/components/admin/push-notifications-toggle";
import { SopQuickAccess } from "@/components/admin/sop-quick-access";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { resolveAdminRoute } from "@/lib/admin-nav";

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

  const { hub, tab } = resolveAdminRoute(pathname);
  const pageTitle = hub?.label ?? "Admin";
  const tabs = hub && hub.tabs.length > 1 ? hub.tabs : [];

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
    <header className="shrink-0 bg-background">
    <div className="h-16 flex items-center gap-3 px-4 sm:px-6">
      {/* Mobile menu */}
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="lg:hidden size-10 -ml-2 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
      )}

      <h1 className="flex-1 min-w-0 truncate text-lg sm:text-xl font-semibold text-foreground tracking-tight">{pageTitle}</h1>

      {/* Right actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("toggle-assistant"))}
          className="inline-flex items-center gap-2 h-10 px-3 sm:px-4 rounded-full bg-brand-gold/15 text-sm font-medium text-foreground hover:bg-brand-gold/25 transition-colors mr-1"
          aria-label="Ask the assistant"
        >
          <Sparkles size={16} className="text-amber-600 dark:text-brand-gold" />
          <span className="hidden md:inline">Ask</span>
        </button>

        {/* Browser push toggle */}
        <div className="hidden md:flex"><PushNotificationsToggle /></div>

        {/* Notifications */}
        <NotificationBell />

        {/* SOPs quick access */}
        <div className="hidden md:flex"><SopQuickAccess /></div>

        {/* Theme (on phones it lives in the account menu) */}
        <div className="hidden md:flex">
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
        </div>

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
            <div className="md:hidden">
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark" ? <Sun size={13} className="mr-2" /> : <Moon size={13} className="mr-2" />}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/admin/sops")}>
                <ClipboardList size={13} className="mr-2" /> SOPs
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut size={13} className="mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    {/* Hub tabs (M3 secondary tabs) */}
    {tabs.length > 0 && (
      <nav aria-label={`${pageTitle} sections`} className="flex gap-1 overflow-x-auto scrollbar-overlay border-b border-border px-2 sm:px-4">
        {tabs.map((t) => {
          const active = t.href === tab?.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative shrink-0 h-12 px-4 flex items-center text-sm font-medium transition-colors rounded-t-lg hover:bg-muted/60",
                active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {t.label}
              {active && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-primary" />}
            </Link>
          );
        })}
      </nav>
    )}
    {tabs.length === 0 && <div className="border-b border-border" />}
    </header>
  );
}
