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

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const requestPermission = async (API) => {
  try {
    console.log('Requesting notification permission...');
    
    // Register service worker
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker registered');
    }

    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notification permission granted');
      
      // Get FCM token
      const token = await getToken(messaging, {
        vapidPublicKey: "BHbsYMqNjlGJZMFf5OHkUoGpNHTI-momRRB3OGAIkFVjcSZFPU8dVXZ2mOdq1Gk8hSeUEl8Mpn0L-KQ0OKJeicw"
      });

      console.log('FCM Token:', token);

      // Save token to backend
      if (token) {
        try {
          const studentInfo = JSON.parse(localStorage.getItem("studentInfo"));
          await fetch(`${API}/api/notifications/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token,
              rollNo: studentInfo?.rollNo,
              name: studentInfo?.name
            })
          });
          console.log('Token saved to backend');
        } catch (err) {
          console.error('Error saving token:', err);
        }
      }

      // Listen for foreground messages (app open)
      onMessage(messaging, (payload) => {
        console.log('Foreground message:', payload);
        
        // Show notification even when app is open
        if ('serviceWorker' in navigator) {
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
        }
      });
    } else {
      console.log('Notification permission denied');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};