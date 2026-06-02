import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";

const ROLE_PORTAL: Record<string, string> = {
  subcontractor: "/work",
  marketing: "/team/marketing",
  finance: "/team/finance",
  support: "/team/support",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const supabase = createAdminClient();
  const { id } = await params;

  const { data: member, error: fetchErr } = await supabase
    .from("team_members")
    .select("id, name, email, role, user_id, active")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (fetchErr || !member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (!member.user_id) {
    return NextResponse.json(
      { error: "This member is external and has no portal login to impersonate." },
      { status: 400 }
    );
  }

  if (!member.email) {
    return NextResponse.json(
      { error: "Member has no email address on record." },
      { status: 400 }
    );
  }

  const portalPath = ROLE_PORTAL[member.role] ?? "/admin";

  // Generate link — redirect_to is only used as fallback if user follows the raw
  // action_link directly; our flow extracts the raw OTP token instead and calls
  // verifyOtp on the client, bypassing Supabase's redirect URL whitelist entirely.
  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: member.email,
  });

  if (linkErr || !linkData?.properties?.action_link) {
    return NextResponse.json(
      { error: linkErr?.message ?? "Failed to generate login link." },
      { status: 500 }
    );
  }

  // Extract the raw OTP token from the action_link URL query params.
  // action_link format: https://<project>.supabase.co/auth/v1/verify?token=<TOKEN>&type=magiclink&...
  let token: string;
  try {
    const url = new URL(linkData.properties.action_link);
    const raw = url.searchParams.get("token");
    if (!raw) throw new Error("token not found in action_link");
    token = raw;
  } catch {
    return NextResponse.json({ error: "Failed to extract login token." }, { status: 500 });
  }

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "impersonated",
    entity_type: "team",
    entity_id: member.id,
    entity_label: `${member.name} (${member.role})`,
    notes: "Admin opened a one-time token to access this member's portal",
  });

  return NextResponse.json({ token, next: portalPath });
}
