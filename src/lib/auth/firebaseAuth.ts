/**
 * Stage 3.3 — Real Firebase Authentication Provider
 * Configures Firebase Auth with Google Sign-In for MarineWorld.City.
 * Real Firebase UID, real Google provider, zero Firestore connection.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type Auth,
  type User as FirebaseUser,
  type UserCredential,
} from "firebase/auth";
import type { AuthContext } from "./developmentAuthProvider";

const env = (typeof import.meta !== "undefined" && (import.meta as unknown as { env?: Record<string, string> }).env) || {};

// Firebase client configuration
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyMarineWorldCityProdKey2026",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "marineworld-city.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "marineworld-city",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "marineworld-city.appspot.com",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "402495042043",
  appId: env.VITE_FIREBASE_APP_ID || "1:402495042043:web:marineworld72890134",
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.apiKey !== "AIzaSyMarineWorldCityProdKey2026" &&
      firebaseConfig.projectId &&
      firebaseConfig.projectId !== "marineworld-city"
  );
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.addScope("email");
googleAuthProvider.addScope("profile");
googleAuthProvider.setCustomParameters({
  prompt: "select_account",
});

export function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    if (getApps().length > 0) {
      appInstance = getApp();
    } else {
      appInstance = initializeApp(firebaseConfig);
    }
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    const app = getFirebaseApp();
    authInstance = getAuth(app);
  }
  return authInstance;
}

export function getGoogleAuthProvider(): GoogleAuthProvider {
  return googleAuthProvider;
}

export function mapFirebaseUserToAuthContext(user: FirebaseUser | null): AuthContext {
  if (!user) {
    return {
      uid: null,
      email: undefined,
      displayName: undefined,
      photoURL: undefined,
      emailVerified: false,
      isDevelopmentSession: false,
    };
  }

  return {
    uid: user.uid,
    email: user.email || undefined,
    displayName: user.displayName || user.email?.split("@")[0] || "Authenticated User",
    photoURL: user.photoURL || undefined,
    emailVerified: user.emailVerified,
    isDevelopmentSession: false,
    providerId: user.providerData?.[0]?.providerId || "google.com",
  };
}

/**
 * Execute real Google Sign-In with popup
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  const provider = getGoogleAuthProvider();
  return await signInWithPopup(auth, provider);
}

/**
 * Execute real Firebase Sign-Out
 */
export async function signOutFirebase(): Promise<void> {
  const auth = getFirebaseAuth();
  await firebaseSignOut(auth);
}

/**
 * Listen to real Firebase auth state changes
 */
export function onFirebaseAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}
