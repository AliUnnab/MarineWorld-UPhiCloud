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
    const data = snapshot.data();
    const name = data.name || data.displayName || data.brandName || data.legalName || snapshot.id;
    return { id: snapshot.id, ...data, name } as CompanyEntity;
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
    const data = docSnap.data();
    const name = data.name || data.displayName || data.brandName || data.legalName || slug;
    return { id: docSnap.id, ...data, name } as CompanyEntity;
  }
  return null;
}

/**
 * Get a company with its full details including subcollections:
 * products, services, offerings, contacts package, and members.
 */
export async function getCompanyWithFullDetails(idOrSlug: string): Promise<CompanyEntity | null> {
  if (!idOrSlug) return null;

  // 1. Resolve company document by ID or slug
  let comp: CompanyEntity | null = await getCompanyById(idOrSlug);
  if (!comp) {
    comp = await getCompanyBySlug(idOrSlug);
  }
  if (!comp) return null;
  if (!comp.name) {
    comp.name = comp.displayName || (comp as any).brandName || comp.legalName || comp.id;
  }

  const compId = comp.id;

  // 2. Fetch subcollections in parallel
  try {
    const [productsSnap, servicesSnap, offeringsSnap, contactsDoc, membersSnap] = await Promise.all([
      getDocs(collection(db, COLLECTION_NAME, compId, "products")).catch(() => null),
      getDocs(collection(db, COLLECTION_NAME, compId, "services")).catch(() => null),
      getDocs(collection(db, COLLECTION_NAME, compId, "offerings")).catch(() => null),
      getDoc(doc(db, COLLECTION_NAME, compId, "contacts", "package")).catch(() => null),
      getDocs(collection(db, COLLECTION_NAME, compId, "members")).catch(() => null),
    ]);

    const productsMap = new Map<string, any>();
    if (Array.isArray(comp.products)) {
      comp.products.forEach((p: any) => p?.id && productsMap.set(p.id, p));
    }
    if (productsSnap) {
      productsSnap.forEach((d) => productsMap.set(d.id, { id: d.id, ...d.data() }));
    }
    if (offeringsSnap) {
      offeringsSnap.forEach((d) => {
        if (!productsMap.has(d.id)) {
          productsMap.set(d.id, { id: d.id, ...d.data() });
        }
      });
    }

    const servicesMap = new Map<string, any>();
    if (Array.isArray(comp.services)) {
      comp.services.forEach((s: any) => s?.id && servicesMap.set(s.id, s));
    }
    if (servicesSnap) {
      servicesSnap.forEach((d) => servicesMap.set(d.id, { id: d.id, ...d.data() }));
    }

    const teamMembersMap = new Map<string, any>();
    if (Array.isArray((comp as any).teamMembers)) {
      (comp as any).teamMembers.forEach((m: any) => (m?.email || m?.name) && teamMembersMap.set(m.email || m.name, m));
    }

    if (contactsDoc && contactsDoc.exists()) {
      const cData = contactsDoc.data();
      if (cData.generalContacts) {
        (comp as any).contacts = { ...((comp as any).contacts || {}), ...cData.generalContacts };
        if (cData.generalContacts.phoneHq && !comp.phone) comp.phone = cData.generalContacts.phoneHq;
        if (cData.generalContacts.officialEmail && !comp.officialEmail) comp.officialEmail = cData.generalContacts.officialEmail;
        if (cData.generalContacts.officialWebsite && !comp.website) comp.website = cData.generalContacts.officialWebsite;
        if (cData.generalContacts.address && !comp.address) comp.address = cData.generalContacts.address;
      }
      if (Array.isArray(cData.teamMembers)) {
        cData.teamMembers.forEach((tm: any) => {
          if (tm?.email || tm?.name) teamMembersMap.set(tm.email || tm.name, tm);
        });
      }
    }

    if (membersSnap) {
      membersSnap.forEach((mDoc) => {
        const mData = mDoc.data();
        const key = mData.businessEmail || mData.displayName || mDoc.id;
        if (key && !teamMembersMap.has(key)) {
          teamMembersMap.set(key, {
            id: mDoc.id,
            name: mData.displayName || mData.name || "Team Member",
            role: mData.jobTitle || mData.role || "Member",
            department: mData.department || "General",
            email: mData.businessEmail || mData.email || "",
            phone: mData.phone || "",
          });
        }
      });
    }

    comp.products = Array.from(productsMap.values());
    comp.services = Array.from(servicesMap.values());
    (comp as any).teamMembers = Array.from(teamMembersMap.values());
    comp.offerings = Array.from(productsMap.values());
  } catch (err) {
    console.warn("[companyService] Error hydrating full details:", err);
  }

  return comp;
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
