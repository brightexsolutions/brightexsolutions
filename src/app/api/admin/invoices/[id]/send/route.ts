import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { forbidTeamMember } from "@/lib/role-guard";
import { transporter, SENDERS } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";
import {
  SITE_NAME,
  BUSINESS_PHONE,
  whatsappUrl,
} from "@/lib/constants";
import {
  emailTemplate,
  emailParagraph,
  emailInfoCard,
  emailReferenceBox,
  emailAlert,
  emailDivider,
  emailSignoff,
} from "@/lib/email-templates";
import { generateInvoicePdf, type InvoicePaymentSettings } from "@/lib/invoice-pdf-helper";

function fmtKES(n: number) {
  return `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildItemsTable(items: Array<{ description: string; qty: number; unit_price: number; total?: number }>) {
  const BORDER = "#e2e8f0";
  const NAVY = "#152238";
  const rows = items.map((item, i) =>
    `<tr style="background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"}">
      <td style="padding:9px 12px;color:#334155;font-size:13px;border-bottom:1px solid ${BORDER}">${item.description}</td>
      <td style="padding:9px 12px;color:#334155;font-size:13px;border-bottom:1px solid ${BORDER};text-align:center;width:40px">${item.qty}</td>
      <td style="padding:9px 12px;color:#334155;font-size:13px;border-bottom:1px solid ${BORDER};text-align:right;width:110px">${fmtKES(item.unit_price)}</td>
      <td style="padding:9px 12px;color:#334155;font-size:13px;border-bottom:1px solid ${BORDER};text-align:right;width:110px">${fmtKES(item.qty * item.unit_price)}</td>
    </tr>`
  ).join("");
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:20px 0">
      <tr style="background:${NAVY}">
        <th style="padding:10px 12px;color:#ffffff;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px">Description</th>
        <th style="padding:10px 12px;color:#ffffff;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;width:40px">Qty</th>
        <th style="padding:10px 12px;color:#ffffff;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;width:110px">Unit Price</th>
        <th style="padding:10px 12px;color:#ffffff;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;width:110px">Total</th>
      </tr>
      ${rows}
    </table>`;
}

function buildTotalsBlock(subtotal: number, tax: number, total: number, dueDate?: string | null) {
  const NAVY = "#152238";
  const GOLD = "#f9a825";
  const taxRow = tax > 0
    ? `<tr>
        <td style="padding:5px 12px 5px 0;text-align:right;color:#64748b;font-size:13px">Subtotal</td>
        <td style="padding:5px 0 5px 12px;text-align:right;color:#1e293b;font-size:13px;font-weight:600;width:130px">${fmtKES(subtotal)}</td>
       </tr>
       <tr>
        <td style="padding:5px 12px 5px 0;text-align:right;color:#64748b;font-size:13px">VAT / Tax</td>
        <td style="padding:5px 0 5px 12px;text-align:right;color:#1e293b;font-size:13px;font-weight:600;width:130px">${fmtKES(tax)}</td>
       </tr>`
    : "";
  const dueDateRow = dueDate
    ? `<tr>
        <td colspan="2" style="padding:6px 0 0;text-align:right;color:#e09000;font-size:12px">
          Due: ${new Date(dueDate).toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" })}
        </td>
       </tr>`
    : "";
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
      ${taxRow}
      <tr>
        <td style="padding:10px 12px;text-align:right;background:${NAVY};color:${GOLD};font-size:13px;font-weight:700">Total Due</td>
        <td style="padding:10px 12px;text-align:right;background:${NAVY};color:#ffffff;font-size:13px;font-weight:700;width:130px">${fmtKES(total)}</td>
      </tr>
      ${dueDateRow}
    </table>`;
}

type PaymentSettings = Record<string, string>;

function buildPaymentDetailsBlock(ps: PaymentSettings, paymentMethod?: string | null) {
  const BORDER = "#e2e8f0";
  const MUTED = "#64748b";
  const NAVY = "#152238";
  const m = paymentMethod ?? "all";
  const show = (method: string) => m === "all" || m === method;

  const hasMpesa  = show("mpesa_send_money") && ps.invoice_mpesa_number;
  const hasTill   = show("mpesa_till")        && ps.invoice_till_number;
  const hasPaypal = show("paypal")            && ps.invoice_paypal_email;
  const hasBank   = show("bank")              && ps.invoice_bank_name;

  if (!hasMpesa && !hasTill && !hasPaypal && !hasBank) return "";

  const mpesaBlock = hasMpesa ? `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${BORDER}">
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:${MUTED};text-transform:uppercase;letter-spacing:0.8px">M-Pesa Send Money</p>
        <p style="margin:0;font-size:13px;font-weight:700;color:${NAVY}">${ps.invoice_mpesa_number}</p>
        ${ps.invoice_mpesa_name ? `<p style="margin:2px 0 0;font-size:13px;color:${MUTED}">${ps.invoice_mpesa_name}</p>` : ""}
      </td>
    </tr>` : "";

  const tillBlock = hasTill ? `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${BORDER}">
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:${MUTED};text-transform:uppercase;letter-spacing:0.8px">M-Pesa Till (Buy Goods)</p>
        <p style="margin:0;font-size:13px;font-weight:700;color:${NAVY}">Till No: ${ps.invoice_till_number}</p>
        ${ps.invoice_till_name ? `<p style="margin:2px 0 0;font-size:13px;color:${MUTED}">${ps.invoice_till_name}</p>` : ""}
      </td>
    </tr>` : "";

  const paypalBlock = hasPaypal ? `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${BORDER}">
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:${MUTED};text-transform:uppercase;letter-spacing:0.8px">PayPal</p>
        <p style="margin:0;font-size:13px;font-weight:700;color:${NAVY}">${ps.invoice_paypal_email}</p>
      </td>
    </tr>` : "";

  const bankBlock = hasBank ? `
    <tr>
      <td style="padding:10px 0">
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:${MUTED};text-transform:uppercase;letter-spacing:0.8px">Bank Transfer</p>
        <p style="margin:0;font-size:13px;font-weight:700;color:${NAVY}">${ps.invoice_bank_name}</p>
        ${ps.invoice_bank_account_name ? `<p style="margin:2px 0 0;font-size:13px;color:${MUTED}">Account Name: ${ps.invoice_bank_account_name}</p>` : ""}
        ${ps.invoice_bank_account_number ? `<p style="margin:2px 0 0;font-size:13px;color:${MUTED}">Account No: ${ps.invoice_bank_account_number}</p>` : ""}
        ${ps.invoice_bank_branch ? `<p style="margin:2px 0 0;font-size:13px;color:${MUTED}">Branch: ${ps.invoice_bank_branch}</p>` : ""}
      </td>
    </tr>` : "";

  return `
    <div style="border:1px solid ${BORDER};border-radius:4px;margin:20px 0;overflow:hidden">
      <div style="background:#f8fafc;padding:10px 16px;border-bottom:1px solid ${BORDER}">
        <p style="margin:0;font-size:11px;font-weight:700;color:${MUTED};text-transform:uppercase;letter-spacing:0.9px">Payment Details</p>
      </div>
      <div style="padding:0 16px">
        <table width="100%" cellpadding="0" cellspacing="0">${mpesaBlock}${tillBlock}${paypalBlock}${bankBlock}</table>
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
    supabase.from("invoices").select("*, clients(id, name, email), projects(id, name)").eq("id", id).single(),
    supabase.from("settings").select("key, value").in("key", [
      "invoice_mpesa_number", "invoice_mpesa_name",
      "invoice_till_number", "invoice_till_name",
      "invoice_paypal_email",
      "invoice_bank_name", "invoice_bank_account_name",
      "invoice_bank_account_number", "invoice_bank_branch",
      "invoice_footer_note",
    ]),
    supabase.from("payments").select("amount").eq("invoice_id", id).is("deleted_at", null),
  ]);

  if (error || !invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (!invoice.clients?.email) return NextResponse.json({ error: "Client has no email address" }, { status: 422 });

  const ps: PaymentSettings = Object.fromEntries(
    (settingsRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value])
  );

  const client = invoice.clients as { name: string; email: string };
  const items = invoice.items as Array<{ description: string; qty: number; unit_price: number; total?: number }>;

  const firstName = client.name.split(" ")[0];
  const dueLabel = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" })
    : "On receipt";

  const html = emailTemplate({
    title: `Invoice ${invoice.invoice_number ?? ""}`,
    subtitle: invoice.invoice_number ?? undefined,
    preheader: `${SITE_NAME} invoice for ${fmtKES(Number(invoice.total))} — due ${dueLabel}`,
    heroLabel: `Invoice · ${invoice.invoice_number ?? ""}`,
    heroTitle: `Here's your invoice,\n${firstName}.`,
    body:
      emailParagraph("Please find your invoice details below. Kindly process payment by the due date shown.") +
      emailInfoCard("📄", "Invoice Number", invoice.invoice_number ?? "—") +
      emailInfoCard("💰", "Amount Due", fmtKES(Number(invoice.total))) +
      emailInfoCard("📅", "Due Date", dueLabel) +
      (invoice.projects?.name ? emailInfoCard("📁", "Project", invoice.projects.name) : "") +
      emailReferenceBox(invoice.invoice_number ?? "—", "Invoice Reference") +
      buildItemsTable(items) +
      buildTotalsBlock(
        Number(invoice.subtotal ?? items.reduce((s, i) => s + i.qty * i.unit_price, 0)),
        Number(invoice.tax ?? 0),
        Number(invoice.total),
        invoice.due_date
      ) +
      buildPaymentDetailsBlock(ps, invoice.payment_method) +
      (invoice.notes ? emailAlert(invoice.notes, "info") : "") +
      (ps.invoice_footer_note
        ? `<p style="color:#64748b;font-size:12px;text-align:center;margin:16px 0 0;font-style:italic">${ps.invoice_footer_note}</p>`
        : "") +
      emailDivider() +
      emailParagraph(
        `For any questions, reply to this email or reach us on WhatsApp: <a href="${whatsappUrl()}" style="color:#f9a825;font-weight:600">${BUSINESS_PHONE}</a>`
      ) +
      emailSignoff(),
  });

  const paidAmount = (payments ?? []).reduce((s, p: { amount: number }) => s + Number(p.amount), 0);

  // Generate PDF attachment
  let pdfBuffer: Buffer | undefined;
  try {
    pdfBuffer = await generateInvoicePdf(
      { ...invoice, paid_amount: paidAmount } as Record<string, unknown>,
      ps as InvoicePaymentSettings
    );
  } catch { /* attach silently fails — email still sends */ }

  const filename = `invoice-${invoice.invoice_number ?? invoice.id}.pdf`;

  try {
    await transporter.sendMail({
      from: SENDERS.payments,
      to: client.email,
      subject: `Invoice ${invoice.invoice_number} from ${SITE_NAME}`,
      html,
      attachments: pdfBuffer
        ? [{ filename, content: pdfBuffer, contentType: "application/pdf" }]
        : undefined,
    });
  } catch {
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  // Mark as sent (preserve paid/overdue status if already past draft) and log communication
  const now = new Date().toISOString();
  await supabase.from("invoices").update({ status: "sent", sent_at: now }).eq("id", id);
  await supabase.from("communications").insert({
    client_id: invoice.client_id,
    type: "email",
    subject: `Invoice ${invoice.invoice_number} sent`,
    direction: "out",
    status: "sent",
  });

  return NextResponse.json({ success: true, sent_at: now });
}
