import type { CompanyEntity, CompanyLifecycleStatus } from "@/lib/types";
import { getPersistenceMode } from "./persistenceMode";
import { getFirebaseApp } from "@/lib/auth/firebaseAuth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

/**
 * Phase 3.4 — Company Repository
 * Data Access & Persistence Layer for /companies/{companyId}
 */

const initialCanonicalCompanies: CompanyEntity[] = [
  {
    id: "argento",
    businessId: "MW-BUS-100001",
    companyId6Digit: "100001",
    slug: "argento-marine",
    name: "Argento Marine",
    displayName: "Argento Marine",
    legalName: "Argento Marine Yatçılık ve Ticaret A.Ş.",
    brandName: "Argento Marine",
    primarySectorCategory: "Marine Logistics & Port Operations",
    secondarySectorCategories: ["Technical Vessel Provisioning", "Charter Fleet Support"],
    country: "Türkiye",
    city: "Göcek",
    headquartersCity: "Göcek",
    location: "Göcek, Türkiye",
    sectorId: "marine-services",
    industry: "Marine Services",
    verificationStatus: "VERIFIED",
    verificationLevel: "ENTERPRISE",
    operatingStatus: "ACTIVE",
    lifecycleStatus: "ACTIVE",
    registrationCountry: "Türkiye",
    registrationAuthority: "Fethiye Chamber of Commerce",
    registrationStatus: "ACTIVE / REGISTERED",
    registrationNumber: "TR-48200192",
    officialEmail: "corporate@argentomarine.com",
    officialPhone: "+90 252 645 1900",
    website: "https://argentomarine.com",
    websiteUrl: "https://argentomarine.com",
    shortDescription: "Mediterranean marine logistics, technical vessel provisioning, and charter fleet support.",
    description: "Argento Marine operates a premier network of yacht support services, specialized provisioning facilities, and bonded marine logistics throughout the eastern Mediterranean.",
    corporateDescription: "Argento Marine operates a premier network of yacht support services, specialized provisioning facilities, and bonded marine logistics throughout the eastern Mediterranean.",
    coverImage: "https://images.unsplash.com/photo-1569263979104-865ab7cd8d17?auto=format&fit=crop&w=800&q=80",
    primarySectorCityId: "supplychain",
    sectorCityIds: ["supplychain", "charter", "brokerage"],
    regionalEditions: ["MEDITERRANEAN"],
    capabilities: ["Marine Logistics", "Technical Provisioning", "Customs Clearance", "Fleet Support"],
    cloudBillingAccountId: "01A2B3-45C6D7-89E0F1",
    cloudBillingOrganizationId: "organizations/4820019200",
    cloudBillingContact: "procurement@argentomarine.com",
    googleMarketplaceEnabled: true,
    stripeCustomerId: "cus_argento_corp_01",
    status: "ACTIVE",
    platformId: "marineworld",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  } as any,
  {
    id: "blueharbour",
    businessId: "MW-BUS-100002",
    companyId6Digit: "100002",
    slug: "blueharbour-shipyards",
    name: "BlueHarbour",
    displayName: "BlueHarbour",
    legalName: "BlueHarbour Marine B.V.",
    brandName: "BlueHarbour",
    primarySectorCategory: "Shipyard & Deepwater Refit Engineering",
    secondarySectorCategories: ["Marine Component Distribution", "Automated Spares"],
    country: "Netherlands",
    city: "Rotterdam",
    headquartersCity: "Rotterdam",
    location: "Rotterdam, Netherlands",
    sectorId: "marine-services",
    industry: "Marine Services",
    verificationStatus: "VERIFIED",
    verificationLevel: "ENTERPRISE",
    operatingStatus: "ACTIVE",
    lifecycleStatus: "ACTIVE",
    registrationCountry: "Netherlands",
    registrationAuthority: "Kamer van Koophandel (KVK)",
    registrationStatus: "ACTIVE / REGISTERED",
    registrationNumber: "NL-89201144",
    officialEmail: "contact@blueharbour.nl",
    officialPhone: "+31 10 495 2000",
    website: "https://blueharbour.nl",
    websiteUrl: "https://blueharbour.nl",
    shortDescription: "Northern European deepwater logistics, vessel refit engineering, and marine component distribution.",
    description: "Headquartered in the Port of Rotterdam, BlueHarbour coordinates automated spares supply chains and shipyard engineering services across Northern European maritime hubs.",
    corporateDescription: "Headquartered in the Port of Rotterdam, BlueHarbour coordinates automated spares supply chains and shipyard engineering services across Northern European maritime hubs.",
    coverImage: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80",
    primarySectorCityId: "supplychain",
    sectorCityIds: ["supplychain", "shipyard"],
    regionalEditions: ["NORTH_EUROPE"],
    capabilities: ["Deepwater Logistics", "Refit Supervision", "Spares Distribution", "Autonomous Spares Network"],
    status: "ACTIVE",
    platformId: "marineworld",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  } as any,
  {
    id: "north-atlantic",
    businessId: "MW-BUS-100003",
    companyId6Digit: "100003",
    slug: "north-atlantic-marine",
    name: "North Atlantic Marine",
    displayName: "North Atlantic Marine",
    legalName: "North Atlantic Marine Services LLC",
    brandName: "North Atlantic Marine",
    primarySectorCategory: "Transatlantic Marine Equipment Procurement",
    secondarySectorCategories: ["Intermodal Logistics", "Superyacht Marina Supply"],
    country: "USA",
    city: "Fort Lauderdale",
    headquartersCity: "Fort Lauderdale",
    location: "Fort Lauderdale, USA",
    sectorId: "marine-services",
    industry: "Marine Services",
    verificationStatus: "VERIFIED",
    verificationLevel: "ENTERPRISE",
    operatingStatus: "ACTIVE",
    lifecycleStatus: "ACTIVE",
    registrationCountry: "USA",
    registrationAuthority: "Florida Division of Corporations",
    registrationStatus: "ACTIVE / REGISTERED",
    registrationNumber: "US-FL-902188",
    officialEmail: "operations@northatlanticmarine.com",
    officialPhone: "+1 954 522 8800",
    website: "https://northatlanticmarine.com",
    websiteUrl: "https://northatlanticmarine.com",
    shortDescription: "Transatlantic marine equipment supply and North American commercial fleet logistics.",
    description: "North Atlantic Marine provides specialized intermodal supply chain coordination, superyacht marina supply services, and offshore support across North America and the Caribbean.",
    corporateDescription: "North Atlantic Marine provides specialized intermodal supply chain coordination, superyacht marina supply services, and offshore support across North America and the Caribbean.",
    coverImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    primarySectorCityId: "supplychain",
    sectorCityIds: ["supplychain", "procurement"],
    regionalEditions: ["NORTH_AMERICA", "CARIBBEAN"],
    capabilities: ["Transatlantic Sourcing", "Marina Logistics", "Fleet Provisioning", "Workboat Support"],
    status: "ACTIVE",
    platformId: "marineworld",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  } as any,
  {
    id: "med-marine-systems",
    businessId: "MW-BUS-100005",
    companyId6Digit: "100005",
    slug: "mediterranean-marine-systems",
    name: "Mediterranean Marine Systems",
    displayName: "Mediterranean Marine Systems",
    legalName: "Mediterranean Marine Systems S.r.l.",
    brandName: "Mediterranean Marine Systems",
    primarySectorCategory: "Ligurian Maritime Automation & Navigation",
    secondarySectorCategories: ["Vessel Automation Spares", "Dockside Integration"],
    country: "Italy",
    city: "Genoa",
    headquartersCity: "Genoa",
    location: "Genoa, Italy",
    sectorId: "marine-services",
    industry: "Marine Services",
    verificationStatus: "VERIFIED",
    verificationLevel: "ENTERPRISE",
    operatingStatus: "ACTIVE",
    lifecycleStatus: "ACTIVE",
    registrationCountry: "Italy",
    registrationAuthority: "Camera di Commercio di Genova",
    registrationStatus: "ACTIVE / REGISTERED",
    registrationNumber: "IT-GE-884019",
    officialEmail: "contact@medmarinesystems.it",
    officialPhone: "+39 010 596 3000",
    website: "https://medmarinesystems.it",
    websiteUrl: "https://medmarinesystems.it",
    shortDescription: "Ligurian maritime systems engineering, vessel automation spares, and Mediterranean refit support.",
    description: "Mediterranean Marine Systems is an Italian engineering and naval supply house providing automated propulsion spares, navigation electronics, and dockside technical integration in Genoa.",
    corporateDescription: "Mediterranean Marine Systems is an Italian engineering and naval supply house providing automated propulsion spares, navigation electronics, and dockside technical integration in Genoa.",
    coverImage: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80",
    primarySectorCityId: "supplychain",
    sectorCityIds: ["supplychain", "shipyard"],
    regionalEditions: ["MEDITERRANEAN"],
    capabilities: ["Marine Automation", "Navigation Electronics", "Refit Integration", "Technical Spares"],
    status: "ACTIVE",
    platformId: "marineworld",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  } as any,
];

const companyStore = new Map<string, CompanyEntity>(
  initialCanonicalCompanies.map((c) => [c.id, c])
);

export function getInMemoryCompany(id?: string): CompanyEntity | undefined {
  if (!id || typeof id !== "string") return undefined;
  const normId = id.toLowerCase();
  for (const c of companyStore.values()) {
    if (!c) continue;
    if (c.id?.toLowerCase() === normId || c.slug?.toLowerCase() === normId) return c;
  }
  return companyStore.get(id);
}

export function saveInMemoryCompany(company: CompanyEntity): CompanyEntity {
  companyStore.set(company.id, company);
  return company;
}

export function clearInMemoryCompanyStore(companyId?: string): void {
  if (companyId) {
    companyStore.delete(companyId);
  } else {
    companyStore.clear();
  }
}

export function getCompanyRecordSync(id: string): CompanyEntity | undefined {
  return getInMemoryCompany(id);
}

export function saveCompanyRecordSync(company: CompanyEntity): CompanyEntity {
  return saveInMemoryCompany(company);
}

export function findAllCompaniesSync(): CompanyEntity[] {
  return Array.from(companyStore.values());
}

export const getAllCompanyRecords = findAllCompaniesSync;

export async function findCompanyById(id: string): Promise<CompanyEntity | null> {
  const local = getInMemoryCompany(id);
  if (getPersistenceMode() === "FIRESTORE" && id) {
    try {
      const db = getFirestore(getFirebaseApp());
      const docRef = doc(db, "companies", id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as CompanyEntity;
        saveInMemoryCompany(data);
        return data;
      }
    } catch (err) {
      console.warn(`[CompanyRepository] Firestore read failed for company ${id}, using in-memory fallback`, err);
    }
  }
  return local || null;
}

export async function findCompanyBySlug(slug: string): Promise<CompanyEntity | null> {
  if (!slug) return null;
  const norm = slug.toLowerCase();
  const companies = Array.from(companyStore.values());
  const found = companies.find((c) => c?.slug?.toLowerCase() === norm || c?.id?.toLowerCase() === norm);
  if (found) return found;
  return findCompanyById(slug);
}

export async function findAllCompanies(): Promise<CompanyEntity[]> {
  return Array.from(companyStore.values());
}

export async function saveCompany(company: CompanyEntity): Promise<CompanyEntity> {
  saveInMemoryCompany(company);
  if (getPersistenceMode() === "FIRESTORE" && company.id) {
    try {
      const db = getFirestore(getFirebaseApp());
      const docRef = doc(db, "companies", company.id);
      await setDoc(docRef, { ...company }, { merge: true });
    } catch (err) {
      console.warn(`[CompanyRepository] Firestore write failed for company ${company.id}:`, err);
    }
  }
  return company;
}

export async function updateCompanyLifecycle(
  companyId: string,
  lifecycleStatus: CompanyLifecycleStatus,
  status: string,
  activatedAt?: string | null,
  deactivatedAt?: string | null
): Promise<CompanyEntity | null> {
  const existing = getInMemoryCompany(companyId);
  if (!existing) return null;

  const now = new Date().toISOString();
  existing.lifecycleStatus = lifecycleStatus;
  existing.status = status;
  existing.updatedAt = now;

  if (activatedAt !== undefined) {
    existing.activatedAt = activatedAt;
  } else if (lifecycleStatus === "ACTIVE" && !existing.activatedAt) {
    existing.activatedAt = now;
  }

  if (deactivatedAt !== undefined) {
    existing.deactivatedAt = deactivatedAt;
  } else if (lifecycleStatus === "DEACTIVATED" && !existing.deactivatedAt) {
    existing.deactivatedAt = now;
  }

  saveInMemoryCompany(existing);

  if (getPersistenceMode() === "FIRESTORE") {
    try {
      const db = getFirestore(getFirebaseApp());
      const docRef = doc(db, "companies", companyId);
      const updateData: Record<string, any> = {
        lifecycleStatus,
        status,
        updatedAt: now,
      };
      if (existing.activatedAt !== undefined) updateData.activatedAt = existing.activatedAt;
      if (existing.deactivatedAt !== undefined) updateData.deactivatedAt = existing.deactivatedAt;

      await setDoc(docRef, updateData, { merge: true });
    } catch (err) {
      console.warn(`[CompanyRepository] Firestore lifecycle update failed for ${companyId}:`, err);
    }
  }

  return existing;
}

export function updateCompanyBillingConfig(
  companyId: string,
  billingConfig: {
    cloudBillingAccountId?: string;
    cloudBillingOrganizationId?: string;
    cloudBillingContact?: string;
    googleMarketplaceEnabled?: boolean;
    stripeCustomerId?: string;
  }
): CompanyEntity | undefined {
  const existing = getInMemoryCompany(companyId);
  if (!existing) return undefined;

  if (billingConfig.cloudBillingAccountId !== undefined) {
    existing.cloudBillingAccountId = billingConfig.cloudBillingAccountId;
  }
  if (billingConfig.cloudBillingOrganizationId !== undefined) {
    existing.cloudBillingOrganizationId = billingConfig.cloudBillingOrganizationId;
  }
  if (billingConfig.cloudBillingContact !== undefined) {
    existing.cloudBillingContact = billingConfig.cloudBillingContact;
  }
  if (billingConfig.googleMarketplaceEnabled !== undefined) {
    existing.googleMarketplaceEnabled = billingConfig.googleMarketplaceEnabled;
  }
  if (billingConfig.stripeCustomerId !== undefined) {
    existing.stripeCustomerId = billingConfig.stripeCustomerId;
  }

  existing.updatedAt = new Date().toISOString();
  saveInMemoryCompany(existing);
  return existing;
}

export async function deleteCompanyRecord(companyId: string): Promise<boolean> {
  return companyStore.delete(companyId);
}

