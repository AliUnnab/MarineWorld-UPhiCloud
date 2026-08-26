import { useState } from "react";
import type { SectorConfig } from "@/lib/types";
import { Icon } from "@/components/digione/icons";
import {
  DigiBadge,
  DigiButton,
  DigiContainer,
  DigiIconContainer,
  DigiSection,
  DigiSectionHeader,
  Reveal,
} from "@/components/digione/primitives";

/**
 * AI-Native Layer — AI as business infrastructure.
 * Demonstrates grounded company twin interaction.
 */
export function SectorAI({ config }: { config: SectorConfig }) {
  const { ai } = config;
  const [query, setQuery] = useState("");
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const presets = [
    { label: "Refit yards with steel fabrication in Med", city: "SHIPYARD.CITY" },
    { label: "ROV survey contractors in Northern Europe", city: "SUBSEA.CITY" },
    { label: "DP2 vessel charter availability for Q3", city: "CHARTER.CITY" },
    { label: "Class-approved naval architects in Rotterdam", city: "ENGINEERING.CITY" },
  ];

  return (
    <DigiSection id="ai" className="bg-graphite text-white">
      <DigiContainer>
        <Reveal>
          <DigiSectionHeader
            id="ai-title"
            index="05 / AI LAYER"
            eyebrow={ai.eyebrow}
            title={ai.headline}
            lead={ai.lead}
            tone="dark"
          />
        </Reveal>

        {/* AI Capabilities Grid */}
        <Reveal delay={100}>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ai.capabilities.map((cap) => (
              <div
                key={cap.id}
                className="group rounded-card-md border border-white/12 bg-white/5 p-6 transition-colors duration-300 hover:border-white/25 hover:bg-white/8"
              >
                <DigiIconContainer icon={cap.icon} mode="dark" size={38} />
                <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.01em] text-white">{cap.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/60">{cap.description}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Company Digital Twin section */}
        <Reveal delay={140}>
          <div className="mt-16 overflow-hidden rounded-card-lg border border-white/15 bg-white/5 p-8 md:p-12">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-6">
                <DigiBadge variant="dark" dot dotClass="bg-electric">
                  {ai.twin.eyebrow}
                </DigiBadge>
                <h3 className="text-h2 mt-4 text-white">{ai.twin.headline}</h3>
                <p className="mt-4 text-[14.5px] leading-relaxed text-white/70">{ai.twin.body}</p>

                <ul className="mt-6 space-y-3">
                  {ai.twin.points.map((point) => (
                    <li key={point} className="flex items-center gap-3 text-[13.5px] text-white/90">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-electric">
                        <Icon name="check" className="h-3 w-3" strokeWidth={2.2} />
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Interactive Twin Surface Preview */}
              <div className="lg:col-span-6">
                <div className="rounded-card-md border border-white/15 bg-graphite/90 p-6 shadow-2xl backdrop-blur-md">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute h-full w-full rounded-full bg-electric breathe" />
                        <span className="relative h-2 w-2 rounded-full bg-electric" />
                      </span>
                      <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-white">
                        TWIN SURFACE · DEMO INTERACTION
                      </span>
                    </div>
                    <span className="font-sans text-[11px] font-semibold text-white/40">MARINEWORLD.AI</span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-white/40">Prompt Presets</p>
                    <div className="flex flex-wrap gap-2">
                      {presets.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => {
                            setQuery(p.label);
                            setActivePreset(p.city);
                          }}
                          className={`rounded-full border px-3 py-1.5 text-left text-[11.5px] transition-colors duration-200 ${
                            query === p.label
                              ? "border-electric bg-electric/15 text-white"
                              : "border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    <div className="mt-5 rounded-card-sm border border-white/12 bg-white/5 p-4">
                      <div className="flex items-center gap-2 text-electric">
                        <Icon name="chip" className="h-4 w-4" />
                        <span className="font-sans text-[11px] font-semibold uppercase tracking-wider">Twin Resolution</span>
                      </div>
                      <p className="mt-2 font-sans text-[13px] leading-relaxed text-white/90">
                        {query ? `"${query}"` : "Select a preset prompt above to see AI Twin routing."}
                      </p>
                      {activePreset ? (
                        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5">
                          <span className="font-sans text-[10.5px] font-medium uppercase tracking-wider text-white/40">
                            Routed to registry:
                          </span>
                          <span className="font-sans text-[11px] font-semibold text-electric">
                            {activePreset}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 pt-2">
                    <DigiButton href="#enter" variant="dark" className="w-full" icon="arrowRight">
                      Activate Your Company Twin
                    </DigiButton>
                  </div>
                </div>
              </div>
            </div>

            {/* Twin Chain Architecture */}
            <div className="mt-10 border-t border-white/10 pt-8">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Twin Chain Architecture
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {ai.twin.chain.map((node) => (
                  <div key={node.id} className="rounded-card-sm border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-3">
                      <DigiIconContainer icon={node.icon} mode="dark" size={32} />
                      <div>
                        <p className="text-[13px] font-semibold text-white">{node.label}</p>
                        <p className="font-sans text-[11px] font-medium tracking-wide text-white/50">{node.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </DigiContainer>
    </DigiSection>
  );
}
