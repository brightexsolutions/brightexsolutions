import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/constants";
import { renderProposalHtml, renderProposalTeaserHtml } from "@/lib/document-html/proposal";
import { renderAgreementHtml, renderAgreementTeaserHtml } from "@/lib/document-html/agreement";
import { renderBlockDocument, isBlockDocument, needsFigureLock, scheduleOf } from "@/lib/document-html/blocks";
import { acceptedBox, executedSignatures } from "@/lib/document-html";
import {
  proposalAcceptBox, proposalAcceptedBox, agreementSignBox, requestChangesOnlyBox,
} from "@/lib/document-html/accept";
import type { ProposalData } from "@/components/admin/proposal-pdf";
import type { AgreementData } from "@/lib/document-types";
import { resolveSignatures } from "@/lib/document-html/resolve-signatures";

// DB-backed GET handler: without this Next freezes the response at build
// time and the route serves stale data forever.
export const dynamic = "force-dynamic";


/**
 * Signature settings and rows, resolved together. Kept in one place because the
 * public link and the admin view must never disagree about what is on a
 * contract.
 */
async function signatureContext(
  supabase: ReturnType<typeof createAdminClient>,
  doc: { id: string; accepted_at: string | null; created_at: string },
  clientLabel: string
) {
  const [{ data: rows }, { data: settingsRows }] = await Promise.all([
    supabase
      .from("document_signatures")
      .select("party, signer_name, signer_title, entity, image_path, signed_at")
      .eq("document_id", doc.id),
    supabase.from("settings").select("key, value").in("key", ["signatory_name", "signatory_title", "signature_path"]),
  ]);

  const settings = Object.fromEntries(
    (settingsRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value])
  );

  return resolveSignatures({
    documentId: doc.id,
    acceptedAt: doc.accepted_at,
    rows: rows ?? [],
    settings: {
      name: settings.signatory_name || "Godwin",
      title: settings.signatory_title || "Lead at Brightex Solutions",
      hasImage: !!settings.signature_path,
    },
    clientLabel,
    createdAt: doc.created_at,
  });
}

type Params = { params: Promise<{ id: string }> };

/** Public, unauthenticated document view: the link sent to clients.
 * The document's own uuid is the access token (unguessable, same security
 * posture as this app's other bare-uuid share links). SOPs are internal and
 * deliberately excluded: never reachable through this public route. */
export async function GET(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "public");
  if (limited) return limited;

  const { id } = await params;
  if (!id || id.length < 32) return NextResponse.json({ error: "Invalid link" }, { status: 404 });

  const supabase = createAdminClient();
  const { data: doc, error } = await supabase.from("generated_documents").select("*").eq("id", id).maybeSingle();
  if (error || !doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (doc.type === "sop") return NextResponse.json({ error: "Not found" }, { status: 404 });

  const gated = !!doc.gated;

  let html: string;
  if (doc.raw_html) {
    // Verbatim, pre-authored file. Note the gate here is all or nothing: with
    // no separately authored teaser there is nothing to show but the full
    // document, so `gated` is honoured only when raw_html_gated exists.
    html = gated && doc.raw_html_gated ? doc.raw_html_gated : doc.raw_html;
  } else if (isBlockDocument(doc.data)) {
    // Block documents: one renderer for every type, gating derived per section.
    const isAgreement = doc.type === "agreement";
    const clientRow = doc.data.meta?.client ?? null;

    // Fee gating asks for money, not a call, so the gate card must say so.
    const feeGate = doc.gate_mode === "fee" && doc.unlock_fee
      ? {
          heading: "Unlock the full breakdown",
          body:
            `The detailed scope and costings are available on payment of the ` +
            `KES ${Number(doc.unlock_fee).toLocaleString("en-KE")} scoping fee. ` +
            `It is credited in full against the project if you go ahead.`,
          buttonLabel: "Talk to us about unlocking this",
          buttonHref: `${SITE_URL}/contact`,
        }
      : undefined;

    const clientLabel = clientRow?.company?.trim() || clientRow?.name || "the Client";
    const signatures = isAgreement ? await signatureContext(supabase, doc, clientLabel) : undefined;

    let trailingHtml = "";
    if (doc.accepted_at) {
      // A signed agreement renders its execution block in place, via the
      // signed_by section, so nothing is appended after it.
      trailingHtml = isAgreement
        ? ""
        : proposalAcceptedBox(doc.accepted_by_name || clientRow?.name || "the client", doc.accepted_at);
    } else if (gated) {
      // A gated proposal still needs a way to reply. Accepting is refused (a
      // client must not commit to terms whose pricing was withheld) but "the
      // timeline will not work for us" is exactly the thing worth hearing
      // before the walkthrough call, and previously there was no route for it.
      trailingHtml = isAgreement
        ? ""
        : requestChangesOnlyBox({
            documentId: doc.id,
            clientName: clientRow?.name,
            clientEmail: clientRow?.email,
          });
    } else {
      trailingHtml = isAgreement
        ? agreementSignBox({
            documentId: doc.id,
            clientName: clientRow?.name,
            clientEmail: clientRow?.email,
            entity: clientRow?.company || clientRow?.name,
            schedule: scheduleOf(doc.data),
            countersignedBy: signatures?.parties[0]
              ? { name: signatures.parties[0].name, title: signatures.parties[0].title ?? "Brightex Solutions" }
              : null,
          })
        : proposalAcceptBox({
            documentId: doc.id,
            clientName: clientRow?.name,
            clientEmail: clientRow?.email,
            schedule: scheduleOf(doc.data),
            hasRangedPricing: needsFigureLock(doc.data),
          });
    }

    html = renderBlockDocument(doc.data, {
      gated,
      gateCopy: feeGate,
      signatures,
      trailingHtml,
      // An unsigned agreement must not be downloadable: a PDF of it could
      // circulate as though it were executed.
      dlLocked: gated || (isAgreement && !doc.accepted_at),
      dlLockedReason: gated
        ? "Available after your walkthrough call"
        : "Available once the agreement is signed",
    });
  } else if (doc.type === "proposal") {
    html = gated ? renderProposalTeaserHtml(doc.data as ProposalData) : renderProposalHtml(doc.data as ProposalData);
  } else if (doc.type === "agreement") {
    html = gated
      ? renderAgreementTeaserHtml(doc.data as AgreementData)
      : renderAgreementHtml(doc.data as AgreementData, { documentId: doc.id, acceptedAt: doc.accepted_at, allowPublicAccept: true });
  } else {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Read receipts: "sent but never opened" and "read and ignored" call for
  // completely different follow-ups, so this has to actually land.
  //
  // It used to be fire-and-forget (`void` with a floating promise). That does
  // not work here: the runtime is free to tear the invocation down as soon as
  // the response is returned, so the update raced the response and lost. It was
  // never recorded once in an end-to-end run. Awaiting one indexed update by
  // primary key costs a few milliseconds and is the difference between having
  // read receipts and only appearing to.
  const { error: trackError } = await supabase
    .from("generated_documents")
    .update({
      first_viewed_at: doc.first_viewed_at ?? new Date().toISOString(),
      view_count: (doc.view_count ?? 0) + 1,
    })
    .eq("id", id);

  // Tracking must never stop a client reading their document. Columns need
  // migration 034.
  if (trackError && !/column|schema cache/i.test(trackError.message)) {
    console.error("[public-document-view] tracking:", trackError.message);
  }

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
