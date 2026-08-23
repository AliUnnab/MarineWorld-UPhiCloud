/**
 * Stage 3.3 — Clean Authentication Adapter
 * Orchestrates Firebase Authentication and Development Provider for MarineWorld.City.
 * Pipeline: Firebase Auth Provider -> securityService -> membershipRepository
 */

import type {
  AuthContext,
  AuthStateCallback,
  AuthProviderInterface,
} from "./developmentAuthProvider";
import {
  developmentAuthProvider,
  CANONICAL_DEV_USER,
} from "./developmentAuthProvider";
import {
  firebaseAuthProvider,
  FirebaseAuthProvider,
} from "./firebaseAuthProvider";
import {
  getActiveAuthProvider,
  setAuthProviderType,
} from "@/lib/services/securityService";

export type AuthProviderType = "FIREBASE" | "DEVELOPMENT";

export type AuthAdapter = AuthProviderInterface;

export function getActiveAuthAdapter(): AuthProviderInterface {
  return getActiveAuthProvider();
}

export function setAuthAdapterProvider(type: AuthProviderType): void {
  setAuthProviderType(type);
}

export function getCurrentAuthUser(): AuthContext {
  return getActiveAuthAdapter().getCurrentUser();
}

export async function signOutCurrentUser(): Promise<void> {
  const adapter = getActiveAuthAdapter();
  await adapter.signOut();
}

export function subscribeAuthState(callback: AuthStateCallback): () => void {
  return getActiveAuthAdapter().onAuthStateChanged(callback);
}

export {
  CANONICAL_DEV_USER,
  firebaseAuthProvider,
  developmentAuthProvider,
  FirebaseAuthProvider,
};
export type { AuthContext, AuthProviderInterface };
