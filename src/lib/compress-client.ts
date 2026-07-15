// Browser-side counterpart to src/lib/compress.ts — sharp only runs server
// side, so large images (a phone photo can be 8-12MB) need shrinking here
// too, before they're base64-encoded into a JSON request body. Server-side
// compressFile() still runs afterwards as the source of truth; this just
// keeps the upload itself under request-body limits.
const MAX_PX = 1920;
const QUALITY = 0.82;

export async function compressImageClientSide(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    if (width > MAX_PX || height > MAX_PX) {
      const scale = MAX_PX / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, outType, QUALITY));
    if (!blob || blob.size >= file.size) return file;

    const ext = outType === "image/png" ? "png" : "jpg";
    const newName = file.name.replace(/\.[^.]+$/, `.${ext}`);
    return new File([blob], newName, { type: outType });
  } catch {
    return file;
  }
}
