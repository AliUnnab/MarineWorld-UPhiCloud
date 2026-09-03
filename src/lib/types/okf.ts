/**
 * Stage 14 — Open Knowledge Format (OKF) & Google Knowledge Catalog Core Type Schema
 * 
 * Enforces:
 * 1. YAML Frontmatter Specification for Universal AI Ingestion & Lineage
 * 2. Google Knowledge Catalog Seal & Digital Notarization (Anti-Hallucination)
 * 3. Structured Parameters (Specs, Class Certifications, Commercial Terms, Boundaries)
 * 4. Multi-Source Provenance: Google Drive, Local Files, URLs, In-App Editor
 */

export interface KnowledgeCatalogSeal {
  sealed: boolean;
  sealId: string;
  sealedAt: string;
  hashSha256: string;
  authority: "Google Knowledge Catalog / MarineWorld Trust Layer";
  status: "VERIFIED" | "PENDING_VERIFICATION" | "REVOKED";
  verifiedBy: string;
  version: number;
}

export interface OKFSpecification {
  key: string;
  label?: string;
  value: string;
  unit?: string;
  category?: "PHYSICAL" | "ELECTRICAL" | "PERFORMANCE" | "COMPLIANCE" | "OPERATIONAL" | "GENERAL";
  confidence: number;
}

export interface OKFCommercialParam {
  price?: string | number;
  currency?: string;
  pricingModel?: "FIXED" | "QUOTE" | "TIERED" | "SUBSCRIPTION" | "PER_UNIT" | "CUSTOM";
  leadTimeDays?: number;
  minimumOrderQuantity?: string | number;
  warrantyPeriod?: string;
  paymentTerms?: string;
}

export interface OKFLineage {
  sourceOrigin: "GOOGLE_DRIVE" | "LOCAL_UPLOAD" | "URL_SOURCE" | "MANUAL_ENTRY";
  sourceUri?: string;
  originalFileName?: string;
  driveFileId?: string;
  drivePath?: string;
  mimeType?: string;
  ingestedAt: string;
  ingestedBy: string;
  enrichmentEngine: "Gemini-2.0-Flash / OKF-Enrichment-Agent";
  transformDurationMs?: number;
}

export interface OKFGroundingRules {
  hallucinationPrevention: "STRICT_SEALED" | "HYBRID";
  allowExternalInference: boolean;
  autoSyncWithDrive: boolean;
  citationRequired: boolean;
}

export interface OKFDocument {
  okfVersion: "1.0";
  documentId: string;
  title: string;
  entityType: "PRODUCT" | "SERVICE" | "COMPANY" | "FACILITY" | "CONTRACT" | "GENERAL_CORPORATE";
  companyId: string;
  companySlug: string;
  offeringId?: string;
  offeringSlug?: string;
  
  // Knowledge Catalog Seal
  knowledgeCatalogSeal: KnowledgeCatalogSeal;

  // Provenance & Source
  lineage: OKFLineage;

  // Extracted Knowledge Taxonomies
  classifications: string[];
  specifications: OKFSpecification[];
  certifications: string[];
  commercialParameters?: OKFCommercialParam;
  operationalBoundaries?: string[];
  tags: string[];

  // Content Representation
  summaryText: string;
  rawMarkdownBody: string;
  fullOkfMarkdown: string; // Complete YAML Frontmatter + Structured Markdown Body

  // AI Guardrails
  groundingRules: OKFGroundingRules;
  confidenceScore: number;

  createdAt: string;
  updatedAt: string;
}
