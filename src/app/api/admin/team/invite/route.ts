import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const InviteSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().trim(),
  role: z.enum(["subcontractor", "marketing", "finance"]),
  note: z.string().max(500).trim().optional(),
});

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = InviteSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, email, role, note } = result.data;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase not configured. Add SUPABASE_URL and SERVICE_ROLE_KEY to .env.local." },
      { status: 503 }
    );
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // Send Supabase invite email (creates user + sends magic link)
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        data: { name, role, invited_by: "admin" },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/join?role=${role}`,
      }
    );

    if (inviteError) {
      console.error("[team/invite] Supabase invite error:", inviteError);
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    // Record the invite in team_invites table
    await supabase.from("team_invites").insert({
      email,
      name,
      role,
      user_id: inviteData.user?.id ?? null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[team/invite] Error:", err);
    return NextResponse.json({ error: "Failed to send invite." }, { status: 500 });
  }
}
