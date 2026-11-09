importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBrHw1QoS_7gzxMbbjjy3B0v68BClDw6c0",
  authDomain: "nri-cse-hub.firebaseapp.com",
  projectId: "nri-cse-hub",
  storageBucket: "nri-cse-hub.firebasestorage.app",
  messagingSenderId: "217692003992",
  appId: "1:217692003992:web:1fd087ac4d905bb83e7aed"
});

const messaging = firebase.messaging();
const SHELL_CACHE = "nri-hub-shell-v1";

// Cache the app entry page and its Vite JS/CSS assets during installation.
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(SHELL_CACHE);
      const response = await fetch("/", { cache: "reload" });

      if (response.ok) {
        await cache.put("/", response.clone());

        const html = await response.clone().text();
        const assetPaths = [...html.matchAll(
          /(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g
        )].map(match => match[1]);

        await Promise.all(assetPaths.map(async path => {
          const assetUrl = new URL(path, self.location.origin);
          if (assetUrl.origin !== self.location.origin) return;

          try {
            const assetResponse = await fetch(assetUrl.href);
            if (assetResponse.ok) {
              await cache.put(assetUrl.href, assetResponse);
            }
          } catch (error) {
            console.warn("Could not precache app asset:", path, error);
          }
        }));
      }
    } catch (error) {
      console.warn("App shell precache failed:", error);
    }

    await self.skipWaiting();
  })());
});

// Remove older versions of this app's cache and take control of open pages.
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith("nri-hub-shell-") && key !== SHELL_CACHE)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

// Never cache API requests or non-GET requests.
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  // Network-first navigation with the cached app shell as offline fallback.
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(SHELL_CACHE);
          await cache.put("/", response.clone());
        }
        return response;
      } catch (error) {
        const cached = await caches.match("/");
        if (cached) return cached;

        return new Response(
          "NRI Hub is not available offline yet. Open the app once while connected to the internet.",
          { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
        );
      }
    })());
    return;
  }

  // Cache-first for versioned Vite assets and app icons.
  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/icon-")
  ) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(SHELL_CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    })());
  }
});

// Firebase background notifications.
messaging.onBackgroundMessage(payload => {
  console.log("Received background message:", payload);

  const notificationTitle = payload.notification?.title || "New Notification";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "nri-notification",
    requireInteraction: true
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Clicking a notification focuses the existing app or opens it.
self.addEventListener("notificationclick", event => {
  event.notification.close();

  event.waitUntil((async () => {
    const windowClients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });

    for (const client of windowClients) {
      if ("focus" in client) return client.focus();
    }

    return self.clients.openWindow("/");
  })());
});
