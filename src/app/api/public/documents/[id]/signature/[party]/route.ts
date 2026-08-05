/**
 * GET /api/public/documents/[id]/signature/[party]
 *
 * Serves a signature image for a signed document.
 *
 * Signatures live in a private storage bucket and are never publicly listable.
 * They are reachable only through this route, and only for the exact document
 * they belong to: the document's own unguessable uuid is the access token, the
 * same posture as the document link itself. Someone who can see the signed
 * agreement can see the signatures on it, which is the correct boundary, and
 * nobody else can enumerate them.
 *
 * Only served once the document is signed. Before that there is nothing to
 * show, and a signature retrievable from an unsigned agreement would be a
 * signature that could be lifted and reused.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; party: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "public");
  if (limited) return limited;

  const { id, party } = await params;
  if (!id || id.length < 32) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (party !== "client" && party !== "brightex" && party !== "witness") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = createAdminClient();

  const { data: doc } = await supabase
    .from("generated_documents")
    .select("id, type, accepted_at")
    .eq("id", id)
    .maybeSingle();

  if (!doc || doc.type === "sop" || !doc.accepted_at) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: sig } = await supabase
    .from("document_signatures")
    .select("image_path")
    .eq("document_id", id)
    .eq("party", party)
    .maybeSingle();

  if (!sig?.image_path) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: file, error } = await supabase.storage.from("signatures").download(sig.image_path);
  if (error || !file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(await file.arrayBuffer(), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      // Immutable: a signature never changes once made, and a signed document
      // is frequently reopened and printed.
      "Cache-Control": "private, max-age=86400, immutable",
      "Content-Disposition": "inline",
    },
  });
}
