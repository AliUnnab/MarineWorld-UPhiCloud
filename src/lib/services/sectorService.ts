import type { SectorEntity, SectorCityEntity } from "@/lib/types";

/**
 * Sector Service — Canonical sector registry & Sector City resolver.
 * Reusable across MarineWorld.City, ConstructionWorld.City, etc.
 */

const SECTOR_REGISTRY: Record<string, SectorEntity> = {
  marine: {
    id: "marine",
    platformId: "marineworld",
    code: "MARINE",
    slug: "marine",
    name: "Marine & Maritime Industry",
    displayName: "Marine & Maritime",
    description: "Global maritime commerce, shipbuilding, vessel repair, naval equipment, and offshore logistics.",
    status: "LIVE",
    icon: "ship",
    taxonomyVersion: "1.0.0",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-08-15T00:00:00Z",
  },
  construction: {
    id: "construction",
    platformId: "constructionworld",
    code: "CONSTRUCTION",
    slug: "construction",
    name: "Construction & Infrastructure",
    displayName: "Construction & Infrastructure",
    description: "Heavy civil engineering, architectural design, building materials, and equipment.",
    status: "COMING_SOON",
    icon: "building",
    taxonomyVersion: "1.0.0",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-08-15T00:00:00Z",
  },
};

const SECTOR_CITY_REGISTRY: Record<string, SectorCityEntity> = {
  marineworld: {
    id: "marineworld",
    platformId: "marineworld",
    sectorId: "marine",
    code: "SECTOR_CITY_001",
    slug: "marineworld",
    name: "MarineWorld.City",
    displayName: "MarineWorld.City — Global Maritime Hub",
    canonicalDomain: "marineworld.city",
    description: "The official digital twin city and marketplace for the maritime sector.",
    status: "LIVE",
    schemaOrg: {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": "https://marineworld.city/#organization",
      name: "MarineWorld.City",
      url: "https://marineworld.city/",
      description: "The official digital twin city and marketplace for the maritime sector.",
    },
    branding: {
      primaryColor: "#0D3868",
      logoUrl: "/icon.png",
      heroImage: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1920&q=80",
    },
    taxonomyVersion: "1.0.0",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-08-15T00:00:00Z",
  },
  constructionworld: {
    id: "constructionworld",
    platformId: "constructionworld",
    sectorId: "construction",
    code: "SECTOR_CITY_002",
    slug: "constructionworld",
    name: "ConstructionWorld.City",
    displayName: "ConstructionWorld.City — Global Construction Network",
    canonicalDomain: "constructionworld.city",
    description: "Digital sector city for construction suppliers, contractors, and heavy infrastructure.",
    status: "COMING_SOON",
    schemaOrg: {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": "https://constructionworld.city/#organization",
      name: "ConstructionWorld.City",
      url: "https://constructionworld.city/",
      description: "Digital sector city for construction suppliers, contractors, and heavy infrastructure.",
    },
    branding: {
      primaryColor: "#E05A3A",
      logoUrl: "/icon.png",
      heroImage: "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=1920&q=80",
    },
    taxonomyVersion: "1.0.0",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-08-15T00:00:00Z",
  },

  // 25 Predefined Marine Sector City Hubs
  ...[
    { slug: "marinecommerce", name: "Marine Commerce City", desc: "Global maritime commerce, B2B trade networks, and digital marketplace transactions." },
    { slug: "procurement", name: "Procurement City", desc: "Naval equipment procurement, parts sourcing, and vendor contract operations." },
    { slug: "supplychain", name: "Supply Chain City", desc: "Maritime logistics, freight forwarding, container shipping, and port distribution." },
    { slug: "yachtsales", name: "Yacht Sales City", desc: "Luxury yacht sales, brokerage networks, and listing intelligence." },
    { slug: "shipyard", name: "Shipyard City", desc: "Commercial shipbuilding, dry dock repairs, hull overhauls, and vessel refits." },
    { slug: "boatbuilding", name: "Boatbuilding City", desc: "Custom boat construction, composite hull manufacturing, and marine carpentry." },
    { slug: "engineering", name: "Engineering City", desc: "Naval architecture, marine structural engineering, and propulsion systems design." },
    { slug: "charter", name: "Charter City", desc: "Commercial vessel charters, luxury yacht bookings, and fleet rentals." },
    { slug: "marina", name: "Marina City", desc: "Berth management, marina operations, vessel mooring, and waterfront services." },
    { slug: "port", name: "Port City", desc: "Port terminal management, stevedoring, customs clearance, and tug operations." },
    { slug: "fleetmanagement", name: "Fleet Management City", desc: "Vessel tracking, crew management, ISM compliance, and telemetry operations." },
    { slug: "marineai", name: "Marine AI City", desc: "Artificial intelligence for maritime routing, predictive maintenance, and autonomous control." },
    { slug: "digitaltwin", name: "Digital Twin City", desc: "3D vessel digital twins, virtual shipyard simulation, and real-time sensor analytics." },
    { slug: "marinedata", name: "Marine Data City", desc: "Oceanographic datasets, hydrographic mapping, AIS tracking, and marine telemetry." },
    { slug: "autonomousvessel", name: "Autonomous Vessel City", desc: "Unmanned surface vessels, autonomous navigation, and robotic subsea drones." },
    { slug: "marinecybersecurity", name: "Marine Cybersecurity City", desc: "Shipboard IT/OT network defense, satellite communications security, and GPS spoofing protection." },
    { slug: "yachtfinance", name: "Yacht Finance City", desc: "Vessel financing, marine leasing, asset appraisal, and escrow services." },
    { slug: "insuranceops", name: "Insurance Ops City", desc: "P&I clubs, marine hull insurance, cargo underwriting, and claims management." },
    { slug: "marinelegal", name: "Marine Legal City", desc: "Admiralty law, maritime arbitration, vessel flagging, and international maritime compliance." },
    { slug: "offshore", name: "Offshore City", desc: "Offshore wind installations, oil & gas platforms, and DP vessel support." },
    { slug: "subsea", name: "Subsea City", desc: "Deepwater robotics, ROV operations, underwater cable laying, and bathymetric survey." },
    { slug: "marinelifestyle", name: "Marine Lifestyle City", desc: "Nautical apparel, ocean sports equipment, superyacht lifestyle, and marine leisure." },
    { slug: "marinehospitality", name: "Marine Hospitality City", desc: "Superyacht provisioning, onboard catering, luxury crew staffing, and hospitality management." },
    { slug: "brokerage", name: "Brokerage City", desc: "Commercial ship brokerage, cargo chartering, and vessel sale & purchase." },
    { slug: "propulsion", name: "Propulsion City", desc: "Marine diesel engines, electric propulsion, pod drives, and shaft alignment services." },
  ].reduce((acc, c, idx) => {
    const domain = `${c.slug}.city.marineworld.city`;
    acc[c.slug] = {
      id: c.slug,
      platformId: "marineworld",
      sectorId: "marine",
      code: `SECTOR_CITY_${String(idx + 3).padStart(3, "0")}`,
      slug: c.slug,
      name: c.name,
      displayName: `${c.name} — MarineWorld Hub`,
      canonicalDomain: domain,
      description: c.desc,
      status: "LIVE",
      schemaOrg: {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": `https://${domain}/#organization`,
        name: c.name,
        url: `https://${domain}/`,
        description: c.desc,
      },
      branding: {
        primaryColor: "#0284C7",
        logoUrl: "/icon.png",
        heroImage: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1920&q=80",
      },
      taxonomyVersion: "1.0.0",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-08-15T00:00:00Z",
    };
    return acc;
  }, {} as Record<string, SectorCityEntity>),
};

export function getSector(sectorId: string): SectorEntity {
  return SECTOR_REGISTRY[sectorId] ?? SECTOR_REGISTRY.marine;
}

export function getSectorById(sectorId: string): SectorEntity | undefined {
  return SECTOR_REGISTRY[sectorId];
}

export function getAllSectors(): SectorEntity[] {
  return Object.values(SECTOR_REGISTRY);
}

export function getSectorCity(sectorCityId: string): SectorCityEntity {
  const norm = sectorCityId.toLowerCase().replace(/[^a-z0-9]/g, "");
  return SECTOR_CITY_REGISTRY[norm] ?? SECTOR_CITY_REGISTRY.marineworld;
}

export function getSectorCityById(sectorCityId: string): SectorCityEntity | undefined {
  const norm = sectorCityId.toLowerCase().replace(/[^a-z0-9]/g, "");
  return SECTOR_CITY_REGISTRY[norm];
}

export function getSectorCitiesForSector(sectorId: string): SectorCityEntity[] {
  return Object.values(SECTOR_CITY_REGISTRY).filter((sc) => sc.sectorId === sectorId);
}

/**
 * Section 6 Aliases
 */
export function getSectorBySlug(slug: string): SectorEntity | undefined {
  return Object.values(SECTOR_REGISTRY).find((s) => s.slug === slug || s.id === slug);
}

export function listSectors(): SectorEntity[] {
  return getAllSectors();
}

export function getSectorCityBySlug(slug: string): SectorCityEntity | undefined {
  const norm = slug.toLowerCase().replace(/[^a-z0-9]/g, "");
  return SECTOR_CITY_REGISTRY[norm];
}

export function listSectorCities(): SectorCityEntity[] {
  return Object.values(SECTOR_CITY_REGISTRY);
}

export function getSectorCitiesBySector(sectorId: string): SectorCityEntity[] {
  return getSectorCitiesForSector(sectorId);
}

