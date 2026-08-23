import { resolveIdentity } from "@/lib/services/identityService";
import { getSectorCityById, getSectorCityBySlug, listSectorCities } from "@/lib/services/sectorCityService";
import { getSectorById } from "@/lib/services/sectorService";
import { getCompaniesBySectorCity } from "@/lib/services/companyService";
import { buildSectorCitySchema } from "@/lib/services/schemaOrgService";
import type { SectorCityEntity, SectorEntity, CompanyEntity } from "@/lib/types";

/**
 * Stage 10.7 — Sector City ViewModel
 * Presentation adapter binding UI to canonical SectorCityEntity, Sector, and Member Companies
 */

export interface SectorCityViewModelState {
  loading: boolean;
  success: boolean;
  empty: boolean;
  error: string | null;
  data: SectorCityEntity | null;
  sector: SectorEntity | null;
  companies: CompanyEntity[];
  allCities: SectorCityEntity[];
  schema: Record<string, unknown> | null;
}

export async function getSectorCityViewModel(hostnameOrSlug: string = "shipyard"): Promise<SectorCityViewModelState> {
  try {
    const identityInfo = resolveIdentity(hostnameOrSlug);
    const targetSlug = identityInfo?.sectorCityId || hostnameOrSlug;

    let city = await getSectorCityById(targetSlug);
    if (!city) {
      city = (await getSectorCityBySlug(targetSlug)) || null;
    }

    const allCities = listSectorCities();

    if (!city) {
      return {
        loading: false,
        success: false,
        empty: true,
        error: "Sector city entity not found",
        data: null,
        sector: null,
        companies: [],
        allCities,
        schema: null,
      };
    }

    const sector = city.sectorId ? await getSectorById(city.sectorId) : null;
    const cityComp = getCompaniesBySectorCity(city.id);

    const schema = buildSectorCitySchema(city) as unknown as Record<string, unknown>;

    return {
      loading: false,
      success: true,
      empty: cityComp.length === 0,
      error: null,
      data: city,
      sector: sector || null,
      companies: cityComp,
      allCities,
      schema,
    };
  } catch (err: any) {
    return {
      loading: false,
      success: false,
      empty: true,
      error: err.message || "Failed to load sector city view model",
      data: null,
      sector: null,
      companies: [],
      allCities: [],
      schema: null,
    };
  }
}
