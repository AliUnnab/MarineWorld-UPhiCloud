import type { SectorConfig } from "@/lib/types";
import { DigiButton, DigiContainer, DigiSection, Reveal } from "@/components/digione/primitives";

/**
 * Enterprise Closing CTA — clean, authoritative entry portal.
 */
export function SectorClosing({ config }: { config: SectorConfig }) {
  const { cta } = config;

  return (
    <DigiSection id="enter" className="bg-graphite text-white">
      <DigiContainer>
        <Reveal>
          <div className="relative overflow-hidden rounded-card-lg border border-white/15 bg-white/5 p-10 text-center md:p-16">
            <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-electric">
              {cta.eyebrow}
            </span>

            <h2 className="text-display mt-4 mx-auto max-w-3xl text-white">
              {cta.headline}
            </h2>

            <p className="text-lead mt-6 mx-auto max-w-xl text-white/70">
              {cta.body}
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <DigiButton href="#explorer" variant="dark" size="md" icon="arrowRight">
                {cta.primary}
              </DigiButton>
              <DigiButton href={`/industries/${config.sectorId}`} variant="secondary" size="md">
                {cta.secondary}
              </DigiButton>
            </div>
          </div>
        </Reveal>
      </DigiContainer>
    </DigiSection>
  );
}
