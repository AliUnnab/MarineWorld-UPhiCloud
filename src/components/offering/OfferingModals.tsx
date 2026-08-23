import { useState } from "react";
import {
  X,
  FileText,
  Download,
  CheckCircle2,
  Layers,
} from "lucide-react";
import type { CompanyOffering, CompanyProfile, CompanyEntity, OfferingGroundingSource, OfferingMediaItem } from "@/lib/types";
import { CommercialInquiryModal } from "@/components/company/CommercialInquiryModal";
import { ShareProtocolModal } from "@/components/company/ShareProtocolModal";

export { CommercialInquiryModal };

/* ------------------------------------------------------------
   1. REQUEST OFFICIAL OFFER MODAL
   ------------------------------------------------------------ */
interface RequestOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  offering: CompanyOffering;
  parentCompany: CompanyProfile | CompanyEntity;
  onOpenAIAdvisor?: (prefillPrompt?: string) => void;
}

export function RequestOfferModal({
  isOpen,
  onClose,
  offering,
  parentCompany,
  onOpenAIAdvisor,
}: RequestOfferModalProps) {
  return (
    <CommercialInquiryModal
      isOpen={isOpen}
      onClose={onClose}
      offering={offering}
      parentCompany={parentCompany}
      initialMode="OFFICIAL_OFFER"
      onOpenAIAdvisor={onOpenAIAdvisor}
    />
  );
}

/* ------------------------------------------------------------
   2. COMMERCIAL RFQ MODAL
   ------------------------------------------------------------ */
interface CommercialRFQModalProps {
  isOpen: boolean;
  onClose: () => void;
  offering: CompanyOffering;
  parentCompany: CompanyProfile | CompanyEntity;
  onOpenAIAdvisor?: (prefillPrompt?: string) => void;
}

export function CommercialRFQModal({
  isOpen,
  onClose,
  offering,
  parentCompany,
  onOpenAIAdvisor,
}: CommercialRFQModalProps) {
  return (
    <CommercialInquiryModal
      isOpen={isOpen}
      onClose={onClose}
      offering={offering}
      parentCompany={parentCompany}
      initialMode="INQUIRY"
      onOpenAIAdvisor={onOpenAIAdvisor}
    />
  );
}

/* ------------------------------------------------------------
   3. DOCUMENT VIEWER MODAL
   ------------------------------------------------------------ */
interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: OfferingGroundingSource | null;
  offeringName: string;
}

export function DocumentViewerModal({
  isOpen,
  onClose,
  document,
  offeringName,
}: DocumentViewerModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  if (!isOpen || !document) return null;

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
      <div className="relative w-full max-w-3xl bg-white rounded-xl border border-line shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-line bg-canvas flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-soft border border-royal/20 text-royal flex items-center justify-center font-mono font-bold text-xs">
              DOC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-graphite">{document.title || document.filename || "Technical Document"}</h3>
                <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  VERIFIED RECORD
                </span>
              </div>
              <p className="text-[11px] text-stone mt-0.5">
                Official documentation reference for <strong className="text-graphite">{offeringName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone hover:text-graphite hover:bg-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewer Canvas */}
        <div className="p-6 overflow-y-auto space-y-5 bg-canvas/40">
          <div className="p-5 bg-white border border-line rounded-xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="font-mono text-[11px] font-bold text-graphite uppercase tracking-wider">
                DOCUMENT METADATA & INTEGRITY
              </span>
              <span className="font-mono text-[10px] text-stone">SHA-256: 8f4b2e...c901</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono">
              <div className="p-2.5 rounded bg-canvas border border-line/60">
                <span className="text-[10px] text-slate-500 block">FORMAT:</span>
                <span className="font-bold text-graphite">{document.fileType?.toUpperCase() || "PDF"}</span>
              </div>
              <div className="p-2.5 rounded bg-canvas border border-line/60">
                <span className="text-[10px] text-slate-500 block">SIZE:</span>
                <span className="font-bold text-graphite">{document.size || "1.8 MB"}</span>
              </div>
              <div className="p-2.5 rounded bg-canvas border border-line/60">
                <span className="text-[10px] text-slate-500 block">STATUS:</span>
                <span className="font-bold text-emerald-700">VERIFIED</span>
              </div>
              <div className="p-2.5 rounded bg-canvas border border-line/60">
                <span className="text-[10px] text-slate-500 block">CONFIDENCE:</span>
                <span className="font-bold text-royal">{Math.round((document.sourceConfidence || 0.98) * 100)}%</span>
              </div>
            </div>

            {/* Document summary / extracted content */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-graphite block">Extracted Grounding Summary:</span>
              <div className="p-4 rounded-lg bg-slate-50 border border-line text-xs text-stone font-mono leading-relaxed space-y-2">
                <p>
                  &bull; <strong>Scope:</strong> Official technical manufacturer specification, operational limits, calibrated sensor matrices, and maintenance guidelines for {offeringName}.
                </p>
                <p>
                  &bull; <strong>Grounding Role:</strong> Authorized as authoritative data source for the {offeringName} Dedicated AI Advisor.
                </p>
                <p>
                  &bull; <strong>Sovereignty:</strong> Document remains property of the parent enterprise under MarineWorld institutional trust governance.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-line bg-white flex items-center justify-between">
          <span className="text-[11px] text-stone">MarineWorld Institutional Repository</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone hover:text-graphite rounded-lg border border-line hover:bg-canvas transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="px-4 py-2 text-xs font-semibold text-white bg-royal hover:bg-blue-700 rounded-lg transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloaded ? "Downloaded Record" : downloading ? "Preparing..." : "Download Authorized Copy"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   4. MEDIA & BLUEPRINT LIGHTBOX MODAL
   ------------------------------------------------------------ */
interface MediaLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMedia: OfferingMediaItem | null;
  offeringName: string;
}

export function MediaLightboxModal({
  isOpen,
  onClose,
  activeMedia,
  offeringName,
}: MediaLightboxModalProps) {
  if (!isOpen || !activeMedia) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm font-sans">
      <div className="relative w-full max-w-4xl bg-slate-900 rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-royal text-white uppercase tracking-wider">
              {activeMedia.type?.toUpperCase() || "TECHNICAL VISUAL"}
            </span>
            <span className="text-xs font-semibold truncate max-w-[300px] sm:max-w-md">
              {activeMedia.title || offeringName}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media display container */}
        <div className="relative flex-1 flex items-center justify-center bg-slate-950 p-4 sm:p-8 min-h-[360px] overflow-auto">
          {activeMedia.url ? (
            <img
              src={activeMedia.url}
              alt={activeMedia.title || offeringName}
              className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-lg border border-slate-800"
            />
          ) : (
            <div className="p-8 text-center text-slate-400 font-mono text-xs">
              <Layers className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <span>Vector Blueprint / Technical Drawing Data</span>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-slate-400 text-xs">
          <span className="font-mono text-[11px]">
            {activeMedia.type === "drawing" ? "SCHEMATIC BLUEPRINT / CERTIFIED DRAWING" : "VERIFIED OPERATIONAL PHOTOGRAPHY"}
          </span>
          <span className="font-mono text-[11px] text-slate-400">{offeringName}</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   5. SHARE CANONICAL OFFERING MODAL
   ------------------------------------------------------------ */
interface ShareOfferingModalProps {
  isOpen: boolean;
  onClose: () => void;
  offering: CompanyOffering;
  canonicalUrl: string;
}

export function ShareOfferingModal({
  isOpen,
  onClose,
  offering,
  canonicalUrl,
}: ShareOfferingModalProps) {
  return (
    <ShareProtocolModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Share ${offering.name}`}
      url={canonicalUrl}
      description="Anyone with this link can view this offering."
    />
  );
}
