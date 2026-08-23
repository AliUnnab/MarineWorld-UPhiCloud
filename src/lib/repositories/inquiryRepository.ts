import { getPersistenceMode } from "./persistenceMode";
import { getFirebaseApp } from "@/lib/auth/firebaseAuth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from "firebase/firestore";
import type { InquiryEntity, InquiryMessage } from "@/lib/types";
import type { CommercialNotificationLog } from "@/lib/services/commercialNotificationService";

/**
 * PRODUCTION COMMERCIAL INQUIRY REPOSITORY
 * Canonical Firestore persistence for Inquiries, RFQs, Thread Messages, and Commercial Notifications.
 * Paths:
 * - /companies/{companyId}/inquiries/{inquiryId}
 * - /companies/{companyId}/inquiries/{inquiryId}/messages/{messageId}
 * - /users/{userId}/inquiries/{inquiryId}
 * - /companies/{companyId}/notifications/{notificationId}
 * - /users/{userId}/notifications/{notificationId}
 */

// In-memory fallback caches
const inquiriesCache = new Map<string, InquiryEntity>();
const messagesCache = new Map<string, InquiryMessage[]>(); // key: `${companyId}:${inquiryId}`
const notificationsCache = new Map<string, CommercialNotificationLog[]>(); // key: companyId or userId

export function resetInquiryRepositoryCache(): void {
  inquiriesCache.clear();
  messagesCache.clear();
  notificationsCache.clear();
}

/**
 * Clean undefined properties before writing to Firestore
 */
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      if (Array.isArray(v)) {
        clean[k] = v.map((item) => (typeof item === "object" && item !== null ? sanitizeForFirestore(item) : item));
      } else if (typeof v === "object" && v !== null) {
        clean[k] = sanitizeForFirestore(v);
      } else {
        clean[k] = v;
      }
    }
  }
  return clean;
}

/**
 * Save / Update Canonical Inquiry Document
 */
export async function saveInquiry(inquiry: InquiryEntity): Promise<InquiryEntity> {
  inquiriesCache.set(inquiry.id, { ...inquiry });

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const cleanData = sanitizeForFirestore(inquiry);

      // 1. Save canonical company inquiry
      const companyInquiryRef = doc(db, "companies", inquiry.companyId, "inquiries", inquiry.id);
      await setDoc(companyInquiryRef, cleanData, { merge: true });

      // 2. Save user index reference if requesterId is present
      if (inquiry.requesterId && inquiry.requesterId !== "anonymous") {
        const userInquiryRef = doc(db, "users", inquiry.requesterId, "inquiries", inquiry.id);
        await setDoc(userInquiryRef, cleanData, { merge: true });
      }

      // 3. Save initial messages if any into subcollection
      if (inquiry.messages && inquiry.messages.length > 0) {
        for (const msg of inquiry.messages) {
          const msgRef = doc(db, "companies", inquiry.companyId, "inquiries", inquiry.id, "messages", msg.id);
          await setDoc(msgRef, sanitizeForFirestore(msg), { merge: true });
        }
      }
    } catch (err) {
      console.warn("[InquiryRepo] Firestore saveInquiry error, relying on local state:", err);
    }
  }

  return inquiry;
}

/**
 * Append a Message to an Inquiry Thread
 */
export async function saveInquiryMessage(
  companyId: string,
  inquiryId: string,
  message: InquiryMessage,
  updatedInquiry?: InquiryEntity
): Promise<InquiryMessage> {
  const cacheKey = `${companyId}:${inquiryId}`;
  const existingMsgs = messagesCache.get(cacheKey) || [];
  if (!existingMsgs.some((m) => m.id === message.id)) {
    messagesCache.set(cacheKey, [...existingMsgs, message]);
  }

  if (updatedInquiry) {
    inquiriesCache.set(inquiryId, { ...updatedInquiry });
  }

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const cleanMsg = sanitizeForFirestore(message);

      // 1. Save message into subcollection
      const msgRef = doc(db, "companies", companyId, "inquiries", inquiryId, "messages", message.id);
      await setDoc(msgRef, cleanMsg, { merge: true });

      // 2. Update parent inquiry metadata (status, updatedAt, messages array)
      if (updatedInquiry) {
        const cleanInq = sanitizeForFirestore(updatedInquiry);
        const companyInquiryRef = doc(db, "companies", companyId, "inquiries", inquiryId);
        await setDoc(companyInquiryRef, cleanInq, { merge: true });

        if (updatedInquiry.requesterId && updatedInquiry.requesterId !== "anonymous") {
          const userInquiryRef = doc(db, "users", updatedInquiry.requesterId, "inquiries", inquiryId);
          await setDoc(userInquiryRef, cleanInq, { merge: true });
        }
      }
    } catch (err) {
      console.warn("[InquiryRepo] Firestore saveInquiryMessage error:", err);
    }
  }

  return message;
}

/**
 * Fetch a single Inquiry with its messages
 */
export async function getInquiry(companyId: string, inquiryId: string): Promise<InquiryEntity | null> {
  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const ref = doc(db, "companies", companyId, "inquiries", inquiryId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const inq = snap.data() as InquiryEntity;

        // Fetch messages subcollection
        try {
          const msgsRef = collection(db, "companies", companyId, "inquiries", inquiryId, "messages");
          const q = query(msgsRef, orderBy("createdAt", "asc"));
          const msgsSnap = await getDocs(q);
          if (!msgsSnap.empty) {
            inq.messages = msgsSnap.docs.map((d) => d.data() as InquiryMessage);
          }
        } catch {
          // messages array on parent document is fallback
        }

        inquiriesCache.set(inquiryId, inq);
        return inq;
      }
    } catch (err) {
      console.warn("[InquiryRepo] Firestore getInquiry fallback:", err);
    }
  }

  return inquiriesCache.get(inquiryId) || null;
}

/**
 * Fetch all inquiries for a Company
 */
export async function getCompanyInquiriesFromRepo(companyId: string): Promise<InquiryEntity[]> {
  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const collRef = collection(db, "companies", companyId, "inquiries");
      const snap = await getDocs(collRef);
      if (!snap.empty) {
        const list = snap.docs.map((d) => d.data() as InquiryEntity);
        list.forEach((i) => inquiriesCache.set(i.id, i));
        return list;
      }
    } catch (err) {
      console.warn("[InquiryRepo] Firestore getCompanyInquiries fallback:", err);
    }
  }

  const normId = companyId.toLowerCase();
  return Array.from(inquiriesCache.values()).filter(
    (i) => (i.companyId && i.companyId.toLowerCase() === normId) || (i.companySlug && i.companySlug.toLowerCase() === normId)
  );
}

/**
 * Fetch all inquiries for a User / Requester
 */
export async function getUserInquiriesFromRepo(userId: string): Promise<InquiryEntity[]> {
  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const collRef = collection(db, "users", userId, "inquiries");
      const snap = await getDocs(collRef);
      if (!snap.empty) {
        const list = snap.docs.map((d) => d.data() as InquiryEntity);
        list.forEach((i) => inquiriesCache.set(i.id, i));
        return list;
      }
    } catch (err) {
      console.warn("[InquiryRepo] Firestore getUserInquiries fallback:", err);
    }
  }

  const normUser = userId.toLowerCase();
  return Array.from(inquiriesCache.values()).filter(
    (i) =>
      (i.requesterId && i.requesterId.toLowerCase() === normUser) ||
      (i.requesterEmail && i.requesterEmail.toLowerCase() === normUser)
  );
}

/**
 * Realtime Listener for Company Inquiries
 */
export function subscribeCompanyInquiriesFromFirestore(
  companyId: string,
  onUpdate: (inquiries: InquiryEntity[]) => void
): Unsubscribe | (() => void) {
  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const collRef = collection(db, "companies", companyId, "inquiries");
      return onSnapshot(
        collRef,
        (snap) => {
          const list = snap.docs.map((d) => d.data() as InquiryEntity);
          list.forEach((i) => inquiriesCache.set(i.id, i));
          onUpdate(list);
        },
        (err) => {
          console.warn("[InquiryRepo] Firestore snapshot error for company inquiries:", err);
          onUpdate(getCompanyInquiriesInMemory(companyId));
        }
      );
    } catch (err) {
      console.warn("[InquiryRepo] Failed to attach Firestore snapshot listener:", err);
    }
  }

  // In-memory fallback
  onUpdate(getCompanyInquiriesInMemory(companyId));
  return () => {};
}

function getCompanyInquiriesInMemory(companyId: string): InquiryEntity[] {
  const normId = companyId.toLowerCase();
  return Array.from(inquiriesCache.values()).filter(
    (i) => (i.companyId && i.companyId.toLowerCase() === normId) || (i.companySlug && i.companySlug.toLowerCase() === normId)
  );
}

/**
 * Realtime Listener for User Inquiries
 */
export function subscribeUserInquiriesFromFirestore(
  userId: string,
  onUpdate: (inquiries: InquiryEntity[]) => void
): Unsubscribe | (() => void) {
  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const collRef = collection(db, "users", userId, "inquiries");
      return onSnapshot(
        collRef,
        (snap) => {
          const list = snap.docs.map((d) => d.data() as InquiryEntity);
          list.forEach((i) => inquiriesCache.set(i.id, i));
          onUpdate(list);
        },
        (err) => {
          console.warn("[InquiryRepo] Firestore snapshot error for user inquiries:", err);
          onUpdate(getUserInquiriesInMemory(userId));
        }
      );
    } catch (err) {
      console.warn("[InquiryRepo] Failed to attach Firestore snapshot listener for user:", err);
    }
  }

  onUpdate(getUserInquiriesInMemory(userId));
  return () => {};
}

function getUserInquiriesInMemory(userId: string): InquiryEntity[] {
  const normUser = userId.toLowerCase();
  return Array.from(inquiriesCache.values()).filter(
    (i) =>
      (i.requesterId && i.requesterId.toLowerCase() === normUser) ||
      (i.requesterEmail && i.requesterEmail.toLowerCase() === normUser)
  );
}

/**
 * Save Commercial Notification Log to Firestore
 */
export async function saveNotificationLog(
  companyId: string,
  userId: string | undefined,
  log: CommercialNotificationLog
): Promise<CommercialNotificationLog> {
  const companyKey = `comp:${companyId}`;
  const existingCompanyLogs = notificationsCache.get(companyKey) || [];
  notificationsCache.set(companyKey, [log, ...existingCompanyLogs]);

  if (userId) {
    const userKey = `usr:${userId}`;
    const existingUserLogs = notificationsCache.get(userKey) || [];
    notificationsCache.set(userKey, [log, ...existingUserLogs]);
  }

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const cleanLog = sanitizeForFirestore(log);

      if (companyId) {
        const compNotifRef = doc(db, "companies", companyId, "notifications", log.id);
        await setDoc(compNotifRef, cleanLog, { merge: true });
      }

      if (userId && userId !== "anonymous") {
        const userNotifRef = doc(db, "users", userId, "notifications", log.id);
        await setDoc(userNotifRef, cleanLog, { merge: true });
      }
    } catch (err) {
      console.warn("[InquiryRepo] Firestore saveNotificationLog error:", err);
    }
  }

  return log;
}
