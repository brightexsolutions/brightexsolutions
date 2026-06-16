"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, X, CheckCircle2, AlertTriangle, XCircle, FileText,
  Calendar, MessageSquare, BarChart3, ArrowRight, CheckCheck, ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SystemAlert {
  id: string;
  type: string;
  severity: string;
  message: string;
  entity_type?: string | null;
  created_at: string;
}

interface NotificationData {
  total: number;
  alerts: SystemAlert[];
  counts: {
    overdue_invoices: number;
    pending_bookings: number;
    new_contacts: number;
    pending_approvals: number;
    new_intakes: number;
  };
}

// ─── Config ───────────────────────────────────────────────────────────────────

const SEVERITY = {
  critical: { icon: XCircle,       color: "text-red-500",   bg: "bg-red-500/10 border-red-500/20" },
  warning:  { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
  info:     { icon: CheckCircle2,  color: "text-blue-500",  bg: "bg-blue-500/10 border-blue-500/20" },
} as const;

const ALERT_LABELS: Record<string, string> = {
  site_down:            "Site Down",
  ssl_expiring:         "SSL Expiring Soon",
  wp_update:            "WordPress Update Available",
  subscription_renewal: "Subscription Renewal Due",
  overdue_invoice:      "Overdue Invoice",
  db_warn:              "Database Warning",
};

const ACTION_ITEMS = [
  {
    key: "overdue_invoices"  as const,
    singular: "overdue invoice",
    plural:   "overdue invoices",
    icon: FileText,
    href: "/admin/invoices",
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
  {
    key: "pending_bookings"  as const,
    singular: "booking awaiting confirmation",
    plural:   "bookings awaiting confirmation",
    icon: Calendar,
    href: "/admin/bookings",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    key: "new_contacts"      as const,
    singular: "new enquiry",
    plural:   "new enquiries",
    icon: MessageSquare,
    href: "/admin/communications",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    key: "pending_approvals" as const,
    singular: "post awaiting your approval",
    plural:   "posts awaiting your approval",
    icon: BarChart3,
    href: "/admin/social",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    key: "new_intakes" as const,
    singular: "new intake submission",
    plural:   "new intake submissions",
    icon: ClipboardList,
    href: "/admin/clients",
    color: "text-[#f9a825]",
    bg: "bg-amber-500/10",
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationData | null>(null);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  const panelRef  = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications");
      if (res.ok) setData(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    void fetchData();
    const id = setInterval(() => void fetchData(), 2 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchData]);

  // Refresh when panel opens so counts are always fresh
  useEffect(() => { if (open) void fetchData(); }, [open, fetchData]);

  // ── Close on outside click ────────────────────────────────────────────────

  useEffect(() => {
    function onPointer(e: PointerEvent) {
      if (
        panelRef.current  && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  // ── Acknowledge ───────────────────────────────────────────────────────────

  async function dismiss(id: string) {
    setDismissing((s) => new Set(s).add(id));
    try {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setData((prev) =>
        prev
          ? { ...prev, total: Math.max(0, prev.total - 1), alerts: prev.alerts.filter((a) => a.id !== id) }
          : prev
      );
    } finally {
      setDismissing((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  }

  async function dismissAll() {
    await Promise.all((data?.alerts ?? []).map((a) => dismiss(a.id)));
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const total      = data?.total ?? 0;
  const hasAlerts  = (data?.alerts.length ?? 0) > 0;
  const hasActions = data ? Object.values(data.counts).some((v) => v > 0) : false;
  const isEmpty    = !hasAlerts && !hasActions;
  const hasCritical = data?.alerts.some((a) => a.severity === "critical");

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
          open
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        title="Notifications"
      >
        <Bell size={15} className={hasCritical ? "text-red-500" : undefined} />
        {total > 0 && (
          <span className={cn(
            "absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center leading-none",
            hasCritical ? "bg-red-500 text-white" : "bg-brand-gold text-brand-navy"
          )}>
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-[340px] bg-card border border-border rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <span className="text-sm font-semibold text-foreground">
              Notifications
              {total > 0 && (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">({total})</span>
              )}
            </span>
            <div className="flex items-center gap-1">
              {hasAlerts && (
                <button
                  onClick={dismissAll}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-sm hover:bg-muted"
                >
                  <CheckCheck size={11} /> Clear alerts
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Panel body */}
          <div className="overflow-y-auto scrollbar-overlay max-h-[440px]">
            {isEmpty ? (
              <div className="py-12 text-center">
                <CheckCircle2 size={30} className="mx-auto text-emerald-500 mb-2.5 opacity-50" />
                <p className="text-sm font-semibold text-foreground">All clear</p>
                <p className="text-xs text-muted-foreground mt-0.5">No alerts or pending actions</p>
              </div>
            ) : (
              <>
                {/* System alerts */}
                {hasAlerts && (
                  <div className="pt-3 pb-1">
                    <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      System Alerts
                    </p>
                    <div className="px-3 space-y-2">
                      {data!.alerts.map((alert) => {
                        const sev = SEVERITY[alert.severity as keyof typeof SEVERITY] ?? SEVERITY.info;
                        const SevIcon = sev.icon;
                        return (
                          <div
                            key={alert.id}
                            className={cn("flex items-start gap-2.5 px-3 py-2.5 rounded-lg border", sev.bg)}
                          >
                            <SevIcon size={13} className={cn("shrink-0 mt-0.5", sev.color)} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground leading-snug">
                                {ALERT_LABELS[alert.type] ?? alert.type.replace(/_/g, " ")}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                                {alert.message}
                              </p>
                            </div>
                            <button
                              onClick={() => dismiss(alert.id)}
                              disabled={dismissing.has(alert.id)}
                              className="shrink-0 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 mt-0.5"
                              title="Dismiss"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Needs attention */}
                {hasActions && (
                  <div className="pt-3 pb-1">
                    <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Needs Attention
                    </p>
                    {ACTION_ITEMS.filter((item) => (data?.counts[item.key] ?? 0) > 0).map((item) => {
                      const count = data!.counts[item.key];
                      const ItemIcon = item.icon;
                      return (
                        <button
                          key={item.key}
                          onClick={() => { router.push(item.href); setOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors text-left"
                        >
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", item.bg)}>
                            <ItemIcon size={13} className={item.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-foreground">
                              <span className="font-semibold">{count}</span>{" "}
                              {count === 1 ? item.singular : item.plural}
                            </p>
                          </div>
                          <ArrowRight size={12} className="text-muted-foreground shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Panel footer */}
          <div className="border-t border-border px-4 py-2.5 shrink-0">
            <button
              onClick={() => { router.push("/admin/logs"); setOpen(false); }}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              View full activity log <ArrowRight size={10} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
