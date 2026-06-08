import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const BUCKET = "finance-docs";

function allowFinance(user: { app_metadata?: Record<string, unknown> } | null | undefined): boolean {
  if (!user) return false;
  const role = user.app_metadata?.app_role as string | undefined;
  return !role || role === "finance";
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user || !allowFinance(user)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: user ? 403 : 401 });
  }

  const supabase = createAdminClient();
  const { id } = await params;

  const { data: doc } = await supabase
    .from("finance_documents")
    .select("id, storage_path")
    .eq("id", id)
    .maybeSingle();

  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  await supabase.storage.from(BUCKET).remove([doc.storage_path]);
  await supabase.from("finance_documents").delete().eq("id", id);

  return NextResponse.json({ success: true });
}
