"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, LogOut, Menu, BookOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminHeaderProps {
  onMenuClick?: () => void;
  title?: string;
}

export function AdminHeader({ onMenuClick, title }: AdminHeaderProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  async function handleSignOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  const themeIcon = !mounted ? <Monitor size={16} /> :
    theme === "light" ? <Sun size={16} /> :
    theme === "dark" ? <Moon size={16} /> :
    <Monitor size={16} />;

  return (
    <header className="h-16 border-b border-border bg-card flex items-center gap-4 px-6 shrink-0">
      {/* Mobile menu button */}
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Title */}
      {title && (
        <h1 className="font-display font-semibold text-foreground text-lg hidden sm:block">
          {title}
        </h1>
      )}

      <div className="ml-auto flex items-center gap-2">
        {/* System docs */}
        <a
          href="/SYSTEM_DOCS.html"
          target="_blank"
          rel="noopener noreferrer"
          className="w-9 h-9 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="System documentation"
        >
          <BookOpen size={16} />
        </a>

        {/* Theme toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger className="w-9 h-9 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            {themeIcon}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun size={14} className="mr-2" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon size={14} className="mr-2" /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Monitor size={14} className="mr-2" /> System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-9 h-9 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
