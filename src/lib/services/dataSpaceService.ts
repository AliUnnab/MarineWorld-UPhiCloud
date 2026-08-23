import type {
  DocumentEntity,
  FileEntity,
  ExternalSourceConnection,
  ExternalResource,
  GroundingContextQuery,
  GroundingContextResult,
  GroundingSourceAttribution,
  CompanyDataSpaceManifest,
} from "@/lib/types";
import { getCompanyById } from "@/lib/services/companyService";
import {
  getCurrentAuthSession,
  getCompanyMember,
  type AuthContext,
} from "@/lib/services/securityService";
import { recordDigitalAction } from "@/lib/services/accessContextService";

/**
 * Stage 12.4 — Company Data Space Architecture Service
 * Manages tenant-isolated structured data, documents, files, external source connections, and AI grounding eligibility.
 */

// In-memory data space stores (tenant-isolated by companyId)
const documentStore = new Map<string, DocumentEntity>();
const fileStore = new Map<string, FileEntity>();
const externalConnectionStore = new Map<string, ExternalSourceConnection>();
const externalResourceStore = new Map<string, ExternalResource>();

// Pre-seed canonical Data Space for Argento Marine
const seedTime = new Date().toISOString();
documentStore.set("doc-argento-01", {
  id: "doc-argento-01",
  companyId: "argento-marine",
  businessId: "MW-BUS-ARGENTO-MARITIME",
  title: "Marine Vessel Safety & Quality Management Manual (ISO 9001:2015)",
  documentType: "MANUAL",
  status: "ACTIVE",
  sourceType: "MANUAL",
  fileReferences: ["file-argento-01"],
  visibility: "PRIVATE",
  groundingEligible: true,
  groundingStatus: "GROUNDED",
  version: 1,
  versionHistory: [
    {
      versionNumber: 1,
      title: "Marine Vessel Safety & Quality Management Manual",
      summary: "Canonical operational and quality assurance procedures for maritime vessel maintenance.",
      updatedBy: "usr-owner-001",
      updatedAt: seedTime,
    },
  ],
  metadata: {
    contentSummary: "Standard operating procedures covering subsea hull inspections, non-destructive testing, and propulsion diagnostic compliance.",
    extractedText: "Argento Marine Vessel Safety Manual: All underwater inspections must be conducted in compliance with DNV and Lloyd's Register guidelines.",
    tags: ["Quality", "ISO 9001", "DNV", "Safety"],
  },
  createdBy: "usr-owner-001",
  updatedBy: "usr-owner-001",
  createdAt: seedTime,
  updatedAt: seedTime,
});

documentStore.set("doc-argento-02", {
  id: "doc-argento-02",
  companyId: "argento-marine",
  businessId: "MW-BUS-ARGENTO-MARITIME",
  title: "Class Society Certificate of Operational Authorization (DNV GL)",
  documentType: "CERTIFICATE",
  status: "ACTIVE",
  sourceType: "MANUAL",
  fileReferences: ["file-argento-02"],
  visibility: "PRIVATE",
  groundingEligible: true,
  groundingStatus: "GROUNDED",
  version: 1,
  versionHistory: [
    {
      versionNumber: 1,
      title: "Class Society Certificate of Operational Authorization",
      summary: "Official classification certificate issued for high-seas marine engineering.",
      updatedBy: "usr-owner-001",
      updatedAt: seedTime,
    },
  ],
  metadata: {
    contentSummary: "Authorized classification certification permitting international offshore structural testing and ROV operations.",
    extractedText: "DNV GL Certificate of Authorization: Argento Marine B.V. is certified for Class I marine structural surveying.",
    tags: ["Certification", "DNV", "Private"],
  },
  createdBy: "usr-owner-001",
  updatedBy: "usr-owner-001",
  createdAt: seedTime,
  updatedAt: seedTime,
});

fileStore.set("file-argento-01", {
  id: "file-argento-01",
  companyId: "argento-marine",
  businessId: "MW-BUS-ARGENTO-MARITIME",
  name: "argento_quality_manual_v1.pdf",
  mimeType: "application/pdf",
  sizeBytes: 2450000,
  storageProvider: "LOCAL_MOCK",
  storageReference: "/companies/argento-marine/files/file-argento-01",
  status: "ACTIVE",
  downloadUrl: "/companies/argento-marine/files/file-argento-01",
  visibility: "PRIVATE",
  uploadedBy: "usr-owner-001",
  createdAt: seedTime,
  updatedAt: seedTime,
});

fileStore.set("file-argento-02", {
  id: "file-argento-02",
  companyId: "argento-marine",
  businessId: "MW-BUS-ARGENTO-MARITIME",
  name: "dnv_class_certificate_2026.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1120000,
  storageProvider: "LOCAL_MOCK",
  storageReference: "/companies/argento-marine/files/file-argento-02",
  status: "ACTIVE",
  downloadUrl: "/companies/argento-marine/files/file-argento-02",
  visibility: "PRIVATE",
  uploadedBy: "usr-owner-001",
  createdAt: seedTime,
  updatedAt: seedTime,
});

/**
 * Validates whether the current user auth context has permission to access a company's Data Space.
 */
export function validateCompanyDataSpaceAccess(
  companyId: string,
  auth?: AuthContext,
  requiredRole?: string
): { isAllowed: boolean; companyId: string; businessId: string; userRole?: string; denialReason?: string } {
  const currentAuth = auth || getCurrentAuthSession();

  if (!currentAuth.uid) {
    return {
      isAllowed: false,
      companyId,
      businessId: "",
      denialReason: "Authentication required: Unauthenticated user cannot access Company Data Space.",
    };
  }

  const company = getCompanyById(companyId);
  if (!company) {
    return {
      isAllowed: false,
      companyId,
      businessId: "",
      denialReason: `Company '${companyId}' not found.`,
    };
  }

  const businessId = company.businessId || `MW-BUS-${company.id.toUpperCase()}`;

  const member = getCompanyMember(companyId, currentAuth);
  if (!member || member.status !== "ACTIVE") {
    return {
      isAllowed: false,
      companyId,
      businessId,
      denialReason: `Access denied: User '${currentAuth.uid}' is not an active member of company '${companyId}'.`,
    };
  }

  if (requiredRole && member.role !== "OWNER" && member.role !== "ADMIN" && member.role !== requiredRole) {
    return {
      isAllowed: false,
      companyId,
      businessId,
      userRole: member.role,
      denialReason: `Role forbidden: Role '${member.role}' lacks required permissions for this action.`,
    };
  }

  return {
    isAllowed: true,
    companyId,
    businessId,
    userRole: member.role,
  };
}

/* ====================================================================
   DOCUMENT MANAGEMENT CONTRACTS
   ==================================================================== */

export function createDocument(
  docData: Omit<DocumentEntity, "id" | "createdAt" | "updatedAt" | "version" | "versionHistory">,
  auth?: AuthContext
): { success: boolean; document?: DocumentEntity; error?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const access = validateCompanyDataSpaceAccess(docData.companyId, currentAuth);

  if (!access.isAllowed) {
    return { success: false, error: access.denialReason };
  }

  // Canonical businessId verification
  if (docData.businessId && docData.businessId !== access.businessId) {
    return {
      success: false,
      error: `Business ID mismatch: Provided '${docData.businessId}' does not match company business ID '${access.businessId}'.`,
    };
  }

  const docId = `doc-${docData.companyId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  const newDoc: DocumentEntity = {
    ...docData,
    id: docId,
    businessId: access.businessId,
    version: 1,
    versionHistory: [
      {
        versionNumber: 1,
        title: docData.title,
        summary: "Initial document creation",
        updatedBy: currentAuth.uid || "SYSTEM",
        updatedAt: now,
      },
    ],
    createdBy: currentAuth.uid || "SYSTEM",
    updatedBy: currentAuth.uid || "SYSTEM",
    createdAt: now,
    updatedAt: now,
  };

  documentStore.set(docId, newDoc);

  recordDigitalAction({
    actorUid: currentAuth.uid || "SYSTEM",
    actionType: "DOCUMENT_CREATED",
    targetEntityId: docId,
    companyId: docData.companyId,
    businessId: access.businessId,
    details: { title: docData.title, category: docData.documentType },
  });

  return { success: true, document: newDoc };
}

export function updateDocument(
  docId: string,
  updates: Partial<DocumentEntity>,
  auth?: AuthContext
): { success: boolean; document?: DocumentEntity; error?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const existing = documentStore.get(docId);

  if (!existing) {
    return { success: false, error: `Document '${docId}' not found.` };
  }

  const access = validateCompanyDataSpaceAccess(existing.companyId, currentAuth);
  if (!access.isAllowed) {
    return { success: false, error: access.denialReason };
  }

  const now = new Date().toISOString();
  const newVersionNumber = existing.version + 1;

  const updatedDoc: DocumentEntity = {
    ...existing,
    ...updates,
    companyId: existing.companyId, // Immutable tenant boundary
    businessId: existing.businessId, // Immutable identity boundary
    version: newVersionNumber,
    versionHistory: [
      ...existing.versionHistory,
      {
        versionNumber: newVersionNumber,
        title: updates.title || existing.title,
        summary: updates.title ? `Updated title to '${updates.title}'` : "Updated document attributes",
        updatedBy: currentAuth.uid || "SYSTEM",
        updatedAt: now,
      },
    ],
    updatedBy: currentAuth.uid || "SYSTEM",
    updatedAt: now,
  };

  documentStore.set(docId, updatedDoc);

  const actionType = updates.visibility === "PUBLIC" && existing.visibility === "PRIVATE"
    ? "DOCUMENT_PUBLISHED"
    : "DOCUMENT_UPDATED";

  recordDigitalAction({
    actorUid: currentAuth.uid || "SYSTEM",
    actionType,
    targetEntityId: docId,
    companyId: existing.companyId,
    businessId: existing.businessId,
    details: { version: newVersionNumber, visibility: updatedDoc.visibility },
  });

  return { success: true, document: updatedDoc };
}

export function getCompanyDocuments(
  companyId: string,
  auth?: AuthContext,
  options?: { productId?: string; serviceId?: string; publicOnly?: boolean }
): DocumentEntity[] {
  const currentAuth = auth || getCurrentAuthSession();
  const access = validateCompanyDataSpaceAccess(companyId, currentAuth);

  const isMember = access.isAllowed;

  return Array.from(documentStore.values()).filter((doc) => {
    if (doc.companyId !== companyId) return false;
    if (doc.status === "DELETED") return false;

    // Visibility filter: Non-members or publicOnly requests receive strictly PUBLIC documents
    if (!isMember || options?.publicOnly) {
      if (doc.visibility !== "PUBLIC") return false;
    }

    // Product scope filter
    if (options?.productId && doc.productId && doc.productId !== options.productId) {
      return false;
    }

    // Service scope filter
    if (options?.serviceId && doc.serviceId && doc.serviceId !== options.serviceId) {
      return false;
    }

    return true;
  });
}

export function getDocumentById(docId: string, auth?: AuthContext): DocumentEntity | null {
  const currentAuth = auth || getCurrentAuthSession();
  const doc = documentStore.get(docId);
  if (!doc) return null;

  if (doc.visibility === "PUBLIC") return doc;

  const access = validateCompanyDataSpaceAccess(doc.companyId, currentAuth);
  if (!access.isAllowed) return null;

  return doc;
}

/* ====================================================================
   FILE MANAGEMENT CONTRACTS
   ==================================================================== */

export function createFileRecord(
  fileData: Omit<FileEntity, "id" | "createdAt" | "updatedAt">,
  auth?: AuthContext
): { success: boolean; file?: FileEntity; error?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const access = validateCompanyDataSpaceAccess(fileData.companyId, currentAuth);

  if (!access.isAllowed) {
    return { success: false, error: access.denialReason };
  }

  if (fileData.businessId && fileData.businessId !== access.businessId) {
    return {
      success: false,
      error: `Business ID mismatch: Provided '${fileData.businessId}' does not match company business ID '${access.businessId}'.`,
    };
  }

  const fileId = `file-${fileData.companyId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  // Storage Reference format: /companies/{companyId}/files/{fileId}
  const storageReference = fileData.storageReference || `/companies/${fileData.companyId}/files/${fileId}`;

  const newFile: FileEntity = {
    ...fileData,
    id: fileId,
    businessId: access.businessId,
    storageReference,
    uploadedBy: currentAuth.uid || "SYSTEM",
    createdAt: now,
    updatedAt: now,
  };

  fileStore.set(fileId, newFile);

  recordDigitalAction({
    actorUid: currentAuth.uid || "SYSTEM",
    actionType: "FILE_UPLOADED",
    targetEntityId: fileId,
    companyId: fileData.companyId,
    businessId: access.businessId,
    details: { name: fileData.name, mimeType: fileData.mimeType, sizeBytes: fileData.sizeBytes },
  });

  return { success: true, file: newFile };
}

export function deleteFileRecord(
  fileId: string,
  auth?: AuthContext
): { success: boolean; error?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const existing = fileStore.get(fileId);

  if (!existing) {
    return { success: false, error: `File '${fileId}' not found.` };
  }

  const access = validateCompanyDataSpaceAccess(existing.companyId, currentAuth);
  if (!access.isAllowed) {
    return { success: false, error: access.denialReason };
  }

  // Soft delete file record without deleting parent company/products
  existing.status = "DELETED";
  existing.updatedAt = new Date().toISOString();
  fileStore.set(fileId, existing);

  recordDigitalAction({
    actorUid: currentAuth.uid || "SYSTEM",
    actionType: "FILE_DELETED",
    targetEntityId: fileId,
    companyId: existing.companyId,
    businessId: existing.businessId,
    details: { fileName: existing.name },
  });

  return { success: true };
}

export function getCompanyFiles(companyId: string, auth?: AuthContext): FileEntity[] {
  const currentAuth = auth || getCurrentAuthSession();
  const access = validateCompanyDataSpaceAccess(companyId, currentAuth);

  const isMember = access.isAllowed;

  return Array.from(fileStore.values()).filter((file) => {
    if (file.companyId !== companyId) return false;
    if (file.status === "DELETED") return false;
    if (!isMember && file.visibility !== "PUBLIC") return false;
    return true;
  });
}

/* ====================================================================
   EXTERNAL SOURCE CONNECTOR CONTRACTS
   ==================================================================== */

export function connectExternalSource(
  connData: Omit<ExternalSourceConnection, "id" | "connectedAt" | "lastSyncAt">,
  auth?: AuthContext
): { success: boolean; connection?: ExternalSourceConnection; error?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const access = validateCompanyDataSpaceAccess(connData.companyId, currentAuth, "ADMIN");

  if (!access.isAllowed) {
    return { success: false, error: access.denialReason };
  }

  const connId = `conn-${connData.companyId}-${Date.now()}`;
  const now = new Date().toISOString();

  const newConn: ExternalSourceConnection = {
    ...connData,
    id: connId,
    businessId: access.businessId,
    connectedBy: currentAuth.uid || "SYSTEM",
    connectedAt: now,
    lastSyncAt: now,
  };

  externalConnectionStore.set(connId, newConn);

  recordDigitalAction({
    actorUid: currentAuth.uid || "SYSTEM",
    actionType: "SOURCE_CONNECTED",
    targetEntityId: connId,
    companyId: connData.companyId,
    businessId: access.businessId,
    details: { provider: connData.provider, displayName: connData.displayName },
  });

  return { success: true, connection: newConn };
}

export function disconnectExternalSource(
  connectionId: string,
  auth?: AuthContext
): { success: boolean; error?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const conn = externalConnectionStore.get(connectionId);

  if (!conn) {
    return { success: false, error: `External connection '${connectionId}' not found.` };
  }

  const access = validateCompanyDataSpaceAccess(conn.companyId, currentAuth, "ADMIN");
  if (!access.isAllowed) {
    return { success: false, error: access.denialReason };
  }

  conn.status = "DISCONNECTED";
  conn.syncStatus = "DISCONNECTED";
  externalConnectionStore.set(connectionId, conn);

  recordDigitalAction({
    actorUid: currentAuth.uid || "SYSTEM",
    actionType: "SOURCE_DISCONNECTED",
    targetEntityId: connectionId,
    companyId: conn.companyId,
    businessId: conn.businessId,
    details: { provider: conn.provider },
  });

  return { success: true };
}

export function registerExternalResource(
  resData: Omit<ExternalResource, "id" | "lastSyncedAt">,
  auth?: AuthContext
): { success: boolean; resource?: ExternalResource; error?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const access = validateCompanyDataSpaceAccess(resData.companyId, currentAuth);

  if (!access.isAllowed) {
    return { success: false, error: access.denialReason };
  }

  const resId = `extres-${resData.companyId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  const newRes: ExternalResource = {
    ...resData,
    id: resId,
    businessId: access.businessId,
    lastSyncedAt: now,
  };

  externalResourceStore.set(resId, newRes);
  return { success: true, resource: newRes };
}

export function importExternalResourceToDataSpace(
  resourceId: string,
  auth?: AuthContext
): { success: boolean; document?: DocumentEntity; error?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const resource = externalResourceStore.get(resourceId);

  if (!resource) {
    return { success: false, error: `External resource '${resourceId}' not found.` };
  }

  const access = validateCompanyDataSpaceAccess(resource.companyId, currentAuth);
  if (!access.isAllowed) {
    return { success: false, error: access.denialReason };
  }

  // Update resource status from CONNECTED to IMPORTED
  resource.importStatus = "IMPORTED";
  externalResourceStore.set(resourceId, resource);

  // Create canonical DocumentEntity copy in company Data Space
  const docResult = createDocument(
    {
      companyId: resource.companyId,
      businessId: resource.businessId,
      title: resource.name,
      documentType: "OTHER",
      status: "ACTIVE",
      sourceType: "IMPORTED",
      fileReferences: [],
      visibility: "PRIVATE",
      groundingStatus: "NOT_INDEXED",
      groundingEligible: false,
      createdBy: currentAuth.uid || "SYSTEM",
      updatedBy: currentAuth.uid || "SYSTEM",
    },
    currentAuth
  );

  if (docResult.success) {
    recordDigitalAction({
      actorUid: currentAuth.uid || "SYSTEM",
      actionType: "RESOURCE_IMPORTED",
      targetEntityId: resourceId,
      companyId: resource.companyId,
      businessId: resource.businessId,
      details: { importedDocumentId: docResult.document?.id },
    });
  }

  return docResult;
}

/* ====================================================================
   AI GROUNDING ELIGIBILITY & ATTRIBUTION
   ==================================================================== */

export function setDocumentGroundingEligibility(
  docId: string,
  eligible: boolean,
  auth?: AuthContext
): { success: boolean; error?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const doc = documentStore.get(docId);

  if (!doc) {
    return { success: false, error: `Document '${docId}' not found.` };
  }

  const access = validateCompanyDataSpaceAccess(doc.companyId, currentAuth, "MANAGER");
  if (!access.isAllowed) {
    return { success: false, error: access.denialReason };
  }

  doc.groundingEligible = eligible;
  doc.groundingStatus = eligible ? "GROUNDED" : "DISABLED";
  doc.updatedAt = new Date().toISOString();
  documentStore.set(docId, doc);

  recordDigitalAction({
    actorUid: currentAuth.uid || "SYSTEM",
    actionType: eligible ? "GROUNDING_ENABLED" : "GROUNDING_DISABLED",
    targetEntityId: docId,
    companyId: doc.companyId,
    businessId: doc.businessId,
    details: { groundingEligible: eligible },
  });

  return { success: true };
}

export function resolveGroundingContext(
  query: GroundingContextQuery,
  auth?: AuthContext
): GroundingContextResult {
  const currentAuth = auth || getCurrentAuthSession();

  // Validate company access unless querying strictly public documents
  let access = validateCompanyDataSpaceAccess(query.companyId, currentAuth);
  if (!access.isAllowed && !query.includePublicOnly) {
    return {
      isAllowed: false,
      companyId: query.companyId,
      businessId: query.businessId || "",
      groundedDocuments: [],
      groundedResources: [],
      attributions: [],
      denialReason: access.denialReason,
    };
  }

  const isMember = access.isAllowed;

  // Filter grounded documents matching scope
  const groundedDocs = Array.from(documentStore.values()).filter((doc) => {
    if (doc.companyId !== query.companyId) return false;
    if (doc.status !== "ACTIVE") return false;
    if (doc.groundingStatus !== "GROUNDED" || !doc.groundingEligible) return false;

    // Visibility rule: non-members or public-only queries can ONLY access PUBLIC documents
    if (!isMember || query.includePublicOnly) {
      if (doc.visibility !== "PUBLIC") return false;
    }

    // Product AI scope isolation: Product AI can ONLY use documents tied to that product or unassigned company docs
    if (query.productId) {
      if (doc.productId && doc.productId !== query.productId) return false;
    }

    // Service AI scope isolation
    if (query.serviceId) {
      if (doc.serviceId && doc.serviceId !== query.serviceId) return false;
    }

    return true;
  });

  // Map attributions distinguishing source types
  const attributions: GroundingSourceAttribution[] = groundedDocs.map((doc) => ({
    sourceType: doc.visibility === "PUBLIC" ? "PUBLIC_SOURCE" : "COMPANY_SOURCE",
    entityId: doc.id,
    companyId: doc.companyId,
    businessId: doc.businessId,
    title: doc.title,
    visibility: doc.visibility,
    productId: doc.productId,
    serviceId: doc.serviceId,
    provenance: `Company Data Space (${doc.companyId}) / Document (${doc.id})`,
  }));

  return {
    isAllowed: true,
    companyId: query.companyId,
    businessId: access.businessId || query.businessId,
    groundedDocuments: groundedDocs,
    groundedResources: [],
    attributions,
  };
}

/* ====================================================================
   COMPANY DATA SPACE EXPORT MANIFEST
   ==================================================================== */

export function generateCompanyDataSpaceManifest(
  companyId: string,
  auth?: AuthContext
): CompanyDataSpaceManifest | null {
  const currentAuth = auth || getCurrentAuthSession();
  const access = validateCompanyDataSpaceAccess(companyId, currentAuth, "ADMIN");

  if (!access.isAllowed) return null;

  const docs = getCompanyDocuments(companyId, currentAuth);
  const files = getCompanyFiles(companyId, currentAuth);
  const conns = Array.from(externalConnectionStore.values()).filter((c) => c.companyId === companyId);
  const res = Array.from(externalResourceStore.values()).filter((r) => r.companyId === companyId);

  const totalBytes = files.reduce((acc, f) => acc + f.sizeBytes, 0);
  const groundedCount = docs.filter((d) => d.groundingStatus === "GROUNDED").length;

  return {
    companyId,
    businessId: access.businessId,
    documents: docs,
    files,
    externalConnections: conns,
    externalResources: res,
    totalStorageUsedMb: parseFloat((totalBytes / (1024 * 1024)).toFixed(2)),
    storageLimitMb: 10000,
    aiGroundedCount: groundedCount,
    exportedAt: new Date().toISOString(),
  };
}
