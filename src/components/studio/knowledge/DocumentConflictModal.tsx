import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Clock,
  ShieldCheck,
  UserCheck,
  X,
  ArrowRight,
  Sparkles,
  Edit3,
} from "lucide-react";
import type {
  DocumentConflictResolution,
  DocumentConflictProvenance,
} from "@/lib/services/knowledgeConflictService";
import { resolveDocumentConflict } from "@/lib/services/knowledgeConflictService";

interface DocumentConflictModalProps {
  conflict: DocumentConflictResolution;
  isOpen: boolean;
  onClose: () => void;
  onResolved?: (resolved: DocumentConflictResolution) => void;
  currentUserName?: string;
}

export const DocumentConflictModal: React.FC<DocumentConflictModalProps> = ({
  conflict,
  isOpen,
  onClose,
  onResolved,
  currentUserName = "Studio Operator",
}) => {
  const [currentConflict, setCurrentConflict] = useState<DocumentConflictResolution>(conflict);
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [manualRationale, setManualRationale] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChoice = (choice: "KEEP_A" | "KEEP_B") => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const res = resolveDocumentConflict({
        conflictId: currentConflict.conflictId,
        companyId: currentConflict.companyId,
        choice,
        confirmedBy: currentUserName,
      });
      setCurrentConflict(res);
      if (onResolved) onResolved(res);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to resolve conflict.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualValue.trim()) {
      setErrorMessage("Please enter a verified canonical value.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const res = resolveDocumentConflict({
        conflictId: currentConflict.conflictId,
        companyId: currentConflict.companyId,
        choice: "MANUAL",
        manualValue: manualValue.trim(),
        manualRationale: manualRationale.trim() || undefined,
        confirmedBy: currentUserName,
      });
      setCurrentConflict(res);
      setIsManualMode(false);
      if (onResolved) onResolved(res);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to resolve conflict.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isResolved = currentConflict.status === "RESOLVED";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 font-sans"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-line shadow-2xl flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-line flex items-center justify-between bg-canvas/60">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
              isResolved ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              {isResolved ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone">
                {isResolved ? "RESOLVED" : "REVIEW REQUIRED"}
              </div>
              <h3 className="text-sm font-bold text-graphite">
                {currentConflict.fieldLabel}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone hover:text-graphite hover:bg-mist transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isResolved ? (
            /* Resolved State Display */
            <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                <span className="text-xs font-bold text-emerald-900 uppercase font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  CONFLICT RESOLVED
                </span>
                <span className="text-[10px] font-mono text-emerald-800">
                  {currentConflict.confirmedAt ? new Date(currentConflict.confirmedAt).toLocaleString() : "Just now"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-emerald-700 uppercase">Authoritative Source</span>
                  <div className="font-bold text-emerald-950">
                    {currentConflict.resolvedSource === "SOURCE_A"
                      ? `Source A: ${currentConflict.sourceA.sourceDocumentName}`
                      : currentConflict.resolvedSource === "SOURCE_B"
                      ? `Source B: ${currentConflict.sourceB.sourceDocumentName}`
                      : "Operator Manual Override"}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-emerald-700 uppercase">Confirmed Canonical Value</span>
                  <div className="font-bold text-emerald-950 bg-white/80 px-2.5 py-1.5 rounded-lg border border-emerald-200 font-mono">
                    {currentConflict.resolvedValue}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-emerald-700 uppercase">Confirmed By</span>
                  <div className="font-medium text-emerald-950 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {currentConflict.confirmedBy}
                  </div>
                </div>

                {currentConflict.manualRationale && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-emerald-700 uppercase">Resolution Rationale</span>
                    <div className="text-emerald-900 italic">
                      "{currentConflict.manualRationale}"
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-stone leading-relaxed">
              Multiple authoritative sources contain conflicting values for this field. Select the authoritative source or manually confirm the canonical value. The company-confirmed value will not be overwritten automatically.
            </p>
          )}

          {/* Sources Side-by-Side Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* SOURCE A Card */}
            <div
              className={`p-4 rounded-xl border transition flex flex-col justify-between space-y-3 ${
                isResolved && currentConflict.resolvedSource === "SOURCE_A"
                  ? "bg-emerald-50/50 border-emerald-400 ring-1 ring-emerald-400"
                  : "bg-canvas border-line"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    SOURCE A
                  </span>
                  <span className="text-[10px] font-mono text-stone">
                    {currentConflict.sourceA.confidenceScore}% confidence
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-start gap-1.5 text-xs font-bold text-graphite">
                    <FileText className="w-3.5 h-3.5 text-royal shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{currentConflict.sourceA.sourceDocumentName}</span>
                  </div>
                  {currentConflict.sourceA.sectionOrPage && (
                    <div className="text-[10px] font-mono text-stone">
                      Location: {currentConflict.sourceA.sectionOrPage}
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-white border border-line/80 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-stone font-semibold block">
                    Extracted Value
                  </span>
                  <div className="text-xs font-bold text-graphite font-mono">
                    {currentConflict.sourceA.extractedValue}
                  </div>
                </div>

                <div className="text-[10px] font-mono text-stone flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Extracted: {new Date(currentConflict.sourceA.extractedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {!isResolved && (
                <button
                  type="button"
                  id="conflict-btn-keep-a"
                  disabled={isSubmitting}
                  onClick={() => handleChoice("KEEP_A")}
                  className="w-full py-2 px-3 rounded-xl bg-royal hover:bg-royal/90 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  KEEP A
                </button>
              )}
            </div>

            {/* SOURCE B Card */}
            <div
              className={`p-4 rounded-xl border transition flex flex-col justify-between space-y-3 ${
                isResolved && currentConflict.resolvedSource === "SOURCE_B"
                  ? "bg-emerald-50/50 border-emerald-400 ring-1 ring-emerald-400"
                  : "bg-canvas border-line"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    SOURCE B
                  </span>
                  <span className="text-[10px] font-mono text-stone">
                    {currentConflict.sourceB.confidenceScore}% confidence
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-start gap-1.5 text-xs font-bold text-graphite">
                    <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{currentConflict.sourceB.sourceDocumentName}</span>
                  </div>
                  {currentConflict.sourceB.sectionOrPage && (
                    <div className="text-[10px] font-mono text-stone">
                      Location: {currentConflict.sourceB.sectionOrPage}
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-white border border-line/80 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-stone font-semibold block">
                    Extracted Value
                  </span>
                  <div className="text-xs font-bold text-graphite font-mono">
                    {currentConflict.sourceB.extractedValue}
                  </div>
                </div>

                <div className="text-[10px] font-mono text-stone flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Extracted: {new Date(currentConflict.sourceB.extractedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {!isResolved && (
                <button
                  type="button"
                  id="conflict-btn-keep-b"
                  disabled={isSubmitting}
                  onClick={() => handleChoice("KEEP_B")}
                  className="w-full py-2 px-3 rounded-xl bg-royal hover:bg-royal/90 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  KEEP B
                </button>
              )}
            </div>
          </div>

          {/* Manual Review Section */}
          {!isResolved && (
            <div className="p-4 rounded-xl bg-mist/60 border border-line space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-royal" />
                  <span className="text-xs font-bold text-graphite uppercase tracking-wider">
                    Custom Operator Verification
                  </span>
                </div>
                {!isManualMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsManualMode(true);
                      setManualValue(currentConflict.sourceA.extractedValue);
                    }}
                    className="text-xs text-royal font-bold hover:underline"
                  >
                    REVIEW MANUALLY
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsManualMode(false)}
                    className="text-xs text-stone hover:text-graphite"
                  >
                    Cancel Manual Mode
                  </button>
                )}
              </div>

              {isManualMode && (
                <form onSubmit={handleManualSubmit} className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-graphite">
                      Confirmed Canonical Value *
                    </label>
                    <input
                      type="text"
                      value={manualValue}
                      onChange={(e) => setManualValue(e.target.value)}
                      placeholder="e.g. 5 to 7 weeks guaranteed"
                      className="w-full h-9 px-3 rounded-lg border border-line bg-white text-xs font-bold text-graphite focus:outline-none focus:border-royal"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-stone">
                      Operator Rationale / Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={manualRationale}
                      onChange={(e) => setManualRationale(e.target.value)}
                      placeholder="e.g. Confirmed with head of shipyard logistics."
                      className="w-full h-8 px-3 rounded-lg border border-line bg-white text-xs text-stone focus:outline-none focus:border-royal"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-graphite hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      CONFIRM CANONICAL VALUE
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-line bg-canvas/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-line bg-white text-xs font-bold text-graphite hover:bg-mist transition shadow-2xs"
          >
            {isResolved ? "Close" : "Dismiss"}
          </button>
        </div>
      </div>
    </div>
  );
};
