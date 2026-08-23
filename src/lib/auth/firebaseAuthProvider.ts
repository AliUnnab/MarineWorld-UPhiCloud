/**
 * MarineWorld.City — Production Firebase Authentication Provider (Isolated Future Provider)
 * Implements AuthProviderInterface using Firebase Authentication SDK.
 * Disconnected / inert when Firebase configuration is not present.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword as fbSignInWithEmailAndPassword,
  createUserWithEmailAndPassword as fbCreateUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  updateProfile,
  type Auth,
  type User as FirebaseUser,
} from "firebase/auth";
import type {
  AuthContext,
  AuthStateCallback,
  AuthProviderInterface,
} from "./developmentAuthProvider";

const env =
  (typeof import.meta !== "undefined" &&
    (import.meta as unknown as { env?: Record<string, string> }).env) ||
  {};

// Firebase configuration for MarineWorld.City
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: env.VITE_FIREBASE_APP_ID || "",
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.apiKey !== "AIzaSyMarineWorldCityProdKey2026" &&
      firebaseConfig.projectId
  );
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;

/**
 * Initializes and returns the singleton Firebase App instance (only when configured)
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) {
    return null;
  }
  if (!appInstance) {
    if (getApps().length > 0) {
      appInstance = getApp();
    } else {
      appInstance = initializeApp(firebaseConfig);
    }
  }
  return appInstance;
}

/**
 * Initializes and returns the singleton Firebase Auth instance (only when configured)
 */
export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured()) {
    return null;
  }
  if (!authInstance) {
    const app = getFirebaseApp();
    if (app) {
      authInstance = getAuth(app);
    }
  }
  return authInstance;
}

/**
 * Maps a Firebase User object to the canonical AuthContext model
 */
export function mapFirebaseUserToAuthContext(user: FirebaseUser | null): AuthContext {
  if (!user) {
    return {
      uid: null,
      email: undefined,
      displayName: undefined,
      photoURL: undefined,
      emailVerified: false,
      isAnonymous: false,
      isDevelopmentSession: false,
      providerId: undefined,
    };
  }

  return {
    uid: user.uid,
    email: user.email || undefined,
    displayName:
      user.displayName ||
      (user.email ? user.email.split("@")[0] : "Authenticated User"),
    photoURL: user.photoURL || undefined,
    emailVerified: user.emailVerified,
    isAnonymous: Boolean(user.isAnonymous),
    isDevelopmentSession: false,
    providerId: user.providerData?.[0]?.providerId || "password",
  };
}

/**
 * Production FirebaseAuthProvider implementing AuthProviderInterface
 * Operates cleanly in disconnected state until Firebase project is provisioned.
 */
export class FirebaseAuthProvider implements AuthProviderInterface {
  public getProviderType(): "FIREBASE" {
    return "FIREBASE";
  }

  public isConnected(): boolean {
    return isFirebaseConfigured();
  }

  public getCurrentUser(): AuthContext {
    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        return {
          uid: null,
          email: undefined,
          displayName: undefined,
          photoURL: undefined,
          emailVerified: false,
          isDevelopmentSession: false,
        };
      }
      return mapFirebaseUserToAuthContext(auth.currentUser);
    } catch {
      return {
        uid: null,
        email: undefined,
        displayName: undefined,
        photoURL: undefined,
        emailVerified: false,
        isDevelopmentSession: false,
      };
    }
  }

  public async signInWithEmailAndPassword(
    email: string,
    password: string
  ): Promise<AuthContext> {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error("Firebase Authentication is not configured or connected yet.");
    }
    const cred = await fbSignInWithEmailAndPassword(auth, email.trim(), password);
    return mapFirebaseUserToAuthContext(cred.user);
  }

  public async createUserWithEmailAndPassword(
    email: string,
    password: string,
    displayName?: string
  ): Promise<AuthContext> {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error("Firebase Authentication is not configured or connected yet.");
    }
    const cred = await fbCreateUserWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );
    if (displayName && cred.user) {
      await updateProfile(cred.user, { displayName });
    }
    return mapFirebaseUserToAuthContext(cred.user);
  }

  public async signOut(): Promise<void> {
    const auth = getFirebaseAuth();
    if (auth) {
      await fbSignOut(auth);
    }
  }

  public onAuthStateChanged(callback: AuthStateCallback): () => void {
    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        callback(this.getCurrentUser());
        return () => {};
      }
      return fbOnAuthStateChanged(auth, (user) => {
        const mapped = mapFirebaseUserToAuthContext(user);
        callback(mapped);
      });
    } catch {
      callback(this.getCurrentUser());
      return () => {};
    }
  }
}

export const firebaseAuthProvider = new FirebaseAuthProvider();
