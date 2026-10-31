/* Notification delivery only. No fetch interception or page/content caching. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

self.addEventListener("push", event => {
  let data = {};
  try { const parsed = event.data ? event.data.json() : {}; if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) data = parsed; } catch { /* A visible fallback is required for Web Push. */ }
  const title = typeof data.title === "string" ? data.title.slice(0, 120) : "iSEREIN · A thought for today";
  const body = typeof data.body === "string" ? data.body.slice(0, 1000) : "A little perspective. A page for yourself.";
  event.waitUntil(self.registration.showNotification(title, {
    body, icon: "/icons/iserein-192.png", badge: "/icons/iserein-192.png",
    tag: data.test === true ? "iserein-quote-test" : "iserein-daily-quote",
    renotify: false, silent: true,
    data: { url: typeof data.url === "string" ? data.url : "/#thoughts" },
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  let destination = new URL("/#thoughts", self.location.origin);
  try {
    const candidate = new URL(event.notification.data?.url || "/#thoughts", self.location.origin);
    if (candidate.origin === self.location.origin && candidate.protocol === "https:" && !candidate.username && !candidate.password) destination = candidate;
    // Loopback HTTP is only used while testing locally.
    if (candidate.origin === self.location.origin && ["localhost", "127.0.0.1"].includes(candidate.hostname)) destination = candidate;
  } catch { /* Keep the safe home-page destination. */ }
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find(client => client.url.startsWith(self.location.origin + "/") && client.focused)
      || windows.find(client => client.url.startsWith(self.location.origin + "/"));
    if (existing) { await existing.navigate(destination.href); return existing.focus(); }
    return self.clients.openWindow(destination.href);
  })());
});
