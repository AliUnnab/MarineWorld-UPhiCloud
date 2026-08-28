import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface CompanyContactEntry {
  id: string;
  companyId: string;
  type: "OFFICIAL" | "PERSONNEL" | "DEPARTMENT" | "EMERGENCY";
  title: string;
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
  vhfChannel?: string;
  location?: string;
  notes?: string;
  isPublic?: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get contacts for a specific company
 */
export async function getCompanyContacts(companyId: string): Promise<CompanyContactEntry[]> {
  if (!companyId) return [];
  const colRef = collection(db, "companies", companyId, "contacts");
  const snap = await getDocs(colRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CompanyContactEntry));
}

/**
 * Save or update a company contact
 */
export async function saveCompanyContact(
  companyId: string,
  contact: Partial<CompanyContactEntry> & { id: string }
): Promise<CompanyContactEntry> {
  const docRef = doc(db, "companies", companyId, "contacts", contact.id);
  const payload: CompanyContactEntry = {
    id: contact.id,
    companyId,
    type: contact.type || "OFFICIAL",
    title: contact.title || "Corporate Contact",
    ...contact,
    updatedAt: new Date().toISOString(),
    createdAt: contact.createdAt || new Date().toISOString(),
  };
  await setDoc(docRef, payload, { merge: true });
  return payload;
}

/**
 * Delete a company contact
 */
export async function deleteCompanyContact(companyId: string, contactId: string): Promise<void> {
  const docRef = doc(db, "companies", companyId, "contacts", contactId);
  await deleteDoc(docRef);
}

/**
 * Subscribe to contacts of a company
 */
export function subscribeToCompanyContacts(
  companyId: string,
  callback: (contacts: CompanyContactEntry[]) => void
): Unsubscribe {
  if (!companyId) {
    callback([]);
    return () => {};
  }
  const colRef = collection(db, "companies", companyId, "contacts");
  return onSnapshot(colRef, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CompanyContactEntry)));
  });
}
