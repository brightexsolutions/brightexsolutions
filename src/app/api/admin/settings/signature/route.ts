/**
 * GET    /api/admin/settings/signature   what is currently on file
 * POST   /api/admin/settings/signature   set the name, title and signature
 * DELETE /api/admin/settings/signature   remove the image, keep the name
 *
 * The Brightex side of every agreement. Stored once here rather than typed per
 * document, because a countersignature that has to be remembered is one that
 * will eventually be missing from a contract.
 *
 * The image is processed through the same pipeline as a client's: drawn on a
 * canvas, or photographed on paper and background-removed. It lives in the
 * private `signatures` bucket under a fixed path, so replacing it replaces it
 * everywhere rather than leaving old copies behind.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";
import {
  decodeDataUrl, processDrawnSignature, processUploadedSignature,
  assertUsable, SignatureError, SIGNATURE_INPUT_METHODS,
} from "@/lib/signature-image";

export const dynamic = "force-dynamic";

/** Fixed path: one current Brightex signature, not an accumulating pile. */
const SIGNATURE_PATH = "brightex/countersignature.png";

const DEFAULTS = { signatory_name: "Godwin", signatory_title: "Lead at Brightex Solutions" };

async function readSettings(supabase: ReturnType<typeof createAdminClient>) {
  const { data } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["signatory_name", "signatory_title", "signature_path"]);
  const map = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  return {
    name: map.signatory_name || DEFAULTS.signatory_name,
    title: map.signatory_title || DEFAULTS.signatory_title,
    hasSignature: !!map.signature_path,
    signaturePath: map.signature_path || null,
  };
}

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const supabase = createAdminClient();
  const settings = await readSettings(supabase);

  // The image itself, inline, so the settings page can show what is on file
  // without a second authenticated request for a private object.
  let dataUrl: string | null = null;
  if (settings.signaturePath) {
    const { data: file } = await supabase.storage.from("signatures").download(settings.signaturePath);
    if (file) {
      dataUrl = `data:image/png;base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
    }
  }

  return NextResponse.json({ ...settings, image: dataUrl });
}

const SaveSchema = z.object({
  name: z.string().min(2).max(120).trim().optional(),
  title: z.string().max(160).trim().optional(),
  /** PNG data URL from the canvas, or a photograph to be cleaned up. */
  image: z.string().min(64).max(9_000_000).optional(),
  method: z.enum(SIGNATURE_INPUT_METHODS).optional(),
});

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const parsed = SaveSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    // A bare "Invalid input" sends whoever hits it reading source to find out
    // which of four fields was wrong. Name the field and what it expected.
    const problems = parsed.error.issues.map((i) => {
      const field = i.path.join(".") || "request";
      return `${field}: ${i.message}`;
    });
    return NextResponse.json({ error: problems.join("; "), problems }, { status: 400 });
  }

  const supabase = createAdminClient();
  const rows: { key: string; value: string }[] = [];
  const changes: string[] = [];

  if (parsed.data.name) {
    rows.push({ key: "signatory_name", value: parsed.data.name });
    changes.push(`name: ${parsed.data.name}`);
  }
  if (parsed.data.title !== undefined) {
    rows.push({ key: "signatory_title", value: parsed.data.title });
    changes.push(`title: ${parsed.data.title}`);
  }

  if (parsed.data.image) {
    try {
      const { buffer } = decodeDataUrl(parsed.data.image);
      const processed = parsed.data.method === "upload"
        ? await processUploadedSignature(buffer)
        : await processDrawnSignature(buffer);
      assertUsable(processed);

      const { error: uploadError } = await supabase.storage
        .from("signatures")
        .upload(SIGNATURE_PATH, processed.buffer, { contentType: "image/png", upsert: true });
      if (uploadError) {
        console.error("[signature-settings] storage:", uploadError.message);
        return NextResponse.json({ error: "The signature could not be saved. Try again shortly." }, { status: 503 });
      }
      rows.push({ key: "signature_path", value: SIGNATURE_PATH });
      changes.push("signature image updated");
    } catch (err) {
      if (err instanceof SignatureError) return NextResponse.json({ error: err.message }, { status: 422 });
      console.error("[signature-settings]", err);
      return NextResponse.json({ error: "That signature could not be processed." }, { status: 500 });
    }
  }

  if (rows.length === 0) return NextResponse.json({ error: "Nothing to save." }, { status: 400 });

  const { error } = await supabase
    .from("settings")
    .upsert(rows.map((r) => ({ ...r, updated_at: new Date().toISOString() })), { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "updated",
    entity_type: "settings",
    entity_label: "Countersignature",
    notes: changes.join("; "),
  });

  return NextResponse.json({ ok: true, ...(await readSettings(supabase)) });
}

export async function DELETE(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const supabase = createAdminClient();
  await supabase.storage.from("signatures").remove([SIGNATURE_PATH]);
  await supabase.from("settings").delete().eq("key", "signature_path");

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "deleted",
    entity_type: "settings",
    entity_label: "Countersignature image",
    notes: "Agreements will show a typed signature until a new one is added.",
  });

  return NextResponse.json({ ok: true });
}
