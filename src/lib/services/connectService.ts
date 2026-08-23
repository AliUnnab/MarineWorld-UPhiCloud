import type { ConnectEntity, InquiryEntity } from "@/lib/types";
import {
  findConnectById,
  findConnectsByCompany,
  saveConnect as saveRepoConnect,
} from "@/lib/repositories/connectRepository";
import {
  getCurrentAuthSession,
  evaluateFirestoreAccess,
  type AuthContext,
} from "@/lib/services/securityService";
import { resolveAccessContext } from "@/lib/services/accessContextService";
import { checkActionEligibility, recordRiskSignal } from "@/lib/services/personalTrustService";

/**
 * Connect Service — Domain Service for Canonical Commercial Interactions & Inquiries.
 * Strictly adheres to schema:
 * sender (fromUserId, fromCompanyId) -> recipient (toCompanyId, companyNodeId) -> context -> status -> timestamps.
 */

const connectStore = new Map<string, ConnectEntity[]>();

const FORBIDDEN_PLACEHOLDER_USERS = new Set([
  "authenticated-user",
  "user-demo",
  "test-user",
]);

export interface SenderConnectContext {
  senderUserId: string;
  senderCompanyId: string | null;
  senderBusinessId: string | null;
  activeOrganization: string | null;
  isPersonalSender: boolean;
}

/**
 * Reset / Clear user connect context cache
 */
export function clearUserConnectContext(_userId?: string): void {
  // Cleans transient connect caches if needed
}

/**
 * Resolves the authenticated sender's commercial Connect / RFQ context
 */
export function resolveSenderConnectContext(auth?: AuthContext): SenderConnectContext {
  const currentAuth = auth || getCurrentAuthSession();
  const accessContext = resolveAccessContext(currentAuth);
  const activeOrg = accessContext.activeOrganization;

  if (!currentAuth.uid) {
    throw new Error("Unauthenticated: Firebase Auth context required to resolve sender connect context.");
  }

  if (!activeOrg) {
    return {
      senderUserId: currentAuth.uid,
      senderCompanyId: null,
      senderBusinessId: null,
      activeOrganization: null,
      isPersonalSender: true,
    };
  }

  return {
    senderUserId: currentAuth.uid,
    senderCompanyId: activeOrg.companyId || null,
    senderBusinessId: activeOrg.businessId || null,
    activeOrganization: activeOrg.organizationId || activeOrg.companyId || null,
    isPersonalSender: false,
  };
}

/**
 * Validate Connect entity against auth context & target company rules
 */
export function validateConnectSecurity(connect: Partial<ConnectEntity>, auth?: AuthContext): void {
  const currentAuth = auth || getCurrentAuthSession();

  // 1. Authenticated User Identity
  if (!currentAuth.uid) {
    throw new Error("Unauthenticated: Firebase Auth context required to create Connect request.");
  }

  if (
    !connect.fromUserId ||
    FORBIDDEN_PLACEHOLDER_USERS.has(connect.fromUserId) ||
    connect.fromUserId !== currentAuth.uid
  ) {
    throw new Error(
      `Forbidden sender identity: fromUserId '${connect.fromUserId}' does not match authenticated user '${currentAuth.uid}'.`
    );
  }

  // 2. Personal Sender vs Company Sender Isolation Check
  const accessContext = resolveAccessContext(currentAuth);
  const activeOrg = accessContext.activeOrganization;

  if (!activeOrg && connect.fromCompanyId) {
    throw new Error(
      `Personal sender impersonation denied: User '${currentAuth.uid}' cannot send on behalf of company '${connect.fromCompanyId}' without active organization context.`
    );
  }

  if (activeOrg && connect.fromCompanyId && activeOrg.companyId !== connect.fromCompanyId && activeOrg.organizationId !== connect.fromCompanyId) {
    throw new Error(
      `Company sender mismatch: Active organization '${activeOrg.companyId}' does not match requested fromCompanyId '${connect.fromCompanyId}'.`
    );
  }

  // 3. Target Company Integrity
  if (connect.companyId && connect.toCompanyId && connect.companyId !== connect.toCompanyId) {
    throw new Error(
      `Target company integrity mismatch: companyId '${connect.companyId}' does not match toCompanyId '${connect.toCompanyId}'.`
    );
  }

  // 4. Firestore Rules Evaluation Simulator
  const targetCompany = connect.companyId || connect.toCompanyId || "unknown";
  const evalResult = evaluateFirestoreAccess(
    `/companies/${targetCompany}/connect/${connect.id || "new"}`,
    "create",
    currentAuth,
    undefined,
    connect as Record<string, any>
  );

  if (!evalResult.allowed) {
    throw new Error(`Security rules evaluation denied: ${evalResult.reason}`);
  }
}

/**
 * Create a Personal Visitor Connect / RFQ request with null senderCompanyId
 */
export async function createPersonalConnectRequest(params: {
  toCompanyId: string;
  type?: "RFQ" | "INQUIRY";
  subject: string;
  message: string;
  productId?: string;
  serviceId?: string;
  auth?: AuthContext;
}): Promise<ConnectEntity> {
  const currentAuth = params.auth || getCurrentAuthSession();
  const senderCtx = resolveSenderConnectContext(currentAuth);

  const actionType = params.type === "RFQ" || params.subject.toLowerCase().includes("rfq")
    ? "RFQ_REQUEST"
    : "CONNECT_REQUEST";
  const eligibility = checkActionEligibility(senderCtx.senderUserId, actionType);
  if (!eligibility.allowed) {
    throw new Error(eligibility.message || "Action not allowed by trust policy.");
  }
  recordRiskSignal(senderCtx.senderUserId, "HIGH_CONNECT_ATTEMPTS");

  const now = new Date().toISOString();

  const connectEntity: ConnectEntity = {
    id: `connect-${params.toCompanyId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    companyId: params.toCompanyId,
    toCompanyId: params.toCompanyId,
    companyNodeId: `node-${params.toCompanyId}-hq`,
    fromUserId: senderCtx.senderUserId,
    fromCompanyId: senderCtx.senderCompanyId || undefined,
    fromBusinessId: senderCtx.senderBusinessId || undefined,
    type: params.type || (params.subject.toLowerCase().includes("rfq") ? "RFQ" : "INQUIRY"),
    subject: params.subject,
    message: params.message,
    source: params.productId ? "PRODUCT" : params.serviceId ? "SERVICE" : "DIRECTORY",
    sourceEntityId: params.productId || params.serviceId,
    productId: params.productId,
    serviceId: params.serviceId,
    status: "NEW",
    priority: "NORMAL",
    createdAt: now,
    updatedAt: now,
  };

  validateConnectSecurity(connectEntity, currentAuth);
  await saveRepoConnect(connectEntity);
  return saveConnectInteraction(connectEntity);
}

/**
 * Section 6 Canonical Async Methods
 */
export async function createConnect(connect: ConnectEntity, auth?: AuthContext): Promise<ConnectEntity> {
  validateConnectSecurity(connect, auth);
  await saveRepoConnect(connect);
  return saveConnectInteraction(connect);
}

export async function getConnect(companyId: string, connectId: string): Promise<ConnectEntity | null> {
  const fromRepo = await findConnectById(companyId, connectId);
  if (fromRepo) return fromRepo;
  const records = getCompanyConnectRecords(companyId);
  return records.find((c) => c.id === connectId) || null;
}

export async function listConnects(companyId: string): Promise<ConnectEntity[]> {
  const fromRepo = await findConnectsByCompany(companyId);
  if (fromRepo && fromRepo.length > 0) return fromRepo;
  return getCompanyConnectRecords(companyId);
}

export async function updateConnect(companyId: string, connectId: string, updates: Partial<ConnectEntity>): Promise<ConnectEntity | null> {
  const current = await getConnect(companyId, connectId);
  if (!current) return null;
  const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
  await saveRepoConnect(updated);
  saveConnectInteraction(updated);
  return updated;
}

/**
 * Convert legacy InquiryEntity to canonical ConnectEntity
 */
export function inquiryToConnectEntity(inquiry: InquiryEntity): ConnectEntity {
  return {
    id: inquiry.id,
    companyId: inquiry.companyId,
    fromUserId: inquiry.requesterId,
    fromCompanyId: inquiry.requesterCompany ? `comp-${inquiry.requesterCompany.toLowerCase().replace(/[^a-z0-9]/g, "")}` : undefined,
    toCompanyId: inquiry.companyId,
    companyNodeId: `node-${inquiry.companyId}-hq`,
    type: inquiry.subject.toLowerCase().includes("rfq") ? "RFQ" : "INQUIRY",
    subject: inquiry.subject,
    message: inquiry.message,
    source: inquiry.source === "PRODUCT" ? "PRODUCT" : inquiry.source === "SERVICE" ? "SERVICE" : "DIRECTORY",
    sourceEntityId: inquiry.productId || inquiry.serviceId,
    productId: inquiry.productId,
    productSlug: inquiry.productSlug,
    productName: inquiry.productName,
    serviceId: inquiry.serviceId,
    serviceSlug: inquiry.serviceSlug,
    serviceName: inquiry.serviceName,
    priority: inquiry.priority,
    status: inquiry.status === "RESOLVED" ? "RESOLVED" : inquiry.status === "CLOSED" ? "CLOSED" : inquiry.status === "IN_PROGRESS" ? "IN_PROGRESS" : "NEW",
    createdAt: inquiry.createdAt,
    updatedAt: inquiry.updatedAt,
  };
}

/**
 * Get canonical connect records for a target company
 */
export function getCompanyConnectRecords(companyId: string): ConnectEntity[] {
  return connectStore.get(companyId) || [];
}

/**
 * Save or record a new Connect interaction
 */
export function saveConnectInteraction(interaction: Omit<ConnectEntity, "id" | "createdAt" | "updatedAt"> & { id?: string }): ConnectEntity {
  const companyId = interaction.companyId || interaction.toCompanyId || "company_001";
  const existing = connectStore.get(companyId) || [];
  const now = new Date().toISOString();

  const canonicalConnect: ConnectEntity = {
    ...interaction,
    companyId,
    id: interaction.id || `connect-${companyId}-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };

  const index = existing.findIndex((c) => c.id === canonicalConnect.id);
  if (index >= 0) {
    existing[index] = canonicalConnect;
  } else {
    existing.push(canonicalConnect);
  }

  connectStore.set(companyId, existing);
  return canonicalConnect;
}

/**
 * Update interaction status
 */
export function updateConnectStatus(companyId: string, connectId: string, status: ConnectEntity["status"]): ConnectEntity | undefined {
  const records = connectStore.get(companyId) || [];
  const record = records.find((c) => c.id === connectId);
  if (!record) return undefined;

  record.status = status;
  record.updatedAt = new Date().toISOString();
  if (status === "RESOLVED" || status === "CLOSED") {
    record.resolvedAt = new Date().toISOString();
  }

  connectStore.set(companyId, records);
  return record;
}
