import type { Metadata } from "next";
import Link from "next/link";
import {
  FolderOpen, Users, FileText, Wallet, AlertCircle, AlertTriangle,
  ArrowUpRight, CalendarClock, Inbox, Receipt, UserPlus, Plus, CheckCircle2,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/admin/stat-card";
import { RevenueChart, type MonthlyDataPoint } from "@/components/admin/revenue-chart";
import { DashboardGreeting } from "@/components/admin/dashboard-greeting";
import { AiAssistantPanel } from "@/components/admin/ai-assistant-panel";

export const metadata: Metadata = { title: "Dashboard" };
export const revalidate = 60;

const KES = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonthlyData(
  incomeRows: Array<{ amount: number; date: string }>,
  expenseRows: Array<{ amount: number; date: string }>
): MonthlyDataPoint[] {
  const now = new Date();
  const points: MonthlyDataPoint[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    const sum = (rows: Array<{ amount: number; date: string }>) =>
      rows.filter((r) => r.date?.startsWith(key)).reduce((s, r) => s + Number(r.amount), 0);
    points.push({ month: MONTHS[d.getMonth()], income: sum(incomeRows), expenses: sum(expenseRows) });
  }
  return points;
}

// ─── Data fetch ────────────────────────────────────────────────────────────────

type AgendaItem = {
  id: string;
  kind: "overdue" | "booking" | "lead" | "task" | "alert";
  title: string;
  detail: string;
  href: string;
  when?: string;
};

async function getDashboardData() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;

  try {
    const supabase = createAdminClient();
    const now = new Date();
    const thisMonthStart = `${monthKey(now)}-01`;
    const prevMonthStart = `${monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))}-01`;
    const eightMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 7, 1).toISOString().slice(0, 10);
    const weekAhead = new Date(now.getTime() + 7 * 864e5).toISOString();
    const today = now.toISOString().slice(0, 10);

    const [
      projectsRes, clientsRes, leadsRes, unpaidRes, revenueRes, prevRevenueRes,
      alertsRes, contactsRes, bookingsRes, tasksRes, incomeRes, expenseRes, paymentsRes,
    ] = await Promise.all([
      supabase.from("projects").select("id", { count: "exact", head: true })
        .in("status", ["discovery", "design", "development", "review"]).is("deleted_at", null),
      supabase.from("clients").select("id", { count: "exact", head: true })
        .eq("classification", "active").is("deleted_at", null),
      supabase.from("clients").select("id", { count: "exact", head: true })
        .in("classification", ["lead", "qualified"]).is("deleted_at", null),
      // Every unpaid invoice, not just the latest few: the totals must be complete
      supabase.from("invoices").select("id, invoice_number, total, status, due_date, clients(name)")
        .in("status", ["sent", "partial", "overdue"]).is("deleted_at", null)
        .order("due_date", { ascending: true }),
      supabase.from("payments").select("amount").gte("date", thisMonthStart).is("deleted_at", null),
      supabase.from("payments").select("amount").gte("date", prevMonthStart).lt("date", thisMonthStart).is("deleted_at", null),
      supabase.from("system_alerts").select("id, severity, message, created_at")
        .eq("acknowledged", false).order("created_at", { ascending: false }).limit(5),
      supabase.from("contacts").select("id, name, service, created_at")
        .eq("status", "new").order("created_at", { ascending: false }).limit(5),
      supabase.from("bookings").select("id, booker_name, purpose, scheduled_at, status")
        .gte("scheduled_at", now.toISOString()).lte("scheduled_at", weekAhead)
        .neq("status", "cancelled").order("scheduled_at", { ascending: true }).limit(5),
      supabase.from("tasks").select("id, title, due_date, status")
        .neq("status", "done").lte("due_date", today).order("due_date", { ascending: true }).limit(5),
      supabase.from("income_records").select("amount, date").gte("date", eightMonthsAgo).is("deleted_at", null),
      supabase.from("expenses").select("amount, date").gte("date", eightMonthsAgo).is("deleted_at", null),
      supabase.from("payments").select("amount, date, created_at").gte("created_at", eightMonthsAgo).is("deleted_at", null),
    ]);

    const sum = (rows: Array<{ amount?: number; total?: number }> | null, key: "amount" | "total" = "amount") =>
      (rows ?? []).reduce((s, r) => s + Number(r[key] ?? 0), 0);

    type UnpaidRow = { id: string; invoice_number: string | null; total: number; status: string; due_date: string | null; clients: { name: string } | { name: string }[] | null };
    const unpaid = (unpaidRes.data ?? []) as UnpaidRow[];
    const clientName = (r: UnpaidRow) => (Array.isArray(r.clients) ? r.clients[0]?.name : r.clients?.name) ?? "Client";
    const overdue = unpaid.filter((i) => i.status === "overdue" || (i.due_date && i.due_date < today));

    const agenda: AgendaItem[] = [];
    for (const a of alertsRes.data ?? []) {
      if (a.severity !== "critical") continue;
      agenda.push({ id: `a-${a.id}`, kind: "alert", title: "System alert", detail: a.message, href: "/admin/sites" });
    }
    for (const inv of overdue.slice(0, 5)) {
      agenda.push({
        id: `i-${inv.id}`, kind: "overdue",
        title: `${inv.invoice_number ?? "Invoice"} is overdue`,
        detail: `${clientName(inv)} · ${KES(inv.total)}`,
        href: "/admin/invoices", when: inv.due_date ?? undefined,
      });
    }
    for (const b of bookingsRes.data ?? []) {
      agenda.push({
        id: `b-${b.id}`, kind: "booking",
        title: b.booker_name,
        detail: (b.purpose ?? "Call").replace(/_/g, " "),
        href: "/admin/bookings", when: b.scheduled_at,
      });
    }
    for (const c of contactsRes.data ?? []) {
      agenda.push({ id: `c-${c.id}`, kind: "lead", title: `New enquiry from ${c.name}`, detail: c.service ?? "Website contact form", href: "/admin/communications", when: c.created_at });
    }
    for (const t of tasksRes.data ?? []) {
      agenda.push({ id: `t-${t.id}`, kind: "task", title: t.title, detail: t.due_date === today ? "Due today" : "Past due", href: "/admin/tasks", when: t.due_date ?? undefined });
    }

    const incomeSource = (incomeRes.data ?? []).length > 0
      ? (incomeRes.data as Array<{ amount: number; date: string }>)
      : ((paymentsRes.data ?? []) as Array<{ amount: number; date?: string | null; created_at: string }>).map((p) => ({
          amount: p.amount,
          date: p.date ?? p.created_at.slice(0, 10),
        }));

    return {
      projects: projectsRes.count ?? 0,
      clients: clientsRes.count ?? 0,
      leads: leadsRes.count ?? 0,
      outstanding: sum(unpaid, "total"),
      unpaidCount: unpaid.length,
      overdueCount: overdue.length,
      revenue: sum(revenueRes.data),
      prevRevenue: sum(prevRevenueRes.data),
      alerts: alertsRes.data ?? [],
      agenda,
      chartData: buildMonthlyData(incomeSource, (expenseRes.data ?? []) as Array<{ amount: number; date: string }>),
    };
  } catch {
    return null;
  }
}

// ─── Agenda row ────────────────────────────────────────────────────────────────

const AGENDA_STYLE: Record<AgendaItem["kind"], { icon: typeof Inbox; tone: string }> = {
  alert:   { icon: AlertCircle,   tone: "bg-red-500/12 text-red-600 dark:text-red-400" },
  overdue: { icon: Receipt,       tone: "bg-red-500/12 text-red-600 dark:text-red-400" },
  booking: { icon: CalendarClock, tone: "bg-blue-500/12 text-blue-600 dark:text-blue-400" },
  lead:    { icon: Inbox,         tone: "bg-brand-gold/20 text-amber-700 dark:text-brand-gold" },
  task:    { icon: CheckCircle2,  tone: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" },
};

function formatWhen(kind: AgendaItem["kind"], when?: string) {
  if (!when) return "";
  const d = new Date(when);
  if (kind === "booking") {
    return d.toLocaleString("en-KE", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Nairobi" });
  }
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", timeZone: "Africa/Nairobi" });
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const data = await getDashboardData();
  const hasCritical = data?.alerts.some((a) => a.severity === "critical");
  const hasWarnings = data?.alerts.some((a) => a.severity === "warning");

  const revenueTrend = (() => {
    if (!data) return { direction: "flat" as const, value: "-" };
    const { revenue, prevRevenue } = data;
    if (prevRevenue === 0 && revenue === 0) return { direction: "flat" as const, value: "No payments yet" };
    if (prevRevenue === 0) return { direction: "up" as const, value: "First this period" };
    const pct = Math.round(((revenue - prevRevenue) / prevRevenue) * 100);
    return { direction: (pct >= 0 ? "up" : "down") as "up" | "down", value: `${pct >= 0 ? "+" : ""}${pct}%`, label: `vs ${KES(prevRevenue)} last month` };
  })();

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      {/* Greeting + quick create */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DashboardGreeting name="Godwin" />
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Invoice", href: "/admin/invoices", icon: FileText },
            { label: "Client", href: "/admin/clients", icon: UserPlus },
            { label: "Payment", href: "/admin/payments", icon: Wallet },
          ].map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-brand-gold/15 text-foreground text-sm font-medium hover:bg-brand-gold/25 transition-colors"
            >
              <Plus size={16} /> <Icon size={16} className="text-muted-foreground" /> {label}
            </Link>
          ))}
        </div>
      </div>

      {(hasCritical || hasWarnings || !data) && (
        <Link
          href="/admin/sites"
          className={`flex items-center gap-3 px-4 h-11 rounded-full text-sm font-medium shrink-0 ${
            hasCritical
              ? "bg-red-500/10 text-red-700 dark:text-red-300"
              : "bg-amber-500/10 text-amber-800 dark:text-amber-300"
          }`}
        >
          {hasCritical ? <AlertCircle size={16} /> : <AlertTriangle size={16} />}
          {!data
            ? "Live data is unavailable. Check the Supabase connection."
            : hasCritical ? "Critical alerts need attention" : "Some site checks need review"}
          {data && <span className="ml-auto flex items-center gap-1 text-xs opacity-80">{data.alerts.length} open <ArrowUpRight size={12} /></span>}
        </Link>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 shrink-0">
        <StatCard featured title="Revenue this month" value={data ? KES(data.revenue) : "-"} trend={revenueTrend} icon={Wallet} href="/admin/finance" />
        <StatCard
          title="Outstanding"
          value={data ? KES(data.outstanding) : "-"}
          trend={
            data && data.overdueCount > 0
              ? { direction: "down", value: `${data.overdueCount} overdue`, label: `of ${data.unpaidCount} unpaid` }
              : { direction: "flat", value: data ? `${data.unpaidCount} unpaid, none overdue` : "-" }
          }
          icon={FileText}
          accent={data?.overdueCount ? { bg: "bg-red-500/12", text: "text-red-600" } : { bg: "bg-amber-400/15", text: "text-amber-600" }}
          href="/admin/invoices"
        />
        <StatCard title="Active projects" value={data ? String(data.projects) : "-"} sub="In discovery, design, build or review" icon={FolderOpen} accent={{ bg: "bg-blue-500/12", text: "text-blue-600" }} href="/admin/projects" />
        <StatCard title="Clients" value={data ? String(data.clients) : "-"} sub={data ? `${data.leads} open lead${data.leads === 1 ? "" : "s"}` : undefined} icon={Users} accent={{ bg: "bg-emerald-500/12", text: "text-emerald-600" }} href="/admin/clients" />
      </div>

      {/* Work area: fills the rest of the screen, each pane scrolls on its own */}
      <div className="grid grid-cols-1 gap-3 lg:flex-1 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Today */}
        <section className="flex flex-col min-h-0 max-h-[460px] lg:max-h-none rounded-2xl border border-border bg-card">
          <header className="flex items-center justify-between px-4 h-12 shrink-0">
            <h2 className="text-base font-semibold">Needs you</h2>
            <span className="text-xs text-muted-foreground">{data?.agenda.length ?? 0} items</span>
          </header>
          <ul className="flex-1 min-h-0 overflow-y-auto scrollbar-overlay px-2 pb-2">
            {data && data.agenda.length === 0 && (
              <li className="flex flex-col items-center justify-center text-center gap-2 py-10 text-sm text-muted-foreground">
                <CheckCircle2 size={22} className="text-emerald-500" />
                Nothing overdue, no new enquiries, no calls this week.
              </li>
            )}
            {data?.agenda.map((item) => {
              const { icon: Icon, tone } = AGENDA_STYLE[item.kind];
              return (
                <li key={item.id}>
                  <Link href={item.href} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-muted/70 transition-colors">
                    <span className={`size-10 rounded-full flex items-center justify-center shrink-0 ${tone}`}>
                      <Icon size={18} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium truncate">{item.title}</span>
                      <span className="block text-xs text-muted-foreground truncate first-letter:uppercase">{item.detail}</span>
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">{formatWhen(item.kind, item.when)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Revenue */}
        <section className="flex flex-col min-h-[320px] lg:min-h-0 rounded-2xl border border-border bg-card">
          <header className="flex items-center justify-between px-4 h-12 shrink-0">
            <div>
              <h2 className="text-base font-semibold leading-tight">Income and expenses</h2>
              <p className="text-xs text-muted-foreground">Last 8 months</p>
            </div>
            <Link href="/admin/finance" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              Books <ArrowUpRight size={12} />
            </Link>
          </header>
          <div className="flex-1 min-h-0 px-2 pb-3">
            <RevenueChart data={data?.chartData ?? []} />
          </div>
        </section>

        {/* AI suggestions and drafts awaiting approval */}
        <section className="flex flex-col min-h-0 rounded-2xl border border-border bg-card lg:col-span-2 xl:col-span-1 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-overlay dashboard-ai">
            <AiAssistantPanel />
          </div>
        </section>
      </div>
    </div>
  );
}
