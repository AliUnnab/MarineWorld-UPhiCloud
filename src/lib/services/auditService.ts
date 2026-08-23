import type {
  AuditEvent,
  AuditModuleType,
  CanonicalAuditActionType,
  AuditAuthorizationContext,
  AuditQueryOptions,
  CompanyMemberRole,
  DigitalActionType,
} from "@/lib/types";
import {
  saveAuditEvent,
  getAuditEventsByCompany,
  getAuditEventById,
  getAllAuditEventsSync,
} from "@/lib/repositories/auditRepository";
import { getCurrentAuthSession } from "@/lib/services/securityService";
import { findMember } from "@/lib/repositories/membershipRepository";
import { generateBusinessId, recordDigitalActionAttribution } from "./companyService";

export type {
  AuditEvent,
  AuditModuleType,
  CanonicalAuditActionType,
  AuditAuthorizationContext,
  AuditQueryOptions,
};

/**
 * Stage 14 — Canonical Audit & Governance Dispatcher Service
 * Authoritative dispatcher for institutional activity, governance, and traceability across MarineWorld.City.
 */

export interface RecordAuditParams {
  eventId?: string;
  companyId: string;
  businessId?: string;
  actorUserId?: string;
  actorRole?: CompanyMemberRole | string;
  actorDisplayName?: string;
  actorBusinessEmail?: string;
  actionType: CanonicalAuditActionType | string;
  module: AuditModuleType;
  entityType: string;
  entityId: string;
  previousState?: Record<string, any> | null;
  newState?: Record<string, any> | null;
  reason?: string | null;
  metadata?: Record<string, any>;
  authorizationContext?: Partial<AuditAuthorizationContext>;
  source: string;
  correlationId?: string;
  requestId?: string;
}

/**
 * Deep sanitization helper to ensure NO secrets, tokens, private keys, or raw confidential bodies leak into audit logs.
 */
function sanitizeAuditPayload<T>(input: T): T {
  if (!input || typeof input !== "object") {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeAuditPayload(item)) as unknown as T;
  }

  const sensitiveKeys = [
    "password",
    "token",
    "secret",
    "clientsecret",
    "apikey",
    "authorization",
    "bearer",
    "privatekey",
    "cvv",
    "cardnumber",
    "prompt",
    "rawprompt",
    "systemprompt",
    "rawmessage",
    "messagebody",
    "documentbody",
    "filecontent",
  ];

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(input)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some((s) => lowerKey.includes(s));

    if (isSensitive) {
      cleaned[key] = "[REDACTED_CONFIDENTIAL]";
    } else if (value && typeof value === "object") {
      cleaned[key] = sanitizeAuditPayload(value);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned as T;
}

/**
 * Canonical Audit Event Dispatcher
 * Dispatches an authoritative audit event to Firestore and memory cache.
 */
export async function recordCanonicalAuditEvent(
  params: RecordAuditParams
): Promise<AuditEvent> {
  const companyId = params.companyId;
  const businessId = params.businessId || generateBusinessId(companyId);

  // 1. Resolve Actor Attribution Context
  const session = getCurrentAuthSession();
  const actorUserId =
    params.actorUserId || session?.uid || "usr-owner-001";

  let actorRole: CompanyMemberRole | string = params.actorRole || "OWNER";
  let actorDisplayName: string | undefined = params.actorDisplayName || session?.displayName;
  let actorBusinessEmail: string | undefined = params.actorBusinessEmail || session?.email;

  // Resolve membership details if not explicitly passed
  if (!params.actorRole || !actorDisplayName) {
    const member = findMember(companyId, actorUserId);
    if (member) {
      actorRole = member.role;
      actorDisplayName = actorDisplayName || member.displayName || (member as any).fullName;
      actorBusinessEmail = actorBusinessEmail || member.businessEmail || (member as any).email;
    }
  }

  // 2. Generate Event ID & Authoritative Server Timestamp
  const eventId =
    params.eventId ||
    `aud-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const timestamp = new Date().toISOString();

  // 3. Construct Canonical Audit Event with Sanitization
  const event: AuditEvent = {
    eventId,
    companyId,
    businessId,
    actorUserId,
    actorRole,
    actorDisplayName,
    actorBusinessEmail,
    actionType: params.actionType,
    module: params.module,
    entityType: params.entityType,
    entityId: params.entityId,
    timestamp,
    previousState: params.previousState ? sanitizeAuditPayload(params.previousState) : undefined,
    newState: params.newState ? sanitizeAuditPayload(params.newState) : undefined,
    reason: params.reason,
    metadata: params.metadata ? sanitizeAuditPayload(params.metadata) : undefined,
    authorizationContext: {
      authenticated: true,
      userRole: actorRole,
      verifiedActor: true,
      details: params.authorizationContext?.details || `Authorized action in module ${params.module}`,
      source: params.source,
      ...params.authorizationContext,
    },
    source: params.source,
    correlationId: params.correlationId,
    requestId: params.requestId,
  };

  // 4. Authoritative Firestore Persistence via Repository
  const saved = await saveAuditEvent(event);

  // 5. Legacy Bridge: Also emit to legacy in-memory attribution log for backward compatibility
  try {
    const legacyActionType: DigitalActionType = mapToLegacyActionType(params.actionType);
    recordDigitalActionAttribution({
      actorUserId,
      organizationId: companyId,
      companyId,
      businessId,
      actionType: legacyActionType,
      authorizationContext: {
        authenticated: true,
        userRole: typeof actorRole === "string" ? (actorRole as CompanyMemberRole) : "OWNER",
        verifiedActor: true,
        details: params.reason || `Module: ${params.module} | Entity: ${params.entityId}`,
      },
      auditReference: eventId,
      target: `${params.entityType}:${params.entityId}`,
    });
  } catch (err) {
    // Non-blocking legacy compatibility
  }

  return saved;
}

/**
 * Maps modern canonical action types to legacy DigitalActionType enums for backward compatibility
 */
function mapToLegacyActionType(action: string): DigitalActionType {
  switch (action) {
    case "COMPANY_CREATED":
    case "COMPANY_UPDATED":
    case "IDENTITY_UPDATED":
    case "POSITIONING_UPDATED":
    case "FACILITY_CREATED":
    case "FACILITY_UPDATED":
      return "DATA_UPDATE";
    case "PRODUCT_CREATED":
    case "PRODUCT_UPDATED":
    case "OFFERING_PUBLISHED":
      return "PRODUCT_PUBLICATION";
    case "SERVICE_CREATED":
    case "SERVICE_UPDATED":
      return "SERVICE_PUBLICATION";
    case "VERIFICATION_SUBMITTED":
      return "COMPANY_VERIFICATION_SUBMITTED";
    case "MEMBER_INVITED":
      return "MEMBER_INVITED";
    case "MEMBER_ROLE_CHANGED":
      return "ROLE_GRANTED";
    case "MEMBER_SUSPENDED":
      return "MEMBER_SUSPENDED";
    case "MEMBER_REVOKED":
      return "MEMBER_REVOKED";
    case "AI_ENABLED":
    case "AI_CONFIGURATION_UPDATED":
      return "AI_AUTHORIZED_ACTION";
    case "INQUIRY_CREATED":
      return "CONNECT_CREATE";
    case "INQUIRY_MESSAGE_SENT":
      return "RFQ_SUBMIT";
    default:
      return "DATA_UPDATE";
  }
}

// -------------------------------------------------------------
// MODULE-SPECIFIC DISPATCHER HELPERS
// -------------------------------------------------------------

/** 01 Identity */
export async function recordIdentityAudit(
  companyId: string,
  actionType: CanonicalAuditActionType,
  entityId: string,
  diff?: { previous?: Record<string, any>; next?: Record<string, any> },
  reason?: string,
  source = "STUDIO_IDENTITY"
): Promise<AuditEvent> {
  return recordCanonicalAuditEvent({
    companyId,
    module: "IDENTITY",
    actionType,
    entityType: "COMPANY_IDENTITY",
    entityId,
    previousState: diff?.previous,
    newState: diff?.next,
    reason,
    source,
  });
}

/** 02 Positioning */
export async function recordPositioningAudit(
  companyId: string,
  entityId: string,
  diff?: { previous?: Record<string, any>; next?: Record<string, any> },
  reason?: string
): Promise<AuditEvent> {
  return recordCanonicalAuditEvent({
    companyId,
    module: "POSITIONING",
    actionType: "POSITIONING_UPDATED",
    entityType: "COMPANY_POSITIONING",
    entityId,
    previousState: diff?.previous,
    newState: diff?.next,
    reason,
    source: "STUDIO_POSITIONING",
  });
}

/** 03 Presence */
export async function recordPresenceAudit(
  companyId: string,
  actionType: CanonicalAuditActionType,
  facilityId: string,
  diff?: { previous?: Record<string, any>; next?: Record<string, any> },
  metadata?: Record<string, any>
): Promise<AuditEvent> {
  return recordCanonicalAuditEvent({
    companyId,
    module: "PRESENCE",
    actionType,
    entityType: "PHYSICAL_FACILITY",
    entityId: facilityId,
    previousState: diff?.previous,
    newState: diff?.next,
    metadata,
    source: "STUDIO_PRESENCE",
  });
}

/** 04 Offerings */
export async function recordOfferingAudit(
  companyId: string,
  actionType: CanonicalAuditActionType,
  offeringType: "PRODUCT" | "SERVICE",
  offeringId: string,
  diff?: { previous?: Record<string, any>; next?: Record<string, any> },
  metadata?: Record<string, any>
): Promise<AuditEvent> {
  return recordCanonicalAuditEvent({
    companyId,
    module: "OFFERINGS",
    actionType,
    entityType: offeringType,
    entityId: offeringId,
    previousState: diff?.previous,
    newState: diff?.next,
    metadata,
    source: "STUDIO_OFFERINGS",
  });
}

/** 05 Knowledge */
export async function recordKnowledgeAudit(
  companyId: string,
  actionType: CanonicalAuditActionType,
  sourceId: string,
  metadata?: Record<string, any>,
  reason?: string
): Promise<AuditEvent> {
  return recordCanonicalAuditEvent({
    companyId,
    module: "KNOWLEDGE",
    actionType,
    entityType: "KNOWLEDGE_SOURCE",
    entityId: sourceId,
    metadata,
    reason,
    source: "STUDIO_KNOWLEDGE",
  });
}

/** 06 AI */
export async function recordAIAudit(
  companyId: string,
  actionType: CanonicalAuditActionType,
  entityId: string,
  diff?: { previous?: Record<string, any>; next?: Record<string, any> },
  metadata?: Record<string, any>
): Promise<AuditEvent> {
  return recordCanonicalAuditEvent({
    companyId,
    module: "AI",
    actionType,
    entityType: "COMPANY_AI",
    entityId,
    previousState: diff?.previous,
    newState: diff?.next,
    metadata,
    source: "STUDIO_AI",
  });
}

/** 07 Digital Presence */
export async function recordDigitalPresenceAudit(
  companyId: string,
  actionType: CanonicalAuditActionType,
  entityId: string,
  diff?: { previous?: Record<string, any>; next?: Record<string, any> },
  metadata?: Record<string, any>
): Promise<AuditEvent> {
  return recordCanonicalAuditEvent({
    companyId,
    module: "DIGITAL_PRESENCE",
    actionType,
    entityType: "DIGITAL_PRESENCE",
    entityId,
    previousState: diff?.previous,
    newState: diff?.next,
    metadata,
    source: "STUDIO_DIGITAL_PRESENCE",
  });
}

/** 08 Publish */
export async function recordPublishAudit(
  companyId: string,
  actionType: CanonicalAuditActionType,
  statusOrEntityId: string,
  diffOrMetadata?: { previous?: Record<string, any>; next?: Record<string, any> } | Record<string, any>,
  reason?: string
): Promise<AuditEvent> {
  const isDiff = diffOrMetadata && ("previous" in diffOrMetadata || "next" in diffOrMetadata);
  return recordCanonicalAuditEvent({
    companyId,
    module: "PUBLISH",
    actionType,
    entityType: "COMPANY_PUBLISH",
    entityId: companyId,
    previousState: isDiff ? (diffOrMetadata as any).previous : undefined,
    newState: isDiff ? (diffOrMetadata as any).next : { status: statusOrEntityId },
    metadata: !isDiff ? (diffOrMetadata as Record<string, any>) : undefined,
    reason,
    source: "STUDIO_PUBLISH",
  });
}

/** Digital Properties */
export async function recordDigitalPropertyAudit(
  companyId: string,
  actionType: CanonicalAuditActionType,
  propertyKey: string,
  metadata?: Record<string, any>,
  correlationId?: string
): Promise<AuditEvent> {
  return recordCanonicalAuditEvent({
    companyId,
    module: "DIGITAL_PROPERTIES",
    actionType,
    entityType: "COMMERCIAL_PROPERTY",
    entityId: propertyKey,
    metadata,
    correlationId,
    source: "COMMERCIAL_PORTAL",
  });
}

/** Connect / RFQ */
export async function recordConnectAudit(
  companyId: string,
  actionType: CanonicalAuditActionType,
  inquiryId: string,
  metadata?: Record<string, any>,
  correlationId?: string
): Promise<AuditEvent> {
  return recordCanonicalAuditEvent({
    companyId,
    module: "CONNECT_RFQ",
    actionType,
    entityType: "INQUIRY",
    entityId: inquiryId,
    metadata,
    correlationId,
    source: "STUDIO_CONNECT",
  });
}

/** Team & Access */
export async function recordTeamAudit(
  companyId: string,
  actionType: CanonicalAuditActionType,
  targetUserId: string,
  diff?: { previous?: Record<string, any>; next?: Record<string, any> },
  metadata?: Record<string, any>
): Promise<AuditEvent> {
  return recordCanonicalAuditEvent({
    companyId,
    module: "TEAM_ACCESS",
    actionType,
    entityType: "COMPANY_MEMBER",
    entityId: targetUserId,
    previousState: diff?.previous,
    newState: diff?.next,
    metadata,
    source: "STUDIO_TEAM",
  });
}

/** Billing & Contracts */
export async function recordBillingAudit(
  companyId: string,
  actionType: CanonicalAuditActionType,
  entityId: string,
  metadata?: Record<string, any>,
  correlationId?: string
): Promise<AuditEvent> {
  return recordCanonicalAuditEvent({
    companyId,
    module: "BILLING",
    actionType,
    entityType: "COMMERCIAL_BILLING",
    entityId,
    metadata,
    correlationId,
    source: "STUDIO_BILLING",
  });
}

// -------------------------------------------------------------
// QUERY HELPERS
// -------------------------------------------------------------

export async function getCompanyAuditTrail(
  companyId: string,
  options?: AuditQueryOptions
): Promise<AuditEvent[]> {
  return getAuditEventsByCompany(companyId, options);
}

export function getCompanyAuditTrailSync(companyId: string): AuditEvent[] {
  return getAllAuditEventsSync(companyId);
}

export async function getAuditEvent(
  companyId: string,
  eventId: string
): Promise<AuditEvent | null> {
  return getAuditEventById(companyId, eventId);
}
