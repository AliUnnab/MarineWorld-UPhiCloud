import type {
  DocumentEntity,
  CompanyOffering,
  DocumentVisibility,
  DocumentLifecycleStatus,
  GroundingEligibilityStatus,
} from "@/lib/types";
import { getCompanyDocumentConflicts } from "@/lib/services/knowledgeConflictService";

export type KnowledgeLifecycleAction =
  | "SOURCE_CREATED"
  | "SOURCE_GROUNDED"
  | "SOURCE_DISABLED"
  | "SOURCE_ENABLED"
  | "SOURCE_ARCHIVED"
  | "SOURCE_UNARCHIVED"
  | "SOURCE_LINKED"
  | "SOURCE_UNLINKED"
  | "SOURCE_SCOPE_CHANGED"
  | "SOURCE_DELETED";

export interface KnowledgeAuditRecord {
  id: string;
  companyId: string;
  sourceDocumentId: string;
  sourceTitle: string;
  actorId: string;
  action: KnowledgeLifecycleAction;
  timestamp: string;
  previousState: {
    status?: DocumentLifecycleStatus | string;
    groundingStatus?: GroundingEligibilityStatus | string;
    scope?: string;
    targetId?: string;
  };
  newState: {
    status?: DocumentLifecycleStatus | string;
    groundingStatus?: GroundingEligibilityStatus | string;
    scope?: string;
    targetId?: string;
  };
  details?: Record<string, unknown>;
}

export interface DependencyCheckResult {
  canDelete: boolean;
  dependencies: string[];
  reason?: string;
  suggestedActions: Array<"DISABLE_GROUNDING" | "ARCHIVE_SOURCE" | "REMOVE_RELATIONSHIPS">;
}

// In-memory persistent knowledge repository store
const repositoryStore = new Map<string, DocumentEntity>();
const auditLogStore: KnowledgeAuditRecord[] = [];

// Helper to seed standard records if empty
function ensureSeedData(companyId: string) {
  const existingForCompany = Array.from(repositoryStore.values()).filter(
    (d) => d.companyId === companyId
  );
  if (existingForCompany.length > 0) return;

  const now = new Date().toISOString();
  const seedDocs: DocumentEntity[] = [
    {
      id: `doc-${companyId}-01`,
      companyId,
      businessId: `MW-BUS-${companyId.toUpperCase()}`,
      title: "DNV-GL Naval Composite Structural Compliance Certificate",
      documentType: "CERTIFICATE",
      status: "ACTIVE",
      sourceType: "IMPORTED",
      fileReferences: ["file-cert-01"],
      visibility: "PUBLIC",
      productId: "prod-argento-01",
      groundingStatus: "GROUNDED",
      groundingEligible: true,
      version: 1,
      versionHistory: [
        {
          versionNumber: 1,
          title: "DNV-GL Naval Composite Structural Compliance Certificate",
          summary: "Initial verified classification upload from Google Drive.",
          updatedBy: "usr-admin",
          updatedAt: now,
        },
      ],
      metadata: {
        classification: "CERTIFICATION",
        scope: "COMPANY",
        confidenceScore: 98,
        sourceReference: "/MarineWorld-Corporate-Knowledge/Certifications/DNV-GL-Naval.pdf",
        extractedFacts: [
          {
            id: "f-dnv-1",
            field: "complianceStandard",
            fieldLabel: "Compliance Standard",
            aiValue: "DNV-GL Naval Composite & Subsea Safety 2026",
            canonicalValue: "DNV-GL Naval Composite & Subsea Safety 2026",
            sourceCitation: "Certificate Header / Section 1.2",
            confidenceScore: 98,
            confirmationState: "COMPANY_CONFIRMED",
            category: "CERTIFICATION",
          },
        ],
      },
      createdBy: "usr-admin",
      updatedBy: "usr-admin",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `doc-${companyId}-02`,
      companyId,
      businessId: `MW-BUS-${companyId.toUpperCase()}`,
      title: "Autonomous Survey ROV Operator Manual & Technical Spec v4.2",
      documentType: "TECHNICAL_SPEC",
      status: "ACTIVE",
      sourceType: "IMPORTED",
      fileReferences: ["file-man-02"],
      visibility: "PUBLIC",
      productId: "prod-argento-01",
      groundingStatus: "GROUNDED",
      groundingEligible: true,
      version: 2,
      versionHistory: [
        {
          versionNumber: 1,
          title: "Autonomous Survey ROV Operator Manual v4.0",
          summary: "Initial manual",
          updatedBy: "usr-admin",
          updatedAt: now,
        },
        {
          versionNumber: 2,
          title: "Autonomous Survey ROV Operator Manual & Technical Spec v4.2",
          summary: "Updated specs and depth rating",
          updatedBy: "usr-admin",
          updatedAt: now,
        },
      ],
      metadata: {
        classification: "TECHNICAL",
        scope: "OFFERING",
        confidenceScore: 96,
        sourceReference: "/MarineWorld-Corporate-Knowledge/Product-Specs/ROV-Manual-v4.pdf",
        extractedFacts: [
          {
            id: "f-rov-1",
            field: "operationalDepth",
            fieldLabel: "Maximum Depth Rating",
            aiValue: "3,000 meters seawater (MSW)",
            canonicalValue: "3,000 meters seawater (MSW)",
            sourceCitation: "Datasheet Technical Matrix / Page 2",
            confidenceScore: 99,
            confirmationState: "COMPANY_CONFIRMED",
            category: "SPECIFICATION",
          },
        ],
      },
      createdBy: "usr-admin",
      updatedBy: "usr-admin",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `doc-${companyId}-03`,
      companyId,
      businessId: `MW-BUS-${companyId.toUpperCase()}`,
      title: "Computational Fluid Dynamics Vessel Route Optimization Scope",
      documentType: "PROCEDURE",
      status: "ACTIVE",
      sourceType: "IMPORTED",
      fileReferences: ["file-serv-03"],
      visibility: "PRIVATE",
      serviceId: "serv-argento-01",
      groundingStatus: "GROUNDED",
      groundingEligible: true,
      version: 1,
      versionHistory: [],
      metadata: {
        classification: "TECHNICAL",
        scope: "OFFERING",
        confidenceScore: 94,
        sourceReference: "/MarineWorld-Corporate-Knowledge/Procedures/CFD-Routing.pdf",
      },
      createdBy: "usr-admin",
      updatedBy: "usr-admin",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `doc-${companyId}-04`,
      companyId,
      businessId: `MW-BUS-${companyId.toUpperCase()}`,
      title: "Corporate Quality & Environmental Management Standard (ISO 14001)",
      documentType: "POLICY",
      status: "ACTIVE",
      sourceType: "IMPORTED",
      fileReferences: ["file-iso-04"],
      visibility: "PUBLIC",
      groundingStatus: "GROUNDED",
      groundingEligible: true,
      version: 1,
      versionHistory: [],
      metadata: {
        classification: "GENERAL_CORPORATE",
        scope: "COMPANY",
        confidenceScore: 97,
        sourceReference: "/MarineWorld-Corporate-Knowledge/Policies/ISO-14001.pdf",
      },
      createdBy: "usr-admin",
      updatedBy: "usr-admin",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `doc-${companyId}-05`,
      companyId,
      businessId: `MW-BUS-${companyId.toUpperCase()}`,
      title: "North Sea Deepwater Berth 04 Engineering & Mooring Capacity Matrix",
      documentType: "TECHNICAL_SPEC",
      status: "ACTIVE",
      sourceType: "IMPORTED",
      fileReferences: ["file-fac-05"],
      visibility: "PUBLIC",
      groundingStatus: "GROUNDED",
      groundingEligible: true,
      version: 1,
      versionHistory: [],
      metadata: {
        classification: "FACILITY_SPEC",
        scope: "FACILITY",
        facilityId: "fac-rotterdam-04",
        facilityName: "North Sea Deepwater Berth 04",
        confidenceScore: 99,
        sourceReference: "/MarineWorld-Corporate-Knowledge/Facilities/Berth-04-Mooring.pdf",
      },
      createdBy: "usr-admin",
      updatedBy: "usr-admin",
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const doc of seedDocs) {
    repositoryStore.set(doc.id, doc);
    auditLogStore.push({
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      companyId: doc.companyId,
      sourceDocumentId: doc.id,
      sourceTitle: doc.title,
      actorId: "system-seed",
      action: "SOURCE_GROUNDED",
      timestamp: doc.createdAt,
      previousState: { status: "DRAFT", groundingStatus: "NOT_INDEXED" },
      newState: { status: "ACTIVE", groundingStatus: "GROUNDED", scope: (doc.metadata as any)?.scope || "COMPANY" },
      details: { initialIngestion: true },
    });
  }
}

/**
 * Log a structured audit event for knowledge lifecycle transitions
 */
export function logKnowledgeLifecycleEvent(
  record: Omit<KnowledgeAuditRecord, "id" | "timestamp">
): KnowledgeAuditRecord {
  const auditEntry: KnowledgeAuditRecord = {
    ...record,
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    timestamp: new Date().toISOString(),
  };
  auditLogStore.unshift(auditEntry);
  return auditEntry;
}

/**
 * Retrieve audit history for a company or specific source document
 */
export function getKnowledgeAuditLogs(
  companyId: string,
  sourceDocumentId?: string
): KnowledgeAuditRecord[] {
  return auditLogStore.filter((entry) => {
    if (entry.companyId !== companyId) return false;
    if (sourceDocumentId && entry.sourceDocumentId !== sourceDocumentId) return false;
    return true;
  });
}

/**
 * Retrieve all knowledge sources for a company with optional filters
 */
export function getKnowledgeSources(
  companyId: string,
  filter?: {
    status?: "ALL" | "ACTIVE" | "ARCHIVED" | "DISABLED";
    classification?: string;
  }
): DocumentEntity[] {
  ensureSeedData(companyId);

  return Array.from(repositoryStore.values()).filter((doc) => {
    if (doc.companyId !== companyId) return false;
    if (doc.status === "DELETED") return false;

    if (filter?.status && filter.status !== "ALL") {
      if (filter.status === "ACTIVE" && (doc.status !== "ACTIVE" || doc.groundingStatus === "DISABLED")) return false;
      if (filter.status === "ARCHIVED" && doc.status !== "ARCHIVED") return false;
      if (filter.status === "DISABLED" && (doc.groundingStatus !== "DISABLED" || doc.status === "ARCHIVED")) return false;
    }

    if (filter?.classification && filter.classification !== "ALL") {
      const cls = (doc.metadata?.classification as string) || doc.documentType;
      if (filter.classification === "CERTIFICATIONS" && doc.documentType !== "CERTIFICATE" && cls !== "CERTIFICATION") return false;
      if (filter.classification === "TECHNICAL DOCUMENTS" && doc.documentType !== "TECHNICAL_SPEC" && cls !== "TECHNICAL") return false;
      if (filter.classification === "COMMERCIAL DOCUMENTS" && doc.documentType !== "CONTRACT" && cls !== "COMMERCIAL") return false;
      if (filter.classification === "PRODUCT KNOWLEDGE" && !doc.productId) return false;
      if (filter.classification === "SERVICE KNOWLEDGE" && !doc.serviceId) return false;
      if (filter.classification === "COMPANY KNOWLEDGE" && (doc.productId || doc.serviceId)) return false;
    }

    return true;
  });
}

/**
 * Retrieve single knowledge source by ID
 */
export function getSourceById(companyId: string, docId: string): DocumentEntity | null {
  ensureSeedData(companyId);
  const doc = repositoryStore.get(docId);
  if (!doc || doc.companyId !== companyId || doc.status === "DELETED") return null;
  return doc;
}

/**
 * Register a newly ingested knowledge source into the store
 */
export function registerIngestedSource(
  document: DocumentEntity,
  actorId: string = "Company Operator"
): DocumentEntity {
  repositoryStore.set(document.id, document);

  logKnowledgeLifecycleEvent({
    companyId: document.companyId,
    sourceDocumentId: document.id,
    sourceTitle: document.title,
    actorId,
    action: document.groundingStatus === "GROUNDED" ? "SOURCE_GROUNDED" : "SOURCE_CREATED",
    previousState: { status: "DRAFT", groundingStatus: "NOT_INDEXED" },
    newState: {
      status: document.status,
      groundingStatus: document.groundingStatus,
      scope: (document.metadata?.scope as string) || (document.productId || document.serviceId ? "OFFERING" : "COMPANY"),
      targetId: document.productId || document.serviceId || undefined,
    },
    details: {
      documentType: document.documentType,
      visibility: document.visibility,
      sourceType: document.sourceType,
    },
  });

  return document;
}

/**
 * Change the assigned AI scope (Company AI vs Offering AI vs Facility AI)
 */
export function changeSourceScope(params: {
  companyId: string;
  docId: string;
  scopeType: "COMPANY" | "OFFERING" | "FACILITY";
  offeringId?: string;
  facilityId?: string;
  facilityName?: string;
  actorId?: string;
}): { success: boolean; document?: DocumentEntity; error?: string } {
  ensureSeedData(params.companyId);
  const doc = repositoryStore.get(params.docId);

  if (!doc || doc.companyId !== params.companyId) {
    return { success: false, error: `Knowledge source '${params.docId}' not found.` };
  }

  const prevScope = (doc.metadata?.scope as string) || (doc.productId || doc.serviceId ? "OFFERING" : "COMPANY");
  const prevTargetId = doc.productId || doc.serviceId || (doc.metadata?.facilityId as string);

  let newProductId: string | undefined = undefined;
  let newServiceId: string | undefined = undefined;
  let newFacilityId: string | undefined = undefined;

  if (params.scopeType === "OFFERING" && params.offeringId) {
    if (params.offeringId.startsWith("prod")) {
      newProductId = params.offeringId;
    } else if (params.offeringId.startsWith("serv")) {
      newServiceId = params.offeringId;
    } else {
      newProductId = params.offeringId;
    }
  } else if (params.scopeType === "FACILITY" && params.facilityId) {
    newFacilityId = params.facilityId;
  }

  const now = new Date().toISOString();
  const updatedDoc: DocumentEntity = {
    ...doc,
    productId: newProductId,
    serviceId: newServiceId,
    metadata: {
      ...doc.metadata,
      scope: params.scopeType,
      facilityId: newFacilityId,
      facilityName: params.facilityName,
    },
    updatedBy: params.actorId || "Company Operator",
    updatedAt: now,
    version: doc.version + 1,
    versionHistory: [
      ...doc.versionHistory,
      {
        versionNumber: doc.version + 1,
        title: doc.title,
        summary: `Changed AI scope from ${prevScope} to ${params.scopeType}${params.offeringId ? ` (${params.offeringId})` : ""}`,
        updatedBy: params.actorId || "Company Operator",
        updatedAt: now,
      },
    ],
  };

  repositoryStore.set(params.docId, updatedDoc);

  logKnowledgeLifecycleEvent({
    companyId: params.companyId,
    sourceDocumentId: params.docId,
    sourceTitle: doc.title,
    actorId: params.actorId || "Company Operator",
    action: "SOURCE_SCOPE_CHANGED",
    previousState: { scope: prevScope, targetId: prevTargetId },
    newState: {
      scope: params.scopeType,
      targetId: params.offeringId || params.facilityId || undefined,
    },
    details: {
      scopeType: params.scopeType,
      offeringId: params.offeringId,
      facilityId: params.facilityId,
    },
  });

  return { success: true, document: updatedDoc };
}

/**
 * Disable Grounding
 * The source entity remains safely stored and visible in Company Studio,
 * but is excluded from active AI retrieval.
 */
export function disableGrounding(
  companyId: string,
  docId: string,
  actorId: string = "Company Operator",
  reason?: string
): { success: boolean; document?: DocumentEntity; error?: string } {
  ensureSeedData(companyId);
  const doc = repositoryStore.get(docId);

  if (!doc || doc.companyId !== companyId) {
    return { success: false, error: `Knowledge source '${docId}' not found.` };
  }

  const prevGrounding = doc.groundingStatus;
  const now = new Date().toISOString();

  const updatedDoc: DocumentEntity = {
    ...doc,
    groundingStatus: "DISABLED",
    groundingEligible: false,
    updatedBy: actorId,
    updatedAt: now,
    version: doc.version + 1,
    versionHistory: [
      ...doc.versionHistory,
      {
        versionNumber: doc.version + 1,
        title: doc.title,
        summary: `Grounding disabled: ${reason || "Removed from active AI retrieval"}`,
        updatedBy: actorId,
        updatedAt: now,
      },
    ],
  };

  repositoryStore.set(docId, updatedDoc);

  logKnowledgeLifecycleEvent({
    companyId,
    sourceDocumentId: docId,
    sourceTitle: doc.title,
    actorId,
    action: "SOURCE_DISABLED",
    previousState: { status: doc.status, groundingStatus: prevGrounding },
    newState: { status: doc.status, groundingStatus: "DISABLED" },
    details: { reason: reason || "Grounding disabled by operator" },
  });

  return { success: true, document: updatedDoc };
}

/**
 * Enable Grounding
 * Restores the source into active AI retrieval for its configured scope.
 */
export function enableGrounding(
  companyId: string,
  docId: string,
  actorId: string = "Company Operator"
): { success: boolean; document?: DocumentEntity; error?: string } {
  ensureSeedData(companyId);
  const doc = repositoryStore.get(docId);

  if (!doc || doc.companyId !== companyId) {
    return { success: false, error: `Knowledge source '${docId}' not found.` };
  }

  const prevGrounding = doc.groundingStatus;
  const now = new Date().toISOString();

  const updatedDoc: DocumentEntity = {
    ...doc,
    groundingStatus: "GROUNDED",
    groundingEligible: true,
    updatedBy: actorId,
    updatedAt: now,
    version: doc.version + 1,
    versionHistory: [
      ...doc.versionHistory,
      {
        versionNumber: doc.version + 1,
        title: doc.title,
        summary: "Grounding enabled: restored to active AI retrieval",
        updatedBy: actorId,
        updatedAt: now,
      },
    ],
  };

  repositoryStore.set(docId, updatedDoc);

  logKnowledgeLifecycleEvent({
    companyId,
    sourceDocumentId: docId,
    sourceTitle: doc.title,
    actorId,
    action: "SOURCE_ENABLED",
    previousState: { status: doc.status, groundingStatus: prevGrounding },
    newState: { status: doc.status, groundingStatus: "GROUNDED" },
    details: { scope: (doc.metadata?.scope as string) || "COMPANY" },
  });

  return { success: true, document: updatedDoc };
}

/**
 * Archive Source
 * Source remains stored in Company Studio repository and audit log,
 * but is excluded from active grounding and public download.
 */
export function archiveSource(
  companyId: string,
  docId: string,
  actorId: string = "Company Operator",
  reason?: string
): { success: boolean; document?: DocumentEntity; error?: string } {
  ensureSeedData(companyId);
  const doc = repositoryStore.get(docId);

  if (!doc || doc.companyId !== companyId) {
    return { success: false, error: `Knowledge source '${docId}' not found.` };
  }

  const prevStatus = doc.status;
  const prevGrounding = doc.groundingStatus;
  const now = new Date().toISOString();

  const updatedDoc: DocumentEntity = {
    ...doc,
    status: "ARCHIVED",
    groundingStatus: "DISABLED",
    groundingEligible: false,
    updatedBy: actorId,
    updatedAt: now,
    version: doc.version + 1,
    versionHistory: [
      ...doc.versionHistory,
      {
        versionNumber: doc.version + 1,
        title: doc.title,
        summary: `Archived source: ${reason || "Moved to corporate knowledge archive"}`,
        updatedBy: actorId,
        updatedAt: now,
      },
    ],
  };

  repositoryStore.set(docId, updatedDoc);

  logKnowledgeLifecycleEvent({
    companyId,
    sourceDocumentId: docId,
    sourceTitle: doc.title,
    actorId,
    action: "SOURCE_ARCHIVED",
    previousState: { status: prevStatus, groundingStatus: prevGrounding },
    newState: { status: "ARCHIVED", groundingStatus: "DISABLED" },
    details: { reason: reason || "Archived by operator" },
  });

  return { success: true, document: updatedDoc };
}

/**
 * Unarchive Source
 * Restores source to ACTIVE state.
 */
export function unarchiveSource(
  companyId: string,
  docId: string,
  actorId: string = "Company Operator"
): { success: boolean; document?: DocumentEntity; error?: string } {
  ensureSeedData(companyId);
  const doc = repositoryStore.get(docId);

  if (!doc || doc.companyId !== companyId) {
    return { success: false, error: `Knowledge source '${docId}' not found.` };
  }

  const prevStatus = doc.status;
  const now = new Date().toISOString();

  const updatedDoc: DocumentEntity = {
    ...doc,
    status: "ACTIVE",
    groundingStatus: "DISABLED", // Operator can explicitly enable grounding when ready
    groundingEligible: false,
    updatedBy: actorId,
    updatedAt: now,
    version: doc.version + 1,
    versionHistory: [
      ...doc.versionHistory,
      {
        versionNumber: doc.version + 1,
        title: doc.title,
        summary: "Unarchived source restored to repository",
        updatedBy: actorId,
        updatedAt: now,
      },
    ],
  };

  repositoryStore.set(docId, updatedDoc);

  logKnowledgeLifecycleEvent({
    companyId,
    sourceDocumentId: docId,
    sourceTitle: doc.title,
    actorId,
    action: "SOURCE_UNARCHIVED",
    previousState: { status: prevStatus },
    newState: { status: "ACTIVE", groundingStatus: "DISABLED" },
  });

  return { success: true, document: updatedDoc };
}

/**
 * Remove Link
 * CRITICAL ARCHITECTURAL RULE:
 * Removes ONLY the relationship (clears productId, serviceId, facilityId)
 * and resets scope to COMPANY.
 * NEVER deletes the source entity or its stored data.
 */
export function removeSourceLink(
  companyId: string,
  docId: string,
  actorId: string = "Company Operator"
): { success: boolean; document?: DocumentEntity; error?: string } {
  ensureSeedData(companyId);
  const doc = repositoryStore.get(docId);

  if (!doc || doc.companyId !== companyId) {
    return { success: false, error: `Knowledge source '${docId}' not found.` };
  }

  const previousTarget = doc.productId || doc.serviceId || (doc.metadata?.facilityId as string) || "OFFERING";
  const now = new Date().toISOString();

  const updatedDoc: DocumentEntity = {
    ...doc,
    productId: undefined,
    serviceId: undefined,
    metadata: {
      ...doc.metadata,
      scope: "COMPANY",
      facilityId: undefined,
      facilityName: undefined,
    },
    updatedBy: actorId,
    updatedAt: now,
    version: doc.version + 1,
    versionHistory: [
      ...doc.versionHistory,
      {
        versionNumber: doc.version + 1,
        title: doc.title,
        summary: `Removed relationship link from target '${previousTarget}'. Source retained in Company Knowledge.`,
        updatedBy: actorId,
        updatedAt: now,
      },
    ],
  };

  repositoryStore.set(docId, updatedDoc);

  logKnowledgeLifecycleEvent({
    companyId,
    sourceDocumentId: docId,
    sourceTitle: doc.title,
    actorId,
    action: "SOURCE_UNLINKED",
    previousState: { scope: "OFFERING", targetId: previousTarget },
    newState: { scope: "COMPANY", targetId: undefined },
    details: { detachedFrom: previousTarget, retainedInCompanyKnowledge: true },
  });

  return { success: true, document: updatedDoc };
}

/**
 * Link an existing source entity to an Offering or Facility
 * WITHOUT creating a duplicate document entity.
 */
export function linkExistingSource(params: {
  companyId: string;
  sourceDocId: string;
  targetScope: "OFFERING" | "FACILITY";
  targetOfferingId?: string;
  facilityId?: string;
  facilityName?: string;
  actorId?: string;
}): { success: boolean; document?: DocumentEntity; error?: string } {
  ensureSeedData(params.companyId);
  const doc = repositoryStore.get(params.sourceDocId);

  if (!doc || doc.companyId !== params.companyId) {
    return { success: false, error: `Knowledge source '${params.sourceDocId}' not found.` };
  }

  let newProductId: string | undefined = undefined;
  let newServiceId: string | undefined = undefined;
  let newFacilityId: string | undefined = undefined;

  if (params.targetScope === "OFFERING" && params.targetOfferingId) {
    if (params.targetOfferingId.startsWith("serv")) {
      newServiceId = params.targetOfferingId;
    } else {
      newProductId = params.targetOfferingId;
    }
  } else if (params.targetScope === "FACILITY") {
    newFacilityId = params.facilityId;
  }

  const now = new Date().toISOString();
  const updatedDoc: DocumentEntity = {
    ...doc,
    productId: newProductId,
    serviceId: newServiceId,
    groundingStatus: "GROUNDED",
    groundingEligible: true,
    metadata: {
      ...doc.metadata,
      scope: params.targetScope,
      facilityId: newFacilityId,
      facilityName: params.facilityName,
    },
    updatedBy: params.actorId || "Company Operator",
    updatedAt: now,
    version: doc.version + 1,
    versionHistory: [
      ...doc.versionHistory,
      {
        versionNumber: doc.version + 1,
        title: doc.title,
        summary: `Linked existing source to ${params.targetScope}: ${params.targetOfferingId || params.facilityId}`,
        updatedBy: params.actorId || "Company Operator",
        updatedAt: now,
      },
    ],
  };

  repositoryStore.set(params.sourceDocId, updatedDoc);

  logKnowledgeLifecycleEvent({
    companyId: params.companyId,
    sourceDocumentId: params.sourceDocId,
    sourceTitle: doc.title,
    actorId: params.actorId || "Company Operator",
    action: "SOURCE_LINKED",
    previousState: { scope: (doc.metadata?.scope as string) || "COMPANY" },
    newState: {
      scope: params.targetScope,
      targetId: params.targetOfferingId || params.facilityId,
    },
    details: { noDuplicateEntityCreated: true },
  });

  return { success: true, document: updatedDoc };
}

/**
 * Dependency Check for Safe Deletion
 * Prevents hard deletion when active dependencies exist.
 */
export function checkSourceDependencies(
  companyId: string,
  docId: string
): DependencyCheckResult {
  ensureSeedData(companyId);
  const doc = repositoryStore.get(docId);

  if (!doc || doc.companyId !== companyId) {
    return {
      canDelete: false,
      dependencies: ["Document record not found"],
      reason: "Document does not exist or has already been removed.",
      suggestedActions: [],
    };
  }

  const dependencies: string[] = [];
  const suggestedActions: Array<"DISABLE_GROUNDING" | "ARCHIVE_SOURCE" | "REMOVE_RELATIONSHIPS"> = [];

  // 1. Check if source is actively grounded
  if (doc.status === "ACTIVE" && doc.groundingStatus === "GROUNDED") {
    dependencies.push("Active in AI Grounding Engine (Source is currently generating verified answers)");
    suggestedActions.push("DISABLE_GROUNDING");
  }

  // 2. Check if attached to an offering
  if (doc.productId) {
    dependencies.push(`Attached to Commercial Product: ${doc.productId}`);
    suggestedActions.push("REMOVE_RELATIONSHIPS");
  }
  if (doc.serviceId) {
    dependencies.push(`Attached to Commercial Service: ${doc.serviceId}`);
    suggestedActions.push("REMOVE_RELATIONSHIPS");
  }

  // 3. Check if attached to a facility
  if (doc.metadata?.facilityId) {
    dependencies.push(`Attached to Physical Facility: ${doc.metadata.facilityId}`);
    suggestedActions.push("REMOVE_RELATIONSHIPS");
  }

  // 4. Check for open document conflicts
  const conflicts = getCompanyDocumentConflicts(companyId);
  const docConflicts = conflicts.filter(
    (c) =>
      c.status === "OPEN" &&
      (c.sourceA.sourceDocumentId === docId || c.sourceB.sourceDocumentId === docId)
  );
  if (docConflicts.length > 0) {
    dependencies.push(`Referenced in ${docConflicts.length} active Source Conflict Resolution record(s)`);
    suggestedActions.push("ARCHIVE_SOURCE");
  }

  if (dependencies.length > 0) {
    suggestedActions.push("ARCHIVE_SOURCE");
    return {
      canDelete: false,
      dependencies,
      reason: "Source is in active use across company grounding, offering relationships, or governance records.",
      suggestedActions: Array.from(new Set(suggestedActions)),
    };
  }

  return {
    canDelete: true,
    dependencies: [],
    suggestedActions: [],
  };
}

/**
 * Safe Delete
 * Only permits deletion if checkSourceDependencies returns canDelete === true.
 */
export function deleteSourceSafely(
  companyId: string,
  docId: string,
  actorId: string = "Company Operator"
): {
  success: boolean;
  error?: string;
  blockedReason?: string;
  dependencies?: string[];
} {
  ensureSeedData(companyId);
  const doc = repositoryStore.get(docId);

  if (!doc || doc.companyId !== companyId) {
    return { success: false, error: `Knowledge source '${docId}' not found.` };
  }

  // Enforce dependency protection
  const depCheck = checkSourceDependencies(companyId, docId);
  if (!depCheck.canDelete) {
    return {
      success: false,
      blockedReason: depCheck.reason,
      dependencies: depCheck.dependencies,
      error: "SOURCE IS IN USE: Hard deletion blocked by enterprise safety rules. Please disable grounding, archive, or remove relationships first.",
    };
  }

  // Safe to delete
  const prevDoc = { ...doc };
  repositoryStore.delete(docId);

  logKnowledgeLifecycleEvent({
    companyId,
    sourceDocumentId: docId,
    sourceTitle: prevDoc.title,
    actorId,
    action: "SOURCE_DELETED",
    previousState: { status: prevDoc.status, groundingStatus: prevDoc.groundingStatus },
    newState: { status: "DELETED" },
    details: { permanentlyDeleted: true },
  });

  return { success: true };
}

/**
 * AI Retrieval Engine Grounding Filter
 * Ensures only ACTIVE + GROUNDED sources within tenant and scope boundaries
 * can ever be retrieved by AI models.
 */
export function resolveActiveAIRetrievalSources(params: {
  companyId: string;
  offeringId?: string;
  facilityId?: string;
  isPublic?: boolean;
}): DocumentEntity[] {
  ensureSeedData(params.companyId);

  return Array.from(repositoryStore.values()).filter((doc) => {
    // 1. Strict Tenant Isolation
    if (doc.companyId !== params.companyId) return false;

    // 2. Lifecycle Status & Grounding Eligibility
    if (doc.status !== "ACTIVE") return false;
    if (doc.groundingStatus !== "GROUNDED" || !doc.groundingEligible) return false;

    // 3. Visibility Check
    if (params.isPublic && doc.visibility !== "PUBLIC") return false;

    // 4. Offering AI Isolation
    if (params.offeringId) {
      if (doc.productId && doc.productId !== params.offeringId) return false;
      if (doc.serviceId && doc.serviceId !== params.offeringId) return false;
    }

    // 5. Facility AI Isolation
    if (params.facilityId) {
      if (doc.metadata?.facilityId && doc.metadata.facilityId !== params.facilityId) return false;
    }

    return true;
  });
}

/**
 * Reset Store for automated test suites
 */
export function resetKnowledgeStoreForTesting() {
  repositoryStore.clear();
  auditLogStore.length = 0;
}
