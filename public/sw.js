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
