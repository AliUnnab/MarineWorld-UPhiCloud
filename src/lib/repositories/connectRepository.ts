import type { ConnectEntity } from "@/lib/types";
import { getPersistenceMode } from "./persistenceMode";
import { getFirebaseApp } from "@/lib/auth/firebaseAuth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
} from "firebase/firestore";

/**
 * Stage 10.6 — Connect Repository
 * Data Access Layer for /companies/{companyId}/connect/{connectId}
 */

const connectStore = new Map<string, ConnectEntity[]>();

export async function findConnectById(companyId: string, connectId: string): Promise<ConnectEntity | null> {
  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const ref = doc(db, "companies", companyId, "connect", connectId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as ConnectEntity;
      }
    } catch (err) {
      console.warn("[ConnectRepo] Firestore findConnectById fallback:", err);
    }
  }

  const connects = connectStore.get(companyId) || [];
  return connects.find((c) => c.id === connectId) || null;
}

export async function findConnectsByCompany(companyId: string): Promise<ConnectEntity[]> {
  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const ref = collection(db, "companies", companyId, "connect");
      const snap = await getDocs(ref);
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as ConnectEntity);
      }
    } catch (err) {
      console.warn("[ConnectRepo] Firestore findConnectsByCompany fallback:", err);
    }
  }

  return connectStore.get(companyId) || [];
}

export async function saveConnect(connect: ConnectEntity): Promise<ConnectEntity> {
  const existing = connectStore.get(connect.companyId) || [];
  const idx = existing.findIndex((c) => c.id === connect.id);
  if (idx >= 0) {
    existing[idx] = connect;
  } else {
    existing.push(connect);
  }
  connectStore.set(connect.companyId, existing);

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const ref = doc(db, "companies", connect.companyId, "connect", connect.id);
      await setDoc(ref, connect, { merge: true });
    } catch (err) {
      console.warn("[ConnectRepo] Firestore saveConnect fallback:", err);
    }
  }

  return connect;
}

