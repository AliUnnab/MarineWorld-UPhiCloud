/**
 * Firestore Database Migration & Seeding Script for MarineWorld.City
 *
 * Uses firebase-admin SDK to seed all canonical mock/static data
 * into live Firestore collections in batch.
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// 1. Locate service account credentials
function getServiceAccountPath(): string | null {
  const candidates = [
    path.join(rootDir, "serviceAccountKey.json"),
    path.join(rootDir, "firebase-service-account.json"),
    process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? path.resolve(rootDir, process.env.GOOGLE_APPLICATION_CREDENTIALS)
      : null,
  ].filter(Boolean) as string[];

  // Also check for any file matching *firebase-adminsdk*.json in root
  try {
    const files = fs.readdirSync(rootDir);
    const adminSdkFile = files.find((f) => f.includes("firebase-adminsdk") && f.endsWith(".json"));
    if (adminSdkFile) {
      candidates.unshift(path.join(rootDir, adminSdkFile));
    }
  } catch {}

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

// 2. Initialize Firebase Admin
const keyPath = getServiceAccountPath();

if (!keyPath) {
  console.error("❌ [Seed Error] No Firebase Service Account key found!");
  console.error("Please place your 'serviceAccountKey.json' file in the root directory:");
  console.error(`  ${path.join(rootDir, "serviceAccountKey.json")}\n`);
  process.exit(1);
}

console.log(`🔑 Using Service Account Key: ${keyPath}`);
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id || process.env.VITE_FIREBASE_PROJECT_ID || "uphi-marineworld",
  });
}

const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

// Import Project Data
import { marineSector } from "../src/lib/sectors/marine";
import { marineDomains } from "../src/lib/sectors/marine-domains";
import { generateScaleMaritimeCompanies } from "../src/lib/services/scaleCompanyGenerator";

// Canonical Seed Data
const DEFAULT_PLATFORM = {
  id: "marineworld",
  code: "PLATFORM-MW",
  name: "marineworld",
  displayName: "MarineWorld.City",
  canonicalDomain: "marineworld.city",
  status: "ACTIVE",
  defaultLanguage: "en",
  supportedSectors: ["marine"],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const DEFAULT_SECTOR = {
  id: "marine",
  platformId: "marineworld",
  code: "SECTOR-MAR",
  slug: "marine",
  name: "Marine & Maritime",
  displayName: "Marine Industry Sector",
  description: "Global Maritime & Ocean Economy Sector",
  status: "ACTIVE",
  icon: "anchor",
  taxonomyVersion: "v1.0",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const INITIAL_MEMBERSHIPS = [
  {
    userId: "usr-owner-001",
    companyId: "argento-marine",
    role: "OWNER",
    status: "ACTIVE",
    displayName: "Marco Bellini",
    businessEmail: "m.bellini@argentomarine.it",
    jobTitle: "Managing Director & Founder",
    department: "Executive",
    createdAt: "2026-01-15T09:30:00.000Z",
    updatedAt: new Date().toISOString(),
  },
  {
    userId: "usr-admin-002",
    companyId: "argento-marine",
    role: "ADMIN",
    status: "ACTIVE",
    displayName: "Elena Rostova",
    businessEmail: "e.rostova@argentomarine.it",
    jobTitle: "Head of Operations",
    department: "Operations",
    createdAt: "2026-02-01T11:15:00.000Z",
    updatedAt: new Date().toISOString(),
  },
  {
    userId: "usr-comm-003",
    companyId: "argento-marine",
    role: "COMMERCIAL",
    status: "ACTIVE",
    displayName: "David Van Der Bilt",
    businessEmail: "d.vanderbilt@argentomarine.it",
    jobTitle: "Commercial & Procurement Lead",
    department: "Commercial",
    createdAt: "2026-03-10T14:20:00.000Z",
    updatedAt: new Date().toISOString(),
  },
  {
    userId: "usr-tech-004",
    companyId: "argento-marine",
    role: "TECHNICAL",
    status: "ACTIVE",
    displayName: "Ing. Matteo Rossi",
    businessEmail: "m.rossi@argentomarine.it",
    jobTitle: "Chief Naval Architect",
    department: "Technical & Engineering",
    createdAt: "2026-03-18T08:45:00.000Z",
    updatedAt: new Date().toISOString(),
  },
  {
    userId: "usr-multi-owner-003",
    companyId: "crest-group-materials",
    role: "OWNER",
    status: "ACTIVE",
    displayName: "Arthur Pendelton",
    businessEmail: "a.pendelton@crestgroup.com",
    jobTitle: "Executive Chairman",
    department: "Executive",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_NODES = [
  {
    id: "node-cg-hq",
    companyId: "crest-group-materials",
    name: "Crest Global Composite Headquarters",
    city: "Southampton",
    country: "United Kingdom",
    address: "Oceanographic Technology Park, Quay Road, Southampton SO14 3ZH",
    operationType: "HEADQUARTERS",
    description: "Primary engineering, administrative, and R&D headquarters for advanced marine composite systems.",
    subdomain: "hq.crestgroup.marineworld.city",
    contactEmail: "hq@crestgroup.com",
    contactPhone: "+44 23 8090 1200",
    status: "VERIFIED",
    isHeadquarters: true,
  },
  {
    id: "node-cg-rt",
    companyId: "crest-group-materials",
    name: "Crest Marine Logistics & Distribution Hub",
    city: "Rotterdam",
    country: "Netherlands",
    address: "Waalthaven Pier 4, 3089 JK Rotterdam",
    operationType: "LOGISTICS_CENTER",
    description: "European distribution node for fast delivery of structural composite panels and resins.",
    subdomain: "rotterdam.crestgroup.marineworld.city",
    contactEmail: "rotterdam@crestgroup.com",
    status: "VERIFIED",
  },
  {
    id: "node-cg-hb",
    companyId: "crest-group-materials",
    name: "Crest Composites Advanced Manufacturing Facility",
    city: "Hamburg",
    country: "Germany",
    address: "Kuhwerder Hafen 12, 20457 Hamburg",
    operationType: "PRODUCTION_FACILITY",
    description: "High-precision autoclaves and resin-infusion manufacturing lines for naval structural parts.",
    subdomain: "hamburg.crestgroup.marineworld.city",
    contactEmail: "hamburg@crestgroup.com",
    status: "VERIFIED",
  },
];

const INITIAL_PRODUCTS = [
  {
    id: "cg-prod-900",
    companyId: "crest-group-materials",
    name: "CrestCoat-900 High-Gloss Marine Gelcoat",
    slug: "crestcoat-900-high-gloss-gelcoat",
    category: "Materials & Composites",
    shortDescription: "Ultra-durable isophthalic NPG marine gelcoat engineered for mega-yacht hulls.",
    description: "Premium marine grade isophthalic gelcoat providing exceptional UV resistance, water blistering protection, and mirror finish.",
    status: "ACTIVE",
    priceRange: "Commercial RFQ / Bulk Volume Pricing",
    certifications: ["DNV-GL Type Approval", "Lloyd's Register Marine Spec"],
    featured: true,
    tags: ["Gelcoat", "Composite", "Hull Coating", "Resin"],
    specifications: [
      { label: "Specific Gravity", value: "1.18 g/cm³" },
      { label: "Gel Time at 25°C", value: "12 - 18 minutes" },
      { label: "Barcol Hardness", value: "42" },
      { label: "Tensile Strength", value: "72 MPa" },
    ],
    coverImage: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "cg-prod-901",
    companyId: "crest-group-materials",
    name: "AeroCore Carbon Hybrid Structural Panels",
    slug: "aerocore-carbon-hybrid-panels",
    category: "Composite Engineering",
    shortDescription: "Ultra-lightweight vacuum infused carbon-epoxy panels for superstructure and bulkhead construction.",
    description: "Pre-cured carbon sandwich panels offering superior stiffness-to-weight ratio for naval and luxury vessel superstructures.",
    status: "ACTIVE",
    priceRange: "$420 - $1,250 / m²",
    certifications: ["RINA Class Structural Certificate"],
    featured: true,
    tags: ["Carbon Fiber", "Bulkhead", "Lightweight", "Superstructure"],
    specifications: [
      { label: "Core Density", value: "80 kg/m³ Corecell" },
      { label: "Flexural Modulus", value: "32 GPa" },
      { label: "Temperature Resistance", value: "-40°C to +110°C" },
    ],
    coverImage: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

const INITIAL_SERVICES = [
  {
    id: "serv-argento-01",
    companyId: "argento-marine",
    name: "Technical Vessel Provisioning & Bonded Logistics",
    slug: "technical-vessel-provisioning",
    category: "Logistics & Supply",
    shortDescription: "End-to-end bonded spare parts, bunkering coordination, and shipyard logistics across the Mediterranean.",
    description: "24/7 technical port and anchorage provisioning service for commercial vessels and mega yachts across Aegean and Mediterranean waters.",
    status: "ACTIVE",
    coverageScope: "Mediterranean & Aegean Seas",
    certifications: ["ISO 9001:2015", "AEO Customs Certified"],
    featured: true,
    tags: ["Logistics", "Provisioning", "Customs", "Port Support"],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

const INITIAL_INQUIRIES = [
  {
    id: "inq-cg-101",
    companyId: "crest-group-materials",
    companySlug: "crest-group-materials",
    companyName: "Crest Group Materials",
    requesterId: "usr-southampton-01",
    requesterName: "Alexander Wright",
    requesterEmail: "a.wright@solentmaritime.co.uk",
    requesterCompany: "Solent Maritime Engineering",
    productId: "cg-prod-900",
    productSlug: "crestcoat-900-high-gloss-gelcoat",
    productName: "CrestCoat-900 High-Gloss Marine Gelcoat",
    sectorId: "marine",
    sectorCityId: "southampton",
    subject: "Bulk RFQ & Technical Datasheet Request for 2,500kg Gelcoat",
    message: "We are preparing a 55m catamaran hull molding schedule for Q4. We require DNV-GL batch certification documents, technical spray viscosity curves, and volume pricing for 2,500kg delivery to Southampton Docks.",
    status: "NEW",
    priority: "HIGH",
    source: "PRODUCT",
    contactMethod: "Email",
    assignedTo: "Technical Sales Team",
    inquiryKind: "INQUIRY",
    offeringReference: "cg-prod-900",
    quantityOrScope: "2,500 kg",
    deliveryLocation: "Southampton Docks, UK",
    messages: [
      {
        id: "msg-101-1",
        senderId: "usr-southampton-01",
        senderName: "Alexander Wright",
        senderRole: "REQUESTER",
        body: "We are preparing a 55m catamaran hull molding schedule for Q4. We require DNV-GL batch certification documents, technical spray viscosity curves, and volume pricing for 2,500kg delivery to Southampton Docks.",
        createdAt: "2026-08-14T14:30:00Z",
      },
    ],
    createdAt: "2026-08-14T14:30:00Z",
    updatedAt: "2026-08-14T14:30:00Z",
  },
];

const CANONICAL_ECOSYSTEM_ORGS = [
  {
    id: "maritime-association",
    name: "World Maritime Association",
    legalName: "World Maritime Trade & Shipping Association AISBL",
    slug: "maritime-association",
    organizationType: "ASSOCIATION",
    businessId: "MW-BUS-WMA-GLOBAL",
    verificationStatus: "VERIFIED",
    status: "HUB_ACTIVE",
    hubStatus: "ACTIVE",
    activationCode: "MW-ORG-WMA-2026",
    enrollmentCode: "MW-WMA-8F42",
    ecosystemHubId: "hub-maritime-association",
    country: "Netherlands",
    officialWebsite: "https://worldmaritimeassociation.org",
    primaryContact: "Secretariat General",
    principalAuthorityUserId: "usr-wma-sec-001",
    principalAuthorityName: "Capt. Hendrik Van Der Meer",
    principalAuthorityRole: "Secretary General",
    officialEmailDomain: "worldmaritimeassociation.org",
    officialContactEmail: "registry@worldmaritimeassociation.org",
    discountCode: "WMA-MEMBERS-15",
    discountPercentage: 15,
    totalMembersCount: 1420,
    activatedMembersCount: 680,
    verifiedMembersCount: 540,
    activeSectorCitiesCount: 38,
    memberCompanyIds: ["argento-marine", "crest-group-materials"],
    aboutDescription: "The World Maritime Association represents commercial shipping operators, marine tech developers, and naval shipyards worldwide.",
    capabilities: ["Maritime Advocacy", "Technical Standardization", "IMO Working Groups", "Global Chamber Coordination"],
    knowledgeArticlesCount: 48,
    publicationsCount: 16,
  },
  {
    id: "rotterdam-chamber",
    name: "Rotterdam Maritime Chamber of Commerce",
    legalName: "Stichting Havenbedrijf en Maritieme Kamer Rotterdam",
    slug: "rotterdam-chamber",
    organizationType: "CHAMBER",
    businessId: "MW-BUS-RMCC-NL",
    verificationStatus: "VERIFIED",
    status: "HUB_ACTIVE",
    hubStatus: "ACTIVE",
    activationCode: "MW-ORG-RMC-2026",
    enrollmentCode: "MW-RMC-3B19",
    ecosystemHubId: "hub-rotterdam-chamber",
    country: "Netherlands",
    officialWebsite: "https://rotterdammaritimechamber.nl",
    primaryContact: "Director of Trade Affairs",
    principalAuthorityUserId: "usr-rmc-dir-002",
    principalAuthorityName: "Annelies De Groot",
    principalAuthorityRole: "Executive Director",
    officialEmailDomain: "rotterdammaritimechamber.nl",
    officialContactEmail: "corporate@rotterdammaritimechamber.nl",
    discountCode: "RMC-MEMBER-20",
    discountPercentage: 20,
    totalMembersCount: 890,
    activatedMembersCount: 420,
    verifiedMembersCount: 380,
    activeSectorCitiesCount: 14,
    memberCompanyIds: ["crest-group-materials"],
    aboutDescription: "Regional maritime chamber fostering European logistics, port automation, and shipbuilding partnerships.",
    capabilities: ["Port Trade Missions", "Customs Advisory", "Bunkering Regulations", "Maritime Cluster Growth"],
    knowledgeArticlesCount: 32,
    publicationsCount: 12,
  },
];

async function seedFirestore() {
  console.log("🚀 Starting Firestore Seeding...\n");

  const batch = db.batch();
  let writeCount = 0;

  // 1. Seed Platform & Sector
  console.log("📦 Seeding Platform & Sector Configuration...");
  batch.set(db.collection("platforms").doc(DEFAULT_PLATFORM.id), DEFAULT_PLATFORM, { merge: true });
  batch.set(db.collection("sectors").doc(DEFAULT_SECTOR.id), DEFAULT_SECTOR, { merge: true });
  writeCount += 2;

  // 2. Seed Industry Domains (8 master taxonomy domains)
  console.log(`🌐 Seeding ${marineDomains.length} Industry Domains...`);
  for (const domain of marineDomains) {
    batch.set(db.collection("industryDomains").doc(domain.id), domain, { merge: true });
    batch.set(db.collection("sectors").doc(DEFAULT_SECTOR.id).collection("domains").doc(domain.id), domain, { merge: true });
    writeCount += 2;
  }

  // 3. Seed Sector Cities (82 cities)
  const cities = marineSector.explorer?.cities || [];
  console.log(`🏙️  Seeding ${cities.length} Sector Cities...`);
  for (const city of cities) {
    const cityDoc = {
      ...city,
      sectorId: DEFAULT_SECTOR.id,
      updatedAt: new Date().toISOString(),
    };
    batch.set(db.collection("sectorCities").doc(city.id), cityDoc, { merge: true });
    batch.set(db.collection("sectors").doc(DEFAULT_SECTOR.id).collection("cities").doc(city.id), cityDoc, { merge: true });
    writeCount += 2;
  }

  // 4. Seed Ecosystem Organizations
  console.log(`🏛️  Seeding ${CANONICAL_ECOSYSTEM_ORGS.length} Ecosystem Organizations...`);
  for (const org of CANONICAL_ECOSYSTEM_ORGS) {
    batch.set(db.collection("ecosystemOrganizations").doc(org.id), org, { merge: true });
    writeCount++;
  }

  // 5. Seed Inquiries & RFQs
  console.log(`📬 Seeding ${INITIAL_INQUIRIES.length} Initial Inquiries...`);
  for (const inq of INITIAL_INQUIRIES) {
    batch.set(db.collection("inquiries").doc(inq.id), inq, { merge: true });
    writeCount++;
  }

  // Commit Initial Core Batch
  await batch.commit();
  console.log(`✅ Core Batch committed (${writeCount} documents)\n`);

  // 6. Seed Companies & Subcollections (Batched in chunks of 400)
  const generatedCompanies = generateScaleMaritimeCompanies(marineSector);
  console.log(`🏢 Seeding ${generatedCompanies.length} Canonical & Scale Maritime Companies...`);

  let companyChunkBatch = db.batch();
  let chunkCount = 0;
  let totalCompaniesSeeded = 0;

  for (const comp of generatedCompanies) {
    const compId = comp.slug || comp.id;
    const compRef = db.collection("companies").doc(compId);
    const compPayload = {
      ...comp,
      id: compId,
      updatedAt: new Date().toISOString(),
      createdAt: (comp as any).createdAt || new Date().toISOString(),
    };

    companyChunkBatch.set(compRef, compPayload, { merge: true });
    chunkCount++;
    totalCompaniesSeeded++;

    if (chunkCount >= 400) {
      await companyChunkBatch.commit();
      console.log(`   ↳ Committed batch chunk: ${totalCompaniesSeeded} / ${generatedCompanies.length} companies`);
      companyChunkBatch = db.batch();
      chunkCount = 0;
    }
  }

  if (chunkCount > 0) {
    await companyChunkBatch.commit();
    console.log(`   ↳ Committed batch chunk: ${totalCompaniesSeeded} / ${generatedCompanies.length} companies`);
  }

  // 7. Seed Subcollections for Canonical Key Companies (Products, Services, Nodes, Members)
  console.log("\n📦 Seeding Subcollections for Primary Anchor Companies...");
  const subBatch = db.batch();

  // Products & Services & Offerings
  for (const p of INITIAL_PRODUCTS) {
    const pRef = db.collection("companies").doc(p.companyId).collection("products").doc(p.id);
    const offRef = db.collection("companies").doc(p.companyId).collection("offerings").doc(p.id);
    subBatch.set(pRef, p, { merge: true });
    subBatch.set(offRef, { ...p, type: "product", status: "ACTIVE" }, { merge: true });
  }

  for (const s of INITIAL_SERVICES) {
    const sRef = db.collection("companies").doc(s.companyId).collection("services").doc(s.id);
    const offRef = db.collection("companies").doc(s.companyId).collection("offerings").doc(s.id);
    subBatch.set(sRef, s, { merge: true });
    subBatch.set(offRef, { ...s, type: "service", status: "ACTIVE" }, { merge: true });
  }

  // Initial Metrics & Billing Records
  for (const compId of ["argento-marine", "crest-group-materials"]) {
    const metricRef = db.collection("companies").doc(compId).collection("metrics").doc("summary");
    subBatch.set(metricRef, {
      companyId: compId,
      profileViews: 1420,
      productViews: 860,
      serviceViews: 540,
      inquiriesCount: 18,
      lastUpdated: new Date().toISOString(),
    }, { merge: true });

    const auditRef = db.collection("companies").doc(compId).collection("auditEvents").doc("init-audit");
    subBatch.set(auditRef, {
      id: "init-audit",
      companyId: compId,
      action: "COMPANY_INITIALIZED",
      actor: "system",
      timestamp: new Date().toISOString(),
      details: "Sovereign company profile provisioned in Firestore.",
    }, { merge: true });
  }

  // Company Nodes
  for (const n of INITIAL_NODES) {
    const nRef = db.collection("companies").doc(n.companyId).collection("nodes").doc(n.id);
    subBatch.set(nRef, n, { merge: true });
  }

  // Company Memberships
  for (const m of INITIAL_MEMBERSHIPS) {
    const mRef = db.collection("companies").doc(m.companyId).collection("members").doc(m.userId);
    subBatch.set(mRef, m, { merge: true });

    const userMemRef = db.collection("users").doc(m.userId).collection("memberships").doc(m.companyId);
    subBatch.set(userMemRef, {
      companyId: m.companyId,
      userId: m.userId,
      role: m.role,
      status: m.status,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }

  // 8. Seed Company Contacts
  for (const compId of ["argento-marine", "crest-group-materials"]) {
    const contactRef = db.collection("companies").doc(compId).collection("contacts").doc("package");
    subBatch.set(contactRef, {
      companyId: compId,
      updatedAt: new Date().toISOString(),
      generalContacts: {
        officialEmail: compId === "argento-marine" ? "corporate@argentomarine.com" : "corporate@crestgroupmaterials.com",
        phoneHq: compId === "argento-marine" ? "+90 252 645 1900" : "+44 23 8090 1200",
        officialWebsite: compId === "argento-marine" ? "https://argentomarine.com" : "https://crestgroupmaterials.com",
        address: compId === "argento-marine" ? "Göcek, Türkiye" : "Southampton, United Kingdom",
      },
      teamMembers: [
        {
          name: compId === "argento-marine" ? "Marco Bellini" : "Arthur Pendelton",
          role: "Managing Director",
          department: "Executive",
          email: compId === "argento-marine" ? "m.bellini@argentomarine.it" : "a.pendelton@crestgroup.com",
        },
      ],
      eTradeNodes: [],
      socialChannels: [],
    }, { merge: true });
  }

  // 9. Seed Membership Tiers
  const tiers = [
    { id: "tier_standard", name: "Standard Member", code: "STANDARD", priceMonthly: 0, status: "ACTIVE" },
    { id: "tier_enterprise", name: "Enterprise Flagship", code: "ENTERPRISE", priceMonthly: 499, status: "ACTIVE" },
    { id: "tier_sovereign", name: "Sovereign Landmark Anchor", code: "SOVEREIGN", priceMonthly: 1999, status: "ACTIVE" },
  ];
  for (const t of tiers) {
    const tRef = db.collection("membershipTiers").doc(t.id);
    subBatch.set(tRef, t, { merge: true });
  }

  // 10. Seed Governance Policies
  const policies = [
    { id: "pol_identity", title: "Corporate Identity Standard", domain: "IDENTITY", version: "1.0", status: "ENFORCED" },
    { id: "pol_data_boundary", title: "Company Brain Data Boundary Policy", domain: "AI_GOVERNANCE", version: "1.0", status: "ENFORCED" },
    { id: "pol_trade_integrity", title: "Global RFQ & Trade Integrity Policy", domain: "TRADE", version: "1.0", status: "ENFORCED" },
  ];
  for (const pol of policies) {
    const polRef = db.collection("governancePolicies").doc(pol.id);
    subBatch.set(polRef, pol, { merge: true });
  }

  await subBatch.commit();
  console.log("✅ Company Subcollections, Contacts, Membership Tiers, and Governance Policies committed!");


  console.log("\n🎉 Firestore database successfully populated with all project datasets!");
}

seedFirestore()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seeding failed with error:", err);
    process.exit(1);
  });
