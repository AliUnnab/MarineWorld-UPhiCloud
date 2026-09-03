import { useState, useMemo, useEffect } from "react";
import type { SectorConfig, SectorCity, CompanyEntity } from "@/lib/types";
import { PageShell } from "@/components/foundation/PageShell";
import { CanonicalSectorCityCard } from "@/components/foundation/CanonicalCityCard";
import {
  DigiBadge,
  DigiButton,
  DigiContainer,
  Reveal,
} from "@/components/digione/primitives";
import {
  getCompanyProducts,
  getCompanyServices,
  formatCompactLocation,
} from "@/lib/registry";
import { listSectorCities, listIndustryDomains } from "@/services/sectorService";
import { listCompanies } from "@/services/companyService";
import {
  Search,
  Building2,
  Compass,
  ArrowRight,
  Layers,
  ShieldCheck,
  Package,
  Wrench,
  Globe2,
} from "lucide-react";

export function ExplorePage({ config }: { config: SectorConfig }) {
  const [liveCities, setLiveCities] = useState<SectorCity[]>([]);
  const [liveCompanies, setLiveCompanies] = useState<any[]>([]);
  const [liveDomains, setLiveDomains] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      listSectorCities(),
      listCompanies(),
      listIndustryDomains(),
    ])
      .then(([cities, companies, domains]) => {
        setLiveCities(cities || []);
        setLiveCompanies(companies || []);
        setLiveDomains(domains || []);
      })
      .catch((err) => {
        console.warn("[ExplorePage] Firestore load error:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const cities = liveCities;
  const companies = liveCompanies;
  const domains = liveDomains;
  const verifiedCount = useMemo(
    () => companies.filter((c) => c.verificationStatus === "verified").length,
    [companies]
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<
    "all" | "cities" | "companies" | "products" | "services"
  >("all");

  // Collect all products and services across companies
  const allProducts = useMemo(() => {
    return companies.flatMap((c) => getCompanyProducts(c));
  }, [companies]);

  const allServices = useMemo(() => {
    return companies.flatMap((c) => getCompanyServices(c));
  }, [companies]);

  // Featured canonical cities for discovery overview
  const featuredCities = useMemo(() => {
    const prioritySlugs = ["shipyard", "charter", "propulsion", "offshore", "marine-ai", "marina", "port-logistics", "admiralty-law"];
    const found = cities.filter((c) => prioritySlugs.some((p) => c.slug.includes(p)));
    return found.length >= 6 ? found.slice(0, 6) : cities.slice(0, 6);
  }, [cities]);

  // Filtered lists based on search
  const q = searchQuery.toLowerCase().trim();

  const filteredCities = useMemo(() => {
    if (!q) return featuredCities;
    return cities.filter(
      (c) =>
        c.domain.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        (c.scope && c.scope.some((s) => s.toLowerCase().includes(q)))
    ).slice(0, 6);
  }, [cities, featuredCities, q]);

  const filteredCompanies = useMemo(() => {
    if (!q) return companies.slice(0, 6);
    return companies.filter(
      (c) =>
        (c.displayName || c.name || "").toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q) ||
        (c.industry || "").toLowerCase().includes(q) ||
        (c.city || "").toLowerCase().includes(q) ||
        (c.country || "").toLowerCase().includes(q)
    ).slice(0, 6);
  }, [companies, q]);

  const filteredProducts = useMemo(() => {
    if (!q) return allProducts.slice(0, 6);
    return allProducts.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.description || p.shortDescription || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q) ||
        ((p as any).industryDomainId || (p as any).industryDomain || "").toLowerCase().includes(q)
    ).slice(0, 6);
  }, [allProducts, q]);

  const filteredServices = useMemo(() => {
    if (!q) return allServices.slice(0, 6);
    return allServices.filter(
      (s) =>
        (s.name || "").toLowerCase().includes(q) ||
        (s.description || s.shortDescription || "").toLowerCase().includes(q) ||
        (s.category || "").toLowerCase().includes(q) ||
        ((s as any).industryDomainId || (s as any).industryDomain || "").toLowerCase().includes(q)
    ).slice(0, 6);
  }, [allServices, q]);

  const breadcrumbs = [
    { label: "MARINEWORLD", href: "/" },
    { label: "EXPLORE DIRECTORY" },
  ];

  return (
    <PageShell
      config={config}
      breadcrumbs={breadcrumbs}
      metadata={{
        title: "Explore Ecosystem Directory",
        description:
          "Comprehensive discovery directory across all 25 Sector Cities, accredited company digital twins, verified products, technical services, and institutional clusters.",
      }}
    >
      <div className="pb-24">
        {/* ====================================================================
            HERO DISCOVERY HEADER
            ==================================================================== */}
        <section className="relative overflow-hidden border-b border-line bg-canvas pt-12 pb-14">
          <DigiContainer>
            <div className="max-w-3xl">
              <div className="flex items-center gap-2">
                <DigiBadge variant="soft">CANONICAL ECOSYSTEM DIRECTORY</DigiBadge>
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-royal">
                  MULTI-SECTOR DISCOVERY
                </span>
              </div>

              <h1 className="text-h1 mt-3 text-graphite">
                Explore the Global Marine Ecosystem
              </h1>

              <p className="mt-3 text-body-lg text-stone">
                Traverse 25 dedicated digital Sector Cities, discover sovereign company business twins, and search verified products, equipment, technical services, and institutional bodies.
              </p>

              {/* STATS STRIP */}
              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-card-sm border border-line bg-white p-3.5">
                  <div className="font-mono text-[20px] font-extrabold text-graphite">
                    {cities.length}
                  </div>
                  <div className="font-mono text-[10.5px] uppercase tracking-wider text-mute">
                    Sector Cities
                  </div>
                </div>

                <div className="rounded-card-sm border border-line bg-white p-3.5">
                  <div className="font-mono text-[20px] font-extrabold text-graphite">
                    {companies.length}
                  </div>
                  <div className="font-mono text-[10.5px] uppercase tracking-wider text-mute">
                    Registered Nodes
                  </div>
                </div>

                <div className="rounded-card-sm border border-line bg-white p-3.5">
                  <div className="font-mono text-[20px] font-extrabold text-graphite">
                    {verifiedCount}
                  </div>
                  <div className="font-mono text-[10.5px] uppercase tracking-wider text-emerald-600">
                    Verified Twins
                  </div>
                </div>

                <div className="rounded-card-sm border border-line bg-white p-3.5">
                  <div className="font-mono text-[20px] font-extrabold text-graphite">
                    {allProducts.length + allServices.length}
                  </div>
                  <div className="font-mono text-[10.5px] uppercase tracking-wider text-mute">
                    Active Offerings
                  </div>
                </div>
              </div>
            </div>

            {/* UNIFIED SEARCH & FILTER BAR */}
            <div className="mt-10 max-w-4xl rounded-card-md border border-line bg-white p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mute" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search sector cities, companies, products, or technical services..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-card-xs border border-line bg-canvas text-sm text-graphite placeholder:text-mute focus:outline-none focus:border-royal focus:ring-1 focus:ring-royal transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-mute hover:text-graphite font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* TABS */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 font-mono text-[11px]">
                  {(
                    [
                      { id: "all", label: "ALL" },
                      { id: "cities", label: `CITIES (${cities.length})` },
                      { id: "companies", label: `COMPANIES (${companies.length})` },
                      { id: "products", label: `PRODUCTS (${allProducts.length})` },
                      { id: "services", label: `SERVICES (${allServices.length})` },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-2 rounded-card-xs font-bold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                        activeTab === tab.id
                          ? "bg-slate-900 text-white"
                          : "bg-canvas text-stone hover:text-graphite hover:bg-soft"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </DigiContainer>
        </section>

        {/* ====================================================================
            DIRECTORY ENTRYPOINTS GRID
            ==================================================================== */}
        <section className="mt-12">
          <DigiContainer>
            <Reveal>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {/* 1. SECTOR CITIES */}
                <a
                  href="/cities"
                  className="group rounded-card-md border border-line bg-white p-6 transition-all duration-300 hover:border-royal hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-lg bg-soft flex items-center justify-center text-royal">
                        <Globe2 className="w-5 h-5" />
                      </div>
                      <span className="font-mono text-xs font-bold text-mute group-hover:text-royal">
                        {cities.length} CITIES
                      </span>
                    </div>
                    <h3 className="mt-4 text-[15px] font-bold text-graphite group-hover:text-royal transition-colors">
                      25 Sector Cities Directory
                    </h3>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-stone">
                      Navigate specialized sovereign digital environments from Shipyard and Propulsion to Admiralty Law and Marine AI.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs font-semibold text-royal">
                    <span>Browse All Cities</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </a>

                {/* 2. COMPANIES DIRECTORY */}
                <a
                  href="/companies"
                  className="group rounded-card-md border border-line bg-white p-6 transition-all duration-300 hover:border-royal hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-lg bg-soft flex items-center justify-center text-royal">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <span className="font-mono text-xs font-bold text-mute group-hover:text-royal">
                        {companies.length} ENTERPRISES
                      </span>
                    </div>
                    <h3 className="mt-4 text-[15px] font-bold text-graphite group-hover:text-royal transition-colors">
                      Commercial Business Twins
                    </h3>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-stone">
                      Directory of accredited marine operators, suppliers, shipyards, and tech providers operating digital twins.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs font-semibold text-royal">
                    <span>Explore Companies</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </a>

                {/* 3. ECOSYSTEM & CLUSTERS */}
                <a
                  href="/ecosystem"
                  className="group rounded-card-md border border-line bg-white p-6 transition-all duration-300 hover:border-royal hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-lg bg-soft flex items-center justify-center text-royal">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                    </div>
                    <h3 className="mt-4 text-[15px] font-bold text-graphite group-hover:text-royal transition-colors">
                      Ecosystem & Governance Hub
                    </h3>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-stone">
                      Maritime associations, chambers of shipping, registries, classification bodies, and regional clusters.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs font-semibold text-royal">
                    <span>Enter Hub</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </a>
              </div>
            </Reveal>
          </DigiContainer>
        </section>

        {/* SECTION 1: SECTOR CITIES DISCOVERY (Visible if tab is all or cities) */}
        {(activeTab === "all" || activeTab === "cities") && (
          <section className="mt-14">
            <DigiContainer>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-line pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-royal">
                      01 · DIGITAL SECTOR ENVIRONMENTS
                    </span>
                  </div>
                  <h2 className="text-h2 mt-1 text-graphite">Sector Cities</h2>
                  <p className="mt-1 text-[13.5px] text-stone">
                    Dedicated digital operating environments across key maritime commercial segments.
                  </p>
                </div>
                <DigiButton href="/cities" variant="secondary" size="sm" icon="arrowRight">
                  View All {cities.length} Cities
                </DigiButton>
              </div>

              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                  <div className="col-span-full py-12 px-6 rounded-card-md border border-line bg-canvas text-center">
                    <Globe2 className="w-8 h-8 text-royal animate-pulse mx-auto mb-2" />
                    <p className="text-sm font-bold text-graphite">Loading Sector Cities...</p>
                  </div>
                ) : filteredCities.length === 0 ? (
                  <div className="col-span-full py-12 px-6 rounded-card-md border border-line bg-canvas text-center">
                    <Globe2 className="w-8 h-8 text-mute mx-auto mb-2" />
                    <p className="text-sm font-bold text-graphite">No Sector Cities Found</p>
                    <p className="text-xs text-stone mt-1">No active sector city matches your search criteria.</p>
                  </div>
                ) : (
                  filteredCities.map((city) => (
                    <CanonicalSectorCityCard key={city.id} city={city} />
                  ))
                )}
              </div>
            </DigiContainer>
          </section>
        )}

        {/* SECTION 2: ACCREDITED COMPANIES & OPERATING TWINS (Visible if tab is all or companies) */}
        {(activeTab === "all" || activeTab === "companies") && (
          <section className="mt-16">
            <DigiContainer>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-line pb-4">
                <div>
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-royal">
                    02 · AI-NATIVE ENTERPRISES
                  </span>
                  <h2 className="text-h2 mt-1 text-graphite">Accredited Company Business Twins</h2>
                  <p className="mt-1 text-[13.5px] text-stone">
                    Verified maritime commercial entities operating sovereign business twins.
                  </p>
                </div>
                <DigiButton href="/companies" variant="secondary" size="sm" icon="arrowRight">
                  View All Companies
                </DigiButton>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                  <div className="col-span-full py-12 px-6 rounded-card-md border border-line bg-canvas text-center">
                    <Building2 className="w-8 h-8 text-royal animate-pulse mx-auto mb-2" />
                    <p className="text-sm font-bold text-graphite">Loading Companies...</p>
                  </div>
                ) : filteredCompanies.length === 0 ? (
                  <div className="col-span-full py-12 px-6 rounded-card-md border border-line bg-canvas text-center">
                    <Building2 className="w-8 h-8 text-mute mx-auto mb-2" />
                    <p className="text-sm font-bold text-graphite">No Registered Companies Found</p>
                    <p className="text-xs text-stone mt-1">No accredited enterprise entities found for the selected filter.</p>
                  </div>
                ) : (
                  filteredCompanies.map((company) => (
                    <a
                      key={company.id}
                      href={`/companies/${company.slug || company.id}`}
                      className="group flex flex-col justify-between rounded-card-md border border-line bg-white p-6 transition-all duration-300 hover:border-royal hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="w-10 h-10 rounded-lg bg-soft flex items-center justify-center text-royal font-bold text-sm">
                            {company.initials || company.displayName?.[0] || company.name?.[0] || "MW"}
                          </div>
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-mono uppercase tracking-wider font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            <ShieldCheck className="w-3 h-3" />
                            VERIFIED
                          </span>
                        </div>

                        <h3 className="mt-4 text-[16px] font-bold text-graphite group-hover:text-royal transition-colors">
                          {company.displayName || company.name}
                        </h3>

                        <p className="mt-1 text-[12px] font-medium text-mute">
                          {company.industry || "Marine Enterprise"} • {formatCompactLocation(company.country, company.city)}
                        </p>

                        <p className="mt-2.5 text-[12.5px] leading-relaxed text-stone line-clamp-2">
                          {company.description || "Accredited maritime commercial enterprise within MarineWorld."}
                        </p>
                      </div>

                      <div className="mt-6 pt-3 border-t border-line flex items-center justify-between text-xs font-medium text-royal">
                        <span>Inspect Business Twin</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                      </div>
                    </a>
                  ))
                )}
              </div>
            </DigiContainer>
          </section>
        )}

        {/* SECTION 3: PRODUCTS & SERVICES CAPABILITIES (Visible if tab is all, products, or services) */}
        {(activeTab === "all" || activeTab === "products" || activeTab === "services") && (
          <section className="mt-16">
            <DigiContainer>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-line pb-4">
                <div>
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-royal">
                    03 · COMMERCIAL CAPABILITIES & OFFERINGS
                  </span>
                  <h2 className="text-h2 mt-1 text-graphite">Verified Products & Technical Services</h2>
                  <p className="mt-1 text-[13.5px] text-stone">
                    High-specification marine equipment, materials, naval architecture, charter, and refit capabilities.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                  <div className="col-span-full py-12 px-6 rounded-card-md border border-line bg-canvas text-center">
                    <Package className="w-8 h-8 text-royal animate-pulse mx-auto mb-2" />
                    <p className="text-sm font-bold text-graphite">Loading Catalog Data...</p>
                  </div>
                ) : filteredProducts.length === 0 && filteredServices.length === 0 ? (
                  <div className="col-span-full py-12 px-6 rounded-card-md border border-line bg-canvas text-center">
                    <Package className="w-8 h-8 text-mute mx-auto mb-2" />
                    <p className="text-sm font-bold text-graphite">No Registered Products or Services Found</p>
                    <p className="text-xs text-stone mt-1">No verified commercial product or service matches the selected criteria.</p>
                  </div>
                ) : (
                  <>
                    {/* Products */}
                    {filteredProducts.slice(0, 3).map((prod) => (
                      <div
                        key={prod.id}
                        className="rounded-card-md border border-line bg-white p-5 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider font-semibold text-royal bg-soft px-2 py-0.5 rounded">
                              <Package className="w-3 h-3" />
                              PRODUCT
                            </span>
                            <span className="text-[11px] text-mute">{prod.category}</span>
                          </div>

                          <h4 className="mt-3 text-[14.5px] font-bold text-graphite">
                            {prod.name}
                          </h4>

                          <p className="mt-1.5 text-[12px] leading-relaxed text-stone line-clamp-2">
                            {prod.shortDescription || prod.description}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-line">
                          <a
                            href={prod.canonicalUrl || `/companies/${prod.companySlug || prod.companyId}`}
                            className="text-xs font-semibold text-royal hover:text-royal-dark inline-flex items-center gap-1"
                          >
                            <span>Inspect Product Specifications</span>
                            <ArrowRight className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))}

                    {/* Services */}
                    {filteredServices.slice(0, 3).map((srv) => (
                      <div
                        key={srv.id}
                        className="rounded-card-md border border-line bg-white p-5 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider font-semibold text-royal bg-royal/5 px-2 py-0.5 rounded">
                              <Wrench className="w-3 h-3" />
                              SERVICE
                            </span>
                            <span className="text-[11px] text-mute">{srv.category}</span>
                          </div>

                          <h4 className="mt-3 text-[14.5px] font-bold text-graphite">
                            {srv.name}
                          </h4>

                          <p className="mt-1.5 text-[12px] leading-relaxed text-stone line-clamp-2">
                            {srv.shortDescription || srv.description}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-line">
                          <a
                            href={srv.canonicalUrl || `/companies/${srv.companySlug || srv.companyId}`}
                            className="text-xs font-semibold text-royal hover:text-royal-dark inline-flex items-center gap-1"
                          >
                            <span>Inspect Service Capabilities</span>
                            <ArrowRight className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </DigiContainer>
          </section>
        )}

        {/* SECTION 4: INDUSTRY INTELLIGENCE & ECOSYSTEM ARCHITECTURE */}
        <section className="mt-20">
          <DigiContainer>
            <div className="rounded-card-lg border border-line bg-canvas p-8 md:p-10">
              <div className="grid gap-8 lg:grid-cols-3 items-center">
                <div className="lg:col-span-2">
                  <div className="flex items-center gap-2">
                    <DigiBadge variant="soft">REAL-SECTOR MARITIME REGISTRY</DigiBadge>
                    <span className="font-mono text-[10px] font-bold uppercase text-royal">CANONICAL LEDGER</span>
                  </div>
                  <h3 className="text-h2 mt-3 text-graphite">
                    Sovereign AI-Native Infrastructure for the Global Marine Economy
                  </h3>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-stone">
                    MarineWorld.City organizes commercial entities, specialized sector domains, product catalogs, and institutional registries into a unified high-trust ecosystem powered by Google Cloud and sovereign digital twins.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <DigiButton href="/sectors" variant="primary" size="md" icon="arrowRight">
                    Explore Taxonomy Domains
                  </DigiButton>
                  <DigiButton href="/cities" variant="secondary" size="md">
                    Inspect 25 Sector Cities
                  </DigiButton>
                </div>
              </div>
            </div>
          </DigiContainer>
        </section>
      </div>
    </PageShell>
  );
}
