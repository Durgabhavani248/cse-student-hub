importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBrHw1QoS_7gzxMbbjjy3B0v68BClDw6c0",
  authDomain: "nri-cse-hub.firebaseapp.com",
  projectId: "nri-cse-hub",
  storageBucket: "nri-cse-hub.firebasestorage.app",
  messagingSenderId: "217692003992",
  appId: "1:217692003992:web:1fd087ac4d905bb83e7aed"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png"
  });
});