import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBrHw1QoS_7gzxMbbjjy3B0v68BClDw6c0",
  authDomain: "nri-cse-hub.firebaseapp.com",
  projectId: "nri-cse-hub",
  storageBucket: "nri-cse-hub.firebasestorage.app",
  messagingSenderId: "217692003992",
  appId: "1:217692003992:web:1fd087ac4d905bb83e7aed",
  measurementId: "G-LHGYL4S4WS"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const requestPermission = async (api) => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey: "BAGlz4OsK9Fi90MpdFPQI1HRXn8VXSM9CHnx2d_Q0VL0-Wr2gAWGwkGR-SKLbZTtYcOWPgr-GQOCixcmRm0GDbw"
      });

      if (token) {
        await fetch(`${api}/api/fcm-subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token })
        });
        console.log("FCM Token registered ✅");
      }
    }
  } catch (err) {
    console.log("FCM error:", err);
  }
};

export const onMessageListener = () =>
  new Promise(resolve => {
    onMessage(messaging, payload => resolve(payload));
  });