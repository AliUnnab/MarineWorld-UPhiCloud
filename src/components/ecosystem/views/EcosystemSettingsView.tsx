import React, { useState } from "react";
import {
  Settings,
  UserCheck,
  Shield,
  Bell,
  Check,
  Building2,
  Lock,
  Mail,
  Users,
} from "lucide-react";
import type { EcosystemOrganizationSummary } from "@/lib/services/ecosystemOrganizationService";

interface EcosystemSettingsViewProps {
  organization: EcosystemOrganizationSummary;
}

export function EcosystemSettingsView({
  organization,
}: EcosystemSettingsViewProps) {
  const [saved, setSaved] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"profile" | "enrollment" | "team" | "security">("profile");

  const [principalName, setPrincipalName] = useState(organization.principalAuthorityName);
  const [principalRole, setPrincipalRole] = useState(organization.principalAuthorityRole);
  const [contactEmail, setContactEmail] = useState(organization.officialContactEmail);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const humanRoles = [
    { title: "Executive Director", desc: "Full organization governance & strategic oversight", assigned: principalName },
    { title: "Compliance Commissioner", desc: "Manages member verification & registry clearance", assigned: "Elena Rostova" },
    { title: "Member Services Manager", desc: "Handles enrollment distribution & onboarding support", assigned: "Marcus Van Den Berg" },
    { title: "Ecosystem Observer", desc: "Read-only access to ecosystem metrics & performance reports", assigned: "Dr. Aris Thorne (Audit & Legal Board Chair)" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-royal uppercase tracking-widest mb-1">
            <Settings className="w-4 h-4 text-royal" />
            <span>Governance & Administration</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            ORGANIZATION SETTINGS
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Configure institutional profile, enrollment parameters, human team roles, and security policies.
          </p>
        </div>
      </div>

      {/* SETTINGS SUB-TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab("profile")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "profile"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Organization Profile
        </button>

        <button
          onClick={() => setActiveSubTab("enrollment")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "enrollment"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Enrollment Program
        </button>

        <button
          onClick={() => setActiveSubTab("team")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "team"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Team & Roles
        </button>

        <button
          onClick={() => setActiveSubTab("security")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "security"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Security & Access
        </button>
      </div>

      {/* PROFILE FORM */}
      {activeSubTab === "profile" && (
        <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Organization Display Name
              </label>
              <input
                type="text"
                defaultValue={organization.name}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Legal Entity Name
              </label>
              <input
                type="text"
                defaultValue={organization.legalName}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Principal Authority Name
              </label>
              <input
                type="text"
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Official Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Changes apply instantly to your organization context.
            </span>

            <button
              type="submit"
              className="px-5 py-2.5 bg-royal hover:bg-royal-dark text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              {saved ? <Check className="w-4 h-4" /> : null}
              <span>{saved ? "Settings Saved!" : "Save Changes"}</span>
            </button>
          </div>
        </form>
      )}

      {/* TEAM ROLES */}
      {activeSubTab === "team" && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              HUMAN TEAM ROLES
            </h2>
            <p className="text-xs font-medium text-slate-600 mt-0.5">
              Role-based access permissions for organization executives and compliance officers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {humanRoles.map((role, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900">{role.title}</span>
                  <span className="text-[10px] font-bold text-royal bg-royal/5 px-2 py-0.5 rounded border border-royal/20">
                    Active
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500">{role.desc}</p>
                <div className="pt-2 border-t border-slate-200/60 text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-royal" />
                  <span>Assigned: {role.assigned}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ENROLLMENT CONFIG */}
      {activeSubTab === "enrollment" && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
            ENROLLMENT PROGRAM PARAMETERS
          </h2>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <span className="text-xs font-bold text-slate-700 block">Organization Enrollment Code</span>
            <span className="font-mono text-base font-extrabold text-slate-900 block">{organization.enrollmentCode}</span>
            <p className="text-xs text-slate-500 font-medium">
              Member Benefit Discount: {organization.discountPercentage}% applied to accredited member Studio presence creation.
            </p>
          </div>
        </div>
      )}

      {/* SECURITY */}
      {activeSubTab === "security" && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
            INSTITUTIONAL AUTHENTICATION & SECURITY
          </h2>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Authentication is bound directly to your official email domain (<code className="font-mono font-bold text-royal">@{organization.officialEmailDomain}</code>). Authorization tokens and session credentials are managed via MarineWorld verified session provider.
          </p>
        </div>
      )}
    </div>
  );
}
