/**
 * Renders a code-defined SOP from the library at a stable, memorable URL:
 *   /api/admin/sops/website/view
 *
 * These are separate from generated_documents SOPs, which are one-off
 * AI-drafted procedures. The library ones are the standing procedures, so
 * their URL never changes and can be linked from anywhere in the dashboard.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { renderSopHtml } from "@/lib/document-html/sop";
import { getSop } from "@/lib/sop-library";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  // SOPs are internal. Unlike client documents they are never reachable
  // without a session.
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { key } = await params;
  const entry = getSop(key);
  if (!entry) return NextResponse.json({ error: "SOP not found" }, { status: 404 });

  return new NextResponse(renderSopHtml(entry.data), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
