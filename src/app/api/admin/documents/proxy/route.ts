import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const ALLOWED_BUCKETS = ["project-docs", "finance-docs"];

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const bucket = searchParams.get("bucket");
  const path = searchParams.get("path");

  if (!bucket || !path) {
    return NextResponse.json({ error: "bucket and path required" }, { status: 400 });
  }
  if (!ALLOWED_BUCKETS.includes(bucket)) {
    return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: signed, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60); // 60-second TTL — only used for this one fetch

  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const fileRes = await fetch(signed.signedUrl);
  if (!fileRes.ok) {
    return NextResponse.json({ error: "Failed to retrieve document" }, { status: 502 });
  }

  const contentType = fileRes.headers.get("content-type") ?? "application/octet-stream";
  const contentLength = fileRes.headers.get("content-length");

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Cache-Control", "private, no-store");
  if (contentLength) headers.set("Content-Length", contentLength);

  return new NextResponse(fileRes.body, { status: 200, headers });
}
