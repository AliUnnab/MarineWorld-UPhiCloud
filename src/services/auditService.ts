import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface AuditEventRecord {
  id: string;
  eventType: string;
  actorUserId?: string;
  actorEmail?: string;
  actorRole?: string;
  targetCompanyId?: string;
  targetEntityType?: string;
  targetEntityId?: string;
  actionSummary: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

const COLLECTION_NAME = "auditEvents";

/**
 * Record a canonical audit event
 */
export async function recordAuditEvent(event: Partial<AuditEventRecord> & { actionSummary: string }): Promise<AuditEventRecord> {
  const id = event.id || `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const docRef = doc(db, COLLECTION_NAME, id);
  const payload: AuditEventRecord = {
    id,
    eventType: event.eventType || "GENERAL_ACTION",
    actorUserId: event.actorUserId,
    actorEmail: event.actorEmail,
    actorRole: event.actorRole,
    targetCompanyId: event.targetCompanyId,
    targetEntityType: event.targetEntityType,
    targetEntityId: event.targetEntityId,
    actionSummary: event.actionSummary,
    metadata: event.metadata || {},
    timestamp: event.timestamp || new Date().toISOString(),
  };

  await setDoc(docRef, payload, { merge: true });
  return payload;
}

/**
 * Get audit trail for a specific company
 */
export async function getCompanyAuditTrail(
  companyId: string,
  limitCount = 50
): Promise<AuditEventRecord[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("targetCompanyId", "==", companyId),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data() as AuditEventRecord);
}
