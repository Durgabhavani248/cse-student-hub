const CACHE_NAME = "nri-hub-v3";

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))))
  );
});

self.addEventListener("fetch", event => {
  // Skip caching for dev server requests
  if (event.request.url.includes("localhost") || event.request.url.includes("@vite") || event.request.url.includes("@react-refresh")) {
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Push Notification
self.addEventListener("push", event => {
  const data = event.data.json();

  const title = data.title || "NRI Hub";

  const body = data.body || "";

  const url =
    data.url ||
    "https://nri-cse-hub.netlify.app/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url }
    })
  );
});
self.addEventListener("notificationclick", event => {
  event.notification.close();

  const url =
    event.notification.data?.url ||
    "https://nri-cse-hub.netlify.app/";

  event.waitUntil(
    clients.openWindow(url)
  );
});