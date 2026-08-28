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

export interface AIInteractionLog {
  id: string;
  userId?: string;
  companyId?: string;
  entityType: "COMPANY" | "PRODUCT" | "SERVICE" | "SECTOR" | "GENERAL";
  entityId?: string;
  queryText: string;
  responseText: string;
  confidence?: "HIGH" | "MEDIUM" | "LOW";
  sources?: Array<{
    sourceType: string;
    sourceTitle: string;
    sourceReference: string;
  }>;
  timestamp: string;
}

/**
 * Log an AI interaction to Firestore
 */
export async function logAIInteraction(log: AIInteractionLog): Promise<AIInteractionLog> {
  const docRef = doc(db, "aiInteractions", log.id);
  await setDoc(docRef, { ...log }, { merge: true });
  return log;
}

/**
 * List AI interaction history for a user or company
 */
export async function listAIInteractions(filter: { userId?: string; companyId?: string }): Promise<AIInteractionLog[]> {
  const colRef = collection(db, "aiInteractions");
  let q = query(colRef, limit(50));
  if (filter.companyId) {
    q = query(colRef, where("companyId", "==", filter.companyId), limit(50));
  } else if (filter.userId) {
    q = query(colRef, where("userId", "==", filter.userId), limit(50));
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as AIInteractionLog);
}
