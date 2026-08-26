import React, { useState } from "react";
import {
  Users,
  Building2,
  ShieldCheck,
  TrendingUp,
  Globe,
  Copy,
  Check,
  Send,
  ArrowRight,
  Handshake,
  ExternalLink,
  ChevronRight,
  Ticket,
  CheckCircle2,
  Clock,
  UserPlus,
} from "lucide-react";
import type {
  EcosystemOrganizationSummary,
  EcosystemFunnelMetrics,
  EcosystemMemberRecord,
} from "@/lib/services/ecosystemOrganizationService";

interface EcosystemOverviewViewProps {
  organization: EcosystemOrganizationSummary;
  funnelMetrics: EcosystemFunnelMetrics;
  recentMembers: EcosystemMemberRecord[];
  onNavigateTab: (tab: "members" | "enrollment" | "verification" | "insights") => void;
  onNavigateUrl?: (url: string) => void;
  onInviteModalOpen: () => void;
}

export function EcosystemOverviewView({
  organization,
  funnelMetrics,
  recentMembers,
  onNavigateTab,
  onNavigateUrl,
  onInviteModalOpen,
}: EcosystemOverviewViewProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(organization.enrollmentCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const inviteLink = `${window.location.origin}/company/onboarding?ref=${organization.id}&code=${organization.enrollmentCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const activationPercentage = Math.round((funnelMetrics.active / (funnelMetrics.issued || 1)) * 100);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-royal uppercase tracking-widest mb-1">
            <Building2 className="w-4 h-4 text-royal" />
            <span>MarineWorld Ecosystem Hub</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            ECOSYSTEM OVERVIEW
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Manage your organization's members, MarineWorld activation and AI-Native ecosystem presence.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateTab("insights")}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Handshake className="w-3.5 h-3.5 text-royal" />
            <span>Ecosystem Insights</span>
          </button>
          <button
            onClick={onInviteModalOpen}
            className="px-4 py-2.5 rounded-xl bg-royal hover:bg-royal-dark text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite Members</span>
          </button>
        </div>
      </div>

      {/* TOP SEMANTIC METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Members
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {organization.totalMembersCount.toLocaleString()}
          </div>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">
            Accredited entities
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              MarineWorld Companies
            </span>
            <Building2 className="w-4 h-4 text-royal" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {funnelMetrics.companyCreated.toLocaleString()}
          </div>
          <p className="text-[11px] font-semibold text-royal mt-1">
            Created AI-Native Companies
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Verified
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {funnelMetrics.verified.toLocaleString()}
          </div>
          <p className="text-[11px] font-semibold text-emerald-700 mt-1">
            Official accreditation
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Activation
            </span>
            <TrendingUp className="w-4 h-4 text-royal" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {activationPercentage}%
          </div>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">
            Member adoption rate
          </p>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Sector Cities
            </span>
            <Globe className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {organization.activeSectorCitiesCount}
          </div>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">
            Active presence slots
          </p>
        </div>
      </div>

      {/* MEMBER ACTIVATION SECTION */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-royal uppercase tracking-widest mb-1">
              <Ticket className="w-4 h-4 text-royal" />
              <span>Enrollment Program</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              MEMBER ACTIVATION
            </h2>
            <p className="text-xs font-medium text-slate-600 mt-1 max-w-2xl">
              Help your members establish their AI-Native Company inside MarineWorld. Members use your organization's enrollment code or invitation link to unlock Studio access and 20% ecosystem accreditation benefits.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-3.5 py-1.5 rounded-full self-start lg:self-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Enrollment Program Active
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
          {/* ENROLLMENT CODE BOX */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Organization Enrollment Code
                </span>
                <span className="text-[11px] font-bold text-royal bg-royal/5 px-2 py-0.5 rounded border border-royal/20/50">
                  {organization.discountPercentage}% Member Benefit Applied
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 font-mono font-bold text-base text-slate-900 shadow-2xs">
                <span>{organization.enrollmentCode}</span>
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-sans font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500 font-medium">
                Note: This code is an enrollment benefit mechanism for member company creation, not a password.
              </p>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleCopyLink}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? "Link Copied to Clipboard!" : "Copy Invitation Link"}</span>
              </button>

              <button
                onClick={onInviteModalOpen}
                className="px-4 py-2.5 rounded-xl bg-royal hover:bg-royal-dark text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Invite Members</span>
              </button>

              <button
                onClick={() => onNavigateTab("enrollment")}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Program Details</span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>

          {/* ISSUED VS ACTIVATED METRIC COUNTS */}
          <div className="lg:col-span-5 bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 flex flex-col justify-between space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Enrollment Summary
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Issued
                </span>
                <span className="text-lg font-extrabold text-slate-900 block mt-1">
                  {funnelMetrics.issued}
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-royal block">
                  Activated
                </span>
                <span className="text-lg font-extrabold text-royal block mt-1">
                  {funnelMetrics.active}
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Remaining
                </span>
                <span className="text-lg font-extrabold text-slate-700 block mt-1">
                  {funnelMetrics.remaining}
                </span>
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">Member Activation Progress</span>
                <span className="text-royal">{activationPercentage}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-royal h-full rounded-full transition-all duration-500"
                  style={{ width: `${activationPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ACTIVATION FLOW PROGRESSION (FUNNEL) */}
        <div className="mt-8 pt-8 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
            Ecosystem Member Activation Progression
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-center relative">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                1. Invited
              </span>
              <span className="text-xl font-extrabold text-slate-900 block mt-1">
                {funnelMetrics.issued}
              </span>
              <p className="text-[10px] font-medium text-slate-500 mt-0.5">Code Issued</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                2. Registered
              </span>
              <span className="text-xl font-extrabold text-slate-900 block mt-1">
                {funnelMetrics.registered}
              </span>
              <p className="text-[10px] font-medium text-slate-500 mt-0.5">Member Sign-up</p>
            </div>

            <div className="p-4 bg-royal/5 rounded-2xl border border-royal/20 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-royal block">
                3. Company Created
              </span>
              <span className="text-xl font-extrabold text-royal-dark block mt-1">
                {funnelMetrics.companyCreated}
              </span>
              <p className="text-[10px] font-medium text-royal mt-0.5">Studio Onboarded</p>
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                4. Verified
              </span>
              <span className="text-xl font-extrabold text-emerald-950 block mt-1">
                {funnelMetrics.verified}
              </span>
              <p className="text-[10px] font-medium text-emerald-700 mt-0.5">Accredited</p>
            </div>

            <div className="col-span-2 sm:col-span-1 p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl text-center shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                5. Active
              </span>
              <span className="text-xl font-extrabold text-emerald-900 block mt-1">
                {funnelMetrics.active}
              </span>
              <p className="text-[10px] font-medium text-emerald-700 mt-0.5">Operating Presence</p>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT MEMBER ACTIVITY TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              RECENT MEMBER ACTIVITY
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Latest accredited companies connected to your ecosystem
            </p>
          </div>

          <button
            onClick={() => onNavigateTab("members")}
            className="text-xs font-bold text-royal hover:text-royal-dark flex items-center gap-1 cursor-pointer"
          >
            <span>View All Members ({organization.totalMembersCount})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/70">
                <th className="py-3 px-4 rounded-l-xl">Member Company</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Sector City</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Verification</th>
                <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentMembers.slice(0, 6).map((member) => (
                <tr key={member.memberId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                        {member.companyName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{member.companyName}</span>
                          {(member.companyName.includes("#") || /#\d+/.test(member.companyName)) && (
                            <span className="inline-flex items-center text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80" title="Demo record for testing ecosystem workflow">
                              Demo Record
                            </span>
                          )}
                        </div>
                        <span className="block text-[10px] font-medium text-slate-500">{member.contactEmail}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">
                    {member.city}, {member.country}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-royal font-bold">
                    {member.sectorCityId}.city
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        member.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80"
                          : "bg-royal/5 text-royal-dark border border-royal/20"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {member.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{member.verificationStatus === "ACTION_REQUIRED" ? "Action Required" : member.verificationStatus.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => {
                        if (onNavigateUrl) {
                          onNavigateUrl(`/companies/${member.companyId}?fromHub=true&returnTab=overview&orgId=${organization.id}`);
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-lg text-[11px] font-bold text-slate-700 transition-all cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>VIEW COMPANY</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
