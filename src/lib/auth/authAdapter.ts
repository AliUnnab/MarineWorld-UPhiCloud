/**
 * MarineWorld.City — Pure Firebase Authentication Adapter
 * Pipeline: Firebase Auth Provider -> securityService -> membershipRepository
 */

import type {
  AuthContext,
  AuthStateCallback,
  AuthProviderInterface,
} from "./authTypes";
import {
  firebaseAuthProvider,
  FirebaseAuthProvider,
} from "./firebaseAuthProvider";
import {
  getActiveAuthProvider,
} from "@/lib/services/securityService";

export type AuthProviderType = "FIREBASE";
export type AuthAdapter = AuthProviderInterface;

export function getActiveAuthAdapter(): AuthProviderInterface {
  return getActiveAuthProvider();
}

export function setAuthAdapterProvider(_type: AuthProviderType | string): void {
  // Pure Firebase Auth provider
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
  firebaseAuthProvider,
  FirebaseAuthProvider,
};
export type { AuthContext, AuthProviderInterface, AuthStateCallback };
