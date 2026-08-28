import type { CompanyNodeEntity } from "@/lib/types";
import { db } from "@/lib/firebase";
import { isFirestoreMode } from "./persistenceMode";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

/**
 * Company Node Repository
 * Data Access Layer for /companies/{companyId}/nodes/{nodeId}
 */

const nodeStore = new Map<string, CompanyNodeEntity[]>();

export async function findNodeById(companyId: string, nodeId: string): Promise<CompanyNodeEntity | null> {
  if (isFirestoreMode() && companyId && nodeId) {
    try {
      const docRef = doc(db, "companies", companyId, "nodes", nodeId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as CompanyNodeEntity;
      }
    } catch (err) {
      console.warn(`[NodeRepository] Firestore findNodeById fallback for ${companyId}/${nodeId}:`, err);
    }
  }

  const nodes = nodeStore.get(companyId) || [];
  return nodes.find((n) => n.id === nodeId) || null;
}

export async function findNodesByCompany(companyId: string): Promise<CompanyNodeEntity[]> {
  if (isFirestoreMode() && companyId) {
    try {
      const colRef = collection(db, "companies", companyId, "nodes");
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const items = snap.docs.map((d) => d.data() as CompanyNodeEntity);
        nodeStore.set(companyId, items);
        return items;
      }
    } catch (err) {
      console.warn(`[NodeRepository] Firestore findNodesByCompany fallback for ${companyId}:`, err);
    }
  }

  return nodeStore.get(companyId) || [];
}

export async function saveNode(node: CompanyNodeEntity): Promise<CompanyNodeEntity> {
  const existing = nodeStore.get(node.companyId) || [];
  const idx = existing.findIndex((n) => n.id === node.id);
  if (idx >= 0) {
    existing[idx] = node;
  } else {
    existing.push(node);
  }
  nodeStore.set(node.companyId, existing);

  if (isFirestoreMode() && node.companyId && node.id) {
    try {
      const docRef = doc(db, "companies", node.companyId, "nodes", node.id);
      await setDoc(docRef, { ...node }, { merge: true });
    } catch (err) {
      console.warn(`[NodeRepository] Firestore saveNode error for ${node.id}:`, err);
    }
  }

  return node;
}

export async function deleteNodeRecord(companyId: string, nodeId: string): Promise<boolean> {
  const existing = nodeStore.get(companyId) || [];
  const filtered = existing.filter((n) => n.id !== nodeId);
  nodeStore.set(companyId, filtered);

  if (isFirestoreMode() && companyId && nodeId) {
    try {
      const docRef = doc(db, "companies", companyId, "nodes", nodeId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn(`[NodeRepository] Firestore deleteNodeRecord error for ${companyId}/${nodeId}:`, err);
    }
  }

  return filtered.length < existing.length;
}
