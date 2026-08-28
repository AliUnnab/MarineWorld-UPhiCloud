import { useState, useEffect } from "react";
import type { SectorConfig, SectorCity, IndustryDomainEntity } from "@/lib/types";
import { PageShell } from "@/components/foundation/PageShell";
import {
  DigiBadge,
  DigiButton,
  DigiContainer,
  DigiIconContainer,
  Reveal,
} from "@/components/digione/primitives";
import { getCities, getCitiesByDomain, getMarineDomains } from "@/lib/registry";
import { listSectorCities, listIndustryDomains } from "@/services/sectorService";

export function IndustryDomainsPage({ config }: { config: SectorConfig }) {
  const [liveCities, setLiveCities] = useState<SectorCity[]>([]);
  const [liveDomains, setLiveDomains] = useState<IndustryDomainEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      listSectorCities(),
      listIndustryDomains(),
    ])
      .then(([cities, domains]) => {
        setLiveCities(cities || []);
        setLiveDomains((domains || []) as unknown as IndustryDomainEntity[]);
      })
      .catch((err) => {
        console.warn("[IndustryDomainsPage] Firestore load error:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const cities = liveCities;
  const domains = liveDomains;

  const breadcrumbs = [
    { label: "MARINEWORLD", href: "/" },
    { label: "MARITIME TAXONOMY & SECTORS" },
  ];

  return (
    <PageShell
      config={config}
      breadcrumbs={breadcrumbs}
      metadata={{
        title: "Maritime Registry Taxonomy — 8 Industry Domains | MarineWorld.City",
        description: "Explore the canonical taxonomy of 8 master industry domains and 82 sector cities within MarineWorld.",
      }}
    >
      <div className="pb-28">
        {/* HERO HEADER */}
        <section className="bg-canvas border-b border-line py-12 md:py-16">
          <DigiContainer>
            <Reveal>
              <div className="flex flex-wrap items-center gap-3">
                <DigiBadge variant="soft">MARITIME REGISTRY TAXONOMY</DigiBadge>
                <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-mute">
                  {domains.length} INDUSTRY DOMAINS · {cities.length} SECTOR CITIES
                </span>
              </div>

              <h1 className="text-display mt-6 max-w-3xl text-graphite">
                Maritime Categories & Sector Cities
              </h1>

              <p className="text-lead mt-5 max-w-3xl text-stone">
                Inspect the 8 Master Industry Domains organizing the global maritime economy. Explore any domain to view its associated Sector Cities in the canonical directory.
              </p>
            </Reveal>

            {/* MASTER INDUSTRY DOMAIN CARDS */}
            <Reveal delay={60}>
              <div className="mt-12">
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <div>
                    <h2 className="text-h2 text-graphite">Master Industry Domains</h2>
                    <p className="mt-1 text-[13.5px] text-stone">
                      Primary economic domain groupings established for the global marine registry.
                    </p>
                  </div>
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-royal hidden sm:inline-block">
                    {domains.length} ACTIVE DOMAINS
                  </span>
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {domains.map((dom, index) => {
                    const domainCities = getCitiesByDomain(config, dom.slug);
                    const cityCount = domainCities.length;
                    const domainNumber = String(index + 1).padStart(2, "0");

                    return (
                      <div
                        key={dom.id}
                        className="group flex flex-col justify-between rounded-card-md border border-line bg-white p-6 transition-all duration-300 hover:border-royal hover:shadow-md"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <DigiIconContainer icon={dom.icon} mode="royal" size={38} />
                            <span className="font-mono text-[11px] font-bold text-royal tracking-[0.14em]">
                              {domainNumber}
                            </span>
                          </div>

                          <h3 className="mt-4 text-[16px] font-bold text-graphite tracking-tight leading-snug group-hover:text-royal transition-colors">
                            {dom.name}
                          </h3>

                          <p className="mt-2.5 text-[12.5px] leading-relaxed text-stone">
                            {dom.description}
                          </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-line flex items-center justify-between">
                          <span className="font-mono text-[11px] font-semibold text-mute">
                            {cityCount} {cityCount === 1 ? "Sector City" : "Sector Cities"}
                          </span>
                          <DigiButton
                            href={`/cities?domain=${dom.slug}`}
                            variant="ghost"
                            size="sm"
                            icon="arrowRight"
                            className="!px-2.5 !py-1 text-[12px] font-medium"
                          >
                            Explore
                          </DigiButton>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Reveal>
          </DigiContainer>
        </section>
      </div>
    </PageShell>
  );
}

