import React from "react";
import {
  Compass,
  Building2,
  Landmark,
  Shield,
  ArrowRight,
  Sparkles,
  Users,
  CheckCircle2,
  Lock,
  Globe2,
} from "lucide-react";
import {
  developmentAuthProvider,
  CANONICAL_DEV_NO_ORG,
} from "@/lib/auth/developmentAuthProvider";
import {
  getCurrentAuthSession,
  setCurrentAuthSession,
} from "@/lib/services/securityService";
import {
  setActiveOrganizationContext,
  resolveAccessContext,
} from "@/lib/services/accessContextService";

interface AccessGatewayPageProps {
  onNavigate?: (path: string) => void;
}

export function AccessGatewayPage({ onNavigate }: AccessGatewayPageProps) {
  const navigateTo = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const handleVisitorAccess = () => {
    // Visitor selection: No organization assigned, no Business ID
    const currentAuth = getCurrentAuthSession();
    if (currentAuth.uid) {
      setActiveOrganizationContext(currentAuth.uid, null);
    }
    navigateTo("/");
  };

  const handleCompanyLogin = () => {
    navigateTo("/login");
  };

  const handleOfficialOrganizationAccess = () => {
    navigateTo("/ecosystem/access");
  };

  return (
    <div
      id="marineworld-access-gateway"
      className="min-h-screen bg-canvas text-graphite font-sans antialiased py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center"
    >
      <div className="w-full max-w-5xl space-y-10">
        {/* Brand & Gateway Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-royal/10 border border-royal/20 text-royal text-xs font-mono font-bold tracking-wide">
            <Shield className="w-3.5 h-3.5" />
            <span>MarineWorld.City</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-graphite tracking-tight uppercase">
            ENTER MARINEWORLD
          </h1>

          <p className="text-base text-stone max-w-xl mx-auto font-medium">
            Choose how you want to use MarineWorld.City.
          </p>
        </div>

        {/* 3 Identity Gateway Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 1. VISITOR CARD */}
          <div
            id="gateway-card-visitor"
            className="bg-white border border-line hover:border-royal/40 rounded-2xl p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-slate-100 text-stone uppercase tracking-wider">
                  VISITOR
                </span>
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-stone flex items-center justify-center">
                  <Compass className="w-5 h-5" />
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-graphite">Explore MarineWorld.City</h3>
                <p className="text-xs text-stone mt-2 leading-relaxed">
                  Public exploration of maritime cities, sectors, domains, companies and public intelligence.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-line/60 text-xs text-stone">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Public Sector Cities & Domains</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Browse Public Products & Services</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Public Schema.org Verification Data</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-line/60 space-y-2">
              <button
                id="btn-gateway-visitor"
                onClick={handleVisitorAccess}
                className="w-full py-3 bg-white hover:bg-slate-50 text-graphite border border-line text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
              >
                <span>CONTINUE AS VISITOR</span>
                <ArrowRight className="w-4 h-4 text-stone" />
              </button>
              <button
                id="btn-gateway-visitor-signin"
                onClick={() => navigateTo("/login/personal")}
                className="w-full py-2 text-center text-xs font-semibold text-royal hover:underline transition"
              >
                Personal Visitor Sign In →
              </button>
            </div>
          </div>

          {/* 2. COMPANY CARD */}
          <div
            id="gateway-card-company"
            className="bg-white border-2 border-royal/30 hover:border-royal rounded-2xl p-7 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between relative ring-1 ring-royal/10"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-royal text-white uppercase tracking-wider">
                  COMPANY
                </span>
                <div className="w-10 h-10 rounded-xl bg-royal/10 text-royal flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-graphite">Operate your AI-Native Company</h3>
                <p className="text-xs text-stone mt-2 leading-relaxed">
                  Private Company Studio, AI Advisor, catalogs, Connect and company operations.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-line/60 text-xs text-stone">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-royal shrink-0" />
                  <span>Private Company Studio Operational Desk</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-royal shrink-0" />
                  <span>Autonomous Business Twin & AI Advisor</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-royal shrink-0" />
                  <span>Canonical Catalogs & Commercial Connect</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-line/60">
              <button
                id="btn-gateway-company"
                onClick={handleCompanyLogin}
                className="w-full py-3 bg-royal hover:bg-royal-dark text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
              >
                <span>COMPANY LOGIN</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 3. ECOSYSTEM ORGANIZATION CARD */}
          <div
            id="gateway-card-ecosystem"
            className="bg-white border border-line hover:border-slate-400 rounded-2xl p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 uppercase tracking-wider">
                  ORGANIZATION
                </span>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Landmark className="w-5 h-5" />
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-graphite">Official Organization Access</h3>
                <p className="text-xs text-stone mt-2 leading-relaxed">
                  Associations, chambers, federations, institutions and public organizations.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-line/60 text-xs text-stone">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Verified Ecosystem Organization Dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Member Company Digitalization Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Official Verification & Governance Context</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-line/60">
              <button
                id="btn-gateway-ecosystem"
                onClick={handleOfficialOrganizationAccess}
                className="w-full py-3 bg-indigo-900 hover:bg-indigo-950 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
              >
                <span>ORGANIZATION LOGIN</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Global Navigation Return */}
        <div className="flex items-center justify-between text-xs text-stone pt-4">
          <button
            onClick={() => navigateTo("/")}
            className="hover:text-graphite transition flex items-center gap-1.5 font-semibold"
          >
            ← Return to MarineWorld.City
          </button>
          <span className="text-stone">MarineWorld.City Access Gateway</span>
        </div>
      </div>
    </div>
  );
}
