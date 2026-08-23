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

// In-memory persistent registry of conflicts
const CONFLICT_REGISTRY = new Map<string, DocumentConflictResolution>();

/**
 * Initialize default seeded conflicts for demonstration/testing if empty
 */
function ensureSeededConflicts(companyId: string) {
  const existingForCompany = Array.from(CONFLICT_REGISTRY.values()).filter((c) => c.companyId === companyId);
  if (existingForCompany.length === 0) {
    const defaultConflict: DocumentConflictResolution = {
      conflictId: `conf-${companyId}-leadtime-01`,
      companyId,
      offeringId: "prod-argento-01",
      field: "leadTime",
      fieldLabel: "Production & Delivery Lead Time",
      status: "OPEN",
      sourceA: {
        sourceDocumentId: `doc-${companyId}-02`,
        sourceDocumentName: "Autonomous Survey ROV Operator Manual & Technical Spec v4.2",
        extractedAt: new Date(Date.now() - 86400000).toISOString(),
        confidenceScore: 94,
        confirmationState: "AI_EXTRACTED",
        extractedValue: "4 to 6 weeks from purchase order",
        sectionOrPage: "Sec 8.1 Commercial Logistics",
      },
      sourceB: {
        sourceDocumentId: `doc-${companyId}-price-01`,
        sourceDocumentName: "2026 Global Commercial Tariff & Delivery Schedule.pdf",
        extractedAt: new Date(Date.now() - 43200000).toISOString(),
        confidenceScore: 89,
        confirmationState: "AI_EXTRACTED",
        extractedValue: "8 to 10 weeks (High Seasonal Backlog)",
        sectionOrPage: "Page 4 Tariff Index",
      },
    };
    CONFLICT_REGISTRY.set(defaultConflict.conflictId, defaultConflict);
  }
}

/**
 * Get all conflicts for a given company
 */
export function getCompanyDocumentConflicts(companyId: string): DocumentConflictResolution[] {
  ensureSeededConflicts(companyId);
  return Array.from(CONFLICT_REGISTRY.values()).filter((c) => c.companyId === companyId);
}

/**
 * Get open conflicts for an offering
 */
export function getOfferingDocumentConflicts(
  companyId: string,
  offeringId: string
): DocumentConflictResolution[] {
  ensureSeededConflicts(companyId);
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
  return fullConflict;
}

/**
 * Clear conflicts for testing
 */
export function resetConflictRegistryForTesting() {
  CONFLICT_REGISTRY.clear();
}
