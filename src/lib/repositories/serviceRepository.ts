import type { ServiceEntity } from "@/lib/types";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";

/**
 * Pure Firestore Service Repository
 * Data Access Layer for /companies/{companyId}/services/{serviceId}
 */

export async function findServiceById(companyId: string, serviceId: string): Promise<ServiceEntity | null> {
  if (!companyId || !serviceId) return null;
  try {
    const docRef = doc(db, "companies", companyId, "services", serviceId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as ServiceEntity;
    }
  } catch (err) {
    console.warn(`[ServiceRepository] Firestore findServiceById failed for ${companyId}/${serviceId}:`, err);
  }
  return null;
}

export async function findServicesByCompany(companyId: string): Promise<ServiceEntity[]> {
  if (!companyId) return [];
  try {
    const colRef = collection(db, "companies", companyId, "services");
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceEntity));
  } catch (err) {
    console.warn(`[ServiceRepository] Firestore findServicesByCompany failed for ${companyId}:`, err);
    return [];
  }
}

export async function saveService(service: ServiceEntity): Promise<ServiceEntity> {
  const payload: ServiceEntity = {
    ...service,
    updatedAt: new Date().toISOString(),
    createdAt: service.createdAt || new Date().toISOString(),
  };

  if (service.companyId && service.id) {
    try {
      const docRef = doc(db, "companies", service.companyId, "services", service.id);
      await setDoc(docRef, payload, { merge: true });
    } catch (err) {
      console.warn(`[ServiceRepository] Firestore saveService error for ${service.id}:`, err);
    }
  }

  return payload;
}

export async function deleteServiceRecord(companyId: string, serviceId: string): Promise<boolean> {
  if (!companyId || !serviceId) return false;
  try {
    const docRef = doc(db, "companies", companyId, "services", serviceId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn(`[ServiceRepository] Firestore deleteServiceRecord error for ${companyId}/${serviceId}:`, err);
    return false;
  }
}

export function subscribeToCompanyServices(
  companyId: string,
  callback: (services: ServiceEntity[]) => void
): Unsubscribe {
  if (!companyId) {
    callback([]);
    return () => {};
  }
  const colRef = collection(db, "companies", companyId, "services");
  return onSnapshot(colRef, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceEntity)));
  });
}
