import type { Metadata } from "next";
import { FileText, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";

export const metadata: Metadata = { title: "Invoices | Admin" };

const statusColors: Record<string, string> = {
  draft: "bg-slate-400/10 text-slate-400",
  sent: "bg-blue-400/10 text-blue-400",
  paid: "bg-emerald-400/10 text-emerald-400",
  overdue: "bg-red-400/10 text-red-400",
  cancelled: "bg-muted text-muted-foreground",
};

const tabs = ["All", "Draft", "Sent", "Paid", "Overdue"];

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">Create, preview, and send invoices to clients.</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors">
          <Plus size={15} />
          New Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Invoiced" value="KES —" icon={FileText} />
        <StatCard title="Pending" value="—" icon={FileText} iconColor="text-blue-400" iconBg="bg-blue-400/10" />
        <StatCard title="Overdue" value="—" icon={FileText} iconColor="text-red-400" iconBg="bg-red-400/10" />
        <StatCard title="Paid (30 days)" value="KES —" icon={FileText} iconColor="text-emerald-400" iconBg="bg-emerald-400/10" />
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab}
            className="px-3 py-1.5 rounded-sm text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-brand-gold/40 transition-colors first:bg-muted first:text-foreground first:border-transparent"
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Status legend */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(statusColors).map(([status, color]) => (
          <span key={status} className={`px-2.5 py-1 rounded-sm text-xs font-medium border capitalize ${color} border-current/20`}>
            {status}
          </span>
        ))}
      </div>

      {/* Invoice list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText size={16} />
            Invoice List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <FileText size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No invoices yet.</p>
            <p className="text-xs mt-1">Create your first invoice or connect Supabase to load data.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
