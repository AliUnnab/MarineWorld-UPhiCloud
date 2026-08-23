import { getSectorById, getSectorBySlug, listSectors } from "@/lib/services/sectorService";
import { getSectorCitiesBySector } from "@/lib/services/sectorCityService";
import type { SectorEntity, SectorCityEntity } from "@/lib/types";

/**
 * Stage 10.7 — Sector ViewModel
 * Presentation adapter binding UI to canonical SectorEntity and SectorCity collections
 */

export interface SectorViewModelState {
  loading: boolean;
  success: boolean;
  empty: boolean;
  error: string | null;
  data: SectorEntity | null;
  cities: SectorCityEntity[];
  allSectors: SectorEntity[];
}

export async function getSectorViewModel(sectorSlugOrId: string = "marine"): Promise<SectorViewModelState> {
  try {
    let sector = await getSectorById(sectorSlugOrId);
    if (!sector) {
      sector = (await getSectorBySlug(sectorSlugOrId)) || null;
    }

    const allSectors = await listSectors();

    if (!sector) {
      return {
        loading: false,
        success: false,
        empty: true,
        error: "Sector entity not found",
        data: null,
        cities: [],
        allSectors,
      };
    }

    const cities = getSectorCitiesBySector(sector.id);

    return {
      loading: false,
      success: true,
      empty: false,
      error: null,
      data: sector,
      cities,
      allSectors,
    };
  } catch (err: any) {
    return {
      loading: false,
      success: false,
      empty: true,
      error: err.message || "Failed to load sector view model",
      data: null,
      cities: [],
      allSectors: [],
    };
  }
}
