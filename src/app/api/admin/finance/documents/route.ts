import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";
import { compressFile, mimeToExt } from "@/lib/compress";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg", "image/png", "image/webp",
];
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const BUCKET = "finance-docs";

const DOC_TYPES = ["etims_invoice", "supplier_invoice", "client_receipt", "expense_receipt", "other"] as const;
const DIRECTIONS = ["income", "expense"] as const;

function allowFinance(user: { app_metadata?: Record<string, unknown> } | null | undefined): boolean {
  if (!user) return false;
  const role = user.app_metadata?.app_role as string | undefined;
  return !role || role === "finance";
}

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user || !allowFinance(user)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: user ? 403 : 401 });
  }

  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const direction = searchParams.get("direction");
  const doc_type = searchParams.get("doc_type");

  let q = supabase
    .from("finance_documents")
    .select("*")
    .order("doc_date", { ascending: false });

  if (direction && direction !== "all") q = q.eq("direction", direction);
  if (doc_type && doc_type !== "all") q = q.eq("doc_type", doc_type);

  const { data: docs, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Generate short-lived signed URLs
  const withUrls = await Promise.all(
    (docs ?? []).map(async (doc) => {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(doc.storage_path, 3600);
      return { ...doc, url: signed?.signedUrl ?? null };
    })
  );

  return NextResponse.json({ data: withUrls });
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user || !allowFinance(user)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: user ? 403 : 401 });
  }

  const supabase = createAdminClient();

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only PDF and image files are allowed" }, { status: 422 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 15 MB)" }, { status: 422 });
  }

  const doc_type = (formData.get("doc_type") as string | null) ?? "other";
  const direction = (formData.get("direction") as string | null) ?? "expense";
  const party_name = (formData.get("party_name") as string | null)?.trim() ?? "";
  const invoice_number = (formData.get("invoice_number") as string | null)?.trim() || null;
  const amount = formData.get("amount") ? Number(formData.get("amount")) : null;
  const currency = (formData.get("currency") as string | null) ?? "KES";
  const doc_date = formData.get("doc_date") as string | null;
  const linked_income_id = (formData.get("linked_income_id") as string | null) || null;
  const linked_expense_id = (formData.get("linked_expense_id") as string | null) || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  if (!party_name) return NextResponse.json({ error: "Party name is required" }, { status: 400 });
  if (!doc_date) return NextResponse.json({ error: "Document date is required" }, { status: 400 });
  if (!DOC_TYPES.includes(doc_type as typeof DOC_TYPES[number])) {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }
  if (!DIRECTIONS.includes(direction as typeof DIRECTIONS[number])) {
    return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
  }

  const rawBytes = await file.arrayBuffer();
  const { buffer, mimeType: storedMime } = await compressFile(rawBytes, file.type, file.name);
  const ext = mimeToExt(storedMime);
  const filename = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `${direction}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: storedMime, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: doc, error: dbError } = await supabase
    .from("finance_documents")
    .insert({
      doc_type,
      direction,
      party_name,
      invoice_number,
      amount: amount && !isNaN(amount) ? amount : null,
      currency,
      doc_date,
      storage_path: storagePath,
      original_filename: file.name,
      size_bytes: buffer.byteLength,
      linked_income_id,
      linked_expense_id,
      notes,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (dbError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600);

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "uploaded_document",
    entity_type: "finance_document",
    entity_id: doc.id,
    entity_label: `${doc_type} — ${party_name}${invoice_number ? ` (${invoice_number})` : ""}`,
    notes: `Direction: ${direction}${amount ? ` · KES ${amount.toLocaleString()}` : ""}`,
  });

  return NextResponse.json({ data: { ...doc, url: signed?.signedUrl ?? null } }, { status: 201 });
}
