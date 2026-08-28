import { useState, useMemo, useEffect } from "react";
import type { SectorConfig, CompanyProfile, SectorCity } from "@/lib/types";
import { SectorCityTopChrome } from "@/components/foundation/SectorCityTopChrome";
import { GlobalFooter } from "@/components/foundation/GlobalFooter";
import { PageMetadata } from "@/components/foundation/PageMetadata";
import { CompanyDiscoveryModal } from "@/components/company/CompanyDiscoveryModal";
import { SectorCityAdvisorDrawer } from "@/components/sector/SectorCityAdvisorDrawer";
import {
  getCityBySlug,
  getIndustryDomainById,
  getCompanyById,
  getCompanyBySlug,
  getCompaniesInCity,
  formatCompactLocation,
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
  getAllCommercialInventory,
} from "@/lib/services/commercialPropertyService";
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
  Cpu,
  Play,
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
  const [city, setCity] = useState<SectorCity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [liveCompanies, setLiveCompanies] = useState<any[]>([]);

  useEffect(() => {
    setIsLoading(true);
    getSectorCityById(citySlug)
      .then((c) => {
        setCity(c || null);
      })
      .catch((err) => {
        console.warn("[SectorCityEntranceV2] Error loading city:", err);
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

  const parentDomain = city ? getIndustryDomainById(city.industryDomainId) : undefined;
  const parentDomainName = parentDomain?.name ?? city?.category ?? "Sector";

  const availableRegions = CANONICAL_CITY_REGIONS;
  const [selectedRegionSlug, setSelectedRegionSlug] = useState<string>(
    regionSlug || (availableRegions[0]?.slug ?? "global")
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [showCompanyListModal, setShowCompanyListModal] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState("");

  useEffect(() => {
    if (regionSlug) {
      setSelectedRegionSlug(regionSlug);
    } else if (!availableRegions.some((r) => r.slug === selectedRegionSlug)) {
      setSelectedRegionSlug(availableRegions[0]?.slug ?? "global");
    }
  }, [regionSlug, availableRegions, selectedRegionSlug]);

  const activeRegionEdition = useMemo(
    () => resolveRegionEdition(city ? city.id : "shipyard", selectedRegionSlug),
    [city, selectedRegionSlug]
  );

  const propertyData = useMemo(() => {
    if (!city) return null;
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
    { label: "Sector Cities", href: "/cities" },
    { label: parentDomainName, href: `/industries/${parentDomain?.slug || "maritime-services"}` },
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

  // Authoritative commercial presence inventory for this Sector City and Region
  const commercialPresenceInventory = useMemo(() => {
    return getAllCommercialInventory({
      cityId: city.id,
      regionCode: activeRegionEdition.regionCode,
      tier: "PRESENCE",
    });
  }, [city.id, activeRegionEdition.regionCode]);

  // Active/Occupied commercial company placements based on real commercial property data
  const occupiedPresenceSlots = useMemo(() => {
    return commercialPresenceInventory
      .filter(
        (p) =>
          p.tenantCompanyId &&
          (p.commercialStatus === "ACTIVE" || p.availabilityStatus === "RESERVED")
      )
      .map((p) => {
        const comp =
          getCompanyById(config, p.tenantCompanyId!) ||
          getCompanyBySlug(config, p.tenantCompanyId!);
        return {
          property: p,
          company: comp,
          companyName:
            comp?.displayName ||
            comp?.legalName ||
            comp?.name ||
            p.tenantCompanyName ||
            "Verified Tenant",
          location: comp
            ? formatCompactLocation(comp.country, comp.city)
            : "Global",
          description:
            (comp as any)?.tagline || comp?.description || p.frontageDescription,
          capabilities: comp?.capabilities || p.features || [],
          companyId: comp?.slug || comp?.id || p.tenantCompanyId,
          logo: comp?.coverImage,
        };
      })
      .filter((slot) =>
        passesSearch(slot.companyName, slot.location, slot.company?.industry || "")
      );
  }, [commercialPresenceInventory, config, passesSearch]);

  const totalPresenceSlots = Math.max(6, commercialPresenceInventory.length || 6);
  const availablePresenceCount = Math.max(
    0,
    totalPresenceSlots - occupiedPresenceSlots.length
  );

  // Active company IDs for this Sector City
  const activeCompanyIds = useMemo(() => {
    const ids = new Set<string>();
    occupiedPresenceSlots.forEach((s) => {
      if (s.companyId) ids.add(s.companyId.toLowerCase());
      if (s.company?.id) ids.add(s.company.id.toLowerCase());
      if (s.company?.slug) ids.add(s.company.slug.toLowerCase());
    });
    activeFlagships.forEach((f) => {
      if ((f as any).companyId) ids.add((f as any).companyId.toLowerCase());
      if ((f as any).tenantCompanyId) ids.add((f as any).tenantCompanyId.toLowerCase());
    });
    if ((landmark as any)?.tenantCompanyId) {
      ids.add((landmark as any).tenantCompanyId.toLowerCase());
    }
    if ((landmark as any)?.companyId) {
      ids.add((landmark as any).companyId.toLowerCase());
    }
    return ids;
  }, [occupiedPresenceSlots, activeFlagships, landmark]);

  // Organic AI-Native Company Network: real sector companies belonging to this Sector City
  const organicCityCompanies = useMemo(() => {
    return allCityCompanies.filter((c) =>
      passesSearch(
        c.displayName || c.legalName || c.name || "",
        formatCompactLocation(c.country, c.city),
        c.industry || ""
      )
    );
  }, [allCityCompanies, passesSearch]);

  const modalFilteredCompanies = useMemo(() => {
    if (!modalSearchQuery.trim()) return allCityCompanies;
    const q = modalSearchQuery.toLowerCase();
    return allCityCompanies.filter((c) => {
      const name = (c.displayName || c.legalName || c.name || "").toLowerCase();
      const loc = formatCompactLocation(c.country, c.city).toLowerCase();
      const ind = (c.industry || "").toLowerCase();
      const desc = ((c as any).tagline || c.description || "").toLowerCase();
      const caps = (c.capabilities || []).join(" ").toLowerCase();
      return (
        name.includes(q) ||
        loc.includes(q) ||
        ind.includes(q) ||
        desc.includes(q) ||
        caps.includes(q)
      );
    });
  }, [allCityCompanies, modalSearchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center font-sans">
        <Globe className="w-10 h-10 text-royal animate-pulse mb-3" />
        <h2 className="text-lg font-bold text-graphite">Sektör Şehri Yükleniyor...</h2>
        <p className="text-xs text-stone mt-1">Dijital düğüm verileri Firestore üzerinden doğrulanıyor.</p>
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
          Talep edilen &apos;{citySlug}&apos; sektör şehri henüz aktif edilmemiş veya veritabanında kayıtlı değil.
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
            
            {/* CANONICAL HIERARCHY */}
            <div className="inline-flex items-center justify-center flex-wrap gap-2 text-xs font-medium uppercase tracking-wider text-slate-500 mb-2 bg-slate-50/80 px-4 py-2 rounded-full border border-slate-200/60">
              <span className="text-slate-700 font-semibold">
                {city.category}
              </span>
              <span className="text-slate-300 font-light">→</span>
              <span className="text-royal font-extrabold bg-royal/5 px-2.5 py-0.5 rounded border border-royal/20 tracking-widest">
                {city.domain.toUpperCase()}
              </span>
            </div>

            {/* CITY DOMAIN HEADLINE */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight uppercase leading-[1.05] break-words text-balance max-w-full">
              {city.domain}
            </h1>

            {/* POSITIONING STATEMENT */}
            <p className="text-lg sm:text-xl md:text-2xl text-slate-600 font-light max-w-3xl mx-auto leading-relaxed">
              {city.description}
            </p>

          </div>
        </section>

        {/* CITY EDITIONS SELECTOR & SEARCH */}
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 my-8">
          <div className="bg-white/90 p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            
            {/* Header with Title and Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-royal/5 border border-royal/15 flex items-center justify-center text-royal shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-500">
                      City Editions
                    </span>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="w-full sm:w-[300px] shrink-0 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search companies or presence..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 rounded-full text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                />
              </div>
            </div>

            {/* Regional Edition Pill Selector (Refined, compact & elegant) */}
            <div className="pt-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {availableRegions.map((region) => {
                  const isActive = region.slug === selectedRegionSlug;
                  const cleanLabel = region.name.replace(/\s*Edition$/i, "");
                  return (
                    <button
                      key={region.slug}
                      onClick={() => setSelectedRegionSlug(region.slug)}
                      className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-all border ${
                        isActive
                          ? "bg-slate-900 text-white border-slate-900 shadow-2xs font-bold"
                          : "bg-slate-50/80 text-slate-600 border-slate-200/90 hover:bg-white hover:border-slate-300 hover:text-slate-900"
                      }`}
                    >
                      {cleanLabel}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </section>

        {/* THREE-TIER SHOWCASE GALLERY */}
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 space-y-16">
          
          {/* TIER 1: CITY LANDMARK */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-[2px] bg-slate-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-700">
                DIGITAL PROPERTY: FLAGSHIP
              </span>
            </div>

            <div className="w-full">
              {showLandmark ? (
                <div className="relative w-full rounded-3xl overflow-hidden min-h-[440px] sm:min-h-[500px] lg:min-h-[560px] flex flex-col justify-end shadow-xl border border-slate-200/40 group">
                  {/* Full-bleed Scenic Maritime Media Background */}
                  <SafeImage
                    src={
                      landmark.creative.mediaUrl ||
                      landmark.companyLogo ||
                      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=85"
                    }
                    alt={landmark.companyName}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                  />

                  {/* Cinema Gradients for High-Contrast Text Legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-transparent pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-transparent to-transparent pointer-events-none" />

                  {/* Content Box Positioned Bottom-Left */}
                  <div className="relative z-10 p-6 sm:p-10 md:p-14 lg:p-16 max-w-4xl space-y-4 sm:space-y-6">
                    {/* Status Badges */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="bg-white text-slate-950 text-[11px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-md shadow-xs">
                        RESERVED
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-emerald-400 text-[11px] font-bold uppercase tracking-wider bg-emerald-950/50 border border-emerald-500/30 px-3.5 py-1 rounded-md backdrop-blur-md">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>VERIFIED</span>
                      </span>
                      {landmark.companyRegion && (
                        <span className="text-white/80 text-[11px] font-mono uppercase tracking-wider bg-slate-900/60 border border-white/10 px-3 py-1 rounded-md backdrop-blur-md">
                          {landmark.companyRegion}
                        </span>
                      )}
                    </div>

                    {/* Main Title / Company Name */}
                    <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.08]">
                      {landmark.companyName}
                    </h2>

                    {/* Subtitle / Headline Description */}
                    <p className="text-white/90 text-sm sm:text-base md:text-lg font-light leading-relaxed max-w-2xl">
                      {landmark.creative.headline ||
                        landmark.creative.tagline ||
                        `Premier AI-Native anchor enterprise operating inside ${city.domain}.`}
                    </p>

                    {/* Action Buttons Row */}
                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <a
                        href={`/companies/${landmark.companyId}`}
                        className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-royal hover:bg-royal-light text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 shadow-lg shadow-royal/20 hover:shadow-royal/20"
                      >
                        <Play className="w-3.5 h-3.5 fill-white text-white" />
                        <span>LAUNCH WORKSPACE</span>
                      </a>

                      <a
                        href={`/companies/${landmark.companyId}#ai`}
                        className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-slate-900/70 hover:bg-slate-900/95 text-white font-medium text-xs sm:text-sm uppercase tracking-wider border border-white/20 backdrop-blur-md transition-all duration-200 shadow-md"
                      >
                        <Cpu className="w-4 h-4 text-slate-300" />
                        <span>AI ASSISTANT</span>
                      </a>
                    </div>
                  </div>
                </div>
              ) : !searchQuery ? (
                <div className="relative w-full rounded-3xl overflow-hidden min-h-[440px] sm:min-h-[500px] lg:min-h-[560px] flex flex-col justify-end shadow-xl border border-slate-200/40 group">
                  <SafeImage
                    src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=85"
                    alt={`Reserve ${city.domain} Landmark`}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/55 to-transparent pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-transparent to-transparent pointer-events-none" />

                  <div className="relative z-10 p-6 sm:p-10 md:p-14 lg:p-16 max-w-4xl space-y-4 sm:space-y-6">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="bg-royal text-white text-[11px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-md shadow-xs">
                        AVAILABLE
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-white/90 text-[11px] font-mono uppercase tracking-wider bg-slate-900/60 border border-white/20 px-3.5 py-1 rounded-md backdrop-blur-md">
                        TIER 1: FLAGSHIP LANDMARK
                      </span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.08]">
                      Reserve the Landmark Position
                    </h2>

                    <p className="text-white/90 text-sm sm:text-base md:text-lg font-light leading-relaxed max-w-2xl">
                      Establish the primary anchor commercial presence in {city.domain} for
                      the {activeRegionEdition.name} edition. Connect your AI-Native Company to
                      unmatched global maritime visibility.
                    </p>

                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <a
                        href={`/enter/${city.slug}`}
                        className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-royal hover:bg-royal-light text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 shadow-lg shadow-royal/20"
                      >
                        <span>RESERVE LANDMARK PRESENCE →</span>
                      </a>

                      <a
                        href={`/cities/${city.slug}/architecture`}
                        className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-slate-900/70 hover:bg-slate-900/95 text-white font-medium text-xs sm:text-sm uppercase tracking-wider border border-white/20 backdrop-blur-md transition-all duration-200 shadow-md"
                      >
                        <span>INSPECT SPECIFICATIONS</span>
                      </a>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* TIER 2: CITY DISTRICTS */}
          <div id="city-districts" className="space-y-6 pt-8 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-6 h-[2px] bg-slate-400" />
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-700">
                    DIGITAL PROPERTY: DISTRICTS
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 uppercase tracking-tight">
                  CITY DISTRICTS
                </h2>
                <p className="text-sm text-slate-500 font-light mt-1">
                  Geographic and market-specific commercial pavilions inside {city.domain} ({activeRegionEdition.name}).
                </p>
              </div>

              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                {countryPavilions.length} Regional Pavilions
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {countryPavilions.slice(0, 3).map((pavilion) => (
                <div
                  key={pavilion.id}
                  className="group relative bg-white border border-slate-200/90 rounded-3xl overflow-hidden hover:border-slate-400 hover:shadow-xl transition-all duration-300 flex flex-col justify-between shadow-2xs"
                >
                  <div className="aspect-[16/9] overflow-hidden relative bg-slate-950">
                    <SafeImage
                      src={pavilion.heroImage}
                      alt={pavilion.countryName}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                    
                    <div className="absolute top-3 left-3 bg-slate-950/75 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-2 border border-white/20 shadow-xs">
                      <span className="text-sm leading-none">{pavilion.flagEmoji}</span>
                      <span className="tracking-wide uppercase text-[11px] font-semibold">{pavilion.countryName}</span>
                    </div>

                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white/90 text-xs font-mono">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        <span>{pavilion.featuredHub}</span>
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-slate-300 font-bold bg-slate-900 px-2 py-0.5 rounded border border-royal/40/30">
                        District Pavilion
                      </span>
                    </div>
                  </div>

                  <div className="p-6 sm:p-7 space-y-4 flex-1 flex flex-col justify-between bg-white">
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-snug group-hover:text-royal transition-colors">
                        {pavilion.subtitle}
                      </h3>
                      <p className="text-xs text-slate-500 font-light leading-relaxed">
                        Dedicated regional maritime corridor and sovereign enterprise cluster for {pavilion.countryName}.
                      </p>
                    </div>

                    <div className="space-y-4 pt-2 border-t border-slate-100">
                      <div className="flex flex-wrap gap-1.5">
                        {pavilion.capabilities.slice(0, 3).map((cap, i) => (
                          <span
                            key={i}
                            className="text-[11px] bg-slate-50 border border-slate-200/80 text-slate-700 px-2.5 py-1 rounded-md font-medium"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-[10.5px] font-mono text-slate-400 uppercase tracking-wider">
                          Commercial Corridor
                        </span>
                        <a
                          href={pavilion.ctaHref}
                          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-royal group-hover:text-royal-dark transition-colors"
                        >
                          <span>Explore District</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COMMERCIAL LAYER 3: COMPANY PRESENCE */}
          <div id="company-presence" className="space-y-8 pt-8 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-6 h-[2px] bg-slate-400" />
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-700">
                    DIGITAL PROPERTY: COMPANY PRESENCE
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 uppercase tracking-tight">
                  COMPANY PRESENCE
                </h2>
                <p className="text-sm text-slate-500 font-light mt-1">
                  Premium digital company presence for verified businesses operating within {city.domain}.
                </p>
              </div>

              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200/80">
                {occupiedPresenceSlots.length} Active · {availablePresenceCount} Available
              </span>
            </div>

            {/* COMPANY PRESENCE INVENTORY GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* OCCUPIED COMMERCIAL COMPANY PLACEMENTS */}
              {occupiedPresenceSlots.map((slot) => {
                const comp = slot.company;
                const companyName = slot.companyName;
                const location = slot.location;
                const companyId = slot.companyId;

                return (
                  <a
                    key={slot.property.canonicalPropertyKey || slot.property.slotId}
                    href={`/companies/${companyId}`}
                    className="group bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 hover:border-slate-400 hover:shadow-xl transition-all duration-300 flex flex-col justify-between shadow-2xs space-y-4"
                  >
                    <div className="space-y-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-royal bg-royal/5 px-2.5 py-1 rounded-md border border-royal/20 shrink-0">
                          <Building2 className="w-3.5 h-3.5 text-royal" />
                          <span>VERIFIED COMMERCIAL PRESENCE</span>
                        </span>

                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Active</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        {slot.logo ? (
                          <img
                            src={slot.logo}
                            alt={companyName}
                            className="w-11 h-11 rounded-xl object-contain border border-slate-100 bg-slate-50 p-1 shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-royal/5 border border-royal/20 text-royal font-bold flex items-center justify-center shrink-0 text-sm">
                            {companyName.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-royal transition-colors leading-snug">
                            {companyName}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{location}</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 font-light leading-relaxed line-clamp-2">
                        {slot.description || `Specialized maritime supply chain and logistics services.`}
                      </p>

                      {slot.capabilities && slot.capabilities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {slot.capabilities.slice(0, 3).map((cap, i) => (
                            <span
                              key={i}
                              className="text-[11px] bg-slate-50 border border-slate-200/80 text-slate-700 px-2.5 py-1 rounded-md font-medium"
                            >
                              {cap}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10.5px] font-mono uppercase tracking-wider text-slate-400">
                        COMMERCIAL PRESENCE
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-royal group-hover:text-royal-dark transition-colors flex items-center gap-1">
                        <span>EXPLORE COMPANY</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </a>
                );
              })}

              {/* AVAILABLE COMMERCIAL PRESENCE INVENTORY CARDS */}
              <a
                href={`/enter/${city.slug}`}
                className="group relative border border-dashed border-slate-300 bg-slate-50/60 hover:border-royal hover:bg-royal/5/20 rounded-3xl p-6 sm:p-7 transition-all duration-300 flex flex-col justify-between min-h-[230px] space-y-4 shadow-2xs"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-royal bg-royal/5 px-2.5 py-1 rounded-md border border-royal/20 shrink-0">
                      <Building2 className="w-3.5 h-3.5 text-royal" />
                      <span>AVAILABLE COMPANY PRESENCE</span>
                    </span>

                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-royal bg-royal/5 px-2 py-0.5 rounded border border-royal/20 shrink-0">
                      Available
                    </span>
                  </div>

                  <div className="pt-1">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-royal-dark transition-colors leading-snug break-words">
                      Establish your company's commercial presence inside <span className="break-all">{city.domain}</span>
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{activeRegionEdition.name}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 font-light leading-relaxed">
                    Premium company positioning with direct routing to your AI-Native Company profile.
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10.5px] bg-white border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded-md font-medium">
                      Verified Standard
                    </span>
                    <span className="text-[10.5px] bg-white border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded-md font-medium">
                      Direct AI Routing
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200/70 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-royal group-hover:text-royal-dark transition-colors">
                  <span>ESTABLISH COMPANY PRESENCE</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </a>

              <a
                href={`/enter/${city.slug}`}
                className="group relative border border-dashed border-slate-300 bg-slate-50/60 hover:border-royal hover:bg-royal/5/20 rounded-3xl p-6 sm:p-7 transition-all duration-300 flex flex-col justify-between min-h-[230px] space-y-4 shadow-2xs"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-royal bg-royal/5 px-2.5 py-1 rounded-md border border-royal/20 shrink-0">
                      <Globe className="w-3.5 h-3.5 text-royal" />
                      <span>AVAILABLE COMPANY PRESENCE</span>
                    </span>

                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-royal bg-royal/5 px-2 py-0.5 rounded border border-royal/20 shrink-0">
                      {activeRegionEdition.name} Edition
                    </span>
                  </div>

                  <div className="pt-1">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-royal-dark transition-colors leading-snug">
                      Premium Digital Company Space
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>Regional Maritime Hub</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 font-light leading-relaxed">
                    Premium digital company space available with guaranteed visibility and priority sector routing.
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10.5px] bg-white border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded-md font-medium">
                      Commercial Corridor
                    </span>
                    <span className="text-[10.5px] bg-white border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded-md font-medium">
                      Dual Billing Support
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200/70 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-royal group-hover:text-royal-dark transition-colors">
                  <span>RESERVE COMPANY PRESENCE</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </a>
            </div>
          </div>

          {/* AI-NATIVE COMPANY NETWORK (ORGANIC SECTOR ECOSYSTEM) */}
          <div id="ai-native-network" className="pt-8 border-t border-slate-200">
            {searchQuery.trim() ? (
              /* ACTIVE SEARCH RESULTS VIEW */
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-6 h-[2px] bg-royal" />
                      <span className="text-xs font-mono font-bold uppercase tracking-widest text-royal">
                        SEARCH RESULTS · ORGANIC ECOSYSTEM
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 uppercase tracking-tight">
                      AI-NATIVE COMPANY NETWORK
                    </h2>
                    <p className="text-sm text-slate-500 font-light mt-1">
                      Showing verified companies matching{" "}
                      <strong className="text-slate-900 font-semibold">"{searchQuery}"</strong> in {city.domain} ({activeRegionEdition.name}).
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-xs font-mono uppercase tracking-wider text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-colors"
                    >
                      Clear Search
                    </button>
                    <span className="text-xs font-mono uppercase tracking-wider text-royal font-semibold bg-royal/5 px-3 py-1.5 rounded-full border border-royal/20">
                      {organicCityCompanies.length} Matching
                    </span>
                  </div>
                </div>

                {/* SEARCH RESULTS CARDS GRID */}
                {organicCityCompanies.length === 0 ? (
                  <div className="text-center py-12 px-6 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50 space-y-3">
                    <p className="text-sm font-semibold text-slate-700">
                      No AI-Native companies found matching "{searchQuery}" in {city.domain}.
                    </p>
                    <p className="text-xs text-slate-500 font-light max-w-md mx-auto">
                      Try searching with different terms, or view the complete accredited list.
                    </p>
                    <div className="pt-2 flex items-center justify-center gap-3">
                      <button
                        onClick={() => setSearchQuery("")}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold uppercase tracking-wider transition-colors"
                      >
                        Reset Search
                      </button>
                      <button
                        onClick={() => setShowCompanyListModal(true)}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
                      >
                        <List className="w-3.5 h-3.5" />
                        <span>Explore AI-Native Companies ({allCityCompanies.length})</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {organicCityCompanies.map((company) => {
                      const companyName =
                        company.displayName || company.legalName || company.name || "Company";
                      const location = formatCompactLocation(company.country, company.city);
                      const companyId = company.slug || company.id;

                      return (
                        <a
                          key={company.id}
                          href={`/companies/${companyId}`}
                          className="group bg-white border border-royal/20 rounded-3xl p-6 sm:p-7 hover:border-royal hover:shadow-xl transition-all duration-300 flex flex-col justify-between shadow-2xs space-y-4 ring-1 ring-royal/40/10"
                        >
                          <div className="space-y-3.5">
                            <div className="flex items-start justify-between gap-3">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                                AI-NATIVE COMPANY
                              </span>

                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 shrink-0">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Verified</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-3 pt-1">
                              {company.coverImage ? (
                                <img
                                  src={company.coverImage}
                                  alt={companyName}
                                  className="w-10 h-10 rounded-xl object-contain border border-slate-100 bg-slate-50 p-1 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center shrink-0 text-xs">
                                  {companyName.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <h3 className="text-base font-bold text-slate-900 group-hover:text-royal transition-colors leading-snug">
                                  {companyName}
                                </h3>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-0.5">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{location}</span>
                                </div>
                              </div>
                            </div>

                            <p className="text-xs text-slate-600 font-light leading-relaxed line-clamp-2">
                              {(company as any).tagline ||
                                company.description ||
                                `Accredited AI-Native enterprise operating within ${city.domain}.`}
                            </p>

                            {company.capabilities && company.capabilities.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {company.capabilities.slice(0, 3).map((cap, i) => (
                                  <span
                                    key={i}
                                    className="text-[11px] bg-slate-50 border border-slate-200/80 text-slate-700 px-2.5 py-1 rounded-md font-medium"
                                  >
                                    {cap}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10.5px] font-mono uppercase tracking-wider text-slate-400">
                              Sector Ecosystem
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-royal group-hover:text-royal-dark transition-colors flex items-center gap-1">
                              <span>EXPLORE COMPANY</span>
                              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                            </span>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* DEFAULT COMPACT ENTRY PANEL WITH LIST BUTTON */
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xs hover:border-slate-300 transition-all">
                <div className="space-y-3 max-w-2xl">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                      ORGANIC SECTOR ECOSYSTEM
                    </span>
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>{allCityCompanies.length} Verified Companies</span>
                    </span>
                  </div>

                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 uppercase tracking-tight">
                      AI-Native Company Network
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 font-light mt-1 leading-relaxed">
                      Explore the verified AI-Native enterprises and operating twins indexed inside{" "}
                      <strong className="text-slate-800 font-semibold">{city.domain}</strong> ({activeRegionEdition.name}).
                    </p>
                  </div>

                  {/* PREVIEW CHIP STRIP OF VERIFIED COMPANIES */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {allCityCompanies.slice(0, 4).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setShowCompanyListModal(true)}
                        className="inline-flex items-center gap-1.5 text-xs bg-white hover:bg-slate-100 border border-slate-200/90 text-slate-700 px-3 py-1 rounded-full font-medium transition-colors shadow-2xs"
                      >
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>{c.displayName || c.legalName || c.name}</span>
                      </button>
                    ))}
                    {allCityCompanies.length > 4 && (
                      <button
                        onClick={() => setShowCompanyListModal(true)}
                        className="text-xs bg-slate-200/80 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded-full font-mono font-bold transition-colors"
                      >
                        +{allCityCompanies.length - 4} more
                      </button>
                    )}
                  </div>
                </div>

                {/* PRIMARY ACTION BUTTON TO OPEN DISCOVERY MODAL */}
                <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
                  <button
                    id="btn-open-company-network-list"
                    onClick={() => setShowCompanyListModal(true)}
                    className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all inline-flex items-center justify-center gap-2 shadow-xs hover:shadow-md cursor-pointer"
                  >
                    <List className="w-4 h-4" />
                    <span>EXPLORE AI-NATIVE COMPANIES ({allCityCompanies.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <a
                    href="/companies"
                    className="px-4 py-3.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 rounded-2xl text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-1.5 shadow-2xs text-center"
                  >
                    <span>AI-Native Companies</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* INDUSTRY INTELLIGENCE */}
          <div className="space-y-6 pt-8 border-t border-slate-200">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-6 h-[2px] bg-slate-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-700">
                  SECTOR OPERATIONAL FRAMEWORK
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 uppercase tracking-tight">
                INDUSTRY INTELLIGENCE
              </h2>
              <p className="text-sm text-slate-500 font-light mt-1">
                Domain briefing and operational framework for {city.domain} within the {activeRegionEdition.name} jurisdiction.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 bg-slate-50/80 border border-slate-200/80 rounded-3xl space-y-3 shadow-2xs hover:border-slate-300 transition-all">
                <div className="w-9 h-9 rounded-xl bg-royal/10 flex items-center justify-center text-royal">
                  <Globe className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-900">
                  MARKET LANDSCAPE
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-light">
                  High-value commercial transactions, global fleet operations, and verified service providers operating within the {city.domain} ecosystem across {activeRegionEdition.name}.
                </p>
              </div>

              <div className="p-6 bg-slate-50/80 border border-slate-200/80 rounded-3xl space-y-3 shadow-2xs hover:border-slate-300 transition-all">
                <div className="w-9 h-9 rounded-xl bg-royal/10 flex items-center justify-center text-royal">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-900">
                  OPERATIONAL CONTEXT
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-light">
                  Governed digital operating environments providing canonical corporate identity, verified capability matrices, and direct commercial routing for {parentDomainName} stakeholders.
                </p>
              </div>

              <div className="p-6 bg-slate-50/80 border border-slate-200/80 rounded-3xl space-y-3 shadow-2xs hover:border-slate-300 transition-all">
                <div className="w-9 h-9 rounded-xl bg-royal/10 flex items-center justify-center text-royal">
                  <Briefcase className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-900">
                  CAPABILITIES
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-light">
                  Direct access to verified technical specifications, classification records, refit/maintenance logs, charter availability, and procurement channels.
                </p>
              </div>

              <div className="p-6 bg-slate-50/80 border border-slate-200/80 rounded-3xl space-y-3 shadow-2xs hover:border-slate-300 transition-all">
                <div className="w-9 h-9 rounded-xl bg-royal/10 flex items-center justify-center text-royal">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-900">
                  STANDARDS & COMPLIANCE
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-light">
                  Structured registry standards, maritime regulatory alignment, corporate authorization badges, and enterprise verification frameworks supported across MarineWorld.City.
                </p>
              </div>
            </div>
          </div>

          {/* VERIFIED ECOSYSTEM / ENTER SECTOR CITY */}
          <div className="p-8 md:p-12 bg-slate-50/80 border border-slate-200/80 rounded-3xl space-y-6 text-center max-w-4xl mx-auto shadow-2xs">
            <div className="inline-flex items-center gap-2 bg-royal/5 border border-royal/20 px-4 py-1.5 rounded-full text-xs font-mono uppercase tracking-widest text-royal">
              <Award className="w-3.5 h-3.5" />
              <span>Verified Commercial Ecosystem</span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-slate-900 break-words">
              Enter <span className="break-all">{city.domain}</span>
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

              <button
                type="button"
                onClick={() => setShowCompanyListModal(true)}
                className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-100 text-slate-900 border border-slate-200 rounded-full text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
              >
                <List className="w-4 h-4 text-slate-500" />
                <span>Explore AI-Native Companies ({allCityCompanies.length})</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

        </section>
      </main>

      <GlobalFooter config={config} />

      {/* REDESIGNED AI-NATIVE COMPANY DISCOVERY MODAL */}
      <CompanyDiscoveryModal
        isOpen={showCompanyListModal}
        onClose={() => setShowCompanyListModal(false)}
        city={city}
        parentDomainName={parentDomainName}
        activeRegionEdition={activeRegionEdition}
        allCityCompanies={allCityCompanies}
        occupiedCompanyIds={activeCompanyIds}
        config={config}
      />

      {/* GEMINI-STYLE SECTOR CITY ADVISOR DRAWER */}
      <SectorCityAdvisorDrawer
        isOpen={isAdvisorOpen}
        onClose={() => setIsAdvisorOpen(false)}
        city={city}
        parentDomainName={parentDomainName}
        activeRegionEdition={activeRegionEdition}
        allCityCompanies={allCityCompanies}
        config={config}
      />

      {/* FLOATING LAUNCHER BUTTON */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
        <button
          onClick={() => setIsAdvisorOpen(true)}
          className="group flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full p-3.5 pr-5 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all cursor-pointer ring-1 ring-white/20 border border-slate-700"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-royal to-royal-dark flex items-center justify-center text-white shadow-xs">
            <Compass className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold tracking-wide flex items-center gap-1.5">
              <span>{city.domain} Advisor</span>
              <span className="w-2 h-2 rounded-full bg-royal-light animate-pulse" />
            </div>
            <p className="text-[10px] text-slate-300 font-mono">
              {allCityCompanies.length} Verified Firms • Guide
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
