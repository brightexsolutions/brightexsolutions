// Brightex push notification service worker

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Brightex", body: event.data.text() };
  }

  const options = {
    body:    payload.body  ?? "",
    icon:    payload.icon  ?? "/assets/logo-light.png",
    badge:   payload.badge ?? "/assets/logo-light.png",
    tag:     payload.tag   ?? "brightex-notification",
    data:    { url: payload.url ?? "/admin" },
    requireInteraction: payload.requireInteraction ?? false,
  };

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Brightex", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/admin";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes("/admin") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── Installable app support ──────────────────────────────────────────────────
// Network first for admin navigations; if the device is offline, show a
// small notice instead of the browser's dino page. Nothing else is cached, so
// data is never served stale.
const OFFLINE_HTML = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title>
<body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#152238;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:24px">
<div><p style="font-size:20px;font-weight:600;margin:0 0 8px">You're offline</p><p style="opacity:.7;margin:0 0 20px">Brightex needs a connection to load live data.</p>
<button onclick="location.reload()" style="background:#f9a825;color:#152238;border:0;border-radius:999px;padding:12px 24px;font-weight:600;font-size:15px">Try again</button></div></body>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.mode !== "navigate" || !new URL(req.url).pathname.startsWith("/admin")) return;
  event.respondWith(
    fetch(req).catch(() => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }))
  );
});
