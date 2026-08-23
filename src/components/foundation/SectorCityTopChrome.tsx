import { useState, useEffect, useRef } from "react";
import type { SectorConfig } from "@/lib/types";
import { LogoMark } from "@/components/digione/icons";
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
import {
  ChevronDown,
  Building2,
  LogOut,
  ArrowRight,
  Sparkles,
  User,
  Compass,
  LayoutDashboard,
  Bookmark,
  ChevronRight,
} from "lucide-react";
import type { AccessContext } from "@/lib/types";

export interface SectorCityChromeBreadcrumb {
  label: string;
  href?: string;
}

/**
 * SectorCityTopChrome — slim, single-height platform utility bar.
 * Matches the height and weight of the platform chrome on company operating pages.
 * Integrates the logo, network breadcrumb trail, and account/visitor controls into a single compact strip.
 */
export function SectorCityTopChrome({
  config,
  breadcrumbs,
}: {
  config: SectorConfig;
  breadcrumbs: SectorCityChromeBreadcrumb[];
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [accessContext, setAccessContext] = useState<AccessContext>(() =>
    resolveAccessContext()
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  return (
    <header className="sticky top-0 z-50 font-sans border-b border-slate-200/80 bg-slate-50/95 backdrop-blur-md shadow-2xs">
      <DigiContainer>
        <div className="flex h-10 sm:h-11 items-center justify-between gap-3">
          {/* Left: Small Inline Brand Logo & Compact Network Breadcrumbs */}
          <div className="flex items-center gap-2 sm:gap-3 overflow-hidden py-1 min-w-0">
            {/* Small inline logo */}
            <a
              href="/"
              className="inline-flex items-center gap-1.5 shrink-0 text-slate-900 hover:opacity-90 transition-opacity"
              aria-label="MarineWorld.City — Home"
            >
              <LogoMark className="h-5 w-5 shrink-0 text-blue-600" />
              <span className="text-[12.5px] font-bold tracking-tight text-slate-900 hidden sm:inline">
                {config.sectorName}
                <span className="text-blue-600 font-semibold">{config.sectorTld}</span>
              </span>
            </a>

            <span className="hidden sm:inline-block h-3.5 w-px bg-slate-200 shrink-0" />

            {/* Quick Navigation Links (small & quiet) */}
            <nav aria-label="Quick Nav" className="hidden lg:flex items-center gap-2.5 text-[11px] font-medium text-slate-500 shrink-0">
              <a
                href="/explore"
                className={`transition-colors ${
                  typeof window !== "undefined" && window.location.pathname === "/explore"
                    ? "text-blue-600 font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                Explore
              </a>
              <a
                href="/cities"
                className={`transition-colors ${
                  typeof window !== "undefined" && window.location.pathname.startsWith("/cities")
                    ? "text-blue-600 font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                Cities
              </a>
              <a
                href="/industries"
                className={`transition-colors ${
                  typeof window !== "undefined" && (window.location.pathname.startsWith("/industries") || window.location.pathname.startsWith("/sectors"))
                    ? "text-blue-600 font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                Sectors
              </a>
              <a
                href="/companies"
                className={`transition-colors ${
                  typeof window !== "undefined" && window.location.pathname.startsWith("/companies")
                    ? "text-blue-600 font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                Companies
              </a>
            </nav>

            {breadcrumbs && breadcrumbs.length > 0 && (
              <span className="hidden lg:inline-block h-3.5 w-px bg-slate-200 shrink-0" />
            )}

            {/* Breadcrumb Trail */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav
                aria-label="Sector City Network Breadcrumb"
                className="flex items-center gap-1 sm:gap-1.5 text-[10.5px] sm:text-[11px] text-slate-500 overflow-x-auto no-scrollbar whitespace-nowrap"
              >
                {breadcrumbs.map((item, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <span key={item.label + idx} className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                      {idx > 0 && <span className="text-slate-300">/</span>}
                      {item.href && !isLast ? (
                        <a
                          href={item.href}
                          className="hover:text-slate-900 transition-colors hover:underline underline-offset-2 text-slate-500 font-medium"
                        >
                          {item.label}
                        </a>
                      ) : (
                        <span className="font-bold text-slate-900 bg-slate-200/70 px-1.5 py-0.5 rounded text-[10px] sm:text-[10.5px] tracking-wide">
                          {item.label}
                        </span>
                      )}
                    </span>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Right: Compact Platform Controls (Visitor / Sign In / Enter) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {!isAuthenticated ? (
              <div className="flex items-center gap-1.5">
                {/* Guest Visitor Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    id="btn-sector-city-visitor-menu"
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-2 sm:px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs transition"
                  >
                    <Compass className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="hidden sm:inline">Visitor</span>
                    <ChevronDown className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                  </button>

                  {dropdownOpen && (
                    <div
                      id="dropdown-sector-city-visitor-menu"
                      className="absolute right-0 top-full mt-1.5 w-60 rounded-xl border border-slate-200 bg-white p-3 shadow-xl z-50 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150"
                    >
                      <div className="p-2 bg-slate-50 rounded-lg space-y-1">
                        <div className="text-xs font-bold text-slate-900">Public Visitor</div>
                        <div className="text-[11px] text-slate-500 leading-tight">
                          Explore MarineWorld.City sector city expositions and registries.
                        </div>
                      </div>
                      <div className="pt-1 border-t border-slate-100 space-y-1">
                        <a
                          id="btn-visitor-signin"
                          href="/login/personal"
                          onClick={() => setDropdownOpen(false)}
                          className="w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold text-blue-600 hover:bg-blue-50 flex items-center justify-between transition"
                        >
                          <span>Personal Sign In</span>
                          <ArrowRight className="w-3 h-3" />
                        </a>
                        <a
                          id="btn-visitor-create-company"
                          href="/company/onboarding"
                          onClick={() => setDropdownOpen(false)}
                          className="w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center justify-between transition"
                        >
                          <span>Create Company</span>
                          <Sparkles className="w-3 h-3 text-blue-600" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                <a
                  id="btn-sector-city-signin"
                  href="/login/personal"
                  className="inline-flex h-7 sm:h-7.5 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-2.5 sm:px-3 text-[11px] font-bold tracking-wide text-slate-800 shadow-2xs transition-all duration-200"
                >
                  <span>SIGN IN</span>
                </a>

                <a
                  id="btn-sector-city-enter"
                  href="/gateway"
                  className="inline-flex h-7 sm:h-7.5 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 px-3 sm:px-3.5 text-[11px] font-bold tracking-wide text-white shadow-2xs transition-all duration-200"
                >
                  <span>ENTER</span>
                </a>
              </div>
            ) : accessContext.contextType === "VISITOR" || !activeOrg ? (
              /* Personal Visitor Dropdown */
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  id="btn-sector-city-user-switcher"
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow-2xs transition"
                >
                  <User className="w-3 h-3 text-blue-600 shrink-0" />
                  <span className="truncate max-w-[90px] sm:max-w-[130px]">
                    {accessContext.personalUser?.displayName || "Personal Visitor"}
                  </span>
                  <ChevronDown className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                </button>

                {dropdownOpen && (
                  <div
                    id="dropdown-sector-city-user-menu"
                    className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl z-50 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150"
                  >
                    <div className="p-2 bg-slate-50 rounded-lg space-y-1">
                      <div className="text-xs font-bold text-slate-900">
                        {accessContext.personalUser?.displayName || "Personal Visitor"}
                      </div>
                      {accessContext.personalUser?.email && (
                        <div className="text-[11px] font-mono text-slate-500 truncate">
                          {accessContext.personalUser.email}
                        </div>
                      )}
                      <div className="pt-1">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 text-slate-700">
                          PERSONAL VISITOR
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <a
                        href="/visitor/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-2 transition"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 text-slate-500" />
                        <span>Visitor Dashboard</span>
                      </a>
                      <a
                        href="/visitor/dashboard?tab=saved-companies"
                        onClick={() => setDropdownOpen(false)}
                        className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-2 transition"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-slate-500" />
                        <span>Saved Companies</span>
                      </a>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
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
              /* Authenticated Org / Company Member */
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  id="btn-sector-city-org-switcher"
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/80 hover:bg-blue-100/80 px-2.5 py-1 text-[11px] font-bold text-blue-700 shadow-2xs transition"
                >
                  <Building2 className="w-3 h-3 text-blue-600 shrink-0" />
                  <span className="truncate max-w-[110px] sm:max-w-[150px]">
                    {(activeOrg as any)?.displayName ||
                      (activeOrg as any)?.name ||
                      (activeOrg as any)?.orgName ||
                      "Company"}
                  </span>
                  <ChevronDown className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                </button>

                {dropdownOpen && (
                  <div
                    id="dropdown-sector-city-org-menu"
                    className="absolute right-0 top-full mt-1.5 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl z-50 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150"
                  >
                    <div className="p-2.5 bg-slate-50 rounded-lg space-y-1">
                      <div className="text-xs font-bold text-slate-900">
                        {(activeOrg as any)?.displayName ||
                          (activeOrg as any)?.name ||
                          (activeOrg as any)?.orgName ||
                          "Company"}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Active Operating Organization
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <a
                        href="/studio"
                        onClick={() => setDropdownOpen(false)}
                        className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-2 transition"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>Company Studio</span>
                      </a>
                      <a
                        href="/property/governance"
                        onClick={() => setDropdownOpen(false)}
                        className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-2 transition"
                      >
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Property Governance</span>
                      </a>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
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
    </header>
  );
}
