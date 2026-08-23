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
import { marineDomains } from "@/lib/sectors/marine-domains";
import { getCompanyRecordSync, findAllCompaniesSync } from "@/lib/repositories/companyRepository";
import { resolveMarineWorldCompanyDigitalId } from "@/lib/services/companyIdentityService";
import { buildCanonicalOfferingUrl, initializeCanonicalOfferingDefaults } from "@/lib/services/offeringEntityService";
export { buildCanonicalOfferingUrl, initializeCanonicalOfferingDefaults };

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

export function getCities(config: SectorConfig): SectorCity[] {
  return config.explorer.cities;
}

export function getCompanies(config: SectorConfig): CompanyProfile[] {
  return config.network.companies;
}

/* ------------------------------------------------------------
   Industry Domain accessors
   ------------------------------------------------------------ */

export function getMarineDomains(): IndustryDomainEntity[] {
  return marineDomains;
}

export function getIndustryDomainBySlug(slug: string): IndustryDomainEntity | undefined {
  if (!slug || typeof slug !== "string") return undefined;
  const norm = slug.toLowerCase();
  return marineDomains.find((d) => (d?.slug && d.slug.toLowerCase() === norm) || (d?.id && d.id.toLowerCase() === norm));
}

export function getIndustryDomainById(id: string): IndustryDomainEntity | undefined {
  return marineDomains.find((d) => d?.id === id);
}

export function getCitiesByDomain(config: SectorConfig, domainSlugOrId: string): SectorCity[] {
  const domain = getIndustryDomainBySlug(domainSlugOrId) ?? getIndustryDomainById(domainSlugOrId);
  if (!domain) return [];
  return (config?.explorer?.cities || [])
    .filter((c) => c?.industryDomainId === domain.id)
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

  return matched;
}

export function getCompanyBySlug(config: SectorConfig, companySlug?: string): CompanyProfile | undefined {
  if (!companySlug || typeof companySlug !== "string") {
    // Return first company as safe default if no slug provided
    return config?.network?.companies?.[0];
  }
  const norm = companySlug.toLowerCase();
  const base = config?.network?.companies?.find((c) => {
    if (!c) return false;
    return (
      (c.slug && c.slug.toLowerCase() === norm) ||
      (c.id && c.id.toLowerCase() === norm) ||
      (c.name && c.name.toLowerCase().replace(/[^a-z0-9]/g, "-") === norm)
    );
  });

  const dynamicRecord = getCompanyRecordSync(norm) || (base ? getCompanyRecordSync(base.id) : undefined);
  if (!dynamicRecord && !base) return undefined;
  if (!dynamicRecord) return base;

  const isVerified = (dynamicRecord.verificationStatus as string)?.toUpperCase() === "VERIFIED";
  const finalCity = (dynamicRecord as any).headquartersCity || dynamicRecord.city || base?.city || "Rotterdam";
  const finalCountry = dynamicRecord.country || base?.country || "Netherlands";

  const companyId6Digit =
    (dynamicRecord as any).companyId6Digit ||
    (base as any)?.companyId6Digit ||
    (dynamicRecord.businessId?.match(/\d{6}/)?.[0]) ||
    "100001";

  const primarySectorCategory =
    (dynamicRecord as any).primarySectorCategory ||
    dynamicRecord.industry ||
    (base as any)?.primarySectorCategory ||
    base?.industry ||
    "Marine Services";

  const secondarySectorCategories =
    (dynamicRecord as any).secondarySectorCategories ||
    (base as any)?.secondarySectorCategories ||
    ["Marine Equipment", "Logistics"];

  const regionalEditions =
    (dynamicRecord as any).regionalEditions ||
    (base as any)?.regionalEditions ||
    [(dynamicRecord as any).region || base?.region || "MEDITERRANEAN"];

  const sectorCityIds =
    dynamicRecord.sectorCityIds ||
    (dynamicRecord as any).cityIds ||
    base?.cityIds ||
    ["supplychain"];

  const digitalIdInfo = resolveMarineWorldCompanyDigitalId({
    companyIdOrSlug: dynamicRecord.id || base?.id || norm,
    mwCompanyDigitalId: (dynamicRecord as any).mwCompanyDigitalId || (base as any)?.mwCompanyDigitalId,
    businessId: dynamicRecord.businessId || (base as any)?.businessId,
    companyId6Digit: (dynamicRecord as any).companyId6Digit || (base as any)?.companyId6Digit,
    primaryRegistryCode: (dynamicRecord as any).primaryRegistryCode || (base as any)?.primaryRegistryCode,
    primarySectorCityId: (dynamicRecord as any).primarySectorCityId || sectorCityIds[0],
  });

  return {
    id: dynamicRecord.id || base?.id || norm,
    slug: dynamicRecord.slug || base?.slug || norm,
    name: dynamicRecord.displayName || dynamicRecord.legalName || base?.name || "Company",
    displayName: dynamicRecord.displayName || base?.displayName || base?.name || "Company",
    initials: base?.initials || (dynamicRecord.displayName || dynamicRecord.legalName || "MW").slice(0, 2).toUpperCase(),
    recordType: base?.recordType || "PUBLIC_REGISTRY",
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
    website: dynamicRecord.websiteUrl || dynamicRecord.website || base?.website,
    status: base?.status || "LIVE",
    verificationStatus: isVerified ? "verified" : "review",
    capabilities: (dynamicRecord as any).capabilities || base?.capabilities || ["Maritime Operations"],
    products: dynamicRecord.products || base?.products,
    services: dynamicRecord.services || base?.services,
    offerings: (dynamicRecord.offerings || base?.offerings)?.map((off) =>
      initializeCanonicalOfferingDefaults(off, {
        id: dynamicRecord.id || base?.id || norm,
        slug: dynamicRecord.slug || base?.slug || norm,
        sectorCityIds,
        cityIds: sectorCityIds,
      } as any)
    ),
    aiStatus: base?.aiStatus || "ready",
    businessTwinStatus: base?.businessTwinStatus || "AVAILABLE",
    shortDescription: dynamicRecord.shortDescription || base?.shortDescription,
    description: (dynamicRecord as any).corporateDescription || dynamicRecord.description || base?.description,
    corporateDescription: (dynamicRecord as any).corporateDescription || dynamicRecord.description || base?.description,
    coverImage: (dynamicRecord as any).coverImage || dynamicRecord.logoUrl || dynamicRecord.heroImage || base?.coverImage,
    logoUrl: (dynamicRecord as any).coverImage || dynamicRecord.logoUrl || dynamicRecord.heroImage || base?.coverImage,
    productsList: dynamicRecord.productsList || base?.productsList,
    servicesList: dynamicRecord.servicesList || base?.servicesList,
    legalName: dynamicRecord.legalName || base?.legalName,
    tradingName: dynamicRecord.brandName || (dynamicRecord as any).tradingName || base?.tradingName,
    businessId: digitalIdInfo.mwCompanyDigitalId,
    mwCompanyDigitalId: digitalIdInfo.mwCompanyDigitalId,
    primaryRegistryCode: digitalIdInfo.primaryRegistryCode,
    primaryRegistryNode: digitalIdInfo.primaryRegistryNode,
    companyId6Digit: digitalIdInfo.companyId6Digit,
    organizationType: dynamicRecord.organizationType || base?.organizationType,
    registrationNumber: (dynamicRecord as any).registrationNumber || base?.registrationNumber,
    foundedYear: (dynamicRecord as any).foundedYear ? String((dynamicRecord as any).foundedYear) : base?.foundedYear,
    officialEmail: dynamicRecord.officialEmail || dynamicRecord.email || base?.officialEmail,
    officialPhone: dynamicRecord.officialPhone || dynamicRecord.phone || base?.officialPhone,
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
