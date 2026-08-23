import type { SectorConfig } from "@/lib/types";

/**
 * MarineWorld.City — sector configuration for the Sector City Framework.
 * sector = marine-maritime
 *
 * All landing-page content renders from this configuration.
 * A future sector city (e.g. AutomotiveWorld.City) ships a different
 * configuration object — the UI architecture stays identical.
 */
export const marineSector: SectorConfig = {
  sectorId: "marine-maritime",
  sectorCode: "SECTOR CITY 001",
  sectorName: "MarineWorld",
  sectorTld: ".City",
  wordmark: "MarineWorld.City",
  tagline: "The AI-native business city for the global maritime industry.",

  nav: [
    { label: "Explore", href: "#explorer" },
    { label: "Industries", href: "#intelligence" },
    { label: "Companies", href: "#network" },
    { label: "AI", href: "#ai" },
    { label: "Network", href: "#global" },
    { label: "About", href: "#governance" },
  ],

  hero: {
    eyebrow: "AI-Native Industry Infrastructure",
    statement: "THE AI-NATIVE BUSINESS CITY FOR THE GLOBAL MARITIME INDUSTRY.",
    accentPhrase: "MARITIME",
    support:
      "Connect companies, products, services, people and intelligence across the global marine and maritime ecosystem — one governed digital city, from shipyard to boardroom.",
    primaryCta: "Explore MarineWorld",
    secondaryCta: "Enter the Business Network",
    trust: [
      "AI-native industry infrastructure",
      "Verified corporate identity",
      "Global marine & maritime ecosystem",
    ],
    visualMeta: {
      coords: "36°53′N 30°42′E",
      label: "SHIPYARD DISTRICT — LIVE REGISTRY",
    },
    nodes: [
      {
        id: "port",
        icon: "gantry",
        title: "PORT.CITY",
        line: "Terminal operations — registry live",
      },
      {
        id: "rfq",
        icon: "doc",
        title: "RFQ · ENGINEERING.CITY",
        line: "Propulsion refit — routed to suppliers",
      },
      {
        id: "twin",
        icon: "spark",
        title: "AI TWIN ACTIVE",
        line: "Verified entity — responding for its company",
      },
    ],
  },

  activityFeed: [
    "RFQ · PROPULSION REFIT — ROUTED TO SHIPYARD.CITY",
    "VERIFIED · CORPORATE IDENTITY ISSUED — MARINA.CITY",
    "AI TWIN ACTIVATED — CHARTER OPERATOR, MEDITERRANEAN",
    "SERVICE REQUEST · HULL SURVEY — SUBSEA.CITY",
    "PRODUCT SPECIFICATION SERVED BY AI — MARINECOMMERCE.CITY",
    "CONNECTION · BROKER ↔ SHIPYARD — YACHTSALES.CITY",
    "TENDER PUBLISHED — PROCUREMENT.CITY",
    "CREW AVAILABILITY SYNCED — FLEETMANAGEMENT.CITY",
  ],

  intelligence: {
    eyebrow: "Industry Intelligence",
    headline: "THE MARITIME INDUSTRY, CONNECTED AS ONE DIGITAL CITY.",
    lead: "Maritime business lives in fragments — yards, ports, brokers, suppliers, financiers, each operating alone. MarineWorld structures the entire industry into one connected digital environment, where every domain is a live node in the same system.",
    domains: [
      { id: "companies", label: "Companies", meta: "Registry", icon: "building" },
      { id: "products", label: "Products", meta: "Index", icon: "cube" },
      { id: "services", label: "Services", meta: "Directory", icon: "briefcase" },
      { id: "ports", label: "Ports", meta: "Operations", icon: "gantry" },
      { id: "marinas", label: "Marinas", meta: "Berthing", icon: "dock" },
      { id: "shipyards", label: "Shipyards", meta: "Production", icon: "crane" },
      { id: "technology", label: "Technology", meta: "Innovation", icon: "chip" },
      { id: "finance", label: "Finance", meta: "Capital", icon: "chart" },
      { id: "legal", label: "Legal", meta: "Admiralty", icon: "scales" },
      { id: "crew", label: "Crew & Workforce", meta: "Talent", icon: "crew" },
      { id: "associations", label: "Associations", meta: "Institutions", icon: "flag" },
      { id: "ai", label: "AI Layer", meta: "Intelligence", icon: "spark" },
    ],
    caption:
      "Every node shares one identity system, one registry and one AI layer — so industry activity becomes discoverable, verifiable and operational.",
  },

  explorer: {
    eyebrow: "Sector City Explorer",
    headline: "EXPLORE THE MARITIME CITY.",
    lead: "MarineWorld is organized as a city of operational domains. Each city is a structured business environment with its own registry, companies, products and services.",
    note: "A curated selection of the MarineWorld registry is shown here. The complete registry is accessible through the explorer inside the platform.",
    cities: [
      {
        id: "marinecommerce",
        slug: "marinecommerce",
        domain: "MARINECOMMERCE.CITY",
        code: "REG 01",
        industryDomainId: "maritime-services",
        category: "Maritime Services, Ports, Marinas & Operations",
        description: "Marine equipment, parts and industrial trade across the global market.",
        shortDescription: "Marine equipment, parts and industrial trade.",
        icon: "exchange",
        scope: ["Equipment & parts trade", "Supplier catalogues", "Trade matchmaking"],
      },
      {
        id: "procurement",
        slug: "procurement",
        domain: "PROCUREMENT.CITY",
        code: "REG 02",
        industryDomainId: "maritime-services",
        category: "Maritime Services, Ports, Marinas & Operations",
        description: "Sourcing, tenders and supplier matching for maritime operations.",
        shortDescription: "Sourcing, tenders and supplier matching.",
        icon: "send",
        scope: ["Structured RFQs", "Tender publication", "Supplier qualification"],
      },
      {
        id: "supplychain",
        slug: "supplychain",
        domain: "SUPPLYCHAIN.CITY",
        code: "REG 03",
        industryDomainId: "maritime-services",
        category: "Maritime Services, Ports, Marinas & Operations",
        description: "End-to-end maritime supply chain visibility and coordination.",
        shortDescription: "End-to-end supply chain visibility.",
        icon: "route",
        scope: ["Logistics coordination", "Provisioning", "Spares distribution"],
      },
      {
        id: "yachtsales",
        slug: "yachtsales",
        domain: "YACHTSALES.CITY",
        code: "REG 04",
        industryDomainId: "vessel-sales",
        category: "Yachting, Charter & Maritime Lifestyle",
        description: "Yacht brokerage, sales networks and listing intelligence.",
        shortDescription: "Yacht brokerage, sales networks and listing intelligence.",
        icon: "sail",
        scope: ["Brokerage network", "Listings & valuations", "Buyer discovery"],
      },
      {
        id: "shipyard",
        slug: "shipyard",
        domain: "SHIPYARD.CITY",
        code: "REG 05",
        industryDomainId: "shipbuilding-production",
        category: "Industrial Products, Equipment & Manufacturing",
        description: "Shipbuilding, repair and industrial marine production.",
        shortDescription: "Shipbuilding, repair and industrial marine production.",
        icon: "crane",
        scope: ["New builds", "Repair & refit", "Industrial capacity"],
      },
      {
        id: "boatbuilding",
        slug: "boatbuilding",
        domain: "BOATBUILDING.CITY",
        code: "REG 06",
        industryDomainId: "shipbuilding-production",
        category: "Industrial Products, Equipment & Manufacturing",
        description: "Boatbuilders, refit specialists and craft production.",
        shortDescription: "Boatbuilders, refit specialists and craft production.",
        icon: "ship",
        scope: ["Custom builds", "Refit specialists", "Composite & wood craft"],
      },
      {
        id: "engineering",
        slug: "engineering",
        domain: "ENGINEERING.CITY",
        code: "REG 07",
        industryDomainId: "engineering-design",
        category: "Industrial Products, Equipment & Manufacturing",
        description: "Naval architecture and marine engineering services.",
        shortDescription: "Naval architecture and marine engineering.",
        icon: "drafting",
        scope: ["Naval architecture", "Systems engineering", "Survey & classification liaison"],
      },
      {
        id: "charter",
        slug: "charter",
        domain: "CHARTER.CITY",
        code: "REG 08",
        industryDomainId: "vessel-operations",
        category: "Yachting, Charter & Maritime Lifestyle",
        description: "Charter operations across commercial and leisure fleets.",
        shortDescription: "Charter operations across commercial and leisure fleets.",
        icon: "sail",
        scope: ["Crewed & bareboat charter", "Commercial charter", "Fleet availability"],
      },
      {
        id: "marina",
        slug: "marina",
        domain: "MARINA.CITY",
        code: "REG 09",
        industryDomainId: "infrastructure",
        category: "Maritime Services, Ports, Marinas & Operations",
        description: "Berthing, marina services and waterfront infrastructure.",
        shortDescription: "Berthing, marina services and waterfront infrastructure.",
        icon: "dock",
        scope: ["Berth management", "Marina services", "Waterfront development"],
      },
      {
        id: "port",
        slug: "port",
        domain: "PORT.CITY",
        code: "REG 10",
        industryDomainId: "infrastructure",
        category: "Maritime Services, Ports, Marinas & Operations",
        description: "Ports, terminals and cargo operations.",
        shortDescription: "Ports, terminals and cargo operations.",
        icon: "gantry",
        scope: ["Terminal operations", "Agency services", "Cargo handling"],
      },
      {
        id: "fleetmanagement",
        slug: "fleetmanagement",
        domain: "FLEETMANAGEMENT.CITY",
        code: "REG 11",
        industryDomainId: "vessel-operations",
        category: "Maritime Services, Ports, Marinas & Operations",
        description: "Fleet management, crewing and vessel operations.",
        shortDescription: "Fleet management, crewing and vessel operations.",
        icon: "helm",
        scope: ["Technical management", "Crewing", "Vessel operations"],
      },
      {
        id: "marineai",
        slug: "marineai",
        domain: "MARINEAI.CITY",
        code: "REG 12",
        industryDomainId: "marine-technology",
        category: "Maritime Technology & AI Systems",
        description: "AI systems, agents and intelligence for maritime business.",
        shortDescription: "AI systems and intelligence for maritime business.",
        icon: "chip",
        scope: ["Industry AI agents", "Decision intelligence", "AI-native companies"],
      },
      {
        id: "digitaltwin",
        slug: "digitaltwin",
        domain: "DIGITALTWIN.CITY",
        code: "REG 13",
        industryDomainId: "marine-technology",
        category: "Maritime Technology & AI Systems",
        description: "Operational digital twins for vessels, ports and infrastructure.",
        shortDescription: "Operational digital twins for vessels and ports.",
        icon: "twin",
        scope: ["Vessel twins", "Port twins", "Asset lifecycle data"],
      },
      {
        id: "marinedata",
        slug: "marinedata",
        domain: "MARINEDATA.CITY",
        code: "REG 14",
        industryDomainId: "marine-technology",
        category: "Maritime Technology & AI Systems",
        description: "Maritime data services, feeds and analytics infrastructure.",
        shortDescription: "Maritime data services and analytics infrastructure.",
        icon: "database",
        scope: ["Data services", "Market intelligence", "Vessel & port data"],
      },
      {
        id: "autonomousvessel",
        slug: "autonomousvessel",
        domain: "AUTONOMOUSVESSEL.CITY",
        code: "REG 15",
        industryDomainId: "marine-technology",
        category: "Maritime Technology & AI Systems",
        description: "Autonomous and remotely operated vessels.",
        shortDescription: "Autonomous and remotely operated vessels.",
        icon: "radar",
        scope: ["Autonomous navigation", "Remote operations", "Testing & certification"],
      },
      {
        id: "marinecybersecurity",
        slug: "marinecybersecurity",
        domain: "MARINECYBERSECURITY.CITY",
        code: "REG 16",
        industryDomainId: "marine-technology",
        category: "Maritime Technology & AI Systems",
        description: "Cybersecurity for vessels, ports and maritime systems.",
        shortDescription: "Cybersecurity for vessels, ports and systems.",
        icon: "shield",
        scope: ["Vessel cyber defense", "Port systems security", "Compliance readiness"],
      },
      {
        id: "yachtfinance",
        slug: "yachtfinance",
        domain: "YACHTFINANCE.CITY",
        code: "REG 17",
        industryDomainId: "finance-legal",
        category: "Legal, Finance & Compliance",
        description: "Financing, leasing and capital structures for marine assets.",
        shortDescription: "Financing, leasing and capital structures.",
        icon: "chart",
        scope: ["Asset financing", "Leasing structures", "Capital introductions"],
      },
      {
        id: "insuranceops",
        slug: "insuranceops",
        domain: "INSURANCEOPS.CITY",
        code: "REG 18",
        industryDomainId: "finance-legal",
        category: "Legal, Finance & Compliance",
        description: "Marine insurance, P&I and risk operations.",
        shortDescription: "Marine insurance, P&I and risk operations.",
        icon: "lifebuoy",
        scope: ["Hull & machinery", "P&I services", "Claims support"],
      },
      {
        id: "marinelegal",
        slug: "marinelegal",
        domain: "MARINELEGAL.CITY",
        code: "REG 19",
        industryDomainId: "finance-legal",
        category: "Legal, Finance & Compliance",
        description: "Admiralty law, contracts and maritime compliance.",
        shortDescription: "Admiralty law, contracts and maritime compliance.",
        icon: "scales",
        scope: ["Admiralty & shipping law", "Contract advisory", "Regulatory compliance"],
      },
      {
        id: "offshore",
        slug: "offshore",
        domain: "OFFSHORE.CITY",
        code: "REG 20",
        industryDomainId: "offshore-subsea",
        category: "Offshore, Energy & Subsea",
        description: "Offshore energy, platforms and marine operations.",
        shortDescription: "Offshore energy, platforms and marine operations.",
        icon: "rig",
        scope: ["Offshore energy", "Platform services", "Marine operations"],
      },
      {
        id: "subsea",
        slug: "subsea",
        domain: "SUBSEA.CITY",
        code: "REG 21",
        industryDomainId: "offshore-subsea",
        category: "Offshore, Energy & Subsea",
        description: "Subsea engineering, survey and intervention.",
        shortDescription: "Subsea engineering, survey and intervention.",
        icon: "sonar",
        scope: ["Survey & inspection", "ROV intervention", "Subsea construction"],
      },
      {
        id: "marinelifestyle",
        slug: "marinelifestyle",
        domain: "MARINELIFESTYLE.CITY",
        code: "REG 22",
        industryDomainId: "lifestyle-hospitality",
        category: "Yachting, Charter & Maritime Lifestyle",
        description: "Marine lifestyle brands, experiences and waterfront culture.",
        shortDescription: "Marine lifestyle brands and waterfront culture.",
        icon: "sunrise",
        scope: ["Lifestyle brands", "Waterfront experiences", "Events & culture"],
      },
      {
        id: "marinehospitality",
        slug: "marinehospitality",
        domain: "MARINEHOSPITALITY.CITY",
        code: "REG 23",
        industryDomainId: "lifestyle-hospitality",
        category: "Real Estate & Hospitality",
        description: "Maritime hospitality, superyacht services and provisioning.",
        shortDescription: "Maritime hospitality, superyacht services.",
        icon: "flag",
        scope: ["Superyacht services", "Provisioning", "Crew hospitality"],
      },
      {
        id: "brokerage",
        slug: "brokerage",
        domain: "BROKERAGE.CITY",
        code: "REG 24",
        industryDomainId: "maritime-services",
        category: "Maritime Services, Ports, Marinas & Operations",
        description: "Commercial ship brokerage, cargo chartering, and vessel sale & purchase.",
        shortDescription: "Commercial ship brokerage and vessel S&P.",
        icon: "exchange",
        scope: ["Commercial S&P", "Cargo chartering", "Vessel valuation"],
      },
      {
        id: "propulsion",
        slug: "propulsion",
        domain: "PROPULSION.CITY",
        code: "REG 25",
        industryDomainId: "shipbuilding-production",
        category: "Industrial Products, Equipment & Manufacturing",
        description: "Marine diesel engines, electric propulsion, pod drives, and shaft alignment services.",
        shortDescription: "Marine propulsion, engines and drive systems.",
        icon: "anchor",
        scope: ["Marine engines & gen-sets", "Electric & hybrid drives", "Pod drives & shafting"],
      },
    ],
  },

  network: {
    eyebrow: "Business Ecosystem",
    headline: "THE BUSINESSES BEHIND THE INDUSTRY.",
    lead: "MarineWorld connects companies and their operational capabilities — what they build, operate, supply, finance and insure. Each profile is a structured business entity, ready for discovery, verification and AI-native interaction.",
    demoNotice: "Demonstration profiles — shown to illustrate registry structure. Live registry data is served through the platform data layer.",
    companies: [
      {
        id: "crest-group-materials",
        slug: "crest-group-materials",
        name: "Crest Group Materials",
        initials: "CG",
        recordType: "DEMONSTRATION",
        industry: "Advanced Marine Composites & Coatings",
        city: "BROKERAGE.CITY",
        cityIds: ["brokerage", "shipyard", "boatbuilding"],
        location: "Southampton, United Kingdom",
        country: "United Kingdom",
        region: "Western Europe",
        website: "https://crestgroupmaterials.com",
        status: "LIVE",
        verificationStatus: "verified",
        aiStatus: "twin",
        businessTwinStatus: "AVAILABLE",
        legalName: "Crest Group Materials Limited",
        tradingName: "Crest Group Materials",
        companyType: "Private Limited Company",
        foundedYear: "1998",
        employeeRange: "250 - 500 employees",
        operatingStatus: "ACTIVE",
        registrationCountry: "United Kingdom",
        registrationAuthority: "Companies House UK",
        registrationStatus: "ACTIVE / REGISTERED",
        registrationNumberPublic: true,
        registrationNumber: "UK-03892011",
        officialEmail: "corporate@crestgroupmaterials.com",
        officialLinkedIn: "https://linkedin.com/company/crest-group-materials",
        businessUnits: [
          "Advanced Composites Division",
          "Gelcoats & Resin Systems",
          "Technical Testing Labs"
        ],
        certifications: [
          { name: "DNV-GL Type Approval Certificate", issuer: "DNV Maritime", status: "VERIFIED", validity: "2028-12-31" },
          { name: "ISO 9001:2015 Quality Management", issuer: "BSI Group", status: "VERIFIED", validity: "2027-06-30" },
          { name: "ISO 14001:2015 Environmental Management", issuer: "BSI Group", status: "VERIFIED", validity: "2027-06-30" }
        ],
        dataSources: {
          legalIdentity: "PUBLIC REGISTRY",
          businessIdentity: "COMPANY PROVIDED",
          verificationStatus: "MARINEWORLD VERIFIED",
          classification: "SYSTEM GENERATED"
        },
        governanceStatus: "ACTIVE",
        identityStatus: "VERIFIED",
        securityStatus: "SECURED",
        verificationLevel: "ENTERPRISE",
        dataGovernanceStatus: "CONTROLLED",
        aiGovernanceStatus: "CONTROLLED",
        verificationDimensions: [
          { dimension: "Company Identity", status: "VERIFIED", source: "Companies House UK", date: "2026-01-15" },
          { dimension: "Business Information", status: "VERIFIED", source: "Sector City Registry", date: "2026-02-10" },
          { dimension: "Official Domain", status: "VERIFIED", source: "DNS & SSL Validation", date: "2026-02-12" },
          { dimension: "Corporate Information", status: "VERIFIED", source: "Public Filing Record", date: "2026-01-20" },
          { dimension: "Industry Classification", status: "VERIFIED", source: "MarineWorld Taxonomy", date: "2026-01-10" },
          { dimension: "Class Certifications", status: "VERIFIED", source: "DNV Maritime Registry", date: "2026-03-01" }
        ],
        securityCapabilities: [
          { name: "Account Security", enabled: true, status: "2FA & SSO Enforced" },
          { name: "Access Control", enabled: true, status: "Role-Based Access (RBAC)" },
          { name: "Session Security", enabled: true, status: "Encrypted Token Auth" },
          { name: "Data Protection", enabled: true, status: "TLS 1.3 & AES-256 at Rest" },
          { name: "Audit Logging", enabled: true, status: "Immutable Audit Ledger" }
        ],
        aiSources: [
          "Verified Corporate Identity Record",
          "DNV Type Approval Certifications",
          "Public Technical Data Sheets",
          "Official Sector Registry Filings"
        ],
        governanceEvents: [
          { event: "Company Identity Verified", date: "2026-01-15", status: "VERIFIED" },
          { event: "Enterprise Security Level Granted", date: "2026-02-01", status: "ACTIVE" },
          { event: "DNV Certification Audit Passed", date: "2026-03-01", status: "VERIFIED" },
          { event: "AI Data Boundary Policy Enforced", date: "2026-03-10", status: "CONTROLLED" }
        ],
        lastReviewedAt: "2026-08-01",
        shortDescription: "Specialist manufacturer and distributor of high-performance marine structural resins, carbon composite tooling, and foul-release hull coatings.",
        description: "Crest Group Materials supplies DNV-certified structural composites, gelcoats, and specialty resin systems to commercial shipyards and naval defense contractors across North Europe and the Mediterranean.",
        capabilities: [
          "Structural Resin Formulations",
          "DNV-GL Class Approval Compliance",
          "Carbon Composite Prepreg Systems",
          "Foul-Release Bio-Coating Supply",
          "OEM Technical Sourcing & RFQ Support"
        ],
        products: [
          "CrestCoat-900 High-Gloss Gelcoat System",
          "AeroMatrix Carbon Epoxy Prepreg T700",
          "UltraDeck Marine Teak Synthetic Resin"
        ],
        productsList: [
          {
            id: "prod-cg-01",
            slug: "crestcoat-900-marine-gelcoat",
            name: "CrestCoat-900 High-Gloss Marine Gelcoat",
            companyId: "crest-group-materials",
            companySlug: "crest-group-materials",
            shortDescription: "Isophthalic NPG marine gelcoat engineered for UV resistance and low styrene emission in superyacht mold construction.",
            description: "CrestCoat-900 is a premium-grade Isophthalic NPG marine spray gelcoat specifically formulated for high-durability marine applications. It displays exceptional osmosis resistance, gloss retention under intense ultraviolet exposure, and low styrene emissions compliant with EU Solvents Emissions Directives.",
            category: "Hull Coatings & Gelcoats",
            productType: "Isophthalic NPG Gelcoat",
            productCode: "CG-PROD-900",
            status: "ACTIVE",
            visibility: "PUBLIC",
            availability: "AVAILABLE",
            specifications: {
              "Class Approval": "DNV-GL Marine Certified",
              "Viscosity": "18,000 mPa.s at 25°C",
              "Gel Time": "18 - 22 mins",
              "Specific Gravity": "1.15 g/cm³",
              "Heat Deflection Temp": "88°C (HDT)",
              "Styrene Content": "< 32% (Low Emission)"
            },
            attributes: [
              { key: "viscosity", label: "Viscosity", value: 18000, unit: "mPa.s", type: "measurement", category: "Physical Properties" },
              { key: "gelTime", label: "Gel Time", value: "20 mins", type: "text", category: "Processing Parameters" },
              { key: "density", label: "Density", value: 1.15, unit: "g/cm³", type: "measurement", category: "Physical Properties" },
              { key: "color", label: "Standard Color", value: "Superyacht Pure White (RAL 9010)", type: "text", category: "Appearance" }
            ],
            certifications: [
              { name: "DNV Type Approval Certificate", issuer: "DNV Maritime", status: "VERIFIED", validity: "2028-12-31" },
              { name: "ISO 9001 Quality Management", issuer: "Lloyd's Register", status: "VERIFIED", validity: "2027-06-30" }
            ],
            documentRefs: [
              { title: "CrestCoat-900 Technical Data Sheet (TDS)", url: "#tds", type: "PDF", size: "1.2 MB" },
              { title: "Material Safety Data Sheet (MSDS / REACH)", url: "#msds", type: "PDF", size: "840 KB" },
              { title: "DNV Type Approval Statement", url: "#dnv", type: "PDF", size: "2.1 MB" }
            ]
          },
          {
            id: "prod-cg-02",
            slug: "aeromatrix-carbon-epoxy-t700",
            name: "AeroMatrix Carbon Epoxy Prepreg T700",
            companyId: "crest-group-materials",
            companySlug: "crest-group-materials",
            shortDescription: "High-modulus carbon fibre prepreg with toughened epoxy matrix for high-speed naval hulls and performance spars.",
            description: "AeroMatrix T700 combines Toray 12K high-tensile carbon fibre with a low-temperature curing toughened epoxy resin system. Developed for vacuum bag and autoclave processing in naval patrol craft, high-speed ferries, and performance racing yacht spars.",
            category: "Structural Composites",
            productType: "Carbon Fibre Prepreg",
            productCode: "CG-PROD-T700",
            status: "ACTIVE",
            visibility: "PUBLIC",
            availability: "AVAILABLE",
            specifications: {
              "Fibre Type": "Toray T700 12K Carbon",
              "Resin Content": "38% nominal weight",
              "Cure Cycle": "85°C to 120°C autoclave",
              "Tensile Modulus": "230 GPa",
              "Flexural Strength": "1,450 MPa"
            },
            attributes: [
              { key: "tensileModulus", label: "Tensile Modulus", value: 230, unit: "GPa", type: "measurement", category: "Mechanical Properties" },
              { key: "resinWeight", label: "Resin Content", value: 38, unit: "%", type: "measurement", category: "Composition" },
              { key: "cureTemp", label: "Cure Temperature", value: "120°C", type: "text", category: "Processing" }
            ],
            certifications: [
              { name: "ABS Naval Structural Approval", issuer: "American Bureau of Shipping", status: "VERIFIED", validity: "2028-09-15" }
            ],
            documentRefs: [
              { title: "AeroMatrix T700 Processing Guide", url: "#tds-t700", type: "PDF", size: "1.8 MB" }
            ]
          },
          {
            id: "prod-cg-03",
            slug: "ultradeck-synthetic-marine-resin",
            name: "UltraDeck Marine Teak Synthetic Resin",
            companyId: "crest-group-materials",
            companySlug: "crest-group-materials",
            shortDescription: "Zero-maintenance polyurethane synthetic decking compound simulating natural teak aesthetics with anti-slip rating.",
            description: "UltraDeck Marine is an eco-friendly composite decking resin designed to withstand marine salt spray, intense foot traffic, and UV radiation without oiling, sanding, or caulking degradation.",
            category: "Decking & Finishes",
            productType: "Polyurethane Deck Composite",
            productCode: "CG-PROD-UD300",
            status: "ACTIVE",
            visibility: "PUBLIC",
            availability: "ON REQUEST",
            specifications: {
              "Material Grade": "UV-Stabilized Polyurethane",
              "Slip Resistance": "DIN 51130 R11 Anti-Slip",
              "Thermal Expansion": "< 0.05 mm/m°C",
              "Shore Hardness": "75 Shore D"
            },
            attributes: [
              { key: "slipRating", label: "Slip Rating", value: "DIN R11", type: "text", category: "Safety & Performance" },
              { key: "maintenance", label: "Maintenance Requirement", value: "Zero Sanding / Washable", type: "text", category: "Lifecycle" }
            ],
            certifications: [
              { name: "IMO FTP Code Fire Retardance", issuer: "RINA Maritime", status: "VERIFIED", validity: "2027-11-20" }
            ],
            documentRefs: [
              { title: "UltraDeck Installation & Maintenance Sheet", url: "#tds-ud", type: "PDF", size: "1.1 MB" }
            ]
          }
        ],
        services: [
          "Composite Structural Testing & Class Labelling",
          "On-site Resin Application Quality Auditing",
          "Custom Formula Material Specifications"
        ],
        servicesList: [
          {
            id: "serv-cg-01",
            slug: "composite-structural-testing-labelling",
            name: "Composite Structural Testing & Class Labelling",
            companyId: "crest-group-materials",
            companySlug: "crest-group-materials",
            shortDescription: "Certified laboratory mechanical testing and DNV/ABS class qualification for composite laminates and sandwich panels.",
            description: "Crest Group operates an accredited materials testing laboratory providing destructive tensile, flexural, shear, and fatigue analysis on marine composite laminates. We prepare full class qualification documentation for DNV, ABS, and Lloyd's Register approval.",
            serviceType: "Laboratory & Certification Testing",
            category: "Composite Testing & Audit",
            status: "ACTIVE",
            visibility: "PUBLIC",
            availability: "AVAILABLE",
            serviceAreas: ["Global", "European Sector Hubs", "Middle East Shipyards"],
            capabilities: [
              "Instron Universal Mechanical Tensile Testing (ISO 527)",
              "Dynamic Mechanical Thermal Analysis (DMTA Tg Determination)",
              "Resin Burn-off Glass/Carbon Fibre Fraction Analysis",
              "DNV & ABS Class Witness Laboratory Certification"
            ],
            attributes: [
              { key: "leadTime", label: "Standard Turnaround", value: "5 - 7", unit: "business days", type: "measurement", category: "Performance" },
              { key: "testStandards", label: "Testing Standards", value: "ISO 527, ISO 14125, ASTM D3039", type: "text", category: "Compliance" },
              { key: "accreditation", label: "Lab Accreditation", value: "ISO/IEC 17025 Certified", type: "text", category: "Governance" }
            ],
            certifications: [
              { name: "ISO/IEC 17025 Laboratory Competence", issuer: "UKAS", status: "VERIFIED", validity: "2029-01-15" }
            ],
            documentRefs: [
              { title: "Laboratory Testing Capabilities & Rate Card", url: "#rates", type: "PDF", size: "1.4 MB" },
              { title: "Sample Preparation & Shipping Protocol", url: "#protocol", type: "PDF", size: "620 KB" }
            ]
          },
          {
            id: "serv-cg-02",
            slug: "onsite-resin-application-auditing",
            name: "On-site Resin Application Quality Auditing",
            companyId: "crest-group-materials",
            companySlug: "crest-group-materials",
            shortDescription: "On-site quality control, vacuum infusion monitoring, and cure thermography audits at shipyard build sites.",
            description: "Deployment of senior composite materials engineers to shipyard facilities for real-time resin infusion monitoring, thermal imaging during exotherm, resin-to-hardener stoichiometry validation, and void content ultrasonic non-destructive evaluation.",
            serviceType: "Quality Control & Auditing",
            category: "Technical Consultation",
            status: "ACTIVE",
            visibility: "PUBLIC",
            availability: "ON REQUEST",
            serviceAreas: ["Southampton Shipyard City", "Hamburg Naval Yard", "Genoa Superyacht Hub"],
            capabilities: [
              "FLIR Infrared Thermographic Cure Exotherm Tracking",
              "Ultrasonic NDT Laminate Void Content Scanning",
              "Styrene Emission & Environmental Monitoring",
              "Infusion Line Vacuum Integrity Pressure Testing"
            ],
            attributes: [
              { key: "deploymentTime", label: "Engineer Deployment", value: "24 - 48", unit: "hours notice", type: "measurement", category: "Operations" },
              { key: "auditStandard", label: "Audit Benchmark", value: "DNV-ST-F101 / ISO 12215-5", type: "text", category: "Standards" }
            ],
            certifications: [
              { name: "DNV Certified Composite Quality Inspector", issuer: "DNV Maritime", status: "VERIFIED", validity: "2028-05-30" }
            ],
            documentRefs: [
              { title: "Shipyard Audit Method Statement", url: "#method", type: "PDF", size: "980 KB" }
            ]
          },
          {
            id: "serv-cg-03",
            slug: "custom-formula-material-specifications",
            name: "Custom Formula Material Specifications & Formulation",
            companyId: "crest-group-materials",
            companySlug: "crest-group-materials",
            shortDescription: "Tailored gelcoat color matching, flame-retardant resin formulations, and specialized bio-based resin chemistry.",
            description: "R&D material engineering service for naval architects and boat builders requiring custom gelcoat color pigments, fire-smoke-toxicity (FST) compliant resin systems, or custom gel-time adjustments for extreme climatic temperatures.",
            serviceType: "Chemical R&D & Engineering",
            category: "Material Engineering",
            status: "ACTIVE",
            visibility: "PUBLIC",
            availability: "AVAILABLE",
            serviceAreas: ["Global R&D Centers"],
            capabilities: [
              "Spectrophotometer Color Matching (RAL, Pantone, Custom Yacht Shades)",
              "Fire Retardant Filler System Blending (IMO FTP Code Compliance)",
              "Viscosity & Gel-Time Customization for Tropical / Cold Climates"
            ],
            attributes: [
              { key: "minBatchSize", label: "Minimum Formulation Batch", value: "500", unit: "kg", type: "measurement", category: "Production" },
              { key: "sampleTime", label: "Lab Sample Delivery", value: "3 - 5", unit: "days", type: "measurement", category: "R&D" }
            ],
            documentRefs: [
              { title: "Custom Formulation Request Guide", url: "#formulation-guide", type: "PDF", size: "850 KB" }
            ]
          }
        ],
        offerings: [
          {
            id: "offering-cg-01",
            companyId: "crest-group-materials",
            name: "CrestCoat-900 High-Gloss Marine Gelcoat",
            type: "product",
            category: "Hull Coatings",
            shortDescription: "Isophthalic NPG marine gelcoat engineered for UV resistance and low styrene emission in superyacht mold construction.",
            status: "AVAILABLE",
            code: "CG-PROD-900",
            specifications: {
              "Class Approval": "DNV-GL Marine Certified",
              "Viscosity": "18,000 mPa.s at 25°C",
              "Gel Time": "18 - 22 mins",
            }
          },
          {
            id: "offering-cg-02",
            companyId: "crest-group-materials",
            name: "AeroMatrix Carbon Epoxy Prepreg T700",
            type: "product",
            category: "Structural Composites",
            shortDescription: "High-modulus carbon fibre prepreg with toughened epoxy matrix for high-speed naval hulls and performance spars.",
            status: "AVAILABLE",
            code: "CG-PROD-T700",
            specifications: {
              "Fibre Type": "Toray T700 12K Carbon",
              "Resin Content": "38% nominal weight",
              "Cure Cycle": "85°C to 120°C autoclave",
            }
          },
          {
            id: "offering-cg-03",
            companyId: "crest-group-materials",
            name: "Composite Structural Testing & Labelling",
            type: "service",
            category: "Technical Assurance",
            shortDescription: "Comprehensive mechanical testing (laminate burn-off, lap shear, flexural modulus) for shipyard compliance approval.",
            status: "ACTIVE",
            code: "CG-SERV-LAB",
            specifications: {
              "Standard": "ISO 527-4 / ASTM D3039",
              "Turnaround": "5 business days",
            }
          },
          {
            id: "offering-cg-04",
            companyId: "crest-group-materials",
            name: "OEM Technical Sourcing & RFQ Support",
            type: "capability",
            category: "Sourcing",
            shortDescription: "Direct API & RFQ integration with yard procurement systems for bulk resin delivery scheduling and batch COA verification.",
            status: "SPECIFICATION",
            code: "CG-CAP-RFQ",
          }
        ]
      },
      {
        id: "aster",
        slug: "aster-maritime-engineering",
        name: "Aster Maritime Engineering",
        initials: "AE",
        recordType: "DEMONSTRATION",
        industry: "Naval Architecture",
        city: "ENGINEERING.CITY",
        cityIds: ["engineering"],
        location: "Rotterdam, Netherlands",
        country: "Netherlands",
        region: "Western Europe",
        status: "LIVE",
        verificationStatus: "verified",
        aiStatus: "twin",
        businessTwinStatus: "AVAILABLE",
        legalName: "Aster Maritime Engineering B.V.",
        companyType: "Private Company (B.V.)",
        foundedYear: "2006",
        employeeRange: "50 - 100 employees",
        operatingStatus: "ACTIVE",
        registrationCountry: "Netherlands",
        registrationAuthority: "KVK Netherlands",
        registrationStatus: "ACTIVE / REGISTERED",
        officialEmail: "info@astermaritime.nl",
        shortDescription: "Naval architecture, vessel stability calculations, and class approval liaisons for commercial fleets.",
        capabilities: ["Naval architecture", "Refit management", "Class liaison"],
        offerings: [
          {
            id: "offering-ae-01",
            companyId: "aster",
            name: "Naval Architecture & Hull Line Optimization",
            type: "service",
            category: "Engineering",
            shortDescription: "CFD analysis and hull form hydrodynamic optimization for fuel efficient passage planning.",
            status: "ACTIVE",
            code: "AE-SERV-CFD"
          },
          {
            id: "offering-ae-02",
            companyId: "aster",
            name: "Shipyard Refit Management Package",
            type: "capability",
            category: "Refit",
            shortDescription: "End-to-end site supervision and class compliance verification during major dockyard refits.",
            status: "AVAILABLE",
            code: "AE-CAP-REFIT"
          }
        ]
      },
      {
        id: "blueharbour",
        slug: "blueharbour-shipyards",
        name: "BlueHarbour Shipyards",
        initials: "BH",
        recordType: "DEMONSTRATION",
        industry: "Shipbuilding & Repair",
        city: "SHIPYARD.CITY",
        cityIds: ["shipyard", "boatbuilding"],
        location: "Antalya, Türkiye",
        country: "Türkiye",
        region: "Mediterranean",
        status: "LIVE",
        verificationStatus: "verified",
        aiStatus: "ready",
        businessTwinStatus: "COMING_SOON",
        shortDescription: "State-of-the-art 120m drydock and steel fabrication yard for commercial motor yachts and patrol craft.",
        capabilities: ["New builds", "Steel fabrication", "Mega-yacht refit"],
        offerings: [
          {
            id: "offering-bh-01",
            companyId: "blueharbour",
            name: "120m Drydock Refit & Paint Enclosure",
            type: "service",
            category: "Shipyard Operations",
            shortDescription: "Climate-controlled drydock with 2,500T syncrolift capability for complete vessel overhaul.",
            status: "AVAILABLE",
            code: "BH-SERV-DOCK"
          }
        ]
      },
      {
        id: "meridian",
        slug: "meridian-charter-group",
        name: "Meridian Charter Group",
        initials: "MC",
        recordType: "DEMONSTRATION",
        industry: "Charter Operations",
        city: "CHARTER.CITY",
        cityIds: ["charter"],
        location: "Palma, Spain",
        country: "Spain",
        region: "Mediterranean",
        status: "LIVE",
        verificationStatus: "verified",
        aiStatus: "twin",
        businessTwinStatus: "AVAILABLE",
        shortDescription: "Premier crewed luxury charter fleet operator with Mediterranean and Caribbean seasonal routes.",
        capabilities: ["Crewed charter", "Fleet operations", "Mediterranean routes"],
        offerings: [
          {
            id: "offering-mc-01",
            companyId: "meridian",
            name: "50m+ Superyacht Charter Management",
            type: "service",
            category: "Charter Operations",
            shortDescription: "Full MYBA contract management, crew logistics, and itinerary customization.",
            status: "ACTIVE",
            code: "MC-SERV-MYBA"
          },
          {
            id: "offering-mc-02",
            companyId: "meridian",
            name: "MYBA E-Contract & Charter Fleet Reservation System",
            type: "product",
            category: "Charter Technology",
            shortDescription: "Digital fleet booking engine, MYBA contract automation, and real-time berth calendar.",
            status: "AVAILABLE",
            code: "MC-PROD-RES"
          }
        ]
      },
      {
        id: "nordlys",
        slug: "nordlys-subsea-systems",
        name: "Nordlys Subsea Systems",
        initials: "NS",
        recordType: "DEMONSTRATION",
        industry: "Subsea Services",
        city: "SUBSEA.CITY",
        cityIds: ["subsea", "offshore"],
        location: "Bergen, Norway",
        country: "Norway",
        region: "Northern Europe",
        status: "LIVE",
        verificationStatus: "review",
        aiStatus: "ready",
        businessTwinStatus: "NOT_CONFIGURED",
        shortDescription: "Deepwater ROV pipeline inspection and subsea infrastructure survey systems.",
        capabilities: ["ROV survey", "Intervention", "Subsea inspection"],
        offerings: [
          {
            id: "offering-ns-01",
            companyId: "nordlys",
            name: "Work-Class ROV Pipeline Inspection",
            type: "service",
            category: "Subsea Survey",
            shortDescription: "3,000m rated ROV spread equipped with multibeam bathymetry and cathodic protection testing.",
            status: "AVAILABLE",
            code: "NS-SERV-ROV"
          }
        ]
      },
      {
        id: "adriatic",
        slug: "adriatic-terminal-operations",
        name: "Adriatic Terminal Operations",
        initials: "AT",
        recordType: "DEMONSTRATION",
        industry: "Ports & Terminals",
        city: "PORT.CITY",
        cityIds: ["port"],
        location: "Trieste, Italy",
        country: "Italy",
        region: "Southern Europe",
        status: "LIVE",
        verificationStatus: "verified",
        aiStatus: "twin",
        businessTwinStatus: "AVAILABLE",
        shortDescription: "Deepwater container and ro-ro terminal management with direct rail intermodal links.",
        capabilities: ["Terminal operations", "Agency services", "Cargo handling"],
        offerings: [
          {
            id: "offering-at-01",
            companyId: "adriatic",
            name: "Automated Ro-Ro Cargo Terminal Services",
            type: "service",
            category: "Port Operations",
            shortDescription: "24/7 port agency, customs clearing, and automated heavy cargo marshalling.",
            status: "ACTIVE",
            code: "AT-SERV-RORO"
          }
        ]
      },
      {
        id: "kallisto",
        slug: "kallisto-marine-capital",
        name: "Kallisto Marine Capital",
        initials: "KC",
        recordType: "DEMONSTRATION",
        industry: "Marine Finance",
        city: "YACHTFINANCE.CITY",
        cityIds: ["yachtfinance", "insuranceops"],
        location: "Athens, Greece",
        country: "Greece",
        region: "Mediterranean",
        status: "LIVE",
        verificationStatus: "verified",
        aiStatus: "ready",
        businessTwinStatus: "COMING_SOON",
        shortDescription: "Institutional ship financing, leasing structures, and maritime insurance advisory.",
        capabilities: ["Asset financing", "Leasing structures", "Advisory"],
        offerings: [
          {
            id: "offering-kc-01",
            companyId: "kallisto",
            name: "Maritime Asset Leasing & Refinancing",
            type: "service",
            category: "Capital",
            shortDescription: "Structured marine mortgage loans and sale-and-leaseback facilities for commercial vessels.",
            status: "AVAILABLE",
            code: "KC-SERV-LEASE"
          }
        ]
      },
    ],
  },

  ai: {
    eyebrow: "AI-Native Business Layer",
    headline: "THE INDUSTRY, READY FOR AI.",
    lead: "On MarineWorld, AI is business infrastructure — not a chatbot window. Every company can operate an AI-native surface, grounded in its own verified information, connected to the industry network and built for real commercial interaction.",
    capabilities: [
      {
        id: "company-info",
        title: "Company Information",
        description: "Structured answers about identity, scope and capabilities.",
        icon: "building",
      },
      {
        id: "product-info",
        title: "Product Information",
        description: "Catalogue intelligence across marine products and parts.",
        icon: "cube",
      },
      {
        id: "specs",
        title: "Technical Specifications",
        description: "Specifications served directly from company-held data.",
        icon: "drafting",
      },
      {
        id: "discovery",
        title: "Service Discovery",
        description: "Find the right service, supplier or yard by capability.",
        icon: "compass",
      },
      {
        id: "inquiries",
        title: "Business Inquiries",
        description: "Inquiries received, qualified and answered around the clock.",
        icon: "connect",
      },
      {
        id: "rfq",
        title: "RFQs",
        description: "Structured requests routed to capable, verified suppliers.",
        icon: "doc",
      },
      {
        id: "navigation",
        title: "Industry Navigation",
        description: "Move across cities, regions and sectors with intent.",
        icon: "globe",
      },
      {
        id: "workflows",
        title: "Operational Workflows",
        description: "AI embedded in the operational flow of maritime business.",
        icon: "gauge",
      },
    ],
    twin: {
      eyebrow: "Company Digital Twin",
      headline: "EVERY COMPANY CAN HAVE A DIGITAL TWIN.",
      body: "A MarineWorld digital twin is the AI representation of a business — grounded in company-provided information and operational context. It speaks for the company, serves its data and handles interaction, while the company stays in control of what it knows and says. This is a platform capability that companies activate — not an assumption that every company already has one.",
      points: [
        "Grounded in verified, company-provided data",
        "Aware of operational context — capabilities, coverage, availability",
        "Connected to the industry network, not isolated in a chat window",
        "Built for business interaction: inquiries, RFQs, specifications",
      ],
      chain: [
        { id: "company", label: "Company", status: "Entity verified", icon: "building" },
        { id: "twin", label: "AI Twin", status: "Twin active — grounded in registry data", icon: "twin" },
        { id: "network", label: "Industry Network", status: "Connected across city registries", icon: "network" },
        { id: "interaction", label: "Business Interaction", status: "Inquiry · RFQ · Match · Specification", icon: "exchange" },
      ],
    },
  },

  regions: {
    eyebrow: "Global Industry Coverage",
    headline: "ONE MARITIME INDUSTRY. GLOBAL REACH.",
    lead: "MarineWorld is structured around the geography of the maritime industry itself — twelve regional registries that organize companies, cities and services where the industry actually operates.",
    note: "Regional registries are structural coverage — the taxonomy the platform is built on — not a claim of completed listings in every market.",
    items: [
      {
        id: "med",
        code: "R-01",
        name: "Mediterranean",
        x: 53.5,
        y: 24.5,
        description:
          "The yachting and refit heart of the industry — marinas, charter fleets, shipyards and a dense service economy along three continents.",
        focus: ["MARINA.CITY", "CHARTER.CITY", "SHIPYARD.CITY"],
      },
      {
        id: "southern-europe",
        code: "R-02",
        name: "Southern Europe",
        x: 49,
        y: 21,
        description:
          "Boatbuilding traditions, Adriatic refit clusters and Mediterranean gateway ports.",
        focus: ["BOATBUILDING.CITY", "ENGINEERING.CITY"],
      },
      {
        id: "western-europe",
        code: "R-03",
        name: "Western Europe",
        x: 45.5,
        y: 17,
        description:
          "Europe's commercial spine — major ports, marine engineering houses and maritime finance.",
        focus: ["PORT.CITY", "ENGINEERING.CITY", "MARINELEGAL.CITY"],
      },
      {
        id: "northern-europe",
        code: "R-04",
        name: "Northern Europe",
        x: 50,
        y: 12,
        description:
          "Advanced shipbuilding, offshore energy and maritime technology leadership.",
        focus: ["OFFSHORE.CITY", "AUTONOMOUSVESSEL.CITY"],
      },
      {
        id: "eastern-europe",
        code: "R-05",
        name: "Eastern Europe & Caucasus",
        x: 58.5,
        y: 17,
        description:
          "Black Sea shipbuilding, river-sea trade and emerging marine services.",
        focus: ["SHIPYARD.CITY", "MARINECOMMERCE.CITY"],
      },
      {
        id: "north-america",
        code: "R-06",
        name: "North America",
        x: 20,
        y: 18,
        description:
          "Coastal workboat industries, Great Lakes shipping and marine technology ventures.",
        focus: ["FLEETMANAGEMENT.CITY", "MARINEAI.CITY"],
      },
      {
        id: "central-south-america",
        code: "R-07",
        name: "Central & South America",
        x: 30,
        y: 42,
        description:
          "Growing port infrastructure, fisheries support and coastal trade corridors.",
        focus: ["PORT.CITY", "SUPPLYCHAIN.CITY"],
      },
      {
        id: "caribbean",
        code: "R-08",
        name: "Caribbean",
        x: 26,
        y: 29,
        description:
          "Charter seasons, superyacht service hubs and island marina networks.",
        focus: ["CHARTER.CITY", "MARINEHOSPITALITY.CITY"],
      },
      {
        id: "middle-east",
        code: "R-09",
        name: "Middle East",
        x: 61,
        y: 27,
        description:
          "Gulf mega-marinas, trade logistics and large-scale maritime development.",
        focus: ["MARINA.CITY", "YACHTSALES.CITY"],
      },
      {
        id: "asia",
        code: "R-10",
        name: "Asia",
        x: 72,
        y: 24,
        description:
          "The world's shipbuilding center and its busiest container corridors.",
        focus: ["SHIPYARD.CITY", "SUPPLYCHAIN.CITY", "PORT.CITY"],
      },
      {
        id: "africa",
        code: "R-11",
        name: "Africa",
        x: 51,
        y: 36,
        description:
          "Strategic shipping lanes, port growth and offshore energy frontiers.",
        focus: ["PORT.CITY", "OFFSHORE.CITY"],
      },
      {
        id: "pacific",
        code: "R-12",
        name: "Pacific Islands & Australasia",
        x: 84,
        y: 42,
        description:
          "Blue-economy leadership, expedition fleets and Pacific passage services.",
        focus: ["MARINELIFESTYLE.CITY", "FLEETMANAGEMENT.CITY"],
      },
    ],
  },

  workflow: {
    eyebrow: "Business Interaction",
    headline: "FROM DISCOVERY TO BUSINESS INTERACTION.",
    lead: "MarineWorld is built as an operational flow — moving the industry from fragmented searching into structured business interaction, one continuous path.",
    steps: [
      {
        id: "discover",
        index: "01",
        title: "Discover",
        description:
          "Search the industry by capability, product, service or city — across the full registry, not a single vendor list.",
        example: "Find refit yards in the Mediterranean",
        icon: "search",
      },
      {
        id: "identify",
        index: "02",
        title: "Identify",
        description:
          "Evaluate structured company profiles — verification status, operational scope and capabilities, side by side.",
        example: "Compare verified shipyards by capacity",
        icon: "scan",
      },
      {
        id: "connect",
        index: "03",
        title: "Connect",
        description:
          "Open a direct, authenticated channel to the business — company to company, buyer to supplier, owner to yard.",
        example: "Request introduction to a marine engineer",
        icon: "connect",
      },
      {
        id: "interact",
        index: "04",
        title: "Interact",
        description:
          "Engage the company's AI-native surface for specifications, availability and immediate, grounded answers.",
        example: "Ask a company's AI twin for technical specs",
        icon: "spark",
      },
      {
        id: "request",
        index: "05",
        title: "Request",
        description:
          "Issue structured RFQs and service requests that arrive complete — scope, context and requirements attached.",
        example: "Publish an RFQ to qualified suppliers",
        icon: "doc",
      },
      {
        id: "collaborate",
        index: "06",
        title: "Collaborate",
        description:
          "Move into delivery with shared operational context between businesses — projects, not lost email threads.",
        example: "Coordinate a refit project across suppliers",
        icon: "crew",
      },
    ],
  },

  governance: {
    eyebrow: "Trust & Governance",
    headline: "GOVERNANCE BUILT FOR INDUSTRY.",
    lead: "MarineWorld operates as a governed business ecosystem. Trust is not a badge you buy — it is a structure: identities are issued, verified and auditable, and AI operates under defined rules.",
    pillars: [
      {
        id: "identity",
        title: "Identity",
        description: "Every business entity holds a structured corporate identity issued within the platform.",
        icon: "key",
      },
      {
        id: "verification",
        title: "Verification",
        description: "Company claims pass through verification before they appear as trust signals in the registry.",
        icon: "scan",
      },
      {
        id: "security",
        title: "Security",
        description: "Access to company data follows authorization boundaries — public registry, private operations.",
        icon: "lock",
      },
      {
        id: "data",
        title: "Operational Data",
        description: "Companies control what operational data is shared, with whom, and for which interactions.",
        icon: "database",
      },
      {
        id: "ai-governance",
        title: "AI Governance",
        description: "AI twins answer from company-held, company-approved information — not from the open web.",
        icon: "sliders",
      },
    ],
    note: "MarineWorld is an enterprise ecosystem: factual governance, explicit verification states and no inflated claims.",
  },

  cta: {
    eyebrow: "Enter MarineWorld",
    headline: "ENTER THE MARITIME BUSINESS CITY.",
    body: "Explore companies, capabilities, services and industry intelligence across the global marine and maritime ecosystem — one intelligent digital environment.",
    primary: "Explore MarineWorld",
    secondary: "Register Your Business",
  },

  footer: {
    blurb:
      "The AI-native business city for the global marine and maritime ecosystem. Companies, products, services, ports, shipyards, marinas and intelligence — connected as one industry infrastructure.",
    infrastructure: "Powered by DigiOne infrastructure.",
    columns: [
      {
        title: "Explore",
        links: [
          { label: "City Explorer", href: "#explorer" },
          { label: "Industry Intelligence", href: "#intelligence" },
          { label: "Global Coverage", href: "#global" },
          { label: "Business Workflow", href: "#workflow" },
        ],
      },
      {
        title: "Business",
        links: [
          { label: "Companies", href: "#network" },
          { label: "Register Your Business", href: "#enter" },
          { label: "Procurement", href: "#explorer" },
          { label: "Shipyards & Yards", href: "#explorer" },
        ],
      },
      {
        title: "AI",
        links: [
          { label: "AI-Native Layer", href: "#ai" },
          { label: "Company Digital Twin", href: "#ai" },
          { label: "MARINEAI.CITY", href: "#explorer" },
          { label: "AI Governance", href: "#governance" },
        ],
      },
      {
        title: "Network",
        links: [
          { label: "Mediterranean", href: "#global" },
          { label: "Northern Europe", href: "#global" },
          { label: "Asia", href: "#global" },
          { label: "All Regions", href: "#global" },
        ],
      },
      {
        title: "Company",
        links: [
          { label: "About", href: "#governance" },
          { label: "Sector City Framework", href: "#intelligence" },
          { label: "Contact", href: "#enter" },
        ],
      },
      {
        title: "Legal",
        links: [
          { label: "Terms", href: "#" },
          { label: "Privacy", href: "#" },
          { label: "Security", href: "#" },
          { label: "Cookie Policy", href: "#" },
        ],
      },
    ],
    legalLine: "A DigiOne Sector City. DigiOne → Sector City Framework → MarineWorld.City",
  },
};
