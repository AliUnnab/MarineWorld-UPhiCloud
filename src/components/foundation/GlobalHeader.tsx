import { useEffect, useState, useRef } from "react";
import type { NavigationItem, SectorConfig } from "@/lib/types";
import { Icon, LogoMark } from "@/components/digione/icons";
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
  Landmark,
  LogOut,
  Check,
  ArrowRight,
  User,
  Compass,
  LayoutDashboard,
  Bookmark,
  Package,
  Layers,
  Folder,
  UserCheck,
  Activity,
} from "lucide-react";
import type { AccessContext } from "@/lib/types";

/**
 * GlobalHeader — sector-agnostic enterprise platform chrome.
 * Adapts dynamically to public visitor, authenticated company, and authenticated organization contexts.
 */
export function GlobalHeader({
  config,
  nav,
  activeHref,
}: {
  config: SectorConfig;
  /** Optional navigation override — defaults to config.nav. */
  nav?: NavigationItem[];
  /** Route-aware active state (for future multi-page routes). */
  activeHref?: string;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [accessContext, setAccessContext] = useState<AccessContext>(() =>
    resolveAccessContext()
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  const refreshContext = () => {
    setAccessContext(resolveAccessContext());
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

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
      window.removeEventListener("scroll", onScroll);
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

  const handleSwitchOrg = (orgId: string) => {
    const auth = getCurrentAuthSession();
    if (auth.uid) {
      setActiveOrganizationContext(auth.uid, orgId);
      refreshContext();
      setDropdownOpen(false);
      window.history.pushState({}, "", "/studio");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const isAuthenticated =
    accessContext.isAuthenticated && accessContext.authenticatedUserId !== null;
  const activeOrg = accessContext.activeOrganization;
  const isCompany =
    isAuthenticated &&
    accessContext.contextType === "COMPANY" &&
    Boolean(activeOrg);
  const isEcosystem =
    isAuthenticated &&
    accessContext.contextType === "ECOSYSTEM_ORGANIZATION" &&
    Boolean(activeOrg);
  const isVisitor = !isCompany && !isEcosystem;
  const memberships = accessContext.availableMemberships || [];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ease-digi ${
        scrolled || open
          ? "border-b border-line bg-white/95 backdrop-blur-md shadow-sm"
          : "border-b border-line/80 bg-white/90 backdrop-blur-md"
      }`}
    >
      <DigiContainer>
        <div className="flex h-16 items-center justify-between gap-4 md:h-[72px]">
          {/* Identity */}
          <a href="/" className="flex min-h-11 items-center gap-2.5 text-graphite hover:opacity-85 transition-opacity" aria-label={`${config.wordmark} — home`}>
            <LogoMark className="h-6 w-2 text-graphite" />
            <span className="text-[15.5px] font-bold tracking-[-0.02em] text-graphite">
              {config.sectorName}{config.sectorTld}
            </span>
          </a>

          {/* Desktop navigation */}
          <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
            {isVisitor && (
              <>
                <a
                  href="/explore"
                  className="text-[13.5px] font-medium text-stone hover:text-graphite transition-colors"
                >
                  Explore
                </a>
                <a
                  href="/cities"
                  className="text-[13.5px] font-medium text-stone hover:text-graphite transition-colors"
                >
                  Cities
                </a>
                <a
                  href="/sectors"
                  className="text-[13.5px] font-medium text-stone hover:text-graphite transition-colors"
                >
                  Sectors
                </a>
                <a
                  href="/companies"
                  className="text-[13.5px] font-medium text-stone hover:text-graphite transition-colors"
                >
                  Companies
                </a>
              </>
            )}

            {isCompany && (
              <>
                <a
                  href="/studio"
                  className="text-[13.5px] font-semibold text-royal hover:text-royal-dark transition-colors flex items-center gap-1.5"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Studio</span>
                </a>
                <a
                  href="/studio?tab=company"
                  className="text-[13.5px] font-medium text-stone hover:text-graphite transition-colors"
                >
                  Company
                </a>
                <a
                  href="/studio?tab=products"
                  className="text-[13.5px] font-medium text-stone hover:text-graphite transition-colors"
                >
                  Products
                </a>
                <a
                  href="/studio?tab=services"
                  className="text-[13.5px] font-medium text-stone hover:text-graphite transition-colors"
                >
                  Services
                </a>
                <a
                  href="/studio?tab=connect"
                  className="text-[13.5px] font-medium text-stone hover:text-graphite transition-colors"
                >
                  Connect
                </a>
                <a
                  href="/studio?tab=team"
                  className="text-[13.5px] font-medium text-stone hover:text-graphite transition-colors"
                >
                  Team
                </a>
                <a
                  href="/studio?tab=governance"
                  className="text-[13.5px] font-medium text-stone hover:text-graphite transition-colors"
                >
                  Governance
                </a>
              </>
            )}

            {isEcosystem && (
              <>
                <a
                  href="/ecosystem/dashboard"
                  className="text-[13.5px] font-semibold text-royal hover:text-royal-dark transition-colors flex items-center gap-1.5"
                >
                  <Landmark className="w-3.5 h-3.5" />
                  <span>Organization Dashboard</span>
                </a>
                <a
                  href="/ecosystem/dashboard?tab=members"
                  className="text-[13.5px] font-medium text-stone hover:text-graphite transition-colors"
                >
                  Members
                </a>
                <a
                  href="/ecosystem/dashboard?tab=companies"
                  className="text-[13.5px] font-medium text-stone hover:text-graphite transition-colors"
                >
                  Companies
                </a>
                <a
                  href="/ecosystem/dashboard?tab=verification"
                  className="text-[13.5px] font-medium text-stone hover:text-graphite transition-colors"
                >
                  Verification
                </a>
                <a
                  href="/ecosystem/dashboard?tab=governance"
                  className="text-[13.5px] font-medium text-stone hover:text-graphite transition-colors"
                >
                  Governance
                </a>
              </>
            )}
          </nav>

          {/* Action Area: Guest (Sign In + Enter Gateway) vs Personal Visitor (<displayName> ▾) vs Active Organization Switcher */}
          <div className="flex items-center gap-3">
            {!isAuthenticated ? (
              <div className="flex items-center gap-2.5">
                <a
                  id="btn-global-header-signin"
                  href="/login/personal"
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-line bg-white hover:bg-slate-50 hover:border-royal/40 px-3.5 text-xs font-semibold text-graphite shadow-2xs transition-all duration-200"
                >
                  <User className="w-3.5 h-3.5 text-stone" />
                  <span>Sign In</span>
                </a>

                <a
                  id="btn-global-header-enter"
                  href="/gateway"
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-royal hover:bg-royal-dark px-4 text-xs font-bold tracking-wide text-white shadow-sm transition-all duration-200 hover:shadow"
                >
                  <span>ENTER GATEWAY</span>
                  <ArrowRight className="w-3.5 h-3.5 text-white/80" />
                </a>
              </div>
            ) : accessContext.contextType === "VISITOR" || !activeOrg ? (
              /* Personal Visitor Dropdown (<displayName> ▾) */
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  id="btn-global-user-switcher"
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-white hover:bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-graphite shadow-sm transition"
                >
                  <User className="w-3.5 h-3.5 text-royal shrink-0" />
                  <span className="truncate max-w-[140px] sm:max-w-[180px]">
                    {accessContext.personalUser?.displayName || "Personal Visitor"}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-stone shrink-0" />
                </button>

                {dropdownOpen && (
                  <div
                    id="dropdown-global-user-switcher-menu"
                    className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-line bg-white p-3 shadow-xl z-50 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150"
                  >
                    {/* Personal User Identity Header (No company, no business ID, no OWNER/ADMIN badge) */}
                    <div className="p-2 bg-slate-50 rounded-lg space-y-1">
                      <div className="text-xs font-bold text-graphite">
                        {accessContext.personalUser?.displayName || "Personal Visitor"}
                      </div>
                      {accessContext.personalUser?.email && (
                        <div className="text-[11px] font-mono text-stone truncate">
                          {accessContext.personalUser.email}
                        </div>
                      )}
                      <div className="pt-1">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 text-slate-700">
                          PERSONAL VISITOR
                        </span>
                      </div>
                    </div>

                    {/* Personal Navigation Links: Workspace, Saved Items, Collections, Account */}
                    <div className="pt-1 border-t border-line/60 space-y-0.5">
                      <a
                        id="link-personal-workspace"
                        href="/workspace"
                        onClick={() => setDropdownOpen(false)}
                        className="w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold text-slate-800 hover:bg-slate-100 flex items-center gap-2 transition"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 text-royal" />
                        <span>My Workspace</span>
                      </a>
                      <a
                        id="link-personal-saved-companies"
                        href="/saved/companies"
                        onClick={() => setDropdownOpen(false)}
                        className="w-full text-left px-2 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-slate-500" />
                        <span>Saved Companies</span>
                      </a>
                      <a
                        id="link-personal-saved-products"
                        href="/saved/products"
                        onClick={() => setDropdownOpen(false)}
                        className="w-full text-left px-2 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition"
                      >
                        <Package className="w-3.5 h-3.5 text-slate-500" />
                        <span>Saved Products</span>
                      </a>
                      <a
                        id="link-personal-saved-services"
                        href="/saved/services"
                        onClick={() => setDropdownOpen(false)}
                        className="w-full text-left px-2 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition"
                      >
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                        <span>Saved Services</span>
                      </a>
                      <a
                        id="link-personal-collections"
                        href="/collections"
                        onClick={() => setDropdownOpen(false)}
                        className="w-full text-left px-2 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition"
                      >
                        <Folder className="w-3.5 h-3.5 text-slate-500" />
                        <span>Collections</span>
                      </a>
                      <a
                        id="link-personal-activity"
                        href="/activity"
                        onClick={() => setDropdownOpen(false)}
                        className="w-full text-left px-2 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition"
                      >
                        <Activity className="w-3.5 h-3.5 text-slate-500" />
                        <span>Activity</span>
                      </a>
                      <a
                        id="link-personal-account"
                        href="/account"
                        onClick={() => setDropdownOpen(false)}
                        className="w-full text-left px-2 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                        <span>Account</span>
                      </a>
                    </div>

                    {/* Action: CREATE YOUR AI-NATIVE COMPANY */}
                    <div className="pt-1 border-t border-line/60">
                      <a
                        id="btn-personal-create-company"
                        href="/company/onboarding"
                        onClick={() => setDropdownOpen(false)}
                        className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold bg-royal text-white hover:bg-royal flex items-center justify-between transition shadow-sm"
                      >
                        <span>CREATE YOUR AI-NATIVE COMPANY</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    {/* Switch Organization List (if any memberships exist) */}
                    {memberships.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-line/60">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone px-1">
                          Switch Organization
                        </div>
                        <div className="space-y-0.5 max-h-36 overflow-y-auto">
                          {memberships.map((m) => (
                            <button
                              key={m.organizationId}
                              type="button"
                              onClick={() => handleSwitchOrg(m.organizationId)}
                              className="w-full text-left px-2 py-1.5 rounded-md text-xs font-medium flex items-center justify-between text-graphite hover:bg-slate-100 transition"
                            >
                              <span className="truncate">{m.organizationName}</span>
                              <span className="text-[10px] font-mono text-stone">[{m.role}]</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sign Out */}
                    <div className="pt-1 border-t border-line/60">
                      <button
                        type="button"
                        id="btn-global-header-signout"
                        onClick={handleSignOut}
                        className="w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center justify-between transition"
                      >
                        <span>Sign Out</span>
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* User-Oriented Organization Switcher */
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  id="btn-global-org-switcher"
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-white hover:bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-graphite shadow-sm transition"
                >
                  <Building2 className="w-3.5 h-3.5 text-royal shrink-0" />
                  <span className="truncate max-w-[140px] sm:max-w-[180px]">
                    {activeOrg?.organizationName || "Company Studio"}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-stone shrink-0" />
                </button>

                {dropdownOpen && (
                  <div
                    id="dropdown-global-org-switcher-menu"
                    className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-line bg-white p-3 shadow-xl z-50 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150"
                  >
                    {/* Organization Identity Header */}
                    <div className="p-2 bg-slate-50 rounded-lg space-y-1">
                      <div className="text-xs font-bold text-graphite uppercase tracking-tight">
                        {activeOrg?.organizationName || "ARGENTO MARINE"}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-royal text-white">
                          {activeOrg?.role || "OWNER"}
                        </span>
                        {activeOrg?.businessId && (
                          <span className="text-[10px] font-mono text-stone truncate max-w-[150px]">
                            {activeOrg.businessId}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Switch Organization List */}
                    {memberships.length > 1 && (
                      <div className="space-y-1 pt-1 border-t border-line/60">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone px-1">
                          Switch Organization
                        </div>
                        <div className="space-y-0.5 max-h-36 overflow-y-auto">
                          {memberships.map((m) => {
                            const isCurrent =
                              m.organizationId === activeOrg?.companyId ||
                              m.organizationId === activeOrg?.organizationId;
                            return (
                              <button
                                key={m.organizationId}
                                type="button"
                                onClick={() => handleSwitchOrg(m.organizationId)}
                                className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-medium flex items-center justify-between transition ${
                                  isCurrent
                                    ? "bg-royal/10 text-royal font-bold"
                                    : "text-graphite hover:bg-slate-100"
                                }`}
                              >
                                <span className="truncate">{m.organizationName}</span>
                                {isCurrent && <Check className="w-3.5 h-3.5 text-royal shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Quick Studio / Dashboard Link */}
                    <div className="pt-1 border-t border-line/60">
                      <a
                        href={isCompany ? "/studio" : "/ecosystem/dashboard"}
                        onClick={() => setDropdownOpen(false)}
                        className="w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold text-royal hover:bg-royal/5 flex items-center justify-between transition"
                      >
                        <span>{isCompany ? "Company Studio" : "Organization Dashboard"}</span>
                        <ArrowRight className="w-3 h-3" />
                      </a>
                    </div>

                    {/* Sign Out */}
                    <div className="pt-1 border-t border-line/60">
                      <button
                        type="button"
                        id="btn-global-header-signout"
                        onClick={handleSignOut}
                        className="w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center justify-between transition"
                      >
                        <span>Sign Out</span>
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile menu trigger */}
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="global-mobile-menu"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-card-sm border border-line bg-white text-graphite lg:hidden"
            >
              <Icon name={open ? "close" : "menu"} className="h-5 w-5" />
            </button>
          </div>
        </div>
      </DigiContainer>

      {/* Mobile panel — structured platform menu */}
      {open ? (
        <div id="global-mobile-menu" className="border-t border-line bg-white lg:hidden">
          <DigiContainer className="py-4">
            <nav aria-label="Mobile" className="flex flex-col space-y-2">
              {isVisitor && (
                <>
                  <a
                    href="/explore"
                    onClick={() => setOpen(false)}
                    className="text-[14px] font-medium text-graphite py-1 px-2 rounded hover:bg-slate-50"
                  >
                    Explore
                  </a>
                  <a
                    href="/cities"
                    onClick={() => setOpen(false)}
                    className="text-[14px] font-medium text-graphite py-1 px-2 rounded hover:bg-slate-50"
                  >
                    Cities
                  </a>
                  <a
                    href="/sectors"
                    onClick={() => setOpen(false)}
                    className="text-[14px] font-medium text-graphite py-1 px-2 rounded hover:bg-slate-50"
                  >
                    Sectors
                  </a>
                  <a
                    href="/companies"
                    onClick={() => setOpen(false)}
                    className="text-[14px] font-medium text-graphite py-1 px-2 rounded hover:bg-slate-50"
                  >
                    Companies
                  </a>
                  <div className="pt-2">
                    <a
                      href="/gateway"
                      onClick={() => setOpen(false)}
                      className="w-full flex items-center justify-center rounded-xl bg-royal text-white font-bold text-xs uppercase tracking-wider py-3 shadow-md"
                    >
                      ENTER
                    </a>
                  </div>
                </>
              )}

              {isCompany && (
                <>
                  <a
                    href="/studio"
                    onClick={() => setOpen(false)}
                    className="text-[14px] font-bold text-royal py-1 px-2 rounded hover:bg-royal/5"
                  >
                    Studio
                  </a>
                  <a
                    href="/studio?tab=company"
                    onClick={() => setOpen(false)}
                    className="text-[14px] font-medium text-graphite py-1 px-2 rounded hover:bg-slate-50"
                  >
                    Company
                  </a>
                  <a
                    href="/studio?tab=products"
                    onClick={() => setOpen(false)}
                    className="text-[14px] font-medium text-graphite py-1 px-2 rounded hover:bg-slate-50"
                  >
                    Products
                  </a>
                  <a
                    href="/studio?tab=services"
                    onClick={() => setOpen(false)}
                    className="text-[14px] font-medium text-graphite py-1 px-2 rounded hover:bg-slate-50"
                  >
                    Services
                  </a>
                  <a
                    href="/studio?tab=connect"
                    onClick={() => setOpen(false)}
                    className="text-[14px] font-medium text-graphite py-1 px-2 rounded hover:bg-slate-50"
                  >
                    Connect
                  </a>
                  <a
                    href="/studio?tab=team"
                    onClick={() => setOpen(false)}
                    className="text-[14px] font-medium text-graphite py-1 px-2 rounded hover:bg-slate-50"
                  >
                    Team
                  </a>
                  <a
                    href="/studio?tab=governance"
                    onClick={() => setOpen(false)}
                    className="text-[14px] font-medium text-graphite py-1 px-2 rounded hover:bg-slate-50"
                  >
                    Governance
                  </a>
                  <div className="pt-2 border-t border-line">
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        handleSignOut();
                      }}
                      className="w-full text-left py-2 px-2 text-rose-600 font-bold text-xs rounded hover:bg-rose-50"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}

              {isEcosystem && (
                <>
                  <a
                    href="/ecosystem/dashboard"
                    onClick={() => setOpen(false)}
                    className="text-[14px] font-bold text-royal py-1 px-2 rounded hover:bg-royal/5"
                  >
                    Organization Dashboard
                  </a>
                  <a
                    href="/ecosystem/dashboard?tab=members"
                    onClick={() => setOpen(false)}
                    className="text-[14px] font-medium text-graphite py-1 px-2 rounded hover:bg-slate-50"
                  >
                    Members
                  </a>
                  <a
                    href="/ecosystem/dashboard?tab=companies"
                    onClick={() => setOpen(false)}
                    className="text-[14px] font-medium text-graphite py-1 px-2 rounded hover:bg-slate-50"
                  >
                    Companies
                  </a>
                  <a
                    href="/ecosystem/dashboard?tab=verification"
                    onClick={() => setOpen(false)}
                    className="text-[14px] font-medium text-graphite py-1 px-2 rounded hover:bg-slate-50"
                  >
                    Verification
                  </a>
                  <a
                    href="/ecosystem/dashboard?tab=governance"
                    onClick={() => setOpen(false)}
                    className="text-[14px] font-medium text-graphite py-1 px-2 rounded hover:bg-slate-50"
                  >
                    Governance
                  </a>
                  <div className="pt-2 border-t border-line">
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        handleSignOut();
                      }}
                      className="w-full text-left py-2 px-2 text-rose-600 font-bold text-xs rounded hover:bg-rose-50"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </nav>
          </DigiContainer>
        </div>
      ) : null}
    </header>
  );
}
