import React, { useState } from "react";
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Radio,
  ArrowRight,
  Building2,
  Bot,
  Layers,
  Send,
  Eye,
  Copy,
  Check,
  Share2,
  Info,
  HelpCircle,
  Zap,
} from "lucide-react";
import type { CompanyEntity, StudioNavigationModule } from "@/lib/types";
import { getCompanyById, saveCompany, getCompanyNodes } from "@/lib/services/companyService";
import { buildCanonicalCompanyUrl, getShortCanonicalCompanyUrl } from "@/lib/services/companyIdentityService";
import type { CompanyReadinessResult } from "./CompanyStudioReadinessBar";
import { getCompanyRecordSync } from "@/lib/repositories/companyRepository";
import { countActiveOfferings, getCompanyOfferings } from "@/lib/services/offeringEntityService";
import { ShareProtocolModal } from "@/components/company/ShareProtocolModal";
import { recordPublishAudit } from "@/lib/services/auditService";

interface CompanyStudioPublishViewProps {
  companyId: string;
  readiness: CompanyReadinessResult;
  onNavigateToModule: (mod: StudioNavigationModule) => void;
  onOpenPreview: () => void;
  onPublished?: () => void;
}

export const CompanyStudioPublishView: React.FC<CompanyStudioPublishViewProps> = ({
  companyId,
  readiness,
  onNavigateToModule,
  onOpenPreview,
  onPublished,
}) => {
  const canonicalCompany =
    getCompanyById(companyId) ||
    (getCompanyRecordSync(companyId) as unknown as CompanyEntity);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const slug = canonicalCompany?.slug || companyId;
  const isCurrentlyLive =
    canonicalCompany?.status === "ACTIVE" ||
    (canonicalCompany as any)?.operatingStatus === "ACTIVE";

  const canonicalUrl = buildCanonicalCompanyUrl(canonicalCompany);
  const shortCanonicalUrl = getShortCanonicalCompanyUrl(canonicalCompany);

  // Retrieve active offerings and nodes
  const allOfferings = canonicalCompany ? getCompanyOfferings(canonicalCompany.id || companyId) : [];
  const publishedOfferingsCount = allOfferings.filter(
    (o) => (o.status as string)?.toUpperCase() === "ACTIVE" || (o.status as string)?.toUpperCase() === "PUBLISHED"
  ).length;
  const draftOfferingsCount = allOfferings.filter(
    (o) => (o.status as string)?.toUpperCase() === "DRAFT"
  ).length;
  const archivedOfferingsCount = allOfferings.filter(
    (o) => (o.status as string)?.toUpperCase() === "ARCHIVED"
  ).length;

  const nodes = canonicalCompany ? getCompanyNodes(canonicalCompany.id || companyId) : [];
  const activeNodesCount = nodes.length > 0 ? nodes.length : 1;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(canonicalUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handlePublish = () => {
    setIsPublishing(true);
    setTimeout(() => {
      if (canonicalCompany) {
        const previousStatus = canonicalCompany.status;
        const updated: CompanyEntity = {
          ...canonicalCompany,
          status: "ACTIVE",
          verificationStatus: canonicalCompany.verificationStatus || "VERIFIED",
          updatedAt: new Date().toISOString(),
        };
        saveCompany(updated);

        recordPublishAudit(
          canonicalCompany.id || companyId,
          "COMPANY_PUBLISHED",
          canonicalCompany.id || companyId,
          {
            previous: { status: previousStatus },
            next: { status: "ACTIVE" },
          },
          "Published company profile and operational digital presence to MarineWorld ecosystem"
        );
      }
      setIsPublishing(false);
      setPublishSuccess(true);
      if (onPublished) onPublished();
    }, 1200);
  };

  const companyStatusLabel = isCurrentlyLive
    ? "LIVE & VERIFIED"
    : readiness.isPublishReady
    ? "READY TO PUBLISH"
    : "DRAFT IN SETUP";

  return (
    <div className="space-y-6" id="module-publish-view">
      {/* SECTION 1: Operational Header & Current Production Status */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-royal/10 text-royal uppercase tracking-wider">
              08 — PUBLISH
            </span>
            <span className="text-xs font-bold text-graphite uppercase tracking-wider">
              Company Status & Go-Live Control
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 ${
                isCurrentlyLive
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : readiness.isPublishReady
                  ? "bg-royal/10 text-royal border border-royal/20"
                  : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isCurrentlyLive
                    ? "bg-emerald-500 animate-pulse"
                    : readiness.isPublishReady
                    ? "bg-royal"
                    : "bg-amber-500"
                }`}
              />
              {companyStatusLabel}
            </span>
          </div>
        </div>

        {/* Current Production Status Facts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-canvas border border-line/70 space-y-1">
            <div className="text-[10px] font-bold text-stone uppercase tracking-wider">
              Company Status
            </div>
            <div className="font-bold text-graphite flex items-center gap-1.5 text-sm">
              {isCurrentlyLive ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-emerald-800">Live & Verified</span>
                </>
              ) : readiness.isPublishReady ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-royal shrink-0" />
                  <span className="text-royal">Ready to Go Live</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-amber-800">Setup in Progress</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-stone">
              {isCurrentlyLive
                ? "Active on MarineWorld.City network"
                : `${readiness.blockersCount} required action${readiness.blockersCount === 1 ? "" : "s"} to publish`}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas border border-line/70 space-y-1">
            <div className="text-[10px] font-bold text-stone uppercase tracking-wider">
              Canonical URL
            </div>
            <div className="font-mono font-bold text-graphite truncate text-xs">
              {shortCanonicalUrl}
            </div>
            <p className="text-[11px] text-stone">Authoritative hostname surface</p>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas border border-line/70 space-y-1">
            <div className="text-[10px] font-bold text-stone uppercase tracking-wider">
              Products & Services
            </div>
            <div className="font-bold text-graphite flex items-center gap-1.5 text-sm">
              <Layers className="w-4 h-4 text-royal shrink-0" />
              <span>{publishedOfferingsCount} Published</span>
            </div>
            <p className="text-[11px] text-stone">
              {draftOfferingsCount > 0 ? `${draftOfferingsCount} draft in progress • ` : ""}Independent lifecycle
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas border border-line/70 space-y-1">
            <div className="text-[10px] font-bold text-stone uppercase tracking-wider">
              Company AI & Connect
            </div>
            <div className="font-bold text-graphite flex items-center gap-1.5 text-sm">
              <Bot className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Active & Grounded</span>
            </div>
            <p className="text-[11px] text-stone">Direct customer inquiry inbox ready</p>
          </div>
        </div>

        {/* Live Operational Action Row (When company is LIVE) */}
        {isCurrentlyLive && (
          <div className="pt-2 border-t border-line flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-stone font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Company is live in production. Updates in Studio synchronize automatically.</span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={canonicalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-royal hover:bg-royal-dark text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs min-h-[38px]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Public Page
              </a>

              <button
                type="button"
                onClick={onOpenPreview}
                className="px-3 py-1.5 bg-canvas hover:bg-mist text-graphite rounded-xl text-xs font-bold border border-line flex items-center gap-1.5 transition min-h-[38px]"
              >
                <Eye className="w-3.5 h-3.5 text-royal" />
                Preview in Studio
              </button>

              <button
                type="button"
                onClick={handleCopyUrl}
                className="px-3 py-1.5 bg-canvas hover:bg-mist text-graphite rounded-xl text-xs font-bold border border-line flex items-center gap-1.5 transition min-h-[38px]"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone" />
                    <span>Copy URL</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="px-3 py-1.5 bg-canvas hover:bg-mist text-graphite rounded-xl text-xs font-bold border border-line flex items-center gap-1.5 transition min-h-[38px]"
              >
                <Share2 className="w-3.5 h-3.5 text-stone" />
                <span>Share</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: Go-Live Readiness (Blockers vs Warnings vs Optional) */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
          <div>
            <h3 className="text-sm font-bold text-graphite">Go-Live Readiness & Criteria</h3>
            <p className="text-xs text-stone">
              {isCurrentlyLive
                ? "Core company requirements are complete and verified. Recommended enhancements are available below."
                : "Mandatory company criteria must be satisfied before going live. Products and services publish independently."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md ${
                isCurrentlyLive || readiness.blockersCount === 0
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}
            >
              {isCurrentlyLive
                ? "CORE REQUIREMENTS: COMPLETE"
                : readiness.blockersCount === 0
                ? "ALL CORE REQUIREMENTS SATISFIED"
                : `${readiness.blockersCount} REQUIRED ACTION${readiness.blockersCount === 1 ? "" : "S"}`}
            </span>
          </div>
        </div>

        {/* Explanatory Legend for Requirements */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-canvas border border-line/60 space-y-0.5">
            <div className="flex items-center gap-1.5 font-bold text-rose-800 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-rose-600" />
              BLOCKERS
            </div>
            <p className="text-[11px] text-stone">
              Mandatory legal, positioning, presence & AI grounding requirements before going live.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-canvas border border-line/60 space-y-0.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              WARNINGS
            </div>
            <p className="text-[11px] text-stone">
              Recommended operational enhancements. Never blocks company publication.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-canvas border border-line/60 space-y-0.5">
            <div className="flex items-center gap-1.5 font-bold text-royal text-[11px]">
              <span className="w-2 h-2 rounded-full bg-royal" />
              OFFERING INDEPENDENCE
            </div>
            <p className="text-[11px] text-stone">
              Products and services follow their own lifecycle (Draft → Ready → Published → Archived).
            </p>
          </div>
        </div>

        {/* 8 Studio Modules Evaluation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {readiness.sections.map((sec) => {
            const hasBlockers = sec.blockers.length > 0 && !isCurrentlyLive;
            const hasWarnings = sec.warnings.length > 0;
            const isFullySatisfied = !hasBlockers && !hasWarnings;

            return (
              <div
                key={sec.id}
                className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition ${
                  isFullySatisfied || isCurrentlyLive
                    ? "bg-canvas border-line text-graphite"
                    : hasBlockers
                    ? "bg-rose-50/40 border-rose-200 text-graphite"
                    : "bg-amber-50/40 border-amber-200 text-graphite"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isFullySatisfied || isCurrentlyLive ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : hasBlockers ? (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  ) : (
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-graphite truncate">{sec.label}</h4>
                      {hasBlockers && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-rose-100 text-rose-800">
                          REQUIRED
                        </span>
                      )}
                      {!hasBlockers && hasWarnings && !isCurrentlyLive && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-100 text-amber-800">
                          RECOMMENDED
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-stone mt-0.5 truncate">
                      {isCurrentlyLive
                        ? sec.description || "Validated and active in production"
                        : hasBlockers
                        ? `Missing: ${sec.blockers.join(", ")}`
                        : hasWarnings
                        ? sec.warnings[0]
                        : sec.description || "All criteria validated and satisfied"}
                    </p>
                  </div>
                </div>

                {(hasBlockers || (!isCurrentlyLive && hasWarnings)) && (
                  <button
                    type="button"
                    onClick={() => onNavigateToModule(sec.id)}
                    className="px-2.5 py-1 bg-white hover:bg-mist text-royal border border-line rounded-lg text-[10px] font-bold shrink-0 flex items-center gap-1 transition shadow-2xs"
                  >
                    Fix
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Publish Action Hero */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-graphite">
              {isCurrentlyLive
                ? "Live Production Deployment"
                : readiness.isPublishReady
                ? "Ready for Go-Live Publication"
                : "Go-Live Requirements Pending"}
            </h3>
            <p className="text-xs text-stone">
              {isCurrentlyLive
                ? "Your company is published and actively indexed across MarineWorld.City."
                : readiness.isPublishReady
                ? "All mandatory company criteria are satisfied. Click below to publish your company live."
                : "Complete all required items above to enable production publication."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenPreview}
              className="px-3.5 py-2.5 rounded-xl bg-canvas hover:bg-mist text-graphite text-xs font-semibold border border-line flex items-center gap-1.5 transition min-h-[44px]"
            >
              <Eye className="w-3.5 h-3.5 text-royal" />
              Preview Live Experience
            </button>

            {isCurrentlyLive ? (
              <a
                href={canonicalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-royal hover:bg-royal-dark text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm min-h-[44px]"
              >
                <ExternalLink className="w-4 h-4" />
                OPEN PUBLIC PAGE
              </a>
            ) : readiness.isPublishReady ? (
              <button
                id="publish-btn-go-live"
                type="button"
                onClick={handlePublish}
                disabled={isPublishing}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm min-h-[44px]"
              >
                <Radio className={`w-4 h-4 ${isPublishing ? "animate-spin" : ""}`} />
                {isPublishing ? "Publishing Company..." : "GO LIVE — PUBLISH COMPANY"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const firstBlockerSec = readiness.sections.find((s) => s.blockers.length > 0);
                  if (firstBlockerSec) onNavigateToModule(firstBlockerSec.id);
                }}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm min-h-[44px]"
              >
                <AlertCircle className="w-4 h-4" />
                SHOW WHAT IS MISSING
              </button>
            )}
          </div>
        </div>

        {publishSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <div>
              <div className="font-bold">Company successfully published live!</div>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Your AI-Native Company is now live and indexed across MarineWorld.City at{" "}
                <a
                  href={canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-mono font-bold"
                >
                  {canonicalUrl}
                </a>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 4: Live Production Summary Snapshot */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isCurrentlyLive ? "bg-emerald-500 animate-pulse" : "bg-stone"
              }`}
            />
            <h3 className="text-sm font-bold text-graphite">Production Operating Snapshot</h3>
          </div>
          <span className="text-xs font-mono text-stone">
            PERSISTED CANONICAL STATE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-canvas border border-line space-y-1">
            <div className="text-[10px] font-mono text-stone uppercase">Company Status</div>
            <div className="font-bold text-emerald-700 text-sm">
              {isCurrentlyLive ? "LIVE & VERIFIED" : "DRAFT MODE"}
            </div>
            <div className="text-[11px] text-stone">Verified sovereign company presence</div>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas border border-line space-y-1">
            <div className="text-[10px] font-mono text-stone uppercase">Company AI Operating Layer</div>
            <div className="font-bold text-graphite text-sm">Active & Grounded</div>
            <div className="text-[11px] text-stone">Sovereign enterprise grounding boundary</div>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas border border-line space-y-1">
            <div className="text-[10px] font-mono text-stone uppercase">Published Offerings</div>
            <div className="font-bold text-graphite text-sm">
              {publishedOfferingsCount} Published {draftOfferingsCount > 0 ? `(${draftOfferingsCount} draft)` : ""}
            </div>
            <div className="text-[11px] text-stone">Independent offering publish lifecycle</div>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas border border-line space-y-1">
            <div className="text-[10px] font-mono text-stone uppercase">Facilities & Nodes</div>
            <div className="font-bold text-graphite text-sm">{activeNodesCount} Active Nodes</div>
            <div className="text-[11px] text-stone">Physical headquarters & operational nodes</div>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas border border-line space-y-1">
            <div className="text-[10px] font-mono text-stone uppercase">Customer Connect / RFQs</div>
            <div className="font-bold text-graphite text-sm">Inbox Ready & Active</div>
            <div className="text-[11px] text-stone">Direct customer communication gateway</div>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas border border-line space-y-1">
            <div className="text-[10px] font-mono text-stone uppercase">Canonical URL</div>
            <div className="font-mono font-bold text-royal truncate text-xs">
              {canonicalUrl}
            </div>
            <div className="text-[11px] text-stone">Authoritative MarineWorld web identity</div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {isShareModalOpen && (
        <ShareProtocolModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          title={`Share ${canonicalCompany?.displayName || canonicalCompany?.legalName || canonicalCompany?.brandName || "Company"}`}
          url={canonicalUrl}
          description="Anyone with this link can view this company page."
        />
      )}
    </div>
  );
};

