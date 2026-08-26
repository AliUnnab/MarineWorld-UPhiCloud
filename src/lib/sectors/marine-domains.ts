import type { IndustryDomainEntity } from "@/lib/types";

/**
 * MarineWorld Industry Domains — the authoritative domain taxonomy.
 *
 * Master Industry Domain Structure (8 Approved Conceptual Domains):
 * 01 - Industrial Products, Equipment & Manufacturing
 * 02 - Maritime Services, Ports, Marinas & Operations
 * 03 - Yachting, Charter & Maritime Lifestyle
 * 04 - Offshore, Energy & Subsea
 * 05 - Real Estate & Hospitality
 * 06 - Maritime Technology & AI Systems
 * 07 - Legal, Finance & Compliance
 * 08 - Industry Governance, Associations & Clusters
 */
export const marineDomains: IndustryDomainEntity[] = [
  {
    id: "industrial-manufacturing",
    slug: "industrial-manufacturing",
    name: "Industrial Products, Equipment & Manufacturing",
    description:
      "Shipbuilding, boatbuilding, marine equipment, propulsion, fabrication, materials and industrial marine production.",
    icon: "crane",
    status: "LIVE",
    featured: true,
    sortOrder: 1,
  },
  {
    id: "maritime-services",
    slug: "maritime-services",
    name: "Maritime Services, Ports, Marinas & Operations",
    description:
      "Ports, marinas, maritime logistics, procurement, fleet and vessel operations, brokerage and marine commercial services.",
    icon: "exchange",
    status: "LIVE",
    featured: true,
    sortOrder: 2,
  },
  {
    id: "yachting-lifestyle",
    slug: "yachting-lifestyle",
    name: "Yachting, Charter & Maritime Lifestyle",
    description:
      "Yacht sales, charter, yacht management, marine experiences, watercraft, coastal lifestyle and marine-connected commerce.",
    icon: "sail",
    status: "LIVE",
    featured: true,
    sortOrder: 3,
  },
  {
    id: "offshore-subsea",
    slug: "offshore-subsea",
    name: "Offshore, Energy & Subsea",
    description:
      "Offshore energy, offshore wind, ocean energy, subsea services, underwater technology and marine infrastructure.",
    icon: "rig",
    status: "LIVE",
    featured: true,
    sortOrder: 4,
  },
  {
    id: "real-estate-hospitality",
    slug: "real-estate-hospitality",
    name: "Real Estate & Hospitality",
    description:
      "Waterfront real estate, marina developments, residences, hotels, resorts and marine-connected hospitality.",
    icon: "building",
    status: "LIVE",
    featured: true,
    sortOrder: 5,
  },
  {
    id: "marine-technology",
    slug: "marine-technology",
    name: "Maritime Technology & AI Systems",
    description:
      "Maritime AI, digital twins, maritime data, autonomous vessels and maritime cybersecurity.",
    icon: "chip",
    status: "LIVE",
    featured: true,
    sortOrder: 6,
  },
  {
    id: "finance-legal",
    slug: "finance-legal",
    name: "Legal, Finance & Compliance",
    description:
      "Marine finance, insurance, maritime law, classification and regulatory compliance.",
    icon: "chart",
    status: "LIVE",
    featured: true,
    sortOrder: 7,
  },
  {
    id: "governance",
    slug: "governance",
    name: "Industry Governance, Associations & Clusters",
    description:
      "Maritime institutions, registries, associations, chambers, industry governance and regional marine clusters.",
    icon: "shield",
    status: "LIVE",
    featured: true,
    sortOrder: 8,
  },
];

/**
 * Legacy Domain Route & ID Aliases mapping to maintain 100% backward
 * compatibility for legacy presentation routes and city relationships.
 */
export const LEGACY_DOMAIN_MAP: Record<string, string> = {
  // Legacy Domain slugs
  "shipbuilding-production": "industrial-manufacturing",
  "engineering-design": "industrial-manufacturing",
  "industrial-products-equipment-manufacturing": "industrial-manufacturing",
  "vessel-operations": "maritime-services",
  "infrastructure": "maritime-services",
  "maritime-services-ports-marinas-operations": "maritime-services",
  "vessel-sales": "yachting-lifestyle",
  "lifestyle-hospitality": "real-estate-hospitality",
  "real-estate-hospitality": "real-estate-hospitality",
  "yachting-charter-maritime-lifestyle": "yachting-lifestyle",
  "offshore-energy-subsea": "offshore-subsea",
  "maritime-technology-ai-systems": "marine-technology",
  "maritime-technology": "marine-technology",
  "legal-finance-compliance": "finance-legal",
  "industry-governance-associations-clusters": "governance",
  "ecosystem-governance": "governance",
};

