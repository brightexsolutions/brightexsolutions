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

type PaymentSettings = Record<string, string>;

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

  const [{ data: overdueInvoices }, { data: settingsRows }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, total, due_date, client_id, clients(name, email)")
      .eq("status", "sent")
      .lt("due_date", today),
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

  const ps: PaymentSettings = Object.fromEntries(
    (settingsRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value])
  );
  const paymentBlock = buildPaymentDetailsBlock(ps);

  let sent = 0;
  for (const invoice of overdueInvoices) {
    const client = (invoice.clients as unknown) as { name: string; email: string } | null;
    if (!client?.email) continue;

    const daysOverdue = Math.floor(
      (Date.now() - new Date(invoice.due_date).getTime()) / 86400000
    );

    try {
      await transporter.sendMail({
        from: `${SITE_NAME} <${process.env.SMTP_USER}>`,
        to: client.email,
        subject: `Payment Reminder: Invoice ${invoice.invoice_number} is ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue`,
        html: emailTemplate({
          title: "Payment Reminder",
          subtitle: invoice.invoice_number ?? undefined,
          preheader: `Invoice ${invoice.invoice_number} is ${daysOverdue} days overdue`,
          body:
            emailParagraph(`Dear <strong>${client.name}</strong>,`) +
            emailAlert(
              `Invoice <strong>${invoice.invoice_number}</strong> is <strong>${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue</strong>`,
              "warning"
            ) +
            emailInfoTable(
              emailRow("Invoice", invoice.invoice_number ?? "—") +
              emailRow("Amount Due", `KES ${Number(invoice.total).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`) +
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

      await supabase.from("invoices").update({ status: "overdue" }).eq("id", invoice.id);
    } catch {
      // Continue sending to other clients even if one fails
    }
  }

  return NextResponse.json({ status: "ok", reminders_sent: sent, timestamp: new Date().toISOString() });
}
