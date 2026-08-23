import React, { useState } from "react";
import { getCurrentAuthUser } from "@/lib/auth/authAdapter";
import { getAllCompanyRecords } from "@/lib/repositories/companyRepository";
import { CompanyStudioBillingView, BillingSubView } from "@/components/studio/CompanyStudioBillingView";
import {
  Building2,
  Receipt,
  ArrowLeft,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export function MarineWorldBillingPage({
  initialSubView = "OVERVIEW",
  agreementId,
  onNavigate,
}: {
  initialSubView?: BillingSubView;
  agreementId?: string;
  onNavigate?: (path: string) => void;
}) {
  const auth = getCurrentAuthUser();
  const allCompanies = getAllCompanyRecords();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    allCompanies[0]?.id || "company-argento-marine-global"
  );

  const selectedCompany = allCompanies.find((c) => c.id === selectedCompanyId) || allCompanies[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* TOP NAVIGATION BAR - Institutional Light */}
      <header className="bg-white border-b border-slate-200 text-slate-900 px-6 py-4 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="/studio"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" /> Company Studio
            </a>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Receipt className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm tracking-tight text-slate-900">
                MarineWorld Institutional Billing & Finance Center
              </span>
            </div>
          </div>

          {/* TENANT SELECTOR / SWITCHER */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:inline">Organization Context:</span>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 transition shadow-xs"
            >
              {allCompanies.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.displayName} ({comp.id})
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <CompanyStudioBillingView
          companyId={selectedCompanyId}
          memberRole="OWNER"
          userEmail={auth.email || "finance@argentomarine.com"}
          initialSubView={initialSubView}
          initialAgreementId={agreementId}
          onNavigateToAgreement={(agrId) => {
            if (onNavigate) {
              onNavigate(`/billing/${agrId}`);
            } else {
              window.history.pushState({}, "", `/billing/${agrId}`);
            }
          }}
        />
      </main>
    </div>
  );
}
