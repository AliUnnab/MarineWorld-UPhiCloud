import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ServiceEntity } from "@/lib/types";

/**
 * Get services subcollection reference
 */
function getServicesRef(companyId: string) {
  return collection(db, "companies", companyId, "services");
}

/**
 * Get service by ID
 */
export async function getServiceById(companyId: string, serviceId: string): Promise<ServiceEntity | null> {
  if (!companyId || !serviceId) return null;
  const docRef = doc(db, "companies", companyId, "services", serviceId);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as ServiceEntity;
  }
  return null;
}

/**
 * List services of a company
 */
export async function getServicesByCompany(companyId: string): Promise<ServiceEntity[]> {
  if (!companyId) return [];
  const snapshot = await getDocs(getServicesRef(companyId));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceEntity));
}

/**
 * Create or save a service
 */
export async function saveService(companyId: string, service: Partial<ServiceEntity> & { id: string }): Promise<ServiceEntity> {
  const docRef = doc(db, "companies", companyId, "services", service.id);
  const payload: ServiceEntity = {
    ...service,
    companyId,
    updatedAt: new Date().toISOString(),
    createdAt: service.createdAt || new Date().toISOString(),
  } as ServiceEntity;
  await setDoc(docRef, payload, { merge: true });
  return payload;
}

/**
 * Update service fields
 */
export async function updateService(companyId: string, serviceId: string, updates: Partial<ServiceEntity>): Promise<void> {
  const docRef = doc(db, "companies", companyId, "services", serviceId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Delete a service
 */
export async function deleteService(companyId: string, serviceId: string): Promise<void> {
  const docRef = doc(db, "companies", companyId, "services", serviceId);
  await deleteDoc(docRef);
}

/**
 * Real-time listener for company services
 */
export function subscribeToCompanyServices(companyId: string, callback: (services: ServiceEntity[]) => void): Unsubscribe {
  return onSnapshot(getServicesRef(companyId), (snapshot) => {
    const services = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceEntity));
    callback(services);
  });
}
