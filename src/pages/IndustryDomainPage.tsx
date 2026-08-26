import type { SectorConfig } from "@/lib/types";
import { PageShell } from "@/components/foundation/PageShell";
import { CompanyCard } from "@/components/foundation/CompanyCard";
import { CanonicalSectorCityCard } from "@/components/foundation/CanonicalCityCard";
import { Icon } from "@/components/digione/icons";
import {
  DigiBadge,
  DigiButton,
  DigiContainer,
  DigiIconContainer,
  Reveal,
} from "@/components/digione/primitives";
import {
  getCitiesByDomain,
  getCompanies,
  getIndustryDomainBySlug,
} from "@/lib/registry";

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

  const citiesInDomain = getCitiesByDomain(config, domain.slug);

  // Get companies that belong to cities in this domain
  const domainCityIds = citiesInDomain.map((c) => c.id);
  const companiesInDomain = getCompanies(config).filter(
    (comp) =>
      comp.cityIds.some((cId) => domainCityIds.includes(cId)) ||
      comp.industry.toLowerCase().includes(domain.name.toLowerCase().split(" ")[0])
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

        {/* SECTOR CITIES IN THIS DOMAIN */}
        <section id="cities" className="py-16 bg-white border-b border-line">
          <DigiContainer>
            <Reveal>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-royal">
                SECTOR CITY NETWORK
              </p>
              <h2 className="text-h2 mt-1 text-graphite">
                Sector Cities Under {domain.name}
              </h2>
              <p className="mt-2 text-[14px] text-stone max-w-2xl">
                Specialized digital environments governing commercial operations within {domain.name}.
              </p>

              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {citiesInDomain.map((city) => (
                  <CanonicalSectorCityCard key={city.id} city={city} />
                ))}
              </div>
            </Reveal>
          </DigiContainer>
        </section>

        {/* COMPANIES IN THIS DOMAIN */}
        {companiesInDomain.length > 0 ? (
          <section className="py-16 bg-canvas border-b border-line">
            <DigiContainer>
              <Reveal>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-royal">
                  COMPANY NETWORK
                </p>
                <h2 className="text-h2 mt-1 text-graphite">
                  Companies in {domain.name}
                </h2>
                <p className="mt-2 text-[14px] text-stone">
                  Verified enterprises operating across {domain.name} sector cities.
                </p>

                <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {companiesInDomain.map((company) => (
                    <div key={company.id}>
                      <CompanyCard
                        company={company}
                        context={{
                          city: company.city,
                          domain: domain.name,
                          category: domain.name,
                        }}
                        showEntryPoint={true}
                      />
                    </div>
                  ))}
                </div>
              </Reveal>
            </DigiContainer>
          </section>
        ) : null}
      </div>
    </PageShell>
  );
}
