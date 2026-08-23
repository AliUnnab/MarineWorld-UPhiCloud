import type { UserProfileEntity } from "@/lib/types";
import { getPersistenceMode } from "./persistenceMode";
import { getFirebaseApp } from "@/lib/auth/firebaseAuth";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

/**
 * Phase 2 — User Repository
 * Data Access Layer for /users/{firebaseUid}
 */

const userStore = new Map<string, UserProfileEntity>();

export function getInMemoryUser(uid: string): UserProfileEntity | undefined {
  return userStore.get(uid);
}

export function saveInMemoryUser(user: UserProfileEntity): UserProfileEntity {
  userStore.set(user.uid, { ...user });
  return user;
}

export function clearInMemoryUserStore(): void {
  userStore.clear();
}

export async function findUserByUid(uid: string): Promise<UserProfileEntity | null> {
  if (!uid) return null;
  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        return snap.data() as UserProfileEntity;
      }
      return userStore.get(uid) || null;
    } catch (err) {
      return userStore.get(uid) || null;
    }
  }
  return userStore.get(uid) || null;
}

export async function saveUser(user: UserProfileEntity): Promise<UserProfileEntity> {
  userStore.set(user.uid, { ...user });
  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      await setDoc(doc(db, "users", user.uid), user, { merge: true });
    } catch (err) {
      console.warn("[UserRepo] Firestore saveUser fallback:", err);
    }
  }
  return user;
}

export async function updateUser(
  uid: string,
  updates: Partial<UserProfileEntity>
): Promise<UserProfileEntity | null> {
  const existing = await findUserByUid(uid);
  if (!existing) return null;

  const updated: UserProfileEntity = {
    ...existing,
    ...updates,
    uid: existing.uid, // UID is immutable
    updatedAt: new Date().toISOString(),
  };

  userStore.set(uid, updated);

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      await updateDoc(doc(db, "users", uid), {
        ...updates,
        uid: existing.uid,
        updatedAt: updated.updatedAt,
      });
    } catch (err) {
      console.warn("[UserRepo] Firestore updateUser fallback:", err);
    }
  }

  return updated;
}
