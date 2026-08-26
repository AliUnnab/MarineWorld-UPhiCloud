import type { SectorConfig, CompanyProfile, SectorCity } from "@/lib/types";
import { getCompaniesInCity, getCompanyProducts, getCompanyServices, getCompanyBySlug, formatCompactLocation } from "@/lib/registry";
import { getActivePublications } from "@/lib/services/propertyGovernanceService";
import { getCommercialProperty, getAllCommercialInventory, getCompanyCommercialHoldings } from "@/lib/services/commercialPropertyService";
import { CANONICAL_CITY_REGIONS, type CanonicalCityRegion } from "@/lib/constants/regions";

export { CANONICAL_CITY_REGIONS, type CanonicalCityRegion };

export interface CityRegionEdition {
  id: string;
  cityId: string;
  regionCode: string;
  slug: string;
  name: string;
  leadCopy: string;
  heroImage?: string;
  heroAtmosphere: {
    bgGradient: string;
    badgeBg: string;
    accentBorder: string;
    tagline: string;
    featuredHubs: string[];
  };
}

export interface CountryPavilion {
  id: string;
  countryCode: string;
  countryName: string;
  flagEmoji: string;
  subtitle: string;
  heroImage: string;
  featuredHub: string;
  featuredCompany: CompanyProfile | null;
  capabilities: string[];
  ctaLabel: string;
  ctaHref: string;
}

export type PropertySlotState = "AVAILABLE" | "RESERVED" | "PUBLISHED";

export interface DigitalPropertySlot {
  slotId: string;
  slotCode: string;
  tier: "LANDMARK" | "FLAGSHIP" | "PAVILION" | "PRESENCE";
  tierName: string;
  state: PropertySlotState;
  locationName: string;
  projection?: DigitalPropertyProjection | null;
  company?: CompanyProfile | null;
}

export interface DigitalPropertyProjection {
  id: string;
  cityId: string;
  regionCode: string;
  tier: "LANDMARK" | "FLAGSHIP" | "PRESENCE";
  slotCode: string;
  companyId: string;
  companyName: string;
  companyLegalName?: string;
  companyLogo?: string;
  companyCountry?: string;
  companyCity?: string;
  companyRegion: string;
  companyIndustry?: string;
  verificationStatus: "VERIFIED" | "PENDING" | "UNVERIFIED";
  isFoundingMember?: boolean;
  creative: {
    headline: string;
    subheadline: string;
    tagline?: string;
    mediaUrl?: string;
    ctaLabel: string;
    ctaHref: string;
    featuredOfferingName?: string;
    featuredOfferingType?: "PRODUCT" | "SERVICE";
    featuredOfferingHref?: string;
  };
}

export function getAvailableCityRegions(
  config: SectorConfig,
  cityId: string
): typeof CANONICAL_CITY_REGIONS {
  const normCityId = (cityId || "").toLowerCase();
  const activeRevisions = getActivePublications().filter(
    (r) => r.cityId?.toLowerCase() === normCityId && r.status === "PUBLISHED"
  );

  const activeRegionCodes = new Set<string>();

  // 1. Check all published property revisions for this city (PUBLIC REGION ACTIVATION ONLY)
  activeRevisions.forEach((rev) => {
    if (rev.regionCode) {
      activeRegionCodes.add(rev.regionCode.toUpperCase());
    }
  });

  // Filter canonical regions in standard order
  const matched = CANONICAL_CITY_REGIONS.filter((r) => activeRegionCodes.has(r.code));
  return matched.length > 0 ? matched : [CANONICAL_CITY_REGIONS[0]];
}

export function resolveRegionEdition(cityId: string, regionSlug?: string): CityRegionEdition {
  const normSlug = (regionSlug || "global").toLowerCase().trim();
  const matched =
    CANONICAL_CITY_REGIONS.find(
      (r) =>
        r.slug === normSlug ||
        r.code.toLowerCase() === normSlug ||
        r.slug.replace("-", "") === normSlug.replace("-", "")
    ) || CANONICAL_CITY_REGIONS[0];

  return {
    id: `${cityId}-${matched.slug}`,
    cityId,
    regionCode: matched.code,
    slug: matched.slug,
    name: matched.name,
    leadCopy: matched.leadCopy,
    heroImage: matched.heroImage,
    heroAtmosphere: {
      bgGradient: matched.bgGradient,
      badgeBg: matched.badgeBg,
      accentBorder: matched.accentBorder,
      tagline: matched.tagline,
      featuredHubs: matched.featuredHubs,
    },
  };
}

export function getPublicPropertyProjections(
  config: SectorConfig,
  cityId: string,
  regionCode: string
): {
  landmark: DigitalPropertyProjection | null;
  flagships: DigitalPropertyProjection[];
  presence: CompanyProfile[];
  isLowInventory: boolean;
  foundingMembers: CompanyProfile[];
} {
  const normRegion = regionCode.toUpperCase();
  const normCityId = cityId.toLowerCase();
  
  const allCityCompanies = getCompaniesInCity(config, normCityId);
  const regionalCompanies = allCityCompanies.filter((c) => {
    if (normRegion === "GLOBAL") return true;
    const cReg = (c.region || "").toUpperCase();
    const cCountry = (c.country || "").toUpperCase();
    if (normRegion === "MEDITERRANEAN" && (cReg.includes("MED") || cCountry.includes("TÜRK") || cCountry.includes("TURK") || cCountry.includes("SPAIN") || cCountry.includes("GREECE") || cCountry.includes("ITALY") || cCountry.includes("MONACO") || cCountry.includes("FRANCE"))) return true;
    if (normRegion === "WESTERN_EUROPE" && (cReg.includes("WEST") || cCountry.includes("NETHERLANDS") || cCountry.includes("UNITED KINGDOM") || cCountry.includes("GERMANY") || cCountry.includes("FRANCE") || cCountry.includes("BELGIUM"))) return true;
    if (normRegion === "NORTHERN_EUROPE" && (cReg.includes("NORTH") || cReg.includes("NORDIC") || cCountry.includes("NORWAY") || cCountry.includes("SWEDEN") || cCountry.includes("DENMARK") || cCountry.includes("FINLAND") || cCountry.includes("NETHERLANDS"))) return true;
    if (normRegion === "NORTH_AMERICA" && (cReg.includes("AMERICA") || cReg.includes("USA") || cCountry.includes("USA") || cCountry.includes("UNITED STATES") || cCountry.includes("CANADA"))) return true;
    if (normRegion === "ASIA_PACIFIC" && (cReg.includes("ASIA") || cReg.includes("PACIFIC") || cCountry.includes("SINGAPORE") || cCountry.includes("JAPAN") || cCountry.includes("AUSTRALIA"))) return true;
    if (normRegion === "CARIBBEAN" && (cReg.includes("CARIB") || cCountry.includes("BAHAMAS") || cCountry.includes("CAYMAN"))) return true;
    if (normRegion === "MIDDLE_EAST" && (cReg.includes("MIDDLE") || cReg.includes("GULF") || cCountry.includes("UAE") || cCountry.includes("SAUDI") || cCountry.includes("QATAR"))) return true;
    return cReg.includes(normRegion);
  });
  
  // Strict regional isolation: no cross-region fallback
  const presence = normRegion === "GLOBAL" ? allCityCompanies : regionalCompanies;
  const isLowInventory = presence.length <= 5;
  const foundingMembers = [...allCityCompanies];

  // Map Governance Publications to Projections
  const allRegionRevisions = getActivePublications().filter(
    (rev) => rev.regionCode?.toUpperCase() === normRegion && rev.status === "PUBLISHED"
  );
  const citySpecificRevisions = allRegionRevisions.filter(
    (rev) => rev.cityId?.toLowerCase() === normCityId
  );
  const activeRevisions =
    citySpecificRevisions.length > 0 ? citySpecificRevisions : allRegionRevisions;
  
  let landmarkProjection: DigitalPropertyProjection | null = null;
  const activeFlagships: DigitalPropertyProjection[] = [];
  
  activeRevisions.forEach(rev => {
    // Check commercial entitlement policy: Commercial ACTIVE + Governance PUBLISHED = PUBLIC
    const commProp = getCommercialProperty(rev.cityId, rev.regionCode, rev.slotId);
    if (commProp && commProp.commercialStatus !== "ACTIVE" && commProp.commercialStatus !== "RESERVED") {
      // Excluded from public projection due to expired, suspended, or un-activated commercial agreement
      return;
    }

    // using allCityCompanies first for speed, fallback to registry
    const comp = allCityCompanies.find(c => c.id === rev.companyId || c.slug === rev.companyId) || getCompanyBySlug(config, rev.companyId);
    if (!comp) return; // Tenant isolation and missing company guard
    
    const projection: DigitalPropertyProjection = {
      id: `proj-${rev.revisionId}`,
      cityId,
      regionCode: normRegion,
      tier: rev.tier as any,
      slotCode: rev.slotId,
      companyId: comp.id,
      companyName: comp.displayName || comp.legalName || comp.name,
      companyLegalName: comp.legalName,
      companyLogo: comp.coverImage,
      companyCountry: comp.country,
      companyCity: comp.city,
      companyRegion: formatCompactLocation(comp.country, comp.city || comp.location) || comp.region || "Global",
      companyIndustry: comp.industry || "Marine Services",
      verificationStatus: (comp.verificationStatus as string)?.toUpperCase() === "VERIFIED" ? "VERIFIED" : "UNVERIFIED",
      isFoundingMember: true,
      creative: {
        headline: rev.creative.headline || "",
        subheadline: rev.creative.subheadline || "",
        tagline: rev.creative.description || "",
        mediaUrl: rev.creative.mediaUrl,
        ctaLabel: rev.creative.ctaLabel || "EXPLORE SHOWROOM",
        ctaHref: rev.creative.ctaHref || `/companies/${comp.slug || comp.id}`,
        featuredOfferingName: rev.creative.featuredOfferingName,
        featuredOfferingType: rev.creative.featuredOfferingType,
      },
    };
    
    if (rev.tier === "LANDMARK" && !landmarkProjection) {
      landmarkProjection = projection;
    } else if (rev.tier === "FLAGSHIP") {
      activeFlagships.push(projection);
    }
  });

  // Pad flagships with empties to maintain UI grid layout if fewer than 4 are published
  const flagships = [...activeFlagships];
  while (flagships.length < 4) {
    const idx = flagships.length;
    flagships.push({
      id: `empty-flagship-${cityId}-${idx}`,
      cityId,
      regionCode: normRegion,
      tier: "FLAGSHIP",
      slotCode: `${cityId.toUpperCase()}-${normRegion.slice(0, 3)}-FS-0${idx + 1}`,
      companyId: "",
      companyName: "",
      companyRegion: "",
      verificationStatus: "UNVERIFIED",
      creative: { headline: "", subheadline: "", ctaLabel: "", ctaHref: "" }
    });
  }

  return {
    landmark: landmarkProjection,
    flagships,
    presence,
    isLowInventory,
    foundingMembers
  };
}

export function getCityPropertyInventory(
  config: SectorConfig,
  cityId: string,
  regionCode: string
): {
  landmarkSlot: DigitalPropertySlot;
  flagshipSlots: DigitalPropertySlot[];
  presenceSlots: DigitalPropertySlot[];
} {
  const normRegion = regionCode.toUpperCase();
  const regShort = normRegion.slice(0, 3);
  const cityCode = cityId.toUpperCase().replace(/[^A-Z0-9]/g, "");

  const projections = getPublicPropertyProjections(config, cityId, regionCode);

  // 1. LANDMARK SLOT
  const landmarkSlot: DigitalPropertySlot = {
    slotId: `slot-lm-${cityId}-${normRegion.toLowerCase()}`,
    slotCode: `${cityCode}-${regShort}-LM-01`,
    tier: "LANDMARK",
    tierName: "CITY LANDMARK",
    state: projections.landmark ? "PUBLISHED" : "AVAILABLE",
    locationName: `Prime Waterfront District · ${normRegion}`,
    projection: projections.landmark,
  };

  // 2. FLAGSHIP SHOWROOM SLOTS (6 total slots)
  const flagshipSlots: DigitalPropertySlot[] = Array.from({ length: 6 }).map((_, idx) => {
    const slotCode = `${cityCode}-${regShort}-FS-0${idx + 1}`;
    const matchedProjection = projections.flagships[idx];

    if (matchedProjection && matchedProjection.companyName) {
      return {
        slotId: `slot-fs-${cityId}-${normRegion.toLowerCase()}-${idx + 1}`,
        slotCode,
        tier: "FLAGSHIP",
        tierName: "FLAGSHIP SHOWROOM",
        state: "PUBLISHED",
        locationName: `Showroom Boulevard Slot ${idx + 1}`,
        projection: matchedProjection,
      };
    }

    return {
      slotId: `slot-fs-${cityId}-${normRegion.toLowerCase()}-${idx + 1}`,
      slotCode,
      tier: "FLAGSHIP",
      tierName: "FLAGSHIP SHOWROOM",
      state: "AVAILABLE",
      locationName: `Showroom District · Space ${idx + 1}`,
      projection: null,
    };
  });

  // 3. BUSINESS PRESENCE SLOTS (8 total slots)
  const presenceCompanies = projections.presence;
  const presenceSlots: DigitalPropertySlot[] = Array.from({ length: 8 }).map((_, idx) => {
    const slotCode = `${cityCode}-${regShort}-BP-0${idx + 1}`;
    const matchedCompany = presenceCompanies[idx];

    if (matchedCompany) {
      return {
        slotId: `slot-bp-${cityId}-${normRegion.toLowerCase()}-${idx + 1}`,
        slotCode,
        tier: "PRESENCE",
        tierName: "BUSINESS PRESENCE",
        state: "PUBLISHED",
        locationName: `Commercial Hub Sector ${idx + 1}`,
        company: matchedCompany,
      };
    }

    return {
      slotId: `slot-bp-${cityId}-${normRegion.toLowerCase()}-${idx + 1}`,
      slotCode,
      tier: "PRESENCE",
      tierName: "BUSINESS PRESENCE",
      state: "AVAILABLE",
      locationName: `Commercial Space ${idx + 1}`,
      company: null,
    };
  });

  return {
    landmarkSlot,
    flagshipSlots,
    presenceSlots,
  };
}

export function getCountryPavilions(
  config: SectorConfig,
  cityId: string,
  regionCode: string
): CountryPavilion[] {
  const allCompanies = getCompaniesInCity(config, cityId);

  const canonicalPavilionsData = [
    {
      countryCode: "MC",
      countryName: "MONACO PAVILION",
      flagEmoji: "🇲🇨",
      subtitle: "Riviera Yachting Capital & Superyacht Registry",
      heroImage: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80",
      featuredHub: "Port Hercules, Monaco",
      capabilities: ["Superyacht Charter", "Berth Reservations", "VIP Concierge", "Class Surveys"],
    },
    {
      countryCode: "US",
      countryName: "USA PAVILION",
      flagEmoji: "🇺🇸",
      subtitle: "Atlantic Superyacht Corridor & Gulf Fleet Logistics",
      heroImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
      featuredHub: "Fort Lauderdale, FL",
      capabilities: ["Transatlantic Refit", "USCG Compliance", "Workboat Fleets", "Naval Engineering"],
    },
    {
      countryCode: "IT",
      countryName: "ITALY PAVILION",
      flagEmoji: "🇮🇹",
      subtitle: "Tyrrhenian Refit Hubs & Superyacht Design Excellence",
      heroImage: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80",
      featuredHub: "Viareggio & Genoa",
      capabilities: ["Custom Shipyard Build", "Luxury Interior Craft", "RINA Surveys", "High-Speed Hull Design"],
    },
    {
      countryCode: "DE",
      countryName: "GERMANY PAVILION",
      flagEmoji: "🇩🇪",
      subtitle: "Naval Architecture & Deepwater Terminal Operations",
      heroImage: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
      featuredHub: "Hamburg & Bremen",
      capabilities: ["Deepwater Logistics", "Autonomous Navigation", "DNV Certification", "Turbine Supply"],
    },
    {
      countryCode: "TR",
      countryName: "TÜRKIYE PAVILION",
      flagEmoji: "🇹🇷",
      subtitle: "Aegean Charter Fleets & Gulet Shipyards",
      heroImage: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80",
      featuredHub: "Bodrum & Antalya",
      capabilities: ["Wooden Gulet Construction", "Aegean Cruising", "Refit Facilities", "Charter Management"],
    },
  ];

  return canonicalPavilionsData.map((p, idx) => {
    const matchedCompany =
      allCompanies.find(
        (c) =>
          c.country?.toLowerCase() === p.countryName.toLowerCase() ||
          c.location?.toLowerCase().includes(p.featuredHub.split(",")[0].toLowerCase())
      ) ||
      allCompanies[idx % allCompanies.length] ||
      null;

    return {
      id: `pavilion-${p.countryCode.toLowerCase()}-${cityId}`,
      countryCode: p.countryCode,
      countryName: p.countryName,
      flagEmoji: p.flagEmoji,
      subtitle: p.subtitle,
      heroImage: p.heroImage,
      featuredHub: p.featuredHub,
      featuredCompany: matchedCompany,
      capabilities: matchedCompany?.capabilities || p.capabilities,
      ctaLabel: "EXPLORE PAVILION",
      ctaHref: matchedCompany ? `/companies/${matchedCompany.slug || matchedCompany.id}` : `/cities/${cityId}`,
    };
  });
}

export interface CityAnchorCredential {
  company: CompanyProfile;
  city: SectorCity;
  formattedCityDomain: string; // e.g. "SUPPLYCHAIN.CITY"
  regionCode?: string;
  regionName?: string;
  propertyName?: string;
  slotCode?: string;
}

/**
 * Surface the Landmark Anchor company for a single sector city.
 * Reads directly from the real property & commercial inventory single source of truth.
 * Returns null if the Landmark position is unsold/available.
 */
export function getCityAnchor(
  config: SectorConfig,
  cityIdOrSlug?: string | null
): CityAnchorCredential | null {
  if (!cityIdOrSlug || cityIdOrSlug.toLowerCase() === "all") return null;

  const cleanCityId = cityIdOrSlug.toLowerCase().replace(/\.city$/i, "");
  const city = config.explorer.cities.find(
    (c) =>
      c.slug.toLowerCase() === cleanCityId ||
      c.id.toLowerCase() === cleanCityId ||
      c.domain.toLowerCase() === cleanCityId
  );
  if (!city) return null;

  const formattedCityDomain = city.domain.toUpperCase().endsWith(".CITY")
    ? city.domain.toUpperCase()
    : `${city.domain.toUpperCase()}.CITY`;

  // 1. Check all commercial inventory with tier LANDMARK for this city
  try {
    const allInventory = getAllCommercialInventory({ cityId: city.id, tier: "LANDMARK" });
    const activeHolding = allInventory.find(
      (p) =>
        (p.commercialStatus === "ACTIVE" || p.availabilityStatus === "ACTIVE" || p.commercialStatus === "RESERVED") &&
        p.tenantCompanyId
    );

    if (activeHolding && activeHolding.tenantCompanyId) {
      const comp = getCompanyBySlug(config, activeHolding.tenantCompanyId);
      if (comp) {
        return {
          company: comp,
          city,
          formattedCityDomain,
          regionCode: activeHolding.regionCode,
          propertyName: activeHolding.propertyName,
          slotCode: activeHolding.slotId,
        };
      }
    }
  } catch (e) {
    // safe fallback
  }

  // 2. Check active governance publications for tier LANDMARK
  try {
    const activePubs = getActivePublications().filter(
      (p) =>
        p.cityId?.toLowerCase() === city.id.toLowerCase() &&
        p.tier === "LANDMARK" &&
        p.status === "PUBLISHED" &&
        p.companyId
    );

    if (activePubs.length > 0) {
      const firstPub = activePubs[0];
      const comp = getCompanyBySlug(config, firstPub.companyId);
      if (comp) {
        return {
          company: comp,
          city,
          formattedCityDomain,
          regionCode: firstPub.regionCode,
          propertyName: firstPub.creative?.headline,
          slotCode: firstPub.slotId,
        };
      }
    }
  } catch (e) {
    // safe fallback
  }

  // 3. Check regional property projections
  try {
    const availableRegions = getAvailableCityRegions(config, city.id);
    for (const reg of availableRegions) {
      const proj = getPublicPropertyProjections(config, city.id, reg.code);
      if (proj.landmark && proj.landmark.companyId) {
        const comp = getCompanyBySlug(config, proj.landmark.companyId);
        if (comp) {
          return {
            company: comp,
            city,
            formattedCityDomain,
            regionCode: reg.code,
            regionName: reg.name,
            propertyName: proj.landmark.creative?.headline,
            slotCode: proj.landmark.slotCode,
          };
        }
      }
    }
  } catch (e) {
    // safe fallback
  }

  return null;
}

/**
 * Universal helper to determine whether an entity holds Landmark Anchor Status.
 * Real, exclusive civic-registry credential recognized across all platform views.
 */
export function isCompanyAnchor(
  company?: Partial<CompanyProfile> | null
): boolean {
  if (!company) return false;
  if (company.isAnchor === true) return true;
  if ((company as any).tier === "LANDMARK") return true;

  const targetId = (company.id || (company as any).slug || "").toLowerCase();
  const targetSlug = ((company as any).slug || company.id || "").toLowerCase();

  // 1. Check direct commercial holdings for active landmark placement
  try {
    const holdings = getCompanyCommercialHoldings(company.id || (company as any).slug || "");
    const hasActiveLandmarkHolding = holdings.some(
      (h) =>
        h.tier === "LANDMARK" &&
        (h.commercialStatus === "ACTIVE" || h.availabilityStatus === "ACTIVE" || h.commercialStatus === "RESERVED")
    );
    if (hasActiveLandmarkHolding) return true;
  } catch (e) {
    // safe fallback
  }

  // 2. Check active governance publications for published landmark revision
  try {
    const pubs = getActivePublications();
    const hasActiveLandmarkPub = pubs.some(
      (p) =>
        p.tier === "LANDMARK" &&
        p.status === "PUBLISHED" &&
        (p.companyId?.toLowerCase() === targetId || p.companyId?.toLowerCase() === targetSlug)
    );
    if (hasActiveLandmarkPub) return true;
  } catch (e) {
    // safe fallback
  }

  return false;
}

