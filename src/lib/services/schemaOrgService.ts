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
      (getCityBySlug(undefined, identity.sectorCityId) as unknown as SectorCityEntity);

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

import type { OKFDocument } from "@/lib/types/okf";

/**
 * Injects Schema.org JSON-LD for an IdentityResolutionResult
 */
export function injectIdentitySchema(identity: IdentityResolutionResult, elementId = "schema-org-jsonld"): void {
  const schema = buildSchemaForIdentity(identity);
  if (schema) {
    injectJsonLd(schema, elementId);
  }
}

/**
 * 9. OKF SCHEMA.ORG & KNOWLEDGE CATALOG SPECIFICATION GENERATOR
 * Translates an Open Knowledge Format (OKF) document into a rich Schema.org JSON-LD Graph.
 * Includes Product/Service, Dataset (for Google Dataset & AI retrieval), and TechArticle.
 */
export function buildOKFSchemaOrg(
  doc: OKFDocument,
  company?: any,
  canonicalOfferingUrl?: string
): Record<string, unknown> {
  const companySlug = doc.companySlug || company?.slug || company?.id || "company";
  const offeringSlug = doc.offeringSlug || doc.offeringId || "offering";
  const url = canonicalOfferingUrl || `https://marineworld.city/?company=${companySlug}&offering=${offeringSlug}`;
  const companyName = company?.displayName || company?.legalName || company?.name || "MarineWorld Enterprise";
  const companyUrl = company ? buildCanonicalCompanyUrl(company) : `https://marineworld.city/companies/${companySlug}`;
  const companyOrgId = `${companyUrl}#organization`;

  // 1. Offering Entity (Product or Service)
  const isService = doc.entityType === "SERVICE";
  const offeringType = isService ? "Service" : "Product";

  const additionalProperties = (doc.specifications || []).map((spec) => ({
    "@type": "PropertyValue",
    name: spec.label || spec.key,
    value: spec.unit ? `${spec.value} ${spec.unit}` : spec.value,
    propertyID: spec.key,
    valueReference: `AI Grounded Confidence: ${(spec.confidence * 100).toFixed(0)}%`,
  }));

  const certifications = (doc.certifications || []).map((cert) => ({
    "@type": "Certification",
    name: cert,
    auditDate: doc.knowledgeCatalogSeal.sealedAt,
    issuedBy: "MarineWorld Trust Layer / Maritime Classification Society",
  }));

  const offer = doc.commercialParameters
    ? {
        "@type": "Offer",
        price: doc.commercialParameters.price || undefined,
        priceCurrency: doc.commercialParameters.currency || "USD",
        availability: "https://schema.org/InStock",
        deliveryLeadTime: doc.commercialParameters.leadTimeDays
          ? {
              "@type": "QuantitativeValue",
              value: doc.commercialParameters.leadTimeDays,
              unitCode: "DAY",
            }
          : undefined,
        description: `Pricing Model: ${doc.commercialParameters.pricingModel || "Commercial Term"}`,
      }
    : undefined;

  const audience =
    doc.operationalBoundaries && doc.operationalBoundaries.length > 0
      ? {
          "@type": "Audience",
          audienceType: doc.operationalBoundaries.join(", "),
        }
      : undefined;

  const offeringSchema: Record<string, unknown> = {
    "@type": offeringType,
    "@id": `${url}#${isService ? "service" : "product"}`,
    url,
    name: doc.title,
    description: doc.summaryText,
    sku: doc.knowledgeCatalogSeal.sealId,
    identifier: doc.documentId,
    brand: isService
      ? undefined
      : {
          "@type": "Organization",
          "@id": companyOrgId,
          name: companyName,
          url: companyUrl,
        },
    provider: isService
      ? {
          "@type": "Organization",
          "@id": companyOrgId,
          name: companyName,
          url: companyUrl,
        }
      : undefined,
    additionalProperty: additionalProperties.length > 0 ? additionalProperties : undefined,
    hasCertification: certifications.length > 0 ? certifications : undefined,
    offers: offer,
    audience,
  };

  // 2. Open Knowledge Format Dataset Schema (Google Dataset Search, AI agent grounding, Knowledge Graph)
  const origin = typeof window !== "undefined" ? window.location.origin : "https://marineworld.city";
  const apiOfferingId = doc.offeringId || doc.offeringSlug || doc.documentId;
  const jsonApiUrl = `${origin}/api/okf/${company?.id || companySlug}/${apiOfferingId}`;
  const mdApiUrl = `${origin}/api/okf/${company?.id || companySlug}/${apiOfferingId}.md`;

  const datasetSchema: Record<string, unknown> = {
    "@type": "Dataset",
    "@id": `${url}#okf-dataset`,
    name: `${doc.title} — Verified Engineering & Commercial OKF Dataset`,
    description: `Official Open Knowledge Format (OKF v1.0) dataset cryptographically sealed by Google Knowledge Catalog (${doc.knowledgeCatalogSeal.sealId}). Zero-hallucination baseline for AI indexing and search engine retrieval.`,
    license: "https://creativecommons.org/licenses/by/4.0/",
    keywords: [
      "Open Knowledge Format",
      "OKF",
      "Google Knowledge Catalog",
      "Engineering Datasheet",
      "Verified Specification",
      ...(doc.classifications || []),
      ...(doc.certifications || []),
      ...(doc.tags || []),
    ],
    creator: {
      "@type": "Organization",
      "@id": companyOrgId,
      name: companyName,
      url: companyUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "Google Knowledge Catalog / MarineWorld Trust Layer",
      url: "https://marineworld.city",
    },
    datePublished: doc.createdAt,
    dateModified: doc.updatedAt,
    variableMeasured: (doc.specifications || []).map((s) => s.label || s.key),
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "application/json",
        contentUrl: jsonApiUrl,
      },
      {
        "@type": "DataDownload",
        encodingFormat: "text/markdown",
        contentUrl: mdApiUrl,
      },
    ],
  };

  // 3. Technical Article / Notarized Datasheet Schema
  const techArticleSchema: Record<string, unknown> = {
    "@type": "TechArticle",
    "@id": `${url}#okf-article`,
    headline: `${doc.title} Technical Specification Datasheet`,
    description: doc.summaryText,
    articleBody: doc.rawMarkdownBody || doc.summaryText,
    author: {
      "@type": "Organization",
      name: companyName,
    },
    publisher: {
      "@type": "Organization",
      name: "Google Knowledge Catalog",
    },
    datePublished: doc.createdAt,
    dateModified: doc.updatedAt,
    inLanguage: "en",
  };

  return {
    "@context": "https://schema.org",
    "@graph": [offeringSchema, datasetSchema, techArticleSchema],
  };
}

/**
 * 10. RUNTIME AI CRAWLER & SEARCH ENGINE HEAD INJECTION HELPER
 * Dynamically injects SEO meta tags and machine-readable discovery links for AI bots (ChatGPT, Claude, Gemini, Perplexity)
 */
export function injectOKFMetaAndLinks(
  doc: OKFDocument,
  company?: any,
  canonicalOfferingUrl?: string
): () => void {
  if (typeof document === "undefined") return () => {};

  const companySlug = doc.companySlug || company?.slug || company?.id || "company";
  const apiOfferingId = doc.offeringId || doc.offeringSlug || doc.documentId;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://marineworld.city";
  const jsonApiUrl = `${origin}/api/okf/${company?.id || companySlug}/${apiOfferingId}`;
  const mdApiUrl = `${origin}/api/okf/${company?.id || companySlug}/${apiOfferingId}.md`;

  const metaDefs: Array<{ name?: string; property?: string; content: string }> = [
    { name: "description", content: doc.summaryText },
    {
      name: "keywords",
      content: [
        doc.title,
        ...(doc.classifications || []),
        ...(doc.tags || []),
        ...(doc.certifications || []),
        ...(doc.specifications || []).map((s) => s.label || s.key),
      ].join(", "),
    },
    { name: "robots", content: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" },
    { name: "google-extended", content: "index, follow" },
    { name: "chatgpt", content: "index, follow" },
    { name: "claude", content: "index, follow" },
    { name: "perplexity", content: "index, follow" },
    { name: "ai:dataset-title", content: doc.title },
    { name: "ai:dataset-seal", content: doc.knowledgeCatalogSeal.sealId },
    { name: "ai:dataset-hash", content: doc.knowledgeCatalogSeal.hashSha256 },
    { name: "ai:dataset-status", content: doc.knowledgeCatalogSeal.status },
    { name: "ai:confidence-score", content: String(doc.confidenceScore || 0.99) },
    { property: "og:title", content: `${doc.title} — Verified Datasheet & OKF Dataset` },
    { property: "og:description", content: doc.summaryText },
  ];

  const createdElements: HTMLElement[] = [];

  metaDefs.forEach(({ name, property, content }) => {
    let el = document.querySelector(
      name ? `meta[name="${name}"]` : `meta[property="${property}"]`
    ) as HTMLMetaElement | null;

    if (!el) {
      el = document.createElement("meta");
      if (name) el.name = name;
      if (property) el.setAttribute("property", property);
      document.head.appendChild(el);
      createdElements.push(el);
    }
    el.content = content;
  });

  // Link alternates for raw JSON and Markdown
  const linkDefs = [
    { rel: "alternate", type: "application/json", href: jsonApiUrl, title: "OKF JSON Dataset" },
    { rel: "alternate", type: "text/markdown", href: mdApiUrl, title: "OKF Markdown Datasheet" },
  ];

  linkDefs.forEach(({ rel, type, href, title }) => {
    let link = document.querySelector(`link[rel="${rel}"][type="${type}"]`) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = rel;
      link.type = type;
      link.title = title;
      document.head.appendChild(link);
      createdElements.push(link);
    }
    link.href = href;
  });

  // Return cleanup function to remove created elements
  return () => {
    createdElements.forEach((el) => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
  };
}

