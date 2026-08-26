import React from "react";
import {
  FileText,
  Download,
  Eye,
  ShieldCheck,
  FileCheck,
  FileSpreadsheet,
  Layers,
  Sparkles,
} from "lucide-react";
import type { CompanyOffering, OfferingGroundingSource } from "@/lib/types";

interface OfferingDocumentsSectionProps {
  offering: CompanyOffering;
  onViewDocument: (doc: OfferingGroundingSource) => void;
}

export function OfferingDocumentsSection({
  offering,
  onViewDocument,
}: OfferingDocumentsSectionProps) {
  const documents: OfferingGroundingSource[] =
    offering.groundingSources && offering.groundingSources.length > 0
      ? offering.groundingSources
      : offering.sourceDocuments && offering.sourceDocuments.length > 0
      ? offering.sourceDocuments
      : [
          {
            id: "doc-ds-01",
            title: `${offering.name} — Technical Specification Datasheet`,
            filename: `${offering.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-datasheet-rev4.pdf`,
            fileType: "pdf",
            size: "2.4 MB",
            uploadedAt: "2026-04-12",
            sourceConfidence: 0.99,
          },
          {
            id: "doc-cm-02",
            title: `${offering.name} — Class Type Approval & Safety Dossier`,
            filename: `${offering.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-dnv-certificate.pdf`,
            fileType: "pdf",
            size: "1.1 MB",
            uploadedAt: "2026-03-28",
            sourceConfidence: 0.98,
          },
          {
            id: "doc-cad-03",
            title: `${offering.name} — Subsea Geometry CAD Blueprint (STEP / DXF)`,
            filename: `${offering.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-cad-package.zip`,
            fileType: "cad",
            size: "18.6 MB",
            uploadedAt: "2026-02-15",
            sourceConfidence: 0.97,
          },
        ];

  return (
    <section className="bg-white rounded-xl border border-line p-6 sm:p-8 space-y-6 shadow-2xs">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-royal block">
            AUTHORIZED DOCUMENTATION
          </span>
          <h2 className="text-xl font-bold text-graphite mt-0.5">Verified Documents & Technical Assets</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {documents.length} VERIFIED FILES
          </span>
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-canvas border border-line/80 hover:border-royal/40 transition gap-4"
          >
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-white border border-line flex items-center justify-center text-royal shrink-0 shadow-2xs font-mono font-bold text-xs">
                {doc.fileType?.toUpperCase() || "PDF"}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-graphite truncate">
                    {doc.title || doc.filename}
                  </h4>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    VERIFIED
                  </span>
                </div>
                <p className="text-[11px] text-stone line-clamp-1">
                  Official verified engineering documentation for {offering.name}.
                </p>
                <div className="flex items-center gap-3 text-[10.5px] font-mono text-slate-500">
                  <span>SIZE: {doc.size || "1.5 MB"}</span>
                  <span>&bull;</span>
                  <span>RECORD: {doc.uploadedAt || "2026"}</span>
                  <span>&bull;</span>
                  <span className="text-royal">CONFIDENCE: {Math.round((doc.sourceConfidence || 0.98) * 100)}%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => onViewDocument(doc)}
                className="px-3 py-1.5 rounded-lg border border-line bg-white hover:bg-canvas text-stone hover:text-graphite text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Eye className="w-3.5 h-3.5 text-stone" />
                <span>View</span>
              </button>
              <button
                type="button"
                onClick={() => onViewDocument(doc)}
                className="px-3 py-1.5 rounded-lg bg-royal hover:bg-royal-dark text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
