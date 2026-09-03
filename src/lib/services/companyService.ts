import type {
  CompanyEntity,
  CompanyMemberEntity,
  CompanyNodeEntity,
  CompanyProfile,
  CompanyNode,
  CompanyNodeType,
  PhysicalFacility,
  PhysicalFacilityType,
  FacilityMediaItem,
  FacilityOperationalStatus,
  FacilityVisibility,
  OrganizationDigitalIdentity,
  DigitalActionAttribution,
  AIAuthorityBoundaryConfig,
  AIAuthorityPermission,
  AIPassiveAction,
  AIExecutiveAction,
} from "@/lib/types";
import { notifyListeners as notifyTwinListeners } from "@/lib/businessTwinStore";
import { registerCompanyMember } from "@/lib/services/securityService";
import {
  saveCompanyRecordSync,
  getCompanyRecordSync,
  getCompanyRecord,
  findAllCompaniesSync,
} from "@/lib/repositories/companyRepository";
import { saveNode as saveNodeRepo, deleteNodeRecord as deleteNodeRepo } from "@/lib/repositories/nodeRepository";

/**
 * Company Service — Domain Service for Canonical Company, Member, Node, and Physical Facility Entities.
 * Enforces rule: Company (legal identity) -> Registered Headquarters -> Physical Facilities.
 */

const companyNodesMap = new Map<string, CompanyNodeEntity[]>();
const companyFacilitiesMap = new Map<string, PhysicalFacility[]>();
const companyMembersMap = new Map<string, CompanyMemberEntity[]>();
const attributionLog: DigitalActionAttribution[] = [];

/**
 * Deterministically generates or formats a canonical MarineWorld Business ID
 */
export function generateBusinessId(companyId: string, slug?: string): string {
  const normId = companyId.toLowerCase();
  const normSlug = slug?.toLowerCase();

  if (
    normId === "argento-marine" ||
    normId === "comp-argento-marine" ||
    normId === "argento-maritime" ||
    normId === "comp-argento-maritime" ||
    normSlug === "argento-marine" ||
    normSlug === "argento-maritime"
  ) {
    return "MW-BUS-ARGENTO-MARITIME";
  }
  const clean = (slug || companyId).toUpperCase().replace(/[^A-Z0-9]/g, "-");
  return `MW-BUS-${clean}`;
}

/**
 * Initialize canonical company record from profile if missing
 */
export function ensureCanonicalCompany(profile: CompanyProfile): CompanyEntity {
  const existing = getCompanyRecordSync(profile.id);
  if (existing) {
    return existing;
  }

  const sectorId = profile.industryDomainIds?.[0] || "marine";
  const primarySectorCityId = profile.cityIds?.[0] || profile.sectorCityIds?.[0] || "marineworld";
  const sectorCityIds = profile.sectorCityIds || profile.cityIds || [primarySectorCityId];
  if (!sectorCityIds.includes(primarySectorCityId)) {
    sectorCityIds.unshift(primarySectorCityId);
  }
  const slug = profile.slug || profile.id.toLowerCase();
  const businessId = profile.id.toLowerCase() === "argento-marine"
    ? "MW-BUS-ARGENTO-MARITIME"
    : profile.businessId || generateBusinessId(profile.id, slug);

  const isVerified = (profile.verificationStatus as string)?.toUpperCase() === "VERIFIED";

  const canonicalCompany: CompanyEntity = {
    id: profile.id,
    businessId,
    organizationType: profile.organizationType || "COMPANY",
    platformId: "marineworld",
    sectorId,
    primarySectorCityId,
    sectorCityIds,
    sectorCityId: primarySectorCityId,
    slug,
    legalName: profile.legalName || profile.name,
    displayName: profile.name,
    brandName: profile.tradingName || profile.name,
    description: profile.description || profile.shortDescription || `${profile.name} maritime enterprise.`,
    shortDescription: profile.shortDescription || `${profile.name} enterprise profile.`,
    logo: profile.initials || "/icon.png",
    heroImage: profile.coverImage,
    website: profile.website,
    email: profile.officialEmail || `contact@${slug}.com`,
    phone: profile.officialPhone || "+31 10 555 0190",
    country: profile.country || profile.registrationCountry || "Netherlands",
    city: profile.city || "Rotterdam",
    address: "Havenlaan 100",
    status: profile.operatingStatus === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    verificationStatus: isVerified ? "VERIFIED" : "PENDING",
    ownerId: profile.ownerId || "usr-owner-001",
    offerings: profile.offerings,
    products: profile.products,
    services: profile.services,
    productsList: profile.productsList,
    servicesList: profile.servicesList,
    sectorAttributes: {
      vesselTypes: ["Commercial Ships", "Offshore Support Vessels"],
      certifications: profile.certifications || [{ name: "ISO 9001:2015", issuer: "DNV" }],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveCompanyRecordSync(canonicalCompany);

  // Initialize HQ Node automatically
  const hqNode: CompanyNodeEntity = {
    id: `node-${profile.id}-hq`,
    companyId: profile.id,
    sectorCityId: primarySectorCityId,
    type: "HQ",
    nodeType: "HEADQUARTERS",
    name: `${profile.name} Global Headquarters`,
    brandName: profile.tradingName || profile.name,
    description: `Primary executive & operations facility for ${profile.name}.`,
    logo: profile.initials,
    country: canonicalCompany.country || "Netherlands",
    city: canonicalCompany.city || "Rotterdam",
    address: canonicalCompany.address || "Havenlaan 100",
    subdomain: `${slug}.marineworld.city`,
    status: "VERIFIED",
    isHeadquarters: true,
    createdAt: canonicalCompany.createdAt,
    updatedAt: canonicalCompany.updatedAt,
  };

  companyNodesMap.set(profile.id, [hqNode]);

  // Initialize default Owner Member
  const ownerMember: CompanyMemberEntity = {
    userId: profile.ownerId || "usr-owner-001",
    companyId: profile.id,
    role: "OWNER",
    status: "ACTIVE",
    createdAt: canonicalCompany.createdAt,
    updatedAt: canonicalCompany.updatedAt,
  };
  companyMembersMap.set(profile.id, [ownerMember]);
  registerCompanyMember(ownerMember);

  return canonicalCompany;
}

// Pure Firestore Mode: Data is hydrated dynamically from Firestore companyRepository

/**
 * Get canonical company by ID
 */
export function getCompanyById(companyId: string): CompanyEntity | undefined {
  return getCompanyRecordSync(companyId);
}

/**
 * Get canonical company by slug
 */
export function getCompanyBySlug(slug: string): CompanyEntity | undefined {
  return getCompanyRecordSync(slug);
}

/**
 * Get canonical company by domain
 */
export function getCompanyByDomain(domainOrHostname: string): CompanyEntity | undefined {
  if (!domainOrHostname) return undefined;
  const norm = domainOrHostname.toLowerCase();
  for (const comp of findAllCompaniesSync()) {
    if (comp.website?.toLowerCase().includes(norm) || comp.slug?.toLowerCase() === norm) {
      return comp;
    }
  }
  return undefined;
}

/**
 * List all companies (Section 6 contract alias)
 */
export function listCompanies(): CompanyEntity[] {
  return findAllCompaniesSync();
}

/**
 * Get active companies belonging to a sector city
 */
export function getCompaniesBySectorCity(sectorCityId: string): CompanyEntity[] {
  const normCityId = sectorCityId.toLowerCase();
  return findAllCompaniesSync().filter((c) => {
    const isLifecycleActive = !c.lifecycleStatus || c.lifecycleStatus === "ACTIVE";
    const isStatusActive = !c.status || c.status === "ACTIVE";
    const isActive = isLifecycleActive && isStatusActive;
    if (!isActive) return false;
    const isPrimary = c.primarySectorCityId?.toLowerCase() === normCityId || c.sectorCityId?.toLowerCase() === normCityId;
    const isMember = c.sectorCityIds?.some((sc) => sc.toLowerCase() === normCityId);
    const isSector = c.sectorId?.toLowerCase() === normCityId;
    return isPrimary || isMember || isSector;
  });
}

/**
 * Save company entity into companyRepository
 */
export function saveCompany(company: CompanyEntity): CompanyEntity {
  return saveCompanyRecordSync(company);
}

/**
 * Create company entity (Section 6 contract alias)
 */
export function createCompany(company: CompanyEntity): CompanyEntity {
  return saveCompanyRecordSync(company);
}

/**
 * Update company entity (Section 6 contract alias)
 */
export function updateCompany(company: CompanyEntity): CompanyEntity {
  return saveCompanyRecordSync(company);
}

/**
 * Get all registered companies
 */
export function getAllCompanies(): CompanyEntity[] {
  return findAllCompaniesSync();
}

/**
 * Get all operational nodes for a company
 */
export function getCompanyNodes(companyId: string): CompanyNodeEntity[] {
  return companyNodesMap.get(companyId) || [];
}

/**
 * Add an operational node (Branch, Regional Node, Authorized Distributor, etc.)
 */
export function addCompanyNode(
  companyId: string,
  nodeData: Omit<CompanyNodeEntity, "id" | "companyId" | "createdAt" | "updatedAt">
): CompanyNodeEntity {
  const existing = companyNodesMap.get(companyId) || [];
  const newNode: CompanyNodeEntity = {
    ...nodeData,
    id: `node-${companyId}-${Date.now()}`,
    companyId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  existing.push(newNode);
  companyNodesMap.set(companyId, existing);
  saveNodeRepo(newNode).catch((err) => {
    console.warn(`[CompanyService] Async node save failed for ${newNode.id}:`, err);
  });
  notifyTwinListeners();

  return newNode;
}

/**
 * Update an existing operational node
 */
export function updateCompanyNode(
  companyId: string,
  nodeId: string,
  updates: Partial<CompanyNodeEntity>
): CompanyNodeEntity | undefined {
  const nodes = companyNodesMap.get(companyId) || [];
  const index = nodes.findIndex((n) => n.id === nodeId);
  if (index === -1) return undefined;

  nodes[index] = {
    ...nodes[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  companyNodesMap.set(companyId, nodes);
  saveNodeRepo(nodes[index]).catch((err) => {
    console.warn(`[CompanyService] Async node update failed for ${nodeId}:`, err);
  });
  notifyTwinListeners();

  return nodes[index];
}

/**
 * Remove an operational node
 */
export function removeCompanyNode(companyId: string, nodeId: string): boolean {
  const nodes = companyNodesMap.get(companyId) || [];
  const filtered = nodes.filter((n) => n.id !== nodeId);
  if (filtered.length === nodes.length) return false;
  companyNodesMap.set(companyId, filtered);
  deleteNodeRepo(companyId, nodeId).catch((err) => {
    console.warn(`[CompanyService] Async node deletion failed for ${nodeId}:`, err);
  });
  notifyTwinListeners();
  return true;
}

/**
 * Get company members and roles
 */
export function getCompanyMembers(companyId: string): CompanyMemberEntity[] {
  return companyMembersMap.get(companyId) || [];
}

/**
 * Add or update member role
 */
export function setCompanyMemberRole(
  companyId: string,
  userId: string,
  role: CompanyMemberEntity["role"]
): CompanyMemberEntity {
  const members = companyMembersMap.get(companyId) || [];
  const existingIndex = members.findIndex((m) => m.userId === userId);

  const updatedMember: CompanyMemberEntity = {
    userId,
    companyId,
    role,
    status: "ACTIVE",
    createdAt: existingIndex >= 0 ? members[existingIndex].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    members[existingIndex] = updatedMember;
  } else {
    members.push(updatedMember);
  }

  companyMembersMap.set(companyId, members);
  registerCompanyMember(updatedMember);
  return updatedMember;
}

/**
 * Map canonical CompanyNodeEntity array to legacy CompanyNode array for backward compatibility
 */
export function mapNodesToLegacyFormat(nodes: CompanyNodeEntity[]): CompanyNode[] {
  return nodes.map((n) => ({
    id: n.id,
    companyId: n.companyId,
    name: n.name,
    city: n.city || "Rotterdam",
    country: n.country || "Netherlands",
    address: n.address || "",
    operationType: (n.nodeType as CompanyNodeType) || "HEADQUARTERS",
    description: n.description || "",
    subdomain: n.subdomain || "",
    status: n.status === "ACTIVE" || n.status === "VERIFIED" ? "VERIFIED" : "PENDING",
    isHeadquarters: n.isHeadquarters,
  }));
}

/* ====================================================================
   CANONICAL PHYSICAL OPERATING PRESENCE LAYER
   ==================================================================== */

/**
 * Seed initial physical facilities for a company if none exist yet
 */
function initializeCompanyFacilities(companyId: string): PhysicalFacility[] {
  const company = getCompanyById(companyId) || getCompanyBySlug(companyId);
  const compName = company?.displayName || company?.legalName || "Marine Enterprise";
  const compCity = company?.city || company?.headquartersCity || "Rotterdam";
  const compCountry = company?.country || "Netherlands";

  // Check if company already has physicalFacilities saved in Firestore
  if (company?.physicalFacilities && Array.isArray(company.physicalFacilities)) {
    companyFacilitiesMap.set(companyId, company.physicalFacilities);
    return company.physicalFacilities;
  }

  // Check if already seeded
  if (companyFacilitiesMap.has(companyId)) {
    return companyFacilitiesMap.get(companyId)!;
  }

  // Pre-seed default curated physical facilities for recognized companies
  let initialFacilities: PhysicalFacility[] = [];

  if (companyId === "argento-marine" || companyId === "company_001") {
    initialFacilities = [
      {
        id: `fac-${companyId}-hq`,
        companyId,
        facilityName: `${compName} Global Headquarters & Technical Center`,
        facilityType: "Headquarters",
        country: "Netherlands",
        city: "Rotterdam",
        address: "Waalhaven Oostzijde 88, 3087 BM Rotterdam",
        description: "Primary corporate headquarters, naval engineering design studio, and computational fluid dynamics lab.",
        operationalScope: "Deepwater vessel refit engineering, telemetry monitoring, global project coordination, and client advisory.",
        contactEmail: "hq@argento-marine.com",
        contactPhone: "+31 10 555 0190",
        status: "ACTIVE",
        visibility: "PUBLIC",
        isHeadquarters: true,
        verificationStatus: "VERIFIED",
        website: "https://argento-marine.marineworld.city",
        openingHours: "Mon - Fri: 08:00 - 18:00 CET",
        yearEstablished: "2018",
        media: [],
      },
      {
        id: `fac-${companyId}-yard`,
        companyId,
        facilityName: "Argento Subsea Propulsion & Assembly Yard",
        facilityType: "Shipyard",
        country: "Netherlands",
        city: "Schiedam",
        address: "Havenstraat 14, 3115 HC Schiedam",
        description: "Heavy mechanical assembly, electric pod drivetrain testing, and drydock refit facilities.",
        operationalScope: "Hybrid propulsion integration, shaft alignment, and emergency refit response.",
        contactEmail: "yard@argento-marine.com",
        contactPhone: "+31 10 555 0194",
        status: "ACTIVE",
        visibility: "PUBLIC",
        isHeadquarters: false,
        verificationStatus: "VERIFIED",
        openingHours: "24/7 Drydock Operations",
        yearEstablished: "2020",
        media: [],
      },
      {
        id: `fac-${companyId}-hub`,
        companyId,
        facilityName: "Argento Singapore Regional Logistics & Support Hub",
        facilityType: "Distribution Hub",
        country: "Singapore",
        city: "Singapore",
        address: "Loyang Offshore Supply Base, Singapore 508988",
        description: "Asia-Pacific spare parts distribution, telemetry field support, and regional technician dispatch.",
        operationalScope: "Rapid response inventory for Southeast Asian maritime routes and port calls.",
        contactEmail: "apac@argento-marine.com",
        contactPhone: "+65 6789 0123",
        status: "ACTIVE",
        visibility: "PUBLIC",
        isHeadquarters: false,
        verificationStatus: "VERIFIED",
        openingHours: "Mon - Sat: 08:30 - 17:30 SGT",
        yearEstablished: "2022",
        media: [],
      },
    ];
  } else {
    // Default single canonical HQ facility for any company
    initialFacilities = [
      {
        id: `fac-${companyId}-hq`,
        companyId,
        facilityName: `${compName} Registered Headquarters`,
        facilityType: "Headquarters",
        country: compCountry,
        city: compCity,
        address: `${compCity} Maritime Sector Base`,
        description: `Primary corporate headquarters and administrative facility for ${compName}.`,
        operationalScope: "Executive direction, administrative operations, and primary commercial hub.",
        contactEmail: company?.officialEmail || `contact@${company?.slug || "company"}.com`,
        contactPhone: company?.officialPhone || "+31 10 555 0100",
        status: "ACTIVE",
        visibility: "PUBLIC",
        isHeadquarters: true,
        verificationStatus: "VERIFIED",
        media: [],
      },
    ];
  }

  companyFacilitiesMap.set(companyId, initialFacilities);
  return initialFacilities;
}

/**
 * Get all physical operating facilities for a company
 */
export function getPhysicalFacilities(companyId: string): PhysicalFacility[] {
  const comp = getCompanyById(companyId) || getCompanyBySlug(companyId);
  if (comp?.physicalFacilities && Array.isArray(comp.physicalFacilities)) {
    companyFacilitiesMap.set(companyId, comp.physicalFacilities);
    return comp.physicalFacilities;
  }
  if (companyFacilitiesMap.has(companyId)) {
    return companyFacilitiesMap.get(companyId)!;
  }
  return initializeCompanyFacilities(companyId);
}

/**
 * Asynchronously fetch physical operating facilities directly from Firestore company record
 */
export async function fetchPhysicalFacilitiesAsync(companyId: string): Promise<PhysicalFacility[]> {
  if (!companyId) return [];
  try {
    const comp = await getCompanyRecord(companyId);
    if (comp?.physicalFacilities && Array.isArray(comp.physicalFacilities)) {
      companyFacilitiesMap.set(companyId, comp.physicalFacilities);
      return comp.physicalFacilities;
    }
  } catch (err) {
    console.warn(`[CompanyService] fetchPhysicalFacilitiesAsync error for ${companyId}:`, err);
  }
  return getPhysicalFacilities(companyId);
}

/**
 * Get the single canonical Registered Headquarters for a company
 */
export function getRegisteredHeadquarters(companyId: string): PhysicalFacility | undefined {
  const facilities = getPhysicalFacilities(companyId);
  return facilities.find((f) => f.isHeadquarters) || facilities[0];
}

/**
 * Get additional physical operating facilities (excludes the single canonical Registered Headquarters)
 */
export function getAdditionalFacilities(companyId: string): PhysicalFacility[] {
  const facilities = getPhysicalFacilities(companyId);
  const hq = getRegisteredHeadquarters(companyId);
  return facilities.filter((f) => !f.isHeadquarters && f.id !== hq?.id);
}

/**
 * Set a specific facility as the Registered Headquarters (enforces exactly ONE HQ)
 */
export function setRegisteredHeadquarters(companyId: string, facilityId: string): PhysicalFacility | undefined {
  const facilities = getPhysicalFacilities(companyId);
  const target = facilities.find((f) => f.id === facilityId);
  if (!target) return undefined;

  facilities.forEach((f) => {
    f.isHeadquarters = f.id === facilityId;
  });

  companyFacilitiesMap.set(companyId, [...facilities]);

  // Sync with company entity
  const comp = getCompanyById(companyId);
  if (comp) {
    comp.city = target.city;
    comp.country = target.country;
    comp.location = `${target.city}, ${target.country}`;
    comp.registeredHeadquarters = target;
    saveCompanyRecordSync(comp);
  }

  notifyTwinListeners();
  return target;
}

/**
 * Add a new physical operating facility
 */
export function addPhysicalFacility(
  companyId: string,
  facilityData: Omit<PhysicalFacility, "id" | "companyId" | "createdAt" | "updatedAt">
): PhysicalFacility {
  const facilities = getPhysicalFacilities(companyId);

  // If this new facility is marked as HQ, unmark existing HQs
  if (facilityData.isHeadquarters) {
    facilities.forEach((f) => {
      f.isHeadquarters = false;
    });
  }

  const newFacility: PhysicalFacility = {
    ...facilityData,
    id: `fac-${companyId}-${Date.now()}`,
    companyId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  facilities.push(newFacility);
  companyFacilitiesMap.set(companyId, facilities);

  // Sync to Firestore company entity
  const comp = getCompanyById(companyId);
  if (comp) {
    comp.physicalFacilities = facilities;
    if (newFacility.isHeadquarters) {
      comp.city = newFacility.city;
      comp.country = newFacility.country;
      comp.location = `${newFacility.city}, ${newFacility.country}`;
      comp.registeredHeadquarters = newFacility;
    }
    saveCompanyRecordSync(comp);
  }

  // Synchronize with CompanyNodeEntity for backward compatibility
  addCompanyNode(companyId, {
    name: newFacility.facilityName,
    city: newFacility.city,
    country: newFacility.country,
    address: newFacility.address,
    type: newFacility.isHeadquarters ? "HQ" : "PRODUCTION",
    isHeadquarters: Boolean(newFacility.isHeadquarters),
    status: newFacility.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
    description: newFacility.description,
  });

  notifyTwinListeners();
  return newFacility;
}

/**
 * Update an existing physical facility
 */
export function updatePhysicalFacility(
  companyId: string,
  facilityId: string,
  updates: Partial<PhysicalFacility>
): PhysicalFacility | undefined {
  const facilities = getPhysicalFacilities(companyId);
  const index = facilities.findIndex((f) => f.id === facilityId);
  if (index === -1) return undefined;

  // If setting this facility as HQ, unmark others
  if (updates.isHeadquarters) {
    facilities.forEach((f, idx) => {
      if (idx !== index) f.isHeadquarters = false;
    });
  }

  facilities[index] = {
    ...facilities[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  companyFacilitiesMap.set(companyId, [...facilities]);

  // Sync to Firestore company entity
  const comp = getCompanyById(companyId);
  if (comp) {
    comp.physicalFacilities = [...facilities];
    if (facilities[index].isHeadquarters) {
      comp.city = facilities[index].city;
      comp.country = facilities[index].country;
      comp.location = `${facilities[index].city}, ${facilities[index].country}`;
      comp.registeredHeadquarters = facilities[index];
    }
    saveCompanyRecordSync(comp);
  }

  notifyTwinListeners();
  return facilities[index];
}

/**
 * Remove a physical facility (cannot delete if it's the only facility or primary HQ without reassigning)
 */
export function removePhysicalFacility(companyId: string, facilityId: string): boolean {
  const facilities = getPhysicalFacilities(companyId);
  const target = facilities.find((f) => f.id === facilityId);
  if (!target) return false;

  const remaining = facilities.filter((f) => f.id !== facilityId);

  // If deleted facility was HQ and others remain, designate first remaining as HQ
  if (target.isHeadquarters && remaining.length > 0) {
    remaining[0].isHeadquarters = true;
  }

  companyFacilitiesMap.set(companyId, remaining);

  // Sync to Firestore company entity
  const comp = getCompanyById(companyId);
  if (comp) {
    comp.physicalFacilities = remaining;
    if (target.isHeadquarters && remaining.length > 0) {
      comp.registeredHeadquarters = remaining[0];
    }
    saveCompanyRecordSync(comp);
  }

  notifyTwinListeners();
  return true;
}

/**
 * Update Geographic Coverage (operating countries and operating regions)
 */
export function updateGeographicCoverage(
  companyId: string,
  operatingCountries: string[],
  operatingRegions: string[]
): CompanyEntity | undefined {
  const company = getCompanyById(companyId) || getCompanyBySlug(companyId);
  if (!company) return undefined;

  company.operatingCountries = operatingCountries;
  company.operatingRegions = operatingRegions;
  company.countriesServed = operatingCountries;
  company.regionalEditions = operatingRegions;
  company.updatedAt = new Date().toISOString();

  saveCompanyRecordSync(company);
  notifyTwinListeners();
  return company;
}

/* ====================================================================
   STAGE 12.0 — ORGANIZATIONAL DIGITAL IDENTITY & ATTRIBUTION HELPERS
   ==================================================================== */

/**
 * Resolves full OrganizationDigitalIdentity contract for a given company/organization
 */
export function getOrganizationDigitalIdentity(companyId: string): OrganizationDigitalIdentity | undefined {
  const company = getCompanyById(companyId) || getCompanyBySlug(companyId);
  if (!company) return undefined;

  const nodes = getCompanyNodes(company.id);
  const members = getCompanyMembers(company.id);
  const ownerMember = members.find((m) => m.role === "OWNER") || members[0];
  const ownerUserId = company.ownerId || ownerMember?.userId || "usr-owner-001";

  const domain = company.slug ? `${company.slug}.marineworld.city` : `${company.id}.marineworld.city`;
  const canonicalUrl = `https://${domain}/`;
  const businessId = company.businessId || generateBusinessId(company.id, company.slug);

  return {
    businessId,
    entityId: company.id,
    organizationType: company.organizationType || "COMPANY",
    slug: company.slug || company.id,
    legalName: company.legalName || company.displayName,
    displayName: company.displayName,
    principalAuthority: {
      ownerUserId,
      authorityStatus: "ACTIVE",
    },
    authorizedRepresentatives: members.map((m) => ({
      userId: m.userId,
      role: m.role,
    })),
    verificationState: company.verificationStatus === "VERIFIED" ? "VERIFIED" : "PENDING",
    authenticationBinding: {
      primaryDomain: domain,
      alternativeDomains: company.website ? [company.website] : [],
    },
    digitalPresence: {
      canonicalUrl,
      hostname: domain,
      alternativeHostnames: company.websiteUrl ? [company.websiteUrl] : [],
    },
    schemaOrgId: `${canonicalUrl}#organization`,
    lifecycleState: company.status === "ACTIVE" ? "ACTIVE" : company.status === "INACTIVE" ? "SUSPENDED" : "CREATED",
    createdAt: typeof company.createdAt === "string" ? company.createdAt : new Date().toISOString(),
    updatedAt: typeof company.updatedAt === "string" ? company.updatedAt : new Date().toISOString(),
  };
}

/**
 * Records digital action attribution with full audit context
 */
export function recordDigitalActionAttribution(
  attribution: Omit<DigitalActionAttribution, "id" | "timestamp">
): DigitalActionAttribution {
  const entry: DigitalActionAttribution = {
    ...attribution,
    id: `attr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  attributionLog.push(entry);
  return entry;
}

/**
 * Retrieves digital action attribution log for an organization
 */
export function getActionAttributionLog(organizationId?: string): DigitalActionAttribution[] {
  if (organizationId) {
    return attributionLog.filter((a) => a.organizationId === organizationId || a.companyId === organizationId);
  }
  return [...attributionLog];
}

/**
 * Evaluates AI Authority Boundary permissions for organizational actions
 */
export function evaluateAIAuthorityPermission(
  action: AIAuthorityPermission,
  boundaryConfig: AIAuthorityBoundaryConfig,
  isHumanApproved: boolean
): { allowed: boolean; reason: string } {
  const passiveActions: AIPassiveAction[] = ["AI_READ", "AI_ANALYZE", "AI_DRAFT", "AI_RECOMMEND", "AI_PREPARE"];
  const executiveActions: AIExecutiveAction[] = ["AI_SEND", "AI_SUBMIT", "AI_APPROVE", "AI_ACCEPT", "AI_SIGN", "AI_EXECUTE"];

  if (passiveActions.includes(action as AIPassiveAction)) {
    const isAllowed = boundaryConfig.allowedPassiveActions.includes(action as AIPassiveAction);
    return {
      allowed: isAllowed,
      reason: isAllowed ? "Passive AI action permitted within company data boundary." : "Passive action not configured in AI boundary.",
    };
  }

  if (executiveActions.includes(action as AIExecutiveAction)) {
    if (!boundaryConfig.allowedExecutiveActions.includes(action as AIExecutiveAction)) {
      return { allowed: false, reason: "Executive AI action not permitted in boundary configuration." };
    }
    if (boundaryConfig.humanApprovalRequired && !isHumanApproved) {
      return { allowed: false, reason: "Executive AI action requires explicit human authorization." };
    }
    return { allowed: true, reason: "Executive AI action authorized with human confirmation." };
  }

  return { allowed: false, reason: "Unknown AI action type." };
}

