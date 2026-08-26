import React, { useState } from "react";
import {
  Ticket,
  Copy,
  Check,
  Send,
  Users,
  Building2,
  ShieldCheck,
  Handshake,
  Link,
  Gift,
  CheckCircle2,
  UserPlus,
  Mail,
  ArrowRight,
} from "lucide-react";
import type {
  EcosystemOrganizationSummary,
  EcosystemFunnelMetrics,
} from "@/lib/services/ecosystemOrganizationService";

interface EcosystemEnrollmentViewProps {
  organization: EcosystemOrganizationSummary;
  funnelMetrics: EcosystemFunnelMetrics;
  onInviteModalOpen: () => void;
}

export function EcosystemEnrollmentView({
  organization,
  funnelMetrics,
  onInviteModalOpen,
}: EcosystemEnrollmentViewProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [customCandidate, setCustomCandidate] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const inviteLink = `${window.location.origin}/company/onboarding?ref=${organization.id}&code=${organization.enrollmentCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(organization.enrollmentCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink || inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleGenerateLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCandidate.trim()) return;
    const slugParam = encodeURIComponent(customCandidate.trim().toLowerCase().replace(/[^a-z0-9]/g, "-"));
    const link = `${window.location.origin}/company/onboarding?ref=${organization.id}&candidate=${slugParam}&code=${organization.enrollmentCode}`;
    setGeneratedLink(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-royal uppercase tracking-widest mb-1">
            <Ticket className="w-4 h-4 text-royal" />
            <span>MarineWorld Enrollment Program</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            ENROLLMENT
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Help your members bring their AI-Native Company inside MarineWorld with your institutional accreditation discount.
          </p>
        </div>

        <button
          onClick={onInviteModalOpen}
          className="px-4 py-2.5 rounded-xl bg-royal hover:bg-royal-dark text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer self-start sm:self-center"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Member Company</span>
        </button>
      </div>

      {/* ENROLLMENT BENEFIT BANNER */}
      <div className="bg-royal/5 border border-royal/20/90 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-royal/10 text-royal-dark text-xs font-bold uppercase tracking-wider border border-royal/20">
              <Gift className="w-3.5 h-3.5 text-royal" />
              Member Benefit Active
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {organization.discountPercentage}% Ecosystem Accreditation & Studio Access Benefit
            </h2>
            <p className="text-xs sm:text-sm text-slate-700 font-medium">
              Every accredited member of {organization.name} qualifies for instant AI-Native Company creation, verified presence slot discount, and Studio Operating System setup under your organization code.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center shrink-0 min-w-[200px] shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Enrollment Code
            </span>
            <span className="font-mono text-xl font-extrabold text-slate-900 block my-1">
              {organization.enrollmentCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="mt-2 w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              {copiedCode ? "Copied!" : "Copy Code"}
            </button>
          </div>
        </div>
      </div>

      {/* LINK GENERATOR & INVITATION SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LINK GENERATOR */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Link className="w-5 h-5 text-royal" />
              <span>CUSTOM MEMBER INVITATION LINK</span>
            </h2>
            <p className="text-xs font-medium text-slate-600 mt-1">
              Generate a personalized onboarding invitation link for a specific member company name.
            </p>
          </div>

          <form onSubmit={handleGenerateLink} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Candidate Member Company Name
              </label>
              <input
                type="text"
                value={customCandidate}
                onChange={(e) => setCustomCandidate(e.target.value)}
                placeholder="e.g. Aegean Shipping Logistics"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-royal focus:bg-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              Generate Customized Link
            </button>
          </form>

          {generatedLink && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 animate-in fade-in">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                Generated Invitation URL
              </span>
              <div className="p-3 bg-white border border-slate-200 rounded-xl font-mono text-xs text-royal break-all">
                {generatedLink}
              </div>
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-royal hover:bg-royal-dark text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer mt-2"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? "Copied!" : "Copy URL"}</span>
              </button>
            </div>
          )}
        </div>

        {/* METRICS & FUNNEL STEPS */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
            ACTIVATION FUNNEL
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-xs font-bold text-slate-700">Invitations Issued</span>
              <span className="text-sm font-extrabold text-slate-900">{funnelMetrics.issued}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-xs font-bold text-slate-700">Registrations Completed</span>
              <span className="text-sm font-extrabold text-slate-900">{funnelMetrics.registered}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-royal/5 rounded-2xl border border-royal/20">
              <span className="text-xs font-bold text-royal-dark">Companies Created</span>
              <span className="text-sm font-extrabold text-royal-dark">{funnelMetrics.companyCreated}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200/80">
              <span className="text-xs font-bold text-emerald-900">Verified Accreditation</span>
              <span className="text-sm font-extrabold text-emerald-950">{funnelMetrics.verified}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
