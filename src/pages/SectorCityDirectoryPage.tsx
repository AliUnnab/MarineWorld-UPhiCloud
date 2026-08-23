import { useMemo, useState } from "react";
import type { SectorConfig } from "@/lib/types";
import { SectorCityTopChrome } from "@/components/foundation/SectorCityTopChrome";
import { GlobalFooter } from "@/components/foundation/GlobalFooter";
import { PageMetadata } from "@/components/foundation/PageMetadata";
import {
  getCityBySlug,
  getIndustryDomainById,
  getCompaniesInCity,
  formatCompactLocation,
} from "@/lib/registry";
import { ArrowRight, ArrowUpRight, Search } from "lucide-react";

export function SectorCityDirectoryPage({
  config,
  citySlug,
}: {
  config: SectorConfig;
  citySlug: string;
}) {
  const city = getCityBySlug(config, citySlug) ?? config.explorer.cities[0];
  const parentDomain = getIndustryDomainById(city.industryDomainId);
  const parentDomainName = parentDomain?.name ?? city.category;

  const [searchQuery, setSearchQuery] = useState("");

  const allCityCompanies = useMemo(() => {
    return getCompaniesInCity(config, city.id);
  }, [config, city.id]);

  const passesSearch = (name: string, region: string, industry: string) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (name || "").toLowerCase().includes(q) ||
      (region || "").toLowerCase().includes(q) ||
      (industry || "").toLowerCase().includes(q)
    );
  };

  // Directory is for ALL verified companies (text-forward list)
  const directoryCompanies = allCityCompanies.filter((c) =>
    passesSearch(c.displayName || c.name, formatCompactLocation(c.country, c.city), c.industry || "")
  );

  const breadcrumbs = [
    { label: "MarineWorld.City", href: "/" },
    { label: "Sector Cities", href: "/cities" },
    { label: parentDomainName, href: `/explore` },
    { label: city.domain.toUpperCase(), href: `/cities/${city.slug}` },
    { label: "Company Presence" },
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-graphite selection:bg-slate-100">
      <SectorCityTopChrome config={config} breadcrumbs={breadcrumbs} />
      <PageMetadata
        title={`${city.domain.toUpperCase()} Companies | MarineWorld.City`}
        description={`Verified companies establishing commercial presence in ${city.domain}.`}
      />

      <main className="pb-32">
        <section className="pt-24 md:pt-32 pb-16 px-4 sm:px-6 relative">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight uppercase">
              {city.domain} Companies
            </h1>
            <p className="text-lg text-slate-500 font-light max-w-2xl mx-auto">
              Verified enterprises establishing AI-Native commercial presence within the {city.domain} ecosystem.
            </p>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-4 sm:px-6 mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search companies by name, capability, or region..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all text-lg"
            />
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-4 sm:px-6">
          {directoryCompanies.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-500 font-light">No verified enterprises found matching your search.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {directoryCompanies.map((company) => (
                <a
                  key={company.id}
                  href={`/companies/${company.slug || company.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-100 hover:border-slate-300 rounded-lg group transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-2 truncate">
                      {company.displayName || company.name}
                      <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 shrink-0" />
                    </h3>
                    <p className="text-sm text-slate-500 mt-1 truncate">
                      <span className="font-medium text-slate-700">{company.industry || "Marine Services"}</span>
                      <span className="mx-2 text-slate-300">&bull;</span>
                      {formatCompactLocation(company.country, company.city) || "Global"}
                    </p>
                  </div>
                  <div className="hidden sm:block mt-4 sm:mt-0 shrink-0 ml-4">
                    <span className="text-xs font-mono uppercase tracking-widest text-slate-400 group-hover:text-slate-600 transition-colors">
                      Explore Company
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
        
        <section className="max-w-3xl mx-auto text-center pt-24 px-4">
           <div className="h-px w-24 bg-slate-200 mx-auto mb-12"></div>
           <a
              href={`/enter/${city.slug}`}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-widest hover:opacity-70 transition-opacity"
            >
              <span>Establish your commercial presence</span>
              <ArrowRight className="w-4 h-4" />
            </a>
        </section>

      </main>

      <GlobalFooter config={config} />
    </div>
  );
}
