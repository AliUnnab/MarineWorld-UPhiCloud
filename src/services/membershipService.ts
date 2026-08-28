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
import type { CompanyMemberEntity, CompanyMemberRole, CompanyMemberStatus } from "@/lib/types";

/**
 * Composite key helper for membership records
 */
export function buildMemberDocId(companyId: string, userId: string): string {
  return `${companyId.toLowerCase()}__${userId.toLowerCase()}`;
}

/**
 * Get member record
 */
export async function getCompanyMember(companyId: string, userId: string): Promise<CompanyMemberEntity | null> {
  if (!companyId || !userId) return null;
  const docId = buildMemberDocId(companyId, userId);
  const docRef = doc(db, "companies", companyId, "members", userId);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { ...snapshot.data() } as CompanyMemberEntity;
  }
  return null;
}

/**
 * List all members of a company
 */
export async function getCompanyMembers(companyId: string): Promise<CompanyMemberEntity[]> {
  if (!companyId) return [];
  const ref = collection(db, "companies", companyId, "members");
  const snapshot = await getDocs(ref);
  return snapshot.docs.map((d) => ({ ...d.data() } as CompanyMemberEntity));
}

/**
 * Save or invite a member
 */
export async function saveCompanyMember(
  companyId: string,
  member: Partial<CompanyMemberEntity> & { userId: string; role: CompanyMemberRole }
): Promise<CompanyMemberEntity> {
  const docRef = doc(db, "companies", companyId, "members", member.userId);
  const payload: CompanyMemberEntity = {
    ...member,
    companyId,
    status: member.status || "ACTIVE",
    createdAt: member.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as CompanyMemberEntity;

  await setDoc(docRef, payload, { merge: true });

  // Also maintain global user membership index at /users/{userId}/memberships/{companyId}
  const userMembershipRef = doc(db, "users", member.userId, "memberships", companyId);
  await setDoc(
    userMembershipRef,
    {
      companyId,
      userId: member.userId,
      role: member.role,
      status: payload.status,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return payload;
}

/**
 * Update member role or status
 */
export async function updateCompanyMemberRole(
  companyId: string,
  userId: string,
  role: CompanyMemberRole
): Promise<void> {
  const docRef = doc(db, "companies", companyId, "members", userId);
  await updateDoc(docRef, {
    role,
    updatedAt: new Date().toISOString(),
  });

  const userMembershipRef = doc(db, "users", userId, "memberships", companyId);
  await updateDoc(userMembershipRef, {
    role,
    updatedAt: new Date().toISOString(),
  }).catch(() => {});
}

/**
 * Remove a member from a company
 */
export async function removeCompanyMember(companyId: string, userId: string): Promise<void> {
  const docRef = doc(db, "companies", companyId, "members", userId);
  await deleteDoc(docRef);

  const userMembershipRef = doc(db, "users", userId, "memberships", companyId);
  await deleteDoc(userMembershipRef).catch(() => {});
}

/**
 * Real-time listener for company members
 */
export function subscribeToCompanyMembers(
  companyId: string,
  callback: (members: CompanyMemberEntity[]) => void
): Unsubscribe {
  const ref = collection(db, "companies", companyId, "members");
  return onSnapshot(ref, (snapshot) => {
    const members = snapshot.docs.map((d) => ({ ...d.data() } as CompanyMemberEntity));
    callback(members);
  });
}
