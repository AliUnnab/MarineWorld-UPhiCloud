import { getPersistenceMode } from "./persistenceMode";
import { getFirebaseApp } from "@/lib/auth/firebaseAuth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  runTransaction,
} from "firebase/firestore";
import type { PropertyCreativeRevision } from "@/lib/services/propertyGovernanceService";

/**
 * PHASE 4.16A — Property Governance Repository
 * Domain persistence for Property Creative Revisions & Active Publications.
 * Storage path: /companies/{companyId}/{subcollection}/{id}
 */

// In-memory fallback stores
const revisionsMap = new Map<string, PropertyCreativeRevision>();
const publicationsMap = new Map<string, PropertyCreativeRevision>();

export function resetPropertyGovernanceRepositoryStores(): void {
  revisionsMap.clear();
  publicationsMap.clear();
}

// -------------------------------------------------------------
// 1. CREATIVE REVISIONS
// -------------------------------------------------------------

export async function saveGovernanceRevision(
  revision: PropertyCreativeRevision
): Promise<PropertyCreativeRevision> {
  const companyId = revision.companyId;
  revisionsMap.set(revision.revisionId, { ...revision });

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const ref = doc(db, "companies", companyId, "governanceRevisions", revision.revisionId);
      await setDoc(ref, revision, { merge: true });
    } catch (err) {
      console.warn("[PropertyGovRepo] Firestore save revision fallback:", err);
    }
  }

  return revision;
}

export async function getGovernanceRevision(
  companyId: string,
  revisionId: string
): Promise<PropertyCreativeRevision | null> {
  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const ref = doc(db, "companies", companyId, "governanceRevisions", revisionId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as PropertyCreativeRevision;
        revisionsMap.set(data.revisionId, data);
        return data;
      }
    } catch (err) {
      // Fallback
    }
  }

  const existing = revisionsMap.get(revisionId);
  return existing ? { ...existing } : null;
}

export function getInMemoryGovernanceRevisions(companyId?: string): PropertyCreativeRevision[] {
  const list = Array.from(revisionsMap.values());
  if (!companyId) return list;
  return list.filter((r) => r.companyId === companyId);
}

// -------------------------------------------------------------
// 2. ACTIVE PUBLICATIONS
// -------------------------------------------------------------

export async function saveActivePublication(
  companyId: string,
  publication: PropertyCreativeRevision
): Promise<PropertyCreativeRevision> {
  const pubId = publication.slotId || publication.propertyId;
  publicationsMap.set(pubId, { ...publication });

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const ref = doc(db, "companies", companyId, "activePublications", pubId);
      await setDoc(ref, publication, { merge: true });
    } catch (err) {
      console.warn("[PropertyGovRepo] Firestore save publication fallback:", err);
    }
  }

  return publication;
}

export function getInMemoryActivePublications(): PropertyCreativeRevision[] {
  return Array.from(publicationsMap.values());
}

// -------------------------------------------------------------
// 3. ATOMIC PUBLICATION TRANSACTION
// -------------------------------------------------------------

export async function atomicPublishCreative(
  companyId: string,
  revision: PropertyCreativeRevision
): Promise<{ success: boolean }> {
  const pubId = revision.slotId || revision.propertyId;
  revisionsMap.set(revision.revisionId, { ...revision });
  publicationsMap.set(pubId, { ...revision });

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      await runTransaction(db, async (tx) => {
        const revRef = doc(db, "companies", companyId, "governanceRevisions", revision.revisionId);
        const pubRef = doc(db, "companies", companyId, "activePublications", pubId);

        tx.set(revRef, revision, { merge: true });
        tx.set(pubRef, revision, { merge: true });
      });
    } catch (err) {
      // Dual fallback
    }
  }

  return { success: true };
}
