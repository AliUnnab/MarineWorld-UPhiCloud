import type {
  AuthorityScope,
  CompanyMemberEntity,
  CompanyMemberRole,
  CompanyVerificationStatus,
  CompanyVerificationRecord,
  DomainVerificationState,
  HumanApprovalEvent,
  MembershipStatus,
  OrganizationAuthority,
  PrincipalAuthorityStatus,
  VerificationEvidence,
  VerificationMethod,
  AIAuthorityPermission,
  AIExecutiveAction,
  DigitalActionType,
} from "@/lib/types";
import { getCompanyById, saveCompany, recordDigitalActionAttribution } from "./companyService";
import { recordCanonicalAuditEvent } from "./auditService";
import {
  getCompanyMember,
  getCompanyMembers,
  getCurrentAuthSession,
  registerCompanyMember,
  type AuthContext,
} from "./securityService";
import {
  getCompanyVerification,
  saveVerification,
  submitVerification,
  approveVerification,
  rejectVerification,
  suspendVerification,
  getEvidence,
  listEvidence,
  saveEvidence,
  getAuthority,
  listAuthorities,
  saveAuthority,
  updateAuthority,
  getInMemoryVerification,
  getInMemoryEvidence,
  listInMemoryEvidence,
  getInMemoryAuthority,
  listInMemoryAuthorities,
  getInMemoryDomainVerification,
  setInMemoryDomainVerification,
} from "@/lib/repositories/governanceRepository";

export {
  getCompanyVerification,
  saveVerification,
  submitVerification,
  approveVerification,
  rejectVerification,
  suspendVerification,
  getEvidence,
  listEvidence,
  saveEvidence,
  getAuthority,
  listAuthorities,
  saveAuthority,
  updateAuthority,
};

/**
 * Stage 1 Correction — Governance & Verification Service
 * Single Source of Truth for Verification: CompanyEntity.verificationStatus in Company Repository.
 */

const humanApprovalStore = new Map<string, HumanApprovalEvent>();

/**
 * Helper to construct and record audit attribution entries
 */
export function recordGovernanceAudit(
  actorUserId: string,
  companyId: string,
  businessId: string,
  userRole: CompanyMemberRole,
  actionType: DigitalActionType,
  target: string,
  details: string
): void {
  // 1. Dispatch to canonical Firestore Audit Ledger
  recordCanonicalAuditEvent({
    companyId,
    businessId,
    actorUserId,
    actorRole: userRole,
    actionType: String(actionType),
    module: "TEAM_ACCESS",
    entityType: "COMPANY_GOVERNANCE",
    entityId: target,
    reason: details,
    source: "GOVERNANCE_SERVICE",
    authorizationContext: {
      authenticated: true,
      userRole,
      verifiedActor: true,
      details,
    },
  }).catch((err) => console.warn("[GovernanceAudit] Canonical record error:", err));

  // 2. Legacy In-Memory attribution log
  recordDigitalActionAttribution({
    actorUserId,
    organizationId: companyId,
    companyId,
    businessId,
    actionType,
    authorizationContext: {
      authenticated: true,
      userRole,
      verifiedActor: true,
      details,
    },
    auditReference: `gov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    target,
  });
}

/**
 * Evaluate Governance Access for a company context.
 * Enforces authentication, active membership, principal authority state, and RBAC permissions.
 */
export function evaluateGovernanceAccess(
  companyId: string,
  auth?: AuthContext,
  requestedScope?: AuthorityScope
): { allowed: boolean; role?: CompanyMemberRole; denialReason?: string } {
  const currentAuth = auth || getCurrentAuthSession();

  // 1. Unauthenticated Check
  if (!currentAuth || !currentAuth.uid) {
    return {
      allowed: false,
      denialReason: "Unauthenticated: User must be authenticated to access governance controls.",
    };
  }

  // 2. Member & Membership Status Check
  const member = getCompanyMember(companyId, currentAuth);
  if (!member || member.status !== "ACTIVE") {
    return {
      allowed: false,
      denialReason: `Access denied: User '${currentAuth.uid}' lacks an active membership in company '${companyId}'.`,
    };
  }

  // 3. Principal Authority State Check
  const userAuth = getInMemoryAuthority(companyId, currentAuth.uid);
  if (userAuth && (userAuth.authorityState === "SUSPENDED" || userAuth.authorityState === "REVOKED")) {
    return {
      allowed: false,
      role: member.role,
      denialReason: `Access denied: User '${currentAuth.uid}' principal authority state is ${userAuth.authorityState}.`,
    };
  }

  // 4. Scope-based Check (if specific scope requested)
  if (requestedScope && userAuth) {
    if (!userAuth.scopes.includes(requestedScope) && member.role !== "OWNER") {
      return {
        allowed: false,
        role: member.role,
        denialReason: `Access denied: User lacks the required governance scope '${requestedScope}'.`,
      };
    }
  }

  // 5. RBAC Permission Rules
  if (member.role === "OWNER") {
    return { allowed: true, role: member.role };
  }

  if (member.role === "ADMIN") {
    return { allowed: true, role: member.role };
  }

  if (member.role === "VIEWER") {
    return {
      allowed: false,
      role: member.role,
      denialReason: "Access denied: VIEWER role is restricted to read-only views and cannot perform governance operations.",
    };
  }

  return {
    allowed: false,
    role: member.role,
    denialReason: `Access denied: Role '${member.role}' lacks organizational governance management authority.`,
  };
}

/**
 * Get company verification status directly from canonical CompanyEntity in Company Repository
 */
export function getCompanyVerificationStatus(companyId: string): CompanyVerificationStatus {
  const company = getCompanyById(companyId);
  if (company && company.verificationStatus) {
    return company.verificationStatus as CompanyVerificationStatus;
  }
  const verifRec = getInMemoryVerification(companyId);
  if (verifRec) {
    return verifRec.status as CompanyVerificationStatus;
  }
  return "UNVERIFIED";
}

/**
 * Submit Company Verification Evidence
 */
export function submitCompanyVerification(
  companyId: string,
  verificationType: VerificationMethod,
  evidenceReference: string,
  auth?: AuthContext
): { success: boolean; evidence?: VerificationEvidence; error?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const access = evaluateGovernanceAccess(companyId, currentAuth);
  if (!access.allowed) {
    return { success: false, error: access.denialReason };
  }

  const company = getCompanyById(companyId);
  if (!company) {
    return { success: false, error: `Company '${companyId}' not found.` };
  }

  const businessId = company.businessId || `MW-BUS-${companyId.toUpperCase()}`;
  const evidenceId = `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const evidence: VerificationEvidence = {
    id: evidenceId,
    companyId,
    businessId,
    verificationId: "verification-main",
    verificationType,
    status: "SUBMITTED",
    submittedBy: currentAuth.uid!,
    reviewedBy: null,
    reviewer: null,
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
    evidenceReference,
    rejectionReason: null,
  };

  saveEvidence(evidence);

  const verifRecord: CompanyVerificationRecord = {
    id: "verification-main",
    companyId,
    businessId,
    status: "PENDING",
    method: verificationType,
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveVerification(verifRecord);

  // Single Source of Truth update on CompanyEntity
  company.verificationStatus = "PENDING";
  saveCompany(company);

  recordGovernanceAudit(
    currentAuth.uid!,
    companyId,
    businessId,
    access.role || "ADMIN",
    "COMPANY_VERIFICATION_SUBMITTED",
    evidenceId,
    `Verification method ${verificationType} submitted with reference '${evidenceReference}'.`
  );

  return { success: true, evidence };
}

/**
 * Review and Approve/Reject Company Verification
 */
export function reviewCompanyVerification(
  evidenceId: string,
  approved: boolean,
  rejectionReason?: string,
  auth?: AuthContext
): { success: boolean; status?: CompanyVerificationStatus; error?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const evidence = getInMemoryEvidence(evidenceId);
  if (!evidence) {
    return { success: false, error: `Verification evidence '${evidenceId}' not found.` };
  }

  const access = evaluateGovernanceAccess(evidence.companyId, currentAuth);
  if (!access.allowed) {
    return { success: false, error: access.denialReason };
  }

  evidence.status = approved ? "APPROVED" : "REJECTED";
  evidence.reviewedBy = currentAuth.uid!;
  evidence.reviewer = currentAuth.uid!;
  evidence.reviewedAt = new Date().toISOString();
  evidence.rejectionReason = rejectionReason || null;

  saveEvidence(evidence);

  const newVerificationStatus: CompanyVerificationStatus = approved
    ? "VERIFIED"
    : "REJECTED";

  const verifRecord: CompanyVerificationRecord = {
    id: "verification-main",
    companyId: evidence.companyId,
    businessId: evidence.businessId,
    status: approved ? "VERIFIED" : "REJECTED",
    method: evidence.verificationType,
    submittedAt: evidence.submittedAt,
    reviewedAt: new Date().toISOString(),
    reviewedBy: currentAuth.uid!,
    rejectionReason: rejectionReason || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveVerification(verifRecord);

  // Single Source of Truth update on CompanyEntity
  const company = getCompanyById(evidence.companyId);
  if (company) {
    company.verificationStatus = newVerificationStatus;
    saveCompany(company);
  }

  recordGovernanceAudit(
    currentAuth.uid!,
    evidence.companyId,
    evidence.businessId,
    access.role || "ADMIN",
    approved ? "COMPANY_VERIFICATION_APPROVED" : "COMPANY_VERIFICATION_REJECTED",
    evidenceId,
    approved
      ? `Company verification approved.`
      : `Company verification rejected. Reason: ${rejectionReason || "None provided"}`
  );

  return { success: true, status: newVerificationStatus };
}

/**
 * Get Domain Verification State
 */
export function getDomainVerificationState(
  companyId: string,
  domainName: string
): DomainVerificationState {
  return getInMemoryDomainVerification(companyId, domainName);
}

/**
 * Verify Company Domain
 */
export function verifyCompanyDomain(
  companyId: string,
  domainName: string,
  auth?: AuthContext
): { success: boolean; domainState?: DomainVerificationState; error?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const access = evaluateGovernanceAccess(companyId, currentAuth);
  if (!access.allowed) {
    return { success: false, error: access.denialReason };
  }

  const company = getCompanyById(companyId);
  const businessId = company?.businessId || `MW-BUS-${companyId.toUpperCase()}`;

  const state: DomainVerificationState = "VERIFIED";
  setInMemoryDomainVerification(companyId, domainName, state);

  recordGovernanceAudit(
    currentAuth.uid!,
    companyId,
    businessId,
    access.role || "ADMIN",
    "DOMAIN_VERIFIED",
    domainName,
    `Domain '${domainName}' verified for company '${companyId}'.`
  );

  return { success: true, domainState: state };
}

/**
 * Get Organization Authority for a user in a company
 */
export function getOrganizationAuthority(
  companyId: string,
  userId: string
): OrganizationAuthority | null {
  return getInMemoryAuthority(companyId, userId) || null;
}

/**
 * Assign Principal Authority or Delegated Authority
 */
export function assignPrincipalAuthority(
  companyId: string,
  targetUserId: string,
  scopes: AuthorityScope[],
  auth?: AuthContext
): { success: boolean; authority?: OrganizationAuthority; error?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const access = evaluateGovernanceAccess(companyId, currentAuth);
  if (!access.allowed) {
    return { success: false, error: access.denialReason };
  }

  const company = getCompanyById(companyId);
  const businessId = company?.businessId || `MW-BUS-${companyId.toUpperCase()}`;

  const targetMember = getCompanyMember(companyId, { uid: targetUserId });
  if (!targetMember || targetMember.status !== "ACTIVE") {
    return {
      success: false,
      error: `Target user '${targetUserId}' is not an active member of company '${companyId}'.`,
    };
  }

  const newAuthority: OrganizationAuthority = {
    id: `auth-${companyId}-${targetUserId}`,
    companyId,
    businessId,
    userId: targetUserId,
    role: targetMember.role,
    authorityState: "ACTIVE",
    scopes,
    authorityScope: scopes,
    verificationState: "VERIFIED",
    grantedBy: currentAuth.uid!,
    grantedAt: new Date().toISOString(),
    expiresAt: null,
    revokedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveAuthority(newAuthority);

  recordGovernanceAudit(
    currentAuth.uid!,
    companyId,
    businessId,
    access.role || "OWNER",
    "PRINCIPAL_AUTHORITY_ASSIGNED",
    targetUserId,
    `Principal authority assigned to user '${targetUserId}' with scopes: ${scopes.join(", ")}.`
  );

  return { success: true, authority: newAuthority };
}

/**
 * Grant Authority Scope
 */
export function grantAuthorityScope(
  companyId: string,
  targetUserId: string,
  scope: AuthorityScope,
  auth?: AuthContext
): { success: boolean; error?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const access = evaluateGovernanceAccess(companyId, currentAuth);
  if (!access.allowed) {
    return { success: false, error: access.denialReason };
  }

  const authority = getOrganizationAuthority(companyId, targetUserId);
  if (!authority) {
    return assignPrincipalAuthority(companyId, targetUserId, [scope], currentAuth);
  }

  if (!authority.scopes.includes(scope)) {
    authority.scopes.push(scope);
  }

  recordGovernanceAudit(
    currentAuth.uid!,
    companyId,
    authority.businessId,
    access.role || "OWNER",
    "AUTHORITY_GRANTED",
    targetUserId,
    `Granted authority scope '${scope}' to user '${targetUserId}'.`
  );

  return { success: true };
}

/**
 * Revoke Authority Scope
 */
export function revokeAuthorityScope(
  companyId: string,
  targetUserId: string,
  scope: AuthorityScope,
  auth?: AuthContext
): { success: boolean; error?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const access = evaluateGovernanceAccess(companyId, currentAuth);
  if (!access.allowed) {
    return { success: false, error: access.denialReason };
  }

  const authority = getOrganizationAuthority(companyId, targetUserId);
  if (!authority) {
    return { success: false, error: `No authority record found for user '${targetUserId}'.` };
  }

  authority.scopes = authority.scopes.filter((s) => s !== scope);

  recordGovernanceAudit(
    currentAuth.uid!,
    companyId,
    authority.businessId,
    access.role || "OWNER",
    "AUTHORITY_REVOKED",
    targetUserId,
    `Revoked authority scope '${scope}' from user '${targetUserId}'.`
  );

  return { success: true };
}

/**
 * Update Member Role with Security & Protection Guards
 * Enforces:
 * - No self-role-escalation
 * - ADMIN cannot create another OWNER
 * - Non-OWNER cannot demote/remove an OWNER
 * - Cannot remove sole OWNER without designated successor
 */
export function updateMemberRole(
  companyId: string,
  targetUserId: string,
  newRole: CompanyMemberRole,
  auth?: AuthContext
): { success: boolean; error?: string } {
  const currentAuth = auth || getCurrentAuthSession();

  // 1. Basic Governance Auth check
  const access = evaluateGovernanceAccess(companyId, currentAuth);
  if (!access.allowed) {
    return { success: false, error: access.denialReason };
  }

  // 2. Self-Role Escalation Guard
  if (currentAuth.uid === targetUserId) {
    return {
      success: false,
      error: "Role escalation denied: Users are strictly forbidden from modifying or elevating their own role.",
    };
  }

  const callingMember = getCompanyMember(companyId, currentAuth);
  const targetMember = getCompanyMember(companyId, { uid: targetUserId });

  if (!callingMember) {
    return { success: false, error: "Calling user is not a valid member of this company." };
  }

  if (!targetMember) {
    return { success: false, error: `Target user '${targetUserId}' is not a member of company '${companyId}'.` };
  }

  // 3. ADMIN Creating OWNER Guard
  if (callingMember.role === "ADMIN" && newRole === "OWNER") {
    return {
      success: false,
      error: "Governance restriction: ADMIN role cannot create or promote a user to OWNER.",
    };
  }

  // 4. Unauthorized OWNER Modification Guard
  if (targetMember.role === "OWNER" && callingMember.role !== "OWNER") {
    return {
      success: false,
      error: "Owner protection guard: Only an existing OWNER can modify or transfer the OWNER role.",
    };
  }

  // 5. Sole OWNER Protection Guard
  if (targetMember.role === "OWNER" && newRole !== "OWNER") {
    const allMembers = getCompanyMembers(companyId);
    const activeOwners = allMembers.filter((m) => m.role === "OWNER" && m.status === "ACTIVE");
    if (activeOwners.length <= 1) {
      return {
        success: false,
        error: "Owner protection guard: Cannot remove or demote the sole company OWNER without designating a valid OWNER successor.",
      };
    }
  }

  const oldRole = targetMember.role;

  // Perform role update
  const updatedMember: CompanyMemberEntity = {
    ...targetMember,
    role: newRole,
    updatedAt: new Date().toISOString(),
  };
  registerCompanyMember(updatedMember);

  const company = getCompanyById(companyId);
  const businessId = company?.businessId || `MW-BUS-${companyId.toUpperCase()}`;

  recordGovernanceAudit(
    currentAuth.uid!,
    companyId,
    businessId,
    callingMember.role,
    "ROLE_GRANTED",
    targetUserId,
    `Role changed for user '${targetUserId}' from '${oldRole}' to '${newRole}'.`
  );

  return { success: true };
}

/**
 * Update Membership Status (INVITED, PENDING, ACTIVE, SUSPENDED, REVOKED)
 */
export function updateMembershipStatus(
  companyId: string,
  targetUserId: string,
  newStatus: MembershipStatus,
  auth?: AuthContext
): { success: boolean; error?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const access = evaluateGovernanceAccess(companyId, currentAuth);
  if (!access.allowed) {
    return { success: false, error: access.denialReason };
  }

  const targetMember = getCompanyMember(companyId, { uid: targetUserId });
  if (!targetMember) {
    return { success: false, error: `Member '${targetUserId}' not found in company '${companyId}'.` };
  }

  const oldStatus = targetMember.status;

  const updatedMember: CompanyMemberEntity = {
    ...targetMember,
    status: newStatus as any,
    updatedAt: new Date().toISOString(),
  };
  registerCompanyMember(updatedMember);

  const company = getCompanyById(companyId);
  const businessId = company?.businessId || `MW-BUS-${companyId.toUpperCase()}`;

  const actionMap: Record<MembershipStatus, DigitalActionType> = {
    INVITED: "MEMBER_INVITED",
    PENDING: "MEMBER_INVITED",
    ACTIVE: "MEMBER_ACTIVATED",
    SUSPENDED: "MEMBER_SUSPENDED",
    REVOKED: "MEMBER_REVOKED",
  };

  recordGovernanceAudit(
    currentAuth.uid!,
    companyId,
    businessId,
    access.role || "ADMIN",
    actionMap[newStatus] || "MEMBER_ACTIVATED",
    targetUserId,
    `Membership status updated for user '${targetUserId}' from '${oldStatus}' to '${newStatus}'.`
  );

  return { success: true };
}

/**
 * Validate AI Governance Action & Human Approval Gating
 */
export function validateAiGovernanceAction(
  companyId: string,
  aiAction: AIAuthorityPermission,
  target: string,
  proposedByAi: boolean,
  auth?: AuthContext
): { allowed: boolean; requiresHumanApproval: boolean; denialReason?: string } {
  // AI is strictly forbidden from mutating critical governance identifiers or authority
  const forbiddenTargets = ["OWNER", "businessId", "companyId", "PRINCIPAL_AUTHORITY", "LEGAL_NAME"];
  if (forbiddenTargets.some((t) => target.includes(t))) {
    return {
      allowed: false,
      requiresHumanApproval: false,
      denialReason: `AI Governance Restriction: AI is strictly prohibited from autonomously modifying target '${target}' (OWNER assignment, Business ID, or Principal Authority).`,
    };
  }

  const executiveActions: AIExecutiveAction[] = ["AI_SEND", "AI_SUBMIT", "AI_APPROVE", "AI_ACCEPT", "AI_SIGN", "AI_EXECUTE"];
  if (executiveActions.includes(aiAction as AIExecutiveAction)) {
    return {
      allowed: true,
      requiresHumanApproval: true,
      denialReason: `Executive AI action '${aiAction}' requires explicit human authorization before execution.`,
    };
  }

  return {
    allowed: true,
    requiresHumanApproval: false,
  };
}

/**
 * Approve AI Governance Action with explicit Human Authorization
 */
export function approveAiGovernanceAction(
  companyId: string,
  aiAction: AIExecutiveAction,
  target: string,
  auth?: AuthContext
): { success: boolean; event?: HumanApprovalEvent; error?: string } {
  const currentAuth = auth || getCurrentAuthSession();

  if (!currentAuth || !currentAuth.uid) {
    return { success: false, error: "Human approval requires an authenticated user session." };
  }

  const access = evaluateGovernanceAccess(companyId, currentAuth);
  if (!access.allowed) {
    return { success: false, error: access.denialReason };
  }

  const validation = validateAiGovernanceAction(companyId, aiAction, target, true, currentAuth);
  if (!validation.allowed) {
    return { success: false, error: validation.denialReason };
  }

  const company = getCompanyById(companyId);
  const businessId = company?.businessId || `MW-BUS-${companyId.toUpperCase()}`;

  const eventId = `appr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const approvalEvent: HumanApprovalEvent = {
    id: eventId,
    companyId,
    businessId,
    aiAction,
    proposedByAi: true,
    reviewedByUid: currentAuth.uid,
    approvedAt: new Date().toISOString(),
    status: "APPROVED",
    target,
  };

  humanApprovalStore.set(eventId, approvalEvent);

  recordGovernanceAudit(
    currentAuth.uid,
    companyId,
    businessId,
    access.role || "ADMIN",
    "AI_ACTION_APPROVED",
    target,
    `Human approved executive AI action '${aiAction}' for target '${target}'.`
  );

  return { success: true, event: approvalEvent };
}

/**
 * Check Company & Business ID Immutability
 */
export function checkIdentityImmutability(
  companyId: string,
  proposedBusinessId: string
): { isImmutable: boolean; error?: string } {
  const company = getCompanyById(companyId);
  if (!company) {
    return { isImmutable: false, error: `Company '${companyId}' not found.` };
  }

  if (company.businessId && company.businessId !== proposedBusinessId) {
    return {
      isImmutable: false,
      error: `Identity Immutability Violation: Cannot alter canonical Business ID '${company.businessId}' to '${proposedBusinessId}'.`,
    };
  }

  return { isImmutable: true };
}
