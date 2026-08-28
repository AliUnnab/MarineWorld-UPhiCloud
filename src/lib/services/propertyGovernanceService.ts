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

import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  onSnapshot,
} from "firebase/firestore";

// Pure Firestore Revisions & Active Publications Cache
const revisionsStore = new Map<string, PropertyCreativeRevision>();
const activePublications = new Map<string, PropertyCreativeRevision>();
let isGovernanceSyncInitialized = false;

export function initPropertyGovernanceSync(): void {
  if (isGovernanceSyncInitialized || typeof window === "undefined") return;
  isGovernanceSyncInitialized = true;
  try {
    const colRef = collection(db, "propertyRevisions");
    onSnapshot(colRef, (snapshot) => {
      snapshot.docs.forEach((d) => {
        const item = { ...d.data(), revisionId: d.id } as PropertyCreativeRevision;
        revisionsStore.set(item.revisionId, item);
        if (item.status === "PUBLISHED") {
          activePublications.set(getSlotKey(item.cityId, item.regionCode, item.slotId), item);
        }
      });
    });
  } catch (err) {
    console.warn("[PropertyGovernanceService] Firestore sync error:", err);
  }
}

initPropertyGovernanceSync();

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

  try {
    const docRef = doc(db, "propertyRevisions", revision.revisionId);
    setDoc(docRef, revision, { merge: true }).catch((err) => {
      console.warn("[PropertyGovernanceService] Firestore revision save error:", err);
    });
  } catch (err) {
    console.warn("[PropertyGovernanceService] Firestore write error:", err);
  }
  
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

  try {
    const docRef = doc(db, "propertyRevisions", updated.revisionId);
    setDoc(docRef, updated, { merge: true }).catch((err) => {
      console.warn("[PropertyGovernanceService] Firestore submit error:", err);
    });
  } catch (err) {
    console.warn("[PropertyGovernanceService] Firestore write error:", err);
  }
  
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

  try {
    const docRef = doc(db, "propertyRevisions", updated.revisionId);
    setDoc(docRef, updated, { merge: true }).catch((err) => {
      console.warn("[PropertyGovernanceService] Firestore review error:", err);
    });
  } catch (err) {
    console.warn("[PropertyGovernanceService] Firestore write error:", err);
  }
  
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
