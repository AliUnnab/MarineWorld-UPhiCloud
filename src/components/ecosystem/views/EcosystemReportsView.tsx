import React, { useState } from "react";
import {
  FileText,
  Download,
  BarChart3,
  TrendingUp,
  Building2,
  CheckCircle2,
  Check,
  FileSpreadsheet,
} from "lucide-react";
import type {
  EcosystemOrganizationSummary,
  EcosystemMemberRecord,
} from "@/lib/services/ecosystemOrganizationService";

interface EcosystemReportsViewProps {
  organization: EcosystemOrganizationSummary;
  members: EcosystemMemberRecord[];
}

export function EcosystemReportsView({
  organization,
  members,
}: EcosystemReportsViewProps) {
  const [downloadedReport, setDownloadedReport] = useState<string | null>(null);

  const activeCount = members.filter((m) => m.status === "ACTIVE").length;
  const verifiedCount = members.filter((m) => m.verificationStatus === "VERIFIED" || m.status === "VERIFIED").length;
  const totalCount = members.length || organization.totalMembersCount || 150;
  const activePct = Math.round((activeCount / (totalCount || 1)) * 100);

  const sectorCitySet = new Set(members.map((m) => m.sectorCityId));
  const activeSectorCitiesCount = sectorCitySet.size || organization.activeSectorCitiesCount || 9;

  const handleExportCSV = (reportType: string) => {
    const headers = "Member ID,Company Name,Legal Name,Country,City,Sector City,Status,Verification,Email\n";
    const rows = members
      .map(
        (m) =>
          `"${m.memberId}","${m.companyName}","${m.legalName}","${m.country}","${m.city}","${m.sectorCityId}","${m.status}","${m.verificationStatus}","${m.contactEmail}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${organization.slug}-${reportType.toLowerCase().replace(/[^a-z0-9]/g, "-")}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setDownloadedReport(reportType);
    setTimeout(() => setDownloadedReport(null), 2500);
  };

  const reportsList = [
    {
      id: "activation",
      title: "Member Activation & Onboarding Report",
      description: "Complete funnel breakdown of issued codes, sign-ups, created Studio profiles, and active companies.",
      metrics: `${activeCount} / ${totalCount} Active Members (${activePct}%)`,
    },
    {
      id: "verification",
      title: "Accreditation & Verification Compliance Report",
      description: "Accreditation and verification breakdown across member company records.",
      metrics: `${verifiedCount} Verified Entities`,
    },
    {
      id: "sector-city",
      title: "Sector City Footprint Report",
      description: "Distribution of member companies across MarineWorld presence slots.",
      metrics: `${activeSectorCitiesCount} Sector Cities Active`,
    },
    {
      id: "adoption",
      title: "MarineWorld Studio Adoption Report",
      description: "Studio usage metrics, commercial presence tier distribution, and capabilities roster.",
      metrics: `${members.length || totalCount} Member Companies Tracked`,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-royal uppercase tracking-widest mb-1">
            <FileText className="w-4 h-4 text-royal" />
            <span>Institutional Analytics</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            ECOSYSTEM PERFORMANCE REPORTS
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Export official ecosystem performance reports, activation rosters, and accreditation statistics.
          </p>
        </div>

        <button
          onClick={() => handleExportCSV("Full-Ecosystem-Roster")}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer self-start sm:self-center"
        >
          <Download className="w-4 h-4" />
          <span>Export Full Roster (CSV)</span>
        </button>
      </div>

      {/* REPORTS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportsList.map((rpt) => (
          <div
            key={rpt.id}
            className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-royal/5 text-royal flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5 text-royal" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  Official Format
                </span>
              </div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                {rpt.title}
              </h2>
              <p className="text-xs font-medium text-slate-600 leading-relaxed">
                {rpt.description}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 font-mono">
                {rpt.metrics}
              </span>

              <button
                onClick={() => handleExportCSV(rpt.id)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-xl text-xs font-bold text-slate-800 transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                {downloadedReport === rpt.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Exported!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
