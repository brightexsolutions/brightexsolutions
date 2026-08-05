/**
 * POST /api/public/documents/[id]/request-changes
 *
 * The third answer to a proposal, alongside accepting and going quiet.
 *
 * Notification only, deliberately. It records what the client wants changed and
 * tells Godwin, who then schedules a call. It does not open a thread, does not
 * put the document into a negotiation state, and does not let the client edit
 * anything. A proposal is not renegotiated in a form: it is renegotiated on a
 * call where there is room to adjust or to hold a position, and the system's
 * only job is to make sure that call happens with the ask already in hand.
 *
 * The request is recorded ON the document, so what is being discussed and the
 * discussion about it live in the same place instead of the ask being buried in
 * a reply nobody links back.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { sendAdminPush } from "@/lib/push";
import { transporter, SENDERS } from "@/lib/mail";
import { emailTemplate, emailParagraph, emailInfoCard, emailDivider, emailSignoff } from "@/lib/email-templates";
import { resolveCc } from "@/lib/cc-recipients";
import { BUSINESS_EMAIL } from "@/lib/constants";
import { logClientAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const RequestChangesSchema = z.object({
  name: z.string().min(3).max(200).trim(),
  email: z.string().email().max(200).trim(),
  message: z.string().min(10).max(4000).trim(),
});

export async function POST(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "public");
  if (limited) return limited;

  const { id } = await params;
  if (!id || id.length < 32) return NextResponse.json({ error: "Invalid link" }, { status: 404 });

  const parsed = RequestChangesSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please add your name, email, and a little detail on what you would like changed." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data: doc, error } = await supabase
    .from("generated_documents")
    .select("id, type, title, reference_code, accepted_at, client_id, clients(name, company, email)")
    .eq("id", id)
    .maybeSingle();

  if (error || !doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (doc.accepted_at) {
    return NextResponse.json(
      { error: "This document has already been accepted. Reply to our email and we will pick it up from there." },
      { status: 409 }
    );
  }

  const requestedAt = new Date().toISOString();

  // Recording the request must not fail over a missing column (migration 039):
  // the request itself is the valuable part and the notification below carries
  // the full text regardless.
  const { error: updateError } = await supabase
    .from("generated_documents")
    .update({
      changes_requested_at: requestedAt,
      changes_requested_by: `${parsed.data.name} <${parsed.data.email}>`,
      changes_requested_note: parsed.data.message,
    })
    .eq("id", id);

  if (updateError && !/column|schema cache/i.test(updateError.message)) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const client = doc.clients as unknown as { name?: string; company?: string } | null;
  const clientLabel = client?.company?.trim() || client?.name || "A client";
  const firstName = parsed.data.name.split(" ")[0];

  await supabase.from("system_alerts").insert({
    type: "proposal_changes_requested",
    severity: "warning",
    message:
      `${clientLabel} wants changes to "${doc.title}" (${doc.reference_code}) before accepting. ` +
      `${parsed.data.name} wrote: "${parsed.data.message.slice(0, 400)}${parsed.data.message.length > 400 ? "..." : ""}" ` +
      `Schedule a call.`,
    entity_id: doc.id,
    entity_type: "generated_document",
  });

  await sendAdminPush({
    title: "Changes requested on a proposal",
    body: `${parsed.data.name} at ${clientLabel} wants changes to "${doc.title}". Schedule a call.`,
    url: "/admin/documents",
    tag: `changes-requested-${doc.id}`,
  });

  // Full text to Godwin: the push and the alert are both truncated, and the
  // detail is the part that decides whether there is room to move.
  transporter.sendMail({
    from: SENDERS.info,
    to: BUSINESS_EMAIL,
    subject: `Changes requested: ${doc.title} (${clientLabel})`,
    html: emailTemplate({
      title: "Changes requested",
      subtitle: doc.reference_code ?? undefined,
      preheader: `${parsed.data.name} wants changes before accepting`,
      heroLabel: "Action needed",
      heroTitle: "A client wants\nchanges first.",
      body:
        emailParagraph(`<strong>${clientLabel}</strong> has read <strong>${doc.title}</strong> and wants changes before accepting.`) +
        emailInfoCard("👤", "From", `${parsed.data.name} (${parsed.data.email})`) +
        emailInfoCard("🔖", "Document", `${doc.title}${doc.reference_code ? ` (${doc.reference_code})` : ""}`) +
        emailDivider() +
        emailParagraph(`<strong>What they said</strong><br/>${parsed.data.message.replace(/\n/g, "<br/>")}`) +
        emailDivider() +
        emailParagraph(`Next step is a call. Nothing has been changed on the proposal and the client has not accepted it.`) +
        emailSignoff(),
    }),
    text:
      `${clientLabel} wants changes to ${doc.title} (${doc.reference_code}) before accepting.\n\n` +
      `From: ${parsed.data.name} <${parsed.data.email}>\n\n` +
      `What they said:\n${parsed.data.message}\n\n` +
      `Next step is a call. Nothing on the proposal has changed.`,
  }).catch((err) => console.error("[request-changes] admin email:", err));

  // Acknowledge to the client, so sending it does not feel like shouting into a
  // void while they wait for a call.
  const cc = await resolveCc({ clientId: doc.client_id, scope: "documents", to: parsed.data.email });
  transporter.sendMail({
    from: SENDERS.info,
    to: parsed.data.email,
    cc,
    subject: `We have your notes on ${doc.title}`,
    html: emailTemplate({
      title: "Your notes are with us",
      subtitle: doc.reference_code ?? undefined,
      preheader: `We will be in touch to talk through your notes on ${doc.title}`,
      heroLabel: "Received",
      heroTitle: "Thank you.\nWe have your notes.",
      body:
        emailParagraph(`Hi ${firstName}, thank you for taking the time to go through <strong>${doc.title}</strong> properly and telling us what needs to change.`) +
        emailParagraph(`<strong>What you sent us</strong><br/>${parsed.data.message.replace(/\n/g, "<br/>")}`) +
        emailDivider() +
        emailParagraph("We will read it and come back to you shortly to arrange a call so we can talk it through together. Nothing is committed, and the proposal is unchanged until we have agreed what it should say.") +
        emailSignoff(),
    }),
    text:
      `Hi ${firstName},\n\nThank you for going through ${doc.title} and telling us what needs to change.\n\n` +
      `What you sent us:\n${parsed.data.message}\n\n` +
      `We will come back to you shortly to arrange a call. Nothing is committed, and the proposal is unchanged until we have agreed what it should say.\n\n` +
      `Best regards,\nThe Brightex Solutions Team`,
  }).catch((err) => console.error("[request-changes] client email:", err));

  if (doc.client_id) {
    await supabase.from("communications").insert({
      client_id: doc.client_id,
      type: "email",
      subject: `Changes requested: ${doc.title}`,
      body: `${parsed.data.name} <${parsed.data.email}> requested changes before accepting:\n\n${parsed.data.message}`,
      direction: "in",
      status: "sent",
      document_id: doc.id,
    });
  }

  await logClientAction({
    actor_name: parsed.data.name,
    action: "requested_changes",
    entity_type: "generated_document",
    entity_id: doc.id,
    entity_label: `${doc.title} (${doc.reference_code})`,
    notes: `${parsed.data.name} <${parsed.data.email}> at ${clientLabel}: "${parsed.data.message.slice(0, 500)}"`,
  });

  return NextResponse.json({ ok: true, requested_at: requestedAt });
}
