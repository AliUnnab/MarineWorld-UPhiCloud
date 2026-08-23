import type { Entitlement, CompanyCapability } from "@/lib/types";
import { getPersistenceMode } from "./persistenceMode";
import { getFirebaseApp } from "@/lib/auth/firebaseAuth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
} from "firebase/firestore";

/**
 * Phase 3.2 — Company Entitlements Repository
 * Persistence Layer for:
 * - /companies/{companyId}/entitlements/{entitlementId}
 */

const entitlementStore = new Map<string, Entitlement>();

export function buildEntitlementId(
  companyId: string,
  capability: CompanyCapability
): string {
  return `ent-${companyId.toLowerCase()}-${capability.toLowerCase()}`;
}

function buildKey(companyId: string, entitlementId: string): string {
  return `${companyId.toLowerCase()}:${entitlementId.toLowerCase()}`;
}

// Pre-seed default capabilities for Argento Marine (Growth Plan)
const argentoCaps: CompanyCapability[] = [
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
];

export function resetDefaultEntitlementsStore(): void {
  entitlementStore.clear();
  const now = new Date().toISOString();
  const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  for (const cap of argentoCaps) {
    const entId = buildEntitlementId("argento-marine", cap);
    const ent: Entitlement = {
      id: entId,
      companyId: "argento-marine",
      businessId: "MW-BUS-ARGENTO-MARITIME",
      capability: cap,
      grantedBySubscriptionId: "sub-argento-01",
      status: "ACTIVE",
      effectiveFrom: now,
      effectiveUntil: future,
      createdAt: now,
      updatedAt: now,
    };
    entitlementStore.set(buildKey("argento-marine", entId), ent);
  }
}

// Initialize default store
resetDefaultEntitlementsStore();

export function getInMemoryEntitlements(companyId: string): Entitlement[] {
  const normComp = companyId.toLowerCase();
  const result: Entitlement[] = [];
  for (const [key, ent] of entitlementStore.entries()) {
    if (key.startsWith(`${normComp}:`)) {
      result.push({ ...ent });
    }
  }
  return result;
}

export function getInMemoryEntitlement(
  companyId: string,
  capability: CompanyCapability
): Entitlement | undefined {
  const entId = buildEntitlementId(companyId, capability);
  const key = buildKey(companyId, entId);
  const ent = entitlementStore.get(key);
  return ent ? { ...ent } : undefined;
}

export function saveInMemoryEntitlement(entitlement: Entitlement): Entitlement {
  const key = buildKey(entitlement.companyId, entitlement.id);
  entitlementStore.set(key, { ...entitlement });
  return entitlement;
}

export function clearInMemoryEntitlements(companyId?: string): void {
  if (!companyId) {
    entitlementStore.clear();
    return;
  }
  const normComp = companyId.toLowerCase();
  for (const key of Array.from(entitlementStore.keys())) {
    if (key.startsWith(`${normComp}:`)) {
      entitlementStore.delete(key);
    }
  }
}

/**
 * Get entitlement for a company and capability
 */
export async function getEntitlement(
  companyId: string,
  capability: CompanyCapability
): Promise<Entitlement | null> {
  if (!companyId || !capability) return null;
  const entId = buildEntitlementId(companyId, capability);
  const key = buildKey(companyId, entId);

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const snap = await getDoc(
        doc(db, "companies", companyId, "entitlements", entId)
      );
      if (snap.exists()) {
        const data = snap.data() as Entitlement;
        entitlementStore.set(key, data);
        return data;
      }
      return entitlementStore.get(key) || null;
    } catch (err) {
      return entitlementStore.get(key) || null;
    }
  }

  return entitlementStore.get(key) || null;
}

/**
 * List all entitlements for a company
 */
export async function listEntitlements(companyId: string): Promise<Entitlement[]> {
  if (!companyId) return [];
  const normComp = companyId.toLowerCase();

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const entCol = collection(db, "companies", companyId, "entitlements");
      const snap = await getDocs(entCol);
      const results: Entitlement[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as Entitlement;
        results.push(data);
        entitlementStore.set(buildKey(companyId, data.id), data);
      });
      if (results.length > 0) return results;
    } catch (err) {
      // Fallback to in-memory
    }
  }

  return getInMemoryEntitlements(normComp);
}

/**
 * Save / persist an entitlement document
 */
export async function saveEntitlement(entitlement: Entitlement): Promise<Entitlement> {
  const key = buildKey(entitlement.companyId, entitlement.id);
  const now = new Date().toISOString();
  const updatedEntitlement: Entitlement = {
    ...entitlement,
    createdAt: entitlement.createdAt || now,
    updatedAt: now,
  };

  entitlementStore.set(key, { ...updatedEntitlement });

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      await setDoc(
        doc(
          db,
          "companies",
          updatedEntitlement.companyId,
          "entitlements",
          updatedEntitlement.id
        ),
        updatedEntitlement,
        { merge: true }
      );
    } catch (err) {
      console.warn("[EntitlementRepo] Firestore saveEntitlement fallback:", err);
    }
  }

  return updatedEntitlement;
}

/**
 * Revoke an entitlement for a company and capability
 */
export async function revokeEntitlement(
  companyId: string,
  capability: CompanyCapability
): Promise<boolean> {
  const entId = buildEntitlementId(companyId, capability);
  const existing = await getEntitlement(companyId, capability);
  if (!existing) return false;

  const revoked: Entitlement = {
    ...existing,
    status: "REVOKED",
    updatedAt: new Date().toISOString(),
  };

  await saveEntitlement(revoked);
  return true;
}

/**
 * Clear or mark revoked all entitlements for a company
 */
export async function clearCompanyEntitlements(companyId: string): Promise<void> {
  const current = await listEntitlements(companyId);
  for (const ent of current) {
    if (ent.status === "ACTIVE") {
      await saveEntitlement({
        ...ent,
        status: "REVOKED",
        updatedAt: new Date().toISOString(),
      });
    }
  }
}
