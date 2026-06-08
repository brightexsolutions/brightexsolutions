import { createAdminClient } from "@/lib/supabase/server";

export interface AuditParams {
  actor_id: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  entity_label?: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  notes?: string;
}

export async function logAction(params: AuditParams): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("activity_log").insert(params);
  } catch {
    // Never let audit logging block the main operation
  }
}
