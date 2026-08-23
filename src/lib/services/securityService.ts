import type { CompanyMemberEntity, CompanyMemberRole, CompanyMemberStatus } from "@/lib/types";
import {
  developmentAuthProvider,
  type AuthContext,
  type AuthProviderInterface,
} from "@/lib/auth/developmentAuthProvider";
import { firebaseAuthProvider, isFirebaseConfigured } from "@/lib/auth/firebaseAuthProvider";
import {
  saveMember,
  findMember,
  findMembersByCompanyId,
  findMembersByUserId,
} from "@/lib/repositories/membershipRepository";
import { resetAllTrustStates } from "@/lib/services/personalTrustService";

export type { AuthContext, AuthProviderInterface };

/**
 * Production Firebase Authentication Provider & Multi-Tenant Authorization Service
 * Delegates authentication directly to canonical AuthProviderInterface (FirebaseAuthProvider when configured)
 * and membership queries to canonical membershipRepository.
 */

// Active auth provider: defaults to firebaseAuthProvider if configured, otherwise developmentAuthProvider.
let activeAuthProvider: AuthProviderInterface = isFirebaseConfigured()
  ? firebaseAuthProvider
  : developmentAuthProvider;

export function getActiveAuthProvider(): AuthProviderInterface {
  return activeAuthProvider;
}

export function setAuthProvider(provider: AuthProviderInterface): void {
  activeAuthProvider = provider;
}

export function setAuthProviderType(type: "FIREBASE" | "DEVELOPMENT"): void {
  if (type === "FIREBASE") {
    activeAuthProvider = firebaseAuthProvider;
  } else {
    activeAuthProvider = developmentAuthProvider;
  }
}

/**
 * Maps known corporate seed identities to their initial company memberships if matching email authenticates via Firebase
 */
export function resolveAndLinkSeedMemberships(auth: AuthContext): void {
  if (!auth.uid || !auth.email) return;
  const email = auth.email.toLowerCase().trim();
  const existingMemberships = findMembersByUserId(auth.uid);
  if (existingMemberships.length > 0) return;

  const now = new Date().toISOString();
  if (
    email === "owner@argento-marine.com" ||
    email === "sarah.chen@pacific-maritime.com" ||
    email === "sarah.chen@pacificmaritime.com" ||
    email === "owner@pacific-maritime.com"
  ) {
    saveMember({
      userId: auth.uid,
      companyId: "argento-marine",
      role: "OWNER",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });
  } else if (email === "admin@argento-marine.com") {
    saveMember({
      userId: auth.uid,
      companyId: "argento-marine",
      role: "ADMIN",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });
  } else if (email === "member@argento-marine.com") {
    saveMember({
      userId: auth.uid,
      companyId: "argento-marine",
      role: "MEMBER",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });
  } else if (email === "viewer@argento-marine.com") {
    saveMember({
      userId: auth.uid,
      companyId: "argento-marine",
      role: "VIEWER",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });
  } else if (email === "multi@maritime-group.com") {
    saveMember({
      userId: auth.uid,
      companyId: "argento-marine",
      role: "OWNER",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });
    saveMember({
      userId: auth.uid,
      companyId: "crest-group-materials",
      role: "MEMBER",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });
    saveMember({
      userId: auth.uid,
      companyId: "maritime-association",
      role: "ADMIN",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });
  }
}

export function getCurrentAuthSession(): AuthContext {
  return activeAuthProvider.getCurrentUser();
}

export function setCurrentAuthSession(auth: AuthContext): void {
  if (activeAuthProvider.setCurrentUser) {
    activeAuthProvider.setCurrentUser(auth);
  }
  resolveAndLinkSeedMemberships(auth);
}

export function clearCurrentAuthSession(): void {
  if (activeAuthProvider.clearCurrentUser) {
    activeAuthProvider.clearCurrentUser();
  }
  resetAllTrustStates();
}

export async function signInWithEmail(email: string, password: string): Promise<AuthContext> {
  if (activeAuthProvider.signInWithEmailAndPassword) {
    const auth = await activeAuthProvider.signInWithEmailAndPassword(email, password);
    resolveAndLinkSeedMemberships(auth);
    return auth;
  }
  throw new Error("Email/Password sign-in is not supported by the active authentication provider.");
}

export async function createUserWithEmail(email: string, password: string, displayName?: string): Promise<AuthContext> {
  if (activeAuthProvider.createUserWithEmailAndPassword) {
    const auth = await activeAuthProvider.createUserWithEmailAndPassword(email, password, displayName);
    resolveAndLinkSeedMemberships(auth);
    return auth;
  }
  throw new Error("Account creation is not supported by the active authentication provider.");
}

export async function signOutCurrentUser(): Promise<void> {
  if (activeAuthProvider.signOut) {
    await activeAuthProvider.signOut();
  } else if (activeAuthProvider.clearCurrentUser) {
    activeAuthProvider.clearCurrentUser();
  }
  resetAllTrustStates();
}

export function subscribeAuthState(callback: (user: AuthContext) => void): () => void {
  return activeAuthProvider.onAuthStateChanged((user) => {
    if (user && user.uid) {
      resolveAndLinkSeedMemberships(user);
    }
    callback(user);
  });
}

export function getAuthenticatedUserId(): string | null {
  return activeAuthProvider.getCurrentUser().uid;
}

/**
 * Register a user membership for authorization evaluation
 */
export function registerCompanyMember(member: CompanyMemberEntity): void {
  saveMember(member);
}

/**
 * Get all members registered for a company
 */
export function getCompanyMembers(companyId: string): CompanyMemberEntity[] {
  return findMembersByCompanyId(companyId);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(auth: AuthContext): boolean {
  return Boolean(auth && auth.uid !== null && auth.uid !== "");
}

/**
 * Check if user is an active member of a company
 */
export function isCompanyMember(companyId: string, auth: AuthContext): boolean {
  if (!isAuthenticated(auth) || !auth.uid) return false;
  const m = findMember(companyId, auth.uid);
  return Boolean(m && m.status === "ACTIVE");
}

/**
 * Get user's member record for a company
 */
export function getCompanyMember(companyId: string, auth: AuthContext): CompanyMemberEntity | undefined {
  if (!isAuthenticated(auth) || !auth.uid) return undefined;
  return findMember(companyId, auth.uid);
}

/**
 * Check if member has one of the allowed roles
 */
export function hasCompanyRole(companyId: string, allowedRoles: CompanyMemberRole[], auth: AuthContext): boolean {
  const member = getCompanyMember(companyId, auth);
  if (!member) return false;
  return allowedRoles.includes(member.role);
}

export function isCompanyOwner(companyId: string, auth: AuthContext): boolean {
  return hasCompanyRole(companyId, ["OWNER"], auth);
}

export function isCompanyAdmin(companyId: string, auth: AuthContext): boolean {
  return hasCompanyRole(companyId, ["OWNER", "ADMIN"], auth);
}

export function isCompanyManager(companyId: string, auth: AuthContext): boolean {
  return hasCompanyRole(companyId, ["OWNER", "ADMIN", "MANAGER"], auth);
}

export function isCompanyOperations(companyId: string, auth: AuthContext): boolean {
  return hasCompanyRole(companyId, ["OWNER", "ADMIN", "MANAGER", "OPERATIONS"], auth);
}

export function isCompanySales(companyId: string, auth: AuthContext): boolean {
  return hasCompanyRole(companyId, ["OWNER", "ADMIN", "MANAGER", "SALES"], auth);
}

/**
 * Deterministic Firestore Security Rule Evaluation Simulator
 * Directly mirrors the exact security boundary logic defined in firestore.rules
 */
export function evaluateFirestoreAccess(
  path: string,
  operation: "read" | "create" | "update" | "delete",
  auth: AuthContext,
  resourceData?: Record<string, any>,
  requestData?: Record<string, any>
): { allowed: boolean; reason: string } {
  const cleanPath = path.trim().replace(/^\//, "");
  const segments = cleanPath.split("/");

  // 0. USERS COLLECTION & BUSINESS ID REGISTRY
  if (segments[0] === "users") {
    const targetUid = segments[1];
    if (operation === "read") {
      if (isAuthenticated(auth) && auth.uid === targetUid) {
        return { allowed: true, reason: "User can read own profile." };
      }
      return { allowed: false, reason: "Cross-user profile read denied." };
    }
    if (operation === "create" || operation === "update") {
      if (!isAuthenticated(auth) || auth.uid !== targetUid) {
        return { allowed: false, reason: "Cannot create or update another user profile." };
      }
      if (requestData && (requestData.password || requestData.firebaseTokens || requestData.secrets)) {
        return { allowed: false, reason: "Prohibited credentials field in user payload." };
      }
      if (operation === "update" && resourceData && requestData?.uid !== resourceData.uid) {
        return { allowed: false, reason: "Cannot alter user UID." };
      }
      return { allowed: true, reason: "User profile updated." };
    }
    if (operation === "delete") {
      return { allowed: false, reason: "User document deletion prohibited." };
    }
  }

  if (segments[0] === "businessIds") {
    if (operation === "read") {
      if (isAuthenticated(auth)) return { allowed: true, reason: "Authenticated businessId lookup permitted." };
      return { allowed: false, reason: "Unauthenticated businessId lookup denied." };
    }
    return { allowed: false, reason: "Client write on businessIds collection prohibited." };
  }

  // 1. GLOBAL REGISTRIES (/platforms, /sectors, /sectorCities)
  if (segments[0] === "platforms" || segments[0] === "sectors" || segments[0] === "sectorCities") {
    if (operation === "read") {
      return { allowed: true, reason: "Public read permitted on global platform registries." };
    } else {
      return { allowed: false, reason: "Public write prohibited on global platform registries." };
    }
  }

  // 2. COMPANY HIERARCHY (/companies/{companyId}/...)
  if (segments[0] === "companies") {
    const companyId = segments[1];
    if (!companyId) {
      return { allowed: false, reason: "Invalid company path." };
    }

    // Direct /companies/{companyId} document
    if (segments.length === 2) {
      if (operation === "read") {
        return { allowed: true, reason: "Public company identity profile is readable." };
      }
      if (operation === "create") {
        if (!isAuthenticated(auth)) {
          return { allowed: false, reason: "Unauthenticated user cannot create company profile." };
        }
        if (requestData?.lifecycleStatus === "ACTIVE" || requestData?.status === "ACTIVE") {
          return { allowed: false, reason: "Cannot create company directly in ACTIVE status." };
        }
        return { allowed: true, reason: "Authenticated user can create company profile." };
      }
      if (operation === "update") {
        if (!isCompanyAdmin(companyId, auth)) {
          return { allowed: false, reason: "Only company ADMIN or OWNER can update company profile." };
        }
        // Protect canonical IDs
        if (requestData && resourceData) {
          if (
            requestData.id !== resourceData.id ||
            requestData.platformId !== resourceData.platformId ||
            requestData.sectorId !== resourceData.sectorId ||
            requestData.primarySectorCityId !== resourceData.primarySectorCityId
          ) {
            return { allowed: false, reason: "Cannot alter canonical identity fields (id, platformId, sectorId)." };
          }
          if (resourceData.businessId && requestData.businessId !== resourceData.businessId) {
            return { allowed: false, reason: "Cannot alter existing Business ID." };
          }
          if (resourceData.lifecycleStatus && requestData.lifecycleStatus !== resourceData.lifecycleStatus) {
            return { allowed: false, reason: "Cannot alter lifecycleStatus directly via client payload." };
          }
          if (resourceData.status && requestData.status !== resourceData.status) {
            return { allowed: false, reason: "Cannot alter operational status directly via client payload." };
          }
        }
        return { allowed: true, reason: "Company ADMIN updated company profile." };
      }
      if (operation === "delete") {
        if (!isCompanyOwner(companyId, auth)) {
          return { allowed: false, reason: "Only company OWNER can delete company profile." };
        }
        return { allowed: true, reason: "Company OWNER deleted company profile." };
      }
    }

    // Subcollections: /companies/{companyId}/{subcollection}/{subId}
    const subcollection = segments[2];
    const subId = segments[3];

    if (subcollection === "members") {
      if (operation === "read") {
        if (!isCompanyMember(companyId, auth)) {
          return { allowed: false, reason: "Cross-tenant or unauthenticated access to member list denied." };
        }
        return { allowed: true, reason: "Company member can read member list." };
      }
      if (operation === "create") {
        if (!isAuthenticated(auth)) {
          return { allowed: false, reason: "Unauthenticated member creation denied." };
        }
        if (requestData?.role === "OWNER" || requestData?.role === "ADMIN") {
          if (!isCompanyAdmin(companyId, auth)) {
            return { allowed: false, reason: "Cannot self-assign or grant OWNER/ADMIN without existing ADMIN role." };
          }
        }
        if (requestData?.companyId !== companyId) {
          return { allowed: false, reason: "Member companyId must match parent company tenant ID." };
        }
        return { allowed: true, reason: "Member creation permitted." };
      }
      if (operation === "update") {
        if (!isCompanyAdmin(companyId, auth)) {
          return { allowed: false, reason: "Only company ADMIN or OWNER can update member records." };
        }
        // Cannot modify own role
        if (auth.uid === subId && requestData?.role !== resourceData?.role) {
          return { allowed: false, reason: "A company member cannot modify their own role." };
        }
        // Cannot assign OWNER unless current user is existing OWNER
        if (requestData?.role === "OWNER" && !isCompanyOwner(companyId, auth)) {
          return { allowed: false, reason: "Only existing OWNER can assign new OWNER role." };
        }
        // Immutable user/company identity
        if (requestData?.userId !== resourceData?.userId || requestData?.companyId !== resourceData?.companyId) {
          return { allowed: false, reason: "Cannot alter member userId or companyId." };
        }
        return { allowed: true, reason: "Member role update permitted." };
      }
      if (operation === "delete") {
        if (!isCompanyAdmin(companyId, auth)) {
          return { allowed: false, reason: "Only company ADMIN or OWNER can delete members." };
        }
        if (resourceData?.role === "OWNER" && !isCompanyOwner(companyId, auth)) {
          return { allowed: false, reason: "Cannot delete final/target OWNER unless performed by existing OWNER." };
        }
        return { allowed: true, reason: "Member deleted." };
      }
    }

    if (subcollection === "nodes") {
      if (operation === "read") {
        if (resourceData?.visibility === "PUBLIC") return { allowed: true, reason: "Public node read permitted." };
        if (!isCompanyMember(companyId, auth)) return { allowed: false, reason: "Private node read denied for non-member." };
        return { allowed: true, reason: "Member node read permitted." };
      }
      if (operation === "create" || operation === "update") {
        if (!isCompanyOperations(companyId, auth)) {
          return { allowed: false, reason: "Operations role or higher required for node mutation." };
        }
        if (requestData?.companyId !== companyId) {
          return { allowed: false, reason: "Cross-tenant node assignment denied." };
        }
        if (operation === "update" && resourceData && requestData?.companyId !== resourceData?.companyId) {
          return { allowed: false, reason: "Cannot change node parent companyId." };
        }
        return { allowed: true, reason: "Node mutation permitted." };
      }
      if (operation === "delete") {
        if (!isCompanyAdmin(companyId, auth)) return { allowed: false, reason: "Admin role required to delete node." };
        return { allowed: true, reason: "Node deleted." };
      }
    }

    if (subcollection === "products") {
      if (operation === "read") {
        if (resourceData?.status === "ACTIVE" || resourceData?.visibility === "PUBLIC") {
          return { allowed: true, reason: "Public product read permitted." };
        }
        if (!isCompanyMember(companyId, auth)) return { allowed: false, reason: "Private product read denied for non-members." };
        return { allowed: true, reason: "Member product read permitted." };
      }
      if (operation === "create" || operation === "update") {
        if (!isCompanyOperations(companyId, auth)) {
          return { allowed: false, reason: "Operations role required for product mutation." };
        }
        if (requestData?.companyId !== companyId) {
          return { allowed: false, reason: "Cross-tenant product assignment denied." };
        }
        if (operation === "update" && resourceData && requestData?.companyId !== resourceData?.companyId) {
          return { allowed: false, reason: "Cannot alter product parent companyId." };
        }
        return { allowed: true, reason: "Product mutation permitted." };
      }
      if (operation === "delete") {
        if (!isCompanyManager(companyId, auth)) return { allowed: false, reason: "Manager role required to delete product." };
        return { allowed: true, reason: "Product deleted." };
      }
    }

    if (subcollection === "services") {
      if (operation === "read") {
        if (resourceData?.status === "ACTIVE" || resourceData?.visibility === "PUBLIC") {
          return { allowed: true, reason: "Public service read permitted." };
        }
        if (!isCompanyMember(companyId, auth)) return { allowed: false, reason: "Private service read denied for non-members." };
        return { allowed: true, reason: "Member service read permitted." };
      }
      if (operation === "create" || operation === "update") {
        if (!isCompanyOperations(companyId, auth)) {
          return { allowed: false, reason: "Operations role required for service mutation." };
        }
        if (requestData?.companyId !== companyId) {
          return { allowed: false, reason: "Cross-tenant service assignment denied." };
        }
        if (operation === "update" && resourceData && requestData?.companyId !== resourceData?.companyId) {
          return { allowed: false, reason: "Cannot alter service parent companyId." };
        }
        return { allowed: true, reason: "Service mutation permitted." };
      }
      if (operation === "delete") {
        if (!isCompanyManager(companyId, auth)) return { allowed: false, reason: "Manager role required to delete service." };
        return { allowed: true, reason: "Service deleted." };
      }
    }

    if (subcollection === "connect") {
      if (operation === "read") {
        if (isCompanySales(companyId, auth)) return { allowed: true, reason: "Sales role can read connect records." };
        if (isAuthenticated(auth) && resourceData?.fromUserId === auth.uid) return { allowed: true, reason: "Sender can read own connect record." };
        return { allowed: false, reason: "Connect record read denied." };
      }
      if (operation === "create") {
        if (!isAuthenticated(auth)) return { allowed: false, reason: "Unauthenticated connect creation denied." };
        if (requestData?.companyId !== companyId || requestData?.toCompanyId !== companyId) {
          return { allowed: false, reason: "Target companyId mismatch in connect creation." };
        }
        if (requestData?.fromUserId !== auth.uid) {
          return { allowed: false, reason: "Cannot forge sender fromUserId." };
        }
        return { allowed: true, reason: "Connect creation permitted." };
      }
      if (operation === "update") {
        if (!isCompanySales(companyId, auth)) return { allowed: false, reason: "Sales role required to update connect status." };
        if (resourceData && requestData?.fromUserId !== resourceData.fromUserId) {
          return { allowed: false, reason: "Cannot alter original sender fromUserId." };
        }
        return { allowed: true, reason: "Connect update permitted." };
      }
      if (operation === "delete") {
        if (!isCompanyAdmin(companyId, auth)) return { allowed: false, reason: "Admin role required to delete connect records." };
        return { allowed: true, reason: "Connect record deleted." };
      }
    }

    if (subcollection === "businessTwin") {
      if (operation === "read") {
        if (resourceData?.visibility === "PUBLIC") return { allowed: true, reason: "Public projection read permitted." };
        if (!isCompanyMember(companyId, auth)) return { allowed: false, reason: "Private business twin read denied." };
        return { allowed: true, reason: "Member business twin read permitted." };
      }
      if (operation === "create" || operation === "update") {
        if (!isCompanyAdmin(companyId, auth)) return { allowed: false, reason: "Admin role required for business twin mutation." };
        if (requestData?.companyId !== companyId) return { allowed: false, reason: "Cross-tenant twin assignment denied." };
        return { allowed: true, reason: "Business twin mutation permitted." };
      }
      if (operation === "delete") {
        if (!isCompanyOwner(companyId, auth)) return { allowed: false, reason: "Owner role required to delete business twin." };
        return { allowed: true, reason: "Business twin deleted." };
      }
    }
  }

  // 3. COMPANY ANALYTICS (/companyAnalytics/{companyId}/events/{eventId})
  if (segments[0] === "companyAnalytics") {
    const companyId = segments[1];
    if (operation === "read") {
      if (!isCompanyManager(companyId, auth)) return { allowed: false, reason: "Manager role required to read analytics." };
      return { allowed: true, reason: "Analytics read permitted." };
    }
    if (operation === "create") {
      if (!isCompanyMember(companyId, auth)) return { allowed: false, reason: "Active company member required to log telemetry." };
      if (requestData?.companyId !== companyId) return { allowed: false, reason: "Analytics companyId mismatch." };
      return { allowed: true, reason: "Telemetry logged." };
    }
    if (operation === "update") {
      return { allowed: false, reason: "Analytics logs are immutable." };
    }
    if (operation === "delete") {
      if (!isCompanyAdmin(companyId, auth)) return { allowed: false, reason: "Admin role required to purge analytics." };
      return { allowed: true, reason: "Analytics purged." };
    }
  }

  // 4. AI INTERACTIONS (/aiInteractions/{interactionId})
  if (segments[0] === "aiInteractions") {
    if (operation === "read") {
      if (!isAuthenticated(auth)) return { allowed: false, reason: "Unauthenticated AI log read denied." };
      if (resourceData?.userId === auth.uid) return { allowed: true, reason: "User can read own AI interaction log." };
      if (resourceData?.companyId && isCompanyAdmin(resourceData.companyId, auth)) {
        return { allowed: true, reason: "Company Admin can read company AI interaction log." };
      }
      return { allowed: false, reason: "Cross-user or cross-tenant AI log read denied." };
    }
    if (operation === "create") {
      if (!isAuthenticated(auth)) return { allowed: false, reason: "Unauthenticated AI log creation denied." };
      if (requestData?.userId !== auth.uid) return { allowed: false, reason: "Cannot forge AI log userId." };
      if (!requestData?.companyId || !isCompanyMember(requestData.companyId, auth)) {
        return { allowed: false, reason: "User must be active member of target company to create AI log." };
      }
      return { allowed: true, reason: "AI log creation permitted." };
    }
    if (operation === "update" || operation === "delete") {
      return { allowed: false, reason: "AI interaction logs are immutable." };
    }
  }

  return { allowed: false, reason: "Default catch-all deny rule triggered." };
}
