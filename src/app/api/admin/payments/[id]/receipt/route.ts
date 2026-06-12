import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;

  const { data: payment, error } = await supabase
    .from("payments")
    .select("*, invoices(id, invoice_number, total, client_id, clients(name, email))")
    .eq("id", id)
    .single();

  if (error || !payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  const invoice = payment.invoices as { id: string; invoice_number?: string | null; total?: number | null; client_id?: string | null; clients?: { name?: string | null; email?: string | null } | null } | null;
  const client = invoice?.clients as { name?: string | null; email?: string | null } | null;

  if (!client?.email) {
    return NextResponse.json({ error: "No client email on file for this payment" }, { status: 422 });
  }

  const firstName = (client.name ?? "").split(" ")[0] || "there";
  const receiptDate = payment.date
    ? new Date(payment.date).toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" })
    : new Date(payment.created_at).toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" });
  const methodLabel = (payment.method as string).replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

  const html = emailTemplate({
    title: "Payment Received",
    subtitle: invoice?.invoice_number ?? undefined,
    preheader: `Payment of KES ${Number(payment.amount).toLocaleString()} confirmed`,
    heroLabel: "Payment Confirmation",
    heroTitle: `Payment received,\n${firstName}.`,
    body:
      emailAlert(
        `We've received your payment of <strong>KES ${Number(payment.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</strong>. Thank you!`,
        "success"
      ) +
      emailInfoCard("✅", "Amount Paid", `KES ${Number(payment.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`) +
      emailInfoCard("💳", "Payment Method", methodLabel) +
      emailInfoCard("📅", "Date", receiptDate) +
      (payment.reference ? emailInfoCard("🔖", "Reference", payment.reference as string) : "") +
      (invoice?.invoice_number ? emailReferenceBox(invoice.invoice_number, "Invoice Reference") : "") +
      emailDivider() +
      emailParagraph(
        `For any queries, reply to this email or reach us on WhatsApp: <a href="${whatsappUrl()}" style="color:#f9a825;font-weight:600">${BUSINESS_PHONE}</a>`
      ) +
      emailSignoff(),
  });

  try {
    await transporter.sendMail({
      from: SENDERS.payments,
      to: client.email,
      subject: `Payment Confirmation${invoice?.invoice_number ? ` — ${invoice.invoice_number}` : ""}`,
      html,
    });
  } catch {
    return NextResponse.json({ error: "Failed to send receipt email" }, { status: 500 });
  }

  await supabase.from("payments").update({ confirmation_sent: true }).eq("id", id);

  if (invoice?.client_id) {
    await supabase.from("communications").insert({
      client_id: invoice.client_id,
      type: "email",
      subject: `Payment receipt sent — ${invoice.invoice_number ?? id}`,
      direction: "out",
      status: "sent",
    });
  }

  return NextResponse.json({ sent: true });
}
