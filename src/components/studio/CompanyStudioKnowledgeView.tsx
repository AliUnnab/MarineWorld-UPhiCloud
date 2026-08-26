import React, { useState, useEffect } from "react";
import {
  FileText,
  Share2,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  ExternalLink,
  Building2,
  Package,
  Wrench,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  AlertTriangle,
  Archive,
  Upload,
  Folder,
  Globe,
  Database,
  ArrowRight,
  Info,
  Check,
  PowerOff,
  Trash2,
  Unlink,
} from "lucide-react";
import type { DocumentEntity, CompanyEntity, CompanyOffering } from "@/lib/types";
import { getCompanyById } from "@/lib/services/companyService";
import { getCurrentAuthSession, type AuthContext } from "@/lib/services/securityService";
import { marineSector } from "@/lib/sectors/marine";
import { getCompanyBySlug } from "@/lib/registry";
import { getCompanyOfferings } from "@/lib/services/offeringEntityService";
import {
  getCompanyDocumentConflicts,
  type DocumentConflictResolution,
} from "@/lib/services/knowledgeConflictService";
import {
  getKnowledgeSources,
  registerIngestedSource,
  disableGrounding,
  enableGrounding,
  archiveSource,
  unarchiveSource,
  removeSourceLink,
  deleteSourceSafely,
} from "@/lib/services/knowledgeLifecycleService";
import { DocumentConflictModal } from "@/components/studio/knowledge/DocumentConflictModal";
import { AddKnowledgeSourceModal } from "@/components/studio/knowledge/AddKnowledgeSourceModal";
import { SourceActionMenu } from "@/components/studio/knowledge/SourceActionMenu";
import { ViewSourceModal } from "@/components/studio/knowledge/ViewSourceModal";
import { ChangeScopeModal } from "@/components/studio/knowledge/ChangeScopeModal";
import {
  LifecycleConfirmationModal,
  type ConfirmationType,
} from "@/components/studio/knowledge/LifecycleConfirmationModal";
import { SafeDeleteModal } from "@/components/studio/knowledge/SafeDeleteModal";
import type { KnowledgeSourceType } from "@/lib/services/knowledgeIngestionService";

type KnowledgeClassification =
  | "ALL"
  | "COMPANY KNOWLEDGE"
  | "CERTIFICATIONS"
  | "TECHNICAL DOCUMENTS"
  | "POLICIES & PROCEDURES"
  | "COMMERCIAL DOCUMENTS";

type KnowledgeStateFilter = "ALL" | "ACTIVE" | "ARCHIVED";

interface CompanyStudioKnowledgeViewProps {
  companyId: string;
  auth?: AuthContext;
  onSaved?: () => void;
  onNavigateToOfferings?: () => void;
  onNavigateToPresence?: () => void;
}

export const CompanyStudioKnowledgeView: React.FC<CompanyStudioKnowledgeViewProps> = ({
  companyId,
  auth,
  onSaved,
  onNavigateToOfferings,
  onNavigateToPresence,
}) => {
  const currentAuth = auth || getCurrentAuthSession();
  const canonicalCompany =
    getCompanyById(companyId) ||
    (getCompanyBySlug(marineSector, companyId) as unknown as CompanyEntity);

  const [activeFilter, setActiveFilter] = useState<KnowledgeClassification>("ALL");
  const [activeStateFilter, setActiveStateFilter] = useState<KnowledgeStateFilter>("ACTIVE");
  const [documents, setDocuments] = useState<DocumentEntity[]>([]);
  const [offerings, setOfferings] = useState<CompanyOffering[]>([]);
  const [conflicts, setConflicts] = useState<DocumentConflictResolution[]>([]);
  const [activeConflictModal, setActiveConflictModal] = useState<DocumentConflictResolution | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [initialAddMethod, setInitialAddMethod] = useState<KnowledgeSourceType | undefined>(undefined);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showOfferingsNotice, setShowOfferingsNotice] = useState(false);

  // Lifecycle Modals State
  const [viewDoc, setViewDoc] = useState<DocumentEntity | null>(null);
  const [scopeDoc, setScopeDoc] = useState<DocumentEntity | null>(null);
  const [confirmState, setConfirmState] = useState<{
    doc: DocumentEntity;
    type: ConfirmationType;
  } | null>(null);
  const [safeDeleteDoc, setSafeDeleteDoc] = useState<DocumentEntity | null>(null);

  const reloadData = () => {
    const docs = getKnowledgeSources(companyId);
    setDocuments(docs);

    const offs = getCompanyOfferings(companyId);
    setOfferings(offs);

    const cList = getCompanyDocumentConflicts(companyId);
    setConflicts(cList);
  };

  useEffect(() => {
    reloadData();
  }, [companyId]);

  // Derived Statistics
  const activeCount = documents.filter((d) => d.status === "ACTIVE").length;
  const groundedCount = documents.filter(
    (d) => d.status === "ACTIVE" && d.groundingStatus === "GROUNDED"
  ).length;
  const archivedCount = documents.filter((d) => d.status === "ARCHIVED").length;
  const openConflictsCount = conflicts.filter((c) => c.status === "OPEN").length;

  const linkedOfferingsCount = offerings.filter((off) =>
    documents.some((d) => d.productId === off.id || d.serviceId === off.id)
  ).length;

  const linkedFacilitiesCount = documents.filter((d) => d.metadata?.facilityName || d.metadata?.facilityId).length;

  // Filter Logic
  const filteredDocuments = documents.filter((doc) => {
    // 1. State Filter (Active / Archived / All)
    if (activeStateFilter === "ACTIVE" && doc.status === "ARCHIVED") return false;
    if (activeStateFilter === "ARCHIVED" && doc.status !== "ARCHIVED") return false;

    // 2. Classification Filter
    if (activeFilter === "ALL") return true;
    if (activeFilter === "COMPANY KNOWLEDGE") {
      return !doc.productId && !doc.serviceId && !doc.metadata?.facilityName;
    }
    if (activeFilter === "CERTIFICATIONS") return doc.documentType === "CERTIFICATE";
    if (activeFilter === "TECHNICAL DOCUMENTS") return doc.documentType === "TECHNICAL_SPEC";
    if (activeFilter === "POLICIES & PROCEDURES") return doc.documentType === "PROCEDURE";
    if (activeFilter === "COMMERCIAL DOCUMENTS") return doc.documentType === "CONTRACT";

    return true;
  });

  // Google Drive Manual Sync
  const handleSyncDrive = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setSuccessMessage("Google Drive folder synced. 1 new source ready for review.");
      setTimeout(() => setSuccessMessage(null), 4000);
      reloadData();
    }, 900);
  };

  // Open Add Modal with specific pre-selected method
  const openAddWithMethod = (method: KnowledgeSourceType) => {
    setInitialAddMethod(method);
    setIsAddModalOpen(true);
  };

  // Grounding Complete Handler
  const handleGroundingComplete = (newDoc: DocumentEntity, summaryMsg: string) => {
    registerIngestedSource(newDoc, currentAuth?.displayName || "Company Operator");
    reloadData();
    setSuccessMessage(summaryMsg);
    setTimeout(() => setSuccessMessage(null), 4500);
    if (onSaved) onSaved();
  };

  // Lifecycle Action Handlers
  const handleToggleGrounding = (doc: DocumentEntity) => {
    const isCurrentlyGrounded = doc.groundingStatus === "GROUNDED" && doc.status === "ACTIVE";
    setConfirmState({
      doc,
      type: isCurrentlyGrounded ? "DISABLE_GROUNDING" : "ENABLE_GROUNDING",
    });
  };

  const handleToggleArchive = (doc: DocumentEntity) => {
    const isArchived = doc.status === "ARCHIVED";
    setConfirmState({
      doc,
      type: isArchived ? "UNARCHIVE_SOURCE" : "ARCHIVE_SOURCE",
    });
  };

  const handleRemoveLinkAction = (doc: DocumentEntity) => {
    setConfirmState({
      doc,
      type: "REMOVE_LINK",
    });
  };

  // Execute Confirmed Lifecycle Mutation
  const handleExecuteLifecycleConfirm = (reason?: string) => {
    if (!confirmState) return;
    const { doc, type } = confirmState;
    const operatorName = currentAuth?.displayName || "Company Operator";

    let message = "";
    if (type === "DISABLE_GROUNDING") {
      const res = disableGrounding(companyId, doc.id, operatorName, reason);
      if (res.success) message = `Grounding disabled for "${doc.title}".`;
    } else if (type === "ENABLE_GROUNDING") {
      const res = enableGrounding(companyId, doc.id, operatorName);
      if (res.success) message = `Knowledge source "${doc.title}" grounded for Company AI.`;
    } else if (type === "ARCHIVE_SOURCE") {
      const res = archiveSource(companyId, doc.id, operatorName, reason);
      if (res.success) message = `Source "${doc.title}" moved to archive.`;
    } else if (type === "UNARCHIVE_SOURCE") {
      const res = unarchiveSource(companyId, doc.id, operatorName);
      if (res.success) message = `Source "${doc.title}" restored from archive.`;
    } else if (type === "REMOVE_LINK") {
      const res = removeSourceLink(companyId, doc.id, operatorName);
      if (res.success) message = `Relationship link removed from "${doc.title}". Scope set to Company Knowledge.`;
    }

    reloadData();
    setConfirmState(null);
    if (message) {
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(null), 3500);
    }
  };

  // Safe Deletion Completed Handler
  const handleSourceDeleted = (docId: string, msg: string) => {
    reloadData();
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  // Scope Updated Handler
  const handleScopeUpdated = (updatedDoc: DocumentEntity, msg: string) => {
    reloadData();
    setScopeDoc(null);
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const availableOfferings = offerings.filter((o) => o.status === "ACTIVE" || o.status === "READY");

  return (
    <div className="space-y-6" id="module-knowledge-view">
      {/* 1. CANONICAL PURPOSE BANNER */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-royal tracking-wider uppercase">
                05 — KNOWLEDGE
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-royal/10 text-royal">
                COMPANY BRAIN
              </span>
            </div>
            <h2 className="text-xl font-bold text-graphite tracking-tight font-mono">
              Teach Your Company AI
            </h2>
            <p className="text-xs text-stone leading-relaxed">
              Add the information your company AI should know.
            </p>
          </div>

          {/* Primary Action Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="btn-add-knowledge-primary"
              onClick={() => {
                setInitialAddMethod(undefined);
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-royal hover:bg-royal/90 text-white font-bold text-xs transition flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Knowledge Source</span>
            </button>
          </div>
        </div>

        {/* 2. OPERATIONAL SUMMARY METRICS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-line/60">
          <div className="p-3.5 rounded-xl bg-canvas border border-line space-y-1">
            <div className="text-[10px] font-mono font-bold text-stone uppercase tracking-wider">
              Total Sources
            </div>
            <div className="text-lg font-bold text-graphite font-mono">
              {documents.length} <span className="text-xs font-normal text-stone">Documents</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas border border-line space-y-1">
            <div className="text-[10px] font-mono font-bold text-stone uppercase tracking-wider">
              Active in AI Grounding
            </div>
            <div className="text-lg font-bold text-emerald-800 font-mono">
              {groundedCount} <span className="text-xs font-normal text-stone">Grounded</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas border border-line space-y-1">
            <div className="text-[10px] font-mono font-bold text-stone uppercase tracking-wider">
              Needs Review
            </div>
            <div className={`text-lg font-bold font-mono ${openConflictsCount > 0 ? "text-amber-800" : "text-graphite"}`}>
              {openConflictsCount} <span className="text-xs font-normal text-stone">Conflicts</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas border border-line space-y-1">
            <div className="text-[10px] font-mono font-bold text-stone uppercase tracking-wider">
              Archived
            </div>
            <div className="text-lg font-bold text-graphite font-mono">
              {archivedCount} <span className="text-xs font-normal text-stone">Archived</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SIMPLIFIED SOURCE INGESTION & GOOGLE DRIVE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Ingestion Actions (2 cols on lg) */}
        <div className="lg:col-span-2 bg-white border border-line rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <h3 className="text-xs font-bold text-graphite uppercase tracking-wider font-mono">
              Add Information
            </h3>
            <span className="text-[11px] text-stone">
              Teach Company AI
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Upload from Computer */}
            <button
              type="button"
              id="btn-upload-computer"
              onClick={() => openAddWithMethod("DESKTOP_UPLOAD")}
              className="p-3.5 rounded-xl border border-line bg-canvas hover:bg-royal/5 hover:border-royal/40 transition text-left space-y-2 group flex flex-col justify-between"
            >
              <div className="w-8 h-8 rounded-lg bg-white border border-line flex items-center justify-center text-royal shadow-2xs group-hover:scale-105 transition-transform">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-graphite group-hover:text-royal transition-colors">
                  Upload from Computer
                </div>
                <div className="text-[10px] text-stone mt-0.5">
                  PDF, DOCX, XLSX, TXT, Images
                </div>
              </div>
            </button>

            {/* Add from Google Drive */}
            <button
              type="button"
              id="btn-add-google-drive"
              onClick={() => openAddWithMethod("GOOGLE_DRIVE")}
              className="p-3.5 rounded-xl border border-line bg-canvas hover:bg-amber-500/5 hover:border-amber-500/40 transition text-left space-y-2 group flex flex-col justify-between"
            >
              <div className="w-8 h-8 rounded-lg bg-white border border-line flex items-center justify-center text-amber-600 shadow-2xs group-hover:scale-105 transition-transform">
                <Folder className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-graphite group-hover:text-amber-700 transition-colors">
                  Add from Google Drive
                </div>
                <div className="text-[10px] text-stone mt-0.5">
                  Synced company folder
                </div>
              </div>
            </button>

            {/* Add Web Source */}
            <button
              type="button"
              id="btn-add-web-source"
              onClick={() => openAddWithMethod("URL_SOURCE")}
              className="p-3.5 rounded-xl border border-line bg-canvas hover:bg-emerald-500/5 hover:border-emerald-500/40 transition text-left space-y-2 group flex flex-col justify-between"
            >
              <div className="w-8 h-8 rounded-lg bg-white border border-line flex items-center justify-center text-emerald-600 shadow-2xs group-hover:scale-105 transition-transform">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-graphite group-hover:text-emerald-700 transition-colors">
                  Add Web Source
                </div>
                <div className="text-[10px] text-stone mt-0.5">
                  Accreditations, URLs & pages
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Google Drive Status Card */}
        <div className="bg-white border border-line rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between" id="google-drive-card">
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <div className="flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-amber-600" />
                <h3 className="text-xs font-bold text-graphite uppercase tracking-wider font-mono">
                  Google Drive
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Connected
              </span>
            </div>

            <p className="text-xs text-stone">
              Your connected Google Drive folder is available here.
            </p>

            <div className="p-2.5 rounded-xl bg-canvas border border-line text-[11px] font-mono text-stone space-y-1">
              <div className="truncate">
                Folder: <strong className="text-graphite">/MarineWorld-Corporate-Knowledge</strong>
              </div>
              <div>
                Last synced: <span className="text-graphite font-semibold">Today (10m ago)</span>
              </div>
            </div>
          </div>

          <button
            id="knowledge-btn-sync-drive"
            onClick={handleSyncDrive}
            disabled={isSyncing}
            className="w-full py-2 px-3 rounded-xl bg-canvas hover:bg-mist text-graphite text-xs font-semibold border border-line flex items-center justify-center gap-1.5 transition min-h-[38px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-royal ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync Now"}
          </button>
        </div>
      </div>

      {/* Global Success Notification */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 4. COMPACT CROSS-REFERENCES (OFFERINGS & PRESENCE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Knowledge ↔ Offerings */}
        <div className="bg-canvas border border-line rounded-2xl p-4 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white border border-line flex items-center justify-center text-royal shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-graphite truncate">
                {linkedOfferingsCount || 3} offerings use linked knowledge
              </div>
              <div className="text-[11px] text-stone truncate">
                Product specifications managed in Offerings
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onNavigateToOfferings) onNavigateToOfferings();
              else {
                setShowOfferingsNotice(true);
                setTimeout(() => setShowOfferingsNotice(false), 3500);
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-mist border border-line text-graphite font-semibold text-xs transition flex items-center gap-1 shrink-0 shadow-2xs"
          >
            <span>View Offerings</span>
            <ArrowRight className="w-3 h-3 text-stone" />
          </button>
        </div>

        {/* Knowledge ↔ Presence */}
        <div className="bg-canvas border border-line rounded-2xl p-4 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white border border-line flex items-center justify-center text-amber-600 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-graphite truncate">
                {linkedFacilitiesCount || 2} facilities use linked knowledge
              </div>
              <div className="text-[11px] text-stone truncate">
                Physical yards & berths managed in Presence
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onNavigateToPresence) onNavigateToPresence();
            }}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-mist border border-line text-graphite font-semibold text-xs transition flex items-center gap-1 shrink-0 shadow-2xs"
          >
            <span>View Presence</span>
            <ArrowRight className="w-3 h-3 text-stone" />
          </button>
        </div>
      </div>

      {showOfferingsNotice && (
        <div className="p-3 rounded-xl bg-royal/5 border border-royal/20 text-royal text-xs flex items-center justify-between animate-fade-in">
          <span>Offering-specific technical specifications are maintained directly within <strong>04 — Offerings</strong>.</span>
          <button onClick={() => setShowOfferingsNotice(false)} className="text-royal/80 hover:text-royal font-bold">×</button>
        </div>
      )}

      {/* 5. SOURCE CONFLICTS (REVIEW REQUIRED) */}
      {conflicts.length > 0 && (
        <div
          className="bg-white border border-amber-300 rounded-2xl p-5 shadow-sm space-y-4"
          id="knowledge-conflicts-panel"
        >
          <div className="flex items-center justify-between border-b border-amber-200 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                REVIEW REQUIRED
              </span>
              <span className="text-xs font-bold text-graphite">
                Information Inconsistency
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-amber-900">
              {openConflictsCount} Item{openConflictsCount === 1 ? "" : "s"} Needing Review
            </span>
          </div>

          <div className="space-y-3">
            {conflicts.map((c) => {
              const isResolved = c.status === "RESOLVED";
              return (
                <div
                  key={c.conflictId}
                  className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
                    isResolved
                      ? "bg-emerald-50/40 border-emerald-200"
                      : "bg-amber-50/40 border-amber-200"
                  }`}
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          isResolved
                            ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                            : "bg-amber-100 text-amber-900 border border-amber-200"
                        }`}
                      >
                        {isResolved ? "RESOLVED" : "REVIEW REQUIRED"}
                      </span>
                      <h4 className="text-xs font-bold text-graphite font-mono">
                        {c.fieldLabel}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* Source A */}
                      <div className="p-2.5 rounded-lg bg-white border border-line/70 space-y-1">
                        <div className="text-[10px] font-mono text-stone truncate">
                          Source A: {c.sourceA.sourceDocumentName}
                        </div>
                        <div className="font-bold text-graphite font-mono text-xs">
                          {c.sourceA.extractedValue}
                        </div>
                      </div>

                      {/* Source B */}
                      <div className="p-2.5 rounded-lg bg-white border border-line/70 space-y-1">
                        <div className="text-[10px] font-mono text-stone truncate">
                          Source B: {c.sourceB.sourceDocumentName}
                        </div>
                        <div className="font-bold text-graphite font-mono text-xs">
                          {c.sourceB.extractedValue}
                        </div>
                      </div>
                    </div>

                    {isResolved && c.resolvedValue && (
                      <div className="text-[11px] font-mono text-emerald-800 flex items-center gap-1.5 pt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          Confirmed Value: <strong>{c.resolvedValue}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Resolution Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 self-start md:self-auto">
                    {!isResolved ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveConflictModal(c);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-royal text-white hover:bg-royal/90 text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                      >
                        <span>Review Manually</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveConflictModal(c)}
                        className="px-3 py-1.5 rounded-xl bg-white border border-line text-graphite hover:bg-mist text-xs font-bold transition shadow-2xs"
                      >
                        View Decision
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. SOURCE LIST & FILTERS */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* State Tabs: Active, Archived, All */}
          <div className="inline-flex rounded-xl bg-canvas p-1 border border-line">
            <button
              type="button"
              id="tab-state-active"
              onClick={() => setActiveStateFilter("ACTIVE")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeStateFilter === "ACTIVE"
                  ? "bg-white text-graphite shadow-xs"
                  : "text-stone hover:text-graphite"
              }`}
            >
              <span>Active Sources</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-canvas border border-line/60 text-stone">
                {activeCount}
              </span>
            </button>

            <button
              type="button"
              id="tab-state-archived"
              onClick={() => setActiveStateFilter("ARCHIVED")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeStateFilter === "ARCHIVED"
                  ? "bg-white text-graphite shadow-xs"
                  : "text-stone hover:text-graphite"
              }`}
            >
              <span>Archived</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-canvas border border-line/60 text-stone">
                {archivedCount}
              </span>
            </button>

            <button
              type="button"
              id="tab-state-all"
              onClick={() => setActiveStateFilter("ALL")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeStateFilter === "ALL"
                  ? "bg-white text-graphite shadow-xs"
                  : "text-stone hover:text-graphite"
              }`}
            >
              <span>All Sources</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-canvas border border-line/60 text-stone">
                {documents.length}
              </span>
            </button>
          </div>
        </div>

        {/* Classification Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              "ALL",
              "COMPANY KNOWLEDGE",
              "CERTIFICATIONS",
              "TECHNICAL DOCUMENTS",
              "POLICIES & PROCEDURES",
              "COMMERCIAL DOCUMENTS",
            ] as KnowledgeClassification[]
          ).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeFilter === cat
                  ? "bg-royal text-white shadow-xs"
                  : "bg-white text-stone hover:bg-mist hover:text-graphite border border-line"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 7. CLEAN SOURCE LIST (Clear Relationship, Scope, & Usage Display) */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-graphite">Company Knowledge Sources</h3>
            <span className="text-xs font-mono text-stone">
              ({filteredDocuments.length} shown of {documents.length} total)
            </span>
          </div>
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-canvas border border-dashed border-line space-y-2">
            <FileText className="w-8 h-8 text-stone/60 mx-auto" />
            <p className="text-xs text-stone font-medium">
              No knowledge sources match the selected filter.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredDocuments.map((doc) => {
              const currentTarget = doc.productId || doc.serviceId;
              const targetOffering = availableOfferings.find((o) => o.id === currentTarget);
              const isLinkedToOffering = Boolean(targetOffering || doc.productId || doc.serviceId);
              const isLinkedToFacility = Boolean(doc.metadata?.facilityName || doc.metadata?.facilityId);
              const isArchived = doc.status === "ARCHIVED";
              const isDisabled = doc.groundingStatus === "DISABLED";
              const isGrounded = doc.status === "ACTIVE" && doc.groundingStatus === "GROUNDED";
              const isIndexed = doc.groundingStatus === "NOT_INDEXED";
              const hasConflict = conflicts.some(
                (c) =>
                  c.status === "OPEN" &&
                  (c.sourceA.sourceDocumentId === doc.id || c.sourceB.sourceDocumentId === doc.id)
              );

              // 1. Determine Status Badge
              let statusText = "GROUNDED";
              let statusClass = "bg-emerald-50 text-emerald-800 border-emerald-200";

              if (hasConflict) {
                statusText = "REVIEW REQUIRED";
                statusClass = "bg-amber-100 text-amber-900 border-amber-300";
              } else if (isArchived) {
                statusText = "ARCHIVED";
                statusClass = "bg-stone-100 text-stone-700 border-stone-300";
              } else if (isDisabled) {
                statusText = "DISABLED";
                statusClass = "bg-amber-50 text-amber-800 border-amber-200";
              } else if (isIndexed) {
                statusText = "INDEXED";
                statusClass = "bg-royal/5 text-royal-dark border-royal/20";
              }

              // 2. Knowledge Scope Badge
              let scopeBadge = "Company Knowledge";
              let scopeClass = "bg-canvas text-stone border-line";
              if (doc.metadata?.scope === "OFFERING" || (isLinkedToOffering && !doc.metadata?.scope)) {
                scopeBadge = "Offering Knowledge";
                scopeClass = "bg-royal/5 text-royal border-royal/20";
              } else if (doc.metadata?.scope === "FACILITY" || (isLinkedToFacility && !doc.metadata?.scope)) {
                scopeBadge = "Facility Knowledge";
                scopeClass = "bg-amber-500/10 text-amber-800 border-amber-500/20";
              }

              // 3. Resolved Linked Entity Name
              const linkedEntityName = isLinkedToOffering
                ? targetOffering?.name || "Autonomous Subsea ROV-4 Inspection System"
                : isLinkedToFacility
                ? (doc.metadata?.facilityName as string) || "North Sea Deepwater Berth 04"
                : null;

              return (
                <div
                  key={doc.id}
                  id={`knowledge-row-${doc.id}`}
                  onClick={() => setViewDoc(doc)}
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-3 cursor-pointer transition ${
                    isArchived
                      ? "bg-stone-50/70 border-stone-200 opacity-80"
                      : "bg-white border-line hover:border-royal/40 hover:shadow-2xs"
                  }`}
                >
                  <div className="space-y-2">
                    {/* Header Row: Title + Scope/Status Badges + Action Menu */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-royal shrink-0" />
                          <h4 className="text-xs sm:text-sm font-bold text-graphite truncate font-mono">
                            {doc.title}
                          </h4>
                          <span className="text-[10px] font-mono text-stone">v{doc.version || 1}</span>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${scopeClass}`}>
                            {scopeBadge}
                          </span>
                          <span
                            id={`badge-state-${doc.id}`}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${statusClass}`}
                          >
                            {statusText}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-start shrink-0" onClick={(e) => e.stopPropagation()}>
                        <SourceActionMenu
                          document={doc}
                          onView={() => setViewDoc(doc)}
                          onChangeScope={() => setScopeDoc(doc)}
                          onToggleGrounding={() => handleToggleGrounding(doc)}
                          onToggleArchive={() => handleToggleArchive(doc)}
                          onRemoveLink={
                            isLinkedToOffering ? () => handleRemoveLinkAction(doc) : undefined
                          }
                          onDelete={() => setSafeDeleteDoc(doc)}
                        />
                      </div>
                    </div>

                    {/* Review Required Warning if in conflict */}
                    {hasConflict && (
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-mono flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span><strong>REVIEW REQUIRED:</strong> Conflicting specifications detected. Not active in AI until reviewed.</span>
                      </div>
                    )}

                    {/* Explicit USED BY and LINKED TO Relationship Section */}
                    <div className="pt-2 border-t border-line/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono">
                      <div>
                        <div className="text-[9.5px] text-stone uppercase font-bold tracking-wider">
                          Used by:
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="px-2 py-0.5 rounded bg-royal/10 text-royal font-bold text-[10.5px]">
                            Company AI
                          </span>
                          {isLinkedToOffering && (
                            <span className="px-2 py-0.5 rounded bg-royal/10 text-royal font-bold text-[10.5px]">
                              Offering AI × 1
                            </span>
                          )}
                          {isLinkedToFacility && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-800 font-bold text-[10.5px]">
                              Facility AI × 1
                            </span>
                          )}
                        </div>
                      </div>

                      {linkedEntityName && (
                        <div>
                          <div className="text-[9.5px] text-stone uppercase font-bold tracking-wider">
                            Linked to:
                          </div>
                          <div className="text-graphite font-bold truncate mt-0.5 text-[11px] flex items-center gap-1">
                            {isLinkedToOffering ? (
                              <Package className="w-3 h-3 text-royal shrink-0" />
                            ) : (
                              <Building2 className="w-3 h-3 text-amber-600 shrink-0" />
                            )}
                            <span className="truncate">{linkedEntityName}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DIALOGS */}

      {/* 1. Add Knowledge Source Modal */}
      <AddKnowledgeSourceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        initialMethod={initialAddMethod}
        companyId={companyId}
        businessId={canonicalCompany?.businessId || "MW-BUS-001"}
        availableOfferings={availableOfferings}
        existingDocuments={documents}
        onGroundingComplete={handleGroundingComplete}
      />

      {/* 2. View Source Detail Modal */}
      {viewDoc && (
        <ViewSourceModal
          document={viewDoc}
          isOpen={Boolean(viewDoc)}
          onClose={() => setViewDoc(null)}
          offerings={availableOfferings}
          onOpenScopeChange={() => {
            const doc = viewDoc;
            setViewDoc(null);
            setScopeDoc(doc);
          }}
          onToggleGrounding={() => {
            const doc = viewDoc;
            setViewDoc(null);
            handleToggleGrounding(doc);
          }}
          onToggleArchive={() => {
            const doc = viewDoc;
            setViewDoc(null);
            handleToggleArchive(doc);
          }}
          onRemoveLink={
            (viewDoc.productId || viewDoc.serviceId)
              ? () => {
                  const doc = viewDoc;
                  setViewDoc(null);
                  handleRemoveLinkAction(doc);
                }
              : undefined
          }
          onDelete={() => {
            const doc = viewDoc;
            setViewDoc(null);
            setSafeDeleteDoc(doc);
          }}
          onNavigateToOffering={(offeringId) => {
            if (onNavigateToOfferings) onNavigateToOfferings();
          }}
        />
      )}

      {/* 3. Change AI Scope Modal */}
      {scopeDoc && (
        <ChangeScopeModal
          document={scopeDoc}
          isOpen={Boolean(scopeDoc)}
          onClose={() => setScopeDoc(null)}
          offerings={availableOfferings}
          onScopeUpdated={handleScopeUpdated}
        />
      )}

      {/* 4. Lifecycle Confirmation Modal (Disable, Enable, Archive, Unarchive, Remove Link) */}
      {confirmState && (
        <LifecycleConfirmationModal
          document={confirmState.doc}
          type={confirmState.type}
          isOpen={Boolean(confirmState)}
          onClose={() => setConfirmState(null)}
          onConfirm={handleExecuteLifecycleConfirm}
        />
      )}

      {/* 5. Safe Delete Modal (Dependency Check Protection) */}
      {safeDeleteDoc && (
        <SafeDeleteModal
          document={safeDeleteDoc}
          isOpen={Boolean(safeDeleteDoc)}
          onClose={() => setSafeDeleteDoc(null)}
          onDeleted={handleSourceDeleted}
          onDocUpdated={(updatedDoc, msg) => {
            reloadData();
            setSuccessMessage(msg);
            setTimeout(() => setSuccessMessage(null), 3500);
          }}
        />
      )}

      {/* 6. Conflict Resolution Modal */}
      {activeConflictModal && (
        <DocumentConflictModal
          conflict={activeConflictModal}
          isOpen={Boolean(activeConflictModal)}
          onClose={() => setActiveConflictModal(null)}
          onResolved={(resolved) => {
            setConflicts((prev) =>
              prev.map((c) => (c.conflictId === resolved.conflictId ? resolved : c))
            );
            setActiveConflictModal(null);
            setSuccessMessage(
              `Conflict for "${resolved.fieldLabel}" resolved with confirmed value: ${resolved.resolvedValue}`
            );
            setTimeout(() => setSuccessMessage(null), 3500);
          }}
        />
      )}
    </div>
  );
};
