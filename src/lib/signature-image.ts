/**
 * Signature image processing.
 *
 * Two ways in, one output. A signature drawn on a canvas already arrives as a
 * transparent PNG and needs only bounds-trimming and sizing. A signature
 * photographed on paper arrives as a rectangle of off-white with some ink in
 * it, and has to have its paper removed before it can sit on a document.
 *
 * Background removal here is a luminance threshold, not a model: convert to
 * greyscale, normalise the contrast, and use brightness as the alpha channel so
 * dark ink stays opaque and pale paper becomes transparent. That handles a
 * photograph taken in reasonable light on plain paper, which is the realistic
 * case. It will not rescue a picture of a signature on lined paper in a dark
 * room, which is why the client is shown the processed result and can retry
 * before committing to it. Being honest about that boundary is better than a
 * heavier dependency that fails differently.
 *
 * sharp is already a dependency (used for image compression elsewhere), so this
 * adds no new supply chain.
 */
import sharp from "sharp";

/**
 * How a signature was made, as stored in document_signatures.method.
 *
 * Exported so the API schema and every caller share one list rather than each
 * repeating string literals. They had already drifted once: the settings UI
 * called it "draw" while the API expected "drawn", which zod rejected as a bare
 * "Invalid input" that named neither the field nor the reason.
 *
 * "typed" is a stored value but never an input: it is what a signature IS when
 * no image was supplied, decided server side, so it is not accepted from a
 * request.
 */
export const SIGNATURE_METHODS = ["drawn", "upload", "typed"] as const;
export type SignatureMethod = (typeof SIGNATURE_METHODS)[number];

/** The two a caller may actually send. */
export const SIGNATURE_INPUT_METHODS = ["drawn", "upload"] as const;
export type SignatureInputMethod = (typeof SIGNATURE_INPUT_METHODS)[number];

export const MAX_SIGNATURE_BYTES = 6 * 1024 * 1024;
const OUTPUT_WIDTH = 600;

export interface ProcessedSignature {
  buffer: Buffer;
  width: number;
  height: number;
  /** Proportion of pixels that survived as ink. Used to reject blanks. */
  inkRatio: number;
}

export class SignatureError extends Error {}

/** Reads a data URL into a buffer, rejecting anything that is not an image. */
export function decodeDataUrl(dataUrl: string): { buffer: Buffer; mime: string } {
  const match = /^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!match) throw new SignatureError("That does not look like a PNG, JPEG or WebP image.");
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength > MAX_SIGNATURE_BYTES) {
    throw new SignatureError("That image is too large. Please use one under 6MB.");
  }
  return { buffer, mime: match[1] };
}

/**
 * Drawn signatures: already transparent, so only trim and resize. Trimming
 * matters because a canvas is mostly empty space and an untrimmed signature
 * renders as a small mark adrift in a large box.
 */
export async function processDrawnSignature(input: Buffer): Promise<ProcessedSignature> {
  const trimmed = await sharp(input)
    .ensureAlpha()
    .trim({ threshold: 1 })
    .resize({ width: OUTPUT_WIDTH, fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer({ resolveWithObject: true })
    .catch(() => null);

  if (!trimmed) throw new SignatureError("That signature could not be read. Please try signing again.");

  const inkRatio = await measureInk(trimmed.data);
  return {
    buffer: trimmed.data,
    width: trimmed.info.width,
    height: trimmed.info.height,
    inkRatio,
  };
}

/**
 * Photographed signatures: greyscale, normalise, then derive alpha from
 * luminance so paper drops out and ink stays.
 *
 * The alpha channel is the INVERTED greyscale: dark pixels (ink) become opaque,
 * light pixels (paper) become transparent. Normalising first matters because a
 * photo taken in poor light has a compressed range, and thresholding a
 * compressed range removes either everything or nothing.
 */
export async function processUploadedSignature(input: Buffer): Promise<ProcessedSignature> {
  const base = sharp(input).rotate().flatten({ background: "#ffffff" }).greyscale().normalise();

  const grey = await base.clone().raw().toBuffer({ resolveWithObject: true }).catch(() => null);
  if (!grey) throw new SignatureError("That image could not be read. Please try another photo.");

  const { width, height } = grey.info;

  // Alpha = how dark the pixel is, with a floor so mid-grey paper texture does
  // not survive as a haze around the signature.
  const alpha = Buffer.alloc(width * height);
  for (let i = 0; i < width * height; i++) {
    const luminance = grey.data[i];
    const darkness = 255 - luminance;
    alpha[i] = darkness < 60 ? 0 : Math.min(255, Math.round((darkness - 60) * (255 / 195)));
  }

  const composed = await sharp(Buffer.alloc(width * height * 3, 0), {
    raw: { width, height, channels: 3 },
  })
    .joinChannel(alpha, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer()
    .catch(() => null);

  if (!composed) throw new SignatureError("That signature could not be processed. Please try another photo.");

  const trimmed = await sharp(composed)
    .trim({ threshold: 1 })
    .resize({ width: OUTPUT_WIDTH, fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer({ resolveWithObject: true })
    .catch(() => null);

  if (!trimmed) throw new SignatureError("That signature could not be processed. Please try another photo.");

  const inkRatio = await measureInk(trimmed.data);
  return {
    buffer: trimmed.data,
    width: trimmed.info.width,
    height: trimmed.info.height,
    inkRatio,
  };
}

/**
 * Proportion of visible pixels.
 *
 * A blank canvas, or a photo of an empty sheet, processes without error into an
 * image containing nothing. Signing with nothing is worse than not signing,
 * because the record claims a signature exists. So the result is measured and
 * an effectively empty one is refused.
 */
async function measureInk(png: Buffer): Promise<number> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let visible = 0;
  const pixels = info.width * info.height;
  for (let i = 0; i < pixels; i++) {
    if (data[i * info.channels + (info.channels - 1)] > 24) visible++;
  }
  return pixels === 0 ? 0 : visible / pixels;
}

/** Below this, the image is empty or near enough that it is not a signature. */
export const MIN_INK_RATIO = 0.002;

export function assertUsable(sig: ProcessedSignature): void {
  if (sig.inkRatio < MIN_INK_RATIO) {
    throw new SignatureError(
      "That looks blank. If you uploaded a photo, try a clearer one on plain paper in good light, or draw your signature instead."
    );
  }
}
