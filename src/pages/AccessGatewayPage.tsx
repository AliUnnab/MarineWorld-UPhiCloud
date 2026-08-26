import React, { useState, useEffect } from "react";
import {
  Compass,
  Building2,
  Landmark,
  Shield,
  ArrowRight,
  Check,
  UserCheck,
} from "lucide-react";
import {
  getCurrentAuthSession,
} from "@/lib/services/securityService";
import {
  setActiveOrganizationContext,
  resolveAccessContext,
} from "@/lib/services/accessContextService";

interface AccessGatewayPageProps {
  onNavigate?: (path: string) => void;
}

export function AccessGatewayPage({ onNavigate }: AccessGatewayPageProps) {
  const [authSession, setAuthSession] = useState(() => getCurrentAuthSession());

  useEffect(() => {
    setAuthSession(getCurrentAuthSession());
  }, []);

  const navigateTo = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleVisitorAccess = () => {
    // Visitor selection: No private organization assigned
    const currentAuth = getCurrentAuthSession();
    if (currentAuth.uid) {
      setActiveOrganizationContext(currentAuth.uid, null);
    }
    navigateTo("/");
  };

  const handleCompanyStudioAccess = () => {
    const access = resolveAccessContext();
    if (access.isAuthenticated && (access.contextType === "COMPANY" || access.activeOrganization?.companyId)) {
      navigateTo("/studio");
    } else {
      navigateTo("/login");
    }
  };

  const handleOfficialOrganizationAccess = () => {
    const access = resolveAccessContext();
    if (access.isAuthenticated && access.contextType === "ECOSYSTEM_ORGANIZATION") {
      navigateTo("/ecosystem/dashboard");
    } else {
      navigateTo("/ecosystem/access");
    }
  };

  const accessCtx = resolveAccessContext();
  const isLoggedIn = !!authSession?.uid;

  return (
    <div
      id="marineworld-access-gateway"
      className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center"
    >
      <div className="w-full max-w-5xl space-y-10">
        {/* Brand & Gateway Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-mono font-bold tracking-wider uppercase">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>MarineWorld.City</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight uppercase">
            ENTER MARINEWORLD
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto font-normal">
            Choose how you want to use MarineWorld.City.
          </p>
        </div>

        {/* 3 Core Access Gateway Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* CARD 1: VISITOR */}
          <div
            id="gateway-card-visitor"
            className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-6 sm:p-7 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-700 uppercase tracking-wider">
                  VISITOR
                </span>
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Compass className="w-4.5 h-4.5" />
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
                  Explore MarineWorld.City
                </h2>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed font-light">
                  Explore public sector cities, companies, services and industry intelligence across MarineWorld.City.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[2.5]" />
                  <span>Public Sector Cities & Domains</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[2.5]" />
                  <span>Public Companies & Services</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[2.5]" />
                  <span>Public Verification & Industry Data</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 space-y-3">
              <button
                id="btn-gateway-visitor"
                type="button"
                onClick={handleVisitorAccess}
                className="w-full min-h-[48px] px-4 py-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 hover:border-slate-300 text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-2xs focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <span>CONTINUE AS VISITOR</span>
                <ArrowRight className="w-4 h-4 text-slate-600" />
              </button>

              <button
                id="btn-gateway-visitor-signin"
                type="button"
                onClick={() => navigateTo("/login/personal")}
                className="w-full min-h-[36px] py-1.5 text-center text-xs font-semibold text-blue-600 hover:text-blue-800 transition flex items-center justify-center gap-1"
              >
                <span>Sign in as visitor</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>

          {/* CARD 2: AI-NATIVE COMPANY (PRIMARY BUSINESS OPERATING ENTRY) */}
          <div
            id="gateway-card-company"
            className="bg-white border-2 border-blue-600/30 hover:border-blue-600 rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between relative ring-1 ring-blue-600/10"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-blue-600 text-white uppercase tracking-wider">
                  AI-NATIVE COMPANY
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-4.5 h-4.5" />
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
                  Operate Your AI-Native Company
                </h2>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed font-light">
                  Access your private Company Studio, company profile, services, commercial presence and AI-powered company operations.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[2.5]" />
                  <span>Private Company Studio</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[2.5]" />
                  <span>Company Profile & Verification</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[2.5]" />
                  <span>Services, Products & Commercial Presence</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[2.5]" />
                  <span>Company AI & Operational Tools</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 space-y-3">
              <button
                id="btn-gateway-company"
                type="button"
                onClick={handleCompanyStudioAccess}
                className="w-full min-h-[48px] px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span>ENTER COMPANY STUDIO</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                id="btn-gateway-company-register"
                type="button"
                onClick={() => navigateTo("/company/onboarding")}
                className="w-full min-h-[36px] py-1.5 text-center text-xs font-semibold text-blue-600 hover:text-blue-800 transition flex items-center justify-center gap-1"
              >
                <span>Create / register company</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>

          {/* CARD 3: ORGANIZATION */}
          <div
            id="gateway-card-organization"
            className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-6 sm:p-7 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-700 uppercase tracking-wider">
                  ORGANIZATION
                </span>
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Landmark className="w-4.5 h-4.5" />
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
                  Official Organization Access
                </h2>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed font-light">
                  Access organization-level tools for associations, chambers, federations, authorities and other verified institutions.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[2.5]" />
                  <span>Organization Workspace</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[2.5]" />
                  <span>Verified Ecosystem & Member Management</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[2.5]" />
                  <span>Institutional Verification & Governance</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[2.5]" />
                  <span>Organization-Level Industry Context</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 space-y-3">
              <button
                id="btn-gateway-organization"
                type="button"
                onClick={handleOfficialOrganizationAccess}
                className="w-full min-h-[48px] px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-2xs focus:outline-none focus:ring-2 focus:ring-slate-700"
              >
                <span>ENTER ORGANIZATION</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                id="btn-gateway-organization-request"
                type="button"
                onClick={() => navigateTo("/ecosystem/onboarding")}
                className="w-full min-h-[36px] py-1.5 text-center text-xs font-semibold text-blue-600 hover:text-blue-800 transition flex items-center justify-center gap-1"
              >
                <span>Request organization access</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>

        {/* Account State Helper */}
        <div className="text-center pt-2">
          {isLoggedIn ? (
            <div className="inline-flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-full shadow-2xs">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Signed in as <strong className="font-semibold text-slate-900">{authSession.email}</strong>
              </span>
              <span className="text-slate-300">·</span>
              <button
                onClick={() => {
                  const access = resolveAccessContext();
                  if (access.contextType === "COMPANY" || access.activeOrganization?.companyId) {
                    navigateTo("/studio");
                  } else if (access.contextType === "ECOSYSTEM_ORGANIZATION") {
                    navigateTo("/ecosystem/dashboard");
                  } else {
                    navigateTo("/workspace");
                  }
                }}
                className="font-bold text-blue-600 hover:text-blue-800 transition"
              >
                Resume Session →
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-600">
              <span>Already have a MarineWorld.City account? </span>
              <button
                onClick={() => navigateTo("/login")}
                className="font-bold uppercase tracking-wider text-blue-600 hover:text-blue-800 hover:underline transition"
              >
                SIGN IN →
              </button>
            </div>
          )}
        </div>

        {/* Minimal Global Footer */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-6 border-t border-slate-200">
          <button
            onClick={() => navigateTo("/")}
            className="hover:text-slate-900 transition flex items-center gap-1.5 font-medium"
          >
            ← Return to MarineWorld.City
          </button>
          <span className="text-slate-400 font-mono text-[11px]">
            MarineWorld.City Access Gateway
          </span>
        </div>
      </div>
    </div>
  );
}
