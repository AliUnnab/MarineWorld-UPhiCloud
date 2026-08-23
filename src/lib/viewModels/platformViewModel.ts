import { resolveDomain } from "@/lib/services/domainService";
import { resolveIdentity } from "@/lib/services/identityService";
import { getPlatformById, listPlatforms } from "@/lib/services/platformService";
import { buildPlatformSchema } from "@/lib/services/schemaOrgService";
import type { PlatformEntity } from "@/lib/types";

/**
 * Stage 10.7 — Platform ViewModel
 * Presentation adapter binding UI to canonical PlatformEntity and IdentityResolution
 */

export interface PlatformViewModelState {
  loading: boolean;
  success: boolean;
  error: string | null;
  data: PlatformEntity | null;
  allPlatforms: PlatformEntity[];
  schema: Record<string, unknown> | null;
}

export async function getPlatformViewModel(hostnameOrId: string = "marineworld.city"): Promise<PlatformViewModelState> {
  try {
    const domainInfo = resolveDomain(hostnameOrId);
    const identityInfo = resolveIdentity(hostnameOrId);

    const platformId = identityInfo?.platformId || (domainInfo?.entityType === "PLATFORM" ? domainInfo.entityId : "marineworld");
    const platform = await getPlatformById(platformId);
    const allPlatforms = await listPlatforms();

    if (!platform) {
      return {
        loading: false,
        success: false,
        error: "Platform entity not found",
        data: null,
        allPlatforms,
        schema: null,
      };
    }

    const schema = buildPlatformSchema(platform) as unknown as Record<string, unknown>;

    return {
      loading: false,
      success: true,
      error: null,
      data: platform,
      allPlatforms,
      schema,
    };
  } catch (err: any) {
    return {
      loading: false,
      success: false,
      error: err.message || "Failed to load platform view model",
      data: null,
      allPlatforms: [],
      schema: null,
    };
  }
}
