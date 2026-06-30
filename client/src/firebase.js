import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyDEWQHws9UPDoXat4ge7H8BiysQgRyPtOA",
  authDomain: "nri-cse-hub.firebaseapp.com",
  projectId: "nri-cse-hub",
  storageBucket: "nri-cse-hub.appspot.com",
  messagingSenderId: "595280271547",
  appId: "1:595280271547:web:2f4e8e4f5e8f4a8e8f4a8e"
};

let messaging = null;

try {
  const app = initializeApp(firebaseConfig);
  messaging = getMessaging(app);
} catch (err) {
  console.log('Firebase initialization info:', err.message);
}

export const requestPermission = async (API) => {
  try {
    console.log('Starting notification setup...');

    // Check if Service Workers supported
    if (!('serviceWorker' in navigator)) {
      console.log('Service Workers not supported');
      return;
    }

    // Register Service Worker
    try {
      await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('✅ Service Worker registered');
    } catch (err) {
      console.error('Service Worker registration failed:', err);
      return;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);

    if (permission === 'granted' && messaging) {
      // Get FCM token
      const token = await getToken(messaging, {
        vapidPublicKey: "BHbsYMqNjlGJZMFf5OHkUoGpNHTI-momRRB3OGAIkFVjcSZFPU8dVXZ2mOdq1Gk8hSeUEl8Mpn0L-KQ0OKJeicw"
      });

      console.log('✅ FCM Token:', token);

      // Save to backend
      if (token) {
        try {
          const studentInfo = JSON.parse(localStorage.getItem("studentInfo"));
          const response = await fetch(`${API}/api/notifications/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token,
              rollNo: studentInfo?.rollNo,
              name: studentInfo?.name
            })
          });

          const data = await response.json();
          console.log('✅ Token saved to backend:', data);
        } catch (err) {
          console.error('Error saving token:', err);
        }
      }

      // Listen for foreground messages
      onMessage(messaging, (payload) => {
        console.log('Foreground message:', payload);
        
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(
            payload.notification.title,
            {
              body: payload.notification.body,
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              tag: 'nri-notification',
              requireInteraction: true
            }
          );
        });
      });
    }
  } catch (error) {
    console.error('Notification setup error:', error);
  }
};
