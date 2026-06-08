import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const ALLOWED_TYPES = ["image/png", "image/svg+xml", "image/webp", "image/jpeg"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const supabase = createAdminClient();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const variant = formData.get("variant") as string | null;

  if (!file || !variant || !["dark", "light"].includes(variant)) {
    return NextResponse.json({ error: "Missing file or variant" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "File type not allowed. Use PNG, SVG, WebP, or JPEG." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum 2 MB." }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const fileName = `logo-${variant}-${crypto.randomUUID()}.${ext}`;

  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("logos")
    .upload(fileName, new Uint8Array(bytes), {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "Upload failed", detail: uploadError.message },
      { status: 500 }
    );
  }

  const { data: { publicUrl } } = supabase.storage
    .from("logos")
    .getPublicUrl(fileName);

  // Persist URL to settings table immediately so it survives without a Save
  await supabase
    .from("settings")
    .upsert(
      { key: `logo_${variant}_url`, value: publicUrl },
      { onConflict: "key" }
    );

  return NextResponse.json({ url: publicUrl });
}
