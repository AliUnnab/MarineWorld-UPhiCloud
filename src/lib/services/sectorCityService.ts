import type { SectorCityEntity } from "@/lib/types";
import {
  getSectorCityById,
  getSectorCityBySlug,
  listSectorCities,
  getSectorCitiesBySector,
} from "./sectorService";
import { saveSectorCity as saveRepoSectorCity } from "@/lib/repositories/sectorCityRepository";

/**
 * Stage 10.6 — Sector City Service
 * Dedicated Domain Service for Sector City entities (/sectorCities/{sectorCityId})
 */

export { getSectorCityById, getSectorCityBySlug, listSectorCities, getSectorCitiesBySector };

export async function saveSectorCityEntity(city: SectorCityEntity): Promise<SectorCityEntity> {
  return saveRepoSectorCity(city);
}
