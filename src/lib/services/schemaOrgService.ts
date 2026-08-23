import type {
  PlatformEntity,
  SectorEntity,
  SectorCityEntity,
  CompanyEntity,
  CompanyNodeEntity,
  ProductEntity,
  ServiceEntity,
  SchemaOrgIdentity,
  IdentityResolutionResult,
} from "@/lib/types";
import { getSectorCityById } from "./sectorService";
import { getCompanyById, getCompanyBySlug, getCompanyNodes } from "./companyService";
import { getCityBySlug } from "@/lib/registry";
import { marineSector } from "@/lib/sectors/marine";
import { buildCanonicalOfferingUrl } from "./offeringEntityService";
import { buildCanonicalCompanyUrl } from "./companyIdentityService";
export { buildCanonicalOfferingUrl, buildCanonicalCompanyUrl };

/**
 * Stage 10.4 — Canonical Schema.org & JSON-LD Generation Service
 * Translates canonical domain entities into structured Schema.org markup.
 * Strictly decoupled from storage/routing; purely a presentation layer.
 */

/**
 * 1. PLATFORM SCHEMA
 * Preserves canonical IDs: https://marineworld.city/#organization & https://constructionworld.city/#organization
 */
export function buildPlatformSchema(platform: Partial<PlatformEntity> & { id: string; description?: string }): SchemaOrgIdentity {
  const domain = platform.canonicalDomain || (platform.id === "constructionworld" ? "constructionworld.city" : "marineworld.city");
  const name = platform.displayName || platform.name || (platform.id === "constructionworld" ? "ConstructionWorld.City" : "MarineWorld.City");
  const url = `https://${domain}/`;
  const orgId = `https://${domain}/#organization`;

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": orgId,
    name,
    url,
    description: platform.description || (platform.id === "constructionworld" ? "Digital sector city for construction suppliers, contractors, and heavy infrastructure." : "The official digital twin city and marketplace for the maritime sector."),
  };
}

/**
 * 2. SECTOR SCHEMA
 */
export function buildSectorSchema(sector: SectorEntity): SchemaOrgIdentity {
  const platformDomain = sector.platformId === "constructionworld" ? "constructionworld.city" : "marineworld.city";
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `https://${platformDomain}/#sector-${sector.slug}`,
    name: sector.displayName || sector.name,
    url: `https://${platformDomain}/`,
    description: sector.description,
  };
}

/**
 * 3. SECTOR CITY SCHEMA
 * Preserves all 25 pre-defined sector city hub identities
 */
export function buildSectorCitySchema(sectorCity: SectorCityEntity): SchemaOrgIdentity {
  if (sectorCity.schemaOrg) {
    return sectorCity.schemaOrg;
  }

  const domain = sectorCity.canonicalDomain || `${sectorCity.slug}.city.marineworld.city`;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `https://${domain}/#organization`,
    name: sectorCity.displayName || sectorCity.name,
    url: `https://${domain}/`,
    description: sectorCity.description,
  };
}

/**
 * 4. COMPANY SCHEMA
 * Generates Schema.org Organization for CompanyEntity.
 * Embeds HQ address and optionally products & services via @graph.
 */
export function buildCompanySchema(
  company: CompanyEntity,
  nodes?: CompanyNodeEntity[],
  products?: ProductEntity[],
  services?: ServiceEntity[]
): SchemaOrgIdentity | Record<string, unknown> {
  const companyUrl = buildCanonicalCompanyUrl(company);
  const companyOrgId = `${companyUrl}#organization`;

  const hqNode = nodes?.find((n) => n.isHeadquarters || n.type === "HQ" || n.nodeType === "HEADQUARTERS") || nodes?.[0];

  const address = hqNode && (hqNode.city || hqNode.country)
    ? {
        "@type": "PostalAddress",
        streetAddress: hqNode.address || undefined,
        addressLocality: hqNode.city || undefined,
        addressCountry: hqNode.country || undefined,
      }
    : undefined;

  const sameAsUrls: string[] = [];
  if (company.websiteUrl) sameAsUrls.push(company.websiteUrl);

  const companyOrg: SchemaOrgIdentity & Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": companyOrgId,
    name: company.displayName || company.legalName,
    url: companyUrl,
    identifier: company.businessId || undefined,
    description: company.description || company.shortDescription || undefined,
    logo: company.logoUrl || company.logo || undefined,
    image: company.heroImageUrl || company.heroImage || undefined,
    address,
    sameAs: sameAsUrls.length > 0 ? sameAsUrls : undefined,
  };

  const hasProducts = products && products.length > 0;
  const hasServices = services && services.length > 0;

  if (!hasProducts && !hasServices) {
    return companyOrg;
  }

  // Build JSON-LD Graph for composite schema
  const graph: unknown[] = [companyOrg];

  products?.forEach((p) => {
    graph.push(buildProductSchema(p, company));
  });

  services?.forEach((s) => {
    graph.push(buildServiceSchema(s, company));
  });

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

/**
 * 5. PRODUCT SCHEMA
 * Uses authoritative 3-part canonical subdomain:
 * https://{productSlug}.{companySlug}.{sectorCity}.marineworld.city
 */
export function buildProductSchema(
  product: ProductEntity,
  company?: CompanyEntity
): Record<string, unknown> {
  const companySlug = (product as any).companySlug || company?.slug || company?.id || "company";
  const productSlug = product.slug || product.id;
  const sectorCity = (product as any).canonicalSectorCity || (product as any).sectorCity || company?.sectorCityIds?.[0] || (company as any)?.cityIds?.[0] || "shipyard";
  const canonicalUrl = buildCanonicalOfferingUrl(productSlug, companySlug, sectorCity);
  const companyUrl = buildCanonicalCompanyUrl(companySlug, sectorCity);
  const companyOrgId = `${companyUrl}#organization`;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${canonicalUrl}#product`,
    url: canonicalUrl,
    name: product.name,
    description: product.description || product.shortDescription || undefined,
    category: product.category || undefined,
    image: product.images?.[0] || product.primaryImage || undefined,
    brand: company
      ? {
          "@type": "Organization",
          "@id": companyOrgId,
          name: company.displayName || company.legalName || (company as any).name,
          url: companyUrl,
        }
      : undefined,
  };
}

/**
 * 6. SERVICE SCHEMA
 * Uses authoritative 3-part canonical subdomain:
 * https://{serviceSlug}.{companySlug}.{sectorCity}.marineworld.city
 */
export function buildServiceSchema(
  service: ServiceEntity,
  company?: CompanyEntity
): Record<string, unknown> {
  const companySlug = (service as any).companySlug || company?.slug || company?.id || "company";
  const serviceSlug = service.slug || service.id;
  const sectorCity = (service as any).canonicalSectorCity || (service as any).sectorCity || company?.sectorCityIds?.[0] || (company as any)?.cityIds?.[0] || "shipyard";
  const canonicalUrl = buildCanonicalOfferingUrl(serviceSlug, companySlug, sectorCity);
  const companyUrl = buildCanonicalCompanyUrl(companySlug, sectorCity);
  const companyOrgId = `${companyUrl}#organization`;

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${canonicalUrl}#service`,
    url: canonicalUrl,
    name: service.name,
    description: service.description || service.shortDescription || undefined,
    category: service.category || undefined,
    provider: company
      ? {
          "@type": "Organization",
          "@id": companyOrgId,
          name: company.displayName || company.legalName || (company as any).name,
          url: companyUrl,
        }
      : undefined,
  };
}

/**
 * 7. BUILD SCHEMA FOR IDENTITY RESULT
 * Directly maps IdentityResolutionResult -> Schema.org JSON-LD object
 */
export function buildSchemaForIdentity(
  identity: IdentityResolutionResult
): Record<string, unknown> | SchemaOrgIdentity | null {
  if (identity.identityType === "PLATFORM") {
    return buildPlatformSchema({
      id: identity.platformId || "marineworld",
      name: identity.platformId === "constructionworld" ? "ConstructionWorld.City" : "MarineWorld.City",
      canonicalDomain: identity.domain || (identity.platformId === "constructionworld" ? "constructionworld.city" : "marineworld.city"),
    });
  }

  if (identity.identityType === "SECTOR_CITY" && identity.sectorCityId) {
    const sectorCity =
      getSectorCityById(identity.sectorCityId) ||
      (getCityBySlug(marineSector, identity.sectorCityId) as unknown as SectorCityEntity);

    if (sectorCity) {
      return buildSectorCitySchema(sectorCity);
    }
  }

  if (identity.identityType === "COMPANY" && identity.companyId) {
    const company =
      getCompanyById(identity.companyId) || getCompanyBySlug(identity.companyId);

    if (company) {
      const nodes = getCompanyNodes(company.id);
      return buildCompanySchema(company, nodes);
    }
  }

  return null;
}

/**
 * 8. RUNTIME HEAD INJECTION HELPER
 * Safely injects/updates JSON-LD <script> inside document.head at runtime
 */
export function injectJsonLd(schema: object | object[], elementId = "schema-org-jsonld"): void {
  if (typeof document === "undefined") return;

  let script = document.getElementById(elementId) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.id = elementId;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(schema, null, 2);
}

/**
 * Injects Schema.org JSON-LD for an IdentityResolutionResult
 */
export function injectIdentitySchema(identity: IdentityResolutionResult, elementId = "schema-org-jsonld"): void {
  const schema = buildSchemaForIdentity(identity);
  if (schema) {
    injectJsonLd(schema, elementId);
  }
}
