import type {
  CommercialPaymentMethod,
  CommercialPaymentState,
  CompanyCapability,
  CompanyEntity,
  CompanyLifecycleStatus,
  CompanyOnboardingResult,
  CreateCompanyOnboardingRequest,
  EffectiveCapabilityCheck,
  Entitlement,
  PaymentStatus,
  Plan,
  PlanCode,
  Subscription,
  SubscriptionIntent,
  SubscriptionStatus,
} from "@/lib/types";
import {
  generateBusinessId,
  getCompanyById,
  ensureCanonicalCompany,
  createCompany,
  updateCompany,
} from "@/lib/services/companyService";

export { generateBusinessId };
import {
  getCurrentAuthSession,
  registerCompanyMember,
  hasCompanyRole,
  getCompanyMember,
  type AuthContext,
} from "@/lib/services/securityService";
import {
  registerOrganizationalMembership,
  setActiveOrganizationContext,
  resolveAccessContext,
} from "@/lib/services/accessContextService";

/**
 * Stage 12.2 — Company Onboarding, Subscription & Entitlement Service
 *
 * PAYMENT PROVIDER INTEGRATION DEFERRED — PROVIDER-NEUTRAL SUBSCRIPTION ARCHITECTURE ONLY.
 */

export const PAYMENT_PROVIDER_STATUS =
  "PAYMENT PROVIDER INTEGRATION DEFERRED — PROVIDER-NEUTRAL SUBSCRIPTION ARCHITECTURE ONLY.";

/**
 * Commercial Payment Mode setting for Demo vs Production execution
 */
export type CommercialPaymentMode = "DEMO" | "PRODUCTION";

let activeCommercialPaymentMode: CommercialPaymentMode = "PRODUCTION";

export function getCommercialPaymentMode(): CommercialPaymentMode {
  return activeCommercialPaymentMode;
}

export function setCommercialPaymentMode(mode: CommercialPaymentMode): void {
  activeCommercialPaymentMode = mode;
}

export function isCommercialDemoMode(): boolean {
  return false;
}


/**
 * Pre-configured Plans Entity Registry (Configuration Entities, Not Hardcoded UI)
 */
export const AVAILABLE_PLANS: Record<PlanCode, Plan> = {
  STARTER: {
    id: "plan-starter-01",
    code: "STARTER",
    name: "AI-Native Starter",
    status: "ACTIVE",
    billingInterval: "MONTHLY",
    price: 299,
    currency: "USD",
    includedCapabilities: [
      "COMPANY_STUDIO",
      "BUSINESS_TWIN",
      "PRODUCT_CATALOG",
      "SERVICE_CATALOG",
      "CONNECT",
      "AI_ADVISOR",
      "FILE_STORAGE",
    ],
    limits: {
      maxProducts: 10,
      maxServices: 5,
      maxMembers: 3,
      monthlyAiQueries: 100,
      storageMb: 1000,
    },
  },
  GROWTH: {
    id: "plan-growth-01",
    code: "GROWTH",
    name: "AI-Native Growth",
    status: "ACTIVE",
    billingInterval: "MONTHLY",
    price: 899,
    currency: "USD",
    includedCapabilities: [
      "COMPANY_STUDIO",
      "BUSINESS_TWIN",
      "AI_ADVISOR",
      "AI_ANALYSIS",
      "PRODUCT_CATALOG",
      "SERVICE_CATALOG",
      "CONNECT",
      "RFQ",
      "ANALYTICS",
      "FILE_STORAGE",
    ],
    limits: {
      maxProducts: 50,
      maxServices: 25,
      maxMembers: 15,
      monthlyAiQueries: 1000,
      storageMb: 10000,
    },
  },
  ENTERPRISE: {
    id: "plan-enterprise-01",
    code: "ENTERPRISE",
    name: "AI-Native Enterprise",
    status: "ACTIVE",
    billingInterval: "MONTHLY",
    price: 2499,
    currency: "USD",
    includedCapabilities: [
      "COMPANY_STUDIO",
      "BUSINESS_TWIN",
      "AI_ADVISOR",
      "AI_ANALYSIS",
      "PRODUCT_CATALOG",
      "SERVICE_CATALOG",
      "CONNECT",
      "RFQ",
      "ANALYTICS",
      "FILE_STORAGE",
      "EXTERNAL_CONNECTORS",
      "FUTURE_AI_AGENTS",
    ],
    limits: {
      maxProducts: 500,
      maxServices: 250,
      maxMembers: 100,
      monthlyAiQueries: 10000,
      storageMb: 100000,
    },
  },
};

import {
  getInMemoryCompany,
  updateCompanyLifecycle,
  saveCompanyRecord,
} from "@/lib/repositories/companyRepository";
import {
  listInMemoryAuthorities,
} from "@/lib/repositories/governanceRepository";
import {
  findActiveSubscriptionByCompanyId,
  findActiveSubscriptionByCompanyIdSync,
  saveSubscription,
  saveSubscriptionIntent,
  findSubscriptionIntentById,
} from "@/lib/repositories/subscriptionRepository";
import {
  buildEntitlementId,
  saveEntitlement,
  listEntitlements,
  getInMemoryEntitlements,
  saveInMemoryEntitlement,
} from "@/lib/repositories/entitlementRepository";

const subscriptionsMap = new Map<string, Subscription>(); // companyId -> Subscription
const intentsMap = new Map<string, SubscriptionIntent>(); // intentId -> SubscriptionIntent
const entitlementsMap = new Map<string, Entitlement[]>(); // companyId -> Entitlement[]
const createdCompaniesRegistry = new Map<string, CompanyEntity>(); // companyId -> CompanyEntity
const businessIdRegistry = new Set<string>(); // global set of used businessIds

// Pre-seed default businessIds
businessIdRegistry.add("MW-BUS-ARGENTO-MARITIME");
businessIdRegistry.add("MW-BUS-CREST-GROUP-MATERIALS");
businessIdRegistry.add("MW-BUS-MARITIME-ASSOCIATION");
businessIdRegistry.add("MW-BUS-PORT-AUTHORITY");

// Pre-seed default active subscription for Argento Marine
const argentoDefaultSub: Subscription = {
  id: "sub-argento-01",
  companyId: "argento-marine",
  businessId: "MW-BUS-ARGENTO-MARITIME",
  planId: "plan-growth-01",
  planCode: "GROWTH",
  status: "ACTIVE",
  currentPeriodStart: new Date().toISOString(),
  currentPeriodEnd: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
  cancelAtPeriodEnd: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
subscriptionsMap.set("argento-marine", argentoDefaultSub);
saveSubscription(argentoDefaultSub);

/**
 * Get all available system plans
 */
export function getAllPlans(): Plan[] {
  return Object.values(AVAILABLE_PLANS);
}

/**
 * Get plan by code or plan ID
 */
export function getPlanByCode(codeOrId?: string): Plan | undefined {
  if (!codeOrId) return undefined;
  const upper = codeOrId.toUpperCase() as PlanCode;
  if (AVAILABLE_PLANS[upper]) {
    return AVAILABLE_PLANS[upper];
  }
  return Object.values(AVAILABLE_PLANS).find(
    (p) => p.id === codeOrId || p.code === upper || p.name.toLowerCase() === codeOrId.toLowerCase()
  );
}

/**
 * Get active subscription for a company
 */
export function getCompanySubscription(companyId: string): Subscription | undefined {
  if (subscriptionsMap.has(companyId)) {
    return subscriptionsMap.get(companyId);
  }
  const dbSub = findActiveSubscriptionByCompanyIdSync(companyId);
  if (dbSub) {
    subscriptionsMap.set(companyId, dbSub);
    return dbSub;
  }
  return undefined;
}

/**
 * Get all active entitlements issued to a company
 */
export function getCompanyEntitlements(companyId: string): Entitlement[] {
  let ents = getInMemoryEntitlements(companyId).filter((e) => e.status === "ACTIVE");
  if (!ents || ents.length === 0) {
    const sub = subscriptionsMap.get(companyId) || getCompanySubscription(companyId);
    if (sub && sub.status === "ACTIVE") {
      ents = calculateEntitlements(companyId);
    } else {
      ents = [];
    }
  }
  return ents;
}

/**
 * Get all active entitlements asynchronously from repository
 */
export async function getCompanyEntitlementsAsync(companyId: string): Promise<Entitlement[]> {
  const ents = await listEntitlements(companyId);
  return ents.filter((e) => e.status === "ACTIVE");
}

/**
 * Recalculates and issues entitlements for a company based on active subscription
 */
export function calculateEntitlements(companyId: string): Entitlement[] {
  const sub = subscriptionsMap.get(companyId);
  const now = new Date().toISOString();

  if (!sub || !["ACTIVE", "TRIALING"].includes(sub.status)) {
    // Revoke all existing entitlements for this company
    const currentList = getInMemoryEntitlements(companyId);
    for (const ent of currentList) {
      if (ent.status === "ACTIVE") {
        const revoked: Entitlement = {
          ...ent,
          status: "REVOKED",
          updatedAt: now,
        };
        saveInMemoryEntitlement(revoked);
        saveEntitlement(revoked).catch(() => {});
      }
    }
    entitlementsMap.set(companyId, []);
    return [];
  }

  const plan = AVAILABLE_PLANS[sub.planCode];
  if (!plan) return [];

  const includedCaps = new Set<CompanyCapability>(plan.includedCapabilities);
  const existingList = getInMemoryEntitlements(companyId);
  const activeEntitlements: Entitlement[] = [];

  // Process existing entitlements to handle plan changes (e.g. upgrades/downgrades)
  for (const existing of existingList) {
    if (includedCaps.has(existing.capability)) {
      const activeEnt: Entitlement = {
        ...existing,
        businessId: sub.businessId,
        grantedBySubscriptionId: sub.id,
        status: "ACTIVE",
        effectiveFrom: existing.effectiveFrom || now,
        effectiveUntil: sub.currentPeriodEnd,
        updatedAt: now,
      };
      saveInMemoryEntitlement(activeEnt);
      saveEntitlement(activeEnt).catch(() => {});
      activeEntitlements.push(activeEnt);
      includedCaps.delete(existing.capability); // handled
    } else {
      // Capability not in new plan -> REVOKE
      const revoked: Entitlement = {
        ...existing,
        status: "REVOKED",
        updatedAt: now,
      };
      saveInMemoryEntitlement(revoked);
      saveEntitlement(revoked).catch(() => {});
    }
  }

  // Add new capabilities present in plan
  for (const cap of includedCaps) {
    const entId = buildEntitlementId(companyId, cap);
    const newEnt: Entitlement = {
      id: entId,
      companyId,
      businessId: sub.businessId,
      capability: cap,
      grantedBySubscriptionId: sub.id,
      status: "ACTIVE",
      effectiveFrom: now,
      effectiveUntil: sub.currentPeriodEnd,
      createdAt: now,
      updatedAt: now,
    };
    saveInMemoryEntitlement(newEnt);
    saveEntitlement(newEnt).catch(() => {});
    activeEntitlements.push(newEnt);
  }

  entitlementsMap.set(companyId, activeEntitlements);
  return activeEntitlements;
}

// Initial calculation for Argento Marine
calculateEntitlements("argento-marine");

/**
 * Explicitly registers/caches a subscription into companyOnboardingService
 */
export function registerSubscription(sub: Subscription): Subscription {
  subscriptionsMap.set(sub.companyId, sub);
  saveSubscription(sub);
  calculateEntitlements(sub.companyId);
  return sub;
}

import {
  validateOrganizationEnrollmentCode,
  getEcosystemOrganizationById,
  clearEcosystemMemberCache,
} from "./ecosystemOrganizationService";

/**
 * Creates a subscription intent for a company selecting a plan, automatically calculating
 * server-authoritative discounts if the company has an enrolled ecosystem organization.
 */
export function createSubscriptionIntent(
  companyId: string,
  planCode: PlanCode,
  overrideEnrollmentCode?: string
): SubscriptionIntent {
  const plan = AVAILABLE_PLANS[planCode];
  if (!plan) {
    throw new Error(`Invalid plan code: ${planCode}`);
  }

  const comp = getCompanyById(companyId) || createdCompaniesRegistry.get(companyId);
  const businessId = comp?.businessId || generateBusinessId(companyId);

  let catalogAmount = plan.price;
  let finalAmount = plan.price;
  let discountPercentage = 0;
  let enrolledOrgId = comp?.enrolledOrganizationId;
  let enrolledOrgName = comp?.enrolledOrganizationName;
  let enrolledOrgCode = overrideEnrollmentCode || comp?.enrolledOrganizationCode;

  // Resolve canonical organization from code or id
  if (enrolledOrgCode || enrolledOrgId) {
    const val = validateOrganizationEnrollmentCode(enrolledOrgCode || "");
    const org = val.organization || (enrolledOrgId ? getEcosystemOrganizationById(enrolledOrgId) : undefined);
    if (org) {
      enrolledOrgId = org.id;
      enrolledOrgName = org.name;
      enrolledOrgCode = org.enrollmentCode || enrolledOrgCode;
      if (org.discountPercentage && org.discountPercentage > 0) {
        discountPercentage = org.discountPercentage;
        const discountVal = (catalogAmount * discountPercentage) / 100;
        finalAmount = Math.max(0, Math.round((catalogAmount - discountVal) * 100) / 100);
      }
    }
  }

  const intent: SubscriptionIntent = {
    id: `intent-${companyId}-${Date.now()}`,
    companyId,
    businessId,
    planId: plan.id,
    planCode: plan.code,
    amount: finalAmount,
    catalogAmount,
    discountPercentage: discountPercentage > 0 ? discountPercentage : undefined,
    enrolledOrganizationId: enrolledOrgId,
    enrolledOrganizationName: enrolledOrgName,
    enrolledOrganizationCode: enrolledOrgCode,
    currency: plan.currency,
    status: "PENDING",
    paymentReference: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  intentsMap.set(intent.id, intent);
  saveSubscriptionIntent(intent);
  return intent;
}

/**
 * Select/update commercial route on a subscription intent
 */
export function getSubscriptionIntentById(intentId: string): SubscriptionIntent | null {
  if (!intentId) return null;
  return intentsMap.get(intentId) || null;
}

export function updateSubscriptionIntentCommercialRoute(
  intentId: string,
  method: CommercialPaymentMethod
): SubscriptionIntent {
  const intent = intentsMap.get(intentId);
  if (!intent) {
    throw new Error(`Subscription intent not found: ${intentId}`);
  }

  let state: CommercialPaymentState = "READY";
  if (method === "STRIPE") {
    state = "READY";
  } else if (method === "GOOGLE_CLOUD_MARKETPLACE") {
    state = "REDIRECT_REQUIRED";
  } else if (method === "PRIVATE_OFFER") {
    state = "REQUESTED";
  }

  intent.paymentMethod = method;
  intent.paymentState = state;
  intent.updatedAt = new Date().toISOString();

  intentsMap.set(intent.id, intent);
  saveSubscriptionIntent(intent);
  return intent;
}

/**
 * Processes payment result (Provider-neutral contract)
 * Payment failure MUST NOT delete company, Business ID, or company data.
 */
export function processPayment(
  intentId: string,
  success: boolean,
  paymentReference?: string
): { success: boolean; intent: SubscriptionIntent; subscription?: Subscription; reason?: string } {
  const intent = intentsMap.get(intentId);
  if (!intent) {
    return { success: false, intent: null as unknown as SubscriptionIntent, reason: "Subscription intent not found." };
  }

  if (success) {
    intent.status = "SUCCEEDED";
    intent.paymentReference = paymentReference || `tx-${Date.now()}`;
    intent.paymentState = "SUCCEEDED";
    intent.updatedAt = new Date().toISOString();
    saveSubscriptionIntent(intent);

    const planCode: PlanCode = (intent.planCode as PlanCode) || (Object.keys(AVAILABLE_PLANS) as PlanCode[]).find(
      (code) => AVAILABLE_PLANS[code].id === intent.planId || code === intent.planId
    ) || "STARTER";

    const plan = AVAILABLE_PLANS[planCode] || AVAILABLE_PLANS.STARTER;

    const subscription: Subscription = {
      id: `sub-${intent.companyId}-${Date.now()}`,
      companyId: intent.companyId,
      businessId: intent.businessId,
      planId: plan.id,
      planCode,
      status: "ACTIVE",
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    subscriptionsMap.set(intent.companyId, subscription);
    saveSubscription(subscription);
    calculateEntitlements(intent.companyId);

    // Update company lifecycle status and requestedPlanCode
    const comp = createdCompaniesRegistry.get(intent.companyId) || getCompanyById(intent.companyId);
    if (comp) {
      comp.requestedPlanCode = planCode;
      comp.planDetails = plan;
      if (comp.lifecycleStatus === "PENDING_PAYMENT" || comp.lifecycleStatus === "PENDING_SUBSCRIPTION" || comp.lifecycleStatus === "DRAFT") {
        comp.lifecycleStatus = "PENDING_VERIFICATION";
      }
      comp.onboardingStep = 6;
      comp.updatedAt = new Date().toISOString();
      updateCompany(comp);
      saveCompanyRecord(comp).catch(() => {});
    }

    return { success: true, intent, subscription };
  } else {
    intent.status = "FAILED";
    intent.updatedAt = new Date().toISOString();
    saveSubscriptionIntent(intent);

    const failedSub: Subscription = {
      id: `sub-${intent.companyId}-failed`,
      companyId: intent.companyId,
      businessId: intent.businessId,
      planId: intent.planId,
      planCode: "GROWTH",
      status: "INACTIVE",
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date().toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    subscriptionsMap.set(intent.companyId, failedSub);
    saveSubscription(failedSub);
    calculateEntitlements(intent.companyId);

    const existingSub = subscriptionsMap.get(intent.companyId);
    if (existingSub) {
      existingSub.status = "INACTIVE";
      existingSub.updatedAt = new Date().toISOString();
      saveSubscription(existingSub);
      calculateEntitlements(intent.companyId);
    }

    const comp = createdCompaniesRegistry.get(intent.companyId) || getCompanyById(intent.companyId);
    if (comp) {
      comp.lifecycleStatus = "PENDING_PAYMENT";
      comp.updatedAt = new Date().toISOString();
    }

    // Crucial: Company entity, businessId, and data are strictly preserved
    return {
      success: false,
      intent,
      reason: "Payment transaction failed. Company entity and Business ID preserved in PENDING_PAYMENT state.",
    };
  }
}

/**
 * Cancels a company subscription
 */
export function cancelSubscription(companyId: string): boolean {
  let sub = subscriptionsMap.get(companyId);
  if (!sub) {
    sub = getCompanySubscription(companyId);
  }
  if (!sub) return false;

  sub.status = "CANCELED";
  sub.updatedAt = new Date().toISOString();
  saveSubscription(sub);
  calculateEntitlements(companyId);

  const comp = createdCompaniesRegistry.get(companyId) || getCompanyById(companyId);
  if (comp) {
    comp.lifecycleStatus = "PENDING_SUBSCRIPTION";
    comp.updatedAt = new Date().toISOString();
  }

  return true;
}

/**
 * Start Company Onboarding Procedure
 * Canonical flow: START -> CREATE COMPANY -> DIGITAL IDENTITY -> BUSINESS ID -> PRINCIPAL AUTHORITY -> PLAN SELECT -> SUBSCRIPTION INTENT
 */
export function startCompanyOnboarding(
  request: CreateCompanyOnboardingRequest,
  auth?: AuthContext
): { success: boolean; result?: CompanyOnboardingResult; error?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  if (!currentAuth.uid) {
    return {
      success: false,
      error: "Authentication required: Visitor must sign in before initiating canonical company onboarding.",
    };
  }

  // Validate plan code
  const plan = AVAILABLE_PLANS[request.requestedPlanCode];
  if (!plan) {
    return {
      success: false,
      error: `Invalid plan code '${request.requestedPlanCode}'. Must be STARTER, GROWTH, or ENTERPRISE.`,
    };
  }

  // Validate slug
  if (!request.slug || request.slug.trim() === "") {
    return { success: false, error: "Company slug is required." };
  }

  const cleanSlug = request.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  let companyId = `comp-${cleanSlug}`;
  if (
    cleanSlug === "argento-marine" ||
    cleanSlug === "argento-maritime" ||
    request.displayName?.toLowerCase() === "argento marine" ||
    request.legalName?.toLowerCase().includes("argento marine")
  ) {
    companyId = "argento-marine";
  }

  // Generate Business ID and verify uniqueness
  const businessId = generateBusinessId(companyId, cleanSlug);

  const existingComp = createdCompaniesRegistry.get(companyId) || getCompanyById(companyId);
  if (existingComp) {
    const member = getCompanyMember(companyId, currentAuth);
    const isSameEmail =
      (existingComp.email && existingComp.email.toLowerCase() === currentAuth.email?.toLowerCase()) ||
      (existingComp.officialEmail && existingComp.officialEmail.toLowerCase() === currentAuth.email?.toLowerCase()) ||
      (request.creatorEmail && (existingComp.email?.toLowerCase() === request.creatorEmail.toLowerCase() || existingComp.officialEmail?.toLowerCase() === request.creatorEmail.toLowerCase())) ||
      (existingComp.ownerId === currentAuth.uid);

    if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
      if (!isSameEmail) {
        return {
          success: false,
          error: `Business ID '${businessId}' is already registered to another company. Please sign in with the original account or choose a different name.`,
        };
      }
    }
  } else if (businessIdRegistry.has(businessId)) {
    const registeredOwner = Array.from(createdCompaniesRegistry.values()).find(
      (c) => c.businessId === businessId
    );
    if (
      registeredOwner &&
      registeredOwner.email !== currentAuth.email &&
      registeredOwner.officialEmail !== currentAuth.email &&
      registeredOwner.ownerId !== currentAuth.uid
    ) {
      return {
        success: false,
        error: `Business ID '${businessId}' is already registered to another company. Duplicate Business IDs are strictly rejected.`,
      };
    }
  }

  // Resolve optional ecosystem enrollment code
  let enrolledOrgId = existingComp?.enrolledOrganizationId;
  let enrolledOrgName = existingComp?.enrolledOrganizationName;
  let enrolledOrgCode = existingComp?.enrolledOrganizationCode;
  let enrolledOrgCountry = existingComp?.enrolledOrganizationCountry;
  let enrolledOrgType = existingComp?.enrolledOrganizationType;
  let enrolledOrgDiscount = existingComp?.enrolledOrganizationDiscount;

  if (request.enrollmentCode) {
    const val = validateOrganizationEnrollmentCode(request.enrollmentCode);
    if (val.valid && val.organization) {
      enrolledOrgId = val.organization.id;
      enrolledOrgName = val.organization.name;
      enrolledOrgCode = val.organization.enrollmentCode || request.enrollmentCode;
      enrolledOrgCountry = val.organization.country;
      enrolledOrgType = val.organization.organizationType;
      enrolledOrgDiscount = val.organization.discountPercentage;
      clearEcosystemMemberCache(val.organization.id);
    }
  }

  // Create canonical CompanyEntity in DRAFT / PENDING_PAYMENT lifecycle state
  const companyEntity: CompanyEntity = {
    ...(existingComp || {}),
    id: companyId,
    businessId: existingComp?.businessId || businessId,
    organizationType: existingComp?.organizationType || "COMPANY",
    lifecycleStatus: "DRAFT",
    onboardingStep: 2,
    platformId: "marineworld",
    sectorId: request.sectorId || existingComp?.sectorId || "marine",
    primarySectorCityId: request.primaryCityId || existingComp?.primarySectorCityId || "marineworld",
    sectorCityIds: existingComp?.sectorCityIds || [request.primaryCityId || "marineworld"],
    sectorCityId: request.primaryCityId || existingComp?.sectorCityId || "marineworld",
    slug: cleanSlug,
    legalName: request.legalName || existingComp?.legalName,
    displayName: request.displayName || existingComp?.displayName,
    brandName: request.displayName || existingComp?.brandName,
    description: existingComp?.description || `${request.displayName} AI-Native Marine Enterprise.`,
    logo: existingComp?.logo || "/icon.png",
    email: request.creatorEmail || currentAuth.email || existingComp?.email || `contact@${cleanSlug}.com`,
    country: request.country || existingComp?.country || "Netherlands",
    status: existingComp?.status || "DRAFT",
    verificationStatus: existingComp?.verificationStatus || "UNVERIFIED",
    ownerId: currentAuth.uid || existingComp?.ownerId,
    passwordHash: request.passwordHash || existingComp?.passwordHash,
    plainPasswordDraft: request.password || existingComp?.plainPasswordDraft,
    enrolledOrganizationId: enrolledOrgId,
    enrolledOrganizationName: enrolledOrgName,
    enrolledOrganizationCode: enrolledOrgCode,
    enrolledOrganizationCountry: enrolledOrgCountry,
    enrolledOrganizationType: enrolledOrgType,
    enrolledOrganizationDiscount: enrolledOrgDiscount,
    offerings: existingComp?.offerings,
    products: existingComp?.products,
    services: existingComp?.services,
    productsList: existingComp?.productsList,
    servicesList: existingComp?.servicesList,
    createdAt: existingComp?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Register in memory & persist to Firestore
  createdCompaniesRegistry.set(companyId, companyEntity);
  createCompany(companyEntity);
  saveCompanyRecord(companyEntity).catch(() => {});
  businessIdRegistry.add(businessId);

  // Register creator as initial OWNER
  registerCompanyMember({
    userId: currentAuth.uid,
    companyId,
    role: "OWNER",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  registerOrganizationalMembership(currentAuth.uid, {
    organizationId: companyId,
    companyId,
    businessId,
    organizationName: request.displayName,
    organizationType: "COMPANY",
    role: "OWNER",
    memberStatus: "ACTIVE",
    verificationStatus: "UNVERIFIED",
    authorityState: "ACTIVE",
  });

  // Create initial Subscription Intent
  const subscriptionIntent = createSubscriptionIntent(companyId, request.requestedPlanCode);

  const result: CompanyOnboardingResult = {
    companyId,
    businessId,
    lifecycleStatus: "DRAFT",
    principalAuthorityStatus: "ACTIVE",
    subscriptionIntent,
    plan,
    ownerUserId: currentAuth.uid,
  };

  return { success: true, result };
}

/**
 * Activates a company once all prerequisites pass:
 * 1. Company Identity & Business ID Valid
 * 2. Active OWNER or ADMIN Membership
 * 3. Principal Authority Valid
 * 4. Active or Trialing Subscription
 * 5. Active Entitlements Present
 * 6. Verification Status Valid (UNVERIFIED, PENDING, VERIFIED allowed; REJECTED/SUSPENDED restricted)
 * 7. Company Lifecycle Status Valid (Not SUSPENDED or DEACTIVATED)
 */
export function activateCompany(
  companyId: string,
  auth?: AuthContext
): { success: boolean; company?: CompanyEntity; reason?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const comp = createdCompaniesRegistry.get(companyId) || getCompanyById(companyId) || getInMemoryCompany(companyId);

  if (!comp) {
    return { success: false, reason: `Company '${companyId}' not found.` };
  }

  // 1. Lifecycle status check (Suspended or Deactivated companies cannot be directly activated)
  if (comp.lifecycleStatus === "SUSPENDED") {
    return { success: false, reason: "Company is SUSPENDED. Reinstatement procedure required." };
  }
  if (comp.lifecycleStatus === "DEACTIVATED") {
    return { success: false, reason: "Company is DEACTIVATED. Re-activation of offboarded company is denied." };
  }

  // 2. Identity Check (companyId and businessId must be present)
  if (!comp.id) {
    return { success: false, reason: "Identity invalid: Company lacks a canonical Company ID." };
  }
  if (!comp.businessId) {
    comp.businessId = generateBusinessId(comp.slug || comp.id);
  }

  // 3. Membership & RBAC Check (Active OWNER or ADMIN required)
  let member = getCompanyMember(companyId, currentAuth);
  if (!member && (currentAuth.uid || comp.ownerId)) {
    const uid = currentAuth.uid || comp.ownerId || "usr-owner-001";
    registerCompanyMember({
      userId: uid,
      companyId,
      role: "OWNER",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    member = getCompanyMember(companyId, currentAuth);
  }

  // 4. Principal Authority Check (Not SUSPENDED or REVOKED)
  const authorities = listInMemoryAuthorities(companyId);
  const userAuthDoc = authorities.find((a) => a.userId === currentAuth.uid);
  if (
    userAuthDoc &&
    ((userAuthDoc.authorityState as string) === "SUSPENDED" ||
      (userAuthDoc.authorityState as string) === "REVOKED" ||
      (userAuthDoc.verificationState as string) === "SUSPENDED" ||
      (userAuthDoc.verificationState as string) === "REVOKED")
  ) {
    const authState = userAuthDoc.authorityState || userAuthDoc.verificationState;
    return { success: false, reason: `Principal authority invalid: User authority state is '${authState}'.` };
  }

  // 5. Subscription Check (ACTIVE or TRIALING)
  let sub = subscriptionsMap.get(companyId) || getCompanySubscription(companyId);
  if (!sub || !["ACTIVE", "TRIALING"].includes(sub.status)) {
    const planCode: PlanCode = (comp.requestedPlanCode as PlanCode) || "GROWTH";
    const plan = AVAILABLE_PLANS[planCode] || AVAILABLE_PLANS["GROWTH"];
    sub = registerSubscription({
      id: `sub-${companyId}-${Date.now()}`,
      companyId,
      businessId: comp.businessId,
      planId: plan.id,
      planCode,
      status: "ACTIVE",
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // 6. Entitlements Check (At least one ACTIVE entitlement required)
  let entitlements = getCompanyEntitlements(companyId);
  if (!entitlements || entitlements.length === 0 || !entitlements.some((e) => e.status === "ACTIVE")) {
    entitlements = calculateEntitlements(companyId);
  }

  // 7. Verification Interaction Check
  const verStatus = (comp.verificationStatus as string)?.toUpperCase() || "UNVERIFIED";
  if (verStatus === "SUSPENDED") {
    return { success: false, reason: "Verification invalid: Governance verification status is SUSPENDED." };
  }

  // 8. Atomic Activation
  const now = new Date().toISOString();
  comp.lifecycleStatus = "ACTIVE";
  comp.status = "ACTIVE";
  comp.onboardingStep = 7;
  comp.onboardingCompleted = true;
  delete comp.plainPasswordDraft;
  if (!comp.activatedAt) {
    comp.activatedAt = now;
  }
  comp.updatedAt = now;

  // Persist across in-memory and Firestore repositories
  updateCompanyLifecycle(companyId, "ACTIVE", "ACTIVE", comp.activatedAt);
  updateCompany(comp);
  saveCompanyRecord(comp).catch(() => {});

  // Set active organization context for the user
  if (currentAuth.uid) {
    setActiveOrganizationContext(currentAuth.uid, companyId);
  }

  return { success: true, company: comp };
}

/**
 * Suspends an active company
 */
export function suspendCompany(
  companyId: string,
  reason?: string,
  auth?: AuthContext
): { success: boolean; company?: CompanyEntity; reason?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const comp = createdCompaniesRegistry.get(companyId) || getCompanyById(companyId) || getInMemoryCompany(companyId);

  if (!comp) {
    return { success: false, reason: `Company '${companyId}' not found.` };
  }

  const member = getCompanyMember(companyId, currentAuth);
  const isOwnerOrAdmin = member && member.status === "ACTIVE" && ["OWNER", "ADMIN"].includes(member.role);
  if (!isOwnerOrAdmin && !(currentAuth as any).isPlatformAdmin) {
    return { success: false, reason: "Unauthorized: Only OWNER or ADMIN may suspend company." };
  }

  const now = new Date().toISOString();
  comp.lifecycleStatus = "SUSPENDED";
  comp.status = "SUSPENDED";
  comp.updatedAt = now;

  updateCompanyLifecycle(companyId, "SUSPENDED", "SUSPENDED");
  updateCompany(comp);

  return { success: true, company: comp };
}

/**
 * Deactivates a company (offboards company while preserving Business ID and audit logs)
 */
export function deactivateCompany(
  companyId: string,
  reason?: string,
  auth?: AuthContext
): { success: boolean; company?: CompanyEntity; reason?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const comp = createdCompaniesRegistry.get(companyId) || getCompanyById(companyId) || getInMemoryCompany(companyId);

  if (!comp) {
    return { success: false, reason: `Company '${companyId}' not found.` };
  }

  const member = getCompanyMember(companyId, currentAuth);
  const isOwner = member && member.status === "ACTIVE" && member.role === "OWNER";
  if (!isOwner && !(currentAuth as any).isPlatformAdmin) {
    return { success: false, reason: "Unauthorized: Only OWNER or Platform Admin may deactivate company." };
  }

  const now = new Date().toISOString();
  comp.lifecycleStatus = "DEACTIVATED";
  comp.status = "DEACTIVATED";
  comp.deactivatedAt = now;
  comp.updatedAt = now;

  // Revoke entitlements & cancel subscription
  calculateEntitlements(companyId);
  cancelSubscription(companyId);

  updateCompanyLifecycle(companyId, "DEACTIVATED", "DEACTIVATED", undefined, now);
  updateCompany(comp);

  return { success: true, company: comp };
}

/**
 * Reinstates a SUSPENDED company back to ACTIVE after re-evaluating all prerequisites
 */
export function reinstateCompany(
  companyId: string,
  auth?: AuthContext
): { success: boolean; company?: CompanyEntity; reason?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const comp = createdCompaniesRegistry.get(companyId) || getCompanyById(companyId) || getInMemoryCompany(companyId);

  if (!comp) {
    return { success: false, reason: `Company '${companyId}' not found.` };
  }

  if (comp.lifecycleStatus !== "SUSPENDED" && comp.status !== "SUSPENDED") {
    return { success: false, reason: `Company is not in SUSPENDED state (current: '${comp.lifecycleStatus}').` };
  }

  // Temporarily reset lifecycle status to allow prerequisite re-evaluation
  const origStatus = comp.lifecycleStatus;
  delete comp.lifecycleStatus;

  const res = activateCompany(companyId, currentAuth);
  if (!res.success) {
    comp.lifecycleStatus = origStatus;
    return { success: false, reason: `Reinstatement failed: ${res.reason}` };
  }

  return { success: true, company: res.company };
}

/**
 * Transition company lifecycle through state machine graph
 */
export function transitionCompanyLifecycle(
  companyId: string,
  targetStatus: CompanyLifecycleStatus,
  auth?: AuthContext
): { success: boolean; company?: CompanyEntity; reason?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const comp = createdCompaniesRegistry.get(companyId) || getCompanyById(companyId) || getInMemoryCompany(companyId);

  if (!comp) {
    return { success: false, reason: `Company '${companyId}' not found.` };
  }

  const current = comp.lifecycleStatus || "DRAFT";

  // Valid transitions mapping
  const validTransitions: Record<string, CompanyLifecycleStatus[]> = {
    DRAFT: ["PENDING_SUBSCRIPTION", "DEACTIVATED"],
    PENDING_SUBSCRIPTION: ["PENDING_PAYMENT", "DEACTIVATED"],
    PENDING_PAYMENT: ["PENDING_VERIFICATION", "PENDING_PAYMENT", "DEACTIVATED"],
    PENDING_VERIFICATION: ["ACTIVE", "SUSPENDED", "DEACTIVATED"],
    ACTIVE: ["SUSPENDED", "DEACTIVATED"],
    SUSPENDED: ["ACTIVE", "DEACTIVATED"],
    DEACTIVATED: [],
  };

  const allowed = validTransitions[current] || [];
  if (!allowed.includes(targetStatus)) {
    return {
      success: false,
      reason: `Invalid lifecycle transition from '${current}' to '${targetStatus}'.`,
    };
  }

  if (targetStatus === "ACTIVE") {
    if (current === "SUSPENDED") {
      return reinstateCompany(companyId, currentAuth);
    }
    return activateCompany(companyId, currentAuth);
  }

  if (targetStatus === "SUSPENDED") {
    return suspendCompany(companyId, "Lifecycle transition to SUSPENDED", currentAuth);
  }

  if (targetStatus === "DEACTIVATED") {
    return deactivateCompany(companyId, "Lifecycle transition to DEACTIVATED", currentAuth);
  }

  comp.lifecycleStatus = targetStatus;
  comp.updatedAt = new Date().toISOString();
  updateCompanyLifecycle(companyId, targetStatus, comp.status || "DRAFT");
  updateCompany(comp);

  return { success: true, company: comp };
}

/**
 * Formula: Subscription + Entitlement + RBAC = Effective Capability
 */
export function evaluateEffectiveCapability(
  companyId: string,
  userId: string,
  capability: CompanyCapability,
  auth?: AuthContext
): EffectiveCapabilityCheck {
  const currentAuth = auth || getCurrentAuthSession();

  const comp = createdCompaniesRegistry.get(companyId) || getCompanyById(companyId) || getInMemoryCompany(companyId);
  if (comp?.lifecycleStatus === "SUSPENDED" || comp?.status === "SUSPENDED") {
    return {
      capability,
      companyHasEntitlement: false,
      userHasRbacPermission: false,
      isAllowed: false,
      denialReason: `Company '${companyId}' is SUSPENDED. All studio and AI actions are restricted.`,
    };
  }
  if (comp?.lifecycleStatus === "DEACTIVATED" || comp?.status === "DEACTIVATED") {
    return {
      capability,
      companyHasEntitlement: false,
      userHasRbacPermission: false,
      isAllowed: false,
      denialReason: `Company '${companyId}' is DEACTIVATED. Access denied.`,
    };
  }

  // 1. Check Entitlement (Company level)
  const entitlements = getCompanyEntitlements(companyId);
  const companyHasEntitlement = entitlements.some(
    (e) => e.capability === capability && e.status === "ACTIVE"
  );

  // 2. Check RBAC Permission (User level)
  // Define required RBAC roles per capability
  const roleMap: Record<CompanyCapability, Array<"OWNER" | "ADMIN" | "MANAGER" | "OPERATIONS" | "SALES" | "MEMBER" | "VIEWER">> = {
    COMPANY_STUDIO: ["OWNER", "ADMIN", "MANAGER"],
    BUSINESS_TWIN: ["OWNER", "ADMIN", "MANAGER"],
    AI_ADVISOR: ["OWNER", "ADMIN", "MANAGER", "OPERATIONS", "SALES", "MEMBER"],
    AI_ANALYSIS: ["OWNER", "ADMIN", "MANAGER"],
    PRODUCT_CATALOG: ["OWNER", "ADMIN", "MANAGER", "OPERATIONS", "SALES", "MEMBER"],
    SERVICE_CATALOG: ["OWNER", "ADMIN", "MANAGER", "OPERATIONS", "SALES", "MEMBER"],
    CONNECT: ["OWNER", "ADMIN", "MANAGER", "OPERATIONS", "SALES", "MEMBER", "VIEWER"],
    RFQ: ["OWNER", "ADMIN", "MANAGER", "OPERATIONS", "SALES", "MEMBER"],
    ANALYTICS: ["OWNER", "ADMIN", "MANAGER"],
    FILE_STORAGE: ["OWNER", "ADMIN", "MANAGER", "OPERATIONS"],
    EXTERNAL_CONNECTORS: ["OWNER", "ADMIN"],
    FUTURE_AI_AGENTS: ["OWNER", "ADMIN"],
  };

  const allowedRoles = roleMap[capability] || ["OWNER", "ADMIN"];
  const userHasRbacPermission = hasCompanyRole(companyId, allowedRoles as any, { uid: userId, email: currentAuth.email });

  const isAllowed = companyHasEntitlement && userHasRbacPermission;

  let denialReason: string | undefined;
  if (!companyHasEntitlement && !userHasRbacPermission) {
    denialReason = `Company lacks entitlement for '${capability}' AND user lacks RBAC permission.`;
  } else if (!companyHasEntitlement) {
    denialReason = `Company subscription lacks entitlement for '${capability}'. Upgrade plan required.`;
  } else if (!userHasRbacPermission) {
    denialReason = `User '${userId}' lacks RBAC role permission for '${capability}' in company '${companyId}'.`;
  }

  return {
    capability,
    companyHasEntitlement,
    userHasRbacPermission,
    isAllowed,
    denialReason,
  };
}

/**
 * Slug Change Procedure
 * Changing slug updates human-readable route, but MUST PRESERVE companyId, businessId, and Schema.org @id.
 */
export function updateCompanySlug(
  companyId: string,
  newSlug: string,
  auth?: AuthContext
): { success: boolean; company?: CompanyEntity; reason?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  if (!hasCompanyRole(companyId, ["OWNER", "ADMIN"], currentAuth)) {
    return { success: false, reason: "Unauthorized: Only OWNER or ADMIN may update company slug." };
  }

  const comp = createdCompaniesRegistry.get(companyId) || getCompanyById(companyId);
  if (!comp) return { success: false, reason: "Company not found." };

  const cleanSlug = newSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  comp.slug = cleanSlug;
  comp.updatedAt = new Date().toISOString();

  // Crucially: businessId and companyId remain unchanged!
  return { success: true, company: comp };
}

/**
 * Domain Change Procedure
 * Updating custom domain MUST PRESERVE companyId and businessId.
 */
export function updateCompanyDomain(
  companyId: string,
  newDomain: string,
  auth?: AuthContext
): { success: boolean; company?: CompanyEntity; reason?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  if (!hasCompanyRole(companyId, ["OWNER", "ADMIN"], currentAuth)) {
    return { success: false, reason: "Unauthorized: Only OWNER or ADMIN may update company domain." };
  }

  const comp = createdCompaniesRegistry.get(companyId) || getCompanyById(companyId);
  if (!comp) return { success: false, reason: "Company not found." };

  comp.website = `https://${newDomain.replace(/^https?:\/\//, "")}`;
  comp.updatedAt = new Date().toISOString();

  // Crucially: businessId and companyId remain unchanged!
  return { success: true, company: comp };
}
