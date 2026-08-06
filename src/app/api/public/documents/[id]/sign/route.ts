/**
 * POST /api/public/documents/[id]/sign
 *
 * The legal moment: a client signing an agreement. This is what starts a
 * project, so it is also the record that has to survive being questioned.
 *
 * What makes the signature defensible is not the image. It is the combination
 * of: the person named themselves and the entity they bind, they confirmed each
 * material term individually rather than one blanket tick, they reached the end
 * of the document before the control unlocked, and the time, address and device
 * are recorded alongside it. The image makes it feel like signing; the record
 * is what makes it evidence.
 *
 * Signing is refused on a gated document, because a client must never be able
 * to commit to terms whose pricing was withheld from them.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { sendAdminPush } from "@/lib/push";
import { transporter, SENDERS } from "@/lib/mail";
import { emailTemplate, emailParagraph, emailInfoCard, emailButton, emailDivider, emailSignoff } from "@/lib/email-templates";
import { resolveCc } from "@/lib/cc-recipients";
import { SITE_URL } from "@/lib/constants";
import { logClientAction } from "@/lib/audit";
import {
  decodeDataUrl, processDrawnSignature, processUploadedSignature,
  assertUsable, SignatureError, SIGNATURE_INPUT_METHODS,
} from "@/lib/signature-image";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const SignSchema = z.object({
  name: z.string().min(3).max(200).trim(),
  title: z.string().max(120).trim().optional().default(""),
  email: z.string().email().max(200).trim(),
  entity: z.string().min(2).max(200).trim(),
  method: z.enum(SIGNATURE_INPUT_METHODS),
  image: z.string().min(64).max(9_000_000),
  terms: z.array(z.object({
    key: z.string().min(1).max(60),
    label: z.string().min(1).max(600),
  })).min(1).max(12),
});

export async function POST(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "public");
  if (limited) return limited;

  const { id } = await params;
  if (!id || id.length < 32) return NextResponse.json({ error: "Invalid link" }, { status: 404 });

  const parsed = SignSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please complete every field, confirm each term, and add your signature." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data: doc, error } = await supabase
    .from("generated_documents")
    .select("id, type, title, reference_code, gated, accepted_at, client_id, data, clients(name, company, email)")
    .eq("id", id)
    .maybeSingle();

  if (error || !doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (doc.type !== "agreement") return NextResponse.json({ error: "Only an agreement can be signed." }, { status: 400 });
  if (doc.gated) return NextResponse.json({ error: "This agreement isn't fully available yet." }, { status: 403 });
  if (doc.accepted_at) return NextResponse.json({ ok: true, already: true, accepted_at: doc.accepted_at });

  // ── Signature image ───────────────────────────────────────────────────────
  let imagePath: string | null = null;
  try {
    const { buffer } = decodeDataUrl(parsed.data.image);
    const processed = parsed.data.method === "drawn"
      ? await processDrawnSignature(buffer)
      : await processUploadedSignature(buffer);
    assertUsable(processed);

    const path = `${doc.id}/client-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("signatures")
      .upload(path, processed.buffer, { contentType: "image/png", upsert: false });

    if (uploadError) {
      // A signature that cannot be stored must not silently become a signature
      // without an image: the client is told, and nothing is recorded.
      console.error("[sign] storage:", uploadError.message);
      return NextResponse.json(
        { error: "Your signature could not be saved. Please try again in a moment." },
        { status: 503 }
      );
    }
    imagePath = path;
  } catch (err) {
    if (err instanceof SignatureError) return NextResponse.json({ error: err.message }, { status: 422 });
    console.error("[sign] processing:", err);
    return NextResponse.json({ error: "Your signature could not be processed. Please try again." }, { status: 500 });
  }

  const signedAt = new Date().toISOString();
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;
  const termsAccepted = parsed.data.terms.map((t) => ({ ...t, at: signedAt }));

  // Evidence row first: if the summary update below fails, there is still a
  // record of the signature rather than a lost one.
  const { error: sigError } = await supabase.from("document_signatures").insert({
    document_id: doc.id,
    party: "client",
    signer_name: parsed.data.name,
    signer_title: parsed.data.title || null,
    signer_email: parsed.data.email,
    entity: parsed.data.entity,
    method: parsed.data.method,
    image_path: imagePath,
    terms_accepted: termsAccepted,
    ip,
    user_agent: userAgent,
    signed_at: signedAt,
  });

  // document_signatures needs migration 039. A signature is never refused over
  // a missing evidence table: the canonical columns below still record it.
  if (sigError && !/relation|column|schema cache|does not exist/i.test(sigError.message)) {
    console.error("[sign] signature row:", sigError.message);
  }

  const { error: updateError } = await supabase
    .from("generated_documents")
    .update({
      accepted_at: signedAt,
      accepted_terms_at: signedAt,
      accepted_by_name: parsed.data.name,
      accepted_by_email: parsed.data.email,
      accepted_by_role: parsed.data.title || null,
      accepted_ip: ip,
      accepted_user_agent: userAgent,
      status: "final",
    })
    .eq("id", id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const client = doc.clients as unknown as { name?: string; company?: string } | null;
  const clientLabel = client?.company?.trim() || client?.name || "A client";
  const who = parsed.data.title ? `${parsed.data.name} (${parsed.data.title})` : parsed.data.name;

  await supabase.from("system_alerts").insert({
    type: "agreement_signed",
    severity: "info",
    message:
      `${clientLabel} signed "${doc.title}" (${doc.reference_code}) as ${who} for ${parsed.data.entity}. ` +
      `All ${parsed.data.terms.length} terms confirmed. Ready to start the project.`,
    entity_id: doc.id,
    entity_type: "generated_document",
  });

  await sendAdminPush({
    title: "Agreement signed 🎉",
    body: `${who} at ${clientLabel} signed "${doc.title}". Ready to start the project.`,
    url: "/admin/documents",
    tag: `agreement-signed-${doc.id}`,
  });

  const signedDate = new Date(signedAt).toLocaleString("en-KE", {
    dateStyle: "full", timeStyle: "short", timeZone: "Africa/Nairobi",
  });
  const viewUrl = `${SITE_URL}/api/public/documents/${doc.id}`;
  const cc = await resolveCc({ clientId: doc.client_id, scope: "documents", to: parsed.data.email });

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
        emailParagraph(`Hi ${parsed.data.name.split(" ")[0]}, this confirms that you signed <strong>${doc.title}</strong> on behalf of ${parsed.data.entity}. Keep this email as your record.`) +
        emailInfoCard("✍️", "Signed by", `${who}, ${parsed.data.email}`) +
        emailInfoCard("🏢", "On behalf of", parsed.data.entity) +
        emailInfoCard("📅", "Signed on", signedDate) +
        (doc.reference_code ? emailInfoCard("🔖", "Reference", doc.reference_code) : "") +
        emailButton("View the signed agreement", viewUrl) +
        emailDivider() +
        emailParagraph("We will be in touch shortly to schedule the kick-off and confirm the first milestone. If anything in the agreement does not match your understanding, reply to this email straight away.") +
        emailSignoff(),
    }),
    text:
      `Hi ${parsed.data.name.split(" ")[0]},\n\n` +
      `This confirms you signed ${doc.title} on behalf of ${parsed.data.entity} on ${signedDate}.\n\n` +
      `View it here: ${viewUrl}\n\n` +
      `We will be in touch to schedule the kick-off.\n\nBest regards,\nThe Brightex Solutions Team`,
  }).catch((err) => console.error("[sign] confirmation email:", err));

  if (doc.client_id) {
    await supabase.from("communications").insert({
      client_id: doc.client_id,
      type: "email",
      subject: `Agreement signed: ${doc.title}`,
      body:
        `Signed by ${who} <${parsed.data.email}> for ${parsed.data.entity} on ${signedDate}. ` +
        `Method: ${parsed.data.method}. Terms confirmed: ${parsed.data.terms.map((t) => t.key).join(", ")}.`,
      direction: "in",
      status: "sent",
      document_id: doc.id,
    });
  }

  await logClientAction({
    actor_name: who,
    action: "signed_agreement",
    entity_type: "generated_document",
    entity_id: doc.id,
    entity_label: `${doc.title} (${doc.reference_code})`,
    notes:
      `Signed by ${who} <${parsed.data.email}> for ${parsed.data.entity}. ` +
      `Method: ${parsed.data.method}. All ${parsed.data.terms.length} terms confirmed. ` +
      `IP ${ip ?? "unknown"}.`,
  });

  return NextResponse.json({ ok: true, signed_at: signedAt });
}
