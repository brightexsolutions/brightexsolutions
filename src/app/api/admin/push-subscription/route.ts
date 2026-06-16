import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let subscription: unknown;
  try {
    subscription = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!subscription || typeof subscription !== "object" || !("endpoint" in subscription)) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { user_id: user.id, subscription, active: true, updated_at: new Date().toISOString() },
      { onConflict: "subscription->>'endpoint'" }
    );

  if (error) {
    console.error("[push-subscription/POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { endpoint } = await request.json().catch(() => ({})) as { endpoint?: string };
  if (!endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 });

  const supabase = createAdminClient();
  await supabase
    .from("push_subscriptions")
    .update({ active: false })
    .eq("user_id", user.id)
    .eq("subscription->>'endpoint'", endpoint);

  return NextResponse.json({ ok: true });
}
