import type { CompanyMemberEntity, CompanyMemberRole, CompanyMemberStatus } from "@/lib/types";
import { findMembersByCompanyId, saveMember, deleteMember } from "@/lib/repositories/membershipRepository";
import { getCompanyById } from "@/lib/services/companyService";
import { getCurrentAuthSession, type AuthContext } from "@/lib/services/securityService";
import { updateMemberRole, updateMembershipStatus, recordGovernanceAudit } from "@/lib/services/governanceService";
import { buildInstitutionalEmailHtml, buildInstitutionalEmailText } from "@/lib/services/emailTemplates";
import {
  saveCompanyMember,
  updateCompanyMemberRole as updateFirestoreMemberRole,
  removeCompanyMember as removeFirestoreMember,
  getCompanyMembers,
  subscribeToCompanyMembers,
} from "@/services/membershipService";

export interface CompanyTeamMember {
  userId: string;
  companyId: string;
  role: CompanyMemberRole;
  status: CompanyMemberStatus;
  displayName: string;
  businessEmail: string;
  jobTitle?: string;
  department?: string;
  avatar?: string;
  lastActiveAt?: string;
  invitedBy?: string;
  expiresAt?: string;
  inviteToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleAccessSummary {
  role: CompanyMemberRole;
  label: string;
  shortTitle: string;
  badgeClass: string;
  description: string;
  can: string[];
  cannot: string[];
  modulePermissions: Array<{
    moduleName: string;
    level: "FULL" | "EDIT" | "VIEW" | "NONE";
    description: string;
  }>;
}

export const ROLE_ACCESS_CONFIGS: Record<CompanyMemberRole, RoleAccessSummary> = {
  OWNER: {
    role: "OWNER",
    label: "Owner / Legal Authority",
    shortTitle: "Owner",
    badgeClass: "bg-indigo-50 text-indigo-800 border border-indigo-200",
    description: "Full authority over company identity, governance, billing and final publication.",
    can: [
      "Manage authoritative company legal identity, verification and registration",
      "Manage dual billing rails, payment methods, invoices and agreements",
      "Invite, assign roles, suspend and remove company team members",
      "Execute company publication and production go-live activation",
      "Full oversight of all commercial inquiries, RFQs and official offers",
      "Govern authoritative knowledge, data spaces and company AI layers",
      "Manage Sector City digital showroom properties and leases",
    ],
    cannot: [],
    modulePermissions: [
      { moduleName: "Identity & Positioning", level: "FULL", description: "Authoritative legal name, business ID, sector & city taxonomy" },
      { moduleName: "Presence & Facilities", level: "FULL", description: "Manage headquarters, quaysides, berths, and regional branches" },
      { moduleName: "Products & Services", level: "FULL", description: "Create, edit, publish, and archive offerings" },
      { moduleName: "Knowledge & Company Brain", level: "FULL", description: "Manage document ingestion, conflict resolution & AI grounding" },
      { moduleName: "Company & Offering AI", level: "FULL", description: "Configure system prompts, domain boundaries & AI personas" },
      { moduleName: "Digital Presence & Publish", level: "FULL", description: "Control canonical hostname, meta verification & go-live gates" },
      { moduleName: "Connect / RFQs", level: "FULL", description: "View all customer inquiries, respond, and send formal quotations" },
      { moduleName: "Digital Properties", level: "FULL", description: "Lease and govern Sector City showroom slots and commercial terms" },
      { moduleName: "Team & Access", level: "FULL", description: "Manage all team memberships, roles, and ownership transfers" },
      { moduleName: "Billing & Contracts", level: "FULL", description: "Manage payment methods, invoices, and cloud billing accounts" },
      { moduleName: "Audit & Governance", level: "FULL", description: "Access immutable digital action ledgers and security provenance" },
    ],
  },
  ADMIN: {
    role: "ADMIN",
    label: "Operational Administrator",
    shortTitle: "Administrator",
    badgeClass: "bg-blue-50 text-blue-800 border border-blue-200",
    description: "Manages day-to-day company operations, team access and readiness.",
    can: [
      "Manage day-to-day company operational settings, nodes and catalogs",
      "Invite and manage team members (except promoting or removing Owners)",
      "Create, edit, and prepare products, services, and facility records",
      "Resolve go-live readiness blockers and assist with publication",
      "Manage commercial customer inquiries and buyer correspondence",
      "Upload approved company operational knowledge documents",
    ],
    cannot: [
      "Transfer legal company ownership or modify legal ownership records",
      "Demote, suspend, or remove the primary Company Owner",
      "Access financial payment credentials or banking records",
    ],
    modulePermissions: [
      { moduleName: "Identity & Positioning", level: "EDIT", description: "Edit descriptions, capability tags, and positioning attributes" },
      { moduleName: "Presence & Facilities", level: "FULL", description: "Manage physical nodes, operating coordinates, and capacities" },
      { moduleName: "Products & Services", level: "FULL", description: "Manage complete offering catalog and specifications" },
      { moduleName: "Knowledge & Company Brain", level: "FULL", description: "Upload documents, verify grounding, and resolve conflicts" },
      { moduleName: "Company & Offering AI", level: "FULL", description: "Configure AI behavior and test specialist responses" },
      { moduleName: "Digital Presence & Publish", level: "FULL", description: "Resolve readiness blockers and assist with publication" },
      { moduleName: "Connect / RFQs", level: "FULL", description: "Manage buyer messages and prepare commercial responses" },
      { moduleName: "Digital Properties", level: "EDIT", description: "Edit showroom creative and submit for governance review" },
      { moduleName: "Team & Access", level: "EDIT", description: "Invite members and manage operational roles" },
      { moduleName: "Billing & Contracts", level: "VIEW", description: "View active plans and operational status" },
      { moduleName: "Audit & Governance", level: "VIEW", description: "Review operational history and action logs" },
    ],
  },
  COMMERCIAL: {
    role: "COMMERCIAL",
    label: "Commercial & RFQ Lead",
    shortTitle: "Commercial Lead",
    badgeClass: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    description: "Manages buyer inquiries, RFQs, commercial discussions and official offers.",
    can: [
      "Manage inbound buyer inquiries, RFQs and commercial discussions in Studio Connect",
      "Communicate directly with procurement leads and negotiate commercial terms",
      "Prepare, issue and update official commercial quotations and offers",
      "Access commercial offering terms, pricing tiers and delivery options",
    ],
    cannot: [
      "Access or manage company billing, payment methods or bank details",
      "Modify company team members, security roles or permissions",
      "Alter legal company identity or institutional registration",
      "Publish company or alter live production domain gates",
    ],
    modulePermissions: [
      { moduleName: "Identity & Positioning", level: "VIEW", description: "View verified legal identity and market positioning" },
      { moduleName: "Presence & Facilities", level: "VIEW", description: "View operating facilities and quayside logistics specs" },
      { moduleName: "Products & Services", level: "EDIT", description: "Manage commercial terms, pricing tiers, and delivery options" },
      { moduleName: "Knowledge & Company Brain", level: "VIEW", description: "Access approved commercial and customer-facing collateral" },
      { moduleName: "Company & Offering AI", level: "VIEW", description: "Monitor commercial AI customer inquiries and triage" },
      { moduleName: "Digital Presence & Publish", level: "VIEW", description: "View live digital twin and canonical representation" },
      { moduleName: "Connect / RFQs", level: "FULL", description: "Primary operator for buyer inquiries, RFQs, and quotations" },
      { moduleName: "Digital Properties", level: "VIEW", description: "View active Sector City showroom placements" },
      { moduleName: "Team & Access", level: "NONE", description: "Restricted to authorized administrators" },
      { moduleName: "Billing & Contracts", level: "NONE", description: "Restricted to Owners and authorized Administrators" },
      { moduleName: "Audit & Governance", level: "NONE", description: "Restricted to authorized administrators" },
    ],
  },
  TECHNICAL: {
    role: "TECHNICAL",
    label: "Technical & Knowledge Lead",
    shortTitle: "Technical Lead",
    badgeClass: "bg-purple-50 text-purple-800 border border-purple-200",
    description: "Manages technical offering information, approved knowledge and technical AI support.",
    can: [
      "Manage technical offering information, engineering specs and certifications",
      "Ingest, maintain and review approved technical knowledge and documents",
      "Support Offering AI and Facility AI technical grounding within authorized scope",
      "Assist commercial inquiries with verified technical specifications and engineering advice",
    ],
    cannot: [
      "Control company-wide security, security policies or team access",
      "Manage company billing, payment methods or bank accounts",
      "Transfer company ownership or modify legal identity records",
      "Execute final legal publication or production go-live activation",
    ],
    modulePermissions: [
      { moduleName: "Identity & Positioning", level: "VIEW", description: "View company domain classification and capability taxonomy" },
      { moduleName: "Presence & Facilities", level: "EDIT", description: "Maintain technical facility specs, quaysides, and certifications" },
      { moduleName: "Products & Services", level: "FULL", description: "Manage technical specifications, attributes, and datasheets" },
      { moduleName: "Knowledge & Company Brain", level: "FULL", description: "Primary manager for technical ingestion, specs, and grounding" },
      { moduleName: "Company & Offering AI", level: "FULL", description: "Configure specialist AI grounding and test technical accuracy" },
      { moduleName: "Digital Presence & Publish", level: "VIEW", description: "Review technical readiness and documentation completeness" },
      { moduleName: "Connect / RFQs", level: "EDIT", description: "Provide technical advice and engineering input on buyer inquiries" },
      { moduleName: "Digital Properties", level: "VIEW", description: "Review technical showroom representations" },
      { moduleName: "Team & Access", level: "NONE", description: "Restricted to authorized administrators" },
      { moduleName: "Billing & Contracts", level: "NONE", description: "Restricted to Owners and authorized Administrators" },
      { moduleName: "Audit & Governance", level: "NONE", description: "Restricted to authorized administrators" },
    ],
  },
  MEMBER: {
    role: "MEMBER",
    label: "Team Member",
    shortTitle: "Team Member",
    badgeClass: "bg-slate-100 text-slate-700 border border-slate-200",
    description: "Participates in authorized company tasks with limited operational access.",
    can: [
      "View published and in-review company offerings and specifications",
      "View authorized operational records and public digital presence",
      "Participate in internal drafting and review workflows",
    ],
    cannot: [
      "Manage team members, roles or security access",
      "Manage company billing, payment methods or agreements",
      "Publish company or alter live production state",
      "Modify authoritative company knowledge or AI configuration",
    ],
    modulePermissions: [
      { moduleName: "Identity & Positioning", level: "VIEW", description: "View verified company positioning" },
      { moduleName: "Presence & Facilities", level: "VIEW", description: "View operating facilities" },
      { moduleName: "Products & Services", level: "VIEW", description: "View catalog offerings and technical specs" },
      { moduleName: "Knowledge & Company Brain", level: "VIEW", description: "Read-only access to approved knowledge" },
      { moduleName: "Company & Offering AI", level: "VIEW", description: "View AI configuration" },
      { moduleName: "Digital Presence & Publish", level: "VIEW", description: "View live preview" },
      { moduleName: "Connect / RFQs", level: "VIEW", description: "View customer inquiry activity" },
      { moduleName: "Digital Properties", level: "VIEW", description: "View active properties" },
      { moduleName: "Team & Access", level: "NONE", description: "Restricted to administrators" },
      { moduleName: "Billing & Contracts", level: "NONE", description: "Restricted to administrators" },
      { moduleName: "Audit & Governance", level: "NONE", description: "Restricted to administrators" },
    ],
  },
  // Backwards compatibility mappings
  MANAGER: {
    role: "MANAGER",
    label: "Team Member",
    shortTitle: "Member",
    badgeClass: "bg-slate-100 text-slate-700 border border-slate-200",
    description: "Standard operational team collaborator.",
    can: ["View company offerings", "Collaborate on tasks"],
    cannot: ["Manage billing", "Publish company", "Manage security"],
    modulePermissions: [],
  },
  OPERATIONS: {
    role: "OPERATIONS",
    label: "Technical & Knowledge Lead",
    shortTitle: "Technical Lead",
    badgeClass: "bg-purple-50 text-purple-800 border border-purple-200",
    description: "Operations and technical specialist.",
    can: ["Manage technical specs and knowledge"],
    cannot: ["Manage billing", "Transfer ownership"],
    modulePermissions: [],
  },
  SALES: {
    role: "SALES",
    label: "Commercial & RFQ Lead",
    shortTitle: "Commercial Lead",
    badgeClass: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    description: "Commercial and sales lead.",
    can: ["Manage inquiries and RFQs"],
    cannot: ["Manage billing", "Transfer ownership"],
    modulePermissions: [],
  },
  VIEWER: {
    role: "VIEWER",
    label: "Team Member",
    shortTitle: "Member",
    badgeClass: "bg-slate-100 text-slate-700 border border-slate-200",
    description: "Read-only team member.",
    can: ["View public and draft records"],
    cannot: ["Edit records", "Manage billing", "Publish"],
    modulePermissions: [],
  },
};

/**
 * Normalize human role
 */
export function normalizeRole(role: string): CompanyMemberRole {
  const upper = (role || "").toUpperCase();
  if (upper === "OWNER") return "OWNER";
  if (upper === "ADMIN") return "ADMIN";
  if (upper === "COMMERCIAL" || upper === "SALES") return "COMMERCIAL";
  if (upper === "TECHNICAL" || upper === "OPERATIONS") return "TECHNICAL";
  return "MEMBER";
}

/**
 * Get human role label
 */
export function getHumanRoleLabel(role: CompanyMemberRole): string {
  const norm = normalizeRole(role);
  return ROLE_ACCESS_CONFIGS[norm]?.label || "Team Member";
}

/**
 * Get human role short title
 */
export function getHumanRoleShort(role: CompanyMemberRole): string {
  const norm = normalizeRole(role);
  return ROLE_ACCESS_CONFIGS[norm]?.shortTitle || "Member";
}

/**
 * Get role badge styling classes
 */
export function getRoleBadgeClass(role: CompanyMemberRole): string {
  const norm = normalizeRole(role);
  return ROLE_ACCESS_CONFIGS[norm]?.badgeClass || "bg-slate-100 text-slate-700 border-slate-200";
}

/**
 * Get full role access summary
 */
export function getRoleAccessSummary(role: CompanyMemberRole): RoleAccessSummary {
  const norm = normalizeRole(role);
  return ROLE_ACCESS_CONFIGS[norm] || ROLE_ACCESS_CONFIGS.MEMBER;
}

/**
 * Fetch all team members for a company
 */
export function getCompanyTeam(companyId: string): CompanyTeamMember[] {
  if (!companyId) return [];
  const rawMembers = findMembersByCompanyId(companyId);

  return rawMembers.map((m) => {
    const normRole = normalizeRole(m.role);
    const fallbackName = m.displayName?.trim() || (m.businessEmail?.includes("@") ? m.businessEmail.split("@")[0] : "Name not provided");
    const fallbackEmail = m.businessEmail?.trim() || "Business email not provided";

    return {
      userId: m.userId,
      companyId: m.companyId,
      role: normRole,
      status: m.status || "ACTIVE",
      displayName: fallbackName,
      businessEmail: fallbackEmail,
      jobTitle: m.jobTitle?.trim() || undefined,
      department: m.department?.trim() || undefined,
      avatar: m.avatar,
      lastActiveAt: m.lastActiveAt,
      invitedBy: m.invitedBy,
      expiresAt: m.expiresAt,
      inviteToken: m.inviteToken,
      createdAt: typeof m.createdAt === "string" ? m.createdAt : new Date().toISOString(),
      updatedAt: typeof m.updatedAt === "string" ? m.updatedAt : new Date().toISOString(),
    };
  });
}

/**
 * Invite a new team member
 */
export function inviteTeamMember(
  companyId: string,
  params: {
    businessEmail: string;
    displayName: string;
    role: CompanyMemberRole;
    jobTitle?: string;
    department?: string;
  },
  auth?: AuthContext
): { success: boolean; member?: CompanyTeamMember; inviteLink?: string; error?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const normRole = normalizeRole(params.role);
  const emailClean = params.businessEmail.trim().toLowerCase();
  const nameClean = params.displayName.trim();

  if (!emailClean || !emailClean.includes("@")) {
    return { success: false, error: "Please provide a valid corporate business email address." };
  }

  if (!nameClean) {
    return { success: false, error: "Please provide the team member's full name." };
  }

  // Check calling authorization
  const currentMembers = getCompanyTeam(companyId);
  const caller = currentMembers.find((m) => m.userId === currentAuth.uid || m.businessEmail === currentAuth.email);
  const callerRole = caller?.role || "MEMBER";

  if (callerRole !== "OWNER" && callerRole !== "ADMIN") {
    return { success: false, error: "Access denied: Only Company Owners and Operational Administrators can invite team members." };
  }

  // Guard: ADMIN cannot invite an OWNER
  if (callerRole === "ADMIN" && normRole === "OWNER") {
    return { success: false, error: "Governance rule: Administrators cannot invite or designate a new Company Owner." };
  }

  // Check if member already exists
  const existing = currentMembers.find((m) => m.businessEmail.toLowerCase() === emailClean);
  if (existing) {
    if (existing.status === "ACTIVE") {
      return { success: false, error: `A team member with email '${emailClean}' is already active in this company.` };
    }
    if (existing.status === "PENDING" || existing.status === "INVITED") {
      return { success: false, error: `An invitation for '${emailClean}' is already pending. You can resend or copy the existing invite link.` };
    }
  }

  const userId = `usr-inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const token = `inv-tok-${Math.random().toString(36).substring(2, 12)}`;
  const nowIso = new Date().toISOString();
  const expiresAtIso = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(); // 7 days

  const newMemberEntity: CompanyMemberEntity = {
    userId,
    companyId,
    role: normRole,
    status: "PENDING",
    displayName: nameClean,
    businessEmail: emailClean,
    jobTitle: params.jobTitle?.trim() || getHumanRoleShort(normRole),
    department: params.department?.trim() || "Operations",
    invitedBy: caller?.displayName || currentAuth.displayName || currentAuth.email || "Company Administrator",
    expiresAt: expiresAtIso,
    inviteToken: token,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  saveMember(newMemberEntity);
  saveCompanyMember(companyId, newMemberEntity).catch((err) => {
    console.warn("[TeamService] Firestore saveCompanyMember error:", err);
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("marineworld_members_updated", { detail: { companyId } }));
  }

  const company = getCompanyById(companyId);
  const businessId = company?.businessId || `MW-BUS-${companyId.toUpperCase()}`;

  recordGovernanceAudit(
    currentAuth.uid || "usr-current",
    companyId,
    businessId,
    callerRole,
    "MEMBER_INVITED",
    userId,
    `Invited '${nameClean}' (${emailClean}) as ${getHumanRoleLabel(normRole)}.`
  );

  const inviteLink = `https://marineworld.city/invite/${companyId}/${token}`;

  const companyDisplayName = company?.displayName || company?.legalName || "MarineWorld Partner Organization";

  // Dispatch Transactional Email Notification
  try {
    const subject = `[MarineWorld Studio] Invitation to join ${companyDisplayName} as ${getHumanRoleLabel(normRole)}`;
    const templateData = {
      title: "Company Studio Team Access Invitation",
      recipientName: nameClean,
      primaryActionLabel: "Accept Company Invitation",
      primaryActionUrl: inviteLink,
      bodyParagraphs: [
        `You have been invited by ${newMemberEntity.invitedBy} to join ${companyDisplayName} on MarineWorld.City.`,
        `Your designated role is ${getHumanRoleLabel(normRole)} within the ${newMemberEntity.department} department.`,
        "This invitation link is valid for 7 days. Please accept the invitation to complete your operational profile.",
      ],
      keyDetails: [
        { label: "Company", value: companyDisplayName },
        { label: "Designated Role", value: getHumanRoleLabel(normRole) },
        { label: "Invited By", value: newMemberEntity.invitedBy },
        { label: "Expiration", value: "7 Days" },
      ],
      footerNote: "If you did not expect this invitation, please contact your company administrator.",
    };

    const html = buildInstitutionalEmailHtml(templateData);
    const text = buildInstitutionalEmailText(templateData);

    fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: emailClean,
        toName: nameClean,
        subject,
        html,
        text,
        type: "TEAM_INVITATION",
        referenceId: `inv-${userId}`,
        metadata: { companyId, role: normRole },
      }),
    }).catch((err) => {
      console.warn("[Team Invite Email Delivery Warning]", err?.message || err);
    });
  } catch (err) {
    // Non-blocking
  }

  const createdTeamMember: CompanyTeamMember = {
    ...newMemberEntity,
    role: normRole,
    status: "PENDING",
    displayName: nameClean,
    businessEmail: emailClean,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  return {
    success: true,
    member: createdTeamMember,
    inviteLink,
  };
}

/**
 * Resend / Refresh an invitation
 */
export function resendInvitation(
  companyId: string,
  targetUserId: string,
  auth?: AuthContext
): { success: boolean; inviteLink?: string; error?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const members = getCompanyTeam(companyId);
  const target = members.find((m) => m.userId === targetUserId);

  if (!target) {
    return { success: false, error: "Invitation not found." };
  }

  const token = `inv-tok-${Math.random().toString(36).substring(2, 12)}`;
  const expiresAtIso = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

  const updated: CompanyMemberEntity = {
    userId: target.userId,
    companyId: target.companyId,
    role: target.role,
    status: "PENDING",
    displayName: target.displayName,
    businessEmail: target.businessEmail,
    jobTitle: target.jobTitle,
    department: target.department,
    invitedBy: target.invitedBy,
    expiresAt: expiresAtIso,
    inviteToken: token,
    createdAt: target.createdAt,
    updatedAt: new Date().toISOString(),
  };

  saveMember(updated);
  saveCompanyMember(companyId, updated).catch((err) => {
    console.warn("[TeamService] Firestore resendInvitation error:", err);
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("marineworld_members_updated", { detail: { companyId } }));
  }

  const company = getCompanyById(companyId);
  const businessId = company?.businessId || `MW-BUS-${companyId.toUpperCase()}`;

  recordGovernanceAudit(
    currentAuth.uid || "usr-current",
    companyId,
    businessId,
    "ADMIN",
    "MEMBER_INVITED",
    targetUserId,
    `Refreshed invitation for '${target.displayName}' (${target.businessEmail}).`
  );

  const inviteLink = `https://marineworld.city/invite/${companyId}/${token}`;
  const companyDisplayName = company?.displayName || company?.legalName || "MarineWorld Partner Organization";

  // Dispatch Transactional Email Notification
  try {
    const subject = `[MarineWorld Studio] Refreshed Invitation to join ${companyDisplayName}`;
    const templateData = {
      title: "Refreshed Team Access Invitation",
      recipientName: target.displayName,
      primaryActionLabel: "Accept Company Invitation",
      primaryActionUrl: inviteLink,
      bodyParagraphs: [
        `Your access invitation to join ${companyDisplayName} on MarineWorld.City has been refreshed.`,
        `Your designated role remains ${getHumanRoleLabel(target.role)}.`,
        "Please accept the invitation to complete your operational profile.",
      ],
      keyDetails: [
        { label: "Company", value: companyDisplayName },
        { label: "Designated Role", value: getHumanRoleLabel(target.role) },
        { label: "Expiration", value: "7 Days" },
      ],
    };

    const html = buildInstitutionalEmailHtml(templateData);
    const text = buildInstitutionalEmailText(templateData);

    fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: target.businessEmail,
        toName: target.displayName,
        subject,
        html,
        text,
        type: "TEAM_INVITATION",
        referenceId: `resend-${token}`,
        metadata: { companyId, role: target.role },
      }),
    }).catch((err) => {
      console.warn("[Resend Invite Email Delivery Warning]", err?.message || err);
    });
  } catch (err) {
    // Non-blocking
  }

  return {
    success: true,
    inviteLink,
  };
}

/**
 * Update a member's role
 */
export function updateTeamMemberRole(
  companyId: string,
  targetUserId: string,
  newRole: CompanyMemberRole,
  auth?: AuthContext
): { success: boolean; error?: string } {
  const normRole = normalizeRole(newRole);
  updateFirestoreMemberRole(companyId, targetUserId, normRole).catch((err) => {
    console.warn("[TeamService] Firestore update role error:", err);
  });
  const res = updateMemberRole(companyId, targetUserId, normRole, auth);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("marineworld_members_updated", { detail: { companyId } }));
  }
  return res;
}

/**
 * Suspend a team member
 */
export function suspendTeamMember(
  companyId: string,
  targetUserId: string,
  auth?: AuthContext
): { success: boolean; error?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const members = getCompanyTeam(companyId);
  const target = members.find((m) => m.userId === targetUserId);

  if (target?.role === "OWNER") {
    return { success: false, error: "Owner protection guard: Company Owner cannot be suspended." };
  }

  if (target) {
    saveCompanyMember(companyId, {
      ...target,
      status: "SUSPENDED",
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  }

  const res = updateMembershipStatus(companyId, targetUserId, "SUSPENDED", currentAuth);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("marineworld_members_updated", { detail: { companyId } }));
  }
  return res;
}

/**
 * Reactivate a suspended team member
 */
export function reactivateTeamMember(
  companyId: string,
  targetUserId: string,
  auth?: AuthContext
): { success: boolean; error?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const members = getCompanyTeam(companyId);
  const target = members.find((m) => m.userId === targetUserId);

  if (target) {
    saveCompanyMember(companyId, {
      ...target,
      status: "ACTIVE",
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  }

  const res = updateMembershipStatus(companyId, targetUserId, "ACTIVE", currentAuth);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("marineworld_members_updated", { detail: { companyId } }));
  }
  return res;
}

/**
 * Revoke invitation or remove member
 */
export function revokeTeamMemberAccess(
  companyId: string,
  targetUserId: string,
  auth?: AuthContext
): { success: boolean; error?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const members = getCompanyTeam(companyId);
  const target = members.find((m) => m.userId === targetUserId);

  if (!target) {
    return { success: false, error: "Member not found." };
  }

  if (target.role === "OWNER") {
    const activeOwners = members.filter((m) => m.role === "OWNER" && m.status === "ACTIVE");
    if (activeOwners.length <= 1) {
      return { success: false, error: "Owner protection guard: Cannot remove the sole active Company Owner." };
    }
  }

  removeFirestoreMember(companyId, targetUserId).catch((err) => {
    console.warn("[TeamService] Firestore remove member error:", err);
  });
  deleteMember(companyId, targetUserId);

  const company = getCompanyById(companyId);
  const businessId = company?.businessId || `MW-BUS-${companyId.toUpperCase()}`;

  recordGovernanceAudit(
    currentAuth.uid || "usr-current",
    companyId,
    businessId,
    "ADMIN",
    "MEMBER_REVOKED",
    targetUserId,
    `Revoked company access for '${target.displayName}' (${target.businessEmail}).`
  );

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("marineworld_members_updated", { detail: { companyId } }));
  }

  return { success: true };
}
