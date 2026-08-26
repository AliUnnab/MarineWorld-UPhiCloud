import { useMemo } from "react";
import type { SectorConfig } from "@/lib/types";
import {
  DigiContainer,
  DigiSection,
  DigiSectionHeader,
  Reveal,
} from "@/components/digione/primitives";
import { CanonicalSectorCityCard } from "@/components/foundation/CanonicalCityCard";
import { getCities, getMarineDomains } from "@/lib/registry";
import { ArrowRight, Compass, Layers } from "lucide-react";

/**
 * SectorExplorer — Compact Showcase for Sector Cities (Section 03).
 * Provides a high-impact, curated preview of sovereign Sector Cities
 * with a single clear gateway linking to the full canonical directory (/cities).
 */
export function SectorExplorer({ config }: { config: SectorConfig }) {
  const { explorer } = config;
  const cities = useMemo(() => getCities(config), [config]);
  const domains = useMemo(() => getMarineDomains(), []);

  // 4 curated representative Sector Cities across distinct industry domains
  const showcaseCities = useMemo(() => {
    const desiredSlugs = ["shipyard", "port", "yachtsales", "marineai"];
    const matched = cities.filter((c) =>
      desiredSlugs.some((slug) => c.slug === slug || c.id === slug)
    );
    return matched.length >= 4 ? matched.slice(0, 4) : cities.slice(0, 4);
  }, [cities]);

  return (
    <DigiSection id="explorer" className="bg-white">
      <DigiContainer>
        <Reveal>
          <DigiSectionHeader
            id="explorer-title"
            index="03 / SECTOR CITIES"
            eyebrow={explorer?.eyebrow ?? "Specialized Sector Cities"}
            title={explorer?.headline ?? "EXPLORE THE MARITIME CITY."}
            lead={
              explorer?.lead ??
              "MarineWorld is organized into specialized sector cities. Each city represents a distinct operational domain with its own registry, verified companies, products and services."
            }
            right={
              <div className="border-l-2 border-royal pl-4">
                <p className="text-[13px] font-semibold text-graphite uppercase tracking-wider">
                  {cities.length} Sovereign Sector Cities
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-mute">
                  Organized across {domains.length} Master Industry Domains. Fully accessible across the global maritime network.
                </p>
              </div>
            }
          />
        </Reveal>

        {/* 4 Representative Sector City Cards Grid */}
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {showcaseCities.map((city, i) => (
            <Reveal key={city.id || city.slug} delay={i * 60} className="h-full">
              <CanonicalSectorCityCard city={city} />
            </Reveal>
          ))}
        </div>

        {/* Clear Gateway to Full Cities Directory */}
        <Reveal delay={120}>
          <div className="mt-10 rounded-2xl border border-line bg-slate-50 p-6 sm:p-7 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-royal/10 border border-royal/20 flex items-center justify-center text-royal shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-graphite">
                  Looking for a specific maritime sector domain?
                </h4>
                <p className="text-xs text-stone mt-0.5">
                  Browse all {cities.length} Sector Cities across {domains.length} Master Industry Domains with full registry search and classification tools.
                </p>
              </div>
            </div>

            <a
              href="/cities"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-royal hover:bg-royal-dark text-white text-xs font-bold shadow-xs transition shrink-0 cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>BROWSE ALL {cities.length} SECTOR CITIES</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </Reveal>
      </DigiContainer>
    </DigiSection>
  );
}
