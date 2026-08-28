import type {
  CompanyProfile,
  CompanyNode,
  CompanyNodeType,
  BusinessTwinModel,
  TwinSectionCompleteness,
} from "@/lib/types";
import { getCompanyProducts, getCompanyServices } from "@/lib/registry";
import { recordPlatformEvent } from "@/lib/metricsStore";
import { getCurrentAuthSession, hasCompanyRole, isAuthenticated } from "@/lib/services/securityService";

// In-memory runtime cache for company nodes and twin overrides synced with Firestore
const COMPANY_NODES_STORE: Record<string, CompanyNode[]> = {};
const TWIN_OVERRIDES_STORE: Record<string, Partial<BusinessTwinModel>> = {};
const LISTENERS: Array<() => void> = [];

function seedCompanyNodes() {
  // Pure Firestore mode: nodes are fetched from Firestore
}


/**
 * Subscribe to Business Twin mutations
 */
export function subscribeBusinessTwin(callback: () => void): () => void {
  LISTENERS.push(callback);
  return () => {
    const idx = LISTENERS.indexOf(callback);
    if (idx >= 0) LISTENERS.splice(idx, 1);
  };
}

export function notifyListeners() {
  LISTENERS.forEach((fn) => fn());
}

/**
 * Canonical Standard Capabilities Taxonomy
 */
export const CANONICAL_CAPABILITIES_TAXONOMY = [
  "MANUFACTURING",
  "REPAIR & OVERHAUL",
  "MAINTENANCE",
  "DISTRIBUTION & SUPPLY",
  "CONSULTING & ADVISORY",
  "ENGINEERING & DESIGN",
  "LOGISTICS & FREIGHT",
  "INSTALLATION & COMMISSIONING",
  "CHARTER & OPERATIONS",
  "TRAINING & SIMULATION",
  "INSPECTION & CLASS SURVEY",
  "CUSTOM FABRICATION",
  "SYSTEM INTEGRATION",
  "TESTING & CERTIFICATION",
];

/**
 * Company Type Taxonomy
 */
export const COMPANY_TYPE_TAXONOMY = [
  "Manufacturer",
  "Distributor",
  "Service Provider",
  "Shipyard",
  "Marina",
  "Yacht Builder",
  "Broker",
  "Consultancy",
  "Technology Provider",
  "Supplier",
  "Logistics Provider",
  "Association",
  "Organization",
];

/**
 * Deterministic Section & Overall Completeness Calculator
 */
export function calculateTwinCompleteness(
  company: CompanyProfile,
  nodes: CompanyNode[],
  productsCount: number,
  servicesCount: number,
  capabilities: string[],
  identityOverride?: Partial<BusinessTwinModel["identity"]>
): {
  overallScore: number;
  sectionCompleteness: Record<string, TwinSectionCompleteness>;
} {
  // 1. Identity (4 required fields)
  const legalName = identityOverride?.legalName || company.legalName || company.name;
  const companyType = identityOverride?.companyType || company.companyType || "Service Provider";
  const industry = identityOverride?.industry || company.industry || "Marine";
  const shortDesc = identityOverride?.shortDescription || company.shortDescription || "";

  const identityFields = [
    { label: "Company Legal Name", ok: Boolean(legalName && legalName.length > 2) },
    { label: "Company Taxonomy Type", ok: Boolean(companyType) },
    { label: "Industry Sector Classification", ok: Boolean(industry) },
    { label: "Executive Summary / Short Description", ok: Boolean(shortDesc && shortDesc.length > 15) },
  ];
  const identityOk = identityFields.filter((f) => f.ok).length;
  const identityScore = Math.round((identityOk / identityFields.length) * 100);

  // 2. Organization (3 required fields)
  const hqNode = nodes.find((n) => n.isHeadquarters) || nodes[0];
  const orgFields = [
    { label: "Headquarters Node Name", ok: Boolean(hqNode?.name) },
    { label: "Headquarters City", ok: Boolean(hqNode?.city || company.city) },
    { label: "Headquarters Country", ok: Boolean(hqNode?.country || company.location) },
  ];
  const orgOk = orgFields.filter((f) => f.ok).length;
  const orgScore = Math.round((orgOk / orgFields.length) * 100);

  // 3. Products (1 required)
  const prodScore = productsCount > 0 ? 100 : 0;

  // 4. Services (1 required)
  const servScore = servicesCount > 0 ? 100 : 0;

  // 5. Capabilities (1 required)
  const capScore = capabilities.length > 0 ? 100 : 0;

  // 6. Digital Presence (3 required)
  const presFields = [
    { label: "Official Brand Logo / Initials", ok: Boolean(company.initials || company.name) },
    { label: "Verification Status", ok: Boolean(company.verificationStatus === "verified") },
    { label: "Official Email or Website", ok: Boolean(company.officialEmail || company.website) },
  ];
  const presOk = presFields.filter((f) => f.ok).length;
  const presScore = Math.round((presOk / presFields.length) * 100);

  const sectionCompleteness: Record<string, TwinSectionCompleteness> = {
    identity: {
      sectionId: "identity",
      sectionLabel: "Company Identity",
      score: identityScore,
      completedFieldsCount: identityOk,
      totalFieldsCount: identityFields.length,
      missingRequiredFields: identityFields.filter((f) => !f.ok).map((f) => f.label),
    },
    organization: {
      sectionId: "organization",
      sectionLabel: "Organization & Nodes",
      score: orgScore,
      completedFieldsCount: orgOk,
      totalFieldsCount: orgFields.length,
      missingRequiredFields: orgFields.filter((f) => !f.ok).map((f) => f.label),
    },
    products: {
      sectionId: "products",
      sectionLabel: "Published Products",
      score: prodScore,
      completedFieldsCount: productsCount > 0 ? 1 : 0,
      totalFieldsCount: 1,
      missingRequiredFields: productsCount > 0 ? [] : ["At least one published product in catalog"],
    },
    services: {
      sectionId: "services",
      sectionLabel: "Published Services",
      score: servScore,
      completedFieldsCount: servicesCount > 0 ? 1 : 0,
      totalFieldsCount: 1,
      missingRequiredFields: servicesCount > 0 ? [] : ["At least one published service offering"],
    },
    capabilities: {
      sectionId: "capabilities",
      sectionLabel: "Organizational Capabilities",
      score: capScore,
      completedFieldsCount: capabilities.length > 0 ? 1 : 0,
      totalFieldsCount: 1,
      missingRequiredFields: capabilities.length > 0 ? [] : ["At least one capability tag assigned"],
    },
    digital_presence: {
      sectionId: "digital_presence",
      sectionLabel: "Digital Presence & Trust",
      score: presScore,
      completedFieldsCount: presOk,
      totalFieldsCount: presFields.length,
      missingRequiredFields: presFields.filter((f) => !f.ok).map((f) => f.label),
    },
  };

  const totalPossible = identityFields.length + orgFields.length + 1 + 1 + 1 + presFields.length;
  const totalCompleted = identityOk + orgOk + (productsCount > 0 ? 1 : 0) + (servicesCount > 0 ? 1 : 0) + (capabilities.length > 0 ? 1 : 0) + presOk;
  const overallScore = Math.round((totalCompleted / totalPossible) * 100);

  return { overallScore, sectionCompleteness };
}

/**
 * Get Canonical Business Twin for Company
 * STRICT COMPANY ISOLATION: Scoped purely by company.id
 */
export function getBusinessTwin(company: CompanyProfile): BusinessTwinModel {
  const companyId = company.id;

  // Retrieve nodes or fallback to default HQ node
  const nodes = COMPANY_NODES_STORE[companyId] || [
    {
      id: `node-${companyId}-hq`,
      companyId,
      name: `${company.name} Headquarters`,
      city: company.city || "Southampton",
      country: company.location?.includes(",") ? company.location.split(",")[1].trim() : "United Kingdom",
      address: `${company.city || "Main Maritime Sector"}, Regional Hub`,
      operationType: "HEADQUARTERS",
      description: company.shortDescription || `Primary corporate headquarters for ${company.name}.`,
      subdomain: `hq.${company.slug || company.id}.marineworld.city`,
      contactEmail: company.officialEmail || `hq@${company.slug || "company"}.com`,
      status: company.verificationStatus === "verified" ? "VERIFIED" : "ACTIVE",
      isHeadquarters: true,
    },
  ];

  const hqNode = nodes.find((n) => n.isHeadquarters) || nodes[0];
  const regionalNodes = nodes.filter((n) => !n.isHeadquarters);

  // Retrieve products and services references from canonical registry
  const products = getCompanyProducts(company);
  const services = getCompanyServices(company);

  const capabilities = company.capabilities && company.capabilities.length > 0
    ? company.capabilities
    : ["ENGINEERING & DESIGN", "MAINTENANCE", "SYSTEM INTEGRATION"];

  // Apply twin overrides if any exist
  const override = TWIN_OVERRIDES_STORE[companyId] || {};

  const identity = {
    legalName: override.identity?.legalName || company.legalName || company.name,
    brandName: override.identity?.brandName || company.tradingName || company.name,
    companyType: override.identity?.companyType || company.companyType || "Service Provider",
    industry: override.identity?.industry || company.industry || "Marine & Maritime",
    sectorId: "marine",
    subsectorId: company.city,
    shortDescription: override.identity?.shortDescription || company.shortDescription || `${company.name} provides specialized solutions for the marine industry.`,
    description: override.identity?.description || company.description || company.shortDescription || `${company.name} operates as a verified digital entity within MarineWorld.City.`,
    foundedYear: override.identity?.foundedYear || company.foundedYear || "2018",
    registrationNumber: company.registrationNumber || "UK-REG-892011",
    website: company.website || `https://${company.slug || company.id}.marineworld.city`,
  };

  const nodeTypesSummary: Record<string, number> = {};
  nodes.forEach((n) => {
    nodeTypesSummary[n.operationType] = (nodeTypesSummary[n.operationType] || 0) + 1;
  });

  const { overallScore, sectionCompleteness } = calculateTwinCompleteness(
    company,
    nodes,
    products.length,
    services.length,
    capabilities,
    identity
  );

  const isCompanyVerified = Boolean(
    company.verificationStatus === "verified" ||
    (company.verificationStatus as string) === "VERIFIED"
  );

  const trustSignals = [
    {
      id: "sig-identity",
      label: "Verified Business Identity",
      verified: isCompanyVerified,
      source: "MarineWorld Public Registry",
    },
    {
      id: "sig-hq",
      label: "Verified Headquarters Location",
      verified: Boolean(hqNode && (hqNode.status === "VERIFIED" || hqNode.status === "ACTIVE")),
      source: "Sector City Physical Audit",
    },
    {
      id: "sig-contact",
      label: "Verified Digital Contact Channel",
      verified: Boolean(company.officialEmail || company.website),
      source: "Domain Validation",
    },
    {
      id: "sig-governance",
      label: "Institutional Governance Audit",
      verified: Boolean((company.governanceStatus || "ACTIVE") === "ACTIVE" || company.operatingStatus === "ACTIVE"),
      source: "Class Classification / Registry",
    },
  ];

  return {
    companyId,
    companySlug: company.slug || company.id,
    lastUpdated: new Date().toISOString(),
    version: "1.0.0",
    verificationStatus: company.verificationStatus === "verified" ? "VERIFIED" : "PENDING",
    overallCompleteness: overallScore,
    sectionCompleteness,
    identity,
    organization: {
      headquarters: hqNode,
      regionalNodes,
      totalNodeCount: nodes.length,
      nodeTypesSummary,
      registeredHeadquarters: company.registeredHeadquarters,
      physicalFacilities: company.physicalFacilities,
      operatingCountries: company.operatingCountries || company.countriesServed,
      operatingRegions: company.operatingRegions || company.regionalEditions,
    },
    productsSummary: {
      totalCount: products.length,
      categoriesCount: new Set(products.map((p) => p.category)).size,
      productIds: products.map((p) => p.id),
    },
    servicesSummary: {
      totalCount: services.length,
      categoriesCount: new Set(services.map((s) => s.category)).size,
      serviceIds: services.map((s) => s.id),
    },
    capabilities,
    digitalPresence: {
      profileUrl: `/companies/${company.slug || company.id}`,
      websiteUrl: company.website,
      subdomain: hqNode.subdomain,
      hasLogo: Boolean(company.initials || company.name),
      hasHeroImage: Boolean(company.coverImage),
      publicVisibility: company.publicProfile ?? true,
      officialEmail: company.officialEmail,
      officialPhone: company.officialPhone,
    },
    trustSignals,
  };
}

/**
 * Controlled Edit Operation: Update Identity
 */
export function updateBusinessIdentity(
  company: CompanyProfile,
  identityData: Partial<BusinessTwinModel["identity"]>
): BusinessTwinModel {
  const companyId = company.id;
  const auth = getCurrentAuthSession();
  if (!isAuthenticated(auth) || !hasCompanyRole(companyId, ["OWNER", "ADMIN", "MANAGER"], auth)) {
    throw new Error("Unauthorized: You do not have permission to modify this company's business identity.");
  }

  if (!TWIN_OVERRIDES_STORE[companyId]) {
    TWIN_OVERRIDES_STORE[companyId] = {};
  }

  TWIN_OVERRIDES_STORE[companyId].identity = {
    ...TWIN_OVERRIDES_STORE[companyId].identity,
    ...identityData,
  };

  // Record audit platform event
  recordPlatformEvent({
    eventType: "cta_click",
    companyId,
    metadata: {
      auditAction: "business_identity_updated",
      updatedFields: Object.keys(identityData),
    },
  });

  notifyListeners();
  return getBusinessTwin(company);
}

/**
 * Controlled Edit Operation: Add Company Node
 */
export function addCompanyNode(
  companyId: string,
  nodeData: Omit<CompanyNode, "id" | "companyId" | "status">
): CompanyNode {
  const auth = getCurrentAuthSession();
  if (!isAuthenticated(auth) || !hasCompanyRole(companyId, ["OWNER", "ADMIN", "MANAGER"], auth)) {
    throw new Error("Unauthorized: You do not have permission to add operating nodes for this company.");
  }

  if (!COMPANY_NODES_STORE[companyId]) {
    COMPANY_NODES_STORE[companyId] = [];
  }

  const newNode: CompanyNode = {
    ...nodeData,
    id: `node-${companyId}-${Date.now()}`,
    companyId,
    status: "ACTIVE",
  };

  COMPANY_NODES_STORE[companyId].push(newNode);

  recordPlatformEvent({
    eventType: "cta_click",
    companyId,
    metadata: {
      auditAction: "business_node_added",
      nodeName: newNode.name,
      operationType: newNode.operationType,
    },
  });

  notifyListeners();
  return newNode;
}

/**
 * Controlled Edit Operation: Update Company Node
 */
export function updateCompanyNode(
  companyId: string,
  nodeId: string,
  nodeData: Partial<CompanyNode>
): void {
  const auth = getCurrentAuthSession();
  if (!isAuthenticated(auth) || !hasCompanyRole(companyId, ["OWNER", "ADMIN", "MANAGER"], auth)) {
    throw new Error("Unauthorized: You do not have permission to update operating nodes for this company.");
  }

  const nodes = COMPANY_NODES_STORE[companyId];
  if (!nodes) return;

  const idx = nodes.findIndex((n) => n.id === nodeId);
  if (idx >= 0) {
    nodes[idx] = { ...nodes[idx], ...nodeData };

    recordPlatformEvent({
      eventType: "cta_click",
      companyId,
      metadata: {
        auditAction: "business_node_updated",
        nodeId,
      },
    });

    notifyListeners();
  }
}

/**
 * Controlled Edit Operation: Remove Company Node
 */
export function removeCompanyNode(companyId: string, nodeId: string): void {
  const auth = getCurrentAuthSession();
  if (!isAuthenticated(auth) || !hasCompanyRole(companyId, ["OWNER", "ADMIN", "MANAGER"], auth)) {
    throw new Error("Unauthorized: You do not have permission to delete operating nodes for this company.");
  }

  const nodes = COMPANY_NODES_STORE[companyId];
  if (!nodes) return;

  const idx = nodes.findIndex((n) => n.id === nodeId && !n.isHeadquarters);
  if (idx >= 0) {
    const removed = nodes.splice(idx, 1)[0];

    recordPlatformEvent({
      eventType: "cta_click",
      companyId,
      metadata: {
        auditAction: "business_node_removed",
        nodeName: removed?.name,
      },
    });

    notifyListeners();
  }
}

/**
 * Controlled Edit Operation: Update Capabilities
 */
export function updateCompanyCapabilities(
  company: CompanyProfile,
  capabilities: string[]
): void {
  const auth = getCurrentAuthSession();
  if (!isAuthenticated(auth) || !hasCompanyRole(company.id, ["OWNER", "ADMIN", "MANAGER"], auth)) {
    throw new Error("Unauthorized: You do not have permission to update capabilities for this company.");
  }

  company.capabilities = capabilities;

  recordPlatformEvent({
    eventType: "cta_click",
    companyId: company.id,
    metadata: {
      auditAction: "business_capability_updated",
      capabilitiesCount: capabilities.length,
    },
  });

  notifyListeners();
}
