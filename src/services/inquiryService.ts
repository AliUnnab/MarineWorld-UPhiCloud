import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  arrayUnion,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { InquiryEntity, InquiryMessage, InquiryStatus, InquiryPriority } from "@/lib/types";

const COLLECTION_NAME = "inquiries";

/**
 * Get inquiry by ID
 */
export async function getInquiryById(inquiryId: string): Promise<InquiryEntity | null> {
  if (!inquiryId) return null;
  const docRef = doc(db, COLLECTION_NAME, inquiryId);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as InquiryEntity;
  }
  return null;
}

/**
 * List inquiries directed to a company
 */
export async function getCompanyInquiries(companyId: string): Promise<InquiryEntity[]> {
  if (!companyId) return [];
  const q = query(
    collection(db, COLLECTION_NAME),
    where("companyId", "==", companyId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as InquiryEntity));
}

/**
 * List inquiries sent by a user (Personal Workspace)
 */
export async function getUserInquiries(userId: string): Promise<InquiryEntity[]> {
  if (!userId) return [];
  const q = query(
    collection(db, COLLECTION_NAME),
    where("requesterId", "==", userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as InquiryEntity));
}

/**
 * Create a new commercial inquiry / RFQ
 */
export async function createInquiry(inquiry: Partial<InquiryEntity> & { id: string; companyId: string }): Promise<InquiryEntity> {
  const docRef = doc(db, COLLECTION_NAME, inquiry.id);
  const payload: InquiryEntity = {
    ...inquiry,
    status: inquiry.status || "NEW",
    priority: inquiry.priority || "MEDIUM",
    messages: inquiry.messages || [],
    createdAt: inquiry.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as InquiryEntity;

  await setDoc(docRef, payload, { merge: true });
  return payload;
}

/**
 * Update inquiry status or priority
 */
export async function updateInquiryStatus(
  inquiryId: string,
  status: InquiryStatus,
  assignedTo?: string
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, inquiryId);
  const updates: Record<string, any> = {
    status,
    updatedAt: new Date().toISOString(),
  };
  if (assignedTo !== undefined) updates.assignedTo = assignedTo;
  await updateDoc(docRef, updates);
}

/**
 * Add a message to an inquiry conversation thread
 */
export async function addInquiryMessage(
  inquiryId: string,
  message: Omit<InquiryMessage, "id" | "createdAt"> & { id?: string; createdAt?: string }
): Promise<InquiryMessage> {
  const docRef = doc(db, COLLECTION_NAME, inquiryId);
  const fullMessage: InquiryMessage = {
    id: message.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    senderId: message.senderId,
    senderName: message.senderName,
    senderRole: message.senderRole,
    body: message.body,
    createdAt: message.createdAt || new Date().toISOString(),
  };

  await updateDoc(docRef, {
    messages: arrayUnion(fullMessage),
    updatedAt: new Date().toISOString(),
  });

  return fullMessage;
}

/**
 * Delete an inquiry
 */
export async function deleteInquiry(inquiryId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, inquiryId);
  await deleteDoc(docRef);
}

/**
 * Real-time listener for company inquiries
 */
export function subscribeToCompanyInquiries(
  companyId: string,
  callback: (inquiries: InquiryEntity[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("companyId", "==", companyId)
  );
  return onSnapshot(q, (snapshot) => {
    const inquiries = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as InquiryEntity));
    callback(inquiries);
  });
}

/**
 * Real-time listener for user inquiries
 */
export function subscribeToUserInquiries(
  userId: string,
  callback: (inquiries: InquiryEntity[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("requesterId", "==", userId)
  );
  return onSnapshot(q, (snapshot) => {
    const inquiries = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as InquiryEntity));
    callback(inquiries);
  });
}
