/**
 * POST /api/admin/settings/signature/preview
 *
 * Processes a photographed signature and returns the result without storing it.
 *
 * Background removal is a luminance threshold, which is honest but not
 * infallible: lined paper or poor light produces a mess. Showing the result
 * before it is committed is the difference between a feature that works and one
 * that occasionally puts a grey smear on every contract we send.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { decodeDataUrl, processUploadedSignature, assertUsable, SignatureError } from "@/lib/signature-image";

export const dynamic = "force-dynamic";

const PreviewSchema = z.object({ image: z.string().min(64).max(9_000_000) });

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const parsed = PreviewSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "No image received." }, { status: 400 });

  try {
    const { buffer } = decodeDataUrl(parsed.data.image);
    const processed = await processUploadedSignature(buffer);
    assertUsable(processed);
    return NextResponse.json({
      image: `data:image/png;base64,${processed.buffer.toString("base64")}`,
      width: processed.width,
      height: processed.height,
    });
  } catch (err) {
    if (err instanceof SignatureError) return NextResponse.json({ error: err.message }, { status: 422 });
    console.error("[signature-settings-preview]", err);
    return NextResponse.json({ error: "That image could not be processed." }, { status: 500 });
  }
}
