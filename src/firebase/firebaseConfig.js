import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

// Firebase configuration loaded from environment variables with fallback
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBa1Arilraettuqi_8IA0v4Qae0mwrkYjQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "anushabazaar-2288e.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://anushabazaar-2288e-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "anushabazaar-2288e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "anushabazaar-2288e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "64875938387",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:64875938387:web:0ae8c08c931e2dabba7ca6",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-HP45RKD0BT",
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Firebase Analytics (Browser safe)
let analyticsInstance = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analyticsInstance = getAnalytics(app);
    }
  }).catch(() => {});
}

export const analytics = analyticsInstance;
export default app;
