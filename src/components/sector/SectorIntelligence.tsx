import { useMemo } from "react";
import type { SectorConfig } from "@/lib/types";
import {
  DigiContainer,
  DigiIconContainer,
  DigiSection,
  DigiSectionHeader,
  Reveal,
} from "@/components/digione/primitives";
import { getMarineDomains } from "@/lib/registry";
import { ArrowRight, Layers } from "lucide-react";

/**
 * Industry Intelligence — how the maritime industry connects.
 * 12 interconnected operational facets spanning the 8 Master Industry Domains.
 */
export function SectorIntelligence({ config }: { config: SectorConfig }) {
  const { intelligence } = config;
  const domains = useMemo(() => getMarineDomains(), []);

  return (
    <DigiSection id="intelligence">
      <DigiContainer>
        <Reveal>
          <DigiSectionHeader
            id="intelligence-title"
            index="02 / CONNECTIVITY"
            eyebrow="12 Operational Facets · 8 Master Industry Domains"
            title={intelligence.headline}
            lead="Maritime business has historically lived in fragments — yards, ports, brokers, suppliers, financiers, and institutions operating in separate silos. MarineWorld connects 12 key operational facets across 8 Master Industry Domains, where every domain operates as a live node in the same sovereign system."
            right={
              <div className="border-l-2 border-royal pl-4">
                <p className="text-[13px] font-semibold text-graphite uppercase tracking-wider">
                  How The Industry Connects
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-stone">
                  12 operational facets structured across {domains.length} Master Industry Domains.
                </p>
              </div>
            }
          />
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-12 overflow-hidden rounded-card-lg border border-line bg-white shadow-xs">
            {/* Schematic node grid — hairline structural lines */}
            <div className="grid grid-cols-2 gap-px bg-line md:grid-cols-4">
              {intelligence.domains.map((domain, i) => (
                <div
                  key={domain.id}
                  className="group relative bg-white p-6 transition-colors duration-500 ease-digi hover:bg-mist md:p-7"
                >
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-0 h-[2px] w-0 bg-royal transition-all duration-500 ease-digi group-hover:w-full"
                  />
                  <div className="flex items-start justify-between">
                    <DigiIconContainer icon={domain.icon} mode="subtle" size={40} />
                    <span className="font-sans text-[11px] font-semibold tracking-wider text-mute">
                      NODE-{String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="text-h3 mt-5 text-graphite">{domain.label}</p>
                  <p className="eyebrow mt-2 text-mute">{domain.meta}</p>
                </div>
              ))}
            </div>

            {/* System caption & taxonomy link */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-line bg-canvas px-6 py-5 md:px-7">
              <div className="flex items-center gap-3">
                <DigiIconContainer icon="network" mode="royal" size={32} />
                <p className="text-body max-w-[640px] text-stone text-xs sm:text-sm">
                  These 12 operational facets connect across MarineWorld&apos;s {domains.length} Master Industry Domains — sharing one identity system, verified registry, and sovereign AI layer.
                </p>
              </div>

              <a
                href="/sectors"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-royal hover:text-royal-dark hover:underline shrink-0"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>View {domains.length} Master Industry Domains</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </Reveal>
      </DigiContainer>
    </DigiSection>
  );
}
