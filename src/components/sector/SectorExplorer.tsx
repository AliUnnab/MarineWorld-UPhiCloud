import { useMemo, useRef, useState } from "react";
import type { SectorCity, SectorConfig } from "@/lib/types";
import { Icon } from "@/components/digione/icons";
import {
  DigiButton,
  DigiContainer,
  DigiIconContainer,
  DigiSection,
  DigiSectionHeader,
  Reveal,
} from "@/components/digione/primitives";
import { CityCard, FilterBar, MetadataRow, StatusBadge } from "@/components/foundation";
import { getCities, resolveCityStatus } from "@/lib/registry";

const PREVIEW_COUNT = 9;

export interface CanonicalGroupDef {
  id: string;
  groupNumber: string;
  canonicalName: string;
  filterLabel: string;
  description: string;
}

export const CANONICAL_GROUPS: CanonicalGroupDef[] = [
  {
    id: "ALL",
    groupNumber: "00",
    canonicalName: "All Canonical Industries",
    filterLabel: "All Industries",
    description: "Complete 25-city registry covering the physical and digital maritime economy.",
  },
  {
    id: "group-01",
    groupNumber: "01",
    canonicalName: "Industrial Products, Equipment & Manufacturing",
    filterLabel: "Industrial & Manufacturing",
    description: "Shipyards, boatbuilders, propulsion engineering, and naval architecture facilities.",
  },
  {
    id: "group-02",
    groupNumber: "02",
    canonicalName: "Maritime Services, Ports, Marinas & Operations",
    filterLabel: "Maritime Services & Operations",
    description: "Ports, terminals, berth management, supply chain logistics, procurement, and commercial ship brokerage.",
  },
  {
    id: "group-03",
    groupNumber: "03",
    canonicalName: "Yachting, Charter & Maritime Lifestyle",
    filterLabel: "Yachting & Lifestyle",
    description: "Yacht sales brokerage, commercial & luxury charter operations, and marine lifestyle brands.",
  },
  {
    id: "group-04",
    groupNumber: "04",
    canonicalName: "Offshore, Energy & Subsea",
    filterLabel: "Offshore & Subsea",
    description: "Offshore energy platforms, subsea survey robotics, ROV operations, and underwater cable infrastructure.",
  },
  {
    id: "group-05",
    groupNumber: "05",
    canonicalName: "Real Estate & Hospitality",
    filterLabel: "Real Estate & Hospitality",
    description: "Maritime hospitality, superyacht provisioning, luxury crew services, and waterfront real estate.",
  },
  {
    id: "group-06",
    groupNumber: "06",
    canonicalName: "Maritime Technology & AI Systems",
    filterLabel: "Technology & AI",
    description: "Industry AI agents, operational digital twins, maritime data feeds, autonomous navigation, and cyber defense.",
  },
  {
    id: "group-07",
    groupNumber: "07",
    canonicalName: "Legal, Finance & Compliance",
    filterLabel: "Legal, Finance & Compliance",
    description: "Marine asset financing, leasing structures, P&I risk operations, admiralty law, and regulatory compliance.",
  },
  {
    id: "group-08",
    groupNumber: "08",
    canonicalName: "Industry Governance, Associations & Clusters",
    filterLabel: "Governance & Associations",
    description: "Platform governance layer, classification societies (IACS), flag state registries, trade associations, and regional clusters.",
  },
];

/**
 * SectorExplorer — Canonical Sector City Explorer (Section 03).
 * Connects directly to the dynamic registry source of truth (SECTOR_CITY_REGISTRY / getCities).
 * Organizes all 25 canonical sector cities across the 8 canonical industry groups.
 */
export function SectorExplorer({ config }: { config: SectorConfig }) {
  const { explorer } = config;

  let cities: SectorCity[] = [];
  let loadError = false;
  try {
    cities = getCities(config);
  } catch {
    loadError = true;
  }

  const [activeGroupId, setActiveGroupId] = useState<string>("ALL");
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const activeGroup = useMemo(
    () => CANONICAL_GROUPS.find((g) => g.id === activeGroupId) ?? CANONICAL_GROUPS[0],
    [activeGroupId]
  );

  const filterOptions = useMemo(() => {
    return CANONICAL_GROUPS.map((group) => {
      let count = 0;
      if (group.id === "ALL") {
        count = cities.length;
      } else if (group.id === "group-08") {
        count = 0;
      } else {
        count = cities.filter((c) => c.category === group.canonicalName).length;
      }
      return {
        value: group.id,
        label: group.filterLabel,
        count,
      };
    });
  }, [cities]);

  const filteredCities = useMemo(() => {
    if (activeGroupId === "ALL") return cities;
    if (activeGroupId === "group-08") return [];
    return cities.filter((c) => c.category === activeGroup.canonicalName);
  }, [cities, activeGroupId, activeGroup]);

  const visibleCities =
    activeGroupId === "ALL" && !expanded ? filteredCities.slice(0, PREVIEW_COUNT) : filteredCities;

  const selected = cities.find((c) => c.id === selectedId) ?? null;

  const selectCity = (id: string) => {
    const next = selectedId === id ? null : id;
    setSelectedId(next);
    if (next) {
      window.setTimeout(() => {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        detailRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
      }, 60);
    }
  };

  return (
    <DigiSection id="explorer" className="bg-white">
      <DigiContainer>
        <Reveal>
          <DigiSectionHeader
            id="explorer-title"
            index="03 / SECTOR CITY EXPLORER"
            eyebrow={explorer?.eyebrow ?? "Canonical Industry & Sector City Explorer"}
            title={explorer?.headline ?? "EXPLORE THE MARITIME CITY."}
            lead={
              explorer?.lead ??
              "MarineWorld is organized into specialized sector cities. Each city represents a distinct operational domain with its own registry, verified companies, products and services."
            }
            right={
              <div className="border-l-2 border-royal pl-4">
                <p className="text-[13px] font-semibold text-graphite uppercase tracking-wider">
                  25 Canonical Sector Cities
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-mute">
                  Organized into 8 primary industry groups. Fully accessible across the global maritime network.
                </p>
              </div>
            }
          />
        </Reveal>

        {/* 8 Canonical Industry Groups Filter Bar */}
        <Reveal delay={80}>
          <div className="mt-10">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-linesoft">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">
                Canonical Industry Taxonomy Filter
              </span>
              <span className="text-[12px] font-medium text-stone">
                {activeGroup.id === "ALL"
                  ? `Showing ${visibleCities.length} of ${cities.length} Sector Cities`
                  : `${activeGroup.groupNumber ? `Group ${activeGroup.groupNumber} — ` : ""}${activeGroup.canonicalName}`}
              </span>
            </div>
            <div className="mt-4">
              <FilterBar
                options={filterOptions}
                value={activeGroupId}
                onChange={setActiveGroupId}
                label="Filter cities by canonical industry group"
              />
            </div>
          </div>
        </Reveal>

        {/* Group Description Banner */}
        {activeGroup.id !== "ALL" && (
          <Reveal delay={120}>
            <div className="mt-6 rounded-card-md border border-royal/20 bg-soft/40 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-royal">
                  Group {activeGroup.groupNumber} — {activeGroup.canonicalName}
                </span>
                <p className="text-[14px] text-graphite mt-1">{activeGroup.description}</p>
              </div>
              <span className="shrink-0 font-mono text-[11px] font-semibold text-stone bg-white px-3 py-1.5 rounded-full border border-line">
                {filteredCities.length} {filteredCities.length === 1 ? "City" : "Cities"}
              </span>
            </div>
          </Reveal>
        )}

        {/* Load Error State */}
        {loadError ? (
          <div className="mt-10 rounded-card-lg border border-line bg-mist/60 p-8 text-center">
            <p className="text-body font-medium text-graphite">Registry connection temporarily unavailable.</p>
            <p className="mt-2 text-[13px] text-mute">
              Please try refreshing the page or navigating directly to the sector cities.
            </p>
          </div>
        ) : activeGroupId === "group-08" ? (
          /* Institutional Governance Layer (Group 08) Panel */
          <Reveal delay={140}>
            <div className="mt-10 overflow-hidden rounded-card-lg border border-line bg-mist/50 p-8 text-left md:p-10">
              <div className="flex flex-col md:flex-row md:items-center gap-5">
                <DigiIconContainer icon="shield" mode="royal" size={48} />
                <div>
                  <span className="font-sans text-[11px] font-bold tracking-wider text-royal uppercase">
                    Group 08 — Institutional Governance Layer
                  </span>
                  <h3 className="text-h3 mt-1 uppercase text-graphite">
                    Industry Governance, Associations & Clusters
                  </h3>
                </div>
              </div>
              <p className="mt-5 text-[15px] leading-relaxed text-stone max-w-4xl">
                Industry Governance, Associations & Clusters represents the institutional foundation of MarineWorld.City.
                It connects classification societies (IACS), flag state administrations, international trade associations, and regional maritime technology clusters into a unified platform verification and compliance layer.
              </p>
              <div className="mt-8 border-t border-line pt-6">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-mute mb-3">
                  Core Institutional Governance Pillars
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    "IACS Classification Societies",
                    "Flag State Administrations",
                    "Regional Maritime Clusters",
                    "IMO Regulatory Frameworks",
                    "P&I Club Advisory Boards",
                    "Platform Governance Ledger",
                  ].map((pillar) => (
                    <span
                      key={pillar}
                      className="rounded-full border border-line bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-graphite shadow-sm"
                    >
                      {pillar}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        ) : filteredCities.length === 0 ? (
          /* Empty Filter Result State */
          <div className="mt-10 rounded-card-lg border border-line bg-mist/60 p-8 text-center">
            <p className="text-body font-medium text-graphite">No sector cities found for this filter selection.</p>
            <p className="mt-2 text-[13px] text-mute">
              Select &quot;All Industries&quot; to view all 25 canonical sector cities in the MarineWorld registry.
            </p>
            <DigiButton
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => setActiveGroupId("ALL")}
            >
              Reset to All Industries
            </DigiButton>
          </div>
        ) : (
          /* City cards grid */
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCities.map((city, i) => (
              <Reveal key={city.id} delay={(i % 3) * 60} className="h-full">
                <CityCard city={city} selected={city.id === selectedId} onSelect={selectCity} />
              </Reveal>
            ))}
          </div>
        )}

        {/* Registry detail panel */}
        <div id="city-detail" ref={detailRef} role="region" aria-live="polite" aria-label="City registry detail">
          {selected ? (
            <div className="relative mt-8 overflow-hidden rounded-card-md border border-line bg-white shadow-lg">
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[4px] bg-royal" />
              <div className="grid gap-8 p-6 md:grid-cols-12 md:p-9">
                <div className="md:col-span-7">
                  <div className="flex items-center gap-4">
                    <DigiIconContainer icon={selected.icon} mode="royal" size={44} />
                    <div>
                      <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-mute">
                        {selected.code} — {selected.category}
                      </p>
                      <h3 className="text-h3 mt-1 uppercase tracking-[-0.02em] text-graphite">{selected.domain}</h3>
                    </div>
                  </div>
                  <p className="text-lead mt-5 text-stone">{selected.description}</p>
                  <div className="mt-6">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-mute mb-2">Scope & Capabilities</p>
                    <ul className="space-y-2.5">
                      {selected.scope.map((item) => (
                        <li key={item} className="flex items-center gap-3 text-[14px] text-graphite">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-soft text-royal shrink-0">
                            <Icon name="check" className="h-3 w-3" strokeWidth={2} />
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="md:col-span-5">
                  <div className="rounded-card-sm bg-mist p-6">
                    <div className="flex items-center justify-between gap-3">
                      <p className="eyebrow text-mute">Registry Status</p>
                      <StatusBadge status={resolveCityStatus(selected)} withDot />
                    </div>
                    <dl className="mt-4">
                      <MetadataRow label="Domain" value={selected.domain} mono divider />
                      <MetadataRow label="Canonical Group" value={selected.category} divider />
                      <MetadataRow label="Sector Registry" value={config.sectorId.toUpperCase()} />
                    </dl>
                    <DigiButton
                      href={`/cities/${selected.slug}`}
                      size="sm"
                      className="mt-6 w-full"
                      icon="arrowUpRight"
                    >
                      Explore {selected.domain}
                    </DigiButton>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Close city detail"
                className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-stone transition-colors duration-300 hover:bg-mist hover:text-graphite"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>

        {/* Expand registry control for "All Industries" */}
        {activeGroupId === "ALL" && !expanded && cities.length > PREVIEW_COUNT ? (
          <div className="mt-10 flex justify-center">
            <DigiButton
              variant="secondary"
              onClick={() => setExpanded(true)}
              icon="chevronDown"
              ariaLabel="Show all 25 sector cities"
            >
              Show All {cities.length} Cities
            </DigiButton>
          </div>
        ) : null}
      </DigiContainer>
    </DigiSection>
  );
}
