/**
 * GET /api/admin/preview/block-document
 *
 * Renders a block document fixture, so a change to the shell or a builder can
 * be checked against a real, complete document rather than a contrived sample.
 *
 * Query:
 *   fixture=chanf     which fixture to render (default: chanf)
 *   gated=1           render as a client sees it when the document is gated
 *   print=1           auto-opens the print dialog, for checking the A4 output
 *
 * Admin only: fixtures hold real client copy.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { renderBlockDocument, documentTotal, needsFigureLock, fmtMoney } from "@/lib/document-html/blocks";
import { CHANF_PROPOSAL } from "@/lib/document-html/fixtures/chanf-proposal";
import type { BlockDocument } from "@/lib/document-html/blocks";

export const dynamic = "force-dynamic";

const FIXTURES: Record<string, BlockDocument> = {
  chanf: CHANF_PROPOSAL,
};

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const doc = FIXTURES[params.get("fixture") ?? "chanf"];
  if (!doc) {
    return NextResponse.json({ error: `Unknown fixture. Available: ${Object.keys(FIXTURES).join(", ")}` }, { status: 404 });
  }

  // Surfaced in a header rather than the page, so the rendered document stays
  // byte-identical to what a client would receive.
  const total = documentTotal(doc);
  const headers: Record<string, string> = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Doc-Sections": String(doc.sections.filter((s) => !s.hidden).length),
    "X-Doc-Total": total ? fmtMoney(total) : "none",
    "X-Doc-Needs-Figure-Lock": String(needsFigureLock(doc)),
  };

  const html = renderBlockDocument(doc, {
    gated: params.get("gated") === "1",
  });

  return new NextResponse(html, { status: 200, headers });
}
