import type { ReactNode } from "react";
import Link from "next/link";
import { Users, MessageSquare, TrendingUp, LogOut, Headphones } from "lucide-react";

export default function SupportLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <header className="h-14 border-b border-border bg-card flex items-center px-6 gap-4 shrink-0">
        <div className="w-7 h-7 rounded-sm bg-rose-500 flex items-center justify-center shrink-0">
          <Headphones size={13} className="text-white" />
        </div>
        <span className="font-display font-semibold text-foreground text-sm">
          Brightex — Support
        </span>
        <nav className="ml-4 flex items-center gap-1">
          <Link href="/team/support"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Users size={14} />Clients
          </Link>
          <Link href="/team/support/pipeline"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <TrendingUp size={14} />Pipeline
          </Link>
          <Link href="/team/support/comms"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <MessageSquare size={14} />Communications
          </Link>
        </nav>
        <Link href="/admin/login"
          className="ml-auto flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors">
          <LogOut size={14} />Sign out
        </Link>
      </header>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
