import type { DomainEntity } from "@/lib/types";

/**
 * Stage 10.3 — Domain Resolution Service
 * Handles hostname normalization, canonical domain lookup, and collision detection.
 */

export interface DomainResolutionResult {
  domainEntity: DomainEntity | null;
  error?:
    | "DOMAIN_NOT_FOUND"
    | "DOMAIN_INACTIVE"
    | "INVALID_HOSTNAME"
    | "DOMAIN_COLLISION"
    | "UNRESOLVED_IDENTITY";
}

/**
 * Normalizes an incoming raw hostname string.
 * Rules:
 * - lowercase
 * - remove http:// and https://
 * - remove trailing slashes and paths
 * - remove port numbers (:3000, :5173, etc.)
 * - trim whitespace
 */
export function normalizeHostname(hostname: string): string {
  if (!hostname || typeof hostname !== "string") return "";
  let clean = hostname.trim().toLowerCase();

  // Remove protocol
  clean = clean.replace(/^https?:\/\//, "");

  // Remove path / query / hash
  const slashIdx = clean.indexOf("/");
  if (slashIdx !== -1) {
    clean = clean.substring(0, slashIdx);
  }

  // Remove port
  const portIdx = clean.indexOf(":");
  if (portIdx !== -1) {
    clean = clean.substring(0, portIdx);
  }

  return clean.trim();
}

/** Pre-seeded canonical domain registry containing all live MarineWorld domains */
const INITIAL_DOMAIN_REGISTRY: DomainEntity[] = [
  // Platform Domains
  {
    id: "dom-platform-marineworld",
    entityType: "PLATFORM",
    entityId: "marineworld",
    hostname: "marineworld.city",
    url: "https://marineworld.city/",
    isCanonical: true,
    isActive: true,
  },
  {
    id: "dom-platform-marineworld-www",
    entityType: "PLATFORM",
    entityId: "marineworld",
    hostname: "www.marineworld.city",
    url: "https://marineworld.city/",
    isCanonical: false,
    isActive: true,
  },
  {
    id: "dom-platform-constructionworld",
    entityType: "PLATFORM",
    entityId: "constructionworld",
    hostname: "constructionworld.city",
    url: "https://constructionworld.city/",
    isCanonical: true,
    isActive: true,
  },

  // Sector City Domains (25 Predefined Hubs)
  ...[
    "marinecommerce",
    "procurement",
    "supplychain",
    "yachtsales",
    "shipyard",
    "boatbuilding",
    "engineering",
    "charter",
    "marina",
    "port",
    "fleetmanagement",
    "marineai",
    "digitaltwin",
    "marinedata",
    "autonomousvessel",
    "marinecybersecurity",
    "yachtfinance",
    "insuranceops",
    "marinelegal",
    "offshore",
    "subsea",
    "marinelifestyle",
    "marinehospitality",
    "brokerage",
    "propulsion",
  ].flatMap((citySlug) => [
    {
      id: `dom-city-${citySlug}-subdomain`,
      entityType: "SECTOR_CITY" as const,
      entityId: citySlug,
      hostname: `${citySlug}.city.marineworld.city`,
      url: `https://${citySlug}.city.marineworld.city/`,
      isCanonical: true,
      isActive: true,
    },
    {
      id: `dom-city-${citySlug}-short`,
      entityType: "SECTOR_CITY" as const,
      entityId: citySlug,
      hostname: `${citySlug}.city`,
      url: `https://${citySlug}.city/`,
      isCanonical: false,
      isActive: true,
    },
  ]),

  // Company Platform & Custom Domains
  {
    id: "dom-comp-crest-group-platform",
    entityType: "COMPANY",
    entityId: "crest-group-materials",
    hostname: "crest-group-materials.marineworld.city",
    url: "https://crest-group-materials.marineworld.city/",
    isCanonical: true,
    isActive: true,
  },
  {
    id: "dom-comp-crest-group-custom",
    entityType: "COMPANY",
    entityId: "crest-group-materials",
    hostname: "crestgroupmaterials.com",
    url: "https://crestgroupmaterials.com/",
    isCanonical: false,
    isActive: true,
  },
  {
    id: "dom-comp-aster-platform",
    entityType: "COMPANY",
    entityId: "aster",
    hostname: "aster-maritime-engineering.marineworld.city",
    url: "https://aster-maritime-engineering.marineworld.city/",
    isCanonical: true,
    isActive: true,
  },
  {
    id: "dom-comp-aster-short",
    entityType: "COMPANY",
    entityId: "aster",
    hostname: "aster.marineworld.city",
    url: "https://aster.marineworld.city/",
    isCanonical: false,
    isActive: true,
  },
  {
    id: "dom-comp-aster-custom",
    entityType: "COMPANY",
    entityId: "aster",
    hostname: "astermaritime.nl",
    url: "https://astermaritime.nl/",
    isCanonical: false,
    isActive: true,
  },
  {
    id: "dom-comp-blueharbour-platform",
    entityType: "COMPANY",
    entityId: "blueharbour",
    hostname: "blueharbour-shipyards.marineworld.city",
    url: "https://blueharbour-shipyards.marineworld.city/",
    isCanonical: true,
    isActive: true,
  },
  {
    id: "dom-comp-meridian-platform",
    entityType: "COMPANY",
    entityId: "meridian",
    hostname: "meridian-charter-group.marineworld.city",
    url: "https://meridian-charter-group.marineworld.city/",
    isCanonical: true,
    isActive: true,
  },
  {
    id: "dom-comp-nordlys-platform",
    entityType: "COMPANY",
    entityId: "nordlys",
    hostname: "nordlys-subsea-systems.marineworld.city",
    url: "https://nordlys-subsea-systems.marineworld.city/",
    isCanonical: true,
    isActive: true,
  },
  {
    id: "dom-comp-adriatic-platform",
    entityType: "COMPANY",
    entityId: "adriatic",
    hostname: "adriatic-terminal-operations.marineworld.city",
    url: "https://adriatic-terminal-operations.marineworld.city/",
    isCanonical: true,
    isActive: true,
  },
  {
    id: "dom-comp-kallisto-platform",
    entityType: "COMPANY",
    entityId: "kallisto",
    hostname: "kallisto-marine-capital.marineworld.city",
    url: "https://kallisto-marine-capital.marineworld.city/",
    isCanonical: true,
    isActive: true,
  },
  {
    id: "dom-comp-vanguard-platform",
    entityType: "COMPANY",
    entityId: "vanguard-naval-architects",
    hostname: "vanguard-naval-architects.marineworld.city",
    url: "https://vanguard-naval-architects.marineworld.city/",
    isCanonical: true,
    isActive: true,
  },
  {
    id: "dom-comp-vanguard-custom",
    entityType: "COMPANY",
    entityId: "vanguard-naval-architects",
    hostname: "vanguardnaval.com",
    url: "https://vanguardnaval.com/",
    isCanonical: false,
    isActive: true,
  },
  {
    id: "dom-comp-oceanic-platform",
    entityType: "COMPANY",
    entityId: "oceanic-subsea-systems",
    hostname: "oceanic-subsea-systems.marineworld.city",
    url: "https://oceanic-subsea-systems.marineworld.city/",
    isCanonical: true,
    isActive: true,
  },
  {
    id: "dom-comp-oceanic-custom",
    entityType: "COMPANY",
    entityId: "oceanic-subsea-systems",
    hostname: "oceanicsubsea.com",
    url: "https://oceanicsubsea.com/",
    isCanonical: false,
    isActive: true,
  },
  {
    id: "dom-comp-argento-platform",
    entityType: "COMPANY",
    entityId: "argento-marine",
    hostname: "argentomarine.marineworld.city",
    url: "https://argentomarine.marineworld.city/",
    isCanonical: true,
    isActive: true,
  },
  {
    id: "dom-comp-argento-platform-alt",
    entityType: "COMPANY",
    entityId: "argento-marine",
    hostname: "argento-marine.marineworld.city",
    url: "https://argento-marine.marineworld.city/",
    isCanonical: false,
    isActive: true,
  },
  {
    id: "dom-comp-argento-custom",
    entityType: "COMPANY",
    entityId: "argento-marine",
    hostname: "argentomarine.com",
    url: "https://argentomarine.com/",
    isCanonical: false,
    isActive: true,
  },
];

let registeredDomains: DomainEntity[] = [...INITIAL_DOMAIN_REGISTRY];

export function getAllDomains(): DomainEntity[] {
  return [...registeredDomains];
}

export function registerDomain(domain: DomainEntity): void {
  const normalized = normalizeHostname(domain.hostname);
  const existing = registeredDomains.find(
    (d) => d.hostname.toLowerCase() === normalized
  );
  if (existing && existing.entityId !== domain.entityId) {
    throw new Error(`DOMAIN_COLLISION: ${normalized} is already registered to ${existing.entityId}`);
  }
  if (!existing) {
    registeredDomains.push({ ...domain, hostname: normalized });
  }
}

/**
 * Resolves a raw hostname to a DomainEntity record.
 */
export function resolveDomain(rawHostname: string): DomainEntity | null {
  const normalized = normalizeHostname(rawHostname);
  if (!normalized) return null;

  // 1. Direct match in registry
  const matches = registeredDomains.filter(
    (d) => d.hostname.toLowerCase() === normalized
  );

  if (matches.length > 1) {
    console.error(`DOMAIN_COLLISION: Multiple domain entries for ${normalized}`);
    return null;
  }

  if (matches.length === 1) {
    return matches[0];
  }

  // 2. Dynamic pattern matching for sector cities: {slug}.city.marineworld.city or {slug}.city
  const citySubdomainMatch = normalized.match(/^([a-z0-9-]+)\.city(?:\.marineworld\.city)?$/);
  if (citySubdomainMatch) {
    const citySlug = citySubdomainMatch[1];
    return {
      id: `dom-city-dynamic-${citySlug}`,
      entityType: "SECTOR_CITY",
      entityId: citySlug,
      hostname: normalized,
      url: `https://${normalized}/`,
      isCanonical: normalized.includes(".marineworld.city"),
      isActive: true,
    };
  }

  // 3. Dynamic pattern matching for authoritative canonical company URLs: {companySlug}.{sectorCity}.marineworld.city
  const canonicalCompanyMatch = normalized.match(/^([a-z0-9-]+)\.([a-z0-9-]+)\.marineworld\.city$/);
  if (canonicalCompanyMatch) {
    const compSlug = canonicalCompanyMatch[1];
    const sectorCitySlug = canonicalCompanyMatch[2];
    if (
      compSlug !== "www" &&
      compSlug !== "api" &&
      compSlug !== "app" &&
      !["city", "auth", "admin"].includes(compSlug)
    ) {
      return {
        id: `dom-comp-canonical-${compSlug}-${sectorCitySlug}`,
        entityType: "COMPANY",
        entityId: compSlug,
        hostname: normalized,
        url: `https://${normalized}/`,
        isCanonical: true,
        isActive: true,
      };
    }
  }

  // 4. Dynamic pattern matching for companies fallback: {companySlug}.marineworld.city
  const companySubdomainMatch = normalized.match(/^([a-z0-9-]+)\.marineworld\.city$/);
  if (companySubdomainMatch) {
    const compSlug = companySubdomainMatch[1];
    if (compSlug !== "www" && compSlug !== "api" && compSlug !== "app") {
      return {
        id: `dom-comp-dynamic-${compSlug}`,
        entityType: "COMPANY",
        entityId: compSlug,
        hostname: normalized,
        url: `https://${normalized}/`,
        isCanonical: false,
        isActive: true,
      };
    }
  }

  return null;
}

/**
 * Detailed resolution result with explicit error status
 */
export function getDomainEntityWithStatus(rawHostname: string): DomainResolutionResult {
  const normalized = normalizeHostname(rawHostname);
  if (!normalized) {
    return { domainEntity: null, error: "INVALID_HOSTNAME" };
  }

  const matches = registeredDomains.filter(
    (d) => d.hostname.toLowerCase() === normalized
  );

  if (matches.length > 1) {
    return { domainEntity: null, error: "DOMAIN_COLLISION" };
  }

  const domain = resolveDomain(normalized);
  if (!domain) {
    return { domainEntity: null, error: "DOMAIN_NOT_FOUND" };
  }

  if (!domain.isActive) {
    return { domainEntity: null, error: "DOMAIN_INACTIVE" };
  }

  return { domainEntity: domain };
}
