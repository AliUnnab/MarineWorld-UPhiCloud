import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  orderBy,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface CompanyVerificationDocument {
  id: string;
  companyId: string;
  type: string;
  status: "VERIFIED" | "PENDING" | "REJECTED" | "UNVERIFIED";
  verifiedAt?: string;
  submittedAt: string;
  documentUrl?: string;
  notes?: string;
}

export interface GovernanceRevisionRecord {
  id: string;
  companyId: string;
  revisionNumber: number;
  changedBy: string;
  changeSummary: string;
  timestamp: string;
}

/**
 * Get company governance & verification record
 */
export async function getCompanyGovernance(companyId: string): Promise<CompanyVerificationDocument | null> {
  if (!companyId) return null;
  const docRef = doc(db, "companies", companyId, "governance", "verification");
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as CompanyVerificationDocument;
  }
  return null;
}

/**
 * Save / update company governance verification
 */
export async function saveCompanyGovernance(
  companyId: string,
  verification: CompanyVerificationDocument
): Promise<CompanyVerificationDocument> {
  const docRef = doc(db, "companies", companyId, "governance", "verification");
  await setDoc(docRef, { ...verification, companyId }, { merge: true });
  return verification;
}

/**
 * Record a governance revision
 */
export async function recordGovernanceRevision(
  companyId: string,
  revision: GovernanceRevisionRecord
): Promise<GovernanceRevisionRecord> {
  const docRef = doc(db, "companies", companyId, "governanceRevisions", revision.id);
  await setDoc(docRef, { ...revision, companyId }, { merge: true });
  return revision;
}

/**
 * List governance revisions
 */
export async function listGovernanceRevisions(companyId: string): Promise<GovernanceRevisionRecord[]> {
  if (!companyId) return [];
  const colRef = collection(db, "companies", companyId, "governanceRevisions");
  const snap = await getDocs(colRef);
  return snap.docs.map((d) => d.data() as GovernanceRevisionRecord);
}

/**
 * Real-time listener for company governance
 */
export function subscribeToCompanyGovernance(
  companyId: string,
  callback: (doc: CompanyVerificationDocument | null) => void
): Unsubscribe {
  if (!companyId) return () => {};
  const docRef = doc(db, "companies", companyId, "governance", "verification");
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as CompanyVerificationDocument);
    } else {
      callback(null);
    }
  });
}
