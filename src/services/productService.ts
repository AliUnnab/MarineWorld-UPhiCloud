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
import type { ProductEntity } from "@/lib/types";

/**
 * Get product subcollection reference
 */
function getProductsRef(companyId: string) {
  return collection(db, "companies", companyId, "products");
}

/**
 * Get product by ID
 */
export async function getProductById(companyId: string, productId: string): Promise<ProductEntity | null> {
  if (!companyId || !productId) return null;
  const docRef = doc(db, "companies", companyId, "products", productId);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as ProductEntity;
  }
  return null;
}

/**
 * List products of a company
 */
export async function getProductsByCompany(companyId: string): Promise<ProductEntity[]> {
  if (!companyId) return [];
  const snapshot = await getDocs(getProductsRef(companyId));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ProductEntity));
}

/**
 * Create or save a product
 */
export async function saveProduct(companyId: string, product: Partial<ProductEntity> & { id: string }): Promise<ProductEntity> {
  const docRef = doc(db, "companies", companyId, "products", product.id);
  const payload: ProductEntity = {
    ...product,
    companyId,
    updatedAt: new Date().toISOString(),
    createdAt: product.createdAt || new Date().toISOString(),
  } as ProductEntity;
  await setDoc(docRef, payload, { merge: true });
  return payload;
}

/**
 * Update product fields
 */
export async function updateProduct(companyId: string, productId: string, updates: Partial<ProductEntity>): Promise<void> {
  const docRef = doc(db, "companies", companyId, "products", productId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Delete a product
 */
export async function deleteProduct(companyId: string, productId: string): Promise<void> {
  const docRef = doc(db, "companies", companyId, "products", productId);
  await deleteDoc(docRef);
}

/**
 * Real-time listener for company products
 */
export function subscribeToCompanyProducts(companyId: string, callback: (products: ProductEntity[]) => void): Unsubscribe {
  return onSnapshot(getProductsRef(companyId), (snapshot) => {
    const products = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ProductEntity));
    callback(products);
  });
}
