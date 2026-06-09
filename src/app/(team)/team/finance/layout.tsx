import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, DollarSign, LogOut } from "lucide-react";
import { ConfirmProvider } from "@/components/admin/confirm-dialog";

export default function FinanceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <header className="h-14 border-b border-border bg-card flex items-center px-6 gap-4 shrink-0">
        <div className="w-7 h-7 rounded-sm bg-brand-gold flex items-center justify-center shrink-0">
          <span className="text-brand-navy font-bold text-xs font-display">B</span>
        </div>
        <span className="font-display font-semibold text-foreground text-sm">
          Brightex — Finance
        </span>
        <nav className="ml-4 flex items-center gap-1">
          <Link
            href="/team/finance"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <DollarSign size={14} />
            Overview
          </Link>
          <Link
            href="/team/finance/calendar"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <CalendarDays size={14} />
            Renewals
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <ConfirmProvider>{children}</ConfirmProvider>
        </div>
      </main>
    </div>
  );
}
