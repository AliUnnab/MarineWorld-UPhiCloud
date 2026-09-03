import type {
  CompanyProfile,
  EntityStatus,
  IndustryDomainEntity,
  ProductEntity,
  ServiceEntity,
  SectorCity,
  SectorConfig,
} from "@/lib/types";
import { marineSector } from "@/lib/sectors/marine";
import { marineDomains, LEGACY_DOMAIN_MAP } from "@/lib/sectors/marine-domains";
import { getCompanyRecordSync, findAllCompaniesSync } from "@/lib/repositories/companyRepository";
import { resolveMarineWorldCompanyDigitalId } from "@/lib/services/companyIdentityService";
import { buildCanonicalOfferingUrl, initializeCanonicalOfferingDefaults } from "@/lib/services/offeringEntityService";
import { getCityAnchor, isCompanyAnchor, type CityAnchorCredential } from "@/lib/services/propertyService";
export { buildCanonicalOfferingUrl, initializeCanonicalOfferingDefaults, getCityAnchor, isCompanyAnchor, type CityAnchorCredential };


/**
 * SectorRegistry — canonical registry of sector configurations.
 * The landing page never hardcodes sector data; it renders
 * whatever configuration the registry resolves.
 */
const sectorRegistry: Record<string, SectorConfig> = {
  "marine-maritime": marineSector,
};

export function getSectorConfig(sectorId: string): SectorConfig {
  const config = sectorRegistry[sectorId] ?? marineSector;
  return config;
}

export function getRegisteredSectors(): string[] {
  return Object.keys(sectorRegistry);
}

/* ------------------------------------------------------------
   Registry accessors — stable API for page logic
   ------------------------------------------------------------ */

export const DEFAULT_ENTITY_STATUS: EntityStatus = "COMING_SOON";

export function resolveCityStatus(city: SectorCity): EntityStatus {
  return city.status ?? DEFAULT_ENTITY_STATUS;
}

export function resolveCompanyStatus(company: CompanyProfile): EntityStatus {
  return company.status ?? DEFAULT_ENTITY_STATUS;
}

export function resolveCompanyInitials(name?: string, fallback = "MW"): string {
  if (!name || typeof name !== "string") return fallback;
  const clean = name.trim().replace(/[^\w\s]/gi, " ");
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 2).toUpperCase();
  }
  if (words.length === 1 && words[0].length === 1) {
    return words[0].toUpperCase();
  }
  return fallback;
}

export function formatAvatarInitials(initials?: string, name?: string, fallback = "MW"): string {
  if (initials && typeof initials === "string") {
    const clean = initials.trim().replace(/[^A-Za-z0-9]/g, "");
    if (clean.length >= 1 && clean.length <= 2) {
      return clean.toUpperCase();
    }
  }
  return resolveCompanyInitials(name || initials, fallback);
}

/**
 * Universal helper to determine whether an entity holds Flagship Registry Status.
 * Flagship is a portable registry credential recognized across all platform views.
 */
export function isCompanyFlagship(company?: Partial<CompanyProfile> | null): boolean {
  if (!company) return false;
  if (company.isFlagship === true) return true;
  if (company.presenceTier === "FLAGSHIP") return true;
  if ((company as any).tier === "FLAGSHIP" || (company as any).tier === "LANDMARK") return true;
  return false;
}

/**
 * Canonical unified comparator for company ranking everywhere on MarineWorld:
 * 1. Landmark Anchor Status (Anchor registry credential > non-anchor)
 * 2. Flagship Registry Status (Flagship tier > Enterprise > Standard)
 * 3. Verification Status (Verified > Under Review / Pending)
 * 4. AI Twin Capability (Twin Active > Ready)
 * 5. Alphabetical by display name
 */
export function compareCompaniesForRegistryRanking(
  a: CompanyProfile,
  b: CompanyProfile
): number {
  const aIsAnchor = isCompanyAnchor(a);
  const bIsAnchor = isCompanyAnchor(b);
  if (aIsAnchor !== bIsAnchor) {
    return aIsAnchor ? -1 : 1;
  }

  const aIsFlagship = isCompanyFlagship(a);
  const bIsFlagship = isCompanyFlagship(b);
  if (aIsFlagship !== bIsFlagship) {
    return aIsFlagship ? -1 : 1;
  }

  const aTierScore = a.presenceTier === "FLAGSHIP" || aIsFlagship ? 3 : a.presenceTier === "ENTERPRISE" ? 2 : 1;
  const bTierScore = b.presenceTier === "FLAGSHIP" || bIsFlagship ? 3 : b.presenceTier === "ENTERPRISE" ? 2 : 1;
  if (bTierScore !== aTierScore) {
    return bTierScore - aTierScore;
  }

  const aVer = a.verificationStatus === "verified" ? 1 : 0;
  const bVer = b.verificationStatus === "verified" ? 1 : 0;
  if (bVer !== aVer) {
    return bVer - aVer;
  }

  const aTwin = a.aiStatus === "twin" ? 1 : 0;
  const bTwin = b.aiStatus === "twin" ? 1 : 0;
  if (bTwin !== aTwin) {
    return bTwin - aTwin;
  }

  return (a.displayName || a.name || "").localeCompare(b.displayName || b.name || "");
}

export function getCities(config?: SectorConfig): SectorCity[] {
  if (config?.explorer?.cities) return config.explorer.cities;
  const cfg = getSectorConfig("marine-maritime");
  return cfg.explorer.cities;
}

export function getCompanies(_config?: SectorConfig): CompanyProfile[] {
  return findAllCompaniesSync() as unknown as CompanyProfile[];
}


export interface CompanyFilterCriteria {
  searchQuery?: string;
  domain?: string;
  sectorCity?: string;
  country?: string;
  region?: string;
  verificationStatus?: "all" | "verified" | "review";
  aiStatus?: "all" | "twin" | "ready";
  presenceTier?: "all" | "FLAGSHIP" | "ENTERPRISE" | "STANDARD";
  sortBy?: "relevance" | "name_asc" | "name_desc" | "newest" | "city" | "country" | "verified_first";
  page?: number;
  pageSize?: number;
}

export interface CompanyPaginatedResult {
  items: CompanyProfile[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  facets: {
    domains: { id: string; name: string; count: number }[];
    sectorCities: { id: string; name: string; count: number }[];
    countries: { name: string; count: number }[];
    regions: { id: string; name: string; count: number }[];
    verification: { verified: number; review: number };
    twins: { twin: number; ready: number };
    tiers: { flagship: number; enterprise: number; standard: number };
  };
}

export function getCompaniesPaginated(
  config: SectorConfig,
  criteria: CompanyFilterCriteria = {},
  customCompanies?: CompanyProfile[]
): CompanyPaginatedResult {
  const all = customCompanies !== undefined ? customCompanies : getCompanies(config);
  const {
    searchQuery = "",
    domain = "All",
    sectorCity = "All",
    country = "All",
    region = "All",
    verificationStatus = "all",
    aiStatus = "all",
    presenceTier = "all",
    sortBy = "relevance",
    page = 1,
    pageSize = 12,
  } = criteria;

  const q = searchQuery.toLowerCase().trim();

  // Filter pass
  const filtered = all.filter((c) => {
    // 1. Search Query
    if (q) {
      const matchSearch =
        (c.displayName || c.name || "").toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q) ||
        (c.shortDescription || "").toLowerCase().includes(q) ||
        (c.location || "").toLowerCase().includes(q) ||
        (c.industry || "").toLowerCase().includes(q) ||
        (c.primarySectorCategory || "").toLowerCase().includes(q) ||
        (c.capabilities && c.capabilities.some((cap) => cap.toLowerCase().includes(q))) ||
        (c.cityIds && c.cityIds.some((cid) => cid.toLowerCase().includes(q)));
      if (!matchSearch) return false;
    }

    // 2. Domain Filter
    if (domain && domain !== "All") {
      const normDomain = domain.toLowerCase();
      const matchDomain =
        (c.industry || "").toLowerCase() === normDomain ||
        (c.primarySectorCategory || "").toLowerCase() === normDomain;
      if (!matchDomain) return false;
    }

    // 3. Sector City Filter
    if (sectorCity && sectorCity !== "All") {
      const normCity = sectorCity.toLowerCase().replace(/\.city$/, "");
      const cityIds = [
        ...(c.cityIds || []),
        ...(c.sectorCityIds || []),
        c.primarySectorCityId,
        c.primaryRegistryNode,
      ]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase().replace(/\.city$/, ""));

      const matchCity = cityIds.some((id) => id.includes(normCity) || normCity.includes(id));
      if (!matchCity) return false;
    }

    // 4. Country Filter
    if (country && country !== "All") {
      if ((c.country || "").toLowerCase() !== country.toLowerCase()) return false;
    }

    // 5. Region Filter
    if (region && region !== "All") {
      const normRegion = region.toLowerCase().replace(/_/g, "-");
      const cRegion = (c.region || "").toLowerCase().replace(/_/g, "-");
      const cRegions = (c.regionalEditions || []).map((r) => r.toLowerCase().replace(/_/g, "-"));
      if (!cRegion.includes(normRegion) && !cRegions.some((r) => r.includes(normRegion))) {
        return false;
      }
    }

    // 6. Verification Status
    if (verificationStatus && verificationStatus !== "all") {
      if ((c.verificationStatus || "").toLowerCase() !== verificationStatus.toLowerCase()) {
        return false;
      }
    }

    // 7. AI Twin Status
    if (aiStatus && aiStatus !== "all") {
      if ((c.aiStatus || "").toLowerCase() !== aiStatus.toLowerCase()) {
        return false;
      }
    }

    // 8. Presence Tier
    if (presenceTier && presenceTier !== "all") {
      const tier = ((c as any).presenceTier || "STANDARD").toUpperCase();
      if (tier !== presenceTier.toUpperCase()) return false;
    }

    return true;
  });

  // Sort pass
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "name_asc":
        return (a.displayName || a.name || "").localeCompare(b.displayName || b.name || "");
      case "name_desc":
        return (b.displayName || b.name || "").localeCompare(a.displayName || a.name || "");
      case "verified_first": {
        const aFlag = isCompanyFlagship(a) ? 1 : 0;
        const bFlag = isCompanyFlagship(b) ? 1 : 0;
        const aVer = a.verificationStatus === "verified" ? 2 : 0;
        const bVer = b.verificationStatus === "verified" ? 2 : 0;
        const aScore = aVer + aFlag;
        const bScore = bVer + bFlag;
        if (bScore !== aScore) return bScore - aScore;
        return (a.displayName || a.name || "").localeCompare(b.displayName || b.name || "");
      }
      case "city":
        return (a.city || "").localeCompare(b.city || "");
      case "country":
        return (a.country || "").localeCompare(b.country || "");
      case "newest": {
        const aId = Number(a.companyId6Digit || 0);
        const bId = Number(b.companyId6Digit || 0);
        return bId - aId;
      }
      case "relevance":
      default: {
        return compareCompaniesForRegistryRanking(a, b);
      }
    }
  });

  // Calculate dynamic facets based on the currently filtered company results
  const domainMap = new Map<string, number>();
  const cityMap = new Map<string, number>();
  const countryMap = new Map<string, number>();
  const regionMap = new Map<string, number>();
  let verifiedCount = 0;
  let reviewCount = 0;
  let twinCount = 0;
  let readyCount = 0;
  let flagshipCount = 0;
  let enterpriseCount = 0;
  let standardCount = 0;

  filtered.forEach((c) => {
    if (c.industry) {
      domainMap.set(c.industry, (domainMap.get(c.industry) || 0) + 1);
    }
    const cCityIds = [
      ...(c.cityIds || []),
      ...(c.sectorCityIds || []),
      c.primarySectorCityId,
      c.primaryRegistryNode,
    ].filter(Boolean) as string[];

    const uniqueCityIds = new Set(cCityIds.map((cid) => String(cid).toLowerCase().replace(/\.city$/, "")));
    uniqueCityIds.forEach((cid) => {
      cityMap.set(cid, (cityMap.get(cid) || 0) + 1);
    });

    if (c.country) {
      countryMap.set(c.country, (countryMap.get(c.country) || 0) + 1);
    }
    if (c.region) {
      regionMap.set(c.region, (regionMap.get(c.region) || 0) + 1);
    }
    if (c.verificationStatus === "verified") verifiedCount++;
    else reviewCount++;
    if (c.aiStatus === "twin") twinCount++;
    else readyCount++;
    if (isCompanyFlagship(c)) {
      flagshipCount++;
    } else if (((c as any).presenceTier || "").toUpperCase() === "ENTERPRISE") {
      enterpriseCount++;
    } else {
      standardCount++;
    }
  });

  const totalCount = sorted.length;
  const validPageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(totalCount / validPageSize));
  const validPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (validPage - 1) * validPageSize;
  const items = sorted.slice(startIndex, startIndex + validPageSize);

  return {
    items,
    totalCount,
    totalPages,
    page: validPage,
    pageSize: validPageSize,
    facets: {
      domains: Array.from(domainMap.entries()).map(([name, count]) => ({ id: name, name, count })),
      sectorCities: Array.from(cityMap.entries()).map(([id, count]) => ({ id, name: id.toUpperCase(), count })),
      countries: Array.from(countryMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      regions: Array.from(regionMap.entries()).map(([id, count]) => ({ id, name: id, count })),
      verification: { verified: verifiedCount, review: reviewCount },
      twins: { twin: twinCount, ready: readyCount },
      tiers: { flagship: flagshipCount, enterprise: enterpriseCount, standard: standardCount },
    },
  };
}

/* ------------------------------------------------------------
   Industry Domain accessors
   ------------------------------------------------------------ */

export function getMarineDomains(): IndustryDomainEntity[] {
  return marineDomains;
}

export function getIndustryDomainBySlug(slug: string): IndustryDomainEntity | undefined {
  if (!slug || typeof slug !== "string") return undefined;
  const norm = slug.toLowerCase().trim();
  
  // 1. Direct match on canonical domain slug or id or exact name
  const direct = marineDomains.find(
    (d) =>
      (d?.slug && d.slug.toLowerCase() === norm) ||
      (d?.id && d.id.toLowerCase() === norm) ||
      (d?.name && d.name.toLowerCase() === norm)
  );
  if (direct) return direct;

  // 2. Check legacy alias map
  const mappedTarget = LEGACY_DOMAIN_MAP[norm];
  if (mappedTarget) {
    const mapped = marineDomains.find((d) => d.id === mappedTarget || d.slug === mappedTarget);
    if (mapped) return mapped;
  }

  // 3. Fallback partial match on name or ID
  return marineDomains.find(
    (d) => d.name.toLowerCase().includes(norm) || norm.includes(d.id.toLowerCase())
  );
}

export function getIndustryDomainById(id: string): IndustryDomainEntity | undefined {
  return getIndustryDomainBySlug(id);
}

export function getCitiesByDomain(config: SectorConfig, domainSlugOrId: string): SectorCity[] {
  const domain = getIndustryDomainBySlug(domainSlugOrId) ?? getIndustryDomainById(domainSlugOrId);
  if (!domain) return [];
  const cities = config?.explorer?.cities || [];
  return cities
    .filter((c) => {
      if (!c) return false;
      // 1. Authoritative canonical match: category name matches domain name
      if (c.category && c.category.toLowerCase() === domain.name.toLowerCase()) return true;
      // 2. If category is explicitly present, it is authoritative (do not match other domains)
      if (c.category && c.category.trim() !== "") return false;
      // 3. Fallback when category is missing: match direct industryDomainId or legacy alias
      if (c.industryDomainId === domain.id || c.industryDomainId === domain.slug) return true;
      const legacyMapped = LEGACY_DOMAIN_MAP[c.industryDomainId?.toLowerCase()];
      if (legacyMapped && (legacyMapped === domain.id || legacyMapped === domain.slug)) return true;
      return false;
    })
    .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
}

export function getCityBySlug(config: SectorConfig, citySlug: string): SectorCity | undefined {
  if (!citySlug || typeof citySlug !== "string") return undefined;
  const norm = citySlug.toLowerCase().replace(/-city$/, "").replace(/\.city$/, "");
  return config?.explorer?.cities?.find((c) => {
    if (!c) return false;
    const cSlug = (c.slug || "").toLowerCase().replace(/-city$/, "");
    const cId = (c.id || "").toLowerCase();
    const cDomain = (c.domain || "").toLowerCase().replace(/\.city$/, "");
    return cSlug === norm || cId === norm || cDomain === norm;
  });
}

export function getCityById(config: SectorConfig, cityId: string): SectorCity | undefined {
  return getCityBySlug(config, cityId);
}

export function formatCompactLocation(country?: string, city?: string): string {
  const cCountry = (country || "").trim();
  let cCity = (city || "").trim();
  if (cCountry && cCity && cCity.toLowerCase().endsWith(cCountry.toLowerCase())) {
    cCity = cCity.replace(new RegExp(`,?\\s*${cCountry}$`, "i"), "").trim();
  }
  if (cCountry && cCity) return `${cCountry} · ${cCity}`;
  return cCountry || cCity || "Unspecified Location";
}

export function formatDetailedLocation(city?: string, country?: string): string {
  const cCountry = (country || "").trim();
  let cCity = (city || "").trim();
  if (cCountry && cCity && cCity.toLowerCase().endsWith(cCountry.toLowerCase())) {
    cCity = cCity.replace(new RegExp(`,?\\s*${cCountry}$`, "i"), "").trim();
  }
  if (cCity && cCountry) return `${cCity}, ${cCountry}`;
  return cCity || cCountry || "Unspecified Location";
}

export function getCompaniesInCity(config: SectorConfig, cityIdOrSlug: string): CompanyProfile[] {
  const city = getCityBySlug(config, cityIdOrSlug);
  if (!city) return [];

  const repoCompanies = findAllCompaniesSync();
  const configCompanies = config?.network?.companies || [];

  const seenKeys = new Set<string>();
  const allKnown: CompanyProfile[] = [];

  for (const c of [...repoCompanies, ...configCompanies]) {
    if (!c) continue;
    const lookupKey = (c as any).slug || c.id;
    const resolved = getCompanyBySlug(config, lookupKey) || (c as any);
    if (!resolved) continue;
    const uniqueKey = (resolved.id || resolved.slug || "").toLowerCase();
    if (seenKeys.has(uniqueKey)) continue;
    seenKeys.add(uniqueKey);
    allKnown.push(resolved);
  }

  const normCityId = (city.id || "").toLowerCase();
  const normCitySlug = (city.slug || "").toLowerCase();
  const normDomain = (city.domain || "").toLowerCase().replace(/\.city$/, "");

  const matched = allKnown.filter((c) => {
    if (!c) return false;
    const cCityIds = [
      ...(c.cityIds || []),
      ...(c.sectorCityIds || []),
      c.primarySectorCityId,
      (c as any).cityId,
    ]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase().replace(/\.city$/, ""));

    if (
      cCityIds.includes(normCityId) ||
      cCityIds.includes(normCitySlug) ||
      cCityIds.includes(normDomain)
    ) {
      return true;
    }

    const cCity = (c.city || "").toLowerCase().replace(/\.city$/, "");
    if (cCity.includes(normDomain) || cCity.includes(normCityId) || cCity.includes(normCitySlug)) {
      return true;
    }
    return false;
  });

  return matched.sort(compareCompaniesForRegistryRanking);
}

export function getCompanyBySlug(configOrSlug?: SectorConfig | string, companySlug?: string): CompanyProfile | undefined {
  const all = findAllCompaniesSync();
  const slugToFind = typeof configOrSlug === "string" ? configOrSlug : companySlug;
  if (!slugToFind || typeof slugToFind !== "string") {
    return all[0] as unknown as CompanyProfile;
  }
  const norm = slugToFind.toLowerCase();
  const dynamicRecord =
    getCompanyRecordSync(norm) ||
    all.find((c) => {
      if (!c) return false;
      const comp = c as any;
      return (
        (comp.slug && comp.slug.toLowerCase() === norm) ||
        (comp.id && comp.id.toLowerCase() === norm) ||
        (comp.name && comp.name.toLowerCase().replace(/[^a-z0-9]/g, "-") === norm) ||
        (comp.displayName && comp.displayName.toLowerCase().replace(/[^a-z0-9]/g, "-") === norm)
      );
    });

  if (!dynamicRecord) return undefined;

  const isVerified = (dynamicRecord.verificationStatus as string)?.toUpperCase() === "VERIFIED";
  const finalCity = (dynamicRecord as any).headquartersCity || (dynamicRecord as any).city || "Rotterdam";
  const finalCountry = dynamicRecord.country || "Netherlands";

  const companyId6Digit =
    (dynamicRecord as any).companyId6Digit ||
    (dynamicRecord.businessId?.match(/\d{6}/)?.[0]) ||
    "100001";

  const primarySectorCategory =
    (dynamicRecord as any).primarySectorCategory ||
    (dynamicRecord as any).industry ||
    "Marine Services";

  const secondarySectorCategories =
    (dynamicRecord as any).secondarySectorCategories ||
    ["Marine Equipment", "Logistics"];

  const regionalEditions =
    (dynamicRecord as any).regionalEditions ||
    [(dynamicRecord as any).region || "MEDITERRANEAN"];

  const sectorCityIds =
    dynamicRecord.sectorCityIds ||
    (dynamicRecord as any).cityIds ||
    ["supplychain"];

  const digitalIdInfo = resolveMarineWorldCompanyDigitalId({
    companyIdOrSlug: dynamicRecord.id || norm,
    mwCompanyDigitalId: (dynamicRecord as any).mwCompanyDigitalId,
    businessId: dynamicRecord.businessId,
    companyId6Digit: (dynamicRecord as any).companyId6Digit || companyId6Digit,
    primaryRegistryCode: (dynamicRecord as any).primaryRegistryCode,
    primarySectorCityId: (dynamicRecord as any).primarySectorCityId || sectorCityIds[0],
  });

  const dynAny = dynamicRecord as any;

  return {
    id: dynamicRecord.id || norm,
    slug: dynamicRecord.slug || norm,
    name: dynAny.displayName || dynAny.legalName || dynAny.name || "Company",
    displayName: dynAny.displayName || dynAny.name || "Company",
    initials: resolveCompanyInitials(dynAny.displayName || dynAny.legalName || dynAny.name || "MW"),
    recordType: "PUBLIC_REGISTRY",

    industry: primarySectorCategory,
    primarySectorCategory: primarySectorCategory,
    secondarySectorCategories: secondarySectorCategories,
    city: finalCity,
    headquartersCity: finalCity,
    cityIds: sectorCityIds,
    sectorCityIds: sectorCityIds,
    regionalEditions: regionalEditions,
    location: formatDetailedLocation(finalCity, finalCountry),
    country: finalCountry,
    region: regionalEditions[0] || "MEDITERRANEAN",
    website: dynamicRecord.websiteUrl || dynamicRecord.website,
    status: (dynamicRecord.status as any) || "LIVE",
    verificationStatus: isVerified ? "verified" : "review",
    capabilities: (dynamicRecord as any).capabilities || ["Maritime Operations"],
    products: dynamicRecord.products,
    services: dynamicRecord.services,
    offerings: (dynamicRecord.offerings || [])?.map((off) =>
      initializeCanonicalOfferingDefaults(off, {
        id: dynamicRecord.id || norm,
        slug: dynamicRecord.slug || norm,
        sectorCityIds,
        cityIds: sectorCityIds,
      } as any)
    ),
    aiStatus: (dynamicRecord as any).aiStatus || "ready",
    businessTwinStatus: (dynamicRecord as any).businessTwinStatus || "AVAILABLE",
    shortDescription: dynamicRecord.shortDescription,
    description: (dynamicRecord as any).corporateDescription || dynamicRecord.description,
    corporateDescription: (dynamicRecord as any).corporateDescription || dynamicRecord.description,
    coverImage: (dynamicRecord as any).coverImage || (dynamicRecord as any).heroImageUrl,
    flagshipStatement: (dynamicRecord as any).flagshipStatement || (dynamicRecord as any).coverImageCaption,
    coverImageCaption: (dynamicRecord as any).coverImageCaption || (dynamicRecord as any).flagshipStatement,
    logoUrl: (dynamicRecord as any).logoUrl || (dynamicRecord as any).logo,
    productsList: dynamicRecord.productsList,
    servicesList: dynamicRecord.servicesList,
    legalName: dynamicRecord.legalName,
    tradingName: dynamicRecord.brandName || (dynamicRecord as any).tradingName,
    businessId: digitalIdInfo.mwCompanyDigitalId,
    mwCompanyDigitalId: digitalIdInfo.mwCompanyDigitalId,
    primaryRegistryCode: digitalIdInfo.primaryRegistryCode,
    primaryRegistryNode: digitalIdInfo.primaryRegistryNode,
    companyId6Digit: digitalIdInfo.companyId6Digit,
    organizationType: dynamicRecord.organizationType,
    registrationNumber: (dynamicRecord as any).registrationNumber,
    foundedYear: (dynamicRecord as any).foundedYear ? String((dynamicRecord as any).foundedYear) : undefined,
    presenceTier: (dynamicRecord as any).presenceTier || "STANDARD",
    isFlagship: (dynamicRecord as any).isFlagship ?? ((dynamicRecord as any).presenceTier === "FLAGSHIP"),
    flagshipSectorCityId: (dynamicRecord as any).flagshipSectorCityId,
    flagshipRegisteredAt: (dynamicRecord as any).flagshipRegisteredAt,
    isAnchor: (dynamicRecord as any).isAnchor ?? ((dynamicRecord as any).tier === "LANDMARK"),
    anchorSectorCityId: (dynamicRecord as any).anchorSectorCityId,
    anchorRegisteredAt: (dynamicRecord as any).anchorRegisteredAt,
    officialEmail: dynamicRecord.officialEmail || dynamicRecord.email,
  };
}

export function getCompanyById(configOrCompanyId: SectorConfig | string, companyId?: string): CompanyProfile | undefined {
  if (typeof configOrCompanyId === "string") {
    const config = sectorRegistry["marine-maritime"] ?? marineSector;
    return getCompanyBySlug(config, configOrCompanyId);
  }
  if (companyId) {
    return getCompanyBySlug(configOrCompanyId, companyId);
  }
  return undefined;
}

export function getCompanyParentContext(
  config: SectorConfig,
  company: CompanyProfile
): {
  primaryCity?: SectorCity;
  parentDomain?: IndustryDomainEntity;
} {
  const cityId = company.cityIds?.[0] || company.sectorCityIds?.[0] || company.city;
  const primaryCity = cityId ? getCityBySlug(config, cityId) : undefined;
  const parentDomain = primaryCity?.industryDomainId
    ? getIndustryDomainById(primaryCity.industryDomainId)
    : undefined;

  return { primaryCity, parentDomain };
}

/* ------------------------------------------------------------
   Product catalog accessors
   ------------------------------------------------------------ */

export function getCompanyProducts(company: CompanyProfile): ProductEntity[] {
  if (!company) return [];
  const products: ProductEntity[] = [];
  const companySlug = company.slug || company.id || "company";
  const sectorCity = company.sectorCityIds?.[0] || (company as any).cityIds?.[0] || "shipyard";

  // 1. Direct productsList
  if (company.productsList && company.productsList.length > 0) {
    company.productsList.forEach((p) => {
      if (!p) return;
      const pSlug = p.slug || p.id;
      const canonicalUrl = p.canonicalUrl || buildCanonicalOfferingUrl(pSlug, companySlug, p.sectorCityId || sectorCity);
      products.push({
        ...p,
        companySlug: p.companySlug || companySlug,
        canonicalUrl,
      });
    });
  }

  // 2. Map offerings of type 'product'
  if (company.offerings && company.offerings.length > 0) {
    const productOfferings = company.offerings.filter((o) => o && o.type === "product");
    for (const off of productOfferings) {
      const slug = off.slug || (off.name ? String(off.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : `off-${off.id || 'item'}`);
      if (!products.some((p) => p.id === off.id || p.slug === slug)) {
        const canonicalUrl = off.canonicalUrl || buildCanonicalOfferingUrl(slug, companySlug, off.sectorCity || sectorCity);
        products.push({
          id: off.id,
          slug,
          name: off.name,
          companyId: company.id,
          companySlug,
          canonicalUrl,
          shortDescription: off.shortDescription,
          description: off.shortDescription,
          category: off.category || "General Products",
          productCode: off.code,
          status: (off.status as any) || "ACTIVE",
          visibility: "PUBLIC",
          availability: "AVAILABLE",
          specifications: off.specifications,
          coverImage: (off as any).coverImage || (off as any).primaryImage || off.mediaReferences?.[0]?.url,
          mediaReferences: off.mediaReferences,
          media: (off as any).media,
          imageUrl: (off as any).coverImage || (off as any).primaryImage || off.mediaReferences?.[0]?.url,
        });
      }
    }
  }

  // 3. Fallback string array `company.products`
  if (company.products && company.products.length > 0 && products.length === 0) {
    company.products.forEach((prodName, idx) => {
      if (!prodName) return;
      const slug = String(prodName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const canonicalUrl = buildCanonicalOfferingUrl(slug, companySlug, sectorCity);
      products.push({
        id: `prod-${company.id}-${idx + 1}`,
        slug,
        name: String(prodName),
        companyId: company.id,
        companySlug,
        canonicalUrl,
        shortDescription: `${prodName} offered by ${company.name || "Company"}.`,
        category: company.industry || "Marine Products",
        status: "ACTIVE",
        visibility: "PUBLIC",
        availability: "AVAILABLE",
      });
    });
  }

  return products;
}

export function getCompanyProductBySlug(
  company: CompanyProfile,
  productSlug?: string
): ProductEntity | undefined {
  if (!productSlug || !company) return undefined;
  const norm = String(productSlug).toLowerCase();
  const products = getCompanyProducts(company);
  return products.find(
    (p) => (p?.slug && p.slug.toLowerCase() === norm) || (p?.id && p.id.toLowerCase() === norm)
  );
}

export function getProductBySlug(
  productSlug?: string,
  config: SectorConfig = marineSector
): ProductEntity | undefined {
  if (!productSlug) return undefined;
  const norm = String(productSlug).toLowerCase();
  for (const company of config?.network?.companies ?? []) {
    const found = getCompanyProductBySlug(company, norm);
    if (found) return found;
  }
  return undefined;
}

/* ------------------------------------------------------------
   Service catalog accessors
   ------------------------------------------------------------ */

export function getCompanyServices(company: CompanyProfile): ServiceEntity[] {
  if (!company) return [];
  const services: ServiceEntity[] = [];
  const companySlug = company.slug || company.id || "company";
  const sectorCity = company.sectorCityIds?.[0] || (company as any).cityIds?.[0] || "shipyard";

  // 1. Direct servicesList
  if (company.servicesList && company.servicesList.length > 0) {
    // Only return PUBLIC and ACTIVE services on public pages
    const publicServices = company.servicesList.filter(
      (s) => s && (s.visibility ?? "PUBLIC") === "PUBLIC" && (s.status ?? "ACTIVE") !== "DRAFT"
    );
    publicServices.forEach((s) => {
      const sSlug = s.slug || s.id;
      const canonicalUrl = s.canonicalUrl || buildCanonicalOfferingUrl(sSlug, companySlug, s.sectorCityId || sectorCity);
      services.push({
        ...s,
        companySlug: s.companySlug || companySlug,
        canonicalUrl,
      });
    });
  }

  // 2. Map offerings of type 'service'
  if (company.offerings && company.offerings.length > 0) {
    const serviceOfferings = company.offerings.filter((o) => o && o.type === "service");
    for (const off of serviceOfferings) {
      const slug = off.slug || (off.name ? String(off.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : `off-${off.id || 'item'}`);
      if (!services.some((s) => s.id === off.id || s.slug === slug)) {
        const canonicalUrl = off.canonicalUrl || buildCanonicalOfferingUrl(slug, companySlug, off.sectorCity || sectorCity);
        services.push({
          id: off.id,
          slug,
          name: off.name,
          companyId: company.id,
          companySlug,
          canonicalUrl,
          shortDescription: off.shortDescription,
          description: off.shortDescription,
          serviceType: "Technical Service",
          category: off.category || "Marine Services",
          status: (off.status as any) || "ACTIVE",
          visibility: "PUBLIC",
          availability: "AVAILABLE",
          serviceAreas: [company.city || "Global"],
          specifications: off.specifications,
          coverImage: (off as any).coverImage || (off as any).primaryImage || off.mediaReferences?.[0]?.url,
          mediaReferences: off.mediaReferences,
          media: (off as any).media,
          imageUrl: (off as any).coverImage || (off as any).primaryImage || off.mediaReferences?.[0]?.url,
          capabilities: [off.name],
        });
      }
    }
  }

  // 3. Fallback string array `company.services`
  if (company.services && company.services.length > 0 && services.length === 0) {
    company.services.forEach((servName, idx) => {
      if (!servName) return;
      const slug = String(servName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const canonicalUrl = buildCanonicalOfferingUrl(slug, companySlug, sectorCity);
      services.push({
        id: `serv-${company.id}-${idx + 1}`,
        slug,
        name: String(servName),
        companyId: company.id,
        companySlug,
        canonicalUrl,
        shortDescription: `${servName} specialized capability provided by ${company.name || "Company"}.`,
        description: `${servName} is a high-grade service provided by ${company.name || "Company"} across regional sector hubs and naval facilities.`,
        serviceType: "Specialized Service",
        category: company.industry || "Marine Services",
        status: "ACTIVE",
        visibility: "PUBLIC",
        availability: "AVAILABLE",
        serviceAreas: [company.city || "Regional / Sector City"],
        capabilities: [String(servName)],
      });
    });
  }

  return services;
}

export function getCompanyServiceBySlug(
  company: CompanyProfile,
  serviceSlug?: string
): ServiceEntity | undefined {
  if (!serviceSlug || !company) return undefined;
  const norm = String(serviceSlug).toLowerCase();
  const services = getCompanyServices(company);
  return services.find(
    (s) => (s?.slug && s.slug.toLowerCase() === norm) || (s?.id && s.id.toLowerCase() === norm)
  );
}

export function getServiceBySlug(
  serviceSlug?: string,
  config: SectorConfig = marineSector
): ServiceEntity | undefined {
  if (!serviceSlug) return undefined;
  const norm = String(serviceSlug).toLowerCase();
  for (const company of config?.network?.companies ?? []) {
    const found = getCompanyServiceBySlug(company, norm);
    if (found) return found;
  }
  return undefined;
}

/* ------------------------------------------------------------
   Async Firestore-backed Accessors for Cloud Sync
   ------------------------------------------------------------ */

export async function listSectorCitiesAsync(): Promise<SectorCity[]> {
  try {
    const { listSectorCities } = await import("@/services/sectorService");
    const live = await listSectorCities();
    if (live && live.length > 0) return live;
  } catch (err) {
    console.warn("[Registry] Firestore listSectorCitiesAsync fallback:", err);
  }
  return getCities(marineSector);
}

export async function listIndustryDomainsAsync(): Promise<IndustryDomainEntity[]> {
  try {
    const { listIndustryDomains } = await import("@/services/sectorService");
    const live = await listIndustryDomains();
    if (live && live.length > 0) return live as unknown as IndustryDomainEntity[];
  } catch (err) {
    console.warn("[Registry] Firestore listIndustryDomainsAsync fallback:", err);
  }
  return getMarineDomains();
}

export async function getCityBySlugAsync(slug: string): Promise<SectorCity | undefined> {
  try {
    const { getSectorCityById } = await import("@/services/sectorService");
    const live = await getSectorCityById(slug);
    if (live) return live;
  } catch (err) {
    console.warn("[Registry] Firestore getCityBySlugAsync fallback:", err);
  }
  return getCityBySlug(marineSector, slug);
}

