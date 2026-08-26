import React from "react";
import {
  ShieldCheck,
  AlertCircle,
  Cpu,
  FileText,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { CompanyOffering, CompanyEntity, DocumentEntity } from "@/lib/types";
import {
  computeOfferingKnowledgeCoverage,
  computeCompanyKnowledgeCoverage,
  type OfferingKnowledgeCoverageResult,
  type CompanyKnowledgeCoverageResult,
} from "@/lib/services/knowledgeCoverageService";

interface OfferingKnowledgeCoverageBadgeProps {
  offering: Partial<CompanyOffering>;
  companyDocs?: DocumentEntity[];
  showDetails?: boolean;
  className?: string;
}

export const OfferingKnowledgeCoverageBadge: React.FC<OfferingKnowledgeCoverageBadgeProps> = ({
  offering,
  companyDocs,
  showDetails = false,
  className = "",
}) => {
  const result: OfferingKnowledgeCoverageResult = computeOfferingKnowledgeCoverage(offering, companyDocs);
  const isGrounded = result.status === "GROUNDED";

  return (
    <div className={`space-y-1.5 ${className}`} id={`offering-coverage-${offering.id || "temp"}`}>
      {/* Primary compact status bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-mono font-bold border shadow-2xs ${
            isGrounded
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-amber-50 text-amber-800 border-amber-200"
          }`}
        >
          {isGrounded ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
          )}
          {isGrounded ? (
            <span>
              {result.coveragePercent}% COVERED • {result.verifiedFactsCount} VERIFIED FACTS • {result.approvedSourcesCount} APPROVED SOURCES
            </span>
          ) : (
            <span>
              KNOWLEDGE INCOMPLETE ({result.coveragePercent}% COVERED)
            </span>
          )}
        </span>

        {/* Linked AI Readiness Pill */}
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-bold border ${
            result.aiReadiness === "AI ADVISOR READY"
              ? "bg-blue-50 text-royal border-blue-200"
              : "bg-slate-100 text-slate-700 border-slate-200"
          }`}
        >
          <Cpu className="w-3 h-3" />
          {result.aiReadiness}
        </span>
      </div>

      {/* If Incomplete & Details Requested or Missing items */}
      {!isGrounded && result.missingRequirements.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono text-amber-800">
          {result.missingRequirements.slice(0, 2).map((item, idx) => (
            <span
              key={idx}
              className="inline-block bg-amber-100/60 px-2 py-0.5 rounded border border-amber-200"
            >
              [{item}]
            </span>
          ))}
          {result.missingRequirements.length > 2 && (
            <span className="text-stone">+{result.missingRequirements.length - 2} more</span>
          )}
        </div>
      )}
    </div>
  );
};

interface CompanyKnowledgeCoverageBadgeProps {
  company: Partial<CompanyEntity>;
  companyDocs?: DocumentEntity[];
  className?: string;
}

export const CompanyKnowledgeCoverageBadge: React.FC<CompanyKnowledgeCoverageBadgeProps> = ({
  company,
  companyDocs,
  className = "",
}) => {
  const result: CompanyKnowledgeCoverageResult = computeCompanyKnowledgeCoverage(company, companyDocs);
  const isGrounded = result.status === "GROUNDED";

  return (
    <div className={`flex items-center gap-2 ${className}`} id={`company-coverage-${company.id || "canonical"}`}>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[10.5px] font-mono font-bold border shadow-2xs ${
          isGrounded
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : "bg-amber-50 text-amber-800 border-amber-200"
        }`}
      >
        {isGrounded ? (
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        ) : (
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        )}
        <span>
          COMPANY KNOWLEDGE: {isGrounded ? "GROUNDED" : "INCOMPLETE"}
        </span>
        <span className="text-[9.5px] opacity-75">
          ({result.groundedSourcesCount} docs • {result.verifiedEntitiesCount} entities)
        </span>
      </span>

      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold border ${
          result.aiReadiness === "AI ADVISOR READY"
            ? "bg-blue-50 text-royal border-blue-200"
            : "bg-slate-100 text-slate-700 border-slate-200"
        }`}
      >
        <Cpu className="w-3 h-3" />
        {result.aiReadiness}
      </span>
    </div>
  );
};
