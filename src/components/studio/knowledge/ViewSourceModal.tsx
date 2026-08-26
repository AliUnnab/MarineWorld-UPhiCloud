import React from "react";
import {
  X,
  FileText,
  ShieldCheck,
  Layers,
  Cpu,
  CheckCircle2,
  Clock,
  ExternalLink,
  Folder,
  Eye,
  Lock,
  Building2,
  Package,
  Wrench,
  Activity,
  PowerOff,
  Archive,
  Trash2,
  Unlink,
  Radio,
  Globe,
  Upload,
  Database,
  ArrowRight,
} from "lucide-react";
import type { DocumentEntity, CompanyOffering } from "@/lib/types";
import { getKnowledgeAuditLogs } from "@/lib/services/knowledgeLifecycleService";

interface ViewSourceModalProps {
  document: DocumentEntity | null;
  isOpen: boolean;
  onClose: () => void;
  offerings: CompanyOffering[];
  onOpenScopeChange?: () => void;
  onToggleGrounding?: () => void;
  onToggleArchive?: () => void;
  onRemoveLink?: () => void;
  onDelete?: () => void;
  onNavigateToOffering?: (offeringId: string) => void;
}

export const ViewSourceModal: React.FC<ViewSourceModalProps> = ({
  document,
  isOpen,
  onClose,
  offerings,
  onOpenScopeChange,
  onToggleGrounding,
  onToggleArchive,
  onRemoveLink,
  onDelete,
  onNavigateToOffering,
}) => {
  if (!isOpen || !document) return null;

  const auditLogs = getKnowledgeAuditLogs(document.companyId, document.id);
  const metadata = (document.metadata || {}) as Record<string, any>;
  const extractedFacts = (metadata.extractedFacts || []) as Array<{
    id: string;
    fieldLabel: string;
    canonicalValue: string;
    sourceCitation: string;
    confidenceScore: number;
    confirmationState: string;
    category?: string;
  }>;

  const targetOffering = offerings.find(
    (o) => o.id === document.productId || o.id === document.serviceId
  );
  const isLinkedToOffering = Boolean(targetOffering);
  const isLinkedToFacility = Boolean(metadata.facilityName || metadata.facilityId);

  // Knowledge Scope display
  const scopeType = isLinkedToOffering
    ? "Offering Knowledge"
    : isLinkedToFacility
    ? "Facility Knowledge"
    : "Company Knowledge";

  const isGrounded = document.groundingStatus === "GROUNDED" && document.status === "ACTIVE";
  const isArchived = document.status === "ARCHIVED";
  const isDisabled = document.groundingStatus === "DISABLED";
  const isIndexed = document.groundingStatus === "NOT_INDEXED";
  const isReviewRequired = (document as any).hasConflict || (document as any).reviewRequired;

  let statusBadgeColor = "bg-emerald-50 text-emerald-800 border-emerald-200";
  let statusLabel = "GROUNDED";
  let groundingStatusLabel = "Active";

  if (isReviewRequired) {
    statusBadgeColor = "bg-amber-100 text-amber-900 border-amber-300";
    statusLabel = "REVIEW REQUIRED";
    groundingStatusLabel = "Not active in AI until reviewed";
  } else if (isArchived) {
    statusBadgeColor = "bg-stone-100 text-stone-700 border-stone-300";
    statusLabel = "ARCHIVED";
    groundingStatusLabel = "Disabled (Archived)";
  } else if (isDisabled) {
    statusBadgeColor = "bg-amber-50 text-amber-800 border-amber-200";
    statusLabel = "DISABLED";
    groundingStatusLabel = "Disabled";
  } else if (isIndexed) {
    statusBadgeColor = "bg-sky-50 text-sky-800 border-sky-200";
    statusLabel = "INDEXED";
    groundingStatusLabel = "Indexed (Pending Verification)";
  }

  // Source Type
  let sourceTypeLabel = "Technical Document";
  if (document.documentType === "CERTIFICATE") sourceTypeLabel = "Certificate";
  else if (document.documentType === "TECHNICAL_SPEC") sourceTypeLabel = "Technical Spec";
  else if (document.documentType === "CONTRACT") sourceTypeLabel = "Commercial Document";
  else if (document.documentType === "POLICY" || document.documentType === "PROCEDURE") sourceTypeLabel = "Policy / Protocol";

  // Source Origin
  let sourceOriginLabel = "Computer Upload";
  let SourceIcon = Upload;
  if (document.sourceType === "GOOGLE_DRIVE" || metadata.sourceReference?.includes("Google Drive") || metadata.sourceReference?.startsWith("/MarineWorld-Corporate-Knowledge")) {
    sourceOriginLabel = "Google Drive (Synced Folder)";
    SourceIcon = Folder;
  } else if (document.sourceType === "URL_SOURCE") {
    sourceOriginLabel = "Web Source (Online URL)";
    SourceIcon = Globe;
  } else if (document.sourceType === "EXISTING_SOURCE") {
    sourceOriginLabel = "MarineWorld Source (Existing Knowledge)";
    SourceIcon = Database;
  }

  const updatedFormatted = document.updatedAt
    ? new Date(document.updatedAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Recently";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-graphite/60 backdrop-blur-xs animate-fade-in"
      id={`modal-view-source-${document.id}`}
    >
      <div className="bg-white border border-line rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-canvas shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-royal/10 text-royal flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-royal uppercase tracking-wider block">
                  COMPANY KNOWLEDGE SOURCE
                </span>
                <span className={`px-2 py-0.2 rounded text-[9.5px] font-mono font-bold border ${statusBadgeColor}`}>
                  {statusLabel}
                </span>
              </div>
              <h3 className="text-sm font-bold text-graphite truncate font-mono">
                {document.title}
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
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Canonical Source Specification Matrix */}
          <div className="p-4 rounded-xl bg-canvas border border-line space-y-3">
            <div className="text-[10px] font-mono text-stone uppercase font-bold flex items-center gap-1.5 border-b border-line/60 pb-2">
              <Layers className="w-3.5 h-3.5 text-royal" />
              <span>SOURCE INFORMATION & SPECIFICATION</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono">
              <div>
                <span className="text-[10px] text-stone uppercase block font-semibold">SOURCE:</span>
                <span className="font-bold text-graphite">{document.title}</span>
              </div>

              <div>
                <span className="text-[10px] text-stone uppercase block font-semibold">STATUS:</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadgeColor}`}>
                  {statusLabel}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-stone uppercase block font-semibold">SOURCE TYPE:</span>
                <span className="font-bold text-graphite">{sourceTypeLabel}</span>
              </div>

              <div>
                <span className="text-[10px] text-stone uppercase block font-semibold">GROUNDING:</span>
                <span className={`font-bold ${isGrounded ? "text-emerald-800" : isReviewRequired ? "text-amber-800" : "text-stone"}`}>
                  {groundingStatusLabel}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-stone uppercase block font-semibold">SOURCE ORIGIN:</span>
                <span className="font-bold text-graphite flex items-center gap-1">
                  <SourceIcon className="w-3 h-3 text-stone shrink-0" />
                  <span>{sourceOriginLabel}</span>
                </span>
              </div>

              <div>
                <span className="text-[10px] text-stone uppercase block font-semibold">LAST UPDATED:</span>
                <span className="font-bold text-graphite">{updatedFormatted}</span>
              </div>
            </div>
          </div>

          {/* Canonical Relationship & Usage Card */}
          <div className="p-4 rounded-xl bg-canvas border border-line space-y-3">
            <div className="flex items-center justify-between border-b border-line/60 pb-2">
              <div className="text-[10px] font-mono text-stone uppercase font-bold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-royal" />
                <span>USED BY & LINKED RELATIONSHIPS</span>
              </div>
              {onOpenScopeChange && !isArchived && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenScopeChange();
                  }}
                  className="text-royal font-bold hover:underline text-[11px]"
                >
                  Change Scope
                </button>
              )}
            </div>

            <div className="space-y-3">
              {/* USED BY breakdown */}
              <div>
                <span className="text-[10px] text-stone uppercase font-semibold font-mono block mb-1">
                  USED BY:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-royal/10 text-royal border border-royal/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-royal" />
                    Company AI
                  </span>
                  {isLinkedToOffering && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-royal/10 text-royal border border-royal/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-royal" />
                      Offering AI × 1
                    </span>
                  )}
                  {isLinkedToFacility && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/15 text-amber-800 border border-amber-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-amber-600" />
                      Facility AI × 1
                    </span>
                  )}
                </div>
              </div>

              {/* LINKED ENTITIES breakdown */}
              <div>
                <span className="text-[10px] text-stone uppercase font-semibold font-mono block mb-1">
                  LINKED ENTITIES:
                </span>

                {isLinkedToOffering && targetOffering && (
                  <div className="p-2.5 rounded-lg bg-white border border-line flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Package className="w-3.5 h-3.5 text-royal shrink-0" />
                      <div className="truncate">
                        <span className="text-stone font-mono text-[10.5px]">Offering: </span>
                        <strong className="text-graphite font-mono text-xs">{targetOffering.name}</strong>
                      </div>
                    </div>
                    {onNavigateToOffering && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigateToOffering(targetOffering.id);
                        }}
                        className="text-royal font-bold text-[11px] hover:underline flex items-center gap-1 shrink-0 ml-2"
                      >
                        <span>View Offering</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {isLinkedToFacility && (
                  <div className="p-2.5 rounded-lg bg-white border border-line flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <div className="truncate">
                        <span className="text-stone font-mono text-[10.5px]">Facility: </span>
                        <strong className="text-graphite font-mono text-xs">{metadata.facilityName || "Facility Base"}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {!isLinkedToOffering && !isLinkedToFacility && (
                  <div className="p-2.5 rounded-lg bg-white border border-line text-[11px] text-stone font-mono">
                    None (Maintained directly as company-wide knowledge for general Company AI grounding)
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Extracted Structured Facts */}
          {extractedFacts.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-mono text-stone uppercase font-bold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-royal" />
                <span>CONFIRMED EXTRACTED FACTS ({extractedFacts.length})</span>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {extractedFacts.map((fact) => (
                  <div
                    key={fact.id}
                    className="p-3 rounded-xl bg-canvas border border-line space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-graphite font-mono text-[11px]">
                        {fact.fieldLabel}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {fact.confidenceScore}% CONFIDENCE
                      </span>
                    </div>
                    <div className="font-bold text-royal text-xs font-mono">
                      {fact.canonicalValue}
                    </div>
                    {fact.sourceCitation && (
                      <div className="text-[10px] font-mono text-stone italic">
                        Citation: {fact.sourceCitation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Operator Direct Actions */}
          <div className="space-y-2 pt-2 border-t border-line">
            <div className="text-[10px] font-mono text-stone uppercase font-bold">
              Operator Actions
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {onOpenScopeChange && !isArchived && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenScopeChange();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white border border-line hover:bg-mist text-graphite font-bold text-xs transition shadow-2xs flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5 text-royal" />
                  <span>Change Scope</span>
                </button>
              )}

              {isLinkedToOffering && onRemoveLink && !isArchived && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRemoveLink();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white border border-line hover:bg-amber-50 text-amber-900 font-bold text-xs transition shadow-2xs flex items-center gap-1.5"
                >
                  <Unlink className="w-3.5 h-3.5 text-amber-600" />
                  <span>Remove Link</span>
                </button>
              )}

              {onToggleGrounding && !isArchived && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onToggleGrounding();
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs flex items-center gap-1.5 ${
                    isGrounded
                      ? "bg-white border-amber-200 text-amber-800 hover:bg-amber-50"
                      : "bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700"
                  }`}
                >
                  <PowerOff className="w-3.5 h-3.5" />
                  <span>{isGrounded ? "Disable Grounding" : "Enable Grounding"}</span>
                </button>
              )}

              {onToggleArchive && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onToggleArchive();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white border border-line hover:bg-mist text-stone hover:text-graphite font-bold text-xs transition shadow-2xs flex items-center gap-1.5"
                >
                  <Archive className="w-3.5 h-3.5 text-stone" />
                  <span>{isArchived ? "Unarchive Source" : "Archive Source"}</span>
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onDelete();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white border border-red-200 text-red-700 hover:bg-red-50 font-bold text-xs transition shadow-2xs flex items-center gap-1.5 ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-line bg-canvas flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-line hover:bg-mist text-graphite text-xs font-bold transition shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
