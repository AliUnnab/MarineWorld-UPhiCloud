import { useState, useEffect } from "react";
import {
  resolveAccessContext,
  setActiveOrganizationContext,
} from "@/lib/services/accessContextService";
import {
  getCurrentAuthSession,
  setCurrentAuthSession,
  signOutCurrentUser,
} from "@/lib/services/securityService";
import {
  Compass,
  Building2,
  Landmark,
  ArrowRight,
  LogOut,
  ChevronDown,
  ChevronUp,
  Shield,
  CheckCircle2,
  Sparkles,
  LayoutDashboard,
} from "lucide-react";
import type { AccessContext } from "@/lib/types";

interface AccessContextBarProps {
  onNavigate?: (path: string) => void;
}

/**
 * AccessContextBar — Canonical Stage 3.4 DigiOne Access Context Header & Three-Identity Entry Gateway Bar
 * Renders the visible Three-Identity Entry choices for unauthenticated users:
 * 1. [ VISITOR ] -> Explore MarineWorld.City
 * 2. [ COMPANY ] -> AI-Native Company login (/login)
 * 3. [ ECOSYSTEM ORGANIZATION ] -> Official Organization access (/ecosystem/access)
 *
 * When authenticated, displays the active organization context (Argento Marine, Business ID, Role)
 * with switching controls, Studio shortcut, and Sign Out capabilities.
 */
export function AccessContextBar({ onNavigate }: AccessContextBarProps) {
  const [accessContext, setAccessContext] = useState<AccessContext>(() =>
    resolveAccessContext()
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [entryPanelOpen, setEntryPanelOpen] = useState(true);

  const navigateTo = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const refreshContext = () => {
    setAccessContext(resolveAccessContext());
  };

  useEffect(() => {
    refreshContext();
  }, []);

  const handleSelectOrg = (orgId: string | null) => {
    const auth = getCurrentAuthSession();
    if (auth.uid) {
      setActiveOrganizationContext(auth.uid, orgId);
      refreshContext();
      setMenuOpen(false);
    }
  };

  const handleSwitchUser = (uid: string, email: string) => {
    if (!uid) {
      signOutCurrentUser();
    } else {
      setCurrentAuthSession({ uid, email, emailVerified: true, isDevelopmentSession: true });
    }
    refreshContext();
    setMenuOpen(false);
  };

  const handleSignOut = () => {
    signOutCurrentUser();
    refreshContext();
    setMenuOpen(false);
    setEntryPanelOpen(true);
    navigateTo("/");
  };

  const handleVisitorEntry = () => {
    signOutCurrentUser();
    refreshContext();
    setEntryPanelOpen(false);
    navigateTo("/");
  };

  const handleCompanyEntry = () => {
    setEntryPanelOpen(false);
    navigateTo("/login");
  };

  const handleEcosystemEntry = () => {
    setEntryPanelOpen(false);
    navigateTo("/ecosystem/access");
  };

  const activeOrg = accessContext.activeOrganization;
  const isAuthenticated = accessContext.isAuthenticated && accessContext.authenticatedUserId !== null;
  const isVisitor = accessContext.contextType === "VISITOR";
  const isCompany = accessContext.contextType === "COMPANY";
  const isEcosystem = accessContext.contextType === "ECOSYSTEM_ORGANIZATION";

  return (
    <div id="marineworld-access-context-root" className="relative z-50 font-sans">
      {/* 1. VISIBLE THREE IDENTITY ENTRY BANNER (Prominent when unauthenticated or toggled) */}
      {!isAuthenticated && entryPanelOpen && (
        <div
          id="three-identity-entry-gateway-banner"
          className="bg-slate-900 text-white border-b-2 border-royal py-5 px-4 sm:px-6 shadow-xl transition-all"
        >
          <div className="max-w-7xl mx-auto">
            {/* Header / Intro */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-royal bg-royal/10 border border-royal/30 px-2.5 py-0.5 rounded">
                    MARINEWORLD.CITY
                  </span>
                  <span className="text-xs font-medium text-slate-400">
                    STAGE 3.4 • THREE IDENTITY ENTRY GATEWAY
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white mt-1 tracking-tight">
                  How would you like to enter?
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-dismiss-entry-panel"
                  onClick={() => setEntryPanelOpen(false)}
                  className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded hover:bg-slate-800 transition-colors"
                >
                  Minimize Gateway ✕
                </button>
              </div>
            </div>

            {/* 3 Real Clickable UI Choice Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {/* Option 1: VISITOR */}
              <div
                id="entry-choice-visitor"
                className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-xl p-4 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-200 uppercase tracking-wider">
                      VISITOR
                    </span>
                    <Compass className="w-5 h-5 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Explore MarineWorld.City</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Public discovery and sector exploration. Browse maritime cities, categories, and catalogs without an organization.
                  </p>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-700/60">
                  <button
                    type="button"
                    id="btn-entry-visitor"
                    onClick={handleVisitorEntry}
                    className="w-full py-2.5 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span>CONTINUE AS VISITOR</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Option 2: COMPANY */}
              <div
                id="entry-choice-company"
                className="bg-royal/15 hover:bg-royal/20 border-2 border-royal/50 hover:border-royal rounded-xl p-4 transition-all flex flex-col justify-between relative ring-1 ring-royal/30"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-royal text-white uppercase tracking-wider">
                      COMPANY
                    </span>
                    <Building2 className="w-5 h-5 text-royal" />
                  </div>
                  <h3 className="text-sm font-bold text-white">AI-NATIVE COMPANY</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Login to your company workspace. Autonomous Business Twin, Private AI, Catalogs, and RBAC controls.
                  </p>
                </div>

                <div className="pt-4 mt-3 border-t border-royal/30">
                  <button
                    type="button"
                    id="btn-entry-company"
                    onClick={handleCompanyEntry}
                    className="w-full py-2.5 px-3 rounded-lg bg-royal hover:bg-blue-600 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md"
                  >
                    <span>COMPANY LOGIN</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Option 3: ECOSYSTEM ORGANIZATION */}
              <div
                id="entry-choice-ecosystem"
                className="bg-indigo-950/50 hover:bg-indigo-950/80 border border-indigo-500/40 hover:border-indigo-400 rounded-xl p-4 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-900 border border-indigo-700 text-indigo-200 uppercase tracking-wider">
                      ECOSYSTEM ORGANIZATION
                    </span>
                    <Landmark className="w-5 h-5 text-indigo-300" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Official Organization</h3>
                  <p className="text-xs text-indigo-200/80 mt-1 leading-relaxed">
                    Association / Chamber / Federation / Institution / Public Organization. Official access and member digitalization.
                  </p>
                </div>

                <div className="pt-4 mt-3 border-t border-indigo-500/30">
                  <button
                    type="button"
                    id="btn-entry-ecosystem"
                    onClick={handleEcosystemEntry}
                    className="w-full py-2.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span>OFFICIAL ORGANIZATION ACCESS</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CANONICAL GLOBAL ACCESS CONTEXT BAR (Always displayed at the top) */}
      <div
        id="marineworld-access-context-bar"
        className="border-b border-line bg-mist/95 backdrop-blur-sm text-[12px] font-mono py-1.5 px-4 shadow-sm"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          {/* Left: Active Identity & Organization Indicator */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-mute uppercase tracking-[0.14em] text-[10px] font-semibold">
              Context:
            </span>

            {/* Context Badge */}
            <span
              id="active-context-badge"
              className={`px-2 py-0.5 rounded text-[10.5px] font-bold uppercase tracking-wider ${
                isVisitor
                  ? "bg-slate-200 text-slate-700 border border-slate-300"
                  : isCompany
                  ? "bg-royal/10 text-royal border border-royal/30"
                  : "bg-indigo-100 text-indigo-800 border border-indigo-300"
              }`}
            >
              {accessContext.contextType}
            </span>

            {/* Active Org or Visitor Detail */}
            {activeOrg ? (
              <div className="flex items-center gap-2 text-graphite font-sans text-[12px] font-medium">
                <span id="active-org-name" className="font-bold">
                  {activeOrg.organizationName}
                </span>
                <span
                  id="active-business-id"
                  className="font-mono text-[10.5px] text-mute px-1.5 py-0.2 bg-white rounded border border-line"
                >
                  {activeOrg?.businessId || "N/A"}
                </span>
                <span
                  id="active-role-badge"
                  className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-royal/10 text-royal rounded font-semibold"
                >
                  [{activeOrg.role}]
                </span>
              </div>
            ) : isVisitor && isAuthenticated && accessContext.personalUser ? (
              <span id="visitor-status-label" className="text-stone font-sans text-[12px]">
                Personal Visitor: <strong className="text-graphite font-semibold">{accessContext.personalUser.displayName}</strong>
              </span>
            ) : (
              <span id="visitor-status-label" className="text-stone font-sans text-[12px]">
                Public Individual Exploration
              </span>
            )}
          </div>

          {/* Right: Actions, Entry Triggers & Switchers */}
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            {/* If unauthenticated, show the [ ENTER ] button to toggle the 3 identity options */}
            {!isAuthenticated ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-bar-enter-gateway"
                  onClick={() => setEntryPanelOpen(!entryPanelOpen)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-sans font-bold uppercase tracking-wider transition-colors shadow-sm"
                >
                  <Shield className="w-3 h-3 text-royal" />
                  <span>ENTER</span>
                  {entryPanelOpen ? (
                    <ChevronUp className="w-3 h-3 ml-0.5" />
                  ) : (
                    <ChevronDown className="w-3 h-3 ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  id="btn-bar-login-shortcut"
                  onClick={() => navigateTo("/login")}
                  className="px-2.5 py-1 rounded bg-white hover:bg-linesoft border border-line text-royal font-sans font-bold text-[11px] uppercase tracking-wider transition-colors"
                >
                  Company Login
                </button>

                <button
                  type="button"
                  id="btn-bar-ecosystem-shortcut"
                  onClick={() => navigateTo("/ecosystem/access")}
                  className="px-2.5 py-1 rounded bg-white hover:bg-linesoft border border-line text-indigo-700 font-sans font-bold text-[11px] uppercase tracking-wider transition-colors"
                >
                  Ecosystem
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {/* Authenticated Actions */}
                {isCompany && (
                  <button
                    type="button"
                    id="btn-bar-studio-shortcut"
                    onClick={() => navigateTo("/studio")}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-royal text-white hover:bg-blue-600 text-[11px] font-sans font-bold uppercase tracking-wider transition-colors shadow-sm"
                  >
                    <LayoutDashboard className="w-3 h-3" />
                    <span>Company Studio</span>
                  </button>
                )}

                {isEcosystem && (
                  <button
                    type="button"
                    id="btn-bar-ecosystem-dashboard"
                    onClick={() => navigateTo("/ecosystem/dashboard")}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-700 text-white hover:bg-indigo-800 text-[11px] font-sans font-bold uppercase tracking-wider transition-colors shadow-sm"
                  >
                    <Landmark className="w-3 h-3" />
                    <span>Organization Portal</span>
                  </button>
                )}

                <button
                  type="button"
                  id="btn-bar-signout"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white hover:bg-rose-50 border border-line hover:border-rose-300 text-rose-600 text-[11px] font-mono transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}

            {/* Onboarding Call to Action */}
            <a
              href="/company/onboarding"
              id="btn-bar-onboarding"
              className="hidden lg:inline-flex px-2.5 py-1 rounded bg-royal text-white hover:bg-blue-600 text-[11px] font-sans font-bold uppercase tracking-wider transition-colors shadow-sm"
            >
              CREATE COMPANY
            </a>

            {/* Switcher Dropdown Trigger */}
            <div className="relative">
              <button
                type="button"
                id="btn-bar-switcher-toggle"
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white hover:bg-linesoft border border-line text-graphite text-[11px] font-mono transition-colors"
              >
                <span>Access Context & Switcher</span>
                <span className="text-[9px]">▼</span>
              </button>

              {menuOpen && (
                <div
                  id="dropdown-access-switcher"
                  className="absolute right-0 mt-1.5 w-80 rounded-card-sm border border-line bg-white shadow-xl p-3 z-50 text-graphite font-sans"
                >
                  <div className="border-b border-line pb-2 mb-2">
                    <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-mute">
                      Canonical Entry Choices
                    </div>
                    <div className="mt-1.5 flex flex-col gap-1 text-[12px]">
                      <button
                        type="button"
                        id="dropdown-item-visitor"
                        onClick={handleVisitorEntry}
                        className={`text-left px-2 py-1.5 rounded hover:bg-mist transition-colors flex items-center justify-between ${
                          isVisitor ? "bg-royal/5 text-royal font-bold" : ""
                        }`}
                      >
                        <span>01. Explore MarineWorld</span>
                        <span className="text-[10px] font-mono text-mute">Visitor</span>
                      </button>

                      <button
                        type="button"
                        id="dropdown-item-company"
                        onClick={handleCompanyEntry}
                        className={`text-left px-2 py-1.5 rounded hover:bg-mist transition-colors flex items-center justify-between ${
                          isCompany ? "bg-royal/5 text-royal font-bold" : ""
                        }`}
                      >
                        <span>02. AI-Native Company Login</span>
                        <span className="text-[10px] font-mono text-mute">Company</span>
                      </button>

                      <button
                        type="button"
                        id="dropdown-item-ecosystem"
                        onClick={handleEcosystemEntry}
                        className={`text-left px-2 py-1.5 rounded hover:bg-mist transition-colors flex items-center justify-between ${
                          isEcosystem ? "bg-royal/5 text-royal font-bold" : ""
                        }`}
                      >
                        <span>03. Ecosystem Organization Access</span>
                        <span className="text-[10px] font-mono text-mute">Ecosystem</span>
                      </button>
                    </div>
                  </div>

                  {/* Available Memberships Switcher */}
                  {accessContext.availableMemberships.length > 0 && (
                    <div className="pt-1">
                      <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-mute mb-1.5">
                        Your Active Memberships ({accessContext.availableMemberships.length})
                      </div>
                      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1">
                        {accessContext.availableMemberships.map((m) => (
                          <button
                            key={m.organizationId}
                            type="button"
                            onClick={() => handleSelectOrg(m.organizationId)}
                            className={`text-left p-1.5 rounded text-[11.5px] border transition-colors ${
                              activeOrg?.organizationId === m.organizationId
                                ? "border-royal bg-royal/5 text-royal font-medium"
                                : "border-line hover:bg-mist text-graphite"
                            }`}
                          >
                            <div className="font-bold">{m.organizationName}</div>
                            <div className="font-mono text-[10px] text-mute flex justify-between">
                              <span>{m?.businessId || "N/A"}</span>
                              <span>[{m.role}]</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Demo Auth Persona Switcher */}
                  <div className="border-t border-line mt-2 pt-2">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-mute mb-1">
                      Development Auth Personas
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[10.5px]">
                      <button
                        type="button"
                        onClick={() => handleSwitchUser("usr-owner-001", "owner@argento-marine.com")}
                        className="p-1.5 rounded bg-mist hover:bg-linesoft text-left font-medium"
                      >
                        Owner (Argento)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSwitchUser("usr-admin-002", "admin@argento-marine.com")}
                        className="p-1.5 rounded bg-mist hover:bg-linesoft text-left"
                      >
                        Admin (Argento)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSwitchUser("usr-multi-owner-003", "multi@maritime-group.com")}
                        className="p-1.5 rounded bg-mist hover:bg-linesoft text-left"
                      >
                        Multi-Org Exec
                      </button>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="p-1.5 rounded bg-rose-50 hover:bg-rose-100 text-left text-rose-600 font-bold"
                      >
                        Sign Out (Visitor)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
