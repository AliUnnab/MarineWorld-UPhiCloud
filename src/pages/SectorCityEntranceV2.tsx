import { useState, useMemo, useEffect } from "react";
import type { SectorConfig, CompanyProfile } from "@/lib/types";
import { SectorCityTopChrome } from "@/components/foundation/SectorCityTopChrome";
import { GlobalFooter } from "@/components/foundation/GlobalFooter";
import { PageMetadata } from "@/components/foundation/PageMetadata";
import {
  getCityBySlug,
  getIndustryDomainById,
  getCompanyById,
  getCompanyBySlug,
  getCompaniesInCity,
  formatCompactLocation,
} from "@/lib/registry";
import {
  CANONICAL_CITY_REGIONS,
  resolveRegionEdition,
  getPublicPropertyProjections,
  getCountryPavilions,
} from "@/lib/services/propertyService";
import {
  ShieldCheck,
  ArrowRight,
  ArrowUpRight,
  ImageOff,
  Building2,
  Compass,
  Search,
  MessageSquare,
  X,
  List,
  CheckCircle2,
  Globe,
  MapPin,
  Layers,
  FileText,
  Briefcase,
  Award,
  ChevronRight,
  Anchor,
  Sparkles,
} from "lucide-react";
import { CreativeData } from "@/components/studio/CompanyStudioPropertyEditor";

export interface SectorCityEntrancePreviewOverride {
  slotId: string;
  creative: CreativeData;
  companyId?: string;
  companyProfile?: CompanyProfile;
}

function SafeImage({
  src,
  alt,
  className = "w-full h-full object-cover",
  fallbackLabel = "Maritime Photography",
  aspectRatioClass = "aspect-video",
}: {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  aspectRatioClass?: string;
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div
        className={`w-full h-full ${aspectRatioClass} bg-slate-100 flex flex-col items-center justify-center text-slate-400 p-6 select-none`}
      >
        <div className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center mb-2 shadow-2xs">
          <ImageOff className="w-4 h-4 text-slate-400" />
        </div>
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 text-center">
          {fallbackLabel}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
}

export function SectorCityEntranceV2({
  config,
  citySlug,
  regionSlug,
  previewCreativeOverride,
}: {
  config: SectorConfig;
  citySlug: string;
  regionSlug?: string;
  previewCreativeOverride?: SectorCityEntrancePreviewOverride;
}) {
  const city = getCityBySlug(config, citySlug) ?? config.explorer.cities[0];
  const parentDomain = getIndustryDomainById(city.industryDomainId);
  const parentDomainName = parentDomain?.name ?? city.category;

  const availableRegions = CANONICAL_CITY_REGIONS;
  const [selectedRegionSlug, setSelectedRegionSlug] = useState<string>(
    regionSlug || (availableRegions[0]?.slug ?? "global")
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);

  useEffect(() => {
    if (regionSlug) {
      setSelectedRegionSlug(regionSlug);
    } else if (!availableRegions.some((r) => r.slug === selectedRegionSlug)) {
      setSelectedRegionSlug(availableRegions[0]?.slug ?? "global");
    }
  }, [regionSlug, availableRegions, selectedRegionSlug]);

  const activeRegionEdition = useMemo(
    () => resolveRegionEdition(city.id, selectedRegionSlug),
    [city.id, selectedRegionSlug]
  );

  const propertyData = useMemo(() => {
    const data = getPublicPropertyProjections(
      config,
      city.id,
      activeRegionEdition.regionCode
    );

    if (previewCreativeOverride) {
      const { slotId, creative, companyId, companyProfile } =
        previewCreativeOverride;

      const targetComp: CompanyProfile | undefined =
        companyProfile ||
        (companyId ? getCompanyById(config, companyId) : undefined) ||
        (companyId ? getCompanyBySlug(config, companyId) : undefined);

      const resolvedCompanyName = targetComp
        ? targetComp.displayName || targetComp.legalName || targetComp.name
        : "Company";
      const resolvedLogo = targetComp?.coverImage;
      const resolvedVerification: "VERIFIED" | "UNVERIFIED" =
        targetComp?.verificationStatus === "verified"
          ? "VERIFIED"
          : "UNVERIFIED";
      const resolvedRegion = targetComp
        ? formatCompactLocation(targetComp.country, targetComp.city)
        : "Global";
      const resolvedCompanyId =
        targetComp?.id || targetComp?.slug || companyId || "company";

      const resolvedCreative = {
        headline: creative.headline || "",
        subheadline: creative.subheadline || "",
        tagline: creative.description || "",
        mediaUrl: creative.mediaUrl,
        ctaLabel: creative.ctaLabel || "EXPLORE COMPANY",
        ctaHref: creative.ctaHref || `/companies/${resolvedCompanyId}`,
        featuredOfferingName: creative.featuredOfferingName,
        featuredOfferingType: creative.featuredOfferingType,
      };

      if (slotId.includes("-lm-")) {
        data.landmark = {
          id: `preview-lm-${slotId}`,
          cityId: city.id,
          regionCode: activeRegionEdition.regionCode,
          tier: "LANDMARK",
          slotCode: slotId,
          companyId: resolvedCompanyId,
          companyName: resolvedCompanyName,
          companyLogo: resolvedLogo,
          companyRegion: resolvedRegion,
          verificationStatus: resolvedVerification,
          isFoundingMember: true,
          creative: resolvedCreative,
        };
      } else if (slotId.includes("-fs-")) {
        const slotIndex = parseInt(slotId.split("-").pop() || "1", 10) - 1;
        const validIndex = slotIndex >= 0 && slotIndex < 6 ? slotIndex : 0;
        const newFlagships = [...data.flagships];
        newFlagships[validIndex] = {
          ...newFlagships[validIndex],
          companyId: resolvedCompanyId,
          companyName: resolvedCompanyName,
          companyLogo: resolvedLogo,
          companyRegion: resolvedRegion,
          verificationStatus: resolvedVerification,
          creative: resolvedCreative,
        };
        data.flagships = newFlagships;
      }
    }
    return data;
  }, [
    config,
    city.id,
    activeRegionEdition.regionCode,
    previewCreativeOverride,
  ]);

  const countryPavilions = useMemo(
    () => getCountryPavilions(config, city.id, activeRegionEdition.regionCode),
    [config, city.id, activeRegionEdition.regionCode]
  );

  const allCityCompanies = useMemo(
    () => getCompaniesInCity(config, city.id),
    [config, city.id]
  );

  const breadcrumbs = [
    { label: "MarineWorld.City", href: "/" },
    { label: "Explore", href: "/explore" },
    { label: "Cities", href: "/cities" },
    { label: parentDomainName, href: "/explore" },
    { label: city.domain.toUpperCase() },
  ];

  const { landmark, flagships, presence } = propertyData;

  const passesSearch = (name: string, region: string, industry: string = "") => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (name || "").toLowerCase().includes(q) ||
      (region || "").toLowerCase().includes(q) ||
      (industry || "").toLowerCase().includes(q)
    );
  };

  const showLandmark =
    landmark &&
    passesSearch(
      landmark.companyName,
      landmark.companyRegion,
      landmark.companyIndustry || ""
    );

  const activeFlagships = flagships.filter(
    (f) =>
      f.companyName &&
      passesSearch(f.companyName, f.companyRegion, f.companyIndustry || "")
  );

  const activePresence = presence.filter((p) => {
    const name = p.displayName || p.name;
    const region = formatCompactLocation(p.country, p.city);
    return passesSearch(name, region, p.industry || "");
  });

  const displayFlagships = [...activeFlagships];
  while (displayFlagships.length < 4 && !searchQuery) {
    displayFlagships.push({ id: `empty-fs-${displayFlagships.length}` } as any);
  }

  return (
    <div className="min-h-screen bg-white font-sans text-graphite selection:bg-slate-100 relative">
      <SectorCityTopChrome config={config} breadcrumbs={breadcrumbs} />
      <PageMetadata
        title={`${city.domain.toUpperCase()} · Sector City | MarineWorld.City`}
        description={
          city.description ||
          `Explore the prestigious ${city.domain} on MarineWorld.City.`
        }
      />

      <main id="page-content" className="pb-32">
        {/* HERO - THREE-TIER HIERARCHY & CITY ENTRANCE */}
        <section className="pt-20 md:pt-28 pb-12 px-4 sm:px-6 relative border-b border-slate-100">
          <div className="max-w-5xl mx-auto text-center space-y-6">
            
            {/* THREE-TIER VISUAL PROGRESSION */}
            <div className="inline-flex items-center justify-center flex-wrap gap-2 text-xs font-medium uppercase tracking-wider text-slate-500 mb-2 bg-slate-50/80 px-4 py-2 rounded-full border border-slate-200/60">
              <span className="text-slate-600 font-medium">
                {city.category}
              </span>
              <span className="text-slate-300 font-light">→</span>
              <span className="text-slate-700 font-semibold">
                {parentDomainName}
              </span>
              <span className="text-slate-300 font-light">→</span>
              <span className="text-blue-700 font-extrabold bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200/80 tracking-widest">
                {city.domain.toUpperCase()}
              </span>
            </div>

            {/* CITY DOMAIN HEADLINE */}
            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[88px] font-extrabold text-slate-900 tracking-tight uppercase leading-[0.95] text-balance">
              {city.domain}
            </h1>

            {/* POSITIONING STATEMENT */}
            <p className="text-lg sm:text-xl md:text-2xl text-slate-600 font-light max-w-3xl mx-auto leading-relaxed">
              {city.description}
            </p>

            {/* FRAMEWORK LINK */}
            <div className="pt-4">
              <a
                href={`/cities/${city.slug}/details`}
                className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-500 hover:text-blue-600 transition-colors bg-white px-4 py-2 rounded-full border border-slate-200 shadow-2xs hover:border-blue-300"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>View Architecture & Compliance Framework</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </a>
            </div>

            {/* CITY SIGNALS / METRICS STRIP */}
            <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto border-t border-slate-100 text-left">
              <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-100">
                <p className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                  Verified Companies
                </p>
                <p className="text-2xl font-extrabold text-slate-900">
                  {allCityCompanies.length}
                </p>
                <p className="text-[11px] text-slate-500 font-light mt-0.5">
                  Active commercial presence
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-100">
                <p className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                  City Editions
                </p>
                <p className="text-2xl font-extrabold text-slate-900">
                  {availableRegions.length}
                </p>
                <p className="text-[11px] text-slate-500 font-light mt-0.5">
                  Active global jurisdictions
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-100">
                <p className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                  Commercial Presence
                </p>
                <p className="text-2xl font-extrabold text-slate-900">
                  {activeFlagships.length + (showLandmark ? 1 : 0)}
                </p>
                <p className="text-[11px] text-slate-500 font-light mt-0.5">
                  Landmark & Flagships
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-100">
                <p className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                  Commercial Standard
                </p>
                <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Verified Standard</span>
                </p>
                <p className="text-[11px] text-slate-500 font-light mt-0.5">
                  Governed Ecosystem
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* CITY EDITION SELECTOR & SEARCH */}
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 my-10">
          <div className="bg-slate-50/70 p-4 md:p-6 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                <span>City Editions</span>
              </span>
              <span className="text-xs text-slate-500 font-light hidden sm:inline">
                Active: <strong className="text-slate-900 font-semibold">{activeRegionEdition.name}</strong>
              </span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Regional Edition Pill Selector */}
              <div
                className="flex-1 overflow-x-auto no-scrollbar pb-1 md:pb-0"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <div className="flex items-center gap-2">
                  {availableRegions.map((region) => {
                    const isActive = region.slug === selectedRegionSlug;
                    return (
                      <button
                        key={region.slug}
                        onClick={() => setSelectedRegionSlug(region.slug)}
                        className={`whitespace-nowrap px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                          isActive
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900"
                        }`}
                      >
                        {region.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search Bar */}
              <div className="w-full md:w-[320px] shrink-0 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search companies or presence..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                />
              </div>
            </div>
          </div>
        </section>

        {/* THREE-TIER SHOWCASE GALLERY */}
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 space-y-16">
          
          {/* TIER 1: CITY LANDMARK */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                  TIER 1: CITY LANDMARK
                </span>
                <p className="text-sm text-slate-500 font-light mt-1">
                  Primary anchor digital commercial presence in {city.domain} ({activeRegionEdition.name})
                </p>
              </div>
            </div>

            <div className="w-full">
              {showLandmark ? (
                <div
                  className="flex flex-col md:flex-row group cursor-pointer border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs hover:border-slate-400 transition-all"
                  onClick={() =>
                    (window.location.href = `/companies/${landmark.companyId}`)
                  }
                >
                  <div className="md:w-3/5 aspect-video md:aspect-[16/8] bg-slate-100 overflow-hidden relative">
                    <SafeImage
                      src={
                        landmark.creative.mediaUrl ||
                        landmark.companyLogo ||
                        "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=1600&q=80"
                      }
                      alt={landmark.companyName}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute top-4 left-4 bg-slate-900/90 text-white text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded backdrop-blur-xs">
                      Anchor Tenant · {landmark.companyRegion}
                    </div>
                  </div>

                  <div className="md:w-2/5 p-8 md:p-12 xl:p-14 flex flex-col justify-between bg-white">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-700">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verified Anchor Entity</span>
                      </div>

                      <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        {landmark.companyName}
                      </h2>

                      <p className="text-slate-600 font-light text-base md:text-lg leading-relaxed">
                        {landmark.creative.headline ||
                          "Primary anchor enterprise operating inside " +
                            city.domain}
                      </p>

                      {landmark.creative.tagline && (
                        <p className="text-xs text-slate-500 italic">
                          "{landmark.creative.tagline}"
                        </p>
                      )}
                    </div>

                    <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                        {landmark.slotCode}
                      </span>
                      <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 group-hover:text-blue-800 transition-colors">
                        <span>Explore Company</span>
                        <ArrowUpRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              ) : !searchQuery ? (
                <div
                  className="flex flex-col md:flex-row border border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-blue-500 hover:bg-blue-50/20 transition-all group p-8 md:p-12 items-center gap-8 bg-slate-50/40"
                  onClick={() =>
                    (window.location.href = `/enter/${city.slug}`)
                  }
                >
                  <div className="md:w-1/2 space-y-4">
                    <span className="text-xs font-mono uppercase tracking-widest text-blue-700 font-bold bg-blue-100 px-3 py-1 rounded-full">
                      Flagship Anchor Position Available
                    </span>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 group-hover:text-blue-900 transition-colors">
                      Reserve the Landmark Position
                    </h2>
                    <p className="text-slate-600 font-light text-base leading-relaxed">
                      Establish the primary anchor commercial presence in {city.domain} for
                      the {activeRegionEdition.name} edition. Connect your AI-Native Company to
                      unmatched visibility across the global maritime network.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2 text-xs font-medium text-slate-600">
                      <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        Prime Visibility
                      </span>
                      <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        Verified Ecosystem
                      </span>
                      <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        Strategic Advantage
                      </span>
                    </div>
                  </div>

                  <div className="md:w-1/2 w-full flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-xl text-center space-y-4 shadow-2xs">
                    <Building2 className="w-10 h-10 text-slate-300 group-hover:text-blue-600 transition-colors" />
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        Tier 1 Landmark Slot
                      </p>
                      <p className="text-xs text-slate-500 font-mono mt-1">
                        {city.id.toUpperCase()}-LM-01
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-2 bg-slate-900 text-white group-hover:bg-blue-600 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-colors">
                      <span>Reserve Landmark Presence →</span>
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* TIER 2: CITY DISTRICTS */}
          <div className="space-y-6 pt-6 border-t border-slate-200">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 uppercase tracking-tight">
                TIER 2: CITY DISTRICTS
              </h2>
              <p className="text-sm text-slate-500 font-light mt-1">
                Geographic and market-specific commercial pavilions inside {city.domain}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {countryPavilions.slice(0, 3).map((pavilion) => (
                <div
                  key={pavilion.id}
                  className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-400 transition-all flex flex-col justify-between"
                >
                  <div className="aspect-[16/9] overflow-hidden relative bg-slate-100">
                    <SafeImage
                      src={pavilion.heroImage}
                      alt={pavilion.countryName}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-bold text-slate-900 flex items-center gap-2 border border-slate-200">
                      <span>{pavilion.flagEmoji}</span>
                      <span>{pavilion.countryName}</span>
                    </div>
                  </div>

                  <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{pavilion.featuredHub}</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-snug">
                        {pavilion.subtitle}
                      </h3>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex flex-wrap gap-1.5">
                        {pavilion.capabilities.slice(0, 3).map((cap, i) => (
                          <span
                            key={i}
                            className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded font-medium"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-slate-100">
                        <a
                          href={pavilion.ctaHref}
                          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 group-hover:text-blue-800 transition-colors"
                        >
                          <span>Explore District</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ACTIVE COMPANY PRESENCE */}
          <div id="active-presence" className="space-y-8 pt-6 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 uppercase tracking-tight">
                  ACTIVE COMPANY PRESENCE
                </h2>
                <p className="text-sm text-slate-500 font-light mt-1">
                  Verified companies with an active commercial presence inside {city.domain}.
                </p>
              </div>

              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                {allCityCompanies.filter(c => passesSearch(c.displayName || c.legalName || c.name || "", formatCompactLocation(c.country, c.city), c.industry || "")).length} Verified Entities
              </span>
            </div>

            {/* OCCUPIED FLAGSHIP SUITES */}
            {activeFlagships.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-mono uppercase tracking-widest text-slate-400">
                  Flagship Commercial Presence
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {activeFlagships.map((f: any, idx: number) => {
                    const logoUrl = f.creative?.mediaUrl || f.companyLogo;
                    return (
                      <a
                        key={f.id || `f-${idx}`}
                        href={`/companies/${f.companyId}`}
                        className="group relative bg-white border border-slate-200/80 p-6 md:p-8 flex flex-col justify-between min-h-[170px] rounded-xl transition-all duration-200 hover:-translate-y-1 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 shadow-2xs"
                      >
                        {/* Top Accent Rule */}
                        <div className="absolute top-0 left-6 right-6 h-[2.5px] bg-blue-600 group-hover:bg-blue-700 transition-all rounded-t" />

                        <div className="space-y-3">
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt={f.companyName}
                              className="h-5 max-w-[120px] object-contain opacity-75 group-hover:opacity-100 transition-opacity mb-2"
                            />
                          ) : null}

                          <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-snug group-hover:text-blue-700 transition-colors">
                            {f.companyName}
                          </h3>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400 group-hover:text-slate-600 transition-colors">
                            {f.companyRegion || "Global"}
                          </p>
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 group-hover:text-blue-800 transition-colors flex items-center gap-1">
                            <span>Explore Company</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VERIFIED COMPANY PRESENCE GRID */}
            <div className="space-y-4">
              {allCityCompanies.filter((c) =>
                passesSearch(
                  c.displayName || c.legalName || c.name || "",
                  formatCompactLocation(c.country, c.city),
                  c.industry || ""
                )
              ).length === 0 ? (
                <div className="text-center py-12 px-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">
                    No active company presence records currently indexed for {city.domain}.
                  </p>
                  <p className="text-xs text-slate-500 font-light max-w-md mx-auto">
                    Commercial entities with verified credentials can establish presence using the available inventory below.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allCityCompanies
                    .filter((c) =>
                      passesSearch(
                        c.displayName || c.legalName || c.name || "",
                        formatCompactLocation(c.country, c.city),
                        c.industry || ""
                      )
                    )
                    .map((company) => {
                      const companyName = company.displayName || company.legalName || company.name || "Company";
                      const location = formatCompactLocation(company.country, company.city);
                      const companyId = company.slug || company.id;

                      return (
                        <a
                          key={company.id}
                          href={`/companies/${companyId}`}
                          className="group bg-white border border-slate-200 rounded-2xl p-6 hover:border-slate-400 transition-all flex flex-col justify-between shadow-2xs space-y-4"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                {company.coverImage ? (
                                  <img
                                    src={company.coverImage}
                                    alt={companyName}
                                    className="w-10 h-10 rounded-lg object-contain border border-slate-100 bg-slate-50 p-1 shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold flex items-center justify-center shrink-0 text-sm">
                                    {companyName.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors leading-snug">
                                    {companyName}
                                  </h3>
                                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-0.5">
                                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>{location}</span>
                                  </div>
                                </div>
                              </div>

                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Verified</span>
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 font-light leading-relaxed line-clamp-2">
                              {(company as any).tagline || company.description || `Verified enterprise providing commercial maritime services inside ${city.domain}.`}
                            </p>

                            {company.capabilities && company.capabilities.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {company.capabilities.slice(0, 3).map((cap, i) => (
                                  <span
                                    key={i}
                                    className="text-[10.5px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium"
                                  >
                                    {cap}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10.5px] font-mono uppercase tracking-wider text-slate-400">
                              Commercial Presence
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 group-hover:text-blue-800 transition-colors flex items-center gap-1">
                              <span>Explore Company</span>
                              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                            </span>
                          </div>
                        </a>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* AVAILABLE COMMERCIAL PRESENCE */}
          <div id="available-presence" className="space-y-8 pt-6 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 uppercase tracking-tight">
                  AVAILABLE COMMERCIAL PRESENCE
                </h2>
                <p className="text-sm text-slate-500 font-light mt-1">
                  Commercial spaces and flagship suites currently available for reservation inside {city.domain}.
                </p>
              </div>

              <a
                href={`/enter/${city.slug}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 hover:text-blue-800 transition-colors"
              >
                <span>Reserve Commercial Space</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* AVAILABLE INVENTORY GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* AVAILABLE FLAGSHIP SUITE SLOTS */}
              {Array.from({ length: Math.max(1, 4 - activeFlagships.length) }).map((_, idx) => (
                <a
                  key={`available-suite-${idx}`}
                  href={`/enter/${city.slug}`}
                  className="group relative bg-slate-50/50 border border-dashed border-slate-300 p-6 md:p-8 flex flex-col justify-between min-h-[170px] rounded-2xl transition-all hover:border-blue-400 hover:bg-blue-50/10 text-left space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        Available Suite #{idx + 1}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 uppercase">
                        Flagship Tier
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                      + Available Flagship Suite
                    </h3>
                    <p className="text-xs text-slate-500 font-light leading-relaxed">
                      Anchor corporate presence with custom digital frontage and direct inquiry routing in {city.domain}.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-blue-600 group-hover:text-blue-800 transition-colors">
                    <span>Reserve Flagship Suite</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </a>
              ))}

              {/* AVAILABLE COMMERCIAL PRESENCE OPPORTUNITY */}
              <a
                href={`/enter/${city.slug}`}
                className="group border border-dashed border-slate-300 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/10 rounded-2xl p-6 md:p-8 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50/60 border border-dashed border-blue-300 text-blue-700 font-bold flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-900 transition-colors leading-snug">
                          Available Company Presence
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{activeRegionEdition.name}</span>
                        </div>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shrink-0">
                      Available
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-light leading-relaxed">
                    Establish your company's commercial presence inside {city.domain}. Connect your AI-Native Company to verified global maritime operators.
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10.5px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded font-medium">
                      Verified Standard
                    </span>
                    <span className="text-[10.5px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded font-medium">
                      AI Twin Integration
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-blue-600 group-hover:text-blue-800 transition-colors">
                  <span>Reserve Presence</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </a>
            </div>
          </div>

          {/* INDUSTRY INTELLIGENCE */}
          <div className="space-y-6 pt-8 border-t border-slate-200">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 uppercase tracking-tight">
                INDUSTRY INTELLIGENCE
              </h2>
              <p className="text-sm text-slate-500 font-light mt-1">
                Domain briefing and operational framework for {city.domain} within the {activeRegionEdition.name} jurisdiction
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                  <Globe className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-900">
                  MARKET LANDSCAPE
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-light">
                  High-value commercial transactions, global fleet operations, and verified service providers operating within the {city.domain} ecosystem across {activeRegionEdition.name}.
                </p>
              </div>

              <div className="p-6 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-900">
                  OPERATIONAL CONTEXT
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-light">
                  Governed digital operating environments providing canonical corporate identity, verified capability matrices, and direct commercial routing for {parentDomainName} stakeholders.
                </p>
              </div>

              <div className="p-6 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                  <Briefcase className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-900">
                  CAPABILITIES
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-light">
                  Direct access to verified technical specifications, classification records, refit/maintenance logs, charter availability, and procurement channels.
                </p>
              </div>

              <div className="p-6 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-900">
                  STANDARDS & COMPLIANCE
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-light">
                  Verified registry standards, IMO/ISO admiralty alignment, corporate authorization badges, and secure transaction frameworks enforced across MarineWorld.City.
                </p>
              </div>
            </div>
          </div>

          {/* VERIFIED ECOSYSTEM / ENTER SECTOR CITY */}
          <div className="p-8 md:p-12 bg-slate-50/80 border border-slate-200/80 rounded-3xl space-y-6 text-center max-w-4xl mx-auto shadow-2xs">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 px-4 py-1.5 rounded-full text-xs font-mono uppercase tracking-widest text-blue-700">
              <Award className="w-3.5 h-3.5" />
              <span>Verified Commercial Ecosystem</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-slate-900">
              Enter {city.domain}
            </h2>

            <p className="text-slate-600 font-light text-base max-w-2xl mx-auto leading-relaxed">
              Join the verified companies establishing AI-Native commercial presence inside {city.domain}. Access canonical capability profiles and established digital operating environments.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={`/enter/${city.slug}`}
                className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-2 shadow-xs"
              >
                <span>Establish Company Presence</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <a
                href="#active-presence"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("active-presence")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-100 text-slate-900 border border-slate-200 rounded-full text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-2 shadow-2xs"
              >
                <span>Explore Company Presence</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </a>
            </div>
          </div>

        </section>
      </main>

      <GlobalFooter config={config} />

      {/* AI ADVISOR WIDGET */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isAdvisorOpen ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-[320px] sm:w-[380px] h-[480px] flex flex-col overflow-hidden mb-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <Compass className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">{city.domain} Advisor</h3>
                  <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                    Sector City Guide
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAdvisorOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 bg-slate-50 p-4 overflow-y-auto space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Compass className="w-3.5 h-3.5 text-blue-700" />
                </div>
                <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-sm text-slate-700 shadow-2xs">
                  <p>Welcome to {city.domain}. I'm your dedicated city advisor.</p>
                  <p className="mt-2">
                    Are you looking for a specific verified enterprise, or would
                    you like to explore establishing your company's commercial presence here?
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-white border-t border-slate-200">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ask a question..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-full pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-900 transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdvisorOpen(true)}
            className="group flex items-center gap-3 bg-slate-900 text-white rounded-full p-4 pr-5 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
              <MessageSquare className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold tracking-wide">
              Ask the city advisor
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
