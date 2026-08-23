import type { SectorConfig } from "@/lib/types";
import {
  DigiContainer,
  DigiIconContainer,
  DigiSection,
  DigiSectionHeader,
  Reveal,
} from "@/components/digione/primitives";

/**
 * Industry Intelligence — the maritime industry rendered as one
 * connected system. Nodes, not marketing cards.
 */
export function SectorIntelligence({ config }: { config: SectorConfig }) {
  const { intelligence } = config;

  return (
    <DigiSection id="intelligence">
      <DigiContainer>
        <Reveal>
          <DigiSectionHeader
            id="intelligence-title"
            index="02 / SYSTEM"
            eyebrow={intelligence.eyebrow}
            title={intelligence.headline}
            lead={intelligence.lead}
          />
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-14 overflow-hidden rounded-card-lg border border-line bg-white">
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
                      N-{String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="text-h3 mt-5 text-graphite">{domain.label}</p>
                  <p className="eyebrow mt-2 text-mute">{domain.meta}</p>
                </div>
              ))}
            </div>

            {/* System caption */}
            <div className="flex items-start gap-4 border-t border-line bg-canvas px-6 py-5 md:px-7">
              <DigiIconContainer icon="network" mode="royal" size={34} />
              <p className="text-body max-w-[820px] text-stone">{intelligence.caption}</p>
            </div>
          </div>
        </Reveal>
      </DigiContainer>
    </DigiSection>
  );
}
