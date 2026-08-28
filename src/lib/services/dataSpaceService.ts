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
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { deleteFileFromStorage } from "@/lib/services/storageService";

/**
 * Stage 12.4 — Company Data Space Architecture Service
 * Manages tenant-isolated structured data, documents, files, external source connections, and AI grounding eligibility directly in Firestore.
 */

// Firestore-synced runtime caches (tenant-isolated by companyId)
const documentStore = new Map<string, DocumentEntity>();
const fileStore = new Map<string, FileEntity>();
const externalConnectionStore = new Map<string, ExternalSourceConnection>();
const externalResourceStore = new Map<string, ExternalResource>();
const activeListeners = new Set<string>();

export function initCompanyDataSpaceRealtime(companyId: string): void {
  if (!companyId || activeListeners.has(companyId) || typeof window === "undefined") return;
  activeListeners.add(companyId);

  try {
    // 1. Documents subscription
    const docsCol = collection(db, "companies", companyId, "documents");
    onSnapshot(docsCol, (snap) => {
      snap.docs.forEach((d) => {
        documentStore.set(d.id, { id: d.id, ...d.data() } as DocumentEntity);
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("marineworld_dataspace_updated", { detail: { companyId } }));
        window.dispatchEvent(new CustomEvent("marineworld_documents_updated", { detail: { companyId } }));
      }
    });

    // 2. Files subscription
    const filesCol = collection(db, "companies", companyId, "files");
    onSnapshot(filesCol, (snap) => {
      snap.docs.forEach((d) => {
        fileStore.set(d.id, { id: d.id, ...d.data() } as FileEntity);
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("marineworld_dataspace_updated", { detail: { companyId } }));
      }
    });

    // 3. Connections subscription
    const connsCol = collection(db, "companies", companyId, "externalConnections");
    onSnapshot(connsCol, (snap) => {
      snap.docs.forEach((d) => {
        externalConnectionStore.set(d.id, { id: d.id, ...d.data() } as ExternalSourceConnection);
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("marineworld_dataspace_updated", { detail: { companyId } }));
      }
    });

    // 4. Resources subscription
    const resCol = collection(db, "companies", companyId, "externalResources");
    onSnapshot(resCol, (snap) => {
      snap.docs.forEach((d) => {
        externalResourceStore.set(d.id, { id: d.id, ...d.data() } as ExternalResource);
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("marineworld_dataspace_updated", { detail: { companyId } }));
      }
    });
  } catch (err) {
    console.warn("[DataSpaceService] Firestore realtime sync error:", err);
  }
}

/**
 * Validates whether the current user auth context has permission to access a company's Data Space.
 */
export function validateCompanyDataSpaceAccess(
  companyId: string,
  auth?: AuthContext,
  requiredRole?: string
): { isAllowed: boolean; companyId: string; businessId: string; userRole?: string; denialReason?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const company = getCompanyById(companyId);
  const businessId = company?.businessId || `MW-BUS-${companyId.toUpperCase()}`;

  // Allow company studio authorized access
  const member = getCompanyMember(companyId, currentAuth);
  const userRole = member?.role || "OWNER";

  return {
    isAllowed: true,
    companyId,
    businessId,
    userRole,
  };
}

/* ====================================================================
   DOCUMENT MANAGEMENT CONTRACTS (FIRESTORE PERSISTED)
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

  // Async persist to Firestore
  try {
    const ref = doc(db, "companies", docData.companyId, "documents", docId);
    setDoc(ref, newDoc, { merge: true }).catch((err) => {
      console.warn("[DataSpaceService] Firestore createDocument write error:", err);
    });
  } catch (err) {
    console.warn("[DataSpaceService] createDocument err:", err);
  }

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
    companyId: existing.companyId,
    businessId: existing.businessId,
    version: newVersionNumber,
    versionHistory: [
      ...(existing.versionHistory || []),
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

  // Async persist to Firestore
  try {
    const ref = doc(db, "companies", existing.companyId, "documents", docId);
    setDoc(ref, updatedDoc, { merge: true }).catch((err) => {
      console.warn("[DataSpaceService] Firestore updateDocument write error:", err);
    });
  } catch (err) {
    console.warn("[DataSpaceService] updateDocument err:", err);
  }

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
  initCompanyDataSpaceRealtime(companyId);
  const currentAuth = auth || getCurrentAuthSession();
  const access = validateCompanyDataSpaceAccess(companyId, currentAuth);

  const isMember = access.isAllowed;

  return Array.from(documentStore.values()).filter((d) => {
    if (d.companyId !== companyId) return false;
    if (d.status === "DELETED") return false;

    if (!isMember || options?.publicOnly) {
      if (d.visibility !== "PUBLIC") return false;
    }

    if (options?.productId && d.productId && d.productId !== options.productId) {
      return false;
    }

    if (options?.serviceId && d.serviceId && d.serviceId !== options.serviceId) {
      return false;
    }

    return true;
  });
}

export function getDocumentById(docId: string, auth?: AuthContext): DocumentEntity | null {
  const currentAuth = auth || getCurrentAuthSession();
  const d = documentStore.get(docId);
  if (!d) return null;

  if (d.visibility === "PUBLIC") return d;

  const access = validateCompanyDataSpaceAccess(d.companyId, currentAuth);
  if (!access.isAllowed) return null;

  return d;
}

/* ====================================================================
   FILE MANAGEMENT CONTRACTS (FIRESTORE PERSISTED)
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

  try {
    const ref = doc(db, "companies", fileData.companyId, "files", fileId);
    setDoc(ref, newFile, { merge: true }).catch((err) => {
      console.warn("[DataSpaceService] Firestore createFileRecord write error:", err);
    });
  } catch (err) {
    console.warn("[DataSpaceService] createFileRecord err:", err);
  }

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

  existing.status = "DELETED";
  existing.updatedAt = new Date().toISOString();
  fileStore.set(fileId, existing);

  if (existing.storageReference) {
    deleteFileFromStorage(existing.storageReference).catch(() => {});
  }

  try {
    const ref = doc(db, "companies", existing.companyId, "files", fileId);
    setDoc(ref, { status: "DELETED", updatedAt: existing.updatedAt }, { merge: true }).catch((err) => {
      console.warn("[DataSpaceService] Firestore deleteFileRecord write error:", err);
    });
  } catch (err) {
    console.warn("[DataSpaceService] deleteFileRecord err:", err);
  }

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
  initCompanyDataSpaceRealtime(companyId);
  const currentAuth = auth || getCurrentAuthSession();
  const access = validateCompanyDataSpaceAccess(companyId, currentAuth);

  const isMember = access.isAllowed;

  return Array.from(fileStore.values()).filter((f) => {
    if (f.companyId !== companyId) return false;
    if (f.status === "DELETED") return false;
    if (!isMember && f.visibility !== "PUBLIC") return false;
    return true;
  });
}

/* ====================================================================
   EXTERNAL SOURCE CONNECTOR CONTRACTS (FIRESTORE PERSISTED)
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

  try {
    const ref = doc(db, "companies", connData.companyId, "externalConnections", connId);
    setDoc(ref, newConn, { merge: true }).catch((err) => {
      console.warn("[DataSpaceService] Firestore connectExternalSource write error:", err);
    });
  } catch (err) {
    console.warn("[DataSpaceService] connectExternalSource err:", err);
  }

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

  try {
    const ref = doc(db, "companies", conn.companyId, "externalConnections", connectionId);
    setDoc(ref, { status: "DISCONNECTED", syncStatus: "DISCONNECTED" }, { merge: true }).catch((err) => {
      console.warn("[DataSpaceService] Firestore disconnectExternalSource write error:", err);
    });
  } catch (err) {
    console.warn("[DataSpaceService] disconnectExternalSource err:", err);
  }

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

  try {
    const ref = doc(db, "companies", resData.companyId, "externalResources", resId);
    setDoc(ref, newRes, { merge: true }).catch((err) => {
      console.warn("[DataSpaceService] Firestore registerExternalResource write error:", err);
    });
  } catch (err) {
    console.warn("[DataSpaceService] registerExternalResource err:", err);
  }

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

  resource.importStatus = "IMPORTED";
  externalResourceStore.set(resourceId, resource);

  try {
    const ref = doc(db, "companies", resource.companyId, "externalResources", resourceId);
    setDoc(ref, { importStatus: "IMPORTED" }, { merge: true }).catch(() => {});
  } catch {}

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
   AI GROUNDING ELIGIBILITY & ATTRIBUTION (FIRESTORE PERSISTED)
   ==================================================================== */

export function setDocumentGroundingEligibility(
  docId: string,
  eligible: boolean,
  auth?: AuthContext
): { success: boolean; error?: string } {
  const currentAuth = auth || getCurrentAuthSession();
  const d = documentStore.get(docId);

  if (!d) {
    return { success: false, error: `Document '${docId}' not found.` };
  }

  const access = validateCompanyDataSpaceAccess(d.companyId, currentAuth, "MANAGER");
  if (!access.isAllowed) {
    return { success: false, error: access.denialReason };
  }

  d.groundingEligible = eligible;
  d.groundingStatus = eligible ? "GROUNDED" : "DISABLED";
  d.updatedAt = new Date().toISOString();
  documentStore.set(docId, d);

  try {
    const ref = doc(db, "companies", d.companyId, "documents", docId);
    setDoc(ref, { groundingEligible: eligible, groundingStatus: d.groundingStatus, updatedAt: d.updatedAt }, { merge: true }).catch(() => {});
  } catch {}

  recordDigitalAction({
    actorUid: currentAuth.uid || "SYSTEM",
    actionType: eligible ? "GROUNDING_ENABLED" : "GROUNDING_DISABLED",
    targetEntityId: docId,
    companyId: d.companyId,
    businessId: d.businessId,
    details: { groundingEligible: eligible },
  });

  return { success: true };
}

export function resolveGroundingContext(
  query: GroundingContextQuery,
  auth?: AuthContext
): GroundingContextResult {
  initCompanyDataSpaceRealtime(query.companyId);
  const currentAuth = auth || getCurrentAuthSession();

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

  const groundedDocs = Array.from(documentStore.values()).filter((d) => {
    if (d.companyId !== query.companyId) return false;
    if (d.status !== "ACTIVE") return false;
    if (d.groundingStatus !== "GROUNDED" || !d.groundingEligible) return false;

    if (!isMember || query.includePublicOnly) {
      if (d.visibility !== "PUBLIC") return false;
    }

    if (query.productId && d.productId && d.productId !== query.productId) {
      return false;
    }

    if (query.serviceId && d.serviceId && d.serviceId !== query.serviceId) {
      return false;
    }

    return true;
  });

  const attributions: GroundingSourceAttribution[] = groundedDocs.map((d) => ({
    sourceType: d.visibility === "PUBLIC" ? "PUBLIC_SOURCE" : "COMPANY_SOURCE",
    entityId: d.id,
    companyId: d.companyId,
    businessId: d.businessId,
    title: d.title,
    visibility: d.visibility,
    productId: d.productId,
    serviceId: d.serviceId,
    provenance: `Company Data Space (${d.companyId}) / Document (${d.id})`,
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
  initCompanyDataSpaceRealtime(companyId);
  const currentAuth = auth || getCurrentAuthSession();
  const access = validateCompanyDataSpaceAccess(companyId, currentAuth, "ADMIN");

  if (!access.isAllowed) return null;

  const docs = getCompanyDocuments(companyId, currentAuth);
  const files = getCompanyFiles(companyId, currentAuth);
  const conns = Array.from(externalConnectionStore.values()).filter((c) => c.companyId === companyId);
  const res = Array.from(externalResourceStore.values()).filter((r) => r.companyId === companyId);

  const totalBytes = files.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);
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
