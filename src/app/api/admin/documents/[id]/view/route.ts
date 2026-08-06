import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { renderProposalHtml } from "@/lib/document-html/proposal";
import { renderAgreementHtml } from "@/lib/document-html/agreement";
import { renderSopHtml } from "@/lib/document-html/sop";
import { renderBlockDocument, isBlockDocument } from "@/lib/document-html/blocks";
import { acceptedBox, executedSignatures } from "@/lib/document-html";
import type { ProposalData } from "@/components/admin/proposal-pdf";
import type { AgreementData, SopData } from "@/lib/document-types";
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

/** Serves the rich HTML document: the reference/skill-compliant design
 * system (see src/lib/document-html). This IS the document: view it
 * directly, or click "Download PDF" inside it (or load with ?print=1) to
 * get a true PDF via the browser's own print pipeline: same convention as
 * projects/magic-movers/proposal/brightex_magic-movers_proposal_2026-07.html. */
export async function GET(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();
  const { data: doc, error } = await supabase.from("generated_documents").select("*").eq("id", id).maybeSingle();
  if (error || !doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  // Bespoke, already-authored documents (e.g. a real client proposal that
  // exists as its own HTML file) are served verbatim: the generic *Data
  // shapes below can't represent custom structure without flattening it.
  // Godwin (admin view) always sees the untouched full version regardless
  // of the public `gated` toggle.
  let html: string;
  if (doc.raw_html) {
    html = doc.raw_html;
  } else if (isBlockDocument(doc.data)) {
    // Never gated, and no acceptance control: this is Godwin's own view of the
    // document, so it shows the real content and nothing a client would click.
    // Use ?preview=client to see the gated teaser exactly as a client would.
    const asClient = request.nextUrl.searchParams.get("preview") === "client";
    let trailing = "";
    if (doc.accepted_at) {
      const { data: sigs } = await supabase
        .from("document_signatures")
        .select("party, signer_name, signer_title, entity, image_path, method, terms_accepted, ip, signed_at")
        .eq("document_id", doc.id);
      const ordered = ["brightex", "client"]
        .map((p) => (sigs ?? []).find((s) => s.party === p))
        .filter(Boolean) as NonNullable<typeof sigs>;

      if (doc.type === "agreement" && ordered.length > 0) {
        const clientSig = ordered.find((s) => s.party === "client");
        trailing = executedSignatures(
          ordered.map((s) => ({
            role: s.party === "brightex" ? "For Brightex Solutions" : "For the Client",
            name: s.signer_name,
            title: s.signer_title,
            entity: s.party === "client" ? s.entity : null,
            imageUrl: s.image_path ? `/api/public/documents/${doc.id}/signature/${s.party}` : null,
            signedAt: s.signed_at,
          })),
          {
            ip: clientSig?.ip,
            method: clientSig?.method,
            termsCount: Array.isArray(clientSig?.terms_accepted) ? clientSig.terms_accepted.length : 0,
          }
        );
      } else {
        trailing = acceptedBox(doc.accepted_by_name || doc.data.meta?.client?.name || "the client", doc.accepted_at);
      }
    }

    html = renderBlockDocument(doc.data, {
      gated: asClient && !!doc.gated,
      trailingHtml: trailing,
    });
  } else if (doc.type === "proposal") {
    html = renderProposalHtml(doc.data as ProposalData);
  } else if (doc.type === "agreement") {
    html = renderAgreementHtml(doc.data as AgreementData, {
      documentId: doc.id,
      acceptedAt: doc.accepted_at,
      internal: true,
    });
  } else if (doc.type === "sop") {
    html = renderSopHtml(doc.data as SopData);
  } else {
    return NextResponse.json({ error: "Unknown document type" }, { status: 500 });
  }

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
