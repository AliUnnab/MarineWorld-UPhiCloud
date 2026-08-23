/**
 * Stage 10.9 — Canonical Migration Manifest & Pre-Production Approval Gate
 * 
 * THIS FILE DEFINES THE READ-ONLY MIGRATION CONTRACT FOR STAGE 10.9.
 * NO PRODUCTION WRITE / MUTATION IS PERMITTED.
 */

export interface MigrationManifestItem {
  id: string;
  sourceCollection: string;
  sourceId: string;
  sourceType: string;

  targetCollection: string;
  targetId: string;
  targetType: string;

  companyId?: string;
  platformId?: string;
  sectorId?: string;
  sectorCityId?: string;

  action: "NO_CHANGE" | "MAP" | "REVIEW" | "BLOCK";
  confidence: number;
  reason: string;

  canonicalDomain?: string;
  schemaOrgId?: string;

  dependencies: string[];
  validationStatus: "VALIDATED" | "PENDING" | "FAILED";
  fingerprint: string;
}

export interface DomainManifestItem {
  hostname: string;
  entityType: "PLATFORM" | "SECTOR" | "SECTOR_CITY" | "COMPANY";
  entityId: string;
  isCanonical: boolean;
  isActive: boolean;
  schemaOrgId: string;
  targetEntity: string;
  companyId?: string;
}

export interface PreMigrationSnapshotPlan {
  timestamp: string;
  snapshotScope: string[];
  requirements: string[];
  status: "REQUIRED_BEFORE_EXECUTION";
}

export interface RollbackPlan {
  strategy: "RESTORE_SNAPSHOT";
  triggers: string[];
  status: "ARMED";
}

export interface PostMigrationValidationPlan {
  checks: string[];
  status: "DEFINED";
}

export class ProductionWriteGuardError extends Error {
  constructor(message: string) {
    super(`PRODUCTION WRITE GUARD BREACH: ${message}`);
    this.name = "ProductionWriteGuardError";
  }
}

/**
 * Production Write Guard — Guarantees test/runtime isolation during Stage 10.9
 */
export function assertNoProductionMutation(operation: string): void {
  throw new ProductionWriteGuardError(
    `Attempted prohibited operation '${operation}' during Stage 10.9 Read-Only Manifest Gate`
  );
}

/**
 * Deterministic fingerprint calculation for migration manifest items
 */
export function calculateItemFingerprint(item: Omit<MigrationManifestItem, "fingerprint">): string {
  const payload = [
    item.sourceCollection,
    item.sourceId,
    item.sourceType,
    item.targetCollection,
    item.targetId,
    item.targetType,
    item.companyId || "",
    item.platformId || "",
    item.sectorId || "",
    item.sectorCityId || "",
    item.action,
    item.canonicalDomain || "",
    item.schemaOrgId || "",
    item.dependencies.join(","),
  ].join("::");

  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `fp-${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

/**
 * Build the 100% deterministic Stage 10.9 Migration Manifest
 */
export function buildCanonicalMigrationManifest(): {
  manifestItems: MigrationManifestItem[];
  domainManifestItems: DomainManifestItem[];
  dependencyOrder: string[];
  snapshotPlan: PreMigrationSnapshotPlan;
  rollbackPlan: RollbackPlan;
  postMigrationPlan: PostMigrationValidationPlan;
  counts: {
    total: number;
    noChange: number;
    map: number;
    review: number;
    block: number;
  };
} {
  const rawItems: Omit<MigrationManifestItem, "fingerprint">[] = [
    {
      id: "item-platform-marineworld",
      sourceCollection: "platforms",
      sourceId: "marineworld",
      sourceType: "PLATFORM",
      targetCollection: "/platforms/marineworld",
      targetId: "marineworld",
      targetType: "PLATFORM",
      platformId: "marineworld",
      action: "NO_CHANGE",
      confidence: 1.0,
      reason: "Canonical platform identity already in target collection",
      canonicalDomain: "marineworld.city",
      schemaOrgId: "https://marineworld.city/#organization",
      dependencies: [],
      validationStatus: "VALIDATED",
    },
    {
      id: "item-sector-marine",
      sourceCollection: "sectors",
      sourceId: "marine",
      sourceType: "SECTOR",
      targetCollection: "/sectors/marine",
      targetId: "marine",
      targetType: "SECTOR",
      platformId: "marineworld",
      sectorId: "marine",
      action: "NO_CHANGE",
      confidence: 1.0,
      reason: "Canonical marine sector identity verified",
      canonicalDomain: "marine.marineworld.city",
      schemaOrgId: "https://marine.marineworld.city/#organization",
      dependencies: ["item-platform-marineworld"],
      validationStatus: "VALIDATED",
    },
    {
      id: "item-city-shipyard",
      sourceCollection: "sectorCities",
      sourceId: "shipyard",
      sourceType: "SECTOR_CITY",
      targetCollection: "/sectorCities/shipyard",
      targetId: "shipyard",
      targetType: "SECTOR_CITY",
      platformId: "marineworld",
      sectorId: "marine",
      sectorCityId: "shipyard",
      action: "NO_CHANGE",
      confidence: 1.0,
      reason: "Canonical shipyard sector-city identity verified",
      canonicalDomain: "shipyard.city.marineworld.city",
      schemaOrgId: "https://shipyard.city.marineworld.city/#organization",
      dependencies: ["item-sector-marine"],
      validationStatus: "VALIDATED",
    },
    {
      id: "item-company-comp-audit-001",
      sourceCollection: "companies",
      sourceId: "comp-audit-001",
      sourceType: "COMPANY",
      targetCollection: "/companies/comp-audit-001",
      targetId: "comp-audit-001",
      targetType: "COMPANY",
      companyId: "comp-audit-001",
      platformId: "marineworld",
      sectorId: "marine",
      sectorCityId: "shipyard",
      action: "MAP",
      confidence: 1.0,
      reason: "Map audited company entity to canonical Firestore collection",
      canonicalDomain: "argentomarine.marineworld.city",
      schemaOrgId: "https://argentomarine.marineworld.city/#organization",
      dependencies: ["item-city-shipyard"],
      validationStatus: "VALIDATED",
    },
    {
      id: "item-node-comp-audit-001-hq",
      sourceCollection: "companyNodes",
      sourceId: "node-comp-audit-001-hq",
      sourceType: "NODE",
      targetCollection: "/companies/comp-audit-001/nodes/node-comp-audit-001-hq",
      targetId: "node-comp-audit-001-hq",
      targetType: "NODE",
      companyId: "comp-audit-001",
      action: "MAP",
      confidence: 1.0,
      reason: "Map company HQ node under parent company subcollection",
      dependencies: ["item-company-comp-audit-001"],
      validationStatus: "VALIDATED",
    },
    {
      id: "item-prod-prod-audit-501",
      sourceCollection: "products",
      sourceId: "prod-audit-501",
      sourceType: "PRODUCT",
      targetCollection: "/companies/comp-audit-001/products/prod-audit-501",
      targetId: "prod-audit-501",
      targetType: "PRODUCT",
      companyId: "comp-audit-001",
      sectorCityId: "shipyard",
      action: "MAP",
      confidence: 1.0,
      reason: "Map company product under parent company subcollection",
      dependencies: ["item-company-comp-audit-001"],
      validationStatus: "VALIDATED",
    },
    {
      id: "item-serv-serv-audit-601",
      sourceCollection: "services",
      sourceId: "serv-audit-601",
      sourceType: "SERVICE",
      targetCollection: "/companies/comp-audit-001/services/serv-audit-601",
      targetId: "serv-audit-601",
      targetType: "SERVICE",
      companyId: "comp-audit-001",
      sectorCityId: "shipyard",
      action: "MAP",
      confidence: 1.0,
      reason: "Map company service under parent company subcollection",
      dependencies: ["item-company-comp-audit-001"],
      validationStatus: "VALIDATED",
    },
    {
      id: "item-member-usr-owner-001",
      sourceCollection: "companyMembers",
      sourceId: "usr-owner-001",
      sourceType: "MEMBER",
      targetCollection: "/companies/comp-audit-001/members/usr-owner-001",
      targetId: "usr-owner-001",
      targetType: "MEMBER",
      companyId: "comp-audit-001",
      action: "MAP",
      confidence: 1.0,
      reason: "Map company member/owner role under parent company subcollection",
      dependencies: ["item-company-comp-audit-001"],
      validationStatus: "VALIDATED",
    },
    {
      id: "item-conn-conn-audit-701",
      sourceCollection: "connect",
      sourceId: "conn-audit-701",
      sourceType: "CONNECT",
      targetCollection: "/companies/comp-audit-001/connect/conn-audit-701",
      targetId: "conn-audit-701",
      targetType: "CONNECT",
      companyId: "comp-audit-001",
      action: "MAP",
      confidence: 1.0,
      reason: "Map Connect/RFQ interaction under parent company subcollection",
      dependencies: ["item-company-comp-audit-001"],
      validationStatus: "VALIDATED",
    },
    {
      id: "item-twin-twin-comp-audit-001",
      sourceCollection: "businessTwin",
      sourceId: "twin-comp-audit-001",
      sourceType: "BUSINESS_TWIN",
      targetCollection: "/companies/comp-audit-001/businessTwin/twin-comp-audit-001",
      targetId: "twin-comp-audit-001",
      targetType: "BUSINESS_TWIN",
      companyId: "comp-audit-001",
      action: "MAP",
      confidence: 1.0,
      reason: "Map projected Business Twin model under parent company subcollection",
      dependencies: ["item-company-comp-audit-001"],
      validationStatus: "VALIDATED",
    },
    {
      id: "item-analytics-evt-audit-801",
      sourceCollection: "companyAnalytics",
      sourceId: "evt-audit-801",
      sourceType: "ANALYTICS_EVENT",
      targetCollection: "/companyAnalytics/comp-audit-001/events/evt-audit-801",
      targetId: "evt-audit-801",
      targetType: "ANALYTICS_EVENT",
      companyId: "comp-audit-001",
      action: "MAP",
      confidence: 1.0,
      reason: "Map telemetry analytics event under company analytics root collection",
      dependencies: ["item-company-comp-audit-001"],
      validationStatus: "VALIDATED",
    },
    {
      id: "item-ai-ai-audit-901",
      sourceCollection: "aiInteractions",
      sourceId: "ai-audit-901",
      sourceType: "AI_INTERACTION",
      targetCollection: "/aiInteractions/ai-audit-901",
      targetId: "ai-audit-901",
      targetType: "AI_INTERACTION",
      companyId: "comp-audit-001",
      action: "MAP",
      confidence: 1.0,
      reason: "Map grounded AI interaction record to global AI interaction collection",
      dependencies: ["item-company-comp-audit-001"],
      validationStatus: "VALIDATED",
    },
  ];

  const manifestItems: MigrationManifestItem[] = rawItems.map((item) => ({
    ...item,
    fingerprint: calculateItemFingerprint(item),
  }));

  const domainManifestItems: DomainManifestItem[] = [
    {
      hostname: "marineworld.city",
      entityType: "PLATFORM",
      entityId: "marineworld",
      isCanonical: true,
      isActive: true,
      schemaOrgId: "https://marineworld.city/#organization",
      targetEntity: "/platforms/marineworld",
    },
    {
      hostname: "www.marineworld.city",
      entityType: "PLATFORM",
      entityId: "marineworld",
      isCanonical: false,
      isActive: true,
      schemaOrgId: "https://marineworld.city/#organization",
      targetEntity: "/platforms/marineworld",
    },
    {
      hostname: "shipyard.city.marineworld.city",
      entityType: "SECTOR_CITY",
      entityId: "shipyard",
      isCanonical: true,
      isActive: true,
      schemaOrgId: "https://shipyard.city.marineworld.city/#organization",
      targetEntity: "/sectorCities/shipyard",
    },
    {
      hostname: "argentomarine.marineworld.city",
      entityType: "COMPANY",
      entityId: "comp-audit-001",
      isCanonical: true,
      isActive: true,
      schemaOrgId: "https://argentomarine.marineworld.city/#organization",
      targetEntity: "/companies/comp-audit-001",
      companyId: "comp-audit-001",
    },
    {
      hostname: "argentomarine.com",
      entityType: "COMPANY",
      entityId: "comp-audit-001",
      isCanonical: false,
      isActive: true,
      schemaOrgId: "https://argentomarine.marineworld.city/#organization",
      targetEntity: "/companies/comp-audit-001",
      companyId: "comp-audit-001",
    },
  ];

  const dependencyOrder = [
    "PLATFORM",
    "SECTOR",
    "SECTOR_CITY",
    "COMPANY",
    "MEMBER",
    "NODE",
    "PRODUCT",
    "SERVICE",
    "CONNECT",
    "BUSINESS_TWIN",
    "ANALYTICS_EVENT",
    "AI_INTERACTION",
  ];

  const snapshotPlan: PreMigrationSnapshotPlan = {
    timestamp: new Date().toISOString(),
    snapshotScope: [
      "/platforms",
      "/sectors",
      "/sectorCities",
      "/companies",
      "/companyAnalytics",
      "/aiInteractions",
    ],
    requirements: [
      "Full JSON export of existing Firestore collections before Stage 10.10 execution",
      "Timestamped immutable storage backup in GCP Cloud Storage",
      "Cryptographic SHA-256 manifest hash verification before write phase",
    ],
    status: "REQUIRED_BEFORE_EXECUTION",
  };

  const rollbackPlan: RollbackPlan = {
    strategy: "RESTORE_SNAPSHOT",
    triggers: [
      "Canonical record count decrease detected",
      "Parent-child entity link broken",
      "Company ID mutation or corruption",
      "Domain resolution failure",
      "Schema.org @id structure corruption",
      "Tenant security rules breach",
      "Duplicate entity creation detected",
      "Orphan subcollection record detected",
    ],
    status: "ARMED",
  };

  const postMigrationPlan: PostMigrationValidationPlan = {
    checks: [
      "Verify exact record count per collection matching manifest",
      "Verify zero orphan records across all company subcollections",
      "Verify domain -> identity -> entity resolution for all custom and platform domains",
      "Verify Schema.org @id preservation across all views",
      "Verify tenant RBAC security rules pass for all company subcollections",
    ],
    status: "DEFINED",
  };

  const noChange = manifestItems.filter((i) => i.action === "NO_CHANGE").length;
  const map = manifestItems.filter((i) => i.action === "MAP").length;
  const review = manifestItems.filter((i) => i.action === "REVIEW").length;
  const block = manifestItems.filter((i) => i.action === "BLOCK").length;

  return {
    manifestItems,
    domainManifestItems,
    dependencyOrder,
    snapshotPlan,
    rollbackPlan,
    postMigrationPlan,
    counts: {
      total: manifestItems.length,
      noChange,
      map,
      review,
      block,
    },
  };
}
