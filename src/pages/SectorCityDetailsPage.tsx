import { useState, useMemo, useEffect } from "react";
import type { SectorConfig, SectorCity, CompanyEntity } from "@/lib/types";
import { SectorCityTopChrome } from "@/components/foundation/SectorCityTopChrome";
import { GlobalFooter } from "@/components/foundation/GlobalFooter";
import { PageMetadata } from "@/components/foundation/PageMetadata";
import {
  getCityBySlug,
  getIndustryDomainById,
  getCompaniesInCity,
  getCompanyProducts,
  getCompanyServices,
} from "@/lib/registry";
import { getSectorCityById } from "@/services/sectorService";
import { listCompanies } from "@/services/companyService";
import {
  CANONICAL_CITY_REGIONS,
  resolveRegionEdition,
  getPublicPropertyProjections,
  getCountryPavilions,
} from "@/lib/services/propertyService";
import {
  Globe,
  Radio,
  FileText,
  LandmarkIcon,
  Layers,
} from "lucide-react";

export function SectorCityDetailsPage({
  config,
  citySlug,
}: {
  config: SectorConfig;
  citySlug: string;
}) {
  const [city, setCity] = useState<SectorCity | null>(null);
  const [liveCompanies, setLiveCompanies] = useState<CompanyEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getSectorCityById(citySlug)
      .then((c) => {
        setCity(c || null);
      })
      .catch((err) => {
        console.warn("[SectorCityDetailsPage] Error loading city:", err);
        setCity(null);
      })
      .finally(() => {
        setIsLoading(false);
      });

    listCompanies()
      .then((comps) => {
        if (comps && comps.length > 0) setLiveCompanies(comps);
      })
      .catch(() => {});
  }, [citySlug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center font-sans">
        <Globe className="w-10 h-10 text-royal animate-pulse mb-3" />
        <h2 className="text-lg font-bold text-graphite">Sektör Şehri Yükleniyor...</h2>
        <p className="text-xs text-stone mt-1">Dijital mimari verileri doğrulanıyor.</p>
      </div>
    );
  }

  if (!city) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-16 h-16 rounded-full bg-soft text-royal flex items-center justify-center mb-4">
          <Globe className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-graphite tracking-tight">Sektör Şehri Bulunamadı</h1>
        <p className="text-sm text-stone max-w-md mt-2">
          Talep edilen &apos;{citySlug}&apos; sektör şehri veritabanında bulunamadı.
        </p>
        <a
          href="/cities"
          className="mt-6 px-6 py-2.5 rounded-card-sm bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors"
        >
          Tüm Sektör Şehirlerine Dön &rarr;
        </a>
      </div>
    );
  }

  const parentDomain = getIndustryDomainById(city.industryDomainId);
  const parentDomainName = parentDomain?.name ?? city.category;
  
  const availableRegions = CANONICAL_CITY_REGIONS;
  const activeRegionEdition = resolveRegionEdition(city.id, "global");

  const allCityCompanies = liveCompanies.length > 0
    ? liveCompanies.filter((c) => {
        const normCityId = city.id.toLowerCase().replace(/\.city$/, "");
        const cityIds = [
          ...((c as any).cityIds || c.sectorCityIds || []),
          c.primarySectorCityId,
          c.primaryRegistryNode,
        ].filter(Boolean).map((s) => String(s).toLowerCase().replace(/\.city$/, ""));
        return cityIds.some((cid) => cid.includes(normCityId) || normCityId.includes(cid));
      })
    : [];
  const verifiedCompanies = allCityCompanies.filter((c) => (c.verificationStatus as string)?.toLowerCase() === "verified");
  const totalOfferingsCount = allCityCompanies.reduce((acc, c) => acc + (getCompanyProducts(c as any)?.length || 0) + (getCompanyServices(c as any)?.length || 0), 0);
  const countryPavilions = getCountryPavilions(config, city.id, activeRegionEdition.regionCode);
  
  const allRegionsData = CANONICAL_CITY_REGIONS.map((region) => {
    const proj = getPublicPropertyProjections(config, city.id, region.code);
    return {
      region,
      landmark: proj.landmark,
      activeFlagshipCount: proj.flagships.filter((f) => !f.companyName).length,
      presenceCount: proj.presence.length,
      isOccupied: !proj.landmark,
    };
  });

  const totalPlacementsCount = allRegionsData.reduce((acc, r) => acc + (r.landmark ? 1 : 0) + r.activeFlagshipCount + r.presenceCount, 0);
  const countriesSet = new Set<string>();
  allCityCompanies.forEach((c) => { if (c.country) countriesSet.add(c.country.trim().toUpperCase()); });
  countryPavilions.forEach((p) => { if (p.countryName) countriesSet.add(p.countryName.trim().toUpperCase()); });
  const totalCountriesCount = Math.max(countriesSet.size, 1);

  const breadcrumbs = [
    { label: "MarineWorld.City", href: "/" },
    { label: "Sector Cities", href: "/cities" },
    { label: city.domain.toUpperCase(), href: `/cities/${city.slug}` },
    { label: "ARCHITECTURE & COMPLIANCE" },
  ];

  return (
    <div className="min-h-screen bg-canvas font-sans text-graphite">
      <SectorCityTopChrome config={config} breadcrumbs={breadcrumbs} />
      <PageMetadata
        title={`${city.domain} Architecture & Compliance | MarineWorld.City`}
        description={`Operational framework and property definitions for ${city.domain}.`}
      />
      <main id="page-content">
        <div className="max-w-[1240px] w-full mx-auto px-4 sm:px-6 box-border space-y-16 pb-24 pt-10">
          
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight uppercase">
              {city.domain} Architecture & Compliance
            </h1>
            <p className="text-slate-600 mt-4 leading-relaxed">
              Detailed breakdown of the sector city's tier taxonomy, regional occupancy, and operational compliance frameworks.
            </p>
          </div>

          {/* Regional Grid */}
          <section className="bg-slate-50 text-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-2xs space-y-6">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-600 uppercase">
              <Globe className="w-4 h-4" />
              <span>Global Exposition Regional Grid</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {allRegionsData.map(({ region, landmark, presenceCount }) => (
                <div key={region.code} className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between min-h-[135px]">
                  <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">{region.code.replace("_", " ")}</div>
                  <div className="text-sm font-bold text-slate-900 mt-1">{region.name}</div>
                  <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px]">
                    <span className="font-semibold text-slate-800">{landmark ? landmark.companyName : "Open"}</span>
                    <span className="font-mono text-slate-500">{presenceCount} entries</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Stats Strip */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-2xl font-extrabold text-slate-900 font-mono">{verifiedCompanies.length}</div>
                <div className="text-[10px] font-mono text-slate-500 uppercase mt-1">Verified Enterprises</div>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-2xl font-extrabold text-blue-600 font-mono">{totalOfferingsCount}</div>
                <div className="text-[10px] font-mono text-slate-500 uppercase mt-1">Commercial Offerings</div>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-2xl font-extrabold text-slate-900 font-mono">{availableRegions.length}</div>
                <div className="text-[10px] font-mono text-slate-500 uppercase mt-1">Regional Editions</div>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-2xl font-extrabold text-emerald-700 font-mono">{countryPavilions.length}</div>
                <div className="text-[10px] font-mono text-slate-500 uppercase mt-1">Exposition Pavilions</div>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-2xl font-extrabold text-slate-900 font-mono">{totalCountriesCount}</div>
                <div className="text-[10px] font-mono text-slate-500 uppercase mt-1">Sovereign Nations</div>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-2xl font-extrabold text-amber-700 font-mono">{totalPlacementsCount}</div>
                <div className="text-[10px] font-mono text-slate-500 uppercase mt-1">Active Placements</div>
              </div>
            </div>
          </section>

          {/* Compliance */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-500 uppercase mb-6">
              <FileText className="w-4 h-4" />
              <span>Operational Framework & Compliance</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2 border-l-2 border-blue-500 pl-4">
                <div className="text-[10px] text-blue-600 font-mono font-bold uppercase">01 · MARKET STRUCTURE</div>
                <h4 className="text-xs font-bold text-slate-900 uppercase">Trade Corridors & Fleet Flow</h4>
                <p className="text-xs text-slate-600 leading-relaxed">Direct commercial routing and transaction verification across established Atlantic, Mediterranean, and Indo-Pacific maritime lanes.</p>
              </div>
              <div className="space-y-2 border-l-2 border-slate-300 pl-4">
                <div className="text-[10px] text-slate-500 font-mono font-bold uppercase">02 · REGULATORY MANDATES</div>
                <h4 className="text-xs font-bold text-slate-900 uppercase">IMO, SOLAS & MARPOL</h4>
                <p className="text-xs text-slate-600 leading-relaxed">Harmonized adherence with International Maritime Organization (IMO) conventions, STCW crewing standards, MLC 2006 compliance.</p>
              </div>
              <div className="space-y-2 border-l-2 border-slate-300 pl-4">
                <div className="text-[10px] text-slate-500 font-mono font-bold uppercase">03 · TECHNICAL SPECIFICATIONS</div>
                <h4 className="text-xs font-bold text-slate-900 uppercase">Technical Specifications & Class Standards</h4>
                <p className="text-xs text-slate-600 leading-relaxed">Support for classification society records, industry benchmarks, and quality management standards.</p>
              </div>
              <div className="space-y-2 border-l-2 border-slate-300 pl-4">
                <div className="text-[10px] text-slate-500 font-mono font-bold uppercase">04 · JURISDICTION & ARBITRATION</div>
                <h4 className="text-xs font-bold text-slate-900 uppercase">LMAA & Admiralty Law</h4>
                <p className="text-xs text-slate-600 leading-relaxed">Contractual enforcement structured under standard BIMCO clauses and London Maritime Arbitrators Association (LMAA).</p>
              </div>
            </div>
          </section>

          {/* Tier Taxonomy */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-500 uppercase mb-6">
              <Layers className="w-4 h-4" />
              <span>Digital Property Tier Taxonomy</span>
            </div>
            <div className="space-y-8">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2"><LandmarkIcon className="w-4 h-4 text-emerald-600"/> Landmark Properties</h4>
                <p className="text-sm text-slate-600 mt-1">The primary anchor property for a region. Limited to one exclusive enterprise holder per regional edition. Highest visibility and AI twin routing.</p>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Radio className="w-4 h-4 text-blue-600"/> Flagship Suites</h4>
                <p className="text-sm text-slate-600 mt-1">Dedicated commercial suites for market-leading enterprises. Each suite includes interactive product catalogues and direct inquiry routing.</p>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Layers className="w-4 h-4 text-slate-600"/> Business Presence</h4>
                <p className="text-sm text-slate-600 mt-1">Standard official presence for verified operators. Includes verified company presence and commercial capability indexing.</p>
              </div>
            </div>
          </section>
        </div>
      </main>
      <GlobalFooter config={config} />
    </div>
  );
}
