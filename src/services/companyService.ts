import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { CompanyEntity, CompanyProfile } from "@/lib/types";

const COLLECTION_NAME = "companies";

/**
 * Get a company document by ID
 */
export async function getCompanyById(id: string): Promise<CompanyEntity | null> {
  if (!id) return null;
  const docRef = doc(db, COLLECTION_NAME, id);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as CompanyEntity;
  }
  return null;
}

/**
 * Get a company by slug
 */
export async function getCompanyBySlug(slug: string): Promise<CompanyEntity | null> {
  if (!slug) return null;
  const q = query(collection(db, COLLECTION_NAME), where("slug", "==", slug), limit(1));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as CompanyEntity;
  }
  return null;
}

/**
 * List all companies (or filter by sector / city)
 */
export async function listCompanies(options?: {
  sectorId?: string;
  sectorCityId?: string;
  presenceTier?: string;
  limitCount?: number;
}): Promise<CompanyEntity[]> {
  const collRef = collection(db, COLLECTION_NAME);
  const constraints: any[] = [];

  if (options?.sectorId) {
    constraints.push(where("sectorId", "==", options.sectorId));
  }
  if (options?.sectorCityId) {
    constraints.push(where("sectorCityIds", "array-contains", options.sectorCityId));
  }
  if (options?.presenceTier) {
    constraints.push(where("presenceTier", "==", options.presenceTier));
  }
  if (options?.limitCount) {
    constraints.push(limit(options.limitCount));
  }

  const queryRef = constraints.length > 0 ? query(collRef, ...constraints) : query(collRef);
  const snapshot = await getDocs(queryRef);
  return snapshot.docs.map((d) => {
    const data = d.data() as Record<string, any>;
    return { ...data, id: d.id } as CompanyEntity;
  });
}

/**
 * Create or overwrite a company document
 */
export async function createCompany(company: Partial<CompanyEntity> & { id: string }): Promise<CompanyEntity> {
  const docRef = doc(db, COLLECTION_NAME, company.id);
  const payload = {
    ...company,
    updatedAt: new Date().toISOString(),
    createdAt: company.createdAt || new Date().toISOString(),
  };
  await setDoc(docRef, payload, { merge: true });
  return payload as CompanyEntity;
}

/**
 * Update company fields partially
 */
export async function updateCompany(id: string, updates: Partial<CompanyEntity>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Delete a company document
 */
export async function deleteCompany(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

/**
 * Real-time listener for a company
 */
export function subscribeToCompany(id: string, callback: (company: CompanyEntity | null) => void): Unsubscribe {
  const docRef = doc(db, COLLECTION_NAME, id);
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() } as CompanyEntity);
    } else {
      callback(null);
    }
  });
}

/**
 * Real-time listener for companies in a sector city
 */
export function subscribeToSectorCityCompanies(
  sectorCityId: string,
  callback: (companies: CompanyEntity[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("sectorCityIds", "array-contains", sectorCityId)
  );
  return onSnapshot(q, (snapshot) => {
    const companies = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CompanyEntity));
    callback(companies);
  });
}
