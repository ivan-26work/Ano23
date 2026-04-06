importScripts("https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDYERQj-l0iPs2hq5irQ1HVnmJdSoQxehk",
  authDomain: "whois-d77c0.firebaseapp.com",
  projectId: "whois-d77c0",
  storageBucket: "whois-d77c0.firebasestorage.app",
  messagingSenderId: "460182233733",
  appId: "1:460182233733:web:4f9b147c545bfabeea3fec",
  measurementId: "G-C0BMSTL224"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Message reçu:', payload);
  
  const notificationTitle = payload.notification?.title || 'whois';
  const notificationOptions = {
    body: payload.notification?.body || 'Nouveau message anonyme',
    icon: './images/icon.png',
    badge: './images/badge.png',
    vibrate: [200, 100, 200],
    data: { url: './index.html' }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});