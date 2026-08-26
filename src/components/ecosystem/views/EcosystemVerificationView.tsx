import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Building2,
  UserCheck,
  Mail,
  ExternalLink,
  ChevronRight,
  Shield,
  FileCheck,
} from "lucide-react";
import type {
  EcosystemOrganizationSummary,
  EcosystemMemberRecord,
} from "@/lib/services/ecosystemOrganizationService";

interface EcosystemVerificationViewProps {
  organization: EcosystemOrganizationSummary;
  members: EcosystemMemberRecord[];
  onNavigateUrl?: (url: string) => void;
}

export function EcosystemVerificationView({
  organization,
  members,
  onNavigateUrl,
}: EcosystemVerificationViewProps) {
  const [notifiedMemberId, setNotifiedMemberId] = useState<string | null>(null);

  const verifiedMembers = members.filter((m) => m.verificationStatus === "VERIFIED");
  const pendingMembers = members.filter((m) => m.verificationStatus === "PENDING");
  const actionRequiredMembers = members.filter(
    (m) => m.verificationStatus === "INCOMPLETE" || m.verificationStatus === "ACTION_REQUIRED"
  );

  const handleSendReminder = (memberId: string) => {
    setNotifiedMemberId(memberId);
    setTimeout(() => setNotifiedMemberId(null), 2500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-royal uppercase tracking-widest mb-1">
            <ShieldCheck className="w-4 h-4 text-royal" />
            <span>Accreditation & Compliance</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            VERIFICATION
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Monitor organization accreditation status and member verification states across MarineWorld.
          </p>
        </div>
      </div>

      {/* ORGANIZATION ACCREDITATION CARD */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-800 font-bold text-base flex items-center justify-center shrink-0 shadow-xs">
              {organization.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {organization.name}
                </h2>
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-0.5 rounded-full text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Official Organization Verified
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Legal Entity: {organization.legalName} • Business ID: {organization.businessId}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Principal Authority
            </span>
            <span className="text-xs font-extrabold text-slate-900 block">
              {organization.principalAuthorityName}
            </span>
            <span className="text-[11px] font-medium text-slate-500 block">
              {organization.principalAuthorityRole}
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Official Email Domain
            </span>
            <span className="text-xs font-mono font-extrabold text-royal block">
              @{organization.officialEmailDomain}
            </span>
            <span className="text-[11px] font-medium text-slate-500 block">
              {organization.officialContactEmail}
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Accreditation Standard
            </span>
            <span className="text-xs font-extrabold text-slate-900 block">
              Official Ecosystem Registry
            </span>
            <span className="text-[11px] font-medium text-emerald-700 block font-semibold">
              Renewal Date: Dec 2026
            </span>
          </div>
        </div>
      </div>

      {/* MEMBER VERIFICATION BREAKDOWN METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Verified Members
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {verifiedMembers.length}
          </div>
          <p className="text-[11px] font-semibold text-emerald-700 mt-1">
            Full MarineWorld accreditation
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Pending Verification
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {pendingMembers.length}
          </div>
          <p className="text-[11px] font-semibold text-amber-700 mt-1">
            Awaiting registry clearance
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Action Required
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {actionRequiredMembers.length}
          </div>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">
            Incomplete member onboarding
          </p>
        </div>
      </div>

      {/* MEMBERS REQUIRING VERIFICATION ASSISTANCE */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
            MEMBERS AWAITING VERIFICATION
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Send verification reminders or assist members in completing their MarineWorld accreditation.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50">
                <th className="py-3 px-4 rounded-l-xl">Member Company</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Current State</th>
                <th className="py-3 px-4 text-right rounded-r-xl">Verification Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingMembers.slice(0, 8).map((member) => (
                <tr key={member.memberId} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <span className="block">{member.companyName}</span>
                      {(member.companyName.includes("#") || /#\d+/.test(member.companyName)) && (
                        <span className="inline-flex items-center text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80" title="Demo record for testing ecosystem workflow">
                          Demo Record
                        </span>
                      )}
                    </div>
                    <span className="block text-[10px] text-slate-500 font-medium">{member.city}, {member.country}</span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">
                    {member.contactEmail}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      <Clock className="w-3 h-3" />
                      <span>
                        {member.verificationStatus === "ACTION_REQUIRED"
                          ? "Action Required"
                          : member.verificationStatus.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleSendReminder(member.memberId)}
                      className="px-3 py-1.5 bg-royal hover:bg-royal-dark text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      {notifiedMemberId === member.memberId ? (
                        <span>Reminder Dispatched!</span>
                      ) : (
                        <>
                          <Send className="w-3 h-3" />
                          <span>Send Reminder</span>
                        </>
                      )}
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
