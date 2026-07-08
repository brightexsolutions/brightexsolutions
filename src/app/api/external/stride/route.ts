import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyExternalApiKey } from "@/lib/external-api-auth";
import { rateLimit } from "@/lib/rate-limit";

// Summary endpoint for Stride's Settings → Integrations "Brightex Dashboard API".
// Shape matches stride-app/docs/brightex-api-spec.md exactly. Bearer-token auth via
// STRIDE_API_KEY (a dedicated secret — not CRON_SECRET, which is for internal
// scheduler triggers, and not admin session cookies, which are for human users).
const SEVERITY_TO_PRIORITY: Record<string, "high" | "medium" | "low"> = {
  critical: "high",
  warning: "medium",
  info: "low",
};

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "public");
  if (limited) return limited;

  const denied = verifyExternalApiKey(request);
  if (denied) return denied;

  const supabase = createAdminClient();

  // Same month-boundary + "revenue by payment date, not created_at" logic as the
  // admin dashboard's own Revenue This Month card (src/app/(admin)/admin/page.tsx).
  const now = new Date();
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const nextMonthStart = now.getMonth() === 11
    ? `${now.getFullYear() + 1}-01-01`
    : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, "0")}-01`;

  const [invoicesRes, projectsRes, alertsRes, paymentsRes, clientsRes, salesRes, bookingsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("total")
      .in("status", ["sent", "overdue"])
      .is("deleted_at", null),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .not("status", "in", "(paused,completed)")
      .is("deleted_at", null),
    supabase
      .from("system_alerts")
      .select("id, type, severity, message, entity_id, entity_type, created_at")
      .eq("acknowledged", false)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("payments")
      .select("amount")
      .gte("date", thisMonthStart)
      .lt("date", nextMonthStart)
      .is("deleted_at", null),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("classification", "active"),
    supabase
      .from("sales")
      .select("estimated_value")
      .not("status", "in", "(won,lost)"),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .not("status", "in", "(cancelled,completed)")
      .gte("scheduled_at", now.toISOString()),
  ]);

  const pendingInvoiceRows = invoicesRes.data ?? [];
  const pendingInvoices = pendingInvoiceRows.length;
  const pendingInvoiceValue = pendingInvoiceRows.reduce((s, r) => s + Number(r.total ?? 0), 0);
  const activeProjects = projectsRes.count ?? 0;
  const revenueThisMonth = (paymentsRes.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const activeClients = clientsRes.count ?? 0;
  const salesPipelineValue = (salesRes.data ?? []).reduce((s, r) => s + Number(r.estimated_value ?? 0), 0);
  const upcomingBookings = bookingsRes.count ?? 0;

  // Most-recent-first from the query, then stable-sorted so critical still leads
  // within that recency order rather than an arbitrary severity-alphabetical one.
  const SEVERITY_RANK: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  const alerts = (alertsRes.data ?? []).slice().sort((a, b) => {
    return (SEVERITY_RANK[a.severity ?? "info"] ?? 3) - (SEVERITY_RANK[b.severity ?? "info"] ?? 3);
  });

  // Invoice-linked alerts get a real due_date. There's no per-invoice admin page/URL
  // in this app yet — invoices open in a client-side Sheet/Dialog from the list page,
  // not a dedicated route — so the deep link goes to the list page itself rather than
  // a fabricated /admin/invoices/{id} route that 404s. Every other entity_type
  // (booking/site/sale/subscription/trial/subcontractor_expense/system) has no
  // admin page pattern established either, so those get no url at all — still valid
  // per spec (dueDate/url are both optional).
  const invoiceEntityIds = alerts.filter((a) => a.entity_type === "invoice" && a.entity_id).map((a) => a.entity_id as string);
  const invoiceDueDates = new Map<string, string | null>();
  if (invoiceEntityIds.length) {
    const { data: invoiceRows } = await supabase.from("invoices").select("id, due_date").in("id", invoiceEntityIds);
    for (const row of invoiceRows ?? []) invoiceDueDates.set(row.id, row.due_date);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const itemsRequiringAttention = alerts.map((a) => ({
    id: a.id,
    title: a.message,
    priority: SEVERITY_TO_PRIORITY[a.severity ?? "info"] ?? "low",
    category: a.entity_type === "invoice" ? ("invoice" as const) : ("other" as const),
    ...(a.entity_type === "invoice" && a.entity_id && invoiceDueDates.get(a.entity_id)
      ? { dueDate: invoiceDueDates.get(a.entity_id) }
      : {}),
    ...(a.entity_type === "invoice" && siteUrl ? { url: `${siteUrl}/admin/invoices` } : {}),
  }));

  return NextResponse.json({
    pendingInvoices,
    pendingInvoiceValue,
    activeProjects,
    revenueThisMonth,
    activeClients,
    salesPipelineValue,
    upcomingBookings,
    itemsRequiringAttention,
  });
}
