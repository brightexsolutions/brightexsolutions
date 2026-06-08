"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, ChevronRight, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Sale = {
  id: string;
  service: string | null;
  estimated_value: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  clients: { id: string; name: string; company: string | null; email: string | null } | null;
};

const STAGE_CONFIG: Record<string, { label: string; colour: string; bg: string }> = {
  lead:        { label: "Lead",        colour: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800" },
  qualified:   { label: "Qualified",   colour: "text-blue-700 dark:text-blue-400",  bg: "bg-blue-100 dark:bg-blue-950/30" },
  proposal:    { label: "Proposal",    colour: "text-purple-700 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-950/30" },
  negotiation: { label: "Negotiation", colour: "text-amber-700 dark:text-amber-400",  bg: "bg-amber-100 dark:bg-amber-950/30" },
  won:         { label: "Won",         colour: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-950/30" },
  lost:        { label: "Lost",        colour: "text-red-600 dark:text-red-400",    bg: "bg-red-100 dark:bg-red-950/30" },
};

const STAGES = ["lead", "qualified", "proposal", "negotiation", "won", "lost"] as const;

const fmt = (n: number | null) =>
  n == null ? "—" : `KES ${n.toLocaleString("en-KE")}`;

export default function SupportPipelinePage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [detail, setDetail] = useState<Sale | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sales");
      const json = await res.json();
      if (res.ok) setSales(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = filter === "all" ? sales : sales.filter((s) => s.status === filter);
  const openValue = sales
    .filter((s) => !["won", "lost"].includes(s.status) && s.estimated_value)
    .reduce((sum, s) => sum + (s.estimated_value ?? 0), 0);
  const wonValue = sales
    .filter((s) => s.status === "won" && s.estimated_value)
    .reduce((sum, s) => sum + (s.estimated_value ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Sales Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-1">Track leads and deals across all stages.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Deals",    value: sales.length.toString(),       colour: "text-foreground" },
          { label: "Pipeline Value", value: `KES ${openValue.toLocaleString("en-KE")}`, colour: "text-blue-500" },
          { label: "Won Value",      value: `KES ${wonValue.toLocaleString("en-KE")}`,  colour: "text-emerald-500" },
          { label: "Won Deals",      value: sales.filter((s) => s.status === "won").length.toString(), colour: "text-emerald-500" },
        ].map((s) => (
          <div key={s.label} className="rounded-sm border border-border bg-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{s.label}</p>
            <p className={cn("text-xl font-display font-bold", s.colour)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Stage filter tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {[{ key: "all", label: "All" }, ...STAGES.map((s) => ({ key: s, label: STAGE_CONFIG[s].label }))].map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={cn(
              "px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
              filter === t.key
                ? "border-brand-gold text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            {t.key !== "all" && (
              <span className="ml-1.5 text-[10px] text-muted-foreground">
                {sales.filter((s) => s.status === t.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Deals list */}
      <div className="rounded-sm border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading pipeline…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <TrendingUp size={32} className="mx-auto mb-3 opacity-20 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No deals in this stage.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((sale) => {
              const stage = STAGE_CONFIG[sale.status];
              return (
                <div
                  key={sale.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer group"
                  onClick={() => setDetail(sale)}
                >
                  <div className="w-8 h-8 rounded-full bg-brand-gold/10 text-brand-gold flex items-center justify-center shrink-0 text-xs font-bold">
                    {sale.clients?.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{sale.clients?.name ?? "Unknown client"}</p>
                      {sale.clients?.company && (
                        <span className="text-xs text-muted-foreground hidden sm:block">· {sale.clients.company}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {sale.service ?? "General service"} · {new Date(sale.created_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short" })}
                    </p>
                  </div>

                  {sale.estimated_value && (
                    <span className="hidden sm:block text-xs font-semibold text-foreground shrink-0">
                      KES {sale.estimated_value.toLocaleString("en-KE")}
                    </span>
                  )}

                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0", stage?.bg, stage?.colour)}>
                    {stage?.label}
                  </span>

                  <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setDetail(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative z-10 w-full sm:max-w-md bg-background border border-border rounded-t-lg sm:rounded-sm shadow-xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-bold text-foreground">{detail.clients?.name ?? "Deal"}</h2>
                {detail.clients?.company && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Building2 size={10} /> {detail.clients.company}
                  </p>
                )}
              </div>
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                STAGE_CONFIG[detail.status]?.bg, STAGE_CONFIG[detail.status]?.colour)}>
                {STAGE_CONFIG[detail.status]?.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground mb-0.5">Service</p>
                <p className="font-semibold">{detail.service ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Estimated Value</p>
                <p className="font-semibold">{fmt(detail.estimated_value)}</p>
              </div>
              {detail.clients?.email && (
                <div className="col-span-2">
                  <p className="text-muted-foreground mb-0.5">Email</p>
                  <a href={`mailto:${detail.clients.email}`} className="font-semibold text-brand-gold hover:underline">
                    {detail.clients.email}
                  </a>
                </div>
              )}
            </div>

            {detail.notes && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Notes</p>
                <p className="text-sm text-muted-foreground bg-muted/40 rounded-sm p-3 border border-border leading-relaxed">
                  {detail.notes}
                </p>
              </div>
            )}

            <button
              onClick={() => setDetail(null)}
              className="w-full px-4 py-2 rounded-sm border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
