/**
 * POST /api/admin/documents/upload
 *
 * Registers a proposal or agreement that was finished locally (an HTML file
 * produced from the Brightex proposal house style, or exported from wherever
 * it was written) as a first-class document.
 *
 * AI generation fits the standard engagement shape. Plenty of engagements are
 * not standard: unusually large, bespoke structure, or a relationship that
 * warrants a hand-crafted document. Those should not be forced through a
 * generator that flattens them, so an uploaded document gets the same
 * treatment as a generated one: a reference code, a public link, gating,
 * digital signing and the same audit trail.
 *
 * Uploads are stored as raw_html and served verbatim (see migration 030), so
 * the document the client sees is exactly the file that was authored.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

const MAX_HTML_BYTES = 2 * 1024 * 1024;

const UploadSchema = z.object({
  type: z.enum(["proposal", "agreement"]),
  title: z.string().min(1).max(200).trim(),
  clientId: z.string().uuid().optional(),
  saleId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  /** The authored document, as a complete HTML file. */
  html: z.string().min(50),
  /** Optional pre-built teaser served when the public link is gated. */
  gatedHtml: z.string().optional(),
  gated: z.boolean().optional().default(false),
  originalFilename: z.string().max(255).trim().optional(),
  /** Headline value, recorded for pipeline reporting only. */
  totalValue: z.number().min(0).optional(),
});

/**
 * An uploaded file is authored by us, not user-submitted content, but it is
 * served on a public link, so scripts that could exfiltrate the page or
 * redirect the client are stripped regardless of origin.
 */
function stripActiveContent(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

function refPrefix(type: string): string {
  return type === "proposal" ? "PROP" : "AGR";
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const result = UploadSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });
  }

  const data = result.data;

  if (Buffer.byteLength(data.html, "utf8") > MAX_HTML_BYTES) {
    return NextResponse.json(
      { error: "That file is too large. Keep the document under 2MB, and reference images by URL rather than embedding them." },
      { status: 413 }
    );
  }

  const supabase = createAdminClient();

  // Sequential reference code, matching generated documents so the two are
  // indistinguishable to a client.
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("generated_documents")
    .select("id", { count: "exact", head: true })
    .eq("type", data.type);
  const referenceCode = `${refPrefix(data.type)}-${year}-${String((count ?? 0) + 1).padStart(3, "0")}`;

  const row: Record<string, unknown> = {
    type: data.type,
    client_id: data.clientId ?? null,
    sale_id: data.saleId ?? null,
    project_id: data.projectId ?? null,
    title: data.title,
    reference_code: referenceCode,
    // `data` is required by the schema and is what the generic renderers read.
    // An uploaded document renders from raw_html instead, so this holds only
    // what the admin list needs to display it.
    data: {
      uploaded: true,
      title: data.title,
      total_fees: data.totalValue ?? 0,
      created_at: new Date().toISOString(),
    },
    raw_html: stripActiveContent(data.html),
    raw_html_gated: data.gatedHtml ? stripActiveContent(data.gatedHtml) : null,
    gated: data.gated,
    status: "draft",
    source: "upload",
    original_filename: data.originalFilename ?? null,
    created_by: user.id,
  };

  let { data: created, error } = await supabase
    .from("generated_documents")
    .insert(row)
    .select()
    .single();

  // original_filename needs migration 034. Never lose the upload over one
  // metadata column.
  if (error && /column|schema cache/i.test(error.message)) {
    delete row.original_filename;
    ({ data: created, error } = await supabase
      .from("generated_documents")
      .insert(row)
      .select()
      .single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "created",
    entity_type: "generated_document",
    entity_id: created.id,
    entity_label: `${data.title} (${referenceCode})`,
    notes: `Uploaded ${data.type}${data.originalFilename ? ` from ${data.originalFilename}` : ""}`,
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
