import React from "react";
import { Eye } from "lucide-react";
import type { CompanyEntity, StudioNavigationModule } from "@/lib/types";

export type RequirementSeverity = "BLOCKER" | "WARNING" | "OPTIONAL";

export interface ReadinessRequirement {
  id: string;
  label: string;
  severity: RequirementSeverity;
  isSatisfied: boolean;
  moduleId: StudioNavigationModule;
  detail?: string;
}

export interface ReadinessSection {
  id: StudioNavigationModule;
  label: string;
  isReady: boolean;
  severity: RequirementSeverity;
  missingItems: string[];
  blockers: string[];
  warnings: string[];
  optional: string[];
  description?: string;
}

export interface CompanyReadinessResult {
  overallScore: number;
  isPublishReady: boolean;
  blockersCount: number;
  warningsCount: number;
  optionalCount: number;
  incompleteActionsCount: number;
  sections: ReadinessSection[];
  allBlockers: ReadinessRequirement[];
  allWarnings: ReadinessRequirement[];
  allOptional: ReadinessRequirement[];
}

export function computeCompanyReadiness(
  company: CompanyEntity | undefined | null,
  productsCount: number,
  servicesCount: number,
  documentsCount: number,
  nodesCount: number,
  capabilitiesCount: number
): CompanyReadinessResult {
  const isCurrentlyLive = company?.status === "ACTIVE" || (company as any)?.operatingStatus === "ACTIVE";

  // 1. Identity (Blocker: legalName, country, city, businessId)
  const idBlockers: string[] = [];
  const idWarnings: string[] = [];
  const idOptional: string[] = [];
  if (!company?.legalName || company.legalName.trim().length < 2) idBlockers.push("Legal Entity Name");
  if (!company?.country || company.country.trim().length < 2) idBlockers.push("Operating Country");
  if (!company?.city || company.city.trim().length < 2) idBlockers.push("Headquarters City");
  if (!company?.businessId) idBlockers.push("MarineWorld Business ID");
  if (!company?.description || company.description.trim().length < 10) idWarnings.push("Detailed Company Description");
  if (!company?.logoUrl) idOptional.push("Company Brand Mark / Logo");
  const identityReady = idBlockers.length === 0 && Boolean(company);

  // 2. Positioning (Blocker: Primary sector, at least 1 capability tag, sector city)
  const posBlockers: string[] = [];
  const posWarnings: string[] = [];
  const posOptional: string[] = [];
  if (!company?.sectorId) posBlockers.push("Primary Sector Selection");
  if (capabilitiesCount === 0) posBlockers.push("At least 1 Capability Tag");
  if (!company?.sectorCityIds || company.sectorCityIds.length === 0) posBlockers.push("Primary Sector City Selection");
  if (capabilitiesCount < 3) posWarnings.push("Recommended 3+ Capability Tags for Discovery");
  const positioningReady = posBlockers.length === 0 && Boolean(company);

  // 3. Presence (Blocker: At least 1 registered presence / headquarters node)
  const presBlockers: string[] = [];
  const presWarnings: string[] = [];
  const presOptional: string[] = [];
  if (nodesCount === 0) presBlockers.push("Headquarters / Operating Node");
  if (nodesCount === 1) posOptional.push("Additional Regional Network Nodes");
  const presenceReady = presBlockers.length === 0;

  // 4. Offerings (INDEPENDENT LIFECYCLE: Never blocks company publication)
  // A company may be live with 0 offerings, draft offerings, or published offerings.
  const offBlockers: string[] = []; // No company blockers from offerings!
  const offWarnings: string[] = [];
  const offOptional: string[] = [];
  const totalOfferings = productsCount + servicesCount;
  if (totalOfferings === 0) {
    offWarnings.push("No published products or services yet (Offerings publish independently)");
  } else {
    offOptional.push("Additional Product / Service Showroom Media");
  }
  const offeringsReady = true; // Offerings never block company publication

  // 5. Knowledge (Grounding sources for Company AI)
  const knowBlockers: string[] = [];
  const knowWarnings: string[] = [];
  const knowOptional: string[] = [];
  if (documentsCount === 0) {
    knowBlockers.push("At least 1 Grounding Document or Verified Source");
  }
  if (documentsCount < 3) {
    knowWarnings.push("Recommended 3+ Grounding Documents for Broad AI Coverage");
  }
  const knowledgeReady = knowBlockers.length === 0;

  // 6. AI (Company AI Operating Layer - Independent from Offering AI)
  const aiBlockers: string[] = [];
  const aiWarnings: string[] = [];
  const aiOptional: string[] = [];
  if (!identityReady || !knowledgeReady) {
    aiBlockers.push("Verified Grounding Baseline for Company AI");
  }
  if (totalOfferings === 0) {
    aiWarnings.push("Offering AI Advisors will activate as offerings are added");
  }
  const aiReady = aiBlockers.length === 0;

  // 7. Digital Presence (Blocker: Canonical URL Slug & Public Surface Resolution)
  const digBlockers: string[] = [];
  const digWarnings: string[] = [];
  const digOptional: string[] = [];
  if (!company?.slug) digBlockers.push("Canonical URL Slug");
  if (!company?.businessId) digBlockers.push("MarineWorld Business ID");
  const digitalPresenceReady = digBlockers.length === 0 && Boolean(company);

  // 8. Publish (Overall Go-Live Readiness)
  const pubBlockers: string[] = [];
  const pubWarnings: string[] = [];
  const pubOptional: string[] = [];
  if (!identityReady) pubBlockers.push("Identity Incomplete");
  if (!positioningReady) pubBlockers.push("Positioning Incomplete");
  if (!presenceReady) pubBlockers.push("Presence Incomplete");
  if (!knowledgeReady) pubBlockers.push("Knowledge Grounding Incomplete");
  if (!aiReady) pubBlockers.push("Company AI Layer Incomplete");
  if (!digitalPresenceReady) pubBlockers.push("Digital Presence Incomplete");
  if (offWarnings.length > 0) pubWarnings.push(...offWarnings);
  const publishReady = pubBlockers.length === 0 && Boolean(company);

  const sections: ReadinessSection[] = [
    {
      id: "IDENTITY",
      label: "01 Identity",
      isReady: identityReady,
      severity: "BLOCKER",
      missingItems: [...idBlockers, ...idWarnings],
      blockers: idBlockers,
      warnings: idWarnings,
      optional: idOptional,
      description: "Verified legal entity, operating location & business identifier.",
    },
    {
      id: "POSITIONING",
      label: "02 Positioning",
      isReady: positioningReady,
      severity: "BLOCKER",
      missingItems: [...posBlockers, ...posWarnings],
      blockers: posBlockers,
      warnings: posWarnings,
      optional: posOptional,
      description: "Sector domain, taxonomy classification & verified capability tags.",
    },
    {
      id: "PRESENCE",
      label: "03 Presence",
      isReady: presenceReady,
      severity: "BLOCKER",
      missingItems: [...presBlockers, ...presWarnings],
      blockers: presBlockers,
      warnings: presWarnings,
      optional: presOptional,
      description: "Headquarters node & physical/operational facilities mapping.",
    },
    {
      id: "OFFERINGS",
      label: "04 Offerings",
      isReady: totalOfferings > 0 || isCurrentlyLive,
      severity: "WARNING",
      missingItems: offWarnings,
      blockers: offBlockers,
      warnings: offWarnings,
      optional: offOptional,
      description: "Products & services follow independent lifecycle; optional for initial go-live.",
    },
    {
      id: "KNOWLEDGE",
      label: "05 Knowledge",
      isReady: knowledgeReady,
      severity: "BLOCKER",
      missingItems: [...knowBlockers, ...knowWarnings],
      blockers: knowBlockers,
      warnings: knowWarnings,
      optional: knowOptional,
      description: "Sovereign knowledge space & grounding sources for company intelligence.",
    },
    {
      id: "AI",
      label: "06 AI",
      isReady: aiReady,
      severity: "BLOCKER",
      missingItems: [...aiBlockers, ...aiWarnings],
      blockers: aiBlockers,
      warnings: aiWarnings,
      optional: aiOptional,
      description: "Company-level AI operating layer & sovereign grounding boundary.",
    },
    {
      id: "DIGITAL_PRESENCE",
      label: "07 Digital Presence",
      isReady: digitalPresenceReady,
      severity: "BLOCKER",
      missingItems: [...digBlockers, ...digWarnings],
      blockers: digBlockers,
      warnings: digWarnings,
      optional: digOptional,
      description: "Canonical URL resolution, structured metadata & public web surface.",
    },
    {
      id: "PUBLISH",
      label: "08 Publish",
      isReady: publishReady || isCurrentlyLive,
      severity: "BLOCKER",
      missingItems: isCurrentlyLive ? pubWarnings : [...pubBlockers, ...pubWarnings],
      blockers: isCurrentlyLive ? [] : pubBlockers,
      warnings: pubWarnings,
      optional: pubOptional,
      description: "Production go-live verification, live operational status & controls.",
    },
  ];

  // Compile global requirement lists
  const allBlockers: ReadinessRequirement[] = [];
  const allWarnings: ReadinessRequirement[] = [];
  const allOptional: ReadinessRequirement[] = [];

  sections.forEach((sec) => {
    sec.blockers.forEach((b, idx) => {
      allBlockers.push({
        id: `${sec.id}-blocker-${idx}`,
        label: b,
        severity: "BLOCKER",
        isSatisfied: false,
        moduleId: sec.id,
        detail: `Required for ${sec.label}`,
      });
    });
    sec.warnings.forEach((w, idx) => {
      allWarnings.push({
        id: `${sec.id}-warning-${idx}`,
        label: w,
        severity: "WARNING",
        isSatisfied: false,
        moduleId: sec.id,
        detail: `Recommended for ${sec.label}`,
      });
    });
    sec.optional.forEach((o, idx) => {
      allOptional.push({
        id: `${sec.id}-optional-${idx}`,
        label: o,
        severity: "OPTIONAL",
        isSatisfied: false,
        moduleId: sec.id,
        detail: `Optional enhancement for ${sec.label}`,
      });
    });
  });

  const blockersCount = isCurrentlyLive ? 0 : allBlockers.length;
  const warningsCount = allWarnings.length;
  const optionalCount = allOptional.length;
  const incompleteActionsCount = blockersCount + warningsCount;

  // Compute readiness score
  const coreReadySections = sections.filter((s) => s.blockers.length === 0).length;
  const overallScore = isCurrentlyLive
    ? 100
    : Math.round((coreReadySections / sections.length) * 100);

  return {
    overallScore,
    isPublishReady: publishReady || isCurrentlyLive,
    blockersCount,
    warningsCount,
    optionalCount,
    incompleteActionsCount,
    sections,
    allBlockers,
    allWarnings,
    allOptional,
  };
}

interface CompanyStudioReadinessBarProps {
  readiness: CompanyReadinessResult;
  activeModule: StudioNavigationModule;
  onNavigateToModule: (mod: StudioNavigationModule) => void;
  onOpenPreview: () => void;
}

export const CompanyStudioReadinessBar: React.FC<CompanyStudioReadinessBarProps> = ({
  readiness,
  activeModule,
  onNavigateToModule,
  onOpenPreview,
}) => {
  return (
    <div
      id="studio-readiness-bar"
      className="bg-white border border-line rounded-xl px-4 py-2 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3"
    >
      {/* Left: Compact Readiness Status & Optional Actions Counter */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
              readiness.isPublishReady
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-sky-50 text-sky-800 border-sky-200"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                readiness.isPublishReady ? "bg-emerald-500" : "bg-sky-500"
              }`}
            />
            <span>
              {readiness.isPublishReady
                ? "CORE SETUP COMPLETE"
                : `SETUP PROGRESS: ${readiness.overallScore}%`}
            </span>
          </span>
        </div>

        {readiness.incompleteActionsCount > 0 && (
          <>
            <div className="h-3.5 w-px bg-line" />

            <div className="text-[11px] font-medium text-stone flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shrink-0" />
              <span className="font-bold text-amber-900 uppercase text-[10px] tracking-wide font-mono">
                {readiness.incompleteActionsCount}{" "}
                {readiness.incompleteActionsCount === 1
                  ? "RECOMMENDED ACTION"
                  : "RECOMMENDED ACTIONS"}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Middle: Sequence Progress Navigator (01 - 08) */}
      <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
        {readiness.sections.map((sec) => {
          const isActive = activeModule === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => onNavigateToModule(sec.id)}
              className={`px-2 py-1 rounded-md text-[10px] font-mono font-medium transition flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                isActive
                  ? "bg-royal text-white font-bold shadow-2xs"
                  : sec.isReady
                  ? "bg-canvas text-stone hover:text-graphite hover:bg-mist border border-emerald-300/70"
                  : "bg-canvas text-stone hover:text-graphite hover:bg-mist border border-line/60"
              }`}
              title={sec.isReady ? `${sec.label}: Ready` : `${sec.label}: Missing ${sec.missingItems.join(", ")}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isActive
                    ? "bg-white"
                    : sec.isReady
                    ? "bg-emerald-600"
                    : "bg-amber-400"
                }`}
              />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right: Preview Live Company Action */}
      <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto">
        <button
          type="button"
          id="studio-btn-preview-presence"
          onClick={onOpenPreview}
          className="px-2.5 py-1.5 rounded-lg bg-mist hover:bg-linesoft text-graphite text-[11px] font-bold border border-line flex items-center gap-1.5 transition"
        >
          <Eye className="w-3.5 h-3.5 text-royal" />
          <span>Preview Live Company</span>
        </button>
      </div>
    </div>
  );
};
