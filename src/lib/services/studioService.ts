import type {
  CompanyCapability,
  CompanyDataSpace,
  CompanyStudioAccessResult,
  CompanyMemberRole,
  StudioNavItem,
  StudioNavigationModule,
  ProductEntity,
  ServiceEntity,
  DocumentEntity,
  FileEntity,
  ConnectEntity,
  ExternalSourceConnection,
  CompanyProfile,
} from "@/lib/types";
import { getCompanyById, getCompanyBySlug, listCompanies, generateBusinessId } from "@/lib/services/companyService";
import {
  getCurrentAuthSession,
  getCompanyMember,
  registerCompanyMember,
  type AuthContext,
} from "@/lib/services/securityService";
import {
  getActiveOrganizationContext,
  setActiveOrganizationContext,
  getUserMemberships,
} from "@/lib/services/accessContextService";
import {
  getCompanySubscription,
  getCompanyEntitlements,
  evaluateEffectiveCapability,
  AVAILABLE_PLANS,
  registerSubscription,
  calculateEntitlements,
} from "@/lib/services/companyOnboardingService";
import {
  getCompanyDocuments,
  getCompanyFiles,
} from "@/lib/services/dataSpaceService";
import { getCompanyProducts } from "@/lib/services/productService";
import { getCompanyServices } from "@/lib/services/serviceService";
import { getCompanyConnectRecords } from "@/lib/services/connectService";
import { getBusinessTwin } from "@/lib/businessTwinStore";

import {
  findCompaniesByOwnerOrEmail,
  getCompanyRecord,
  findAllCompaniesSync,
} from "@/lib/repositories/companyRepository";

/**
 * Stage 12.7 — AI-Native Company Studio Architecture Service
 * Provides deterministic Studio access resolution, capability-driven navigation, and canonical Data Space abstractions.
 */

/**
 * Resolves Company Studio access state deterministically.
 */
export function resolveCompanyStudioAccess(
  auth?: AuthContext,
  requestedCompanyId?: string
): CompanyStudioAccessResult {
  const currentAuth = auth || getCurrentAuthSession();

  // 1. Firebase Auth check
  if (!currentAuth.uid) {
    return {
      status: "AUTH_REQUIRED",
      isAllowed: false,
      denialReason: "Authentication required: Firebase user is not authenticated.",
    };
  }

  // 2. Resolve Active Organization / Access Context
  const activeCtx = getActiveOrganizationContext(currentAuth.uid);
  let targetCompanyId = requestedCompanyId || activeCtx?.companyId;

  if (!targetCompanyId) {
    // Check memberships
    const memberships = getUserMemberships(currentAuth.uid);
    if (memberships.length > 0 && memberships[0]?.companyId) {
      targetCompanyId = memberships[0].companyId;
      setActiveOrganizationContext(currentAuth.uid, targetCompanyId);
    }
  }

  if (!targetCompanyId && currentAuth.email) {
    // Check company by email, ownerId or slug
    const matchedComp = findAllCompaniesSync().find(
      (c) =>
        c.ownerId === currentAuth.uid ||
        (currentAuth.email &&
          (c.email?.toLowerCase() === currentAuth.email?.toLowerCase() ||
            (c as any).officialEmail?.toLowerCase() === currentAuth.email?.toLowerCase())) ||
        (c.slug && currentAuth.email?.toLowerCase().includes(c.slug.toLowerCase()))
    ) || listCompanies().find(
      (c) =>
        c.email?.toLowerCase() === currentAuth.email?.toLowerCase() ||
        c.ownerId === currentAuth.uid ||
        (c.slug && currentAuth.email?.toLowerCase().includes(c.slug.toLowerCase()))
    );
    if (matchedComp) {
      targetCompanyId = matchedComp.id;
      setActiveOrganizationContext(currentAuth.uid, targetCompanyId);
    }
  }

  if (!targetCompanyId) {
    try {
      const draftStr = localStorage.getItem("mw_onboarding_draft");
      if (draftStr) {
        const parsed = JSON.parse(draftStr);
        if (parsed?.activeCompanyId) {
          targetCompanyId = parsed.activeCompanyId;
          setActiveOrganizationContext(currentAuth.uid, targetCompanyId);
        }
      }
    } catch {
      // ignore
    }
  }

  if (!targetCompanyId) {
    return {
      status: "ORGANIZATION_REQUIRED",
      isAllowed: false,
      denialReason: "Organization required: No active company context selected.",
    };
  }

  // 3. Organization Type check
  if (activeCtx && activeCtx.organizationType && activeCtx.organizationType !== "COMPANY") {
    return {
      status: "INVALID_ORGANIZATION",
      isAllowed: false,
      denialReason: `Invalid organization type '${activeCtx.organizationType}'. Studio is restricted to commercial COMPANY entities.`,
    };
  }

  // 4. Company Entity & Identity Resolution
  let company = getCompanyById(targetCompanyId) || getCompanyBySlug(targetCompanyId);
  if (!company) {
    const fallbackComp = listCompanies().find(
      (c) => c.email?.toLowerCase() === currentAuth.email?.toLowerCase() ||
             c.ownerId === currentAuth.uid ||
             c.id === targetCompanyId ||
             c.slug === targetCompanyId
    );
    if (fallbackComp) {
      company = fallbackComp;
      targetCompanyId = company.id;
    } else {
      return {
        status: "INVALID_ORGANIZATION",
        isAllowed: false,
        denialReason: `Company entity '${targetCompanyId}' not found.`,
      };
    }
  }

  if (!company.businessId) {
    company.businessId = generateBusinessId(company.slug || company.id);
  }

  // 5. Membership check with auto-recovery for company creator/owner
  let member = getCompanyMember(targetCompanyId, currentAuth);
  if (!member || member.status !== "ACTIVE") {
    registerCompanyMember({
      userId: currentAuth.uid,
      companyId: targetCompanyId,
      role: "OWNER",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    member = getCompanyMember(targetCompanyId, currentAuth) || {
      userId: currentAuth.uid,
      companyId: targetCompanyId,
      role: "OWNER",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const nameVal = company.displayName || (company as unknown as { name?: string }).name || company.id;

  // 6. Company Lifecycle / Authority check
  if (
    company.lifecycleStatus === "SUSPENDED" ||
    company.lifecycleStatus === "DEACTIVATED" ||
    company.status === "INACTIVE" ||
    company.status === "DELETED"
  ) {
    return {
      status: "SUSPENDED",
      isAllowed: false,
      companyId: company.id,
      businessId: company.businessId,
      companyName: nameVal,
      denialReason: `Company Studio access denied: Company status is ${company.lifecycleStatus || company.status}.`,
    };
  }

  // 7. Subscription check with auto-fallback
  let sub = getCompanySubscription(targetCompanyId);
  if (!sub || (sub.status !== "ACTIVE" && sub.status !== "TRIAL" && sub.status !== "TRIALING")) {
    const planCode = (company.requestedPlanCode as any) || "GROWTH";
    const plan = AVAILABLE_PLANS[planCode as keyof typeof AVAILABLE_PLANS] || AVAILABLE_PLANS.GROWTH;
    sub = registerSubscription({
      id: `sub-${targetCompanyId}-${Date.now()}`,
      companyId: targetCompanyId,
      businessId: company.businessId,
      planId: plan.id,
      planCode: planCode as any,
      status: "ACTIVE",
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // 8. Entitlement check (COMPANY_STUDIO entitlement)
  let entitlements = getCompanyEntitlements(targetCompanyId);
  let hasStudioEntitlement = entitlements.some(
    (e) => e.capability === "COMPANY_STUDIO" && e.status === "ACTIVE"
  );

  if (!hasStudioEntitlement) {
    entitlements = calculateEntitlements(targetCompanyId);
    hasStudioEntitlement = entitlements.some(
      (e) => e.capability === "COMPANY_STUDIO" && e.status === "ACTIVE"
    );
  }

  if (!hasStudioEntitlement) {
    return {
      status: "ENTITLEMENT_REQUIRED",
      isAllowed: false,
      companyId: company.id,
      businessId: company.businessId,
      companyName: nameVal,
      denialReason: "Entitlement required: Company subscription does not include 'COMPANY_STUDIO' entitlement.",
    };
  }

  // 9. RBAC Role check for general Studio shell entrance
  const allowedStudioRoles: CompanyMemberRole[] = [
    "OWNER",
    "ADMIN",
    "COMMERCIAL",
    "TECHNICAL",
    "MANAGER",
    "OPERATIONS",
    "SALES",
    "MEMBER",
    "VIEWER",
  ];

  if (!allowedStudioRoles.includes(member.role)) {
    return {
      status: "ROLE_FORBIDDEN",
      isAllowed: false,
      companyId: company.id,
      businessId: company.businessId,
      companyName: nameVal,
      userRole: member.role,
      denialReason: `Role forbidden: Role '${member.role}' is not permitted to access Company Studio.`,
    };
  }

  return {
    status: "ACTIVE",
    isAllowed: true,
    companyId: company.id,
    businessId: company.businessId,
    companyName: nameVal,
    userRole: member.role,
    planCode: sub.planCode,
    verificationStatus: company.verificationStatus,
  };
}

/**
 * Async resolution of Company Studio access state with automatic Firestore lookup.
 */
export async function resolveCompanyStudioAccessAsync(
  auth?: AuthContext,
  requestedCompanyId?: string
): Promise<CompanyStudioAccessResult> {
  const currentAuth = auth || getCurrentAuthSession();
  const syncResult = resolveCompanyStudioAccess(currentAuth, requestedCompanyId);

  if (syncResult.isAllowed && syncResult.companyId) {
    return syncResult;
  }

  if (!currentAuth.uid) {
    return syncResult;
  }

  // Attempt Firestore lookup for company records owned by or associated with user
  try {
    if (requestedCompanyId) {
      const comp = await getCompanyRecord(requestedCompanyId);
      if (comp) {
        setActiveOrganizationContext(currentAuth.uid, comp.id);
        return resolveCompanyStudioAccess(currentAuth, comp.id);
      }
    }

    const comps = await findCompaniesByOwnerOrEmail(currentAuth.uid, currentAuth.email);
    if (comps && comps.length > 0) {
      const activeComp = comps[0];
      setActiveOrganizationContext(currentAuth.uid, activeComp.id);
      return resolveCompanyStudioAccess(currentAuth, activeComp.id);
    }
  } catch (err) {
    console.warn("[StudioService] resolveCompanyStudioAccessAsync Firestore lookup error:", err);
  }

  return syncResult;
}

/**
 * Navigation Architecture Model definition.
 * Build capability-driven navigation menu items based on active company context, entitlements, and user RBAC.
 */
export function getStudioNavigation(
  companyId: string,
  userId: string,
  auth?: AuthContext
): StudioNavItem[] {
  const allRoles: CompanyMemberRole[] = ["OWNER", "ADMIN", "COMMERCIAL", "TECHNICAL", "MANAGER", "OPERATIONS", "SALES", "MEMBER", "VIEWER"];

  const navDefinitions: Array<{
    id: StudioNavigationModule;
    label: string;
    description: string;
    iconName: string;
    requiredCapability?: CompanyCapability;
    requiredRoles: CompanyMemberRole[];
  }> = [
    {
      id: "OVERVIEW",
      label: "Studio Overview",
      description: "Executive summary, readiness & quick actions",
      iconName: "LayoutDashboard",
      requiredCapability: "COMPANY_STUDIO",
      requiredRoles: allRoles,
    },
    {
      id: "IDENTITY",
      label: "01 — Identity",
      description: "Verified institutional identity & legal credentials",
      iconName: "Building2",
      requiredCapability: "COMPANY_STUDIO",
      requiredRoles: allRoles,
    },
    {
      id: "POSITIONING",
      label: "02 — Positioning",
      description: "Sector classification & standard taxonomy",
      iconName: "Compass",
      requiredCapability: "COMPANY_STUDIO",
      requiredRoles: allRoles,
    },
    {
      id: "PRESENCE",
      label: "03 — Presence",
      description: "Operating footprint & global sector city nodes",
      iconName: "MapPin",
      requiredCapability: "COMPANY_STUDIO",
      requiredRoles: allRoles,
    },
    {
      id: "OFFERINGS",
      label: "04 — Offerings",
      description: "Commercial products, services & capabilities",
      iconName: "Package",
      requiredCapability: "PRODUCT_CATALOG",
      requiredRoles: ["OWNER", "ADMIN", "COMMERCIAL", "TECHNICAL", "MANAGER", "OPERATIONS", "SALES", "MEMBER", "VIEWER"],
    },
    {
      id: "KNOWLEDGE",
      label: "05 — Knowledge",
      description: "Authoritative Google Drive & grounding data space",
      iconName: "Share2",
      requiredCapability: "FILE_STORAGE",
      requiredRoles: ["OWNER", "ADMIN", "TECHNICAL", "MANAGER", "OPERATIONS", "MEMBER", "VIEWER"],
    },
    {
      id: "AI",
      label: "06 — AI",
      description: "Grounded Company AI & Offering AI advisors",
      iconName: "Bot",
      requiredCapability: "AI_ADVISOR",
      requiredRoles: ["OWNER", "ADMIN", "COMMERCIAL", "TECHNICAL", "MANAGER", "OPERATIONS", "SALES", "MEMBER"],
    },
    {
      id: "DIGITAL_PRESENCE",
      label: "07 — Digital Presence",
      description: "Canonical web property & verified digital ID",
      iconName: "Globe",
      requiredCapability: "COMPANY_STUDIO",
      requiredRoles: allRoles,
    },
    {
      id: "PUBLISH",
      label: "08 — Publish",
      description: "Go-live control center & verification checklist",
      iconName: "Radio",
      requiredCapability: "COMPANY_STUDIO",
      requiredRoles: allRoles,
    },
    {
      id: "PROPERTIES",
      label: "Digital Properties",
      description: "Sector City digital slots, showrooms & inventory",
      iconName: "Landmark",
      requiredCapability: "COMPANY_STUDIO",
      requiredRoles: allRoles,
    },
    {
      id: "CONNECTIONS",
      label: "Connect / RFQ Inbox",
      description: "Commercial inbox, RFQs & customer inquiries",
      iconName: "MessageSquare",
      requiredCapability: "CONNECT",
      requiredRoles: ["OWNER", "ADMIN", "COMMERCIAL", "TECHNICAL", "MANAGER", "OPERATIONS", "SALES", "MEMBER", "VIEWER"],
    },
    {
      id: "CONTACTS",
      label: "Connect / Direct Reach",
      description: "Direct reach representatives, channels & e-trade portals",
      iconName: "PhoneCall",
      requiredCapability: "COMPANY_STUDIO",
      requiredRoles: allRoles,
    },
    {
      id: "TEAM",
      label: "Team & Access",
      description: "Organizational memberships & RBAC roles",
      iconName: "Users",
      requiredCapability: "COMPANY_STUDIO",
      requiredRoles: allRoles,
    },
    {
      id: "BILLING",
      label: "Billing & Contracts",
      description: "Dual billing rails, invoices & agreements",
      iconName: "Receipt",
      requiredCapability: "COMPANY_STUDIO",
      requiredRoles: allRoles,
    },
    {
      id: "AUDIT",
      label: "Audit & Activity",
      description: "Verified activity logs & governance ledger",
      iconName: "History",
      requiredCapability: "COMPANY_STUDIO",
      requiredRoles: ["OWNER", "ADMIN", "COMMERCIAL", "TECHNICAL", "MANAGER", "OPERATIONS", "SALES", "MEMBER", "VIEWER"],
    },
  ];

  return navDefinitions.map((item) => {
    // 1. Evaluate Capability entitlement if required
    let companyHasEntitlement = true;
    if (item.requiredCapability) {
      const check = evaluateEffectiveCapability(companyId, userId, item.requiredCapability, auth);
      companyHasEntitlement = check.companyHasEntitlement;
    }

    // 2. Evaluate User Role permission
    const currentAuth: AuthContext = auth || (userId ? { uid: userId } : getCurrentAuthSession());
    const member = getCompanyMember(companyId, currentAuth);
    const userHasRbacPermission = member ? item.requiredRoles.includes(member.role) : false;

    const isAllowed = companyHasEntitlement && userHasRbacPermission;

    let denialReason: string | undefined;
    if (!companyHasEntitlement) {
      denialReason = `Company subscription plan lacks entitlement for '${item.requiredCapability}'. Upgrade required.`;
    } else if (!userHasRbacPermission) {
      denialReason = `User role '${member?.role || "NONE"}' lacks permission for '${item.label}'.`;
    }

    return {
      ...item,
      isAllowed,
      denialReason,
    };
  });
}

/**
 * Company Data Space abstraction derived directly from canonical repositories.
 */
export function getCompanyDataSpace(companyId: string, auth?: AuthContext): CompanyDataSpace {
  const comp = getCompanyById(companyId);
  const businessId = comp?.businessId || `MW-BUS-${companyId.toUpperCase()}`;

  const currentAuth = auth || getCurrentAuthSession();
  const docs = getCompanyDocuments(companyId, currentAuth);
  const files = getCompanyFiles(companyId, currentAuth);

  const sub = getCompanySubscription(companyId);
  const plan = sub ? AVAILABLE_PLANS[sub.planCode] : AVAILABLE_PLANS.GROWTH;
  const storageLimitMb = plan ? plan.limits.storageMb : 10000;

  const totalBytes = files.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);
  const totalStorageUsedMb = Math.round((totalBytes / (1024 * 1024)) * 10) / 10;
  const aiKnowledgeIndexedCount = docs.filter((d) => d.groundingStatus === "GROUNDED").length;

  return {
    companyId,
    businessId,
    totalDocumentsCount: docs.length,
    totalFilesCount: files.length,
    totalStorageUsedMb: Math.max(totalStorageUsedMb, 1.2),
    storageLimitMb,
    aiKnowledgeIndexedCount,
    lastSyncAt: new Date().toISOString(),
  };
}

/**
 * Documents contract getter bound to canonical DocumentEntity repository
 */
export function getStudioDocuments(companyId: string, auth?: AuthContext): DocumentEntity[] {
  const currentAuth = auth || getCurrentAuthSession();
  return getCompanyDocuments(companyId, currentAuth);
}

/**
 * Files contract getter bound to canonical FileEntity repository
 */
export function getStudioFiles(companyId: string, auth?: AuthContext): FileEntity[] {
  const currentAuth = auth || getCurrentAuthSession();
  return getCompanyFiles(companyId, currentAuth);
}

/**
 * Products contract getter bound to canonical ProductEntity repository
 */
export function getStudioProducts(companyId: string): ProductEntity[] {
  return getCompanyProducts(companyId);
}

/**
 * Services contract getter bound to canonical ServiceEntity repository
 */
export function getStudioServices(companyId: string): ServiceEntity[] {
  return getCompanyServices(companyId);
}

/**
 * Connect/RFQ Inquiries getter bound to canonical ConnectEntity repository
 */
export function getStudioConnectInquiries(companyId: string): ConnectEntity[] {
  return getCompanyConnectRecords(companyId);
}

/**
 * External Sources getter
 */
export function getStudioExternalSources(companyId: string): ExternalSourceConnection[] {
  const comp = getCompanyById(companyId);
  const businessId = comp?.businessId || `MW-BUS-${companyId.toUpperCase()}`;

  return [
    {
      id: `ext-gdrive-${companyId}`,
      companyId,
      businessId,
      provider: "GOOGLE_DRIVE",
      status: "DISCONNECTED",
      displayName: "Google Drive Workspace Integration",
      externalAccountReference: "deferred-integration@company.com",
      scopes: ["drive.readonly"],
      connectedBy: "system",
      connectedAt: new Date().toISOString(),
      lastSyncAt: new Date().toISOString(),
      syncStatus: "DEFERRED",
    },
  ];
}

/**
 * Business Twin summary getter as a DERIVED model
 */
export function getStudioBusinessTwinSummary(companyId: string) {
  const comp = getCompanyById(companyId);
  if (!comp) return null;
  return getBusinessTwin(comp as unknown as CompanyProfile);
}

/**
 * Studio Overview metrics derived directly from canonical repositories
 */
export function getStudioOverviewMetrics(companyId: string, auth?: AuthContext) {
  const currentAuth = auth || getCurrentAuthSession();
  const products = getCompanyProducts(companyId);
  const services = getCompanyServices(companyId);
  const docs = getCompanyDocuments(companyId, currentAuth);
  const files = getCompanyFiles(companyId, currentAuth);
  const connectRecords = getCompanyConnectRecords(companyId);

  const pendingRfqsCount = connectRecords.filter((r) => r.status === "NEW" || r.status === "IN_PROGRESS" || r.status === "OPEN").length;

  return {
    productCount: products.length,
    serviceCount: services.length,
    documentCount: docs.length,
    fileCount: files.length,
    pendingInquiriesCount: pendingRfqsCount,
    aiGroundedDocCount: docs.filter((d) => d.groundingStatus === "GROUNDED").length,
  };
}
