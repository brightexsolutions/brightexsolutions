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
  source?: "user" | "system" | "client";
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

/**
 * Log an action performed by a CLIENT, not by us.
 *
 * Accepting a proposal, asking for changes, and signing an agreement are the
 * most consequential events in the pipeline and were previously absent from
 * activity_log entirely: they existed only as a notification (cleared once
 * read) and a communications entry (a message, not an audit record).
 *
 * Recorded as source = 'client' rather than 'user', because "we marked this
 * accepted" and "the client accepted this" are different claims and only one
 * of them is evidence. actor_id is null: a client has no auth.users row, and
 * actor_name carries the name they gave.
 *
 * Falls back to 'user' where migration 041 has not been applied, so a missing
 * constraint update never costs us the log entry itself.
 */
export async function logClientAction(
  params: Omit<AuditParams, "actor_id" | "source"> & { actor_name: string }
): Promise<void> {
  const supabase = createAdminClient();
  const row = { ...params, actor_id: null, source: "client" as const };

  const { error } = await supabase.from("activity_log").insert(row);
  if (!error) return;

  if (/constraint|check|violates/i.test(error.message)) {
    const { error: retryError } = await supabase
      .from("activity_log")
      .insert({ ...row, source: "user", actor_name: `${params.actor_name} (client)` });
    if (retryError) console.error("[audit] client action fallback failed:", retryError.message);
    return;
  }
  console.error("[audit] Failed to record client action:", params.action, error.message);
}
