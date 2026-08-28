/**
 * MarineWorld.City — Production Firebase Authentication Provider
 * Implements AuthProviderInterface using Firebase Authentication SDK directly.
 */

import {
  signInWithEmailAndPassword as fbSignInWithEmailAndPassword,
  createUserWithEmailAndPassword as fbCreateUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  updateProfile,
  type Auth,
  type User as FirebaseUser,
} from "firebase/auth";
import { app, auth, firebaseConfig } from "@/lib/firebase";
import type { FirebaseApp } from "firebase/app";
import type {
  AuthContext,
  AuthStateCallback,
  AuthProviderInterface,
} from "./authTypes";

export { firebaseConfig };

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

export function getFirebaseApp(): FirebaseApp {
  return app;
}

export function getFirebaseAuth(): Auth {
  return auth;
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
    displayName: user.displayName || user.email?.split("@")[0] || "User",
    photoURL: user.photoURL || undefined,
    emailVerified: user.emailVerified,
    isAnonymous: user.isAnonymous,
    isDevelopmentSession: false,
    providerId: user.providerData?.[0]?.providerId || "password",
  };
}

const AUTH_STORAGE_KEY = "marineworld_auth_session";

function loadCachedSession(): AuthContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.uid) {
        return parsed as AuthContext;
      }
    }
  } catch (err) {
    console.warn("[FirebaseAuthProvider] Error loading cached session:", err);
  }
  return null;
}

function saveCachedSession(user: AuthContext | null): void {
  if (typeof window === "undefined") return;
  try {
    if (user && user.uid) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch (err) {
    console.warn("[FirebaseAuthProvider] Error saving cached session:", err);
  }
}

export class FirebaseAuthProvider implements AuthProviderInterface {
  private currentUser: AuthContext;
  private isInitialized: boolean = false;
  private initPromise: Promise<AuthContext>;
  private resolveInit!: (auth: AuthContext) => void;

  private listeners: Set<AuthStateCallback> = new Set();
  private unsubscribeNative: (() => void) | null = null;

  constructor() {
    const cached = loadCachedSession();
    this.currentUser = cached || {
      uid: null,
      email: undefined,
      displayName: undefined,
      photoURL: undefined,
      emailVerified: false,
      isAnonymous: false,
      isDevelopmentSession: false,
      providerId: undefined,
    };

    this.initPromise = new Promise<AuthContext>((resolve) => {
      this.resolveInit = resolve;
    });

    this.initNativeListener();
  }

  private initNativeListener(): void {
    if (typeof window === "undefined") {
      this.isInitialized = true;
      this.resolveInit(this.currentUser);
      return;
    }
    try {
      this.unsubscribeNative = fbOnAuthStateChanged(auth, (user) => {
        if (user) {
          this.currentUser = mapFirebaseUserToAuthContext(user);
          saveCachedSession(this.currentUser);
        } else {
          // If native Firebase user is null, check if we have a valid corporate/company session cached in localStorage
          const cached = loadCachedSession();
          if (cached && cached.uid) {
            this.currentUser = cached;
          } else {
            this.currentUser = {
              uid: null,
              email: undefined,
              displayName: undefined,
              photoURL: undefined,
              emailVerified: false,
              isAnonymous: false,
              isDevelopmentSession: false,
              providerId: undefined,
            };
            saveCachedSession(null);
          }
        }
        if (!this.isInitialized) {
          this.isInitialized = true;
          this.resolveInit(this.currentUser);
        }
        this.notifyListeners();
      });
    } catch (err) {
      console.warn("[FirebaseAuthProvider] Failed to attach native auth listener:", err);
      this.isInitialized = true;
      this.resolveInit(this.currentUser);
    }
  }

  private notifyListeners(): void {
    const snapshot = { ...this.currentUser };
    this.listeners.forEach((callback) => {
      try {
        callback(snapshot);
      } catch (err) {
        console.error("[FirebaseAuthProvider] Error in auth state callback:", err);
      }
    });
  }

  isAuthReady(): boolean {
    return this.isInitialized;
  }

  async waitForAuthReady(): Promise<AuthContext> {
    if (this.isInitialized) {
      return this.getCurrentUser();
    }
    return this.initPromise;
  }

  getProviderType(): "FIREBASE" {
    return "FIREBASE";
  }

  isConnected(): boolean {
    return isFirebaseConfigured();
  }

  getCurrentUser(): AuthContext {
    return { ...this.currentUser };
  }

  setCurrentUser(user: AuthContext): void {
    this.currentUser = { ...user };
    saveCachedSession(user.uid ? this.currentUser : null);
    this.notifyListeners();
  }

  clearCurrentUser(): void {
    this.currentUser = {
      uid: null,
      email: undefined,
      displayName: undefined,
      photoURL: undefined,
      emailVerified: false,
      isAnonymous: false,
      isDevelopmentSession: false,
      providerId: undefined,
    };
    saveCachedSession(null);
    this.notifyListeners();
  }

  async signInWithEmailAndPassword(email: string, pass: string): Promise<AuthContext> {
    const credential = await fbSignInWithEmailAndPassword(auth, email, pass);
    this.currentUser = mapFirebaseUserToAuthContext(credential.user);
    saveCachedSession(this.currentUser);
    this.notifyListeners();
    return this.currentUser;
  }

  async createUserWithEmailAndPassword(
    email: string,
    pass: string,
    displayName?: string
  ): Promise<AuthContext> {
    const credential = await fbCreateUserWithEmailAndPassword(auth, email, pass);
    if (displayName && credential.user) {
      await updateProfile(credential.user, { displayName });
    }
    this.currentUser = mapFirebaseUserToAuthContext(credential.user);
    saveCachedSession(this.currentUser);
    this.notifyListeners();
    return this.currentUser;
  }

  async signOut(): Promise<void> {
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.warn("[FirebaseAuthProvider] Native signOut warning:", err);
    }
    this.clearCurrentUser();
  }

  onAuthStateChanged(callback: AuthStateCallback): () => void {
    this.listeners.add(callback);
    callback(this.getCurrentUser());
    return () => {
      this.listeners.delete(callback);
    };
  }

  destroy(): void {
    if (this.unsubscribeNative) {
      this.unsubscribeNative();
      this.unsubscribeNative = null;
    }
    this.listeners.clear();
  }
}

export const firebaseAuthProvider = new FirebaseAuthProvider();

