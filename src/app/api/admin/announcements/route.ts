import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { PopupConfigSchema } from "@/lib/popup-config";
import { loadPopups, savePopup } from "@/lib/popup-store";

const AnnouncementSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  body: z.string().max(500).trim().optional(),
  type: z.enum(["info", "offer", "promo", "alert"]).default("info"),
  cta_label: z.string().max(80).trim().optional(),
  cta_url: z.union([z.string().url(), z.string().regex(/^\//), z.literal("")]).optional(),
  display_location: z.array(z.enum(["banner", "home_hero", "contact_page"])).default(["banner"]),
  active: z.boolean().default(false),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
  popup: PopupConfigSchema.nullable().optional(),
});

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("active") === "true";

  let query = supabase.from("announcements").select("*").is("deleted_at", null).order("created_at", { ascending: false });
  if (activeOnly) query = query.eq("active", true);

  const [{ data, error }, popups] = await Promise.all([query, loadPopups(supabase)]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: (data ?? []).map((a) => ({ ...a, popup: popups.get(a.id) ?? null })) });
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const result = AnnouncementSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  const { popup, ...fields } = result.data;
  const { data, error } = await supabase.from("announcements").insert(fields).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (popup) {
    const saved = await savePopup(supabase, data.id, popup);
    if (saved.error) return NextResponse.json({ error: `Announcement saved, but its pop-up settings failed: ${saved.error.message}` }, { status: 500 });
  }

  return NextResponse.json({ data: { ...data, popup: popup ?? null } }, { status: 201 });
}
