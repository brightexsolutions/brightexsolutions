/**
 * POST /api/public/documents/[id]/signature-preview
 *
 * Processes an uploaded signature photograph and returns the result, WITHOUT
 * storing anything or signing anything.
 *
 * This exists because background removal by luminance threshold is honest but
 * not infallible: a photo on lined paper, or in poor light, produces a mess.
 * Showing the client the processed result and letting them retry is the
 * difference between a feature that works and one that occasionally puts a grey
 * smear on a contract. Nobody should discover what their signature looks like
 * after they have signed.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { decodeDataUrl, processUploadedSignature, assertUsable, SignatureError } from "@/lib/signature-image";

export const dynamic = "force-dynamic";

const PreviewSchema = z.object({ image: z.string().min(64).max(9_000_000) });

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "public");
  if (limited) return limited;

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
    if (err instanceof SignatureError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[signature-preview]", err);
    return NextResponse.json({ error: "That image could not be processed. Please try another photo." }, { status: 500 });
  }
}
