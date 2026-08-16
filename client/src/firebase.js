import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyBHw1QoS_7gzxMbbjjy3B0v68BClDw6c0",
  authDomain: "nri-cse-hub.firebaseapp.com",
  projectId: "nri-cse-hub",
  storageBucket: "nri-cse-hub.firebasestorage.app",
  messagingSenderId: "217692003992",
  appId: "1:217692003992:web:1fd087ac4d905bb83e7aed",
  measurementId: "G-LHGYL4S4WS"
};

const VAPID_KEY = "BHbsYMqNjlGJZMFf5OHkUoGpNHTI-momRRB3OGAIkFVjcSZFPU8dVXZ2mOdq1Gk8hSeUEl8Mpn0L-KQ0OKJeicw";

let messagingInstance = null;

// Returns the current browser notification permission: "granted" | "denied" | "default"
// ("default" means the user hasn't been asked yet, or the browser doesn't support it)
export function getNotificationPermissionStatus() {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

async function getMessagingInstance() {
  if (messagingInstance) return messagingInstance;
  const supported = await isSupported().catch(() => false);
  if (!supported) {
    console.warn("⚠️ Firebase Messaging is not supported in this browser");
    return null;
  }
  const app = initializeApp(firebaseConfig);
  messagingInstance = getMessaging(app);
  return messagingInstance;
}

// Call this from a real user click (a button), not automatically on page load —
// most browsers silently ignore Notification.requestPermission() unless it's
// triggered directly by a user gesture like a click.
export const requestPermission = async (api, rollNo, name) => {
  console.log("🔔 [notifications] Starting setup...");

  if (!("serviceWorker" in navigator)) {
    console.warn("🔔 [notifications] Service Workers not supported in this browser");
    return { ok: false, reason: "no-service-worker" };
  }
  if (typeof Notification === "undefined") {
    console.warn("🔔 [notifications] Notification API not supported in this browser");
    return { ok: false, reason: "no-notification-api" };
  }

  try {
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    console.log("🔔 [notifications] Service Worker registered:", registration.scope);
  } catch (err) {
    console.error("🔔 [notifications] Service Worker registration FAILED:", err);
    return { ok: false, reason: "sw-registration-failed", error: err.message };
  }

  let permission;
  try {
    permission = await Notification.requestPermission();
    console.log("🔔 [notifications] Permission result:", permission);
  } catch (err) {
    console.error("🔔 [notifications] requestPermission() threw:", err);
    return { ok: false, reason: "permission-request-failed", error: err.message };
  }

  if (permission !== "granted") {
    console.warn("🔔 [notifications] Permission not granted:", permission);
    return { ok: false, reason: "permission-not-granted", permission };
  }

  const messaging = await getMessagingInstance();
  if (!messaging) {
    return { ok: false, reason: "messaging-unsupported" };
  }

  let token;
  try {
    token = await getToken(messaging, { vapidKey: VAPID_KEY });
    console.log("🔔 [notifications] FCM token obtained:", token ? token.slice(0, 20) + "..." : token);
  } catch (err) {
    console.error("🔔 [notifications] getToken() FAILED:", err);
    return { ok: false, reason: "get-token-failed", error: err.message };
  }

  if (!token) {
    console.warn("🔔 [notifications] getToken() returned empty token");
    return { ok: false, reason: "empty-token" };
  }

  try {
    const response = await fetch(`${api}/api/notifications/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, rollNo, name })
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("🔔 [notifications] Backend rejected token save:", data);
      return { ok: false, reason: "backend-save-failed", error: data.message };
    }
    console.log("🔔 [notifications] Token saved to backend ✅", data);
  } catch (err) {
    console.error("🔔 [notifications] Network error saving token:", err);
    return { ok: false, reason: "network-error", error: err.message };
  }

  // Foreground messages (app open and visible) — show as a native notification too
  onMessage(messaging, (payload) => {
    console.log("🔔 [notifications] Foreground message received:", payload);
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(payload.notification?.title || "NRI Hub", {
        body: payload.notification?.body || "",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "nri-notification",
        requireInteraction: true
      });
    });
  });

  console.log("🔔 [notifications] Setup complete ✅");
  return { ok: true, token };
};
