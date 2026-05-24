import type { ReactNode } from "react";
import Link from "next/link";
import { LayoutGrid, LogOut } from "lucide-react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b border-border bg-card flex items-center px-6 gap-4">
        <div className="w-7 h-7 rounded-sm bg-brand-gold flex items-center justify-center shrink-0">
          <span className="text-brand-navy font-bold text-xs font-display">B</span>
        </div>
        <span className="font-display font-semibold text-foreground text-sm">
          Brightex — Marketing
        </span>
        <nav className="ml-4 flex items-center gap-1">
          <Link
            href="/team/marketing"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LayoutGrid size={14} />
            Content Calendar
          </Link>
        </nav>
        <Link
          href="/admin/login"
          className="ml-auto flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          <LogOut size={14} />
          Sign out
        </Link>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
