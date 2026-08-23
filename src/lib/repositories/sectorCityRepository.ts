import type { SectorCityEntity } from "@/lib/types";

/**
 * Stage 10.6 — Sector City Repository
 * Data Access Layer for /sectorCities/{sectorCityId}
 */

const sectorCityStore = new Map<string, SectorCityEntity>();

export async function findSectorCityById(id: string): Promise<SectorCityEntity | null> {
  return sectorCityStore.get(id) || null;
}

export async function findSectorCityBySlug(slug: string): Promise<SectorCityEntity | null> {
  const cities = Array.from(sectorCityStore.values());
  return cities.find((c) => c.slug === slug || c.id === slug) || null;
}

export async function findSectorCitiesBySector(sectorId: string): Promise<SectorCityEntity[]> {
  const cities = Array.from(sectorCityStore.values());
  return cities.filter((c) => c.sectorId === sectorId);
}

export async function findAllSectorCities(): Promise<SectorCityEntity[]> {
  return Array.from(sectorCityStore.values());
}

export async function saveSectorCity(city: SectorCityEntity): Promise<SectorCityEntity> {
  sectorCityStore.set(city.id, city);
  return city;
}
