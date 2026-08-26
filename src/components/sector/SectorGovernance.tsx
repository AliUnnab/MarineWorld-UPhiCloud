import type { SectorConfig } from "@/lib/types";
import {
  DigiBadge,
  DigiContainer,
  DigiIconContainer,
  DigiSection,
  DigiSectionHeader,
  Reveal,
} from "@/components/digione/primitives";

/**
 * Trust & Governance — compliance, privacy, standards.
 */
export function SectorGovernance({ config }: { config: SectorConfig }) {
  const { governance } = config;

  return (
    <DigiSection id="governance">
      <DigiContainer>
        <Reveal>
          <DigiSectionHeader
            id="governance-title"
            index="08 / TRUST & COMPLIANCE"
            eyebrow={governance.eyebrow}
            title={governance.headline}
            lead={governance.lead}
          />
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {governance.pillars.map((pillar) => (
              <div key={pillar.id} className="rounded-card-md border border-line bg-white p-8">
                <DigiIconContainer icon={pillar.icon} mode="royal" size={40} />
                <h3 className="text-h3 mt-5 text-graphite">{pillar.title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-stone">{pillar.description}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Verification Architecture Banner */}
        <Reveal delay={140}>
          <div className="mt-12 flex flex-wrap items-center justify-between gap-6 rounded-card-md border border-line bg-mist p-6 md:p-8">
            <div className="flex items-center gap-4">
              <DigiIconContainer icon="shield" mode="solid" size={44} />
              <div>
                <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-mute">
                  System Standard
                </p>
                <p className="text-[15px] font-semibold text-graphite">
                  {governance.note}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <DigiBadge variant="soft">Sovereign Identity</DigiBadge>
              <DigiBadge variant="soft">Explicit Verification</DigiBadge>
              <DigiBadge variant="soft">Tenant Isolation</DigiBadge>
            </div>
          </div>
        </Reveal>
      </DigiContainer>
    </DigiSection>
  );
}
