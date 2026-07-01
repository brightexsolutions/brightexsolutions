import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { forbidTeamMember } from "@/lib/role-guard";
import { transporter, SENDERS } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";
import { SITE_NAME, BUSINESS_PHONE, whatsappUrl } from "@/lib/constants";
import {
  emailTemplate,
  emailInfoCard,
  emailReferenceBox,
  emailAlert,
  emailParagraph,
  emailDivider,
  emailSignoff,
} from "@/lib/email-templates";
import { generateInvoicePdf, type InvoicePaymentSettings } from "@/lib/invoice-pdf-helper";

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

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const blocked = forbidTeamMember(user); if (blocked) return blocked;

  const { id } = await params;

  const [{ data: invoice, error }, { data: settingsRows }, { data: payments }] = await Promise.all([
    supabase.from("invoices").select("*, clients(name, email), projects(name)").eq("id", id).single(),
    supabase.from("settings").select("key, value").in("key", [
      "invoice_mpesa_number", "invoice_mpesa_name",
      "invoice_till_number", "invoice_till_name",
      "invoice_paypal_email",
      "invoice_bank_name", "invoice_bank_account_name",
      "invoice_bank_account_number", "invoice_bank_branch",
    ]),
    supabase.from("payments").select("amount").eq("invoice_id", id).is("deleted_at", null),
  ]);

  if (error || !invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (!invoice.clients?.email) return NextResponse.json({ error: "Client has no email" }, { status: 422 });

  const ps: PaymentSettings = Object.fromEntries(
    (settingsRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value])
  );

  const client = invoice.clients as { name: string; email: string };
  const daysOverdue = invoice.due_date
    ? Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / 86400000)
    : 0;

  const firstName = client.name.split(" ")[0];
  const dueDateLabel = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" })
    : "—";

  const paidAmount = (payments ?? []).reduce((s: number, p: { amount: unknown }) => s + Number(p.amount), 0);
  const balance = Number(invoice.total) - paidAmount;
  const hasPartial = paidAmount > 0 && balance > 0;

  function fmtKES(n: number) {
    return `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
  }

  const overdueText = hasPartial
    ? daysOverdue > 0
      ? `Thank you for your partial payment. The remaining balance of <strong>${fmtKES(balance)}</strong> on invoice ${invoice.invoice_number} is <strong>${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue</strong>. Please process the outstanding balance as soon as possible.`
      : `Thank you for your partial payment. The remaining balance of <strong>${fmtKES(balance)}</strong> on invoice ${invoice.invoice_number} is due. Please process the outstanding balance by the due date.`
    : daysOverdue > 0
      ? `Invoice ${invoice.invoice_number} is <strong>${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue</strong>. Please process payment as soon as possible.`
      : `Invoice ${invoice.invoice_number} is due. Please process payment by the due date.`;

  const html = emailTemplate({
    title: hasPartial ? "Balance Reminder" : "Payment Reminder",
    subtitle: invoice.invoice_number ?? undefined,
    preheader: hasPartial
      ? `Reminder: Balance of ${fmtKES(balance)} outstanding on invoice ${invoice.invoice_number}`
      : `Reminder: Invoice ${invoice.invoice_number} requires your attention`,
    heroLabel: `${hasPartial ? "Balance Reminder" : "Payment Reminder"} · ${invoice.invoice_number ?? ""}`,
    heroTitle: `A gentle reminder,\n${firstName}.`,
    body:
      emailAlert(overdueText, daysOverdue > 0 ? "warning" : "info") +
      emailInfoCard("📄", "Invoice Number", invoice.invoice_number ?? "—") +
      ((invoice.projects as { name?: string } | null)?.name
        ? emailInfoCard("📁", "Project", (invoice.projects as { name: string }).name)
        : "") +
      (hasPartial
        ? emailInfoCard("💰", "Balance Remaining", fmtKES(balance)) +
          emailInfoCard("✅", "Amount Paid So Far", fmtKES(paidAmount))
        : emailInfoCard("💰", "Amount Due", fmtKES(Number(invoice.total)))) +
      emailInfoCard("📅", "Due Date", dueDateLabel) +
      emailReferenceBox(invoice.invoice_number ?? "—", "Invoice Reference") +
      buildPaymentDetailsBlock(ps) +
      emailDivider() +
      emailParagraph(
        `Please process payment at your earliest convenience. Reply to this email or reach us on WhatsApp: <a href="${whatsappUrl()}" style="color:#f9a825;font-weight:600">${BUSINESS_PHONE}</a> if you have any questions.`
      ) +
      emailSignoff(),
  });

  // Generate PDF attachment
  let pdfBuffer: Buffer | undefined;
  try {
    pdfBuffer = await generateInvoicePdf(
      invoice as Record<string, unknown>,
      ps as InvoicePaymentSettings
    );
  } catch { /* silent — email still sends without attachment */ }

  const filename = `invoice-${invoice.invoice_number ?? invoice.id}.pdf`;

  try {
    await transporter.sendMail({
      from: SENDERS.payments,
      to: client.email,
      subject: hasPartial
        ? `Balance Reminder: Invoice ${invoice.invoice_number} (${fmtKES(balance)} outstanding)`
        : `Payment Reminder: Invoice ${invoice.invoice_number}`,
      html,
      attachments: pdfBuffer
        ? [{ filename, content: pdfBuffer, contentType: "application/pdf" }]
        : undefined,
    });
  } catch {
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  await supabase.from("communications").insert({
    client_id: invoice.client_id,
    invoice_id: id,
    type: "email",
    subject: `Payment reminder sent for invoice ${invoice.invoice_number}`,
    direction: "out",
    status: "sent",
  });

  return NextResponse.json({ success: true });
}
