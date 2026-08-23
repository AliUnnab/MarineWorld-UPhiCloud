import type { ServiceEntity, CompanyProfile } from "@/lib/types";
import { notifyListeners as notifyTwinListeners } from "@/lib/businessTwinStore";
import { getCompanyById, getCompanyBySlug } from "@/lib/services/companyService";
import { getCompanyServices as getCompanyServicesFromRegistry } from "@/lib/registry";
import {
  findServiceById,
  findServicesByCompany,
  saveService as saveRepoService,
  deleteServiceRecord,
} from "@/lib/repositories/serviceRepository";
import { recordOfferingAudit } from "@/lib/services/auditService";

/**
 * Service Service — Domain Service for Canonical Service Entities.
 * Scoped by companyId & sectorCityId.
 */

const servicesRepository = new Map<string, ServiceEntity[]>();

/**
 * Section 6 Canonical Async Methods
 */
export async function getService(companyId: string, serviceId: string): Promise<ServiceEntity | null> {
  const fromRepo = await findServiceById(companyId, serviceId);
  if (fromRepo) return fromRepo;
  const syncServs = getCompanyServices(companyId);
  return syncServs.find((s) => s.id === serviceId) || null;
}

export async function listServices(companyId: string): Promise<ServiceEntity[]> {
  const fromRepo = await findServicesByCompany(companyId);
  if (fromRepo && fromRepo.length > 0) return fromRepo;
  return getCompanyServices(companyId);
}

export async function createService(service: ServiceEntity): Promise<ServiceEntity> {
  await saveRepoService(service);
  saveService(service.companyId, service);
  return service;
}

export async function updateService(service: ServiceEntity): Promise<ServiceEntity> {
  await saveRepoService(service);
  saveService(service.companyId, service);
  return service;
}

export async function deleteService(companyId: string, serviceId: string): Promise<boolean> {
  await deleteServiceRecord(companyId, serviceId);
  const existing = servicesRepository.get(companyId) || [];
  const target = existing.find((s) => s.id === serviceId);
  const filtered = existing.filter((s) => s.id !== serviceId);
  servicesRepository.set(companyId, filtered);
  notifyTwinListeners();

  recordOfferingAudit(
    companyId,
    "OFFERING_DELETED",
    "SERVICE",
    serviceId,
    { previous: target ? { name: target.name } : undefined },
    { reason: "Service deleted from company catalog" }
  );

  return true;
}

/**
 * Get all canonical services for a company
 */
export function getCompanyServices(companyId: string): ServiceEntity[] {
  const existing = servicesRepository.get(companyId);
  if (existing && existing.length > 0) {
    return existing;
  }
  const company = getCompanyById(companyId) || getCompanyBySlug(companyId);
  if (company) {
    const services = getCompanyServicesFromRegistry(company as unknown as CompanyProfile);
    if (services.length > 0) {
      servicesRepository.set(companyId, services);
      return services;
    }
  }
  return [];
}

/**
 * Get service by slug or id
 */
export function getServiceBySlug(companyId: string, slugOrId?: string): ServiceEntity | undefined {
  if (!slugOrId) return undefined;
  const services = getCompanyServices(companyId);
  const norm = String(slugOrId).toLowerCase();
  return services.find((s) => (s?.slug && s.slug.toLowerCase() === norm) || (s?.id && s.id.toLowerCase() === norm));
}

/**
 * Save or add a canonical service to company catalog
 */
export function saveService(
  companyId: string,
  service: Omit<ServiceEntity, "id" | "companyId" | "createdAt" | "updatedAt"> & { id?: string }
): ServiceEntity {
  const existing = servicesRepository.get(companyId) || [];
  const now = new Date().toISOString();

  const id = service.id || `serv-${companyId}-${Date.now()}`;
  const slug = service.slug || (service.name ? String(service.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : id);

  const canonicalService: ServiceEntity = {
    ...service,
    id,
    companyId,
    slug,
    sectorCityId: service.sectorCityId || "marineworld",
    category: service.category || "General Services",
    shortDescription: service.shortDescription || service.description || service.name,
    status: service.status || "ACTIVE",
    visibility: service.visibility || "PUBLIC",
    availability: service.availability || "AVAILABLE",
    serviceAreas: service.serviceAreas || ["Regional Sector City"],
    capabilities: service.capabilities || [service.name],
    createdAt: now,
    updatedAt: now,
  };

  const index = existing.findIndex((s) => s.id === id);
  const isNew = index < 0;
  const previous = isNew ? undefined : { name: existing[index]?.name, status: existing[index]?.status, category: existing[index]?.category };

  if (index >= 0) {
    existing[index] = canonicalService;
  } else {
    existing.push(canonicalService);
  }

  servicesRepository.set(companyId, existing);
  notifyTwinListeners();

  recordOfferingAudit(
    companyId,
    isNew ? "OFFERING_CREATED" : "OFFERING_UPDATED",
    "SERVICE",
    id,
    {
      previous,
      next: { name: canonicalService.name, status: canonicalService.status, category: canonicalService.category },
    },
    { slug: canonicalService.slug, sectorCityId: canonicalService.sectorCityId }
  );

  return canonicalService;
}

/**
 * Update service status
 */
export function updateServiceStatus(companyId: string, serviceId: string, status: ServiceEntity["status"]): ServiceEntity | undefined {
  const services = servicesRepository.get(companyId) || [];
  const serv = services.find((s) => s.id === serviceId);
  if (!serv) return undefined;

  const previousStatus = serv.status;
  serv.status = status;
  serv.updatedAt = new Date().toISOString();
  servicesRepository.set(companyId, services);
  notifyTwinListeners();

  recordOfferingAudit(
    companyId,
    status === "ACTIVE" ? "OFFERING_PUBLISHED" : status === "ARCHIVED" ? "OFFERING_ARCHIVED" : "OFFERING_UPDATED",
    "SERVICE",
    serviceId,
    { previous: { status: previousStatus }, next: { status } },
    { reason: `Service status updated to ${status}` }
  );

  return serv;
}

/**
 * Seed initial company services repository if empty
 */
export function seedCompanyServices(companyId: string, initialServices: ServiceEntity[]): void {
  if (!servicesRepository.has(companyId) || servicesRepository.get(companyId)!.length === 0) {
    servicesRepository.set(companyId, initialServices);
  }
}
