import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { intakeRowToFormState, MAX_INTAKE_EDITS } from "@/lib/intake-submission";
import { IntakeWizard } from "../../[token]/wizard";

export const dynamic = "force-dynamic";

/**
 * Reopens a submitted intake for the client who sent it, prefilled with every
 * previous answer. Reached from the thank-you screen and the acknowledgement
 * email; the edit token is the access credential.
 */
async function getIntakeForEditing(token: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("client_intakes")
    .select("*")
    .eq("edit_token", token)
    .is("deleted_at", null)
    .maybeSingle();
  return data ?? null;
}

export default async function EditIntakePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 32) notFound();

  const intake = await getIntakeForEditing(token);
  if (!intake) notFound();

  const editsUsed = Number(intake.edit_count ?? 0);

  return (
    <IntakeWizard
      editToken={token}
      initialState={intakeRowToFormState(intake)}
      editsRemaining={Math.max(0, MAX_INTAKE_EDITS - editsUsed)}
      maxEdits={MAX_INTAKE_EDITS}
      clientName={intake.submitter_name ?? ""}
      clientEmail={intake.submitter_email ?? ""}
      clientCompany={intake.submitter_company ?? ""}
      clientPhone={intake.submitter_phone ?? ""}
    />
  );
}
