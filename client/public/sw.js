
// Import Firebase scripts (MANDATORY)
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// Firebase config (MUST MATCH your project)
firebase.initializeApp({
  apiKey: "AIzaSyBrHw1QoS_7gzxMbbjjy3B0v68BClDw6c0",
  authDomain: "nri-cse-hub.firebaseapp.com",
  projectId: "nri-cse-hub",
  storageBucket: "nri-cse-hub.firebasestorage.app",
  messagingSenderId: "217692003992",
  appId: "1:217692003992:web:1fd087ac4d905bb83e7aed"
});

// Messaging instance
const messaging = firebase.messaging();

// Background notification handler
messaging.onBackgroundMessage(function (payload) {
  console.log("Received background message ", payload);

  const notificationTitle = payload.notification?.title || "New Notification";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/icon-192.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});