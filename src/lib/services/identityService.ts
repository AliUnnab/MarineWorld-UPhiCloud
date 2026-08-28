import type { IdentityResolutionResult } from "@/lib/types";
import { normalizeHostname, resolveDomain } from "./domainService";
import { getCompanyById, getCompanyBySlug, generateBusinessId } from "./companyService";
import { getSectorCityById } from "./sectorService";
import { getCityBySlug } from "@/lib/registry";

/**
 * Stage 10.3 — Identity Resolution Service
 * Resolves HOSTNAME -> DOMAIN ENTITY -> IDENTITY TYPE -> CANONICAL ENTITY.
 * Hostname resolution is the primary identity mechanism.
 * Route path parsing acts strictly as a compatibility fallback for shared dev/platform hosts.
 */
export function resolveIdentity(
  rawHostname: string,
  pathname?: string
): IdentityResolutionResult {
  const normalized = normalizeHostname(rawHostname);

  // 1. Resolve domain entity via domainService
  const domainEntity = resolveDomain(normalized);

  if (domainEntity) {
    if (!domainEntity.isActive) {
      return {
        identityType: domainEntity.entityType,
        platformId: "marineworld",
        domain: normalized,
        canonicalUrl: domainEntity.url,
        error: "DOMAIN_INACTIVE",
      };
    }

    if (domainEntity.entityType === "PLATFORM") {
      return {
        identityType: "PLATFORM",
        platformId: domainEntity.entityId,
        sectorId: "marine",
        domain: domainEntity.hostname,
        canonicalUrl: domainEntity.url,
      };
    }

    if (domainEntity.entityType === "SECTOR_CITY") {
      const city =
        getSectorCityById(domainEntity.entityId) ||
        getCityBySlug(undefined, domainEntity.entityId);

      if (!city) {
        return {
          identityType: "SECTOR_CITY",
          platformId: "marineworld",
          sectorId: "marine",
          sectorCityId: domainEntity.entityId,
          domain: domainEntity.hostname,
          canonicalUrl: domainEntity.url,
          error: "ENTITY_NOT_FOUND",
        };
      }

      return {
        identityType: "SECTOR_CITY",
        platformId: "marineworld",
        sectorId: "marine",
        sectorCityId: city.id || city.slug,
        domain: domainEntity.hostname,
        canonicalUrl: domainEntity.url,
      };
    }

    if (domainEntity.entityType === "COMPANY") {
      const company =
        getCompanyById(domainEntity.entityId) ||
        getCompanyBySlug(domainEntity.entityId);

      if (!company) {
        return {
          identityType: "COMPANY",
          platformId: "marineworld",
          sectorId: "marine",
          companyId: domainEntity.entityId,
          domain: domainEntity.hostname,
          canonicalUrl: domainEntity.url,
          error: "ENTITY_NOT_FOUND",
        };
      }

      if (company.status === "INACTIVE" || company.status === "DELETED") {
        return {
          identityType: "COMPANY",
          platformId: company.platformId || "marineworld",
          sectorId: company.sectorId || "marine",
          sectorCityId: company.primarySectorCityId,
          companyId: company.id,
          businessId: company.businessId || generateBusinessId(company.id, company.slug),
          organizationType: company.organizationType || "COMPANY",
          domain: domainEntity.hostname,
          canonicalUrl: domainEntity.url,
          error: "ENTITY_INACTIVE",
        };
      }

      return {
        identityType: "COMPANY",
        platformId: company.platformId || "marineworld",
        sectorId: company.sectorId || "marine",
        sectorCityId: company.primarySectorCityId,
        companyId: company.id,
        businessId: company.businessId || generateBusinessId(company.id, company.slug),
        organizationType: company.organizationType || "COMPANY",
        domain: domainEntity.hostname,
        canonicalUrl: domainEntity.url,
      };
    }
  }

  // 2. Compatibility Fallback for Shared Dev Server / Platform Host
  const isDevOrPlatformHost =
    !normalized ||
    normalized.includes("localhost") ||
    normalized.includes("127.0.0.1") ||
    normalized.includes("run.app") ||
    normalized.includes("web.app") ||
    normalized === "marineworld.city" ||
    normalized === "www.marineworld.city";

  if (isDevOrPlatformHost && pathname) {
    const path = pathname.trim().toLowerCase();

    // Sector City Route Fallback: /cities/:slug, /sehirler/:slug, /enter/:id
    const cityMatch =
      path.match(/^\/(?:cities|sehirler|enter)\/([a-z0-9-]+)/) ||
      path.match(/^\/city\/([a-z0-9-]+)/);

    if (cityMatch) {
      const citySlug = cityMatch[1];
      const city =
        getSectorCityById(citySlug) || getCityBySlug(undefined, citySlug);

      if (city) {
        return {
          identityType: "SECTOR_CITY",
          platformId: "marineworld",
          sectorId: "marine",
          sectorCityId: city.id || city.slug,
          domain: `${citySlug}.city.marineworld.city`,
          canonicalUrl: `https://${citySlug}.city.marineworld.city/`,
        };
      }
    }

    // Company Route Fallback: /companies/:slug, /sirketler/:slug
    const compMatch = path.match(/^\/(?:companies|sirketler)\/([a-z0-9-]+)/);
    if (compMatch) {
      const companySlug = compMatch[1];
      const company =
        getCompanyBySlug(companySlug) || getCompanyById(companySlug);

      if (company) {
        return {
          identityType: "COMPANY",
          platformId: company.platformId || "marineworld",
          sectorId: company.sectorId || "marine",
          sectorCityId: company.primarySectorCityId,
          companyId: company.id,
          businessId: company.businessId || generateBusinessId(company.id, company.slug),
          organizationType: company.organizationType || "COMPANY",
          domain: `${company.slug || company.id}.marineworld.city`,
          canonicalUrl: `https://${company.slug || company.id}.marineworld.city/`,
        };
      }
    }

    // Platform Fallback
    return {
      identityType: "PLATFORM",
      platformId: "marineworld",
      sectorId: "marine",
      domain: "marineworld.city",
      canonicalUrl: "https://marineworld.city/",
    };
  }

  // Unresolved Identity Error for unrecognized hostnames
  return {
    identityType: "PLATFORM",
    platformId: "marineworld",
    domain: normalized || "unknown",
    canonicalUrl: `https://${normalized || "unknown"}/`,
    error: "UNRESOLVED_IDENTITY",
  };
}
