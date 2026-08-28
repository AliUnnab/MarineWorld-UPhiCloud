import type { InquiryEntity, InquiryStatus, InquiryPriority, InquirySource, CommercialInquiry, OfficialOfferRequest } from "@/lib/types";
import { inquiryToConnectEntity, saveConnectInteraction } from "@/lib/services/connectService";
import { sendInquiryNotificationEmail } from "@/lib/services/commercialNotificationService";
import {
  saveInquiry as repoSaveInquiry,
  saveInquiryMessage as repoSaveInquiryMessage,
  getCompanyInquiriesFromRepo,
  getUserInquiriesFromRepo,
  subscribeCompanyInquiriesFromFirestore,
  subscribeUserInquiriesFromFirestore,
} from "@/lib/repositories/inquiryRepository";
import { recordConnectAudit } from "@/lib/services/auditService";
import { getCurrentAuthSession, hasCompanyRole, isAuthenticated } from "@/lib/services/securityService";

// Runtime store state populated from Firestore
let inquiriesStore: InquiryEntity[] = [];
let commercialInquiriesStore: CommercialInquiry[] = [];
let officialOfferRequestsStore: OfficialOfferRequest[] = [];

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("marineworld_inquiry_updated"));
  }
}

export function subscribeInquiries(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Get all inquiries belonging to a specific company (Multi-Tenant Isolation & Authorization Gate)
 * Only authenticated members of the company with authorized roles can access the private inbox queue.
 */
export function getCompanyInquiries(companyId: string): InquiryEntity[] {
  if (!companyId) return [];
  const auth = getCurrentAuthSession();
  if (!isAuthenticated(auth) || !hasCompanyRole(companyId, ["OWNER", "ADMIN", "MANAGER", "COMMERCIAL", "SALES", "MEMBER"], auth)) {
    return [];
  }
  const normId = companyId.toLowerCase();
  return inquiriesStore.filter(
    (inq) => (inq?.companyId && inq.companyId.toLowerCase() === normId) || (inq?.companySlug && inq.companySlug.toLowerCase() === normId)
  );
}

/**
 * Get all inquiries submitted by a specific user (My Connections / My Inquiries)
 * Requires authenticated session matching the requester ID or email.
 */
export function getUserInquiries(requesterId?: string): InquiryEntity[] {
  const auth = getCurrentAuthSession();
  if (!isAuthenticated(auth) || !auth.uid) {
    return [];
  }
  const targetUser = (requesterId || auth.uid).toLowerCase();
  if (targetUser !== auth.uid.toLowerCase() && (!auth.email || targetUser !== auth.email.toLowerCase())) {
    return [];
  }
  return inquiriesStore.filter(
    (inq) =>
      (inq?.requesterId && inq.requesterId.toLowerCase() === targetUser) ||
      (inq?.requesterEmail && inq.requesterEmail.toLowerCase() === targetUser)
  );
}

/**
 * Get a single inquiry by ID with authorization check
 */
export function getInquiryById(
  inquiryId: string,
  userOrCompanyId?: string
): InquiryEntity | undefined {
  const inq = inquiriesStore.find((i) => i?.id === inquiryId);
  if (!inq) return undefined;

  const auth = getCurrentAuthSession();
  if (userOrCompanyId) {
    const norm = userOrCompanyId.toLowerCase();
    const isOwnerCompany =
      (inq.companyId && inq.companyId.toLowerCase() === norm) ||
      (inq.companySlug && inq.companySlug.toLowerCase() === norm);
    const isRequester = inq.requesterId && inq.requesterId.toLowerCase() === norm;

    if (!isOwnerCompany && !isRequester) {
      return undefined;
    }
  } else {
    // If no explicit param passed, enforce auth context
    if (!isAuthenticated(auth)) {
      return undefined;
    }
    const isCompanyStaff = hasCompanyRole(inq.companyId, ["OWNER", "ADMIN", "MANAGER", "COMMERCIAL", "SALES", "MEMBER"], auth);
    const isRequester = inq.requesterId === auth.uid || (auth.email && inq.requesterEmail === auth.email);
    if (!isCompanyStaff && !isRequester) {
      return undefined;
    }
  }

  return inq;
}

/**
 * Create a new Commercial Inquiry (Fast, concise first-contact)
 */
export function submitCommercialInquiry(payload: {
  companyId: string;
  companySlug?: string;
  companyName: string;
  offeringId: string;
  offeringType: "product" | "service" | "capability" | string;
  offeringName: string;
  offeringCode?: string;
  canonicalUrl?: string;
  sectorCity: string;
  industryDomain?: string;
  requesterName: string;
  businessEmail: string;
  organization: string;
  quantityOrScope?: string;
  deliveryLocation?: string;
  message: string;
  requesterId?: string;
}): CommercialInquiry {
  const now = new Date().toISOString();
  const inquiryId = `inq-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const commercialInquiry: CommercialInquiry = {
    inquiryId,
    companyId: payload.companyId,
    offeringId: payload.offeringId,
    offeringType: payload.offeringType,
    offeringName: payload.offeringName,
    offeringCode: payload.offeringCode,
    canonicalUrl: payload.canonicalUrl,
    sectorCity: payload.sectorCity,
    industryDomain: payload.industryDomain,
    requesterName: payload.requesterName,
    businessEmail: payload.businessEmail,
    organization: payload.organization,
    quantityOrScope: payload.quantityOrScope,
    deliveryLocation: payload.deliveryLocation,
    message: payload.message,
    status: "NEW",
    createdAt: now,
  };

  commercialInquiriesStore = [commercialInquiry, ...commercialInquiriesStore];

  // Also bridge into unified InquiryEntity for Company Studio -> Connect / RFQs
  const unifiedEntity: InquiryEntity = {
    id: inquiryId,
    companyId: payload.companyId,
    companySlug: payload.companySlug || payload.companyId,
    companyName: payload.companyName,
    requesterId: payload.requesterId || "usr-buyer-session",
    requesterName: payload.requesterName,
    requesterEmail: payload.businessEmail,
    requesterCompany: payload.organization,
    productId: payload.offeringType === "product" ? payload.offeringId : undefined,
    productSlug: payload.offeringType === "product" ? payload.offeringId : undefined,
    productName: payload.offeringType === "product" ? payload.offeringName : undefined,
    serviceId: payload.offeringType === "service" ? payload.offeringId : undefined,
    serviceSlug: payload.offeringType === "service" ? payload.offeringId : undefined,
    serviceName: payload.offeringType === "service" ? payload.offeringName : undefined,
    sectorId: "marine",
    sectorCityId: payload.sectorCity,
    subject: `Commercial Inquiry: ${payload.offeringName}`,
    message: payload.message,
    status: "NEW",
    priority: "HIGH",
    source: payload.offeringType === "service" ? "SERVICE" : "PRODUCT",
    contactMethod: "Email",
    assignedTo: "Commercial Desk",
    inquiryKind: "INQUIRY",
    offeringReference: payload.offeringCode || payload.offeringId,
    canonicalUrl: payload.canonicalUrl,
    quantityOrScope: payload.quantityOrScope,
    deliveryLocation: payload.deliveryLocation,
    commercialInquiryId: inquiryId,
    messages: [
      {
        id: `msg-${inquiryId}-1`,
        senderId: payload.requesterId || "usr-buyer-session",
        senderName: payload.requesterName,
        senderRole: "REQUESTER",
        body: payload.message,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  inquiriesStore = [unifiedEntity, ...inquiriesStore];
  try {
    saveConnectInteraction(inquiryToConnectEntity(unifiedEntity));
  } catch (e) {
    // Non-blocking
  }
  try {
    repoSaveInquiry(unifiedEntity);
  } catch (e) {
    // Non-blocking Firestore sync
  }
  sendInquiryNotificationEmail("NEW_INQUIRY", unifiedEntity, unifiedEntity.message);
  notifyListeners();

  recordConnectAudit(
    payload.companyId,
    "INQUIRY_RECEIVED",
    inquiryId,
    {
      requesterCompany: payload.organization,
      offeringName: payload.offeringName,
      sectorCity: payload.sectorCity,
    },
    `Commercial Inquiry received for ${payload.offeringName}`
  );

  return commercialInquiry;
}

/**
 * Create a new Official Offer Request (Advanced commercial request)
 */
export function submitOfficialOfferRequest(payload: {
  companyId: string;
  companySlug?: string;
  companyName: string;
  offeringId: string;
  offeringType: "product" | "service" | "capability" | string;
  offeringName: string;
  offeringCode?: string;
  canonicalUrl?: string;
  sectorCity?: string;
  industryDomain?: string;
  requesterName: string;
  businessEmail: string;
  organization: string;
  incoterms?: string;
  deliveryPort?: string;
  quantityOrScope?: string;
  engineeringRequirements?: string;
  commercialRequirements?: string;
  deliveryTimeline?: string;
  warrantyRequirements?: string;
  message?: string;
  inquiryId?: string;
  requesterId?: string;
}): OfficialOfferRequest {
  const now = new Date().toISOString();
  const offerRequestId = `req-offer-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const offerRequest: OfficialOfferRequest = {
    offerRequestId,
    inquiryId: payload.inquiryId,
    companyId: payload.companyId,
    offeringId: payload.offeringId,
    offeringType: payload.offeringType,
    offeringName: payload.offeringName,
    offeringCode: payload.offeringCode,
    canonicalUrl: payload.canonicalUrl,
    sectorCity: payload.sectorCity,
    industryDomain: payload.industryDomain,
    requesterName: payload.requesterName,
    businessEmail: payload.businessEmail,
    organization: payload.organization,
    incoterms: payload.incoterms || "FCA",
    deliveryPort: payload.deliveryPort,
    quantityOrScope: payload.quantityOrScope,
    engineeringRequirements: payload.engineeringRequirements,
    commercialRequirements: payload.commercialRequirements,
    deliveryTimeline: payload.deliveryTimeline,
    warrantyRequirements: payload.warrantyRequirements,
    message: payload.message,
    status: "REQUESTED",
    createdAt: now,
  };

  officialOfferRequestsStore = [offerRequest, ...officialOfferRequestsStore];

  // Compose comprehensive summary for the company's Connect / RFQ inbox
  const summaryLines = [
    payload.message || `Official Commercial Offer Request for ${payload.offeringName}.`,
    payload.incoterms ? `• Preferred Incoterms: ${payload.incoterms}` : null,
    payload.deliveryPort ? `• Delivery Port / Target Hub: ${payload.deliveryPort}` : null,
    payload.quantityOrScope ? `• Scope / Quantity: ${payload.quantityOrScope}` : null,
    payload.deliveryTimeline ? `• Delivery Timeline: ${payload.deliveryTimeline}` : null,
    payload.engineeringRequirements ? `• Engineering Specs: ${payload.engineeringRequirements}` : null,
    payload.commercialRequirements ? `• Commercial Requirements: ${payload.commercialRequirements}` : null,
    payload.warrantyRequirements ? `• Warranty / SLA Terms: ${payload.warrantyRequirements}` : null,
  ].filter(Boolean).join("\n");

  const unifiedEntity: InquiryEntity = {
    id: offerRequestId,
    companyId: payload.companyId,
    companySlug: payload.companySlug || payload.companyId,
    companyName: payload.companyName,
    requesterId: payload.requesterId || "usr-buyer-session",
    requesterName: payload.requesterName,
    requesterEmail: payload.businessEmail,
    requesterCompany: payload.organization,
    productId: payload.offeringType === "product" ? payload.offeringId : undefined,
    productSlug: payload.offeringType === "product" ? payload.offeringId : undefined,
    productName: payload.offeringType === "product" ? payload.offeringName : undefined,
    serviceId: payload.offeringType === "service" ? payload.offeringId : undefined,
    serviceSlug: payload.offeringType === "service" ? payload.offeringId : undefined,
    serviceName: payload.offeringType === "service" ? payload.offeringName : undefined,
    sectorId: "marine",
    sectorCityId: payload.sectorCity,
    subject: `Official Offer Request: ${payload.offeringName}`,
    message: summaryLines,
    status: "NEW",
    priority: "URGENT",
    source: payload.offeringType === "service" ? "SERVICE" : "PRODUCT",
    contactMethod: "Platform Message",
    assignedTo: "Executive B2B Commercial Desk",
    inquiryKind: "OFFICIAL_OFFER",
    offeringReference: payload.offeringCode || payload.offeringId,
    canonicalUrl: payload.canonicalUrl,
    quantityOrScope: payload.quantityOrScope,
    deliveryLocation: payload.deliveryPort,
    deliveryPort: payload.deliveryPort,
    incoterms: payload.incoterms,
    engineeringRequirements: payload.engineeringRequirements,
    commercialRequirements: payload.commercialRequirements,
    deliveryTimeline: payload.deliveryTimeline,
    warrantyRequirements: payload.warrantyRequirements,
    officialOfferRequestId: offerRequestId,
    commercialInquiryId: payload.inquiryId,
    messages: [
      {
        id: `msg-${offerRequestId}-1`,
        senderId: payload.requesterId || "usr-buyer-session",
        senderName: payload.requesterName,
        senderRole: "REQUESTER",
        body: summaryLines,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  inquiriesStore = [unifiedEntity, ...inquiriesStore];
  try {
    saveConnectInteraction(inquiryToConnectEntity(unifiedEntity));
  } catch (e) {
    // Non-blocking
  }
  try {
    repoSaveInquiry(unifiedEntity);
  } catch (e) {
    // Non-blocking Firestore sync
  }
  sendInquiryNotificationEmail("NEW_INQUIRY", unifiedEntity, summaryLines);
  notifyListeners();

  recordConnectAudit(
    payload.companyId,
    "OFFICIAL_OFFER_REQUESTED",
    offerRequestId,
    {
      requesterCompany: payload.organization,
      offeringName: payload.offeringName,
      deliveryPort: payload.deliveryPort,
    },
    `Official Offer requested for ${payload.offeringName}`
  );

  return offerRequest;
}

/**
 * Create a new canonical inquiry
 */
export function createInquiry(payload: {
  companyId: string;
  companySlug?: string;
  companyName: string;
  requesterId: string;
  requesterName: string;
  requesterEmail?: string;
  requesterCompany?: string;
  productId?: string;
  productSlug?: string;
  productName?: string;
  serviceId?: string;
  serviceSlug?: string;
  serviceName?: string;
  sectorId?: string;
  sectorCityId?: string;
  subject: string;
  message: string;
  source: InquirySource;
  contactMethod?: "Email" | "Platform Message" | string;
  priority?: InquiryPriority;
}): InquiryEntity {
  const now = new Date().toISOString();
  const id = `inq-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newInquiry: InquiryEntity = {
    id,
    companyId: payload.companyId,
    companySlug: payload.companySlug || payload.companyId,
    companyName: payload.companyName,
    requesterId: payload.requesterId,
    requesterName: payload.requesterName,
    requesterEmail: payload.requesterEmail || "user@marineworld.city",
    requesterCompany: payload.requesterCompany || "Maritime World Member",
    productId: payload.productId,
    productSlug: payload.productSlug,
    productName: payload.productName,
    serviceId: payload.serviceId,
    serviceSlug: payload.serviceSlug,
    serviceName: payload.serviceName,
    sectorId: payload.sectorId || "marine",
    sectorCityId: payload.sectorCityId,
    subject: payload.subject,
    message: payload.message,
    status: "NEW",
    priority: payload.priority || "NORMAL",
    source: payload.source,
    contactMethod: payload.contactMethod || "Platform Message",
    assignedTo: "Unassigned",
    inquiryKind: "INQUIRY",
    messages: [
      {
        id: `msg-${id}-1`,
        senderId: payload.requesterId,
        senderName: payload.requesterName,
        senderRole: "REQUESTER",
        body: payload.message,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  inquiriesStore = [newInquiry, ...inquiriesStore];
  try {
    saveConnectInteraction(inquiryToConnectEntity(newInquiry));
  } catch (e) {
    // Non-blocking sync
  }
  try {
    repoSaveInquiry(newInquiry);
  } catch (e) {
    // Non-blocking Firestore sync
  }
  sendInquiryNotificationEmail("NEW_INQUIRY", newInquiry, newInquiry.message);
  notifyListeners();
  return newInquiry;
}

/**
 * Append a reply message to an existing inquiry
 */
export function addInquiryMessage(
  inquiryId: string,
  senderId: string,
  senderName: string,
  senderRole: "REQUESTER" | "COMPANY_MEMBER",
  body: string
): InquiryEntity | undefined {
  const index = inquiriesStore.findIndex((i) => i.id === inquiryId);
  if (index === -1) return undefined;

  const existing = inquiriesStore[index];
  const auth = getCurrentAuthSession();

  // Authorization Gate: Verify identity and roles
  if (senderRole === "COMPANY_MEMBER") {
    if (!isAuthenticated(auth) || !hasCompanyRole(existing.companyId, ["OWNER", "ADMIN", "MANAGER", "COMMERCIAL", "SALES", "MEMBER"], auth)) {
      throw new Error("Unauthorized: Only verified company representatives may send messages on behalf of the company.");
    }
  } else {
    // Requester replying: verify matching identity if signed in
    if (isAuthenticated(auth) && existing.requesterId && existing.requesterId !== auth.uid && existing.requesterEmail !== auth.email) {
      throw new Error("Unauthorized: You do not have permission to reply to this inquiry.");
    }
  }

  const now = new Date().toISOString();
  const newMsg = {
    id: `msg-${inquiryId}-${Date.now()}`,
    senderId,
    senderName,
    senderRole,
    body,
    createdAt: now,
  };

  const updatedMessages = [...(existing.messages || []), newMsg];
  const newStatus: InquiryStatus =
    senderRole === "COMPANY_MEMBER" ? "WAITING_FOR_REQUESTER" : "WAITING_FOR_COMPANY";

  const updatedInquiry: InquiryEntity = {
    ...existing,
    status: existing.status === "CLOSED" ? "CLOSED" : newStatus,
    messages: updatedMessages,
    updatedAt: now,
  };

  inquiriesStore[index] = updatedInquiry;
  try {
    repoSaveInquiryMessage(existing.companyId, inquiryId, newMsg, updatedInquiry);
  } catch (e) {
    // Non-blocking Firestore sync
  }
  sendInquiryNotificationEmail(
    senderRole === "COMPANY_MEMBER" ? "COMPANY_REPLIED" : "REQUESTER_REPLIED",
    updatedInquiry,
    body
  );
  notifyListeners();
  return updatedInquiry;
}

/**
 * Update inquiry status (NEW, OPEN, IN_PROGRESS, WAITING, RESOLVED, CLOSED, ARCHIVED)
 */
export function updateInquiryStatus(
  inquiryId: string,
  status: InquiryStatus
): InquiryEntity | undefined {
  const index = inquiriesStore.findIndex((i) => i.id === inquiryId);
  if (index === -1) return undefined;

  const targetInquiry = inquiriesStore[index];
  const auth = getCurrentAuthSession();
  if (!isAuthenticated(auth) || !hasCompanyRole(targetInquiry.companyId, ["OWNER", "ADMIN", "MANAGER", "COMMERCIAL", "SALES"], auth)) {
    throw new Error("Unauthorized: You do not have permission to update the status of this inquiry.");
  }

  const previousStatus = targetInquiry.status;
  const updatedInquiry: InquiryEntity = {
    ...targetInquiry,
    status,
    updatedAt: new Date().toISOString(),
  };

  inquiriesStore[index] = updatedInquiry;
  try {
    repoSaveInquiry(updatedInquiry);
  } catch (e) {
    // Non-blocking Firestore sync
  }
  notifyListeners();

  recordConnectAudit(
    updatedInquiry.companyId,
    "INQUIRY_STATUS_CHANGED",
    inquiryId,
    { previous: previousStatus, next: status },
    `Inquiry status updated to ${status}`
  );

  return updatedInquiry;
}

/**
 * Update inquiry priority
 */
export function updateInquiryPriority(
  inquiryId: string,
  priority: InquiryPriority
): InquiryEntity | undefined {
  const index = inquiriesStore.findIndex((i) => i.id === inquiryId);
  if (index === -1) return undefined;

  const targetInquiry = inquiriesStore[index];
  const auth = getCurrentAuthSession();
  if (!isAuthenticated(auth) || !hasCompanyRole(targetInquiry.companyId, ["OWNER", "ADMIN", "MANAGER", "COMMERCIAL", "SALES"], auth)) {
    throw new Error("Unauthorized: You do not have permission to update the priority of this inquiry.");
  }

  const updatedInquiry: InquiryEntity = {
    ...targetInquiry,
    priority,
    updatedAt: new Date().toISOString(),
  };

  inquiriesStore[index] = updatedInquiry;
  try {
    repoSaveInquiry(updatedInquiry);
  } catch (e) {
    // Non-blocking Firestore sync
  }
  notifyListeners();
  return updatedInquiry;
}

/**
 * Update inquiry assigned team member
 */
export function updateInquiryAssignment(
  inquiryId: string,
  assignedTo: string
): InquiryEntity | undefined {
  const index = inquiriesStore.findIndex((i) => i.id === inquiryId);
  if (index === -1) return undefined;

  const targetInquiry = inquiriesStore[index];
  const auth = getCurrentAuthSession();
  if (!isAuthenticated(auth) || !hasCompanyRole(targetInquiry.companyId, ["OWNER", "ADMIN", "MANAGER", "COMMERCIAL", "SALES"], auth)) {
    throw new Error("Unauthorized: You do not have permission to reassign this inquiry.");
  }

  const updatedInquiry: InquiryEntity = {
    ...targetInquiry,
    assignedTo,
    updatedAt: new Date().toISOString(),
  };

  inquiriesStore[index] = updatedInquiry;
  try {
    repoSaveInquiry(updatedInquiry);
  } catch (e) {
    // Non-blocking Firestore sync
  }
  notifyListeners();
  return updatedInquiry;
}

/**
 * Fetch company inquiries directly from repository / Firestore
 */
export async function fetchCompanyInquiriesAsync(companyId: string): Promise<InquiryEntity[]> {
  const list = await getCompanyInquiriesFromRepo(companyId);
  if (list && list.length > 0) {
    // Merge into memory store
    const existingIds = new Set(inquiriesStore.map((i) => i.id));
    const newItems = list.filter((i) => !existingIds.has(i.id));
    if (newItems.length > 0) {
      inquiriesStore = [...newItems, ...inquiriesStore];
      notifyListeners();
    }
  }
  return list;
}

/**
 * Fetch user inquiries directly from repository / Firestore
 */
export async function fetchUserInquiriesAsync(userId: string): Promise<InquiryEntity[]> {
  const list = await getUserInquiriesFromRepo(userId);
  if (list && list.length > 0) {
    const existingIds = new Set(inquiriesStore.map((i) => i.id));
    const newItems = list.filter((i) => !existingIds.has(i.id));
    if (newItems.length > 0) {
      inquiriesStore = [...newItems, ...inquiriesStore];
      notifyListeners();
    }
  }
  return list;
}

/**
 * Realtime subscriber for company inquiries with Firestore sync
 */
export function subscribeCompanyInquiriesRealtime(
  companyId: string,
  onUpdate: (inquiries: InquiryEntity[]) => void
) {
  return subscribeCompanyInquiriesFromFirestore(companyId, (inqs) => {
    // Update local cache
    const nonCompanyInqs = inquiriesStore.filter((i) => i.companyId !== companyId && i.companySlug !== companyId);
    inquiriesStore = [...inqs, ...nonCompanyInqs];
    onUpdate(inqs);
  });
}

/**
 * Realtime subscriber for user inquiries with Firestore sync
 */
export function subscribeUserInquiriesRealtime(
  userId: string,
  onUpdate: (inquiries: InquiryEntity[]) => void
) {
  return subscribeUserInquiriesFromFirestore(userId, (inqs) => {
    onUpdate(inqs);
  });
}

