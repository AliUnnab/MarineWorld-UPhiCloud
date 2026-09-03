import { useState } from "react";
import type { CompanyProfile, SectorCity, IndustryDomainEntity, SectorConfig, SectorRegion, PhysicalFacility } from "@/lib/types";
import { EmptyState } from "@/components/foundation/EmptyState";
import { getCityBySlug, getIndustryDomainById } from "@/lib/registry";
import { getPhysicalFacilities, getRegisteredHeadquarters } from "@/lib/services/companyService";
import {
  Building2,
  MapPin,
  Clock,
  ShieldCheck,
  Factory,
  Globe,
  Compass,
  Layers,
  ArrowRight,
  RotateCw,
} from "lucide-react";

/* ------------------------------------------------------------
   LOADING SKELETON
   ------------------------------------------------------------ */
export function CompanyPresenceSkeleton() {
  return (
    <div className="space-y-8 animate-pulse font-sans">
      {/* Header Skeleton */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="h-4 w-32 bg-slate-100 rounded mb-3" />
        <div className="h-7 w-56 bg-slate-100 rounded mb-2" />
        <div className="h-4 w-80 bg-slate-100 rounded" />
      </div>

      {/* Content Skeleton */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 h-64" />
    </div>
  );
}

/* ------------------------------------------------------------
   MAIN COMPANY PRESENCE MODULE
   ------------------------------------------------------------ */
export function CompanyPresenceModule({
  company,
  primaryCity,
  parentDomain,
  config,
  isLoading = false,
  isError = false,
  onRetry,
}: {
  company: CompanyProfile;
  primaryCity?: SectorCity;
  parentDomain?: IndustryDomainEntity;
  config?: SectorConfig;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}) {
  const [retryState, setRetryState] = useState(false);

  if (isLoading) {
    return <CompanyPresenceSkeleton />;
  }

  if (isError || retryState) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 md:p-12 text-center font-sans">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-800 mb-4 border border-amber-200">
          <ShieldCheck className="h-6 w-6 text-amber-600" />
        </div>
        <h3 className="text-lg font-semibold text-graphite">Unable to Load Operational Presence</h3>
        <p className="mt-2 text-sm text-stone max-w-md mx-auto">
          An error occurred while resolving verified network nodes and operational base records for {company.displayName || company.name}.
        </p>
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => {
              setRetryState(false);
              if (onRetry) onRetry();
            }}
            className="inline-flex items-center gap-2 rounded-full bg-royal hover:bg-royal text-white px-5 py-2.5 text-xs font-semibold tracking-wider transition-colors cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>TRY AGAIN</span>
          </button>
        </div>
      </div>
    );
  }

  // Handle case where company profile exists but has no configured presence data
  const hasNoPresenceData =
    !company.city &&
    (!company.cityIds || company.cityIds.length === 0) &&
    (!company.sectorCityIds || company.sectorCityIds.length === 0) &&
    !company.location &&
    !company.country;

  if (hasNoPresenceData) {
    return (
      <EmptyState
        icon="globe"
        title="PRESENCE NOT CONFIGURED"
        description={`This company's public network presence has not yet been configured in the MarineWorld registry.`}
        action={{
          label: "BACK TO COMPANY",
          href: `/companies/${company.slug ?? company.id}`,
        }}
      />
    );
  }

  // Resolve all sector cities associated with this company
  const cityIds = Array.from(
    new Set([
      ...(company.cityIds ?? []),
      ...(company.sectorCityIds ?? []),
      ...(primaryCity ? [primaryCity.id, primaryCity.slug] : []),
      ...(company.city ? [company.city.toLowerCase().replace(/\.city$/, "")] : []),
    ])
  ).filter(Boolean);

  const cityEntities: SectorCity[] = [];
  if (config) {
    cityIds.forEach((cId) => {
      const foundCity = getCityBySlug(config, cId);
      if (foundCity && !cityEntities.some((e) => e.id === foundCity.id)) {
        cityEntities.push(foundCity);
      }
    });
  }

  if (cityEntities.length === 0 && primaryCity) {
    cityEntities.push(primaryCity);
  }

  // Resolve parent domains
  const parentDomains: IndustryDomainEntity[] = [];
  cityEntities.forEach((city) => {
    if (city.industryDomainId) {
      const dom = getIndustryDomainById(city.industryDomainId);
      if (dom && !parentDomains.some((d) => d.id === dom.id)) {
        parentDomains.push(dom);
      }
    }
  });

  if (parentDomains.length === 0 && parentDomain) {
    parentDomains.push(parentDomain);
  }

  // Resolve physical operating facilities
  const physicalFacilities: PhysicalFacility[] =
    company.physicalFacilities && company.physicalFacilities.length > 0
      ? company.physicalFacilities
      : getPhysicalFacilities(company.id);

  const registeredHQ =
    company.registeredHeadquarters ||
    getRegisteredHeadquarters(company.id) ||
    physicalFacilities.find((f) => f.isHeadquarters) ||
    physicalFacilities[0];

  const additionalPublicFacilities = physicalFacilities.filter(
    (f) => !f.isHeadquarters && f.id !== registeredHQ?.id && f.visibility !== "INTERNAL"
  );

  // Region context
  const matchingRegion: SectorRegion | undefined = config?.regions?.items?.find(
    (r) =>
      Boolean(company.region && r?.name) &&
      (String(r.name).toLowerCase().includes(String(company.region).toLowerCase()) ||
        String(company.region).toLowerCase().includes(String(r.name).toLowerCase()))
  );

  const primarySectorCityName = primaryCity?.domain || cityEntities[0]?.domain || company.city || "Engineering.City";
  const primaryDomainName = parentDomain?.name || parentDomains[0]?.name || company.industry || "Maritime Industry";
  const headquartersCity = company.headquartersCity || registeredHQ?.city || company.city || "Rotterdam";
  const countryName = company.country || registeredHQ?.country || "Netherlands";
  const regionName = matchingRegion?.name || company.region || "Western Europe";

  return (
    <div className="space-y-8 sm:space-y-10 animate-in fade-in duration-300 font-sans">
      
      {/* ========================================================================= */}
      {/* 01 — OPERATIONAL PRESENCE OVERVIEW & INSTITUTIONAL SUMMARY STRIP          */}
      {/* Human-readable presentation replacing oversized spec-sheet boxes          */}
      {/* ========================================================================= */}
      <section aria-label="Operational Presence Overview" className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="h-0.5 w-full bg-royal" />

        <div className="p-6 sm:p-7 lg:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold text-royal uppercase tracking-wider block">
                OPERATIONAL FOOTPRINT & PARTICIPATION
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold text-graphite tracking-tight mt-0.5">
                Presence & Network Scope
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Active Operating Presence</span>
              </span>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
            Physical headquarters, operating facilities, and mapped sector city participation across the MarineWorld maritime trade network.
          </p>
        </div>

        {/* Institutional Summary Strip — Compact label-value pairs */}
        <div className="border-t border-slate-100 bg-slate-50/75 px-6 sm:px-8 py-3.5 sm:py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 text-xs">
            <div>
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 block">
                Headquarters Base
              </span>
              <span className="text-slate-800 font-medium mt-0.5 block truncate">
                {headquartersCity}, {countryName}
              </span>
            </div>

            <div>
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 block">
                Regional Corridor
              </span>
              <span className="text-slate-800 font-medium mt-0.5 block truncate">
                {regionName}
              </span>
            </div>

            <div>
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 block">
                Primary Sector City
              </span>
              <span className="text-royal font-semibold mt-0.5 block truncate">
                {primarySectorCityName}
              </span>
            </div>

            <div>
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 block">
                Physical Facilities
              </span>
              <span className="text-slate-800 font-medium mt-0.5 block">
                {physicalFacilities.length > 0
                  ? `${physicalFacilities.length} Operating Asset${physicalFacilities.length > 1 ? "s" : ""}`
                  : "1 Registered HQ"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 02 — REGISTERED HEADQUARTERS (CANONICAL PHYSICAL BASE)                    */}
      {/* Complete unique data: Address, hours, scope, and verified facility photos */}
      {/* ========================================================================= */}
      {registeredHQ && (
        <section aria-label="Registered Headquarters" className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-royal/10 border border-royal/20 flex items-center justify-center text-royal shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-royal uppercase tracking-wider">
                  Physical Anchor
                </span>
                <h3 className="text-lg sm:text-xl font-semibold text-graphite tracking-tight mt-0.5">
                  Registered Headquarters
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Verified Facility</span>
              </span>
            </div>
          </div>

          {(() => {
            const hasHQMedia = Boolean(registeredHQ.media && registeredHQ.media.length > 0);
            return (
              <div className={`grid grid-cols-1 ${hasHQMedia ? "lg:grid-cols-3" : "grid-cols-1"} gap-6`}>
                <div className={`${hasHQMedia ? "lg:col-span-2" : "col-span-1"} space-y-4`}>
                  <div>
                    <span className="text-xs font-semibold text-royal uppercase tracking-wider">
                      {registeredHQ.facilityType || "Corporate Headquarters"}
                    </span>
                    <h4 className="text-lg font-semibold text-graphite mt-0.5">
                      {registeredHQ.facilityName}
                    </h4>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                      {registeredHQ.description || "Primary corporate headquarters, central administrative offices, and maritime operating base."}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-royal shrink-0" />
                        <span>Physical Address</span>
                      </div>
                      <div className="font-medium text-graphite pt-0.5">{registeredHQ.address || "Havenlaan 100"}</div>
                      <div className="text-slate-500">{registeredHQ.city || headquartersCity}, {registeredHQ.country || countryName}</div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-royal shrink-0" />
                        <span>Operating Hours</span>
                      </div>
                      <div className="font-medium text-graphite pt-0.5">{registeredHQ.openingHours || "Mon – Fri: 08:30 – 17:30"}</div>
                      <div className="text-emerald-700 font-medium">{registeredHQ.status || "Operational"}</div>
                    </div>
                  </div>

                  {registeredHQ.operationalScope && (
                    <div className="p-4 rounded-xl bg-royal/5 border border-royal/10 space-y-1">
                      <span className="text-[11px] font-semibold text-royal uppercase tracking-wider block">
                        Operational Scope & Capabilities
                      </span>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pt-0.5">
                        {registeredHQ.operationalScope}
                      </p>
                    </div>
                  )}
                </div>

                {/* Headquarters Photo Gallery */}
                {hasHQMedia && registeredHQ.media && (() => {
                  const hqCover = registeredHQ.media.find((m) => m.isCover) || registeredHQ.media[0];
                  const hqCoverUrl = hqCover.url || hqCover.image;

                  return (
                    <div className="rounded-xl overflow-hidden aspect-video lg:aspect-auto border border-slate-200 relative group bg-slate-100 flex flex-col justify-end">
                      <img
                        src={hqCoverUrl}
                        alt={hqCover.title || registeredHQ.facilityName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex flex-col justify-end p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-semibold text-white uppercase tracking-wider bg-royal px-2 py-0.5 rounded">
                            {hqCover.category || "Headquarters"}
                          </span>
                          {registeredHQ.media.length > 1 && (
                            <span className="text-[10px] text-white/90 bg-black/60 px-2 py-0.5 rounded">
                              +{registeredHQ.media.length - 1} photos
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-white truncate">
                          {hqCover.title || registeredHQ.facilityName}
                        </p>
                        {hqCover.caption && (
                          <p className="text-[11px] text-white/80 truncate">
                            {hqCover.caption}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </section>
      )}

      {/* ========================================================================= */}
      {/* 03 — ADDITIONAL PHYSICAL OPERATING FACILITIES (IF CONFIGURED)             */}
      {/* Secondary facilities such as specialized yards, hubs, or engineering labs */}
      {/* ========================================================================= */}
      {additionalPublicFacilities.length > 0 && (
        <section aria-label="Additional Operating Facilities" className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <Factory className="w-5 h-5 text-royal" />
              <h3 className="text-lg sm:text-xl font-semibold text-graphite tracking-tight">
                Additional Operating Facilities
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {additionalPublicFacilities.length} Operating Facility{additionalPublicFacilities.length > 1 ? "ies" : ""}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {additionalPublicFacilities.map((facility) => {
              const facCover = facility.media?.find((m) => m.isCover) || facility.media?.[0];
              const facCoverUrl = facCover?.url || facCover?.image;

              return (
                <div
                  key={facility.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-3.5 hover:border-slate-300 transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {facCoverUrl && (
                      <div className="aspect-[21/9] rounded-lg overflow-hidden border border-slate-200 bg-slate-900 relative group">
                        <img
                          src={facCoverUrl}
                          alt={facCover?.title || facility.facilityName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-between p-2.5">
                          <span className="text-[10px] text-white font-medium bg-black/60 px-2 py-0.5 rounded">
                            {facCover?.category || facility.facilityType}
                          </span>
                          {facility.media && facility.media.length > 1 && (
                            <span className="text-[10px] text-white/90 bg-black/70 px-2 py-0.5 rounded">
                              {facility.media.length} photos
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 pb-3">
                      <div>
                        <span className="text-[11px] font-semibold text-royal uppercase tracking-wider block">
                          {facility.facilityType}
                        </span>
                        <h4 className="text-base font-semibold text-graphite mt-0.5">{facility.facilityName}</h4>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white border border-slate-200 text-slate-700 shrink-0">
                        {facility.status}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {facility.operationalScope || facility.description || "Operational maritime facility within the verified network."}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1 font-medium text-slate-800">
                        <MapPin className="w-3.5 h-3.5 text-royal shrink-0" />
                        <span>{facility.city}, {facility.country}</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {facility.visibility === "PUBLIC" ? "Public Facility" : "Network Node"}
                      </span>
                    </div>
                    {facility.address && (
                      <p className="text-[11.5px] text-slate-500 truncate pl-4.5">
                        {facility.address}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 04 — SECTOR CITY NETWORK PARTICIPATION (SINGLE CLEAN INSTANCE)            */}
      {/* Explains participating sector cities and domain mapping without duplicate */}
      {/* ========================================================================= */}
      <section aria-label="Sector City Network Participation" className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-royal" />
            <div>
              <span className="text-[11px] font-semibold text-royal uppercase tracking-wider block">
                Digital Network Mapping
              </span>
              <h3 className="text-lg sm:text-xl font-semibold text-graphite tracking-tight mt-0.5">
                Sector City Participation
              </h3>
            </div>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            {cityEntities.length} Participating Sector City{cityEntities.length > 1 ? "ies" : ""}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {cityEntities.map((city, idx) => {
            const isPrimary = primaryCity?.id === city.id || idx === 0;
            const dom = getIndustryDomainById(city.industryDomainId) || parentDomain;

            return (
              <div
                key={city.id + idx}
                className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4 hover:border-slate-300 transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[11px] font-semibold text-royal uppercase tracking-wider block">
                        {isPrimary ? "Primary Sector City" : "Participating Sector City"}
                      </span>
                      <h4 className="text-base sm:text-lg font-semibold text-graphite mt-0.5">
                        {city.domain}
                      </h4>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                      isPrimary ? "bg-royal/10 text-royal border border-royal/20" : "bg-slate-100 text-slate-700"
                    }`}>
                      {isPrimary ? "Primary Base" : "Active Node"}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {city.shortDescription || city.description || `Mapped sector city corridor for ${city.domain} commercial operations.`}
                  </p>

                  <div className="space-y-1.5 text-xs border-t border-slate-100 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Industry Domain</span>
                      <span className="font-medium text-slate-800">{dom?.name ?? primaryDomainName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Maritime Category</span>
                      <span className="text-slate-700">{city.category || "Maritime Operations & Services"}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <a
                    href={`/cities/${city.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-royal hover:text-royal transition-colors"
                  >
                    <span>Explore {city.domain}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Regional Trade Corridor & Focus Cities Context (Unique Regional Data) */}
        {matchingRegion && (
          <div className="border-t border-slate-100 pt-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-royal shrink-0" />
                <span className="text-xs font-semibold text-slate-800">
                  {matchingRegion.name} Regional Trade Corridor
                </span>
              </div>
              <span className="text-[11.5px] text-slate-500">
                Connected Marine Trade Network
              </span>
            </div>

            {matchingRegion.description && (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {matchingRegion.description}
              </p>
            )}

            {matchingRegion.focus && matchingRegion.focus.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Regional Focus Cities:
                </span>
                {matchingRegion.focus.map((fCity) => (
                  <span
                    key={fCity}
                    className="inline-flex items-center rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200/80 px-3 py-0.5 text-xs font-medium text-slate-700 transition-colors"
                  >
                    {fCity}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

    </div>
  );
}

