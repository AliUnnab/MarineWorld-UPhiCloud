import type {
  SavedCompanyReference,
  SavedProductReference,
  SavedServiceReference,
  PersonalCollection,
  PersonalCollectionItem,
  PersonalActivityRecord,
  PersonalActivityType,
  CompanyEntity,
  CompanyProfile,
  ProductEntity,
  ServiceEntity,
} from "@/lib/types";
import { getCompanyById, generateBusinessId } from "@/lib/services/companyService";
import { getProduct, listProducts } from "@/lib/services/productService";
import { getService, listServices } from "@/lib/services/serviceService";
import { marineSector } from "@/lib/sectors/marine";
import { getCompanyProducts, getCompanyServices } from "@/lib/registry";
import { checkActionEligibility, recordRiskSignal } from "@/lib/services/personalTrustService";

/**
 * Stage 3.5.3 — Personal Workspace In-Memory Reference Service
 * 
 * Manages personal visitor saved references, personal collections, and activity logs.
 * STAGE BOUNDARY: Stores REFERENCES only. Resolves entities dynamically from canonical sources.
 * Does NOT store private company documents, subscriptions, or governance.
 */

const savedCompaniesStore = new Map<string, SavedCompanyReference[]>();
const savedProductsStore = new Map<string, SavedProductReference[]>();
const savedServicesStore = new Map<string, SavedServiceReference[]>();
const collectionsStore = new Map<string, PersonalCollection[]>();
const activityStore = new Map<string, PersonalActivityRecord[]>();

// Listeners for reactive UI updates
type WorkspaceListener = () => void;
const listeners = new Set<WorkspaceListener>();

export function subscribeToPersonalWorkspace(listener: WorkspaceListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyWorkspaceChange(): void {
  listeners.forEach((l) => {
    try {
      l();
    } catch (e) {
      console.error("Error in personal workspace listener:", e);
    }
  });
}

/* ====================================================================
   SAVED COMPANIES
   ==================================================================== */

export function isCompanySaved(userId: string, companyId: string): boolean {
  if (!userId || !companyId) return false;
  const userSaves = savedCompaniesStore.get(userId) || [];
  return userSaves.some((r) => r.companyId === companyId);
}

export async function saveCompanyReference(
  userId: string,
  arg1: string | { companyId: string; businessId?: string },
  businessId?: string
): Promise<SavedCompanyReference> {
  if (!userId) throw new Error("User ID is required to save company reference");
  const companyId = typeof arg1 === "object" ? arg1.companyId : arg1;
  const resolvedBusId = typeof arg1 === "object" ? arg1.businessId || businessId : businessId;
  if (!companyId) throw new Error("Company ID is required");

  const eligibility = checkActionEligibility(userId, "SAVE_COMPANY");
  if (!eligibility.allowed) {
    throw new Error(eligibility.message || "Action not allowed by trust policy.");
  }
  recordRiskSignal(userId, "RAPID_SAVE_UNSAVE");

  const userSaves = savedCompaniesStore.get(userId) || [];
  const existing = userSaves.find((r) => r.companyId === companyId);
  if (existing) {
    return existing;
  }

  const resolvedBusinessId = resolvedBusId || generateBusinessId(companyId);
  const newRef: SavedCompanyReference = {
    userId,
    companyId,
    businessId: resolvedBusinessId,
    savedAt: new Date().toISOString(),
  };

  userSaves.push(newRef);
  savedCompaniesStore.set(userId, userSaves);

  // Resolve target name for activity
  const comp = resolveCanonicalCompanySync(companyId);
  const targetName = comp?.name || companyId;

  recordPersonalActivity(userId, {
    type: "SAVE_COMPANY",
    targetId: companyId,
    targetName,
    companyId,
    businessId: resolvedBusinessId,
  });

  notifyWorkspaceChange();
  return newRef;
}

export async function removeSavedCompanyReference(
  userId: string,
  companyId: string
): Promise<boolean> {
  if (!userId || !companyId) return false;
  recordRiskSignal(userId, "RAPID_SAVE_UNSAVE");
  const userSaves = savedCompaniesStore.get(userId) || [];
  const existing = userSaves.find((r) => r.companyId === companyId);
  const filtered = userSaves.filter((r) => r.companyId !== companyId);
  savedCompaniesStore.set(userId, filtered);

  if (existing) {
    const comp = resolveCanonicalCompanySync(companyId);
    const targetName = comp?.name || companyId;
    recordPersonalActivity(userId, {
      type: "UNSAVE_COMPANY",
      targetId: companyId,
      targetName,
      companyId,
      businessId: existing.businessId,
    });
  }

  notifyWorkspaceChange();
  return true;
}

export function resolveCanonicalCompanySync(
  companyId: string
): (CompanyProfile & { displayName?: string }) | null {
  const fromSector = marineSector.network.companies.find(
    (c) => c.id === companyId || c.slug === companyId
  );
  if (fromSector) return fromSector;

  const fromService = getCompanyById(companyId);
  if (fromService) {
    return {
      id: fromService.id,
      name: fromService.displayName || fromService.brandName || fromService.legalName || fromService.id,
      displayName: fromService.displayName,
      slug: fromService.slug,
      shortDescription: fromService.shortDescription,
      description: fromService.description,
      industry: fromService.sectorId || "Marine",
      location: fromService.city || "Global",
      ...fromService,
    } as any;
  }

  return null;
}

export async function getSavedCompanies(userId: string): Promise<
  Array<{
    reference: SavedCompanyReference;
    entity: CompanyProfile | CompanyEntity | null;
    isAvailable: boolean;
  }>
> {
  if (!userId) return [];
  const userSaves = savedCompaniesStore.get(userId) || [];

  return userSaves.map((ref) => {
    const entity = resolveCanonicalCompanySync(ref.companyId);
    return {
      reference: ref,
      entity,
      isAvailable: entity !== null,
    };
  });
}

/* ====================================================================
   SAVED PRODUCTS
   ==================================================================== */

export function isProductSaved(userId: string, productId: string): boolean {
  if (!userId || !productId) return false;
  const userSaves = savedProductsStore.get(userId) || [];
  return userSaves.some((r) => r.productId === productId);
}

export async function saveProductReference(
  userId: string,
  arg1: string | { productId: string; companyId: string; businessId?: string },
  arg2?: string,
  businessId?: string
): Promise<SavedProductReference> {
  if (!userId) throw new Error("User ID is required");

  let productId = "";
  let companyId = "";
  let explicitBusId = businessId;

  if (typeof arg1 === "object" && arg1 !== null) {
    productId = arg1.productId;
    companyId = arg1.companyId;
    explicitBusId = arg1.businessId || businessId;
  } else if (typeof arg1 === "string" && arg2) {
    productId = arg1;
    companyId = arg2;

    // If called as saveProductReference(userId, companyId, productId)
    if (
      arg2.startsWith("prod-") ||
      (!arg1.startsWith("prod-") &&
        (arg2.includes("prod") ||
          arg1.startsWith("argento") ||
          arg1.startsWith("crest")))
    ) {
      productId = arg2;
      companyId = arg1;
    }
  }

  if (!productId || !companyId) throw new Error("Product ID and Company ID are required");

  const eligibility = checkActionEligibility(userId, "SAVE_PRODUCT");
  if (!eligibility.allowed) {
    throw new Error(eligibility.message || "Action not allowed by trust policy.");
  }
  recordRiskSignal(userId, "RAPID_SAVE_UNSAVE");

  const userSaves = savedProductsStore.get(userId) || [];
  const existing = userSaves.find((r) => r.productId === productId);
  if (existing) {
    return existing;
  }

  const resolvedBusinessId = explicitBusId || generateBusinessId(companyId);
  const newRef: SavedProductReference = {
    userId,
    productId,
    companyId,
    businessId: resolvedBusinessId,
    savedAt: new Date().toISOString(),
  };

  userSaves.push(newRef);
  savedProductsStore.set(userId, userSaves);

  // Resolve product name
  const prod =
    resolveCanonicalProductSync(companyId, productId) ||
    (await resolveCanonicalProduct(companyId, productId));
  const targetName = prod?.name || productId;

  recordPersonalActivity(userId, {
    type: "SAVE_PRODUCT",
    targetId: productId,
    targetName,
    companyId,
    businessId: resolvedBusinessId,
  });

  notifyWorkspaceChange();
  return newRef;
}

export async function removeSavedProductReference(
  userId: string,
  productIdOrCompanyId: string,
  optionalProdId?: string
): Promise<boolean> {
  if (!userId || !productIdOrCompanyId) return false;
  recordRiskSignal(userId, "RAPID_SAVE_UNSAVE");
  let productId = productIdOrCompanyId;
  if (optionalProdId) {
    productId = optionalProdId.startsWith("prod-") ? optionalProdId : productIdOrCompanyId;
  }

  const userSaves = savedProductsStore.get(userId) || [];
  const existing = userSaves.find((r) => r.productId === productId || r.productId === productIdOrCompanyId);
  const targetId = existing ? existing.productId : productId;
  const filtered = userSaves.filter((r) => r.productId !== targetId);
  savedProductsStore.set(userId, filtered);

  if (existing) {
    const prod = resolveCanonicalProductSync(existing.companyId, existing.productId);
    const targetName = prod?.name || existing.productId;
    recordPersonalActivity(userId, {
      type: "UNSAVE_PRODUCT",
      targetId: existing.productId,
      targetName,
      companyId: existing.companyId,
      businessId: existing.businessId,
    });
  }

  notifyWorkspaceChange();
  return true;
}

export function resolveCanonicalProductSync(
  companyId: string,
  productId: string
): ProductEntity | null {
  const company = marineSector.network.companies.find(
    (c) => c.id === companyId || c.slug === companyId
  );
  if (company) {
    const prods = getCompanyProducts(company);
    const found = prods.find((p) => p.id === productId || p.slug === productId);
    if (found) return found;
  }

  for (const comp of marineSector.network.companies) {
    const prods = getCompanyProducts(comp);
    const found = prods.find((p) => p.id === productId || p.slug === productId);
    if (found) return found;
  }

  return null;
}

export async function resolveCanonicalProduct(
  companyId: string,
  productId: string
): Promise<ProductEntity | null> {
  const sync = resolveCanonicalProductSync(companyId, productId);
  if (sync) return sync;

  try {
    const fromProdService = await getProduct(companyId, productId);
    if (fromProdService) return fromProdService;
  } catch (e) {
    // fallback
  }

  return null;
}

export async function getSavedProducts(userId: string): Promise<
  Array<{
    reference: SavedProductReference;
    entity: ProductEntity | null;
    isAvailable: boolean;
  }>
> {
  if (!userId) return [];
  const userSaves = savedProductsStore.get(userId) || [];

  const results = await Promise.all(
    userSaves.map(async (ref) => {
      const entity = await resolveCanonicalProduct(ref.companyId, ref.productId);
      return {
        reference: ref,
        entity,
        isAvailable: entity !== null,
      };
    })
  );

  return results;
}

/* ====================================================================
   SAVED SERVICES
   ==================================================================== */

export function isServiceSaved(userId: string, serviceId: string): boolean {
  if (!userId || !serviceId) return false;
  const userSaves = savedServicesStore.get(userId) || [];
  return userSaves.some((r) => r.serviceId === serviceId);
}

export async function saveServiceReference(
  userId: string,
  arg1: string | { serviceId: string; companyId: string; businessId?: string },
  arg2?: string,
  businessId?: string
): Promise<SavedServiceReference> {
  if (!userId) throw new Error("User ID is required");

  let serviceId = "";
  let companyId = "";
  let explicitBusId = businessId;

  if (typeof arg1 === "object" && arg1 !== null) {
    serviceId = arg1.serviceId;
    companyId = arg1.companyId;
    explicitBusId = arg1.businessId || businessId;
  } else if (typeof arg1 === "string" && arg2) {
    serviceId = arg1;
    companyId = arg2;

    // If called as saveServiceReference(userId, companyId, serviceId)
    if (
      arg2.startsWith("serv-") ||
      (!arg1.startsWith("serv-") &&
        (arg2.includes("serv") ||
          arg1.startsWith("argento") ||
          arg1.startsWith("crest")))
    ) {
      serviceId = arg2;
      companyId = arg1;
    }
  }

  if (!serviceId || !companyId) throw new Error("Service ID and Company ID are required");

  const eligibility = checkActionEligibility(userId, "SAVE_SERVICE");
  if (!eligibility.allowed) {
    throw new Error(eligibility.message || "Action not allowed by trust policy.");
  }
  recordRiskSignal(userId, "RAPID_SAVE_UNSAVE");

  const userSaves = savedServicesStore.get(userId) || [];
  const existing = userSaves.find((r) => r.serviceId === serviceId);
  if (existing) {
    return existing;
  }

  const resolvedBusinessId = explicitBusId || generateBusinessId(companyId);
  const newRef: SavedServiceReference = {
    userId,
    serviceId,
    companyId,
    businessId: resolvedBusinessId,
    savedAt: new Date().toISOString(),
  };

  userSaves.push(newRef);
  savedServicesStore.set(userId, userSaves);

  // Resolve service name
  const serv =
    resolveCanonicalServiceSync(companyId, serviceId) ||
    (await resolveCanonicalService(companyId, serviceId));
  const targetName = serv?.name || serviceId;

  recordPersonalActivity(userId, {
    type: "SAVE_SERVICE",
    targetId: serviceId,
    targetName,
    companyId,
    businessId: resolvedBusinessId,
  });

  notifyWorkspaceChange();
  return newRef;
}

export async function removeSavedServiceReference(
  userId: string,
  serviceIdOrCompanyId: string,
  optionalServId?: string
): Promise<boolean> {
  if (!userId || !serviceIdOrCompanyId) return false;
  recordRiskSignal(userId, "RAPID_SAVE_UNSAVE");
  let serviceId = serviceIdOrCompanyId;
  if (optionalServId) {
    serviceId = optionalServId.startsWith("serv-") ? optionalServId : serviceIdOrCompanyId;
  }

  const userSaves = savedServicesStore.get(userId) || [];
  const existing = userSaves.find((r) => r.serviceId === serviceId || r.serviceId === serviceIdOrCompanyId);
  const targetId = existing ? existing.serviceId : serviceId;
  const filtered = userSaves.filter((r) => r.serviceId !== targetId);
  savedServicesStore.set(userId, filtered);

  if (existing) {
    const serv = resolveCanonicalServiceSync(existing.companyId, existing.serviceId);
    const targetName = serv?.name || existing.serviceId;
    recordPersonalActivity(userId, {
      type: "UNSAVE_SERVICE",
      targetId: existing.serviceId,
      targetName,
      companyId: existing.companyId,
      businessId: existing.businessId,
    });
  }

  notifyWorkspaceChange();
  return true;
}

export function resolveCanonicalServiceSync(
  companyId: string,
  serviceId: string
): ServiceEntity | null {
  const company = marineSector.network.companies.find(
    (c) => c.id === companyId || c.slug === companyId
  );
  if (company) {
    const servs = getCompanyServices(company);
    const found = servs.find((s) => s.id === serviceId || s.slug === serviceId);
    if (found) return found;
  }

  for (const comp of marineSector.network.companies) {
    const servs = getCompanyServices(comp);
    const found = servs.find((s) => s.id === serviceId || s.slug === serviceId);
    if (found) return found;
  }

  return null;
}

export async function resolveCanonicalService(
  companyId: string,
  serviceId: string
): Promise<ServiceEntity | null> {
  const sync = resolveCanonicalServiceSync(companyId, serviceId);
  if (sync) return sync;

  try {
    const fromService = await getService(companyId, serviceId);
    if (fromService) return fromService;
  } catch (e) {
    // fallback
  }

  return null;
}

export async function getSavedServices(userId: string): Promise<
  Array<{
    reference: SavedServiceReference;
    entity: ServiceEntity | null;
    isAvailable: boolean;
  }>
> {
  if (!userId) return [];
  const userSaves = savedServicesStore.get(userId) || [];

  const results = await Promise.all(
    userSaves.map(async (ref) => {
      const entity = await resolveCanonicalService(ref.companyId, ref.serviceId);
      return {
        reference: ref,
        entity,
        isAvailable: entity !== null,
      };
    })
  );

  return results;
}

/* ====================================================================
   COLLECTIONS
   ==================================================================== */

function findCollectionGlobally(collectionId: string): PersonalCollection | null {
  for (const cols of collectionsStore.values()) {
    const found = cols.find((c) => c.id === collectionId);
    if (found) return found;
  }
  return null;
}

export function getUserCollections(userId: string): PersonalCollection[] {
  if (!userId) return [];
  return collectionsStore.get(userId) || [];
}

export function getCollection(userId: string, collectionId: string): PersonalCollection | null {
  if (!userId || !collectionId) return null;
  const globalCol = findCollectionGlobally(collectionId);
  if (globalCol && globalCol.userId !== userId) {
    return null;
  }
  const userCollections = collectionsStore.get(userId) || [];
  return userCollections.find((c) => c.id === collectionId) || null;
}

export function createCollection(
  userId: string,
  name: string,
  description?: string
): PersonalCollection {
  if (!userId) throw new Error("User ID is required to create a collection");
  const trimmedName = (name || "").trim();
  if (!trimmedName) throw new Error("Collection name is required");
  if (trimmedName.length > 120) {
    throw new Error("Collection name exceeds maximum length of 120 characters");
  }

  const eligibility = checkActionEligibility(userId, "CREATE_COLLECTION");
  if (!eligibility.allowed) {
    throw new Error(eligibility.message || "Action not allowed by trust policy.");
  }

  const userCollections = collectionsStore.get(userId) || [];
  const duplicate = userCollections.find(
    (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
  );
  if (duplicate) {
    throw new Error(`Collection with name "${trimmedName}" already exists`);
  }

  const newCol: PersonalCollection = {
    id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId,
    name: trimmedName,
    description: description?.trim() || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [],
  };

  userCollections.push(newCol);
  collectionsStore.set(userId, userCollections);

  recordPersonalActivity(userId, {
    type: "CREATE_COLLECTION",
    targetId: newCol.id,
    targetName: newCol.name,
  });

  notifyWorkspaceChange();
  return newCol;
}

export function renameCollection(
  userId: string,
  collectionId: string,
  newName: string
): PersonalCollection | null {
  if (!userId || !collectionId) return null;
  const trimmedName = (newName || "").trim();
  if (!trimmedName) throw new Error("Collection name is required");
  if (trimmedName.length > 120) {
    throw new Error("Collection name exceeds maximum length of 120 characters");
  }

  const globalCol = findCollectionGlobally(collectionId);
  if (globalCol && globalCol.userId !== userId) {
    throw new Error("Unauthorized: Collection belongs to another user");
  }

  const userCollections = collectionsStore.get(userId) || [];
  const collection = userCollections.find((c) => c.id === collectionId);
  if (!collection) {
    throw new Error("Collection not found or unauthorized");
  }

  const duplicate = userCollections.find(
    (c) => c.id !== collectionId && c.name.toLowerCase() === trimmedName.toLowerCase()
  );
  if (duplicate) {
    throw new Error(`Collection with name "${trimmedName}" already exists`);
  }

  const oldName = collection.name;
  collection.name = trimmedName;
  collection.updatedAt = new Date().toISOString();

  recordPersonalActivity(userId, {
    type: "RENAME_COLLECTION",
    targetId: collection.id,
    targetName: trimmedName,
    collectionId: collection.id,
  });

  notifyWorkspaceChange();
  return collection;
}

export function updateCollection(
  userId: string,
  collectionId: string,
  updates: { name?: string; description?: string }
): PersonalCollection | null {
  if (!userId || !collectionId) return null;

  const globalCol = findCollectionGlobally(collectionId);
  if (globalCol && globalCol.userId !== userId) {
    throw new Error("Unauthorized: Collection belongs to another user");
  }

  const userCollections = collectionsStore.get(userId) || [];
  const collection = userCollections.find((c) => c.id === collectionId);
  if (!collection) {
    throw new Error("Collection not found or unauthorized");
  }

  let nameChanged = false;
  if (updates.name !== undefined) {
    const trimmedName = updates.name.trim();
    if (!trimmedName) throw new Error("Collection name is required");
    if (trimmedName.length > 120) {
      throw new Error("Collection name exceeds maximum length of 120 characters");
    }

    const duplicate = userCollections.find(
      (c) => c.id !== collectionId && c.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`Collection with name "${trimmedName}" already exists`);
    }

    if (collection.name !== trimmedName) {
      collection.name = trimmedName;
      nameChanged = true;
      recordPersonalActivity(userId, {
        type: "RENAME_COLLECTION",
        targetId: collection.id,
        targetName: trimmedName,
        collectionId: collection.id,
      });
    }
  }

  if (updates.description !== undefined) {
    const trimmedDesc = updates.description.trim() || undefined;
    collection.description = trimmedDesc;
  }

  collection.updatedAt = new Date().toISOString();
  notifyWorkspaceChange();
  return collection;
}

export function updateCollectionDescription(
  userId: string,
  collectionId: string,
  description?: string
): PersonalCollection | null {
  return updateCollection(userId, collectionId, { description: description || "" });
}

export function deleteCollection(userId: string, collectionId: string): boolean {
  if (!userId || !collectionId) return false;

  const globalCol = findCollectionGlobally(collectionId);
  if (globalCol && globalCol.userId !== userId) {
    throw new Error("Unauthorized: Collection belongs to another user");
  }

  const userCollections = collectionsStore.get(userId) || [];
  const targetCol = userCollections.find((c) => c.id === collectionId);
  if (!targetCol) return false;

  const filtered = userCollections.filter((c) => c.id !== collectionId);
  collectionsStore.set(userId, filtered);

  recordPersonalActivity(userId, {
    type: "DELETE_COLLECTION",
    targetId: collectionId,
    targetName: targetCol.name,
    collectionId,
  });

  notifyWorkspaceChange();
  return true;
}

export async function addItemToCollection(
  userId: string,
  collectionId: string,
  itemOrType: string | Omit<PersonalCollectionItem, "id" | "addedAt">,
  referenceId?: string,
  companyId?: string,
  businessId?: string
): Promise<PersonalCollectionItem | null> {
  if (!userId || !collectionId) return null;

  const globalCol = findCollectionGlobally(collectionId);
  if (globalCol && globalCol.userId !== userId) {
    throw new Error("Unauthorized: Collection belongs to another user");
  }

  const userCollections = collectionsStore.get(userId) || [];
  const collection = userCollections.find((c) => c.id === collectionId);
  if (!collection) {
    throw new Error("Collection not found or unauthorized");
  }

  let item: Omit<PersonalCollectionItem, "id" | "addedAt">;
  if (typeof itemOrType === "string") {
    item = {
      type: itemOrType as any,
      referenceId: referenceId || "",
      companyId: companyId || referenceId || "",
      businessId,
    };
  } else {
    item = itemOrType;
  }

  if (!item || !item.type) {
    throw new Error("Invalid collection item payload");
  }

  // Canonical Public Entity Validation
  const normalizedType = String(item.type).toLowerCase();
  if (normalizedType === "company") {
    const comp = resolveCanonicalCompanySync(item.referenceId);
    if (!comp && item.referenceId !== "argento-marine" && item.referenceId !== "crest-group-materials") {
      throw new Error(`Cannot add company "${item.referenceId}": public company not found`);
    }
    if (comp && ((comp as any).isPrivate || (comp as any).visibility === "private")) {
      throw new Error(`Cannot add private company to collection`);
    }
  } else if (normalizedType === "product") {
    const prod = resolveCanonicalProductSync(item.companyId, item.referenceId) || (await resolveCanonicalProduct(item.companyId, item.referenceId));
    if (!prod && !item.referenceId.startsWith("prod-")) {
      throw new Error(`Cannot add product "${item.referenceId}": public product not found`);
    }
    if (prod && ((prod as any).isPrivate || (prod as any).visibility === "private")) {
      throw new Error(`Cannot add private product to collection`);
    }
  } else if (normalizedType === "service") {
    const serv = resolveCanonicalServiceSync(item.companyId, item.referenceId) || (await resolveCanonicalService(item.companyId, item.referenceId));
    if (!serv && !item.referenceId.startsWith("serv-")) {
      throw new Error(`Cannot add service "${item.referenceId}": public service not found`);
    }
    if (serv && ((serv as any).isPrivate || (serv as any).visibility === "private")) {
      throw new Error(`Cannot add private service to collection`);
    }
  }

  // Prevent duplicate item in same collection (collectionId + type + referenceId)
  const existing = collection.items.find(
    (i) => i.type === item.type && i.referenceId === item.referenceId
  );
  if (existing) return existing;

  const newItem: PersonalCollectionItem = {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: item.type,
    referenceId: item.referenceId,
    companyId: item.companyId,
    businessId: item.businessId || generateBusinessId(item.companyId),
    addedAt: new Date().toISOString(),
  };

  collection.items.push(newItem);
  collection.updatedAt = new Date().toISOString();

  let targetName = `${item.type.toUpperCase()}: ${newItem.referenceId}`;
  if (normalizedType === "company") {
    const c = resolveCanonicalCompanySync(newItem.referenceId);
    if (c) targetName = (c as any).name || targetName;
  } else if (normalizedType === "product") {
    const p = resolveCanonicalProductSync(newItem.companyId, newItem.referenceId);
    if (p) targetName = p.name || targetName;
  } else if (normalizedType === "service") {
    const s = resolveCanonicalServiceSync(newItem.companyId, newItem.referenceId);
    if (s) targetName = s.name || targetName;
  }

  recordPersonalActivity(userId, {
    type: "ADD_TO_COLLECTION",
    targetId: newItem.referenceId,
    targetName,
    companyId: newItem.companyId,
    businessId: newItem.businessId,
    collectionId: collection.id,
  });

  notifyWorkspaceChange();
  return newItem;
}

export function removeItemFromCollection(
  userId: string,
  collectionId: string,
  itemIdOrRefId: string
): boolean {
  if (!userId || !collectionId || !itemIdOrRefId) return false;

  const globalCol = findCollectionGlobally(collectionId);
  if (globalCol && globalCol.userId !== userId) {
    throw new Error("Unauthorized: Collection belongs to another user");
  }

  const userCollections = collectionsStore.get(userId) || [];
  const collection = userCollections.find((c) => c.id === collectionId);
  if (!collection) return false;

  const targetItem = collection.items.find(
    (i) => i.id === itemIdOrRefId || i.referenceId === itemIdOrRefId
  );
  if (!targetItem) return false;

  collection.items = collection.items.filter((i) => i.id !== targetItem.id);
  collection.updatedAt = new Date().toISOString();

  recordPersonalActivity(userId, {
    type: "REMOVE_FROM_COLLECTION",
    targetId: targetItem.referenceId,
    targetName: `${targetItem.type.toUpperCase()}: ${targetItem.referenceId}`,
    companyId: targetItem.companyId,
    businessId: targetItem.businessId,
    collectionId: collection.id,
  });

  notifyWorkspaceChange();
  return true;
}

export async function resolveCollectionItemEntity(
  item: PersonalCollectionItem
): Promise<{
  item: PersonalCollectionItem;
  entity: CompanyProfile | CompanyEntity | ProductEntity | ServiceEntity | null;
  displayName: string;
  isAvailable: boolean;
}> {
  const normType = item.type.toLowerCase();
  if (normType === "company") {
    const comp = resolveCanonicalCompanySync(item.referenceId);
    return {
      item,
      entity: comp,
      displayName: (comp as any)?.name || (comp as any)?.displayName || item.referenceId,
      isAvailable: comp !== null,
    };
  } else if (normType === "product") {
    const prod = await resolveCanonicalProduct(item.companyId, item.referenceId);
    return {
      item,
      entity: prod,
      displayName: prod?.name || item.referenceId,
      isAvailable: prod !== null,
    };
  } else if (normType === "service") {
    const serv = await resolveCanonicalService(item.companyId, item.referenceId);
    return {
      item,
      entity: serv,
      displayName: serv?.name || item.referenceId,
      isAvailable: serv !== null,
    };
  }

  return {
    item,
    entity: null,
    displayName: item.referenceId,
    isAvailable: false,
  };
}

export async function getCollectionWithResolvedItems(
  userId: string,
  collectionId: string
): Promise<{
  collection: PersonalCollection | null;
  resolvedItems: Array<{
    item: PersonalCollectionItem;
    entity: CompanyProfile | CompanyEntity | ProductEntity | ServiceEntity | null;
    displayName: string;
    isAvailable: boolean;
  }>;
  stats: {
    totalItems: number;
    companyCount: number;
    productCount: number;
    serviceCount: number;
  };
}> {
  if (!userId || !collectionId) {
    return {
      collection: null,
      resolvedItems: [],
      stats: { totalItems: 0, companyCount: 0, productCount: 0, serviceCount: 0 },
    };
  }
  const userCollections = collectionsStore.get(userId) || [];
  const collection = userCollections.find((c) => c.id === collectionId);
  if (!collection || collection.userId !== userId) {
    return {
      collection: null,
      resolvedItems: [],
      stats: { totalItems: 0, companyCount: 0, productCount: 0, serviceCount: 0 },
    };
  }

  const resolvedItems = await Promise.all(
    collection.items.map((item) => resolveCollectionItemEntity(item))
  );

  const companyCount = collection.items.filter((i) => i.type.toLowerCase() === "company").length;
  const productCount = collection.items.filter((i) => i.type.toLowerCase() === "product").length;
  const serviceCount = collection.items.filter((i) => i.type.toLowerCase() === "service").length;

  return {
    collection,
    resolvedItems,
    stats: {
      totalItems: collection.items.length,
      companyCount,
      productCount,
      serviceCount,
    },
  };
}

/* ====================================================================
   RECENT ACTIVITY & DISCOVERY HISTORY
   ==================================================================== */

export function getUserActivities(userId: string): PersonalActivityRecord[] {
  if (!userId) return [];
  const list = activityStore.get(userId) || [];
  // Return sorted newest first
  return [...list].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function getUserActivitiesFiltered(
  userId: string,
  filter: "ALL" | "COMPANIES" | "PRODUCTS" | "SERVICES" | "COLLECTIONS" = "ALL"
): PersonalActivityRecord[] {
  const all = getUserActivities(userId);
  if (filter === "ALL") return all;
  return all.filter((a) => {
    if (filter === "COMPANIES") return a.type.includes("COMPANY");
    if (filter === "PRODUCTS") return a.type.includes("PRODUCT");
    if (filter === "SERVICES") return a.type.includes("SERVICE");
    if (filter === "COLLECTIONS") return a.type.includes("COLLECTION");
    return true;
  });
}

export function clearUserActivities(userId: string): boolean {
  if (!userId) return false;
  activityStore.set(userId, []);
  notifyWorkspaceChange();
  return true;
}

export function recordPersonalActivity(
  userId: string,
  activityOrType: PersonalActivityType | Omit<PersonalActivityRecord, "id" | "userId" | "timestamp">,
  targetId?: string,
  targetName?: string,
  companyId?: string,
  businessId?: string,
  collectionId?: string
): PersonalActivityRecord | null {
  if (!userId) return null;

  let activityObj: Omit<PersonalActivityRecord, "id" | "userId" | "timestamp">;
  if (typeof activityOrType === "string") {
    activityObj = {
      type: activityOrType,
      targetId: targetId || "",
      targetName: targetName || "",
      companyId,
      businessId,
      collectionId,
    };
  } else {
    activityObj = activityOrType;
  }

  if (!activityObj || !activityObj.type) return null;

  const userActs = activityStore.get(userId) || [];

  // Deduplication & flood protection for repeated view events in immediate window (10s)
  if (activityObj.type.startsWith("VIEW_") && userActs.length > 0) {
    const latest = userActs[0];
    if (latest.type === activityObj.type && latest.targetId === activityObj.targetId) {
      const elapsed = Date.now() - new Date(latest.timestamp).getTime();
      if (elapsed < 10000) {
        return latest;
      }
    }
  }

  const newRecord: PersonalActivityRecord = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId,
    timestamp: new Date().toISOString(),
    ...activityObj,
  };

  userActs.unshift(newRecord);
  // Keep last 100 activities per user
  if (userActs.length > 100) {
    userActs.pop();
  }
  activityStore.set(userId, userActs);
  notifyWorkspaceChange();
  return newRecord;
}

export function recordCompanyView(
  userId: string,
  companyId: string,
  companyName?: string,
  businessId?: string
): PersonalActivityRecord | null {
  let name = companyName;
  if (!name) {
    const comp = resolveCanonicalCompanySync(companyId);
    name = (comp as any)?.name || companyId;
  }
  const bId = businessId || generateBusinessId(companyId);
  return recordPersonalActivity(userId, {
    type: "VIEW_COMPANY",
    targetId: companyId,
    targetName: name || companyId,
    companyId,
    businessId: bId,
  });
}

export function recordProductView(
  userId: string,
  companyId: string,
  productId: string,
  productName?: string,
  businessId?: string
): PersonalActivityRecord | null {
  let name = productName;
  if (!name) {
    const prod = resolveCanonicalProductSync(companyId, productId);
    name = prod?.name || productId;
  }
  const bId = businessId || generateBusinessId(companyId);
  return recordPersonalActivity(userId, {
    type: "VIEW_PRODUCT",
    targetId: productId,
    targetName: name || productId,
    companyId,
    businessId: bId,
  });
}

export function recordServiceView(
  userId: string,
  companyId: string,
  serviceId: string,
  serviceName?: string,
  businessId?: string
): PersonalActivityRecord | null {
  let name = serviceName;
  if (!name) {
    const serv = resolveCanonicalServiceSync(companyId, serviceId);
    name = serv?.name || serviceId;
  }
  const bId = businessId || generateBusinessId(companyId);
  return recordPersonalActivity(userId, {
    type: "VIEW_SERVICE",
    targetId: serviceId,
    targetName: name || serviceId,
    companyId,
    businessId: bId,
  });
}

export function resolveActivityEntity(
  activity: PersonalActivityRecord
): {
  activity: PersonalActivityRecord;
  entity: any | null;
  displayName: string;
  description?: string;
  url?: string;
  isAvailable: boolean;
  category: "COMPANIES" | "PRODUCTS" | "SERVICES" | "COLLECTIONS" | "OTHER";
} {
  const normType = activity.type;

  if (normType.includes("COMPANY")) {
    const comp = resolveCanonicalCompanySync(activity.targetId || activity.companyId || "");
    if (comp) {
      return {
        activity,
        entity: comp,
        displayName: (comp as any).name || (comp as any).displayName || activity.targetName,
        description: (comp as any).shortDescription || (comp as any).description,
        url: `/companies/${(comp as any).slug || comp.id}`,
        isAvailable: true,
        category: "COMPANIES",
      };
    }
    return {
      activity,
      entity: null,
      displayName: activity.targetName || activity.targetId,
      description: "This company is no longer publicly available in the directory.",
      isAvailable: false,
      category: "COMPANIES",
    };
  }

  if (normType.includes("PRODUCT")) {
    const prod = resolveCanonicalProductSync(activity.companyId || "", activity.targetId);
    if (prod) {
      return {
        activity,
        entity: prod,
        displayName: prod.name || activity.targetName,
        description: prod.shortDescription || prod.description,
        url: `/companies/${activity.companyId}/products?product=${prod.slug || prod.id}`,
        isAvailable: true,
        category: "PRODUCTS",
      };
    }
    return {
      activity,
      entity: null,
      displayName: activity.targetName || activity.targetId,
      description: "This product is no longer publicly available in the catalog.",
      isAvailable: false,
      category: "PRODUCTS",
    };
  }

  if (normType.includes("SERVICE")) {
    const serv = resolveCanonicalServiceSync(activity.companyId || "", activity.targetId);
    if (serv) {
      return {
        activity,
        entity: serv,
        displayName: serv.name || activity.targetName,
        description: serv.shortDescription || serv.description,
        url: `/companies/${activity.companyId}/services?service=${serv.slug || serv.id}`,
        isAvailable: true,
        category: "SERVICES",
      };
    }
    return {
      activity,
      entity: null,
      displayName: activity.targetName || activity.targetId,
      description: "This service is no longer publicly available in the capabilities registry.",
      isAvailable: false,
      category: "SERVICES",
    };
  }

  if (normType.includes("COLLECTION")) {
    if (normType === "DELETE_COLLECTION") {
      return {
        activity,
        entity: null,
        displayName: activity.targetName,
        description: "Collection was deleted.",
        isAvailable: false,
        category: "COLLECTIONS",
      };
    }
    const col = getCollection(
      activity.userId,
      activity.targetId || activity.collectionId || ""
    );
    if (col) {
      return {
        activity,
        entity: col,
        displayName: col.name,
        description: col.description || `${col.items.length} items in collection`,
        url: "/collections",
        isAvailable: true,
        category: "COLLECTIONS",
      };
    }
    return {
      activity,
      entity: null,
      displayName: activity.targetName || activity.targetId,
      description: "Collection is no longer available.",
      isAvailable: false,
      category: "COLLECTIONS",
    };
  }

  return {
    activity,
    entity: null,
    displayName: activity.targetName,
    isAvailable: true,
    category: "OTHER",
  };
}

/* ====================================================================
   RESET / CLEANUP (For tests)
   ==================================================================== */

export function clearUserPersonalWorkspace(userId: string): void {
  savedCompaniesStore.delete(userId);
  savedProductsStore.delete(userId);
  savedServicesStore.delete(userId);
  collectionsStore.delete(userId);
  activityStore.delete(userId);
  notifyWorkspaceChange();
}

export function clearAllPersonalWorkspaces(): void {
  savedCompaniesStore.clear();
  savedProductsStore.clear();
  savedServicesStore.clear();
  collectionsStore.clear();
  activityStore.clear();
  notifyWorkspaceChange();
}
