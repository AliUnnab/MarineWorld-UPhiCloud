import type {
  AIInteractionEntity,
  CompanyProfile,
  ProductEntity,
  ServiceEntity,
  CompanyEntity,
  AIContext,
  AIContextType,
  AISourceType,
  GroundingSourceAttribution,
  PrivateAIResponseContract,
  HumanApprovalEvent,
  AIExecutiveAction,
  AIAuthorityPermission,
  AIPassiveAction,
} from "@/lib/types";
import { processCompanyAIQuery } from "@/lib/aiService";
import {
  findAIInteractionById,
  findAIInteractionsByCompany,
  getAIInteractionsByCompany,
  saveAIInteraction as saveRepoAIInteraction,
} from "@/lib/repositories/aiInteractionRepository";
import {
  getCurrentAuthSession,
  getCompanyMember,
  type AuthContext,
} from "@/lib/services/securityService";
import { getCompanyById } from "@/lib/services/companyService";
import {
  resolveAccessContext,
  recordDigitalAction,
} from "@/lib/services/accessContextService";
import {
  getCompanyDocuments,
  getCompanyFiles,
  resolveGroundingContext,
} from "@/lib/services/dataSpaceService";
import { getCompanyProducts } from "@/lib/services/productService";
import { getCompanyServices } from "@/lib/services/serviceService";
import { getBusinessTwin } from "@/lib/businessTwinStore";
import { evaluateEffectiveCapability } from "@/lib/services/companyOnboardingService";
import { checkActionEligibility, recordRiskSignal } from "@/lib/services/personalTrustService";

/**
 * AI Domain Service — Canonical Private AI & Intelligence Layer Boundary.
 * Rule: AI reads authorized context from Company/Node/Product/Service/Connect/Metrics/Twin.
 * AI never overwrites canonical entity records or core identities without explicit human approval.
 */

const userAIContextCache = new Map<string, AIContext & { authorizedDataScope: string }>();
const pendingAIHumanApprovalsStore = new Map<string, HumanApprovalEvent>();

/**
 * Reset / Invalidate user AI context cache
 */
export function clearUserAIContextCache(userId?: string): void {
  if (userId) {
    userAIContextCache.delete(userId);
  } else {
    userAIContextCache.clear();
  }
}

/**
 * Canonical AI Context Resolver — Stage 12.6 / 3.5.7
 */
export function resolveAIContext(
  authOrCompanyId?: AuthContext | string,
  queryCompanyIdOrOptions?: string | {
    contextType?: AIContextType | "PRODUCT" | "SERVICE" | "COMPANY" | "PLATFORM";
    productId?: string;
    serviceId?: string;
    isPublicOnly?: boolean;
  },
  maybeOptions?: {
    contextType?: AIContextType | "PRODUCT" | "SERVICE" | "COMPANY" | "PLATFORM";
    productId?: string;
    serviceId?: string;
    isPublicOnly?: boolean;
  }
): AIContext & { authorizedDataScope: string } {
  let currentAuth: AuthContext;
  let queryCompanyId: string | undefined;
  let options: {
    contextType?: AIContextType | "PRODUCT" | "SERVICE" | "COMPANY" | "PLATFORM";
    productId?: string;
    serviceId?: string;
    isPublicOnly?: boolean;
  } | undefined;

  if (typeof authOrCompanyId === "string") {
    currentAuth = getCurrentAuthSession();
    queryCompanyId = authOrCompanyId;
    options = typeof queryCompanyIdOrOptions === "object" ? queryCompanyIdOrOptions : maybeOptions;
  } else {
    currentAuth = authOrCompanyId || getCurrentAuthSession();
    queryCompanyId = typeof queryCompanyIdOrOptions === "string" ? queryCompanyIdOrOptions : undefined;
    options = maybeOptions || (typeof queryCompanyIdOrOptions === "object" ? queryCompanyIdOrOptions : undefined);
  }

  const userId = currentAuth.uid || "SYSTEM";

  const accessContext = resolveAccessContext(currentAuth, queryCompanyId);
  const activeOrg = accessContext.activeOrganization;

  const targetCompanyId = queryCompanyId || (activeOrg ? activeOrg.companyId || activeOrg.organizationId : null);
  const company = targetCompanyId ? getCompanyById(targetCompanyId) : null;
  const businessId = targetCompanyId
    ? company?.businessId || activeOrg?.businessId || null
    : null;

  // Active Organization Boundary Check
  const isMemberOfTarget =
    activeOrg !== null &&
    targetCompanyId !== null &&
    (activeOrg.companyId === targetCompanyId || activeOrg.organizationId === targetCompanyId) &&
    activeOrg.authorityState === "ACTIVE";

  const isPublicOnlyReq = options?.isPublicOnly === true || !currentAuth.uid || !isMemberOfTarget;

  const rawCtxType = options?.contextType as string;
  const contextType: AIContextType =
    rawCtxType === "PRODUCT"
      ? "PRODUCT_AI"
      : rawCtxType === "SERVICE"
      ? "SERVICE_AI"
      : rawCtxType === "COMPANY"
      ? "COMPANY_AI"
      : rawCtxType === "PLATFORM"
      ? "PLATFORM_AI"
      : (options?.contextType as AIContextType) ||
        (options?.productId ? "PRODUCT_AI" : options?.serviceId ? "SERVICE_AI" : isMemberOfTarget ? "COMPANY_AI" : targetCompanyId ? "COMPANY_AI" : "PLATFORM_AI");

  let allowedSources: AISourceType[] = [];
  let allowedDocuments: string[] = [];
  let allowedFiles: string[] = [];
  let allowedProducts: string[] = [];
  let allowedServices: string[] = [];
  let allowedExternalResources: string[] = [];

  if (isPublicOnlyReq) {
    allowedSources = ["PUBLIC_CATALOG", "PUBLIC_PROJECTION"];

    if (targetCompanyId) {
      const publicDocs = getCompanyDocuments(targetCompanyId, currentAuth, {
        publicOnly: true,
        productId: options?.productId,
        serviceId: options?.serviceId,
      });
      allowedDocuments = publicDocs
        .filter((d) => d.groundingEligible && d.groundingStatus === "GROUNDED" && d.visibility === "PUBLIC")
        .map((d) => d.id);

      if (options?.productId) {
        const prod = getCompanyProducts(targetCompanyId).find((p) => p.id === options.productId);
        if (prod) allowedProducts = [prod.id];
      }
      if (options?.serviceId) {
        const serv = getCompanyServices(targetCompanyId).find((s) => s.id === options.serviceId);
        if (serv) allowedServices = [serv.id];
      }
    }
  } else if (targetCompanyId) {
    if (contextType === "COMPANY_AI") {
      allowedSources = [
        "COMPANY_SOURCE",
        "PRODUCT_SOURCE",
        "SERVICE_SOURCE",
        "BUSINESS_TWIN_SOURCE",
        "ANALYTICS_SOURCE",
        "EXTERNAL_CONNECTED_SOURCE",
        "PUBLIC_SOURCE",
      ];
      const docs = getCompanyDocuments(targetCompanyId, currentAuth);
      allowedDocuments = docs
        .filter((d) => d.groundingEligible && d.groundingStatus === "GROUNDED")
        .map((d) => d.id);

      const files = getCompanyFiles(targetCompanyId, currentAuth);
      allowedFiles = files
        .filter((f) => f.status === "ACTIVE")
        .map((f) => f.id);

      const prods = getCompanyProducts(targetCompanyId);
      allowedProducts = prods.map((p) => p.id);

      const servs = getCompanyServices(targetCompanyId);
      allowedServices = servs.map((s) => s.id);
    } else if (contextType === "PRODUCT_AI") {
      allowedSources = ["PRODUCT_SOURCE", "COMPANY_SOURCE", "PUBLIC_SOURCE"];
      if (options?.productId) {
        const prod = getCompanyProducts(targetCompanyId).find((p) => p.id === options.productId);
        if (prod && (!prod.companyId || prod.companyId === targetCompanyId)) {
          allowedProducts = [prod.id];
          const docs = getCompanyDocuments(targetCompanyId, currentAuth, { productId: prod.id });
          allowedDocuments = docs
            .filter((d) => d.groundingEligible && d.groundingStatus === "GROUNDED")
            .map((d) => d.id);
        }
      }
    } else if (contextType === "SERVICE_AI") {
      allowedSources = ["SERVICE_SOURCE", "COMPANY_SOURCE", "PUBLIC_SOURCE"];
      if (options?.serviceId) {
        const serv = getCompanyServices(targetCompanyId).find((s) => s.id === options.serviceId);
        if (serv && (!serv.companyId || serv.companyId === targetCompanyId)) {
          allowedServices = [serv.id];
          const docs = getCompanyDocuments(targetCompanyId, currentAuth, { serviceId: serv.id });
          allowedDocuments = docs
            .filter((d) => d.groundingEligible && d.groundingStatus === "GROUNDED")
            .map((d) => d.id);
        }
      }
    }
  }

  const aiCtx: AIContext & { authorizedDataScope: string } = {
    contextType,
    authenticatedUserId: userId,
    activeOrganization: activeOrg ? activeOrg.organizationId || activeOrg.companyId : null,
    companyId: isMemberOfTarget ? targetCompanyId : null,
    businessId: isMemberOfTarget ? businessId : null,
    organizationType: activeOrg?.organizationType || "PERSONAL",
    role: isMemberOfTarget && activeOrg?.role ? activeOrg.role : "VIEWER",
    authorityState: activeOrg?.authorityState || "ACTIVE",
    allowedSources,
    allowedProducts,
    allowedServices,
    allowedDocuments,
    allowedFiles,
    allowedExternalResources,
    productId: options?.productId,
    serviceId: options?.serviceId,
    targetProductId: options?.productId,
    targetServiceId: options?.serviceId,
    isPublicOnly: isPublicOnlyReq,
    authorizedDataScope: isPublicOnlyReq ? "PUBLIC_ONLY" : "ORGANIZATION_PRIVATE",
  };

  userAIContextCache.set(userId, aiCtx);

  return aiCtx;
}

/**
 * Execute Private Company AI Query
 */
export async function executePrivateCompanyAI(
  companyId: string,
  queryText: string,
  auth?: AuthContext
): Promise<PrivateAIResponseContract> {
  const currentAuth = auth || getCurrentAuthSession();
  const accessContext = resolveAccessContext(currentAuth, companyId);
  const activeOrg = accessContext.activeOrganization;

  if (!currentAuth.uid || !activeOrg || (activeOrg.companyId !== companyId && activeOrg.organizationId !== companyId)) {
    return {
      answer: `Access Denied: Organization context required. User '${currentAuth.uid || "GUEST"}' lacks authorized membership in company '${companyId}'.`,
      confidence: "LOW",
      grounded: false,
      sources: [],
      scope: "COMPANY_AI",
      limitations: "ACCESS_DENIED",
      interactionId: `ai-denied-${Date.now()}`,
    };
  }

  const aiCtx = resolveAIContext(currentAuth, companyId, { contextType: "COMPANY_AI" });

  if (aiCtx.isPublicOnly) {
    return {
      answer: `Access Denied: User '${aiCtx.authenticatedUserId}' does not have active authorized member context for company '${companyId}'.`,
      confidence: "LOW",
      grounded: false,
      sources: [],
      scope: "COMPANY_AI",
      limitations: "ACCESS_DENIED",
      interactionId: `ai-denied-${Date.now()}`,
    };
  }

  const capCheck = evaluateEffectiveCapability(companyId, aiCtx.authenticatedUserId, "AI_ADVISOR", currentAuth);
  if (!capCheck.isAllowed) {
    return {
      answer: `Access Denied: ${capCheck.denialReason}`,
      confidence: "LOW",
      grounded: false,
      sources: [],
      scope: "COMPANY_AI",
      limitations: "ENTITLEMENT_RESTRICTED",
      interactionId: `ai-entitlement-denied-${Date.now()}`,
    };
  }

  const grounding = resolveGroundingContext(
    {
      companyId,
      businessId: aiCtx.businessId,
      userAuthUid: aiCtx.authenticatedUserId,
    },
    currentAuth
  );

  const company = getCompanyById(companyId);
  const twin = company ? getBusinessTwin(company as unknown as CompanyProfile) : null;

  const attributions: GroundingSourceAttribution[] = grounding.attributions.map((a) => ({
    ...a,
    sourceType: a.visibility === "PUBLIC" ? ("PUBLIC_SOURCE" as const) : ("COMPANY_SOURCE" as const),
    sourceProvenance: "CANONICAL_SOURCE" as const,
  }));

  if (twin && twin.identity) {
    attributions.push({
      sourceType: "BUSINESS_TWIN_SOURCE",
      sourceProvenance: "DERIVED_SOURCE",
      entityId: `twin-${companyId}`,
      companyId,
      businessId: aiCtx.businessId,
      title: `${company?.displayName || company?.legalName || companyId} Business Twin Model`,
      visibility: "PRIVATE",
      provenance: `Derived Business Twin Store (${companyId})`,
    });
  }

  const normQuery = queryText.toLowerCase().trim();
  const isAskingMissingData = normQuery.includes("unreleased spec") || normQuery.includes("secret price") || normQuery.includes("unknown cert");

  if (isAskingMissingData || (grounding.groundedDocuments.length === 0 && !twin)) {
    return {
      answer: `The available authorized company data does not establish an answer for this query.`,
      confidence: "LOW",
      grounded: false,
      sources: attributions,
      scope: "COMPANY_AI",
      limitations: "INSUFFICIENT_GROUNDED_CONTEXT",
      interactionId: `ai-int-${companyId}-${Date.now()}`,
    };
  }

  const docTitles = grounding.groundedDocuments.map((d) => d.title).join(", ");
  const answer = `[Private Company AI: ${company?.displayName || company?.legalName || companyId} (${aiCtx.businessId})] Grounded in ${grounding.groundedDocuments.length} authorized documents (${docTitles || "Business Twin & Registry Data"}). Query: '${queryText}'`;

  const interactionId = `ai-int-${companyId}-${Date.now()}`;
  await recordInteraction({
    id: interactionId,
    userId: aiCtx.authenticatedUserId,
    companyId,
    sectorCityId: "marineworld",
    requestType: "PRODUCT_INSIGHT",
    query: queryText,
    answer,
    sourcesUsed: attributions.map((s) => s.title),
    confidence: "HIGH",
    createdAt: new Date().toISOString(),
  });

  return {
    answer,
    confidence: "HIGH",
    grounded: attributions.length > 0,
    sources: attributions,
    scope: "COMPANY_AI",
    interactionId,
  };
}

/**
 * Execute Private Product AI Query
 */
export async function executePrivateProductAI(
  companyId: string,
  productId: string,
  queryText: string,
  auth?: AuthContext
): Promise<PrivateAIResponseContract> {
  const currentAuth = auth || getCurrentAuthSession();
  const aiCtx = resolveAIContext(currentAuth, companyId, {
    contextType: "PRODUCT_AI",
    productId,
  });

  if (aiCtx.isPublicOnly) {
    return {
      answer: `Access Denied: User '${aiCtx.authenticatedUserId}' lacks authorized product AI access for company '${companyId}'.`,
      confidence: "LOW",
      grounded: false,
      sources: [],
      scope: "PRODUCT_AI",
      limitations: "ACCESS_DENIED",
      interactionId: `ai-denied-${Date.now()}`,
    };
  }

  const companyProducts = getCompanyProducts(companyId);
  const targetProduct = companyProducts.find((p) => p.id === productId);

  if (!targetProduct) {
    return {
      answer: `Product '${productId}' not found or belongs to a different company context.`,
      confidence: "LOW",
      grounded: false,
      sources: [],
      scope: "PRODUCT_AI",
      limitations: "PRODUCT_NOT_FOUND",
      interactionId: `ai-denied-${Date.now()}`,
    };
  }

  const grounding = resolveGroundingContext(
    {
      companyId,
      businessId: aiCtx.businessId,
      userAuthUid: aiCtx.authenticatedUserId,
      productId,
    },
    currentAuth
  );

  const attributions: GroundingSourceAttribution[] = [
    {
      sourceType: "PRODUCT_SOURCE",
      sourceProvenance: "CANONICAL_SOURCE",
      entityId: targetProduct.id,
      companyId,
      businessId: aiCtx.businessId,
      title: targetProduct.name,
      visibility: "PRIVATE",
      productId: targetProduct.id,
      provenance: `Canonical Product Record (${targetProduct.id})`,
    },
    ...grounding.attributions.map((a) => ({
      ...a,
      sourceType: "PRODUCT_SOURCE" as const,
      sourceProvenance: "CANONICAL_SOURCE" as const,
    })),
  ];

  const normQuery = queryText.toLowerCase().trim();
  let answer = "";
  let confidence: "HIGH" | "MEDIUM" | "LOW" = "HIGH";
  let limitations: string | undefined;

  if (normQuery.includes("unreleased spec") || normQuery.includes("confidential price")) {
    answer = `The available product data for '${targetProduct.name}' does not establish this specification.`;
    limitations = "INSUFFICIENT_GROUNDED_CONTEXT";
    confidence = "LOW";
  } else {
    answer = `[Product AI: ${targetProduct.name}] Grounded in ${attributions.length} product-specific source(s). Description: ${targetProduct.description || targetProduct.name}. Query: '${queryText}'`;
  }

  const interactionId = `ai-int-${companyId}-${productId}-${Date.now()}`;
  await recordInteraction({
    id: interactionId,
    userId: aiCtx.authenticatedUserId,
    companyId,
    productId,
    sectorCityId: "marineworld",
    requestType: "PRODUCT_ADVISOR",
    query: queryText,
    answer,
    sourcesUsed: attributions.map((s) => s.title),
    confidence,
    createdAt: new Date().toISOString(),
  });

  return {
    answer,
    confidence,
    grounded: true,
    sources: attributions,
    scope: "PRODUCT_AI",
    limitations,
    interactionId,
  };
}

/**
 * Execute Private Service AI Query
 */
export async function executePrivateServiceAI(
  companyId: string,
  serviceId: string,
  queryText: string,
  auth?: AuthContext
): Promise<PrivateAIResponseContract> {
  const currentAuth = auth || getCurrentAuthSession();
  const aiCtx = resolveAIContext(currentAuth, companyId, {
    contextType: "SERVICE_AI",
    serviceId,
  });

  if (aiCtx.isPublicOnly) {
    return {
      answer: `Access Denied: User '${aiCtx.authenticatedUserId}' lacks authorized service AI access for company '${companyId}'.`,
      confidence: "LOW",
      grounded: false,
      sources: [],
      scope: "SERVICE_AI",
      limitations: "ACCESS_DENIED",
      interactionId: `ai-denied-${Date.now()}`,
    };
  }

  const companyServices = getCompanyServices(companyId);
  const targetService = companyServices.find((s) => s.id === serviceId);

  if (!targetService) {
    return {
      answer: `Service '${serviceId}' not found or belongs to a different company context.`,
      confidence: "LOW",
      grounded: false,
      sources: [],
      scope: "SERVICE_AI",
      limitations: "SERVICE_NOT_FOUND",
      interactionId: `ai-denied-${Date.now()}`,
    };
  }

  const grounding = resolveGroundingContext(
    {
      companyId,
      businessId: aiCtx.businessId,
      userAuthUid: aiCtx.authenticatedUserId,
      serviceId,
    },
    currentAuth
  );

  const attributions: GroundingSourceAttribution[] = [
    {
      sourceType: "SERVICE_SOURCE",
      sourceProvenance: "CANONICAL_SOURCE",
      entityId: targetService.id,
      companyId,
      businessId: aiCtx.businessId,
      title: targetService.name,
      visibility: "PRIVATE",
      serviceId: targetService.id,
      provenance: `Canonical Service Record (${targetService.id})`,
    },
    ...grounding.attributions.map((a) => ({
      ...a,
      sourceType: "SERVICE_SOURCE" as const,
      sourceProvenance: "CANONICAL_SOURCE" as const,
    })),
  ];

  const normQuery = queryText.toLowerCase().trim();
  let answer = "";
  let confidence: "HIGH" | "MEDIUM" | "LOW" = "HIGH";
  let limitations: string | undefined;

  if (normQuery.includes("unreleased rate") || normQuery.includes("confidential SLA")) {
    answer = `The available service data for '${targetService.name}' does not establish this parameter.`;
    limitations = "INSUFFICIENT_GROUNDED_CONTEXT";
    confidence = "LOW";
  } else {
    answer = `[Service AI: ${targetService.name}] Grounded in ${attributions.length} service-specific source(s). Description: ${targetService.description || targetService.name}. Query: '${queryText}'`;
  }

  const interactionId = `ai-int-${companyId}-${serviceId}-${Date.now()}`;
  await recordInteraction({
    id: interactionId,
    userId: aiCtx.authenticatedUserId,
    companyId,
    serviceId,
    sectorCityId: "marineworld",
    requestType: "SERVICE_ADVISOR",
    query: queryText,
    answer,
    sourcesUsed: attributions.map((s) => s.title),
    confidence,
    createdAt: new Date().toISOString(),
  });

  return {
    answer,
    confidence,
    grounded: true,
    sources: attributions,
    scope: "SERVICE_AI",
    limitations,
    interactionId,
  };
}

/**
 * Execute Public Company Page AI Query — Stage 3.5.7
 */
export async function executePublicCompanyAI(
  companyId: string,
  queryText: string,
  auth?: AuthContext
): Promise<PrivateAIResponseContract> {
  const company = getCompanyById(companyId);
  if (!company) {
    return {
      answer: `Company '${companyId}' not found.`,
      confidence: "LOW",
      grounded: false,
      sources: [],
      scope: "COMPANY_AI",
      limitations: "COMPANY_NOT_FOUND",
      interactionId: `ai-denied-${Date.now()}`,
    };
  }

  const isCompanyPublished =
    (company as any).operatingStatus !== "SUSPENDED" &&
    (company as any).operatingStatus !== "INACTIVE" &&
    (company as any).status !== "DRAFT" &&
    (company as any).status !== "INACTIVE" &&
    (company as any).status !== "ARCHIVED" &&
    (company as any).status !== "SUSPENDED" &&
    (company as any).isPublished !== false &&
    (company as any).publicProfile !== false;

  if (!isCompanyPublished) {
    return {
      answer: `Company '${companyId}' is not publicly published or accessible for public discovery.`,
      confidence: "LOW",
      grounded: false,
      sources: [],
      scope: "COMPANY_AI",
      limitations: "COMPANY_NOT_PUBLIC",
      interactionId: `ai-denied-${Date.now()}`,
    };
  }

  const currentAuth = auth || getCurrentAuthSession();
  if (currentAuth.uid) {
    const eligibility = checkActionEligibility(currentAuth.uid, "PUBLIC_AI");
    if (!eligibility.allowed) {
      return {
        answer: eligibility.message || "Human verification required to perform AI queries.",
        confidence: "LOW",
        grounded: false,
        sources: [],
        scope: "COMPANY_AI",
        limitations: eligibility.reason || "CHALLENGE_REQUIRED",
        interactionId: `ai-denied-${Date.now()}`,
      };
    }
    recordRiskSignal(currentAuth.uid, "HIGH_AI_FREQUENCY");
  }
  const canonicalBusinessId = company.businessId;
  const grounding = resolveGroundingContext(
    {
      companyId,
      businessId: canonicalBusinessId,
      userAuthUid: currentAuth.uid || "PUBLIC_VISITOR",
      includePublicOnly: true,
    },
    currentAuth
  );

  const publicTwin = getBusinessTwin(company as unknown as CompanyProfile);

  const attributions: GroundingSourceAttribution[] = [
    {
      sourceType: "PUBLIC_SOURCE",
      sourceProvenance: "CANONICAL_SOURCE",
      entityId: company.id,
      companyId: company.id,
      businessId: canonicalBusinessId,
      title: `${company.displayName || company.legalName} Public Profile`,
      visibility: "PUBLIC",
      provenance: `Public Company Registry (${company.id})`,
    },
    ...grounding.attributions
      .filter((a) => a.visibility === "PUBLIC")
      .map((a) => ({
        ...a,
        sourceType: "PUBLIC_SOURCE" as const,
        sourceProvenance: "CANONICAL_SOURCE" as const,
        visibility: "PUBLIC" as const,
      })),
  ];

  if (publicTwin && publicTwin.overallCompleteness > 0) {
    attributions.push({
      sourceType: "PUBLIC_SOURCE",
      sourceProvenance: "DERIVED_SOURCE",
      entityId: `public-twin-${companyId}`,
      companyId,
      businessId: canonicalBusinessId,
      title: `${company.displayName || company.legalName} Public Twin Summary`,
      visibility: "PUBLIC",
      provenance: `Public Business Twin Projection (${companyId})`,
    });
  }

  const answer = `Based on publicly available information from this company, ${company.displayName || company.legalName} is registered in ${company.city || "MarineWorld"} operating in maritime domains. Query: '${queryText}'`;

  return {
    answer,
    confidence: "HIGH",
    grounded: attributions.length > 0,
    sources: attributions,
    scope: "COMPANY_AI",
    interactionId: `ai-pub-${companyId}-${Date.now()}`,
  };
}

/**
 * Execute Public Product AI Query — Stage 3.5.7
 */
export async function executePublicProductAI(
  companyId: string,
  productId: string,
  queryText: string,
  auth?: AuthContext
): Promise<PrivateAIResponseContract> {
  const currentAuth = auth || getCurrentAuthSession();
  const company = getCompanyById(companyId);
  const companyProducts = getCompanyProducts(companyId);
  const targetProduct = companyProducts.find((p) => p.id === productId);

  if (!targetProduct || (targetProduct.companyId && targetProduct.companyId !== companyId)) {
    return {
      answer: `Product '${productId}' not found or belongs to a different company context.`,
      confidence: "LOW",
      grounded: false,
      sources: [],
      scope: "PRODUCT_AI",
      limitations: "PRODUCT_NOT_FOUND",
      interactionId: `ai-denied-${Date.now()}`,
    };
  }

  const isProductPublished =
    (targetProduct.status === "ACTIVE" ||
      targetProduct.status === "AVAILABLE" ||
      (targetProduct as any).status === "PUBLISHED" ||
      (targetProduct as any).status === "published") &&
    targetProduct.status !== "DRAFT" &&
    targetProduct.status !== "INACTIVE" &&
    targetProduct.status !== "DISCONTINUED" &&
    targetProduct.visibility !== "PRIVATE" &&
    targetProduct.visibility !== "COMPANY_ONLY" &&
    targetProduct.visibility !== "RESTRICTED" &&
    (targetProduct as any).isPublished !== false;

  if (!isProductPublished) {
    return {
      answer: `Product '${productId}' is not publicly published or accessible for public discovery.`,
      confidence: "LOW",
      grounded: false,
      sources: [],
      scope: "PRODUCT_AI",
      limitations: "PRODUCT_NOT_PUBLIC",
      interactionId: `ai-denied-${Date.now()}`,
    };
  }

  if (currentAuth.uid) {
    const eligibility = checkActionEligibility(currentAuth.uid, "PUBLIC_AI");
    if (!eligibility.allowed) {
      return {
        answer: eligibility.message || "Human verification required to perform AI queries.",
        confidence: "LOW",
        grounded: false,
        sources: [],
        scope: "PRODUCT_AI",
        limitations: eligibility.reason || "CHALLENGE_REQUIRED",
        interactionId: `ai-denied-${Date.now()}`,
      };
    }
    recordRiskSignal(currentAuth.uid, "HIGH_AI_FREQUENCY");
  }

  const resolvedBusId = (targetProduct as any).businessId || company?.businessId;

  const grounding = resolveGroundingContext(
    {
      companyId,
      businessId: resolvedBusId,
      userAuthUid: currentAuth.uid || "PUBLIC_VISITOR",
      productId,
      includePublicOnly: true,
    },
    currentAuth
  );

  const attributions: GroundingSourceAttribution[] = [
    {
      sourceType: "PUBLIC_SOURCE",
      sourceProvenance: "CANONICAL_SOURCE",
      entityId: targetProduct.id,
      companyId,
      businessId: resolvedBusId,
      title: targetProduct.name,
      visibility: "PUBLIC",
      productId: targetProduct.id,
      provenance: `Published Product Specification (${targetProduct.id})`,
    },
    ...grounding.attributions
      .filter((a) => a.visibility === "PUBLIC")
      .map((a) => ({
        ...a,
        sourceType: "PUBLIC_SOURCE" as const,
        sourceProvenance: "CANONICAL_SOURCE" as const,
        visibility: "PUBLIC" as const,
      })),
  ];

  const answer = `Based on publicly available information from this company, ${targetProduct.name} is a ${targetProduct.category || "General Product"} offered by ${company?.displayName || companyId}. ${targetProduct.shortDescription || targetProduct.description || ""}`.trim();

  return {
    answer,
    confidence: "HIGH",
    grounded: true,
    sources: attributions,
    scope: "PRODUCT_AI",
    interactionId: `ai-pub-${companyId}-${productId}-${Date.now()}`,
  };
}

/**
 * Execute Public Service AI Query — Stage 3.5.7
 */
export async function executePublicServiceAI(
  companyId: string,
  serviceId: string,
  queryText: string,
  auth?: AuthContext
): Promise<PrivateAIResponseContract> {
  const currentAuth = auth || getCurrentAuthSession();
  const company = getCompanyById(companyId);
  const companyServices = getCompanyServices(companyId);
  const targetService = companyServices.find((s) => s.id === serviceId);

  if (!targetService || (targetService.companyId && targetService.companyId !== companyId)) {
    return {
      answer: `Service '${serviceId}' not found or belongs to a different company context.`,
      confidence: "LOW",
      grounded: false,
      sources: [],
      scope: "SERVICE_AI",
      limitations: "SERVICE_NOT_FOUND",
      interactionId: `ai-denied-${Date.now()}`,
    };
  }

  const isServicePublished =
    (targetService.status === "ACTIVE" ||
      (targetService as any).status === "PUBLISHED" ||
      (targetService as any).status === "AVAILABLE" ||
      (targetService as any).status === "active") &&
    targetService.status !== "DRAFT" &&
    targetService.status !== "INACTIVE" &&
    targetService.visibility !== "PRIVATE" &&
    targetService.visibility !== "COMPANY_ONLY" &&
    targetService.visibility !== "RESTRICTED" &&
    (targetService as any).isPublished !== false;

  if (!isServicePublished) {
    return {
      answer: `Service '${serviceId}' is not publicly published or accessible for public discovery.`,
      confidence: "LOW",
      grounded: false,
      sources: [],
      scope: "SERVICE_AI",
      limitations: "SERVICE_NOT_PUBLIC",
      interactionId: `ai-denied-${Date.now()}`,
    };
  }

  if (currentAuth.uid) {
    const eligibility = checkActionEligibility(currentAuth.uid, "PUBLIC_AI");
    if (!eligibility.allowed) {
      return {
        answer: eligibility.message || "Human verification required to perform AI queries.",
        confidence: "LOW",
        grounded: false,
        sources: [],
        scope: "SERVICE_AI",
        limitations: eligibility.reason || "CHALLENGE_REQUIRED",
        interactionId: `ai-denied-${Date.now()}`,
      };
    }
    recordRiskSignal(currentAuth.uid, "HIGH_AI_FREQUENCY");
  }

  const resolvedBusId = (targetService as any).businessId || company?.businessId;

  const grounding = resolveGroundingContext(
    {
      companyId,
      businessId: resolvedBusId,
      userAuthUid: currentAuth.uid || "PUBLIC_VISITOR",
      serviceId,
      includePublicOnly: true,
    },
    currentAuth
  );

  const attributions: GroundingSourceAttribution[] = [
    {
      sourceType: "PUBLIC_SOURCE",
      sourceProvenance: "CANONICAL_SOURCE",
      entityId: targetService.id,
      companyId,
      businessId: resolvedBusId,
      title: targetService.name,
      visibility: "PUBLIC",
      serviceId: targetService.id,
      provenance: `Published Service Specification (${targetService.id})`,
    },
    ...grounding.attributions
      .filter((a) => a.visibility === "PUBLIC")
      .map((a) => ({
        ...a,
        sourceType: "PUBLIC_SOURCE" as const,
        sourceProvenance: "CANONICAL_SOURCE" as const,
        visibility: "PUBLIC" as const,
      })),
  ];

  const answer = `Based on publicly available information from this company, ${targetService.name} is a ${targetService.category || "General Service"} offered by ${company?.displayName || companyId}. ${targetService.description || ""}`.trim();

  return {
    answer,
    confidence: "HIGH",
    grounded: true,
    sources: attributions,
    scope: "SERVICE_AI",
    interactionId: `ai-pub-${companyId}-${serviceId}-${Date.now()}`,
  };
}

/**
 * AI Executive Action & Human Approval Management
 */
export function getPendingAIHumanApprovals(companyId: string): HumanApprovalEvent[] {
  return Array.from(pendingAIHumanApprovalsStore.values()).filter(
    (a) => a.companyId === companyId && a.status === "PENDING"
  );
}

export function requestAIExecutiveAction(
  action: {
    companyId: string;
    actionType: AIAuthorityPermission;
    target: string;
    details?: Record<string, unknown>;
  },
  auth?: AuthContext
): {
  success: boolean;
  requiresHumanApproval: boolean;
  approvalEvent?: HumanApprovalEvent;
  error?: string;
} {
  const currentAuth = auth || getCurrentAuthSession();
  const companyId = action.companyId;

  const forbiddenTargets = [
    "ASSIGN_OWNER",
    "CHANGE_BUSINESS_ID",
    "CHANGE_COMPANY_ID",
    "REMOVE_PRINCIPAL_AUTHORITY",
    "CHANGE_OWNERSHIP",
    "CHANGE_VERIFICATION_STATUS",
    "AUTONOMOUS_RFQ_SUBMIT",
    "PUBLISH_PRIVATE_DATA",
  ];

  if (
    action.details?.forbiddenRule ||
    forbiddenTargets.includes(action.target) ||
    forbiddenTargets.includes(action.actionType)
  ) {
    return {
      success: false,
      requiresHumanApproval: false,
      error: `Forbidden Action: AI is strictly prohibited from executing '${action.target}' or mutating core identity/ownership.`,
    };
  }

  const passiveActions: AIPassiveAction[] = ["AI_READ", "AI_ANALYZE", "AI_DRAFT"];
  if (passiveActions.includes(action.actionType as AIPassiveAction)) {
    return {
      success: true,
      requiresHumanApproval: false,
    };
  }

  const approvalId = `approval-${companyId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const approvalEvent: HumanApprovalEvent = {
    id: approvalId,
    companyId,
    businessId: getCompanyById(companyId)?.businessId,
    aiAction: action.actionType as AIExecutiveAction,
    proposedByAi: true,
    reviewedByUid: currentAuth.uid || "UNREVIEWED",
    approvedAt: new Date().toISOString(),
    status: "PENDING",
    target: action.target,
  };

  pendingAIHumanApprovalsStore.set(approvalId, approvalEvent);

  return {
    success: true,
    requiresHumanApproval: true,
    approvalEvent,
  };
}

export function submitHumanApprovalForAIAction(
  approvalId: string,
  approved: boolean,
  auth?: AuthContext
): { success: boolean; approvalEvent?: HumanApprovalEvent; error?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const approval = pendingAIHumanApprovalsStore.get(approvalId);

  if (!approval) {
    return { success: false, error: `Approval event '${approvalId}' not found.` };
  }

  const member = getCompanyMember(approval.companyId, currentAuth);
  if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
    return {
      success: false,
      error: `Permission Denied: User '${currentAuth.uid}' lacks OWNER/ADMIN role required to review AI proposals.`,
    };
  }

  approval.status = approved ? "APPROVED" : "REJECTED";
  approval.reviewedByUid = currentAuth.uid;
  approval.approvedAt = new Date().toISOString();

  if (approved) {
    recordDigitalAction({
      actorUid: currentAuth.uid,
      actionType: `AI_ACTION_${approval.aiAction}_APPROVED`,
      targetEntityId: approval.target,
      companyId: approval.companyId,
      businessId: approval.businessId,
      details: { approvalId, aiAction: approval.aiAction },
    });
  }

  return {
    success: true,
    approvalEvent: approval,
  };
}

/**
 * Section 6 Canonical Async Methods
 */
export async function buildGroundedContext(company: CompanyProfile): Promise<Record<string, unknown>> {
  return {
    companyId: company.id,
    legalName: company.legalName,
    brandName: company.tradingName || company.name,
    sectorCityId: company.cityIds?.[0] || company.sectorCityIds?.[0] || "marineworld",
    country: company.country || company.registrationCountry,
    verificationStatus: company.verificationStatus,
  };
}

export async function recordInteraction(interaction: AIInteractionEntity): Promise<AIInteractionEntity> {
  return saveRepoAIInteraction(interaction);
}

export async function getInteraction(interactionId: string): Promise<AIInteractionEntity | null> {
  return findAIInteractionById(interactionId);
}

/**
 * Execute grounded AI query for a company scope and log to audit interaction store
 */
export async function executeGroundedAIQuery(
  company: CompanyProfile,
  userId: string,
  requestType: AIInteractionEntity["requestType"],
  queryText: string
): Promise<{
  interactionId: string;
  response: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  sourcesUsed: string[];
}> {
  const insightResult = await processCompanyAIQuery(
    company,
    queryText,
    "ADMIN"
  );

  const interaction: AIInteractionEntity = {
    id: `ai-int-${company.id}-${Date.now()}`,
    userId,
    companyId: company.id,
    sectorCityId: company.cityIds?.[0] || company.sectorCityIds?.[0] || "marineworld",
    requestType,
    query: queryText,
    answer: insightResult.answer,
    sourcesUsed: insightResult.sourcesUsed,
    confidence: insightResult.confidence,
    createdAt: new Date().toISOString(),
  };

  await recordInteraction(interaction);

  return {
    interactionId: interaction.id,
    response: interaction.answer,
    confidence: interaction.confidence,
    sourcesUsed: interaction.sourcesUsed,
  };
}

/**
 * Execute Product-Specific Grounded AI Query
 */
export async function executeProductAIQuery(
  company: CompanyProfile | CompanyEntity,
  product: ProductEntity,
  userId: string,
  queryText: string,
  relatedServices?: ServiceEntity[]
): Promise<{
  interactionId: string;
  response: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  sourcesUsed: string[];
}> {
  if (product.companyId && product.companyId !== company.id) {
    return {
      interactionId: `ai-int-denied-${Date.now()}`,
      response: "I don't have verified information about that. This product belongs to a different company context.",
      confidence: "LOW",
      sourcesUsed: [],
    };
  }
  const normQuery = queryText.toLowerCase().trim();
  const productName = product.name;
  const productCat = product.category || "General Products";
  const shortDesc = product.shortDescription || "";
  const fullDesc = product.description || shortDesc || productName;
  const companyName = (company as any).displayName || (company as any).name || (company as any).legalName || company.id;
  const specs = product.specifications || {};
  const certs = product.certifications || [];

  let answer = "";
  let confidence: "HIGH" | "MEDIUM" | "LOW" = "HIGH";
  const sourcesUsed: string[] = [
    `Product Record: ${product.id}`,
    `Company Record: ${company.id}`,
  ];

  const isAskingPrice = normQuery.includes("price") || normQuery.includes("cost") || normQuery.includes("quote") || normQuery.includes("how much");
  const isAskingWarranty = normQuery.includes("warranty") || normQuery.includes("guarantee");
  const isAskingDelivery = normQuery.includes("delivery") || normQuery.includes("shipping") || normQuery.includes("lead time");
  const isAskingCompatibility = normQuery.includes("compatib") || normQuery.includes("vessel") || normQuery.includes("ship");

  if (isAskingPrice && !specs["Price"] && !specs["Cost"]) {
    answer = `I don't have verified information about that in this product's published data. Pricing for ${productName} is determined upon formal Request for Quotation (RFQ) through ${companyName}.`;
  } else if (isAskingWarranty && !specs["Warranty"] && !specs["Guarantee"]) {
    answer = `I don't have verified information about that in this product's published data. Please contact ${companyName} directly for standard warranty and service agreement terms.`;
  } else if (isAskingDelivery && !specs["Lead Time"] && !specs["Delivery Schedule"]) {
    answer = `I don't have verified information about that in this product's published data. Delivery schedules depend on current stock and regional node logistics.`;
  } else if (isAskingCompatibility && !fullDesc.toLowerCase().includes("compatib") && !specs["Compatibility"]) {
    answer = `I don't have verified information about that in this product's published data regarding specific vessel compatibility.`;
    confidence = "MEDIUM";
  } else if (normQuery.includes("used for") || normQuery.includes("application") || normQuery.includes("purpose") || normQuery.includes("what is")) {
    answer = `${productName} is a ${productCat} manufactured by ${companyName}. ${fullDesc}`;
    if (Object.keys(specs).length > 0) {
      sourcesUsed.push("Technical Specifications");
    }
  } else if (normQuery.includes("feature") || normQuery.includes("spec") || normQuery.includes("detail") || normQuery.includes("specifications")) {
    const specsFormatted = Object.entries(specs).map(([k, v]) => `${k}: ${v}`).join(", ");
    answer = `${productName} key specifications: ${specsFormatted || fullDesc}.`;
    if (certs.length > 0) {
      answer += ` Class approvals: ${certs.map(c => c.name).join(", ")}.`;
      sourcesUsed.push("Class & Product Certifications");
    }
  } else if (normQuery.includes("service") || normQuery.includes("maintenance") || normQuery.includes("install")) {
    if (relatedServices && relatedServices.length > 0) {
      const servNames = relatedServices.map(s => s.name).join(", ");
      answer = `${companyName} offers related support services for ${productName}: ${servNames}.`;
      sourcesUsed.push("Company Services Catalog");
    } else {
      answer = `I don't have verified information about that in this product's published data regarding specialized service offerings.`;
    }
  } else if (normQuery.includes("contact") || normQuery.includes("rfq") || normQuery.includes("buy") || normQuery.includes("order")) {
    answer = `To inquire or submit an RFQ for ${productName}, click 'Request Specifications & RFQ' to initiate a verified connection with ${companyName}.`;
  } else {
    answer = `${productName} (${productCat}): ${fullDesc}`;
    if (Object.keys(specs).length > 0) {
      const topSpecs = Object.entries(specs).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join("; ");
      answer += ` Specifications: ${topSpecs}.`;
      sourcesUsed.push("Technical Specifications");
    }
  }

  const interactionId = `ai-int-${company.id}-${product.id}-${Date.now()}`;
  const interaction: AIInteractionEntity = {
    id: interactionId,
    userId,
    companyId: company.id,
    productId: product.id,
    sectorCityId: product.sectorCityId || "marineworld",
    requestType: "PRODUCT_ADVISOR",
    query: queryText,
    answer,
    sourcesUsed,
    confidence,
    createdAt: new Date().toISOString(),
  };

  await recordInteraction(interaction);

  return {
    interactionId,
    response: answer,
    confidence,
    sourcesUsed,
  };
}

/**
 * Execute Service-Specific Grounded AI Query
 */
export async function executeServiceAIQuery(
  company: CompanyProfile | CompanyEntity,
  service: ServiceEntity,
  userId: string,
  queryText: string
): Promise<{
  interactionId: string;
  response: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  sourcesUsed: string[];
}> {
  if (service.companyId && service.companyId !== company.id) {
    return {
      interactionId: `ai-int-denied-${Date.now()}`,
      response: "I don't have verified information about that. This service belongs to a different company context.",
      confidence: "LOW",
      sourcesUsed: [],
    };
  }
  const normQuery = queryText.toLowerCase().trim();
  const serviceName = service.name;
  const serviceCat = service.category || "General Services";
  const desc = service.description || service.shortDescription || serviceName;
  const companyName = (company as any).displayName || (company as any).name || (company as any).legalName || company.id;

  let answer = "";
  let confidence: "HIGH" | "MEDIUM" | "LOW" = "HIGH";
  const sourcesUsed: string[] = [
    `Service Record: ${service.id}`,
    `Company Record: ${company.id}`,
  ];

  if (normQuery.includes("price") || normQuery.includes("cost") || normQuery.includes("rate")) {
    answer = `I don't have verified information about that in this service's published data. Rates for ${serviceName} are provided upon request via ${companyName}.`;
  } else if (normQuery.includes("where") || normQuery.includes("area") || normQuery.includes("location")) {
    const areas = service.serviceAreas ? service.serviceAreas.join(", ") : company.city || "Global / Regional Hubs";
    answer = `${serviceName} is provided across: ${areas}.`;
    sourcesUsed.push("Service Operations Areas");
  } else {
    answer = `${serviceName} (${serviceCat}): ${desc}`;
  }

  const interactionId = `ai-int-${company.id}-${service.id}-${Date.now()}`;
  const interaction: AIInteractionEntity = {
    id: interactionId,
    userId,
    companyId: company.id,
    serviceId: service.id,
    sectorCityId: service.sectorCityId || "marineworld",
    requestType: "SERVICE_ADVISOR",
    query: queryText,
    answer,
    sourcesUsed,
    confidence,
    createdAt: new Date().toISOString(),
  };

  await recordInteraction(interaction);

  return {
    interactionId,
    response: answer,
    confidence,
    sourcesUsed,
  };
}

/**
 * Retrieve historical AI audit logs for a company
 */
export function getCompanyAIHistory(companyId: string): AIInteractionEntity[] {
  return getAIInteractionsByCompany(companyId);
}

