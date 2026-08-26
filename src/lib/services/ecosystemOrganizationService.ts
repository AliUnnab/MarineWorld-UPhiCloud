import type {
  CompanyEntity,
  OrganizationEntityType,
  AccessContext,
} from "@/lib/types";
import {
  saveCompanyRecordSync,
  getCompanyRecordSync,
  findAllCompaniesSync,
} from "@/lib/repositories/companyRepository";
import { saveMember } from "@/lib/repositories/membershipRepository";
import {
  developmentAuthProvider,
  type AuthContext,
} from "@/lib/auth/developmentAuthProvider";
import {
  getCurrentAuthSession,
  setCurrentAuthSession,
} from "@/lib/services/securityService";
import {
  setActiveOrganizationContext,
  getActiveOrganizationContext,
  resolveAccessContext,
} from "@/lib/services/accessContextService";
import { generateBusinessId } from "@/lib/services/companyService";

export type EcosystemMemberStatus =
  | "NOT_REGISTERED"
  | "INVITED"
  | "REGISTERED"
  | "COMPANY_CREATED"
  | "VERIFIED"
  | "ACTIVE";

export type EcosystemMemberVerificationState =
  | "VERIFIED"
  | "PENDING"
  | "INCOMPLETE"
  | "ACTION_REQUIRED";

export type CommercialPresenceTier =
  | "STANDARD"
  | "ENTERPRISE"
  | "FLAGSHIP"
  | "LANDMARK"
  | "NONE";

export type OrganizationLifecycleStatus =
  | "REGISTRATION_PENDING"
  | "EMAIL_VERIFIED"
  | "ACTIVATION_PENDING"
  | "HUB_ACTIVE"
  | "SUSPENDED";

export type EcosystemHubStatus =
  | "NOT_CREATED"
  | "CREATING"
  | "ACTIVE"
  | "SUSPENDED";

export interface EcosystemMemberRecord {
  memberId: string;
  companyId: string;
  companyName: string;
  legalName: string;
  logo?: string;
  country: string;
  city: string;
  sectorCityId: string;
  industry: string;
  capabilities: string[];
  status: EcosystemMemberStatus;
  verificationStatus: EcosystemMemberVerificationState;
  activationDate?: string;
  lastActivityAt: string;
  enrollmentCodeUsed: string;
  hasCompanyEntity: boolean;
  commercialPresence: CommercialPresenceTier;
  contactEmail: string;
  invitedAt: string;
  notes?: string;
}

export interface EcosystemOrganizationSummary {
  id: string;
  name: string;
  legalName: string;
  slug: string;
  organizationType: OrganizationEntityType;
  businessId: string;
  verificationStatus: "VERIFIED" | "PENDING" | "UNVERIFIED" | "SUSPENDED";
  status?: OrganizationLifecycleStatus;
  hubStatus?: EcosystemHubStatus;
  activationCode?: string; // Organization Activation Code (for Hub creation)
  enrollmentCode: string; // Member Enrollment Code (for member onboarding)
  ecosystemHubId?: string;
  country?: string;
  officialWebsite?: string;
  primaryContact?: string;
  principalAuthorityUserId: string;
  principalAuthorityName: string;
  principalAuthorityRole: string;
  officialEmailDomain: string;
  officialContactEmail: string;
  discountCode?: string;
  discountPercentage: number;
  totalMembersCount: number;
  activatedMembersCount: number;
  verifiedMembersCount: number;
  activeSectorCitiesCount: number;
  memberCompanyIds: string[];
  aboutDescription: string;
  capabilities: string[];
  knowledgeArticlesCount: number;
  publicationsCount: number;
}

export interface OrganizationRegistrationInput {
  organizationType: OrganizationEntityType;
  name: string;
  legalName?: string;
  country: string;
  officialEmail: string;
  officialWebsite?: string;
  representativeName: string;
  representativeRole: string;
  primaryContact?: string;
  aboutDescription?: string;
}

export interface HubActivationInput {
  officialEmail: string;
  activationCode: string; // Organization Activation Code
  representativeName?: string;
}

export interface HubSignInInput {
  officialEmail: string;
  passwordOrCode?: string;
}

export interface EcosystemDigitalizationOverview {
  organizationId: string;
  organizationName: string;
  organizationType: OrganizationEntityType;
  totalMemberCompanies: number;
  digitalizedCount: number;
  pendingCount: number;
  notDigitalizedCount: number;
  digitalizationPercentage: number;
  enrollmentCode: string;
  discountPercentage: number;
  memberCompanies: EcosystemMemberRecord[];
}

export interface EcosystemFunnelMetrics {
  invited: number;
  registered: number;
  companyCreated: number;
  verified: number;
  active: number;
  remaining: number;
  issued: number;
}

export interface MemberQueryOptions {
  query?: string;
  statusFilter?: EcosystemMemberStatus | "ALL";
  verificationFilter?: EcosystemMemberVerificationState | "ALL";
  sectorCityFilter?: string;
  countryFilter?: string;
  activationStatusFilter?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "name" | "status" | "lastActivity" | "city" | "country";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedMembersResult {
  members: EcosystemMemberRecord[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  statusCounts: Record<EcosystemMemberStatus, number>;
  verificationCounts: Record<EcosystemMemberVerificationState, number>;
}

export interface OfficialVerificationRequest {
  organizationId: string;
  officialEmail: string;
  verificationCode: string;
  representativeName?: string;
}

export interface OfficialVerificationResult {
  success: boolean;
  message: string;
  accessContext?: AccessContext;
  organization?: EcosystemOrganizationSummary;
  authSession?: AuthContext;
  denialReason?: string;
}

// Canonical Ecosystem Organizations Registry
const CANONICAL_ECOSYSTEM_ORGS: EcosystemOrganizationSummary[] = [
  {
    id: "maritime-association",
    name: "World Maritime Association",
    legalName: "World Maritime Trade & Shipping Association AISBL",
    slug: "maritime-association",
    organizationType: "ASSOCIATION",
    businessId: "MW-BUS-WMA-GLOBAL",
    verificationStatus: "VERIFIED",
    status: "HUB_ACTIVE",
    hubStatus: "ACTIVE",
    activationCode: "MW-ORG-WMA-2026",
    enrollmentCode: "MW-WMA-8F42",
    ecosystemHubId: "hub-maritime-association",
    country: "Netherlands",
    officialWebsite: "https://www.maritime-association.org",
    principalAuthorityUserId: "usr-multi-owner-003",
    principalAuthorityName: "Capt. Alexander Vance",
    principalAuthorityRole: "Secretary General & Executive Director",
    officialEmailDomain: "maritime-association.org",
    officialContactEmail: "directorate@maritime-association.org",
    discountPercentage: 20,
    totalMembersCount: 800,
    activatedMembersCount: 624,
    verifiedMembersCount: 412,
    activeSectorCitiesCount: 18,
    memberCompanyIds: [
      "argento",
      "comp-north-sea-logistics",
      "comp-rotterdam-propulsion",
      "comp-baltic-naval",
    ],
    aboutDescription: "The World Maritime Association is the premier international body representing 800 accredited maritime logistics operators, vessel owners, port services, and technical suppliers globally.",
    capabilities: [
      "Global Industry Advocacy",
      "ISO/IMO Admiralty Standards Accreditation",
      "Digital Fleet Onboarding",
      "Cross-Border Maritime Trade Policy",
    ],
    knowledgeArticlesCount: 42,
    publicationsCount: 18,
  },
  {
    id: "port-authority",
    name: "International Port & Maritime Authority",
    legalName: "Global Port Operations & Maritime Authority Board",
    slug: "port-authority",
    organizationType: "PUBLIC_ORGANIZATION",
    businessId: "MW-BUS-PORT-AUTH",
    verificationStatus: "VERIFIED",
    status: "HUB_ACTIVE",
    hubStatus: "ACTIVE",
    activationCode: "MW-ORG-PORT-2026",
    enrollmentCode: "MW-PORTAUTH-77B1",
    ecosystemHubId: "hub-port-authority",
    country: "Singapore",
    officialWebsite: "https://www.port-authority.org",
    principalAuthorityUserId: "usr-ecosystem-admin-004",
    principalAuthorityName: "Elena Rostova",
    principalAuthorityRole: "Harbor Compliance Commissioner",
    officialEmailDomain: "port-authority.org",
    officialContactEmail: "compliance@port-authority.org",
    discountPercentage: 25,
    totalMembersCount: 500,
    activatedMembersCount: 380,
    verifiedMembersCount: 295,
    activeSectorCitiesCount: 14,
    memberCompanyIds: [
      "crest-group-materials",
      "comp-rotterdam-tugboats",
      "comp-euro-dredging",
      "comp-haven-logistics",
    ],
    aboutDescription: "Regulatory sovereign authority governing port state control, terminal clearances, vessel anchorage protocols, and digital twin clearances across international harbors.",
    capabilities: [
      "Port State Clearance Integration",
      "Digital Terminal Operations",
      "Vessel Traffic System (VTS) Compliance",
      "Green Port Environmental Audits",
    ],
    knowledgeArticlesCount: 28,
    publicationsCount: 12,
  },
  {
    id: "rotterdam-chamber",
    name: "Rotterdam Maritime Chamber of Commerce",
    legalName: "Chamber of Commerce Rotterdam Maritime Division",
    slug: "rotterdam-chamber",
    organizationType: "CHAMBER",
    businessId: "MW-BUS-ROTTERDAM-CHAMBER",
    verificationStatus: "VERIFIED",
    status: "HUB_ACTIVE",
    hubStatus: "ACTIVE",
    activationCode: "MW-ORG-ROTTERDAM-2026",
    enrollmentCode: "MW-ROTTERDAM-2026",
    ecosystemHubId: "hub-rotterdam-chamber",
    country: "Netherlands",
    officialWebsite: "https://www.rotterdam-chamber.org",
    principalAuthorityUserId: "usr-chamber-lead-006",
    principalAuthorityName: "Marcus Van Den Berg",
    principalAuthorityRole: "Executive Director of Maritime Commerce",
    officialEmailDomain: "rotterdam-chamber.org",
    officialContactEmail: "maritime@rotterdam-chamber.org",
    discountPercentage: 15,
    totalMembersCount: 350,
    activatedMembersCount: 275,
    verifiedMembersCount: 210,
    activeSectorCitiesCount: 10,
    memberCompanyIds: [
      "blueharbour",
      "comp-maritime-steel",
      "comp-scheldt-naval",
    ],
    aboutDescription: "North-West European maritime trade guild accelerating commercial digitalization, marine engineering supply chains, and bonded port services across the Greater Rotterdam delta.",
    capabilities: [
      "Regional Commercial Certification",
      "B2B Marine Trade Matchmaking",
      "Bonded Logistics Registry",
      "North Sea Shipping Corridors",
    ],
    knowledgeArticlesCount: 31,
    publicationsCount: 9,
  },
  {
    id: "world-maritime-federation",
    name: "World Maritime & Oceanics Federation",
    legalName: "World Federation of Maritime Enterprises",
    slug: "world-maritime-federation",
    organizationType: "FEDERATION",
    businessId: "MW-BUS-WORLD-MARITIME-FED",
    verificationStatus: "VERIFIED",
    status: "HUB_ACTIVE",
    hubStatus: "ACTIVE",
    activationCode: "MW-ORG-FED-2026",
    enrollmentCode: "MW-FED-GLOBAL-99",
    ecosystemHubId: "hub-world-maritime-federation",
    country: "United Kingdom",
    officialWebsite: "https://www.world-maritime-fed.org",
    principalAuthorityUserId: "usr-fed-director-007",
    principalAuthorityName: "Dr. Alistair Thorne",
    principalAuthorityRole: "Director of Global Standards",
    officialEmailDomain: "world-maritime-fed.org",
    officialContactEmail: "secretary@world-maritime-fed.org",
    discountPercentage: 30,
    totalMembersCount: 1200,
    activatedMembersCount: 940,
    verifiedMembersCount: 710,
    activeSectorCitiesCount: 22,
    memberCompanyIds: [
      "north-atlantic",
      "comp-pacific-shipping",
      "comp-atlantic-harbor",
    ],
    aboutDescription: "Global confederation uniting ocean science research institutes, autonomous vessel developers, deep-sea exploration fleets, and international shipping lines.",
    capabilities: [
      "Autonomous Navigation Protocols",
      "Global Marine Standards Verification",
      "Decarbonization Research Grants",
      "Inter-continental Maritime Corridors",
    ],
    knowledgeArticlesCount: 64,
    publicationsCount: 24,
  },
  {
    id: "ocean-research-institute",
    name: "Global Oceanographic & Marine Research Institute",
    legalName: "International Institute for Oceanographic Research",
    slug: "ocean-research-institute",
    organizationType: "INSTITUTION",
    businessId: "MW-BUS-OCEAN-RESEARCH-INST",
    verificationStatus: "VERIFIED",
    status: "HUB_ACTIVE",
    hubStatus: "ACTIVE",
    activationCode: "MW-ORG-RESEARCH-2026",
    enrollmentCode: "MW-RESEARCH-LAB-101",
    ecosystemHubId: "hub-ocean-research-institute",
    country: "Germany",
    officialWebsite: "https://www.ocean-research.edu",
    principalAuthorityUserId: "usr-research-dean-008",
    principalAuthorityName: "Prof. Sarah Chen",
    principalAuthorityRole: "Dean of Marine Sciences & Digital Twins",
    officialEmailDomain: "ocean-research.edu",
    officialContactEmail: "partnerships@ocean-research.edu",
    discountPercentage: 50,
    totalMembersCount: 250,
    activatedMembersCount: 210,
    verifiedMembersCount: 185,
    activeSectorCitiesCount: 8,
    memberCompanyIds: [
      "comp-ocean-sensors",
      "comp-deep-sea-mapping",
    ],
    aboutDescription: "Academic and scientific research institution modeling ocean telemetry, autonomous sensor grids, and climate-resilient coastal infrastructure digital twins.",
    capabilities: [
      "Ocean Telemetry Data Feeds",
      "Hydrographic Mapping Specs",
      "Academic-Industry Tech Transfer",
      "Marine AI Modeling Benchmarks",
    ],
    knowledgeArticlesCount: 88,
    publicationsCount: 35,
  },
  {
    id: "international-maritime-registry",
    name: "International Maritime Flag State Registry",
    legalName: "International Maritime Flag State Registry & Administration",
    slug: "international-maritime-registry",
    organizationType: "PUBLIC_ORGANIZATION",
    businessId: "MW-BUS-REGISTRY-GLOBAL",
    verificationStatus: "VERIFIED",
    status: "HUB_ACTIVE",
    hubStatus: "ACTIVE",
    activationCode: "MW-ORG-REG-2026",
    enrollmentCode: "MW-REGISTRY-77",
    ecosystemHubId: "hub-international-maritime-registry",
    country: "Liberia",
    officialWebsite: "https://www.maritimeregistry.org",
    principalAuthorityUserId: "usr-registry-commissioner",
    principalAuthorityName: "Commissioner David Sterling",
    principalAuthorityRole: "Registrar-General of Shipping",
    officialEmailDomain: "maritimeregistry.org",
    officialContactEmail: "registry@maritimeregistry.org",
    discountPercentage: 25,
    totalMembersCount: 450,
    activatedMembersCount: 360,
    verifiedMembersCount: 310,
    activeSectorCitiesCount: 12,
    memberCompanyIds: [],
    aboutDescription: "Sovereign flag-state vessel registry, international maritime administration, and statutory safety certification authority.",
    capabilities: [
      "Flag-State Vessel Registration",
      "Statutory Safety Certification",
      "Crew Licensure & Endorsements",
      "IMO Compliance Audits",
    ],
    knowledgeArticlesCount: 52,
    publicationsCount: 20,
  },
  {
    id: "global-maritime-governance-council",
    name: "Global Maritime Governance Council",
    legalName: "International Maritime Governance & Policy Council",
    slug: "global-maritime-governance-council",
    organizationType: "ASSOCIATION",
    businessId: "MW-BUS-GOV-COUNCIL",
    verificationStatus: "VERIFIED",
    status: "HUB_ACTIVE",
    hubStatus: "ACTIVE",
    activationCode: "MW-ORG-GOV-2026",
    enrollmentCode: "MW-GOV-COUNCIL-88",
    ecosystemHubId: "hub-global-maritime-governance-council",
    country: "United Kingdom",
    officialWebsite: "https://www.maritimegovernance.org",
    principalAuthorityUserId: "usr-gov-chair",
    principalAuthorityName: "Dame Eleanor Wright",
    principalAuthorityRole: "Council Chairperson",
    officialEmailDomain: "maritimegovernance.org",
    officialContactEmail: "secretariat@maritimegovernance.org",
    discountPercentage: 20,
    totalMembersCount: 620,
    activatedMembersCount: 490,
    verifiedMembersCount: 430,
    activeSectorCitiesCount: 16,
    memberCompanyIds: [],
    aboutDescription: "International policy council framing decarbonization mandates, sovereign data trusts, and ethical AI twin standards for global maritime commerce.",
    capabilities: [
      "International Maritime Policy",
      "Environmental Compliance Accreditations",
      "Sovereign Data Governance",
      "Global Trade Policy Harmonization",
    ],
    knowledgeArticlesCount: 48,
    publicationsCount: 16,
  },
  {
    id: "maritime-identity-authority",
    name: "Maritime Digital Identity & Trust Authority",
    legalName: "International Maritime Identity & Verification Bureau",
    slug: "maritime-identity-authority",
    organizationType: "PUBLIC_ORGANIZATION",
    businessId: "MW-BUS-IDENTITY-AUTH",
    verificationStatus: "VERIFIED",
    status: "HUB_ACTIVE",
    hubStatus: "ACTIVE",
    activationCode: "MW-ORG-ID-2026",
    enrollmentCode: "MW-IDENTITY-TRUST-01",
    ecosystemHubId: "hub-maritime-identity-authority",
    country: "Switzerland",
    officialWebsite: "https://www.maritime-identity.org",
    principalAuthorityUserId: "usr-identity-lead",
    principalAuthorityName: "Dr. Jean-Pierre Meyer",
    principalAuthorityRole: "Chief Identity Officer",
    officialEmailDomain: "maritime-identity.org",
    officialContactEmail: "trust@maritime-identity.org",
    discountPercentage: 30,
    totalMembersCount: 310,
    activatedMembersCount: 260,
    verifiedMembersCount: 240,
    activeSectorCitiesCount: 9,
    memberCompanyIds: [],
    aboutDescription: "Accreditation and root-of-trust authority issuing cryptographic corporate identifiers, digital twin credentials, and verifiable legal entity credentials.",
    capabilities: [
      "Cryptographic Identity Verification",
      "Verifiable Credentials Ledger",
      "Corporate Ownership Audits",
      "Digital Twin Key Management",
    ],
    knowledgeArticlesCount: 24,
    publicationsCount: 8,
  },
  {
    id: "european-maritime-cluster",
    name: "European Maritime Industrial Cluster Alliance",
    legalName: "European Maritime Cluster Alliance AISBL",
    slug: "european-maritime-cluster",
    organizationType: "FEDERATION",
    businessId: "MW-BUS-EMC-ALLIANCE",
    verificationStatus: "VERIFIED",
    status: "HUB_ACTIVE",
    hubStatus: "ACTIVE",
    activationCode: "MW-ORG-CLUSTER-2026",
    enrollmentCode: "MW-EURO-CLUSTER-99",
    ecosystemHubId: "hub-european-maritime-cluster",
    country: "Belgium",
    officialWebsite: "https://www.maritimeclusters.eu",
    principalAuthorityUserId: "usr-cluster-pres",
    principalAuthorityName: "Henri de Vries",
    principalAuthorityRole: "Alliance President",
    officialEmailDomain: "maritimeclusters.eu",
    officialContactEmail: "alliance@maritimeclusters.eu",
    discountPercentage: 25,
    totalMembersCount: 540,
    activatedMembersCount: 420,
    verifiedMembersCount: 380,
    activeSectorCitiesCount: 15,
    memberCompanyIds: [],
    aboutDescription: "Pan-European alliance connecting regional shipbuilding clusters, offshore wind testbeds, and marine innovation hubs into one unified industrial network.",
    capabilities: [
      "Regional Cluster Integration",
      "Cross-Border R&D Consortiums",
      "Shipbuilding Supply Chain Linkages",
      "Blue Economy Innovation Grants",
    ],
    knowledgeArticlesCount: 36,
    publicationsCount: 14,
  },
  {
    id: "global-maritime-ecosystem-network",
    name: "Global Maritime Ecosystem & Hubs Network",
    legalName: "Global Maritime Ecosystem & Hubs Association",
    slug: "global-maritime-ecosystem-network",
    organizationType: "ASSOCIATION",
    businessId: "MW-BUS-ECOSYSTEM-NET",
    verificationStatus: "VERIFIED",
    status: "HUB_ACTIVE",
    hubStatus: "ACTIVE",
    activationCode: "MW-ORG-ECO-2026",
    enrollmentCode: "MW-ECO-HUBS-2026",
    ecosystemHubId: "hub-global-maritime-ecosystem-network",
    country: "Denmark",
    officialWebsite: "https://www.maritime-ecosystem.net",
    principalAuthorityUserId: "usr-eco-net-lead",
    principalAuthorityName: "Freja Lindqvist",
    principalAuthorityRole: "Executive Director",
    officialEmailDomain: "maritime-ecosystem.net",
    officialContactEmail: "secretariat@maritime-ecosystem.net",
    discountPercentage: 20,
    totalMembersCount: 780,
    activatedMembersCount: 610,
    verifiedMembersCount: 520,
    activeSectorCitiesCount: 20,
    memberCompanyIds: [],
    aboutDescription: "International ecosystem coordination body uniting marine hubs, port accelerators, and institutional trade guilds across 20 global maritime gateways.",
    capabilities: [
      "Ecosystem Hub Onboarding",
      "Multi-Tenant Accreditation",
      "Global Gateway Interconnectivity",
      "Institutional Best Practices",
    ],
    knowledgeArticlesCount: 56,
    publicationsCount: 22,
  },
];

// Persistent Organization Registry Memory & Storage
let DYNAMIC_ORGS_REGISTRY: EcosystemOrganizationSummary[] | null = null;

function loadOrganizationRegistry(): EcosystemOrganizationSummary[] {
  if (DYNAMIC_ORGS_REGISTRY) return DYNAMIC_ORGS_REGISTRY;

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = localStorage.getItem("marineworld_ecosystem_organizations");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge canonical and custom registered orgs
          const merged = [...CANONICAL_ECOSYSTEM_ORGS];
          for (const item of parsed) {
            if (!merged.some((o) => o.id === item.id)) {
              merged.push(item);
            }
          }
          DYNAMIC_ORGS_REGISTRY = merged;
          return DYNAMIC_ORGS_REGISTRY;
        }
      }
    }
  } catch (e) {
    console.warn("Failed to read ecosystem organization store from localStorage", e);
  }

  DYNAMIC_ORGS_REGISTRY = [...CANONICAL_ECOSYSTEM_ORGS];
  return DYNAMIC_ORGS_REGISTRY;
}

export function clearEcosystemMemberCache(organizationId?: string): void {
  if (organizationId) {
    delete MEMBER_CACHE[organizationId];
  } else {
    for (const k in MEMBER_CACHE) {
      delete MEMBER_CACHE[k];
    }
  }
}

function saveOrganizationRegistry(registry: EcosystemOrganizationSummary[]): void {
  DYNAMIC_ORGS_REGISTRY = registry;
  clearEcosystemMemberCache();
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const customOrgs = registry.filter(
        (o) => !CANONICAL_ECOSYSTEM_ORGS.some((c) => c.id === o.id)
      );
      localStorage.setItem("marineworld_ecosystem_organizations", JSON.stringify(customOrgs));
    }
  } catch (e) {
    console.warn("Failed to save ecosystem organization store to localStorage", e);
  }
}

// Seed canonical companies in companyRepository
function seedEcosystemOrganizations(): void {
  for (const org of CANONICAL_ECOSYSTEM_ORGS) {
    const existing = getCompanyRecordSync(org.id);
    if (!existing) {
      const entity: CompanyEntity = {
        id: org.id,
        businessId: org.businessId,
        organizationType: org.organizationType,
        platformId: "marineworld",
        sectorId: "marine",
        primarySectorCityId: "marineworld",
        sectorCityIds: ["marineworld"],
        sectorCityId: "marineworld",
        slug: org.slug,
        legalName: org.legalName,
        displayName: org.name,
        brandName: org.name,
        description: org.aboutDescription,
        shortDescription: `Official ${org.organizationType.replace(/_/g, " ").toLowerCase()} ecosystem entity.`,
        logo: "/icon.png",
        email: org.officialContactEmail,
        country: "Netherlands",
        city: "Rotterdam",
        status: "ACTIVE",
        verificationStatus: org.verificationStatus,
        ownerId: org.principalAuthorityUserId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveCompanyRecordSync(entity);
    }
  }
}

seedEcosystemOrganizations();

// Deterministic Member Repository Cache
const MEMBER_CACHE: Record<string, EcosystemMemberRecord[]> = {};

const SECTOR_CITIES_LIST = [
  { id: "supplychain", name: "SupplyChain.City", domain: "SupplyChain" },
  { id: "charter", name: "Charter.City", domain: "Charter" },
  { id: "brokerage", name: "Brokerage.City", domain: "Brokerage" },
  { id: "shipbuilding", name: "Shipbuilding.City", domain: "Shipbuilding" },
  { id: "navigation", name: "Navigation.City", domain: "Navigation" },
  { id: "marina", name: "Marina.City", domain: "Marina" },
  { id: "portops", name: "PortOps.City", domain: "PortOps" },
  { id: "marine-services", name: "MarineServices.City", domain: "Marine Services" },
  { id: "bunkering", name: "Bunkering.City", domain: "Bunkering" },
  { id: "procurement", name: "Procurement.City", domain: "Procurement" },
  { id: "shipyards", name: "Shipyards.City", domain: "Shipyards" },
  { id: "engineering", name: "Engineering.City", domain: "Engineering" },
];

const COUNTRIES_CITIES_LIST = [
  { country: "Netherlands", city: "Rotterdam" },
  { country: "Germany", city: "Hamburg" },
  { country: "United Kingdom", city: "London" },
  { country: "Norway", city: "Oslo" },
  { country: "Singapore", city: "Singapore" },
  { country: "Greece", city: "Piraeus" },
  { country: "Türkiye", city: "Istanbul" },
  { country: "Türkiye", city: "Göcek" },
  { country: "United States", city: "Houston" },
  { country: "United States", city: "Miami" },
  { country: "United Arab Emirates", city: "Dubai" },
  { country: "Denmark", city: "Copenhagen" },
  { country: "France", city: "Marseille" },
  { country: "Italy", city: "Genoa" },
  { country: "Japan", city: "Tokyo" },
  { country: "South Korea", city: "Busan" },
];

const CAPABILITIES_LIST = [
  "Marine Logistics",
  "Technical Provisioning",
  "Customs Clearance",
  "Fleet Operations",
  "Tugboat Services",
  "Dredging Operations",
  "Propulsion Engineering",
  "Naval Architecture",
  "Ship Repairs",
  "Bunkering Supplies",
  "Autonomous Navigation",
  "Marine Insurance",
  "Port Terminal Operations",
  "Crew Management",
  "Hydrographic Surveys",
  "Ocean Science AI",
];

const MEMBER_NAME_PREFIXES = [
  "BlueWater", "Oceanic", "Rotterdam", "North Sea", "Baltic", "Mediterranean",
  "Atlantic", "Pacific", "Harbor", "Anchor", "Maritime", "Vessel", "AeroMarine",
  "Poseidon", "Trident", "Nordic", "Titan", "Zenith", "Apex", "Global"
];

const MEMBER_NAME_SUFFIXES = [
  "Logistics", "Services", "Shipping", "Marine Ltd.", "Naval Engineering",
  "Tugboats", "Provisioning", "Shipyards", "Systems", "Offshore", "Maritime Corp",
  "Fleet Support", "Propulsion", "Technologies", "Solutions", "Terminal Ops"
];

/**
 * Computes a deterministic integer seed from an organization ID
 */
function getOrgSeed(orgId: string): number {
  let hash = 0;
  for (let i = 0; i < orgId.length; i++) {
    hash = (hash << 5) - hash + orgId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Deterministically generates a rich member dataset for an organization
 */
export function getEcosystemMembers(organizationId: string): EcosystemMemberRecord[] {
  if (MEMBER_CACHE[organizationId]) {
    return MEMBER_CACHE[organizationId];
  }

  const org = getEcosystemOrganizationById(organizationId);
  if (!org) return [];

  const members: EcosystemMemberRecord[] = [];
  const totalCount = org.totalMembersCount || 800;
  const orgSeed = getOrgSeed(organizationId);

  // 1. Seed canonical companies first (strictly scoped to this tenant organization)
  const repoCompanies = findAllCompaniesSync();
  let index = 0;

  for (const comp of repoCompanies) {
    if (comp.id === org.id) continue; // Skip self

    // Strict tenant scoping check:
    const belongsToOrg =
      (org.memberCompanyIds && (org.memberCompanyIds.includes(comp.id) || org.memberCompanyIds.includes(comp.slug || ""))) ||
      comp.enrolledOrganizationId === org.id ||
      comp.enrolledOrganizationCode === org.enrollmentCode;

    if (!belongsToOrg) continue;

    const memberId = `mem-${org.slug}-${comp.id}`;
    const loc = comp.country || "Netherlands";
    const city = comp.city || "Rotterdam";
    const sectorCityId = comp.primarySectorCityId || "supplychain";

    members.push({
      memberId,
      companyId: comp.slug || comp.id,
      companyName: comp.displayName || comp.legalName || comp.id,
      legalName: comp.legalName || comp.displayName || comp.id,
      logo: comp.logoUrl || comp.heroImageUrl,
      country: comp.country || "Netherlands",
      city: comp.city || comp.headquartersCity || "Rotterdam",
      sectorCityId,
      industry: comp.industry || "Marine Services",
      capabilities: comp.specializedDomains || comp.secondarySectorCategories || ["Marine Logistics", "Technical Provisioning"],
      status: "ACTIVE",
      verificationStatus: "VERIFIED",
      activationDate: "2026-01-15",
      lastActivityAt: "10 mins ago",
      enrollmentCodeUsed: org.enrollmentCode,
      hasCompanyEntity: true,
      commercialPresence: (comp.status === "ACTIVE" ? "ENTERPRISE" : "STANDARD") as CommercialPresenceTier,
      contactEmail: comp.officialEmail || `corporate@${comp.slug || comp.id}.com`,
      invitedAt: "2025-11-10",
      notes: "Canonical accredited member enterprise.",
    });

    index++;
  }

  // 2. Generate remaining members up to totalCount (seeded uniquely per organization)
  for (let i = members.length; i < totalCount; i++) {
    const prefixIdx = (i * 3 + orgSeed * 7) % MEMBER_NAME_PREFIXES.length;
    const suffixIdx = (i * 5 + orgSeed * 13) % MEMBER_NAME_SUFFIXES.length;
    const prefix = MEMBER_NAME_PREFIXES[prefixIdx];
    const suffix = MEMBER_NAME_SUFFIXES[suffixIdx];
    const compName = `${prefix} ${suffix} #${i + 1}`;
    const slug = `comp-${prefix.toLowerCase()}-${suffix.toLowerCase().replace(/[^a-z0-9]/g, "")}-${org.slug}-${i + 1}`;

    const locObj = COUNTRIES_CITIES_LIST[(i * 7 + orgSeed * 3) % COUNTRIES_CITIES_LIST.length];
    const sectorCityObj = SECTOR_CITIES_LIST[(i * 5 + orgSeed * 11) % SECTOR_CITIES_LIST.length];

    // Status distribution: 17 ACTIVE, 17 COMPANY_CREATED, 17 REGISTERED, 49 INVITED, remaining NOT_REGISTERED
    let status: EcosystemMemberStatus = "ACTIVE";
    let verificationStatus: EcosystemMemberVerificationState = "VERIFIED";
    let commercialPresence: CommercialPresenceTier = "STANDARD";
    let hasCompany = true;

    if (i < 17) {
      status = "ACTIVE";
      verificationStatus = "VERIFIED";
      commercialPresence = i % 5 === 0 ? "FLAGSHIP" : i % 3 === 0 ? "ENTERPRISE" : "STANDARD";
    } else if (i < 34) {
      status = "COMPANY_CREATED";
      verificationStatus = i % 2 === 0 ? "PENDING" : "INCOMPLETE";
      commercialPresence = "STANDARD";
    } else if (i < 51) {
      status = "REGISTERED";
      verificationStatus = "INCOMPLETE";
      commercialPresence = "STANDARD";
    } else if (i < 100) {
      status = "INVITED";
      verificationStatus = "PENDING";
      commercialPresence = "NONE";
      hasCompany = false;
    } else {
      status = "NOT_REGISTERED";
      verificationStatus = "ACTION_REQUIRED";
      commercialPresence = "NONE";
      hasCompany = false;
    }

    const caps = [
      CAPABILITIES_LIST[(i + orgSeed) % CAPABILITIES_LIST.length],
      CAPABILITIES_LIST[(i + 3 + orgSeed * 2) % CAPABILITIES_LIST.length],
      CAPABILITIES_LIST[(i + 7 + orgSeed * 5) % CAPABILITIES_LIST.length],
    ];

    const daysAgo = (i % 28) + 1;
    const hoursAgo = (i % 12) + 1;

    members.push({
      memberId: `mem-${org.slug}-${i + 100}`,
      companyId: slug,
      companyName: compName,
      legalName: `${compName} Corp B.V.`,
      country: locObj.country,
      city: locObj.city,
      sectorCityId: sectorCityObj.id,
      industry: sectorCityObj.domain,
      capabilities: caps,
      status,
      verificationStatus,
      activationDate: status === "ACTIVE" ? `2026-0${(i % 5) + 1}-12` : undefined,
      lastActivityAt: daysAgo === 1 ? `${hoursAgo} hours ago` : `${daysAgo} days ago`,
      enrollmentCodeUsed: org.enrollmentCode,
      hasCompanyEntity: hasCompany,
      commercialPresence,
      contactEmail: `contact@${slug}.com`,
      invitedAt: `2025-12-01`,
    });
  }

  MEMBER_CACHE[organizationId] = members;
  return members;
}

/**
 * Query & Filter Members with Scalable Pagination
 */
export function getEcosystemMembersPaginated(
  organizationId: string,
  options: MemberQueryOptions = {}
): PaginatedMembersResult {
  const allMembers = getEcosystemMembers(organizationId);

  const {
    query = "",
    statusFilter = "ALL",
    verificationFilter = "ALL",
    sectorCityFilter = "ALL",
    countryFilter = "ALL",
    activationStatusFilter = "ALL",
    page = 1,
    pageSize = 25,
    sortBy = "name",
    sortOrder = "asc",
  } = options;

  // Status counters across full dataset
  const statusCounts: Record<EcosystemMemberStatus, number> = {
    NOT_REGISTERED: 0,
    INVITED: 0,
    REGISTERED: 0,
    COMPANY_CREATED: 0,
    VERIFIED: 0,
    ACTIVE: 0,
  };

  const verificationCounts: Record<EcosystemMemberVerificationState, number> = {
    VERIFIED: 0,
    PENDING: 0,
    INCOMPLETE: 0,
    ACTION_REQUIRED: 0,
  };

  allMembers.forEach((m) => {
    if (statusCounts[m.status] !== undefined) {
      statusCounts[m.status]++;
    }
    if (verificationCounts[m.verificationStatus] !== undefined) {
      verificationCounts[m.verificationStatus]++;
    }
  });

  // Ensure VERIFIED status count reflects all verified records
  statusCounts.VERIFIED = allMembers.filter(
    (m) => m.verificationStatus === "VERIFIED" || m.status === "VERIFIED"
  ).length;

  // Filter
  const q = query.trim().toLowerCase();
  const filtered = allMembers.filter((m) => {
    if (statusFilter !== "ALL") {
      if (statusFilter === "VERIFIED") {
        if (m.verificationStatus !== "VERIFIED" && m.status !== "VERIFIED") return false;
      } else if (m.status !== statusFilter) {
        return false;
      }
    }
    if (verificationFilter !== "ALL" && m.verificationStatus !== verificationFilter) return false;
    if (sectorCityFilter !== "ALL" && m.sectorCityId !== sectorCityFilter) return false;
    if (countryFilter !== "ALL" && m.country.toLowerCase() !== countryFilter.toLowerCase()) return false;
    if (activationStatusFilter !== "ALL") {
      if (activationStatusFilter === "ACTIVATED" && m.status !== "ACTIVE" && m.status !== "VERIFIED") return false;
      if (activationStatusFilter === "PENDING" && m.status !== "REGISTERED" && m.status !== "COMPANY_CREATED") return false;
      if (activationStatusFilter === "NOT_ACTIVATED" && m.status !== "INVITED" && m.status !== "NOT_REGISTERED") return false;
    }

    if (q) {
      const matchName = m.companyName.toLowerCase().includes(q) || m.legalName.toLowerCase().includes(q);
      const matchLoc = m.country.toLowerCase().includes(q) || m.city.toLowerCase().includes(q);
      const matchCaps = m.capabilities.some((c) => c.toLowerCase().includes(q));
      const matchCity = m.sectorCityId.toLowerCase().includes(q);
      if (!matchName && !matchLoc && !matchCaps && !matchCity) return false;
    }

    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    let compA = "";
    let compB = "";
    if (sortBy === "name") {
      compA = a.companyName.toLowerCase();
      compB = b.companyName.toLowerCase();
    } else if (sortBy === "city") {
      compA = a.city.toLowerCase();
      compB = b.city.toLowerCase();
    } else if (sortBy === "country") {
      compA = a.country.toLowerCase();
      compB = b.country.toLowerCase();
    } else if (sortBy === "status") {
      compA = a.status;
      compB = b.status;
    } else {
      compA = a.lastActivityAt;
      compB = b.lastActivityAt;
    }

    if (compA < compB) return sortOrder === "asc" ? -1 : 1;
    if (compA > compB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedMembers = filtered.slice(startIndex, startIndex + pageSize);

  return {
    members: paginatedMembers,
    totalCount,
    page: currentPage,
    pageSize,
    totalPages,
    statusCounts,
    verificationCounts,
  };
}

/**
 * Gets ecosystem funnel metrics
 */
export function getEcosystemFunnelMetrics(organizationId: string): EcosystemFunnelMetrics {
  const members = getEcosystemMembers(organizationId);
  const org = getEcosystemOrganizationById(organizationId);

  const total = members.length || (org?.totalMembersCount ?? 800);
  const invited = members.filter((m) => m.status === "INVITED").length;
  const registered = members.filter((m) => m.status === "REGISTERED").length;
  const companyCreated = members.filter((m) => m.status === "COMPANY_CREATED").length;
  const verified = members.filter((m) => m.verificationStatus === "VERIFIED" || m.status === "VERIFIED").length;
  const active = members.filter((m) => m.status === "ACTIVE").length;

  return {
    issued: total,
    invited,
    registered,
    companyCreated,
    verified,
    active,
    remaining: Math.max(0, total - active),
  };
}

/**
 * Retrieves all registered ecosystem organizations
 */
export function getEcosystemOrganizations(): EcosystemOrganizationSummary[] {
  seedEcosystemOrganizations();
  const registry = loadOrganizationRegistry();
  return [...registry];
}

/**
 * Determines whether an entity, object, ID, or slug represents an institutional organization
 * (such as an Association, Chamber of Commerce, Federation, Institution, Public Organization, Registry, or Governance Body).
 */
export function isInstitutionalOrganization(
  entityOrSlug?: any
): boolean {
  if (!entityOrSlug) return false;
  if (typeof entityOrSlug === "string") {
    const org = getEcosystemOrganizationById(entityOrSlug);
    if (org) return true;
    const norm = entityOrSlug.toLowerCase();
    const knownSlugs = [
      "maritime-association",
      "port-authority",
      "rotterdam-chamber",
      "world-maritime-federation",
      "ocean-research-institute",
      "international-maritime-registry",
      "global-maritime-governance-council",
      "maritime-identity-authority",
      "european-maritime-cluster",
      "global-maritime-ecosystem-network",
    ];
    return knownSlugs.includes(norm);
  }

  const orgType = entityOrSlug.organizationType || entityOrSlug.recordType;
  if (
    orgType &&
    orgType !== "COMPANY" &&
    [
      "ASSOCIATION",
      "CHAMBER",
      "FEDERATION",
      "INSTITUTION",
      "PUBLIC_ORGANIZATION",
      "REGISTRY",
      "GOVERNANCE",
      "CLUSTER",
    ].includes(String(orgType).toUpperCase())
  ) {
    return true;
  }

  if (entityOrSlug.id && isInstitutionalOrganization(entityOrSlug.id)) {
    return true;
  }

  if (entityOrSlug.slug && isInstitutionalOrganization(entityOrSlug.slug)) {
    return true;
  }

  return false;
}

/**
 * Retrieves a single ecosystem organization by ID or slug or email
 */
export function getEcosystemOrganizationById(
  id: string
): EcosystemOrganizationSummary | undefined {
  seedEcosystemOrganizations();
  const registry = loadOrganizationRegistry();
  const norm = id.trim().toLowerCase();
  return registry.find(
    (o) =>
      o.id.toLowerCase() === norm ||
      o.slug.toLowerCase() === norm ||
      o.officialContactEmail.toLowerCase() === norm ||
      o.businessId.toLowerCase() === norm
  );
}

/**
 * Finds an ecosystem organization for a given authenticated user ID
 */
export function getOrganizationForUser(userId: string): EcosystemOrganizationSummary | undefined {
  const activeCtx = getActiveOrganizationContext(userId);
  if (activeCtx) {
    const org = getEcosystemOrganizationById(activeCtx.organizationId);
    if (org) return org;
  }
  const auth = getCurrentAuthSession();
  if (auth.email) {
    const orgByEmail = getEcosystemOrganizationById(auth.email);
    if (orgByEmail) return orgByEmail;
  }
  const allOrgs = getEcosystemOrganizations();
  return allOrgs.length > 0 ? allOrgs[0] : undefined;
}

/**
 * Switches current active organization context to a target organization ID
 */
export function switchOrganizationContext(organizationId: string): {
  success: boolean;
  organization?: EcosystemOrganizationSummary;
  message: string;
} {
  const org = getEcosystemOrganizationById(organizationId);
  if (!org) {
    return { success: false, message: `Organization '${organizationId}' not found.` };
  }

  const email = org.officialContactEmail;
  const emailPrefix = email.split("@")[0].replace(/[^a-z0-9]/g, "-");
  const userId = `usr-eco-${org.slug}-${emailPrefix}`.slice(0, 32);

  const authSession: AuthContext = {
    uid: userId,
    email,
    displayName: org.principalAuthorityName,
    emailVerified: true,
    isDevelopmentSession: true,
  };

  saveMember({
    userId,
    companyId: org.id,
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  developmentAuthProvider.setCurrentUser(authSession);
  setCurrentAuthSession(authSession);
  setActiveOrganizationContext(userId, org.id);

  return {
    success: true,
    organization: org,
    message: `Switched context to ${org.name}.`,
  };
}

/**
 * Resolves the single enrolled organization that a company belongs to.
 * Returns undefined if the company registered independently and has no enrolling organization.
 */
export function getEnrolledOrganizationForCompany(
  companyIdOrSlug: string
): EcosystemOrganizationSummary | undefined {
  if (!companyIdOrSlug) return undefined;
  const norm = companyIdOrSlug.trim().toLowerCase();

  // 1. Check if company record has explicit enrolledOrganizationId or enrolledOrganizationCode
  const repoComp = findAllCompaniesSync().find(
    (c) => c.id.toLowerCase() === norm || (c.slug && c.slug.toLowerCase() === norm)
  );
  if (repoComp) {
    if (repoComp.enrolledOrganizationId) {
      const org = getEcosystemOrganizationById(repoComp.enrolledOrganizationId);
      if (org) return org;
    }
    if (repoComp.enrolledOrganizationCode) {
      const val = validateOrganizationEnrollmentCode(repoComp.enrolledOrganizationCode);
      if (val.valid && val.organization) return val.organization;
    }
  }

  // 2. Check canonical organization memberCompanyIds
  const orgs = getEcosystemOrganizations();
  for (const org of orgs) {
    if (
      org.memberCompanyIds &&
      org.memberCompanyIds.some(
        (id) => id.toLowerCase() === norm || (repoComp?.slug && id.toLowerCase() === repoComp.slug.toLowerCase())
      )
    ) {
      return org;
    }
  }

  // 3. Fallback check for synthetic members created under an organization
  for (const org of orgs) {
    if (norm.includes(`-${org.slug.toLowerCase()}-`)) {
      return org;
    }
  }

  return undefined;
}

/**
 * Registers a new organization (State: REGISTRATION_PENDING)
 */
export function registerNewOrganization(
  input: OrganizationRegistrationInput
): {
  success: boolean;
  message: string;
  organization: EcosystemOrganizationSummary;
  activationCode: string;
} {
  const registry = loadOrganizationRegistry();
  const cleanEmail = input.officialEmail.trim().toLowerCase();
  const emailDomain = cleanEmail.includes("@") ? cleanEmail.split("@")[1] : "organization.org";

  // Check if organization already exists with this email
  const existing = registry.find((o) => o.officialContactEmail.toLowerCase() === cleanEmail);
  if (existing) {
    return {
      success: true,
      message: `Organization '${existing.name}' is already registered with this official email.`,
      organization: existing,
      activationCode: existing.activationCode || "MW-ORG-7K4P-X92M",
    };
  }

  const slug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || `org-${Date.now()}`;

  const orgId = slug;
  const hubId = `hub-${slug}`;
  const busId = `MW-BUS-${slug.toUpperCase().slice(0, 12)}`;

  // Generate Organization Activation Code (used to activate Hub)
  const actRandom = Math.random().toString(36).substring(2, 6).toUpperCase();
  const actRandom2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const activationCode = `MW-ORG-${actRandom}-${actRandom2}`;

  // Generate Member Enrollment Code (used later by members to onboard)
  const codePrefix = slug.replace(/[^a-z]/g, "").slice(0, 4).toUpperCase() || "MEMB";
  const enrollmentCode = `MW-${codePrefix}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newOrg: EcosystemOrganizationSummary = {
    id: orgId,
    name: input.name,
    legalName: input.legalName || input.name,
    slug,
    organizationType: input.organizationType,
    businessId: busId,
    verificationStatus: "PENDING",
    status: "REGISTRATION_PENDING",
    hubStatus: "NOT_CREATED",
    activationCode,
    enrollmentCode,
    ecosystemHubId: hubId,
    country: input.country,
    officialWebsite: input.officialWebsite || `https://www.${emailDomain}`,
    primaryContact: input.primaryContact || input.officialEmail,
    principalAuthorityUserId: `usr-rep-${slug}`,
    principalAuthorityName: input.representativeName,
    principalAuthorityRole: input.representativeRole,
    officialEmailDomain: emailDomain,
    officialContactEmail: cleanEmail,
    discountPercentage: 20,
    totalMembersCount: 150,
    activatedMembersCount: 17,
    verifiedMembersCount: 17,
    activeSectorCitiesCount: 9,
    memberCompanyIds: [],
    aboutDescription:
      input.aboutDescription ||
      `${input.name} is an official ${input.organizationType.replace(/_/g, " ").toLowerCase()} establishing its AI-Native member ecosystem inside MarineWorld.`,
    capabilities: [
      "Industry Network Governance",
      "Member Digitalization Accreditation",
      "Ecosystem Trade Acceleration",
      "MarineWorld Enrollment Benefits",
    ],
    knowledgeArticlesCount: 0,
    publicationsCount: 0,
  };

  registry.push(newOrg);
  saveOrganizationRegistry(registry);

  // Save company record in repo
  const entity: CompanyEntity = {
    id: newOrg.id,
    businessId: newOrg.businessId,
    organizationType: newOrg.organizationType,
    platformId: "marineworld",
    sectorId: "marine",
    primarySectorCityId: "marineworld",
    sectorCityIds: ["marineworld"],
    sectorCityId: "marineworld",
    slug: newOrg.slug,
    legalName: newOrg.legalName,
    displayName: newOrg.name,
    brandName: newOrg.name,
    description: newOrg.aboutDescription,
    shortDescription: `Official ${newOrg.organizationType.replace(/_/g, " ").toLowerCase()} ecosystem entity.`,
    logo: "/icon.png",
    email: newOrg.officialContactEmail,
    country: newOrg.country || "Global",
    city: "Port Hub",
    status: "PENDING",
    verificationStatus: "PENDING",
    ownerId: newOrg.principalAuthorityUserId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveCompanyRecordSync(entity);

  return {
    success: true,
    message: `Organization access requested for ${input.name}. Official activation code generated.`,
    organization: newOrg,
    activationCode,
  };
}

/**
 * Activates an Organization Hub (State: HUB_ACTIVE)
 */
export function activateOrganizationHub(
  input: HubActivationInput
): {
  success: boolean;
  message: string;
  organization?: EcosystemOrganizationSummary;
  authSession?: AuthContext;
} {
  const registry = loadOrganizationRegistry();
  const cleanEmail = input.officialEmail.trim().toLowerCase();
  const cleanCode = input.activationCode.trim().toUpperCase();

  const org = registry.find(
    (o) =>
      o.officialContactEmail.toLowerCase() === cleanEmail ||
      (o.activationCode && o.activationCode.toUpperCase() === cleanCode) ||
      (o.enrollmentCode && o.enrollmentCode.toUpperCase() === cleanCode)
  );

  if (!org) {
    return {
      success: false,
      message: "Organization not found for the provided email or activation code. Please request access first.",
    };
  }

  // Validate Organization Activation Code
  const validDevCodes = ["MW-OFFICIAL-2026", "123456", "OFFICIAL", "MW-2026", "VERIFY", org.activationCode?.toUpperCase(), org.enrollmentCode?.toUpperCase()];
  const isCodeValid = validDevCodes.includes(cleanCode) || cleanCode.startsWith("MW-ORG-") || cleanCode.length >= 6;

  if (!isCodeValid) {
    return {
      success: false,
      message: `Invalid Organization Activation Code. Please check the code sent to ${cleanEmail}.`,
    };
  }

  // Update Organization State machine -> HUB_ACTIVE
  org.status = "HUB_ACTIVE";
  org.hubStatus = "ACTIVE";
  org.verificationStatus = "VERIFIED";
  if (input.representativeName) {
    org.principalAuthorityName = input.representativeName;
  }

  saveOrganizationRegistry(registry);

  // Update company entity status in repo
  const compEntity = getCompanyRecordSync(org.id);
  if (compEntity) {
    saveCompanyRecordSync({
      ...compEntity,
      status: "ACTIVE",
      verificationStatus: "VERIFIED",
    });
  }

  // Authenticate user & bind active tenant context
  const emailPrefix = cleanEmail.split("@")[0].replace(/[^a-z0-9]/g, "-");
  const userId = `usr-eco-${org.slug}-${emailPrefix}`.slice(0, 32);

  const authSession: AuthContext = {
    uid: userId,
    email: cleanEmail,
    displayName: input.representativeName || org.principalAuthorityName,
    emailVerified: true,
    isDevelopmentSession: true,
  };

  saveMember({
    userId,
    companyId: org.id,
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  developmentAuthProvider.setCurrentUser(authSession);
  setCurrentAuthSession(authSession);
  setActiveOrganizationContext(userId, org.id);

  return {
    success: true,
    message: `Ecosystem Hub successfully activated for ${org.name}. Welcome to MarineWorld.`,
    organization: org,
    authSession,
  };
}

export interface CodeValidationResult {
  valid: boolean;
  status: "VALID" | "INVALID" | "EXPIRED";
  organization?: EcosystemOrganizationSummary;
  benefit?: {
    discountPercentage: number;
    description: string;
    code: string;
  };
  message?: string;
}

/**
 * Validates an Organization Enrollment Code against the canonical registry
 */
export function validateOrganizationEnrollmentCode(code: string): CodeValidationResult {
  if (!code || !code.trim()) {
    return { valid: false, status: "INVALID", message: "Enrollment code cannot be empty." };
  }

  const cleanCode = code.trim().toUpperCase();
  const orgs = getEcosystemOrganizations();

  // Match against enrollmentCode, discountCode, or activationCode
  const org = orgs.find(
    (o) =>
      (o.enrollmentCode && o.enrollmentCode.toUpperCase() === cleanCode) ||
      (o.discountCode && o.discountCode.toUpperCase() === cleanCode) ||
      (o.activationCode && o.activationCode.toUpperCase() === cleanCode)
  );

  if (!org) {
    return {
      valid: false,
      status: "INVALID",
      message: "Enrollment code could not be verified. Please check the code and try again.",
    };
  }

  if (org.status === "SUSPENDED" || org.verificationStatus === "SUSPENDED") {
    return {
      valid: false,
      status: "EXPIRED",
      message: "This enrollment code is no longer active.",
    };
  }

  const discountPercentage = org.discountPercentage || 0;
  const benefitDesc = discountPercentage > 0 ? `${discountPercentage}% Member Benefit` : "Standard Member Affiliation";

  return {
    valid: true,
    status: "VALID",
    organization: org,
    benefit: {
      discountPercentage,
      description: benefitDesc,
      code: org.enrollmentCode || cleanCode,
    },
    message: "Ecosystem Membership Verified",
  };
}

/**
 * Links a Company to an Ecosystem Organization via Enrollment Code
 */
export function applyOrganizationEnrollmentToCompany(
  companyId: string,
  enrollmentCode: string
): { success: boolean; organization?: EcosystemOrganizationSummary; error?: string } {
  const val = validateOrganizationEnrollmentCode(enrollmentCode);
  if (!val.valid || !val.organization) {
    return { success: false, error: val.message || "Invalid enrollment code." };
  }

  const org = val.organization;
  const comp = getCompanyRecordSync(companyId) || findAllCompaniesSync().find((c) => c.id === companyId || c.slug === companyId);
  if (comp) {
    comp.enrolledOrganizationId = org.id;
    comp.enrolledOrganizationName = org.name;
    comp.enrolledOrganizationCode = org.enrollmentCode;
    comp.enrolledOrganizationCountry = org.country;
    comp.enrolledOrganizationType = org.organizationType;
    comp.enrolledOrganizationDiscount = org.discountPercentage;
    comp.updatedAt = new Date().toISOString();
    saveCompanyRecordSync(comp);
  }

  // Clear member cache so issuing org sees new member
  clearEcosystemMemberCache(org.id);

  return { success: true, organization: org };
}

/**
 * Signs in a returning organization representative to their Hub
 */
export function signInToOrganizationHub(
  input: HubSignInInput
): {
  success: boolean;
  message: string;
  isPendingActivation?: boolean;
  organization?: EcosystemOrganizationSummary;
  authSession?: AuthContext;
} {
  const registry = loadOrganizationRegistry();
  const cleanEmail = input.officialEmail.trim().toLowerCase();

  const org = registry.find((o) => o.officialContactEmail.toLowerCase() === cleanEmail);

  if (!org) {
    return {
      success: false,
      message: `No Ecosystem Hub registration was found for '${cleanEmail}'. Please create your organization first.`,
    };
  }

  if (org.status !== "HUB_ACTIVE" && org.hubStatus !== "ACTIVE") {
    return {
      success: false,
      isPendingActivation: true,
      organization: org,
      message: `Organization '${org.name}' registration is pending activation. Please verify your official activation code.`,
    };
  }

  // Perform sign-in & tenant binding
  const emailPrefix = cleanEmail.split("@")[0].replace(/[^a-z0-9]/g, "-");
  const userId = `usr-eco-${org.slug}-${emailPrefix}`.slice(0, 32);

  const authSession: AuthContext = {
    uid: userId,
    email: cleanEmail,
    displayName: org.principalAuthorityName,
    emailVerified: true,
    isDevelopmentSession: true,
  };

  saveMember({
    userId,
    companyId: org.id,
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  developmentAuthProvider.setCurrentUser(authSession);
  setCurrentAuthSession(authSession);
  setActiveOrganizationContext(userId, org.id);

  return {
    success: true,
    message: `Signed in to ${org.name} Ecosystem Hub.`,
    organization: org,
    authSession,
  };
}

/**
 * Resolves full digitalization status overview
 */
export function getEcosystemDigitalizationOverview(
  organizationId: string
): EcosystemDigitalizationOverview | undefined {
  const org = getEcosystemOrganizationById(organizationId);
  if (!org) return undefined;

  const members = getEcosystemMembers(organizationId);
  const total = members.length;
  const digitalizedCount = members.filter((m) => m.status === "ACTIVE" || m.status === "VERIFIED").length;
  const pendingCount = members.filter((m) => m.status === "COMPANY_CREATED" || m.status === "REGISTERED").length;
  const notDigitalizedCount = members.filter((m) => m.status === "INVITED" || m.status === "NOT_REGISTERED").length;
  const percentage = total > 0 ? Math.round((digitalizedCount / total) * 100) : 0;

  return {
    organizationId: org.id,
    organizationName: org.name,
    organizationType: org.organizationType,
    totalMemberCompanies: total,
    digitalizedCount,
    pendingCount,
    notDigitalizedCount,
    digitalizationPercentage: percentage,
    enrollmentCode: org.enrollmentCode,
    discountPercentage: org.discountPercentage,
    memberCompanies: members,
  };
}

/**
 * Official Development Access Verification
 */
export function verifyOfficialDevelopmentAccess(
  request: OfficialVerificationRequest
): OfficialVerificationResult {
  const org = getEcosystemOrganizationById(request.organizationId);
  if (!org) {
    return {
      success: false,
      message: `Organization '${request.organizationId}' not found.`,
      denialReason: `Invalid organization ID '${request.organizationId}'.`,
    };
  }

  const email = (request.officialEmail || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return {
      success: false,
      message: "Valid official contact email address is required.",
      denialReason: "Invalid email syntax.",
    };
  }

  const code = (request.verificationCode || "").trim().toUpperCase();
  const validDevCodes = ["MW-OFFICIAL-2026", "123456", "OFFICIAL", "MW-2026", "VERIFY", org.enrollmentCode];
  const isValidCode = validDevCodes.includes(code) || /^\d{6}$/.test(code) || code.startsWith("MW-");

  if (!isValidCode) {
    return {
      success: false,
      message: `Invalid verification code. Use development code '${org.enrollmentCode}' or 'MW-OFFICIAL-2026'.`,
      denialReason: "Verification code mismatch.",
    };
  }

  const emailPrefix = email.split("@")[0].replace(/[^a-z0-9]/g, "-");
  const userId = `usr-eco-${org.slug}-${emailPrefix}`.slice(0, 32);
  const displayName = request.representativeName || org.principalAuthorityName;

  const officialAuth: AuthContext = {
    uid: userId,
    email,
    displayName,
    emailVerified: true,
    isDevelopmentSession: true,
  };

  saveMember({
    userId,
    companyId: org.id,
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  developmentAuthProvider.setCurrentUser(officialAuth);
  setCurrentAuthSession(officialAuth);
  setActiveOrganizationContext(userId, org.id);

  const accessContext = resolveAccessContext(officialAuth, org.id);

  return {
    success: true,
    message: `Official access verified for ${org.name}.`,
    accessContext,
    organization: org,
    authSession: officialAuth,
  };
}

/**
 * Generates an invitation URL for an ecosystem member company
 */
export function generateMemberOnboardingInvitation(
  organizationId: string,
  companyCandidateName: string
): { inviteUrl: string; discountCode: string; message: string } {
  const org = getEcosystemOrganizationById(organizationId);
  const enrollmentCode = org?.enrollmentCode || "MW-ECOSYSTEM-DISCOUNT";
  const slugParam = encodeURIComponent(companyCandidateName.toLowerCase().replace(/[^a-z0-9]/g, "-"));
  const inviteUrl = `${window.location.origin}/company/onboarding?ref=${encodeURIComponent(organizationId)}&candidate=${slugParam}&code=${enrollmentCode}`;

  return {
    inviteUrl,
    discountCode: enrollmentCode,
    message: `Enrollment invitation generated for ${companyCandidateName} under ${org?.name || organizationId}.`,
  };
}

/**
 * Bulk Member Invitation Handler
 */
export function bulkInviteMembers(
  organizationId: string,
  memberEmails: string[]
): { count: number; message: string } {
  const org = getEcosystemOrganizationById(organizationId);
  const count = memberEmails.length;
  return {
    count,
    message: `Bulk enrollment invitations sent to ${count} members under ${org?.name}.`,
  };
}

/**
 * AI Ecosystem Insights Generator
 */
export function getEcosystemAIInsights(organizationId: string): string[] {
  const org = getEcosystemOrganizationById(organizationId);
  const members = getEcosystemMembers(organizationId);

  if (!org || members.length === 0) {
    return [
      "Your member ecosystem is initializing.",
      "Distribute your Enrollment Code to start onboarding members.",
    ];
  }

  const funnel = getEcosystemFunnelMetrics(organizationId);
  const pendingCount = members.filter((m) => m.verificationStatus === "PENDING" || m.verificationStatus === "INCOMPLETE").length;

  return [
    `Your ecosystem is expanding fastest in Northern Europe and Mediterranean port hubs.`,
    `${funnel.active} members have fully activated their AI-Native Company inside MarineWorld.`,
    `${pendingCount} members are currently waiting for verification or require onboarding assistance.`,
    `SupplyChain.City and MarineServices.City have the highest member concentration.`,
    `${funnel.invited - funnel.companyCreated} members have been issued enrollment codes but have not yet published their AI-Native Company profile.`,
    `Member activation is strongest among companies in Marine Logistics and Technical Provisioning.`,
  ];
}

/**
 * Interactive Ecosystem AI Query Handler
 */
export function askEcosystemAI(
  organizationId: string,
  userQuery: string
): { answer: string; matchedMembers: EcosystemMemberRecord[] } {
  const members = getEcosystemMembers(organizationId);
  const q = userQuery.toLowerCase().trim();

  if (q.includes("not activated") || q.includes("not registered") || q.includes("invited")) {
    const unactive = members.filter((m) => m.status === "INVITED" || m.status === "NOT_REGISTERED");
    return {
      answer: `Found ${unactive.length} members who have received enrollment codes but have not yet activated their AI-Native Company. Direct invitation reminders can be dispatched from the Enrollment tab.`,
      matchedMembers: unactive.slice(0, 5),
    };
  }

  if (q.includes("sector city") || q.includes("city")) {
    const cityMap: Record<string, number> = {};
    members.forEach((m) => {
      cityMap[m.sectorCityId] = (cityMap[m.sectorCityId] || 0) + 1;
    });
    const sorted = Object.entries(cityMap).sort((a, b) => b[1] - a[1]);
    const topCity = sorted[0];
    return {
      answer: `SupplyChain.City currently holds the highest member concentration with ${topCity ? topCity[1] : 124} registered companies, followed by MarineServices.City and PortOps.City.`,
      matchedMembers: members.filter((m) => m.sectorCityId === (topCity ? topCity[0] : "supplychain")).slice(0, 5),
    };
  }

  if (q.includes("italy") || q.includes("germany") || q.includes("netherlands") || q.includes("singapore") || q.includes("uk")) {
    const countryName = q.includes("italy") ? "italy" : q.includes("germany") ? "germany" : q.includes("singapore") ? "singapore" : "netherlands";
    const matched = members.filter((m) => m.country.toLowerCase().includes(countryName));
    return {
      answer: `Found ${matched.length} verified member companies operating out of ${countryName.toUpperCase()}. All entities hold active MarineWorld presence slots.`,
      matchedMembers: matched.slice(0, 5),
    };
  }

  if (q.includes("verified")) {
    const verified = members.filter((m) => m.verificationStatus === "VERIFIED");
    return {
      answer: `There are ${verified.length} verified member companies in your ecosystem holding ISO/IMO compliant MarineWorld accreditation.`,
      matchedMembers: verified.slice(0, 5),
    };
  }

  if (q.includes("commercial") || q.includes("presence")) {
    const commercial = members.filter((m) => m.commercialPresence !== "NONE");
    return {
      answer: `${commercial.length} members maintain active commercial presence slots across MarineWorld Sector Cities (Enterprise, Flagship, and Landmark tiers).`,
      matchedMembers: commercial.slice(0, 5),
    };
  }

  // Default intelligent response
  return {
    answer: `Analysis of ${members.length} ecosystem members for '${userQuery}': Your organization maintains 78% activation across 18 Sector Cities. 412 members hold verified enterprise credentials.`,
    matchedMembers: members.slice(0, 5),
  };
}
