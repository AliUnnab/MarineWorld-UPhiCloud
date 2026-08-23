import { PageShell } from "@/components/foundation/PageShell";
import type { SectorConfig } from "@/lib/types";
import { getCityBySlug } from "@/lib/registry";
import { CANONICAL_CITY_REGIONS } from "@/lib/services/propertyService";
import { getPublicPropertyProjections } from "@/lib/services/propertyService";
import { ShieldCheck, ArrowRight, BrainCircuit, Globe, Building2, Briefcase } from "lucide-react";
import { getCompanyById } from "@/lib/services/companyService";

export function FlagshipPropertyPage({
  config,
  cityId,
  regionSlug,
}: {
  config: SectorConfig;
  cityId: string;
  regionSlug: string;
}) {
  const city = getCityBySlug(config, cityId) ?? config.explorer.cities[0];
  const region = CANONICAL_CITY_REGIONS.find((r) => r.slug === regionSlug) ?? CANONICAL_CITY_REGIONS[0];
  
  const projections = getPublicPropertyProjections(config, city.id, region.code);
  const landmark = projections.landmark;

  // Fallback to empty state if no landmark exists
  if (!landmark) {
    return (
      <PageShell config={config}>
        <div className="max-w-[1180px] mx-auto px-6 py-24 text-center">
          <h1 className="text-4xl font-medium">Property Available</h1>
          <p className="mt-4 text-slate-500">This flagship property is available for reservation.</p>
        </div>
      </PageShell>
    );
  }

  const company = getCompanyById(landmark.companyId);

  const breadcrumbs = [
    { label: "MarineWorld.City", href: "/" },
    { label: city.domain.toUpperCase(), href: `/cities/${city.slug}` },
    { label: region.name, href: `/cities/${city.slug}/${region.slug}` },
    { label: "Flagship Property" },
  ];

  return (
    <PageShell breadcrumbs={breadcrumbs} config={config}>
      <div className="max-w-[1180px] w-full mx-auto px-6 box-border space-y-16 pb-24">
        
        {/* 1. CITY CONTEXT */}
        <div className="pt-8 md:pt-12 pb-4 flex flex-col items-center text-center space-y-6 border-b border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 rounded-full bg-slate-100 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
              {region.name}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium text-slate-900 tracking-tight uppercase">
            {city.domain}
          </h1>
          <p className="text-base text-slate-500 font-light max-w-2xl mx-auto uppercase tracking-widest pb-8">
            {city.description}
          </p>
        </div>

        {/* 2 & 3. FLAGSHIP PROPERTY & COMPANY IDENTITY */}
        <section className="relative rounded-3xl overflow-hidden min-h-[600px] md:min-h-[700px] bg-slate-900 shadow-2xl flex flex-col group">
          <div className="absolute inset-0 z-0">
            <img
              src={landmark.creative.mediaUrl || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=2000&q=80"}
              alt="Flagship Property"
              className="w-full h-full object-cover opacity-60 mix-blend-luminosity group-hover:scale-105 transition-transform duration-1000"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-transparent" />
          </div>

          {/* Top meta tags */}
          <div className="relative z-10 p-8 md:p-12 flex justify-between items-start">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded bg-white/10 backdrop-blur text-[10px] font-bold text-white border border-white/20 uppercase tracking-widest">
                FLAGSHIP DIGITAL PROPERTY
              </span>
              <span className="px-3 py-1 rounded bg-blue-600/20 backdrop-blur text-[10px] font-bold text-blue-300 border border-blue-500/30 uppercase tracking-widest">
                SLOT: {landmark.slotCode}
              </span>
            </div>
            {landmark.verificationStatus === "VERIFIED" && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded text-[10px] font-bold text-emerald-400 uppercase tracking-widest backdrop-blur">
                <ShieldCheck className="w-3.5 h-3.5" />
                VERIFIED TENANT
              </span>
            )}
          </div>

          <div className="relative z-10 p-8 md:p-12 mt-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-end">
            <div className="md:col-span-8 space-y-8">
              {/* Logo & Identity */}
              <div className="space-y-6">
                {landmark.companyLogo && (
                  <div className="h-16 md:h-20 max-w-[200px]">
                    <img 
                      src={landmark.companyLogo} 
                      alt={landmark.companyName}
                      className="h-full w-auto object-contain brightness-0 invert"
                    />
                  </div>
                )}
                
                {!landmark.companyLogo && (
                  <h2 className="text-5xl md:text-7xl font-medium text-white tracking-tight">
                    {landmark.companyName}
                  </h2>
                )}

                <div className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    {landmark.companyRegion}
                  </span>
                  <span className="text-slate-600">|</span>
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Premium Tenant
                  </span>
                </div>
              </div>

              <div className="space-y-4 max-w-2xl">
                <h3 className="text-2xl md:text-3xl font-light text-white leading-snug">
                  {landmark.creative.headline || company?.shortDescription || "Premium Maritime Solutions"}
                </h3>
                <p className="text-lg text-slate-400 font-light leading-relaxed">
                  {landmark.creative.subheadline}
                </p>
              </div>
            </div>

            {/* Business Interaction Actions */}
            <div className="md:col-span-4 flex flex-col gap-4">
              <a
                href={landmark.creative.ctaHref}
                className="w-full inline-flex items-center justify-between bg-blue-600 hover:bg-blue-500 text-white px-8 py-5 rounded text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <span>EXPLORE COMPANY</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href={`${landmark.creative.ctaHref}?connect=true`}
                className="w-full inline-flex items-center justify-between bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-5 rounded text-xs font-bold uppercase tracking-wider transition-colors backdrop-blur-sm"
              >
                <span>REQUEST INTRODUCTION</span>
                <Briefcase className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-8">
          {/* 5. COMPANY STORY */}
          <div className="lg:col-span-8 space-y-12">
            <section className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-8 h-[1px] bg-slate-300"></div>
                <h2 className="text-sm font-bold text-slate-400 tracking-[0.2em] uppercase">
                  ENTERPRISE NARRATIVE
                </h2>
              </div>
              <div className="prose prose-slate prose-lg max-w-none text-slate-600 font-light leading-relaxed">
                <p>
                  {company?.description || 
                  "Established as a cornerstone of the regional maritime sector, this enterprise drives operational excellence and innovation across the value chain. By maintaining a flagship presence within the digital business district, they provide unparalleled access to premium capabilities, fostering ecosystem growth and ensuring compliance with the highest international standards."}
                </p>
                <p className="mt-4">
                  Their strategic position in the {region.name} highlights a commitment to robust maritime infrastructure, high-end service delivery, and sustainable industry development.
                </p>
              </div>
            </section>

            {/* 4. FEATURED OFFERING */}
            {landmark.creative.featuredOfferingName && (
              <section className="space-y-6 pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-[1px] bg-slate-300"></div>
                  <h2 className="text-sm font-bold text-slate-400 tracking-[0.2em] uppercase">
                    FEATURED {landmark.creative.featuredOfferingType}
                  </h2>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 md:p-12 hover:border-slate-300 transition-colors group flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="space-y-4 max-w-xl">
                    <h3 className="text-2xl md:text-3xl font-medium text-slate-900">
                      {landmark.creative.featuredOfferingName}
                    </h3>
                    <p className="text-slate-500 font-light text-lg">
                      Premium maritime capability available through the {region.name} digital showroom.
                    </p>
                  </div>
                  <a 
                    href={landmark.creative.featuredOfferingHref || "#"}
                    className="shrink-0 inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    VIEW OFFERING &rarr;
                  </a>
                </div>
              </section>
            )}
          </div>

          {/* 6. DIGITAL TWIN */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 bg-slate-900 rounded-2xl p-8 border border-slate-800 space-y-8">
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                <BrainCircuit className="w-6 h-6 text-blue-400" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-medium text-white uppercase tracking-wide">
                  ENTERPRISE AI TWIN
                </h3>
                <p className="text-sm text-slate-400 font-light leading-relaxed">
                  Interact with the verified organizational intelligence model for {landmark.companyName}.
                  Access structured capabilities, operational records, and capability matching.
                </p>
              </div>
              <button className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded text-xs font-bold uppercase tracking-wider transition-colors">
                <BrainCircuit className="w-4 h-4" />
                INITIATE AI SESSION
              </button>
            </div>
          </div>
        </div>

      </div>
    </PageShell>
  );
}
