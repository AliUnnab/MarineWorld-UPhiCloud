import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  FileCode,
  Layers,
  HardDrive,
  Copy,
  Check,
  Download,
  ExternalLink,
  Sparkles,
  Cpu,
  BadgeCheck,
} from "lucide-react";
import type { OKFDocument } from "@/lib/types/okf";

interface OKFDocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  okfDoc: OKFDocument | null;
}

export const OKFDocumentViewerModal: React.FC<OKFDocumentViewerModalProps> = ({
  isOpen,
  onClose,
  okfDoc,
}) => {
  const [activeTab, setActiveTab] = useState<"MATRIX" | "RAW_OKF" | "GRAPH">("MATRIX");
  const [copied, setCopied] = useState(false);

  if (!isOpen || !okfDoc) return null;

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(okfDoc.fullOkfMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([okfDoc.fullOkfMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${okfDoc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.okf.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-surface border border-line rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-sand">
        
        {/* Header with Knowledge Catalog Seal Badge */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-surface-raised">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-sand-primary tracking-tight">
                  {okfDoc.title}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-2xs font-mono font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                  <BadgeCheck className="w-3 h-3" />
                  SEALED OKF v1.0
                </span>
              </div>
              <p className="text-xs text-stone font-mono flex items-center gap-2 mt-0.5">
                <span>Seal ID: <strong className="text-sand-secondary">{okfDoc.knowledgeCatalogSeal.sealId}</strong></span>
                <span>•</span>
                <span>Origin: <strong className="text-sand-secondary">{okfDoc.lineage.sourceOrigin}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="px-3 py-1.5 rounded-lg border border-line bg-surface hover:bg-surface-raised text-stone hover:text-sand-primary text-xs font-medium flex items-center gap-1.5 transition"
              title="Copy OKF Markdown"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy OKF"}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg border border-line bg-surface hover:bg-surface-raised text-stone hover:text-sand-primary text-xs font-medium flex items-center gap-1.5 transition"
              title="Download .okf.md"
            >
              <Download className="w-3.5 h-3.5" />
              .okf.md
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone hover:text-sand-primary hover:bg-surface-raised transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-line bg-surface/50">
          <button
            type="button"
            onClick={() => setActiveTab("MATRIX")}
            className={`pb-2 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === "MATRIX"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-stone hover:text-sand"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Verified Parameters Matrix
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("RAW_OKF")}
            className={`pb-2 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === "RAW_OKF"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-stone hover:text-sand"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            OKF Markdown (.okf.md)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("GRAPH")}
            className={`pb-2 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === "GRAPH"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-stone hover:text-sand"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Knowledge Catalog Lineage
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "MATRIX" && (
            <div className="space-y-6">
              {/* Executive Overview */}
              <div className="p-4 rounded-xl border border-line bg-surface-raised/40">
                <h4 className="text-2xs font-mono uppercase tracking-wider text-cyan-400 font-semibold mb-1">
                  Executive Summary (AI Grounding Baseline)
                </h4>
                <p className="text-sm text-sand-primary leading-relaxed">
                  {okfDoc.summaryText}
                </p>
              </div>

              {/* Technical Specifications */}
              {okfDoc.specifications && okfDoc.specifications.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono uppercase tracking-wider text-stone font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Technical Specifications ({okfDoc.specifications.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {okfDoc.specifications.map((spec, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-line bg-surface-raised/30 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-2xs font-mono text-stone uppercase">
                            {spec.label || spec.key}
                          </p>
                          <p className="text-sm font-semibold text-sand-primary mt-0.5">
                            {spec.value} {spec.unit || ""}
                          </p>
                        </div>
                        <span className="text-2xs font-mono text-cyan-400/80 bg-cyan-400/10 px-2 py-0.5 rounded">
                          {(spec.confidence * 100).toFixed(0)}% AI Conf.
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications & Compliance */}
              {okfDoc.certifications && okfDoc.certifications.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono uppercase tracking-wider text-stone font-semibold mb-3">
                    Class & Compliance Standards
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {okfDoc.certifications.map((cert, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-mono font-medium flex items-center gap-1.5"
                      >
                        <BadgeCheck className="w-3.5 h-3.5" />
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Commercial Terms */}
              {okfDoc.commercialParameters && (
                <div className="p-4 rounded-xl border border-line bg-surface-raised/30 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-2xs font-mono text-stone">Price</span>
                    <p className="text-sm font-bold text-sand-primary mt-0.5">
                      {okfDoc.commercialParameters.price || "On Request"}{" "}
                      {okfDoc.commercialParameters.currency || "USD"}
                    </p>
                  </div>
                  <div>
                    <span className="text-2xs font-mono text-stone">Pricing Model</span>
                    <p className="text-sm font-bold text-sand-primary mt-0.5">
                      {okfDoc.commercialParameters.pricingModel || "Fixed"}
                    </p>
                  </div>
                  <div>
                    <span className="text-2xs font-mono text-stone">Standard Lead Time</span>
                    <p className="text-sm font-bold text-sand-primary mt-0.5">
                      {okfDoc.commercialParameters.leadTimeDays ? `${okfDoc.commercialParameters.leadTimeDays} days` : "Immediate"}
                    </p>
                  </div>
                  <div>
                    <span className="text-2xs font-mono text-stone">Anti-Hallucination Mode</span>
                    <p className="text-sm font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      STRICT_SEALED
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "RAW_OKF" && (
            <div className="relative">
              <pre className="p-4 rounded-xl bg-black/60 border border-line font-mono text-xs text-sand-secondary leading-relaxed overflow-x-auto whitespace-pre-wrap select-all">
                {okfDoc.fullOkfMarkdown}
              </pre>
            </div>
          )}

          {activeTab === "GRAPH" && (
            <div className="p-6 rounded-xl border border-line bg-surface-raised/30 space-y-4 font-mono text-xs">
              <div className="p-4 rounded-lg bg-black/40 border border-line space-y-2">
                <div className="flex items-center justify-between text-cyan-400">
                  <span>● Google Knowledge Catalog Node</span>
                  <span>Authority: Verified</span>
                </div>
                <div className="text-stone">Digest SHA-256: {okfDoc.knowledgeCatalogSeal.hashSha256}</div>
                <div className="text-stone">Sealed At: {okfDoc.knowledgeCatalogSeal.sealedAt}</div>
                <div className="text-stone">Origin Source: {okfDoc.lineage.sourceOrigin} ({okfDoc.lineage.originalFileName || "Direct Input"})</div>
              </div>

              <div className="flex items-center justify-center py-2 text-stone">
                ↓ Zero-Hallucination Realtime Grounding Pipeline ↓
              </div>

              <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 space-y-1">
                <div className="font-bold flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4" />
                  Company AI & Product Experience AI Ready
                </div>
                <p className="text-2xs text-stone leading-normal">
                  All customer queries regarding this offering or company will be answered with 100% fidelity grounded directly on this sealed OKF specification.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-line bg-surface-raised">
          <div className="text-xs text-stone font-mono">
            Cryptographically sealed by Google Knowledge Catalog & MarineWorld Trust
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition shadow-lg shadow-cyan-500/20"
          >
            Close OKF Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
