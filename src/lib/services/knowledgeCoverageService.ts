import type { CompanyOffering, CompanyEntity, DocumentEntity } from "@/lib/types";

export interface OfferingKnowledgeCoverageResult {
  coveragePercent: number;
  verifiedFactsCount: number;
  approvedSourcesCount: number;
  status: "GROUNDED" | "INCOMPLETE";
  aiReadiness: "AI ADVISOR READY" | "AI ADVISOR NOT READY";
  missingRequirements: string[];
  breakdown: {
    hasNameAndCode: boolean;
    hasCategory: boolean;
    hasDescriptions: boolean;
    specificationsCount: number;
    applicationsCount: number;
    certificationsCount: number;
    commercialTermsCount: number;
    approvedSourcesCount: number;
  };
}

export interface CompanyKnowledgeCoverageResult {
  status: "GROUNDED" | "INCOMPLETE";
  aiReadiness: "AI ADVISOR READY" | "AI ADVISOR NOT READY";
  groundedSourcesCount: number;
  verifiedEntitiesCount: number;
  missingRequirements: string[];
  breakdown: {
    hasIdentity: boolean;
    hasPositioning: boolean;
    hasPresenceOrFacility: boolean;
    hasCompanyDocuments: boolean;
  };
}

/**
 * Deterministically compute Offering Knowledge Coverage against required schema
 */
export function computeOfferingKnowledgeCoverage(
  offering: Partial<CompanyOffering>,
  companyDocs?: DocumentEntity[]
): OfferingKnowledgeCoverageResult {
  const missingRequirements: string[] = [];

  // 1. Identity & Identifier
  const hasNameAndCode = Boolean(
    offering.name && offering.name.trim().length > 2 && (offering.code || offering.sku || offering.id)
  );
  if (!hasNameAndCode) {
    missingRequirements.push("Missing offering name or canonical identifier");
  }

  // 2. Category
  const hasCategory = Boolean(offering.category && offering.category.trim().length > 1);
  if (!hasCategory) {
    missingRequirements.push("Missing sector classification / category");
  }

  // 3. Descriptions
  const hasShortDesc = Boolean(offering.shortDescription && offering.shortDescription.trim().length >= 15);
  const hasDetailedDesc = Boolean(
    (offering.detailedDescription && offering.detailedDescription.trim().length >= 30) ||
      (offering.serviceScope && offering.serviceScope.trim().length >= 20)
  );
  const hasDescriptions = hasShortDesc && hasDetailedDesc;
  if (!hasShortDesc) {
    missingRequirements.push("Missing operational summary description");
  }
  if (!hasDetailedDesc) {
    missingRequirements.push("Missing detailed technical scope / engineering description");
  }

  // 4. Specifications
  const specs = offering.specifications || {};
  const specificationsCount = Object.keys(specs).filter(
    (k) => Boolean(k && specs[k] && String(specs[k]).trim().length > 0)
  ).length;
  if (specificationsCount < 2) {
    missingRequirements.push("Missing technical specifications (minimum 2 required)");
  }

  // 5. Target Applications
  const applicationsCount = (offering.applications || []).filter((a) => Boolean(a && a.trim().length > 0)).length;
  if (applicationsCount === 0) {
    missingRequirements.push("Missing target operational applications / use cases");
  }

  // 6. Certifications & Standards
  const certsCount = (offering.certifications || []).filter((c) => Boolean(c && c.trim().length > 0)).length;
  const standardsCount = (offering.standards || []).filter((s) => Boolean(s && s.trim().length > 0)).length;
  const certificationsCount = certsCount + standardsCount;
  if (certificationsCount === 0) {
    missingRequirements.push("Missing marine classification / ISO certification");
  }

  // 7. Commercial Terms
  const comm = offering.commercialInformation || {};
  let commercialTermsCount = 0;
  if (comm.pricingGuidance && comm.pricingGuidance.trim().length > 0) commercialTermsCount++;
  if (comm.incoterms && comm.incoterms.trim().length > 0) commercialTermsCount++;
  if (comm.leadTime && comm.leadTime.trim().length > 0) commercialTermsCount++;
  if (comm.warranty && comm.warranty.trim().length > 0) commercialTermsCount++;
  if (comm.availability && comm.availability.trim().length > 0) commercialTermsCount++;
  if (comm.rfqAvailable !== undefined) commercialTermsCount++;

  if (commercialTermsCount < 1) {
    missingRequirements.push("Missing commercial terms or lead time parameters");
  }

  // 8. Grounding Sources
  // Count sources attached directly or matched in companyDocs by offering id
  const directSourcesCount = (offering.groundingSources || []).length;
  const matchedDocsCount = (companyDocs || []).filter(
    (d) =>
      d.groundingStatus === "GROUNDED" &&
      (d.productId === offering.id || d.serviceId === offering.id)
  ).length;
  const approvedSourcesCount = Math.max(directSourcesCount, matchedDocsCount);
  if (approvedSourcesCount === 0) {
    missingRequirements.push("Missing verified technical grounding document / source");
  }

  // Calculate deterministic total verified facts
  const verifiedFactsCount =
    (hasNameAndCode ? 2 : (offering.name ? 1 : 0)) +
    (hasCategory ? 1 : 0) +
    (hasShortDesc ? 1 : 0) +
    (hasDetailedDesc ? 1 : 0) +
    specificationsCount +
    applicationsCount +
    certificationsCount +
    commercialTermsCount +
    approvedSourcesCount;

  // Schema fact slots (11 total possible baseline schema weights)
  const totalSlots = 11;
  let satisfiedSlots = 0;
  if (hasNameAndCode) satisfiedSlots += 1;
  if (hasCategory) satisfiedSlots += 1;
  if (hasShortDesc) satisfiedSlots += 1;
  if (hasDetailedDesc) satisfiedSlots += 1;
  if (specificationsCount >= 1) satisfiedSlots += 1;
  if (specificationsCount >= 3) satisfiedSlots += 1;
  if (applicationsCount >= 1) satisfiedSlots += 1;
  if (certificationsCount >= 1) satisfiedSlots += 1;
  if (commercialTermsCount >= 1) satisfiedSlots += 1;
  if (approvedSourcesCount >= 1) satisfiedSlots += 1;
  if (approvedSourcesCount >= 2) satisfiedSlots += 1;

  const coveragePercent = Math.min(100, Math.max(0, Math.round((satisfiedSlots / totalSlots) * 100)));

  // Grounding & AI Readiness Link (Deterministic)
  // To be Grounded & AI Ready: must have at least 65% coverage, at least 1 verified source, and at least 2 specifications
  const isGrounded = coveragePercent >= 65 && approvedSourcesCount >= 1 && specificationsCount >= 2;
  const status: "GROUNDED" | "INCOMPLETE" = isGrounded ? "GROUNDED" : "INCOMPLETE";
  const aiReadiness: "AI ADVISOR READY" | "AI ADVISOR NOT READY" = isGrounded
    ? "AI ADVISOR READY"
    : "AI ADVISOR NOT READY";

  return {
    coveragePercent,
    verifiedFactsCount,
    approvedSourcesCount,
    status,
    aiReadiness,
    missingRequirements,
    breakdown: {
      hasNameAndCode,
      hasCategory,
      hasDescriptions,
      specificationsCount,
      applicationsCount,
      certificationsCount,
      commercialTermsCount,
      approvedSourcesCount,
    },
  };
}

/**
 * Deterministically compute Company Knowledge Coverage
 */
export function computeCompanyKnowledgeCoverage(
  company: Partial<CompanyEntity>,
  companyDocs?: DocumentEntity[]
): CompanyKnowledgeCoverageResult {
  const missingRequirements: string[] = [];

  // 1. Identity
  const companyName = company.displayName || company.legalName || company.brandName || (company as any)?.name;
  const hasIdentity = Boolean(
    companyName &&
      String(companyName).trim().length > 1 &&
      (company.businessId || company.id)
  );
  if (!hasIdentity) {
    missingRequirements.push("Missing registered company identity");
  }

  // 2. Positioning / Sector
  const hasPositioning = Boolean(
    (company.industry && company.industry.trim().length > 0) ||
      (company.primarySectorCategory && company.primarySectorCategory.trim().length > 0) ||
      (company.shortDescription && company.shortDescription.trim().length > 0) ||
      (company.description && company.description.trim().length > 0)
  );
  if (!hasPositioning) {
    missingRequirements.push("Missing sector positioning and core capability statement");
  }

  // 3. Physical Facilities or Presence
  const hasPresenceOrFacility = Boolean(
    (company.physicalFacilities && company.physicalFacilities.length > 0) ||
      company.registeredHeadquarters ||
      (company.city && (company.country || company.location))
  );
  if (!hasPresenceOrFacility) {
    missingRequirements.push("Missing verified physical facility / operational location");
  }

  // 4. Grounded Company Documents
  const groundedDocs = (companyDocs || []).filter(
    (d) => d.groundingStatus === "GROUNDED" && (!d.productId && !d.serviceId)
  );
  const groundedSourcesCount = groundedDocs.length;
  const hasCompanyDocuments = groundedSourcesCount > 0;
  if (!hasCompanyDocuments) {
    missingRequirements.push("Missing authoritative company-level grounding document");
  }

  // Verified entities count
  let verifiedEntitiesCount = 0;
  if (hasIdentity) verifiedEntitiesCount += 2;
  if (hasPositioning) verifiedEntitiesCount += 2;
  if (hasPresenceOrFacility) verifiedEntitiesCount += 2;
  verifiedEntitiesCount += groundedSourcesCount;

  const isGrounded = hasIdentity && hasCompanyDocuments;
  const status: "GROUNDED" | "INCOMPLETE" = isGrounded ? "GROUNDED" : "INCOMPLETE";
  const aiReadiness: "AI ADVISOR READY" | "AI ADVISOR NOT READY" = isGrounded
    ? "AI ADVISOR READY"
    : "AI ADVISOR NOT READY";

  return {
    status,
    aiReadiness,
    groundedSourcesCount,
    verifiedEntitiesCount,
    missingRequirements,
    breakdown: {
      hasIdentity,
      hasPositioning,
      hasPresenceOrFacility,
      hasCompanyDocuments,
    },
  };
}
