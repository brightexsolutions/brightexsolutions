import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { renderProposalHtml } from "@/lib/document-html/proposal";
import { renderAgreementHtml } from "@/lib/document-html/agreement";
import { renderSopHtml } from "@/lib/document-html/sop";
import type { ProposalData } from "@/components/admin/proposal-pdf";
import type { AgreementData } from "@/lib/document-types";

type Params = { params: Promise<{ id: string }> };

/** Public, unauthenticated document view — the link sent to clients.
 * The document's own uuid is the access token (unguessable, same security
 * posture as this app's other bare-uuid share links). SOPs are internal and
 * deliberately excluded — never reachable through this public route. */
export async function GET(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "public");
  if (limited) return limited;

  const { id } = await params;
  if (!id || id.length < 32) return NextResponse.json({ error: "Invalid link" }, { status: 404 });

  const supabase = createAdminClient();
  const { data: doc, error } = await supabase.from("generated_documents").select("*").eq("id", id).maybeSingle();
  if (error || !doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (doc.type === "sop") return NextResponse.json({ error: "Not found" }, { status: 404 });

  let html: string;
  if (doc.type === "proposal") {
    html = renderProposalHtml(doc.data as ProposalData);
  } else if (doc.type === "agreement") {
    html = renderAgreementHtml(doc.data as AgreementData);
  } else {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
