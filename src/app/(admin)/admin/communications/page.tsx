import type { Metadata } from "next";
import { MessageSquare, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";

export const metadata: Metadata = { title: "Communications | Admin" };

const typeColors: Record<string, string> = {
  email: "bg-blue-400/10 text-blue-400",
  whatsapp: "bg-emerald-400/10 text-emerald-400",
  call: "bg-amber-400/10 text-amber-400",
  meeting: "bg-purple-400/10 text-purple-400",
};

const filters = ["All", "Email", "WhatsApp", "Call", "Meeting"];

export default function CommunicationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Communications</h1>
          <p className="text-sm text-muted-foreground mt-1">Log calls, emails, and meetings with clients.</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors">
          <Plus size={15} />
          Log Entry
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Logs" value="—" icon={MessageSquare} />
        <StatCard title="Emails Sent" value="—" icon={MessageSquare} iconColor="text-blue-400" iconBg="bg-blue-400/10" />
        <StatCard title="Calls Logged" value="—" icon={MessageSquare} iconColor="text-amber-400" iconBg="bg-amber-400/10" />
        <StatCard title="Meetings" value="—" icon={MessageSquare} iconColor="text-purple-400" iconBg="bg-purple-400/10" />
      </div>

      {/* Type filters */}
      <div className="flex gap-1 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            className="px-3 py-1.5 rounded-sm text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-brand-gold/40 transition-colors first:bg-muted first:text-foreground first:border-transparent"
          >
            {f}
          </button>
        ))}
      </div>

      {/* Communication type legend */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(typeColors).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-muted border border-border">
            <span className={`px-2 py-0.5 rounded-sm text-xs font-medium capitalize ${color}`}>{type}</span>
          </div>
        ))}
      </div>

      {/* Log table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare size={16} />
            Communication Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No communications logged yet.</p>
            <p className="text-xs mt-1">Log a call, email, or meeting to start building the communication history.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
