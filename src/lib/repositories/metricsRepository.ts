import type { MetricEventEntity } from "@/lib/types";
import { db } from "@/lib/firebase";
import { isFirestoreMode } from "./persistenceMode";
import { collection, doc, setDoc, getDocs, updateDoc, increment } from "firebase/firestore";

export async function incrementCompanyMetric(
  companyId: string,
  field: "profileViews" | "productViews" | "serviceViews" | "inquiriesCount"
): Promise<void> {
  if (!companyId) return;
  try {
    const docRef = doc(db, "companies", companyId, "metrics", "summary");
    await setDoc(
      docRef,
      {
        companyId,
        [field]: increment(1),
        lastUpdated: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.debug("[MetricsRepo] Firestore incrementCompanyMetric note:", err);
  }
}

/**
 * Stage 10.6 — Metrics Repository
 * Data Access Layer for /companyAnalytics/{companyId}/events/{eventId}
 */

const metricsStore = new Map<string, MetricEventEntity[]>();

export async function appendMetricEvent(event: MetricEventEntity): Promise<MetricEventEntity> {
  const existing = metricsStore.get(event.companyId) || [];
  existing.push(event);
  metricsStore.set(event.companyId, existing);

  if (isFirestoreMode() && event.companyId) {
    try {
      const eventId = event.id || `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const docRef = doc(db, "companyAnalytics", event.companyId, "events", eventId);
      await setDoc(docRef, { ...event, id: eventId }, { merge: true });
    } catch (err) {
      console.warn(`[MetricsRepo] Firestore appendMetricEvent error for ${event.companyId}:`, err);
    }
  }

  return event;
}

export async function findMetricEventsByCompany(companyId: string): Promise<MetricEventEntity[]> {
  if (isFirestoreMode() && companyId) {
    try {
      const colRef = collection(db, "companyAnalytics", companyId, "events");
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as MetricEventEntity);
      }
    } catch (err) {
      console.warn(`[MetricsRepo] Firestore findMetricEventsByCompany fallback for ${companyId}:`, err);
    }
  }
  return metricsStore.get(companyId) || [];
}
