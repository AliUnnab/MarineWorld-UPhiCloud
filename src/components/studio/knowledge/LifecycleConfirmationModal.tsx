import React from "react";
import {
  X,
  PowerOff,
  Power,
  Archive,
  ArchiveRestore,
  Unlink,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type { DocumentEntity } from "@/lib/types";

export type ConfirmationType =
  | "DISABLE_GROUNDING"
  | "ENABLE_GROUNDING"
  | "ARCHIVE_SOURCE"
  | "UNARCHIVE_SOURCE"
  | "REMOVE_LINK";

interface LifecycleConfirmationModalProps {
  document: DocumentEntity | null;
  type: ConfirmationType | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const LifecycleConfirmationModal: React.FC<LifecycleConfirmationModalProps> = ({
  document,
  type,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !document || !type) return null;

  let title = "";
  let description = "";
  let icon = <AlertCircle className="w-5 h-5 text-royal" />;
  let confirmBtnText = "Confirm";
  let confirmBtnStyle = "bg-royal hover:bg-royal/90 text-white";

  switch (type) {
    case "DISABLE_GROUNDING":
      title = "DISABLE GROUNDING?";
      description =
        "The source document will remain preserved in your company repository and audit trail, but will be immediately removed from active AI retrieval for customer and partner queries.";
      icon = <PowerOff className="w-5 h-5 text-amber-600" />;
      confirmBtnText = "Disable Grounding";
      confirmBtnStyle = "bg-amber-600 hover:bg-amber-700 text-white";
      break;

    case "ENABLE_GROUNDING":
      title = "ENABLE GROUNDING?";
      description =
        "The verified facts and specifications in this document will be restored to active AI retrieval for its assigned scope.";
      icon = <Power className="w-5 h-5 text-emerald-600" />;
      confirmBtnText = "Enable Grounding";
      confirmBtnStyle = "bg-emerald-600 hover:bg-emerald-700 text-white";
      break;

    case "ARCHIVE_SOURCE":
      title = "ARCHIVE SOURCE?";
      description =
        "The document will be moved to the repository archive. It will be excluded from active AI grounding and public download, but remains visible to operators and recorded in your corporate audit history.";
      icon = <Archive className="w-5 h-5 text-stone" />;
      confirmBtnText = "Archive Source";
      confirmBtnStyle = "bg-stone-800 hover:bg-stone-900 text-white";
      break;

    case "UNARCHIVE_SOURCE":
      title = "UNARCHIVE SOURCE?";
      description =
        "The document will be restored to active repository status. You can then review and re-enable grounding when ready.";
      icon = <ArchiveRestore className="w-5 h-5 text-royal" />;
      confirmBtnText = "Unarchive Source";
      confirmBtnStyle = "bg-royal hover:bg-royal/90 text-white";
      break;

    case "REMOVE_LINK":
      title = "REMOVE RELATIONSHIP LINK?";
      description =
        "This will detach the relationship between this document and the assigned Offering / Facility, moving the document to Company Knowledge. The document entity, file references, and audit history will NOT be deleted.";
      icon = <Unlink className="w-5 h-5 text-orange-600" />;
      confirmBtnText = "Remove Link";
      confirmBtnStyle = "bg-orange-600 hover:bg-orange-700 text-white";
      break;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-graphite/60 backdrop-blur-xs animate-fade-in"
      id="modal-lifecycle-confirmation"
    >
      <div className="bg-white border border-line rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-canvas">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-canvas border border-line flex items-center justify-center shrink-0">
              {icon}
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-stone uppercase tracking-wider block">
                CONFIRMATION
              </span>
              <h3 className="text-sm font-bold text-graphite font-mono">{title}</h3>
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

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-canvas border border-line font-mono text-[11px] text-graphite font-bold">
            {document.title}
          </div>

          <p className="text-stone leading-relaxed">{description}</p>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-line bg-canvas flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-line hover:bg-mist text-graphite text-xs font-bold transition shadow-2xs"
          >
            Cancel
          </button>

          <button
            type="button"
            id="btn-confirm-lifecycle-action"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition shadow-sm ${confirmBtnStyle}`}
          >
            {confirmBtnText}
          </button>
        </div>
      </div>
    </div>
  );
};
