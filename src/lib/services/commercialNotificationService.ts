import type { InquiryEntity } from "@/lib/types";
import { getCompanyById } from "@/lib/services/companyService";
import { saveNotificationLog } from "@/lib/repositories/inquiryRepository";
import { buildInstitutionalEmailHtml, buildInstitutionalEmailText } from "@/lib/services/emailTemplates";

export interface CommercialNotificationLog {
  id: string;
  type: "COMPANY_REPLIED" | "REQUESTER_REPLIED" | "NEW_INQUIRY";
  recipientEmail: string;
  recipientName: string;
  sourceRule: string;
  subject: string;
  preview: string;
  inquiryReference: string;
  offeringName: string;
  canonicalUrl: string;
  sentAt: string;
}

const notificationLogsStore: CommercialNotificationLog[] = [];
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

export function subscribeNotificationLogs(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getNotificationLogs(): CommercialNotificationLog[] {
  return [...notificationLogsStore];
}

/**
 * Determine notification recipient email from company canonical contact config.
 * Priority:
 * 1. designated commercial contact
 * 2. official company contact
 * 3. authorized Studio owner/admin
 */
export function resolveCompanyContactRouting(companyId: string): {
  email: string;
  recipientName: string;
  sourceRule: string;
} {
  const company = getCompanyById(companyId);

  const companyName = (company as any)?.displayName || (company as any)?.legalName || (company as any)?.name || "Company";

  // 1. Designated commercial contact
  if ((company as any)?.commercialContactEmail) {
    return {
      email: (company as any).commercialContactEmail,
      recipientName: (company as any).commercialContactName || `${companyName} Commercial Representative`,
      sourceRule: "DESIGNATED_COMMERCIAL_CONTACT",
    };
  }

  // 2. Official company contact
  if (company?.officialEmail || (company as any)?.contactEmail) {
    return {
      email: company?.officialEmail || (company as any)?.contactEmail,
      recipientName: `${companyName} Commercial Desk`,
      sourceRule: "OFFICIAL_COMPANY_CONTACT",
    };
  }

  // 3. Authorized Studio owner/admin
  const members = (company as any)?.members || (company as any)?.teamMembers || [];
  if (members && members.length > 0) {
    const owner = members.find((m: any) => m.role === "OWNER" || m.role === "ADMIN") || members[0];
    if (owner?.email) {
      return {
        email: owner.email,
        recipientName: owner.name || `${companyName} Studio Admin`,
        sourceRule: "STUDIO_OWNER_ADMIN",
      };
    }
  }

  return {
    email: `commercial@${company?.slug || companyId}.marineworld.city`,
    recipientName: `${companyName} Commercial Team`,
    sourceRule: "DEFAULT_COMPANY_DESK",
  };
}

/**
 * Dispatch an email notification to requester or company recipient
 */
export function sendInquiryNotificationEmail(
  type: "COMPANY_REPLIED" | "REQUESTER_REPLIED" | "NEW_INQUIRY",
  inquiry: InquiryEntity,
  messagePreview: string
): CommercialNotificationLog {
  const now = new Date().toISOString();
  let recipientEmail = "";
  let recipientName = "";
  let sourceRule = "";
  let subject = "";

  const offeringName = inquiry.productName || inquiry.serviceName || inquiry.subject || "Commercial Offering";
  const canonicalUrl = inquiry.canonicalUrl || `/companies/${inquiry.companySlug || inquiry.companyId}`;

  if (type === "COMPANY_REPLIED") {
    // Company -> Requester
    recipientEmail = inquiry.requesterEmail || "requester@marineworld.city";
    recipientName = inquiry.requesterName;
    sourceRule = "REQUESTER_BUSINESS_EMAIL";
    subject = `[MarineWorld RFQ] ${inquiry.companyName || "Company"} responded to Inquiry ${inquiry.id}`;
  } else if (type === "REQUESTER_REPLIED" || type === "NEW_INQUIRY") {
    // Requester -> Company
    const companyRouting = resolveCompanyContactRouting(inquiry.companyId);
    recipientEmail = companyRouting.email;
    recipientName = companyRouting.recipientName;
    sourceRule = companyRouting.sourceRule;
    subject =
      type === "NEW_INQUIRY"
        ? `[MarineWorld RFQ] New Commercial Inquiry from ${inquiry.requesterName} (${inquiry.requesterCompany || "Member"}) - ${inquiry.id}`
        : `[MarineWorld RFQ] New message from ${inquiry.requesterName} - ${inquiry.id}`;
  }

  const log: CommercialNotificationLog = {
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type,
    recipientEmail,
    recipientName,
    sourceRule,
    subject,
    preview: messagePreview,
    inquiryReference: inquiry.id,
    offeringName,
    canonicalUrl,
    sentAt: now,
  };

  notificationLogsStore.unshift(log);

  // Persist to Firestore asynchronously
  try {
    saveNotificationLog(inquiry.companyId, inquiry.requesterId, log);
  } catch (e) {
    // Non-blocking
  }

  notifyListeners();

  // Asynchronous Server-Side Transactional Delivery
  try {
    const templateData = {
      title: subject,
      recipientName,
      primaryActionLabel: type === "COMPANY_REPLIED" ? "View Reply in My Workspace" : "View Inquiry in Studio Connect",
      primaryActionUrl: `${typeof window !== "undefined" ? window.location.origin : ""}${canonicalUrl}`,
      bodyParagraphs: [
        type === "NEW_INQUIRY"
          ? `A new commercial inquiry/RFQ has been received regarding ${offeringName}.`
          : type === "COMPANY_REPLIED"
          ? `${inquiry.companyName || "The supplier"} has responded to your inquiry regarding ${offeringName}.`
          : `${inquiry.requesterName} has submitted a new message regarding inquiry reference ${inquiry.id}.`,
        `Message Preview: "${messagePreview}"`,
      ],
      keyDetails: [
        { label: "Inquiry Reference", value: inquiry.id },
        { label: "Offering / Scope", value: offeringName },
        { label: "Requester", value: `${inquiry.requesterName} (${inquiry.requesterCompany || "Member"})` },
        { label: "Routing Rule", value: sourceRule },
      ],
      footerNote: "Please process all official commercial negotiations and formal offers within MarineWorld.City Studio Connect.",
    };

    const html = buildInstitutionalEmailHtml(templateData);
    const text = buildInstitutionalEmailText(templateData);

    fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: recipientEmail,
        toName: recipientName,
        subject,
        html,
        text,
        type,
        referenceId: log.id,
        metadata: { inquiryId: inquiry.id, companyId: inquiry.companyId, sourceRule },
      }),
    }).catch((err) => {
      console.warn("[Email Delivery Async Fetch Warning]", err?.message || err);
    });
  } catch (err) {
    // Non-blocking
  }

  console.log(`[EMAIL NOTIFICATION SENT]
To: ${recipientName} <${recipientEmail}> (Rule: ${sourceRule})
Subject: ${subject}
Ref: ${inquiry.id}
Preview: "${messagePreview.slice(0, 80)}..."`);

  return log;
}

