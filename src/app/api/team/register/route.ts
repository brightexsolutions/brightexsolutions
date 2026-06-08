import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// Called by the join page after a team member sets their password.
// Creates the team_members record, sets app_metadata.app_role for secure
// JWT claims, and marks the invite as accepted.
export async function POST(request: NextRequest) {
  const { data: { user }, error: authError } = await (await createClient()).auth.getUser();
  if (!user || authError) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const supabase = createAdminClient();

  const role = user.user_metadata?.role as string | undefined;
  const name = user.user_metadata?.name as string | undefined;

  if (!role || !name) {
    return NextResponse.json({ error: "No role in user metadata" }, { status: 400 });
  }

  // Create team_members record if not already there
  const { data: existing } = await supabase
    .from("team_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    await supabase.from("team_members").insert({
      user_id: user.id,
      name,
      email: user.email!,
      role,
      active: true,
    });
  }

  // Set app_metadata.app_role — this is the authoritative server-side claim
  // used by middleware for route protection. Only the service role can write this.
  await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: { app_role: role },
  });

  // Mark invite as accepted
  if (user.email) {
    await supabase.from("team_invites")
      .update({ accepted: true, accepted_at: new Date().toISOString() })
      .eq("email", user.email);
  }

  return NextResponse.json({ success: true });
}
