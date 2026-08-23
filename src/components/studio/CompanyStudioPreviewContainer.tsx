import React from "react";
import {
  ArrowLeft,
  Eye,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Layers,
  Radio,
  CheckCircle2,
} from "lucide-react";
import { CompanyPage } from "@/pages/CompanyPage";
import { marineSector } from "@/lib/sectors/marine";

interface CompanyStudioPreviewContainerProps {
  companySlug: string;
  onClosePreview: () => void;
}

export const CompanyStudioPreviewContainer: React.FC<CompanyStudioPreviewContainerProps> = ({
  companySlug,
  onClosePreview,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden" id="studio-preview-modal">
      {/* Studio Preview Top Bar */}
      <div className="bg-canvas border-b border-line px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClosePreview}
            className="px-3 py-1.5 rounded-xl bg-white border border-line text-graphite hover:bg-mist text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-royal" />
            <span>Return to Studio</span>
          </button>

          <div className="h-4 w-px bg-line" />

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-graphite">
              Studio Live Preview
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-royal/10 text-royal">
              SYNCHRONIZED REAL-TIME
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/companies/${companySlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-royal text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-royal/90 transition shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open in New Tab</span>
            <span className="sm:hidden">Open</span>
          </a>
        </div>
      </div>

      {/* Embedded Live Company Page */}
      <div className="flex-1 overflow-y-auto bg-canvas">
        <CompanyPage config={marineSector} companySlug={companySlug} />
      </div>
    </div>
  );
};
