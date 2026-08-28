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
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { EcosystemOrganizationSummary } from "@/lib/services/ecosystemOrganizationService";

const ORGS_COLLECTION = "ecosystemOrganizations";
const ENROLLMENTS_COLLECTION = "ecosystemEnrollments";

/**
 * Get ecosystem organization by ID
 */
export async function getEcosystemOrganizationById(orgId: string): Promise<EcosystemOrganizationSummary | null> {
  if (!orgId) return null;
  const docRef = doc(db, ORGS_COLLECTION, orgId);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return snapshot.data() as EcosystemOrganizationSummary;
  }
  return null;
}

/**
 * List all ecosystem organizations
 */
export async function listEcosystemOrganizations(): Promise<EcosystemOrganizationSummary[]> {
  const snapshot = await getDocs(collection(db, ORGS_COLLECTION));
  return snapshot.docs.map((d) => d.data() as EcosystemOrganizationSummary);
}

/**
 * Create or save an ecosystem organization
 */
export async function saveEcosystemOrganization(
  org: EcosystemOrganizationSummary
): Promise<EcosystemOrganizationSummary> {
  const docRef = doc(db, ORGS_COLLECTION, org.id);
  await setDoc(docRef, org, { merge: true });
  return org;
}

/**
 * Update organization fields
 */
export async function updateEcosystemOrganization(
  orgId: string,
  updates: Partial<EcosystemOrganizationSummary>
): Promise<void> {
  const docRef = doc(db, ORGS_COLLECTION, orgId);
  await updateDoc(docRef, updates);
}

/**
 * Real-time listener for organizations
 */
export function subscribeToEcosystemOrganizations(
  callback: (orgs: EcosystemOrganizationSummary[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, ORGS_COLLECTION), (snapshot) => {
    const orgs = snapshot.docs.map((d) => d.data() as EcosystemOrganizationSummary);
    callback(orgs);
  });
}
