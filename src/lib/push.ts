import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/server";

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return;
  const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return;
  webpush.setVapidDetails(
    `mailto:${process.env.ADMIN_EMAIL ?? "info.brightexsolutions@gmail.com"}`,
    pub,
    priv
  );
  vapidConfigured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export async function sendAdminPush(payload: PushPayload): Promise<void> {
  ensureVapid();
  if (!vapidConfigured) return;

  const supabase = createAdminClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("active", true);

  if (!subs || subs.length === 0) return;

  const json = JSON.stringify(payload);

  await Promise.allSettled(
    subs.map(async (row) => {
      try {
        await webpush.sendNotification(
          row.subscription as webpush.PushSubscription,
          json
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          // Subscription expired/unsubscribed — deactivate it
          await supabase
            .from("push_subscriptions")
            .update({ active: false })
            .eq("subscription->endpoint", (row.subscription as webpush.PushSubscription).endpoint);
        }
      }
    })
  );
}
