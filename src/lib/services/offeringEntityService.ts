import type {
  CompanyOffering,
  CompanyProfile,
  CompanyEntity,
  OfferingGroundingSource,
  OfferingCommercialInfo,
  OfferingAIAdvisorConfig,
} from "@/lib/types";
import { getCompanyById, getCompanyBySlug, saveCompany } from "@/lib/services/companyService";
import { findAllCompaniesSync } from "@/lib/repositories/companyRepository";
import { notifyListeners as notifyTwinListeners } from "@/lib/businessTwinStore";
import { computeOfferingGroundingStatus, generateDefaultAdvisorConfig } from "@/lib/services/offeringAIService";

/**
 * Stage 12.8 — Canonical Product & Service Entity Foundation (Authoritative Company Model)
 * Enforces:
 * 1. MarineWorld Entity Model (MarineWorld -> Sector Category -> Industry Domain -> Sector City -> Company -> Product/Service)
 * 2. Deterministic Canonical URL: {offeringSlug}.{companySlug}.{sectorCity}.marineworld.city
 * 3. Single Canonical Entity (entityId, companyId, companySlug, canonicalSectorCity, sectorCities[], slug, canonicalUrl)
 * 4. Multi-city network contexts without entity duplication
 * 5. Slug collisions, backward-compatibility & historical redirect registry
 * 6. Duplicate offering protection per company
 * 7. Publish Lifecycle (DRAFT -> READY -> PUBLISHED -> ARCHIVED)
 * 8. Strict AI Grounding Boundary & Sovereign Company Ownership Context
 * 9. Hard-enforced 12 Active Offerings capacity limit per company
 */

export const MAX_ACTIVE_OFFERINGS_PER_COMPANY = 12;

// In-memory canonical offerings registry by companyId
const canonicalOfferingsStore = new Map<string, CompanyOffering[]>();

// Global historical slug redirect map: `old-slug-or-alias` -> `currentCanonicalUrl`
const historicalSlugRedirectMap = new Map<string, { companyId: string; offeringId: string; canonicalUrl: string }>();

/**
 * Generate clean deterministic URL slug
 */
export function generateDeterministicOfferingSlug(
  name?: string,
  existingOfferings: CompanyOffering[] = [],
  currentOfferingId?: string
): string {
  let baseSlug = String(name || "offering")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!baseSlug) {
    baseSlug = "offering";
  }

  // Prevent collision with existing offerings in same scope
  let candidateSlug = baseSlug;
  let counter = 2;

  while (
    existingOfferings.some(
      (o) => o && (o.slug?.toLowerCase() === candidateSlug || o.id?.toLowerCase() === candidateSlug) && o.id !== currentOfferingId
    )
  ) {
    candidateSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  return candidateSlug;
}

/**
 * Generate authoritative canonical offering URL
 * Canonical Pattern:
 * Product: {productSlug}.{companySlug}.{sectorCity}.marineworld.city
 * Service: {serviceSlug}.{companySlug}.{sectorCity}.marineworld.city
 * 
 * Examples:
 * hybrid-electric-pod-1800kw.unabil.shipyard.marineworld.city
 * offshore-hull-inspection.unabil.shipyard.marineworld.city
 */
export function buildCanonicalOfferingUrl(
  slug?: string,
  companySlug: string = "unabil",
  sectorCityId: string = "shipyard"
): string {
  const cleanOffering = String(slug || "offering")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "") || "offering";

  const cleanCompany = String(companySlug || "unabil")
    .toLowerCase()
    .trim()
    .replace(/\.shipyard|\.city|\.marineworld/g, "")
    .replace(/[^a-z0-9-]/g, "") || "unabil";

  const cleanSector = String(sectorCityId || "shipyard")
    .toLowerCase()
    .replace(/\.city$/i, "")
    .replace(/[^a-z0-9-]/g, "") || "shipyard";

  return `https://${cleanOffering}.${cleanCompany}.${cleanSector}.marineworld.city`;
}

/**
 * Extract short display URL without protocol
 */
export function getShortCanonicalOfferingUrl(
  slug?: string,
  companySlug: string = "unabil",
  sectorCityId: string = "shipyard"
): string {
  const full = buildCanonicalOfferingUrl(slug, companySlug, sectorCityId);
  return full.replace(/^https?:\/\//, "");
}

/**
 * Get canonical URL for an existing offering object
 */
export function getOfferingCanonicalUrl(
  offering: Partial<CompanyOffering>,
  company?: CompanyProfile | CompanyEntity | null
): string {
  const parentCompany = company || (offering.companyId ? getCompanyById(offering.companyId) || getCompanyBySlug(offering.companyId) : null);
  const companySlug = offering.companySlug || (parentCompany as any)?.slug || parentCompany?.id || "unabil";
  const slug = offering.slug || generateDeterministicOfferingSlug(offering.name || "offering", [], offering.id);
  const sector = offering.canonicalSectorCity || offering.sectorCity || parentCompany?.sectorCityIds?.[0] || (parentCompany as any)?.cityIds?.[0] || "shipyard";
  return buildCanonicalOfferingUrl(slug, companySlug, sector);
}

/**
 * Evaluate if an offering meets all AI READY and Canonical Publishing criteria
 */
export function evaluateOfferingPublishReadiness(
  offering: Partial<CompanyOffering>,
  company?: CompanyProfile | CompanyEntity | null
): {
  isReady: boolean;
  canPublish: boolean;
  errors: string[];
  groundingStatus: "NOT GROUNDED" | "GROUNDING REQUIRED" | "GROUNDED" | "AI READY";
  missingFields: string[];
} {
  const errors: string[] = [];
  const missingFields: string[] = [];

  // 1. Parent Company check
  const parentCompanyId = offering.companyId || company?.id;
  if (!parentCompanyId) {
    errors.push("An offering cannot exist without a valid parent companyId.");
    missingFields.push("companyId");
  }

  // 2. Canonical Name
  if (!offering.name || offering.name.trim().length < 2) {
    errors.push("Offering name is required and must be at least 2 characters.");
    missingFields.push("name");
  }

  // 3. Category & Description
  if (!offering.category || offering.category.trim().length === 0) {
    errors.push("Offering category is required.");
    missingFields.push("category");
  }

  if (!offering.shortDescription || offering.shortDescription.trim().length < 15) {
    errors.push("A short technical or executive description (min 15 chars) is required.");
    missingFields.push("shortDescription");
  }

  // 4. Grounding Check (AI Ready Rule)
  // Must have at least 1 verified grounding source OR confirmed structured specifications >= 2
  const specsCount = offering.specifications ? Object.keys(offering.specifications).length : 0;
  const sourcesCount = offering.groundingSources ? offering.groundingSources.length : 0;
  
  const hasGrounding = sourcesCount >= 1 || specsCount >= 2;
  if (!hasGrounding) {
    errors.push("At least one verified grounding document OR confirmed structured specification set (≥2 parameters) is required for AI Grounding.");
    missingFields.push("groundingSources");
  }

  const groundingStatus = computeOfferingGroundingStatus(offering);
  const isReady = errors.length === 0 && hasGrounding;
  const canPublish = isReady;

  return {
    isReady,
    canPublish,
    errors,
    groundingStatus,
    missingFields,
  };
}

import { findProductsByCompany } from "@/lib/repositories/productRepository";
import { findServicesByCompany } from "@/lib/repositories/serviceRepository";
import { getCompanyRecord } from "@/lib/repositories/companyRepository";

/**
 * Get all canonical offerings for a company
 */
export function getCompanyOfferings(companyId: string): CompanyOffering[] {
  // Check store first
  const existing = canonicalOfferingsStore.get(companyId);
  if (existing && existing.length > 0) {
    return existing;
  }

  // Fallback to company profile
  const company = getCompanyById(companyId) || getCompanyBySlug(companyId);
  if (company && company.offerings && company.offerings.length > 0) {
    const initialized = company.offerings.map((offering) => initializeCanonicalOfferingDefaults(offering, company));
    canonicalOfferingsStore.set(companyId, initialized);
    return initialized;
  }

  return [];
}

/**
 * Asynchronously fetch and sync all offerings for a company directly from Firestore collections and company document
 */
export async function fetchCompanyOfferingsAsync(companyId: string): Promise<CompanyOffering[]> {
  if (!companyId) return [];
  try {
    const comp = await getCompanyRecord(companyId);
    const [fbProds, fbServs] = await Promise.all([
      findProductsByCompany(companyId),
      findServicesByCompany(companyId),
    ]);

    const mergedMap = new Map<string, CompanyOffering>();
    if (comp?.offerings) {
      comp.offerings.forEach((o) => {
        if (o && o.id) mergedMap.set(o.id, initializeCanonicalOfferingDefaults(o, comp));
      });
    }

    fbProds.forEach((p: any) => {
      const off: CompanyOffering = {
        ...p,
        id: p.id,
        entityId: p.id,
        offeringId: p.id,
        companyId,
        type: "product",
        entityType: "PRODUCT",
        name: p.name,
        category: p.category || "Products",
        shortDescription: p.shortDescription || p.description || "",
        status: (p.status === "ACTIVE" || p.status === "AVAILABLE" || p.status === "DRAFT") ? p.status : "AVAILABLE",
        certifications: p.certifications
          ? p.certifications.map((c: any) => (typeof c === "string" ? c : c.name || c.authority || String(c)))
          : undefined,
      };
      mergedMap.set(p.id, initializeCanonicalOfferingDefaults(off, comp));
    });

    fbServs.forEach((s: any) => {
      const off: CompanyOffering = {
        ...s,
        id: s.id,
        entityId: s.id,
        offeringId: s.id,
        companyId,
        type: "service",
        entityType: "SERVICE",
        name: s.name,
        category: s.category || "Services",
        shortDescription: s.shortDescription || s.description || "",
        status: (s.status === "ACTIVE" || s.status === "AVAILABLE" || s.status === "DRAFT") ? s.status : "ACTIVE",
        certifications: s.certifications
          ? s.certifications.map((c: any) => (typeof c === "string" ? c : c.name || c.authority || String(c)))
          : undefined,
      };
      mergedMap.set(s.id, initializeCanonicalOfferingDefaults(off, comp));
    });

    const result = Array.from(mergedMap.values());
    if (result.length > 0) {
      canonicalOfferingsStore.set(companyId, result);
    }
    return result.length > 0 ? result : getCompanyOfferings(companyId);
  } catch (err) {
    console.warn(`[OfferingEntityService] fetchCompanyOfferingsAsync error for ${companyId}:`, err);
    return getCompanyOfferings(companyId);
  }
}

/**
 * Initialize canonical defaults for an offering
 */
export function initializeCanonicalOfferingDefaults(
  offering: CompanyOffering,
  company?: CompanyEntity | CompanyProfile | null
): CompanyOffering {
  const companyId = offering.companyId;
  const parentCompany = company || getCompanyById(companyId) || getCompanyBySlug(companyId);
  const companySlug = offering.companySlug || (parentCompany as any)?.slug || parentCompany?.id || "unabil";
  const canonicalSectorCity = offering.canonicalSectorCity || offering.sectorCity || parentCompany?.sectorCityIds?.[0] || (parentCompany as any)?.cityIds?.[0] || "shipyard";
  const sectorCities = offering.sectorCities || parentCompany?.sectorCityIds || [canonicalSectorCity];
  const industryDomain = offering.industryDomain || (parentCompany as any)?.industryDomainIds?.[0] || "maritime-services";
  
  const slug = offering.slug || generateDeterministicOfferingSlug(offering.name, [], offering.id);
  const canonicalUrl = buildCanonicalOfferingUrl(slug, companySlug, canonicalSectorCity);
  const groundingStatus = offering.groundingStatus || computeOfferingGroundingStatus(offering);

  const entityType = offering.entityType || (offering.type === "product" ? "PRODUCT" : "SERVICE");
  const normalizedStatus = offering.status || "ACTIVE";

  return {
    ...offering,
    id: offering.id,
    entityId: offering.id,
    offeringId: offering.id,
    companyId,
    companySlug,
    slug,
    canonicalUrl,
    entityType,
    canonicalSectorCity,
    sectorCity: canonicalSectorCity,
    sectorCities,
    industryDomain,
    groundingStatus,
    status: normalizedStatus,
    publishState: (normalizedStatus === "ARCHIVED" ? "ARCHIVED" : normalizedStatus === "DRAFT" ? "DRAFT" : "PUBLISHED") as any,
  };
}

/**
 * Count active offerings for a company (Products + Services that are not ARCHIVED or DRAFT)
 */
export function countActiveOfferings(companyId: string, excludeOfferingId?: string): number {
  const offerings = getCompanyOfferings(companyId);
  return offerings.filter((o) => {
    if (excludeOfferingId && o.id === excludeOfferingId) return false;
    const s = (o.status as string)?.toUpperCase();
    return s !== "ARCHIVED" && s !== "DRAFT";
  }).length;
}

/**
 * Save or Update a Canonical Offering with strict capacity limit, duplicate protection, and slug preservation
 */
export function saveCanonicalOffering(
  offeringData: CompanyOffering
): {
  success: boolean;
  offering?: CompanyOffering;
  error?: string;
} {
  const companyId = offeringData.companyId;
  if (!companyId) {
    return { success: false, error: "Validation Error: companyId is required. An offering cannot exist without a parent company." };
  }

  const company = getCompanyById(companyId) || getCompanyBySlug(companyId);
  if (!company) {
    return { success: false, error: `Validation Error: Parent company '${companyId}' not found in registry.` };
  }

  const companySlug = offeringData.companySlug || (company as any).slug || company.id || "unabil";
  const existingList = getCompanyOfferings(companyId);
  const targetId = offeringData.id || offeringData.offeringId || `offering-${companyId}-${Date.now()}`;
  const isNew = !existingList.some((o) => o.id === targetId || o.offeringId === targetId);
  const existingOffering = existingList.find((o) => o.id === targetId || o.offeringId === targetId);

  // 11. DUPLICATE PROTECTION: The same company must not be able to create another canonical offering with an identical normalized identity
  const normalizedName = offeringData.name.trim().toLowerCase();
  let candidateSlug = offeringData.slug?.trim();
  if (!candidateSlug) {
    candidateSlug = generateDeterministicOfferingSlug(offeringData.name, existingList, targetId);
  }
  const normalizedCandidateSlug = candidateSlug.toLowerCase();

  const isDuplicate = existingList.some(
    (o) =>
      o.id !== targetId &&
      o.offeringId !== targetId &&
      (o.name.trim().toLowerCase() === normalizedName || (o.slug && o.slug.toLowerCase() === normalizedCandidateSlug))
  );

  if (isDuplicate) {
    return {
      success: false,
      error: `Duplicate Offering Protection: Company '${company.displayName || company.legalName || companySlug}' already has a registered offering with an identical normalized identity ('${offeringData.name}' / '${normalizedCandidateSlug}'). Duplicate canonical offerings are prohibited.`,
    };
  }

  // Check 12-active-offering capacity limit if offering is active/published
  const isTargetActive =
    (offeringData.status as string)?.toUpperCase() !== "ARCHIVED" &&
    (offeringData.status as string)?.toUpperCase() !== "DRAFT";

  if (isTargetActive) {
    const currentActiveCount = countActiveOfferings(companyId, targetId);
    if (currentActiveCount >= MAX_ACTIVE_OFFERINGS_PER_COMPANY) {
      return {
        success: false,
        error: `Active capacity limit exceeded: Company '${company.displayName || (company as any).name || company.legalName}' has reached the maximum of ${MAX_ACTIVE_OFFERINGS_PER_COMPANY} active offerings. Please archive an existing offering before publishing.`,
      };
    }
  }

  // 2. Sector City & Multi-City Support
  const canonicalSectorCity = offeringData.canonicalSectorCity || offeringData.sectorCity || company.sectorCityIds?.[0] || (company as any).cityIds?.[0] || "shipyard";
  const sectorCities = offeringData.sectorCities || company.sectorCityIds || [canonicalSectorCity];
  const industryDomain = offeringData.industryDomain || (company as any).industryDomainIds?.[0] || "maritime-services";

  const slug = candidateSlug;
  const canonicalUrl = buildCanonicalOfferingUrl(slug, companySlug, canonicalSectorCity);

  // If slug changed, record historical alias redirect
  const previousSlugs = [...(existingOffering?.previousSlugs || offeringData.previousSlugs || [])];
  if (existingOffering && existingOffering.slug && existingOffering.slug !== slug) {
    if (!previousSlugs.includes(existingOffering.slug)) {
      previousSlugs.push(existingOffering.slug);
    }
    // Register redirect in historical map
    historicalSlugRedirectMap.set(existingOffering.slug.toLowerCase(), {
      companyId,
      offeringId: targetId,
      canonicalUrl,
    });
  }

  // Maintain field confirmations & provenance (protect COMPANY_CONFIRMED fields)
  const fieldConfirmations = {
    ...(existingOffering?.fieldConfirmations || {}),
    ...(offeringData.fieldConfirmations || {}),
  };

  const sourceAttributions = {
    ...(existingOffering?.sourceAttributions || {}),
    ...(offeringData.sourceAttributions || {}),
  };

  const groundingStatus = computeOfferingGroundingStatus(offeringData);

  // 3. SINGLE CANONICAL ENTITY Record
  const finalOffering: CompanyOffering = {
    ...offeringData,
    id: targetId,
    entityId: targetId,
    offeringId: targetId,
    companyId,
    companySlug,
    name: offeringData.name.trim(),
    slug,
    canonicalUrl,
    entityType: offeringData.type === "product" ? "PRODUCT" : "SERVICE",
    canonicalSectorCity,
    sectorCity: canonicalSectorCity,
    sectorCities,
    industryDomain,
    previousSlugs,
    groundingStatus,
    fieldConfirmations,
    sourceAttributions,
    aiAdvisorConfig: offeringData.aiAdvisorConfig || generateDefaultAdvisorConfig(offeringData),
    updatedAt: new Date().toISOString(),
    createdAt: existingOffering?.createdAt || offeringData.createdAt || new Date().toISOString(),
  };

  // Register in historical redirect map for self
  historicalSlugRedirectMap.set(slug.toLowerCase(), {
    companyId,
    offeringId: finalOffering.id,
    canonicalUrl,
  });

  // Save to offerings list
  let updatedList: CompanyOffering[];
  if (isNew) {
    updatedList = [finalOffering, ...existingList];
  } else {
    updatedList = existingList.map((o) => (o.id === finalOffering.id ? finalOffering : o));
  }

  canonicalOfferingsStore.set(companyId, updatedList);

  // Sync back to CompanyEntity (Firestore persistent)
  const updatedCompany: CompanyEntity = {
    ...company,
    offerings: updatedList,
    updatedAt: new Date().toISOString(),
  };
  saveCompany(updatedCompany);

  // Authoritative Subcollection Firestore write
  try {
    if (finalOffering.entityType === "PRODUCT" || finalOffering.type === "product") {
      import("@/services/productService").then(({ saveProduct }) => {
        saveProduct(companyId, finalOffering as any);
      });
    } else {
      import("@/services/serviceService").then(({ saveService }) => {
        saveService(companyId, finalOffering as any);
      });
    }
  } catch (err) {
    console.warn("[OfferingEntityService] Firestore subcollection write fallback:", err);
  }

  notifyTwinListeners();

  return {
    success: true,
    offering: finalOffering,
  };
}

/**
 * Publish an offering (transitions DRAFT/READY to PUBLISHED / ACTIVE)
 */
export function publishOffering(
  companyId: string,
  offeringId: string
): {
  success: boolean;
  offering?: CompanyOffering;
  error?: string;
} {
  const offerings = getCompanyOfferings(companyId);
  const target = offerings.find((o) => o.id === offeringId || o.slug === offeringId);

  if (!target) {
    return { success: false, error: `Offering '${offeringId}' not found for company '${companyId}'.` };
  }

  const company = getCompanyById(companyId) || getCompanyBySlug(companyId);
  const readiness = evaluateOfferingPublishReadiness(target, company);

  if (!readiness.canPublish) {
    return {
      success: false,
      error: `Cannot publish offering: ${readiness.errors.join("; ")}`,
    };
  }

  const updated: CompanyOffering = {
    ...target,
    status: "ACTIVE",
    publishState: "PUBLISHED",
    groundingStatus: readiness.groundingStatus,
    updatedAt: new Date().toISOString(),
  };

  return saveCanonicalOffering(updated);
}

/**
 * Archive an offering (removes from active count without losing history)
 */
export function archiveOffering(
  companyId: string,
  offeringId: string
): {
  success: boolean;
  offering?: CompanyOffering;
  error?: string;
} {
  const offerings = getCompanyOfferings(companyId);
  const target = offerings.find((o) => o.id === offeringId || o.slug === offeringId);

  if (!target) {
    return { success: false, error: `Offering '${offeringId}' not found.` };
  }

  const updated: CompanyOffering = {
    ...target,
    status: "ARCHIVED",
    publishState: "ARCHIVED",
    updatedAt: new Date().toISOString(),
  };

  return saveCanonicalOffering(updated);
}

/**
 * Delete an offering
 */
export function deleteOffering(companyId: string, offeringId: string): boolean {
  const offerings = getCompanyOfferings(companyId);
  const filtered = offerings.filter((o) => o.id !== offeringId && o.slug !== offeringId);
  canonicalOfferingsStore.set(companyId, filtered);

  const company = getCompanyById(companyId) || getCompanyBySlug(companyId);
  if (company) {
    const updatedCompany: CompanyEntity = {
      ...company,
      offerings: filtered,
      updatedAt: new Date().toISOString(),
    };
    saveCompany(updatedCompany);
  }

  notifyTwinListeners();
  return true;
}

/**
 * Canonical Offering Public Resolver Interface
 */
export interface ResolvedCanonicalOffering {
  offering: CompanyOffering;
  parentCompany: CompanyProfile | CompanyEntity;
  sectorCity: string;
  industryDomain: string;
  canonicalUrl: string;
  isRedirect: boolean;
  redirectUrl?: string;
}

/**
 * Resolves an offering from any format:
 * - Subdomain 3-part: `{productSlug}.{companySlug}.{sectorCity}.marineworld.city`
 * - Subdomain 2-part (legacy): `{slug}.{sectorCity}.marineworld.city`
 * - Direct path: `/products/{slug}`, `/services/{slug}`, `/offerings/{slug}`
 * - Fallback ID lookup
 * - Historical slug alias
 */
export function resolveCanonicalOffering(
  identifier: string,
  sectorCityHint?: string,
  companyHint?: string
): ResolvedCanonicalOffering | null {
  let raw = identifier.toLowerCase().trim();
  
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const parsed = new URL(raw);
      raw = parsed.hostname;
    } catch {
      // ignore
    }
  }

  // Parse subdomain parts
  let offeringSlugCandidate = raw;
  let parsedCompanySlug: string | undefined = companyHint;
  let parsedSectorCity: string = sectorCityHint || "shipyard";

  if (raw.includes(".marineworld.city")) {
    const prefix = raw.replace(".marineworld.city", "");
    const parts = prefix.split(".");
    if (parts.length >= 3) {
      // 3-part: {offeringSlug}.{companySlug}.{sectorCity}
      offeringSlugCandidate = parts[0];
      parsedCompanySlug = parts[1];
      parsedSectorCity = parts[2];
    } else if (parts.length === 2) {
      // 2-part: {offeringSlug}.{sectorCity} (or companySlug.sectorCity)
      offeringSlugCandidate = parts[0];
      parsedSectorCity = parts[1];
    } else if (parts.length === 1) {
      offeringSlugCandidate = parts[0];
    }
  } else if (raw.includes(".")) {
    const parts = raw.split(".");
    if (parts.length >= 3) {
      offeringSlugCandidate = parts[0];
      parsedCompanySlug = parts[1];
      parsedSectorCity = parts[2];
    } else if (parts.length === 2) {
      offeringSlugCandidate = parts[0];
      parsedSectorCity = parts[1];
    }
  }

  // Check all companies in registry/store
  const allCompanies = findAllCompaniesSync();

  // Prioritize company matching parsedCompanySlug if present
  const prioritizedCompanies = parsedCompanySlug
    ? [
        ...allCompanies.filter(
          (c) =>
            c.id.toLowerCase() === parsedCompanySlug?.toLowerCase() ||
            (c as any).slug?.toLowerCase() === parsedCompanySlug?.toLowerCase()
        ),
        ...allCompanies.filter(
          (c) =>
            c.id.toLowerCase() !== parsedCompanySlug?.toLowerCase() &&
            (c as any).slug?.toLowerCase() !== parsedCompanySlug?.toLowerCase()
        ),
      ]
    : allCompanies;

  for (const company of prioritizedCompanies) {
    const offerings = getCompanyOfferings(company.id);

    // Exact slug or ID match
    const match = offerings.find(
      (o) =>
        o.slug?.toLowerCase() === offeringSlugCandidate ||
        o.id.toLowerCase() === offeringSlugCandidate ||
        o.offeringId?.toLowerCase() === offeringSlugCandidate ||
        (o.code && o.code.toLowerCase() === offeringSlugCandidate) ||
        (o.sku && o.sku.toLowerCase() === offeringSlugCandidate)
    );

    if (match) {
      const parentCompanySlug = (company as any).slug || company.id || "unabil";
      const parentSectorCity = match.canonicalSectorCity || match.sectorCity || company.sectorCityIds?.[0] || (company as any).cityIds?.[0] || parsedSectorCity;
      const industryDomain = match.industryDomain || (company as any).industryDomainIds?.[0] || "maritime-services";
      const canonicalUrl = buildCanonicalOfferingUrl(match.slug || offeringSlugCandidate, parentCompanySlug, parentSectorCity);

      // Determine if current incoming request matches canonical URL
      const isDirectPath = raw.startsWith("/") || !raw.includes(".");
      const isLegacy2Part = raw.includes(".marineworld.city") && raw.replace(".marineworld.city", "").split(".").length < 3;
      const isRedirect = isDirectPath || isLegacy2Part;

      return {
        offering: match,
        parentCompany: company,
        sectorCity: parentSectorCity,
        industryDomain,
        canonicalUrl,
        isRedirect,
        redirectUrl: canonicalUrl,
      };
    }

    // Historical slug alias match
    const aliasMatch = offerings.find(
      (o) => o.previousSlugs && o.previousSlugs.some((prev) => prev.toLowerCase() === offeringSlugCandidate)
    );

    if (aliasMatch) {
      const parentCompanySlug = (company as any).slug || company.id || "unabil";
      const parentSectorCity = aliasMatch.canonicalSectorCity || aliasMatch.sectorCity || company.sectorCityIds?.[0] || (company as any).cityIds?.[0] || parsedSectorCity;
      const industryDomain = aliasMatch.industryDomain || (company as any).industryDomainIds?.[0] || "maritime-services";
      const canonicalUrl = buildCanonicalOfferingUrl(aliasMatch.slug || offeringSlugCandidate, parentCompanySlug, parentSectorCity);

      return {
        offering: aliasMatch,
        parentCompany: company,
        sectorCity: parentSectorCity,
        industryDomain,
        canonicalUrl,
        isRedirect: true,
        redirectUrl: canonicalUrl,
      };
    }
  }

  // Check global historical slug map
  const historical = historicalSlugRedirectMap.get(offeringSlugCandidate);
  if (historical) {
    const company = getCompanyById(historical.companyId) || getCompanyBySlug(historical.companyId);
    if (company) {
      const offerings = getCompanyOfferings(company.id);
      const off = offerings.find((o) => o.id === historical.offeringId);
      if (off) {
        const parentCompanySlug = (company as any).slug || company.id || "unabil";
        const canonicalUrl = buildCanonicalOfferingUrl(off.slug || off.id, parentCompanySlug, off.sectorCity || "shipyard");
        return {
          offering: off,
          parentCompany: company,
          sectorCity: off.sectorCity || "shipyard",
          industryDomain: off.industryDomain || "maritime-services",
          canonicalUrl,
          isRedirect: true,
          redirectUrl: canonicalUrl,
        };
      }
    }
  }

  return null;
}

/**
 * Generate Share Data for an offering — ALWAYS uses canonical offering URL
 */
export function getOfferingShareData(
  offering: CompanyOffering,
  company: CompanyProfile | CompanyEntity
): {
  canonicalUrl: string;
  title: string;
  description: string;
  channels: Array<{
    id: string;
    label: string;
    href?: string;
  }>;
} {
  const companySlug = offering.companySlug || (company as any).slug || company.id || "unabil";
  const sectorCity = offering.canonicalSectorCity || offering.sectorCity || company.sectorCityIds?.[0] || (company as any).cityIds?.[0] || "shipyard";
  const canonicalUrl = buildCanonicalOfferingUrl(offering.slug || offering.id, companySlug, sectorCity);
  const companyName = company.displayName || (company as any).name || company.legalName || "MarineWorld Verified Enterprise";
  const title = `${offering.name} — ${companyName}`;
  const description = `${offering.shortDescription} (Verified ${offering.type === "product" ? "Product" : "Service"} on MarineWorld.City)`;

  const encodedUrl = encodeURIComponent(canonicalUrl);
  const encodedText = encodeURIComponent(`${title}\n${description}`);

  return {
    canonicalUrl,
    title,
    description,
    channels: [
      {
        id: "copy",
        label: "Copy Canonical Link",
      },
      {
        id: "whatsapp",
        label: "WhatsApp",
        href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      },
      {
        id: "linkedin",
        label: "LinkedIn",
        href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      },
      {
        id: "email",
        label: "Email",
        href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodedText}%0A%0A${encodedUrl}`,
      },
    ],
  };
}

/**
 * Strict Grounding Boundary AI Answerer
 * Enforces offering and tenant isolation:
 * - Inherits: Company -> Sector City -> Industry Domain -> Offering
 * - Retains sovereign company ownership context across all queries
 * - Product A cannot access Product B documents or grounding
 * - Service A cannot access Product B data
 * - Company A cannot access Company B records
 */
export function queryOfferingAIAdvisorStrict(
  offeringId: string,
  companyId: string,
  userPrompt: string
): {
  answer: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  sourcesUsed: string[];
  suggestedAction?: "REQUEST_OFFER" | "COMMERCIAL_RFQ" | "CONNECT_COMPANY" | "VIEW_SPECS";
  isGrounded: boolean;
} {
  const company = getCompanyById(companyId) || getCompanyBySlug(companyId);
  if (!company) {
    return {
      answer: "Security Alert: Parent company context could not be verified.",
      confidence: "LOW",
      sourcesUsed: [],
      isGrounded: false,
    };
  }

  const offerings = getCompanyOfferings(companyId);
  const offering = offerings.find((o) => o.id === offeringId || o.slug === offeringId);

  if (!offering) {
    return {
      answer: "Security Alert: Offering not found within authorized tenant scope.",
      confidence: "LOW",
      sourcesUsed: [],
      isGrounded: false,
    };
  }

  const companyName = company.displayName || company.legalName || "MarineWorld Enterprise";
  const sectorCityName = (offering.canonicalSectorCity || offering.sectorCity || "shipyard").toUpperCase();
  const domainName = offering.industryDomain || "maritime-services";

  // Check if query asks for something that doesn't exist
  const q = userPrompt.toLowerCase().trim();
  const specs = offering.specifications || {};
  const sources = (offering.groundingSources || []).map((s) => s.filename || s.title);
  if (sources.length === 0) sources.push("Verified Offering Record");

  // Check for cross-offering or other company queries (Strict Isolation Boundary)
  const allOtherOfferings = offerings.filter((o) => o.id !== offering.id && o.slug !== offering.slug);
  const mentionsOtherProduct = allOtherOfferings.some((o) => {
    const oName = (o.name || "").toLowerCase();
    const oSlug = (o.slug || "").toLowerCase();
    return (oName.length > 3 && q.includes(oName)) || (oSlug.length > 3 && q.includes(oSlug));
  });

  if (mentionsOtherProduct || q.includes("competitor") || q.includes("other product") || q.includes("another company") || q.includes("other service")) {
    return {
      answer: `I am the dedicated AI Advisor strictly grounded in **${offering.name}**, provided by **${companyName}** in **${sectorCityName}.CITY** (${domainName}). Under MarineWorld sovereign data isolation protocols, I cannot provide details or compare records for external offerings or third-party assets.\n\nPlease navigate directly to that entity's canonical record on MarineWorld or contact **${companyName}** directly for catalog guidance.`,
      confidence: "HIGH",
      sourcesUsed: sources,
      suggestedAction: "CONNECT_COMPANY",
      isGrounded: true,
    };
  }

  // Applications & Operating Environments
  if (
    q.includes("where") ||
    q.includes("use") ||
    q.includes("application") ||
    q.includes("deploy") ||
    q.includes("environment") ||
    q.includes("case") ||
    q.includes("industry")
  ) {
    const apps = offering.applications || [];
    if (apps.length > 0) {
      const appList = apps.map((a) => `• **${a}**`).join("\n");
      return {
        answer: `**${offering.name}** (Provided by **${companyName}**) is engineered for the following verified operational applications and deployment environments:\n\n${appList}\n\n• **Sector City**: ${sectorCityName}.CITY\n• **Industry Domain**: ${domainName}\n• **Parent Company**: ${companyName}\n\nWould you like technical deployment guidelines or class approval details?`,
        confidence: "HIGH",
        sourcesUsed: sources,
        suggestedAction: "VIEW_SPECS",
        isGrounded: true,
      };
    }
  }

  // Commercial & Lead Time handling
  if (
    q.includes("lead time") ||
    q.includes("delivery") ||
    q.includes("availability") ||
    q.includes("price") ||
    q.includes("cost") ||
    q.includes("quote") ||
    q.includes("rfq") ||
    q.includes("buy") ||
    q.includes("order") ||
    q.includes("commercial") ||
    q.includes("warranty") ||
    q.includes("incoterm")
  ) {
    const comm = offering.commercialInformation;
    const priceText = comm?.pricingGuidance || "Pricing is determined by engineering scope and verified project milestone requirements.";
    const leadText = comm?.leadTime ? `\n• **Lead Time**: ${comm.leadTime}` : "\n• **Lead Time**: Standard manufacturing & mobilization schedule available on request (typical 3-6 weeks).";
    const incotermsText = comm?.incoterms ? `\n• **Incoterms**: ${comm.incoterms}` : "";
    const minQty = comm?.minOrderQty ? `\n• **Minimum Order / Scope**: ${comm.minOrderQty}` : "";
    const warrantyText = comm?.warranty ? `\n• **Warranty & Guarantee**: ${comm.warranty}` : "\n• **Warranty & Guarantee**: 24-Month Marine Class Standard Warranty.";
    const availText = comm?.availability ? `\n• **Availability State**: ${comm.availability}` : "\n• **Availability State**: Built to Order / Active Production Line";

    return {
      answer: `Here is the authorized commercial and lead time record for **${offering.name}**, provided by **${companyName}**:\n\n• **Pricing Guidance**: ${priceText}${leadText}${availText}${incotermsText}${minQty}${warrantyText}\n\nTo lock formal milestone terms or request formal pricing from ${companyName}, please use the **REQUEST OFFICIAL OFFER** action.`,
      confidence: "HIGH",
      sourcesUsed: sources,
      suggestedAction: "REQUEST_OFFER",
      isGrounded: true,
    };
  }

  // Specifications
  if (
    q.includes("spec") ||
    q.includes("parameter") ||
    q.includes("depth") ||
    q.includes("battery") ||
    q.includes("power") ||
    q.includes("dimension") ||
    q.includes("weight") ||
    q.includes("technical") ||
    q.includes("rating") ||
    q.includes("thrust")
  ) {
    const specEntries = Object.entries(specs);
    if (specEntries.length > 0) {
      const specList = specEntries.map(([k, v]) => `• **${k}**: ${v}`).join("\n");
      return {
        answer: `According to authorized technical documentation provided by **${companyName}** for **${offering.name}**, here are the verified specifications:\n\n${specList}\n\n• **Verified Provider**: ${companyName} (${sectorCityName}.CITY)`,
        confidence: "HIGH",
        sourcesUsed: sources,
        suggestedAction: "VIEW_SPECS",
        isGrounded: true,
      };
    } else {
      return {
        answer: `I don't have verified information for that item in the active datasheet for **${offering.name}**. Would you like to request full technical specifications directly from **${companyName}** via RFQ?`,
        confidence: "MEDIUM",
        sourcesUsed: sources,
        suggestedAction: "COMMERCIAL_RFQ",
        isGrounded: true,
      };
    }
  }

  // Certifications
  if (q.includes("certif") || q.includes("standard") || q.includes("class") || q.includes("dnv") || q.includes("abs")) {
    const certs = offering.certifications || [];
    const standards = offering.standards || [];
    if (certs.length > 0 || standards.length > 0) {
      return {
        answer: `**Verified Compliance & Certifications for ${offering.name}** (Issued to **${companyName}**):\n\n• **Class Approvals**: ${certs.join(", ") || "Standard Marine Class"}\n• **Standards**: ${standards.join(", ") || "IMO / ISO 9001"}\n• **Primary Sector City**: ${sectorCityName}.CITY`,
        confidence: "HIGH",
        sourcesUsed: sources,
        suggestedAction: "CONNECT_COMPANY",
        isGrounded: true,
      };
    }
  }

  // If asking out-of-scope question
  return {
    answer: `**${offering.name}** (${offering.category})\nProvided by **${companyName}** in **${sectorCityName}.CITY**\n\n${offering.detailedDescription || offering.shortDescription}\n\n• **Catalog Code**: ${offering.code || offering.sku || "MW-ACTIVE-01"}\n• **Status**: ${offering.status || "ACTIVE"}\n• **Grounded Knowledge Sources**: ${sources.length} verified technical documents on file.\n\nHow can I assist you with specific engineering parameters, commercial quotes, or class compliance?`,
    confidence: "HIGH",
    sourcesUsed: sources,
    suggestedAction: "COMMERCIAL_RFQ",
    isGrounded: true,
  };
}
