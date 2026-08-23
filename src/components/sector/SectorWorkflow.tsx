import type { SectorConfig } from "@/lib/types";
import { DigiContainer, DigiIconContainer, DigiSection, DigiSectionHeader, Reveal } from "@/components/digione/primitives";

/**
 * Enterprise Workflows — clear business operating procedures.
 */
export function SectorWorkflow({ config }: { config: SectorConfig }) {
  const { workflow } = config;

  return (
    <DigiSection id="workflow" className="bg-canvas border-y border-line">
      <DigiContainer>
        <Reveal>
          <DigiSectionHeader
            id="workflow-title"
            index="07 / WORKFLOW"
            eyebrow={workflow.eyebrow}
            title={workflow.headline}
            lead={workflow.lead}
          />
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {workflow.steps.map((step) => (
              <div
                key={step.id}
                className="relative rounded-card-md border border-line bg-white p-7 shadow-sm transition-all duration-300 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <DigiIconContainer icon={step.icon} mode="solid" size={38} />
                  <span className="font-sans text-[12px] font-bold text-royal">{step.index}</span>
                </div>

                <h3 className="mt-5 text-[16px] font-semibold text-graphite">{step.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-stone">{step.description}</p>
                <p className="mt-4 rounded bg-mist p-2.5 font-sans text-[12px] text-stone font-medium">{step.example}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </DigiContainer>
    </DigiSection>
  );
}
