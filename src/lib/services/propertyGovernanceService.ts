import { getCurrentAuthUser } from "@/lib/auth/authAdapter";
import { getCompanyMember } from "@/lib/services/securityService";
import { recordGovernanceAudit } from "@/lib/services/governanceService";
import { getCompanyRecordSync } from "@/lib/repositories/companyRepository";

export interface CreativeData {
  headline?: string;
  subheadline?: string;
  description?: string;
  mediaUrl?: string;
  mobileMediaUrl?: string;
  galleryMediaUrls?: string[];
  videoUrl?: string;
  ctaLabel?: string;
  ctaHref?: string;
  featuredOfferingName?: string;
  featuredOfferingType?: "PRODUCT" | "SERVICE";
}

export type PropertyCreativeStatus = "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "REVISION_REQUIRED" | "APPROVED" | "PUBLISHED" | "PAUSED" | "REJECTED";

export interface PropertyCreativeRevision {
  revisionId: string;
  propertyId: string;
  slotId: string;
  companyId: string;
  businessId: string;
  cityId: string;
  regionCode: string;
  tier: string;
  version: number;
  status: PropertyCreativeStatus;
  creative: CreativeData;
  submittedAt?: string;
  submittedBy?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  approvedAt?: string;
  publishedAt?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export function getSlotKey(cityId: string, regionCode: string, slotId: string): string {
  return `${(cityId || "").toLowerCase()}::${(regionCode || "GLOBAL").toUpperCase()}::${(slotId || "").toLowerCase()}`;
}

export function formatCanonicalPropertyKey(cityId: string, regionCode: string, slotId: string): string {
  const c = (cityId || "").toUpperCase().replace(/\.CITY$/i, "");
  const r = (regionCode || "GLOBAL").toUpperCase().slice(0, 3);
  const s = (slotId || "").toUpperCase().replace(/^SLOT-/, "");
  return `${c}::${r}::${s}`;
}

// Initial canonical publications to satisfy multi-regional architecture and test scenarios
const initialRevisions: PropertyCreativeRevision[] = [
  // Supply Chain City
  {
    revisionId: "rev-seed-argento-med",
    propertyId: "prop-slot-lm-supplychain-mediterranean",
    slotId: "slot-lm-supplychain-mediterranean",
    companyId: "argento",
    businessId: "biz-argento",
    cityId: "supplychain",
    regionCode: "MEDITERRANEAN",
    tier: "LANDMARK",
    version: 1,
    status: "PUBLISHED",
    creative: {
      headline: "Integrated Mediterranean Maritime Supply & Port Logistics",
      subheadline: "Direct vessel provisioning, technical store replenishment, and customs clearance across 24 Riviera ports.",
      description: "Premier yacht support and bonded logistics hub serving Mediterranean charter fleets.",
      mediaUrl: "https://images.unsplash.com/photo-1569263979104-865ab7cd8d17?auto=format&fit=crop&w=1600&q=80",
      ctaLabel: "EXPLORE LOGISTICS HUB",
      ctaHref: "/companies/argento-marine",
      featuredOfferingName: "Riviera Express Vessel Provisioning",
      featuredOfferingType: "SERVICE",
    },
    publishedAt: "2026-01-10T10:00:00.000Z",
    approvedAt: "2026-01-10T09:00:00.000Z",
    submittedAt: "2026-01-10T08:00:00.000Z",
    createdAt: "2026-01-10T08:00:00.000Z",
    updatedAt: "2026-01-10T10:00:00.000Z",
  },
  {
    revisionId: "rev-seed-medmarine-med",
    propertyId: "prop-slot-fs-supplychain-mediterranean-1",
    slotId: "slot-fs-supplychain-mediterranean-1",
    companyId: "med-marine-systems",
    businessId: "biz-medmarine",
    cityId: "supplychain",
    regionCode: "MEDITERRANEAN",
    tier: "FLAGSHIP",
    version: 1,
    status: "PUBLISHED",
    creative: {
      headline: "Automated Propulsion Spares & Ligurian Dockside Integration",
      subheadline: "Direct technical replenishment and electronics retrofitting for Tyrrhenian refit shipyards.",
      description: "Naval engineering and marine automation hub located in the Port of Genoa.",
      mediaUrl: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1600&q=80",
      ctaLabel: "EXPLORE SHOWROOM",
      ctaHref: "/companies/mediterranean-marine-systems",
      featuredOfferingName: "Ligurian Dockside Technical Spares",
      featuredOfferingType: "PRODUCT",
    },
    publishedAt: "2026-01-11T10:00:00.000Z",
    approvedAt: "2026-01-11T09:00:00.000Z",
    submittedAt: "2026-01-11T08:00:00.000Z",
    createdAt: "2026-01-11T08:00:00.000Z",
    updatedAt: "2026-01-11T10:00:00.000Z",
  },
  {
    revisionId: "rev-seed-blueharbour-noe",
    propertyId: "prop-slot-lm-supplychain-northern_europe",
    slotId: "slot-lm-supplychain-northern_europe",
    companyId: "blueharbour",
    businessId: "biz-blueharbour",
    cityId: "supplychain",
    regionCode: "NORTHERN_EUROPE",
    tier: "LANDMARK",
    version: 1,
    status: "PUBLISHED",
    creative: {
      headline: "Northern European Deepwater Logistics & Autonomous Spares Network",
      subheadline: "Next-day spare parts delivery to major North Sea ports, offshore rigs, and Nordic refit yards.",
      description: "Heavy logistics coordination and spare parts distribution hub in Rotterdam.",
      mediaUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1600&q=80",
      ctaLabel: "EXPLORE NETWORK",
      ctaHref: "/companies/blueharbour-shipyards",
      featuredOfferingName: "North Sea Autonomous Spares Delivery",
      featuredOfferingType: "SERVICE",
    },
    publishedAt: "2026-01-12T10:00:00.000Z",
    approvedAt: "2026-01-12T09:00:00.000Z",
    submittedAt: "2026-01-12T08:00:00.000Z",
    createdAt: "2026-01-12T08:00:00.000Z",
    updatedAt: "2026-01-12T10:00:00.000Z",
  },
  {
    revisionId: "rev-seed-anothermarine-noa",
    propertyId: "prop-slot-fs-supplychain-north_america-1",
    slotId: "slot-fs-supplychain-north_america-1",
    companyId: "north-atlantic",
    businessId: "biz-northatlantic",
    cityId: "supplychain",
    regionCode: "NORTH_AMERICA",
    tier: "FLAGSHIP",
    version: 1,
    status: "PUBLISHED",
    creative: {
      headline: "Atlantic Marine Sourcing & Intermodal Cargo Gateway",
      subheadline: "Comprehensive supply chain coordination for Florida superyacht marinas and Gulf Coast workboat fleets.",
      description: "Intermodal marine parts distribution and technical fleet supply.",
      mediaUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80",
      ctaLabel: "EXPLORE SHOWROOM",
      ctaHref: "/companies/north-atlantic-marine",
      featuredOfferingName: "Atlantic Intermodal Marine Supply",
      featuredOfferingType: "PRODUCT",
    },
    publishedAt: "2026-01-15T10:00:00.000Z",
    approvedAt: "2026-01-15T09:00:00.000Z",
    submittedAt: "2026-01-15T08:00:00.000Z",
    createdAt: "2026-01-15T08:00:00.000Z",
    updatedAt: "2026-01-15T10:00:00.000Z",
  },

  // Brokerage City
  {
    revisionId: "rev-seed-argento-brokerage-med",
    propertyId: "prop-slot-lm-brokerage-mediterranean",
    slotId: "slot-lm-brokerage-mediterranean",
    companyId: "argento",
    businessId: "biz-argento",
    cityId: "brokerage",
    regionCode: "MEDITERRANEAN",
    tier: "LANDMARK",
    version: 1,
    status: "PUBLISHED",
    creative: {
      headline: "Mediterranean Yacht Brokerage, Vessel Acquisitions & Charter Berth Access",
      subheadline: "Direct commercial brokerage advisory across 24 Riviera ports with verified title assurance.",
      description: "Central commercial brokerage and charter management anchor for the Mediterranean basin.",
      mediaUrl: "https://images.unsplash.com/photo-1569263979104-865ab7cd8d17?auto=format&fit=crop&w=1600&q=80",
      ctaLabel: "EXPLORE BROKERAGE DESK",
      ctaHref: "/companies/argento-marine",
      featuredOfferingName: "Riviera Commercial Vessel Brokerage",
      featuredOfferingType: "SERVICE",
    },
    publishedAt: "2026-01-10T10:00:00.000Z",
    approvedAt: "2026-01-10T09:00:00.000Z",
    submittedAt: "2026-01-10T08:00:00.000Z",
    createdAt: "2026-01-10T08:00:00.000Z",
    updatedAt: "2026-01-10T10:00:00.000Z",
  },
  {
    revisionId: "rev-seed-crest-brokerage-weu",
    propertyId: "prop-slot-fs-brokerage-western_europe-1",
    slotId: "slot-fs-brokerage-western_europe-1",
    companyId: "crest-group-materials",
    businessId: "biz-crest",
    cityId: "brokerage",
    regionCode: "WESTERN_EUROPE",
    tier: "FLAGSHIP",
    version: 1,
    status: "PUBLISHED",
    creative: {
      headline: "Advanced Composite Specifications & Commercial Sourcing Hub",
      subheadline: "DNV-GL certified composite solutions and technical materials for commercial brokerage surveys.",
      description: "UK-based composite solutions and commercial vessel refit coatings.",
      mediaUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80",
      ctaLabel: "EXPLORE SHOWROOM",
      ctaHref: "/companies/crest-group-materials",
      featuredOfferingName: "CrestCoat-900 High-Gloss Gelcoat",
      featuredOfferingType: "PRODUCT",
    },
    publishedAt: "2026-01-11T10:00:00.000Z",
    approvedAt: "2026-01-11T09:00:00.000Z",
    submittedAt: "2026-01-11T08:00:00.000Z",
    createdAt: "2026-01-11T08:00:00.000Z",
    updatedAt: "2026-01-11T10:00:00.000Z",
  },

  // MarineCommerce / General Sector City
  {
    revisionId: "rev-seed-argento-mc-med",
    propertyId: "prop-slot-lm-marinecommerce-mediterranean",
    slotId: "slot-lm-marinecommerce-mediterranean",
    companyId: "argento",
    businessId: "biz-argento",
    cityId: "marinecommerce",
    regionCode: "MEDITERRANEAN",
    tier: "LANDMARK",
    version: 1,
    status: "PUBLISHED",
    creative: {
      headline: "Mediterranean Commercial Logistics & Superyacht Fleet Operations",
      subheadline: "Integrated vessel support, customs clearance, and bunkering operations across premier Mediterranean ports.",
      description: "Central commercial anchor property for Mediterranean maritime trade and fleet operations.",
      mediaUrl: "https://images.unsplash.com/photo-1569263979104-865ab7cd8d17?auto=format&fit=crop&w=1600&q=80",
      ctaLabel: "EXPLORE SHOWROOM",
      ctaHref: "/companies/argento-marine",
      featuredOfferingName: "Riviera Express Vessel Provisioning",
      featuredOfferingType: "SERVICE",
    },
    publishedAt: "2026-01-10T10:00:00.000Z",
    approvedAt: "2026-01-10T09:00:00.000Z",
    submittedAt: "2026-01-10T08:00:00.000Z",
    createdAt: "2026-01-10T08:00:00.000Z",
    updatedAt: "2026-01-10T10:00:00.000Z",
  },
  {
    revisionId: "rev-seed-blueharbour-mc-noe",
    propertyId: "prop-slot-lm-marinecommerce-northern_europe",
    slotId: "slot-lm-marinecommerce-northern_europe",
    companyId: "blueharbour",
    businessId: "biz-blueharbour",
    cityId: "marinecommerce",
    regionCode: "NORTHERN_EUROPE",
    tier: "LANDMARK",
    version: 1,
    status: "PUBLISHED",
    creative: {
      headline: "North Sea Deepwater Logistics & Autonomous Spares Network",
      subheadline: "Rotterdam deepwater logistics hub coordinating next-day component supply to major North Sea ports.",
      description: "Primary digital headquarters for Northern European deepwater maritime operations.",
      mediaUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1600&q=80",
      ctaLabel: "EXPLORE SHOWROOM",
      ctaHref: "/companies/blueharbour-shipyards",
      featuredOfferingName: "North Sea Autonomous Spares Delivery",
      featuredOfferingType: "SERVICE",
    },
    publishedAt: "2026-01-12T10:00:00.000Z",
    approvedAt: "2026-01-12T09:00:00.000Z",
    submittedAt: "2026-01-12T08:00:00.000Z",
    createdAt: "2026-01-12T08:00:00.000Z",
    updatedAt: "2026-01-12T10:00:00.000Z",
  },
];

// Memory store for revisions
const revisionsStore = new Map<string, PropertyCreativeRevision>(
  initialRevisions.map(r => [r.revisionId, r])
);
const activePublications = new Map<string, PropertyCreativeRevision>(
  initialRevisions.map(r => [getSlotKey(r.cityId, r.regionCode, r.slotId), r])
);

export function getCompanyRevisions(companyId: string): PropertyCreativeRevision[] {
  return Array.from(revisionsStore.values()).filter(r => r.companyId === companyId);
}

export function getAllRevisionsForGovernance(): PropertyCreativeRevision[] {
  return Array.from(revisionsStore.values());
}

export function getRevision(revisionId: string): PropertyCreativeRevision | undefined {
  return revisionsStore.get(revisionId);
}

export function getActivePublications(): PropertyCreativeRevision[] {
  return Array.from(activePublications.values());
}

export function getCompanyDraftOrActive(
  companyId: string, 
  slotId: string,
  cityId?: string,
  regionCode?: string
): PropertyCreativeRevision | undefined {
  const all = getCompanyRevisions(companyId).filter(r => {
    if (r.slotId !== slotId) return false;
    if (cityId && r.cityId && r.cityId.toLowerCase() !== cityId.toLowerCase()) return false;
    if (regionCode && r.regionCode && r.regionCode.toUpperCase() !== regionCode.toUpperCase()) return false;
    return true;
  });
  if (all.length === 0) return undefined;
  
  // Return the latest one by updatedAt
  return all.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
}

export function saveDraft(
  companyId: string, 
  businessId: string,
  slotId: string, 
  cityId: string, 
  regionCode: string, 
  tier: string, 
  creative: CreativeData
): PropertyCreativeRevision {
  const slotKey = getSlotKey(cityId, regionCode, slotId);
  
  // 1. Slot collision protection against existing publications
  const publishedRev = activePublications.get(slotKey);
  if (publishedRev && publishedRev.companyId !== companyId) {
    throw new Error(`Domain Error: Slot ${slotId} in ${cityId} (${regionCode}) is already occupied by company ${publishedRev.companyId}. Slot collision rejected.`);
  }

  // 2. Slot collision protection against in-flight reservations
  const activeReservation = Array.from(revisionsStore.values()).find(
    (r) => (r.cityId || "").toLowerCase() === cityId.toLowerCase() &&
           (r.regionCode || "GLOBAL").toUpperCase() === regionCode.toUpperCase() &&
           (r.slotId || "").toLowerCase() === slotId.toLowerCase() &&
           r.companyId !== companyId &&
           (r.status === "SUBMITTED" || r.status === "IN_REVIEW" || r.status === "APPROVED" || r.status === "PUBLISHED")
  );
  if (activeReservation) {
    throw new Error(`Domain Error: Slot ${slotId} in ${cityId} (${regionCode}) is currently reserved by company ${activeReservation.companyId}. Slot collision rejected.`);
  }

  const existing = getCompanyDraftOrActive(companyId, slotId, cityId, regionCode);
  
  if (existing && existing.status !== "DRAFT" && existing.status !== "REVISION_REQUIRED") {
    throw new Error(`Domain Error: Cannot mutate property creative in state ${existing.status}`);
  }

  const now = new Date().toISOString();
  const currentAuth = getCurrentAuthUser();
  
  let revision: PropertyCreativeRevision;
  
  if (existing && (existing.status === "DRAFT" || existing.status === "REVISION_REQUIRED")) {
    revision = {
      ...existing,
      creative,
      status: "DRAFT",
      updatedAt: now,
    };
  } else {
    // Create new revision for this unique property slot
    const version = existing ? existing.version + 1 : 1;
    revision = {
      revisionId: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      propertyId: `prop-${slotId}`,
      slotId,
      companyId,
      businessId,
      cityId,
      regionCode,
      tier,
      version,
      status: "DRAFT",
      creative,
      createdAt: now,
      updatedAt: now,
    };
  }
  
  revisionsStore.set(revision.revisionId, revision);
  
  recordGovernanceAudit(
    currentAuth.uid!,
    companyId,
    businessId,
    "MEMBER",
    "PROPERTY_DRAFT_SAVED" as any,
    slotId,
    `Saved draft for property ${slotId}`
  );
  
  return revision;
}

export function submitForReview(
  companyId: string, 
  slotId: string,
  cityId?: string,
  regionCode?: string
): { success: boolean; error?: string; revision?: PropertyCreativeRevision } {
  const existing = getCompanyDraftOrActive(companyId, slotId, cityId, regionCode);
  if (!existing || existing.status !== "DRAFT") {
    return { success: false, error: "Only DRAFT can be submitted." };
  }

  // Canonical Company Identity Completeness Gate
  const company = getCompanyRecordSync(companyId);
  if (company) {
    const isMissingName = !company.displayName && !company.legalName;
    const isMissingGeo = !company.country || !company.city;
    const isMissingIndustry = !company.sectorId && !(company as any).industry && !(company as any).industryDomainIds?.length;
    const isMissingDesc = !company.description && !company.shortDescription;
    
    if (isMissingName || isMissingGeo || isMissingIndustry || isMissingDesc) {
      return {
        success: false,
        error: "Your digital properties use your canonical company identity. Complete the missing company information before this property can be submitted.",
      };
    }
  }
  
  const now = new Date().toISOString();
  const currentAuth = getCurrentAuthUser();
  
  const updated: PropertyCreativeRevision = {
    ...existing,
    status: "SUBMITTED",
    submittedAt: now,
    submittedBy: currentAuth.uid,
    updatedAt: now,
  };
  
  revisionsStore.set(updated.revisionId, updated);
  
  recordGovernanceAudit(
    currentAuth.uid!,
    companyId,
    updated.businessId,
    "MEMBER",
    "PROPERTY_SUBMITTED" as any,
    slotId,
    `Submitted property ${slotId} for review`
  );
  
  return { success: true, revision: updated };
}

export function reviewProperty(
  revisionId: string, 
  action: "APPROVE" | "REJECT" | "REQUEST_REVISION" | "PAUSE" | "PUBLISH", 
  notes?: string
): { success: boolean; error?: string; revision?: PropertyCreativeRevision } {
  const revision = revisionsStore.get(revisionId);
  if (!revision) {
    return { success: false, error: "Revision not found." };
  }
  
  const now = new Date().toISOString();
  const currentAuth = getCurrentAuthUser();
  
  let newStatus: PropertyCreativeStatus = revision.status;
  
  const updated: PropertyCreativeRevision = {
    ...revision,
    reviewedAt: now,
    reviewedBy: currentAuth.uid,
    reviewNotes: notes || revision.reviewNotes,
    updatedAt: now,
  };

  if (action === "APPROVE") {
    newStatus = "APPROVED";
    updated.approvedAt = now;
  }
  else if (action === "REJECT") {
    newStatus = "REJECTED";
  }
  else if (action === "REQUEST_REVISION") {
    newStatus = "REVISION_REQUIRED";
  }
  else if (action === "PAUSE" && revision.status === "PUBLISHED") {
    newStatus = "PAUSED";
  }
  else if (action === "PUBLISH" && (revision.status === "APPROVED" || revision.status === "PAUSED")) {
    const slotKey = getSlotKey(revision.cityId, revision.regionCode, revision.slotId);
    const existingPub = activePublications.get(slotKey);
    if (existingPub && existingPub.companyId !== revision.companyId && existingPub.revisionId !== revision.revisionId) {
      return {
        success: false,
        error: `Slot collision: Slot ${revision.slotId} in ${revision.cityId} (${revision.regionCode}) is already occupied by company ${existingPub.companyId}.`,
      };
    }
    newStatus = "PUBLISHED";
    updated.publishedAt = now;
  }
  else {
    return { success: false, error: `Invalid state transition from ${revision.status} via ${action}` };
  }
  
  updated.status = newStatus;

  revisionsStore.set(updated.revisionId, updated);
  
  const slotKey = getSlotKey(updated.cityId, updated.regionCode, updated.slotId);

  if (newStatus === "PUBLISHED") {
    activePublications.set(slotKey, updated);
  } else if (newStatus === "PAUSED" || newStatus === "REJECTED") {
    const active = activePublications.get(slotKey);
    if (active && active.revisionId === updated.revisionId) {
      activePublications.delete(slotKey);
    }
  }
  
  recordGovernanceAudit(
    currentAuth.uid!,
    updated.companyId, // Note: Governance acting on company
    updated.businessId,
    "GOVERNANCE_REVIEWER" as any,
    `PROPERTY_${action}` as any,
    updated.slotId,
    `Governance performed ${action} on property ${updated.slotId}. Notes: ${notes || "None"}`
  );
  
  return { success: true, revision: updated };
}

/**
 * Public Visibility Rule:
 * Commercial Agreement status === "ACTIVE" (or "PAYMENT_CONFIRMED") AND Governance status === "PUBLISHED"
 * evaluates to a Public Property.
 */
export function isPropertyPubliclyVisible(
  commercialStatus: string,
  governanceStatus: PropertyCreativeStatus | string
): boolean {
  const isCommercialActive = commercialStatus === "ACTIVE" || commercialStatus === "PAYMENT_CONFIRMED";
  const isGovernancePublished = governanceStatus === "PUBLISHED";
  return isCommercialActive && isGovernancePublished;
}
