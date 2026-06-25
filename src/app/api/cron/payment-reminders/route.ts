import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { transporter } from "@/lib/mail";
import { verifyCronSecret } from "@/lib/cron-auth";
import { SITE_NAME, BUSINESS_PHONE, whatsappUrl } from "@/lib/constants";
import {
  emailTemplate,
  emailRow,
  emailInfoTable,
  emailAlert,
  emailParagraph,
  emailDivider,
  emailSignoff,
} from "@/lib/email-templates";

const REMINDER_COOLDOWN_DAYS = 5;

type PaymentSettings = Record<string, string>;

function fmtKES(n: number) {
  return `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
}

function buildPaymentDetailsBlock(ps: PaymentSettings) {
  const BORDER = "#e2e8f0";
  const MUTED = "#64748b";
  const NAVY = "#152238";

  const hasMpesa  = !!ps.invoice_mpesa_number;
  const hasTill   = !!ps.invoice_till_number;
  const hasPaypal = !!ps.invoice_paypal_email;
  const hasBank   = !!ps.invoice_bank_name;

  if (!hasMpesa && !hasTill && !hasPaypal && !hasBank) return "";

  const rows = [
    hasMpesa && `
      <tr><td style="padding:10px 0;border-bottom:1px solid ${BORDER}">
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:${MUTED};text-transform:uppercase;letter-spacing:0.8px">M-Pesa Send Money</p>
        <p style="margin:0;font-size:13px;font-weight:700;color:${NAVY}">${ps.invoice_mpesa_number}</p>
        ${ps.invoice_mpesa_name ? `<p style="margin:2px 0 0;font-size:13px;color:${MUTED}">${ps.invoice_mpesa_name}</p>` : ""}
      </td></tr>`,
    hasTill && `
      <tr><td style="padding:10px 0;border-bottom:1px solid ${BORDER}">
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:${MUTED};text-transform:uppercase;letter-spacing:0.8px">M-Pesa Till (Buy Goods)</p>
        <p style="margin:0;font-size:13px;font-weight:700;color:${NAVY}">Till No: ${ps.invoice_till_number}</p>
        ${ps.invoice_till_name ? `<p style="margin:2px 0 0;font-size:13px;color:${MUTED}">${ps.invoice_till_name}</p>` : ""}
      </td></tr>`,
    hasPaypal && `
      <tr><td style="padding:10px 0;border-bottom:1px solid ${BORDER}">
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:${MUTED};text-transform:uppercase;letter-spacing:0.8px">PayPal</p>
        <p style="margin:0;font-size:13px;font-weight:700;color:${NAVY}">${ps.invoice_paypal_email}</p>
      </td></tr>`,
    hasBank && `
      <tr><td style="padding:10px 0">
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:${MUTED};text-transform:uppercase;letter-spacing:0.8px">Bank Transfer</p>
        <p style="margin:0;font-size:13px;font-weight:700;color:${NAVY}">${ps.invoice_bank_name}</p>
        ${ps.invoice_bank_account_name ? `<p style="margin:2px 0 0;font-size:13px;color:${MUTED}">Account Name: ${ps.invoice_bank_account_name}</p>` : ""}
        ${ps.invoice_bank_account_number ? `<p style="margin:2px 0 0;font-size:13px;color:${MUTED}">Account No: ${ps.invoice_bank_account_number}</p>` : ""}
        ${ps.invoice_bank_branch ? `<p style="margin:2px 0 0;font-size:13px;color:${MUTED}">Branch: ${ps.invoice_bank_branch}</p>` : ""}
      </td></tr>`,
  ].filter(Boolean).join("");

  return `
    <div style="border:1px solid ${BORDER};border-radius:4px;margin:20px 0;overflow:hidden">
      <div style="background:#f8fafc;padding:10px 16px;border-bottom:1px solid ${BORDER}">
        <p style="margin:0;font-size:11px;font-weight:700;color:${MUTED};text-transform:uppercase;letter-spacing:0.9px">Payment Details</p>
      </div>
      <div style="padding:0 16px">
        <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      </div>
    </div>`;
}

export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ status: "skipped", reason: "Supabase not configured" });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  // Only re-send if no reminder in the last REMINDER_COOLDOWN_DAYS days
  const cooldownCutoff = new Date();
  cooldownCutoff.setDate(cooldownCutoff.getDate() - REMINDER_COOLDOWN_DAYS);

  const [{ data: overdueInvoices }, { data: settingsRows }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, total, due_date, client_id, last_reminder_sent_at, clients(name, email), projects(name)")
      .eq("status", "sent")
      .lt("due_date", today)
      .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lt.${cooldownCutoff.toISOString()}`),
    supabase
      .from("settings")
      .select("key, value")
      .in("key", [
        "invoice_mpesa_number", "invoice_mpesa_name",
        "invoice_till_number", "invoice_till_name",
        "invoice_paypal_email",
        "invoice_bank_name", "invoice_bank_account_name",
        "invoice_bank_account_number", "invoice_bank_branch",
      ]),
  ]);

  if (!overdueInvoices?.length) {
    return NextResponse.json({ status: "ok", reminders_sent: 0 });
  }

  // Batch-fetch all payments for eligible invoices in one query
  const invoiceIds = overdueInvoices.map((inv) => inv.id);
  const { data: allPayments } = await supabase
    .from("payments")
    .select("invoice_id, amount")
    .in("invoice_id", invoiceIds)
    .is("deleted_at", null);

  const paidMap: Record<string, number> = {};
  for (const p of (allPayments ?? [])) {
    const row = p as { invoice_id: string; amount: unknown };
    paidMap[row.invoice_id] = (paidMap[row.invoice_id] ?? 0) + Number(row.amount);
  }

  const ps: PaymentSettings = Object.fromEntries(
    (settingsRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value])
  );
  const paymentBlock = buildPaymentDetailsBlock(ps);

  let sent = 0;
  for (const invoice of overdueInvoices) {
    const client = (invoice.clients as unknown) as { name: string; email: string } | null;
    if (!client?.email) continue;

    const paidAmount = paidMap[invoice.id] ?? 0;
    const balance = Number(invoice.total) - paidAmount;
    const hasPartial = paidAmount > 0 && balance > 0;

    // Skip if somehow fully paid (status should prevent this, but guard anyway)
    if (balance <= 0) continue;

    const daysOverdue = Math.floor(
      (Date.now() - new Date(invoice.due_date).getTime()) / 86400000
    );

    const overdueText = hasPartial
      ? `Thank you for your partial payment. The remaining balance of <strong>${fmtKES(balance)}</strong> on invoice <strong>${invoice.invoice_number}</strong> is <strong>${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue</strong>. Please process the outstanding balance as soon as possible.`
      : `Invoice <strong>${invoice.invoice_number}</strong> is <strong>${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue</strong>. Please process payment as soon as possible.`;

    const projectName = (invoice.projects as { name?: string } | null)?.name ?? null;

    const amountRows = hasPartial
      ? emailRow("Balance Remaining", `<strong>${fmtKES(balance)}</strong>`) +
        emailRow("Amount Paid So Far", fmtKES(paidAmount)) +
        emailRow("Invoice Total", fmtKES(Number(invoice.total)))
      : emailRow("Amount Due", fmtKES(Number(invoice.total)));

    const subject = hasPartial
      ? `Balance Reminder: Invoice ${invoice.invoice_number} — ${fmtKES(balance)} outstanding (${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue)`
      : `Payment Reminder: Invoice ${invoice.invoice_number} is ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue`;

    try {
      // Create system alert only if none already exists for this invoice
      const { count: existingCount } = await supabase
        .from("system_alerts")
        .select("*", { count: "exact", head: true })
        .eq("entity_id", invoice.id)
        .eq("type", "invoice_overdue")
        .eq("acknowledged", false);

      if ((existingCount ?? 0) === 0) {
        await supabase.from("system_alerts").insert({
          type: "invoice_overdue",
          severity: daysOverdue >= 14 ? "critical" : "warning",
          message: `Invoice ${invoice.invoice_number} for ${client.name} is ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue — ${hasPartial ? `${fmtKES(balance)} remaining` : fmtKES(Number(invoice.total))}`,
          entity_id: invoice.id,
          entity_type: "invoice",
        });
      }

      await transporter.sendMail({
        from: `${SITE_NAME} <${process.env.SMTP_USER}>`,
        to: client.email,
        subject,
        html: emailTemplate({
          title: hasPartial ? "Balance Reminder" : "Payment Reminder",
          subtitle: invoice.invoice_number ?? undefined,
          preheader: hasPartial
            ? `Balance of ${fmtKES(balance)} outstanding on invoice ${invoice.invoice_number}`
            : `Invoice ${invoice.invoice_number} is ${daysOverdue} days overdue`,
          body:
            emailParagraph(`Dear <strong>${client.name}</strong>,`) +
            emailAlert(overdueText, "warning") +
            emailInfoTable(
              emailRow("Invoice", invoice.invoice_number ?? "—") +
              (projectName ? emailRow("Project", projectName) : "") +
              amountRows +
              emailRow("Was Due", new Date(invoice.due_date).toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" }))
            ) +
            paymentBlock +
            emailDivider() +
            emailParagraph(
              `Please process payment at your earliest convenience. Reply to this email or reach us on WhatsApp: <a href="${whatsappUrl()}" style="color:#f9a825;font-weight:600">${BUSINESS_PHONE}</a>`
            ) +
            emailSignoff(),
        }),
      });

      sent++;

      const now = new Date().toISOString();
      await Promise.all([
        supabase.from("invoices")
          .update({ status: "overdue", last_reminder_sent_at: now })
          .eq("id", invoice.id),
        supabase.from("communications").insert({
          client_id: invoice.client_id,
          type: "email",
          subject,
          direction: "out",
          status: "sent",
        }),
      ]);
    } catch {
      // Continue sending to other clients even if one fails
    }
  }

  return NextResponse.json({ status: "ok", reminders_sent: sent, timestamp: new Date().toISOString() });
}
