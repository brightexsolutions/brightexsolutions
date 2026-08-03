import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { sendAdminPush } from "@/lib/push";
import { transporter, SENDERS } from "@/lib/mail";
import { emailTemplate, emailParagraph, emailInfoCard, emailButton, emailDivider, emailSignoff } from "@/lib/email-templates";
import { resolveCc } from "@/lib/cc-recipients";
import { SITE_URL } from "@/lib/constants";

type Params = { params: Promise<{ id: string }> };

const AcceptSchema = z.object({
  name: z.string().min(3).max(200).trim(),
  email: z.string().email().max(200).trim(),
  confirmed_read: z.literal(true),
});

/**
 * Client-facing digital signing of an agreement: the moment that marks the
 * start of a project. Only agreements (never proposals or SOPs) can be
 * signed, and only the full document, never a gated teaser, because a client
 * must not be able to sign off on terms they have not actually seen.
 *
 * The signer's name, email, confirmation and request metadata are recorded,
 * so the acceptance is an evidenced record rather than an anonymous click.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "public");
  if (limited) return limited;

  const { id } = await params;
  if (!id || id.length < 32) return NextResponse.json({ error: "Invalid link" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const parsed = AcceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please enter your full name and email, and confirm you have read the agreement." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data: doc, error } = await supabase
    .from("generated_documents")
    .select("id, type, title, reference_code, gated, accepted_at, client_id, clients(name, company, email)")
    .eq("id", id)
    .maybeSingle();

  if (error || !doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (doc.type !== "agreement") return NextResponse.json({ error: "Only agreements can be accepted" }, { status: 400 });
  if (doc.gated) return NextResponse.json({ error: "This document isn't fully available yet" }, { status: 403 });
  if (doc.accepted_at) return NextResponse.json({ ok: true, already: true, accepted_at: doc.accepted_at });

  const acceptedAt = new Date().toISOString();
  const signature = {
    accepted_at: acceptedAt,
    accepted_terms_at: acceptedAt,
    accepted_by_name: parsed.data.name,
    accepted_by_email: parsed.data.email,
    // Vercel puts the real client address in x-forwarded-for; the first entry
    // is the client, the rest are proxies.
    accepted_ip: (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null,
    accepted_user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
    status: "final",
  };

  let { error: updateError } = await supabase
    .from("generated_documents")
    .update(signature)
    .eq("id", id);

  // Signature columns need migration 034. Never lose the acceptance itself
  // over missing evidence columns: fall back to recording the timestamp.
  if (updateError && /column|schema cache/i.test(updateError.message)) {
    ({ error: updateError } = await supabase
      .from("generated_documents")
      .update({ accepted_at: acceptedAt, status: "final" })
      .eq("id", id));
  }

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const client = doc.clients as unknown as { name?: string; company?: string; email?: string } | null;
  const clientLabel = client?.company?.trim() || client?.name || "A client";

  await supabase.from("system_alerts").insert({
    type: "agreement_accepted",
    severity: "info",
    message: `${clientLabel} signed "${doc.title}" (${doc.reference_code}) as ${parsed.data.name}: ready to start the project.`,
    entity_id: doc.id,
    entity_type: "generated_document",
  });

  await sendAdminPush({
    title: "Agreement signed 🎉",
    body: `${parsed.data.name} at ${clientLabel} just signed "${doc.title}".`,
    url: "/admin/documents",
    tag: `agreement-accepted-${doc.id}`,
  });

  // Countersigned copy back to the signer, so both sides hold the same record
  // of what was agreed and when.
  const viewUrl = `${SITE_URL}/api/public/documents/${doc.id}`;
  const signedDate = new Date(acceptedAt).toLocaleString("en-KE", {
    dateStyle: "full", timeStyle: "short", timeZone: "Africa/Nairobi",
  });

  const cc = await resolveCc({
    clientId: doc.client_id,
    scope: "documents",
    to: parsed.data.email,
  });

  transporter.sendMail({
    from: SENDERS.info,
    to: parsed.data.email,
    cc,
    subject: `Signed: ${doc.title}`,
    html: emailTemplate({
      title: "Agreement signed",
      subtitle: doc.reference_code ?? undefined,
      preheader: `Your signed copy of ${doc.title}`,
      heroLabel: "Agreement signed",
      heroTitle: "That's official.\nThank you.",
      body:
        emailParagraph(`Hi ${parsed.data.name.split(" ")[0]}, this confirms that you signed <strong>${doc.title}</strong>. Keep this email as your record.`) +
        emailInfoCard("✍️", "Signed by", `${parsed.data.name} (${parsed.data.email})`) +
        emailInfoCard("📅", "Signed on", signedDate) +
        (doc.reference_code ? emailInfoCard("🔖", "Reference", doc.reference_code) : "") +
        emailButton("View the signed agreement", viewUrl) +
        emailDivider() +
        emailParagraph("We will be in touch shortly to schedule the kick-off and confirm the first milestone. If anything in the agreement does not match your understanding, reply to this email straight away.") +
        emailSignoff(),
    }),
    text: `Hi ${parsed.data.name.split(" ")[0]},\n\nThis confirms you signed ${doc.title} on ${signedDate}.\n\nView it here: ${viewUrl}\n\nWe will be in touch to schedule the kick-off.\n\nBest regards,\nThe Brightex Solutions Team`,
  }).catch((err) => console.error("[document-accept] confirmation email:", err));

  if (doc.client_id) {
    await supabase.from("communications").insert({
      client_id: doc.client_id,
      type: "email",
      subject: `Agreement signed: ${doc.title}`,
      body: `Signed by ${parsed.data.name} <${parsed.data.email}> on ${signedDate}.`,
      direction: "in",
      status: "sent",
      document_id: doc.id,
    });
  }

  return NextResponse.json({ ok: true, accepted_at: acceptedAt });
}
