import { useState, useMemo } from "react";
import type { SectorConfig, CompanyProfile } from "@/lib/types";
import { PageShell } from "@/components/foundation/PageShell";
import { FilterBar } from "@/components/foundation/FilterBar";
import {
  DigiBadge,
  DigiButton,
  DigiContainer,
  DigiIconContainer,
  Reveal,
} from "@/components/digione/primitives";
import { getCompanies, getCities } from "@/lib/registry";
import { Building2, Search, CheckCircle2, MapPin, ArrowRight, ExternalLink } from "lucide-react";

export function CompaniesDirectoryPage({ config }: { config: SectorConfig }) {
  const allCompanies = useMemo(() => getCompanies(config), [config]);
  const allCities = useMemo(() => getCities(config), [config]);
  
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const industries = useMemo(() => {
    const raw = allCompanies.map((c) => c.industry).filter(Boolean);
    return ["All", ...Array.from(new Set(raw))];
  }, [allCompanies]);

  const options = industries.map((ind) => ({
    value: ind,
    label: ind,
    count: ind === "All" ? allCompanies.length : allCompanies.filter((c) => c.industry === ind).length,
  }));

  const filteredCompanies = useMemo(() => {
    return allCompanies.filter((c) => {
      const matchFilter = filter === "All" || c.industry === filter;
      const matchSearch =
        searchQuery === "" ||
        (c.displayName || c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.location || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [allCompanies, filter, searchQuery]);

  const breadcrumbs = [
    { label: "MARINEWORLD", href: "/" },
    { label: "COMPANIES DIRECTORY" },
  ];

  return (
    <PageShell
      config={config}
      breadcrumbs={breadcrumbs}
      metadata={{
        title: "Maritime Companies Directory | MarineWorld.City",
        description: "Explore verified commercial maritime enterprises, shipyards, brokers, and supply chain leaders.",
      }}
    >
      <div className="pb-24">
        {/* HERO HEADER */}
        <section className="bg-canvas border-b border-slate-200/80 py-10 md:py-14">
          <DigiContainer>
            <Reveal>
              <div className="flex flex-wrap items-center gap-3">
                <DigiBadge variant="soft">VERIFIED ECOSYSTEM REGISTRY</DigiBadge>
                <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-slate-500">
                  {allCompanies.length} ENTERPRISES · {allCities.length} SECTOR CITIES
                </span>
              </div>

              <h1 className="text-display mt-4 max-w-3xl text-slate-900">
                Maritime Companies Directory
              </h1>

              <p className="text-lead mt-3 max-w-2xl text-slate-600">
                Explore accredited maritime enterprises, inspect digital operating twins, review product & service inventories, and initiate direct commercial inquiries.
              </p>
            </Reveal>

            {/* SEARCH & FILTERS */}
            <div className="mt-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative max-w-md w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by company name, capability, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <FilterBar
                options={options}
                value={filter}
                onChange={setFilter}
                label="Filter by industry sector"
              />
            </div>

            {/* COMPANY CARDS GRID */}
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCompanies.map((comp, idx) => (
                <Reveal key={comp.id} delay={(idx % 3) * 50} className="h-full">
                  <div className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg group">
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-1.5 overflow-hidden shrink-0">
                          {comp.coverImage || comp.logoUrl ? (
                            <img
                              src={comp.coverImage || comp.logoUrl}
                              alt={comp.displayName || comp.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Building2 className="w-6 h-6 text-slate-400" />
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 bg-blue-50/80 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide">
                          <CheckCircle2 className="w-3 h-3 text-blue-600" />
                          <span>VERIFIED</span>
                        </div>
                      </div>

                      {/* Name & Industry */}
                      <h3 className="mt-4 text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {comp.displayName || comp.name}
                      </h3>
                      <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-blue-600 mt-0.5">
                        {comp.industry}
                      </p>

                      <p className="mt-3 text-xs leading-relaxed text-slate-600 line-clamp-3">
                        {comp.shortDescription || comp.description}
                      </p>

                      {/* Location & Metrics */}
                      <div className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-500 border-t border-slate-100 pt-3">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{comp.location || comp.country || "Global Maritime"}</span>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-4">
                      <a
                        href={`/companies/${comp.slug || comp.id}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
                      >
                        <span>ENTER SHOWROOM</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                      {comp.website && (
                        <a
                          href={comp.website.startsWith("http") ? comp.website : `https://${comp.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition"
                          title="Visit External Corporate Website"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
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
