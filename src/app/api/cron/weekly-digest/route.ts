import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { transporter } from "@/lib/mail";
import { verifyCronSecret } from "@/lib/cron-auth";
import { SITE_NAME, BUSINESS_EMAIL } from "@/lib/constants";
import { logSystemAction } from "@/lib/audit";
import {
  emailTemplate,
  emailRow,
  emailInfoTable,
  emailSectionLabel,
  emailParagraph,
  emailDivider,
  emailSignoff,
} from "@/lib/email-templates";

function fmtKES(n: number) {
  return `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
}

export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ status: "skipped", reason: "Supabase not configured" });
  }

  // Only send on Mondays (guard for any scheduler that may fire on wrong day)
  if (new Date().getDay() !== 1) {
    return NextResponse.json({ status: "skipped", reason: "Not Monday" });
  }

  const supabase = createAdminClient();
  const today    = new Date().toISOString().split("T")[0];
  const in7days  = new Date(Date.now() + 7  * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const in14days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [
    { data: openInvoices },
    { data: upcomingBookings },
    { data: renewingSubs },
    { data: openSales },
    { data: unacknowledgedAlerts },
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, total, due_date, status, clients(name)")
      .in("status", ["sent", "overdue", "partial"])
      .is("deleted_at", null)
      .order("due_date", { ascending: true }),
    supabase
      .from("bookings")
      .select("id, booker_name, purpose, scheduled_at")
      .eq("status", "confirmed")
      .gte("scheduled_at", today)
      .lte("scheduled_at", in7days + "T23:59:59Z")
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("subscriptions")
      .select("id, name, next_renewal_date, amount, currency")
      .eq("active", true)
      .lte("next_renewal_date", in14days)
      .gte("next_renewal_date", today)
      .order("next_renewal_date", { ascending: true }),
    supabase
      .from("sales")
      .select("id, service, status, estimated_value, clients(name)")
      .in("status", ["lead", "proposal", "negotiation"])
      .is("deleted_at", null),
    supabase
      .from("system_alerts")
      .select("id", { count: "exact", head: true })
      .eq("acknowledged", false),
  ]);

  // ── Invoice section ───────────────────────────────────────────────────────────
  const invoiceTotal = (openInvoices ?? []).reduce((s, inv) => s + Number(inv.total), 0);
  const overdueCount = (openInvoices ?? []).filter((i) => i.status === "overdue").length;
  const invoiceRows = (openInvoices ?? []).slice(0, 8).map((inv) => {
    const client = inv.clients as { name?: string } | null;
    const dueLabel = inv.due_date
      ? new Date(inv.due_date).toLocaleDateString("en-KE", { day: "2-digit", month: "short" })
      : "—";
    const statusBadge = inv.status === "overdue" ? " ⚠️" : inv.status === "partial" ? " (partial)" : "";
    return emailRow(
      `${inv.invoice_number ?? "—"}${statusBadge}`,
      `${fmtKES(Number(inv.total))} · ${client?.name ?? "—"} · due ${dueLabel}`
    );
  }).join("");

  const invoiceSection = (openInvoices ?? []).length > 0
    ? emailSectionLabel(`Open Invoices (${(openInvoices ?? []).length})`) +
      emailInfoTable(
        invoiceRows +
        emailRow("Total outstanding", `<strong>${fmtKES(invoiceTotal)}</strong>${overdueCount > 0 ? ` — ${overdueCount} overdue` : ""}`)
      )
    : emailSectionLabel("Open Invoices") + emailParagraph("No open invoices. 🎉");

  // ── Bookings section ──────────────────────────────────────────────────────────
  const purposeLabels: Record<string, string> = {
    intro_call: "Intro Call", project_review: "Project Review",
    consultation: "Consultation", other: "Meeting",
  };
  const bookingRows = (upcomingBookings ?? []).map((b) => {
    const dateLabel = new Date(b.scheduled_at as string).toLocaleDateString("en-KE", {
      weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi",
    });
    return emailRow(purposeLabels[b.purpose] ?? "Meeting", `${b.booker_name} · ${dateLabel}`);
  }).join("");

  const bookingsSection = (upcomingBookings ?? []).length > 0
    ? emailSectionLabel(`Upcoming Bookings — Next 7 Days (${(upcomingBookings ?? []).length})`) +
      emailInfoTable(bookingRows)
    : emailSectionLabel("Upcoming Bookings") + emailParagraph("No bookings in the next 7 days.");

  // ── Subscriptions section ─────────────────────────────────────────────────────
  const subRows = (renewingSubs ?? []).map((sub) => {
    const dueLabel = new Date(sub.next_renewal_date as string).toLocaleDateString("en-KE", { day: "2-digit", month: "short" });
    return emailRow(sub.name as string, `${sub.currency} ${Number(sub.amount).toLocaleString("en-KE")} · due ${dueLabel}`);
  }).join("");

  const subsSection = (renewingSubs ?? []).length > 0
    ? emailSectionLabel(`Subscriptions Renewing Soon (${(renewingSubs ?? []).length})`) +
      emailInfoTable(subRows)
    : "";

  // ── Sales section ─────────────────────────────────────────────────────────────
  const salesByStage = (openSales ?? []).reduce<Record<string, number>>((acc, s) => {
    acc[s.status as string] = (acc[s.status as string] ?? 0) + 1;
    return acc;
  }, {});
  const salesPipelineRows = Object.entries(salesByStage)
    .map(([stage, count]) => emailRow(stage.charAt(0).toUpperCase() + stage.slice(1), `${count} lead${count !== 1 ? "s" : ""}`))
    .join("");

  const salesSection = (openSales ?? []).length > 0
    ? emailSectionLabel(`Sales Pipeline (${(openSales ?? []).length} active)`) +
      emailInfoTable(salesPipelineRows)
    : "";

  // ── Alerts banner ─────────────────────────────────────────────────────────────
  const alertCount = (unacknowledgedAlerts as unknown as { count: number } | null)?.count ?? 0;
  const alertBanner = alertCount > 0
    ? emailParagraph(`⚠️ You have <strong>${alertCount} unacknowledged system alert${alertCount !== 1 ? "s" : ""}</strong> in the admin dashboard.`)
    : "";

  const weekOf = new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });

  const html = emailTemplate({
    title: `Weekly Digest — ${weekOf}`,
    preheader: `${(openInvoices ?? []).length} open invoices · ${(upcomingBookings ?? []).length} upcoming bookings · ${(openSales ?? []).length} active leads`,
    heroLabel: "Weekly Business Digest",
    heroTitle: `Here's your\nweek ahead.`,
    body:
      emailParagraph(`Good morning. Here's your weekly summary for the week of <strong>${weekOf}</strong>.`) +
      (alertBanner ? alertBanner + emailDivider() : "") +
      invoiceSection +
      emailDivider() +
      bookingsSection +
      (subsSection ? emailDivider() + subsSection : "") +
      (salesSection ? emailDivider() + salesSection : "") +
      emailDivider() +
      emailSignoff(),
  });

  try {
    await transporter.sendMail({
      from: `${SITE_NAME} <${process.env.SMTP_USER}>`,
      to: BUSINESS_EMAIL,
      subject: `Weekly Digest — ${weekOf}`,
      html,
    });
  } catch {
    return NextResponse.json({ error: "Failed to send digest" }, { status: 500 });
  }

  await logSystemAction({
    action: "digest_sent",
    entity_type: "system",
    entity_label: `Weekly digest — ${weekOf}`,
    notes: `${(openInvoices ?? []).length} invoices · ${(upcomingBookings ?? []).length} bookings · ${(openSales ?? []).length} sales leads`,
  });

  return NextResponse.json({ status: "ok", sent: true, timestamp: new Date().toISOString() });
}
