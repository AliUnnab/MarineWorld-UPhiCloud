import type { SectorConfig } from "@/lib/types";
import { Header } from "@/components/digione/Header";
import { Footer } from "@/components/digione/Footer";
import { Icon } from "@/components/digione/icons";
import {
  DigiBadge,
  DigiButton,
  DigiContainer,
  DigiIconContainer,
  Reveal,
} from "@/components/digione/primitives";
import { getCompanies } from "@/lib/registry";

export function CompanyPlaceholderPage({
  config,
  companyId,
}: {
  config: SectorConfig;
  companyId: string;
}) {
  const companies = getCompanies(config);
  const company = companies.find((c) => c.id === companyId) ?? companies[0];

  return (
    <div className="min-h-screen bg-canvas font-sans text-graphite antialiased">
      <Header sectorName={config.sectorName} sectorCode={config.sectorCode} />

      <main id="main-content" className="pt-28 md:pt-36 pb-24">
        <DigiContainer>
          {/* Breadcrumb */}
          <Reveal>
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
              <a href="/" className="hover:text-royal">
                MARITIME WORLD
              </a>
              <span>/</span>
              <a href="/#network" className="hover:text-royal">
                ECOSYSTEM
              </a>
              <span>/</span>
              <span className="text-graphite">{company.id.toUpperCase()}</span>
            </div>
          </Reveal>

          {/* Profile Header */}
          <Reveal delay={60}>
            <div className="mt-8 overflow-hidden rounded-card-lg border border-line bg-white p-8 md:p-12">
              <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
                <div className="lg:col-span-8">
                  <div className="flex items-center gap-4">
                    <DigiIconContainer icon="building" mode="royal" size={48} />
                    <div>
                      <DigiBadge variant="soft" dot dotClass="bg-emerald-500">
                        {company.verificationStatus.toUpperCase()} NODE
                      </DigiBadge>
                      <h1 className="text-display mt-2 text-graphite">{company.name}</h1>
                    </div>
                  </div>

                  <p className="text-lead mt-5 text-stone">{company.industry} — {company.city}</p>

                  <div className="mt-8 flex flex-wrap gap-4">
                    <DigiButton href="#twin" icon="spark">
                      Query Digital Twin
                    </DigiButton>
                    <DigiButton href="/#network" variant="secondary" icon="arrowUpRight">
                      Back to Network
                    </DigiButton>
                  </div>
                </div>

                <div className="lg:col-span-4">
                  <div className="rounded-card-md border border-line bg-mist p-6">
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-mute">
                      Verified Node Card
                    </p>
                    <dl className="mt-4 space-y-3 font-mono text-[12px]">
                      <div className="flex justify-between border-b border-line pb-2">
                        <dt className="text-mute">Location</dt>
                        <dd className="font-semibold text-graphite">{company.location}</dd>
                      </div>
                      <div className="flex justify-between border-b border-line pb-2">
                        <dt className="text-mute">Primary City</dt>
                        <dd className="text-royal font-bold">{company.city}</dd>
                      </div>
                      <div className="flex justify-between border-b border-line pb-2">
                        <dt className="text-mute">Industry</dt>
                        <dd className="text-graphite">{company.industry}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-mute">Registry ID</dt>
                        <dd className="text-graphite">{company.id.toUpperCase()}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Canonical Profile Details */}
          <Reveal delay={100}>
            <div className="mt-10 grid gap-8 md:grid-cols-2">
              <div className="rounded-card-md border border-line bg-white p-8">
                <h2 className="text-h2 text-graphite">Verified Capabilities & Scope</h2>
                <ul className="mt-6 space-y-3">
                  {company.capabilities.map((cap) => (
                    <li key={cap} className="flex items-center gap-3 text-[14px] text-graphite">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-soft text-royal shrink-0">
                        <Icon name="check" className="h-3 w-3" strokeWidth={2.2} />
                      </span>
                      <span>{cap}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div id="twin" className="rounded-card-md border border-line bg-graphite text-white p-8">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute h-full w-full rounded-full bg-electric breathe" />
                    <span className="relative h-2 w-2 rounded-full bg-electric" />
                  </span>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-electric">
                    AI DIGITAL TWIN · ACTIVE
                  </p>
                </div>

                <h2 className="text-h2 mt-3 text-white">{company.name} AI Twin Endpoint</h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-white/70">
                  Grounded in company specs, class approvals, and fleet availability. Available for automated RFP matching and inquiry routing across Maritime World.
                </p>

                <div className="mt-6 rounded-card-sm border border-white/12 bg-white/5 p-4 font-mono text-[12px] text-white/80">
                  <p className="text-electric">&gt; STATUS: {company.aiStatus.toUpperCase()}</p>
                  <p className="mt-1">&gt; RECORD TYPE: {company.recordType}</p>
                  <p className="mt-1">&gt; VERIFICATION: DNV & Lloyds Certified Node</p>
                </div>
              </div>
            </div>
          </Reveal>
        </DigiContainer>
      </main>

      <Footer config={config} />
    </div>
  );
}
