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

import {
  app as sharedApp,
  auth as sharedAuth,
  googleAuthProvider as sharedGoogleAuthProvider,
  firebaseConfig,
} from "@/lib/firebase";

export { firebaseConfig };

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId
  );
}

export const googleAuthProvider = sharedGoogleAuthProvider;

export function getFirebaseApp(): FirebaseApp {
  return sharedApp;
}

export function getFirebaseAuth(): Auth {
  return sharedAuth;
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
