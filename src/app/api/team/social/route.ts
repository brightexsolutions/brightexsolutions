import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const CreateSchema = z.object({
  caption: z.string().min(1).max(3000).trim(),
  platforms: z.array(z.string().max(30)).min(1),
  hashtags: z.array(z.string().max(100)).optional().default([]),
  scheduled_at: z.string().datetime().optional(),
  notes: z.string().max(1000).trim().optional(),
});

async function getMarketingMember(supabase: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await supabase
    .from("team_members")
    .select("id, name, role")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || data.role !== "marketing") return null;
  return data;
}

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "team");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const member = await getMarketingMember(supabase, user.id);
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Marketing sees: their own posts (any status) + non-draft posts from others
  const { data, error } = await supabase
    .from("social_posts")
    .select("id, caption, platforms, hashtags, scheduled_at, status, media_urls, notes, created_at, posted_at, created_by")
    .or(`created_by.eq.${member.id},status.neq.draft,status.neq.pending_approval`)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, member });
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "team");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const member = await getMarketingMember(supabase, user.id);
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const result = CreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("social_posts")
    .insert({ ...result.data, created_by: member.id, status: "draft" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create post." }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
