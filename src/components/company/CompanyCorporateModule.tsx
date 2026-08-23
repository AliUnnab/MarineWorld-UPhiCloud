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
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8">
        <div className="h-4 w-36 bg-mist rounded mb-3" />
        <div className="h-8 w-56 bg-mist rounded mb-2" />
        <div className="h-4 w-96 bg-mist rounded" />
      </div>

      {/* Identity & Summary Grid Skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-card-lg border border-line bg-white p-6 h-64" />
        <div className="rounded-card-lg border border-line bg-white p-6 h-64" />
      </div>

      {/* Facts Skeleton */}
      <div className="rounded-card-lg border border-line bg-white p-6 h-48" />
    </div>
  );
}

/* ------------------------------------------------------------
   MAIN COMPANY CORPORATE MODULE
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
      <div className="rounded-card-lg border border-line bg-white p-8 md:p-12 text-center">
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
  const legalName = company.legalName || company.name;
  const tradingName = company.tradingName || company.name;
  const companyType = company.companyType || "Private Registered Entity";
  const cityDomain = primaryCity?.domain ?? company.city;

  const digitalIdInfo = resolveMarineWorldCompanyDigitalId({
    companyIdOrSlug: company.id,
    mwCompanyDigitalId: company.mwCompanyDigitalId,
    businessId: company.businessId,
    companyId6Digit: company.companyId6Digit,
    primaryRegistryCode: company.primaryRegistryCode,
    primarySectorCityId: company.sectorCityIds?.[0] || company.cityIds?.[0] || primaryCity?.id,
  });

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

  return (
    <div className="space-y-8">
      {/* 01. PAGE HEADER */}
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-6">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-royal">
              <Icon name="briefcase" className="h-4 w-4" />
              <span>CANONICAL CORPORATE OVERVIEW</span>
            </div>
            <h1 className="text-h1 mt-1 text-graphite">{displayName}</h1>
            <p className="mt-2 text-[14.5px] font-medium text-stone max-w-2xl">
              Official institutional record and verified company profile on the MarineWorld Network.
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5 font-mono text-[11px] shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas border border-line px-3 py-1 font-bold text-graphite">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              PUBLIC REGISTRY RECORD
            </span>
            <span className="text-royal font-bold">REGISTRY ID: {digitalIdInfo.mwCompanyDigitalId}</span>
          </div>
        </div>
      </div>

      {/* 02. CANONICAL CORPORATE OVERVIEW MATRIX */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Primary Identity Panel */}
        <div className="lg:col-span-2 rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 border-b border-line pb-6">
              {/* Monogram / Logo Avatar */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-card-md border-2 border-graphite bg-slate-950 text-[22px] font-extrabold font-mono text-white shadow-xs">
                {company.initials || displayName.slice(0, 2).toUpperCase()}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 font-mono text-[10.5px]">
                  <span className="font-bold uppercase tracking-[0.12em] text-royal">
                    {companyType}
                  </span>
                  <span className="text-mute">•</span>
                  <span className="text-stone">{company.recordType} RECORD</span>
                </div>

                <h2 className="text-[24px] font-extrabold text-graphite tracking-tight">
                  {displayName}
                </h2>

                <p className="font-mono text-[12px] text-stone">
                  Legal Registered Name: <span className="font-semibold text-graphite">{legalName}</span>
                </p>
              </div>
            </div>

            {/* Corporate Description */}
            <div className="space-y-2">
              <span className="font-mono text-[10px] font-bold text-royal uppercase tracking-widest block">
                CORPORATE DESCRIPTION
              </span>
              <p className="text-[14.5px] text-graphite leading-relaxed">
                {corporateDescription}
              </p>
            </div>

            {/* Sector Categories */}
            <div className="pt-4 border-t border-line/60 grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-[12px]">
              <div>
                <span className="text-[10px] text-mute font-bold uppercase tracking-[0.1em] block">
                  PRIMARY SECTOR CATEGORY
                </span>
                <span className="font-bold text-graphite mt-1 block">
                  {primarySectorCategory}
                </span>
              </div>

              {secondaryCategories.length > 0 && (
                <div>
                  <span className="text-[10px] text-mute font-bold uppercase tracking-[0.1em] block">
                    SECONDARY SECTORS ({secondaryCategories.length})
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {secondaryCategories.map((sec) => (
                      <span key={sec} className="px-2 py-0.5 rounded bg-canvas border border-line text-[10.5px] font-semibold text-graphite">
                        {sec}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Metadata Verification Tag */}
          <div className="pt-4 border-t border-line/60 flex items-center justify-between font-mono text-[10px] text-mute">
            <span>MARINEWORLD DIGITAL ID: {digitalIdInfo.mwCompanyDigitalId}</span>
            <span>VERIFIED PUBLIC RECORD</span>
          </div>
        </div>

        {/* Corporate Summary & Geographic Context Panel */}
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
                <dt className="text-mute">MarineWorld ID</dt>
                <dd className="font-bold text-royal text-right">{digitalIdInfo.mwCompanyDigitalId}</dd>
              </div>

              <div className="flex justify-between border-b border-line/60 pb-2">
                <dt className="text-mute">Verification</dt>
                <dd className="font-bold text-emerald-600 text-right uppercase">
                  {company.verificationStatus || "VERIFIED"}
                </dd>
              </div>

              <div className="flex justify-between border-b border-line/60 pb-2">
                <dt className="text-mute">Headquarters City</dt>
                <dd className="font-semibold text-graphite text-right">{headquartersCity}</dd>
              </div>

              <div className="flex justify-between border-b border-line/60 pb-2">
                <dt className="text-mute">Country</dt>
                <dd className="font-semibold text-graphite text-right">{country}</dd>
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

              <div className="flex justify-between">
                <dt className="text-mute">Website</dt>
                <dd className="font-semibold text-royal text-right truncate max-w-[140px]">
                  {websiteUrl.replace(/^https?:\/\//, "")}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-card-sm border border-line bg-canvas p-3 font-mono text-[10.5px] text-stone">
            Canonical data fields synchronized directly with MarineWorld Registry.
          </div>
        </div>
      </div>

      {/* 03. COMPANY PROFILE / OFFICIAL DESCRIPTION */}
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <Icon name="doc" className="h-4 w-4 text-royal" />
            <h2 className="text-h3 text-graphite">COMPANY PROFILE</h2>
          </div>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
            OFFICIAL DESCRIPTION
          </span>
        </div>

        <div className="mt-6 space-y-4 text-graphite leading-relaxed">
          {company.shortDescription && (
            <p className="text-[16px] font-semibold text-graphite border-l-2 border-royal pl-4 py-0.5">
              {company.shortDescription}
            </p>
          )}

          {company.description ? (
            <p className="text-[14.5px] text-stone">
              {company.description}
            </p>
          ) : !company.shortDescription ? (
            <div className="rounded-card-sm border border-line bg-canvas p-4 font-mono text-[12px] text-stone">
              NO PUBLIC PROFILE DESCRIPTION CONFIGURED FOR THIS ENTITY.
            </div>
          ) : null}
        </div>
      </div>

      {/* 04. CORPORATE FACTS & LEGAL IDENTITY GRID */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Corporate Facts */}
        <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-2">
              <Icon name="layers" className="h-4 w-4 text-royal" />
              <h2 className="text-h3 text-graphite">CORPORATE FACTS</h2>
            </div>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
              FACTSHEET
            </span>
          </div>

          <dl className="mt-6 space-y-3 font-mono text-[12px]">
            <div className="flex justify-between border-b border-line/60 pb-2">
              <dt className="text-mute">Legal Name</dt>
              <dd className="font-semibold text-graphite">{legalName}</dd>
            </div>

            <div className="flex justify-between border-b border-line/60 pb-2">
              <dt className="text-mute">Trading Name</dt>
              <dd className="font-semibold text-graphite">{tradingName}</dd>
            </div>

            <div className="flex justify-between border-b border-line/60 pb-2">
              <dt className="text-mute">Company Type</dt>
              <dd className="font-semibold text-graphite">{companyType}</dd>
            </div>

            <div className="flex justify-between border-b border-line/60 pb-2">
              <dt className="text-mute">Founded</dt>
              <dd className="font-semibold text-graphite">{company.foundedYear ?? "NOT CONFIGURED"}</dd>
            </div>

            <div className="flex justify-between border-b border-line/60 pb-2">
              <dt className="text-mute">Headquarters Country</dt>
              <dd className="font-semibold text-graphite">{company.country ?? "NOT CONFIGURED"}</dd>
            </div>

            <div className="flex justify-between border-b border-line/60 pb-2">
              <dt className="text-mute">Headquarters Base</dt>
              <dd className="font-semibold text-graphite">{company.location ?? "NOT CONFIGURED"}</dd>
            </div>

            <div className="flex justify-between border-b border-line/60 pb-2">
              <dt className="text-mute">Employee Range</dt>
              <dd className="font-semibold text-graphite">{company.employeeRange ?? "NOT CONFIGURED"}</dd>
            </div>

            <div className="flex justify-between">
              <dt className="text-mute">Operating Status</dt>
              <dd className="font-bold text-emerald-600 uppercase">{operatingStatus}</dd>
            </div>
          </dl>
        </div>

        {/* Legal Identity */}
        <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2">
                <Icon name="shield" className="h-4 w-4 text-royal" />
                <h2 className="text-h3 text-graphite">LEGAL IDENTITY</h2>
              </div>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
                REGISTRY RECORD
              </span>
            </div>

            <dl className="mt-6 space-y-3 font-mono text-[12px]">
              <div className="flex justify-between border-b border-line/60 pb-2">
                <dt className="text-mute">Registered Entity</dt>
                <dd className="font-bold text-graphite">{legalName}</dd>
              </div>

              <div className="flex justify-between border-b border-line/60 pb-2">
                <dt className="text-mute">Structure / Type</dt>
                <dd className="font-semibold text-graphite">{companyType}</dd>
              </div>

              <div className="flex justify-between border-b border-line/60 pb-2">
                <dt className="text-mute">Registration Country</dt>
                <dd className="font-semibold text-graphite">
                  {company.registrationCountry || company.country || "NOT CONFIGURED"}
                </dd>
              </div>

              <div className="flex justify-between border-b border-line/60 pb-2">
                <dt className="text-mute">Registration Authority</dt>
                <dd className="font-semibold text-graphite">{company.registrationAuthority ?? "NOT CONFIGURED"}</dd>
              </div>

              <div className="flex justify-between border-b border-line/60 pb-2">
                <dt className="text-mute">Registration Status</dt>
                <dd className="font-semibold text-graphite uppercase">
                  {company.registrationStatus ?? "NOT CONFIGURED"}
                </dd>
              </div>

              <div className="flex justify-between border-b border-line/60 pb-2">
                <dt className="text-mute">Public Reg Number</dt>
                <dd className="font-mono font-bold text-royal">
                  {company.registrationNumber || "NOT CONFIGURED"}
                </dd>
              </div>

              <div className="flex justify-between">
                <dt className="text-mute">MarineWorld 6-Digit ID</dt>
                <dd className="font-mono font-bold text-royal">
                  {company.companyId6Digit || (company.businessId?.match(/\d{6}/)?.[0]) || "100001"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-6 rounded-card-sm border border-line bg-canvas p-3 font-mono text-[10.5px] text-stone">
            Note: Private legal identifiers, tax credentials, and bank information are strictly partitioned and not exposed by default.
          </div>
        </div>
      </div>

      {/* 05. BUSINESS IDENTITY & CLASSIFICATION */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Business Identity */}
        <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-2">
              <Icon name="building" className="h-4 w-4 text-royal" />
              <h2 className="text-h3 text-graphite">BUSINESS IDENTITY</h2>
            </div>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
              COMMERCIAL BRAND
            </span>
          </div>

          <div className="mt-6 space-y-4 font-mono text-[12px]">
            <div className="flex justify-between border-b border-line/60 pb-2">
              <span className="text-mute">Commercial Name</span>
              <span className="font-bold text-graphite">{company.name}</span>
            </div>

            <div className="flex justify-between border-b border-line/60 pb-2">
              <span className="text-mute">Primary Industry</span>
              <span className="font-semibold text-graphite">{company.industry}</span>
            </div>

            <div className="flex justify-between border-b border-line/60 pb-2">
              <span className="text-mute">Primary Sector City</span>
              <span className="font-bold text-royal">{cityDomain}</span>
            </div>

            <div>
              <span className="text-mute block mb-2 font-bold uppercase tracking-[0.1em] text-[10.5px]">
                CORE BUSINESS CAPABILITIES
              </span>
              {company.capabilities && company.capabilities.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {company.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="rounded bg-canvas border border-line px-2.5 py-1 text-[11px] font-semibold text-graphite"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-stone italic">No business capabilities listed.</span>
              )}
            </div>
          </div>
        </div>

        {/* Company Classification */}
        <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-2">
              <Icon name="compass" className="h-4 w-4 text-royal" />
              <h2 className="text-h3 text-graphite">COMPANY CLASSIFICATION</h2>
            </div>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
              PLATFORM HIERARCHY
            </span>
          </div>

          <div className="mt-6 space-y-3 font-mono text-[12px]">
            {/* Category */}
            <div className="rounded-card-sm border border-line bg-canvas p-3.5">
              <span className="text-[10px] text-mute uppercase tracking-[0.1em] block">MARITIME CATEGORY</span>
              <span className="font-bold text-graphite text-[13px] mt-0.5 block">
                {primaryCity?.category ?? "MARITIME SERVICES & OPERATIONS"}
              </span>
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
                <span className="font-bold text-graphite text-[13px] mt-0.5 block">{company.industry.toUpperCase()}</span>
              )}
            </div>

            {/* Sector City */}
            <div className="rounded-card-sm border border-line bg-canvas p-3.5">
              <span className="text-[10px] text-mute uppercase tracking-[0.1em] block">SECTOR CITY</span>
              {primaryCity ? (
                <a
                  href={`/cities/${primaryCity.slug}`}
                  className="font-bold text-royal hover:underline text-[13px] mt-0.5 flex items-center justify-between"
                >
                  <span>{primaryCity.domain}</span>
                  <Icon name="arrowRight" className="h-3.5 w-3.5" />
                </a>
              ) : (
                <span className="font-bold text-graphite text-[13px] mt-0.5 block">{company.city}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 06. CORPORATE STRUCTURE (PARENT / SUBSIDIARIES / BUSINESS UNITS) */}
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <Icon name="network" className="h-4 w-4 text-royal" />
            <h2 className="text-h3 text-graphite">CORPORATE STRUCTURE</h2>
          </div>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
            ORGANIZATIONAL HIERARCHY
          </span>
        </div>

        {hasCorporateStructure ? (
          <div className="mt-6 space-y-6">
            {/* Parent Company */}
            {parentCompany && (
              <div className="rounded-card-md border-2 border-royal/30 bg-soft/30 p-5 font-mono text-[12px]">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-royal block">
                  PARENT COMPANY
                </span>
                <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-[16px] font-bold text-graphite">{parentCompany.name}</h4>
                    <p className="text-stone text-[11px] mt-0.5">{parentCompany.industry} · {parentCompany.location}</p>
                  </div>
                  <DigiButton href={`/companies/${parentCompany.slug ?? parentCompany.id}/corporate`} size="sm" icon="arrowRight">
                    View Parent Corporate Record
                  </DigiButton>
                </div>
              </div>
            )}

            {/* Subsidiaries */}
            {subsidiaries.length > 0 && (
              <div className="space-y-3 font-mono text-[12px]">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-mute block">
                  SUBSIDIARY COMPANIES ({subsidiaries.length})
                </span>
                <div className="grid gap-3 md:grid-cols-2">
                  {subsidiaries.map((sub) => (
                    <div key={sub.id} className="rounded-card-sm border border-line bg-canvas p-4">
                      <h4 className="font-bold text-graphite text-[14px]">{sub.name}</h4>
                      <p className="text-stone text-[11px] mt-0.5">{sub.industry} · {sub.location}</p>
                      <a
                        href={`/companies/${sub.slug ?? sub.id}/corporate`}
                        className="mt-3 inline-flex items-center gap-1 font-semibold text-royal hover:underline text-[11.5px]"
                      >
                        <span>VIEW SUBSIDIARY CORPORATE</span>
                        <Icon name="arrowRight" className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Business Units */}
            {company.businessUnits && company.businessUnits.length > 0 && (
              <div className="space-y-3 font-mono text-[12px]">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-mute block">
                  CONFIGURED BUSINESS UNITS ({company.businessUnits.length})
                </span>
                <div className="grid gap-3 sm:grid-cols-3">
                  {company.businessUnits.map((unit) => (
                    <div key={unit} className="rounded-card-sm border border-line bg-canvas p-3.5">
                      <span className="text-[10px] text-royal font-bold uppercase tracking-[0.1em] block">DIVISION</span>
                      <span className="font-bold text-graphite text-[13px] mt-0.5 block">{unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 rounded-card-md border border-line bg-canvas p-6 text-center font-mono text-[12.5px] text-stone">
            No corporate structure has been configured for this company.
          </div>
        )}
      </div>

      {/* 07. OFFICIAL DIGITAL PRESENCE & PUBLIC CONTACT */}
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <Icon name="globe" className="h-4 w-4 text-royal" />
            <h2 className="text-h3 text-graphite">OFFICIAL DIGITAL PRESENCE</h2>
          </div>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
            VERIFIED CHANNELS
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3 font-mono text-[12px]">
          {/* Website */}
          <div className="rounded-card-sm border border-line bg-canvas p-4">
            <span className="text-[10px] text-mute uppercase tracking-[0.1em] block">OFFICIAL WEBSITE</span>
            {company.website ? (
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 font-bold text-royal hover:underline flex items-center gap-1 text-[13px] truncate"
              >
                <span>{company.website.replace(/^https?:\/\//, "")}</span>
                <Icon name="arrowUpRight" className="h-3.5 w-3.5 shrink-0" />
              </a>
            ) : (
              <span className="mt-1.5 font-semibold text-stone block">NOT CONFIGURED</span>
            )}
          </div>

          {/* Email */}
          <div className="rounded-card-sm border border-line bg-canvas p-4">
            <span className="text-[10px] text-mute uppercase tracking-[0.1em] block">OFFICIAL CORPORATE EMAIL</span>
            {company.officialEmail ? (
              <a
                href={`mailto:${company.officialEmail}`}
                className="mt-1.5 font-bold text-graphite hover:text-royal text-[13px] block truncate"
              >
                {company.officialEmail}
              </a>
            ) : (
              <span className="mt-1.5 font-semibold text-stone block">NOT CONFIGURED</span>
            )}
          </div>

          {/* LinkedIn / Social */}
          <div className="rounded-card-sm border border-line bg-canvas p-4">
            <span className="text-[10px] text-mute uppercase tracking-[0.1em] block">OFFICIAL LINKEDIN</span>
            {company.officialLinkedIn ? (
              <a
                href={company.officialLinkedIn}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 font-bold text-royal hover:underline flex items-center gap-1 text-[13px] truncate"
              >
                <span>Official Corporate LinkedIn</span>
                <Icon name="arrowUpRight" className="h-3.5 w-3.5 shrink-0" />
              </a>
            ) : (
              <span className="mt-1.5 font-semibold text-stone block">NOT CONFIGURED</span>
            )}
          </div>
        </div>
      </div>

      {/* 08. CERTIFICATIONS SUMMARY (IF AVAILABLE) */}
      {company.certifications && company.certifications.length > 0 && (
        <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-2">
              <Icon name="shield" className="h-4 w-4 text-royal" />
              <h2 className="text-h3 text-graphite">CERTIFICATIONS SUMMARY</h2>
            </div>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
              {company.certifications.length} VERIFIED CERTIFICATE{company.certifications.length > 1 ? "S" : ""}
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {company.certifications.map((cert, idx) => (
              <div key={idx} className="rounded-card-md border border-line bg-canvas p-4 font-mono text-[12px]">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="font-bold text-royal text-[11px] uppercase">{cert.issuer || "VERIFIED ISSUER"}</span>
                  <DigiBadge variant="soft">{cert.status || "VERIFIED"}</DigiBadge>
                </div>
                <h4 className="mt-2 text-[14px] font-bold text-graphite">{cert.name}</h4>
                {cert.validity && (
                  <p className="mt-2 text-[11px] text-mute">Valid through: {cert.validity}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
