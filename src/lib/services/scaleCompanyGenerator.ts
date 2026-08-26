import type { CompanyProfile, SectorConfig, SectorCity } from "@/lib/types";
import { marineSector } from "@/lib/sectors/marine";
import { marineDomains } from "@/lib/sectors/marine-domains";

export interface GeoLocation {
  city: string;
  country: string;
  regionId: string;
  regionName: string;
  lat: number;
  lng: number;
  mapX: number; // 0..100 for SVG map
  mapY: number; // 0..100 for SVG map
}

export const CANONICAL_MARITIME_HUBS: GeoLocation[] = [
  { city: "Rotterdam", country: "Netherlands", regionId: "western-europe", regionName: "Western Europe", lat: 51.9244, lng: 4.4777, mapX: 47.5, mapY: 16.5 },
  { city: "Hamburg", country: "Germany", regionId: "western-europe", regionName: "Western Europe", lat: 53.5511, lng: 9.9937, mapX: 49.0, mapY: 15.0 },
  { city: "Antwerp", country: "Belgium", regionId: "western-europe", regionName: "Western Europe", lat: 51.2194, lng: 4.4025, mapX: 47.0, mapY: 17.0 },
  { city: "London", country: "United Kingdom", regionId: "western-europe", regionName: "Western Europe", lat: 51.5074, lng: -0.1278, mapX: 44.5, mapY: 16.8 },
  { city: "Southampton", country: "United Kingdom", regionId: "western-europe", regionName: "Western Europe", lat: 50.9097, lng: -1.4044, mapX: 44.0, mapY: 17.5 },
  { city: "Bergen", country: "Norway", regionId: "northern-europe", regionName: "Northern Europe", lat: 60.3913, lng: 5.3221, mapX: 48.5, mapY: 10.5 },
  { city: "Oslo", country: "Norway", regionId: "northern-europe", regionName: "Northern Europe", lat: 59.9139, lng: 10.7522, mapX: 50.0, mapY: 11.5 },
  { city: "Copenhagen", country: "Denmark", regionId: "northern-europe", regionName: "Northern Europe", lat: 55.6761, lng: 12.5683, mapX: 50.5, mapY: 14.0 },
  { city: "Helsinki", country: "Finland", regionId: "northern-europe", regionName: "Northern Europe", lat: 60.1699, lng: 24.9384, mapX: 54.0, mapY: 11.0 },
  { city: "Gothenburg", country: "Sweden", regionId: "northern-europe", regionName: "Northern Europe", lat: 57.7089, lng: 11.9746, mapX: 50.0, mapY: 13.0 },
  { city: "Genoa", country: "Italy", regionId: "southern-europe", regionName: "Southern Europe", lat: 44.4056, lng: 8.9463, mapX: 48.5, mapY: 21.0 },
  { city: "Trieste", country: "Italy", regionId: "southern-europe", regionName: "Southern Europe", lat: 45.6495, lng: 13.7768, mapX: 50.2, mapY: 20.2 },
  { city: "Marseille", country: "France", regionId: "southern-europe", regionName: "Southern Europe", lat: 43.2965, lng: 5.3698, mapX: 46.5, mapY: 21.5 },
  { city: "Barcelona", country: "Spain", regionId: "southern-europe", regionName: "Southern Europe", lat: 41.3879, lng: 2.1699, mapX: 45.0, mapY: 23.0 },
  { city: "Valencia", country: "Spain", regionId: "southern-europe", regionName: "Southern Europe", lat: 39.4699, lng: -0.3763, mapX: 44.2, mapY: 24.5 },
  { city: "Palma", country: "Spain", regionId: "med", regionName: "Mediterranean", lat: 39.5696, lng: 2.6502, mapX: 46.0, mapY: 25.0 },
  { city: "Monaco", country: "Monaco", regionId: "med", regionName: "Mediterranean", lat: 43.7384, lng: 7.4246, mapX: 47.5, mapY: 21.8 },
  { city: "Cannes", country: "France", regionId: "med", regionName: "Mediterranean", lat: 43.5528, lng: 7.0174, mapX: 47.2, mapY: 22.0 },
  { city: "Athens", country: "Greece", regionId: "med", regionName: "Mediterranean", lat: 37.9838, lng: 23.7275, mapX: 54.0, mapY: 26.5 },
  { city: "Piraeus", country: "Greece", regionId: "med", regionName: "Mediterranean", lat: 37.9430, lng: 23.6470, mapX: 53.8, mapY: 26.7 },
  { city: "Göcek", country: "Türkiye", regionId: "med", regionName: "Mediterranean", lat: 36.7533, lng: 28.9442, mapX: 56.0, mapY: 27.5 },
  { city: "Antalya", country: "Türkiye", regionId: "med", regionName: "Mediterranean", lat: 36.8969, lng: 30.7133, mapX: 57.0, mapY: 27.2 },
  { city: "Istanbul", country: "Türkiye", regionId: "eastern-europe", regionName: "Eastern Europe & Caucasus", lat: 41.0082, lng: 28.9784, mapX: 56.5, mapY: 23.5 },
  { city: "Limassol", country: "Cyprus", regionId: "med", regionName: "Mediterranean", lat: 34.7071, lng: 33.0226, mapX: 58.0, mapY: 29.0 },
  { city: "Valletta", country: "Malta", regionId: "med", regionName: "Mediterranean", lat: 35.8989, lng: 14.5146, mapX: 50.5, mapY: 26.5 },
  { city: "Houston", country: "United States", regionId: "north-america", regionName: "North America", lat: 29.7604, lng: -95.3698, mapX: 19.0, mapY: 26.0 },
  { city: "Miami", country: "United States", regionId: "north-america", regionName: "North America", lat: 25.7617, lng: -80.1918, mapX: 24.5, mapY: 27.0 },
  { city: "Fort Lauderdale", country: "United States", regionId: "north-america", regionName: "North America", lat: 26.1224, lng: -80.1373, mapX: 24.5, mapY: 26.8 },
  { city: "New York", country: "United States", regionId: "north-america", regionName: "North America", lat: 40.7128, lng: -74.0060, mapX: 25.5, mapY: 21.0 },
  { city: "Seattle", country: "United States", regionId: "north-america", regionName: "North America", lat: 47.6062, lng: -122.3321, mapX: 15.0, mapY: 17.5 },
  { city: "Vancouver", country: "Canada", regionId: "north-america", regionName: "North America", lat: 49.2827, lng: -123.1207, mapX: 15.0, mapY: 16.5 },
  { city: "St. Thomas", country: "US Virgin Islands", regionId: "caribbean", regionName: "Caribbean", lat: 18.3358, lng: -64.8963, mapX: 27.5, mapY: 30.5 },
  { city: "Nassau", country: "Bahamas", regionId: "caribbean", regionName: "Caribbean", lat: 25.0479, lng: -77.3554, mapX: 25.5, mapY: 27.8 },
  { city: "Panama City", country: "Panama", regionId: "central-south-america", regionName: "Central & South America", lat: 8.9824, lng: -79.5199, mapX: 26.0, mapY: 37.0 },
  { city: "Santos", country: "Brazil", regionId: "central-south-america", regionName: "Central & South America", lat: -23.9618, lng: -46.3322, mapX: 35.5, mapY: 48.0 },
  { city: "Dubai", country: "United Arab Emirates", regionId: "middle-east", regionName: "Middle East", lat: 25.2048, lng: 55.2708, mapX: 63.5, mapY: 28.0 },
  { city: "Abu Dhabi", country: "United Arab Emirates", regionId: "middle-east", regionName: "Middle East", lat: 24.4539, lng: 54.3773, mapX: 63.0, mapY: 28.5 },
  { city: "Doha", country: "Qatar", regionId: "middle-east", regionName: "Middle East", lat: 25.2854, lng: 51.5310, mapX: 62.0, mapY: 28.2 },
  { city: "Singapore", country: "Singapore", regionId: "asia", regionName: "Asia", lat: 1.3521, lng: 103.8198, mapX: 74.5, mapY: 37.0 },
  { city: "Hong Kong", country: "Hong Kong", regionId: "asia", regionName: "Asia", lat: 22.3193, lng: 114.1694, mapX: 77.0, mapY: 29.5 },
  { city: "Shanghai", country: "China", regionId: "asia", regionName: "Asia", lat: 31.2304, lng: 121.4737, mapX: 78.5, mapY: 25.5 },
  { city: "Busan", country: "South Korea", regionId: "asia", regionName: "Asia", lat: 35.1796, lng: 129.0756, mapX: 80.5, mapY: 23.5 },
  { city: "Yokohama", country: "Japan", regionId: "asia", regionName: "Asia", lat: 35.4437, lng: 139.6380, mapX: 83.5, mapY: 23.0 },
  { city: "Tokyo", country: "Japan", regionId: "asia", regionName: "Asia", lat: 35.6762, lng: 139.6503, mapX: 83.5, mapY: 22.8 },
  { city: "Cape Town", country: "South Africa", regionId: "africa", regionName: "Africa", lat: -33.9249, lng: 18.4241, mapX: 50.5, mapY: 53.0 },
  { city: "Port Said", country: "Egypt", regionId: "africa", regionName: "Africa", lat: 31.2653, lng: 32.3019, mapX: 57.5, mapY: 28.5 },
  { city: "Sydney", country: "Australia", regionId: "pacific", regionName: "Pacific Islands & Australasia", lat: -33.8688, lng: 151.2093, mapX: 87.5, mapY: 51.0 },
  { city: "Auckland", country: "New Zealand", regionId: "pacific", regionName: "Pacific Islands & Australasia", lat: -36.8485, lng: 174.7633, mapX: 91.0, mapY: 53.5 },
];

const COMPANY_SECTORS_SEEDED: {
  citySlug: string;
  nameTemplates: [string, string][];
  capabilities: string[];
}[] = [
  {
    citySlug: "shipyard",
    nameTemplates: [
      ["Nordic Shipyard", "Marine Construction Group"],
      ["Poseidon Heavy Industries", "Naval Yard"],
      ["Pacific Hull Works", "Drydock & Repair"],
      ["Baltic Marine Builders", "Industrial Shipyard"],
    ],
    capabilities: ["Drydock Facilities", "Commercial Ship Refit", "Steel Block Fabrication", "Mega-yacht Construction"],
  },
  {
    citySlug: "procurement",
    nameTemplates: [
      ["Global Maritime Sourcing", "Tenders & Spares"],
      ["Oceanic Procurement Network", "Fleet Logistics"],
      ["Atlas Marine Requisition", "Industrial Supply Hub"],
    ],
    capabilities: ["Direct RFQ Routing", "Spares Fulfillment", "Tender Management", "Vessel Provisioning"],
  },
  {
    citySlug: "propulsion",
    nameTemplates: [
      ["HydroDrive Marine Power", "Propulsion Systems"],
      ["Vektor Marine Turbines", "Clean Engine Technologies"],
      ["AeroShaft Propulsion Engineering", "Drive Systems"],
    ],
    capabilities: ["Diesel-Electric Drives", "Shaft Alignment", "Rotor Sail Assist", "Hydrogen Fuel Cells"],
  },
  {
    citySlug: "marineai",
    nameTemplates: [
      ["Navis Intelligence Systems", "Maritime AI Lab"],
      ["Nautilus Cognitive Twin", "Decision Platforms"],
      ["DeepOcean Autonomous Logic", "Fleet Intelligence"],
    ],
    capabilities: ["Autonomous Navigation", "Voyage Optimization AI", "Company Business Twins", "Vessel Telemetry AI"],
  },
  {
    citySlug: "charter",
    nameTemplates: [
      ["Riviera Luxury Charters", "Fleet Operations"],
      ["Aegean Crest Charters", "Mediterranean Yachting"],
      ["Zephyr Oceanic Expeditions", "Global Charter Network"],
    ],
    capabilities: ["MYBA Contracts", "Bareboat & Crewed Charters", "High-Seas Logistics", "VIP Itinerary Management"],
  },
  {
    citySlug: "marina",
    nameTemplates: [
      ["Porto Imperial Marina", "Berthing & Waterfront"],
      ["Marina Bay Superyacht Basin", "Harbor Facilities"],
      ["Crest Waterfront Marinas", "Marina Management"],
    ],
    capabilities: ["Deep Draft Berths", "Shore Power 400A", "Concierge Transfers", "Bonded Bunker Fuel"],
  },
  {
    citySlug: "offshore",
    nameTemplates: [
      ["NorthSea Energy Operations", "Offshore Marine"],
      ["SubSea Apex Rigs", "Deepwater Energy Logistics"],
      ["Vanguard Offshore Wind Services", "Platform Support"],
    ],
    capabilities: ["Wind Turbine Installation", "Subsea Pipelaying", "ROV Deep Intervention", "Dynamic Positioning Supply"],
  },
  {
    citySlug: "marinelegal",
    nameTemplates: [
      ["Vanguard Admiralty Law", "Shipping Counsel"],
      ["Blackstone Maritime Jurists", "Admiralty & Arbitration"],
      ["Aegean Maritime Legal Advisory", "Regulatory Compliance"],
    ],
    capabilities: ["Admiralty Claims", "Ship Arrest & Release", "Charterparty Disputes", "IMO Decarbonization Compliance"],
  },
  {
    citySlug: "yachtfinance",
    nameTemplates: [
      ["Meridian Marine Capital", "Asset Leasing"],
      ["Trident Ship Finance", "Mortgage & Syndication"],
      ["Helios Maritime Underwriters", "P&I and Hull Risk"],
    ],
    capabilities: ["Vessel Mortgages", "Sale & Leaseback", "P&I Club Liaison", "Residual Value Insurance"],
  },
  {
    citySlug: "subsea",
    nameTemplates: [
      ["OceanFloor Robotics", "Autonomous Submersibles"],
      ["Triton Hydrographic Survey", "Subsea Mapping"],
      ["DeepScan Acoustics", "Bathymetric Systems"],
    ],
    capabilities: ["3,000m Multibeam Survey", "Subsea Trenching", "Cathodic Inspection", "Acoustic Positioning"],
  },
];

let cachedGeneratedRegistry: CompanyProfile[] | null = null;

export function generateScaleMaritimeCompanies(config: SectorConfig): CompanyProfile[] {
  if (cachedGeneratedRegistry) {
    return cachedGeneratedRegistry;
  }

  const baseCompanies = config.network?.companies || [];
  const cities = config.explorer?.cities || [];
  const results: CompanyProfile[] = [...baseCompanies];
  const existingSlugs = new Set(baseCompanies.map((c) => (c.slug || c.id).toLowerCase()));

  let idCounter = 100010;

  // Generate companies ensuring all 82 Sector Cities have 3–5 representative companies
  cities.forEach((city, cityIdx) => {
    // Check if city already has base companies
    const citySlug = (city.slug || city.id).toLowerCase();
    const domainObj = marineDomains.find((d) => d.id === city.industryDomainId || d.slug === city.industryDomainId) || marineDomains[0];

    const targetCountForCity = 3 + (cityIdx % 3); // 3 to 5 companies per city

    for (let i = 0; i < targetCountForCity; i++) {
      const geo = CANONICAL_MARITIME_HUBS[(cityIdx * 5 + i * 7 + 13) % CANONICAL_MARITIME_HUBS.length];
      const sectorDef = COMPANY_SECTORS_SEEDED.find((s) => s.citySlug === citySlug) || COMPANY_SECTORS_SEEDED[cityIdx % COMPANY_SECTORS_SEEDED.length];
      
      const [pfx, sfx] = sectorDef.nameTemplates[i % sectorDef.nameTemplates.length];
      const cleanCityName = city.domain.replace(/\.CITY$/i, "").replace(/[^a-zA-Z0-9]/g, " ");
      
      const companyName = i === 0 
        ? `${pfx} ${geo.city}`
        : i === 1 
        ? `${geo.city} ${sfx}`
        : `${pfx} ${cleanCityName} Group`;

      const slug = `${companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${geo.city.toLowerCase()}`;
      
      if (existingSlugs.has(slug)) {
        continue;
      }
      existingSlugs.add(slug);

      const isVerified = (cityIdx + i) % 4 !== 0; // 75% verified
      const hasTwin = (cityIdx + i) % 3 === 0; // 33% twin active
      const presenceTier = (cityIdx + i) % 5 === 0 ? "FLAGSHIP" : (cityIdx + i) % 2 === 0 ? "ENTERPRISE" : "STANDARD";
      
      const companyId6Digit = String(idCounter++);

      const companyRecord: CompanyProfile = {
        id: slug,
        slug,
        name: companyName,
        displayName: companyName,
        initials: companyName.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "MW",
        recordType: "DEMONSTRATION",
        industry: domainObj.name,
        primarySectorCategory: city.category,
        secondarySectorCategories: [city.domain, "Maritime Operations"],
        city: geo.city,
        headquartersCity: geo.city,
        country: geo.country,
        location: `${geo.city}, ${geo.country}`,
        region: geo.regionName,
        regionalEditions: [geo.regionId.toUpperCase().replace(/-/g, "_")],
        cityIds: [citySlug],
        sectorCityIds: [citySlug],
        status: "LIVE",
        verificationStatus: isVerified ? "verified" : "review",
        aiStatus: hasTwin ? "twin" : "ready",
        businessTwinStatus: hasTwin ? "AVAILABLE" : isVerified ? "COMING_SOON" : "NOT_CONFIGURED",
        shortDescription: `Accredited ${city.category.toLowerCase()} provider specializing in ${city.domain.toLowerCase()} solutions across ${geo.regionName}.`,
        description: `${companyName} operates enterprise-grade marine operations and technical infrastructure rooted in ${geo.city}, ${geo.country}. Connected directly to ${city.domain} under the MarineWorld sovereign digital infrastructure.`,
        corporateDescription: `${companyName} operates enterprise-grade marine operations and technical infrastructure rooted in ${geo.city}, ${geo.country}. Connected directly to ${city.domain} under the MarineWorld sovereign digital infrastructure.`,
        capabilities: [
          ...sectorDef.capabilities.slice(0, 3),
          `${city.domain} Operations`,
        ],
        presenceTier: presenceTier as "FLAGSHIP" | "ENTERPRISE" | "STANDARD",
        isFlagship: presenceTier === "FLAGSHIP",
        flagshipSectorCityId: presenceTier === "FLAGSHIP" ? citySlug : undefined,
        flagshipRegisteredAt: presenceTier === "FLAGSHIP" ? "2026-01-15T00:00:00.000Z" : undefined,
        coverImage: `https://images.unsplash.com/photo-${1500000000000 + ((cityIdx * 17 + i * 31) % 99999999)}?auto=format&fit=crop&w=800&q=80`,
        businessId: `MW-BUS-${companyId6Digit}`,
        mwCompanyDigitalId: `MW-BUS-${companyId6Digit}`,
        companyId6Digit,
        primaryRegistryCode: city.code || "REG 01",
        primaryRegistryNode: city.domain,
        offerings: [
          {
            id: `off-${slug}-01`,
            companyId: slug,
            name: `${city.domain} Enterprise Package`,
            type: "service",
            category: city.category,
            shortDescription: `Standard operational protocol and high-availability service tier for ${city.domain} transactions.`,
            status: "AVAILABLE",
            code: `${companyId6Digit.slice(0, 3)}-SERV-01`,
          },
          {
            id: `off-${slug}-02`,
            companyId: slug,
            name: `Autonomous ${city.domain} Intelligence Feed`,
            type: "product",
            category: "Marine Technology",
            shortDescription: `Real-time digital twin interface and telemetry subscription integrated with MarineWorld protocol.`,
            status: "AVAILABLE",
            code: `${companyId6Digit.slice(0, 3)}-PROD-02`,
          },
        ],
      };

      // Set coordinates on company object for interactive map view
      (companyRecord as any).lat = geo.lat;
      (companyRecord as any).lng = geo.lng;
      (companyRecord as any).mapX = geo.mapX;
      (companyRecord as any).mapY = geo.mapY;
      (companyRecord as any).presenceTier = presenceTier;

      results.push(companyRecord);
    }
  });

  cachedGeneratedRegistry = results;
  return results;
}
