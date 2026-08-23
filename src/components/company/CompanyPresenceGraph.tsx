import type { CompanyProfile, SectorCity, IndustryDomainEntity } from "@/lib/types";
import { Icon } from "@/components/digione/icons";

export function CompanyPresenceGraph({
  company,
  primaryCity,
  parentDomain,
  cities = [],
}: {
  company: CompanyProfile;
  primaryCity?: SectorCity;
  parentDomain?: IndustryDomainEntity;
  cities?: SectorCity[];
}) {
  const cityCount = cities.length > 0 ? cities.length : 1;
  const mainCityDomain = primaryCity?.domain ?? company.city;
  const domainName = parentDomain?.name ?? company.industry;
  const regionName = company.region ?? "Global Network";
  const countryName = company.country ?? "United Kingdom";

  return (
    <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-royal">
            <Icon name="network" className="h-4 w-4" />
            <span>PLATFORM NETWORK DIAGRAM</span>
          </div>
          <h3 className="text-h3 mt-1 text-graphite">Network Presence Topology</h3>
        </div>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute rounded-card-sm border border-line bg-canvas px-3 py-1 self-start sm:self-auto">
          ARCHITECTURAL SCHEMATIC
        </div>
      </div>

      {/* Topology Diagram Container */}
      <div className="mt-6 rounded-card-md border border-line bg-canvas p-6 md:p-8">
        <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          {/* Node 01: Company Entity */}
          <div className="relative z-10 flex-1 rounded-card-sm border-2 border-graphite bg-white p-4 shadow-sm text-center">
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-royal block">
              ENTERPRISE NODE
            </span>
            <span className="mt-1 block font-mono text-[14px] font-bold text-graphite truncate">
              {company.name}
            </span>
            <span className="mt-1 block font-mono text-[10.5px] text-stone">
              ID: {company.id.toUpperCase()}
            </span>
          </div>

          {/* Connector Line 1 */}
          <div className="hidden md:flex flex-col items-center justify-center shrink-0 w-12 text-linesoft">
            <div className="h-0.5 w-full bg-line relative">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-royal" />
            </div>
            <span className="font-mono text-[9px] text-mute uppercase tracking-[0.1em] mt-1">PARTICIPATES</span>
          </div>

          {/* Node 02: Sector City Cluster */}
          <div className="relative z-10 flex-1 rounded-card-sm border border-line bg-white p-4 text-center shadow-xs">
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-royal block">
              SECTOR CITY NETWORK
            </span>
            <span className="mt-1 block font-mono text-[13.5px] font-bold text-royal">
              {mainCityDomain}
            </span>
            <span className="mt-1 block font-mono text-[10.5px] text-stone">
              {cityCount} ACTIVE CITY NODE{cityCount > 1 ? "S" : ""}
            </span>
          </div>

          {/* Connector Line 2 */}
          <div className="hidden md:flex flex-col items-center justify-center shrink-0 w-12 text-linesoft">
            <div className="h-0.5 w-full bg-line relative">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-graphite" />
            </div>
            <span className="font-mono text-[9px] text-mute uppercase tracking-[0.1em] mt-1">MAPPED TO</span>
          </div>

          {/* Node 03: Industry Domain */}
          <div className="relative z-10 flex-1 rounded-card-sm border border-line bg-white p-4 text-center shadow-xs">
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-stone block">
              INDUSTRY DOMAIN
            </span>
            <span className="mt-1 block font-mono text-[13px] font-bold text-graphite truncate">
              {domainName}
            </span>
            <span className="mt-1 block font-mono text-[10.5px] text-stone">
              MARITIME CATEGORY
            </span>
          </div>

          {/* Connector Line 3 */}
          <div className="hidden md:flex flex-col items-center justify-center shrink-0 w-12 text-linesoft">
            <div className="h-0.5 w-full bg-line relative">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-royal" />
            </div>
            <span className="font-mono text-[9px] text-mute uppercase tracking-[0.1em] mt-1">LOCATED IN</span>
          </div>

          {/* Node 04: Geography */}
          <div className="relative z-10 flex-1 rounded-card-sm border border-line bg-white p-4 text-center shadow-xs">
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-stone block">
              GEOGRAPHIC REGION
            </span>
            <span className="mt-1 block font-mono text-[13px] font-bold text-graphite truncate">
              {countryName}
            </span>
            <span className="mt-1 block font-mono text-[10.5px] text-stone">
              {regionName}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
