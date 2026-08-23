import type { AuditEvent, AuditQueryOptions, AuditModuleType } from "@/lib/types";
import { getPersistenceMode } from "./persistenceMode";
import { getFirebaseApp } from "@/lib/auth/firebaseAuth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  type QueryConstraint,
} from "firebase/firestore";

/**
 * Stage 14 — Canonical Firestore Audit Repository
 * Data Access Layer for /companies/{companyId}/auditEvents/{eventId}
 *
 * Immutability:
 * - Append-only document creation
 * - No update or delete operations
 */

const companyAuditStore = new Map<string, AuditEvent[]>();

/**
 * Persists an AuditEvent into Firestore /companies/{companyId}/auditEvents/{eventId}
 * and updates the local in-memory cache.
 */
export async function saveAuditEvent(event: AuditEvent): Promise<AuditEvent> {
  const companyId = event.companyId;

  // 1. In-memory cache update with deduplication / idempotency
  const existing = companyAuditStore.get(companyId) || [];
  const existingIndex = existing.findIndex((e) => e.eventId === event.eventId);
  if (existingIndex >= 0) {
    // Already recorded (idempotent duplicate guard)
    return existing[existingIndex];
  } else {
    // Prepend latest event to memory buffer
    existing.unshift({ ...event });
    companyAuditStore.set(companyId, existing);
  }

  // 2. Authoritative Firestore persistence
  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const app = getFirebaseApp();
      if (app) {
        const db = getFirestore(app);
        const docRef = doc(db, "companies", companyId, "auditEvents", event.eventId);

        // Clean undefined values for Firestore serialization safety
        const cleanEvent: Record<string, any> = {};
        for (const [k, v] of Object.entries(event)) {
          if (v !== undefined) {
            cleanEvent[k] = v;
          }
        }

        await setDoc(docRef, cleanEvent, { merge: false });
      }
    } catch (err) {
      // Log fallback in offline or non-blocking dev scenarios
      console.warn("[AuditRepository] Firestore save audit event fallback:", err);
    }
  }

  return event;
}

/**
 * Queries audit events for a company from Firestore with in-memory fallback.
 */
export async function getAuditEventsByCompany(
  companyId: string,
  options?: AuditQueryOptions
): Promise<AuditEvent[]> {
  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const app = getFirebaseApp();
      if (app) {
        const db = getFirestore(app);
        const colRef = collection(db, "companies", companyId, "auditEvents");

        const constraints: QueryConstraint[] = [orderBy("timestamp", "desc")];

        if (options?.module) {
          constraints.unshift(where("module", "==", options.module));
        }
        if (options?.actorUserId) {
          constraints.unshift(where("actorUserId", "==", options.actorUserId));
        }
        if (options?.entityType) {
          constraints.unshift(where("entityType", "==", options.entityType));
        }
        if (options?.entityId) {
          constraints.unshift(where("entityId", "==", options.entityId));
        }

        const qLimit = options?.limit || 100;
        constraints.push(limit(qLimit));

        const q = query(colRef, ...constraints);
        const snap = await getDocs(q);

        const events = snap.docs.map((d) => d.data() as AuditEvent);
        // Sync local cache
        companyAuditStore.set(companyId, events);
        return events;
      }
    } catch (err) {
      console.error("[AuditRepository] Firestore query failed for audit events:", err);
      throw err;
    }
  }

  // In-memory fallback
  let list = companyAuditStore.get(companyId) || [];

  if (options?.module) {
    list = list.filter((e) => e.module === options.module);
  }
  if (options?.actorUserId) {
    list = list.filter((e) => e.actorUserId === options.actorUserId);
  }
  if (options?.entityType) {
    list = list.filter((e) => e.entityType === options.entityType);
  }
  if (options?.entityId) {
    list = list.filter((e) => e.entityId === options.entityId);
  }
  if (options?.actionType) {
    list = list.filter((e) => e.actionType === options.actionType);
  }
  if (options?.startDate) {
    list = list.filter((e) => e.timestamp >= options.startDate!);
  }
  if (options?.endDate) {
    list = list.filter((e) => e.timestamp <= options.endDate!);
  }

  // Sort descending
  list = [...list].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  if (options?.limit) {
    list = list.slice(0, options.limit);
  }

  return list;
}

/**
 * Retrieves a single audit event by ID
 */
export async function getAuditEventById(
  companyId: string,
  eventId: string
): Promise<AuditEvent | null> {
  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const app = getFirebaseApp();
      if (app) {
        const db = getFirestore(app);
        const docRef = doc(db, "companies", companyId, "auditEvents", eventId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          return snap.data() as AuditEvent;
        }
      }
    } catch (err) {
      // Fallback
    }
  }

  const list = companyAuditStore.get(companyId) || [];
  return list.find((e) => e.eventId === eventId) || null;
}

/**
 * Returns synchronous in-memory audit events for immediate UI / debug rendering
 */
export function getAllAuditEventsSync(companyId: string): AuditEvent[] {
  return companyAuditStore.get(companyId) || [];
}

/**
 * Resets or clears the in-memory cache (for testing)
 */
export function clearCompanyAuditCache(companyId?: string): void {
  if (companyId) {
    companyAuditStore.delete(companyId);
  } else {
    companyAuditStore.clear();
  }
}
