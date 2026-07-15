import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { renderSopHtml } from "@/lib/document-html/sop";
import { DEFAULT_SOP_DATA } from "@/lib/brightex-sop";

/** The always-referenceable default Brightex SOP — rendered live from code
 * (src/lib/brightex-sop.ts), not stored in generated_documents, so it can
 * never be deleted, edited into drift, or go missing. This is the canonical
 * internal procedure; anything generated ad hoc in Documents is a variant
 * of this, not a replacement for it. */
export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const html = renderSopHtml(DEFAULT_SOP_DATA);

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
