import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { intakeEditLock, MAX_INTAKE_EDITS } from "@/lib/intake-submission";
import { IntakeWizard } from "./wizard";
import { ReturningClientChoice } from "./returning-choice";
import { IntakeLockedNotice } from "./locked-notice";

export const dynamic = "force-dynamic";

async function getClientForToken(token: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name, email, company, phone, intake_token")
    .eq("intake_token", token)
    .is("deleted_at", null)
    .single();
  return data ?? null;
}

/**
 * The most recent submission from this client, if any.
 *
 * A client who revisits their original link has almost always come back to
 * change something, not to file a second unrelated request. Dropping them into
 * an empty form loses everything they already told us and produces a duplicate
 * record for us to reconcile.
 */
async function getLatestIntake(clientId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("client_intakes")
    .select("id, project_title, service_type, service_types, submitted_at, edit_token, edit_count, status, reviewed_at")
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .neq("status", "archived")
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export default async function IntakePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 32) notFound();

  const client = await getClientForToken(token);
  if (!client) notFound();

  // A client who genuinely wants to file a second, separate request opts out
  // of the returning-client prompt explicitly.
  const { new: startNew } = await searchParams;

  // Missing edit columns (migration 037 not yet run) simply means no prior
  // submission is offered, and the form behaves exactly as it did before.
  const latest = startNew ? null : await getLatestIntake(client.id).catch(() => null);

  if (latest?.edit_token) {
    const editsUsed = Number(latest.edit_count ?? 0);
    const newRequestHref = `/intake/${token}?new=1`;
    const summary = {
      projectTitle: latest.project_title,
      serviceType: latest.service_type,
      serviceTypes: latest.service_types,
      submittedAt: latest.submitted_at,
    };

    // Offering "update my answers" on a submission we have already read would
    // walk them into a refusal two screens later.
    const lock = intakeEditLock(latest);
    if (lock.locked) {
      return (
        <IntakeLockedNotice
          clientName={client.name}
          reason={lock.reason!}
          message={lock.message}
          intake={{ ...summary, reviewedAt: latest.reviewed_at }}
          newRequestHref={newRequestHref}
        />
      );
    }

    return (
      <ReturningClientChoice
        clientName={client.name}
        intake={{ ...summary, editToken: latest.edit_token }}
        editsRemaining={Math.max(0, MAX_INTAKE_EDITS - editsUsed)}
        maxEdits={MAX_INTAKE_EDITS}
        newRequestHref={newRequestHref}
      />
    );
  }

  return (
    <IntakeWizard
      token={token}
      clientName={client.name}
      clientEmail={client.email ?? ""}
      clientCompany={client.company ?? ""}
      clientPhone={client.phone ?? ""}
    />
  );
}
