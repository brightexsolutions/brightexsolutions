import type { Metadata } from "next";
import { Globe, Plus, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";

export const metadata: Metadata = { title: "Site Monitoring | Admin" };

const integrationLevels = [
  { level: "Passive", desc: "HTTP ping + SSL check — no changes to the tracked site" },
  { level: "Active", desc: "Structured health endpoint — one file added to the site" },
  { level: "WordPress", desc: "mu-plugin + config line — full WP version and update tracking" },
];

const statusConfig = {
  up: { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40", label: "Up" },
  degraded: { icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40", label: "Degraded" },
  down: { icon: XCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/40", label: "Down" },
  unknown: { icon: Globe, color: "text-muted-foreground", bg: "bg-muted border-border", label: "Unknown" },
};

export default function SiteMonitoringPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Site Monitoring</h1>
          <p className="text-sm text-muted-foreground mt-1">Track uptime, SSL expiry, and WordPress updates across all sites.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
            <RefreshCw size={14} />
            Check All Now
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors">
            <Plus size={15} />
            Add Site
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Sites Monitored" value="—" icon={Globe} />
        <StatCard title="All Up" value="—" icon={CheckCircle2} iconColor="text-emerald-400" iconBg="bg-emerald-400/10" />
        <StatCard title="Alerts" value="—" icon={AlertTriangle} iconColor="text-amber-400" iconBg="bg-amber-400/10" />
        <StatCard title="SSL Expiring" value="—" icon={AlertTriangle} iconColor="text-red-400" iconBg="bg-red-400/10" />
      </div>

      {/* Status legend */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs text-muted-foreground">Status:</span>
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <div key={key} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-xs font-medium ${cfg.bg} ${cfg.color}`}>
            <cfg.icon size={12} />
            {cfg.label}
          </div>
        ))}
      </div>

      {/* Site list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe size={16} />
            Registered Sites
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Globe size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No sites registered yet.</p>
            <p className="text-xs mt-1">Add any site URL — monitoring starts on the next cron cycle.</p>
          </div>
        </CardContent>
      </Card>

      {/* Integration levels guide */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground font-normal">Integration Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {integrationLevels.map((lvl, i) => (
              <div key={lvl.level} className="p-3 rounded-sm border border-border bg-muted/30">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-brand-gold/20 text-brand-gold text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <p className="text-sm font-semibold text-foreground">{lvl.level}</p>
                </div>
                <p className="text-xs text-muted-foreground">{lvl.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
