import type { CompanyEntity, CompanyLifecycleStatus } from "@/lib/types";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

/**
 * Pure Firestore Company Repository
 * Data Access & Persistence Layer for /companies/{companyId}
 */

const COLLECTION_NAME = "companies";

// Internal runtime cache populated from Firestore (Zero hardcoded mock data)
const runtimeCompanyCache = new Map<string, CompanyEntity>();
let isListenerActive = false;

function initCompanyRealtimeCache() {
  if (isListenerActive || typeof window === "undefined") return;
  try {
    const colRef = collection(db, COLLECTION_NAME);
    onSnapshot(
      colRef,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const item = { id: change.doc.id, ...change.doc.data() } as CompanyEntity;
          if (change.type === "removed") {
            runtimeCompanyCache.delete(change.doc.id);
          } else {
            runtimeCompanyCache.set(change.doc.id, item);
            if (item.slug) runtimeCompanyCache.set(item.slug, item);
            if (item.businessId) runtimeCompanyCache.set(item.businessId, item);
          }
        });
      },
      (error) => {
        if (error.code === "permission-denied") {
          // Unauthenticated visitor: collection listener deferred until authenticated
          isListenerActive = false;
        } else {
          console.debug("[CompanyRepository] Realtime listener note:", error.message);
        }
      }
    );
    isListenerActive = true;
  } catch {
    // Offline or restricted environment fallback
  }
}

initCompanyRealtimeCache();

export function getInMemoryCompany(companyId: string): CompanyEntity | undefined {
  return runtimeCompanyCache.get(companyId);
}

export function saveInMemoryCompany(company: CompanyEntity): CompanyEntity {
  runtimeCompanyCache.set(company.id, company);
  if (company.slug) runtimeCompanyCache.set(company.slug, company);
  if (company.businessId) runtimeCompanyCache.set(company.businessId, company);
  return company;
}


export function getCompanyRecordSync(companyId: string): CompanyEntity | undefined {
  return runtimeCompanyCache.get(companyId);
}

export function findAllCompaniesSync(): CompanyEntity[] {
  return Array.from(new Set(runtimeCompanyCache.values()));
}

export async function getCompanyRecord(companyId: string): Promise<CompanyEntity | null> {
  if (!companyId) return null;
  const cached = runtimeCompanyCache.get(companyId);
  if (cached) return cached;

  try {
    const docRef = doc(db, COLLECTION_NAME, companyId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const company = { id: snap.id, ...snap.data() } as CompanyEntity;
      saveInMemoryCompany(company);
      return company;
    }

    // Try slug lookup
    const qSlug = query(collection(db, COLLECTION_NAME), where("slug", "==", companyId));
    const slugSnap = await getDocs(qSlug);
    if (!slugSnap.empty) {
      const docData = slugSnap.docs[0];
      const company = { id: docData.id, ...docData.data() } as CompanyEntity;
      saveInMemoryCompany(company);
      return company;
    }

    // Try businessId lookup
    const qBus = query(collection(db, COLLECTION_NAME), where("businessId", "==", companyId));
    const busSnap = await getDocs(qBus);
    if (!busSnap.empty) {
      const docData = busSnap.docs[0];
      const company = { id: docData.id, ...docData.data() } as CompanyEntity;
      saveInMemoryCompany(company);
      return company;
    }
  } catch (err) {
    console.warn(`[CompanyRepository] getCompanyRecord failed for ${companyId}:`, err);
  }

  return null;
}

export async function findAllCompanies(): Promise<CompanyEntity[]> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snap = await getDocs(colRef);
    const results: CompanyEntity[] = [];
    snap.forEach((d) => {
      const comp = { id: d.id, ...d.data() } as CompanyEntity;
      saveInMemoryCompany(comp);
      results.push(comp);
    });
    return results;
  } catch (err) {
    console.warn("[CompanyRepository] findAllCompanies failed:", err);
    return Array.from(new Set(runtimeCompanyCache.values()));
  }
}

export async function findCompanyByEmailOrName(
  email?: string,
  nameOrSlug?: string
): Promise<CompanyEntity | null> {
  const normEmail = email?.trim().toLowerCase();
  const normName = nameOrSlug?.trim().toLowerCase();

  // 1. In-memory check
  for (const comp of runtimeCompanyCache.values()) {
    const cEmail = (comp.email || comp.officialEmail || "").trim().toLowerCase();
    const cName = (comp.legalName || comp.displayName || "").trim().toLowerCase();
    const cSlug = (comp.slug || "").trim().toLowerCase();

    if (normEmail && cEmail === normEmail) return comp;
    if (normName && (cName === normName || cSlug === normName)) return comp;
  }

  // 2. Firestore check
  try {
    if (typeof window !== "undefined") {
      if (normEmail) {
        const qEmail = query(collection(db, COLLECTION_NAME), where("email", "==", normEmail));
        const snap = await getDocs(qEmail);
        if (!snap.empty) {
          const comp = { id: snap.docs[0].id, ...snap.docs[0].data() } as CompanyEntity;
          saveInMemoryCompany(comp);
          return comp;
        }

        const qOfficial = query(collection(db, COLLECTION_NAME), where("officialEmail", "==", normEmail));
        const snapOff = await getDocs(qOfficial);
        if (!snapOff.empty) {
          const comp = { id: snapOff.docs[0].id, ...snapOff.docs[0].data() } as CompanyEntity;
          saveInMemoryCompany(comp);
          return comp;
        }
      }

      if (normName) {
        const qSlug = query(collection(db, COLLECTION_NAME), where("slug", "==", normName));
        const snapSlug = await getDocs(qSlug);
        if (!snapSlug.empty) {
          const comp = { id: snapSlug.docs[0].id, ...snapSlug.docs[0].data() } as CompanyEntity;
          saveInMemoryCompany(comp);
          return comp;
        }
      }
    }
  } catch (e) {
    console.warn("[CompanyRepository] findCompanyByEmailOrName lookup error:", e);
  }

  return null;
}

export async function saveCompanyRecord(company: CompanyEntity): Promise<CompanyEntity> {
  const payload: CompanyEntity = {
    ...company,
    updatedAt: new Date().toISOString(),
    createdAt: company.createdAt || new Date().toISOString(),
  };

  saveInMemoryCompany(payload);

  try {
    const docRef = doc(db, COLLECTION_NAME, payload.id);
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    console.warn(`[CompanyRepository] saveCompanyRecord failed for ${payload.id}:`, err);
  }

  return payload;
}

export async function queryCompaniesBySectorCity(sectorCityId: string): Promise<CompanyEntity[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("sectorCityIds", "array-contains", sectorCityId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CompanyEntity));
  } catch (err) {
    console.warn(`[CompanyRepository] queryCompaniesBySectorCity failed for ${sectorCityId}:`, err);
    return Array.from(new Set(runtimeCompanyCache.values())).filter(
      (c) => c.sectorCityIds?.includes(sectorCityId) || c.primarySectorCityId === sectorCityId
    );
  }
}

export async function queryCompaniesByPresenceTier(tier: string): Promise<CompanyEntity[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), where("presenceTier", "==", tier));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CompanyEntity));
  } catch (err) {
    console.warn(`[CompanyRepository] queryCompaniesByPresenceTier failed for ${tier}:`, err);
    return Array.from(new Set(runtimeCompanyCache.values())).filter(
      (c) => c.presenceTier === tier
    );
  }
}

export async function updateCompanyLifecycleStatus(
  companyId: string,
  lifecycleStatus: CompanyLifecycleStatus,
  status: "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED" | "DEACTIVATED" | string,
  activatedAt?: string,
  deactivatedAt?: string
): Promise<CompanyEntity | null> {

  const now = new Date().toISOString();
  const updateData: Record<string, any> = {
    lifecycleStatus,
    status,
    updatedAt: now,
  };
  if (activatedAt !== undefined) updateData.activatedAt = activatedAt;
  else if (lifecycleStatus === "ACTIVE") updateData.activatedAt = now;

  if (deactivatedAt !== undefined) updateData.deactivatedAt = deactivatedAt;
  else if (lifecycleStatus === "DEACTIVATED") updateData.deactivatedAt = now;

  try {
    const docRef = doc(db, COLLECTION_NAME, companyId);
    await setDoc(docRef, updateData, { merge: true });
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const comp = { id: snap.id, ...snap.data() } as CompanyEntity;
      saveInMemoryCompany(comp);
      return comp;
    }
  } catch (err) {
    console.warn(`[CompanyRepository] updateCompanyLifecycleStatus failed for ${companyId}:`, err);
  }

  const existing = runtimeCompanyCache.get(companyId);
  if (existing) {
    Object.assign(existing, updateData);
    return existing;
  }
  return null;
}

export function updateCompanyBillingConfig(
  companyId: string,
  billingConfig: {
    cloudBillingAccountId?: string;
    cloudBillingOrganizationId?: string;
    cloudBillingContact?: string;
    googleMarketplaceEnabled?: boolean;
    stripeCustomerId?: string;
  }
): CompanyEntity | undefined {
  const existing = runtimeCompanyCache.get(companyId);
  if (existing) {
    Object.assign(existing, billingConfig, { updatedAt: new Date().toISOString() });
    saveCompanyRecord(existing);
  }
  return existing;
}

export async function deleteCompanyRecord(companyId: string): Promise<boolean> {
  runtimeCompanyCache.delete(companyId);
  try {
    const docRef = doc(db, COLLECTION_NAME, companyId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn(`[CompanyRepository] deleteCompanyRecord failed for ${companyId}:`, err);
    return false;
  }
}

export function findCompaniesByOwnerOrEmailSync(
  ownerId?: string,
  email?: string
): CompanyEntity[] {
  const normEmail = email?.trim().toLowerCase();
  const results: CompanyEntity[] = [];
  const seenIds = new Set<string>();

  for (const comp of runtimeCompanyCache.values()) {
    const cEmail = (comp.email || comp.officialEmail || "").trim().toLowerCase();
    if ((ownerId && comp.ownerId === ownerId) || (normEmail && cEmail === normEmail)) {
      if (!seenIds.has(comp.id)) {
        seenIds.add(comp.id);
        results.push(comp);
      }
    }
  }
  return results;
}

export async function findCompaniesByOwnerOrEmail(
  ownerId?: string,
  email?: string
): Promise<CompanyEntity[]> {
  const normEmail = email?.trim().toLowerCase();
  const results: CompanyEntity[] = [];
  const seenIds = new Set<string>();

  // 1. Check in-memory runtime cache
  for (const comp of runtimeCompanyCache.values()) {
    const cEmail = (comp.email || comp.officialEmail || "").trim().toLowerCase();
    if ((ownerId && comp.ownerId === ownerId) || (normEmail && cEmail === normEmail)) {
      if (!seenIds.has(comp.id)) {
        seenIds.add(comp.id);
        results.push(comp);
      }
    }
  }

  // 2. Firestore queries
  try {
    if (typeof window !== "undefined") {
      if (ownerId) {
        const qOwner = query(collection(db, COLLECTION_NAME), where("ownerId", "==", ownerId));
        const snapOwner = await getDocs(qOwner);
        snapOwner.forEach((docSnap) => {
          const comp = { id: docSnap.id, ...docSnap.data() } as CompanyEntity;
          saveInMemoryCompany(comp);
          if (!seenIds.has(comp.id)) {
            seenIds.add(comp.id);
            results.push(comp);
          }
        });
      }

      if (normEmail) {
        const qEmail = query(collection(db, COLLECTION_NAME), where("email", "==", normEmail));
        const snapEmail = await getDocs(qEmail);
        snapEmail.forEach((docSnap) => {
          const comp = { id: docSnap.id, ...docSnap.data() } as CompanyEntity;
          saveInMemoryCompany(comp);
          if (!seenIds.has(comp.id)) {
            seenIds.add(comp.id);
            results.push(comp);
          }
        });

        const qOffEmail = query(collection(db, COLLECTION_NAME), where("officialEmail", "==", normEmail));
        const snapOff = await getDocs(qOffEmail);
        snapOff.forEach((docSnap) => {
          const comp = { id: docSnap.id, ...docSnap.data() } as CompanyEntity;
          saveInMemoryCompany(comp);
          if (!seenIds.has(comp.id)) {
            seenIds.add(comp.id);
            results.push(comp);
          }
        });
      }
    }
  } catch (err) {
    console.warn("[CompanyRepository] findCompaniesByOwnerOrEmail query error:", err);
  }

  return results;
}

export function saveCompanyRecordSync(company: CompanyEntity): CompanyEntity {
  saveInMemoryCompany(company);
  saveCompanyRecord(company).catch((err) => {
    console.warn(`[CompanyRepository] Async Firestore save failed for ${company.id}:`, err);
  });
  return company;
}

export const findCompanyById = getCompanyRecord;
export const saveCompany = saveCompanyRecord;
export const updateCompanyLifecycle = updateCompanyLifecycleStatus;
export const getAllCompanyRecords = findAllCompaniesSync;
export function clearInMemoryCompanyStore(): void {
  runtimeCompanyCache.clear();
}

