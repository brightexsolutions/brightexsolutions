import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { IntakeWizard } from "./wizard";

export const dynamic = "force-dynamic";

async function getClientForToken(token: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name, email, intake_token")
    .eq("intake_token", token)
    .is("deleted_at", null)
    .single();
  return data ?? null;
}

export default async function IntakePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 32) notFound();

  const client = await getClientForToken(token);
  if (!client) notFound();

  return (
    <IntakeWizard
      token={token}
      clientName={client.name}
      clientEmail={client.email ?? ""}
    />
  );
}
