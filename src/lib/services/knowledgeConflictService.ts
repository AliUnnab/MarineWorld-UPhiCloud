import type { DocumentEntity } from "@/lib/types";

export interface DocumentConflictProvenance {
  sourceDocumentId: string;
  sourceDocumentName: string;
  extractedAt: string;
  confidenceScore: number;
  confirmationState: "AI_EXTRACTED" | "COMPANY_CONFIRMED";
  extractedValue: string;
  sectionOrPage?: string;
}

export interface DocumentConflictResolution {
  conflictId: string;
  companyId: string;
  offeringId?: string;
  field: string;
  fieldLabel: string;
  status: "OPEN" | "RESOLVED";
  sourceA: DocumentConflictProvenance;
  sourceB: DocumentConflictProvenance;
  resolvedValue?: string;
  resolvedSource?: "SOURCE_A" | "SOURCE_B" | "MANUAL";
  confirmedAt?: string;
  confirmedBy?: string;
  manualRationale?: string;
}

import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";

// In-memory runtime cache of conflicts synced from Firestore
const CONFLICT_REGISTRY = new Map<string, DocumentConflictResolution>();
const activeConflictListeners = new Set<string>();

/**
 * Initialize realtime listener for company conflicts from Firestore
 */
export function initCompanyConflictsSync(companyId: string): void {
  if (!companyId || activeConflictListeners.has(companyId)) return;
  activeConflictListeners.add(companyId);
  try {
    const colRef = collection(db, "companies", companyId, "knowledgeConflicts");
    onSnapshot(colRef, (snap) => {
      snap.docs.forEach((d) => {
        const item = { ...d.data(), conflictId: d.id } as DocumentConflictResolution;
        CONFLICT_REGISTRY.set(item.conflictId, item);
      });
    });
  } catch (err) {
    console.warn("[KnowledgeConflictService] Firestore subscription error:", err);
  }
}

/**
 * Get all conflicts for a given company
 */
export function getCompanyDocumentConflicts(companyId: string): DocumentConflictResolution[] {
  initCompanyConflictsSync(companyId);
  return Array.from(CONFLICT_REGISTRY.values()).filter((c) => c.companyId === companyId);
}

/**
 * Get open conflicts for an offering
 */
export function getOfferingDocumentConflicts(
  companyId: string,
  offeringId: string
): DocumentConflictResolution[] {
  initCompanyConflictsSync(companyId);
  return Array.from(CONFLICT_REGISTRY.values()).filter(
    (c) => c.companyId === companyId && c.offeringId === offeringId
  );
}

/**
 * Resolve a document conflict explicitly with provenance retention
 */
export function resolveDocumentConflict(params: {
  conflictId: string;
  companyId: string;
  choice: "KEEP_A" | "KEEP_B" | "MANUAL";
  manualValue?: string;
  manualRationale?: string;
  confirmedBy?: string;
}): DocumentConflictResolution {
  const existing = CONFLICT_REGISTRY.get(params.conflictId);
  if (!existing) {
    throw new Error(`Conflict ${params.conflictId} not found.`);
  }

  if (existing.companyId !== params.companyId) {
    throw new Error(`Cross-company tenant isolation violation: conflict does not belong to company ${params.companyId}.`);
  }

  let finalValue = "";
  let resolvedSource: "SOURCE_A" | "SOURCE_B" | "MANUAL" = "SOURCE_A";

  if (params.choice === "KEEP_A") {
    finalValue = existing.sourceA.extractedValue;
    resolvedSource = "SOURCE_A";
  } else if (params.choice === "KEEP_B") {
    finalValue = existing.sourceB.extractedValue;
    resolvedSource = "SOURCE_B";
  } else {
    if (!params.manualValue || !params.manualValue.trim()) {
      throw new Error("Manual value must be provided when choosing MANUAL review.");
    }
    finalValue = params.manualValue.trim();
    resolvedSource = "MANUAL";
  }

  const resolvedConflict: DocumentConflictResolution = {
    ...existing,
    status: "RESOLVED",
    resolvedValue: finalValue,
    resolvedSource,
    confirmedAt: new Date().toISOString(),
    confirmedBy: params.confirmedBy || "Studio Operator",
    manualRationale: params.manualRationale,
  };

  CONFLICT_REGISTRY.set(params.conflictId, resolvedConflict);

  try {
    const docRef = doc(db, "companies", params.companyId, "knowledgeConflicts", params.conflictId);
    setDoc(docRef, resolvedConflict, { merge: true }).catch((err) => {
      console.warn("[KnowledgeConflictService] Firestore conflict resolve sync error:", err);
    });
  } catch (err) {
    console.warn("[KnowledgeConflictService] Firestore write error:", err);
  }

  return resolvedConflict;
}

/**
 * Register or detect a new conflict
 */
export function registerDocumentConflict(
  conflict: Omit<DocumentConflictResolution, "status"> & { status?: "OPEN" | "RESOLVED" }
): DocumentConflictResolution {
  const fullConflict: DocumentConflictResolution = {
    ...conflict,
    status: conflict.status || "OPEN",
  };
  CONFLICT_REGISTRY.set(fullConflict.conflictId, fullConflict);

  try {
    const docRef = doc(db, "companies", fullConflict.companyId, "knowledgeConflicts", fullConflict.conflictId);
    setDoc(docRef, fullConflict, { merge: true }).catch((err) => {
      console.warn("[KnowledgeConflictService] Firestore conflict register sync error:", err);
    });
  } catch (err) {
    console.warn("[KnowledgeConflictService] Firestore write error:", err);
  }

  return fullConflict;
}

/**
 * Clear conflicts for testing
 */
export function resetConflictRegistryForTesting() {
  CONFLICT_REGISTRY.clear();
}
