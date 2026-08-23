import type { ServiceEntity } from "@/lib/types";

/**
 * Stage 10.6 — Service Repository
 * Data Access Layer for /companies/{companyId}/services/{serviceId}
 */

const serviceStore = new Map<string, ServiceEntity[]>();

export async function findServiceById(companyId: string, serviceId: string): Promise<ServiceEntity | null> {
  const services = serviceStore.get(companyId) || [];
  return services.find((s) => s.id === serviceId) || null;
}

export async function findServicesByCompany(companyId: string): Promise<ServiceEntity[]> {
  return serviceStore.get(companyId) || [];
}

export async function saveService(service: ServiceEntity): Promise<ServiceEntity> {
  const existing = serviceStore.get(service.companyId) || [];
  const idx = existing.findIndex((s) => s.id === service.id);
  if (idx >= 0) {
    existing[idx] = service;
  } else {
    existing.push(service);
  }
  serviceStore.set(service.companyId, existing);
  return service;
}

export async function deleteServiceRecord(companyId: string, serviceId: string): Promise<boolean> {
  const existing = serviceStore.get(companyId) || [];
  const filtered = existing.filter((s) => s.id !== serviceId);
  serviceStore.set(companyId, filtered);
  return filtered.length < existing.length;
}
