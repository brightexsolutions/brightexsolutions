"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ScrollText, RefreshCw, ChevronLeft, ChevronRight,
  AlertCircle, Info, CheckCircle2, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

type LogEntry = {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  notes: string | null;
  created_at: string;
};

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "invoice", label: "Invoices" },
  { value: "payment", label: "Payments" },
  { value: "project", label: "Projects" },
  { value: "client", label: "Clients" },
  { value: "subscription", label: "Subscriptions" },
  { value: "settings", label: "Settings" },
  { value: "team", label: "Team" },
  { value: "site", label: "Sites" },
  { value: "social_post",   label: "Social" },
  { value: "task",          label: "Tasks" },
  { value: "expense",       label: "Expenses" },
  { value: "communication", label: "Comms" },
];

const ACTION_STYLES: Record<string, { icon: typeof Info; colour: string }> = {
  created:        { icon: CheckCircle2, colour: "text-emerald-500" },
  updated:        { icon: Info,         colour: "text-blue-500" },
  deleted:        { icon: AlertCircle,  colour: "text-red-500" },
  sent:           { icon: CheckCircle2, colour: "text-emerald-500" },
  paid:           { icon: CheckCircle2, colour: "text-emerald-500" },
  invited:              { icon: CheckCircle2, colour: "text-blue-500" },
  resent_invite:        { icon: Info,         colour: "text-blue-500" },
  revoked_invite:       { icon: AlertCircle,  colour: "text-amber-500" },
  update_failed:        { icon: AlertCircle,  colour: "text-red-500" },
  delete_failed:        { icon: AlertCircle,  colour: "text-red-500" },
  added_expense:        { icon: CheckCircle2, colour: "text-amber-500" },
  updated_task_status:  { icon: Info,         colour: "text-blue-500" },
  submitted_deliverable:{ icon: CheckCircle2, colour: "text-emerald-500" },
  created_task:         { icon: CheckCircle2, colour: "text-emerald-500" },
  logged_comm:          { icon: Info,         colour: "text-purple-500" },
};

function getActionStyle(action: string) {
  return ACTION_STYLES[action] ?? { icon: Clock, colour: "text-muted-foreground" };
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-KE", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function actionLabel(action: string) {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const PAGE_SIZE = 50;

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [count, setCount] = useState(0);
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
        ...(category !== "all" ? { category } : {}),
      });
      const res = await fetch(`/api/admin/activity-log?${params}`);
      const json = await res.json();
      setLogs(json.data ?? []);
      setCount(json.count ?? 0);
    } finally {
      setLoading(false);
    }
  }, [category, page]);

  useEffect(() => { void load(); }, [load]);

  function handleCategory(val: string) {
    setCategory(val);
    setPage(0);
  }

  const totalPages = Math.ceil(count / PAGE_SIZE);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <ScrollText size={22} className="text-brand-gold" />
            Activity Log
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            System-wide audit trail — {count.toLocaleString()} entries
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-border bg-card text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => handleCategory(cat.value)}
            className={cn(
              "px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors",
              category === cat.value
                ? "bg-brand-gold text-brand-navy"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-brand-gold/30"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Log table */}
      <div className="rounded-sm border border-border bg-card overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <ScrollText size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No log entries found.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {/* Table head */}
            <div className="hidden sm:grid grid-cols-[28px_160px_100px_120px_1fr_180px] gap-3 px-5 py-2.5 bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span />
              <span>Actor</span>
              <span>Category</span>
              <span>Action</span>
              <span>Entity</span>
              <span>Time</span>
            </div>

            {logs.map((log) => {
              const style = getActionStyle(log.action);
              const Icon = style.icon;
              const isExpanded = expanded === log.id;
              const hasDetail = log.notes || log.changes;

              return (
                <div key={log.id}>
                  <button
                    onClick={() => hasDetail && setExpanded(isExpanded ? null : log.id)}
                    className={cn(
                      "w-full text-left grid grid-cols-[28px_1fr] sm:grid-cols-[28px_160px_100px_120px_1fr_180px] gap-3 px-5 py-3 transition-colors items-start",
                      hasDetail ? "hover:bg-muted/30 cursor-pointer" : "cursor-default",
                      isExpanded && "bg-muted/20"
                    )}
                  >
                    <Icon size={14} className={cn("shrink-0 mt-0.5", style.colour)} />

                    <span className="text-xs text-muted-foreground truncate">
                      {log.actor_name ?? "system"}
                    </span>

                    <span className="hidden sm:block">
                      <span className="inline-block px-2 py-0.5 rounded-sm bg-muted text-[10px] font-semibold text-muted-foreground capitalize">
                        {log.entity_type ?? "—"}
                      </span>
                    </span>

                    <span className="hidden sm:block text-xs font-medium text-foreground">
                      {actionLabel(log.action)}
                    </span>

                    <span className="hidden sm:block text-xs text-foreground truncate">
                      {log.entity_label ?? log.entity_id ?? "—"}
                    </span>

                    <span className="hidden sm:block text-[11px] text-muted-foreground">
                      {formatTime(log.created_at)}
                    </span>

                    {/* Mobile: condensed row */}
                    <div className="sm:hidden col-span-1">
                      <p className="text-xs font-medium text-foreground">
                        {actionLabel(log.action)} · {log.entity_type}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {log.entity_label ?? log.entity_id ?? "—"} · {formatTime(log.created_at)}
                      </p>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && hasDetail && (
                    <div className="px-5 pb-4 ml-7 space-y-2">
                      {log.notes && (
                        <p className="text-xs text-muted-foreground bg-muted/40 rounded-sm px-3 py-2 border border-border font-mono">
                          {log.notes}
                        </p>
                      )}
                      {log.changes && (
                        <div className="text-xs space-y-1">
                          {Object.entries(log.changes).map(([field, diff]) => (
                            <div key={field} className="flex items-start gap-2">
                              <span className="font-semibold text-muted-foreground w-28 shrink-0 capitalize">
                                {field.replace(/_/g, " ")}
                              </span>
                              <span className="text-red-500 line-through">{String(diff.from ?? "—")}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-emerald-600 dark:text-emerald-400">{String(diff.to ?? "—")}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground text-xs">
            Page {page + 1} of {totalPages} · {count.toLocaleString()} entries
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-border bg-card text-xs font-medium hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-border bg-card text-xs font-medium hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
