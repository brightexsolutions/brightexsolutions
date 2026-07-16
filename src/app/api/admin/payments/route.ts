import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { transporter } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";
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
import { SENDERS } from "@/lib/mail";

const PaymentSchema = z.object({
  invoice_id: z.string().uuid().optional(),
  amount: z.number().min(0),
  method: z.enum(["mpesa", "bank", "paypal", "cash"]),
  reference: z.string().max(200).trim().optional(),
  date: z.string().date().optional(),
  notes: z.string().max(1000).trim().optional(),
  send_receipt: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data, error } = await supabase
    .from("payments")
    .select("*, invoices(id, invoice_number, total, client_id, project_id, clients(name, email))")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach the proposal/agreement tied to each payment's invoice — same
  // client, preferring one tied to the invoice's project — so a payment can
  // surface ("View" / "Resend") the document that led to it.
  const clientIds = [...new Set(
    (data ?? []).map((p) => (p.invoices as { client_id?: string } | null)?.client_id).filter(Boolean)
  )];
  let docsByClient: Record<string, Array<Record<string, unknown>>> = {};
  if (clientIds.length > 0) {
    const { data: docs } = await supabase
      .from("generated_documents")
      .select("id, type, title, reference_code, status, gated, accepted_at, created_at, project_id, client_id")
      .in("client_id", clientIds as string[])
      .in("type", ["proposal", "agreement"])
      .order("accepted_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    docsByClient = (docs ?? []).reduce<Record<string, Array<Record<string, unknown>>>>((acc, d) => {
      const key = d.client_id as string;
      (acc[key] ??= []).push(d);
      return acc;
    }, {});
  }

  const enriched = (data ?? []).map((p) => {
    const inv = p.invoices as { client_id?: string; project_id?: string } | null;
    if (!inv) return p;
    const candidates = docsByClient[inv.client_id as string] ?? [];
    const generated_documents = [...candidates]
      .sort((a, b) => {
        const aProj = inv.project_id && a.project_id === inv.project_id ? 1 : 0;
        const bProj = inv.project_id && b.project_id === inv.project_id ? 1 : 0;
        return bProj - aProj;
      })
      .slice(0, 3);
    return { ...p, invoices: { ...inv, generated_documents } };
  });

  return NextResponse.json({ data: enriched });
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
    .select("*, invoices(id, invoice_number, total, client_id, clients(name, email))")
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
      // The new payment is already in the DB at this point — sum without double-counting
      const totalPaid = (invoice.payments as Array<{ amount: number }>)
        .reduce((sum, p) => sum + Number(p.amount), 0);

      if (totalPaid >= Number(invoice.total)) {
        await supabase.from("invoices").update({ status: "paid" }).eq("id", paymentData.invoice_id);
      } else if (totalPaid > 0) {
        // Partial payment — mark as 'partial' so the balance is clearly visible
        const { data: currentInvoice } = await supabase
          .from("invoices").select("status").eq("id", paymentData.invoice_id!).single();
        if (currentInvoice?.status === "draft" || currentInvoice?.status === "sent") {
          await supabase.from("invoices").update({ status: "partial" }).eq("id", paymentData.invoice_id);
        }
      }

      // Auto-create income record so Finance module stays in sync
      // Note: income_records has no added_by column — omit it
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
        const firstName = client.name.split(" ")[0];
        const receiptDate = paymentData.date
          ? new Date(paymentData.date).toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" })
          : new Date().toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" });
        const methodLabel = paymentData.method.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const html = emailTemplate({
          title: "Payment Received",
          subtitle: fullInvoice?.invoice_number ?? undefined,
          preheader: `Payment of KES ${Number(paymentData.amount).toLocaleString()} confirmed`,
          heroLabel: "Payment Confirmation",
          heroTitle: `Payment received,\n${firstName}.`,
          body:
            emailAlert(
              `We've received your payment of <strong>KES ${Number(paymentData.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</strong>. Thank you!`,
              "success"
            ) +
            emailInfoCard("✅", "Amount Paid", `KES ${Number(paymentData.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`) +
            emailInfoCard("💳", "Payment Method", methodLabel) +
            emailInfoCard("📅", "Date", receiptDate) +
            (paymentData.reference ? emailInfoCard("🔖", "Reference", paymentData.reference) : "") +
            emailReferenceBox(fullInvoice?.invoice_number ?? "—", "Invoice Reference") +
            emailDivider() +
            emailParagraph(
              `For any queries, reply to this email or reach us on WhatsApp: <a href="${whatsappUrl()}" style="color:#f9a825;font-weight:600">${BUSINESS_PHONE}</a>`
            ) +
            emailSignoff(),
        });

        await transporter.sendMail({
          from: SENDERS.payments,
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
    await supabase.from("payments").update({ confirmation_sent: true, confirmation_sent_at: new Date().toISOString() }).eq("id", payment.id);

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

  const sentAt = receiptSent ? new Date().toISOString() : (payment.confirmation_sent_at ?? null);
  return NextResponse.json({
    data: {
      ...payment,
      confirmation_sent: receiptSent || payment.confirmation_sent,
      confirmation_sent_at: sentAt,
    },
  }, { status: 201 });
}
