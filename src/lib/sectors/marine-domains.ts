import type { IndustryDomainEntity } from "@/lib/types";

/**
 * MarineWorld Industry Domains — the authoritative domain taxonomy.
 *
 * Hierarchy:
 *   MARINEWORLD.CITY → INDUSTRY DOMAIN → SECTOR CITY → COMPANY
 *
 * Each domain groups related Sector Cities. One city belongs to one domain.
 * Adding a domain = one registry entry; the city already references it
 * via its `industryDomainId`.
 */
export const marineDomains: IndustryDomainEntity[] = [
  {
    id: "maritime-services",
    slug: "maritime-services",
    name: "Maritime Services",
    description:
      "Commercial maritime services — trade, sourcing, supply chain and procurement across the global marine ecosystem.",
    icon: "exchange",
    status: "LIVE",
    featured: true,
    sortOrder: 1,
  },
  {
    id: "vessel-sales",
    slug: "vessel-sales",
    name: "Vessel Sales",
    description:
      "Brokerage, sales networks and listing intelligence for yachts, commercial vessels and marine assets.",
    icon: "sail",
    status: "LIVE",
    featured: true,
    sortOrder: 2,
  },
  {
    id: "shipbuilding-production",
    slug: "shipbuilding-production",
    name: "Shipbuilding & Production",
    description:
      "Shipbuilding, repair and industrial marine production — from custom builds to full refit programmes.",
    icon: "crane",
    status: "LIVE",
    featured: true,
    sortOrder: 3,
  },
  {
    id: "engineering-design",
    slug: "engineering-design",
    name: "Engineering & Design",
    description:
      "Naval architecture, marine engineering, systems design and classification liaison services.",
    icon: "drafting",
    status: "LIVE",
    featured: true,
    sortOrder: 4,
  },
  {
    id: "vessel-operations",
    slug: "vessel-operations",
    name: "Vessel Operations",
    description:
      "Charter operations, fleet management, crewing and day-to-day vessel operations.",
    icon: "helm",
    status: "LIVE",
    featured: true,
    sortOrder: 5,
  },
  {
    id: "infrastructure",
    slug: "infrastructure",
    name: "Maritime Infrastructure",
    description:
      "Ports, terminals, marinas, waterfront development and maritime infrastructure operations.",
    icon: "gantry",
    status: "LIVE",
    featured: true,
    sortOrder: 6,
  },
  {
    id: "marine-technology",
    slug: "marine-technology",
    name: "Marine Technology",
    description:
      "AI systems, digital twins, data services, autonomous vessels and cybersecurity for the maritime industry.",
    icon: "chip",
    status: "LIVE",
    featured: true,
    sortOrder: 7,
  },
  {
    id: "finance-legal",
    slug: "finance-legal",
    name: "Finance & Legal",
    description:
      "Marine finance, insurance, P&I, admiralty law, contracts and regulatory compliance.",
    icon: "chart",
    status: "LIVE",
    featured: true,
    sortOrder: 8,
  },
  {
    id: "offshore-subsea",
    slug: "offshore-subsea",
    name: "Offshore & Subsea",
    description:
      "Offshore energy, platforms, subsea engineering, ROV operations and subsea construction.",
    icon: "rig",
    status: "LIVE",
    featured: true,
    sortOrder: 9,
  },
  {
    id: "lifestyle-hospitality",
    slug: "lifestyle-hospitality",
    name: "Lifestyle & Hospitality",
    description:
      "Marine lifestyle brands, superyacht services, provisioning, waterfront culture and events.",
    icon: "sunrise",
    status: "LIVE",
    featured: true,
    sortOrder: 10,
  },
];
