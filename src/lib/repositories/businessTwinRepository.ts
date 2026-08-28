import type { BusinessTwinProjection } from "@/lib/types";
import { db } from "@/lib/firebase";
import { isFirestoreMode } from "./persistenceMode";
import { doc, getDoc, setDoc } from "firebase/firestore";

/**
 * Stage 10.6 — Business Twin Repository
 * Data Access Layer for /companies/{companyId}/twin/current
 */

const twinStore = new Map<string, BusinessTwinProjection>();

export async function findBusinessTwinByCompany(companyId: string): Promise<BusinessTwinProjection | null> {
  if (isFirestoreMode() && companyId) {
    try {
      const docRef = doc(db, "companies", companyId, "twin", "current");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const item = snap.data() as BusinessTwinProjection;
        twinStore.set(companyId, item);
        return item;
      }
    } catch (err) {
      console.warn(`[BusinessTwinRepo] Firestore findBusinessTwin fallback for ${companyId}:`, err);
    }
  }
  return twinStore.get(companyId) || null;
}

export async function saveBusinessTwin(twin: BusinessTwinProjection): Promise<BusinessTwinProjection> {
  twinStore.set(twin.companyId, twin);
  if (isFirestoreMode() && twin.companyId) {
    try {
      const docRef = doc(db, "companies", twin.companyId, "twin", "current");
      await setDoc(docRef, { ...twin }, { merge: true });
    } catch (err) {
      console.warn(`[BusinessTwinRepo] Firestore saveBusinessTwin error for ${twin.companyId}:`, err);
    }
  }
  return twin;
}
