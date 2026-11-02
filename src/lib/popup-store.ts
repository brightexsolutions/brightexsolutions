import type { SupabaseClient } from "@supabase/supabase-js";
import { readPopup, type PopupConfig } from "@/lib/popup-config";

/**
 * Pop-up settings live in the key/value `settings` table, one row per
 * announcement (`popup:<announcement id>` -> JSON). This needs no schema
 * change, so pop-ups work on any database that has the base tables.
 */
const PREFIX = "popup:";
export const popupKey = (announcementId: string) => `${PREFIX}${announcementId}`;
export const isPopupKey = (key: string) => key.startsWith(PREFIX);

/** Every stored pop-up config, keyed by announcement id. Malformed rows are skipped. */
export async function loadPopups(supabase: SupabaseClient): Promise<Map<string, PopupConfig>> {
  const { data } = await supabase.from("settings").select("key, value").like("key", `${PREFIX}%`);
  const out = new Map<string, PopupConfig>();
  for (const row of (data ?? []) as Array<{ key: string; value: string | null }>) {
    try {
      const popup = readPopup(JSON.parse(row.value ?? "null"));
      if (popup) out.set(row.key.slice(PREFIX.length), popup);
    } catch {
      // Ignore rows that are not valid JSON
    }
  }
  return out;
}

/** Saves (or with null, removes) the pop-up config for one announcement. */
export async function savePopup(supabase: SupabaseClient, announcementId: string, popup: PopupConfig | null) {
  if (!popup) {
    return supabase.from("settings").delete().eq("key", popupKey(announcementId));
  }
  return supabase
    .from("settings")
    .upsert({ key: popupKey(announcementId), value: JSON.stringify(popup), updated_at: new Date().toISOString() }, { onConflict: "key" });
}
