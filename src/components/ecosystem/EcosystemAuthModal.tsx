import React, { useState } from "react";
import {
  ShieldCheck,
  Building2,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  X,
  AlertCircle,
  CheckCircle2,
  Users,
  Globe,
} from "lucide-react";
import { LogoMark } from "@/components/digione/icons";
import {
  getEcosystemOrganizations,
  switchOrganizationContext,
  verifyOfficialDevelopmentAccess,
  type EcosystemOrganizationSummary,
} from "@/lib/services/ecosystemOrganizationService";

interface EcosystemAuthModalProps {
  isOpen: boolean;
  currentOrgId?: string;
  onClose?: () => void;
  onSuccess: (org: EcosystemOrganizationSummary) => void;
}

export function EcosystemAuthModal({
  isOpen,
  currentOrgId,
  onClose,
  onSuccess,
}: EcosystemAuthModalProps) {
  const organizations = getEcosystemOrganizations();
  const [selectedOrgId, setSelectedOrgId] = useState(
    currentOrgId || organizations[0]?.id || "maritime-association"
  );
  const [mode, setMode] = useState<"SWITCHER" | "CREDENTIALS">("SWITCHER");
  const [officialEmail, setOfficialEmail] = useState(
    organizations[0]?.officialContactEmail || "directorate@maritime-association.org"
  );
  const [verificationCode, setVerificationCode] = useState(
    organizations[0]?.enrollmentCode || "MW-WMA-8F42"
  );
  const [representativeName, setRepresentativeName] = useState(
    organizations[0]?.principalAuthorityName || "Capt. Alexander Vance"
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectAndSwitch = (orgId: string) => {
    setErrorMsg(null);
    setIsVerifying(true);

    setTimeout(() => {
      const res = switchOrganizationContext(orgId);
      setIsVerifying(false);

      if (res.success && res.organization) {
        onSuccess(res.organization);
        if (onClose) onClose();
      } else {
        setErrorMsg(res.message || "Failed to switch organization context.");
      }
    }, 300);
  };

  const handleOrgChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      setOfficialEmail(org.officialContactEmail);
      setVerificationCode(org.enrollmentCode);
      setRepresentativeName(org.principalAuthorityName);
    }
  };

  const handleVerifyCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsVerifying(true);

    setTimeout(() => {
      const res = verifyOfficialDevelopmentAccess({
        organizationId: selectedOrgId,
        officialEmail,
        verificationCode,
        representativeName,
      });

      setIsVerifying(false);

      if (res.success && res.organization) {
        onSuccess(res.organization);
        if (onClose) onClose();
      } else {
        setErrorMsg(res.message || "Access verification failed. Check official credentials.");
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 relative overflow-hidden max-h-[90vh] flex flex-col">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* HEADER */}
        <div className="space-y-1 shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 text-white flex items-center justify-center shrink-0 shadow-md border border-royal/40/30 ring-2 ring-royal/40/10"
              title="Verified Ecosystem Trust Seal"
            >
              <LogoMark className="h-5 w-5 text-slate-100" />
              <ShieldCheck className="w-4 h-4 text-emerald-400 absolute -bottom-1 -right-1 fill-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
                MarineWorld.City
              </span>
              <span className="text-xs font-extrabold text-slate-900 uppercase flex items-center gap-1">
                Ecosystem Hub Switcher
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              </span>
            </div>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Switch Organization Context
          </h2>
          <p className="text-xs font-medium text-slate-600">
            Select an active ecosystem organization to switch your institutional workspace context.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-800 font-bold shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* MODE TOGGLE */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2 shrink-0">
          <button
            onClick={() => setMode("SWITCHER")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === "SWITCHER"
                ? "bg-[#0D3868] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Active Organizations ({organizations.length})
          </button>
          <button
            onClick={() => setMode("CREDENTIALS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === "CREDENTIALS"
                ? "bg-[#0D3868] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Verify Credentials
          </button>
        </div>

        {/* MODE 1: ORGANIZATIONS LIST */}
        {mode === "SWITCHER" && (
          <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            {organizations.map((org) => {
              const isCurrent = org.id === currentOrgId;
              return (
                <div
                  key={org.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCurrent
                      ? "bg-royal/5 border-royal/30 ring-2 ring-royal/40/20"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-slate-900">
                        {org.name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase border border-slate-200">
                        {org.organizationType.replace(/_/g, " ")}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Active Context
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium flex-wrap">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {org.totalMembersCount.toLocaleString()} Members
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        {org.country}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-[11px] text-slate-600">
                        {org.officialContactEmail}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectAndSwitch(org.id)}
                    disabled={isVerifying || isCurrent}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer ${
                      isCurrent
                        ? "bg-slate-200 text-slate-500 cursor-default"
                        : "bg-[#0D3868] hover:bg-royal-dark text-white shadow-sm"
                    }`}
                  >
                    <span>{isCurrent ? "Currently Active" : "Switch Context"}</span>
                    {!isCurrent && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* MODE 2: CREDENTIALS FORM */}
        {mode === "CREDENTIALS" && (
          <form onSubmit={handleVerifyCredentials} className="space-y-4 overflow-y-auto pr-1 flex-1">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Select Official Organization Entity
              </label>
              <select
                value={selectedOrgId}
                onChange={(e) => handleOrgChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal focus:bg-white cursor-pointer"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.organizationType})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Official Contact Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={officialEmail}
                  onChange={(e) => setOfficialEmail(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Representative Name
                </label>
                <input
                  type="text"
                  value={representativeName}
                  onChange={(e) => setRepresentativeName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Development Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="MW-OFFICIAL-2026"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <p className="text-[11px] font-medium text-slate-500">
              For development access, use code <code className="font-mono font-bold text-royal">MW-OFFICIAL-2026</code> or your organization code.
            </p>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3 bg-[#0D3868] hover:bg-royal-dark text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isVerifying ? (
                <span>Verifying Institutional Access...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify & Enter Ecosystem Hub</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
