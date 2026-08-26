import { useState, useMemo, useEffect, useTransition } from "react";
import type { SectorConfig, CompanyProfile } from "@/lib/types";
import { PageShell } from "@/components/foundation/PageShell";
import {
  DigiBadge,
  DigiButton,
  DigiContainer,
  Reveal,
} from "@/components/digione/primitives";
import {
  getCompanies,
  getCities,
  getMarineDomains,
  getCompaniesPaginated,
  CompanyFilterCriteria,
  formatAvatarInitials,
  getCityAnchor,
  isCompanyAnchor,
  getCompaniesInCity,
} from "@/lib/registry";
import { SaveEntityButton } from "@/components/foundation/SaveEntityButton";
import { CompanyDirectoryMapView } from "@/components/company/CompanyDirectoryMapView";
import { SectorCityAdvisorCompactStrip } from "@/components/sector/SectorCityAdvisorDrawer";
import { isInstitutionalOrganization } from "@/lib/services/ecosystemOrganizationService";
import {
  Building2,
  Search,
  CheckCircle2,
  MapPin,
  ArrowRight,
  ExternalLink,
  LayoutGrid,
  List,
  Map,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  Cpu,
  Layers,
  Globe2,
  ShieldCheck,
  Building,
  RefreshCw,
  Anchor,
  Compass,
} from "lucide-react";

export function CompaniesDirectoryPage({ config }: { config: SectorConfig }) {
  const domains = useMemo(() => getMarineDomains(), []);
  const allCities = useMemo(() => getCities(config), [config]);

  // View mode: 'cards' | 'table' | 'map'
  const [viewMode, setViewMode] = useState<"cards" | "table" | "map">("cards");

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("All");
  const [selectedCity, setSelectedCity] = useState("All");
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified" | "review">("all");
  const [aiTwinFilter, setAiTwinFilter] = useState<"all" | "twin" | "ready">("all");
  const [tierFilter, setTierFilter] = useState<"all" | "FLAGSHIP" | "ENTERPRISE" | "STANDARD">("all");
  const [sortBy, setSortBy] = useState<
    "relevance" | "name_asc" | "name_desc" | "newest" | "city" | "country" | "verified_first"
  >("relevance");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Facet expansion states in sidebar
  const [expandDomains, setExpandDomains] = useState(true);
  const [expandCities, setExpandCities] = useState(false);
  const [expandGeography, setExpandGeography] = useState(true);
  const [expandStatus, setExpandStatus] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Search within facets
  const [cityFacetSearch, setCityFacetSearch] = useState("");

  const [isPending, startTransition] = useTransition();

  // Reset page when filters change
  const handleFilterChange = (updater: () => void) => {
    startTransition(() => {
      updater();
      setCurrentPage(1);
    });
  };

  // Sync URL query params on load (e.g. ?domain=... or ?city=... or ?q=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const qParam = params.get("q") || params.get("search");
    const domainParam = params.get("domain") || params.get("sector");
    const cityParam = params.get("city") || params.get("sectorCity");
    const verifiedParam = params.get("verified");

    if (qParam) setSearchQuery(qParam);
    if (domainParam) setSelectedDomain(domainParam);
    if (cityParam) setSelectedCity(cityParam);
    if (verifiedParam === "true") setVerificationFilter("verified");
  }, []);

  // Query paginated results and facets
  const queryCriteria: CompanyFilterCriteria = useMemo(
    () => ({
      searchQuery,
      domain: selectedDomain,
      sectorCity: selectedCity,
      country: selectedCountry,
      region: selectedRegion,
      verificationStatus: verificationFilter,
      aiStatus: aiTwinFilter,
      presenceTier: tierFilter,
      sortBy,
      page: currentPage,
      pageSize,
    }),
    [
      searchQuery,
      selectedDomain,
      selectedCity,
      selectedCountry,
      selectedRegion,
      verificationFilter,
      aiTwinFilter,
      tierFilter,
      sortBy,
      currentPage,
      pageSize,
    ]
  );

  const paginatedResult = useMemo(
    () => getCompaniesPaginated(config, queryCriteria),
    [config, queryCriteria]
  );

  const { items: companies, totalCount, totalPages, facets } = paginatedResult;

  // Single Sector City Anchor Credential (resolved from real single source of truth)
  const cityAnchor = useMemo(() => {
    if (selectedCity === "All") return null;
    return getCityAnchor(config, selectedCity);
  }, [config, selectedCity]);

  // Single Sector City object for portable Guide & AI Advisor strip
  const singleSelectedCityObject = useMemo(() => {
    if (!selectedCity || selectedCity.toLowerCase() === "all") return null;
    const clean = selectedCity.toLowerCase().replace(/\.city$/i, "");
    return (
      config.explorer.cities.find(
        (c) =>
          c.slug.toLowerCase() === clean ||
          c.id.toLowerCase() === clean ||
          c.domain.toLowerCase() === clean ||
          c.domain.toLowerCase() === `${clean}.city`
      ) || null
    );
  }, [config, selectedCity]);

  // Companies belonging to this specific sector city
  const singleCityCompanies = useMemo(() => {
    if (!singleSelectedCityObject) return [];
    return getCompaniesInCity(config, singleSelectedCityObject.id);
  }, [config, singleSelectedCityObject]);

  // Active filters count for badges
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (selectedDomain !== "All") count++;
    if (selectedCity !== "All") count++;
    if (selectedCountry !== "All") count++;
    if (selectedRegion !== "All") count++;
    if (verificationFilter !== "all") count++;
    if (aiTwinFilter !== "all") count++;
    if (tierFilter !== "all") count++;
    return count;
  }, [
    searchQuery,
    selectedDomain,
    selectedCity,
    selectedCountry,
    selectedRegion,
    verificationFilter,
    aiTwinFilter,
    tierFilter,
  ]);

  const clearAllFilters = () => {
    handleFilterChange(() => {
      setSearchQuery("");
      setSelectedDomain("All");
      setSelectedCity("All");
      setSelectedCountry("All");
      setSelectedRegion("All");
      setVerificationFilter("all");
      setAiTwinFilter("all");
      setTierFilter("all");
      setSortBy("relevance");
    });
  };

  const breadcrumbs = [
    { label: "MARINEWORLD", href: "/" },
    { label: "SECTOR CITIES", href: "/cities" },
    { label: "AI-NATIVE ENTERPRISES" },
  ];

  return (
    <PageShell
      config={config}
      breadcrumbs={breadcrumbs}
      metadata={{
        title: "AI-Native Maritime Companies Registry | MarineWorld.City",
        description:
          "Explore verified AI-Native maritime enterprises, digital operating twins, commercial flagship properties, and accredited sector leaders across 82 Sector Cities.",
      }}
    >
      <div className="pb-28">
        {/* HERO SECTION WITH HIERARCHICAL DRILLDOWN BANNER */}
        <section className="bg-canvas border-b border-line py-10 md:py-14">
          <DigiContainer>
            <Reveal>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <DigiBadge variant="soft">ENTERPRISE</DigiBadge>
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-mute">
                    {totalCount} ENTERPRISES · {allCities.length} SECTOR CITIES · {domains.length} DOMAINS
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="/cities"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-white hover:bg-slate-50 text-xs font-semibold text-graphite transition shadow-2xs"
                  >
                    <Layers className="w-3.5 h-3.5 text-royal" />
                    <span>Browse 82 Sector Cities</span>
                  </a>
                  <a
                    href="/sectors"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-white hover:bg-slate-50 text-xs font-semibold text-graphite transition shadow-2xs"
                  >
                    <Compass className="w-3.5 h-3.5 text-royal" />
                    <span>8 Industry Domains</span>
                  </a>
                </div>
              </div>

              <h1 className="text-display mt-5 max-w-4xl text-graphite">
                AI-Native Maritime Companies
              </h1>

              <p className="text-lead mt-3.5 max-w-3xl text-stone">
                Accredited commercial maritime enterprises, sovereign digital business twins, and technical operators across the global ocean economy. Drill down through specialized Sector Cities or use the enterprise search below.
              </p>
            </Reveal>

            {/* QUICK DOMAIN NAVIGATION BAR */}
            <div className="mt-8 pt-6 border-t border-line flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              <span className="text-[11px] font-mono uppercase font-bold text-mute shrink-0 mr-1">
                Domain:
              </span>
              <button
                onClick={() => handleFilterChange(() => setSelectedDomain("All"))}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition ${
                  selectedDomain === "All"
                    ? "bg-royal text-white shadow-xs"
                    : "bg-white border border-line text-stone hover:text-graphite hover:bg-slate-50"
                }`}
              >
                All Domains
              </button>
              {domains.map((dom) => {
                const isSelected =
                  selectedDomain.toLowerCase() === dom.name.toLowerCase() ||
                  selectedDomain.toLowerCase() === dom.slug.toLowerCase();
                return (
                  <button
                    key={dom.id}
                    onClick={() => handleFilterChange(() => setSelectedDomain(dom.name))}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition ${
                      isSelected
                        ? "bg-royal text-white shadow-xs"
                        : "bg-white border border-line text-stone hover:text-graphite hover:bg-slate-50"
                    }`}
                  >
                    {dom.name}
                  </button>
                );
              })}
            </div>
          </DigiContainer>
        </section>

        {/* MAIN DIRECTORY LAYOUT: FACETED SIDEBAR + MAIN CONTENT */}
        <section className="mt-8">
          <DigiContainer>
            {/* TOP CONTROLS BAR: SEARCH, VIEW MODES & SORT */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-line shadow-xs">
              {/* Global Search Input */}
              <div className="relative flex-1 max-w-xl">
                <Search className="w-4 h-4 text-stone absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by company name, capabilities, city, or country..."
                  value={searchQuery}
                  onChange={(e) => handleFilterChange(() => setSearchQuery(e.target.value))}
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-line bg-slate-50/50 focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite placeholder:text-mute"
                />
                {searchQuery && (
                  <button
                    onClick={() => handleFilterChange(() => setSearchQuery(""))}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone hover:text-graphite"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* View Switcher, Sort & Filter Mobile Toggle */}
              <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3">
                {/* Mobile Filter Toggle */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-line bg-slate-50 text-xs font-bold text-graphite"
                >
                  <Filter className="w-3.5 h-3.5 text-royal" />
                  <span>Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
                </button>

                {/* Sort dropdown */}
                <div className="flex items-center gap-2 text-xs text-stone">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-mute" />
                  <span className="hidden sm:inline font-medium">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => handleFilterChange(() => setSortBy(e.target.value as any))}
                    aria-label="Sort companies by"
                    className="h-10 px-3 rounded-xl border border-line bg-white text-xs font-semibold text-graphite focus:outline-none focus:border-royal"
                  >
                    <option value="relevance">Featured & Verified</option>
                    <option value="name_asc">Company Name (A → Z)</option>
                    <option value="name_desc">Company Name (Z → A)</option>
                    <option value="verified_first">Verified First</option>
                    <option value="city">Headquarters City</option>
                    <option value="country">Country</option>
                    <option value="newest">Recently Registered</option>
                  </select>
                </div>

                {/* View Mode Toggle: Cards vs Table vs Map */}
                <div className="flex items-center border border-line rounded-xl bg-slate-50 p-0.5">
                  <button
                    onClick={() => setViewMode("cards")}
                    className={`p-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                      viewMode === "cards"
                        ? "bg-white text-royal shadow-xs"
                        : "text-stone hover:text-graphite"
                    }`}
                    title="Card Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Cards</span>
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`p-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                      viewMode === "table"
                        ? "bg-white text-royal shadow-xs"
                        : "text-stone hover:text-graphite"
                    }`}
                    title="Compact Table View"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Table</span>
                  </button>
                  <button
                    onClick={() => setViewMode("map")}
                    className={`p-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                      viewMode === "map"
                        ? "bg-white text-royal shadow-xs"
                        : "text-stone hover:text-graphite"
                    }`}
                    title="Geographic Hubs Map"
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Map</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ACTIVE FILTER CHIPS BAR */}
            {activeFiltersCount > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 bg-slate-50/80 px-4 py-2.5 rounded-xl border border-line text-xs">
                <span className="font-mono text-[11px] font-bold text-mute uppercase">
                  Active Filters ({activeFiltersCount}):
                </span>

                {cityAnchor && (
                  <span
                    id="active-filter-city-anchor-credential"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-300 text-slate-800 font-medium"
                  >
                    <span className="font-mono font-bold text-[11px] uppercase">
                      {cityAnchor.formattedCityDomain} Anchor:
                    </span>
                    <a
                      href={`/companies/${cityAnchor.company.slug || cityAnchor.company.id}`}
                      className="font-bold text-royal hover:underline inline-flex items-center gap-1"
                    >
                      {cityAnchor.company.displayName || cityAnchor.company.name}
                    </a>
                  </span>
                )}

                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-line text-graphite font-medium">
                    Search: &quot;{searchQuery}&quot;
                    <button onClick={() => handleFilterChange(() => setSearchQuery(""))}>
                      <X className="w-3 h-3 text-stone hover:text-graphite" />
                    </button>
                  </span>
                )}

                {selectedDomain !== "All" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-line text-graphite font-medium">
                    Domain: {selectedDomain}
                    <button onClick={() => handleFilterChange(() => setSelectedDomain("All"))}>
                      <X className="w-3 h-3 text-stone hover:text-graphite" />
                    </button>
                  </span>
                )}

                {selectedCity !== "All" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-line text-graphite font-medium">
                    City: {selectedCity}
                    <button onClick={() => handleFilterChange(() => setSelectedCity("All"))}>
                      <X className="w-3 h-3 text-stone hover:text-graphite" />
                    </button>
                  </span>
                )}

                {selectedCountry !== "All" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-line text-graphite font-medium">
                    Country: {selectedCountry}
                    <button onClick={() => handleFilterChange(() => setSelectedCountry("All"))}>
                      <X className="w-3 h-3 text-stone hover:text-graphite" />
                    </button>
                  </span>
                )}

                {verificationFilter !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-line text-graphite font-medium">
                    Status: {verificationFilter.toUpperCase()}
                    <button onClick={() => handleFilterChange(() => setVerificationFilter("all"))}>
                      <X className="w-3 h-3 text-stone hover:text-graphite" />
                    </button>
                  </span>
                )}

                {aiTwinFilter !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-line text-graphite font-medium">
                    Twin: {aiTwinFilter.toUpperCase()}
                    <button onClick={() => handleFilterChange(() => setAiTwinFilter("all"))}>
                      <X className="w-3 h-3 text-stone hover:text-graphite" />
                    </button>
                  </span>
                )}

                {tierFilter !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-line text-graphite font-medium">
                    Tier: {tierFilter}
                    <button onClick={() => handleFilterChange(() => setTierFilter("all"))}>
                      <X className="w-3 h-3 text-stone hover:text-graphite" />
                    </button>
                  </span>
                )}

                <button
                  onClick={clearAllFilters}
                  className="ml-auto text-xs text-royal font-bold hover:underline"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* TWO COLUMN GRID: FACET SIDEBAR + LISTING CONTENT */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* FACET FILTER SIDEBAR */}
              <aside
                className={`lg:col-span-3 space-y-6 ${
                  sidebarOpen ? "block" : "hidden lg:block"
                }`}
              >
                <div className="rounded-2xl border border-line bg-white p-5 shadow-xs space-y-6">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-royal" />
                      <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-graphite">
                        Faceted Filters
                      </h3>
                    </div>
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={clearAllFilters}
                        className="text-[11px] font-semibold text-royal hover:underline"
                      >
                        Reset ({activeFiltersCount})
                      </button>
                    )}
                  </div>

                  {/* 1. SECTOR CITY FACET */}
                  <div className="space-y-3">
                    <button
                      onClick={() => setExpandCities(!expandCities)}
                      className="flex items-center justify-between w-full text-xs font-bold text-graphite hover:text-royal"
                    >
                      <span className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-royal" />
                        Sector Cities ({facets.sectorCities.length})
                      </span>
                      {expandCities ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {expandCities && (
                      <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                        <input
                          type="text"
                          placeholder="Filter sector cities..."
                          value={cityFacetSearch}
                          onChange={(e) => setCityFacetSearch(e.target.value)}
                          className="w-full h-8 px-2.5 rounded-lg border border-line bg-slate-50 text-[11px] text-graphite placeholder:text-mute focus:outline-none focus:border-royal"
                        />
                        <div className="max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                          <button
                            onClick={() => handleFilterChange(() => setSelectedCity("All"))}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition text-left ${
                              selectedCity === "All"
                                ? "bg-royal text-white font-bold"
                                : "text-stone hover:bg-slate-50"
                            }`}
                          >
                            <span>All Cities</span>
                            <span className="text-[10px] opacity-80">{totalCount}</span>
                          </button>
                          {allCities
                            .filter((c) => {
                              const matchesSearch =
                                c.domain.toLowerCase().includes(cityFacetSearch.toLowerCase()) ||
                                c.slug.toLowerCase().includes(cityFacetSearch.toLowerCase());
                              if (!matchesSearch) return false;
                              const cityCount =
                                facets.sectorCities.find(
                                  (sc) =>
                                    sc.id.toLowerCase() === c.slug.toLowerCase() ||
                                    sc.id.toLowerCase() === c.id.toLowerCase()
                                )?.count ?? 0;
                              return cityCount > 0 || selectedCity.toLowerCase() === c.slug.toLowerCase();
                            })
                            .map((city) => {
                              const cityCount =
                                facets.sectorCities.find(
                                  (sc) =>
                                    sc.id.toLowerCase() === city.slug.toLowerCase() ||
                                    sc.id.toLowerCase() === city.id.toLowerCase()
                                )?.count ?? 0;
                              return (
                                <button
                                  key={city.id}
                                  onClick={() => handleFilterChange(() => setSelectedCity(city.slug))}
                                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition text-left ${
                                    selectedCity.toLowerCase() === city.slug.toLowerCase() ||
                                    selectedCity.toLowerCase() === city.id.toLowerCase()
                                      ? "bg-royal text-white font-bold"
                                      : "text-stone hover:bg-slate-50"
                                  }`}
                                >
                                  <span className="truncate">{city.domain}</span>
                                  <span className="text-[10px] font-mono opacity-80">
                                    {cityCount}
                                  </span>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. GEOGRAPHY & COUNTRY FACET */}
                  <div className="border-t border-line pt-4 space-y-3">
                    <button
                      onClick={() => setExpandGeography(!expandGeography)}
                      className="flex items-center justify-between w-full text-xs font-bold text-graphite hover:text-royal"
                    >
                      <span className="flex items-center gap-1.5">
                        <Globe2 className="w-3.5 h-3.5 text-royal" />
                        Country & Hubs ({facets.countries.length})
                      </span>
                      {expandGeography ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {expandGeography && (
                      <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                        <button
                          onClick={() => handleFilterChange(() => setSelectedCountry("All"))}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition text-left ${
                            selectedCountry === "All"
                              ? "bg-royal text-white font-bold"
                              : "text-stone hover:bg-slate-50"
                          }`}
                        >
                          <span>Global (All Countries)</span>
                          <span className="text-[10px] opacity-80">{totalCount}</span>
                        </button>
                        {facets.countries.slice(0, 10).map((cntry) => (
                          <button
                            key={cntry.name}
                            onClick={() => handleFilterChange(() => setSelectedCountry(cntry.name))}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition text-left ${
                              selectedCountry === cntry.name
                                ? "bg-royal text-white font-bold"
                                : "text-stone hover:bg-slate-50"
                            }`}
                          >
                            <span className="truncate">{cntry.name}</span>
                            <span className="text-[10px] font-mono opacity-80">{cntry.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 3. VERIFICATION & AI TWIN STATUS */}
                  <div className="border-t border-line pt-4 space-y-3">
                    <button
                      onClick={() => setExpandStatus(!expandStatus)}
                      className="flex items-center justify-between w-full text-xs font-bold text-graphite hover:text-royal"
                    >
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-royal" />
                        Accreditation & Twin
                      </span>
                      {expandStatus ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {expandStatus && (
                      <div className="space-y-3 pt-1 text-xs animate-in fade-in duration-150">
                        {/* Verification Pills */}
                        <div>
                          <p className="text-[10.5px] font-mono uppercase text-mute mb-1.5">Verification</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              onClick={() => handleFilterChange(() => setVerificationFilter("all"))}
                              className={`px-2 py-1 rounded-md text-[11px] font-medium border text-center transition ${
                                verificationFilter === "all"
                                  ? "bg-royal text-white border-royal"
                                  : "border-line text-stone hover:bg-slate-50"
                              }`}
                            >
                              All ({totalCount})
                            </button>
                            <button
                              onClick={() => handleFilterChange(() => setVerificationFilter("verified"))}
                              className={`px-2 py-1 rounded-md text-[11px] font-medium border text-center transition ${
                                verificationFilter === "verified"
                                  ? "bg-royal text-white border-royal"
                                  : "border-line text-stone hover:bg-slate-50"
                              }`}
                            >
                              Verified ({facets.verification.verified})
                            </button>
                          </div>
                        </div>

                        {/* AI Twin Status */}
                        <div>
                          <p className="text-[10.5px] font-mono uppercase text-mute mb-1.5">AI Business Twin</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              onClick={() => handleFilterChange(() => setAiTwinFilter("all"))}
                              className={`px-2 py-1 rounded-md text-[11px] font-medium border text-center transition ${
                                aiTwinFilter === "all"
                                  ? "bg-royal text-white border-royal"
                                  : "border-line text-stone hover:bg-slate-50"
                              }`}
                            >
                              All ({totalCount})
                            </button>
                            <button
                              onClick={() => handleFilterChange(() => setAiTwinFilter("twin"))}
                              className={`px-2 py-1 rounded-md text-[11px] font-medium border text-center transition ${
                                aiTwinFilter === "twin"
                                  ? "bg-emerald-600 text-white border-emerald-600 font-bold"
                                  : "border-line text-stone hover:bg-slate-50"
                              }`}
                            >
                              Twin Active ({facets.twins.twin})
                            </button>
                          </div>
                        </div>

                        {/* Presence Tier */}
                        <div>
                          <p className="text-[10.5px] font-mono uppercase text-mute mb-1.5">Presence Tier</p>
                          <div className="grid grid-cols-3 gap-1">
                            <button
                              onClick={() => handleFilterChange(() => setTierFilter("all"))}
                              className={`px-1.5 py-1 rounded text-[10px] font-medium border text-center transition ${
                                tierFilter === "all"
                                  ? "bg-royal text-white border-royal"
                                  : "border-line text-stone hover:bg-slate-50"
                              }`}
                            >
                              All ({totalCount})
                            </button>
                            <button
                              onClick={() => handleFilterChange(() => setTierFilter("FLAGSHIP"))}
                              className={`px-1.5 py-1 rounded text-[10px] font-medium border text-center transition ${
                                tierFilter === "FLAGSHIP"
                                  ? "bg-amber-500 text-white border-amber-500 font-bold"
                                  : "border-line text-stone hover:bg-slate-50"
                              }`}
                            >
                              Flagship ({facets.tiers.flagship})
                            </button>
                            <button
                              onClick={() => handleFilterChange(() => setTierFilter("ENTERPRISE"))}
                              className={`px-1.5 py-1 rounded text-[10px] font-medium border text-center transition ${
                                tierFilter === "ENTERPRISE"
                                  ? "bg-royal text-white border-royal font-bold"
                                  : "border-line text-stone hover:bg-slate-50"
                              }`}
                            >
                              Enterprise ({facets.tiers.enterprise})
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </aside>

              {/* MAIN CONTENT AREA */}
              <main className="lg:col-span-9 space-y-6">
                {/* RESULTS SUMMARY BAR */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-stone border-b border-line pb-3">
                  <div>
                    Showing{" "}
                    <span className="font-bold text-graphite">
                      {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                    </span>{" "}
                    –{" "}
                    <span className="font-bold text-graphite">
                      {Math.min(currentPage * pageSize, totalCount)}
                    </span>{" "}
                    of <span className="font-bold text-graphite">{totalCount}</span> accredited enterprises
                  </div>

                  {/* Page size dropdown */}
                  <div className="flex items-center gap-2">
                    <span>Show per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      aria-label="Items per page"
                      className="px-2 py-1 rounded-lg border border-line bg-white text-xs font-semibold text-graphite focus:outline-none"
                    >
                      <option value={12}>12</option>
                      <option value={24}>24</option>
                      <option value={48}>48</option>
                    </select>
                  </div>
                </div>

                {/* Single Sector City Guide & AI Advisor Strip (Compact auto-surfaced banner with full expansion) */}
                {singleSelectedCityObject && (
                  <SectorCityAdvisorCompactStrip
                    city={singleSelectedCityObject}
                    config={config}
                    allCityCompanies={singleCityCompanies}
                    cityAnchor={cityAnchor}
                  />
                )}

                {/* VIEW 1: MAP VIEW */}
                {viewMode === "map" && (
                  <CompanyDirectoryMapView companies={companies} />
                )}

                {/* VIEW 2: TABLE / COMPACT LIST VIEW */}
                {viewMode === "table" && (
                  <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-line bg-slate-50 text-[11px] font-mono uppercase tracking-wider text-mute">
                            <th className="py-3 px-4 font-semibold">Enterprise / Legal Entity</th>
                            <th className="py-3 px-4 font-semibold">Sector City</th>
                            <th className="py-3 px-4 font-semibold">Location</th>
                            <th className="py-3 px-4 font-semibold">Accreditation</th>
                            <th className="py-3 px-4 font-semibold">AI Twin</th>
                            <th className="py-3 px-4 font-semibold text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {companies.map((comp) => (
                            <tr
                              key={comp.id}
                              className="hover:bg-slate-50/70 transition group"
                            >
                              {/* Company details */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-royal text-xs shrink-0 overflow-hidden uppercase">
                                    {comp.logoUrl || comp.coverImage ? (
                                      <img
                                        src={comp.logoUrl || comp.coverImage}
                                        alt={comp.displayName || comp.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      formatAvatarInitials(comp.initials, comp.displayName || comp.name)
                                    )}
                                  </div>
                                  <div>
                                    <a
                                      href={`/companies/${comp.slug || comp.id}`}
                                      className="font-bold text-graphite group-hover:text-royal transition-colors"
                                    >
                                      {comp.displayName || comp.name}
                                    </a>
                                    <p className="text-[10.5px] text-mute font-mono">
                                      {comp.businessId || `MW-BUS-${comp.companyId6Digit || "100000"}`}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Sector City */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono text-royal text-[11px] font-semibold uppercase">
                                    {comp.primarySectorCategory || comp.industry}
                                  </span>
                                  {isCompanyAnchor(comp) && (
                                    <span className="bg-slate-100 border border-slate-300 text-slate-800 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                                      Anchor
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Location */}
                              <td className="py-3.5 px-4 text-stone">
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-mute shrink-0" />
                                  <span className="truncate max-w-[160px]">
                                    {comp.location || `${comp.city}, ${comp.country}`}
                                  </span>
                                </div>
                              </td>

                              {/* Verification */}
                              <td className="py-3.5 px-4">
                                {comp.verificationStatus === "verified" ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-royal bg-royal/10 border border-royal/20 px-2 py-0.5 rounded-full">
                                    <CheckCircle2 className="w-3 h-3 text-royal" />
                                    VERIFIED
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                    REVIEW
                                  </span>
                                )}
                              </td>

                              {/* AI Twin */}
                              <td className="py-3.5 px-4">
                                {comp.aiStatus === "twin" ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                    <Cpu className="w-3 h-3 text-emerald-600" />
                                    ACTIVE
                                  </span>
                                ) : (
                                  <span className="text-[10.5px] text-mute font-mono">READY</span>
                                )}
                              </td>

                              {/* Action */}
                              <td className="py-3.5 px-4 text-right">
                                <div className="inline-flex items-center justify-end gap-2">
                                  <SaveEntityButton
                                    type="company"
                                    id={comp.id || comp.slug}
                                    variant="icon"
                                    size="sm"
                                  />
                                  <a
                                    href={`/companies/${comp.slug || comp.id}`}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-royal hover:bg-royal-dark text-white text-[11px] font-bold shadow-xs transition"
                                  >
                                    <span>EXPLORE</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </a>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* VIEW 3: CARD GRID VIEW */}
                {viewMode === "cards" && (
                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {companies.map((comp, idx) => {
                      const cardInitials = formatAvatarInitials(comp.initials, comp.displayName || comp.name);
                      return (
                        <Reveal key={comp.id} delay={(idx % 3) * 40} className="h-full">
                          <div className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-line bg-white p-6 transition-all duration-300 hover:border-royal/30 hover:shadow-lg group">
                            <div>
                              {/* Top Header */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 font-bold text-royal text-sm uppercase">
                                  {comp.coverImage || comp.logoUrl ? (
                                    <img
                                      src={comp.coverImage || comp.logoUrl}
                                      alt={comp.displayName || comp.name}
                                      className="w-full h-full object-cover rounded-lg"
                                    />
                                  ) : (
                                    <span>{cardInitials}</span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <div className="flex flex-col items-end gap-1">
                                    {isCompanyAnchor(comp) && (
                                      <div className="bg-slate-100 border border-slate-300 text-slate-800 px-2 py-0.5 rounded-full text-[9.5px] font-bold">
                                        Anchor
                                      </div>
                                    )}
                                    {(comp as any).presenceTier === "FLAGSHIP" && (
                                      <div className="bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-full text-[9.5px] font-bold">
                                        FLAGSHIP
                                      </div>
                                    )}
                                    {isInstitutionalOrganization(comp) ? (
                                      <div className="flex items-center gap-1 bg-royal/10 border border-royal/20 text-royal-dark px-2 py-0.5 rounded-full text-[9.5px] font-bold tracking-wide">
                                        <CheckCircle2 className="w-3 h-3 text-royal" />
                                        <span>INSTITUTION</span>
                                      </div>
                                    ) : comp.verificationStatus === "verified" ? (
                                      <div className="flex items-center gap-1.5 bg-royal/10 border border-royal/20 text-royal px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide">
                                        <CheckCircle2 className="w-3 h-3 text-royal" />
                                        <span>VERIFIED</span>
                                      </div>
                                    ) : null}
                                  </div>

                                  <div className="relative z-10" onClick={(e) => e.stopPropagation()}>
                                    <SaveEntityButton
                                      type="company"
                                      id={comp.id || comp.slug}
                                      variant="icon"
                                      size="sm"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Name & Industry */}
                              <h3 className="mt-4 text-base font-bold text-graphite group-hover:text-royal transition-colors">
                                <a href={`/companies/${comp.slug || comp.id}`}>
                                  {comp.displayName || comp.name}
                                </a>
                              </h3>
                              <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-royal mt-0.5">
                                {comp.primarySectorCategory || comp.industry}
                              </p>

                              <p className="mt-3 text-xs leading-relaxed text-stone line-clamp-3">
                                {comp.shortDescription || comp.description}
                              </p>

                              {/* Location */}
                              <div className="mt-4 flex items-center gap-1.5 text-[11px] text-mute border-t border-line pt-3">
                                <MapPin className="w-3.5 h-3.5 text-mute shrink-0" />
                                <span className="truncate">
                                  {comp.location || `${comp.city}, ${comp.country}`}
                                </span>
                              </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="mt-6 flex items-center gap-2 border-t border-line pt-4">
                              <a
                                href={`/companies/${comp.slug || comp.id}`}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-royal hover:bg-royal-dark text-white text-xs font-bold transition shadow-xs"
                              >
                                <span>{isInstitutionalOrganization(comp) ? "EXPLORE ORGANIZATION" : "EXPLORE COMPANY"}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </a>
                              {comp.website && (
                                <a
                                  href={
                                    comp.website.startsWith("http")
                                      ? comp.website
                                      : `https://${comp.website}`
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-2 rounded-xl border border-line text-stone hover:text-graphite hover:bg-slate-50 transition"
                                  title="Visit Corporate Website"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </Reveal>
                      );
                    })}
                  </div>
                )}

                {/* EMPTY STATE */}
                {companies.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-line bg-white p-12 text-center">
                    <Building2 className="w-10 h-10 text-mute mx-auto mb-3" />
                    <h3 className="text-base font-bold text-graphite">No Companies Match Your Filter</h3>
                    <p className="text-xs text-stone mt-1 max-w-md mx-auto">
                      No accredited maritime companies matched the selected domain, sector city, or search terms. Try broadening your criteria.
                    </p>
                    <button
                      onClick={clearAllFilters}
                      className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-royal text-white text-xs font-bold shadow-xs hover:bg-royal-dark transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reset All Filters</span>
                    </button>
                  </div>
                )}

                {/* NUMERICAL PAGINATION BAR */}
                {totalPages > 1 && (
                  <div className="mt-8 pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-stone">
                      Page <span className="font-bold text-graphite">{currentPage}</span> of{" "}
                      <span className="font-bold text-graphite">{totalPages}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Previous Page */}
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-line bg-white text-stone hover:text-graphite disabled:opacity-40 disabled:cursor-not-allowed transition"
                        title="Previous Page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {/* Numerical page buttons */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum = i + 1;
                        if (totalPages > 5 && currentPage > 3) {
                          pageNum = currentPage - 2 + i;
                          if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                        }
                        if (pageNum < 1) pageNum = 1;

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                              currentPage === pageNum
                                ? "bg-royal text-white shadow-xs"
                                : "bg-white border border-line text-stone hover:text-graphite hover:bg-slate-50"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      {/* Ellipsis if more pages */}
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <span className="px-1 text-xs text-stone">...</span>
                      )}

                      {/* Last Page button if far away */}
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          className="w-8 h-8 rounded-lg text-xs font-bold bg-white border border-line text-stone hover:text-graphite hover:bg-slate-50"
                        >
                          {totalPages}
                        </button>
                      )}

                      {/* Next Page */}
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-line bg-white text-stone hover:text-graphite disabled:opacity-40 disabled:cursor-not-allowed transition"
                        title="Next Page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </main>
            </div>
          </DigiContainer>
        </section>
      </div>
    </PageShell>
  );
}
