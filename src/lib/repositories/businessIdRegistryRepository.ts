import type {
  BusinessIdRegistryEntity,
  CompanyEntity,
  CompanyMemberEntity,
} from "@/lib/types";
import { getPersistenceMode } from "./persistenceMode";
import { getFirebaseApp } from "@/lib/auth/firebaseAuth";
import {
  getFirestore,
  doc,
  getDoc,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import { saveCompanyRecordSync } from "./companyRepository";
import { saveMember } from "./membershipRepository";

/**
 * Phase 2 — Business ID Registry Repository
 * Data Access Layer for /businessIds/{businessId}
 */

const businessIdRegistryStore = new Map<string, BusinessIdRegistryEntity>();

// Seed default development businessIds
const defaultRegistryRecords: BusinessIdRegistryEntity[] = [
  {
    businessId: "MW-BUS-ARGENTO-MARITIME",
    companyId: "argento-marine",
    organizationType: "COMPANY",
    createdAt: new Date().toISOString(),
  },
  {
    businessId: "MW-BUS-CREST-GROUP-MATERIALS",
    companyId: "crest-group-materials",
    organizationType: "COMPANY",
    createdAt: new Date().toISOString(),
  },
  {
    businessId: "MW-BUS-MARITIME-ASSOCIATION",
    companyId: "maritime-association",
    organizationType: "ASSOCIATION",
    createdAt: new Date().toISOString(),
  },
  {
    businessId: "MW-BUS-PORT-AUTHORITY",
    companyId: "port-authority",
    organizationType: "PUBLIC_ORGANIZATION",
    createdAt: new Date().toISOString(),
  },
];

defaultRegistryRecords.forEach((r) => businessIdRegistryStore.set(r.businessId, r));

export function getInMemoryBusinessIdRegistry(businessId: string): BusinessIdRegistryEntity | undefined {
  return businessIdRegistryStore.get(businessId);
}

export function saveInMemoryBusinessIdRegistry(
  record: BusinessIdRegistryEntity
): BusinessIdRegistryEntity {
  businessIdRegistryStore.set(record.businessId, { ...record });
  return record;
}

export function clearInMemoryBusinessIdRegistryStore(): void {
  businessIdRegistryStore.clear();
}

export function resetDefaultBusinessIdRegistryStore(): void {
  businessIdRegistryStore.clear();
  defaultRegistryRecords.forEach((r) => businessIdRegistryStore.set(r.businessId, r));
}

export async function findBusinessIdRecord(
  businessId: string
): Promise<BusinessIdRegistryEntity | null> {
  if (!businessId) return null;

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const snap = await getDoc(doc(db, "businessIds", businessId));
      if (snap.exists()) {
        return snap.data() as BusinessIdRegistryEntity;
      }
      return businessIdRegistryStore.get(businessId) || null;
    } catch (err) {
      return businessIdRegistryStore.get(businessId) || null;
    }
  }

  return businessIdRegistryStore.get(businessId) || null;
}

export async function existsBusinessId(businessId: string): Promise<boolean> {
  const rec = await findBusinessIdRecord(businessId);
  return rec !== null;
}

/**
 * Transactionally creates Business ID record, Company Entity, and OWNER Membership.
 * Guarantees atomic creation without orphans or duplicate Business IDs.
 */
export async function createTransactionalCompanyWithIdentity(params: {
  company: CompanyEntity;
  businessIdRegistry: BusinessIdRegistryEntity;
  ownerMembership: CompanyMemberEntity;
}): Promise<{ success: boolean; error?: string }> {
  const { company, businessIdRegistry, ownerMembership } = params;

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      await runTransaction(db, async (transaction) => {
        const busRef = doc(db, "businessIds", businessIdRegistry.businessId);
        const busSnap = await transaction.get(busRef);

        if (busSnap.exists()) {
          throw new Error(
            `Business ID '${businessIdRegistry.businessId}' is already registered. Duplicate Business IDs are strictly rejected.`
          );
        }

        const compRef = doc(db, "companies", company.id);
        const ownerUid = ownerMembership.userId || ownerMembership.uid || "";
        const memRef = doc(db, "companies", company.id, "memberships", ownerUid);

        transaction.set(busRef, businessIdRegistry);
        transaction.set(compRef, company);
        transaction.set(memRef, {
          ...ownerMembership,
          uid: ownerUid,
          userId: ownerUid,
          companyId: company.id,
          businessId: company.businessId,
        });
      });

      // Mirror to in-memory store for sync compatibility
      businessIdRegistryStore.set(businessIdRegistry.businessId, businessIdRegistry);
      saveCompanyRecordSync(company);
      saveMember(ownerMembership);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Firestore transaction failed" };
    }
  } else {
    // In-memory mode
    if (businessIdRegistryStore.has(businessIdRegistry.businessId)) {
      return {
        success: false,
        error: `Business ID '${businessIdRegistry.businessId}' is already registered. Duplicate Business IDs are strictly rejected.`,
      };
    }

    businessIdRegistryStore.set(businessIdRegistry.businessId, businessIdRegistry);
    saveCompanyRecordSync(company);
    saveMember(ownerMembership);

    return { success: true };
  }
}
