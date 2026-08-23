import type { BusinessTwinModel, BusinessTwinProjection, CompanyProfile } from "@/lib/types";
import { getBusinessTwin as getStoreTwin, notifyListeners as notifyTwinListeners } from "@/lib/businessTwinStore";
import {
  findBusinessTwinByCompany,
  saveBusinessTwin as saveRepoTwin,
} from "@/lib/repositories/businessTwinRepository";
import { getCompanyById } from "@/lib/services/companyService";
import { getCompanyProducts } from "@/lib/services/productService";
import { getCompanyServices } from "@/lib/services/serviceService";
import { getCurrentAuthSession, type AuthContext } from "@/lib/services/securityService";
import { resolveAccessContext } from "@/lib/services/accessContextService";

/**
 * Business Twin Service — Projection Service for Canonical Digital Business Twin.
 * Projection Principle: Business Twin references and aggregates canonical data (Company, Nodes, Products, Services, Metrics).
 * Company entity remains the source of truth.
 */

/**
 * Section 6 Canonical Async Methods
 */
export async function getBusinessTwin(companyId: string): Promise<BusinessTwinProjection | null> {
  const fromRepo = await findBusinessTwinByCompany(companyId);
  if (fromRepo) return fromRepo;
  return null;
}

/**
 * Retrieve Public Business Twin Projection (No private telemetry, operational capacity, or internal topology)
 */
export function getPublicBusinessTwin(companyId: string): BusinessTwinProjection | null {
  const company = getCompanyById(companyId);
  if (!company) return null;
  const twin = getStoreTwin(company as unknown as CompanyProfile);
  const prods = getCompanyProducts(companyId);
  const servs = getCompanyServices(companyId);
  return {
    id: `twin-proj-${companyId}`,
    companyId: company.id,
    sectorCityId: company.city || "marine-world",
    overallCompleteness: twin.overallCompleteness,
    verificationStatus: twin.verificationStatus === "VERIFIED" ? "VERIFIED" : "PENDING",
    sectionCompleteness: twin.sectionCompleteness,
    capabilities: twin.capabilities,
    publishedProducts: prods.map((p) => p.id),
    publishedServices: servs.map((s) => s.id),
    lastCalculatedAt: twin.lastUpdated,
  };
}

/**
 * Retrieve Private Business Twin Model (Requires active company membership)
 */
export function getPrivateBusinessTwin(
  companyId: string,
  auth?: AuthContext
): ({ isAllowed: boolean; twin?: BusinessTwinModel; denialReason?: string } & Partial<BusinessTwinModel>) | null {
  const currentAuth = auth || getCurrentAuthSession();
  const accessContext = resolveAccessContext(currentAuth, companyId);
  const activeOrg = accessContext.activeOrganization;

  if (!currentAuth.uid || !activeOrg || (activeOrg.companyId !== companyId && activeOrg.organizationId !== companyId)) {
    return null;
  }

  const company = getCompanyById(companyId);
  if (!company) {
    return null;
  }

  const twin = getStoreTwin(company as unknown as CompanyProfile);
  return {
    isAllowed: true,
    twin,
    ...twin,
  };
}

export async function createBusinessTwin(twin: BusinessTwinProjection): Promise<BusinessTwinProjection> {
  return saveRepoTwin(twin);
}

export async function updateBusinessTwin(companyId: string, updates: Partial<BusinessTwinProjection>): Promise<BusinessTwinProjection | null> {
  const existing = await getBusinessTwin(companyId);
  const updated: BusinessTwinProjection = {
    id: existing?.id || `twin-${companyId}`,
    companyId,
    sectorCityId: existing?.sectorCityId || "marineworld",
    overallCompleteness: updates.overallCompleteness ?? existing?.overallCompleteness ?? 0,
    verificationStatus: updates.verificationStatus ?? existing?.verificationStatus ?? "PENDING",
    sectionCompleteness: updates.sectionCompleteness ?? existing?.sectionCompleteness ?? {},
    capabilities: updates.capabilities ?? existing?.capabilities ?? [],
    lastCalculatedAt: new Date().toISOString(),
  };
  return saveRepoTwin(updated);
}

export async function calculateProjection(company: CompanyProfile): Promise<BusinessTwinProjection> {
  const summary = getCanonicalTwinProjectionSummary(company);
  await saveRepoTwin(summary);
  return summary;
}

/**
 * Get the current projected Business Twin for a company
 */
export function getBusinessTwinProjection(company: CompanyProfile): BusinessTwinModel {
  return getStoreTwin(company);
}

/**
 * Trigger completeness recalculation notification across subscribers
 */
export function recalculateTwinProjection(): void {
  notifyTwinListeners();
}

/**
 * Format Business Twin into canonical Projection summary contract
 */
export function getCanonicalTwinProjectionSummary(company: CompanyProfile): BusinessTwinProjection {
  const model = getStoreTwin(company);
  return {
    id: `twin-${model.companyId}`,
    companyId: model.companyId,
    sectorCityId: model.identity.sectorId || "marineworld",
    overallCompleteness: model.overallCompleteness,
    verificationStatus: model.verificationStatus,
    sectionCompleteness: model.sectionCompleteness,
    capabilities: model.capabilities,
    lastCalculatedAt: model.lastUpdated,
  };
}
