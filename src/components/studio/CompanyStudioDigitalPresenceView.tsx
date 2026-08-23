import React, { useState } from "react";
import {
  Globe,
  ExternalLink,
  Copy,
  CheckCircle2,
  ShieldCheck,
  Building,
  Bot,
  Sparkles,
  MessageSquare,
  Share2,
  Eye,
  Radio,
} from "lucide-react";
import type { CompanyEntity } from "@/lib/types";
import { getCompanyById } from "@/lib/services/companyService";
import {
  resolveMarineWorldCompanyDigitalId,
  buildCanonicalCompanyUrl,
} from "@/lib/services/companyIdentityService";
import { marineSector } from "@/lib/sectors/marine";
import { getCompanyBySlug } from "@/lib/registry";
import { ShareProtocolModal } from "@/components/company/ShareProtocolModal";

interface CompanyStudioDigitalPresenceViewProps {
  companyId: string;
  onOpenPreview: () => void;
}

export const CompanyStudioDigitalPresenceView: React.FC<CompanyStudioDigitalPresenceViewProps> = ({
  companyId,
  onOpenPreview,
}) => {
  const canonicalCompany = getCompanyById(companyId) || (getCompanyBySlug(marineSector, companyId) as unknown as CompanyEntity);
  const [copied, setCopied] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const slug = canonicalCompany?.slug || companyId;
  const canonicalUrl = buildCanonicalCompanyUrl(
    canonicalCompany,
    canonicalCompany?.primarySectorCityId || canonicalCompany?.sectorCityIds?.[0]
  );
  const displayName = canonicalCompany?.displayName || canonicalCompany?.legalName || slug;

  const digitalIdInfo = resolveMarineWorldCompanyDigitalId({
    companyIdOrSlug: canonicalCompany?.id || companyId,
    mwCompanyDigitalId: (canonicalCompany as any)?.mwCompanyDigitalId,
    businessId: canonicalCompany?.businessId,
    companyId6Digit: (canonicalCompany as any)?.companyId6Digit,
    primaryRegistryCode: (canonicalCompany as any)?.primaryRegistryCode,
    primarySectorCityId: canonicalCompany?.sectorCityIds?.[0],
  });

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(canonicalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleOpenExternal = () => {
    window.location.href = `/companies/${slug}`;
  };

  return (
    <div className="space-y-6" id="module-digital-presence-view">
      {/* 4-Question Information Architecture Banner */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-royal/10 text-royal uppercase tracking-wider">
              07 — DIGITAL PRESENCE
            </span>
            <span className="text-xs font-bold text-graphite uppercase tracking-wider">
              Canonical Web Property & Identity
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            LIVE & VERIFIED
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-canvas border border-line/60 space-y-1">
            <div className="font-bold text-graphite uppercase tracking-wider text-[10px]">
              WHAT IS THIS?
            </div>
            <p className="text-stone">
              Your company's permanent, verified digital property and canonical web presence in MarineWorld.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-canvas border border-line/60 space-y-1">
            <div className="font-bold text-graphite uppercase tracking-wider text-[10px]">
              WHAT DO I NEED TO PROVIDE?
            </div>
            <p className="text-stone">
              Review and confirm public visibility, canonical slug URL, and published digital capabilities.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-canvas border border-line/60 space-y-1">
            <div className="font-bold text-graphite uppercase tracking-wider text-[10px]">
              WHAT IS ALREADY READY?
            </div>
            <p className="text-stone">
              Canonical URL routing, deterministic Digital ID, network position, and authoritative trust anchor.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-canvas border border-line/60 space-y-1">
            <div className="font-bold text-graphite uppercase tracking-wider text-[10px]">
              WHAT WILL THIS CHANGE?
            </div>
            <p className="text-stone">
              Global web accessibility, search indexation, verified sector city integration, and customer touchpoints.
            </p>
          </div>
        </div>
      </div>

      {/* Canonical URL & Primary Actions Hero Card */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-4">
          <div className="space-y-1">
            <div className="text-[10px] font-mono text-royal font-bold uppercase tracking-wider">
              CANONICAL COMPANY URL
            </div>
            <div className="text-base sm:text-lg font-mono font-bold text-graphite break-all">
              {canonicalUrl}
            </div>
            <p className="text-xs text-stone">
              Deterministic, verified company property indexed across all sector cities.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyUrl}
              className="px-3.5 py-2 rounded-xl bg-canvas hover:bg-mist text-graphite text-xs font-semibold border border-line flex items-center gap-1.5 transition min-h-[40px] cursor-pointer"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone" />
                  Copy URL
                </>
              )}
            </button>

            <button
              onClick={onOpenPreview}
              className="px-3.5 py-2 rounded-xl bg-canvas hover:bg-mist text-graphite text-xs font-semibold border border-line flex items-center gap-1.5 transition min-h-[40px] cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-royal" />
              Preview in Studio
            </button>

            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-canvas hover:bg-mist text-graphite text-xs font-semibold border border-line flex items-center gap-1.5 transition min-h-[40px] cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-700" />
              Share
            </button>

            <button
              onClick={handleOpenExternal}
              className="px-4 py-2 bg-royal hover:bg-royal/90 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm min-h-[40px] cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Public Page
            </button>
          </div>
        </div>

        {/* Digital Identity Identifiers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-canvas border border-line space-y-1">
            <div className="text-[10px] font-mono text-stone uppercase">Digital Identity ID</div>
            <div className="font-mono font-bold text-royal truncate">
              {digitalIdInfo.mwCompanyDigitalId}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas border border-line space-y-1">
            <div className="text-[10px] font-mono text-stone uppercase">Sector City Integration</div>
            <div className="font-mono font-bold text-graphite truncate">
              {(canonicalCompany?.primarySectorCityId || "shipyard").toUpperCase()}.CITY
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas border border-line space-y-1">
            <div className="text-[10px] font-mono text-stone uppercase">Network Position</div>
            <div className="font-bold text-graphite truncate">
              Verified Enterprise Node
            </div>
          </div>
        </div>
      </div>

      {/* Derived Public Capabilities Summary */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-4">
        <div className="border-b border-line pb-3">
          <h3 className="text-sm font-bold text-graphite">Derived Public Capabilities</h3>
          <p className="text-xs text-stone">
            All user-facing experiences enabled automatically by your canonical company data.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-canvas border border-line space-y-2">
            <div className="w-8 h-8 rounded-xl bg-royal/10 text-royal flex items-center justify-center font-bold">
              <Bot className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-graphite">Company AI Advisor</h4>
            <p className="text-[11px] text-stone">
              Grounded conversational assistant answering visitor queries about enterprise capabilities.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-canvas border border-line space-y-2">
            <div className="w-8 h-8 rounded-xl bg-royal/10 text-royal flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-graphite">Offering AI Advisors</h4>
            <p className="text-[11px] text-stone">
              Interactive technical advisors embedded directly in your published product and service catalog.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-canvas border border-line space-y-2">
            <div className="w-8 h-8 rounded-xl bg-royal/10 text-royal flex items-center justify-center font-bold">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-graphite">Connect / RFQ Routing</h4>
            <p className="text-[11px] text-stone">
              Structured procurement inquiries and commercial requests dispatched directly to your inbox.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-canvas border border-line space-y-2">
            <div className="w-8 h-8 rounded-xl bg-royal/10 text-royal flex items-center justify-center font-bold">
              <Share2 className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-graphite">Digital ID & Trust Passport</h4>
            <p className="text-[11px] text-stone">
              Shareable company identity passport and registry verification certificates.
            </p>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <ShareProtocolModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={`Share ${displayName}`}
        url={canonicalUrl}
        description="Anyone with this link can view this company page."
      />
    </div>
  );
};
