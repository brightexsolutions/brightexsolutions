import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { transporter } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";
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

const PaymentSchema = z.object({
  invoice_id: z.string().uuid().optional(),
  amount: z.number().min(0),
  method: z.enum(["mpesa", "bank", "paypal", "cash"]),
  reference: z.string().max(200).trim().optional(),
  date: z.string().date().optional(),
  notes: z.string().max(1000).trim().optional(),
  send_receipt: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data, error } = await supabase
    .from("payments")
    .select("*, invoices(id, invoice_number, total, client_id, clients(name, email))")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const result = PaymentSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  const { send_receipt, ...paymentData } = result.data;
  let receiptSent = false;

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({ ...paymentData, confirmation_sent: false })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Check if invoice is fully paid and update status; also fetch client for receipt + income record
  if (paymentData.invoice_id) {
    const { data: invoice } = await supabase
      .from("invoices")
      .select("total, client_id, invoice_number, clients(name, email), payments(amount)")
      .eq("id", paymentData.invoice_id)
      .single();

    if (invoice) {
      const totalPaid = (invoice.payments as Array<{ amount: number }>)
        .reduce((sum, p) => sum + Number(p.amount), 0) + Number(paymentData.amount);

      if (totalPaid >= Number(invoice.total)) {
        await supabase.from("invoices").update({ status: "paid" }).eq("id", paymentData.invoice_id);
      }

      // Auto-create income record so Finance module stays in sync
      await supabase.from("income_records").insert({
        source: "invoice_payment",
        description: `Payment for invoice ${invoice.invoice_number ?? paymentData.invoice_id}`,
        client_id: invoice.client_id ?? null,
        payment_id: payment.id,
        amount: paymentData.amount,
        currency: "KES",
        date: paymentData.date ?? new Date().toISOString().split("T")[0],
        category: "service_revenue",
        tax_applicable: true,
        added_by: user.id,
      });

      // Log payment to communications regardless of whether a receipt email was sent
      if (invoice.client_id) {
        await supabase.from("communications").insert({
          client_id: invoice.client_id,
          type: "email",
          subject: `Payment recorded — ${invoice.invoice_number} · KES ${Number(paymentData.amount).toLocaleString()} via ${paymentData.method}`,
          direction: "in",
          status: "received",
        });
      }
    }

    // Send receipt if requested
    if (send_receipt) {
      const { data: fullInvoice } = await supabase
        .from("invoices")
        .select("invoice_number, total, client_id, clients(name, email)")
        .eq("id", paymentData.invoice_id)
        .single();

      const client = fullInvoice?.clients as { name: string; email: string } | undefined;
      if (client?.email) {
        const receiptDate = paymentData.date
          ? new Date(paymentData.date).toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" })
          : new Date().toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" });
        const html = emailTemplate({
          title: "Payment Received",
          subtitle: fullInvoice?.invoice_number ?? undefined,
          preheader: `Payment of KES ${Number(paymentData.amount).toLocaleString()} confirmed`,
          body:
            emailParagraph(`Dear <strong>${client.name}</strong>,`) +
            emailAlert(
              `Payment of <strong>KES ${Number(paymentData.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</strong> received — thank you!`,
              "success"
            ) +
            emailInfoTable(
              emailRow("Invoice", fullInvoice?.invoice_number ?? "—") +
              emailRow("Amount Paid", `KES ${Number(paymentData.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`) +
              emailRow("Method", paymentData.method.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())) +
              (paymentData.reference ? emailRow("Reference", paymentData.reference) : "") +
              emailRow("Date", receiptDate)
            ) +
            emailDivider() +
            emailParagraph(
              `For any queries, reply to this email or reach us on WhatsApp: <a href="${whatsappUrl()}" style="color:#f9a825;font-weight:600">${BUSINESS_PHONE}</a>`
            ) +
            emailSignoff(),
        });

        await transporter.sendMail({
          "from": `${SITE_NAME} <${process.env.SMTP_USER}>`,
          to: client.email,
          subject: `Payment Confirmation — ${fullInvoice?.invoice_number}`,
          html,
        }).then(() => {
          receiptSent = true;
        }).catch(() => {});
      }
    }
  }

  if (receiptSent) {
    await supabase.from("payments").update({ confirmation_sent: true }).eq("id", payment.id);

    // Log to communications
    const { data: linkedInvoice } = await supabase
      .from("invoices")
      .select("client_id, invoice_number")
      .eq("id", paymentData.invoice_id!)
      .maybeSingle();
    if (linkedInvoice?.client_id) {
      await supabase.from("communications").insert({
        client_id: linkedInvoice.client_id,
        type: "email",
        subject: `Payment receipt sent — ${linkedInvoice.invoice_number}`,
        direction: "out",
        status: "sent",
      });
    }
  }

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "paid",
    entity_type: "payment",
    entity_id: payment.id,
    entity_label: paymentData.invoice_id
      ? `KES ${Number(paymentData.amount).toLocaleString()} via ${paymentData.method}`
      : `KES ${Number(paymentData.amount).toLocaleString()} via ${paymentData.method}`,
    notes: [
      paymentData.reference ? `Ref: ${paymentData.reference}` : null,
      receiptSent ? "Receipt emailed" : null,
    ].filter(Boolean).join(" · ") || undefined,
  });

  return NextResponse.json({
    data: {
      ...payment,
      confirmation_sent: receiptSent || payment.confirmation_sent,
    },
  }, { status: 201 });
}
