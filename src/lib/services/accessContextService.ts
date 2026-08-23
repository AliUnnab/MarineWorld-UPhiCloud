import type {
  AccessContext,
  AccessContextCapabilities,
  AccessContextType,
  ActiveOrganizationContext,
  CompanyMemberEntity,
  CompanyMemberRole,
  OrganizationEntityType,
  OrganizationalMembership,
  PersonalUserContext,
  VisitorSubtype,
} from "@/lib/types";
import { getCurrentAuthSession, getCompanyMembers, type AuthContext } from "@/lib/services/securityService";
import { getCompanyById, getOrganizationDigitalIdentity, generateBusinessId } from "@/lib/services/companyService";
import {
  findMembersByUserId,
  saveMember,
} from "@/lib/repositories/membershipRepository";
import { recordCanonicalAuditEvent, AuditModuleType } from "@/lib/services/auditService";

/**
 * Stage 1 Correction & Stage 3.5.1 — Identity & Access Context Resolver Service
 * Supports GUEST_VISITOR, PERSONAL_VISITOR, COMPANY, and ECOSYSTEM_ORGANIZATION contexts.
 */

const userActiveOrgMap = new Map<string, string>(); // userId -> active organizationId/companyId

/**
 * Derives a typed personal user identity model from AuthContext without duplicating canonical stores.
 */
export function derivePersonalUserContext(auth: AuthContext): PersonalUserContext | null {
  if (!auth || !auth.uid) {
    return null;
  }
  const email = auth.email;
  const derivedName =
    auth.displayName ||
    (email && email.includes("@") ? email.split("@")[0] : "Personal Visitor");

  return {
    uid: auth.uid,
    email: auth.email,
    displayName: derivedName,
    photoURL: auth.photoURL,
    emailVerified: auth.emailVerified ?? false,
    contextType: "VISITOR",
    visitorSubtype: "PERSONAL_VISITOR",
    personalWorkspaceEnabled: true,
  };
}

/**
 * Checks if context is a personal visitor
 */
export function isPersonalVisitor(context?: AccessContext): boolean {
  const ctx = context || resolveAccessContext();
  return ctx.contextType === "VISITOR" && ctx.isAuthenticated === true && ctx.visitorSubtype === "PERSONAL_VISITOR";
}

/**
 * Checks if context is an unauthenticated guest visitor
 */
export function isGuestVisitor(context?: AccessContext): boolean {
  const ctx = context || resolveAccessContext();
  return ctx.contextType === "VISITOR" && ctx.isAuthenticated === false;
}

/**
 * Explicitly puts a user in Personal Visitor mode (no active organization)
 */
export function setPersonalVisitorMode(userId?: string): void {
  const uid = userId || getCurrentAuthSession().uid;
  if (uid) {
    userActiveOrgMap.set(uid, "NONE");
    clearUserAIContextCache(uid);
  }
}

/**
 * Clears all active organization mappings (used during tests or full reset)
 */
export function clearAllUserActiveOrgContexts(): void {
  userActiveOrgMap.clear();
}

/**
 * Registers an organizational membership for a human user into canonical membershipRepository
 */
export function registerOrganizationalMembership(
  userId: string,
  membership: OrganizationalMembership
): void {
  saveMember({
    userId,
    companyId: membership.companyId || membership.organizationId,
    role: membership.role as CompanyMemberRole,
    status: membership.memberStatus === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Retrieves all registered memberships for a given user ID dynamically from membershipRepository
 */
export function getUserMemberships(userId: string): OrganizationalMembership[] {
  const memberRecords = findMembersByUserId(userId);
  
  return memberRecords.map((m) => {
    const comp = getCompanyById(m.companyId);
    const busId = comp?.businessId || (m.companyId === "argento-marine" ? "MW-BUS-ARGENTO-MARITIME" : generateBusinessId(m.companyId));
    const name = comp?.displayName || (m.companyId === "argento-marine" ? "Argento Marine" : m.companyId);
    const orgType = comp?.organizationType || (m.companyId === "maritime-association" ? "ASSOCIATION" : m.companyId === "port-authority" ? "PUBLIC_ORGANIZATION" : "COMPANY");
    const verif = comp?.verificationStatus === "VERIFIED" ? "VERIFIED" : "PENDING";
    const authState = m.status === "ACTIVE" ? "ACTIVE" : "SUSPENDED";

    return {
      organizationId: m.companyId,
      companyId: m.companyId,
      businessId: busId,
      organizationName: name,
      organizationType: orgType as OrganizationEntityType,
      role: m.role,
      memberStatus: m.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
      verificationStatus: verif,
      authorityState: authState,
    };
  });
}

import { clearUserAIContextCache, resolveAIContext as resolveDomainAIContext } from "@/lib/services/aiDomainService";

/**
 * Sets the explicitly selected active organization context for a user
 */
export function setActiveOrganizationContext(
  arg1: string | { organizationId?: string; companyId?: string; businessId?: string; role?: string },
  arg2?: string | null
): boolean {
  let uid = getCurrentAuthSession().uid || "anonymous";
  let targetOrgId: string | null = null;

  if (typeof arg1 === "string") {
    if (arg2 !== undefined) {
      uid = arg1;
      targetOrgId = arg2;
    } else {
      targetOrgId = arg1;
    }
  } else if (typeof arg1 === "object" && arg1 !== null) {
    targetOrgId = arg1.organizationId || arg1.companyId || null;
    if (arg1.role && targetOrgId) {
      saveMember({
        userId: uid,
        companyId: targetOrgId,
        role: arg1.role as any,
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  if (!targetOrgId) {
    userActiveOrgMap.set(uid, "NONE");
    clearUserAIContextCache(uid);
    return true;
  }

  const memberships = getUserMemberships(uid);
  const targetMembership = memberships.find(
    (m) => (m.organizationId === targetOrgId || m.companyId === targetOrgId) && m.memberStatus === "ACTIVE"
  );

  if (!targetMembership) {
    if (typeof arg1 === "object") {
      userActiveOrgMap.set(uid, targetOrgId);
      clearUserAIContextCache(uid);
      return true;
    }
    return false;
  }

  userActiveOrgMap.set(uid, targetMembership.organizationId);
  clearUserAIContextCache(uid);
  return true;
}

/**
 * Retrieves the active organization context for a user if selected and valid
 */
export function getActiveOrganizationContext(userId: string): ActiveOrganizationContext | null {
  const activeOrgId = userActiveOrgMap.get(userId);
  const memberships = getUserMemberships(userId);

  // If user explicitly chose personal mode ("NONE")
  if (activeOrgId === "NONE") {
    return null;
  }

  if (activeOrgId) {
    const activeMembership = memberships.find(
      (m) => (m.organizationId === activeOrgId || m.companyId === activeOrgId) && m.memberStatus === "ACTIVE"
    );
    if (activeMembership) {
      return {
        organizationType: activeMembership.organizationType,
        companyId: activeMembership.companyId,
        organizationId: activeMembership.organizationId,
        businessId: activeMembership.businessId,
        organizationName: activeMembership.organizationName,
        role: activeMembership.role,
        verificationStatus: activeMembership.verificationStatus,
        authorityState: activeMembership.authorityState,
      };
    }
  }

  if (!activeOrgId && memberships.length > 0) {
    // Default to first active membership if available for existing test backwards compatibility
    const firstActive = memberships.find((m) => m.memberStatus === "ACTIVE");
    if (firstActive) {
      return {
        organizationType: firstActive.organizationType,
        companyId: firstActive.companyId,
        organizationId: firstActive.organizationId,
        businessId: firstActive.businessId,
        organizationName: firstActive.organizationName,
        role: firstActive.role,
        verificationStatus: firstActive.verificationStatus,
        authorityState: firstActive.authorityState,
      };
    }
  }

  return null;
}

/**
 * Resolves full canonical AccessContext for an authentication session & optional requested org ID
 */
export function resolveAccessContext(
  auth?: AuthContext,
  requestedOrgId?: string
): AccessContext {
  const currentAuth = auth || getCurrentAuthSession();
  const isAuthenticated = Boolean(currentAuth && currentAuth.uid !== null && currentAuth.uid !== "");
  const userId = currentAuth?.uid || null;

  if (!isAuthenticated || !userId) {
    return {
      contextType: "VISITOR",
      visitorSubtype: "GUEST_VISITOR",
      authenticatedUserId: null,
      isAuthenticated: false,
      activeOrganization: null,
      availableMemberships: [],
      personalUser: null,
      capabilities: {
        canExplorePublic: true,
        canInitiateConnect: false,
        canSubmitRFQ: false,
        canAccessCompanyStudio: false,
        canAccessOrganizationPortal: false,
        canManageMembers: false,
      },
    };
  }

  const availableMemberships = getUserMemberships(userId);
  const activeOrganization = getActiveOrganizationContext(userId);

  if (!activeOrganization) {
    // Authenticated user in PERSONAL VISITOR state (no active organization)
    const personalUser = derivePersonalUserContext(currentAuth);
    return {
      contextType: "VISITOR",
      visitorSubtype: "PERSONAL_VISITOR",
      authenticatedUserId: userId,
      isAuthenticated: true,
      activeOrganization: null,
      availableMemberships,
      personalUser,
      capabilities: {
        canExplorePublic: true,
        canInitiateConnect: true,
        canSubmitRFQ: true,
        canAccessCompanyStudio: false,
        canAccessOrganizationPortal: false,
        canManageMembers: false,
      },
    };
  }

  const isEcosystemOrg = [
    "ASSOCIATION",
    "CHAMBER",
    "FEDERATION",
    "INSTITUTION",
    "PUBLIC_ORGANIZATION",
  ].includes(activeOrganization.organizationType);

  const contextType: AccessContextType = isEcosystemOrg ? "ECOSYSTEM_ORGANIZATION" : "COMPANY";

  const isCompanyContext = contextType === "COMPANY";
  const isOrgContext = contextType === "ECOSYSTEM_ORGANIZATION";
  const role = activeOrganization.role;

  const capabilities: AccessContextCapabilities = {
    canExplorePublic: true,
    canInitiateConnect: true,
    canSubmitRFQ: true,
    canAccessCompanyStudio: isCompanyContext && activeOrganization.authorityState === "ACTIVE",
    canAccessOrganizationPortal: isOrgContext && activeOrganization.authorityState === "ACTIVE",
    canManageMembers: ["OWNER", "ADMIN"].includes(role),
  };

  return {
    contextType,
    visitorSubtype: undefined,
    authenticatedUserId: userId,
    isAuthenticated: true,
    activeOrganization,
    availableMemberships,
    personalUser: null,
    capabilities,
  };
}

/**
 * Validates company access rules strictly
 */
export function validateCompanyAccess(
  targetCompanyId: string,
  auth?: AuthContext
): { authorized: boolean; reason: string; context?: AccessContext } {
  const currentAuth = auth || getCurrentAuthSession();
  if (!currentAuth.uid) {
    return { authorized: false, reason: "Unauthenticated: User must be signed in to access company context." };
  }

  const accessContext = resolveAccessContext(currentAuth, targetCompanyId);
  const activeOrg = accessContext.activeOrganization;

  if (!activeOrg) {
    return { authorized: false, reason: `User '${currentAuth.uid}' has no active membership in company '${targetCompanyId}'.` };
  }

  if (activeOrg.companyId !== targetCompanyId && activeOrg.organizationId !== targetCompanyId) {
    return {
      authorized: false,
      reason: `Active organization context '${activeOrg.companyId}' does not match target company '${targetCompanyId}'.`,
    };
  }

  if (activeOrg.organizationType !== "COMPANY") {
    return { authorized: false, reason: `Organization '${targetCompanyId}' is not of type COMPANY.` };
  }

  if (activeOrg.authorityState === "SUSPENDED") {
    return { authorized: false, reason: `Company identity '${targetCompanyId}' authority state is SUSPENDED.` };
  }

  return { authorized: true, reason: "Company access authorized.", context: accessContext };
}

/**
 * Validates ecosystem organization access rules strictly
 */
export function validateEcosystemOrganizationAccess(
  targetOrganizationId: string,
  auth?: AuthContext
): { authorized: boolean; reason: string; context?: AccessContext } {
  const currentAuth = auth || getCurrentAuthSession();
  if (!currentAuth.uid) {
    return { authorized: false, reason: "Unauthenticated: User must be signed in to access organization context." };
  }

  const accessContext = resolveAccessContext(currentAuth, targetOrganizationId);
  const activeOrg = accessContext.activeOrganization;

  if (!activeOrg) {
    return { authorized: false, reason: `User '${currentAuth.uid}' has no active membership in organization '${targetOrganizationId}'.` };
  }

  if (activeOrg.organizationId !== targetOrganizationId) {
    return {
      authorized: false,
      reason: `Active organization context '${activeOrg.organizationId}' does not match target organization '${targetOrganizationId}'.`,
    };
  }

  const validTypes: OrganizationEntityType[] = ["ASSOCIATION", "CHAMBER", "FEDERATION", "INSTITUTION", "PUBLIC_ORGANIZATION"];
  if (!validTypes.includes(activeOrg.organizationType)) {
    return { authorized: false, reason: `Organization '${targetOrganizationId}' is not an ecosystem organization type.` };
  }

  if (activeOrg.authorityState === "SUSPENDED") {
    return { authorized: false, reason: `Organization identity '${targetOrganizationId}' authority state is SUSPENDED.` };
  }

  return { authorized: true, reason: "Ecosystem organization access authorized.", context: accessContext };
}

/**
 * Resolves AI execution context bound by user and active organization
 */
export function resolveAIContext(auth?: AuthContext, queryCompanyId?: string) {
  return resolveDomainAIContext(auth, queryCompanyId);
}

/**
 * Resolves Commercial Connect context ensuring active sender organization context is preserved
 */
export function resolveCommercialConnectContext(targetCompanyId: string, auth?: AuthContext) {
  const accessContext = resolveAccessContext(auth);
  return {
    fromUserId: accessContext.authenticatedUserId,
    fromCompanyId: accessContext.activeOrganization?.companyId,
    fromBusinessId: accessContext.activeOrganization?.businessId,
    toCompanyId: targetCompanyId,
    toBusinessId: getCompanyById(targetCompanyId)?.businessId || generateBusinessId(targetCompanyId),
  };
}

/**
 * Attributed Digital Action Audit Log Helper
 */
export function recordDigitalAction(action: {
  actorUid: string;
  actionType: string;
  targetEntityId: string;
  companyId: string;
  businessId: string;
  details?: Record<string, unknown>;
}) {
  const timestamp = new Date().toISOString();
  console.log(`[DIGITAL_ACTION_AUDIT] ${timestamp} | Actor:${action.actorUid} | Action:${action.actionType} | Company:${action.companyId} (${action.businessId}) | Target:${action.targetEntityId}`);

  if (action.companyId && action.companyId !== "UNKNOWN" && action.companyId !== "SYSTEM") {
    let moduleType: AuditModuleType = "KNOWLEDGE";
    if (action.actionType.startsWith("AI_") || action.actionType.includes("AI")) {
      moduleType = "AI";
    } else if (action.actionType.startsWith("TEAM_") || action.actionType.includes("MEMBER")) {
      moduleType = "TEAM";
    } else if (action.actionType.startsWith("POSITIONING_") || action.actionType.includes("SECTOR")) {
      moduleType = "POSITIONING";
    } else if (action.actionType.startsWith("IDENTITY_")) {
      moduleType = "IDENTITY";
    }

    recordCanonicalAuditEvent({
      companyId: action.companyId,
      businessId: action.businessId,
      actorUserId: action.actorUid,
      actionType: action.actionType,
      module: moduleType,
      entityType: action.actionType.includes("DOCUMENT") ? "DOCUMENT" : "GENERAL",
      entityId: action.targetEntityId,
      reason: typeof action.details?.summary === "string" ? (action.details.summary as string) : undefined,
      metadata: (action.details as Record<string, any>) || {},
      source: "DIGITAL_ACTION_BRIDGE",
      authorizationContext: {
        authenticated: action.actorUid !== "SYSTEM",
        userRole: "OPERATOR",
        details: `Digital action: ${action.actionType}`,
      },
    }).catch(() => {});
  }

  return {
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ...action,
    timestamp,
  };
}
