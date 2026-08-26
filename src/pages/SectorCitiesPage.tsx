import { useState, useMemo, useEffect } from "react";
import type { SectorConfig } from "@/lib/types";
import { PageShell } from "@/components/foundation/PageShell";
import { FilterBar } from "@/components/foundation/FilterBar";
import { CanonicalSectorCityCard } from "@/components/foundation/CanonicalCityCard";
import {
  DigiBadge,
  DigiContainer,
  Reveal,
} from "@/components/digione/primitives";
import { getCities, getMarineDomains, getIndustryDomainBySlug, getCompaniesInCity } from "@/lib/registry";
import { LEGACY_DOMAIN_MAP } from "@/lib/sectors/marine-domains";
import {
  Search,
  Layers,
  LayoutGrid,
  List,
  FolderTree,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Building,
  CheckCircle2,
  Compass,
} from "lucide-react";

export function SectorCitiesPage({ config }: { config: SectorConfig }) {
  const cities = useMemo(() => getCities(config), [config]);
  const domains = useMemo(() => getMarineDomains(), []);

  const categories = useMemo(() => {
    return ["All", ...Array.from(new Set(cities.map((c) => c.category)))];
  }, [cities]);

  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"code_asc" | "name_asc" | "category" | "domain">("code_asc");
  const [viewMode, setViewMode] = useState<"cards" | "table" | "grouped">("cards");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 18;

  // Sync URL query params (?domain=... or ?category=...) to active filter
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const domainParam = params.get("domain") || params.get("category");
    if (!domainParam) return;

    // Check direct match with category name
    const exactCategory = categories.find(
      (c) => c.toLowerCase() === domainParam.toLowerCase() || c.toLowerCase().includes(domainParam.toLowerCase())
    );
    if (exactCategory) {
      setFilter(exactCategory);
      return;
    }

    // Check domain slug or legacy mapping
    const resolvedSlug = LEGACY_DOMAIN_MAP[domainParam] || domainParam;
    const matchedDomain = getIndustryDomainBySlug(resolvedSlug) || domains.find((d) => d.slug === resolvedSlug || d.id === resolvedSlug);
    if (matchedDomain) {
      const cityInDomain = cities.find(
        (c) =>
          c.industryDomainId === matchedDomain.id ||
          c.industryDomainId === matchedDomain.slug ||
          c.category.toLowerCase() === matchedDomain.name.toLowerCase()
      );
      if (cityInDomain) {
        setFilter(cityInDomain.category);
      }
    }
  }, [categories, domains, cities]);

  const options = useMemo(() => {
    return categories.map((cat) => ({
      value: cat,
      label: cat,
      count: cat === "All" ? cities.length : cities.filter((c) => c.category === cat).length,
    }));
  }, [categories, cities]);

  const filteredAndSortedCities = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = cities.filter((city) => {
      const matchFilter = filter === "All" || city.category === filter;
      const matchSearch =
        q === "" ||
        city.domain.toLowerCase().includes(q) ||
        city.code.toLowerCase().includes(q) ||
        city.category.toLowerCase().includes(q) ||
        city.description.toLowerCase().includes(q) ||
        (city.scope && city.scope.some((s) => s.toLowerCase().includes(q)));
      return matchFilter && matchSearch;
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return a.domain.localeCompare(b.domain);
        case "category":
          return a.category.localeCompare(b.category) || a.domain.localeCompare(b.domain);
        case "domain":
          return (a.industryDomainId || "").localeCompare(b.industryDomainId || "") || a.domain.localeCompare(b.domain);
        case "code_asc":
        default: {
          const aNum = parseInt(a.code.replace(/\D/g, "") || "0", 10);
          const bNum = parseInt(b.code.replace(/\D/g, "") || "0", 10);
          return aNum - bNum;
        }
      }
    });
  }, [cities, filter, searchQuery, sortBy]);

  // Pagination calculation
  const totalCount = filteredAndSortedCities.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedCities = filteredAndSortedCities.slice(
    (validPage - 1) * pageSize,
    validPage * pageSize
  );

  // Grouped by Category for 'grouped' view
  const groupedCities = useMemo(() => {
    const map = new Map<string, typeof cities>();
    filteredAndSortedCities.forEach((c) => {
      const list = map.get(c.category) || [];
      list.push(c);
      map.set(c.category, list);
    });
    return Array.from(map.entries()).map(([category, items]) => ({
      category,
      items,
    }));
  }, [filteredAndSortedCities]);

  const breadcrumbs = [
    { label: "MARINEWORLD", href: "/" },
    { label: "CANONICAL SECTOR CITIES REGISTRY" },
  ];

  return (
    <PageShell
      config={config}
      breadcrumbs={breadcrumbs}
      metadata={{
        title: "All Registered Sector Cities | MarineWorld.City",
        description:
          "Complete canonical directory of all 82 registered Sector Cities across 8 Industry Domains in MarineWorld.",
      }}
    >
      <div className="pb-28">
        {/* HERO HEADER */}
        <section className="bg-canvas border-b border-line py-12 md:py-16">
          <DigiContainer>
            <Reveal>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <DigiBadge variant="soft">CANONICAL SECTOR CITY REGISTRY</DigiBadge>
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-mute">
                    {cities.length} ACTIVE SECTOR CITIES · {domains.length} INDUSTRY DOMAINS
                  </span>
                </div>

                <a
                  href="/companies"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-white hover:bg-slate-50 text-xs font-semibold text-graphite transition shadow-2xs"
                >
                  <Building className="w-3.5 h-3.5 text-royal" />
                  <span>Browse All AI-Native Companies</span>
                </a>
              </div>

              <h1 className="text-display mt-6 max-w-3xl text-graphite">
                All Registered Sector Cities
              </h1>

              <p className="text-lead mt-4 max-w-3xl text-stone">
                Enter any of the {cities.length} canonical Sector Cities to access its dedicated digital environment, explore company networks, inspect capabilities, and initiate direct commercial interactions across the global marine economy.
              </p>
            </Reveal>

            {/* SEARCH & FILTERS BAR */}
            <Reveal delay={50}>
              <div className="mt-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="relative max-w-md w-full">
                  <Search className="w-4 h-4 text-stone absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search sector cities by domain, code, or capabilities..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-line bg-white focus:border-royal focus:outline-none text-xs text-graphite placeholder:text-mute shadow-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setCurrentPage(1);
                      }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-mute hover:text-graphite uppercase"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <FilterBar
                  options={options}
                  value={filter}
                  onChange={(val) => {
                    setFilter(val);
                    setCurrentPage(1);
                  }}
                  label="Filter by primary domain"
                />
              </div>
            </Reveal>

            {/* QUICK STATUS BAR WITH SORT & VIEW TOGGLES */}
            <div className="mt-6 flex flex-wrap items-center justify-between border-t border-line pt-4 gap-4">
              <span className="text-[13px] font-semibold text-graphite">
                Showing {filteredAndSortedCities.length} of {cities.length} Sector Cities
              </span>

              <div className="flex flex-wrap items-center gap-4">
                {/* Sort selector */}
                <div className="flex items-center gap-2 text-xs text-stone">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-mute" />
                  <span>Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    aria-label="Sort sector cities by"
                    className="h-8 px-2 rounded-lg border border-line bg-white text-xs font-semibold text-graphite focus:outline-none"
                  >
                    <option value="code_asc">Registry Code (REG 01 → 82)</option>
                    <option value="name_asc">City Domain (A → Z)</option>
                    <option value="category">Industry Domain</option>
                  </select>
                </div>

                {/* View Switcher */}
                <div className="flex items-center border border-line rounded-lg bg-slate-50 p-0.5">
                  <button
                    onClick={() => setViewMode("cards")}
                    className={`p-1.5 rounded text-xs transition ${
                      viewMode === "cards" ? "bg-white text-royal shadow-xs font-bold" : "text-stone hover:text-graphite"
                    }`}
                    title="Cards Grid"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`p-1.5 rounded text-xs transition ${
                      viewMode === "table" ? "bg-white text-royal shadow-xs font-bold" : "text-stone hover:text-graphite"
                    }`}
                    title="Compact Table"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode("grouped")}
                    className={`p-1.5 rounded text-xs transition ${
                      viewMode === "grouped" ? "bg-white text-royal shadow-xs font-bold" : "text-stone hover:text-graphite"
                    }`}
                    title="Grouped by Domain"
                  >
                    <FolderTree className="w-3.5 h-3.5" />
                  </button>
                </div>

                {filter !== "All" && (
                  <button
                    onClick={() => {
                      setFilter("All");
                      setCurrentPage(1);
                    }}
                    className="text-xs text-royal font-medium hover:underline"
                  >
                    Reset filter ({filter})
                  </button>
                )}
              </div>
            </div>
          </DigiContainer>
        </section>

        {/* SECTOR CITIES CONTENT SECTION */}
        <section className="mt-10">
          <DigiContainer>
            {filteredAndSortedCities.length === 0 ? (
              <div className="rounded-card-md border border-dashed border-line bg-white p-12 text-center">
                <Layers className="w-8 h-8 text-mute mx-auto mb-3" />
                <h3 className="text-base font-bold text-graphite">No Sector Cities Found</h3>
                <p className="text-xs text-stone mt-1">
                  No registered sector cities matched &quot;{searchQuery}&quot;. Try a different search term or clear filters.
                </p>
                <button
                  onClick={() => {
                    setFilter("All");
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-soft text-royal text-xs font-semibold hover:bg-soft/70"
                >
                  Clear All Filters
                </button>
              </div>
            ) : viewMode === "grouped" ? (
              /* VIEW: GROUPED BY DOMAIN */
              <div className="space-y-12">
                {groupedCities.map((grp) => (
                  <div key={grp.category} className="space-y-4">
                    <div className="flex items-center justify-between border-b border-line pb-2">
                      <h2 className="text-lg font-bold text-graphite flex items-center gap-2">
                        <Compass className="w-4 h-4 text-royal" />
                        <span>{grp.category}</span>
                      </h2>
                      <span className="font-mono text-xs text-mute font-semibold">
                        {grp.items.length} CITIES
                      </span>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {grp.items.map((city) => (
                        <CanonicalSectorCityCard key={city.id} city={city} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : viewMode === "table" ? (
              /* VIEW: TABLE */
              <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-line bg-slate-50 text-[11px] font-mono uppercase tracking-wider text-mute">
                        <th className="py-3 px-4 font-semibold">Code</th>
                        <th className="py-3 px-4 font-semibold">Sector City Domain</th>
                        <th className="py-3 px-4 font-semibold">Industry Domain</th>
                        <th className="py-3 px-4 font-semibold">Scope & Focus</th>
                        <th className="py-3 px-4 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {paginatedCities.map((city) => (
                        <tr key={city.id} className="hover:bg-slate-50/70 transition group">
                          <td className="py-3.5 px-4 font-mono font-bold text-royal text-xs">
                            {city.code}
                          </td>
                          <td className="py-3.5 px-4">
                            <a
                              href={`/cities/${city.slug || city.id}`}
                              className="font-bold text-graphite group-hover:text-royal transition-colors"
                            >
                              {city.domain}
                            </a>
                            <p className="text-[11px] text-stone mt-0.5 line-clamp-1 max-w-sm">
                              {city.shortDescription || city.description}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 text-stone font-medium">
                            {city.category}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {city.scope?.slice(0, 2).map((sc) => (
                                <span
                                  key={sc}
                                  className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-700 font-medium"
                                >
                                  {sc}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <a
                              href={`/cities/${city.slug || city.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-royal hover:bg-royal-dark text-white text-[11px] font-bold shadow-xs transition"
                            >
                              <span>ENTER CITY</span>
                              <ArrowRight className="w-3 h-3" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* VIEW: CARDS GRID (PAGINATED) */
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedCities.map((city, i) => (
                  <Reveal key={city.id} delay={(i % 3) * 40} className="h-full">
                    <CanonicalSectorCityCard city={city} />
                  </Reveal>
                ))}
              </div>
            )}

            {/* PAGINATION BAR (FOR CARDS & TABLE) */}
            {viewMode !== "grouped" && totalPages > 1 && (
              <div className="mt-10 pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-stone">
                  Page <span className="font-bold text-graphite">{validPage}</span> of{" "}
                  <span className="font-bold text-graphite">{totalPages}</span> ({totalCount} total cities)
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={validPage === 1}
                    className="p-2 rounded-lg border border-line bg-white text-stone hover:text-graphite disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                        validPage === i + 1
                          ? "bg-royal text-white shadow-xs"
                          : "bg-white border border-line text-stone hover:text-graphite hover:bg-slate-50"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={validPage === totalPages}
                    className="p-2 rounded-lg border border-line bg-white text-stone hover:text-graphite disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </DigiContainer>
        </section>
      </div>
    </PageShell>
  );
}
