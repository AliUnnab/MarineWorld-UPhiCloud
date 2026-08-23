/**
 * Stage 1 Correction — Development Authentication Provider
 * Explicit simulation of authentication state for DEVELOPMENT PERSISTENCE MODE.
 * Provides clean abstractions matching future Firebase Auth listeners without hardcoding production secrets.
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
  getProviderType(): "FIREBASE" | "DEVELOPMENT";
  isConnected?(): boolean;
  getCurrentUser(): AuthContext;
  setCurrentUser?(user: AuthContext): void;
  clearCurrentUser?(): void;
  signInWithEmailAndPassword?(email: string, password: string): Promise<AuthContext>;
  createUserWithEmailAndPassword?(email: string, password: string, displayName?: string): Promise<AuthContext>;
  signOut(): Promise<void>;
  onAuthStateChanged(callback: AuthStateCallback): () => void;
}

export type DevelopmentAuthProvider = AuthProviderInterface;

export interface DevelopmentIdentityFixture {
  id: string;
  badge: string;
  name: string;
  email: string;
  organizationName: string;
  role: string;
  accessLevel: string;
  auth: AuthContext;
}

export const CANONICAL_DEV_OWNER: AuthContext = {
  uid: "usr-owner-001",
  email: "owner@argento-marine.com",
  displayName: "Argento Marine Owner",
  emailVerified: true,
  isDevelopmentSession: true,
};

export const CANONICAL_DEV_USER: AuthContext = CANONICAL_DEV_OWNER;

export const CANONICAL_DEV_ADMIN: AuthContext = {
  uid: "usr-admin-002",
  email: "admin@argento-marine.com",
  displayName: "Argento Marine Admin",
  emailVerified: true,
  isDevelopmentSession: true,
};

export const CANONICAL_DEV_MEMBER: AuthContext = {
  uid: "usr-member-003",
  email: "member@argento-marine.com",
  displayName: "Argento Marine Member",
  emailVerified: true,
  isDevelopmentSession: true,
};

export const CANONICAL_DEV_VIEWER: AuthContext = {
  uid: "usr-viewer-004",
  email: "viewer@argento-marine.com",
  displayName: "Argento Marine Viewer",
  emailVerified: true,
  isDevelopmentSession: true,
};

export const CANONICAL_DEV_MULTI_ORG: AuthContext = {
  uid: "usr-multi-owner-003",
  email: "multi@maritime-group.com",
  displayName: "Multi-Organization Executive",
  emailVerified: true,
  isDevelopmentSession: true,
};

export const CANONICAL_DEV_NO_ORG: AuthContext = {
  uid: "usr-visitor-005",
  email: "visitor@test.com",
  displayName: "Unassigned Visitor",
  emailVerified: true,
  isDevelopmentSession: true,
};

export const CANONICAL_DEV_IDENTITIES: DevelopmentIdentityFixture[] = [
  {
    id: "owner",
    badge: "OWNER",
    name: "Argento Marine Owner",
    email: "owner@argento-marine.com",
    organizationName: "Argento Marine",
    role: "OWNER",
    accessLevel: "Full Autonomous Control & Studio Management",
    auth: CANONICAL_DEV_OWNER,
  },
  {
    id: "admin",
    badge: "ADMIN",
    name: "Argento Marine Admin",
    email: "admin@argento-marine.com",
    organizationName: "Argento Marine",
    role: "ADMIN",
    accessLevel: "Administrative & Operations Management",
    auth: CANONICAL_DEV_ADMIN,
  },
  {
    id: "member",
    badge: "MEMBER",
    name: "Argento Marine Member",
    email: "member@argento-marine.com",
    organizationName: "Argento Marine",
    role: "MEMBER",
    accessLevel: "Operational Execution & Catalogs",
    auth: CANONICAL_DEV_MEMBER,
  },
  {
    id: "viewer",
    badge: "VIEWER",
    name: "Argento Marine Viewer",
    email: "viewer@argento-marine.com",
    organizationName: "Argento Marine",
    role: "VIEWER",
    accessLevel: "Read-Only Intelligence & Performance Monitoring",
    auth: CANONICAL_DEV_VIEWER,
  },
  {
    id: "multi-org",
    badge: "MULTI-ORG",
    name: "Multi-Organization Executive",
    email: "multi@maritime-group.com",
    organizationName: "Multiple Organizations (3)",
    role: "OWNER / ADMIN / MEMBER",
    accessLevel: "Multi-Tenant Enterprise Switching",
    auth: CANONICAL_DEV_MULTI_ORG,
  },
  {
    id: "no-org",
    badge: "INDIVIDUAL",
    name: "Unassigned Visitor",
    email: "visitor@test.com",
    organizationName: "No organization",
    role: "VISITOR",
    accessLevel: "Public Exploration & Onboarding Entry Only",
    auth: CANONICAL_DEV_NO_ORG,
  },
];

class DevelopmentAuthProviderImpl implements DevelopmentAuthProvider {
  private currentSession: AuthContext = {
    uid: null,
    email: undefined,
    displayName: undefined,
    isDevelopmentSession: true,
  };
  private listeners: Set<AuthStateCallback> = new Set();

  public getProviderType(): "DEVELOPMENT" {
    return "DEVELOPMENT";
  }

  public getCurrentUser(): AuthContext {
    return { ...this.currentSession };
  }

  public setCurrentUser(user: AuthContext): void {
    this.currentSession = {
      ...user,
      isDevelopmentSession: true,
    };
    this.notifyListeners();
  }

  public clearCurrentUser(): void {
    this.currentSession = {
      uid: null,
      email: undefined,
      displayName: undefined,
      isDevelopmentSession: true,
    };
    this.notifyListeners();
  }

  public async signInWithEmailAndPassword(
    email: string,
    _password?: string
  ): Promise<AuthContext> {
    const trimmed = email.trim().toLowerCase();
    const matched = CANONICAL_DEV_IDENTITIES.find(
      (id) => id.email.toLowerCase() === trimmed
    );
    if (matched) {
      this.setCurrentUser(matched.auth);
      return matched.auth;
    }
    // Generic email fallback or newly registered user
    const derivedName = trimmed.includes("@") ? trimmed.split("@")[0] : "Personal User";
    const dynamicUser: AuthContext = {
      uid: `usr-personal-${trimmed.replace(/[^a-z0-9]/g, "-")}`,
      email: trimmed,
      displayName: derivedName.charAt(0).toUpperCase() + derivedName.slice(1),
      emailVerified: true,
      isDevelopmentSession: true,
    };
    this.setCurrentUser(dynamicUser);
    return dynamicUser;
  }

  public async createUserWithEmailAndPassword(
    email: string,
    _password?: string,
    displayName?: string
  ): Promise<AuthContext> {
    const trimmed = email.trim().toLowerCase();
    const derivedName = displayName?.trim() || (trimmed.includes("@") ? trimmed.split("@")[0] : "Personal User");
    const formattedName =
      displayName?.trim() ||
      derivedName.charAt(0).toUpperCase() + derivedName.slice(1);

    const newUser: AuthContext = {
      uid: `usr-personal-${trimmed.replace(/[^a-z0-9]/g, "-")}`,
      email: trimmed,
      displayName: formattedName,
      emailVerified: true,
      isDevelopmentSession: true,
    };

    this.setCurrentUser(newUser);
    return newUser;
  }

  public async signOut(): Promise<void> {
    this.clearCurrentUser();
  }

  public onAuthStateChanged(callback: AuthStateCallback): () => void {
    this.listeners.add(callback);
    callback(this.getCurrentUser());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    const session = this.getCurrentUser();
    this.listeners.forEach((cb) => cb(session));
  }
}

export const developmentAuthProvider: DevelopmentAuthProvider = new DevelopmentAuthProviderImpl();
