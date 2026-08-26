import React, { useState } from "react";
import {
  Building2,
  ShieldCheck,
  Mail,
  KeyRound,
  ArrowRight,
  Handshake,
  Globe,
  Users,
  Layers,
  Lock,
  ChevronLeft,
  AlertCircle,
  Copy,
  Check,
  BadgeCheck,
} from "lucide-react";
import { LogoMark } from "@/components/digione/icons";
import {
  registerNewOrganization,
  activateOrganizationHub,
  signInToOrganizationHub,
  getEcosystemOrganizations,
  switchOrganizationContext,
  type EcosystemOrganizationSummary,
} from "@/lib/services/ecosystemOrganizationService";
import type { OrganizationEntityType } from "@/lib/types";

export type EntryFlowState = "LANDING" | "SIGN_IN" | "CREATE_ORG" | "CHECK_EMAIL" | "ACTIVATE_HUB";

interface EcosystemEntryPageProps {
  onSuccess: (org: EcosystemOrganizationSummary) => void;
  onNavigateUrl?: (path: string) => void;
}

export function EcosystemEntryPage({ onSuccess, onNavigateUrl }: EcosystemEntryPageProps) {
  const [flowState, setFlowState] = useState<EntryFlowState>("LANDING");

  // Registration Form State
  const [orgType, setOrgType] = useState<OrganizationEntityType>("ASSOCIATION");
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [country, setCountry] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");
  const [officialWebsite, setOfficialWebsite] = useState("");
  const [repName, setRepName] = useState("");
  const [repRole, setRepRole] = useState("");
  const [primaryContact, setPrimaryContact] = useState("");

  // Sign In State
  const [signInEmail, setSignInEmail] = useState("");
  const [signInCode, setSignInCode] = useState("");

  // Activation State
  const [actEmail, setActEmail] = useState("");
  const [actCode, setActCode] = useState("");
  const [actRepName, setActRepName] = useState("");

  // Active Pending Organization State
  const [pendingOrg, setPendingOrg] = useState<EcosystemOrganizationSummary | null>(null);
  const [pendingActivationCode, setPendingActivationCode] = useState<string>("");

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Handle Registration Submit
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = registerNewOrganization({
        organizationType: orgType,
        name,
        legalName: legalName || name,
        country: country || "International",
        officialEmail,
        officialWebsite,
        representativeName: repName,
        representativeRole: repRole || "Executive Representative",
        primaryContact,
      });

      setIsLoading(false);

      if (res.success) {
        setPendingOrg(res.organization);
        setPendingActivationCode(res.activationCode);
        setActEmail(res.organization.officialContactEmail);
        setActCode(res.activationCode);
        setActRepName(res.organization.principalAuthorityName);
        setFlowState("CHECK_EMAIL");
      } else {
        setErrorMsg(res.message || "Failed to register organization.");
      }
    }, 500);
  };

  // Handle Activation Submit
  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = activateOrganizationHub({
        officialEmail: actEmail || officialEmail,
        activationCode: actCode || pendingActivationCode,
        representativeName: actRepName || repName,
      });

      setIsLoading(false);

      if (res.success && res.organization) {
        onSuccess(res.organization);
      } else {
        setErrorMsg(res.message || "Activation failed. Please check your activation code.");
      }
    }, 600);
  };

  // Handle Sign In Submit
  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = signInToOrganizationHub({
        officialEmail: signInEmail,
        passwordOrCode: signInCode,
      });

      setIsLoading(false);

      if (res.success && res.organization) {
        onSuccess(res.organization);
      } else if (res.isPendingActivation && res.organization) {
        setPendingOrg(res.organization);
        setActEmail(res.organization.officialContactEmail);
        setActCode(res.organization.activationCode || "");
        setFlowState("ACTIVATE_HUB");
        setErrorMsg("Your organization is pending activation. Please verify your activation code below.");
      } else {
        setErrorMsg(res.message || "Sign in failed. No active Hub found.");
      }
    }, 500);
  };

  const handleCopyCode = () => {
    if (pendingActivationCode) {
      navigator.clipboard.writeText(pendingActivationCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFC] text-slate-900 flex flex-col justify-between selection:bg-[#0D3868] selection:text-white relative overflow-hidden font-sans bg-blueprint">
      {/* TOP MARINEWORLD CORPORATE HEADER */}
      <header className="relative z-10 border-b border-slate-200/90 bg-white/90 backdrop-blur-md px-6 py-4 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 text-white flex items-center justify-center shrink-0 shadow-md border border-royal/40/30 ring-2 ring-royal/40/10"
              title="Verified Ecosystem Trust Seal"
            >
              <LogoMark className="w-5 h-5 text-slate-100" />
              <ShieldCheck className="w-4 h-4 text-emerald-400 absolute -bottom-1 -right-1 fill-slate-950 stroke-[2.5] drop-shadow-xs" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  MarineWorld.City
                </span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-mono font-bold uppercase border border-emerald-200/80 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Verified Ecosystem Trust Seal
                </span>
              </div>
              <h1 className="text-sm font-extrabold tracking-tight text-slate-900 uppercase">
                Ecosystem Hub
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold">
            {flowState !== "LANDING" && (
              <button
                onClick={() => {
                  setErrorMsg(null);
                  setFlowState("LANDING");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Return to Entry</span>
              </button>
            )}

            {onNavigateUrl && (
              <button
                onClick={() => onNavigateUrl("/")}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-all cursor-pointer text-xs font-bold shadow-xs"
              >
                <span>Back to MarineWorld</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center">
        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-900 font-medium animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-rose-950">Authentication / Access Notice</p>
              <p className="mt-0.5 text-rose-800">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 1: LANDING ENTRY SCREEN */}
        {/* ============================================================ */}
        {flowState === "LANDING" && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-royal/5 border border-royal/20 text-[#0D3868] text-xs font-bold uppercase tracking-wider">
                <Handshake className="w-3.5 h-3.5 text-[#0D3868]" />
                <span>Institutional Operating Environment</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                MarineWorld Ecosystem Hub
              </h2>

              <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
                The institutional operating portal for Associations, Port Authorities, Chambers of Commerce, Federations, and Marine Research Institutions.
              </p>
            </div>

            {/* TWO PRIMARY PATHWAYS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* PATH 1: SIGN IN */}
              <div className="bg-white border border-slate-200/90 hover:border-royal/40/80 rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-xl group relative overflow-hidden">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-royal/5 border border-royal/20 text-[#0D3868] flex items-center justify-center font-bold">
                    <Lock className="w-6 h-6" />
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#0D3868]">
                      Returning Representatives
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">
                      Already Have an Ecosystem Hub?
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Sign in to your organization's verified institutional workspace to manage members, issue enrollment codes, and access ecosystem intelligence.
                    </p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setErrorMsg(null);
                      setFlowState("SIGN_IN");
                    }}
                    className="w-full py-3.5 px-5 bg-[#0D3868] hover:bg-royal-dark text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer group-hover:gap-3"
                  >
                    <span>SIGN IN TO YOUR ECOSYSTEM HUB</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* PATH 2: CREATE ORGANIZATION */}
              <div className="bg-white border border-slate-200/90 hover:border-slate-400 rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-xl group relative overflow-hidden">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center font-bold">
                    <Building2 className="w-6 h-6" />
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      New Organizations
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">
                      Create Your Organization
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Establish your organization's official AI-Native presence and member ecosystem inside MarineWorld Sector Cities.
                    </p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setErrorMsg(null);
                      setFlowState("CREATE_ORG");
                    }}
                    className="w-full py-3.5 px-5 bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer group-hover:gap-3"
                  >
                    <span>CREATE YOUR ORGANIZATION</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* INSTITUTIONAL VALUE BADGES */}
            <div className="max-w-4xl mx-auto pt-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 text-center space-y-1 shadow-2xs">
                <Users className="w-4 h-4 text-[#0D3868] mx-auto" />
                <p className="text-xs font-bold text-slate-900">Member Onboarding</p>
                <p className="text-[10px] text-slate-500 font-medium">Unique Enrollment Codes</p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 text-center space-y-1 shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-slate-900">Verified Status</p>
                <p className="text-[10px] text-slate-500 font-medium">Accredited Credentials</p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 text-center space-y-1 shadow-2xs">
                <Globe className="w-4 h-4 text-amber-600 mx-auto" />
                <p className="text-xs font-bold text-slate-900">Sector Cities</p>
                <p className="text-[10px] text-slate-500 font-medium">18 Maritime Hubs</p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 text-center space-y-1 shadow-2xs">
                <Layers className="w-4 h-4 text-purple-600 mx-auto" />
                <p className="text-xs font-bold text-slate-900">AI Analytics</p>
                <p className="text-[10px] text-slate-500 font-medium">Ecosystem Intelligence</p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: SIGN IN TO EXISTING HUB */}
        {/* ============================================================ */}
        {flowState === "SIGN_IN" && (
          <div className="max-w-2xl mx-auto w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl animate-in fade-in duration-200">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#0D3868]">
                Institutional Authentication
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Sign In to Ecosystem Hub
              </h2>
              <p className="text-xs text-slate-500">
                Select an active ecosystem organization or enter your official contact email to authenticate.
              </p>
            </div>

            {/* QUICK SELECTION OF ACTIVE CANONICAL & REGISTERED ORGANIZATIONS */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Select Active Ecosystem Hub (1-Click Access)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                {getEcosystemOrganizations().map((org) => (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => {
                      setIsLoading(true);
                      setTimeout(() => {
                        const res = switchOrganizationContext(org.id);
                        setIsLoading(false);
                        if (res.success && res.organization) {
                          onSuccess(res.organization);
                        }
                      }, 300);
                    }}
                    className="p-3 bg-slate-50 hover:bg-royal/5/80 border border-slate-200 hover:border-royal/30 rounded-2xl text-left transition-all group flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-[#0D3868] line-clamp-1">
                          {org.name}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase shrink-0">
                          {org.organizationType.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {org.country} • {org.totalMembersCount.toLocaleString()} Members
                      </p>
                    </div>
                    <div className="mt-2 text-[10px] font-bold text-[#0D3868] flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <span>Enter Hub</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 font-bold text-[10px]">
                  Or Sign In via Official Email
                </span>
              </div>
            </div>

            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Official Organization Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="directorate@maritime-association.org"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0D3868] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Password / Access Credentials
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={signInCode}
                    onChange={(e) => setSignInCode(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0D3868] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#0D3868] hover:bg-royal-dark text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Authenticating Tenant...</span>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>SIGN IN TO ECOSYSTEM HUB →</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100 text-center space-y-2">
              <p className="text-xs text-slate-500">
                New organization?{" "}
                <button
                  onClick={() => {
                    setErrorMsg(null);
                    setFlowState("CREATE_ORG");
                  }}
                  className="text-[#0D3868] font-bold hover:underline cursor-pointer"
                >
                  Create Your Organization
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 3: CREATE YOUR ORGANIZATION FORM */}
        {/* ============================================================ */}
        {flowState === "CREATE_ORG" && (
          <div className="max-w-2xl mx-auto w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl animate-in fade-in duration-200">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#0D3868]">
                Organization Registration
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Create Your Organization
              </h2>
              <p className="text-xs text-slate-500">
                Establish your organization's official AI-Native presence and member ecosystem inside MarineWorld.
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Organization Type *
                  </label>
                  <select
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value as OrganizationEntityType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0D3868] focus:bg-white cursor-pointer"
                  >
                    <option value="ASSOCIATION">Association</option>
                    <option value="CHAMBER">Chamber of Commerce</option>
                    <option value="FEDERATION">Federation</option>
                    <option value="PUBLIC_ORGANIZATION">Port Authority / Sovereign Body</option>
                    <option value="INSTITUTION">Research Institution / Academic</option>
                    <option value="COMPANY">Industry Organization</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Country of Incorporation / HQ *
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. Belgium, Netherlands, Singapore"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0D3868] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Organization Display Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. European Shipowners Association"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0D3868] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Official Legal Entity Name
                </label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="e.g. European Community Shipowners' Associations AISBL"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0D3868] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Official Contact Email *
                  </label>
                  <input
                    type="email"
                    value={officialEmail}
                    onChange={(e) => setOfficialEmail(e.target.value)}
                    placeholder="secretariat@organization.org"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0D3868] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Official Website URL
                  </label>
                  <input
                    type="url"
                    value={officialWebsite}
                    onChange={(e) => setOfficialWebsite(e.target.value)}
                    placeholder="https://www.organization.org"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0D3868] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Authorized Representative Name *
                  </label>
                  <input
                    type="text"
                    value={repName}
                    onChange={(e) => setRepName(e.target.value)}
                    placeholder="e.g. Sotiris Raptis"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0D3868] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Representative Official Role *
                  </label>
                  <input
                    type="text"
                    value={repRole}
                    onChange={(e) => setRepRole(e.target.value)}
                    placeholder="e.g. Secretary General"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0D3868] focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-[#0D3868] hover:bg-royal-dark text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <span>Registering Organization Access...</span>
                ) : (
                  <>
                    <Building2 className="w-4 h-4" />
                    <span>REQUEST ORGANIZATION ACCESS →</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 4: CHECK OFFICIAL EMAIL / ACTIVATION SIMULATOR */}
        {/* ============================================================ */}
        {flowState === "CHECK_EMAIL" && pendingOrg && (
          <div className="max-w-xl mx-auto w-full space-y-6 animate-in fade-in duration-200">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center">
                <Mail className="w-6 h-6" />
              </div>

              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Check Your Official Email
              </h2>

              <p className="text-xs text-slate-600">
                We've dispatched an activation message with your Organization Activation Code to:{" "}
                <span className="text-slate-900 font-mono font-bold">{pendingOrg.officialContactEmail}</span>
              </p>
            </div>

            {/* INTERACTIVE SIMULATED EMAIL CARD */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-4 shadow-xl relative">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-[#0D3868]" />
                  <span className="font-bold text-slate-900">MarineWorld Official Activation Dispatch</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Just Now</span>
              </div>

              <div className="space-y-3">
                <div className="text-xs text-slate-600">
                  <p className="font-bold text-slate-900">Subject: MarineWorld Ecosystem Hub Activation Code</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">To: {pendingOrg.principalAuthorityName} &lt;{pendingOrg.officialContactEmail}&gt;</p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                  <p className="text-xs text-slate-700">
                    Welcome <span className="font-bold text-slate-900">{pendingOrg.name}</span>. Your organization registration has been approved. Use the Organization Activation Code below to establish your Hub:
                  </p>

                  <div className="p-3 bg-white border border-royal/20/90 rounded-xl flex items-center justify-between shadow-2xs">
                    <div>
                      <p className="text-[10px] uppercase font-mono font-bold text-slate-500">Organization Activation Code</p>
                      <p className="text-lg font-mono font-black text-[#0D3868] tracking-wider mt-0.5">{pendingActivationCode}</p>
                    </div>

                    <button
                      onClick={handleCopyCode}
                      className="px-3 py-1.5 rounded-lg bg-royal/5 hover:bg-royal/10 text-[#0D3868] border border-royal/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? "Copied" : "Copy Code"}</span>
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setFlowState("ACTIVATE_HUB")}
                className="w-full py-3.5 bg-[#0D3868] hover:bg-royal-dark text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <span>ACTIVATE ECOSYSTEM HUB NOW →</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 5: ACTIVATE ECOSYSTEM HUB */}
        {/* ============================================================ */}
        {flowState === "ACTIVATE_HUB" && (
          <div className="max-w-md mx-auto w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl animate-in fade-in duration-200">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                Activation & Tenant Creation
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Activate Your Ecosystem Hub
              </h2>
              <p className="text-xs text-slate-500">
                Enter your official activation code to create your organization's Ecosystem Hub tenant.
              </p>
            </div>

            <form onSubmit={handleActivate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  value={actEmail}
                  onChange={(e) => setActEmail(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0D3868] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Organization Activation Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={actCode}
                    onChange={(e) => setActCode(e.target.value)}
                    placeholder="MW-ORG-XXXX-YYYY"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#0D3868] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Representative Name
                </label>
                <input
                  type="text"
                  value={actRepName}
                  onChange={(e) => setActRepName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0D3868] focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Activating Ecosystem Hub...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>VERIFY & CREATE HUB →</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-slate-200/80 bg-white/80 px-6 py-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <p>© 2026 MarineWorld.City Ecosystem Portal.</p>
            <span className="hidden sm:inline text-slate-300">|</span>
            <a
              href="https://uphi.cloud"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-slate-900 transition-colors font-medium"
            >
              <span className="font-bold text-slate-800">UPhi.Cloud</span> — AI-Native Industry & Enterprise Platform
            </a>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-medium text-slate-500">
            <span>Tenant State Isolation</span>
            <span>•</span>
            <span>IMO & Admiralty Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
