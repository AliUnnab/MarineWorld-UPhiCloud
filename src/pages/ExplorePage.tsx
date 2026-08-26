import { useState, useMemo } from "react";
import type { SectorConfig } from "@/lib/types";
import { PageShell } from "@/components/foundation/PageShell";
import { CanonicalSectorCityCard } from "@/components/foundation/CanonicalCityCard";
import {
  DigiBadge,
  DigiButton,
  DigiContainer,
  Reveal,
} from "@/components/digione/primitives";
import {
  getCities,
  getCompanies,
  getMarineDomains,
  getCompanyProducts,
  getCompanyServices,
  formatCompactLocation,
} from "@/lib/registry";
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
  const cities = useMemo(() => getCities(config), [config]);
  const companies = useMemo(() => getCompanies(config), [config]);
  const domains = useMemo(() => getMarineDomains(), []);
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
        (p.category || "").toLowerCase().includes(q)
    ).slice(0, 6);
  }, [allProducts, q]);

  const filteredServices = useMemo(() => {
    if (!q) return allServices.slice(0, 6);
    return allServices.filter(
      (s) =>
        (s.name || "").toLowerCase().includes(q) ||
        (s.description || s.shortDescription || "").toLowerCase().includes(q) ||
        (s.category || "").toLowerCase().includes(q)
    ).slice(0, 6);
  }, [allServices, q]);

  const breadcrumbs = [
    { label: "MARINEWORLD", href: "/" },
    { label: "GLOBAL DISCOVERY" },
  ];

  return (
    <PageShell
      config={config}
      breadcrumbs={breadcrumbs}
      metadata={{
        title: "Global Marine Discovery & Ecosystem Explorer | MarineWorld.City",
        description:
          "Discover specialized Sector Cities, AI-Native companies, products, services, ports, shipyards, and marine intelligence across the global maritime economy.",
      }}
    >
      <div className="pb-28">
        {/* HERO EXPLORER HEADER */}
        <section className="bg-canvas border-b border-line py-12 md:py-16">
          <DigiContainer>
            <Reveal>
              <div className="flex flex-wrap items-center gap-3">
                <DigiBadge variant="soft">GLOBAL MARINE DISCOVERY LAYER</DigiBadge>
                <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-mute">
                  {cities.length} SECTOR CITIES · {companies.length} ACCREDITED ENTERPRISES · {domains.length} INDUSTRY DOMAINS
                </span>
              </div>

              <h1 className="text-display mt-6 max-w-4xl text-graphite">
                Ecosystem Discovery & Marine Intelligence
              </h1>

              <p className="text-lead mt-5 max-w-3xl text-stone">
                Global discovery layer for the marine economy. Find specialized Sector Cities, accredited enterprises, technical products, maritime services, and institutional governance hubs.
              </p>
            </Reveal>

            {/* OMNI-SEARCH */}
            <Reveal delay={40}>
              <div className="mt-10 max-w-3xl">
                <div className="relative">
                  <Search className="w-5 h-5 text-stone absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search cities, companies, products, services, or technical capabilities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-14 pl-12 pr-12 rounded-2xl border border-line bg-white focus:border-royal focus:outline-none text-sm text-graphite placeholder:text-mute shadow-sm transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-mute hover:text-graphite uppercase"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* CATEGORY TABS */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {[
                    { id: "all", label: "All Resources", icon: Globe2 },
                    { id: "cities", label: `Sector Cities (${cities.length})`, icon: Layers },
                    { id: "companies", label: `Companies (${companies.length})`, icon: Building2 },
                    { id: "products", label: `Products (${allProducts.length})`, icon: Package },
                    { id: "services", label: `Services (${allServices.length})`, icon: Wrench },
                  ].map((tab) => {
                    const IconComp = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-royal text-white shadow-sm"
                            : "bg-white border border-line text-stone hover:border-royal/50 hover:text-graphite"
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Reveal>

            {/* FAST-TRACK CANONICAL NAVIGATOR */}
            <Reveal delay={70}>
              <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <a
                  href="/cities"
                  className="group flex flex-col justify-between rounded-card-md border border-line bg-white p-5 transition-all duration-300 hover:border-royal hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-lg bg-soft flex items-center justify-center text-royal">
                        <Layers className="w-5 h-5" />
                      </div>
                    </div>
                    <h3 className="mt-4 text-[15px] font-bold text-graphite group-hover:text-royal transition-colors">
                      Sector Cities Directory
                    </h3>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-stone">
                      Explore all {cities.length} canonical Sector Cities with direct access to digital operating environments.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs font-semibold text-royal">
                    <span>View {cities.length} Cities</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </a>

                <a
                  href="/sectors"
                  className="group flex flex-col justify-between rounded-card-md border border-line bg-white p-5 transition-all duration-300 hover:border-royal hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-lg bg-soft flex items-center justify-center text-royal">
                        <Compass className="w-5 h-5" />
                      </div>
                    </div>
                    <h3 className="mt-4 text-[15px] font-bold text-graphite group-hover:text-royal transition-colors">
                      Master Industry Domains
                    </h3>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-stone">
                      Inspect the 8 approved economic domain groupings organizing global maritime commerce.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs font-semibold text-royal">
                    <span>Inspect 8 Domains</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </a>

                <a
                  href="/companies"
                  className="group flex flex-col justify-between rounded-card-md border border-line bg-white p-5 transition-all duration-300 hover:border-royal hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-lg bg-soft flex items-center justify-center text-royal">
                        <Building2 className="w-5 h-5" />
                      </div>
                    </div>
                    <h3 className="mt-4 text-[15px] font-bold text-graphite group-hover:text-royal transition-colors">
                      Verified AI-Native Companies
                    </h3>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-stone">
                      Explore accredited maritime organizations with sovereign operating twins and verified capabilities.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs font-semibold text-royal">
                    <span>Explore Network</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </a>

                <a
                  href="/ecosystem"
                  className="group flex flex-col justify-between rounded-card-md border border-line bg-white p-5 transition-all duration-300 hover:border-royal hover:shadow-md"
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
                {filteredCities.map((city) => (
                  <CanonicalSectorCityCard key={city.id} city={city} />
                ))}
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
                {filteredCompanies.map((company) => (
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
                ))}
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
                {/* Sample Products */}
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
                        href={prod.canonicalUrl || `/companies/${prod.companySlug || "crest-group-materials"}`}
                        className="text-xs font-semibold text-royal hover:text-royal-dark inline-flex items-center gap-1"
                      >
                        <span>Inspect Product Specifications</span>
                        <ArrowRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}

                {/* Sample Services */}
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
                        href={srv.canonicalUrl || `/companies/${srv.companySlug || "crest-group-materials"}`}
                        className="text-xs font-semibold text-royal hover:text-royal-dark inline-flex items-center gap-1"
                      >
                        <span>Inspect Service Capabilities</span>
                        <ArrowRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
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

                  <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-line">
                    <div>
                      <span className="font-mono text-2xl font-extrabold text-graphite">{cities.length}</span>
                      <p className="text-[11px] font-semibold text-mute uppercase mt-0.5">Sector Cities</p>
                    </div>
                    <div>
                      <span className="font-mono text-2xl font-extrabold text-graphite">{domains.length}</span>
                      <p className="text-[11px] font-semibold text-mute uppercase mt-0.5">Industry Domains</p>
                    </div>
                    <div>
                      <span className="font-mono text-2xl font-extrabold text-graphite">{companies.length}</span>
                      <p className="text-[11px] font-semibold text-mute uppercase mt-0.5">Enterprises</p>
                    </div>
                    <div>
                      <span className="font-mono text-2xl font-extrabold text-graphite">{verifiedCount}</span>
                      <p className="text-[11px] font-semibold text-mute uppercase mt-0.5">Verified Enterprises</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <DigiButton href="/sectors" variant="primary" size="lg" icon="arrowRight">
                    Explore Industry Taxonomy
                  </DigiButton>
                  <DigiButton href="/cities" variant="secondary" size="lg" icon="arrowRight">
                    Browse All Sector Cities
                  </DigiButton>
                  <DigiButton href="/enter" variant="ghost" size="md">
                    Establish Commercial Presence
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
