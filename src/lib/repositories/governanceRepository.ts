import type {
  CompanyVerificationRecord,
  VerificationEvidence,
  OrganizationAuthority,
  VerificationMethod,
  CompanyVerificationStatus,
  AuthorityScope,
  CompanyMemberRole,
  PrincipalAuthorityStatus,
} from "@/lib/types";
import { getPersistenceMode } from "./persistenceMode";
import { getFirebaseApp } from "@/lib/auth/firebaseAuth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import {
  getCompanyRecordSync,
  saveCompanyRecordSync,
} from "./companyRepository";

/**
 * Phase 3.3 — Governance & Verification Persistence Layer
 *
 * Persists:
 * 1. Company Verification Document:
 *    /companies/{companyId}/governance/verification-main
 *
 * 2. Verification Evidence Subcollection:
 *    /companies/{companyId}/verificationEvidence/{evidenceId}
 *
 * 3. Authorities Subcollection:
 *    /companies/{companyId}/authorities/{authorityId}
 */

// In-Memory Storage Maps
const verificationMap = new Map<string, CompanyVerificationRecord>();
const evidenceMap = new Map<string, VerificationEvidence>();
const authorityMap = new Map<string, OrganizationAuthority[]>();
const domainVerificationMap = new Map<string, "UNVERIFIED" | "PENDING" | "VERIFIED" | "FAILED">();

export function generateGovernanceBusinessId(companyId: string): string {
  const norm = companyId.toLowerCase();
  if (norm === "argento-marine" || norm === "comp-argento-marine" || norm === "argento-maritime") {
    return "MW-BUS-ARGENTO-MARITIME";
  }
  const clean = companyId.toUpperCase().replace(/[^A-Z0-9]/g, "-");
  return `MW-BUS-${clean}`;
}

export function resetDefaultGovernanceStore(): void {
  verificationMap.clear();
  evidenceMap.clear();
  authorityMap.clear();
  domainVerificationMap.clear();

  const now = new Date("2026-01-10T10:00:00.000Z").toISOString();

  // 1. Default Verification Record for Argento Marine
  const defaultVerif: CompanyVerificationRecord = {
    id: "verification-main",
    companyId: "argento-marine",
    businessId: "MW-BUS-ARGENTO-MARITIME",
    status: "VERIFIED",
    method: "DOCUMENT_UPLOAD",
    submittedAt: now,
    reviewedAt: now,
    reviewedBy: "sys-admin-01",
    rejectionReason: null,
    createdAt: now,
    updatedAt: now,
  };
  verificationMap.set("argento-marine", defaultVerif);

  // 2. Default Evidence for Argento Marine
  const defaultEvidence: VerificationEvidence = {
    id: "evid-argento-01",
    companyId: "argento-marine",
    businessId: "MW-BUS-ARGENTO-MARITIME",
    verificationId: "verification-main",
    verificationType: "DOCUMENT_UPLOAD",
    status: "APPROVED",
    submittedBy: "usr-argento-owner",
    reviewedBy: "sys-admin-01",
    reviewer: "sys-admin-01",
    submittedAt: now,
    reviewedAt: now,
    evidenceReference: "doc-ref-argento-vat-cert",
    rejectionReason: null,
    createdAt: now,
    updatedAt: now,
  };
  evidenceMap.set("evid-argento-01", defaultEvidence);

  // 3. Default Principal Authority for Argento Marine Owner
  const defaultAuthority: OrganizationAuthority = {
    id: "auth-argento-marine-usr-argento-owner",
    companyId: "argento-marine",
    businessId: "MW-BUS-ARGENTO-MARITIME",
    userId: "usr-argento-owner",
    role: "OWNER",
    authorityState: "ACTIVE",
    scopes: ["COMPANY_PROFILE", "PRODUCTS", "SERVICES", "COMMERCIAL", "DOCUMENTS", "AI", "GOVERNANCE", "BILLING", "ALL"],
    authorityScope: ["COMPANY_PROFILE", "PRODUCTS", "SERVICES", "COMMERCIAL", "DOCUMENTS", "AI", "GOVERNANCE", "BILLING", "ALL"],
    verificationState: "VERIFIED",
    grantedBy: "sys-admin-01",
    grantedAt: now,
    expiresAt: null,
    revokedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  authorityMap.set("argento-marine", [defaultAuthority]);

  // 4. Default Domain Verification
  domainVerificationMap.set("argento-marine:argento-marine.com", "VERIFIED");

  // Sync CompanyEntity.verificationStatus for Argento Marine
  const comp = getCompanyRecordSync("argento-marine");
  if (comp) {
    comp.verificationStatus = "VERIFIED";
    saveCompanyRecordSync(comp);
  }
}

// Pre-seed default store
resetDefaultGovernanceStore();

export function clearInMemoryGovernanceStore(companyId?: string): void {
  if (!companyId) {
    verificationMap.clear();
    evidenceMap.clear();
    authorityMap.clear();
    domainVerificationMap.clear();
    return;
  }
  const norm = companyId.toLowerCase();
  verificationMap.delete(norm);
  authorityMap.delete(norm);

  for (const [id, ev] of evidenceMap.entries()) {
    if (ev.companyId?.toLowerCase() === norm) {
      evidenceMap.delete(id);
    }
  }
  for (const [key] of domainVerificationMap.entries()) {
    if (key.startsWith(`${norm}:`)) {
      domainVerificationMap.delete(key);
    }
  }
}

// Synchronous In-Memory Accessors
export function getInMemoryVerification(companyId: string): CompanyVerificationRecord | undefined {
  if (!companyId) return undefined;
  return verificationMap.get(companyId.toLowerCase());
}

export function saveInMemoryVerification(record: CompanyVerificationRecord): CompanyVerificationRecord {
  const norm = record.companyId.toLowerCase();
  verificationMap.set(norm, { ...record });

  // Sync CompanyEntity.verificationStatus
  const comp = getCompanyRecordSync(record.companyId);
  if (comp) {
    comp.verificationStatus = record.status;
    saveCompanyRecordSync(comp);
  }
  return record;
}

export function getInMemoryEvidence(evidenceId: string): VerificationEvidence | undefined {
  return evidenceMap.get(evidenceId);
}

export function listInMemoryEvidence(companyId: string): VerificationEvidence[] {
  const norm = companyId.toLowerCase();
  const list: VerificationEvidence[] = [];
  for (const ev of evidenceMap.values()) {
    if (ev.companyId?.toLowerCase() === norm) {
      list.push({ ...ev });
    }
  }
  return list;
}

export function saveInMemoryEvidence(evidence: VerificationEvidence): VerificationEvidence {
  evidenceMap.set(evidence.id, { ...evidence });
  return evidence;
}

export function getInMemoryAuthority(companyId: string, userId: string): OrganizationAuthority | undefined {
  const list = authorityMap.get(companyId.toLowerCase()) || [];
  return list.find((a) => a.userId === userId || a.id === userId);
}

export function listInMemoryAuthorities(companyId: string): OrganizationAuthority[] {
  return (authorityMap.get(companyId.toLowerCase()) || []).map((a) => ({ ...a }));
}

export function saveInMemoryAuthority(authority: OrganizationAuthority): OrganizationAuthority {
  const norm = authority.companyId.toLowerCase();
  const existing = authorityMap.get(norm) || [];
  const idx = existing.findIndex((a) => a.id === authority.id || a.userId === authority.userId);
  if (idx >= 0) {
    existing[idx] = { ...authority };
  } else {
    existing.push({ ...authority });
  }
  authorityMap.set(norm, existing);
  return authority;
}

export function getInMemoryDomainVerification(companyId: string, domainName: string): "UNVERIFIED" | "PENDING" | "VERIFIED" | "FAILED" {
  const key = `${companyId.toLowerCase()}:${domainName.toLowerCase()}`;
  return domainVerificationMap.get(key) || "UNVERIFIED";
}

export function setInMemoryDomainVerification(companyId: string, domainName: string, state: "UNVERIFIED" | "PENDING" | "VERIFIED" | "FAILED"): void {
  const key = `${companyId.toLowerCase()}:${domainName.toLowerCase()}`;
  domainVerificationMap.set(key, state);
}

// Async Repository API (Firestore + In-Memory Fallback)

/**
 * Retrieve company verification record.
 * Firestore document path: /companies/{companyId}/governance/verification-main
 */
export async function getCompanyVerification(companyId: string): Promise<CompanyVerificationRecord | null> {
  if (!companyId) return null;
  const norm = companyId.toLowerCase();

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const snap = await getDoc(
        doc(db, "companies", companyId, "governance", "verification-main")
      );
      if (snap.exists()) {
        const data = snap.data() as CompanyVerificationRecord;
        verificationMap.set(norm, data);
        // Sync CompanyEntity.verificationStatus
        const comp = getCompanyRecordSync(companyId);
        if (comp) {
          comp.verificationStatus = data.status;
          saveCompanyRecordSync(comp);
        }
        return data;
      }
    } catch (err) {
      console.warn("[GovernanceRepo] Firestore getCompanyVerification fallback:", err);
    }
  }

  return getInMemoryVerification(norm) || null;
}

/**
 * Save company verification record.
 * Firestore document path: /companies/{companyId}/governance/verification-main
 * Atomically updates CompanyEntity.verificationStatus.
 */
export async function saveVerification(record: CompanyVerificationRecord): Promise<CompanyVerificationRecord> {
  const now = new Date().toISOString();
  const updated: CompanyVerificationRecord = {
    ...record,
    updatedAt: now,
    createdAt: record.createdAt || now,
  };

  saveInMemoryVerification(updated);

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      await setDoc(
        doc(db, "companies", updated.companyId, "governance", "verification-main"),
        updated,
        { merge: true }
      );
    } catch (err) {
      console.warn("[GovernanceRepo] Firestore saveVerification fallback:", err);
    }
  }

  return updated;
}

/**
 * Submit verification evidence and update verification document to PENDING.
 */
export async function submitVerification(
  companyId: string,
  method: VerificationMethod,
  evidenceReference: string,
  submittedBy: string
): Promise<{ verificationRecord: CompanyVerificationRecord; evidence: VerificationEvidence }> {
  const now = new Date().toISOString();
  const businessId = generateGovernanceBusinessId(companyId);
  const evidenceId = `evid-${companyId.toLowerCase()}-${Date.now()}`;

  const evidence: VerificationEvidence = {
    id: evidenceId,
    companyId,
    businessId,
    verificationId: "verification-main",
    verificationType: method,
    status: "SUBMITTED",
    submittedBy,
    reviewedBy: null,
    reviewer: null,
    submittedAt: now,
    reviewedAt: null,
    evidenceReference,
    rejectionReason: null,
    createdAt: now,
    updatedAt: now,
  };

  await saveEvidence(evidence);

  const existingRec = await getCompanyVerification(companyId);
  const rec: CompanyVerificationRecord = {
    id: "verification-main",
    companyId,
    businessId,
    status: "PENDING",
    method,
    submittedAt: now,
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    createdAt: existingRec?.createdAt || now,
    updatedAt: now,
  };

  const savedRec = await saveVerification(rec);

  return { verificationRecord: savedRec, evidence };
}

/**
 * Approve company verification (Server/Compliance only).
 * Sets status = VERIFIED, updates evidence status to APPROVED.
 */
export async function approveVerification(
  companyId: string,
  reviewerId: string
): Promise<CompanyVerificationRecord> {
  const now = new Date().toISOString();
  const businessId = generateGovernanceBusinessId(companyId);
  const existingRec = await getCompanyVerification(companyId);

  const rec: CompanyVerificationRecord = {
    id: "verification-main",
    companyId,
    businessId,
    status: "VERIFIED",
    method: existingRec?.method || "DOCUMENT_UPLOAD",
    submittedAt: existingRec?.submittedAt || now,
    reviewedAt: now,
    reviewedBy: reviewerId,
    rejectionReason: null,
    createdAt: existingRec?.createdAt || now,
    updatedAt: now,
  };

  const savedRec = await saveVerification(rec);

  // Update most recent evidence
  const evidences = await listEvidence(companyId);
  if (evidences.length > 0) {
    const latest = evidences[evidences.length - 1];
    latest.status = "APPROVED";
    latest.reviewedBy = reviewerId;
    latest.reviewer = reviewerId;
    latest.reviewedAt = now;
    latest.updatedAt = now;
    await saveEvidence(latest);
  }

  return savedRec;
}

/**
 * Reject company verification (Server/Compliance only).
 * Sets status = REJECTED, updates evidence status to REJECTED.
 */
export async function rejectVerification(
  companyId: string,
  reviewerId: string,
  rejectionReason?: string
): Promise<CompanyVerificationRecord> {
  const now = new Date().toISOString();
  const businessId = generateGovernanceBusinessId(companyId);
  const existingRec = await getCompanyVerification(companyId);

  const reason = rejectionReason || "Verification failed requirements";

  const rec: CompanyVerificationRecord = {
    id: "verification-main",
    companyId,
    businessId,
    status: "REJECTED",
    method: existingRec?.method || "DOCUMENT_UPLOAD",
    submittedAt: existingRec?.submittedAt || now,
    reviewedAt: now,
    reviewedBy: reviewerId,
    rejectionReason: reason,
    createdAt: existingRec?.createdAt || now,
    updatedAt: now,
  };

  const savedRec = await saveVerification(rec);

  const evidences = await listEvidence(companyId);
  if (evidences.length > 0) {
    const latest = evidences[evidences.length - 1];
    latest.status = "REJECTED";
    latest.rejectionReason = reason;
    latest.reviewedBy = reviewerId;
    latest.reviewer = reviewerId;
    latest.reviewedAt = now;
    latest.updatedAt = now;
    await saveEvidence(latest);
  }

  return savedRec;
}

/**
 * Suspend company verification (Server/Compliance only).
 * Sets status = SUSPENDED.
 */
export async function suspendVerification(
  companyId: string,
  reviewerId: string,
  reason?: string
): Promise<CompanyVerificationRecord> {
  const now = new Date().toISOString();
  const businessId = generateGovernanceBusinessId(companyId);
  const existingRec = await getCompanyVerification(companyId);

  const suspendReason = reason || "Company verification suspended due to compliance review";

  const rec: CompanyVerificationRecord = {
    id: "verification-main",
    companyId,
    businessId,
    status: "SUSPENDED",
    method: existingRec?.method || "DOCUMENT_UPLOAD",
    submittedAt: existingRec?.submittedAt || now,
    reviewedAt: now,
    reviewedBy: reviewerId,
    rejectionReason: suspendReason,
    createdAt: existingRec?.createdAt || now,
    updatedAt: now,
  };

  return await saveVerification(rec);
}

/**
 * Get single evidence document.
 * Firestore document path: /companies/{companyId}/verificationEvidence/{evidenceId}
 */
export async function getEvidence(
  companyId: string,
  evidenceId: string
): Promise<VerificationEvidence | null> {
  if (!companyId || !evidenceId) return null;

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const snap = await getDoc(
        doc(db, "companies", companyId, "verificationEvidence", evidenceId)
      );
      if (snap.exists()) {
        const data = snap.data() as VerificationEvidence;
        saveInMemoryEvidence(data);
        return data;
      }
    } catch (err) {
      console.warn("[GovernanceRepo] Firestore getEvidence fallback:", err);
    }
  }

  return getInMemoryEvidence(evidenceId) || null;
}

/**
 * List all evidence for a company.
 * Firestore subcollection: /companies/{companyId}/verificationEvidence
 */
export async function listEvidence(companyId: string): Promise<VerificationEvidence[]> {
  if (!companyId) return [];

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const evCol = collection(db, "companies", companyId, "verificationEvidence");
      const snap = await getDocs(evCol);
      const results: VerificationEvidence[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as VerificationEvidence;
        results.push(data);
        saveInMemoryEvidence(data);
      });
      if (results.length > 0) return results;
    } catch (err) {
      console.warn("[GovernanceRepo] Firestore listEvidence fallback:", err);
    }
  }

  return listInMemoryEvidence(companyId);
}

/**
 * Save evidence document.
 * Firestore document path: /companies/{companyId}/verificationEvidence/{evidence.id}
 */
export async function saveEvidence(evidence: VerificationEvidence): Promise<VerificationEvidence> {
  const now = new Date().toISOString();
  const updated: VerificationEvidence = {
    ...evidence,
    createdAt: evidence.createdAt || now,
    updatedAt: now,
  };

  saveInMemoryEvidence(updated);

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      await setDoc(
        doc(db, "companies", updated.companyId, "verificationEvidence", updated.id),
        updated,
        { merge: true }
      );
    } catch (err) {
      console.warn("[GovernanceRepo] Firestore saveEvidence fallback:", err);
    }
  }

  return updated;
}

/**
 * Get authority document for user / company.
 * Firestore subcollection: /companies/{companyId}/authorities
 */
export async function getAuthority(
  companyId: string,
  authorityIdOrUserId: string
): Promise<OrganizationAuthority | null> {
  if (!companyId || !authorityIdOrUserId) return null;

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const snap = await getDoc(
        doc(db, "companies", companyId, "authorities", authorityIdOrUserId)
      );
      if (snap.exists()) {
        const data = snap.data() as OrganizationAuthority;
        saveInMemoryAuthority(data);
        return data;
      }
    } catch (err) {
      console.warn("[GovernanceRepo] Firestore getAuthority fallback:", err);
    }
  }

  return getInMemoryAuthority(companyId, authorityIdOrUserId) || null;
}

/**
 * List all authorities for a company.
 * Firestore subcollection: /companies/{companyId}/authorities
 */
export async function listAuthorities(companyId: string): Promise<OrganizationAuthority[]> {
  if (!companyId) return [];

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const authCol = collection(db, "companies", companyId, "authorities");
      const snap = await getDocs(authCol);
      const results: OrganizationAuthority[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as OrganizationAuthority;
        results.push(data);
        saveInMemoryAuthority(data);
      });
      if (results.length > 0) return results;
    } catch (err) {
      console.warn("[GovernanceRepo] Firestore listAuthorities fallback:", err);
    }
  }

  return listInMemoryAuthorities(companyId);
}

/**
 * Save authority document.
 * Firestore document path: /companies/{companyId}/authorities/{authority.id}
 */
export async function saveAuthority(authority: OrganizationAuthority): Promise<OrganizationAuthority> {
  const now = new Date().toISOString();
  const updated: OrganizationAuthority = {
    ...authority,
    createdAt: authority.createdAt || now,
    updatedAt: now,
  };

  saveInMemoryAuthority(updated);

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      await setDoc(
        doc(db, "companies", updated.companyId, "authorities", updated.id),
        updated,
        { merge: true }
      );
    } catch (err) {
      console.warn("[GovernanceRepo] Firestore saveAuthority fallback:", err);
    }
  }

  return updated;
}

/**
 * Update authority fields.
 */
export async function updateAuthority(
  companyId: string,
  authorityId: string,
  updates: Partial<OrganizationAuthority>
): Promise<OrganizationAuthority | null> {
  const existing = await getAuthority(companyId, authorityId);
  if (!existing) return null;

  const updated: OrganizationAuthority = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return await saveAuthority(updated);
}
