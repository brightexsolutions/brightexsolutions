import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { compressFile, mimeToExt } from "@/lib/compress";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg", "image/png", "image/webp",
];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB raw — images will be much smaller after compression
const BUCKET = "project-docs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;

  const { data: docs, error } = await supabase
    .from("project_documents")
    .select("*")
    .eq("project_id", id)
    .order("uploaded_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withUrls = (docs ?? []).map((doc) => ({
    ...doc,
    url: `/api/admin/documents/proxy?bucket=${BUCKET}&path=${encodeURIComponent(doc.storage_path)}`,
  }));

  return NextResponse.json({ data: withUrls });
}

export async function POST(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id: projectId } = await params;

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const file = formData.get("file") as File | null;
  const label = (formData.get("name") as string | null)?.trim() || file?.name || "document";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "File type not allowed" }, { status: 422 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 422 });

  const rawBytes = await file.arrayBuffer();

  // Compress images before storage; PDFs/docs pass through unchanged
  const { buffer, mimeType: storedMime, originalBytes, compressedBytes } = await compressFile(
    rawBytes,
    file.type,
    file.name,
  );

  const ext = mimeToExt(storedMime);
  const filename = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `${projectId}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: storedMime, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const savedBytes = compressedBytes;
  const { data: doc, error: dbError } = await supabase
    .from("project_documents")
    .insert({ project_id: projectId, name: label, storage_path: storagePath, size_bytes: savedBytes })
    .select()
    .single();

  if (dbError) {
    // Roll back the storage upload if DB insert fails
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      ...doc,
      url: `/api/admin/documents/proxy?bucket=${BUCKET}&path=${encodeURIComponent(storagePath)}`,
    },
    compression: { original_bytes: originalBytes, stored_bytes: savedBytes },
  }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id: projectId } = await params;
  const { doc_id } = await request.json().catch(() => ({}));
  if (!doc_id) return NextResponse.json({ error: "doc_id required" }, { status: 400 });

  const { data: doc } = await supabase
    .from("project_documents")
    .select("storage_path, project_id")
    .eq("id", doc_id)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  await supabase.storage.from(BUCKET).remove([doc.storage_path]);
  await supabase.from("project_documents").delete().eq("id", doc_id);

  return NextResponse.json({ success: true });
}
