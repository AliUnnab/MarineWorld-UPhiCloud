/**
 * Deprecated compatibility shim — all authentication logic now lives in authTypes.ts and firebaseAuthProvider.ts
 */

export * from "./authTypes";
import type { AuthContext, AuthProviderInterface } from "./authTypes";
import { firebaseAuthProvider } from "./firebaseAuthProvider";

export const developmentAuthProvider: AuthProviderInterface = firebaseAuthProvider;

export const CANONICAL_DEV_OWNER: AuthContext = {
  uid: "usr-owner-001",
  email: "owner@argento-marine.com",
  displayName: "Argento Marine Owner",
  emailVerified: true,
  isDevelopmentSession: false,
};

export const CANONICAL_DEV_USER: AuthContext = CANONICAL_DEV_OWNER;

export const CANONICAL_DEV_ADMIN: AuthContext = {
  uid: "usr-admin-002",
  email: "admin@argento-marine.com",
  displayName: "Argento Marine Admin",
  emailVerified: true,
  isDevelopmentSession: false,
};

export const CANONICAL_DEV_MEMBER: AuthContext = {
  uid: "usr-member-003",
  email: "member@argento-marine.com",
  displayName: "Argento Marine Member",
  emailVerified: true,
  isDevelopmentSession: false,
};

export const CANONICAL_DEV_VIEWER: AuthContext = {
  uid: "usr-viewer-004",
  email: "viewer@argento-marine.com",
  displayName: "Argento Marine Viewer",
  emailVerified: true,
  isDevelopmentSession: false,
};

export const CANONICAL_DEV_MULTI_ORG: AuthContext = {
  uid: "usr-multi-owner-003",
  email: "multi@maritime-group.com",
  displayName: "Multi-Organization Executive",
  emailVerified: true,
  isDevelopmentSession: false,
};

export const CANONICAL_DEV_NO_ORG: AuthContext = {
  uid: "usr-visitor-005",
  email: "visitor@test.com",
  displayName: "Unassigned Visitor",
  emailVerified: true,
  isDevelopmentSession: false,
};

export const CANONICAL_DEV_IDENTITIES = [
  {
    id: "owner",
    badge: "OWNER",
    name: "Argento Marine Owner",
    email: "owner@argento-marine.com",
    organizationName: "Argento Maritime Refit Ltd",
    role: "OWNER",
    accessLevel: "Full Authority",
    auth: CANONICAL_DEV_OWNER,
  },
];
