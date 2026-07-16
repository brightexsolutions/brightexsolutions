import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { sendAdminPush } from "@/lib/push";

type Params = { params: Promise<{ id: string }> };

/** Client-facing digital acceptance of an agreement — the moment that marks
 * the start of a project. Only agreements (not proposals/SOPs) can be
 * accepted, and only the full document, never a gated teaser — a client
 * shouldn't be able to sign off on terms they haven't actually seen. */
export async function POST(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "public");
  if (limited) return limited;

  const { id } = await params;
  if (!id || id.length < 32) return NextResponse.json({ error: "Invalid link" }, { status: 404 });

  const supabase = createAdminClient();
  const { data: doc, error } = await supabase
    .from("generated_documents")
    .select("id, type, title, reference_code, gated, accepted_at, client_id, clients(name, company)")
    .eq("id", id)
    .maybeSingle();

  if (error || !doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (doc.type !== "agreement") return NextResponse.json({ error: "Only agreements can be accepted" }, { status: 400 });
  if (doc.gated) return NextResponse.json({ error: "This document isn't fully available yet" }, { status: 403 });
  if (doc.accepted_at) return NextResponse.json({ ok: true, already: true, accepted_at: doc.accepted_at });

  const acceptedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("generated_documents")
    .update({ accepted_at: acceptedAt, status: "final" })
    .eq("id", id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const client = doc.clients as unknown as { name?: string; company?: string } | null;
  const clientLabel = client?.company?.trim() || client?.name || "A client";

  await supabase.from("system_alerts").insert({
    type: "agreement_accepted",
    severity: "info",
    message: `${clientLabel} accepted "${doc.title}" (${doc.reference_code}) — ready to start the project.`,
    entity_id: doc.id,
    entity_type: "generated_document",
  });

  await sendAdminPush({
    title: "Agreement accepted 🎉",
    body: `${clientLabel} just accepted "${doc.title}".`,
    url: "/admin/documents",
    tag: `agreement-accepted-${doc.id}`,
  });

  return NextResponse.json({ ok: true, accepted_at: acceptedAt });
}
