import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PersonalCollectionItem, UserTrustProfile } from "@/lib/types";

export interface PersonalWorkspaceData {
  savedCompanies: PersonalCollectionItem[];
  savedProducts: PersonalCollectionItem[];
  savedServices: PersonalCollectionItem[];
  recentRfqs: PersonalCollectionItem[];
  recentActivities: any[];
  updatedAt: string;
}

const DEFAULT_WORKSPACE_DATA: PersonalWorkspaceData = {
  savedCompanies: [],
  savedProducts: [],
  savedServices: [],
  recentRfqs: [],
  recentActivities: [],
  updatedAt: new Date().toISOString(),
};

/**
 * Get personal workspace state for user
 */
export async function getPersonalWorkspace(userId: string): Promise<PersonalWorkspaceData> {
  if (!userId) return DEFAULT_WORKSPACE_DATA;
  const docRef = doc(db, "users", userId, "personalWorkspace", "current");
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return { ...DEFAULT_WORKSPACE_DATA, ...snap.data() } as PersonalWorkspaceData;
  }
  return DEFAULT_WORKSPACE_DATA;
}

/**
 * Save personal workspace state
 */
export async function savePersonalWorkspace(
  userId: string,
  data: Partial<PersonalWorkspaceData>
): Promise<PersonalWorkspaceData> {
  if (!userId) return DEFAULT_WORKSPACE_DATA;
  const docRef = doc(db, "users", userId, "personalWorkspace", "current");
  const current = await getPersonalWorkspace(userId);
  const payload: PersonalWorkspaceData = {
    ...current,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(docRef, payload, { merge: true });
  return payload;
}

/**
 * Real-time listener for personal workspace
 */
export function subscribeToPersonalWorkspace(
  userId: string,
  callback: (data: PersonalWorkspaceData) => void
): Unsubscribe {
  if (!userId) {
    callback(DEFAULT_WORKSPACE_DATA);
    return () => {};
  }
  const docRef = doc(db, "users", userId, "personalWorkspace", "current");
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback({ ...DEFAULT_WORKSPACE_DATA, ...snap.data() } as PersonalWorkspaceData);
    } else {
      callback(DEFAULT_WORKSPACE_DATA);
    }
  });
}

/**
 * Get User Trust Profile
 */
export async function getUserPersonalTrustProfile(userId: string): Promise<UserTrustProfile | null> {
  if (!userId) return null;
  const docRef = doc(db, "users", userId, "trustProfile", "current");
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as UserTrustProfile;
  }
  return null;
}

/**
 * Save User Trust Profile
 */
export async function saveUserPersonalTrustProfile(
  userId: string,
  profile: Partial<UserTrustProfile>
): Promise<void> {
  if (!userId) return;
  const docRef = doc(db, "users", userId, "trustProfile", "current");
  await setDoc(docRef, { ...profile, updatedAt: new Date().toISOString() }, { merge: true });
}
