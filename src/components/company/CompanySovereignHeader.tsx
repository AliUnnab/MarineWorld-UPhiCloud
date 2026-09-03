import { useEffect, useState, useRef, useMemo } from "react";
import type { CompanyProfile, SectorCity, IndustryDomainEntity, SectorConfig } from "@/lib/types";
import { DigiContainer } from "@/components/digione/primitives";
import {
  resolveAccessContext,
  setActiveOrganizationContext,
} from "@/lib/services/accessContextService";
import {
  getCurrentAuthSession,
  signOutCurrentUser,
  subscribeAuthState,
} from "@/lib/services/securityService";
import { resolveMarineWorldCompanyDigitalId } from "@/lib/services/companyIdentityService";
import { getEnrolledOrganizationForCompany } from "@/lib/services/ecosystemOrganizationService";
import { getBusinessTwin } from "@/lib/businessTwinStore";
import { isCompanyFlagship, isCompanyAnchor, getCompaniesInCity, getSectorConfig } from "@/lib/registry";
import { SectorCityAdvisorDrawer } from "@/components/sector/SectorCityAdvisorDrawer";
import {
  ChevronDown,
  Building2,
  LogOut,
  ArrowRight,
  User,
  Compass,
  LayoutDashboard,
  Bookmark,
  Package,
  ArrowLeft,
  Globe2,
  Cpu,
  Link2,
  Share2,
  CheckCircle2,
  Radio,
  ShieldCheck,
} from "lucide-react";
import type { AccessContext } from "@/lib/types";

export function CompanySovereignHeader({
  company,
  primaryCity,
  parentDomain,
  config,
  activeModule = "overview",
  selectedProductName,
  selectedServiceName,
  onSelectModule,
  offeringsCount = 0,
  onOpenConnectModal,
  onOpenTwinModal,
  onOpenShareModal,
}: {
  company: CompanyProfile;
  primaryCity?: SectorCity;
  parentDomain?: IndustryDomainEntity;
  config?: SectorConfig;
  activeModule?: string;
  selectedProductName?: string;
  selectedServiceName?: string;
  onSelectModule?: (moduleSlug: string) => void;
  offeringsCount?: number;
  onOpenConnectModal?: () => void;
  onOpenTwinModal?: () => void;
  onOpenShareModal?: () => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [accessContext, setAccessContext] = useState<AccessContext>(() =>
    resolveAccessContext()
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeConfig = useMemo(() => config || getSectorConfig("marine"), [config]);

  const refreshContext = () => {
    setAccessContext(resolveAccessContext());
  };

  useEffect(() => {
    const unsubscribe = subscribeAuthState(() => {
      refreshContext();
    });

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      unsubscribe();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSignOut = () => {
    signOutCurrentUser();
    refreshContext();
    setDropdownOpen(false);
    window.history.pushState({}, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const isAuthenticated =
    accessContext.isAuthenticated && accessContext.authenticatedUserId !== null;
  const activeOrg = accessContext.activeOrganization;

  const resolvedCity: SectorCity | undefined = useMemo(() => {
    if (primaryCity) return primaryCity;
    const targetCityId = company.sectorCityIds?.[0] || (company as any).primarySectorCityId || company.city;
    return (
      activeConfig.explorer?.cities?.find(
        (c) => c.id.toLowerCase() === targetCityId?.toLowerCase() || c.slug.toLowerCase() === targetCityId?.toLowerCase()
      ) || activeConfig.explorer?.cities?.[0]
    );
  }, [primaryCity, company, activeConfig]);

  const cityCompanies = useMemo(() => {
    if (!resolvedCity) return [];
    return getCompaniesInCity(activeConfig, resolvedCity.id || resolvedCity.slug);
  }, [activeConfig, resolvedCity]);

  const citySlug = resolvedCity?.slug ?? primaryCity?.slug ?? "shipyard";
  const cityDomain = (resolvedCity?.domain ?? primaryCity?.domain ?? primaryCity?.id ?? "supplychain").toUpperCase();
  const formattedSectorCity = cityDomain.endsWith(".CITY") ? cityDomain : `${cityDomain}.CITY`;

  const companyHref = `/companies/${company.slug ?? company.id}`;
  const displayName = company.displayName || company.name || "Company";
  const legalName = company.legalName || company.name || displayName;
  const headquartersCity = company.headquartersCity || "International Maritime Hub";
  const country = company.country || "Global";
  const logoSrc = company.logoUrl || (company as any).logo || null;
  const companyShortName = displayName.toUpperCase();
  const isVerified = String(company.verificationStatus || "VERIFIED").toLowerCase().includes("verified");
  const isFlagship = isCompanyFlagship(company);
  const isAnchor = isCompanyAnchor(company);

  const digitalIdInfo = resolveMarineWorldCompanyDigitalId({
    companyIdOrSlug: company.id,
    mwCompanyDigitalId: company.mwCompanyDigitalId,
    businessId: company.businessId,
    companyId6Digit: company.companyId6Digit,
    primaryRegistryCode: company.primaryRegistryCode,
    primarySectorCityId: company.sectorCityIds?.[0] || company.cityIds?.[0] || primaryCity?.id,
  });

  const twin = getBusinessTwin(company);
  const trustSignals = twin?.trustSignals || [];
  const verifiedSignalsCount = trustSignals.filter((s) => s.verified).length;
  const totalSignalsCount = trustSignals.length || 4;

  const industryDomainName = company.industry || parentDomain?.name || "Marine & Maritime";
  const establishedYear = company.foundedYear || twin?.identity?.foundedYear || "1875";

  const moduleLabelMap: Record<string, string> = {
    overview: "OVERVIEW",
    company: "OVERVIEW",
    offerings: "OFFERINGS",
    showroom: "OFFERINGS",
    solutions: "OFFERINGS",
    products: "PRODUCTS",
    services: "SERVICES",
    presence: "PRESENCE",
    "sector-city": "PRESENCE",
    network: "PRESENCE",
    "business-twin": "BUSINESS TWIN",
    chat: "BUSINESS TWIN",
    ai: "BUSINESS TWIN",
    connect: "CONNECT",
  };

  const normalizedModule = activeModule ? (moduleLabelMap[activeModule] || activeModule.toUpperCase()) : "OVERVIEW";

  const breadcrumbs = [
    { label: "MARINEWORLD", href: "/" },
    { label: "MARITIME CATEGORIES", href: "/industries" },
    {
      label: parentDomain ? parentDomain.name.toUpperCase() : "MARITIME SERVICES",
      href: parentDomain ? `/industries/${parentDomain.slug}` : "/industries",
    },
    {
      label: formattedSectorCity,
      href: `/cities/${citySlug}`,
    },
    {
      label: companyShortName,
      href: companyHref,
    },
    {
      label: selectedProductName
        ? selectedProductName.toUpperCase()
        : selectedServiceName
        ? selectedServiceName.toUpperCase()
        : normalizedModule,
      href: null,
    },
  ];

  const isModuleActive = (id: string) => {
    if (id === "overview") return ["company", "overview"].includes(activeModule);
    if (id === "offerings") return ["offerings", "showroom", "solutions", "products", "services"].includes(activeModule);
    if (id === "presence") return ["presence", "sector-city", "network"].includes(activeModule);
    if (id === "identity") return ["identity", "corporate", "governance"].includes(activeModule);
    if (id === "business-twin") return ["business-twin", "chat", "ai"].includes(activeModule);
    if (id === "connect") return activeModule === "connect";
    return false;
  };

  const queryParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const isFromHub = queryParams.get("fromHub") === "true";
  const returnTab = queryParams.get("returnTab") || "members";
  const returnOrgId = queryParams.get("orgId") || (activeOrg as any)?.id;
  const returnUrl = returnOrgId
    ? `/ecosystem/dashboard?orgId=${returnOrgId}&tab=${returnTab}`
    : `/ecosystem/dashboard?tab=${returnTab}`;

  const enrolledOrg = getEnrolledOrganizationForCompany(company.id || company.slug || "");

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "offerings", label: "Offerings", icon: Package, count: offeringsCount > 0 ? offeringsCount : undefined },
    { id: "presence", label: "Presence", icon: Globe2 },
    { id: "identity", label: "Identity", icon: ShieldCheck },
    { id: "connect", label: "Connect", icon: Link2 },
  ];

  return (
    <header className="sticky top-0 z-50 font-sans shadow-xs">
      {/* ========================================================================= */}
      {/* ECOSYSTEM HUB RETURN BANNER (Admin return control when coming from Hub)   */}
      {/* ========================================================================= */}
      {(isFromHub ||
        accessContext.contextType === "ECOSYSTEM_ORGANIZATION" ||
        (activeOrg &&
          ["ASSOCIATION", "CHAMBER", "FEDERATION", "INSTITUTION", "PUBLIC_ORGANIZATION"].includes(
            (activeOrg as any).organizationType
          ))) && (
        <div className="bg-slate-900 text-white px-4 py-2 border-b border-slate-800 shadow-xs flex items-center justify-between font-sans z-50">
          <div className="flex items-center gap-2 text-xs font-bold truncate">
            <Building2 className="w-4 h-4 text-slate-300 shrink-0" />
            <span className="text-slate-300">ECOSYSTEM MEMBER PREVIEW:</span>
            <span className="text-white truncate">Viewing {displayName}</span>
            <span className="text-slate-400 font-normal hidden sm:inline">
              as {(activeOrg as any)?.organizationName || (activeOrg as any)?.displayName || enrolledOrg?.name || "Ecosystem Representative"}
            </span>
          </div>

          <a
            id="btn-top-return-to-ecosystem"
            href={returnUrl}
            className="px-3.5 py-1.5 rounded-lg bg-royal hover:bg-royal-light text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Ecosystem Hub ({returnTab})</span>
          </a>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LAYER 1 — PLATFORM CHROME (TOP)                                           */}
      {/* Quiet, neutral, thin strip for platform network provenance & accounts   */}
      {/* ========================================================================= */}
      <div className="border-b border-slate-200/80 bg-slate-50/95 backdrop-blur-md">
        <DigiContainer>
          <div className="flex h-10 sm:h-11 items-center justify-between gap-3">
            
            {/* Left: Back to City & Platform Network Provenance Breadcrumb */}
            <div className="flex items-center gap-2 sm:gap-3 overflow-hidden py-1">
              {(accessContext.contextType === "ECOSYSTEM_ORGANIZATION" ||
                (activeOrg &&
                  ["ASSOCIATION", "CHAMBER", "FEDERATION", "INSTITUTION", "PUBLIC_ORGANIZATION"].includes(
                    (activeOrg as any).organizationType
                  ))) && (
                <a
                  id="btn-sovereign-back-to-ecosystem"
                  href="/ecosystem/dashboard?tab=members"
                  className="inline-flex items-center gap-1 rounded-md border border-royal/30 bg-royal/5 hover:bg-royal/10 px-2.5 py-0.5 text-[10.5px] font-sans font-bold text-royal-dark transition shrink-0 shadow-2xs"
                  title="Return to Ecosystem Hub Members"
                >
                  <ArrowLeft className="w-3 h-3 text-royal shrink-0" />
                  <span>Return to Ecosystem Hub</span>
                </a>
              )}

              <a
                id="btn-sovereign-back-to-city"
                href={`/cities/${citySlug}`}
                className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white/90 hover:bg-white px-2 py-0.5 text-[10.5px] font-sans font-medium text-slate-700 transition shrink-0 shadow-2xs"
                title={`Return to ${formattedSectorCity}`}
              >
                <ArrowLeft className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                <span className="hidden sm:inline">Back to City</span>
                <span className="sm:hidden">City</span>
              </a>

              <span className="hidden sm:inline-block h-3 w-px bg-slate-200 shrink-0" />

              <nav aria-label="MarineWorld Network Breadcrumb" className="flex items-center gap-1 sm:gap-1.5 font-sans text-[10.5px] sm:text-[11px] text-stone overflow-x-auto no-scrollbar">
                {breadcrumbs.map((item, idx) => (
                  <span key={item.label + idx} className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    {idx > 0 && <span className="text-slate-300">/</span>}
                    {item.href ? (
                      <a
                        href={item.href}
                        className="hover:text-graphite transition-colors hover:underline underline-offset-2 text-slate-500 font-medium font-sans"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <span className="font-bold text-graphite bg-slate-200/70 px-1.5 py-0.5 rounded text-[10px] sm:text-[10.5px] tracking-wide font-sans">
                        {item.label}
                      </span>
                    )}
                  </span>
                ))}
              </nav>
            </div>

            {/* Right: Platform Controls (Sign In + Enter) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {!isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <a
                    id="btn-sovereign-header-signin"
                    href="/login/personal"
                    className="inline-flex h-7 sm:h-7.5 items-center justify-center gap-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-royal/40 px-2.5 sm:px-3 text-[11px] font-semibold text-slate-800 shadow-2xs transition-all duration-200"
                  >
                    <User className="w-3 h-3 text-slate-500" />
                    <span>Sign In</span>
                  </a>

                  <a
                    id="btn-sovereign-header-enter"
                    href="/gateway"
                    className="inline-flex h-7 sm:h-7.5 items-center justify-center gap-1 rounded-full bg-royal hover:bg-royal-dark px-3 sm:px-3.5 text-[11px] font-bold tracking-wide text-white shadow-2xs transition-all duration-200"
                  >
                    <span>GATEWAY</span>
                    <ArrowRight className="w-2.5 h-2.5 text-white/80" />
                  </a>
                </div>
              ) : accessContext.contextType === "COMPANY" ||
                activeOrg ||
                (accessContext.availableMemberships && accessContext.availableMemberships.length > 0) ||
                (company.ownerId && accessContext.authenticatedUserId && company.ownerId === accessContext.authenticatedUserId) ? (
                /* Authenticated Org / Company Member */
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    id="btn-sovereign-org-switcher"
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-royal/30 bg-royal/5 hover:bg-royal/10 px-2.5 py-1 text-[11px] font-bold text-royal shadow-2xs transition"
                  >
                    <Building2 className="w-3 h-3 text-royal shrink-0" />
                    <span className="truncate max-w-[110px] sm:max-w-[150px]">
                      {activeOrg?.organizationName ||
                        (activeOrg as any)?.displayName ||
                        company.displayName ||
                        company.name ||
                        "Company"}
                    </span>
                    <ChevronDown className="w-2.5 h-2.5 text-royal/60 shrink-0" />
                  </button>

                  {dropdownOpen && (
                    <div
                      id="dropdown-sovereign-org-menu"
                      className="absolute right-0 top-full mt-1.5 w-72 rounded-xl border border-line bg-white p-3 shadow-xl z-50 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150"
                    >
                      <div className="p-2.5 bg-slate-50 rounded-lg space-y-1 font-sans">
                        <div className="text-xs font-bold text-graphite">
                          {activeOrg?.organizationName ||
                            (activeOrg as any)?.displayName ||
                            company.displayName ||
                            company.name ||
                            "Company"}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-royal text-white">
                            {activeOrg?.role || "OWNER"}
                          </span>
                          <span className="text-[11px] font-sans text-stone">
                            {accessContext.contextType === "ECOSYSTEM_ORGANIZATION"
                              ? "Ecosystem Context"
                              : "Company Account"}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-line/60 space-y-1">
                        {(accessContext.contextType === "ECOSYSTEM_ORGANIZATION" ||
                          (activeOrg &&
                            ["ASSOCIATION", "CHAMBER", "FEDERATION", "INSTITUTION", "PUBLIC_ORGANIZATION"].includes(
                              (activeOrg as any).organizationType
                            ))) && (
                          <a
                            href="/ecosystem/dashboard?tab=members"
                            onClick={() => setDropdownOpen(false)}
                            className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold text-royal bg-royal/5 hover:bg-royal/10 flex items-center justify-between transition"
                          >
                            <span>Return to Ecosystem Hub</span>
                            <ArrowRight className="w-3.5 h-3.5 text-royal" />
                          </a>
                        )}
                        <a
                          href="/studio"
                          id="btn-open-studio-workspace"
                          onClick={() => {
                            setDropdownOpen(false);
                            const targetCompanyId = activeOrg?.companyId || company.slug || company.id;
                            if (targetCompanyId) {
                              setActiveOrganizationContext(targetCompanyId);
                            }
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold text-royal bg-royal/5 hover:bg-royal/10 flex items-center justify-between transition cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <LayoutDashboard className="w-3.5 h-3.5 text-royal" />
                            <span>Company Studio / Workspace</span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      <div className="pt-2 border-t border-line/60">
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-500" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Personal Visitor Dropdown */
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    id="btn-sovereign-user-switcher"
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-graphite shadow-2xs transition"
                  >
                    <User className="w-3 h-3 text-royal shrink-0" />
                    <span className="truncate max-w-[90px] sm:max-w-[130px]">
                      {accessContext.personalUser?.displayName || "Personal Visitor"}
                    </span>
                    <ChevronDown className="w-2.5 h-2.5 text-stone shrink-0" />
                  </button>

                  {dropdownOpen && (
                    <div
                      id="dropdown-sovereign-user-menu"
                      className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-line bg-white p-3 shadow-xl z-50 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150"
                    >
                      <div className="p-2 bg-slate-50 rounded-lg space-y-1">
                        <div className="text-xs font-bold text-graphite font-sans">
                          {accessContext.personalUser?.displayName || "Personal Visitor"}
                        </div>
                        {accessContext.personalUser?.email && (
                          <div className="text-[11px] font-sans text-stone truncate">
                            {accessContext.personalUser.email}
                          </div>
                        )}
                        <div className="pt-1">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-bold bg-slate-200 text-slate-700">
                            PERSONAL VISITOR
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-line/60 space-y-1">
                        <a
                          href="/workspace"
                          onClick={() => setDropdownOpen(false)}
                          className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-graphite hover:bg-slate-50 flex items-center gap-2 transition"
                        >
                          <LayoutDashboard className="w-3.5 h-3.5 text-slate-500" />
                          <span>My Workspace</span>
                        </a>
                        <a
                          href="/saved/companies"
                          onClick={() => setDropdownOpen(false)}
                          className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-graphite hover:bg-slate-50 flex items-center gap-2 transition"
                        >
                          <Bookmark className="w-3.5 h-3.5 text-slate-500" />
                          <span>Saved Companies</span>
                        </a>
                        <a
                          href="/workspace/inquiries"
                          onClick={() => setDropdownOpen(false)}
                          className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-graphite hover:bg-slate-50 flex items-center gap-2 transition"
                        >
                          <Package className="w-3.5 h-3.5 text-slate-500" />
                          <span>My Inquiries</span>
                        </a>
                      </div>

                      <div className="pt-2 border-t border-line/60">
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-500" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </DigiContainer>
      </div>

      {/* ========================================================================= */}
      {/* LAYER 2 — COMPANY SHELL (VERIFIED LETTERHEAD & TAB NAVIGATION)            */}
      {/* Flat corporate plaque surface with authoritative identity & seal-ring      */}
      {/* ========================================================================= */}
      <div className="border-b border-line bg-canvas">
        <DigiContainer>
          <div className="py-4 sm:py-5">
            
            {/* Block 1: Contained Identity Card */}
            <div className="rounded-card-lg border border-line bg-white p-4 sm:p-5 md:p-6 shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
                
                {/* Left Identity: Medallion Logo + Kicker + Name + Inline Verification + Metadata Line */}
                <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 md:gap-5 min-w-0 flex-1">
                  
                  {/* 1. Medallion Verification Seal Logo Frame (Double Ring) */}
                  <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 md:h-[60px] md:w-[60px] shrink-0 items-center justify-center rounded-full border border-royal p-[2.5px] bg-white">
                    <div className="flex h-full w-full items-center justify-center rounded-full border border-line bg-canvas overflow-hidden font-sans text-sm sm:text-base font-bold text-graphite">
                      {logoSrc && !logoError ? (
                        <img
                          src={logoSrc}
                          alt={displayName}
                          className="h-full w-full object-contain p-1 rounded-full"
                          onError={() => setLogoError(true)}
                        />
                      ) : (
                        <span>{company.initials || displayName.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                  </div>

                  {/* 2. Dominant Formal Name + Kicker + Inline Seal Verification + Supporting Line */}
                  <div className="space-y-1 min-w-0 flex-1">
                    
                    {/* Kicker line: Est. [Year] if present */}
                    {establishedYear ? (
                      <div className="text-[11px] font-bold uppercase tracking-wider text-stone flex items-center gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis">
                        <span>EST. {establishedYear}</span>
                      </div>
                    ) : null}

                    {/* Dominant Company Name & Inline Verification */}
                    <div className="flex flex-wrap items-baseline sm:items-center gap-x-2.5 gap-y-1">
                      <h1 className="text-xl sm:text-2xl md:text-[26px] font-semibold text-graphite tracking-tight leading-tight font-sans break-words">
                        {displayName}
                      </h1>

                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 font-sans text-xs sm:text-[13px] font-medium text-emerald-700 whitespace-nowrap shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Verified Enterprise</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-sans text-xs sm:text-[13px] font-medium text-amber-700 whitespace-nowrap shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span>Pending Verification</span>
                        </span>
                      )}
                    </div>

                    {/* 3. Clean Metadata Line: legal entity name + country, followed by flagship/anchor seal & optional enrolling org badge */}
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 font-sans text-xs sm:text-[12.5px] text-stone">
                      <span className="text-slate-700 font-medium">
                        {legalName} · {country}
                      </span>
                      {isAnchor ? (
                        <span
                          id="seal-anchor-registrant"
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-sans bg-slate-100 text-slate-800 border border-slate-300 whitespace-nowrap shrink-0 shadow-2xs"
                          title={`Accredited Landmark Anchor within the ${formattedSectorCity} Registry`}
                        >
                          <Radio className="w-3 h-3 text-slate-700 shrink-0" />
                          <span>Anchor</span>
                        </span>
                      ) : isFlagship ? (
                        <span
                          id="seal-flagship-registrant"
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-sans bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap shrink-0 shadow-2xs"
                          title={`Accredited Flagship Registrant within the ${formattedSectorCity} Registry`}
                        >
                          <Radio className="w-3 h-3 text-amber-700 shrink-0" />
                          <span>Flagship</span>
                        </span>
                      ) : null}
                      {enrolledOrg && (
                        <a
                          id="link-sovereign-enrolled-org"
                          href={`/companies/${enrolledOrg.slug || enrolledOrg.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-royal/5 text-royal-dark border border-royal/20/90 hover:bg-royal/10 transition whitespace-nowrap shrink-0 shadow-2xs"
                          title={`Public organization profile for ${enrolledOrg.name}`}
                        >
                          <Building2 className="w-3 h-3 text-royal shrink-0" />
                          <span>Member of {enrolledOrg.name}</span>
                        </a>
                      )}
                    </div>

                  </div>

                </div>

                {/* Right Side: Primary Action Buttons */}
                <div className="flex flex-col lg:items-end justify-center gap-2.5 shrink-0 self-stretch lg:self-auto">
                  {/* Action Buttons Row */}
                  <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap lg:flex-nowrap">
                    {/* Prominent Explore Sector City Action */}
                    <button
                      type="button"
                      id="btn-header-explore-sector-city"
                      onClick={() => setIsAdvisorOpen(true)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-royal/30 bg-royal/5 hover:bg-royal/10 text-royal px-4 py-2 text-xs font-bold tracking-normal transition-all cursor-pointer font-sans min-h-[36px] shrink-0 shadow-2xs hover:border-royal/50 hover:shadow-xs group"
                      title={`Explore ${formattedSectorCity} Guide & AI Advisor`}
                    >
                      <span>Explore {formattedSectorCity}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-royal group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </button>

                    {onOpenTwinModal && (
                      <button
                        type="button"
                        id="btn-header-twin"
                        onClick={onOpenTwinModal}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-white hover:bg-slate-50 px-3.5 sm:px-4 py-2 text-xs font-semibold text-graphite transition-colors cursor-pointer font-sans min-h-[36px] shrink-0"
                        title="Open Company AI"
                      >
                        <Cpu className="w-3.5 h-3.5 text-royal" />
                        <span>COMPANY AI</span>
                      </button>
                    )}

                    {onOpenConnectModal && (
                      <button
                        type="button"
                        id="btn-header-connect"
                        onClick={onOpenConnectModal}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-royal hover:bg-royal-dark text-white px-4 sm:px-5 py-2 text-xs font-semibold tracking-wider transition-colors cursor-pointer font-sans min-h-[36px] shrink-0"
                      >
                        <Link2 className="w-3.5 h-3.5 text-white" />
                        <span>CONNECT</span>
                      </button>
                    )}

                    {onOpenShareModal && (
                      <button
                        type="button"
                        id="btn-header-share"
                        onClick={onOpenShareModal}
                        className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-line bg-white hover:bg-slate-50 text-slate-700 hover:text-graphite transition-colors cursor-pointer shrink-0"
                        title="Share Company Node"
                        aria-label="Share Company Node"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Divider & Company Tab Navigation */}
            {onSelectModule && (
              <div className="border-b border-line pt-2">
                <nav aria-label="Company Workspace Navigation" className="flex items-center gap-4 sm:gap-6 md:gap-8 overflow-x-auto no-scrollbar py-0.5">
                  {navItems.map((item) => {
                    const active = isModuleActive(item.id);
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectModule(item.id)}
                        className={`
                          group relative flex items-center gap-1.5 sm:gap-2 py-3 text-xs font-bold tracking-wider uppercase whitespace-nowrap transition-colors cursor-pointer min-h-[44px]
                          ${active ? "text-royal" : "text-stone hover:text-graphite"}
                        `}
                      >
                        <Icon className={`w-3.5 h-3.5 ${active ? "text-royal" : "text-slate-400 group-hover:text-graphite"}`} />
                        <span>{item.label}</span>
                        {item.count !== undefined && (
                          <span className={`ml-0.5 rounded-full px-1.5 py-0.2 font-sans text-[9px] font-bold ${active ? 'bg-royal/10 text-royal' : 'bg-slate-100 text-stone group-hover:bg-slate-200'}`}>
                            {item.count}
                          </span>
                        )}
                        {active && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-royal rounded-t-full" />
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            )}

          </div>
        </DigiContainer>
      </div>

      {/* Reusable Sector City Guide & AI Advisor Drawer */}
      {resolvedCity && (
        <SectorCityAdvisorDrawer
          isOpen={isAdvisorOpen}
          onClose={() => setIsAdvisorOpen(false)}
          city={resolvedCity}
          config={activeConfig}
          allCityCompanies={cityCompanies}
          parentDomainName={parentDomain?.name}
          entrySource="company_page"
          referringCompanyId={company.id}
          referringCompanyName={company.displayName || company.name}
        />
      )}
    </header>
  );
}

