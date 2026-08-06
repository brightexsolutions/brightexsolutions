/**
 * POST /api/public/documents/[id]/accept-proposal
 *
 * A client accepting a proposal: the commercial decision, not the legal one.
 * Signing lives on the agreement (see ./accept/route.ts), and the two are kept
 * apart deliberately, so nobody is asked to agree to terms in the same click as
 * saying they like the plan.
 *
 * What this records is the pair of decisions only the client can make: who is
 * accepting, and which payment schedule they chose. Everything downstream (the
 * agreement's milestone table, the invoice tranches, the project's schedule)
 * derives from that one record, which is what stops the three disagreeing.
 *
 * It deliberately does NOT generate the agreement. Where the proposal quotes
 * ranges (as real phased proposals do) the final figure has to be pinned by a
 * human first: see `pending_figures` in the response.
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
import {
  isBlockDocument, needsFigureLock, documentTotal, fmtMoney, isRanged,
  scheduleOf, DEFAULT_PAYMENT_SCHEDULE,
} from "@/lib/document-html/blocks";
import { describeSchedule } from "@/lib/document-html/accept";
import { logClientAction } from "@/lib/audit";
import type { PaymentSchedule } from "@/lib/document-html/blocks";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const AcceptProposalSchema = z.object({
  name: z.string().min(3).max(200).trim(),
  role: z.string().max(120).trim().optional().default(""),
  email: z.string().email().max(200).trim(),
  notes: z.string().max(1000).trim().optional().default(""),
});

export async function POST(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "public");
  if (limited) return limited;

  const { id } = await params;
  if (!id || id.length < 32) return NextResponse.json({ error: "Invalid link" }, { status: 404 });

  const parsed = AcceptProposalSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please enter your full name and a valid email address." },
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
  if (doc.type !== "proposal") {
    return NextResponse.json({ error: "This link is not a proposal." }, { status: 400 });
  }
  // A client must never be able to accept a document whose pricing was withheld
  // from them. Same rule as agreement signing, same reason.
  if (doc.gated) {
    return NextResponse.json({ error: "This proposal isn't fully available yet. Let us walk you through it first." }, { status: 403 });
  }
  if (doc.accepted_at) {
    return NextResponse.json({ ok: true, already: true, accepted_at: doc.accepted_at });
  }

  // The payment terms are ours, stated on the proposal, not chosen at this
  // click. Where a document says nothing, the house 60/40 applies. Recording it
  // on acceptance still matters: it is what the agreement's milestone table and
  // the invoice stages are derived from.
  const blockDoc = isBlockDocument(doc.data) ? doc.data : null;
  const chosen: PaymentSchedule = blockDoc ? scheduleOf(blockDoc) : DEFAULT_PAYMENT_SCHEDULE;

  const pendingFigures = blockDoc ? needsFigureLock(blockDoc) : false;
  const total = blockDoc ? documentTotal(blockDoc) : null;

  const acceptedAt = new Date().toISOString();
  const update: Record<string, unknown> = {
    accepted_at: acceptedAt,
    accepted_by_name: parsed.data.name,
    accepted_by_email: parsed.data.email,
    accepted_by_role: parsed.data.role || null,
    accepted_notes: parsed.data.notes || null,
    accepted_ip: (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null,
    accepted_user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
    chosen_schedule: chosen,
    status: "accepted",
  };

  // Columns added in migration 038. An acceptance is the single most important
  // event in the pipeline and must never be lost to a column that has not been
  // applied yet, so fall back progressively rather than failing.
  let { error: updateError } = await supabase.from("generated_documents").update(update).eq("id", id);
  if (updateError && /column|schema cache/i.test(updateError.message)) {
    ({ error: updateError } = await supabase
      .from("generated_documents")
      .update({
        accepted_at: acceptedAt,
        accepted_by_name: parsed.data.name,
        accepted_by_email: parsed.data.email,
        status: "accepted",
      })
      .eq("id", id));
  }
  if (updateError && /column|schema cache/i.test(updateError.message)) {
    ({ error: updateError } = await supabase
      .from("generated_documents")
      .update({ accepted_at: acceptedAt, status: "accepted" })
      .eq("id", id));
  }
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const client = doc.clients as unknown as { name?: string; company?: string; email?: string } | null;
  const clientLabel = client?.company?.trim() || client?.name || "A client";
  const who = parsed.data.role ? `${parsed.data.name} (${parsed.data.role})` : parsed.data.name;

  // ── Tell Godwin, with the next action stated plainly ──────────────────────
  const nextAction = pendingFigures
    ? "Confirm the final figures, then send the agreement."
    : "Prepare and send the agreement.";

  await supabase.from("system_alerts").insert({
    type: "proposal_accepted",
    severity: "info",
    message:
      `${clientLabel} accepted "${doc.title}" (${doc.reference_code}) as ${who}. ` +
      `Payment: ${describeSchedule(chosen)}. ` +
      (total && isRanged(total) ? `Quoted range: KES ${fmtMoney(total)}. ` : "") +
      nextAction +
      (parsed.data.notes ? ` Client note: "${parsed.data.notes}"` : ""),
    entity_id: doc.id,
    entity_type: "generated_document",
  });

  await sendAdminPush({
    title: "Proposal accepted 🎉",
    body: `${who} at ${clientLabel} accepted "${doc.title}". ${nextAction}`,
    url: "/admin/documents",
    tag: `proposal-accepted-${doc.id}`,
  });

  // ── Confirm to the client ─────────────────────────────────────────────────
  const acceptedDate = new Date(acceptedAt).toLocaleString("en-KE", {
    dateStyle: "full", timeStyle: "short", timeZone: "Africa/Nairobi",
  });
  const viewUrl = `${SITE_URL}/api/public/documents/${doc.id}`;
  const cc = await resolveCc({ clientId: doc.client_id, scope: "documents", to: parsed.data.email });

  transporter.sendMail({
    from: SENDERS.info,
    to: parsed.data.email,
    cc,
    subject: `Accepted: ${doc.title}`,
    html: emailTemplate({
      title: "Proposal accepted",
      subtitle: doc.reference_code ?? undefined,
      preheader: `We have your acceptance of ${doc.title}`,
      heroLabel: "Proposal accepted",
      heroTitle: "Thank you.\nLet us get started.",
      body:
        emailParagraph(`Hello ${parsed.data.name.split(" ")[0]}, this confirms that you accepted <strong>${doc.title}</strong>. Nothing is signed yet: the agreement follows separately, and that is where anything is formally agreed.`) +
        emailInfoCard("👤", "Accepted by", who) +
        emailInfoCard("📅", "Accepted on", acceptedDate) +
        emailInfoCard("💳", "Payment schedule", describeSchedule(chosen)) +
        (doc.reference_code ? emailInfoCard("🔖", "Reference", doc.reference_code) : "") +
        emailButton("View the proposal", viewUrl) +
        emailDivider() +
        emailParagraph(
          pendingFigures
            ? "Next: we will confirm the final figure within each phase range with you, then send the agreement for signing. Once that is signed, we begin."
            : "Next: we will send the agreement for signing. Once that is signed, we begin."
        ) +
        emailSignoff(),
    }),
    text:
      `Hello ${parsed.data.name.split(" ")[0]},\n\n` +
      `This confirms you accepted ${doc.title} on ${acceptedDate}.\n` +
      `Payment schedule: ${describeSchedule(chosen)}\n` +
      `\nView it here: ${viewUrl}\n\n` +
      (pendingFigures
        ? "Next: we will confirm the final figure within each phase range with you, then send the agreement for signing.\n"
        : "Next: we will send the agreement for signing.\n") +
      `\nBest regards,\nThe Brightex Solutions Team`,
  }).catch((err) => console.error("[accept-proposal] confirmation email:", err));

  if (doc.client_id) {
    await supabase.from("communications").insert({
      client_id: doc.client_id,
      type: "email",
      subject: `Proposal accepted: ${doc.title}`,
      body:
        `Accepted by ${who} <${parsed.data.email}> on ${acceptedDate}.` +
        ` Payment: ${describeSchedule(chosen)}.` +
        (parsed.data.notes ? ` Client note: "${parsed.data.notes}"` : ""),
      direction: "in",
      status: "sent",
      document_id: doc.id,
    });
  }

  await logClientAction({
    actor_name: who,
    action: "accepted_proposal",
    entity_type: "generated_document",
    entity_id: doc.id,
    entity_label: `${doc.title} (${doc.reference_code})`,
    notes:
      `Accepted by ${who} <${parsed.data.email}> for ${clientLabel}.` +
      ` Payment: ${describeSchedule(chosen)}.` +
      (total ? ` Quoted: KES ${fmtMoney(total)}.` : "") +
      (parsed.data.notes ? ` Note: "${parsed.data.notes}"` : ""),
  });

  return NextResponse.json({ ok: true, accepted_at: acceptedAt, pending_figures: pendingFigures });
}
