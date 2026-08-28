import type { ProductEntity } from "@/lib/types";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";

/**
 * Pure Firestore Product Repository
 * Data Access Layer for /companies/{companyId}/products/{productId}
 */

export async function findProductById(companyId: string, productId: string): Promise<ProductEntity | null> {
  if (!companyId || !productId) return null;
  try {
    const docRef = doc(db, "companies", companyId, "products", productId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as ProductEntity;
    }
  } catch (err) {
    console.warn(`[ProductRepository] Firestore findProductById failed for ${companyId}/${productId}:`, err);
  }
  return null;
}

export async function findProductsByCompany(companyId: string): Promise<ProductEntity[]> {
  if (!companyId) return [];
  try {
    const colRef = collection(db, "companies", companyId, "products");
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductEntity));
  } catch (err) {
    console.warn(`[ProductRepository] Firestore findProductsByCompany failed for ${companyId}:`, err);
    return [];
  }
}

export async function saveProduct(product: ProductEntity): Promise<ProductEntity> {
  const payload: ProductEntity = {
    ...product,
    updatedAt: new Date().toISOString(),
    createdAt: product.createdAt || new Date().toISOString(),
  };

  if (product.companyId && product.id) {
    try {
      const docRef = doc(db, "companies", product.companyId, "products", product.id);
      await setDoc(docRef, payload, { merge: true });
    } catch (err) {
      console.warn(`[ProductRepository] Firestore saveProduct error for ${product.id}:`, err);
    }
  }

  return payload;
}

export async function deleteProductRecord(companyId: string, productId: string): Promise<boolean> {
  if (!companyId || !productId) return false;
  try {
    const docRef = doc(db, "companies", companyId, "products", productId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn(`[ProductRepository] Firestore deleteProductRecord error for ${companyId}/${productId}:`, err);
    return false;
  }
}

export function subscribeToCompanyProducts(
  companyId: string,
  callback: (products: ProductEntity[]) => void
): Unsubscribe {
  if (!companyId) {
    callback([]);
    return () => {};
  }
  const colRef = collection(db, "companies", companyId, "products");
  return onSnapshot(colRef, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductEntity)));
  });
}
