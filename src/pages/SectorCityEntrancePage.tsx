import { SectorCityEntranceV2 } from "./SectorCityEntranceV2";
import type { SectorConfig } from "@/lib/types";

export function SectorCityEntrancePage({
  config,
  citySlug,
  regionSlug,
}: {
  config: SectorConfig;
  citySlug: string;
  regionSlug?: string;
}) {
  return (
    <SectorCityEntranceV2
      config={config}
      citySlug={citySlug}
      regionSlug={regionSlug}
    />
  );
}

export { SectorCityEntranceV2 };
