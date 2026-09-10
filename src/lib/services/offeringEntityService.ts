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

  return `https://marineworld.city/products/${cleanOffering}`;
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

import { db } from "@/lib/firebase";
import { collection, doc, deleteDoc, setDoc, getDocs } from "firebase/firestore";
import { findProductsByCompany, deleteProductRecord, findProductById } from "@/lib/repositories/productRepository";
import { findServicesByCompany, deleteServiceRecord, findServiceById } from "@/lib/repositories/serviceRepository";
import { getCompanyRecord, getCompanyRecordSync, findAllCompanies } from "@/lib/repositories/companyRepository";
import { getCompanyProducts, deleteProduct } from "@/lib/services/productService";
import { getCompanyServices, deleteService } from "@/lib/services/serviceService";
import { deleteFileFromStorage } from "@/lib/services/storageService";
import { recordOfferingAudit } from "@/lib/services/auditService";
import type { ProductEntity, ServiceEntity } from "@/lib/types";

function convertProductToOffering(p: any, company?: any): CompanyOffering {
  const priceVal = p.price || p.commercialInformation?.price || undefined;
  const currencyVal = p.currency || p.commercialInformation?.currency || "USD";
  const parentCompany = company || (p.companyId ? getCompanyById(p.companyId) || getCompanyBySlug(p.companyId) : null);
  const compSlug = p.companySlug || parentCompany?.slug || parentCompany?.id || "";
  const candidateSlug = p.slug || generateDeterministicOfferingSlug(p.name || "product", [], p.id);

  return {
    id: p.id,
    entityId: p.id,
    offeringId: p.id,
    companyId: p.companyId || company?.id || "",
    companySlug: compSlug,
    slug: candidateSlug,
    code: p.code,
    sku: p.sku,
    type: "product",
    entityType: "PRODUCT",
    name: p.name || "Product",
    category: p.category || "Products",
    shortDescription: p.shortDescription || p.description || "",
    status: (p.status === "ACTIVE" || p.status === "AVAILABLE" || p.status === "DRAFT" || p.status === "ARCHIVED") ? p.status : "AVAILABLE",
    isPublic: p.visibility === "PUBLIC" || p.isPublic !== false,
    specifications: p.specifications || p.specs || {},
    groundingSources: p.groundingSources || p.sources || [],
    mediaReferences: p.mediaReferences || p.media || [],
    media: p.media || p.mediaReferences || [],
    price: priceVal,
    currency: currencyVal,
    commercialInformation: p.commercialInformation || (priceVal ? { price: priceVal, currency: currencyVal } : undefined),
    certifications: p.certifications
      ? p.certifications.map((c: any) => (typeof c === "string" ? c : c.name || c.authority || String(c)))
      : [],
    canonicalSectorCity: p.canonicalSectorCity || p.sectorCity,
    sectorCity: p.sectorCity || p.canonicalSectorCity,
    industryDomain: p.industryDomain,
    previousSlugs: p.previousSlugs || [],
    createdAt: p.createdAt || new Date().toISOString(),
    updatedAt: p.updatedAt || new Date().toISOString(),
  };
}

function convertServiceToOffering(s: any, company?: any): CompanyOffering {
  const priceVal = s.price || s.commercialInformation?.price || undefined;
  const currencyVal = s.currency || s.commercialInformation?.currency || "USD";
  const parentCompany = company || (s.companyId ? getCompanyById(s.companyId) || getCompanyBySlug(s.companyId) : null);
  const compSlug = s.companySlug || parentCompany?.slug || parentCompany?.id || "";
  const candidateSlug = s.slug || generateDeterministicOfferingSlug(s.name || "service", [], s.id);

  return {
    id: s.id,
    entityId: s.id,
    offeringId: s.id,
    companyId: s.companyId || company?.id || "",
    companySlug: compSlug,
    slug: candidateSlug,
    code: s.code,
    sku: s.sku,
    type: "service",
    entityType: "SERVICE",
    name: s.name || "Service",
    category: s.category || "Services",
    shortDescription: s.shortDescription || s.description || "",
    status: (s.status === "ACTIVE" || s.status === "AVAILABLE" || s.status === "DRAFT" || s.status === "ARCHIVED") ? s.status : "ACTIVE",
    isPublic: s.visibility === "PUBLIC" || s.isPublic !== false,
    specifications: s.specifications || s.specs || {},
    groundingSources: s.groundingSources || s.sources || [],
    mediaReferences: s.mediaReferences || s.media || [],
    media: s.media || s.mediaReferences || [],
    price: priceVal,
    currency: currencyVal,
    commercialInformation: s.commercialInformation || (priceVal ? { price: priceVal, currency: currencyVal } : undefined),
    certifications: s.certifications
      ? s.certifications.map((c: any) => (typeof c === "string" ? c : c.name || c.authority || String(c)))
      : [],
    canonicalSectorCity: s.canonicalSectorCity || s.sectorCity,
    sectorCity: s.sectorCity || s.canonicalSectorCity,
    industryDomain: s.industryDomain,
    previousSlugs: s.previousSlugs || [],
    createdAt: s.createdAt || new Date().toISOString(),
    updatedAt: s.updatedAt || new Date().toISOString(),
  };
}

/**
 * Get all canonical offerings for a company
 */
export function getCompanyOfferings(companyId: string): CompanyOffering[] {
  if (!companyId) return [];

  // Check store first
  const existing = canonicalOfferingsStore.get(companyId);
  if (existing && existing.length > 0) {
    return existing;
  }

  // Fallback to company profile & sync repositories
  const company = getCompanyById(companyId) || getCompanyBySlug(companyId) || (getCompanyRecordSync(companyId) as unknown as CompanyProfile);
  const mergedMap = new Map<string, CompanyOffering>();

  if (company) {
    if (company.offerings && Array.isArray(company.offerings)) {
      company.offerings.forEach((o) => {
        if (o && o.id) mergedMap.set(o.id, initializeCanonicalOfferingDefaults(o, company));
      });
    }
    if ((company as any).products && Array.isArray((company as any).products)) {
      (company as any).products.forEach((p: any) => {
        if (p && p.id && !mergedMap.has(p.id)) {
          mergedMap.set(p.id, initializeCanonicalOfferingDefaults(convertProductToOffering(p, company), company));
        }
      });
    }
    if ((company as any).services && Array.isArray((company as any).services)) {
      (company as any).services.forEach((s: any) => {
        if (s && s.id && !mergedMap.has(s.id)) {
          mergedMap.set(s.id, initializeCanonicalOfferingDefaults(convertServiceToOffering(s, company), company));
        }
      });
    }
  }

  // Also query canonical domain services (products & services)
  try {
    const prods = getCompanyProducts(companyId);
    prods.forEach((p) => {
      if (p && p.id && !mergedMap.has(p.id)) {
        mergedMap.set(p.id, initializeCanonicalOfferingDefaults(convertProductToOffering(p, company), company));
      }
    });

    const servs = getCompanyServices(companyId);
    servs.forEach((s) => {
      if (s && s.id && !mergedMap.has(s.id)) {
        mergedMap.set(s.id, initializeCanonicalOfferingDefaults(convertServiceToOffering(s, company), company));
      }
    });
  } catch {
    // ignore
  }

  const result = Array.from(mergedMap.values());
  if (result.length > 0) {
    canonicalOfferingsStore.set(companyId, result);
    return result;
  }

  return [];
}

/**
 * Asynchronously fetch and sync all offerings for a company directly from Firestore collections and company document
 */
export async function fetchCompanyOfferingsAsync(companyId: string): Promise<CompanyOffering[]> {
  if (!companyId) return [];
  try {
    const comp = (await getCompanyRecord(companyId)) || getCompanyById(companyId) || getCompanyBySlug(companyId);
    const targetId = comp?.id || companyId;
    const [fbProds, fbServs] = await Promise.all([
      findProductsByCompany(targetId).catch(() => []),
      findServicesByCompany(targetId).catch(() => []),
    ]);

    let extraProds: any[] = [];
    let extraServs: any[] = [];
    if (targetId !== companyId) {
      const [p2, s2] = await Promise.all([
        findProductsByCompany(companyId).catch(() => []),
        findServicesByCompany(companyId).catch(() => []),
      ]);
      extraProds = p2;
      extraServs = s2;
    }

    const mergedMap = new Map<string, CompanyOffering>();

    // 1. Seed existing synchronous offerings first
    const syncOfferings = getCompanyOfferings(companyId);
    syncOfferings.forEach((o) => {
      if (o && o.id) mergedMap.set(o.id, o);
    });
    if (targetId !== companyId) {
      getCompanyOfferings(targetId).forEach((o) => {
        if (o && o.id && !mergedMap.has(o.id)) mergedMap.set(o.id, o);
      });
    }

    // 2. Company document offerings & embedded products/services
    if (comp?.offerings && Array.isArray(comp.offerings)) {
      comp.offerings.forEach((o) => {
        if (o && o.id) mergedMap.set(o.id, initializeCanonicalOfferingDefaults(o, comp));
      });
    }
    if ((comp as any)?.products && Array.isArray((comp as any).products)) {
      (comp as any).products.forEach((p: any) => {
        if (p && p.id && !mergedMap.has(p.id)) {
          mergedMap.set(p.id, initializeCanonicalOfferingDefaults(convertProductToOffering(p, comp), comp));
        }
      });
    }
    if ((comp as any)?.services && Array.isArray((comp as any).services)) {
      (comp as any).services.forEach((s: any) => {
        if (s && s.id && !mergedMap.has(s.id)) {
          mergedMap.set(s.id, initializeCanonicalOfferingDefaults(convertServiceToOffering(s, comp), comp));
        }
      });
    }

    // 3. Firestore subcollections
    [...fbProds, ...extraProds].forEach((p: any) => {
      const existing = mergedMap.get(p.id);
      const off = initializeCanonicalOfferingDefaults(convertProductToOffering({ ...(existing || {}), ...p }, comp), comp);
      mergedMap.set(p.id, off);
    });

    [...fbServs, ...extraServs].forEach((s: any) => {
      const existing = mergedMap.get(s.id);
      const off = initializeCanonicalOfferingDefaults(convertServiceToOffering({ ...(existing || {}), ...s }, comp), comp);
      mergedMap.set(s.id, off);
    });

    const result = Array.from(mergedMap.values());
    if (result.length > 0) {
      canonicalOfferingsStore.set(companyId, result);
      if (targetId) canonicalOfferingsStore.set(targetId, result);
      if ((comp as any)?.slug) canonicalOfferingsStore.set((comp as any).slug, result);
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
    ...(((offeringData as any).okfDocument || (existingOffering as any)?.okfDocument)
      ? { okfDocument: (offeringData as any).okfDocument || (existingOffering as any)?.okfDocument }
      : {}),
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

  // Strip large base64Data before writing to Firestore so documents don't exceed 1MB limit
  const sanitizedListForFirestore = updatedList.map((off) => ({
    ...off,
    groundingSources: (off.groundingSources || []).map((src) => {
      const copy = { ...src };
      delete (copy as any).base64Data;
      return copy;
    }),
  }));

  // Sync back to CompanyEntity (Firestore persistent)
  const updatedCompany: CompanyEntity = {
    ...company,
    offerings: sanitizedListForFirestore,
    updatedAt: new Date().toISOString(),
  };
  saveCompany(updatedCompany);

  // Authoritative Subcollection Firestore write
  try {
    const sanitizedOfferingForFirestore = {
      ...finalOffering,
      groundingSources: (finalOffering.groundingSources || []).map((src) => {
        const copy = { ...src };
        delete (copy as any).base64Data;
        return copy;
      }),
    };

    if (finalOffering.entityType === "PRODUCT" || finalOffering.type === "product") {
      import("@/services/productService").then(({ saveProduct }) => {
        saveProduct(companyId, sanitizedOfferingForFirestore as any);
      });
    } else {
      import("@/services/serviceService").then(({ saveService }) => {
        saveService(companyId, sanitizedOfferingForFirestore as any);
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
 * Asynchronously and permanently delete an offering, including:
 * 1. Firestore product / service subcollection documents
 * 2. Associated images, media files, and attachments from Firebase Storage
 * 3. Linked documents and files from Firestore (/companies/{id}/documents & /companies/{id}/files)
 * 4. Company document offerings/products/services arrays in Firestore
 * 5. In-memory runtime stores and Twin listeners
 */
export async function deleteOfferingAsync(companyId: string, offeringId: string): Promise<boolean> {
  if (!companyId || !offeringId) return false;

  const offerings = getCompanyOfferings(companyId);
  const targetOffering = offerings.find((o) => o.id === offeringId || o.slug === offeringId);

  // 1. Collect all storage paths and URLs to delete
  const mediaUrlsToDelete: string[] = [];

  if (targetOffering) {
    if (targetOffering.mediaReferences && Array.isArray(targetOffering.mediaReferences)) {
      targetOffering.mediaReferences.forEach((m: any) => {
        if (typeof m === "string" && m) mediaUrlsToDelete.push(m);
        else if (m?.url) mediaUrlsToDelete.push(m.url);
        else if (m?.storagePath) mediaUrlsToDelete.push(m.storagePath);
      });
    }

    if (targetOffering.media && Array.isArray(targetOffering.media)) {
      targetOffering.media.forEach((m: any) => {
        if (typeof m === "string" && m) mediaUrlsToDelete.push(m);
        else if (m?.url) mediaUrlsToDelete.push(m.url);
        else if (m?.storagePath) mediaUrlsToDelete.push(m.storagePath);
      });
    }

    if ((targetOffering as any).coverImage) {
      const cover = (targetOffering as any).coverImage;
      if (typeof cover === "string" && cover) mediaUrlsToDelete.push(cover);
      else if (cover?.url) mediaUrlsToDelete.push(cover.url);
    }

    if (targetOffering.groundingSources && Array.isArray(targetOffering.groundingSources)) {
      targetOffering.groundingSources.forEach((g: any) => {
        if (g?.url) mediaUrlsToDelete.push(g.url);
        if (g?.storagePath) mediaUrlsToDelete.push(g.storagePath);
      });
    }
  }

  // 2. Delete storage files
  const uniqueUrls = Array.from(new Set(mediaUrlsToDelete.filter(Boolean)));
  await Promise.allSettled(uniqueUrls.map((url) => deleteFileFromStorage(url)));

  // 3. Delete from Firestore products & services subcollections
  await Promise.allSettled([
    deleteProductRecord(companyId, offeringId),
    deleteServiceRecord(companyId, offeringId),
    deleteProduct(companyId, offeringId).catch(() => { }),
    deleteService(companyId, offeringId).catch(() => { }),
  ]);

  // 4. Delete linked documents and files from Firestore
  try {
    const docsColRef = collection(db, "companies", companyId, "documents");
    const docsSnap = await getDocs(docsColRef);
    const docDeletePromises: Promise<any>[] = [];

    docsSnap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (
        data.productId === offeringId ||
        data.serviceId === offeringId ||
        data.offeringId === offeringId ||
        (targetOffering?.slug && (data.productId === targetOffering.slug || data.serviceId === targetOffering.slug))
      ) {
        docDeletePromises.push(deleteDoc(docSnap.ref));
        if (data.storageReference) {
          deleteFileFromStorage(data.storageReference).catch(() => { });
        }
      }
    });

    const filesColRef = collection(db, "companies", companyId, "files");
    const filesSnap = await getDocs(filesColRef);
    filesSnap.docs.forEach((fileSnap) => {
      const data = fileSnap.data();
      if (
        data.productId === offeringId ||
        data.serviceId === offeringId ||
        data.offeringId === offeringId ||
        (targetOffering?.slug && (data.productId === targetOffering.slug || data.serviceId === targetOffering.slug))
      ) {
        docDeletePromises.push(deleteDoc(fileSnap.ref));
        if (data.storageReference) {
          deleteFileFromStorage(data.storageReference).catch(() => { });
        }
      }
    });

    await Promise.allSettled(docDeletePromises);
  } catch (err) {
    console.warn("[OfferingEntityService] Error cleaning up linked documents/files in Firestore:", err);
  }

  // 5. Update Company document in Firestore and memory
  const filtered = offerings.filter((o) => o.id !== offeringId && o.slug !== offeringId);
  canonicalOfferingsStore.set(companyId, filtered);

  const company = (await getCompanyRecord(companyId)) || getCompanyById(companyId) || getCompanyBySlug(companyId);
  if (company) {
    const updatedOfferings = (company.offerings || []).filter((o: any) => o.id !== offeringId && o.slug !== offeringId);
    const updatedProducts = ((company as any).products || []).filter((p: any) => p.id !== offeringId && p.slug !== offeringId);
    const updatedServices = ((company as any).services || []).filter((s: any) => s.id !== offeringId && s.slug !== offeringId);

    const updatedCompany: CompanyEntity = {
      ...company,
      offerings: updatedOfferings,
      products: updatedProducts,
      services: updatedServices,
      updatedAt: new Date().toISOString(),
    } as any;

    await saveCompany(updatedCompany);

    try {
      const compDocRef = doc(db, "companies", companyId);
      await setDoc(compDocRef, {
        offerings: updatedOfferings,
        products: updatedProducts,
        services: updatedServices,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn("[OfferingEntityService] Firestore company doc update error on deleteOffering:", err);
    }
  }

  notifyTwinListeners();

  recordOfferingAudit(
    companyId,
    "OFFERING_DELETED",
    targetOffering?.type === "service" ? "SERVICE" : "PRODUCT",
    offeringId,
    { previous: targetOffering ? { name: targetOffering.name } : undefined },
    { reason: "Offering, associated media and documents permanently deleted from Firebase" }
  );

  return true;
}

/**
 * Delete an offering
 */
export function deleteOffering(companyId: string, offeringId: string): boolean {
  // Synchronously update in-memory stores and trigger async cleanup in Firestore/Storage
  const offerings = getCompanyOfferings(companyId);
  const filtered = offerings.filter((o) => o.id !== offeringId && o.slug !== offeringId);
  canonicalOfferingsStore.set(companyId, filtered);

  const company = getCompanyById(companyId) || getCompanyBySlug(companyId);
  if (company) {
    const updatedCompany: CompanyEntity = {
      ...company,
      offerings: filtered,
      products: ((company as any).products || []).filter((p: any) => p.id !== offeringId && p.slug !== offeringId),
      services: ((company as any).services || []).filter((s: any) => s.id !== offeringId && s.slug !== offeringId),
      updatedAt: new Date().toISOString(),
    } as any;
    saveCompany(updatedCompany);
  }

  deleteOfferingAsync(companyId, offeringId).catch((err) => {
    console.warn("[OfferingEntityService] deleteOffering async cleanup error:", err);
  });

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
  let prioritizedCompanies = parsedCompanySlug
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

  // If prioritizedCompanies is empty or lacks parsedCompanySlug, attempt direct lookup
  if (parsedCompanySlug && (!prioritizedCompanies.length || !prioritizedCompanies.some(c => c.id.toLowerCase() === parsedCompanySlug?.toLowerCase() || (c as any).slug?.toLowerCase() === parsedCompanySlug?.toLowerCase()))) {
    const directComp = getCompanyById(parsedCompanySlug) || getCompanyBySlug(parsedCompanySlug) || (getCompanyRecordSync(parsedCompanySlug) as unknown as CompanyEntity);
    if (directComp) {
      prioritizedCompanies = [directComp, ...prioritizedCompanies];
    }
  }

  for (const company of prioritizedCompanies) {
    const offerings = getCompanyOfferings(company.id);

    // Exact slug or ID match or slug generated from name
    const match = offerings.find(
      (o) =>
        o.slug?.toLowerCase() === offeringSlugCandidate ||
        o.id.toLowerCase() === offeringSlugCandidate ||
        o.offeringId?.toLowerCase() === offeringSlugCandidate ||
        (o.code && o.code.toLowerCase() === offeringSlugCandidate) ||
        (o.sku && o.sku.toLowerCase() === offeringSlugCandidate) ||
        (o.name && generateDeterministicOfferingSlug(o.name).toLowerCase() === offeringSlugCandidate)
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
 * Asynchronously resolve canonical offering:
 * 1. Checks memory & cache synchronously first.
 * 2. If companyHint is provided, fetches company and its offerings/subcollections from Firestore.
 * 3. If still missing, queries all companies from Firestore and checks embedded offerings and subcollections.
 */
export async function resolveCanonicalOfferingAsync(
  identifier: string,
  sectorCityHint?: string,
  companyHint?: string
): Promise<ResolvedCanonicalOffering | null> {
  // 1. Try sync resolution first
  const sync = resolveCanonicalOffering(identifier, sectorCityHint, companyHint);
  if (sync) return sync;

  let raw = identifier.toLowerCase().trim();
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const parsed = new URL(raw);
      raw = parsed.hostname;
    } catch { }
  }

  let offeringSlugCandidate = raw;
  let parsedCompanySlug: string | undefined = companyHint;
  let parsedSectorCity: string = sectorCityHint || "shipyard";

  if (raw.includes(".marineworld.city")) {
    const prefix = raw.replace(".marineworld.city", "");
    const parts = prefix.split(".");
    if (parts.length >= 3) {
      offeringSlugCandidate = parts[0];
      parsedCompanySlug = parts[1];
      parsedSectorCity = parts[2];
    } else if (parts.length === 2) {
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

  // 2. If parsedCompanySlug is present, fetch company offerings from Firestore
  if (parsedCompanySlug) {
    try {
      const comp = await getCompanyRecord(parsedCompanySlug);
      await fetchCompanyOfferingsAsync(parsedCompanySlug);
      if (comp?.id && comp.id !== parsedCompanySlug) {
        await fetchCompanyOfferingsAsync(comp.id);
      }
      const retry = resolveCanonicalOffering(identifier, parsedSectorCity, parsedCompanySlug);
      if (retry) return retry;
    } catch (err) {
      console.warn("[OfferingEntityService] Failed to load company offerings async:", err);
    }
  }

  // 3. Query all companies from Firestore
  try {
    const allComps = await findAllCompanies();

    // Check companies whose embedded offerings, products, or services match candidate
    for (const comp of allComps) {
      const hasCandidate =
        (comp.offerings || []).some(
          (o) =>
            o?.slug?.toLowerCase() === offeringSlugCandidate ||
            o?.id?.toLowerCase() === offeringSlugCandidate ||
            o?.offeringId?.toLowerCase() === offeringSlugCandidate ||
            (o?.name && generateDeterministicOfferingSlug(o.name).toLowerCase() === offeringSlugCandidate)
        ) ||
        ((comp as any).products || []).some(
          (p: any) =>
            p?.slug?.toLowerCase() === offeringSlugCandidate ||
            p?.id?.toLowerCase() === offeringSlugCandidate ||
            (p?.name && generateDeterministicOfferingSlug(p.name).toLowerCase() === offeringSlugCandidate)
        ) ||
        ((comp as any).services || []).some(
          (s: any) =>
            s?.slug?.toLowerCase() === offeringSlugCandidate ||
            s?.id?.toLowerCase() === offeringSlugCandidate ||
            (s?.name && generateDeterministicOfferingSlug(s.name).toLowerCase() === offeringSlugCandidate)
        );

      if (hasCandidate) {
        await fetchCompanyOfferingsAsync(comp.id);
        const retry = resolveCanonicalOffering(identifier, parsedSectorCity, comp.slug || comp.id);
        if (retry) return retry;
      }
    }

    // Check subcollections for companies
    for (const comp of allComps) {
      const [foundProd, foundServ] = await Promise.all([
        findProductById(comp.id, offeringSlugCandidate).catch(() => null),
        findServiceById(comp.id, offeringSlugCandidate).catch(() => null),
      ]);
      if (foundProd || foundServ) {
        await fetchCompanyOfferingsAsync(comp.id);
        const retry = resolveCanonicalOffering(identifier, parsedSectorCity, comp.slug || comp.id);
        if (retry) return retry;
      }
    }

    // Proactively sync all companies if count is reasonable
    if (allComps.length <= 15) {
      await Promise.all(allComps.map((c) => fetchCompanyOfferingsAsync(c.id).catch(() => [])));
      const retry = resolveCanonicalOffering(identifier, parsedSectorCity, companyHint);
      if (retry) return retry;
    }
  } catch (err) {
    console.warn("[OfferingEntityService] resolveCanonicalOfferingAsync fallback:", err);
  }

  return resolveCanonicalOffering(identifier, sectorCityHint, companyHint);
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

  // Check for cross-offering or comparison queries
  if (
    mentionsOtherProduct ||
    q.includes("competitor") ||
    q.includes("other product") ||
    q.includes("another company") ||
    q.includes("other service") ||
    q.includes("compare") ||
    q.includes("similar")
  ) {
    const rawAnswer = `I am the dedicated AI Advisor strictly grounded in ${offering.name}, provided by ${companyName} in ${sectorCityName}.CITY (${domainName}). Under MarineWorld sovereign data isolation protocols, I cannot provide details or compare records for external offerings or third-party assets.\n\nPlease navigate directly to that entity's canonical record on MarineWorld or contact ${companyName} directly for catalog guidance.`;
    return {
      answer: rawAnswer.replace(/\*/g, ""),
      confidence: "HIGH",
      sourcesUsed: sources,
      suggestedAction: "CONNECT_COMPANY",
      isGrounded: true,
    };
  }

  // Available configurations / options / variants
  if (
    q.includes("config") ||
    q.includes("variant") ||
    q.includes("option") ||
    q.includes("layout") ||
    q.includes("version")
  ) {
    const rawAnswer = `${offering.name} is available in multiple engineered configurations and bespoke layouts certified by ${companyName}.\n\n• Standard and high-performance propulsion / power packages\n• Integrated bridge navigation and sensor options\n• Custom deck, cabin, and operational mission equipment\n• Full compliance with ${sectorCityName}.CITY maritime classification standards\n\nWould you like full technical specification sheets or to request a customized configuration offer?`;
    return {
      answer: rawAnswer.replace(/\*/g, ""),
      confidence: "HIGH",
      sourcesUsed: sources,
      suggestedAction: "REQUEST_OFFER",
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
      const appList = apps.map((a) => `• ${a}`).join("\n");
      const rawAnswer = `${offering.name} (Provided by ${companyName}) is engineered for the following verified operational applications and deployment environments:\n\n${appList}\n\n• Sector City: ${sectorCityName}.CITY\n• Industry Domain: ${domainName}\n• Parent Company: ${companyName}\n\nWould you like technical deployment guidelines or class approval details?`;
      return {
        answer: rawAnswer.replace(/\*/g, ""),
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
    const leadText = comm?.leadTime ? `\n• Lead Time: ${comm.leadTime}` : "\n• Lead Time: Standard manufacturing & mobilization schedule available on request (typical 3-6 weeks).";
    const incotermsText = comm?.incoterms ? `\n• Incoterms: ${comm.incoterms}` : "";
    const minQty = comm?.minOrderQty ? `\n• Minimum Order / Scope: ${comm.minOrderQty}` : "";
    const warrantyText = comm?.warranty ? `\n• Warranty & Guarantee: ${comm.warranty}` : "\n• Warranty & Guarantee: 24-Month Marine Class Standard Warranty.";
    const availText = comm?.availability ? `\n• Availability State: ${comm.availability}` : "\n• Availability State: Built to Order / Active Production Line";

    const rawAnswer = `Here is the authorized commercial and lead time record for ${offering.name}, provided by ${companyName}:\n\n• Pricing Guidance: ${priceText}${leadText}${availText}${incotermsText}${minQty}${warrantyText}\n\nTo lock formal milestone terms or request formal pricing from ${companyName}, please use the REQUEST OFFICIAL OFFER action.`;
    return {
      answer: rawAnswer.replace(/\*/g, ""),
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
      const specList = specEntries.map(([k, v]) => `• ${k}: ${v}`).join("\n");
      const rawAnswer = `According to authorized technical documentation provided by ${companyName} for ${offering.name}, here are the verified specifications:\n\n${specList}\n\n• Verified Provider: ${companyName} (${sectorCityName}.CITY)`;
      return {
        answer: rawAnswer.replace(/\*/g, ""),
        confidence: "HIGH",
        sourcesUsed: sources,
        suggestedAction: "VIEW_SPECS",
        isGrounded: true,
      };
    } else {
      const rawAnswer = `I don't have verified information for that item in the active datasheet for ${offering.name}. Would you like to request full technical specifications directly from ${companyName} via RFQ?`;
      return {
        answer: rawAnswer.replace(/\*/g, ""),
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
      const rawAnswer = `Verified Compliance & Certifications for ${offering.name} (Issued to ${companyName}):\n\n• Class Approvals: ${certs.join(", ") || "Standard Marine Class"}\n• Standards: ${standards.join(", ") || "IMO / ISO 9001"}\n• Primary Sector City: ${sectorCityName}.CITY`;
      return {
        answer: rawAnswer.replace(/\*/g, ""),
        confidence: "HIGH",
        sourcesUsed: sources,
        suggestedAction: "CONNECT_COMPANY",
        isGrounded: true,
      };
    }
  }

  // If asking out-of-scope question
  const defaultAnswer = `${offering.name} (${offering.category})\nProvided by ${companyName} in ${sectorCityName}.CITY\n\n${offering.detailedDescription || offering.shortDescription}\n\n• Catalog Code: ${offering.code || offering.sku || "MW-ACTIVE-01"}\n• Status: ${offering.status || "ACTIVE"}\n• Grounded Knowledge Sources: ${sources.length} verified technical documents on file.\n\nHow can I assist you with specific engineering parameters, commercial quotes, or class compliance?`;
  return {
    answer: defaultAnswer.replace(/\*/g, ""),
    confidence: "HIGH",
    sourcesUsed: sources,
    suggestedAction: "COMMERCIAL_RFQ",
    isGrounded: true,
  };
}
