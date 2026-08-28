import type { ConnectEntity } from "@/lib/types";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";

/**
 * Pure Firestore Connect Repository
 * Data Access Layer for /companies/{companyId}/connect/{connectId} and /inquiries
 */

export async function findConnectById(companyId: string, connectId: string): Promise<ConnectEntity | null> {
  if (!companyId || !connectId) return null;
  try {
    const ref = doc(db, "companies", companyId, "connect", connectId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as ConnectEntity;
    }
  } catch (err) {
    console.warn("[ConnectRepo] Firestore findConnectById error:", err);
  }
  return null;
}

export async function findConnectsByCompany(companyId: string): Promise<ConnectEntity[]> {
  if (!companyId) return [];
  try {
    const ref = collection(db, "companies", companyId, "connect");
    const snap = await getDocs(ref);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ConnectEntity));
  } catch (err) {
    console.warn("[ConnectRepo] Firestore findConnectsByCompany error:", err);
    return [];
  }
}

export async function saveConnect(connect: ConnectEntity): Promise<ConnectEntity> {
  const companyId = connect.companyId || connect.toCompanyId;
  if (!companyId || !connect.id) return connect;
  try {
    const ref = doc(db, "companies", companyId, "connect", connect.id);
    await setDoc(ref, connect, { merge: true });
  } catch (err) {
    console.warn("[ConnectRepo] Firestore saveConnect error:", err);
  }
  return connect;
}

export async function deleteConnect(companyId: string, connectId: string): Promise<void> {
  if (!companyId || !connectId) return;
  try {
    const ref = doc(db, "companies", companyId, "connect", connectId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn("[ConnectRepo] Firestore deleteConnect error:", err);
  }
}
