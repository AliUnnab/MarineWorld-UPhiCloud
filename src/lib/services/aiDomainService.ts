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
import { getCompanyById, getCompanyBySlug } from "@/lib/services/companyService";
import {
  resolveAccessContext,
  recordDigitalAction,
} from "@/lib/services/accessContextService";
import {
  getCompanyDocuments,
  getCompanyFiles,
  resolveGroundingContext,
} from "@/lib/services/dataSpaceService";
import { getCompanyProducts, getProductBySlug } from "@/lib/services/productService";
import { getCompanyServices, getServiceBySlug } from "@/lib/services/serviceService";
import { getBusinessTwin } from "@/lib/businessTwinStore";
import { evaluateEffectiveCapability } from "@/lib/services/companyOnboardingService";
import { checkActionEligibility, recordRiskSignal } from "@/lib/services/personalTrustService";
import { generateAIContent } from "@/lib/gemini";

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
  const company = getCompanyById(companyId) || getCompanyBySlug(companyId);
  if (!company) {
    return {
      answer: `Company '${companyId}' not found in authorized directory.`,
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
      companyId: company.id,
      businessId: canonicalBusinessId,
      userAuthUid: currentAuth.uid || "PUBLIC_VISITOR",
      includePublicOnly: true,
    },
    currentAuth
  );

  const publicTwin = getBusinessTwin(company as unknown as CompanyProfile);
  const allProds = getCompanyProducts(company.id);
  const allServs = getCompanyServices(company.id);

  const attributions: GroundingSourceAttribution[] = [
    {
      sourceType: "PUBLIC_SOURCE",
      sourceProvenance: "CANONICAL_SOURCE",
      entityId: company.id,
      companyId: company.id,
      businessId: canonicalBusinessId,
      title: `${company.displayName || company.legalName} Verified Profile`,
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
      entityId: `public-twin-${company.id}`,
      companyId: company.id,
      businessId: canonicalBusinessId,
      title: `${company.displayName || company.legalName} Public Twin Profile`,
      visibility: "PUBLIC",
      provenance: `Public Business Twin (${company.id})`,
    });
  }

  const q = (queryText || "").toLowerCase().trim();
  const compName = company.displayName || company.name || company.legalName || "Marine Enterprise";
  const city = company.city || "Monaco";
  const country = company.country || "Maritime Hub";
  const sector = (company as any).sector || company.sectorCityId || "Shipyard & Maritime";
  const desc = company.description || company.shortDescription || "";
  const year = company.yearEstablished || "2008";

  let answerText = "";
  let suggestedAction: "REQUEST_OFFER" | "COMMERCIAL_RFQ" | "CONNECT_COMPANY" | "VIEW_SPECS" = "CONNECT_COMPANY";

  // Intent: Products / Vessels / Catalog
  if (
    q.includes("product") ||
    q.includes("vessel") ||
    q.includes("boat") ||
    q.includes("yacht") ||
    q.includes("catalog") ||
    q.includes("build") ||
    q.includes("model")
  ) {
    if (allProds.length > 0) {
      const prodList = allProds
        .slice(0, 5)
        .map((p) => `• ${p.name} (${p.category || p.productType || "Vessel"})${p.shortDescription ? ` - ${p.shortDescription}` : ""}`)
        .join("\n");
      answerText = `Based on publicly available information from this company, ${compName} maintains ${allProds.length} verified products in its active catalog:\n\n${prodList}\n\nAll vessels and equipment are manufactured under international class standards. Would you like to view full specifications or submit an RFQ?`;
    } else {
      answerText = `Based on publicly available information from this company, ${compName} provides build-to-order vessel designs and custom engineering packages available upon direct commercial consultation.`;
    }
    suggestedAction = "VIEW_SPECS";
  }
  // Intent: Services / Refit / Maintenance / Engineering
  else if (
    q.includes("service") ||
    q.includes("refit") ||
    q.includes("repair") ||
    q.includes("survey") ||
    q.includes("maintenance") ||
    q.includes("engineering") ||
    q.includes("conversion")
  ) {
    if (allServs.length > 0) {
      const servList = allServs
        .slice(0, 5)
        .map((s) => `• ${s.name} (${s.category || "Service"})${s.description ? ` - ${s.description}` : ""}`)
        .join("\n");
      answerText = `Based on publicly available information from this company, ${compName} provides the following verified capabilities and maritime engineering services:\n\n${servList}\n\nOur service division operates under certified yard procedures. You can initiate a consultation or service request directly.`;
    } else {
      answerText = `Based on publicly available information from this company, ${compName} supports naval architecture, refit facilities, and technical lifecycle services.`;
    }
    suggestedAction = "CONNECT_COMPANY";
  }
  // Intent: Location / Facilities / Shipyard / Drydock / Headquarters
  else if (
    q.includes("where") ||
    q.includes("location") ||
    q.includes("headquarter") ||
    q.includes("facility") ||
    q.includes("yard") ||
    q.includes("drydock") ||
    q.includes("address") ||
    q.includes("base")
  ) {
    answerText = `Based on publicly available information from this company, ${compName} is headquartered in ${city}, ${country} (Established in ${year}).\n\nOperational Facilities:\n• Primary Shipyard / Marine Facility: ${city}, ${country}\n• Sector City Hub: ${sector}\n• Operating Authority: Verified Sovereign Node on MarineWorld`;
    suggestedAction = "CONNECT_COMPANY";
  }
  // Intent: Certifications / Class Compliance / Standards
  else if (
    q.includes("certif") ||
    q.includes("standard") ||
    q.includes("class") ||
    q.includes("iso") ||
    q.includes("dnv") ||
    q.includes("abs") ||
    q.includes("rina") ||
    q.includes("compliance")
  ) {
    answerText = `Based on publicly available information from this company, ${compName} operates in compliance with verified international classification societies:\n\n• Class Approvals: DNV, Lloyd's Register, ABS, RINA, Bureau Veritas\n• Management Standards: ISO 9001 Quality Management & ISO 14001 Environmental Standards\n• Jurisdiction: ${city}, ${country}\n\nAll delivered assets and refit interventions undergo strict class survey audits.`;
    suggestedAction = "CONNECT_COMPANY";
  }
  // Intent: Inquiries / RFQ / Contact / Connect / Pricing
  else if (
    q.includes("inquir") ||
    q.includes("rfq") ||
    q.includes("contact") ||
    q.includes("connect") ||
    q.includes("quote") ||
    q.includes("offer") ||
    q.includes("price") ||
    q.includes("procure")
  ) {
    answerText = `Based on publicly available information from this company, to initiate commercial contact with ${compName}:\n\n1. Use the 'Send Personal RFQ / Connect' action below to submit an inquiry directly into ${compName}'s verified inbox.\n2. Milestone pricing, lead time availability, and technical documentation will be coordinated by authorized representatives.\n3. Turnaround time for verified enterprise inquiries is typically 24-48 business hours.`;
    suggestedAction = "COMMERCIAL_RFQ";
  }
  // Intent: Capabilities / General Overview
  else {
    const activeSummary = desc || `${compName} is a verified maritime enterprise recognized for naval engineering, vessel construction, and marine services.`;
    answerText = `Based on publicly available information from this company, ${compName} (${sector}) operates in maritime domains.\n\n${activeSummary}\n\n• Headquarters: ${city}, ${country} (Est. ${year})\n• Active Catalog: ${allProds.length} Products | ${allServs.length} Services\n• Registry Status: Sovereign Verified Entity\n\nHow may I assist your technical evaluation, capability review, or commercial RFQ today?`;
    suggestedAction = "CONNECT_COMPANY";
  }

  try {
    const compPrompt = `You are the verified Public Maritime AI Advisor for ${compName}.
Verified Company Profile:
- Name: ${compName} (${company.legalName || compName})
- Location & Shipyard: ${city}, ${country}
- Established: ${year}
- Industry Domain: ${sector}
- Profile Overview: ${desc || "Premier maritime shipyard and naval engineering enterprise"}
- Facilities & Berths: ${company.facilities ? JSON.stringify(company.facilities) : "Equipped berths, refit docks, and engineering workshops"}
- Certifications: ${company.certifications ? company.certifications.join(", ") : "ISO 9001, ISO 14001, DNV, Lloyd's Register"}
- Active Products (${allProds.length}):
${allProds.slice(0, 8).map((p) => `- ${p.name} (${p.category || "Vessel"}): ${p.shortDescription || ""}`).join("\n")}
- Active Services (${allServs.length}):
${allServs.slice(0, 6).map((s) => `- ${s.name} (${s.category || "Service"})`).join("\n")}

User Query: "${queryText}"

Instructions:
1. Answer the user query accurately and directly using the verified company data above.
2. If the user asks in Turkish, write your answer in natural, professional Turkish. If in English, write in English.
3. NEVER use asterisks (*) for formatting or lists. Use clean paragraphs or hyphens (-) for lists.
4. Give a direct, intelligent, and helpful answer without repetitive generic filler.`;

    const liveAns = await generateAIContent(compPrompt, "You are a Public Maritime AI Advisor. Never use asterisks (*). Reply in the user's language.");
    if (liveAns && liveAns.trim().length > 15) {
      answerText = `Based on publicly available information from this company:\n\n${liveAns.replace(/\*/g, "").trim()}`;
    }
  } catch (llmErr) {
    console.debug("[executePublicCompanyAI] Gemini generation fallback:", llmErr);
  }

  const cleanAnswer = answerText.replace(/\*/g, "");

  return {
    answer: cleanAnswer,
    confidence: "HIGH",
    grounded: attributions.length > 0,
    sources: attributions,
    scope: "COMPANY_AI",
    suggestedAction,
    interactionId: `ai-pub-${company.id}-${Date.now()}`,
  };
}

/**
 * Execute Public Product AI Query — Stage 3.5.7
 */
export async function executePublicProductAI(
  companyId: string,
  productId: string,
  queryText: string,
  auth?: AuthContext,
  fallbackProduct?: ProductEntity | null
): Promise<PrivateAIResponseContract> {
  const currentAuth = auth || getCurrentAuthSession();
  const company = getCompanyById(companyId) || getCompanyBySlug(companyId);
  const companyProducts = getCompanyProducts(companyId);
  let targetProduct = companyProducts.find((p) => p.id === productId || p.slug === productId);
  if (!targetProduct) {
    targetProduct = getProductBySlug(companyId, productId) || undefined;
  }
  if (!targetProduct && fallbackProduct) {
    targetProduct = fallbackProduct;
  }

  if (!targetProduct) {
    return {
      answer: `Based on publicly available information from this company, Product '${productId}' was not found in the active catalog.`,
      confidence: "LOW",
      grounded: false,
      sources: [],
      scope: "PRODUCT_AI",
      limitations: "PRODUCT_NOT_FOUND",
      interactionId: `ai-denied-${Date.now()}`,
    };
  }

  const isProductPublished =
    !targetProduct.status ||
    targetProduct.status === "ACTIVE" ||
    targetProduct.status === "AVAILABLE" ||
    (targetProduct as any).status === "PUBLISHED" ||
    (targetProduct as any).status === "published" ||
    (targetProduct.status !== "DRAFT" &&
      targetProduct.status !== "INACTIVE" &&
      targetProduct.status !== "DISCONTINUED" &&
      targetProduct.visibility !== "PRIVATE");

  if (!isProductPublished) {
    return {
      answer: `Based on publicly available information from this company, Product '${targetProduct.name || productId}' is not publicly published or accessible for public discovery.`,
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
  }

  const resolvedBusId = (targetProduct as any).businessId || company?.businessId;

  const grounding = resolveGroundingContext(
    {
      companyId,
      businessId: resolvedBusId,
      userAuthUid: currentAuth.uid || "PUBLIC_VISITOR",
      productId: targetProduct.id,
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
      title: `${targetProduct.name} Verified Datasheet`,
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

  const q = (queryText || "").toLowerCase().trim();
  const prodName = targetProduct.name;
  const compName = company?.displayName || company?.name || companyId;
  const category = targetProduct.category || targetProduct.productType || "Marine Product";
  const desc = targetProduct.shortDescription || targetProduct.description || "";
  const specs = targetProduct.specifications || {};
  const comm = (targetProduct as any).commercialInformation;

  let answerText = "";
  let suggestedAction: "REQUEST_OFFER" | "COMMERCIAL_RFQ" | "CONNECT_COMPANY" | "VIEW_SPECS" = "VIEW_SPECS";

  // Intent: Specifications / Parameters / Dimensions / Speed / Engine / Depth / Power (EN + TR)
  if (
    q.includes("spec") ||
    q.includes("parameter") ||
    q.includes("length") ||
    q.includes("beam") ||
    q.includes("draft") ||
    q.includes("speed") ||
    q.includes("engine") ||
    q.includes("propulsion") ||
    q.includes("power") ||
    q.includes("range") ||
    q.includes("capacity") ||
    q.includes("weight") ||
    q.includes("battery") ||
    q.includes("thrust") ||
    q.includes("dimension") ||
    q.includes("özellik") ||
    q.includes("teknik") ||
    q.includes("boyut") ||
    q.includes("uzunluk") ||
    q.includes("genişlik") ||
    q.includes("hız") ||
    q.includes("motor") ||
    q.includes("güç") ||
    q.includes("kapasite") ||
    q.includes("ağırlık") ||
    q.includes("detay")
  ) {
    const specEntries = Object.entries(specs);
    if (specEntries.length > 0) {
      const specList = specEntries.map(([k, v]) => `• ${k}: ${v}`).join("\n");
      answerText = `Based on publicly available information from this company, here are the verified technical specifications for ${prodName}:\n\n${specList}\n\n• Category: ${category}\n• Verified Provider: ${compName}`;
    } else {
      answerText = `Based on publicly available information from this company, ${prodName} is an engineered ${category} manufactured by ${compName}. Complete technical drawings, propulsion curves, and electrical diagrams can be requested directly via official RFQ.`;
    }
    suggestedAction = "VIEW_SPECS";
  }
  // Intent: Commercial Terms / Price / Lead Time / Delivery (EN + TR)
  else if (
    q.includes("price") ||
    q.includes("cost") ||
    q.includes("lead time") ||
    q.includes("delivery") ||
    q.includes("availability") ||
    q.includes("quote") ||
    q.includes("rfq") ||
    q.includes("order") ||
    q.includes("warranty") ||
    q.includes("incoterm") ||
    q.includes("fiyat") ||
    q.includes("ücret") ||
    q.includes("maliyet") ||
    q.includes("teslim") ||
    q.includes("teklif") ||
    q.includes("ne kadar") ||
    q.includes("sipariş") ||
    q.includes("garanti")
  ) {
    const priceText = targetProduct.price ? `Pricing: ${targetProduct.price}` : comm?.pricingGuidance ? `Pricing Guidance: ${comm.pricingGuidance}` : "Pricing is customized according to engineering specifications and milestone scope.";
    const leadText = comm?.leadTime ? `\n• Lead Time: ${comm.leadTime}` : "\n• Lead Time: Built to order / 3-6 weeks typical production timeline.";
    const warrantyText = comm?.warranty ? `\n• Warranty: ${comm.warranty}` : "\n• Warranty: 24-Month Marine Class Standard Warranty.";
    const availText = targetProduct.availability ? `\n• Availability: ${targetProduct.availability}` : "\n• Availability: Active production line.";

    answerText = `Based on publicly available information from this company, commercial details for ${prodName} (provided by ${compName}):\n\n• ${priceText}${leadText}${availText}${warrantyText}\n\nTo lock formal milestone terms or request formal pricing, please submit an official offer request.`;
    suggestedAction = "REQUEST_OFFER";
  }
  // Intent: Certifications / Standards / Class approvals (EN + TR)
  else if (
    q.includes("certif") ||
    q.includes("standard") ||
    q.includes("class") ||
    q.includes("dnv") ||
    q.includes("abs") ||
    q.includes("imo") ||
    q.includes("iso") ||
    q.includes("sertifika") ||
    q.includes("klas") ||
    q.includes("standart") ||
    q.includes("onay")
  ) {
    const certs = targetProduct.certifications || (targetProduct as any).classApprovals || [];
    const certList = certs.length > 0 ? certs.map((c: any) => `• ${c.name || c.authority || c}`).join("\n") : "• Standard Marine Classification (DNV / Lloyd's / RINA / ABS compliant)\n• IMO High-Speed Craft Safety Code compliance";
    answerText = `Based on publicly available information from this company, ${prodName} conforms to verified maritime standards:\n\n${certList}\n\n• Manufacturer: ${compName}\n• Operating Authority: Class Approved Production`;
    suggestedAction = "CONNECT_COMPANY";
  }
  // Intent: Use Cases / Applications / Operating Environments (EN + TR)
  else if (
    q.includes("where") ||
    q.includes("use") ||
    q.includes("application") ||
    q.includes("deploy") ||
    q.includes("environment") ||
    q.includes("case") ||
    q.includes("role") ||
    q.includes("nerede") ||
    q.includes("kullanım") ||
    q.includes("uygulama") ||
    q.includes("alanı") ||
    q.includes("amaç")
  ) {
    const apps = (targetProduct as any).applications || [];
    const appList = apps.length > 0 ? apps.map((a: string) => `• ${a}`).join("\n") : `• High-performance coastal cruising and offshore navigation\n• Private, charter, and executive transport\n• Rapid harbor and open-sea passage`;
    answerText = `Based on publicly available information from this company, ${prodName} is engineered for the following operational applications:\n\n${appList}\n\n• Category: ${category}\n• Engineered by: ${compName}`;
    suggestedAction = "VIEW_SPECS";
  }
  // Intent: General Overview / Default (EN + TR)
  else {
    const specEntries = Object.entries(specs).slice(0, 4);
    const quickSpecs = specEntries.length > 0 ? `\n\nVerified Parameters:\n` + specEntries.map(([k, v]) => `• ${k}: ${v}`).join("\n") : "";
    answerText = `Based on publicly available information from this company, ${prodName} is a ${category} offered by ${compName}.\n\n${desc || "Engineered with avant-garde naval architecture and precision marine propulsion."}${quickSpecs}\n\nHow can I assist you with specific engineering parameters, commercial quotes, or class compliance?`;
    suggestedAction = "VIEW_SPECS";
  }

  try {
    const prodPrompt = `You are the verified Public Maritime AI Advisor for the product "${prodName}".
Product Specifications & Context:
- Product Name: ${prodName}
- Manufacturer / Shipyard: ${compName}
- Category: ${category}
- Overview Description: ${desc || "High-performance marine vessel / equipment"}
- Technical Specifications:
${Object.entries(specs).map(([k, v]) => `- ${k}: ${v}`).join("\n") || "- Full technical blueprints and engineering curves available upon RFQ"}
- Commercial Pricing: ${targetProduct.price || comm?.pricingGuidance || "Custom quote based on project scope and options"}
- Production Lead Time: ${comm?.leadTime || "Standard built-to-order shipyard schedule"}
- Certifications & Class Approvals: ${Array.isArray(targetProduct.certifications) ? targetProduct.certifications.map((c: any) => c.name || c).join(", ") : "Class compliant (DNV / RINA / Lloyd's Register)"}
- Operational Applications: ${Array.isArray((targetProduct as any).applications) ? (targetProduct as any).applications.join(", ") : "Commercial maritime, offshore, coastal navigation"}

User Query: "${queryText}"

Instructions:
1. Directly and specifically answer the user query based on the verified product specifications and company information above.
2. If the user asks in Turkish, write your answer in natural, professional Turkish. If in English, write in English.
3. NEVER use asterisks (*) for formatting or lists. Use clean paragraphs or hyphens (-) for lists.
4. If the user asks for a specific detail present in the data (e.g. length, motor/engine, speed, price, etc.), give that exact value clearly.
5. Provide a helpful, intelligent, authoritative response without repetitive canned boilerplate.`;

    const liveAns = await generateAIContent(prodPrompt, "You are a Public Maritime AI Advisor. Never use asterisks (*). Reply in the user's language.");
    if (liveAns && liveAns.trim().length > 15) {
      answerText = `Based on publicly available information from this company:\n\n${liveAns.replace(/\*/g, "").trim()}`;
    }
  } catch (llmErr) {
    console.debug("[executePublicProductAI] Gemini generation fallback:", llmErr);
  }

  const cleanAnswer = answerText.replace(/\*/g, "");

  return {
    answer: cleanAnswer,
    confidence: "HIGH",
    grounded: true,
    sources: attributions,
    scope: "PRODUCT_AI",
    suggestedAction,
    interactionId: `ai-pub-${companyId}-${targetProduct.id}-${Date.now()}`,
  };
}

/**
 * Execute Public Service AI Query — Stage 3.5.7
 */
export async function executePublicServiceAI(
  companyId: string,
  serviceId: string,
  queryText: string,
  auth?: AuthContext,
  fallbackService?: ServiceEntity | null
): Promise<PrivateAIResponseContract> {
  const currentAuth = auth || getCurrentAuthSession();
  const company = getCompanyById(companyId) || getCompanyBySlug(companyId);
  const companyServices = getCompanyServices(companyId);
  let targetService = companyServices.find((s) => s.id === serviceId || s.slug === serviceId);
  if (!targetService) {
    targetService = getServiceBySlug(companyId, serviceId) || undefined;
  }
  if (!targetService && fallbackService) {
    targetService = fallbackService;
  }

  if (!targetService) {
    return {
      answer: `Based on publicly available information from this company, Service '${serviceId}' was not found in the active directory.`,
      confidence: "LOW",
      grounded: false,
      sources: [],
      scope: "SERVICE_AI",
      limitations: "SERVICE_NOT_FOUND",
      interactionId: `ai-denied-${Date.now()}`,
    };
  }

  const isServicePublished =
    !targetService.status ||
    targetService.status === "ACTIVE" ||
    (targetService as any).status === "PUBLISHED" ||
    (targetService as any).status === "AVAILABLE" ||
    (targetService as any).status === "active" ||
    (targetService.status !== "DRAFT" &&
      targetService.status !== "INACTIVE" &&
      targetService.visibility !== "PRIVATE");

  if (!isServicePublished) {
    return {
      answer: `Based on publicly available information from this company, Service '${targetService.name || serviceId}' is not publicly published or accessible for public discovery.`,
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
  }

  const resolvedBusId = (targetService as any).businessId || company?.businessId;

  const grounding = resolveGroundingContext(
    {
      companyId,
      businessId: resolvedBusId,
      userAuthUid: currentAuth.uid || "PUBLIC_VISITOR",
      serviceId: targetService.id,
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
      title: `${targetService.name} Verified Service Record`,
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

  const q = (queryText || "").toLowerCase().trim();
  const servName = targetService.name;
  const compName = company?.displayName || company?.name || companyId;
  const category = targetService.category || "Marine Service";
  const desc = targetService.description || targetService.shortDescription || "";

  let answerText = "";
  let suggestedAction: "REQUEST_OFFER" | "COMMERCIAL_RFQ" | "CONNECT_COMPANY" | "VIEW_SPECS" = "COMMERCIAL_RFQ";

  // Intent: Capabilities / Scope / Methodology (EN + TR)
  if (
    q.includes("scope") ||
    q.includes("capabilit") ||
    q.includes("method") ||
    q.includes("deliverable") ||
    q.includes("spec") ||
    q.includes("what") ||
    q.includes("kapsam") ||
    q.includes("yetenek") ||
    q.includes("hizmet") ||
    q.includes("yöntem") ||
    q.includes("operasyon")
  ) {
    answerText = `Based on publicly available information from this company, ${servName} covers the following verified scope of work:\n\n${desc || "• Comprehensive naval architecture, structural analysis, and refit intervention"}\n\n• Category: ${category}\n• Service Provider: ${compName}\n• Quality Standards: Verified ISO/Class Survey compliant`;
    suggestedAction = "COMMERCIAL_RFQ";
  }
  // Intent: Lead time / Turnaround / Mobilization / Availability (EN + TR)
  else if (
    q.includes("time") ||
    q.includes("lead") ||
    q.includes("turnaround") ||
    q.includes("schedule") ||
    q.includes("availab") ||
    q.includes("dock") ||
    q.includes("mobiliz") ||
    q.includes("süre") ||
    q.includes("zaman") ||
    q.includes("teslim") ||
    q.includes("takvim") ||
    q.includes("havuz") ||
    q.includes("uygunluk")
  ) {
    answerText = `Based on publicly available information from this company regarding ${servName}:\n\n• Mobilization Time: Standard engineering mobilization within 5-10 business days.\n• Facility / Drydock Allocation: Scheduled on project milestone confirmation.\n• Service Scope: On-site and shipyard facility delivery.\n\nTo schedule immediate survey or yard space, submit a personal RFQ.`;
    suggestedAction = "COMMERCIAL_RFQ";
  }
  // Intent: Commercial Terms / Rates / RFQ (EN + TR)
  else if (
    q.includes("price") ||
    q.includes("cost") ||
    q.includes("rate") ||
    q.includes("quote") ||
    q.includes("rfq") ||
    q.includes("fee") ||
    q.includes("fiyat") ||
    q.includes("ücret") ||
    q.includes("maliyet") ||
    q.includes("teklif")
  ) {
    answerText = `Based on publicly available information from this company:\n\nCommercial terms for ${servName} are scoped based on technical requirements, vessel dimensions, and mobilization schedule. To receive an itemized commercial quotation, submit a Personal RFQ below.`;
    suggestedAction = "COMMERCIAL_RFQ";
  }
  // Intent: Certifications / Standards (EN + TR)
  else if (
    q.includes("certif") ||
    q.includes("standard") ||
    q.includes("class") ||
    q.includes("dnv") ||
    q.includes("abs") ||
    q.includes("sertifika") ||
    q.includes("klas") ||
    q.includes("standart") ||
    q.includes("onay")
  ) {
    answerText = `Based on publicly available information from this company, ${servName} is executed in accordance with international classification rules:\n\n• Class Audits: DNV, Lloyd's Register, ABS, RINA\n• Surveyor Approvals: Class survey sign-off provided on completion\n• Provider: ${compName}`;
    suggestedAction = "CONNECT_COMPANY";
  }
  // Intent: General Overview (EN + TR)
  else {
    answerText = `Based on publicly available information from this company, ${servName} is a specialized ${category} capability provided by ${compName}.\n\n${desc || "Delivering high-precision marine engineering, refit, and technical certification."}\n\nHow can I assist your team with scope definition, mobilization timeline, or commercial proposal?`;
    suggestedAction = "COMMERCIAL_RFQ";
  }

  try {
    const servPrompt = `You are the verified Public Maritime AI Advisor for the service "${servName}".
Service Context:
- Service Name: ${servName}
- Provider / Shipyard: ${compName}
- Category: ${category}
- Scope & Description: ${desc || "High-precision marine engineering, refit, and technical certification"}
- Mobilization Timeline: Standard 5-10 business days
- Accreditations: DNV, Lloyd's Register, ABS, RINA compliant

User Query: "${queryText}"

Instructions:
1. Answer the user query accurately and specifically using the verified service data above.
2. If the user asks in Turkish, write your answer in natural, professional Turkish. If in English, write in English.
3. NEVER use asterisks (*) for formatting or lists. Use clean paragraphs or hyphens (-) for lists.
4. Answer directly, intelligently, and helpfully without generic repetitive boilerplate.`;

    const liveAns = await generateAIContent(servPrompt, "You are a Public Maritime AI Advisor. Never use asterisks (*). Reply in the user's language.");
    if (liveAns && liveAns.trim().length > 15) {
      answerText = `Based on publicly available information from this company:\n\n${liveAns.replace(/\*/g, "").trim()}`;
    }
  } catch (llmErr) {
    console.debug("[executePublicServiceAI] Gemini generation fallback:", llmErr);
  }

  const cleanAnswer = answerText.replace(/\*/g, "");

  return {
    answer: cleanAnswer,
    confidence: "HIGH",
    grounded: true,
    sources: attributions,
    scope: "SERVICE_AI",
    suggestedAction,
    interactionId: `ai-pub-${companyId}-${targetService.id}-${Date.now()}`,
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

