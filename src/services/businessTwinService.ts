import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BusinessTwinProjection } from "@/lib/types";

/**
 * Get company Business Twin projection from Firestore
 */
export async function getCompanyBusinessTwin(companyId: string): Promise<BusinessTwinProjection | null> {
  if (!companyId) return null;
  const docRef = doc(db, "companies", companyId, "twin", "current");
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as BusinessTwinProjection;
  }
  return null;
}

/**
 * Save company Business Twin projection
 */
export async function saveCompanyBusinessTwin(
  companyId: string,
  twin: Partial<BusinessTwinProjection>
): Promise<BusinessTwinProjection> {
  const docRef = doc(db, "companies", companyId, "twin", "current");
  const payload: BusinessTwinProjection = {
    id: twin.id || `twin-${companyId}`,
    companyId,
    sectorCityId: twin.sectorCityId || "",
    overallCompleteness: twin.overallCompleteness || 0,
    verificationStatus: twin.verificationStatus || "UNVERIFIED",
    sectionCompleteness: twin.sectionCompleteness || {},
    capabilities: twin.capabilities || [],
    publishedProducts: twin.publishedProducts || [],
    ...twin,
  } as BusinessTwinProjection;

  await setDoc(docRef, payload, { merge: true });
  return payload;
}

/**
 * Real-time listener for Business Twin
 */
export function subscribeToCompanyBusinessTwin(
  companyId: string,
  callback: (twin: BusinessTwinProjection | null) => void
): Unsubscribe {
  if (!companyId) return () => {};
  const docRef = doc(db, "companies", companyId, "twin", "current");
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as BusinessTwinProjection);
    } else {
      callback(null);
    }
  });
}
