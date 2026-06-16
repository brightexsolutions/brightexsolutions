"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "unsupported" | "denied" | "prompt" | "subscribed" | "loading";

async function getSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

async function subscribe(): Promise<PushSubscription | null> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return null;

  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr.buffer;
}

export function PushNotificationsToggle() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }

    // Register service worker
    navigator.serviceWorker.register("/sw.js").then(async () => {
      const perm = Notification.permission;
      if (perm === "denied") { setStatus("denied"); return; }

      const sub = await getSubscription().catch(() => null);
      setStatus(sub ? "subscribed" : "prompt");
    }).catch(() => setStatus("unsupported"));
  }, []);

  async function enable() {
    setStatus("loading");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setStatus("denied"); return; }

      const sub = await subscribe();
      if (!sub) { setStatus("prompt"); return; }

      await fetch("/api/admin/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setStatus("subscribed");
    } catch {
      setStatus("prompt");
    }
  }

  async function disable() {
    setStatus("loading");
    try {
      const sub = await getSubscription();
      if (sub) {
        await fetch("/api/admin/push-subscription", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("prompt");
    } catch {
      setStatus("subscribed");
    }
  }

  if (status === "unsupported" || status === "denied") {
    return (
      <button
        disabled
        title={status === "denied" ? "Notifications blocked in browser settings" : "Not supported in this browser"}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/40 cursor-not-allowed"
      >
        <BellOff size={14} />
      </button>
    );
  }

  if (status === "loading") {
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/30">
        <BellRing size={14} />
      </div>
    );
  }

  if (status === "subscribed") {
    return (
      <button
        onClick={disable}
        title="Browser push notifications on — click to disable"
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
          "text-emerald-500 hover:text-emerald-600 hover:bg-muted"
        )}
      >
        <BellRing size={14} />
      </button>
    );
  }

  // prompt
  return (
    <button
      onClick={enable}
      title="Enable browser push notifications"
      className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
        "text-muted-foreground/50 hover:text-foreground hover:bg-muted"
      )}
    >
      <BellRing size={14} />
    </button>
  );
}
