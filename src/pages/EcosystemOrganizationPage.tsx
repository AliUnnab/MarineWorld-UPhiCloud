import React, { useState, useEffect } from "react";
import {
  Landmark,
  Shield,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Copy,
  Check,
  Send,
  Building2,
  Users,
  Award,
  Sparkles,
  ExternalLink,
  ChevronRight,
  LogOut,
  RefreshCw,
  Lock,
  KeyRound,
  Mail,
  UserCheck,
} from "lucide-react";
import {
  getEcosystemOrganizations,
  getEcosystemOrganizationById,
  getEcosystemDigitalizationOverview,
  verifyOfficialDevelopmentAccess,
  generateMemberOnboardingInvitation,
  type EcosystemOrganizationSummary,
  type EcosystemDigitalizationOverview,
} from "@/lib/services/ecosystemOrganizationService";
import {
  getCurrentAuthSession,
  setCurrentAuthSession,
  signOutCurrentUser,
  subscribeAuthState,
  type AuthContext,
} from "@/lib/services/securityService";
import {
  getActiveOrganizationContext,
  getUserMemberships,
  setActiveOrganizationContext,
  resolveAccessContext,
} from "@/lib/services/accessContextService";
import type { OrganizationEntityType } from "@/lib/types";

interface EcosystemOrganizationPageProps {
  onNavigate?: (path: string) => void;
}

export function EcosystemOrganizationPage({ onNavigate }: EcosystemOrganizationPageProps) {
  const navigateTo = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const organizations = getEcosystemOrganizations();
  const [selectedOrgId, setSelectedOrgId] = useState<string>(organizations[0]?.id || "maritime-association");
  const [officialEmail, setOfficialEmail] = useState<string>("directorate@maritime-association.org");
  const [verificationCode, setVerificationCode] = useState<string>("MW-OFFICIAL-2026");
  const [representativeName, setRepresentativeName] = useState<string>("Capt. Alexander Vance");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active verified ecosystem state
  const [activeOrg, setActiveOrg] = useState<EcosystemOrganizationSummary | null>(null);
  const [digitalizationData, setDigitalizationData] = useState<EcosystemDigitalizationOverview | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Invite candidate state
  const [inviteCompanyName, setInviteCompanyName] = useState<string>("");
  const [inviteGeneratedUrl, setInviteGeneratedUrl] = useState<string | null>(null);

  // Resolve active ecosystem context on mount / auth change
  const refreshContext = () => {
    const currentAuth = getCurrentAuthSession();
    if (!currentAuth.uid) {
      setActiveOrg(null);
      setDigitalizationData(null);
      return;
    }

    const activeCtx = getActiveOrganizationContext(currentAuth.uid);
    const ecosystemTypes: OrganizationEntityType[] = [
      "ASSOCIATION",
      "CHAMBER",
      "FEDERATION",
      "INSTITUTION",
      "PUBLIC_ORGANIZATION",
    ];

    if (activeCtx && ecosystemTypes.includes(activeCtx.organizationType)) {
      const org = getEcosystemOrganizationById(activeCtx.organizationId);
      if (org) {
        setActiveOrg(org);
        const data = getEcosystemDigitalizationOverview(org.id);
        setDigitalizationData(data || null);
        return;
      }
    }

    setActiveOrg(null);
    setDigitalizationData(null);
  };

  useEffect(() => {
    refreshContext();
    const unsub = subscribeAuthState(() => {
      refreshContext();
    });
    return () => unsub();
  }, []);

  const handleOrgSelectionChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    const org = getEcosystemOrganizationById(orgId);
    if (org) {
      setOfficialEmail(org.officialContactEmail);
      setRepresentativeName(org.principalAuthorityName);
    }
  };

  const handleVerifyAccess = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsVerifying(true);

    setTimeout(() => {
      try {
        const codeToUse = verificationCode.trim() || "MW-OFFICIAL-2026";
        const emailToUse = officialEmail.trim() || "directorate@maritime-association.org";
        const repToUse = representativeName.trim() || "Capt. Alexander Vance";

        const res = verifyOfficialDevelopmentAccess({
          organizationId: selectedOrgId,
          officialEmail: emailToUse,
          verificationCode: codeToUse,
          representativeName: repToUse,
        });

        if (res.success && res.organization) {
          setActiveOrg(res.organization);
          const data = getEcosystemDigitalizationOverview(res.organization.id);
          setDigitalizationData(data || null);
        } else {
          setErrorMessage(res.message || "Invalid credentials or authorization code.");
        }
      } catch (err: any) {
        setErrorMessage(err?.message || "Failed to verify official access.");
      } finally {
        setIsVerifying(false);
      }
    }, 200);
  };

  const handleCopyDiscount = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleGenerateInvite = (companyName: string) => {
    if (!activeOrg || !companyName.trim()) return;
    const inv = generateMemberOnboardingInvitation(activeOrg.id, companyName.trim());
    setInviteGeneratedUrl(inv.inviteUrl);
  };

  const handleSignOut = async () => {
    const currentAuth = getCurrentAuthSession();
    if (currentAuth.uid) {
      setActiveOrganizationContext(currentAuth.uid, null);
    }
    await signOutCurrentUser();
    setActiveOrg(null);
    setDigitalizationData(null);
    navigateTo("/gateway");
  };

  return (
    <div
      id="ecosystem-organization-page"
      className="min-h-screen bg-canvas text-graphite font-sans antialiased py-10 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5" />
                <span>OFFICIAL ORGANIZATION PORTAL</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-graphite tracking-tight">
              Official Ecosystem Organization Access
            </h1>
            <p className="text-xs text-stone">
              Maritime Associations, Chambers of Commerce, Shipping Federations, Port Authorities &amp; Research Institutes.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigateTo("/gateway")}
              className="text-xs font-semibold text-stone hover:text-graphite px-3 py-2 border border-line rounded-lg bg-white hover:bg-slate-50 transition"
            >
              Gateway Directory
            </button>
            {activeOrg && (
              <button
                onClick={handleSignOut}
                className="text-xs font-semibold text-rose-700 hover:text-rose-800 px-3 py-2 border border-rose-200 rounded-lg bg-rose-50 hover:bg-rose-100 transition flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* If Verified Ecosystem Org Context is Active -> Render Ecosystem Dashboard */}
        {activeOrg && digitalizationData ? (
          <div id="ecosystem-dashboard" className="space-y-8">
            {/* Organization Identity Card */}
            <div className="bg-white border-2 border-indigo-100 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-line">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-900 text-white flex items-center justify-center font-bold text-2xl shadow-sm shrink-0">
                    <Landmark className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-bold text-graphite">{activeOrg.name}</h2>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                        {activeOrg.organizationType}
                      </span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>VERIFIED ECOSYSTEM ENTITY</span>
                      </span>
                    </div>
                    <p className="text-xs text-stone font-mono">{activeOrg.legalName}</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-line rounded-xl p-3.5 text-right font-mono space-y-1 shrink-0">
                  <div className="text-[10px] text-stone uppercase tracking-wider">ORGANIZATION BUSINESS ID</div>
                  <div className="text-xs font-bold text-graphite">{activeOrg.businessId}</div>
                  <div className="text-[11px] text-indigo-700">{activeOrg.slug}.marineworld.city</div>
                </div>
              </div>

              {/* Principal Authority & Digitalization Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-line space-y-1">
                  <div className="text-[11px] text-stone font-mono uppercase">Authorized Representative</div>
                  <div className="text-sm font-bold text-graphite">{activeOrg.principalAuthorityName}</div>
                  <div className="text-[11px] text-stone truncate">{activeOrg.officialContactEmail}</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-line space-y-1">
                  <div className="text-[11px] text-stone font-mono uppercase">Total Member Fleet</div>
                  <div className="text-2xl font-bold text-indigo-900">{(digitalizationData as any).totalMemberCount || (digitalizationData as any).totalCount || 0}</div>
                  <div className="text-[11px] text-stone">Affiliated Maritime Companies</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-line space-y-1">
                  <div className="text-[11px] text-stone font-mono uppercase">Digitalized Members</div>
                  <div className="text-2xl font-bold text-emerald-700">{(digitalizationData as any).digitalizedMemberCount || digitalizationData.digitalizedCount}</div>
                  <div className="text-[11px] text-emerald-700 font-semibold">{(digitalizationData as any).digitalizationRate || (digitalizationData as any).digitalizationPercentage || 0}% Adoption Rate</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-line space-y-1">
                  <div className="text-[11px] text-stone font-mono uppercase">Active Verified Services</div>
                  <div className="text-2xl font-bold text-graphite">{(digitalizationData as any).verifiedActiveServices || 0}</div>
                  <div className="text-[11px] text-stone">Catalogued in MarineWorld</div>
                </div>
              </div>
            </div>

            {/* Member Digitalization Progress List */}
            <div className="bg-white border border-line rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-4">
                <div>
                  <h3 className="text-lg font-bold text-graphite">Member Company Digitalization Progress</h3>
                  <p className="text-xs text-stone">Track AI-Native Company onboarding and verification across your affiliated network.</p>
                </div>
              </div>

              <div className="divide-y divide-line/60">
                {digitalizationData.memberCompanies.map((comp: any) => (
                  <div key={comp.companyId} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-graphite">{comp.companyName || comp.displayName || comp.companyId}</span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-stone">
                          {comp.businessId}
                        </span>
                      </div>
                      <div className="text-xs text-stone flex items-center gap-2">
                        <span>Sector: {comp.cityId || comp.sectorCityId || "General"}</span>
                        <span>•</span>
                        <span>Plan: {comp.planCode || "STANDARD"}</span>
                        <span>•</span>
                        <span>Stage: {comp.onboardingStep || 1}/7</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded ${
                        (comp.lifecycleStatus || comp.status) === "ACTIVE" || (comp.lifecycleStatus || comp.status) === "LIVE"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-amber-50 text-amber-800 border border-amber-200"
                      }`}>
                        {comp.lifecycleStatus || comp.status || "ACTIVE"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ecosystem Member Invitation Tool */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-graphite">Invite &amp; Endorse Member Company</h3>
                <p className="text-xs text-stone">
                  Generate an authorized onboarding link applying the official {activeOrg.discountPercentage}% ecosystem member benefit code ({activeOrg.discountCode}).
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <input
                  type="text"
                  value={inviteCompanyName}
                  onChange={(e) => setInviteCompanyName(e.target.value)}
                  placeholder="Enter Member Enterprise or Shipyard Name..."
                  className="flex-1 px-4 py-2.5 bg-white border border-indigo-200 rounded-xl text-xs text-graphite focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <button
                  type="button"
                  onClick={() => handleGenerateInvite(inviteCompanyName)}
                  disabled={!inviteCompanyName.trim()}
                  className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-950 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shrink-0 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>Generate Member Invitation</span>
                </button>
              </div>

              {inviteGeneratedUrl && (
                <div className="bg-white border border-indigo-200 rounded-xl p-4 text-xs space-y-2 mt-3">
                  <div className="text-[11px] font-mono text-stone font-semibold">DIRECT ONBOARDING LINK:</div>
                  <div className="flex items-center justify-between gap-2 font-mono text-xs text-indigo-900 bg-slate-50 p-2.5 rounded-lg border border-line">
                    <span className="truncate">{window.location.origin}{inviteGeneratedUrl}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyDiscount(`${window.location.origin}${inviteGeneratedUrl}`)}
                      className="text-indigo-700 hover:text-indigo-900 font-bold px-2 py-1 rounded hover:bg-indigo-50 transition shrink-0"
                    >
                      {copiedCode ? "Copied!" : "Copy Link"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Official Access Portal Form */
          <div id="ecosystem-verification-form" className="max-w-xl mx-auto space-y-6">
            <div className="bg-white border border-line rounded-2xl p-7 sm:p-9 shadow-sm space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 mx-auto flex items-center justify-center">
                  <Landmark className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-graphite">Official Organization Portal</h2>
                <p className="text-xs text-stone">
                  Sign in with your registered maritime association, port authority, or public institutional credentials.
                </p>
              </div>

              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleVerifyAccess} className="space-y-4">
                {/* 1. Select Organization */}
                <div className="space-y-1.5">
                  <label htmlFor="select-ecosystem-org" className="block text-xs font-semibold text-graphite uppercase tracking-wider">
                    Official Organization
                  </label>
                  <select
                    id="select-ecosystem-org"
                    value={selectedOrgId}
                    onChange={(e) => handleOrgSelectionChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-line rounded-xl text-xs text-graphite font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
                  >
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.organizationType})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Official Directorate Email */}
                <div className="space-y-1.5">
                  <label htmlFor="input-official-email" className="block text-xs font-semibold text-graphite uppercase tracking-wider">
                    Official Directorate Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="input-official-email"
                      type="email"
                      value={officialEmail}
                      onChange={(e) => setOfficialEmail(e.target.value)}
                      placeholder="directorate@organization.org"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-line rounded-xl text-xs text-graphite font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
                    />
                  </div>
                </div>

                {/* 3. Authorized Representative */}
                <div className="space-y-1.5">
                  <label htmlFor="input-representative-name" className="block text-xs font-semibold text-graphite uppercase tracking-wider">
                    Authorized Representative Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <input
                      id="input-representative-name"
                      type="text"
                      value={representativeName}
                      onChange={(e) => setRepresentativeName(e.target.value)}
                      placeholder="e.g. Capt. Alexander Vance"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-line rounded-xl text-xs text-graphite font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
                    />
                  </div>
                </div>

                {/* 4. Organization Access Key */}
                <div className="space-y-1.5">
                  <label htmlFor="input-verification-code" className="block text-xs font-semibold text-graphite uppercase tracking-wider">
                    Organization Security Key / Code
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      id="input-verification-code"
                      type="password"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="Enter organization security code"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-line rounded-xl text-xs font-medium text-graphite focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    id="btn-verify-ecosystem-access"
                    type="submit"
                    disabled={isVerifying}
                    className="w-full py-3 bg-indigo-900 hover:bg-indigo-950 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isVerifying ? (
                      <span>Verifying Institutional Credentials...</span>
                    ) : (
                      <>
                        <span>VERIFY &amp; ACCESS DASHBOARD</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
