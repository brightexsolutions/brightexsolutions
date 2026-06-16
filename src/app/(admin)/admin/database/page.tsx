"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw, Database, Table2, Rows3, Activity,
  AlertTriangle, CheckCircle2, XCircle, Clock,
  TrendingUp, HardDrive, Zap, ArrowUpDown, Info,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type TableRow = {
  name: string;
  live_rows: number;
  dead_rows: number;
  data_size: number;
  index_size: number;
  total_size: number;
  last_vacuum: string | null;
  last_analyze: string | null;
  seq_scans: number;
  idx_scans: number;
  inserts: number;
  updates: number;
  deletes: number;
  dead_pct: number;
  needs_vacuum: boolean;
  needs_analyze: boolean;
  health: "good" | "warn" | "crit";
};

type Stats = {
  status: "healthy" | "warning" | "critical";
  db_size_bytes: number;
  db_size_pretty: string;
  db_limit_bytes: number;
  db_used_pct: number;
  total_tables: number;
  total_live_rows: number;
  connections: { total: number; active: number; idle: number };
  tables: TableRow[];
  fetched_at: string;
};

type SortKey = "name" | "total_size" | "live_rows" | "dead_pct" | "last_analyze";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function prettyBytes(b: number): string {
  if (b >= 1_073_741_824) return `${(b / 1_073_741_824).toFixed(2)} GB`;
  if (b >= 1_048_576)     return `${(b / 1_048_576).toFixed(1)} MB`;
  if (b >= 1_024)         return `${(b / 1_024).toFixed(0)} KB`;
  return `${b} B`;
}

function prettyNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)        return "Just now";
  if (diff < 3600)      return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400)     return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Stats["status"] }) {
  const cfg = {
    healthy:  { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/40", label: "Healthy" },
    warning:  { icon: AlertTriangle, color: "text-amber-600",  bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/40",   label: "Warning" },
    critical: { icon: XCircle,       color: "text-red-600",    bg: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800/40",            label: "Critical" },
  }[status];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border", cfg.bg, cfg.color)}>
      <Icon size={12} /> {cfg.label}
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType; label: string; value: string; sub?: string; accent?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", accent ?? "bg-primary/10")}>
          <Icon size={15} className="text-primary" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function UsageBar({ used, total, label }: { used: number; total: number; label: string }) {
  const pct = Math.min((used / total) * 100, 100);
  const color = pct >= 90 ? "bg-red-500" : pct >= 75 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-semibold text-foreground">{prettyBytes(used)} / {prettyBytes(total)}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 text-right">{pct.toFixed(1)}% used</p>
    </div>
  );
}

function HealthDot({ health }: { health: TableRow["health"] }) {
  return (
    <span className={cn("inline-block w-2 h-2 rounded-full shrink-0",
      health === "good" ? "bg-emerald-500" : health === "warn" ? "bg-amber-500" : "bg-red-500"
    )} />
  );
}

// Custom tooltip for bar charts
function ChartTooltip({ active, payload, label, formatter }: {
  active?: boolean; payload?: { value: number }[]; label?: string;
  formatter?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1 truncate max-w-[160px]">{label}</p>
      <p className="text-primary font-medium">{formatter ? formatter(payload[0].value) : payload[0].value}</p>
    </div>
  );
}

const CHART_COLORS = ["#f9a825", "#152238", "#10b981", "#6366f1", "#f43f5e", "#0ea5e9", "#8b5cf6", "#f97316"];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DatabasePage() {
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("total_size");
  const [sortAsc, setSortAsc] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/database");
      if (!res.ok) throw new Error(await res.text());
      setStats(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetch_(); }, [fetch_]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  }

  const sortedTables = [...(stats?.tables ?? [])].sort((a, b) => {
    const aVal = sortKey === "name" ? a.name : sortKey === "dead_pct" ? a.dead_pct : sortKey === "last_analyze" ? (a.last_analyze ? new Date(a.last_analyze).getTime() : 0) : (a as unknown as Record<string, number>)[sortKey];
    const bVal = sortKey === "name" ? b.name : sortKey === "dead_pct" ? b.dead_pct : sortKey === "last_analyze" ? (b.last_analyze ? new Date(b.last_analyze).getTime() : 0) : (b as unknown as Record<string, number>)[sortKey];
    if (typeof aVal === "string" && typeof bVal === "string") return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  // Chart data — top 10 by size
  const sizeChartData  = (stats?.tables ?? []).slice(0, 10).map((t) => ({
    name: t.name.replace(/_/g, " "),
    size: parseFloat((t.total_size / 1024).toFixed(1)),
  }));

  const rowsChartData  = (stats?.tables ?? []).slice(0, 10).map((t) => ({
    name: t.name.replace(/_/g, " "),
    rows: t.live_rows,
  }));

  // Health flags
  const flaggedTables  = (stats?.tables ?? []).filter((t) => t.health !== "good");
  const warnings       = flaggedTables.filter((t) => t.health === "warn");
  const criticals      = flaggedTables.filter((t) => t.health === "crit");

  const SortHeader = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th
      className="px-3 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap"
      onClick={() => toggleSort(k)}
    >
      <span className="flex items-center gap-1">
        {children}
        <ArrowUpDown size={10} className={sortKey === k ? "text-primary" : "opacity-30"} />
      </span>
    </th>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-xl font-bold text-foreground">Database Health</h1>
            {stats && <StatusBadge status={stats.status} />}
          </div>
          <p className="text-sm text-muted-foreground">
            {stats
              ? `Last refreshed ${timeAgo(stats.fetched_at)} · Supabase free tier`
              : "Loading database metrics…"}
          </p>
        </div>
        <button
          onClick={() => void fetch_()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 text-sm text-red-700 dark:text-red-400">
          <XCircle size={15} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {stats && (
        <>
          {/* ── KPI row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              icon={HardDrive}
              label="Database Size"
              value={stats.db_size_pretty}
              sub={`${(stats.db_used_pct * 100).toFixed(1)}% of 500 MB free tier`}
              accent={stats.db_used_pct >= 0.9 ? "bg-red-500/10" : stats.db_used_pct >= 0.75 ? "bg-amber-500/10" : "bg-emerald-500/10"}
            />
            <KpiCard
              icon={Table2}
              label="Tables"
              value={String(stats.total_tables)}
              sub="in public schema"
            />
            <KpiCard
              icon={Rows3}
              label="Total Rows"
              value={prettyNum(stats.total_live_rows)}
              sub="live rows across all tables"
            />
            <KpiCard
              icon={Activity}
              label="Connections"
              value={String(stats.connections.total)}
              sub={`${stats.connections.active} active · ${stats.connections.idle} idle`}
            />
          </div>

          {/* ── Storage usage bar ── */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Database size={15} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Free Tier Usage</h2>
              <span className="ml-auto text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Supabase Free</span>
            </div>
            <div className="space-y-4">
              <UsageBar used={stats.db_size_bytes} total={stats.db_limit_bytes} label="Database Storage" />
              {stats.db_used_pct >= 0.75 && (
                <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-lg px-3 py-2.5 mt-2">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  {stats.db_used_pct >= 0.9
                    ? "Database is nearly full. Consider upgrading to Supabase Pro ($25/mo) or archiving old records."
                    : "Database is 75%+ full. Monitor growth and plan for an upgrade before hitting the limit."}
                </div>
              )}
            </div>
          </div>

          {/* ── Health flags ── */}
          {flaggedTables.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={15} className="text-amber-500" />
                <h2 className="text-sm font-semibold text-foreground">Health Flags</h2>
                <span className="ml-1 text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                  {flaggedTables.length}
                </span>
              </div>
              <div className="space-y-2">
                {criticals.map((t) => (
                  <div key={t.name} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30">
                    <XCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400">{t.name}</p>
                      <p className="text-[11px] text-red-600 dark:text-red-500 mt-0.5">
                        {t.dead_pct > 0.3 && `${(t.dead_pct * 100).toFixed(0)}% dead rows (${prettyNum(t.dead_rows)}) — run VACUUM`}
                      </p>
                    </div>
                  </div>
                ))}
                {warnings.map((t) => (
                  <div key={t.name} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
                    <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">{t.name}</p>
                      <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-0.5">
                        {t.needs_vacuum && `${(t.dead_pct * 100).toFixed(0)}% dead rows · `}
                        {t.needs_analyze && "Not analyzed in 7+ days"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Charts row ── */}
          {sizeChartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Table sizes bar chart */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <HardDrive size={14} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Storage by Table</h2>
                  <span className="text-[10px] text-muted-foreground ml-auto">Top {sizeChartData.length}</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={sizeChartData} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v} KB`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={100} />
                    <Tooltip content={<ChartTooltip formatter={(v) => `${v} KB`} />} cursor={{ fill: "hsl(var(--muted))" }} />
                    <Bar dataKey="size" radius={[0, 4, 4, 0]} maxBarSize={18}>
                      {sizeChartData.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? "#f9a825" : i === 1 ? "#152238" : CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Row counts bar chart */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Rows3 size={14} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Row Count by Table</h2>
                  <span className="text-[10px] text-muted-foreground ml-auto">Top {rowsChartData.length}</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={rowsChartData} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={prettyNum} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={100} />
                    <Tooltip content={<ChartTooltip formatter={(v) => `${prettyNum(v)} rows`} />} cursor={{ fill: "hsl(var(--muted))" }} />
                    <Bar dataKey="rows" radius={[0, 4, 4, 0]} maxBarSize={18}>
                      {rowsChartData.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? "#10b981" : i === 1 ? "#6366f1" : CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Table breakdown ── */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <Table2 size={15} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Table Breakdown</h2>
              <span className="ml-1 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{stats.total_tables} tables</span>
              <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                <Info size={10} /> Click column headers to sort
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="px-3 py-2.5 w-5" />
                    <SortHeader k="name">Table</SortHeader>
                    <SortHeader k="total_size">Total Size</SortHeader>
                    <SortHeader k="live_rows">Live Rows</SortHeader>
                    <SortHeader k="dead_pct">Dead Rows</SortHeader>
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Data / Index</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Scans</th>
                    <SortHeader k="last_analyze">Last Analyzed</SortHeader>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedTables.map((t) => (
                    <tr key={t.name} className="hover:bg-muted/30 transition-colors">
                      <td className="pl-4 pr-1 py-3">
                        <HealthDot health={t.health} />
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-mono text-xs font-medium text-foreground">{t.name}</span>
                      </td>
                      <td className="px-3 py-3 text-xs text-foreground font-medium whitespace-nowrap">
                        {prettyBytes(t.total_size)}
                      </td>
                      <td className="px-3 py-3 text-xs text-foreground whitespace-nowrap">
                        {prettyNum(t.live_rows)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {t.dead_rows > 0 ? (
                          <span className={cn("text-xs font-medium",
                            t.dead_pct > 0.3 ? "text-red-600 dark:text-red-400"
                            : t.dead_pct > 0.1 ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground"
                          )}>
                            {prettyNum(t.dead_rows)} ({(t.dead_pct * 100).toFixed(0)}%)
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {prettyBytes(t.data_size)} / {prettyBytes(t.index_size)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="flex items-center gap-0.5 text-muted-foreground">
                            <Zap size={9} className="text-amber-500" />{prettyNum(t.seq_scans)} seq
                          </span>
                          <span className="flex items-center gap-0.5 text-muted-foreground">
                            <TrendingUp size={9} className="text-emerald-500" />{prettyNum(t.idx_scans)} idx
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={cn("text-xs flex items-center gap-1",
                          t.needs_analyze ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                        )}>
                          <Clock size={10} />
                          {timeAgo(t.last_analyze)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 px-5 py-3 border-t border-border bg-muted/20">
              {[
                { color: "bg-emerald-500", label: "Healthy" },
                { color: "bg-amber-500",   label: "Needs attention" },
                { color: "bg-red-500",     label: "Action required" },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className={cn("w-2 h-2 rounded-full", color)} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* ── Tips ── */}
          <div className="bg-muted/30 border border-border rounded-xl p-5 space-y-2.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Reference</p>
            {[
              { icon: "🔄", text: "Dead rows above 10% indicate a table needs VACUUM — Supabase runs autovacuum automatically but it can lag on busy tables." },
              { icon: "📊", text: "High sequential scans on large tables (low idx/seq ratio) may mean a missing index. Check the table's query patterns." },
              { icon: "⚡", text: "The database keepalive cron runs every 12h to prevent Supabase free tier from pausing after 7 days of inactivity." },
              { icon: "📈", text: "Supabase free tier: 500 MB database, 1 GB file storage. Upgrade to Pro ($25/mo) when you consistently reach 80%+" },
            ].map(({ icon, text }) => (
              <p key={text} className="text-xs text-muted-foreground leading-relaxed">
                <span className="mr-1.5">{icon}</span>{text}
              </p>
            ))}
          </div>
        </>
      )}

      {/* Loading skeleton */}
      {loading && !stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[0,1,2,3].map((i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 h-24 animate-pulse" />
            ))}
          </div>
          <div className="bg-card border border-border rounded-xl h-24 animate-pulse" />
          <div className="bg-card border border-border rounded-xl h-64 animate-pulse" />
        </div>
      )}
    </div>
  );
}
