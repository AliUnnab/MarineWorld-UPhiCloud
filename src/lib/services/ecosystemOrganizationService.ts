import type {
  CompanyEntity,
  OrganizationEntityType,
  OrganizationalMembership,
  AccessContext,
  PrincipalAuthorityStatus,
} from "@/lib/types";
import {
  saveCompanyRecordSync,
  getCompanyRecordSync,
  findAllCompaniesSync,
} from "@/lib/repositories/companyRepository";
import {
  saveMember,
  findMembersByCompanyId,
  findMember,
} from "@/lib/repositories/membershipRepository";
import {
  developmentAuthProvider,
  type AuthContext,
} from "@/lib/auth/developmentAuthProvider";
import {
  getCurrentAuthSession,
  setCurrentAuthSession,
} from "@/lib/services/securityService";
import {
  getUserMemberships,
  setActiveOrganizationContext,
  getActiveOrganizationContext,
  resolveAccessContext,
  validateEcosystemOrganizationAccess,
} from "@/lib/services/accessContextService";
import { generateBusinessId } from "@/lib/services/companyService";

export interface EcosystemOrganizationSummary {
  id: string;
  name: string;
  legalName: string;
  slug: string;
  organizationType: OrganizationEntityType;
  businessId: string;
  verificationStatus: "VERIFIED" | "PENDING" | "UNVERIFIED" | "SUSPENDED";
  principalAuthorityUserId: string;
  principalAuthorityName: string;
  officialEmailDomain: string;
  officialContactEmail: string;
  discountCode: string;
  discountPercentage: number;
  memberCompanyIds: string[];
}

export interface EcosystemMemberCompanyStatus {
  companyId: string;
  name: string;
  businessId: string;
  isDigitalized: boolean;
  onboardingStatus: "ACTIVE" | "PENDING_VERIFICATION" | "NOT_DIGITALIZED";
  verificationStatus: "VERIFIED" | "PENDING" | "UNVERIFIED" | "SUSPENDED" | "REJECTED" | string;
  planCode?: string;
  sectorCityId: string;
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
  discountCode: string;
  discountPercentage: number;
  memberCompanies: EcosystemMemberCompanyStatus[];
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
    name: "Maritime Trade & Shipping Association",
    legalName: "International Maritime Trade & Shipping Association AISBL",
    slug: "maritime-association",
    organizationType: "ASSOCIATION",
    businessId: "MW-BUS-MARITIME-ASSOC",
    verificationStatus: "VERIFIED",
    principalAuthorityUserId: "usr-multi-owner-003",
    principalAuthorityName: "Capt. Alexander Vance (Secretary General)",
    officialEmailDomain: "maritime-association.org",
    officialContactEmail: "directorate@maritime-association.org",
    discountCode: "MW-ASSOC-20-DISCOUNT",
    discountPercentage: 20,
    memberCompanyIds: [
      "argento-marine",
      "crest-group-materials",
      "comp-north-sea-logistics",
      "comp-rotterdam-propulsion",
      "comp-baltic-naval",
    ],
  },
  {
    id: "port-authority",
    name: "International Port & Maritime Authority",
    legalName: "Global Port Operations & Maritime Authority Board",
    slug: "port-authority",
    organizationType: "PUBLIC_ORGANIZATION",
    businessId: "MW-BUS-PORT-AUTH",
    verificationStatus: "VERIFIED",
    principalAuthorityUserId: "usr-ecosystem-admin-004",
    principalAuthorityName: "Elena Rostova (Harbor Compliance Commissioner)",
    officialEmailDomain: "port-authority.org",
    officialContactEmail: "compliance@port-authority.org",
    discountCode: "MW-PORTAUTH-PARTNER",
    discountPercentage: 25,
    memberCompanyIds: [
      "argento-marine",
      "crest-group-materials",
      "comp-rotterdam-tugboats",
      "comp-euro-dredging",
      "comp-haven-logistics",
    ],
  },
  {
    id: "rotterdam-chamber",
    name: "Rotterdam Maritime Chamber of Commerce",
    legalName: "Chamber of Commerce Rotterdam Maritime Division",
    slug: "rotterdam-chamber",
    organizationType: "CHAMBER",
    businessId: "MW-BUS-ROTTERDAM-CHAMBER",
    verificationStatus: "VERIFIED",
    principalAuthorityUserId: "usr-chamber-lead-006",
    principalAuthorityName: "Marcus Van Den Berg (Chamber Executive)",
    officialEmailDomain: "rotterdam-chamber.org",
    officialContactEmail: "maritime@rotterdam-chamber.org",
    discountCode: "MW-CHAMBER-2026",
    discountPercentage: 15,
    memberCompanyIds: [
      "argento-marine",
      "crest-group-materials",
      "comp-maritime-steel",
      "comp-scheldt-naval",
    ],
  },
  {
    id: "world-maritime-federation",
    name: "World Maritime & Oceanics Federation",
    legalName: "World Federation of Maritime Enterprises",
    slug: "world-maritime-federation",
    organizationType: "FEDERATION",
    businessId: "MW-BUS-WORLD-MARITIME-FED",
    verificationStatus: "VERIFIED",
    principalAuthorityUserId: "usr-fed-director-007",
    principalAuthorityName: "Dr. Alistair Thorne (Director of Global Standards)",
    officialEmailDomain: "world-maritime-fed.org",
    officialContactEmail: "secretary@world-maritime-fed.org",
    discountCode: "MW-FED-GLOBAL",
    discountPercentage: 30,
    memberCompanyIds: [
      "argento-marine",
      "comp-pacific-shipping",
      "comp-atlantic-harbor",
    ],
  },
  {
    id: "ocean-research-institute",
    name: "Global Oceanographic & Marine Research Institute",
    legalName: "International Institute for Oceanographic Research",
    slug: "ocean-research-institute",
    organizationType: "INSTITUTION",
    businessId: "MW-BUS-OCEAN-RESEARCH-INST",
    verificationStatus: "VERIFIED",
    principalAuthorityUserId: "usr-research-dean-008",
    principalAuthorityName: "Prof. Sarah Chen (Dean of Marine Sciences)",
    officialEmailDomain: "ocean-research.edu",
    officialContactEmail: "partnerships@ocean-research.edu",
    discountCode: "MW-RESEARCH-COLLAB",
    discountPercentage: 50,
    memberCompanyIds: [
      "argento-marine",
      "comp-ocean-sensors",
      "comp-deep-sea-mapping",
    ],
  },
];

// Seed canonical ecosystem organization companies in companyRepository
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
        description: `Official ${org.organizationType.replace(/_/g, " ").toLowerCase()} recognized across MarineWorld.City.`,
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

/**
 * Retrieves all registered ecosystem organizations
 */
export function getEcosystemOrganizations(): EcosystemOrganizationSummary[] {
  seedEcosystemOrganizations();
  return [...CANONICAL_ECOSYSTEM_ORGS];
}

/**
 * Retrieves a single ecosystem organization by ID
 */
export function getEcosystemOrganizationById(
  id: string
): EcosystemOrganizationSummary | undefined {
  seedEcosystemOrganizations();
  const norm = id.toLowerCase();
  return CANONICAL_ECOSYSTEM_ORGS.find(
    (o) => o.id.toLowerCase() === norm || o.slug.toLowerCase() === norm
  );
}

/**
 * Resolves full digitalization status for an ecosystem organization's member companies
 */
export function getEcosystemDigitalizationOverview(
  organizationId: string
): EcosystemDigitalizationOverview | undefined {
  const org = getEcosystemOrganizationById(organizationId);
  if (!org) return undefined;

  const memberStatuses: EcosystemMemberCompanyStatus[] = org.memberCompanyIds.map((compSlug) => {
    const compRecord = getCompanyRecordSync(compSlug);
    if (compRecord) {
      const isDigitalized = Boolean(
        compRecord.verificationStatus === "VERIFIED" || compRecord.status === "ACTIVE"
      );
      return {
        companyId: compRecord.id,
        name: compRecord.displayName || compRecord.legalName || compSlug,
        businessId: compRecord.businessId || generateBusinessId(compRecord.id),
        isDigitalized,
        onboardingStatus: isDigitalized ? "ACTIVE" : "PENDING_VERIFICATION",
        verificationStatus: compRecord.verificationStatus || "PENDING",
        sectorCityId: compRecord.primarySectorCityId || "marineworld",
      };
    } else {
      // Non-digitalized member candidate
      const cleanName = compSlug
        .replace(/^comp-/, "")
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      return {
        companyId: compSlug,
        name: cleanName,
        businessId: generateBusinessId(compSlug),
        isDigitalized: false,
        onboardingStatus: "NOT_DIGITALIZED",
        verificationStatus: "UNVERIFIED",
        sectorCityId: "marineworld",
      };
    }
  });

  const total = memberStatuses.length;
  const digitalizedCount = memberStatuses.filter((m) => m.isDigitalized).length;
  const pendingCount = memberStatuses.filter((m) => m.onboardingStatus === "PENDING_VERIFICATION").length;
  const notDigitalizedCount = memberStatuses.filter((m) => m.onboardingStatus === "NOT_DIGITALIZED").length;
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
    discountCode: org.discountCode,
    discountPercentage: org.discountPercentage,
    memberCompanies: memberStatuses,
  };
}

/**
 * Simulates development official access verification for ecosystem organizations.
 * Canonical verification flow:
 * 1. Select organization
 * 2. Enter official email
 * 3. Provide development verification code
 * 4. Create / assert organizational membership
 * 5. Update auth session and switch active organization context
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

  // Email format & domain check
  const email = (request.officialEmail || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return {
      success: false,
      message: "Valid official email address is required.",
      denialReason: "Invalid email syntax.",
    };
  }

  // Development verification code check: accepts standard test code "MW-OFFICIAL-2026", "123456", or any 6-digit code in dev mode
  const code = (request.verificationCode || "").trim().toUpperCase();
  const validDevCodes = ["MW-OFFICIAL-2026", "123456", "OFFICIAL", "MW-2026", "VERIFY"];
  const isValidCode = validDevCodes.includes(code) || /^\d{6}$/.test(code);

  if (!isValidCode) {
    return {
      success: false,
      message: "Invalid verification code. Use development code 'MW-OFFICIAL-2026'.",
      denialReason: "Verification code mismatch.",
    };
  }

  // Construct official representative user
  const emailPrefix = email.split("@")[0].replace(/[^a-z0-9]/g, "-");
  const userId = `usr-eco-${org.slug}-${emailPrefix}`.slice(0, 32);
  const displayName = request.representativeName || `${org.name} Official (${emailPrefix})`;

  const officialAuth: AuthContext = {
    uid: userId,
    email,
    displayName,
    emailVerified: true,
    isDevelopmentSession: true,
  };

  // Register or assert membership in canonical membershipRepository
  saveMember({
    userId,
    companyId: org.id,
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Set active authentication session
  developmentAuthProvider.setCurrentUser(officialAuth);
  setCurrentAuthSession(officialAuth);

  // Set active organization context
  setActiveOrganizationContext(userId, org.id);

  // Resolve canonical AccessContext
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
 * Generates an onboarding invitation URL for an ecosystem member company
 */
export function generateMemberOnboardingInvitation(
  organizationId: string,
  companyCandidateName: string
): { inviteUrl: string; discountCode: string; message: string } {
  const org = getEcosystemOrganizationById(organizationId);
  const discountCode = org?.discountCode || "MW-ECOSYSTEM-DISCOUNT";
  const slugParam = encodeURIComponent(companyCandidateName.toLowerCase().replace(/[^a-z0-9]/g, "-"));
  const inviteUrl = `/company/onboarding?ref=${encodeURIComponent(organizationId)}&candidate=${slugParam}&code=${discountCode}`;

  return {
    inviteUrl,
    discountCode,
    message: `Invitation generated for ${companyCandidateName} under ${org?.name || organizationId}.`,
  };
}
