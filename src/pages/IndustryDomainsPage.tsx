import { useState } from "react";
import type { SectorConfig } from "@/lib/types";
import { PageShell } from "@/components/foundation/PageShell";
import { FilterBar } from "@/components/foundation/FilterBar";
import { Icon } from "@/components/digione/icons";
import {
  DigiBadge,
  DigiButton,
  DigiContainer,
  DigiIconContainer,
  Reveal,
} from "@/components/digione/primitives";
import { getCities, getMarineDomains } from "@/lib/registry";

export function IndustryDomainsPage({ config }: { config: SectorConfig }) {
  const cities = getCities(config);
  const domains = getMarineDomains();
  const [filter, setFilter] = useState("All");

  const categories = ["All", ...Array.from(new Set(cities.map((c) => c.category)))];
  const options = categories.map((cat) => ({
    value: cat,
    label: cat,
    count: cat === "All" ? cities.length : cities.filter((c) => c.category === cat).length,
  }));

  const filteredCities =
    filter === "All" ? cities : cities.filter((c) => c.category === filter);

  const breadcrumbs = [
    { label: "MARINEWORLD", href: "/" },
    { label: "MARITIME CATEGORIES" },
  ];

  return (
    <PageShell
      config={config}
      breadcrumbs={breadcrumbs}
      metadata={{
        title: "Maritime Categories & Industry Domains | MarineWorld.City",
        description: "Explore the taxonomy of maritime industry domains and specialized sector cities within MarineWorld.",
      }}
    >
      <div className="pb-24">
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

              <p className="text-lead mt-5 max-w-2xl text-stone">
                Select an Industry Domain or Sector City to enter its dedicated digital environment, explore company networks, and inspect capabilities.
              </p>
            </Reveal>

            {/* INDUSTRY DOMAINS OVERVIEW */}
            <Reveal delay={60}>
              <div className="mt-12 rounded-card-lg border border-line bg-white p-6 md:p-8">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-royal">
                  INDUSTRY DOMAIN TAXONOMY
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                  {domains.map((dom) => (
                    <a
                      key={dom.id}
                      href={`/industries/${dom.slug}`}
                      className="group flex items-center justify-between rounded-card-sm border border-line bg-canvas p-3.5 transition-all hover:border-royal hover:bg-soft/40"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <DigiIconContainer icon={dom.icon} mode="royal" size={28} />
                        <span className="text-[13px] font-semibold text-graphite truncate group-hover:text-royal">
                          {dom.name}
                        </span>
                      </div>
                      <Icon name="arrowRight" className="h-3.5 w-3.5 text-mute group-hover:text-royal shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="mt-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-h2 text-graphite">All Registered Sector Cities</h2>
                  <p className="mt-1 text-[13.5px] text-stone">
                    Filter sector city environments by primary operational category.
                  </p>
                </div>
                <FilterBar
                  options={options}
                  value={filter}
                  onChange={setFilter}
                  label="Filter maritime cities"
                />
              </div>
            </Reveal>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCities.map((city, i) => (
                <Reveal key={city.id} delay={(i % 3) * 60} className="h-full">
                  <div className="flex h-full flex-col justify-between overflow-hidden rounded-card-md border border-line bg-white p-7 transition-all duration-300 hover:border-royal/40 hover:shadow-md">
                    <div>
                      <div className="flex items-center justify-between">
                        <DigiIconContainer icon={city.icon} mode="royal" size={42} />
                        <span className="font-mono text-[11px] font-bold tracking-[0.14em] text-royal">
                          {city.code}
                        </span>
                      </div>

                      <h3 className="text-h2 mt-5 text-graphite">{city.domain}</h3>
                      <p className="eyebrow mt-1 text-mute">{city.category}</p>
                      <p className="mt-4 text-[13.5px] leading-relaxed text-stone">{city.description}</p>

                      <div className="mt-6 border-t border-line pt-4">
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">Operational Scope</p>
                        <ul className="mt-2 space-y-1.5">
                          {city.scope.slice(0, 3).map((s) => (
                            <li key={s} className="flex items-center gap-2 text-[12.5px] text-graphite">
                              <Icon name="check" className="h-3 w-3 text-royal shrink-0" strokeWidth={2.2} />
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-8 flex gap-3 border-t border-line pt-5">
                      <DigiButton href={`/cities/${city.slug}`} size="sm" className="w-full" icon="arrowRight">
                        ENTER CITY
                      </DigiButton>
                      <DigiButton href={`/enter/${city.slug}`} variant="secondary" size="sm" icon="key">
                        Portal
                      </DigiButton>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </DigiContainer>
        </section>
      </div>
    </PageShell>
  );
}
