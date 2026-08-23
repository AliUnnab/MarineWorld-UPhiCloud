import React, { useState, useEffect } from "react";
import {
  X,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  PowerOff,
  Unlink,
  Archive,
  CheckCircle2,
} from "lucide-react";
import type { DocumentEntity } from "@/lib/types";
import {
  checkSourceDependencies,
  deleteSourceSafely,
  disableGrounding,
  archiveSource,
  removeSourceLink,
  type DependencyCheckResult,
} from "@/lib/services/knowledgeLifecycleService";

interface SafeDeleteModalProps {
  document: DocumentEntity | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: (docId: string, message: string) => void;
  onDocUpdated?: (updatedDoc: DocumentEntity, message: string) => void;
}

export const SafeDeleteModal: React.FC<SafeDeleteModalProps> = ({
  document,
  isOpen,
  onClose,
  onDeleted,
  onDocUpdated,
}) => {
  if (!isOpen || !document) return null;

  const [depCheck, setDepCheck] = useState<DependencyCheckResult>(() =>
    checkSourceDependencies(document.companyId, document.id)
  );
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const recheck = () => {
    const res = checkSourceDependencies(document.companyId, document.id);
    setDepCheck(res);
  };

  useEffect(() => {
    recheck();
  }, [document.id]);

  const handleDisableGroundingQuick = () => {
    setIsProcessingAction(true);
    const res = disableGrounding(document.companyId, document.id, "Company Operator", "Disabled to resolve dependency for deletion");
    setIsProcessingAction(false);
    if (res.success && res.document) {
      if (onDocUpdated) onDocUpdated(res.document, "Grounding disabled.");
      setActionNotice("Grounding has been disabled.");
      recheck();
    }
  };

  const handleRemoveLinkQuick = () => {
    setIsProcessingAction(true);
    const res = removeSourceLink(document.companyId, document.id, "Company Operator");
    setIsProcessingAction(false);
    if (res.success && res.document) {
      if (onDocUpdated) onDocUpdated(res.document, "Relationship links detached.");
      setActionNotice("Relationship link removed. Source moved to Company Knowledge.");
      recheck();
    }
  };

  const handleArchiveInsteadQuick = () => {
    setIsProcessingAction(true);
    const res = archiveSource(document.companyId, document.id, "Company Operator", "Archived instead of permanent deletion");
    setIsProcessingAction(false);
    if (res.success && res.document) {
      if (onDocUpdated) onDocUpdated(res.document, `Source "${document.title}" safely archived.`);
      onClose();
    }
  };

  const handlePermanentDelete = () => {
    setIsProcessingAction(true);
    const res = deleteSourceSafely(document.companyId, document.id, "Company Operator");
    setIsProcessingAction(false);
    if (res.success) {
      onDeleted(document.id, `Source "${document.title}" was permanently deleted.`);
      onClose();
    } else {
      setActionNotice(res.error || "Could not delete source.");
      recheck();
    }
  };

  const canDelete = depCheck.canDelete;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-graphite/60 backdrop-blur-xs animate-fade-in"
      id="modal-safe-delete"
    >
      <div className="bg-white border border-line rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-canvas">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              canDelete ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
            }`}>
              {canDelete ? <Trash2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider block text-stone">
                SAFE DELETION PROTOCOL
              </span>
              <h3 className="text-sm font-bold text-graphite font-mono">
                {canDelete ? "PERMANENTLY DELETE SOURCE?" : "SOURCE IS IN USE"}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-stone hover:text-graphite transition p-1.5 rounded-lg hover:bg-mist"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-canvas border border-line font-mono text-[11px] text-graphite font-bold">
            {document.title}
          </div>

          {actionNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{actionNotice}</span>
            </div>
          )}

          {!canDelete ? (
            /* Blocked: Active Dependencies Detected */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2 text-amber-950">
                <div className="flex items-center gap-2 font-bold text-[11px] font-mono uppercase">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Hard Deletion Blocked by Safety Rules</span>
                </div>
                <p className="text-[11.5px] leading-relaxed text-amber-900">
                  This document is currently active in your AI grounding engine or attached to active commercial offerings. Hard deleting it now would disrupt live queries and telemetry.
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-[10.5px] font-mono font-bold text-stone uppercase">
                  Active Dependencies ({depCheck.dependencies.length})
                </div>
                <div className="space-y-1.5">
                  {depCheck.dependencies.map((dep, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-canvas border border-line/80 font-mono text-[11px] text-graphite flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span>{dep}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Alternatives */}
              <div className="space-y-2 pt-1">
                <div className="text-[10.5px] font-mono font-bold text-stone uppercase">
                  Recommended Safe Actions
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleDisableGroundingQuick}
                    disabled={isProcessingAction}
                    className="p-3 rounded-xl bg-canvas hover:bg-mist border border-line text-left space-y-1 transition"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-graphite text-[11px]">
                      <PowerOff className="w-3.5 h-3.5 text-amber-600" />
                      <span>Disable Grounding</span>
                    </div>
                    <p className="text-[10px] text-stone">
                      Remove from AI retrieval without deleting.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={handleRemoveLinkQuick}
                    disabled={isProcessingAction}
                    className="p-3 rounded-xl bg-canvas hover:bg-mist border border-line text-left space-y-1 transition"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-graphite text-[11px]">
                      <Unlink className="w-3.5 h-3.5 text-orange-600" />
                      <span>Remove Link</span>
                    </div>
                    <p className="text-[10px] text-stone">
                      Detach from offering to Company Knowledge.
                    </p>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleArchiveInsteadQuick}
                  disabled={isProcessingAction}
                  className="w-full p-3 rounded-xl bg-canvas hover:bg-mist border border-line flex items-center justify-between text-left transition"
                >
                  <div className="flex items-center gap-2">
                    <Archive className="w-3.5 h-3.5 text-stone" />
                    <div>
                      <div className="font-bold text-graphite text-[11px]">Archive Source Instead</div>
                      <div className="text-[10px] text-stone">
                        Preserves compliance audit trail while excluding from public AI.
                      </div>
                    </div>
                  </div>
                  <span className="text-royal font-bold text-[11px]">Archive →</span>
                </button>
              </div>
            </div>
          ) : (
            /* Safe to Delete */
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 space-y-1.5">
                <div className="font-bold font-mono text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Warning: This action is permanent</span>
                </div>
                <p className="text-[11px] leading-relaxed text-red-800">
                  All dependencies and active groundings for this document have been cleared. Deleting this source will permanently remove it from your company Data Space.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-line bg-canvas flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-line hover:bg-mist text-graphite text-xs font-bold transition shadow-2xs"
          >
            {canDelete ? "Cancel" : "Close"}
          </button>

          {canDelete && (
            <button
              type="button"
              id="btn-confirm-permanent-delete"
              onClick={handlePermanentDelete}
              disabled={isProcessingAction}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Permanently Delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
