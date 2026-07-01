import { createAdminClient } from "@/lib/supabase/server";

export interface AuditParams {
  actor_id?: string | null;
  actor_name?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string;
  entity_label?: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  notes?: string;
  source?: "user" | "system";
}

export async function logAction(params: AuditParams): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("activity_log").insert({
      source: "user",
      ...params,
    });
  } catch {
    // Never let audit logging block the main operation
  }
}

/** Log an automated/cron-triggered action. actor_id is null; tagged source = "system". */
export async function logSystemAction(
  params: Omit<AuditParams, "actor_id" | "actor_name" | "source">
): Promise<void> {
  return logAction({
    ...params,
    actor_id: null,
    actor_name: "System",
    source: "system",
  });
}
