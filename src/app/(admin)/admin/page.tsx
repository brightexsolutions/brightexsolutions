import type { Metadata } from "next";
import {
  FolderOpen, Users, FileText, DollarSign,
  CheckCircle2, AlertTriangle, AlertCircle, Bell,
  TrendingUp, TrendingDown, Clock, UserPlus, CreditCard, Activity,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard | Admin" };
export const revalidate = 60;

// ─── Data fetch ────────────────────────────────────────────────────────────────

async function getDashboardData() {
  const configured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  if (!configured) return null;

  try {
    const supabase = createAdminClient();

    const [
      projectsRes, clientsRes, invoicesRes,
      mrrRes, alertsRes, contactsRes, bookingsRes, teamActivityRes,
    ] = await Promise.all([
      supabase.from("projects").select("id, status", { count: "exact" }).in("status", ["discovery", "design", "development", "review"]),
      supabase.from("clients").select("id", { count: "exact" }).eq("classification", "active"),
      supabase.from("invoices").select("id, total, status", { count: "exact" }).in("status", ["sent", "overdue"]),
      supabase.from("product_subscriptions").select("amount").eq("status", "active"),
      supabase.from("system_alerts").select("id, type, severity, message, created_at, entity_type").eq("acknowledged", false).order("created_at", { ascending: false }).limit(5),
      supabase.from("contacts").select("id, name, message, created_at, status").order("created_at", { ascending: false }).limit(4),
      supabase.from("bookings").select("id, booker_name, purpose, scheduled_at, status").order("created_at", { ascending: false }).limit(3),
      supabase.from("activity_log")
        .select("id, actor_name, action, entity_type, entity_label, notes, created_at")
        .in("action", ["added_expense", "updated_task_status", "submitted_deliverable", "created_task", "logged_comm"])
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const mrr = (mrrRes.data ?? []).reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0);
    const overdueInvoices = (invoicesRes.data ?? []).filter((i: { status: string }) => i.status === "overdue");

    return {
      projects: projectsRes.count ?? 0,
      clients: clientsRes.count ?? 0,
      openInvoices: invoicesRes.count ?? 0,
      overdueInvoices: overdueInvoices.length,
      mrr,
      alerts: alertsRes.data ?? [],
      contacts: contactsRes.data ?? [],
      bookings: bookingsRes.data ?? [],
      teamActivity: teamActivityRes.data ?? [],
    };
  } catch {
    return null;
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const data = await getDashboardData();
  const hasData = !!data;

  const kpiCards = [
    {
      title: "Active Projects",
      value: hasData ? String(data.projects) : "—",
      icon: FolderOpen,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      sub: hasData ? (data.projects === 1 ? "1 project in progress" : `${data.projects} projects in progress`) : "Connect Supabase to populate",
      href: "/admin/projects",
    },
    {
      title: "Active Clients",
      value: hasData ? String(data.clients) : "—",
      icon: Users,
      color: "text-green-400",
      bg: "bg-green-400/10",
      sub: hasData ? "Total active engagements" : "Total active engagements",
      href: "/admin/clients",
    },
    {
      title: "Open Invoices",
      value: hasData ? String(data.openInvoices) : "—",
      icon: FileText,
      color: data?.overdueInvoices ? "text-red-400" : "text-amber-400",
      bg: data?.overdueInvoices ? "bg-red-400/10" : "bg-amber-400/10",
      sub: hasData
        ? data.overdueInvoices > 0
          ? `${data.overdueInvoices} overdue — action needed`
          : "Awaiting payment"
        : "Awaiting payment",
      href: "/admin/invoices",
    },
    {
      title: "MRR",
      value: hasData ? `KES ${data.mrr.toLocaleString()}` : "KES —",
      icon: DollarSign,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
      sub: "Monthly recurring revenue",
      href: "/admin/finance",
    },
  ];

  const alertSeverityClass = (severity: string) =>
    severity === "critical"
      ? "text-red-500 dark:text-red-400"
      : severity === "warning"
      ? "text-amber-500 dark:text-amber-400"
      : "text-blue-500 dark:text-blue-400";

  const alertBg = (severity: string) =>
    severity === "critical"
      ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/30"
      : severity === "warning"
      ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/30"
      : "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/30";

  const hasCritical = data?.alerts.some((a: { severity: string }) => a.severity === "critical");
  const hasWarnings = data?.alerts.some((a: { severity: string }) => a.severity === "warning");

  return (
    <div className="space-y-6">

      {/* System health strip */}
      <div className={`flex items-center gap-3 p-4 rounded-sm border text-sm ${
        hasCritical
          ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/30"
          : hasWarnings
          ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/30"
          : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/40"
      }`}>
        {hasCritical ? (
          <AlertCircle size={16} className="text-red-500 shrink-0" />
        ) : hasWarnings ? (
          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
        ) : (
          <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
        )}
        <span className={`font-medium ${
          hasCritical ? "text-red-700 dark:text-red-300"
          : hasWarnings ? "text-amber-700 dark:text-amber-300"
          : "text-emerald-700 dark:text-emerald-300"
        }`}>
          {hasCritical ? "Critical alerts require attention"
            : hasWarnings ? "Warnings need review"
            : hasData ? "All systems operational"
            : "All systems operational"}
        </span>
        {!hasData && (
          <span className="text-muted-foreground ml-auto text-xs">
            Connect Supabase to enable live monitoring
          </span>
        )}
        {data && data.alerts.length > 0 && (
          <Link href="/admin/sites" className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
            View {data.alerts.length} alert{data.alerts.length !== 1 ? "s" : ""} →
          </Link>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <Link key={card.title} href={card.href} className="block group">
            <Card className="border-border group-hover:border-brand-gold/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`w-8 h-8 rounded-sm ${card.bg} flex items-center justify-center`}>
                  <card.icon size={15} className={card.color} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-display font-bold text-foreground mb-1">
                  {card.value}
                </div>
                <p className="text-xs text-muted-foreground">{card.sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Active alerts */}
      {data && data.alerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Bell size={14} className="text-brand-gold" />
            Active Alerts
          </h2>
          <div className="space-y-2">
            {data.alerts.map((alert: { id: string; severity: string; message: string; type: string }) => (
              <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-sm border text-sm ${alertBg(alert.severity)}`}>
                <AlertCircle size={14} className={`shrink-0 mt-0.5 ${alertSeverityClass(alert.severity)}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{alert.message}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{alert.type.replace(/_/g, " ")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent enquiries */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Enquiries</CardTitle>
            <Link href="/admin/clients" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              View all →
            </Link>
          </CardHeader>
          <CardContent className="space-y-0 p-0">
            {!hasData ? (
              <div className="px-6 pb-6 text-center text-muted-foreground">
                <p className="text-sm">Connect Supabase to see live enquiries.</p>
              </div>
            ) : data.contacts.length === 0 ? (
              <div className="px-6 pb-6 text-center">
                <p className="text-sm text-muted-foreground">No enquiries yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.contacts.map((c: { id: string; name: string; message: string; created_at: string; status: string }) => (
                  <div key={c.id} className="flex items-start gap-3 px-6 py-3.5">
                    <div className="w-7 h-7 rounded-full bg-brand-gold/10 flex items-center justify-center shrink-0 mt-0.5">
                      <UserPlus size={12} className="text-brand-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                        <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                          c.status === "new"
                            ? "bg-brand-gold/10 text-brand-gold"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {c.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{c.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(c.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column: Quick Actions + Upcoming bookings */}
        <div className="space-y-6">
          {/* Quick actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "New Project", href: "/admin/projects" },
                  { label: "New Invoice", href: "/admin/invoices" },
                  { label: "Add Client", href: "/admin/clients" },
                  { label: "Check Sites", href: "/admin/sites" },
                  { label: "Record Payment", href: "/admin/payments" },
                  { label: "Invite Team", href: "/admin/team" },
                ].map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex items-center justify-center px-3 py-2.5 rounded-sm border border-border text-sm font-medium text-foreground hover:bg-muted hover:border-brand-gold/40 transition-colors"
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming bookings */}
          {hasData && data.bookings.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Upcoming Bookings</CardTitle>
                <Link href="/admin/bookings" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  View all →
                </Link>
              </CardHeader>
              <CardContent className="space-y-0 p-0">
                <div className="divide-y divide-border">
                  {data.bookings.map((b: { id: string; booker_name: string; purpose: string; scheduled_at: string; status: string }) => (
                    <div key={b.id} className="flex items-center gap-3 px-6 py-3.5">
                      <CreditCard size={14} className="text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{b.booker_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {b.purpose?.replace(/_/g, " ")} · {new Date(b.scheduled_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                        b.status === "confirmed"
                          ? "bg-emerald-400/10 text-emerald-500"
                          : b.status === "pending"
                          ? "bg-amber-400/10 text-amber-500"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Team activity feed */}
      {hasData && data.teamActivity.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity size={14} className="text-brand-gold" />
              Team Activity
              <Link href="/admin/logs" className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">View all logs →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border">
              {data.teamActivity.map((entry: { id: string; actor_name: string | null; action: string; entity_type: string; entity_label: string | null; notes: string | null; created_at: string }) => {
                const actionLabel: Record<string, string> = {
                  added_expense:         "logged an expense",
                  updated_task_status:   "updated task status",
                  submitted_deliverable: "submitted a deliverable",
                  created_task:          "added a new task",
                  logged_comm:           "logged a communication",
                };
                return (
                  <div key={entry.id} className="flex items-center gap-3 py-2.5">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Activity size={11} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">
                        <span className="font-medium">{entry.actor_name ?? "Team member"}</span>
                        {" "}{actionLabel[entry.action] ?? entry.action}
                        {entry.entity_label ? <span className="text-muted-foreground"> — {entry.entity_label}</span> : null}
                      </p>
                      {entry.notes && <p className="text-xs text-muted-foreground truncate">{entry.notes}</p>}
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {new Date(entry.created_at).toLocaleString("en-KE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup notice — only shown when Supabase not configured */}
      {!hasData && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800/30 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">Setup required</p>
                <p className="text-sm text-muted-foreground">
                  Add Supabase URL and keys to{" "}
                  <code className="text-amber-700 dark:text-amber-300 text-xs bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                    .env.local
                  </code>{" "}
                  to enable database features. Until then, the dashboard renders in preview mode.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
