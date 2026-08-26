import { useState } from "react";
import type { CompanyProfile, SectorCity, IndustryDomainEntity, SectorConfig } from "@/lib/types";
import { Icon } from "@/components/digione/icons";
import { DigiBadge, DigiButton } from "@/components/digione/primitives";
import { getCompanyBySlug } from "@/lib/registry";
import { resolveMarineWorldCompanyDigitalId } from "@/lib/services/companyIdentityService";

/* ------------------------------------------------------------
   LOADING SKELETON
   ------------------------------------------------------------ */
export function CompanyCorporateSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-card-lg border border-line bg-white p-8 space-y-6">
          <div className="h-20 bg-mist rounded" />
          <div className="h-32 bg-mist rounded" />
          <div className="h-48 bg-mist rounded" />
        </div>
        <div className="rounded-card-lg border border-line bg-white p-6 h-80 bg-mist/50" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   MAIN COMPANY CORPORATE MODULE (CONSOLIDATED CORPORATE ID CARD)
   ------------------------------------------------------------ */
export function CompanyCorporateModule({
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
    return <CompanyCorporateSkeleton />;
  }

  if (isError || retryState) {
    return (
      <div className="rounded-card-lg border border-line bg-white p-8 md:p-12 text-center shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-800 mb-4 border border-amber-200">
          <Icon name="shield" className="h-6 w-6" />
        </div>
        <h3 className="text-h3 text-graphite">CORPORATE DATA UNAVAILABLE</h3>
        <p className="mt-2 text-[14px] text-stone max-w-md mx-auto">
          Unable to resolve corporate registry data and identity records for {company.name}.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <DigiButton
            onClick={() => {
              setRetryState(false);
              if (onRetry) onRetry();
            }}
            icon="exchange"
          >
            TRY AGAIN
          </DigiButton>
        </div>
      </div>
    );
  }

  // Resolve Parent Company & Subsidiary Companies if configured
  const parentCompany = company.parentCompanyId && config
    ? getCompanyBySlug(config, company.parentCompanyId)
    : undefined;

  const subsidiaries = (company.subsidiaryCompanyIds || [])
    .map((sId) => (config ? getCompanyBySlug(config, sId) : undefined))
    .filter((c): c is CompanyProfile => Boolean(c));

  const hasCorporateStructure =
    Boolean(parentCompany) ||
    subsidiaries.length > 0 ||
    Boolean(company.businessUnits && company.businessUnits.length > 0);

  const operatingStatus = company.operatingStatus || company.status || "ACTIVE";
  const displayName = company.displayName || company.name;
  const legalName = company.legalName?.trim();
  const hasDifferentLegalName = Boolean(legalName && legalName !== displayName.trim());
  const companyType = company.companyType || "Private Registered Entity";
  const cityDomain = primaryCity?.domain ?? (company.city ? `${company.city.toUpperCase()}.CITY` : "SECTOR.CITY");

  const digitalIdInfo = resolveMarineWorldCompanyDigitalId({
    companyIdOrSlug: company.id,
    mwCompanyDigitalId: company.mwCompanyDigitalId,
    businessId: company.businessId,
    companyId6Digit: company.companyId6Digit,
    primaryRegistryCode: company.primaryRegistryCode,
    primarySectorCityId: company.sectorCityIds?.[0] || company.cityIds?.[0] || primaryCity?.id,
  });

  // Single canonical unified Registry ID
  const canonicalRegistryId =
    company.businessId ||
    digitalIdInfo.mwCompanyDigitalId ||
    `MW-BUS-${company.companyId6Digit || "100049"}`;

  const primarySectorCategory =
    company.primarySectorCategory ||
    company.industry ||
    parentDomain?.name ||
    "Marine Logistics & Infrastructure";

  const secondaryCategories = (company.secondarySectorCategories || []).filter(
    (sec) => sec.toLowerCase() !== cityDomain.toLowerCase()
  );
  const sectorCityIds = company.sectorCityIds || company.cityIds || (primaryCity ? [primaryCity.id] : ["supplychain"]);
  const regionalEditions = company.regionalEditions || (company.region ? [company.region] : ["MEDITERRANEAN"]);

  const country = company.country || company.registrationCountry || "Netherlands";
  const headquartersCity = company.headquartersCity || company.city || "Rotterdam";
  
  // Single deduplicated description
  const unifiedDescription =
    company.description ||
    company.corporateDescription ||
    company.shortDescription ||
    `${displayName} operates as a verified enterprise node within the MarineWorld Network.`;

  // Optional legal registration fields check
  const hasOptionalLegalDetails = Boolean(
    company.foundedYear ||
    company.employeeRange ||
    company.registrationAuthority ||
    company.registrationNumber ||
    (company.registrationStatus && company.registrationStatus !== "NOT CONFIGURED")
  );

  // Digital channels check
  const hasDigitalChannels = Boolean(
    company.website ||
    company.officialEmail ||
    company.officialLinkedIn ||
    company.officialPhone
  );

  const isVerified =
    company.verificationStatus === "verified" ||
    (company.verificationStatus as string) === "VERIFIED";

  return (
    <div className="space-y-6">
      {/* 01. UNIFIED TWO-COLUMN GRID: CONSOLIDATED CORPORATE ID CARD + KEY DATA SUMMARY */}
      <div className="grid gap-6 lg:grid-cols-3 items-start">
        
        {/* =========================================================================
            MAIN COLUMN: THE SINGLE CONSOLIDATED CORPORATE ID CARD
            ========================================================================= */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-card-lg border border-line bg-white shadow-xs overflow-hidden">
            
            {/* ---------------------------------------------------------------------
                CARD BANNER / SOVEREIGN CORPORATE ID HEADER
                --------------------------------------------------------------------- */}
            <div className="border-b border-line bg-canvas/40 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
                <div className="flex items-start gap-4">
                  {/* Monogram Badge */}
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-card-md border-2 border-graphite bg-slate-950 text-[20px] font-extrabold font-mono text-white shadow-xs">
                    {company.initials || displayName.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                      <span className="font-bold uppercase tracking-wider text-royal">
                        {companyType}
                      </span>
                      <span className="text-mute">•</span>
                      <span className="text-stone font-semibold">
                        {company.recordType === "DEMONSTRATION" ? "DEMONSTRATION RECORD" : "PUBLIC RECORD"}
                      </span>
                    </div>

                    <h1 className="text-[24px] sm:text-[26px] font-extrabold text-graphite tracking-tight leading-tight">
                      {displayName}
                    </h1>

                    {hasDifferentLegalName && (
                      <p className="font-mono text-[12px] text-stone">
                        Legal Name: <span className="font-semibold text-graphite">{legalName}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Prominent Single Registry ID & Status Badge */}
                <div className="flex flex-col sm:items-end gap-1.5 font-mono text-[11px] shrink-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-line px-3 py-1 font-bold text-graphite shadow-2xs">
                    <span className={`h-2 w-2 rounded-full ${isVerified ? "bg-emerald-500" : "bg-amber-500"}`} />
                    {isVerified ? "VERIFIED REGISTRY RECORD" : "PUBLIC REGISTRY RECORD"}
                  </span>
                  <span className="text-royal font-bold text-[11.5px]">
                    MarineWorld Registry ID: {canonicalRegistryId}
                  </span>
                </div>
              </div>
            </div>

            {/* ---------------------------------------------------------------------
                SECTION 1: ABOUT & CORPORATE PROFILE (Written Once)
                --------------------------------------------------------------------- */}
            <div className="p-6 sm:p-8 border-b border-line/70 space-y-3">
              <h2 className="font-mono text-[10.5px] font-bold text-royal uppercase tracking-[0.14em] flex items-center gap-2">
                <Icon name="doc" className="h-3.5 w-3.5" />
                <span>ABOUT & CORPORATE PROFILE</span>
              </h2>

              <p className="text-[14.5px] text-graphite leading-relaxed">
                {unifiedDescription}
              </p>
            </div>

            {/* ---------------------------------------------------------------------
                SECTION 2: REGISTRY & LEGAL IDENTITY
                --------------------------------------------------------------------- */}
            <div className="p-6 sm:p-8 border-b border-line/70 space-y-4">
              <h2 className="font-mono text-[10.5px] font-bold text-royal uppercase tracking-[0.14em] flex items-center gap-2">
                <Icon name="shield" className="h-3.5 w-3.5" />
                <span>REGISTRY & LEGAL IDENTITY</span>
              </h2>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5 font-mono text-[12px]">
                {hasDifferentLegalName && (
                  <div className="flex justify-between border-b border-line/50 pb-2">
                    <dt className="text-mute">Registered Legal Name</dt>
                    <dd className="font-bold text-graphite text-right">{legalName}</dd>
                  </div>
                )}

                <div className="flex justify-between border-b border-line/50 pb-2">
                  <dt className="text-mute">Jurisdiction / Country</dt>
                  <dd className="font-semibold text-graphite text-right">{country}</dd>
                </div>

                <div className="flex justify-between border-b border-line/50 pb-2">
                  <dt className="text-mute">Entity Structure</dt>
                  <dd className="font-semibold text-graphite text-right">{companyType}</dd>
                </div>

                <div className="flex justify-between border-b border-line/50 pb-2">
                  <dt className="text-mute">Operating Status</dt>
                  <dd className="font-bold text-emerald-600 uppercase text-right flex items-center gap-1.5 justify-end">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>{operatingStatus}</span>
                  </dd>
                </div>

                {/* Render optional legal fields ONLY IF CONFIGURED (no stacked 'NOT CONFIGURED' rows) */}
                {company.foundedYear && (
                  <div className="flex justify-between border-b border-line/50 pb-2">
                    <dt className="text-mute">Founded Year</dt>
                    <dd className="font-semibold text-graphite text-right">{company.foundedYear}</dd>
                  </div>
                )}

                {company.employeeRange && (
                  <div className="flex justify-between border-b border-line/50 pb-2">
                    <dt className="text-mute">Workforce Scale</dt>
                    <dd className="font-semibold text-graphite text-right">{company.employeeRange}</dd>
                  </div>
                )}

                {company.registrationAuthority && (
                  <div className="flex justify-between border-b border-line/50 pb-2">
                    <dt className="text-mute">Registration Authority</dt>
                    <dd className="font-semibold text-graphite text-right">{company.registrationAuthority}</dd>
                  </div>
                )}

                {company.registrationNumber && (
                  <div className="flex justify-between border-b border-line/50 pb-2">
                    <dt className="text-mute">Public Registration No.</dt>
                    <dd className="font-semibold text-royal text-right">{company.registrationNumber}</dd>
                  </div>
                )}
              </dl>

              {!hasOptionalLegalDetails && (
                <p className="text-[11.5px] font-mono text-stone/80 pt-1">
                  Additional legal registration details not yet provided for public index.
                </p>
              )}
            </div>

            {/* ---------------------------------------------------------------------
                SECTION 3: CLASSIFICATION & DOMAIN ALIGNMENT
                --------------------------------------------------------------------- */}
            <div className="p-6 sm:p-8 border-b border-line/70 space-y-4">
              <h2 className="font-mono text-[10.5px] font-bold text-royal uppercase tracking-[0.14em] flex items-center gap-2">
                <Icon name="compass" className="h-3.5 w-3.5" />
                <span>CLASSIFICATION & DOMAIN ALIGNMENT</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-[12px]">
                {/* Primary Sector City - SHOWN ONCE */}
                <div className="rounded-card-sm border border-line bg-canvas p-3.5">
                  <span className="text-[10px] text-mute uppercase tracking-[0.1em] block">PRIMARY SECTOR CITY</span>
                  {primaryCity ? (
                    <a
                      href={`/cities/${primaryCity.slug}`}
                      className="font-bold text-royal hover:underline text-[13px] mt-0.5 flex items-center justify-between"
                    >
                      <span>{primaryCity.domain}</span>
                      <Icon name="arrowRight" className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="font-bold text-graphite text-[13px] mt-0.5 block">{cityDomain}</span>
                  )}
                </div>

                {/* Industry Domain */}
                <div className="rounded-card-sm border border-line bg-canvas p-3.5">
                  <span className="text-[10px] text-mute uppercase tracking-[0.1em] block">INDUSTRY DOMAIN</span>
                  {parentDomain ? (
                    <a
                      href={`/industries/${parentDomain.slug}`}
                      className="font-bold text-royal hover:underline text-[13px] mt-0.5 flex items-center justify-between"
                    >
                      <span>{parentDomain.name.toUpperCase()}</span>
                      <Icon name="arrowRight" className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="font-bold text-graphite text-[13px] mt-0.5 block">{primarySectorCategory.toUpperCase()}</span>
                  )}
                </div>
              </div>

              {/* Secondary Sectors if present */}
              {secondaryCategories.length > 0 && (
                <div className="pt-2">
                  <span className="font-mono text-[10px] text-mute font-bold uppercase tracking-[0.1em] block mb-2">
                    SECONDARY SECTOR CATEGORIES
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {secondaryCategories.map((sec) => (
                      <span key={sec} className="px-2.5 py-1 rounded bg-canvas border border-line text-[11px] font-mono font-medium text-graphite">
                        {sec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Capabilities */}
              {company.capabilities && company.capabilities.length > 0 && (
                <div className="pt-2">
                  <span className="font-mono text-[10px] text-mute font-bold uppercase tracking-[0.1em] block mb-2">
                    CORE CAPABILITIES & SPECIALIZATIONS
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {company.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="rounded bg-royal/5 border border-royal/15 px-2.5 py-1 text-[11.5px] font-mono font-semibold text-royal-dark"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ---------------------------------------------------------------------
                SECTION 4: DIGITAL PRESENCE & CHANNELS
                --------------------------------------------------------------------- */}
            <div className="p-6 sm:p-8 border-b border-line/70 space-y-4">
              <h2 className="font-mono text-[10.5px] font-bold text-royal uppercase tracking-[0.14em] flex items-center gap-2">
                <Icon name="globe" className="h-3.5 w-3.5" />
                <span>DIGITAL PRESENCE</span>
              </h2>

              {hasDigitalChannels ? (
                <div className="grid gap-3 sm:grid-cols-3 font-mono text-[12px]">
                  {company.website && (
                    <div className="rounded-card-sm border border-line bg-canvas p-3.5 flex flex-col justify-between">
                      <span className="text-[10px] text-mute uppercase tracking-[0.1em] block">OFFICIAL WEBSITE</span>
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1.5 font-bold text-royal hover:underline flex items-center justify-between text-[12.5px] truncate"
                      >
                        <span className="truncate">{company.website.replace(/^https?:\/\//, "")}</span>
                        <Icon name="arrowUpRight" className="h-3.5 w-3.5 shrink-0 ml-1" />
                      </a>
                    </div>
                  )}

                  {company.officialEmail && (
                    <div className="rounded-card-sm border border-line bg-canvas p-3.5 flex flex-col justify-between">
                      <span className="text-[10px] text-mute uppercase tracking-[0.1em] block">OFFICIAL EMAIL</span>
                      <a
                        href={`mailto:${company.officialEmail}`}
                        className="mt-1.5 font-bold text-graphite hover:text-royal text-[12.5px] truncate block"
                      >
                        {company.officialEmail}
                      </a>
                    </div>
                  )}

                  {company.officialLinkedIn && (
                    <div className="rounded-card-sm border border-line bg-canvas p-3.5 flex flex-col justify-between">
                      <span className="text-[10px] text-mute uppercase tracking-[0.1em] block">LINKEDIN</span>
                      <a
                        href={company.officialLinkedIn}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1.5 font-bold text-royal hover:underline flex items-center justify-between text-[12.5px] truncate"
                      >
                        <span>Official Profile</span>
                        <Icon name="arrowUpRight" className="h-3.5 w-3.5 shrink-0 ml-1" />
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-card-sm border border-line/80 bg-canvas/60 p-4 flex items-center gap-3 font-mono text-[12px] text-stone">
                  <Icon name="globe" className="h-4 w-4 text-mute shrink-0" />
                  <span>No public digital channels listed yet. Inquiries can be submitted via MarineWorld Connect.</span>
                </div>
              )}
            </div>

            {/* ---------------------------------------------------------------------
                SECTION 5: CORPORATE STRUCTURE
                --------------------------------------------------------------------- */}
            <div className="p-6 sm:p-8 space-y-4">
              <h2 className="font-mono text-[10.5px] font-bold text-royal uppercase tracking-[0.14em] flex items-center gap-2">
                <Icon name="network" className="h-3.5 w-3.5" />
                <span>CORPORATE STRUCTURE</span>
              </h2>

              {hasCorporateStructure ? (
                <div className="space-y-4 font-mono text-[12px]">
                  {/* Parent Company */}
                  {parentCompany && (
                    <div className="rounded-card-md border border-royal/20 bg-royal/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-royal block">PARENT ENTITY</span>
                        <h3 className="text-[15px] font-bold text-graphite mt-0.5">{parentCompany.name}</h3>
                        <p className="text-stone text-[11px]">{parentCompany.industry} · {parentCompany.location}</p>
                      </div>
                      <DigiButton href={`/companies/${parentCompany.slug ?? parentCompany.id}/corporate`} size="sm" icon="arrowRight">
                        View Corporate Record
                      </DigiButton>
                    </div>
                  )}

                  {/* Subsidiaries */}
                  {subsidiaries.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-mute block">
                        SUBSIDIARY COMPANIES ({subsidiaries.length})
                      </span>
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {subsidiaries.map((sub) => (
                          <div key={sub.id} className="rounded-card-sm border border-line bg-canvas p-3.5">
                            <h4 className="font-bold text-graphite text-[13.5px]">{sub.name}</h4>
                            <p className="text-stone text-[11px] mt-0.5">{sub.industry} · {sub.location}</p>
                            <a
                              href={`/companies/${sub.slug ?? sub.id}/corporate`}
                              className="mt-2 inline-flex items-center gap-1 font-semibold text-royal hover:underline text-[11px]"
                            >
                              <span>View Profile</span>
                              <Icon name="arrowRight" className="h-3 w-3" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Business Units */}
                  {company.businessUnits && company.businessUnits.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-mute block">
                        BUSINESS DIVISIONS ({company.businessUnits.length})
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {company.businessUnits.map((unit) => (
                          <span key={unit} className="px-3 py-1.5 rounded-card-sm bg-canvas border border-line text-[11.5px] font-semibold text-graphite">
                            {unit}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-card-sm border border-line/80 bg-canvas/60 p-4 flex items-center gap-3 font-mono text-[12px] text-stone">
                  <Icon name="network" className="h-4 w-4 text-mute shrink-0" />
                  <span>Independent operating entity with no parent or subsidiary entities listed on record.</span>
                </div>
              )}
            </div>

            {/* ---------------------------------------------------------------------
                SECTION 6: CERTIFICATIONS SUMMARY (IF AVAILABLE)
                --------------------------------------------------------------------- */}
            {company.certifications && company.certifications.length > 0 && (
              <div className="p-6 sm:p-8 border-t border-line/70 space-y-4">
                <h2 className="font-mono text-[10.5px] font-bold text-royal uppercase tracking-[0.14em] flex items-center gap-2">
                  <Icon name="shield" className="h-3.5 w-3.5" />
                  <span>VERIFIED ACCREDITATIONS & CERTIFICATES ({company.certifications.length})</span>
                </h2>

                <div className="grid gap-3 sm:grid-cols-2 font-mono text-[12px]">
                  {company.certifications.map((cert, idx) => (
                    <div key={idx} className="rounded-card-sm border border-line bg-canvas p-3.5">
                      <div className="flex items-center justify-between border-b border-line/50 pb-1.5">
                        <span className="font-bold text-royal text-[10.5px] uppercase">{cert.issuer || "VERIFIED ISSUER"}</span>
                        <DigiBadge variant="soft">{cert.status || "VERIFIED"}</DigiBadge>
                      </div>
                      <h4 className="mt-1.5 text-[13px] font-bold text-graphite">{cert.name}</h4>
                      {cert.validity && (
                        <p className="mt-1 text-[10.5px] text-mute">Valid through: {cert.validity}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN: KEY CORPORATE DATA SUMMARY CARD (AT-A-GLANCE FACTS)
            ========================================================================= */}
        <div className="space-y-6">
          <div className="rounded-card-lg border border-line bg-white p-6 shadow-xs flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-graphite">
                  KEY CORPORATE DATA
                </h3>
                <Icon name="briefcase" className="h-4 w-4 text-royal" />
              </div>

              <dl className="mt-4 space-y-3 font-mono text-[12px]">
                <div className="flex justify-between border-b border-line/60 pb-2">
                  <dt className="text-mute">Registry ID</dt>
                  <dd className="font-bold text-royal text-right">{canonicalRegistryId}</dd>
                </div>

                <div className="flex justify-between border-b border-line/60 pb-2">
                  <dt className="text-mute">Verification</dt>
                  <dd className="font-bold text-emerald-600 text-right uppercase">
                    {company.verificationStatus || "VERIFIED"}
                  </dd>
                </div>

                <div className="flex justify-between border-b border-line/60 pb-2">
                  <dt className="text-mute">Headquarters Base</dt>
                  <dd className="font-semibold text-graphite text-right">
                    {company.location || `${headquartersCity}, ${country}`}
                  </dd>
                </div>

                <div className="flex justify-between border-b border-line/60 pb-2">
                  <dt className="text-mute">Primary Sector</dt>
                  <dd className="font-semibold text-royal text-right">
                    {primaryCity?.domain || cityDomain}
                  </dd>
                </div>

                <div className="flex justify-between border-b border-line/60 pb-2">
                  <dt className="text-mute">Sector Cities</dt>
                  <dd className="font-semibold text-graphite text-right">
                    {sectorCityIds.length} Registered
                  </dd>
                </div>

                <div className="flex justify-between border-b border-line/60 pb-2">
                  <dt className="text-mute">Regional Editions</dt>
                  <dd className="font-semibold text-graphite text-right">
                    {regionalEditions.length} Active
                  </dd>
                </div>

                {company.website && (
                  <div className="flex justify-between">
                    <dt className="text-mute">Website</dt>
                    <dd className="font-semibold text-royal text-right truncate max-w-[140px]">
                      <a href={company.website} target="_blank" rel="noreferrer" className="hover:underline">
                        {company.website.replace(/^https?:\/\//, "")}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="rounded-card-sm border border-line bg-canvas p-3 font-mono text-[10.5px] text-stone">
              Canonical corporate records synchronized directly with the MarineWorld Sovereign Network.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
