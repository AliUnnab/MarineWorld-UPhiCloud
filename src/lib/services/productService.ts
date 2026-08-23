import type { ProductEntity, CompanyProfile } from "@/lib/types";
import { notifyListeners as notifyTwinListeners } from "@/lib/businessTwinStore";
import { getCompanyById, getCompanyBySlug } from "@/lib/services/companyService";
import { getCompanyProducts as getCompanyProductsFromRegistry } from "@/lib/registry";
import {
  findProductById,
  findProductsByCompany,
  saveProduct as saveRepoProduct,
  deleteProductRecord,
} from "@/lib/repositories/productRepository";
import { recordOfferingAudit } from "@/lib/services/auditService";

/**
 * Product Service — Domain Service for Canonical Product Entities.
 * Scoped by companyId & sectorCityId.
 */

const productsRepository = new Map<string, ProductEntity[]>();

/**
 * Section 6 Canonical Async Methods
 */
export async function getProduct(companyId: string, productId: string): Promise<ProductEntity | null> {
  const fromRepo = await findProductById(companyId, productId);
  if (fromRepo) return fromRepo;
  const syncProds = getCompanyProducts(companyId);
  return syncProds.find((p) => p.id === productId) || null;
}

export async function listProducts(companyId: string): Promise<ProductEntity[]> {
  const fromRepo = await findProductsByCompany(companyId);
  if (fromRepo && fromRepo.length > 0) return fromRepo;
  return getCompanyProducts(companyId);
}

export async function createProduct(product: ProductEntity): Promise<ProductEntity> {
  await saveRepoProduct(product);
  saveProduct(product.companyId, product);
  return product;
}

export async function updateProduct(product: ProductEntity): Promise<ProductEntity> {
  await saveRepoProduct(product);
  saveProduct(product.companyId, product);
  return product;
}

export async function deleteProduct(companyId: string, productId: string): Promise<boolean> {
  await deleteProductRecord(companyId, productId);
  const existing = productsRepository.get(companyId) || [];
  const target = existing.find((p) => p.id === productId);
  const filtered = existing.filter((p) => p.id !== productId);
  productsRepository.set(companyId, filtered);
  notifyTwinListeners();

  recordOfferingAudit(
    companyId,
    "OFFERING_DELETED",
    "PRODUCT",
    productId,
    { previous: target ? { name: target.name } : undefined },
    { reason: "Product deleted from company catalog" }
  );

  return true;
}

/**
 * Get all canonical products for a company
 */
export function getCompanyProducts(companyId: string): ProductEntity[] {
  const existing = productsRepository.get(companyId);
  if (existing && existing.length > 0) {
    return existing;
  }
  const company = getCompanyById(companyId) || getCompanyBySlug(companyId);
  if (company) {
    const products = getCompanyProductsFromRegistry(company as unknown as CompanyProfile);
    if (products.length > 0) {
      productsRepository.set(companyId, products);
      return products;
    }
  }
  return [];
}

/**
 * Get product by slug or id
 */
export function getProductBySlug(companyId: string, slugOrId?: string): ProductEntity | undefined {
  if (!slugOrId) return undefined;
  const products = getCompanyProducts(companyId);
  const norm = String(slugOrId).toLowerCase();
  return products.find((p) => (p?.slug && p.slug.toLowerCase() === norm) || (p?.id && p.id.toLowerCase() === norm));
}

/**
 * Save or add a canonical product to company catalog
 */
export function saveProduct(
  companyId: string,
  product: Omit<ProductEntity, "id" | "companyId" | "createdAt" | "updatedAt"> & { id?: string }
): ProductEntity {
  const existing = productsRepository.get(companyId) || [];
  const now = new Date().toISOString();

  const id = product.id || `prod-${companyId}-${Date.now()}`;
  const slug = product.slug || (product.name ? String(product.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : id);

  const canonicalProduct: ProductEntity = {
    ...product,
    id,
    companyId,
    slug,
    sectorCityId: product.sectorCityId || "marineworld",
    category: product.category || "General Products",
    shortDescription: product.shortDescription || product.description || product.name,
    status: product.status || "ACTIVE",
    visibility: product.visibility || "PUBLIC",
    availability: product.availability || "AVAILABLE",
    createdAt: now,
    updatedAt: now,
  };

  const index = existing.findIndex((p) => p.id === id);
  const isNew = index < 0;
  const previous = isNew ? undefined : { name: existing[index]?.name, status: existing[index]?.status, category: existing[index]?.category };

  if (index >= 0) {
    existing[index] = canonicalProduct;
  } else {
    existing.push(canonicalProduct);
  }

  productsRepository.set(companyId, existing);
  notifyTwinListeners();

  recordOfferingAudit(
    companyId,
    isNew ? "OFFERING_CREATED" : "OFFERING_UPDATED",
    "PRODUCT",
    id,
    {
      previous,
      next: { name: canonicalProduct.name, status: canonicalProduct.status, category: canonicalProduct.category },
    },
    { slug: canonicalProduct.slug, sectorCityId: canonicalProduct.sectorCityId }
  );

  return canonicalProduct;
}

/**
 * Update product status (DRAFT, ACTIVE, ARCHIVED)
 */
export function updateProductStatus(companyId: string, productId: string, status: ProductEntity["status"]): ProductEntity | undefined {
  const products = productsRepository.get(companyId) || [];
  const prod = products.find((p) => p.id === productId);
  if (!prod) return undefined;

  const previousStatus = prod.status;
  prod.status = status;
  prod.updatedAt = new Date().toISOString();
  productsRepository.set(companyId, products);
  notifyTwinListeners();

  recordOfferingAudit(
    companyId,
    status === "ACTIVE" ? "OFFERING_PUBLISHED" : status === "ARCHIVED" ? "OFFERING_ARCHIVED" : "OFFERING_UPDATED",
    "PRODUCT",
    productId,
    { previous: { status: previousStatus }, next: { status } },
    { reason: `Product status updated to ${status}` }
  );

  return prod;
}

/**
 * Seed initial company products repository if empty
 */
export function seedCompanyProducts(companyId: string, initialProducts: ProductEntity[]): void {
  if (!productsRepository.has(companyId) || productsRepository.get(companyId)!.length === 0) {
    productsRepository.set(companyId, initialProducts);
  }
}
