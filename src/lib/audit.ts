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
    const { error } = await supabase.from("activity_log").insert({
      source: "user",
      ...params,
    });

    // Supabase returns { error } rather than throwing, so without this check a
    // rejected insert looks exactly like a successful one. That is precisely
    // how a missing `source` column silently discarded a month of audit
    // history: the writes failed, nothing was logged about the logging, and
    // the gap only showed up when someone went looking for a record.
    //
    // Audit logging still must never block the operation it is recording, so
    // this reports and returns rather than throwing.
    if (error) {
      console.error("[audit] Failed to record action:", params.action, error.message);
    }
  } catch (err) {
    console.error("[audit] Unexpected failure recording action:", params.action, err);
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
