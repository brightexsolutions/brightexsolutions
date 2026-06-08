import type { Metadata } from "next";
import {
  FolderOpen, Users, FileText, DollarSign,
  CheckCircle2, AlertTriangle, AlertCircle,
  TrendingUp, UserPlus, Calendar, ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/admin/stat-card";
import { ActivityFeedTable, BookingsFeedTable, type ActivityRow, type BookingRow } from "@/components/admin/dashboard-tables";
import { RevenueChart, type MonthlyDataPoint } from "@/components/admin/revenue-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard | Admin" };
export const revalidate = 60;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function buildMonthlyData(
  incomeRows: Array<{ amount: number; date: string }>,
  expenseRows: Array<{ amount: number; date: string }>
): MonthlyDataPoint[] {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const points: MonthlyDataPoint[] = [];

  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const income = incomeRows
      .filter((r) => r.date?.startsWith(key))
      .reduce((s, r) => s + Number(r.amount), 0);
    const expenses = expenseRows
      .filter((r) => r.date?.startsWith(key))
      .reduce((s, r) => s + Number(r.amount), 0);
    points.push({ month: months[d.getMonth()], income, expenses });
  }
  return points;
}

const DEMO_CHART: MonthlyDataPoint[] = [
  { month: "Jan", income: 85000,  expenses: 32000 },
  { month: "Feb", income: 120000, expenses: 41000 },
  { month: "Mar", income: 95000,  expenses: 28000 },
  { month: "Apr", income: 140000, expenses: 52000 },
  { month: "May", income: 110000, expenses: 38000 },
  { month: "Jun", income: 175000, expenses: 60000 },
  { month: "Jul", income: 155000, expenses: 45000 },
  { month: "Aug", income: 200000, expenses: 70000 },
];

// ─── Data fetch ────────────────────────────────────────────────────────────────

async function getDashboardData() {
  const configured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  if (!configured) return null;

  try {
    const supabase = createAdminClient();
    const eightMonthsAgo = new Date();
    eightMonthsAgo.setMonth(eightMonthsAgo.getMonth() - 8);

    const [
      projectsRes, clientsRes, invoicesRes,
      mrrRes, alertsRes, contactsRes, bookingsRes,
      incomeRes, expenseRes,
    ] = await Promise.all([
      supabase.from("projects").select("id, status", { count: "exact" }).in("status", ["discovery", "design", "development", "review"]),
      supabase.from("clients").select("id", { count: "exact" }).eq("classification", "active"),
      supabase.from("invoices").select("id, invoice_number, total, status, created_at").in("status", ["sent", "overdue", "paid"]).order("created_at", { ascending: false }).limit(8),
      supabase.from("product_subscriptions").select("amount").eq("status", "active"),
      supabase.from("system_alerts").select("id, type, severity, message, created_at").eq("acknowledged", false).order("created_at", { ascending: false }).limit(5),
      supabase.from("contacts").select("id, name, contact, message, created_at, status").order("created_at", { ascending: false }).limit(6),
      supabase.from("bookings").select("id, booker_name, booker_email, purpose, scheduled_at, status").order("scheduled_at", { ascending: true }).gte("scheduled_at", new Date().toISOString()).limit(5),
      supabase.from("income_records").select("amount, date").gte("date", eightMonthsAgo.toISOString().slice(0, 10)),
      supabase.from("expenses").select("amount, date").gte("date", eightMonthsAgo.toISOString().slice(0, 10)),
    ]);

    const mrr = (mrrRes.data ?? []).reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0);
    const overdueCount = (invoicesRes.data ?? []).filter((i: { status: string }) => i.status === "overdue").length;
    const openCount = (invoicesRes.data ?? []).filter((i: { status: string }) => i.status !== "paid").length;

    return {
      projects: projectsRes.count ?? 0,
      clients: clientsRes.count ?? 0,
      openInvoices: openCount,
      overdueInvoices: overdueCount,
      mrr,
      alerts: alertsRes.data ?? [],
      contacts: contactsRes.data ?? [],
      bookings: bookingsRes.data ?? [],
      invoices: invoicesRes.data ?? [],
      chartData: buildMonthlyData(incomeRes.data ?? [], expenseRes.data ?? []),
    };
  } catch {
    return null;
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const data = await getDashboardData();
  const hasData = !!data;

  const hasCritical = data?.alerts.some((a: { severity: string }) => a.severity === "critical");
  const hasWarnings = data?.alerts.some((a: { severity: string }) => a.severity === "warning");

  const chartData: MonthlyDataPoint[] =
    hasData && data.chartData.some((p) => p.income > 0 || p.expenses > 0)
      ? data.chartData
      : DEMO_CHART;

  // Build unified activity rows from contacts + bookings + invoices
  const activityRows: ActivityRow[] = [];

  if (hasData) {
    data.contacts.slice(0, 3).forEach((c: { id: string; name: string; contact: string; created_at: string; status: string }) => {
      activityRows.push({
        id: c.id,
        ref: `CON-${c.id.slice(-5).toUpperCase()}`,
        description: c.name,
        meta: c.contact,
        status: c.status ?? "new",
        date: c.created_at,
      });
    });
    data.bookings.slice(0, 3).forEach((b: { id: string; booker_name: string; booker_email: string; purpose: string; scheduled_at: string; status: string }) => {
      activityRows.push({
        id: b.id,
        ref: `BOOK-${b.id.slice(-4).toUpperCase()}`,
        description: b.booker_name,
        meta: b.purpose?.replace(/_/g, " ") ?? "Booking",
        status: b.status ?? "pending",
        date: b.scheduled_at,
      });
    });
    data.invoices.slice(0, 4).forEach((inv: { id: string; invoice_number: string; total: number; status: string; created_at: string }) => {
      activityRows.push({
        id: inv.id,
        ref: inv.invoice_number ?? `INV-${inv.id.slice(-5).toUpperCase()}`,
        description: "Invoice",
        meta: "",
        amount: inv.total ? `KES ${Number(inv.total).toLocaleString()}` : undefined,
        status: inv.status ?? "draft",
        date: inv.created_at,
      });
    });
  } else {
    // Demo rows
    const demoRows: ActivityRow[] = [
      { id: "1", ref: "INV-00076", description: "Web Design Project", meta: "Acme Ltd", amount: "KES 85,000", status: "completed", date: new Date().toISOString() },
      { id: "2", ref: "BOOK-0075", description: "Discovery Call", meta: "intro_call", amount: undefined, status: "confirmed", date: new Date(Date.now() - 86400000).toISOString() },
      { id: "3", ref: "CON-00074", description: "New enquiry", meta: "jane@example.com", amount: undefined, status: "new", date: new Date(Date.now() - 172800000).toISOString() },
      { id: "4", ref: "INV-00073", description: "ERP Development", meta: "School System", amount: "KES 320,000", status: "sent", date: new Date(Date.now() - 259200000).toISOString() },
      { id: "5", ref: "CON-00072", description: "SEO enquiry", meta: "mike@business.co.ke", amount: undefined, status: "new", date: new Date(Date.now() - 345600000).toISOString() },
    ];
    activityRows.push(...demoRows);
  }


  return (
    <div className="space-y-7 pb-6">

      {/* ── Greeting ── */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          {greeting()}, Godwin
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Stay on top of your projects, track revenue, and monitor client activity.
        </p>
      </div>

      {/* ── System health strip ── */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
        hasCritical
          ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/30"
          : hasWarnings
          ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/30"
          : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/40"
      }`}>
        {hasCritical ? (
          <AlertCircle size={15} className="text-red-500 shrink-0" />
        ) : hasWarnings ? (
          <AlertTriangle size={15} className="text-amber-500 shrink-0" />
        ) : (
          <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
        )}
        <span className={`text-sm font-medium ${
          hasCritical ? "text-red-700 dark:text-red-300"
          : hasWarnings ? "text-amber-700 dark:text-amber-300"
          : "text-emerald-700 dark:text-emerald-300"
        }`}>
          {hasCritical ? "Critical alerts require attention"
            : hasWarnings ? "Warnings need review"
            : "All systems operational"}
        </span>
        {!hasData && (
          <span className="text-muted-foreground ml-auto text-xs">
            Connect Supabase to enable live data
          </span>
        )}
        {data && data.alerts.length > 0 && (
          <Link href="/admin/sites" className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            {data.alerts.length} alert{data.alerts.length !== 1 ? "s" : ""} <ArrowUpRight size={12} />
          </Link>
        )}
      </div>

      {/* ── KPI stat cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          featured
          title="Monthly Recurring Revenue"
          value={hasData ? `KES ${data.mrr.toLocaleString()}` : "KES 0"}
          trend={{ direction: "up", value: "+12%", label: "vs last month" }}
          icon={DollarSign}
          href="/admin/finance"
        />
        <StatCard
          title="Active Projects"
          value={hasData ? String(data.projects) : "—"}
          trend={{ direction: "flat", value: hasData ? `${data.projects} active` : "—" }}
          sub="Currently in progress"
          icon={FolderOpen}
          accent={{ bg: "bg-blue-400/10", text: "text-blue-500" }}
          href="/admin/projects"
        />
        <StatCard
          title="Open Invoices"
          value={hasData ? String(data.openInvoices) : "—"}
          trend={
            hasData && data.overdueInvoices > 0
              ? { direction: "down", value: `${data.overdueInvoices} overdue`, label: "— action needed" }
              : { direction: "flat", value: "All on time" }
          }
          icon={FileText}
          accent={
            data?.overdueInvoices
              ? { bg: "bg-red-400/10", text: "text-red-500" }
              : { bg: "bg-amber-400/10", text: "text-amber-500" }
          }
          href="/admin/invoices"
        />
        <StatCard
          title="Active Clients"
          value={hasData ? String(data.clients) : "—"}
          trend={{ direction: "up", value: "+2", label: "this quarter" }}
          sub="Current engagements"
          icon={Users}
          accent={{ bg: "bg-emerald-400/10", text: "text-emerald-500" }}
          href="/admin/clients"
        />
      </div>

      {/* ── Middle row: chart + quick actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">

        {/* Revenue chart */}
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Revenue Overview</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Income vs Expenses — last 8 months</p>
              </div>
              <Link href="/admin/finance" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                Full report <ArrowUpRight size={12} />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <RevenueChart data={chartData} />
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {[
              { label: "New Project", href: "/admin/projects", icon: FolderOpen },
              { label: "Create Invoice", href: "/admin/invoices", icon: FileText },
              { label: "Add Client", href: "/admin/clients", icon: UserPlus },
              { label: "Record Payment", href: "/admin/payments", icon: DollarSign },
              { label: "View Calendar", href: "/admin/calendar", icon: Calendar },
              { label: "Sales Pipeline", href: "/admin/sales", icon: TrendingUp },
            ].map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted hover:border-brand-gold/30 transition-all group"
              >
                <Icon size={14} className="text-muted-foreground group-hover:text-brand-gold transition-colors" />
                {label}
                <ArrowUpRight size={12} className="ml-auto text-muted-foreground/50 group-hover:text-brand-gold transition-colors" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Activity table ── */}
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Latest contacts, bookings, and invoices</p>
            </div>
            <div className="flex items-center gap-3">
              {!hasData && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">Demo data</span>
              )}
              <Link href="/admin/clients" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                View all <ArrowUpRight size={12} />
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-0 pb-1">
          <ActivityFeedTable rows={activityRows} />
        </CardContent>
      </Card>

      {/* ── Upcoming bookings ── */}
      {hasData && data.bookings.length > 0 && (
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Upcoming Bookings</CardTitle>
              <Link href="/admin/bookings" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                View all <ArrowUpRight size={12} />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-0 pb-1">
            <BookingsFeedTable rows={data.bookings as BookingRow[]} />
          </CardContent>
        </Card>
      )}

    </div>
  );
}
