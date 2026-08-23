import type { SectorConfig } from "@/lib/types";
import { DigiContainer, DigiIconContainer, DigiSection, DigiSectionHeader, Reveal } from "@/components/digione/primitives";

/**
 * Regional Architecture — Maritime regions as operational clusters.
 */
export function SectorRegions({ config }: { config: SectorConfig }) {
  const { regions } = config;

  return (
    <DigiSection id="regions">
      <DigiContainer>
        <Reveal>
          <DigiSectionHeader
            id="regions-title"
            index="06 / GEOGRAPHY"
            eyebrow={regions.eyebrow}
            title={regions.headline}
            lead={regions.lead}
          />
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {regions.items.map((region) => (
              <div
                key={region.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-card-md border border-line bg-white p-7 transition-all duration-300 hover:border-royal/30 hover:shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <DigiIconContainer icon="globe" mode="royal" size={40} />
                    <span className="font-sans text-[11px] font-semibold tracking-wider text-mute">{region.code}</span>
                  </div>

                  <h3 className="text-h3 mt-5 text-graphite">{region.name}</h3>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-stone">{region.description}</p>
                </div>

                <div className="mt-6 border-t border-line pt-4">
                  <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-mute">Regional Focus</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {region.focus.map((item) => (
                      <span
                        key={item}
                        className="rounded bg-mist px-2.5 py-1 font-sans text-[11.5px] font-medium text-graphite"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </DigiContainer>
    </DigiSection>
  );
}
