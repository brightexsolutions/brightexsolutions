import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, ClipboardList, LogOut } from "lucide-react";

export default function WorkLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <header className="h-14 border-b border-border bg-card flex items-center px-6 gap-4 shrink-0">
        <div className="w-7 h-7 rounded-sm bg-brand-gold flex items-center justify-center shrink-0">
          <span className="text-brand-navy font-bold text-xs font-display">B</span>
        </div>
        <span className="font-display font-semibold text-foreground text-sm">
          Brightex — My Work
        </span>
        <nav className="ml-4 flex items-center gap-1">
          <Link
            href="/work"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ClipboardList size={14} />
            My Tasks
          </Link>
          <Link
            href="/work/calendar"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <CalendarDays size={14} />
            My Schedule
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
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
