import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DocumentEntity } from "@/lib/types";

/**
 * List documents in a company Data Space
 */
export async function getCompanyDocuments(companyId: string): Promise<DocumentEntity[]> {
  if (!companyId) return [];
  const ref = collection(db, "companies", companyId, "documents");
  const snapshot = await getDocs(ref);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DocumentEntity));
}

/**
 * Get a specific document metadata
 */
export async function getCompanyDocumentById(
  companyId: string,
  docId: string
): Promise<DocumentEntity | null> {
  const docRef = doc(db, "companies", companyId, "documents", docId);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as DocumentEntity;
  }
  return null;
}

/**
 * Save document metadata
 */
export async function saveCompanyDocument(
  companyId: string,
  document: DocumentEntity
): Promise<DocumentEntity> {
  const docRef = doc(db, "companies", companyId, "documents", document.id);
  const payload = {
    ...document,
    companyId,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(docRef, payload, { merge: true });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("marineworld_documents_updated", { detail: { companyId, document: payload } }));
    window.dispatchEvent(new CustomEvent("marineworld_dataspace_updated", { detail: { companyId } }));
  }

  return payload;
}

/**
 * Delete document metadata
 */
export async function deleteCompanyDocument(companyId: string, docId: string): Promise<void> {
  const docRef = doc(db, "companies", companyId, "documents", docId);
  await deleteDoc(docRef);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("marineworld_documents_updated", { detail: { companyId, docId } }));
    window.dispatchEvent(new CustomEvent("marineworld_dataspace_updated", { detail: { companyId } }));
  }
}

/**
 * Real-time listener for company documents
 */
export function subscribeToCompanyDocuments(
  companyId: string,
  callback: (docs: DocumentEntity[]) => void
): Unsubscribe {
  if (!companyId) return () => {};
  const ref = collection(db, "companies", companyId, "documents");
  return onSnapshot(ref, (snapshot) => {
    const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DocumentEntity));
    callback(docs);
  });
}
