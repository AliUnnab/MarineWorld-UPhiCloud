import { useState, useEffect } from "react";
import type { SectorConfig, CompanyEntity, SectorCity } from "@/lib/types";
import { PageShell } from "@/components/foundation/PageShell";
import { CompanyCard } from "@/components/foundation/CompanyCard";
import { CanonicalSectorCityCard } from "@/components/foundation/CanonicalCityCard";
import {
  DigiBadge,
  DigiButton,
  DigiContainer,
  DigiIconContainer,
  Reveal,
} from "@/components/digione/primitives";
import { getIndustryDomainBySlug } from "@/lib/registry";
import { listCompanies } from "@/services/companyService";
import { listSectorCities } from "@/services/sectorService";
import { Globe2, Building2 } from "lucide-react";

export function IndustryDomainPage({
  config,
  domainSlug,
}: {
  config: SectorConfig;
  domainSlug: string;
}) {
  const domain = getIndustryDomainBySlug(domainSlug) ?? {
    id: "maritime-services",
    slug: "maritime-services",
    name: "Maritime Services",
    description: "Commercial maritime services — trade, sourcing, supply chain and procurement across the global marine ecosystem.",
    icon: "exchange",
    status: "LIVE",
  };

  const [liveCities, setLiveCities] = useState<SectorCity[]>([]);
  const [liveCompanies, setLiveCompanies] = useState<CompanyEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      listSectorCities(),
      listCompanies(),
    ])
      .then(([cities, companies]) => {
        if (cities && cities.length > 0) {
          const matching = cities.filter(
            (c) =>
              (c.category && c.category.toLowerCase() === domain.name.toLowerCase()) ||
              c.industryDomainId === domain.id ||
              c.industryDomainId === domain.slug
          );
          setLiveCities(matching);
        }
        if (companies && companies.length > 0) {
          setLiveCompanies(companies);
        }
      })
      .catch((err) => {
        console.warn("[IndustryDomainPage] Firestore load error:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [domain.id, domain.slug, domain.name]);

  const citiesInDomain = liveCities;
  const domainCityIds = citiesInDomain.map((c) => c.id);
  const allComps: any[] = liveCompanies;
  const companiesInDomain = allComps.filter(
    (comp) =>
      ((comp.cityIds && comp.cityIds.some((cId: string) => domainCityIds.includes(cId))) ||
        (comp.sectorCityIds && comp.sectorCityIds.some((cId: string) => domainCityIds.includes(cId)))) ||
      (comp.industry && comp.industry.toLowerCase().includes(domain.name.toLowerCase().split(" ")[0]))
  );

  const breadcrumbs = [
    { label: "MARINEWORLD", href: "/" },
    { label: "MARITIME TAXONOMY", href: "/sectors" },
    { label: domain.name.toUpperCase() },
  ];

  return (
    <PageShell
      config={config}
      breadcrumbs={breadcrumbs}
      metadata={{
        title: `${domain.name} | MarineWorld.City`,
        description: domain.description,
      }}
    >
      <div className="pb-24">
        {/* DOMAIN HERO */}
        <section className="bg-canvas border-b border-line py-12 md:py-16">
          <DigiContainer>
            <Reveal>
              <div className="overflow-hidden rounded-card-lg border border-line bg-white p-8 md:p-12 shadow-sm">
                <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
                  <div className="lg:col-span-8">
                    <div className="flex items-center gap-4">
                      <DigiIconContainer icon={domain.icon ?? "exchange"} mode="royal" size={52} />
                      <div>
                        <DigiBadge variant="soft">INDUSTRY DOMAIN</DigiBadge>
                        <h1 className="text-display mt-2 text-graphite">{domain.name}</h1>
                      </div>
                    </div>

                    <p className="text-lead mt-6 text-stone">{domain.description}</p>

                    <div className="mt-8 flex flex-wrap gap-4">
                      <DigiButton href="#cities" icon="chevronDown">
                        EXPLORE {citiesInDomain.length} SECTOR CITIES
                      </DigiButton>
                      <DigiButton href="/sectors" variant="secondary">
                        All Industry Domains
                      </DigiButton>
                    </div>
                  </div>

                  <div className="lg:col-span-4">
                    <div className="rounded-card-md border border-line bg-mist p-6">
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-mute">
                        DOMAIN METRICS
                      </p>
                      <dl className="mt-4 space-y-3 font-mono text-[12px]">
                        <div className="flex justify-between border-b border-line pb-2">
                          <dt className="text-mute">Domain Handle</dt>
                          <dd className="font-bold text-royal">{domain.slug}</dd>
                        </div>
                        <div className="flex justify-between border-b border-line pb-2">
                          <dt className="text-mute">Sector Cities</dt>
                          <dd className="text-graphite font-semibold">{citiesInDomain.length} Cities</dd>
                        </div>
                        <div className="flex justify-between border-b border-line pb-2">
                          <dt className="text-mute">Verified Companies</dt>
                          <dd className="text-graphite">{companiesInDomain.length} Verified Nodes</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-mute">Status</dt>
                          <dd className="font-semibold text-emerald-600">ACTIVE REGISTRY</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </DigiContainer>
        </section>

        {/* CITIES IN THIS DOMAIN */}
        <section id="cities" className="py-12 md:py-16 border-b border-line">
          <DigiContainer>
            <Reveal>
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div>
                  <h2 className="text-h2 text-graphite">Associated Sector Cities</h2>
                  <p className="mt-1 text-[13.5px] text-stone">
                    Sovereign digital hubs mapped under the {domain.name} category.
                  </p>
                </div>
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-royal hidden sm:inline-block">
                  {citiesInDomain.length} SECTOR CITIES
                </span>
              </div>

              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                  <div className="col-span-full py-12 px-6 rounded-card-md border border-line bg-canvas text-center">
                    <Globe2 className="w-8 h-8 text-royal animate-pulse mx-auto mb-2" />
                    <p className="text-sm font-bold text-graphite">Loading Sector Cities...</p>
                  </div>
                ) : citiesInDomain.length === 0 ? (
                  <div className="col-span-full py-12 px-6 rounded-card-md border border-line bg-canvas text-center">
                    <Globe2 className="w-8 h-8 text-mute mx-auto mb-2" />
                    <p className="text-sm font-bold text-graphite">No Sector Cities Found</p>
                    <p className="text-xs text-stone mt-1">No sector city has been linked to this sub-sector domain yet.</p>
                  </div>
                ) : (
                  citiesInDomain.map((city) => (
                    <CanonicalSectorCityCard
                      key={city.id}
                      city={city}
                    />
                  ))
                )}
              </div>
            </Reveal>
          </DigiContainer>
        </section>

        {/* COMPANIES IN THIS DOMAIN */}
        <section className="py-12 md:py-16">
          <DigiContainer>
            <Reveal>
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div>
                  <h2 className="text-h2 text-graphite">Sector Enterprises</h2>
                  <p className="mt-1 text-[13.5px] text-stone">
                    Verified enterprises operating across {domain.name} sector cities.
                  </p>
                </div>
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-royal hidden sm:inline-block">
                  {companiesInDomain.length} VERIFIED
                </span>
              </div>

              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                  <div className="col-span-full py-12 px-6 rounded-card-md border border-line bg-canvas text-center">
                    <Building2 className="w-8 h-8 text-royal animate-pulse mx-auto mb-2" />
                    <p className="text-sm font-bold text-graphite">Loading Companies...</p>
                  </div>
                ) : companiesInDomain.length === 0 ? (
                  <div className="col-span-full py-12 px-6 rounded-card-md border border-line bg-canvas text-center">
                    <Building2 className="w-8 h-8 text-mute mx-auto mb-2" />
                    <p className="text-sm font-bold text-graphite">No Registered Companies Found</p>
                    <p className="text-xs text-stone mt-1">There are no registered companies under this domain yet.</p>
                  </div>
                ) : (
                  companiesInDomain.map((company) => (
                    <div key={company.id}>
                      <CompanyCard
                        company={company as any}
                        context={{
                          city: company.city,
                          domain: domain.name,
                          category: domain.name,
                        }}
                        showEntryPoint={true}
                      />
                    </div>
                  ))
                )}
              </div>
            </Reveal>
          </DigiContainer>
        </section>
      </div>
    </PageShell>
  );
}
