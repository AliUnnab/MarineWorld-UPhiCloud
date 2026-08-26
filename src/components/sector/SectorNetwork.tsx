import { useMemo } from "react";
import type { SectorConfig } from "@/lib/types";
import { DigiContainer, DigiSection, DigiSectionHeader, Reveal } from "@/components/digione/primitives";
import { CompanyCard } from "@/components/foundation";
import { getCompanies, getCities, compareCompaniesForRegistryRanking } from "@/lib/registry";
import { ArrowRight, Building, Globe, Layers, ShieldCheck } from "lucide-react";

/**
 * Business Ecosystem — featured verified enterprises showcase.
 * Curated highlight teaser + direct gateway to the full canonical directory (/companies).
 */
export function SectorNetwork({ config }: { config: SectorConfig }) {
  const { network } = config;
  const allCompanies = useMemo(() => getCompanies(config), [config]);
  const allCities = useMemo(() => getCities(config), [config]);

  // Real verified count dynamically calculated from registry single source of truth
  const verifiedCount = useMemo(
    () => allCompanies.filter((c) => c.verificationStatus === "verified").length,
    [allCompanies]
  );

  // Real data: 6 recently verified / flagship companies from canonical registry
  const recentlyVerifiedCompanies = useMemo(() => {
    return [...allCompanies]
      .filter((c) => c.verificationStatus === "verified")
      .sort(compareCompaniesForRegistryRanking)
      .slice(0, 6);
  }, [allCompanies]);

  return (
    <DigiSection id="network">
      <DigiContainer>
        <Reveal>
          <DigiSectionHeader
            id="network-title"
            index="04 / ECOSYSTEM"
            eyebrow={network.eyebrow}
            title={network.headline}
            lead={network.lead}
          />
        </Reveal>

        {/* STAT & HIGHLIGHT STRIP — Real dynamic counts from single source of truth */}
        <Reveal delay={60}>
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-line shadow-xs">
            <div className="flex items-center gap-3 p-2">
              <div className="w-10 h-10 rounded-xl bg-royal/10 border border-royal/20 flex items-center justify-center text-royal shrink-0">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <p className="text-base font-bold text-graphite">{allCompanies.length}</p>
                <p className="text-[11px] text-mute uppercase font-mono">Registered Enterprises</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-base font-bold text-graphite">{verifiedCount}</p>
                <p className="text-[11px] text-mute uppercase font-mono">Verified Enterprises</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-base font-bold text-graphite">{allCities.length}</p>
                <p className="text-[11px] text-mute uppercase font-mono">Sovereign Sector Cities</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <p className="text-base font-bold text-graphite">Global</p>
                <p className="text-[11px] text-mute uppercase font-mono">Operating Twins</p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* CURATED SHOWCASE HEADER */}
        <Reveal delay={80}>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-xs font-bold text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Recently Verified & Flagship Entities</span>
                <span className="font-mono text-[11px] text-emerald-600">({recentlyVerifiedCompanies.length})</span>
              </div>
            </div>

            <a
              href="/companies"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-royal hover:text-royal-dark hover:underline"
            >
              <span>Explore all {allCompanies.length} enterprises</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </Reveal>

        {/* CURATED 6-COMPANY SHOWCASE */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {recentlyVerifiedCompanies.map((company, i) => (
            <Reveal key={company.id} delay={(i % 3) * 70} className="h-full">
              <CompanyCard company={company} />
            </Reveal>
          ))}
        </div>

        {/* BOTTOM DIRECTORY GATEWAY BANNER */}
        <Reveal delay={120}>
          <div className="mt-12 rounded-2xl border border-line bg-slate-50 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-base font-bold text-graphite">
                Looking for a specific maritime enterprise or capability?
              </h3>
              <p className="text-xs text-stone mt-1 max-w-xl">
                Search and facet-filter across {allCompanies.length} enterprises in {allCities.length} Sector Cities, explore geographic hub maps, and review sovereign business twin operational capabilities.
              </p>
            </div>

            <a
              href="/companies"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-royal hover:bg-royal-dark text-white text-xs font-bold shadow-xs transition shrink-0 cursor-pointer"
            >
              <Building className="w-4 h-4" />
              <span>EXPLORE ALL {allCompanies.length} ENTERPRISES</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </Reveal>
      </DigiContainer>
    </DigiSection>
  );
}
