import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { renderProposalHtml } from "@/lib/document-html/proposal";
import { renderAgreementHtml } from "@/lib/document-html/agreement";
import { renderSopHtml } from "@/lib/document-html/sop";
import type { ProposalData } from "@/components/admin/proposal-pdf";
import type { AgreementData, SopData } from "@/lib/document-types";

type Params = { params: Promise<{ id: string }> };

/** Serves the rich HTML document — the reference/skill-compliant design
 * system (see src/lib/document-html). This IS the document: view it
 * directly, or click "Download PDF" inside it (or load with ?print=1) to
 * get a true PDF via the browser's own print pipeline — same convention as
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

  let html: string;
  if (doc.type === "proposal") {
    html = renderProposalHtml(doc.data as ProposalData);
  } else if (doc.type === "agreement") {
    html = renderAgreementHtml(doc.data as AgreementData);
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
