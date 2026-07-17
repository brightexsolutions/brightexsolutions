import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const UpdateSchema = z.object({
  platforms: z.array(z.enum(["instagram", "facebook", "tiktok", "linkedin", "whatsapp"])).min(1).optional(),
  caption: z.string().min(1).max(2200).trim().optional(),
  hashtags: z.array(z.string().max(100)).optional(),
  scheduled_at: z.string().datetime().optional().nullable(),
  status: z.enum(["draft", "pending_approval", "approved", "posted", "archived"]).optional(),
  notes: z.string().max(500).trim().optional(),
  posted_at: z.string().datetime().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = UpdateSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  const { data, error } = await supabase
    .from("social_posts")
    .update(result.data)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sync calendar event when scheduled_at changes
  if ("scheduled_at" in result.data) {
    const newScheduled = result.data.scheduled_at ?? null;
    const { data: existing } = await supabase
      .from("calendar_events")
      .select("id")
      .eq("entity_type", "social_post")
      .eq("entity_id", id)
      .eq("type", "social_post")
      .maybeSingle();

    if (newScheduled) {
      const caption = (data.caption as string | null) ?? "";
      const title = `Post: ${((data.platforms as string[]) ?? []).join(", ")} — ${caption.slice(0, 60)}${caption.length > 60 ? "…" : ""}`;
      if (existing) {
        await supabase.from("calendar_events").update({ start_at: new Date(newScheduled).toISOString(), title }).eq("id", existing.id);
      } else {
        await supabase.from("calendar_events").insert({
          title,
          type: "social_post",
          start_at: new Date(newScheduled).toISOString(),
          all_day: false,
          entity_type: "social_post",
          entity_id: id,
        });
      }
    } else if (existing) {
      // scheduled_at cleared — remove the event
      await supabase.from("calendar_events").delete().eq("id", existing.id);
    }
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const { error } = await supabase.from("social_posts").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Remove associated calendar event
  await supabase.from("calendar_events").delete().eq("entity_type", "social_post").eq("entity_id", id);

  return NextResponse.json({ ok: true });
}
