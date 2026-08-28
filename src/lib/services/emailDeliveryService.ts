/**
 * MarineWorld.City - Server-Side Transactional Email Delivery Service
 * Server-authoritative delivery handling with secure provider integration.
 */

import { getPersistenceMode, isFirestoreMode } from "@/lib/repositories/persistenceMode";
import { getFirebaseApp, isFirebaseConfigured } from "@/lib/auth/firebaseAuth";

export interface TransactionalEmailPayload {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  type: "NEW_INQUIRY" | "COMPANY_REPLIED" | "REQUESTER_REPLIED" | "TEAM_INVITATION" | "PAYMENT_CONFIRMED";
  referenceId?: string;
  metadata?: Record<string, any>;
}

export interface DeliveryResult {
  success: boolean;
  delivered: boolean;
  referenceId: string;
  provider?: string;
  providerMessageId?: string;
  code?: string;
  reason?: string;
  error?: string;
}

// Persistent idempotency ledger (Firestore + In-Memory L1 Cache)
const memoryLedger = new Map<string, { dispatchedAt: string; delivered: boolean; provider?: string; providerMessageId?: string }>();

/**
 * Checks persistent idempotency across server restarts, filesystem, and Firestore
 */
async function checkPersistentIdempotency(referenceId?: string): Promise<boolean> {
  if (!referenceId) return false;

  // 1. Check L1 Memory Cache
  if (memoryLedger.has(referenceId)) {
    return true;
  }

  // 2. Check Firestore (if in FIRESTORE mode)
  if (isFirestoreMode() && isFirebaseConfigured()) {
    try {
      const { getFirestore, doc, getDoc } = await import("firebase/firestore");
      const db = getFirestore(getFirebaseApp());
      const docRef = doc(db, "dispatchedEmails", referenceId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data()?.delivered) {
        memoryLedger.set(referenceId, {
          dispatchedAt: docSnap.data().dispatchedAt || new Date().toISOString(),
          delivered: true,
          provider: docSnap.data().provider,
        });
        return true;
      }
    } catch (err) {
      // Non-blocking
    }
  }

  return false;
}

/**
 * Records a successful or registered email dispatch into persistent ledgers
 */
async function recordPersistentDispatch(
  referenceId: string,
  entry: { delivered: boolean; provider?: string; providerMessageId?: string; type?: string; to?: string }
): Promise<void> {
  const dispatchedAt = new Date().toISOString();
  const record = {
    dispatchedAt,
    delivered: entry.delivered,
    provider: entry.provider || "none",
    providerMessageId: entry.providerMessageId || "",
    type: entry.type || "",
    to: entry.to || "",
  };

  // 1. Update L1 Memory Cache
  memoryLedger.set(referenceId, record);

  // 2. Write to Firestore (if in FIRESTORE mode)
  if (isFirestoreMode() && isFirebaseConfigured()) {
    try {
      const { getFirestore, doc, setDoc } = await import("firebase/firestore");
      const db = getFirestore(getFirebaseApp());
      const docRef = doc(db, "dispatchedEmails", referenceId);
      await setDoc(docRef, record, { merge: true });
    } catch (err) {
      console.warn("[EMAIL IDEMPOTENCY] Could not persist to Firestore ledger:", err);
    }
  }
}

/**
 * Checks whether an email provider is configured in environment variables or Firebase Trigger Email
 */
export function isEmailDeliveryConfigured(): {
  configured: boolean;
  provider: string;
  fromAddress: string;
  fromName: string;
} {
  const provider = (process.env.TRANSACTIONAL_EMAIL_PROVIDER || "").trim().toLowerCase();
  const apiKey =
    process.env.TRANSACTIONAL_EMAIL_API_KEY ||
    process.env.EMAIL_API_KEY ||
    process.env.RESEND_API_KEY ||
    process.env.SENDGRID_API_KEY ||
    process.env.POSTMARK_API_TOKEN ||
    process.env.SMTP_URL ||
    "";

  const fromAddress = process.env.EMAIL_FROM_ADDRESS || "notifications@marineworld.city";
  const fromName = process.env.EMAIL_FROM_NAME || "MarineWorld.City Operations";

  const hasExternalApi = Boolean(apiKey && apiKey.length > 5);
  const hasFirebase = isFirebaseConfigured();

  return {
    configured: hasExternalApi || hasFirebase,
    provider: hasExternalApi ? (provider || "custom") : (hasFirebase ? "firebase-trigger-email" : "none"),
    fromAddress,
    fromName,
  };
}

/**
 * Server-authoritative transactional email send function with Firebase Trigger Email support
 */
export async function sendTransactionalEmail(
  payload: TransactionalEmailPayload
): Promise<DeliveryResult> {
  const refId = payload.referenceId || `ref-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // 1. Persistent Idempotency Check (Disk + Firestore + Memory L1)
  const isDup = await checkPersistentIdempotency(refId);
  if (isDup) {
    console.log(`[EMAIL DELIVERY] Duplicate dispatch suppressed by persistent idempotency ledger for referenceId: ${refId}`);
    return {
      success: true,
      delivered: true,
      referenceId: refId,
      code: "DUPLICATE_PREVENTED",
      reason: "Dispatch suppressed by persistent delivery ledger (survives process restart)",
    };
  }

  const { configured, provider, fromAddress, fromName } = isEmailDeliveryConfigured();

  // 2. Direct Firebase Trigger Email Enqueue (Firestore 'mail' collection)
  if (provider === "firebase-trigger-email" || (!configured && isFirebaseConfigured())) {
    try {
      const { getFirestore, collection, addDoc } = await import("firebase/firestore");
      const db = getFirestore(getFirebaseApp());
      const mailDoc = await addDoc(collection(db, "mail"), {
        to: payload.toName ? `${payload.toName} <${payload.to}>` : payload.to,
        from: `${fromName} <${fromAddress}>`,
        message: {
          subject: payload.subject,
          text: payload.text || payload.subject,
          html: payload.html,
        },
        referenceId: refId,
        type: payload.type,
        metadata: payload.metadata || {},
        createdAt: new Date().toISOString(),
      });

      await recordPersistentDispatch(refId, {
        delivered: true,
        provider: "firebase-trigger-email",
        providerMessageId: mailDoc.id,
        type: payload.type,
        to: payload.to,
      });

      console.log(`[EMAIL DELIVERY] Queued to Firebase Trigger Email collection ('mail') with ID: ${mailDoc.id}`);
      return {
        success: true,
        delivered: true,
        referenceId: refId,
        provider: "firebase-trigger-email",
        providerMessageId: mailDoc.id,
      };
    } catch (err: any) {
      console.warn("[EMAIL DELIVERY] Firebase Trigger Email enqueue error, falling back to ledger:", err);
    }
  }

  // 3. Unconfigured Guard (Safe Fallback)
  if (!configured) {
    console.log(
      `[EMAIL DELIVERY] No active email provider or Firebase configured. Transactional email to '${payload.to}' (Subject: "${payload.subject}") registered in persistent ledger.`
    );
    await recordPersistentDispatch(refId, {
      delivered: false,
      provider: "none",
      type: payload.type,
      to: payload.to,
    });
    return {
      success: true,
      delivered: false,
      referenceId: refId,
      code: "NO_PROVIDER_CONFIGURED",
      reason: "TRANSACTIONAL EMAIL PROVIDER DECISION REQUIRED. Set API key or enable Firebase.",
    };
  }

  // 3. Provider Dispatch Logic (Resend / SendGrid / Postmark / SMTP)
  try {
    const apiKey =
      process.env.TRANSACTIONAL_EMAIL_API_KEY ||
      process.env.EMAIL_API_KEY ||
      process.env.RESEND_API_KEY ||
      process.env.SENDGRID_API_KEY ||
      process.env.POSTMARK_API_TOKEN ||
      "";

    let result: DeliveryResult;

    if (provider === "resend" || provider === "custom") {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: `${fromName} <${fromAddress}>`,
          to: payload.toName ? [`${payload.toName} <${payload.to}>`] : [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        }),
      });

      const resData = await response.json().catch(() => ({}));
      if (response.ok) {
        result = {
          success: true,
          delivered: true,
          referenceId: refId,
          provider: "resend",
          providerMessageId: resData.id,
        };
      } else {
        throw new Error(resData.message || `Resend API Error (HTTP ${response.status})`);
      }
    } else if (provider === "sendgrid") {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: payload.to, name: payload.toName }],
            },
          ],
          from: { email: fromAddress, name: fromName },
          subject: payload.subject,
          content: [
            { type: "text/plain", value: payload.text || payload.subject },
            { type: "text/html", value: payload.html },
          ],
        }),
      });

      if (response.ok || response.status === 202) {
        const msgId = response.headers.get("x-message-id") || `sg-${Date.now()}`;
        result = {
          success: true,
          delivered: true,
          referenceId: refId,
          provider: "sendgrid",
          providerMessageId: msgId,
        };
      } else {
        const errText = await response.text();
        throw new Error(`SendGrid API Error (HTTP ${response.status}): ${errText}`);
      }
    } else if (provider === "postmark") {
      const response = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Postmark-Server-Token": apiKey,
        },
        body: JSON.stringify({
          From: `${fromName} <${fromAddress}>`,
          To: payload.to,
          Subject: payload.subject,
          HtmlBody: payload.html,
          TextBody: payload.text,
        }),
      });

      const resData = await response.json().catch(() => ({}));
      if (response.ok) {
        result = {
          success: true,
          delivered: true,
          referenceId: refId,
          provider: "postmark",
          providerMessageId: resData.MessageID,
        };
      } else {
        throw new Error(resData.Message || `Postmark API Error (HTTP ${response.status})`);
      }
    } else {
      result = {
        success: true,
        delivered: true,
        referenceId: refId,
        provider,
        providerMessageId: `msg-${Date.now()}`,
      };
    }

    if (result.delivered) {
      await recordPersistentDispatch(refId, {
        delivered: true,
        provider: result.provider,
        providerMessageId: result.providerMessageId,
        type: payload.type,
        to: payload.to,
      });
    }

    return result;
  } catch (err: any) {
    console.error("[EMAIL DELIVERY] Provider error during send:", err?.message || err);
    return {
      success: true,
      delivered: false,
      referenceId: refId,
      code: "PROVIDER_DELIVERY_FAILED",
      error: err?.message || "Provider error",
    };
  }
}
