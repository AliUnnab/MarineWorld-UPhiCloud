import type { SectorConfig } from "@/lib/types";
import {
  DigiContainer,
  DigiIconContainer,
  DigiSection,
  DigiSectionHeader,
  Reveal,
} from "@/components/digione/primitives";

/**
 * Platform Architecture — Connecting Physical Maritime Assets with Digital Infrastructure & AI.
 */
export function SectorArchitecture({ config }: { config: SectorConfig }) {
  return (
    <DigiSection id="architecture" className="bg-canvas border-y border-line">
      <DigiContainer>
        <Reveal>
          <DigiSectionHeader
            id="architecture-title"
            index="01"
            eyebrow="PLATFORM ARCHITECTURE"
            title="Two Layers, One Unified Maritime System"
            lead="Connecting physical maritime assets, shipyards, and port terminals directly into a verified digital registry and AI network."
          />
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {/* Card 01 — Physical Maritime Assets */}
            <div className="flex flex-col justify-between rounded-card-lg border border-line bg-white p-8 md:p-10 shadow-sm min-h-[260px]">
              <div>
                <div className="flex items-center justify-between">
                  <DigiIconContainer icon="ship" mode="solid" size={44} />
                  <span className="font-sans text-[12px] font-bold tracking-wider text-stone uppercase">
                    01
                  </span>
                </div>
                <h3 className="text-h3 mt-6 font-bold text-graphite">Physical Maritime Assets</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-stone">
                  Connecting physical vessels, shipyards, port terminals, and offshore facilities operating across global trade routes into the unified maritime network.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-line">
                <span className="rounded bg-mist px-3 py-1.5 font-sans text-[11.5px] font-medium text-graphite">Commercial Fleets</span>
                <span className="rounded bg-mist px-3 py-1.5 font-sans text-[11.5px] font-medium text-graphite">Dry Docks & Refit</span>
                <span className="rounded bg-mist px-3 py-1.5 font-sans text-[11.5px] font-medium text-graphite">Port Terminals</span>
                <span className="rounded bg-mist px-3 py-1.5 font-sans text-[11.5px] font-medium text-graphite">Offshore Rigs</span>
              </div>
            </div>

            {/* Card 02 — Digital Infrastructure & AI */}
            <div className="flex flex-col justify-between rounded-card-lg border border-royal/30 bg-soft p-8 md:p-10 shadow-sm min-h-[260px]">
              <div>
                <div className="flex items-center justify-between">
                  <DigiIconContainer icon="twin" mode="royal" size={44} />
                  <span className="font-sans text-[12px] font-bold tracking-wider text-royal uppercase">
                    02
                  </span>
                </div>
                <h3 className="text-h3 mt-6 font-bold text-graphite">Digital Infrastructure & AI</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-stone">
                  Structured digital business ecosystem featuring Industry Cities, verified company profiles, digital registries, and autonomous AI company twins.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-line">
                <span className="rounded bg-white px-3 py-1.5 font-sans text-[11.5px] text-royal font-semibold shadow-2xs">Industry Cities</span>
                <span className="rounded bg-white px-3 py-1.5 font-sans text-[11.5px] text-royal font-semibold shadow-2xs">Verified Company</span>
                <span className="rounded bg-white px-3 py-1.5 font-sans text-[11.5px] text-royal font-semibold shadow-2xs">Digital Registry</span>
                <span className="rounded bg-white px-3 py-1.5 font-sans text-[11.5px] text-royal font-semibold shadow-2xs">AI Company Twin</span>
              </div>
            </div>
          </div>

          {/* Value Connection Banner */}
          <div className="mt-8 rounded-card-md border border-line bg-white/80 p-5 text-center shadow-2xs">
            <p className="font-sans text-[13px] font-medium text-graphite flex flex-wrap items-center justify-center gap-2">
              <span className="font-semibold text-graphite">Physical Maritime Operations</span>
              <span className="text-royal font-bold">+</span>
              <span className="font-semibold text-graphite">Verified Digital Infrastructure</span>
              <span className="text-royal font-bold">=</span>
              <span className="font-bold text-royal">One Unified Maritime System</span>
            </p>
          </div>
        </Reveal>
      </DigiContainer>
    </DigiSection>
  );
}

