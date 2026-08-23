import type { BusinessTwinProjection } from "@/lib/types";

/**
 * Stage 10.6 — Business Twin Repository
 * Data Access Layer for /companies/{companyId}/businessTwin/{twinId}
 */

const twinStore = new Map<string, BusinessTwinProjection>();

export async function findBusinessTwinByCompany(companyId: string): Promise<BusinessTwinProjection | null> {
  return twinStore.get(companyId) || null;
}

export async function saveBusinessTwin(twin: BusinessTwinProjection): Promise<BusinessTwinProjection> {
  twinStore.set(twin.companyId, twin);
  return twin;
}
