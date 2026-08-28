import { CompanyProfile, CompanyEntity } from "@/lib/types";

export interface PrimaryRegistryNodeInfo {
  code: string;
  domain: string;
  displayLabel: string;
}

export const PRIMARY_REGISTRY_NODES: Record<string, PrimaryRegistryNodeInfo> = {
  MCOM: { code: "MCOM", domain: "MARINECOMMERCE.CITY", displayLabel: "MARINECOMMERCE.CITY · MCOM" },
  SUPC: { code: "SUPC", domain: "SUPPLYCHAIN.CITY", displayLabel: "SUPPLYCHAIN.CITY · SUPC" },
  SHPY: { code: "SHPY", domain: "SHIPYARD.CITY", displayLabel: "SHIPYARD.CITY · SHPY" },
  CHRT: { code: "CHRT", domain: "CHARTER.CITY", displayLabel: "CHARTER.CITY · CHRT" },
  YSLS: { code: "YSLS", domain: "YACHTSALES.CITY", displayLabel: "YACHTSALES.CITY · YSLS" },
  PROC: { code: "PROC", domain: "PROCUREMENT.CITY", displayLabel: "PROCUREMENT.CITY · PROC" },
  MARN: { code: "MARN", domain: "MARINA.CITY", displayLabel: "MARINA.CITY · MARN" },
};

/**
 * Maps a sector city ID (e.g. "supplychain", "shipyard", "marinecommerce") to a 4-letter registry code.
 */
export function getPrimaryRegistryCode(sectorCityId?: string): string {
  if (!sectorCityId) return "MCOM";
  const norm = sectorCityId.toLowerCase();
  if (norm.includes("supply") || norm.includes("supc")) return "SUPC";
  if (norm.includes("shipyard") || norm.includes("shpy")) return "SHPY";
  if (norm.includes("charter") || norm.includes("chrt")) return "CHRT";
  if (norm.includes("broker") || norm.includes("sales") || norm.includes("ysls")) return "YSLS";
  if (norm.includes("procur") || norm.includes("proc")) return "PROC";
  if (norm.includes("marina") || norm.includes("marn")) return "MARN";
  return "MCOM";
}

/**
 * Returns full Primary Registry Node info for a given registry code.
 */
export function getPrimaryRegistryNodeInfo(code?: string): PrimaryRegistryNodeInfo {
  const normCode = (code || "MCOM").toUpperCase();
  return PRIMARY_REGISTRY_NODES[normCode] || PRIMARY_REGISTRY_NODES.MCOM;
}

/**
 * Derives a deterministic, realistic 6-digit number for a company.
 * Avoids 000001 / 100001 placeholder numbering where possible.
 */
export function deriveDeterministic6DigitNumber(companyIdOrSlug: string, existing6Digit?: string): string {
  // If an existing valid 6-digit non-placeholder number is present, keep it.
  if (existing6Digit && /^\d{6}$/.test(existing6Digit) && !["100001", "000001", "100002", "100003"].includes(existing6Digit)) {
    return existing6Digit;
  }

  const norm = (companyIdOrSlug || "comp").toLowerCase();
  if (norm.includes("argento")) return "214583";
  if (norm.includes("blueharbour") || norm.includes("blue-harbour")) return "892104";
  if (norm.includes("north-atlantic") || norm.includes("northatlantic")) return "419082";
  if (norm.includes("another")) return "520193";
  if (norm.includes("med-marine") || norm.includes("medmarine")) return "382910";
  if (norm.includes("crest") || norm.includes("crest-group")) return "214583";

  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = (hash << 5) - hash + norm.charCodeAt(i);
    hash |= 0;
  }
  const num = (Math.abs(hash) % 700000) + 200000;
  return num.toString();
}

/**
 * Derives or resolves the full canonical MarineWorld Digital Company ID (e.g. MW-MCOM-214583).
 */
export function resolveMarineWorldCompanyDigitalId(params: {
  companyIdOrSlug: string;
  mwCompanyDigitalId?: string;
  businessId?: string;
  companyId6Digit?: string;
  primaryRegistryCode?: string;
  primarySectorCityId?: string;
}): {
  mwCompanyDigitalId: string;
  primaryRegistryCode: string;
  primaryRegistryNode: string;
  companyId6Digit: string;
} {
  // 1. If full mwCompanyDigitalId is already assigned and valid (MW-CODE-NUMBER), preserve it!
  if (params.mwCompanyDigitalId && /^MW-[A-Z]{3,4}-\d{6}$/.test(params.mwCompanyDigitalId)) {
    const parts = params.mwCompanyDigitalId.split("-");
    const code = parts[1];
    const sixDigit = parts[2];
    const nodeInfo = getPrimaryRegistryNodeInfo(code);
    return {
      mwCompanyDigitalId: params.mwCompanyDigitalId,
      primaryRegistryCode: code,
      primaryRegistryNode: nodeInfo.displayLabel,
      companyId6Digit: sixDigit,
    };
  }

  // 2. Check if businessId matches MW-CODE-NUMBER pattern
  if (params.businessId && /^MW-[A-Z]{3,4}-\d{6}$/.test(params.businessId)) {
    const parts = params.businessId.split("-");
    const code = parts[1];
    const sixDigit = parts[2];
    const nodeInfo = getPrimaryRegistryNodeInfo(code);
    const digitalId = `MW-${code}-${sixDigit}`;
    return {
      mwCompanyDigitalId: digitalId,
      primaryRegistryCode: code,
      primaryRegistryNode: nodeInfo.displayLabel,
      companyId6Digit: sixDigit,
    };
  }

  // 3. Extract 6-digit number
  let sixDigit = params.companyId6Digit;
  if (!sixDigit || !/^\d{6}$/.test(sixDigit)) {
    if (params.businessId) {
      const match = params.businessId.match(/\d{6}/);
      if (match) sixDigit = match[0];
    }
  }
  sixDigit = deriveDeterministic6DigitNumber(params.companyIdOrSlug, sixDigit);

  // 4. Resolve registry code
  const code = params.primaryRegistryCode || getPrimaryRegistryCode(params.primarySectorCityId);
  const nodeInfo = getPrimaryRegistryNodeInfo(code);
  const mwCompanyDigitalId = `MW-${code}-${sixDigit}`;

  return {
    mwCompanyDigitalId,
    primaryRegistryCode: code,
    primaryRegistryNode: nodeInfo.displayLabel,
    companyId6Digit: sixDigit,
  };
}

/**
 * Authoritative Canonical Company URL Resolver.
 * Returns the fully accessible, working URL for the active deployment environment (localhost / domain).
 * Example: http://localhost:3000/companies/comp-yusuf-aras or https://marineworld.city/companies/comp-yusuf-aras
 */
export function buildCanonicalCompanyUrl(
  companySlugOrEntity?: string | Partial<CompanyEntity> | Partial<CompanyProfile> | null,
  primarySectorCityId?: string
): string {
  let slug = "";
  if (typeof companySlugOrEntity === "string") {
    slug = companySlugOrEntity;
  } else if (companySlugOrEntity) {
    slug = companySlugOrEntity.slug || companySlugOrEntity.id || "";
  }

  const cleanSlug = (slug || "company")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "") || "company";

  if (typeof window !== "undefined" && window.location && window.location.origin) {
    return `${window.location.origin}/companies/${cleanSlug}`;
  }

  return `https://marineworld.city/companies/${cleanSlug}`;
}

/**
 * Institutional Federated Subdomain format.
 * Pattern: https://{companySlug}.{primarySectorCity}.marineworld.city/
 */
export function buildFederatedCompanySubdomainUrl(
  companySlugOrEntity?: string | Partial<CompanyEntity> | Partial<CompanyProfile> | null,
  primarySectorCityId?: string
): string {
  let slug = "";
  let sectorCity = primarySectorCityId || "";

  if (typeof companySlugOrEntity === "string") {
    slug = companySlugOrEntity;
  } else if (companySlugOrEntity) {
    slug = companySlugOrEntity.slug || companySlugOrEntity.id || "";
    if (!sectorCity) {
      sectorCity =
        (companySlugOrEntity as any).primarySectorCityId ||
        companySlugOrEntity.sectorCityIds?.[0] ||
        (companySlugOrEntity as any).cityIds?.[0] ||
        "";
    }
  }

  const cleanCompany = (slug || "company")
    .toLowerCase()
    .trim()
    .replace(/\.shipyard|\.city|\.marineworld/g, "")
    .replace(/[^a-z0-9-]/g, "") || "company";

  const cleanSector = (sectorCity || "shipyard")
    .toLowerCase()
    .trim()
    .replace(/\.city$/i, "")
    .replace(/[^a-z0-9-]/g, "") || "shipyard";

  return `https://${cleanCompany}.${cleanSector}.marineworld.city/`;
}

/**
 * Short canonical company hostname (without protocol or trailing slash).
 */
export function getShortCanonicalCompanyUrl(
  companySlugOrEntity?: string | Partial<CompanyEntity> | Partial<CompanyProfile> | null,
  primarySectorCityId?: string
): string {
  const full = buildCanonicalCompanyUrl(companySlugOrEntity, primarySectorCityId);
  return full.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
