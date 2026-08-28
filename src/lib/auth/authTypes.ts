/**
 * MarineWorld.City — Canonical Authentication Types
 */

export interface AuthContext {
  uid: string | null;
  email?: string;
  displayName?: string;
  photoURL?: string;
  emailVerified?: boolean;
  isAnonymous?: boolean;
  isDevelopmentSession?: boolean;
  providerId?: string;
}

export type AuthStateCallback = (user: AuthContext) => void;

export interface AuthProviderInterface {
  getProviderType(): "FIREBASE";
  isConnected?(): boolean;
  getCurrentUser(): AuthContext;
  setCurrentUser?(user: AuthContext): void;
  clearCurrentUser?(): void;
  signInWithEmailAndPassword?(email: string, password: string): Promise<AuthContext>;
  createUserWithEmailAndPassword?(email: string, password: string, displayName?: string): Promise<AuthContext>;
  signOut(): Promise<void>;
  onAuthStateChanged(callback: AuthStateCallback): () => void;
}
