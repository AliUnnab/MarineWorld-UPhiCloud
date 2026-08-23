import type { CompanyProfile } from "@/lib/types";
import { Icon } from "@/components/digione/icons";
import { DigiBadge } from "@/components/digione/primitives";

export interface LocationPresenceEntry {
  country: string;
  region: string;
  city: string;
  status: string;
  isHeadquarters: boolean;
  nodeCount: number;
}

export function CompanyCountryPresence({ company }: { company: CompanyProfile }) {
  // Extract verified geographic presence directly from company record
  const entries: LocationPresenceEntry[] = [];

  if (company.country || company.location) {
    const cityName = company.location?.split(",")?.[0]?.trim() ?? company.city ?? "Primary Hub";
    const countryName = company.country ?? company.location?.split(",")?.slice(-1)?.[0]?.trim() ?? "Global Registry";
    const regionName = company.region ?? "MarineWorld Network";
    const nodeCount = Math.max(1, (company.cityIds?.length ?? 1) || (company.sectorCityIds?.length ?? 1));

    entries.push({
      country: countryName,
      region: regionName,
      city: cityName,
      status: company.verificationStatus === "verified" ? "VERIFIED OPERATING BASE" : "REGISTERED PRESENCE NODE",
      isHeadquarters: true,
      nodeCount,
    });
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-card-md border border-line bg-canvas p-6 text-center font-mono text-[12px] text-stone">
        NO GEOGRAPHIC LOCATIONS CONFIGURED IN PUBLIC REGISTRY
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Icon name="pin" className="h-4 w-4 text-royal" />
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-graphite">
            GEOGRAPHIC PRESENCE BY COUNTRY & REGION
          </h3>
        </div>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
          {entries.length} VERIFIED LOCATION{entries.length > 1 ? "S" : ""}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {entries.map((entry, idx) => (
          <div
            key={entry.country + idx}
            className="rounded-card-md border border-line bg-white p-5 shadow-xs transition-all hover:border-royal/30"
          >
            <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-royal">
                  {entry.region}
                </span>
                <h4 className="text-[17px] font-bold text-graphite mt-0.5">
                  {entry.country}
                </h4>
              </div>
              {entry.isHeadquarters && (
                <DigiBadge variant="neutral">HEADQUARTERS</DigiBadge>
              )}
            </div>

            <dl className="mt-3.5 space-y-2 font-mono text-[12px]">
              <div className="flex justify-between border-b border-line/60 pb-1.5">
                <dt className="text-mute">Operating City / Base</dt>
                <dd className="font-semibold text-graphite">{entry.city}</dd>
              </div>

              <div className="flex justify-between border-b border-line/60 pb-1.5">
                <dt className="text-mute">Sector City Placements</dt>
                <dd className="font-bold text-royal">{entry.nodeCount} Active Placement{entry.nodeCount > 1 ? "s" : ""}</dd>
              </div>

              <div className="flex justify-between pt-0.5">
                <dt className="text-mute">Verification Standard</dt>
                <dd className="font-semibold text-graphite uppercase text-[11px]">{entry.status}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
