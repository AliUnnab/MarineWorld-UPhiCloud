import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  SavedCompanyReference,
  SavedProductReference,
  SavedServiceReference,
  SavedCityReference,
  PersonalCollection,
  PersonalActivityRecord,
  UserTrustProfile,
} from "@/lib/types";

/**
 * -------------------------------------------------------------
 * 1. SAVED REFERENCES (Companies, Products, Services, Cities)
 * Storage path: /users/{userId}/savedItems/{type}__{targetId}
 * -------------------------------------------------------------
 */

export async function saveUserReference(
  userId: string,
  type: "company" | "product" | "service" | "city",
  targetId: string,
  meta?: Record<string, any>
): Promise<void> {
  if (!userId || !targetId) return;
  const docRef = doc(db, "users", userId, "savedItems", `${type}__${targetId}`);
  await setDoc(
    docRef,
    {
      userId,
      type,
      targetId,
      ...meta,
      savedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function removeUserReference(
  userId: string,
  type: "company" | "product" | "service" | "city",
  targetId: string
): Promise<void> {
  if (!userId || !targetId) return;
  const docRef = doc(db, "users", userId, "savedItems", `${type}__${targetId}`);
  await deleteDoc(docRef);
}

export async function getUserSavedItems(userId: string): Promise<any[]> {
  if (!userId) return [];
  const ref = collection(db, "users", userId, "savedItems");
  const snapshot = await getDocs(ref);
  return snapshot.docs.map((d) => d.data());
}

export function subscribeToUserSavedItems(
  userId: string,
  callback: (items: any[]) => void
): Unsubscribe {
  if (!userId) return () => {};
  const ref = collection(db, "users", userId, "savedItems");
  return onSnapshot(ref, (snapshot) => {
    callback(snapshot.docs.map((d) => d.data()));
  }, (err) => {
    console.warn("[WorkspaceService] SavedItems subscription error:", err);
  });
}

/**
 * -------------------------------------------------------------
 * 2. PERSONAL COLLECTIONS
 * Storage path: /users/{userId}/collections/{collectionId}
 * -------------------------------------------------------------
 */

export async function getUserCollections(userId: string): Promise<PersonalCollection[]> {
  if (!userId) return [];
  const ref = collection(db, "users", userId, "collections");
  const snapshot = await getDocs(ref);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PersonalCollection));
}

export async function saveUserCollection(
  userId: string,
  collectionItem: PersonalCollection
): Promise<PersonalCollection> {
  if (!userId || !collectionItem.id) return collectionItem;
  const docRef = doc(db, "users", userId, "collections", collectionItem.id);
  const payload: PersonalCollection = {
    ...collectionItem,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(docRef, payload, { merge: true });
  return payload;
}

export async function deleteUserCollection(userId: string, collectionId: string): Promise<void> {
  if (!userId || !collectionId) return;
  const docRef = doc(db, "users", userId, "collections", collectionId);
  await deleteDoc(docRef);
}

export function subscribeToUserCollections(
  userId: string,
  callback: (collections: PersonalCollection[]) => void
): Unsubscribe {
  if (!userId) return () => {};
  const ref = collection(db, "users", userId, "collections");
  return onSnapshot(ref, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PersonalCollection)));
  }, (err) => {
    console.warn("[WorkspaceService] Collections subscription error:", err);
  });
}

/**
 * -------------------------------------------------------------
 * 3. RECENT PERSONAL ACTIVITY
 * Storage path: /users/{userId}/activities/{activityId}
 * -------------------------------------------------------------
 */

export async function recordUserActivity(
  userId: string,
  activity: PersonalActivityRecord
): Promise<PersonalActivityRecord> {
  if (!userId || !activity.id) return activity;
  const docRef = doc(db, "users", userId, "activities", activity.id);
  await setDoc(docRef, { ...activity }, { merge: true });
  return activity;
}

export async function getUserActivities(userId: string): Promise<PersonalActivityRecord[]> {
  if (!userId) return [];
  const colRef = collection(db, "users", userId, "activities");
  const q = query(colRef, orderBy("timestamp", "desc"), limit(100));
  try {
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as PersonalActivityRecord);
  } catch {
    const fallbackSnap = await getDocs(colRef);
    return fallbackSnap.docs.map((d) => d.data() as PersonalActivityRecord);
  }
}

export async function clearUserActivities(userId: string): Promise<void> {
  if (!userId) return;
  const colRef = collection(db, "users", userId, "activities");
  const snap = await getDocs(colRef);
  const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletePromises);
}

export function subscribeToUserActivities(
  userId: string,
  callback: (activities: PersonalActivityRecord[]) => void
): Unsubscribe {
  if (!userId) return () => {};
  const colRef = collection(db, "users", userId, "activities");
  const q = query(colRef, orderBy("timestamp", "desc"), limit(100));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => d.data() as PersonalActivityRecord));
  }, () => {
    // Fallback un-ordered listener if index is building
    onSnapshot(colRef, (snap) => {
      callback(snap.docs.map((d) => d.data() as PersonalActivityRecord));
    });
  });
}

/**
 * -------------------------------------------------------------
 * 4. USER TRUST & VERIFICATION PROFILE
 * Storage path: /users/{userId}/trust/profile
 * -------------------------------------------------------------
 */

export async function getUserTrustProfile(userId: string): Promise<UserTrustProfile | null> {
  if (!userId) return null;
  const docRef = doc(db, "users", userId, "trust", "profile");
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as UserTrustProfile;
  }
  return null;
}

export async function saveUserTrustProfile(
  userId: string,
  profile: UserTrustProfile
): Promise<UserTrustProfile> {
  if (!userId) return profile;
  const docRef = doc(db, "users", userId, "trust", "profile");
  await setDoc(docRef, { ...profile }, { merge: true });
  return profile;
}

export function subscribeToUserTrustProfile(
  userId: string,
  callback: (profile: UserTrustProfile | null) => void
): Unsubscribe {
  if (!userId) return () => {};
  const docRef = doc(db, "users", userId, "trust", "profile");
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as UserTrustProfile);
    } else {
      callback(null);
    }
  }, (err) => {
    console.warn("[WorkspaceService] TrustProfile subscription error:", err);
  });
}
