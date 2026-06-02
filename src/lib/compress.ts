import sharp from "sharp";

// Max dimension for any uploaded image (width or height)
const MAX_PX = 1920;

// Target quality for lossy formats
const QUALITY = 82;

type CompressResult = {
  buffer: Buffer;
  mimeType: string;
  originalBytes: number;
  compressedBytes: number;
};

/**
 * Compress an uploaded file before storing it in Supabase.
 *
 * Images (JPEG, PNG, WebP, GIF) are re-encoded at reduced quality and
 * downscaled if they exceed MAX_PX on either axis.
 *
 * PDFs and office documents are returned unchanged — lossless JS-only PDF
 * compression yields negligible savings and risks corrupting the file.
 *
 * The caller should use `result.mimeType` (not the original file.type) when
 * setting the Content-Type on the stored object, since PNGs are converted to
 * WebP when that produces a smaller file.
 */
export async function compressFile(
  bytes: ArrayBuffer,
  mimeType: string,
  originalName: string,
): Promise<CompressResult> {
  const input = Buffer.from(bytes);
  const originalBytes = input.byteLength;

  const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

  if (!IMAGE_TYPES.includes(mimeType)) {
    // Non-image — return as-is
    return { buffer: input, mimeType, originalBytes, compressedBytes: originalBytes };
  }

  const pipeline = sharp(input).rotate(); // auto-rotate from EXIF

  // Downscale if too large, maintaining aspect ratio
  const meta = await pipeline.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w > MAX_PX || h > MAX_PX) {
    pipeline.resize(MAX_PX, MAX_PX, { fit: "inside", withoutEnlargement: true });
  }

  // PNG → try WebP first; use WebP if smaller, otherwise keep PNG
  if (mimeType === "image/png") {
    const [webpBuf, pngBuf] = await Promise.all([
      pipeline.clone().webp({ quality: QUALITY }).toBuffer(),
      pipeline.clone().png({ compressionLevel: 9, palette: true }).toBuffer(),
    ]);
    const best = webpBuf.byteLength < pngBuf.byteLength ? webpBuf : pngBuf;
    const bestMime = webpBuf.byteLength < pngBuf.byteLength ? "image/webp" : "image/png";
    return { buffer: best, mimeType: bestMime, originalBytes, compressedBytes: best.byteLength };
  }

  // JPEG / JPG
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    const buf = await pipeline.jpeg({ quality: QUALITY, progressive: true, mozjpeg: true }).toBuffer();
    return { buffer: buf, mimeType: "image/jpeg", originalBytes, compressedBytes: buf.byteLength };
  }

  // WebP (already compressed, just re-encode to normalise quality)
  if (mimeType === "image/webp") {
    const buf = await pipeline.webp({ quality: QUALITY }).toBuffer();
    return { buffer: buf, mimeType: "image/webp", originalBytes, compressedBytes: buf.byteLength };
  }

  // GIF — convert to WebP (animated WebP supported by sharp)
  if (mimeType === "image/gif") {
    const buf = await pipeline.webp({ quality: QUALITY }).toBuffer();
    return { buffer: buf, mimeType: "image/webp", originalBytes, compressedBytes: buf.byteLength };
  }

  return { buffer: input, mimeType, originalBytes, compressedBytes: originalBytes };
}

/** Return a storage-safe extension for the compressed MIME type. */
export function mimeToExt(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "webp", // GIFs are stored as WebP
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  };
  return map[mimeType] ?? "bin";
}
