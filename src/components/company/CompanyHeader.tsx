import React from "react";
import type { CompanyProfile, SectorCity, IndustryDomainEntity } from "@/lib/types";
import { resolveMarineWorldCompanyDigitalId } from "@/lib/services/companyIdentityService";
import { DigiBadge, DigiContainer } from "@/components/digione/primitives";
import {
  Building2,
  CheckCircle2,
  Lock,
  Globe2,
  MapPin,
  Globe,
  Layers,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Compass,
  ArrowUpRight,
  Cpu,
  FileText,
} from "lucide-react";

const SECTOR_CITY_LABELS: Record<string, string> = {
  supplychain: "SUPPLYCHAIN.CITY",
  shipyard: "SHIPYARD.CITY",
  charter: "CHARTER.CITY",
  brokerage: "YACHTSALES.CITY",
  sales: "YACHTSALES.CITY",
  procurement: "PROCUREMENT.CITY",
  marina: "MARINA.CITY",
  marinecommerce: "MARINECOMMERCE.CITY",
};

const REGIONAL_EDITION_LABELS: Record<string, string> = {
  MEDITERRANEAN: "Mediterranean Edition",
  NORTH_EUROPE: "Northern Europe Edition",
  NORTH_AMERICA: "North America Edition",
  CARIBBEAN: "Caribbean Edition",
  MIDDLE_EAST: "Middle East Edition",
  ASIA_PACIFIC: "Asia Pacific Edition",
};

function formatSectorCity(cityId: string): string {
  if (!cityId || typeof cityId !== "string") return "SECTOR.CITY";
  const norm = cityId.toLowerCase();
  return SECTOR_CITY_LABELS[norm] || `${cityId.toUpperCase()}.CITY`;
}

function formatRegionalEdition(edCode: string): string {
  if (!edCode || typeof edCode !== "string") return "Global Edition";
  return REGIONAL_EDITION_LABELS[edCode] || edCode;
}

export function CompanyHeader({
  company,
  primaryCity,
  parentDomain,
  onSelectModule,
}: {
  company: CompanyProfile;
  primaryCity?: SectorCity;
  parentDomain?: IndustryDomainEntity;
  onSelectModule?: (moduleSlug: string) => void;
}) {
  // Resolve immutable MarineWorld Company Digital ID credential
  const digitalIdInfo = resolveMarineWorldCompanyDigitalId({
    companyIdOrSlug: company?.id || "",
    mwCompanyDigitalId: company?.mwCompanyDigitalId,
    businessId: company?.businessId,
    companyId6Digit: company?.companyId6Digit,
    primaryRegistryCode: company?.primaryRegistryCode,
    primarySectorCityId: company?.sectorCityIds?.[0] || company?.cityIds?.[0] || primaryCity?.id,
  });

  const displayName = company?.displayName || company?.name || "Enterprise Company";
  const legalName = company?.legalName || company?.name;
  const isVerified = String(company?.verificationStatus || "VERIFIED").toLowerCase().includes("verified");
  
  const primarySectorCategory =
    company.primarySectorCategory ||
    company.industry ||
    parentDomain?.name ||
    "Marine Logistics & Infrastructure";

  const secondaryCategories = company.secondarySectorCategories || [];
  const sectorCityIds = company.sectorCityIds || company.cityIds || (primaryCity ? [primaryCity.id] : ["supplychain"]);
  const regionalEditions = company.regionalEditions || (company.region ? [company.region] : ["MEDITERRANEAN"]);

  const country = company.country || company.registrationCountry || "Netherlands";
  const headquartersCity = company.headquartersCity || company.city || "Rotterdam";

  const websiteUrl = company.website || "https://marineworld.city";
  const corporateDescription =
    company.corporateDescription ||
    company.description ||
    company.shortDescription ||
    `${displayName} operates as a verified enterprise node within MarineWorld.`;

  const heroMediaImage =
    company.coverImage ||
    (company as any).heroImageUrl ||
    "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1600&q=80";

  return (
    <header className="border-b border-line bg-canvas pt-6 pb-10">
      <DigiContainer>
        <div className="space-y-6">
          {/* 01. TOP CANONICAL METADATA RIBBON */}
          <div className="rounded-2xl border border-line bg-white p-3 md:px-5 font-mono text-[11px] uppercase tracking-[0.12em] text-stone flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-graphite">LIVE NETWORK NODE</span>
              </div>
              <span className="text-mute">|</span>
              <div className="flex items-center gap-1.5 text-royal font-bold">
                <Lock className="w-3.5 h-3.5 text-royal" />
                <span>ID: {digitalIdInfo.mwCompanyDigitalId}</span>
              </div>
              <span className="text-mute hidden sm:inline">|</span>
              <div className="hidden sm:flex items-center gap-1.5 text-slate-700 font-semibold">
                <Globe2 className="w-3.5 h-3.5 text-royal" />
                <span>{digitalIdInfo.primaryRegistryNode}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-stone">
              {websiteUrl && (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-royal transition-colors inline-flex items-center gap-1.5 font-semibold"
                >
                  <Globe className="w-3.5 h-3.5 text-royal" />
                  <span>{websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                  <ExternalLink className="h-3 w-3 text-stone" />
                </a>
              )}
            </div>
          </div>

          {/* 02. MAIN INSTITUTIONAL HERO CONTAINER */}
          <div className="bg-white border border-line rounded-3xl p-6 md:p-8 shadow-sm space-y-8">
            {/* LARGE COMPANY IDENTITY AREA */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-line/80">
              <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                {/* Monogram / Logo Box */}
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-slate-900 bg-slate-950 font-mono text-2xl font-black text-white shadow-md overflow-hidden relative group">
                  {company.logoUrl ? (
                    <img
                      src={company.logoUrl}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{company.initials || displayName.slice(0, 2).toUpperCase()}</span>
                  )}
                  <div className="absolute inset-0 bg-royal/10 pointer-events-none" />
                </div>

                <div className="space-y-2">
                  {/* Verification Status & Immutable ID Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    {isVerified ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-800 shadow-2xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>VERIFIED ENTERPRISE NODE</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-amber-800 shadow-2xs">
                        <ShieldCheck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span>KYB REVIEW PENDING</span>
                      </span>
                    )}

                    {/* Immutable MarineWorld ID Badge */}
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-slate-300 border border-slate-700 px-3 py-1 text-[11px] font-mono font-bold tracking-wider shadow-2xs">
                      <Lock className="h-3 w-3 text-slate-300 shrink-0" />
                      <span>{digitalIdInfo.mwCompanyDigitalId}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-[10.5px] font-mono font-bold text-slate-700">
                      PUBLIC REGISTRY RECORD
                    </span>
                  </div>

                  {/* Display Name */}
                  <h1 className="text-3xl md:text-4xl font-black text-graphite tracking-tight">
                    {displayName}
                  </h1>

                  {/* Legal Registered Name */}
                  <div className="flex items-center gap-2 font-mono text-xs text-stone">
                    <span className="text-slate-400 uppercase tracking-wider font-bold">LEGAL REGISTERED NAME:</span>
                    <span className="font-bold text-graphite">{legalName}</span>
                  </div>
                </div>
              </div>

              {/* ACTION CTAs (Top-Right on desktop) */}
              <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-3 shrink-0 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => onSelectModule?.("connect")}
                  className="px-6 py-3.5 rounded-xl bg-royal text-white hover:bg-royal font-bold text-xs tracking-wider transition-colors flex items-center justify-center gap-2.5 shadow-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>CONNECT / EXPLORE COMPANY</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectModule?.("business-twin")}
                  className="px-5 py-3.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs tracking-wider transition-colors flex items-center justify-center gap-2.5 shadow-sm"
                >
                  <Cpu className="w-4 h-4 text-electric" />
                  <span>COMPANY AI</span>
                </button>
              </div>
            </div>

            {/* CORPORATE POSITIONING HEADLINE & SHORT VALUE PROPOSITION */}
            <div className="space-y-3 max-w-4xl">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-royal uppercase tracking-widest">
                <Compass className="w-4 h-4 text-royal" />
                <span>CORPORATE POSITIONING</span>
              </div>

              <h2 className="text-xl md:text-2xl font-bold text-graphite leading-snug">
                {primarySectorCategory}
              </h2>

              <p className="text-sm md:text-base text-stone leading-relaxed font-normal">
                {corporateDescription}
              </p>
            </div>

            {/* LARGE PROFESSIONAL HERO MEDIA AREA */}
            <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden border border-line shadow-sm group">
              <img
                src={heroMediaImage}
                alt={`${displayName} Hero Media`}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/10" />

              {/* Watermark / Operational Overlay Tags */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white font-mono text-[10px] tracking-widest uppercase">
                <span className="px-3 py-1 rounded-lg bg-slate-950/80 border border-slate-700/80 backdrop-blur-md font-bold text-slate-200">
                  DIGITAL PROPERTY NODE · MARINEWORLD NETWORK
                </span>
                <span className="px-3 py-1 rounded-lg bg-emerald-950/80 border border-emerald-700/80 backdrop-blur-md font-bold text-emerald-400 hidden sm:inline-block">
                  ENCRYPTED INTERACTION READY
                </span>
              </div>

              <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3 text-white">
                <div>
                  <span className="text-[10px] font-mono text-slate-300 font-bold uppercase tracking-widest block">
                    CANONICAL ENTITY CREDENTIAL
                  </span>
                  <div className="text-lg md:text-xl font-mono font-black text-white tracking-wider mt-0.5 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-royal" />
                    <span>{digitalIdInfo.mwCompanyDigitalId}</span>
                  </div>
                </div>

                <div className="text-right hidden sm:block font-mono text-xs text-slate-300">
                  <div className="font-bold text-white">{digitalIdInfo.primaryRegistryNode}</div>
                  <div className="text-[10px] text-slate-400">{headquartersCity}, {country}</div>
                </div>
              </div>
            </div>

            {/* VERIFIED COMPANY METADATA & CONTEXT GRID (DISTINCT FIELDS) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {/* Distinct Card 1: Primary Sector Category */}
              <div className="p-4 bg-slate-50/80 border border-line/80 rounded-xl space-y-1.5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold font-mono text-stone uppercase tracking-wider block">
                    PRIMARY SECTOR CATEGORY
                  </span>
                  <div className="text-xs font-bold text-graphite mt-1">
                    {primarySectorCategory}
                  </div>
                </div>
                {secondaryCategories.length > 0 && (
                  <div className="text-[10.5px] text-stone mt-2 pt-2 border-t border-line/60 truncate">
                    +{secondaryCategories.length} Secondary Domains
                  </div>
                )}
              </div>

              {/* Distinct Card 2: Sector Cities */}
              <div className="p-4 bg-slate-50/80 border border-line/80 rounded-xl space-y-1.5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold font-mono text-stone uppercase tracking-wider block">
                    SECTOR CITIES ({sectorCityIds.length})
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {sectorCityIds.map((cId) => (
                      <span
                        key={cId}
                        className="px-2 py-0.5 rounded bg-white border border-line text-[10.5px] font-mono font-bold text-graphite"
                      >
                        {formatSectorCity(cId)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Distinct Card 3: Regional Editions */}
              <div className="p-4 bg-slate-50/80 border border-line/80 rounded-xl space-y-1.5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold font-mono text-stone uppercase tracking-wider block">
                    REGIONAL EDITIONS ({regionalEditions.length})
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {regionalEditions.map((ed) => (
                      <span
                        key={ed}
                        className="px-2 py-0.5 rounded bg-royal/10 border border-royal/20 text-[10.5px] font-mono font-bold text-royal"
                      >
                        {formatRegionalEdition(ed)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Distinct Card 4: Country & Headquarters City */}
              <div className="p-4 bg-slate-50/80 border border-line/80 rounded-xl space-y-2 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div>
                    <span className="text-[10px] font-bold font-mono text-stone uppercase tracking-wider block">
                      HEADQUARTERS CITY
                    </span>
                    <div className="text-xs font-bold text-graphite flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-royal shrink-0" />
                      <span>{headquartersCity}</span>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-line/60">
                    <span className="text-[10px] font-bold font-mono text-stone uppercase tracking-wider block">
                      COUNTRY
                    </span>
                    <div className="text-xs font-bold text-graphite flex items-center gap-1.5 mt-0.5">
                      <Globe className="w-3.5 h-3.5 text-stone shrink-0" />
                      <span>{country}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DigiContainer>
    </header>
  );
}
