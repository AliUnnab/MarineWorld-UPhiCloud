import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

function getEnv(key: string): string {
  if (typeof import.meta !== "undefined" && (import.meta as any).env?.[key]) {
    return (import.meta as any).env[key];
  }
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key] as string;
  }
  return "";
}

export const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY") || "AIzaSyDummyKeyForDevelopmentEnvironment00",
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN") || "",
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID") || "",
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET") || "",
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID") || "",
  appId: getEnv("VITE_FIREBASE_APP_ID") || "",
  measurementId: getEnv("VITE_FIREBASE_MEASUREMENT_ID") || "",
};

// Singleton App Instance
export const app: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Singleton Auth Instance
export const auth: Auth = (() => {
  try {
    return getAuth(app);
  } catch (err) {
    console.warn("[Firebase Auth] Auth initialization warning:", err);
    return getAuth(app);
  }
})();

// Singleton Firestore DB Instance with ignoreUndefinedProperties enabled
export const db: Firestore = (() => {
  try {
    return initializeFirestore(app, {
      ignoreUndefinedProperties: true,
    });
  } catch {
    return getFirestore(app);
  }
})();

// Singleton Storage Instance
export const storage: FirebaseStorage = getStorage(app);

// Singleton Google Auth Provider
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.addScope("email");
googleAuthProvider.addScope("profile");
googleAuthProvider.setCustomParameters({
  prompt: "select_account",
});

// Analytics (Safe check for browser SSR / Node environment)
let analyticsInstance: Analytics | null = null;
if (typeof window !== "undefined" && firebaseConfig.measurementId) {
  isSupported()
    .then((supported) => {
      if (supported) {
        try {
          analyticsInstance = getAnalytics(app);
        } catch (err) {
          console.debug("[Firebase Analytics] Skipped initialization:", err);
        }
      }
    })
    .catch(() => {
      // Analytics not supported in this environment
    });
}

export const analytics = analyticsInstance;

export default app;

