import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { resolveCc } from "@/lib/cc-recipients";
import { sendIntakeReviewedNotice } from "@/lib/intake-mail";

// DB-backed GET handler: without this Next freezes the response at build
// time and the route serves stale data forever.
export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  status: z.enum(["new", "reviewed", "archived"]).optional(),
  /** Marking reviewed closes the client's edit window, so it tells them by
   * default. Off is for housekeeping on old submissions. */
  notifyClient: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("client_intakes")
    .select("*")
    .eq("client_id", id)
    .is("deleted_at", null)
    .order("submitted_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  // id here is the intake record id (passed via query param to disambiguate)
  const url = new URL(request.url);
  const intakeId = url.searchParams.get("intakeId");
  if (!intakeId) {
    return NextResponse.json({ error: "intakeId required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = PatchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { status, notifyClient = true } = result.data;
  if (!status) {
    return NextResponse.json({ error: "No change requested" }, { status: 400 });
  }

  // Read it first: whether this is the transition into reviewed, rather than a
  // repeat of a status it already holds, decides whether the client hears
  // about it. Nobody should get the same "we have read it" email twice.
  const { data: before } = await supabase
    .from("client_intakes")
    .select("id, client_id, status, submitter_name, submitter_email, project_title, service_type, service_types")
    .eq("id", intakeId)
    .maybeSingle();

  if (!before) {
    return NextResponse.json({ error: "Intake not found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = { status };
  const becameReviewed = status === "reviewed" && before.status !== "reviewed";
  if (status === "reviewed") {
    patch.reviewed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("client_intakes")
    .update(patch)
    .eq("id", intakeId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Marking reviewed is the moment the client loses the ability to edit, so it
  // is also the moment they have to be told. Sent after the write succeeds,
  // and never allowed to fail the request: an email that bounces must not
  // leave the intake looking unreviewed in the dashboard.
  let notified = false;
  if (becameReviewed && notifyClient && before.submitter_email) {
    try {
      const cc = await resolveCc({
        clientId: before.client_id,
        scope: "intake",
        to: before.submitter_email,
      });

      await sendIntakeReviewedNotice({
        to: before.submitter_email,
        cc,
        name: before.submitter_name ?? "there",
        serviceType: before.service_type,
        serviceTypes: before.service_types ?? undefined,
        projectTitle: before.project_title,
      });
      notified = true;

      if (before.client_id) {
        await supabase.from("communications").insert({
          client_id: before.client_id,
          type: "email",
          subject: "Requirements reviewed, form closed to edits",
          body: `Told ${before.submitter_email} we have reviewed their submission and that it is now locked.${cc.length ? ` Copied to: ${cc.join(", ")}` : ""}`,
          direction: "out",
          status: "sent",
        });
      }
    } catch (err) {
      console.error("[intakes PATCH] reviewed notice:", err);
    }
  }

  return NextResponse.json({ success: true, notified });
}
