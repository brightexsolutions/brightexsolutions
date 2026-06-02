import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const UpdateSchema = z.object({
  caption: z.string().min(1).max(3000).trim().optional(),
  platforms: z.array(z.string().max(30)).min(1).optional(),
  hashtags: z.array(z.string().max(100)).optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
  notes: z.string().max(1000).trim().optional(),
  status: z.enum(["draft", "pending_approval", "posted"]).optional(),
  posted_at: z.string().datetime().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(request, "team");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: member } = await supabase
    .from("team_members")
    .select("id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member || member.role !== "marketing") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Fetch post to verify ownership
  const { data: post } = await supabase
    .from("social_posts")
    .select("id, created_by, status")
    .eq("id", id)
    .maybeSingle();

  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const result = UpdateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });
  }

  const update = result.data;

  // Only own posts can be edited (draft / pending_approval)
  // Approved posts can only have status changed to "posted" (mark as posted)
  const isOwner = post.created_by === member.id;
  const isMarkingPosted = update.status === "posted" && post.status === "approved";

  if (!isOwner && !isMarkingPosted) {
    return NextResponse.json({ error: "You can only edit your own posts." }, { status: 403 });
  }

  // When marking as posted, set posted_at timestamp
  if (isMarkingPosted && !update.posted_at) {
    update.posted_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("social_posts")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to update post." }, { status: 500 });
  return NextResponse.json({ data });
}
