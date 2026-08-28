import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface AnchorVisibilityEvent {
  id: string;
  companyId: string;
  cityId: string;
  eventType: "IMPRESSION" | "CLICK" | "PROFILE_VIEW" | "RFQ_INIT";
  timestamp: string;
  metadata?: Record<string, any>;
}

const COLLECTION_NAME = "anchorVisibilityEvents";

export async function logAnchorVisibilityEvent(event: Omit<AnchorVisibilityEvent, "id"> & { id?: string }): Promise<void> {
  const eventId = event.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const docRef = doc(db, COLLECTION_NAME, eventId);
  const payload: AnchorVisibilityEvent = {
    ...event,
    id: eventId,
    timestamp: event.timestamp || new Date().toISOString(),
  };
  await setDoc(docRef, payload, { merge: true });
}

export async function getAnchorVisibilityEvents(
  companyId: string,
  limitCount: number = 100
): Promise<AnchorVisibilityEvent[]> {
  if (!companyId) return [];
  const q = query(
    collection(db, COLLECTION_NAME),
    where("companyId", "==", companyId),
    orderBy("timestamp", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AnchorVisibilityEvent));
}
