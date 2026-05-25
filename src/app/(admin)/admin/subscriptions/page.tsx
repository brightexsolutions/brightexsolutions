import type { Metadata } from "next";
import { Rss, Plus, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";

export const metadata: Metadata = { title: "Subscriptions | Admin" };

const categories = ["domain", "hosting", "tool", "software", "other"];

export default function SubscriptionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Subscriptions</h1>
          <p className="text-sm text-muted-foreground mt-1">Track domains, hosting, tools, and renewal dates.</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors">
          <Plus size={15} />
          Add Subscription
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Active" value="—" icon={Rss} iconColor="text-emerald-400" iconBg="bg-emerald-400/10" />
        <StatCard title="Renewing (14d)" value="—" icon={AlertTriangle} iconColor="text-amber-400" iconBg="bg-amber-400/10" />
        <StatCard title="Monthly Cost" value="KES —" icon={Rss} iconColor="text-brand-gold" iconBg="bg-brand-gold/10" />
        <StatCard title="Annual Cost" value="KES —" icon={Rss} />
      </div>

      {/* Category filters */}
      <div className="flex gap-1 flex-wrap">
        <button className="px-3 py-1.5 rounded-sm text-xs font-medium bg-muted text-foreground border-transparent border">All</button>
        {categories.map((cat) => (
          <button key={cat} className="px-3 py-1.5 rounded-sm text-xs font-medium border border-border text-muted-foreground hover:text-foreground capitalize transition-colors">
            {cat}
          </button>
        ))}
      </div>

      {/* Renewal alert */}
      <div className="flex items-start gap-3 p-4 rounded-sm bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/30">
        <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">No upcoming renewals</p>
          <p className="text-xs text-muted-foreground mt-0.5">Add subscriptions to track renewal dates and get dashboard alerts 14 days before they're due.</p>
        </div>
      </div>

      {/* List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Rss size={16} />
            All Subscriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Rss size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No subscriptions tracked yet.</p>
            <p className="text-xs mt-1">Add domains, hosting plans, and tools to keep renewals in view.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
