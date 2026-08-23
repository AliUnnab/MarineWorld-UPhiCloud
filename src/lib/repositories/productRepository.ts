import type { ProductEntity } from "@/lib/types";

/**
 * Stage 10.6 — Product Repository
 * Data Access Layer for /companies/{companyId}/products/{productId}
 */

const productStore = new Map<string, ProductEntity[]>();

export async function findProductById(companyId: string, productId: string): Promise<ProductEntity | null> {
  const products = productStore.get(companyId) || [];
  return products.find((p) => p.id === productId) || null;
}

export async function findProductsByCompany(companyId: string): Promise<ProductEntity[]> {
  return productStore.get(companyId) || [];
}

export async function saveProduct(product: ProductEntity): Promise<ProductEntity> {
  const existing = productStore.get(product.companyId) || [];
  const idx = existing.findIndex((p) => p.id === product.id);
  if (idx >= 0) {
    existing[idx] = product;
  } else {
    existing.push(product);
  }
  productStore.set(product.companyId, existing);
  return product;
}

export async function deleteProductRecord(companyId: string, productId: string): Promise<boolean> {
  const existing = productStore.get(companyId) || [];
  const filtered = existing.filter((p) => p.id !== productId);
  productStore.set(companyId, filtered);
  return filtered.length < existing.length;
}
