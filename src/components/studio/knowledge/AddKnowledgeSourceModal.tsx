import React, { useState, useEffect } from "react";
import {
  X,
  Upload,
  Folder,
  Globe,
  Database,
  CheckCircle2,
  FileText,
  AlertCircle,
  Cpu,
  ArrowRight,
  RefreshCw,
  Edit2,
  Check,
  ChevronRight,
  ChevronDown,
  Shield,
  Layers,
  Building2,
  Package,
  Wrench,
  Trash2,
  ExternalLink,
  Lock,
  Info,
  Anchor,
  HardDrive,
  ShieldCheck,
} from "lucide-react";
import type {
  CompanyOffering,
  DocumentEntity,
  DocumentVisibility,
} from "@/lib/types";
import {
  processSourceIngestion,
  finalizeKnowledgeGrounding,
  type KnowledgeSourceType,
  type KnowledgeClassificationType,
  type AIScopeType,
  type AIExtractionResult,
  type ExtractedStructuredFact,
  type IngestionSourcePayload,
} from "@/lib/services/knowledgeIngestionService";
import {
  openGoogleDrivePicker,
  requestGoogleAccessToken,
  parseGoogleDriveLink,
  SERVICE_ACCOUNT_EMAIL,
  DEFAULT_ROOT_WORKSPACE,
  type GoogleDriveSelectedFile,
} from "@/lib/services/googleDriveService";
import { saveCompanyDocument } from "@/services/knowledgeService";
import {
  uploadFileToStorage,
  deleteFileFromStorage,
  validateStorageFile,
} from "@/lib/services/storageService";
import type { OKFDocument } from "@/lib/types/okf";
import { buildOKFDocument, saveOKFDocumentToFirestore } from "@/lib/services/okfService";
import { OKFDocumentViewerModal } from "./OKFDocumentViewerModal";
import { GoogleDriveBrowserModal } from "./GoogleDriveBrowserModal";


interface AddKnowledgeSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMethod?: KnowledgeSourceType;
  companyId: string;
  businessId?: string;
  availableOfferings: CompanyOffering[];
  existingDocuments: DocumentEntity[];
  onGroundingComplete: (newDoc: DocumentEntity, summaryMsg: string) => void;
}

type ModalStep =
  | "CHOOSE_METHOD"
  | "METHOD_DESKTOP"
  | "METHOD_DRIVE"
  | "METHOD_URL"
  | "METHOD_EXISTING"
  | "AI_ANALYZING"
  | "REVIEW_AND_GROUND"
  | "GROUNDED_SUCCESS";

interface QueuedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "QUEUED" | "UPLOADING" | "UPLOADED";
  url?: string;
  storagePath?: string;
}

const INGESTION_PIPELINE_STEPS = [
  "Reading document and text content",
  "Identifying document type and structure",
  "Extracting key specifications and technical parameters",
  "Identifying certifications and compliance standards",
  "Checking commercial terms and validity dates",
  "Preparing knowledge for Company AI",
];

export const AddKnowledgeSourceModal: React.FC<AddKnowledgeSourceModalProps> = ({
  isOpen,
  onClose,
  initialMethod,
  companyId,
  businessId = "MW-BUS-N/A",
  availableOfferings,
  existingDocuments,
  onGroundingComplete,
}) => {
  const [step, setStep] = useState<ModalStep>("CHOOSE_METHOD");
  const [selectedMethod, setSelectedMethod] = useState<KnowledgeSourceType | null>(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Desktop files state
  const [fileQueue, setFileQueue] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Google Drive state
  const [selectedDriveItem, setSelectedDriveItem] = useState<{
    id: string;
    name: string;
    type: "FILE" | "FOLDER";
    path: string;
    size?: string;
  } | null>(null);

  // URL state
  const [inputUrl, setInputUrl] = useState("");
  const [urlFetchedPreview, setUrlFetchedPreview] = useState<{
    url: string;
    title: string;
    sourceType: string;
  } | null>(null);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  // Existing Source state
  const [selectedExistingDocId, setSelectedExistingDocId] = useState<string>("");

  // Ingestion Analysis Progress
  const [activeAnalysisStage, setActiveAnalysisStage] = useState(0);

  // AI Extraction Result & Review State
  const [extractionResult, setExtractionResult] = useState<AIExtractionResult | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedClassification, setEditedClassification] =
    useState<KnowledgeClassificationType>("TECHNICAL");
  const [editedScope, setEditedScope] = useState<AIScopeType>("COMPANY");
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>("");
  const [selectedFacilityName, setSelectedFacilityName] = useState<string>("Rotterdam Maritime Sector Base");
  const [showCustomOfferingSelect, setShowCustomOfferingSelect] = useState(false);
  const [selectedVisibility, setSelectedVisibility] =
    useState<DocumentVisibility>("PUBLIC");
  const [structuredFacts, setStructuredFacts] = useState<ExtractedStructuredFact[]>([]);
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [tempFactValue, setTempFactValue] = useState("");

  // Google Drive Live Picker State
  const [drivePickedFiles, setDrivePickedFiles] = useState<GoogleDriveSelectedFile[]>([]);
  const [isOpeningDrivePicker, setIsOpeningDrivePicker] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [driveLinkInput, setDriveLinkInput] = useState("");
  const [isDriveBrowserOpen, setIsDriveBrowserOpen] = useState(false);

  // OKF Inspector Modal State
  const [isOKFViewerOpen, setIsOKFViewerOpen] = useState(false);
  const [generatedOKFDoc, setGeneratedOKFDoc] = useState<OKFDocument | null>(null);

  // Reset modal state on open/close
  useEffect(() => {
    if (isOpen) {
      if (initialMethod === "DESKTOP_UPLOAD") {
        setSelectedMethod("DESKTOP_UPLOAD");
        setStep("METHOD_DESKTOP");
      } else if (initialMethod === "GOOGLE_DRIVE") {
        setSelectedMethod("GOOGLE_DRIVE");
        setStep("METHOD_DRIVE");
      } else if (initialMethod === "URL_SOURCE") {
        setSelectedMethod("URL_SOURCE");
        setStep("METHOD_URL");
      } else if (initialMethod === "EXISTING_SOURCE") {
        setSelectedMethod("EXISTING_SOURCE");
        setStep("METHOD_EXISTING");
      } else {
        setStep("CHOOSE_METHOD");
        setSelectedMethod(null);
      }
      setFileQueue([]);
      setSelectedDriveItem(null);
      setInputUrl("");
      setUrlFetchedPreview(null);
      setSelectedExistingDocId("");
      setExtractionResult(null);
      setEditingFactId(null);
      setShowMoreOptions(false);
      setShowCustomOfferingSelect(false);
      setDrivePickedFiles([]);
      setIsOpeningDrivePicker(false);
      setDriveError(null);
    }
  }, [isOpen, initialMethod]);

  if (!isOpen) return null;

  // Handlers for Desktop Upload (Direct Firebase Storage upload with live progress)
  const handleFileSelection = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);

    const initialItems: QueuedFile[] = fileArray.map((f, i) => ({
      id: `file-${Date.now()}-${i}`,
      name: f.name,
      size: f.size,
      type: f.name.split(".").pop()?.toUpperCase() || "FILE",
      progress: 0,
      status: "UPLOADING",
    }));
    setFileQueue((prev) => [...prev, ...initialItems]);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const targetId = initialItems[i].id;

      try {
        const res = await uploadFileToStorage(file, {
          companyId,
          categoryFolder: "documents",
          onProgress: (percent) => {
            setFileQueue((prev) =>
              prev.map((item) =>
                item.id === targetId ? { ...item, progress: percent } : item
              )
            );
          },
        });

        setFileQueue((prev) =>
          prev.map((item) =>
            item.id === targetId
              ? {
                  ...item,
                  progress: 100,
                  status: "UPLOADED",
                  url: res.url,
                  storagePath: res.storagePath,
                }
              : item
          )
        );
      } catch (err: any) {
        console.error("[AddKnowledgeSourceModal] Document upload error:", err);
      }
    }
  };

  const handleRemoveFile = (id: string) => {
    setFileQueue((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.url && target.url.includes("firebasestorage.app")) {
        deleteFileFromStorage(target.storagePath || target.url).catch(() => {});
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  // Trigger AI Ingestion Pipeline
  const startIngestionPipeline = (payload: IngestionSourcePayload) => {
    setStep("AI_ANALYZING");
    setActiveAnalysisStage(0);

    let currentStage = 0;
    const interval = setInterval(() => {
      currentStage++;
      if (currentStage < INGESTION_PIPELINE_STEPS.length) {
        setActiveAnalysisStage(currentStage);
      } else {
        clearInterval(interval);
        const result = processSourceIngestion(companyId, payload, availableOfferings);
        setExtractionResult(result);
        setEditedTitle(result.documentTitle);
        setEditedClassification(result.detectedClassification);
        setEditedScope("COMPANY"); // Default is strictly COMPANY KNOWLEDGE
        setSelectedOfferingId(result.detectedOfferingId || "");
        setSelectedFacilityName(result.detectedFacilityName || "Rotterdam Maritime Sector Base");
        setStructuredFacts(result.structuredFacts);

        // Construct canonical OKF document
        const okfDoc = buildOKFDocument({
          title: result.documentTitle,
          entityType: result.detectedOfferingId ? "PRODUCT" : "GENERAL_CORPORATE",
          companyId,
          sourceOrigin: payload.sourceType === "GOOGLE_DRIVE" ? "GOOGLE_DRIVE" : payload.sourceType === "URL_SOURCE" ? "URL_SOURCE" : "LOCAL_UPLOAD",
          originalFileName: payload.fileName || result.documentTitle,
          driveFileId: payload.sourceType === "GOOGLE_DRIVE" ? selectedDriveItem?.id : undefined,
          drivePath: payload.googleDrivePath || (selectedDriveItem ? `MarineWorld_Workspace/${selectedDriveItem.name}` : undefined),
          summaryText: result.summaryText || `${result.documentTitle} technical knowledge document.`,
          specifications: result.structuredFacts.map((f) => ({
            key: f.field,
            label: f.fieldLabel,
            value: f.canonicalValue,
            confidence: f.confidenceScore,
            category: f.category === "CERTIFICATION" ? "COMPLIANCE" : "GENERAL",
          })),
          certifications: result.structuredFacts
            .filter((f) => f.category === "CERTIFICATION")
            .map((f) => f.canonicalValue),
          confidenceScore: result.confidenceScore || 0.98,
        });
        setGeneratedOKFDoc(okfDoc);

        setStep("REVIEW_AND_GROUND");
      }
    }, 350);
  };

  const handleDriveFilesSelected = (files: GoogleDriveSelectedFile[]) => {
    if (files.length > 0) {
      const picked = files[0];
      setDrivePickedFiles(files);
      setSelectedDriveItem({
        id: picked.id,
        name: picked.name,
        type: picked.isFolder ? "FOLDER" : "FILE",
        path: picked.url || `Google Drive / ${picked.name}`,
        size: picked.sizeBytes ? `${Math.round(picked.sizeBytes / 1024)} KB` : "Google Doc",
      });
      setDriveError(null);
    }
  };

  const handleLaunchGoogleDrivePicker = async () => {
    setIsOpeningDrivePicker(true);
    setDriveError(null);
    try {
      await requestGoogleAccessToken();
      setIsDriveBrowserOpen(true);
    } catch (err: any) {
      console.warn("[AddKnowledgeSourceModal] Opening Drive Explorer:", err);
      setIsDriveBrowserOpen(true);
    } finally {
      setIsOpeningDrivePicker(false);
    }
  };

  // Process Drive Link Input
  const handleApplyDriveLink = () => {
    if (!driveLinkInput.trim()) return;
    const parsed = parseGoogleDriveLink(driveLinkInput.trim());
    if (parsed.isValid && parsed.fileId) {
      setSelectedDriveItem({
        id: parsed.fileId,
        name: `Google_Drive_Doc_${parsed.fileId.slice(0, 6)}.pdf`,
        type: parsed.isFolder ? "FOLDER" : "FILE",
        path: driveLinkInput.trim(),
        size: "Shared Drive Resource",
      });
      setDriveError(null);
    } else {
      setDriveError("Invalid Google Drive link format. Please provide a valid Drive file or folder URL.");
    }
  };

  // URL Fetch Simulation
  const handleFetchUrl = () => {
    if (!inputUrl.trim()) return;
    setIsFetchingUrl(true);
    setTimeout(() => {
      setIsFetchingUrl(false);
      let detectedTitle = "Subsea Robotics Type Approval & Class Specification";
      let docType = "Online Technical Documentation";
      if (inputUrl.includes("dnv") || inputUrl.includes("cert")) {
        detectedTitle = "DNV GL Official Maritime Type Approval Registry 2026";
        docType = "Accredited Certificate";
      } else if (inputUrl.includes("api") || inputUrl.includes("doc")) {
        detectedTitle = "Marine Telemetry & Sensor Optical Protocol Specification";
        docType = "Technical API Reference";
      }

      setUrlFetchedPreview({
        url: inputUrl,
        title: detectedTitle,
        sourceType: docType,
      });
    }, 500);
  };

  // Structured Fact Editing
  const handleStartEditFact = (fact: ExtractedStructuredFact) => {
    setEditingFactId(fact.id);
    setTempFactValue(fact.canonicalValue);
  };

  const handleSaveFact = (factId: string) => {
    setStructuredFacts((prev) =>
      prev.map((f) => {
        if (f.id === factId) {
          return {
            ...f,
            canonicalValue: tempFactValue,
            confirmationState: "COMPANY_CONFIRMED",
          };
        }
        return f;
      })
    );
    setEditingFactId(null);
  };

  // Final Grounding Action
  const handleConfirmAndGround = async (groundImmediately: boolean = true) => {
    if (!extractionResult) return;

    const { document, message } = finalizeKnowledgeGrounding({
      companyId,
      businessId,
      extraction: extractionResult,
      finalTitle: editedTitle,
      finalClassification: editedClassification,
      finalScope: editedScope,
      selectedOfferingId: editedScope === "OFFERING" ? selectedOfferingId : undefined,
      selectedFacilityId: editedScope === "FACILITY" ? `fac-${companyId}-01` : undefined,
      selectedFacilityName: editedScope === "FACILITY" ? selectedFacilityName : undefined,
      structuredFacts,
      visibility: selectedVisibility,
      groundImmediately,
    });

    try {
      await saveCompanyDocument(companyId, document);
      if (generatedOKFDoc) {
        const updatedOKF: OKFDocument = {
          ...generatedOKFDoc,
          title: editedTitle,
          documentId: document.id,
          offeringId: editedScope === "OFFERING" ? selectedOfferingId : undefined,
          classifications: [editedClassification],
        };
        await saveOKFDocumentToFirestore(updatedOKF);
      }
    } catch (err) {
      console.warn("[AddKnowledgeSourceModal] Firestore sync error:", err);
    }

    onGroundingComplete(document, message);
    onClose();
  };


  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-graphite/60 backdrop-blur-xs animate-fade-in"
      id="modal-add-knowledge-source"
    >
      <div className="bg-white border border-line rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-canvas shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-royal/10 text-royal flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-royal uppercase tracking-wider block">
                05 — KNOWLEDGE
              </span>
              <h3 className="text-sm font-bold text-graphite">
                {step === "CHOOSE_METHOD"
                  ? "Add Company Information"
                  : step === "AI_ANALYZING"
                  ? "Analyzing Information"
                  : step === "REVIEW_AND_GROUND"
                  ? "Review & Confirm Knowledge"
                  : "Add Information"}
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* STEP 1: CHOOSE METHOD */}
          {step === "CHOOSE_METHOD" && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h4 className="text-xs font-bold text-graphite uppercase tracking-wider font-mono">
                  Select Source Method
                </h4>
                <p className="text-xs text-stone mt-0.5">
                  Choose how to add information for your Company AI.
                </p>
              </div>

              {/* Primary 3 Choices */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Method 1: Desktop Upload */}
                <button
                  type="button"
                  id="source-method-desktop"
                  onClick={() => {
                    setSelectedMethod("DESKTOP_UPLOAD");
                    setStep("METHOD_DESKTOP");
                  }}
                  className="p-4 rounded-xl border border-line bg-canvas hover:bg-royal/5 hover:border-royal/40 transition text-left space-y-2 group flex flex-col justify-between"
                >
                  <div className="w-9 h-9 rounded-xl bg-white border border-line flex items-center justify-center text-royal shadow-2xs group-hover:scale-105 transition-transform">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-graphite group-hover:text-royal transition-colors">
                      Upload from Computer
                    </div>
                    <div className="text-[11px] text-stone mt-0.5">
                      PDF, DOCX, XLSX, TXT, Images
                    </div>
                  </div>
                </button>

                {/* Method 2: Google Drive */}
                <button
                  type="button"
                  id="source-method-drive"
                  onClick={() => {
                    setSelectedMethod("GOOGLE_DRIVE");
                    setStep("METHOD_DRIVE");
                  }}
                  className="p-4 rounded-xl border border-line bg-canvas hover:bg-amber-500/5 hover:border-amber-500/40 transition text-left space-y-2 group flex flex-col justify-between"
                >
                  <div className="w-9 h-9 rounded-xl bg-white border border-line flex items-center justify-center text-amber-600 shadow-2xs group-hover:scale-105 transition-transform">
                    <Folder className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-graphite group-hover:text-amber-700 transition-colors">
                      Google Drive
                    </div>
                    <div className="text-[11px] text-stone mt-0.5">
                      Connected company folder
                    </div>
                  </div>
                </button>

                {/* Method 3: Add Web Source */}
                <button
                  type="button"
                  id="source-method-url"
                  onClick={() => {
                    setSelectedMethod("URL_SOURCE");
                    setStep("METHOD_URL");
                  }}
                  className="p-4 rounded-xl border border-line bg-canvas hover:bg-emerald-500/5 hover:border-emerald-500/40 transition text-left space-y-2 group flex flex-col justify-between"
                >
                  <div className="w-9 h-9 rounded-xl bg-white border border-line flex items-center justify-center text-emerald-600 shadow-2xs group-hover:scale-105 transition-transform">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-graphite group-hover:text-emerald-700 transition-colors">
                      Add Web Source
                    </div>
                    <div className="text-[11px] text-stone mt-0.5">
                      Verified URL & documentation
                    </div>
                  </div>
                </button>
              </div>

              {/* More Options / Advanced Source */}
              <div className="pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowMoreOptions(!showMoreOptions)}
                  className="text-stone hover:text-graphite text-[11px] font-semibold flex items-center gap-1 transition"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMoreOptions ? "rotate-180" : ""}`} />
                  <span>More Options (Internal & Existing Sources)</span>
                </button>

                {showMoreOptions && (
                  <div className="mt-2 p-3 rounded-xl bg-canvas border border-line animate-fade-in">
                    <button
                      type="button"
                      id="source-method-existing"
                      onClick={() => {
                        setSelectedMethod("EXISTING_SOURCE");
                        setStep("METHOD_EXISTING");
                      }}
                      className="w-full p-3 rounded-xl border border-line bg-white hover:bg-mist text-left flex items-center justify-between group transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-canvas border border-line flex items-center justify-center text-purple-600">
                          <Database className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-graphite">
                            Existing MarineWorld Source
                          </div>
                          <div className="text-[10.5px] text-stone">
                            Link an already indexed source without duplicating
                          </div>
                        </div>
                      </div>
                      <span className="text-royal font-bold text-xs group-hover:translate-x-0.5 transition-transform">
                        Select →
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* METHOD 1: UPLOAD FROM COMPUTER */}
          {step === "METHOD_DESKTOP" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-graphite uppercase tracking-wider">
                    Upload from Computer
                  </h4>
                  <p className="text-xs text-stone mt-0.5">
                    Drag and drop your company documents, certifications, or manuals.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("CHOOSE_METHOD")}
                  className="text-xs font-semibold text-stone hover:text-graphite"
                >
                  Change Method
                </button>
              </div>

              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileSelection(e.dataTransfer.files);
                }}
                className={`p-6 rounded-2xl border-2 border-dashed text-center transition ${
                  isDragging
                    ? "border-royal bg-royal/5"
                    : "border-line bg-canvas hover:bg-mist"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-line mx-auto flex items-center justify-center text-royal shadow-2xs mb-2">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-graphite">Drop files here or browse</div>
                <div className="text-[11px] text-stone mt-1">
                  Supported formats: PDF, DOCX, XLSX, TXT, PNG, JPG, WEBP
                </div>

                <div className="mt-4">
                  <label className="px-4 py-2 bg-royal hover:bg-royal/90 text-white rounded-xl text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 shadow-2xs transition">
                    <span>Browse Computer</span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.docx,.xlsx,.txt,.png,.jpg,.jpeg,.webp"
                      onChange={(e) => handleFileSelection(e.target.files)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Upload Queue */}
              {fileQueue.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-graphite font-mono uppercase">
                    Ready to Ingest ({fileQueue.length})
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {fileQueue.map((file) => (
                      <div
                        key={file.id}
                        className="p-3 rounded-xl bg-canvas border border-line flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-royal shrink-0" />
                          <div className="min-w-0">
                            <div className="font-bold text-graphite truncate font-mono">
                              {file.name}
                            </div>
                            <div className="text-[10px] text-stone font-mono">
                              {file.type} • {(file.size / 1024).toFixed(0)} KB •{" "}
                              <span className="text-emerald-700 font-bold">READY</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFile(file.id)}
                          className="text-stone hover:text-red-600 transition p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        startIngestionPipeline({
                          sourceType: "DESKTOP_UPLOAD",
                          fileName: fileQueue[0]?.name || "Corporate_Documentation.pdf",
                          fileSize: fileQueue[0]?.size || 2400000,
                        })
                      }
                      className="px-5 py-2.5 bg-royal hover:bg-royal/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Analyze with AI</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* METHOD 2: GOOGLE DRIVE */}
          {step === "METHOD_DRIVE" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-graphite uppercase tracking-wider">
                    Google Drive Live Connection & Workspace
                  </h4>
                  <p className="text-xs text-stone mt-0.5">
                    Connect and pick documentation directly from your Google Drive using Google Picker or paste a direct Drive link.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("CHOOSE_METHOD")}
                  className="text-xs font-semibold text-stone hover:text-graphite"
                >
                  Change Method
                </button>
              </div>

              {/* Service Account / Workspace Status Badge */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                <div className="flex items-center justify-between font-mono text-[10.5px]">
                  <span className="font-bold text-graphite flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-royal" />
                    Google Drive Service Account
                  </span>
                  <span className="text-emerald-700 font-bold">READY</span>
                </div>
                <div className="text-[10px] font-mono text-stone truncate">
                  Account: <code>{SERVICE_ACCOUNT_EMAIL}</code>
                </div>
                <div className="text-[10px] font-mono text-stone">
                  Target Root Workspace: <code>{DEFAULT_ROOT_WORKSPACE}</code>
                </div>
              </div>

              {driveError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{driveError}</span>
                </div>
              )}

              {/* Paste Drive Link Option */}
              <div className="p-4 rounded-xl border border-line bg-canvas space-y-3">
                <label className="text-xs font-bold text-graphite block">
                  Option A: Paste Google Drive Share Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={driveLinkInput}
                    onChange={(e) => setDriveLinkInput(e.target.value)}
                    placeholder="https://drive.google.com/file/d/1A2B3C.../view or folder link"
                    className="flex-1 px-3 py-2 bg-white border border-line rounded-xl text-xs font-mono text-graphite focus:outline-hidden focus:border-royal"
                  />
                  <button
                    type="button"
                    onClick={handleApplyDriveLink}
                    disabled={!driveLinkInput.trim()}
                    className="px-4 py-2 rounded-xl bg-royal text-white text-xs font-bold hover:bg-royal/90 disabled:opacity-50 transition"
                  >
                    Connect Link
                  </button>
                </div>
              </div>

              {/* Interactive Google Drive Picker Option */}
              <div className="p-4 rounded-xl border border-dashed border-line bg-canvas flex flex-col items-center justify-center text-center space-y-3 py-5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-graphite">
                    Option B: Interactive Google Drive Picker
                  </h5>
                  <p className="text-[11px] text-stone mt-0.5 max-w-sm">
                    {selectedDriveItem
                      ? `${selectedDriveItem.path} (${selectedDriveItem.size})`
                      : "Authorized OAuth 2.0 connection powered by Google Picker API."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLaunchGoogleDrivePicker}
                  disabled={isOpeningDrivePicker}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-line text-graphite rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs transition disabled:opacity-60"
                >
                  <Folder className="w-4 h-4 text-amber-600" />
                  <span>
                    {isOpeningDrivePicker
                      ? "Opening Google Picker..."
                      : selectedDriveItem
                      ? "Change Selected Drive File"
                      : "Browse Google Drive..."}
                  </span>
                </button>
              </div>

              {selectedDriveItem && (
                <div className="p-3 rounded-xl bg-royal/5 border border-royal flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-royal shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-graphite truncate font-mono">
                        {selectedDriveItem.name}
                      </div>
                      <div className="text-[10px] text-stone font-mono truncate">
                        {selectedDriveItem.path}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10.5px] font-mono text-stone">{selectedDriveItem.size}</span>
                    <Check className="w-4 h-4 text-royal" />
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={!selectedDriveItem}
                  onClick={() => {
                    if (!selectedDriveItem) return;
                    startIngestionPipeline({
                      sourceType: "GOOGLE_DRIVE",
                      fileName: selectedDriveItem.name,
                      googleDrivePath: selectedDriveItem.path,
                      googleDriveIsFolder: selectedDriveItem.type === "FOLDER",
                    });
                  }}
                  className="px-5 py-2.5 bg-royal hover:bg-royal/90 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Transform into Sealed OKF Document</span>
                </button>
              </div>
            </div>
          )}

          {/* METHOD 3: ADD WEB SOURCE */}
          {step === "METHOD_URL" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-graphite uppercase tracking-wider">
                    Add Web Source
                  </h4>
                  <p className="text-xs text-stone mt-0.5">
                    Enter the URL of an accredited certification page or technical reference.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("CHOOSE_METHOD")}
                  className="text-xs font-semibold text-stone hover:text-graphite"
                >
                  Change Method
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="url"
                  id="input-knowledge-url"
                  placeholder="https://accreditation.dnv.com/registry/cert-2026..."
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="flex-1 h-10 px-3.5 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none font-mono text-xs"
                />
                <button
                  type="button"
                  id="btn-fetch-url"
                  disabled={!inputUrl.trim() || isFetchingUrl}
                  onClick={handleFetchUrl}
                  className="px-4 h-10 rounded-xl bg-royal text-white font-bold text-xs hover:bg-royal/90 transition flex items-center gap-1.5 shrink-0"
                >
                  {isFetchingUrl ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Fetching...</span>
                    </>
                  ) : (
                    <span>Fetch URL</span>
                  )}
                </button>
              </div>

              {urlFetchedPreview && (
                <div className="p-4 rounded-xl bg-canvas border border-line space-y-2 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-graphite font-mono">
                      {urlFetchedPreview.title}
                    </span>
                  </div>
                  <div className="text-[10.5px] font-mono text-stone">
                    {urlFetchedPreview.sourceType} • {urlFetchedPreview.url}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        startIngestionPipeline({
                          sourceType: "URL_SOURCE",
                          url: urlFetchedPreview.url,
                          customTitle: urlFetchedPreview.title,
                        })
                      }
                      className="px-5 py-2 rounded-xl bg-royal hover:bg-royal/90 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Analyze Web Source</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* METHOD 4: EXISTING MARINWORLD SOURCE */}
          {step === "METHOD_EXISTING" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-graphite uppercase tracking-wider">
                    Existing MarineWorld Knowledge
                  </h4>
                  <p className="text-xs text-stone mt-0.5">
                    Attach an existing indexed document without creating a physical duplicate.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("CHOOSE_METHOD")}
                  className="text-xs font-semibold text-stone hover:text-graphite"
                >
                  Change Method
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {existingDocuments.length === 0 ? (
                  <div className="p-6 text-center rounded-xl bg-canvas border border-line text-stone text-xs">
                    No other indexed documents found.
                  </div>
                ) : (
                  existingDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedExistingDocId(doc.id)}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between gap-3 transition ${
                        selectedExistingDocId === doc.id
                          ? "bg-royal/5 border-royal shadow-2xs"
                          : "bg-canvas border-line hover:bg-mist"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-graphite truncate font-mono">
                            {doc.title}
                          </div>
                          <div className="text-[10px] text-stone font-mono">
                            {doc.documentType} • Version v{doc.version || 1}
                          </div>
                        </div>
                      </div>

                      {selectedExistingDocId === doc.id && (
                        <Check className="w-4 h-4 text-royal" />
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={!selectedExistingDocId}
                  onClick={() => {
                    const doc = existingDocuments.find((d) => d.id === selectedExistingDocId);
                    if (!doc) return;
                    startIngestionPipeline({
                      sourceType: "EXISTING_SOURCE",
                      customTitle: doc.title,
                      existingSourceDocumentId: doc.id,
                    });
                  }}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                    selectedExistingDocId
                      ? "bg-royal hover:bg-royal/90 text-white shadow-sm"
                      : "bg-mist text-stone cursor-not-allowed border border-line"
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Analyze Selected Source</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: AI ANALYZING PROGRESS */}
          {step === "AI_ANALYZING" && (
            <div className="py-8 space-y-6 text-center animate-fade-in">
              <div className="w-12 h-12 rounded-2xl bg-royal/10 text-royal mx-auto flex items-center justify-center animate-pulse">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-graphite uppercase tracking-wider font-mono">
                  Analyzing Source
                </h4>
                <p className="text-xs text-stone">
                  Reading document structure, technical parameters, and certifications.
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-2 text-left">
                {INGESTION_PIPELINE_STEPS.map((stepDesc, idx) => {
                  const isDone = idx < activeAnalysisStage;
                  const isCurrent = idx === activeAnalysisStage;
                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition ${
                        isCurrent
                          ? "bg-royal/5 border-royal/40 font-bold text-graphite"
                          : isDone
                          ? "bg-emerald-50/50 border-emerald-200 text-emerald-900"
                          : "bg-canvas border-line/50 text-stone/60"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : isCurrent ? (
                          <RefreshCw className="w-3.5 h-3.5 text-royal animate-spin shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-stone/40 shrink-0" />
                        )}
                        <span className="font-mono text-[11px]">{stepDesc}</span>
                      </div>
                      {isDone && <span className="text-[10px] font-mono text-emerald-700 font-bold">READY</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW AND GROUND */}
          {step === "REVIEW_AND_GROUND" && extractionResult && (
            <div className="space-y-5 animate-fade-in text-xs">
              {/* Summary of Extraction Findings */}
              <div className="p-4 rounded-2xl bg-canvas border border-line space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-royal/10 text-royal">
                      WHAT WE FOUND
                    </span>
                    <span className="text-xs font-bold text-graphite font-mono">
                      Review & Confirm
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{extractionResult.confidenceScore}% Confidence</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-white border border-line text-center">
                    <div className="text-base font-bold text-graphite font-mono">
                      {structuredFacts.length}
                    </div>
                    <div className="text-[10px] font-mono text-stone uppercase">Verified Facts</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-line text-center">
                    <div className="text-base font-bold text-emerald-800 font-mono">
                      {extractionResult.certificationsCount}
                    </div>
                    <div className="text-[10px] font-mono text-stone uppercase">Certifications</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-line text-center">
                    <div className="text-base font-bold text-amber-800 font-mono">
                      {extractionResult.commercialParametersCount}
                    </div>
                    <div className="text-[10px] font-mono text-stone uppercase">Commercial Items</div>
                  </div>
                </div>
              </div>

              {/* Offering Relationship Suggestion Card */}
              {extractionResult.detectedOfferingName && (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200">
                      RELATED OFFERING FOUND
                    </span>
                    <span className="text-[11px] font-mono text-stone">Optional Link</span>
                  </div>

                  <div className="text-xs text-stone">
                    We found information related to an existing offering:
                  </div>

                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-700 shrink-0" />
                    <span className="text-xs font-bold text-graphite font-mono">
                      {extractionResult.detectedOfferingName}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditedScope("OFFERING");
                        setSelectedOfferingId(extractionResult.detectedOfferingId || "");
                        setShowCustomOfferingSelect(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        editedScope === "OFFERING" && selectedOfferingId === extractionResult.detectedOfferingId
                          ? "bg-amber-600 text-white"
                          : "bg-white border border-amber-200 text-graphite hover:bg-amber-100/50"
                      }`}
                    >
                      Link to Offering
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditedScope("COMPANY");
                        setSelectedOfferingId("");
                        setShowCustomOfferingSelect(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        editedScope === "COMPANY"
                          ? "bg-graphite text-white"
                          : "bg-white border border-line text-stone hover:text-graphite"
                      }`}
                    >
                      Keep as Company Knowledge
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomOfferingSelect(!showCustomOfferingSelect);
                        setEditedScope("OFFERING");
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-line text-stone hover:text-graphite transition"
                    >
                      Choose Another Offering...
                    </button>
                  </div>

                  {showCustomOfferingSelect && (
                    <div className="pt-2">
                      <label className="text-[10px] font-mono text-stone block mb-1">Select Offering</label>
                      <select
                        value={selectedOfferingId}
                        onChange={(e) => {
                          setSelectedOfferingId(e.target.value);
                          setEditedScope("OFFERING");
                        }}
                        className="w-full h-8 px-2.5 rounded-lg border border-line bg-white text-xs font-medium text-graphite focus:outline-none"
                      >
                        <option value="">Select an offering...</option>
                        {availableOfferings.map((off) => (
                          <option key={off.id} value={off.id}>
                            {off.type === "product" ? "Product:" : "Service:"} {off.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Facility Relationship Suggestion Card */}
              {extractionResult.detectedFacilityName && !extractionResult.detectedOfferingName && (
                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-100 text-sky-900 border border-sky-200">
                      RELATED FACILITY FOUND
                    </span>
                    <span className="text-[11px] font-mono text-stone">Optional Link</span>
                  </div>

                  <div className="text-xs text-stone">
                    We found information related to a company facility:
                  </div>

                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-sky-700 shrink-0" />
                    <span className="text-xs font-bold text-graphite font-mono">
                      {extractionResult.detectedFacilityName}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditedScope("FACILITY");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        editedScope === "FACILITY"
                          ? "bg-sky-700 text-white"
                          : "bg-white border border-sky-200 text-graphite hover:bg-sky-100/50"
                      }`}
                    >
                      Link to Facility
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditedScope("COMPANY");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        editedScope === "COMPANY"
                          ? "bg-graphite text-white"
                          : "bg-white border border-line text-stone hover:text-graphite"
                      }`}
                    >
                      Keep as Company Knowledge
                    </button>
                  </div>
                </div>
              )}

              {/* Document Identity & Scope */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-graphite">Document Title *</label>
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none font-semibold text-graphite"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-graphite">Classification</label>
                  <select
                    value={editedClassification}
                    onChange={(e) => setEditedClassification(e.target.value as any)}
                    className="w-full h-9 px-3 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none"
                  >
                    <option value="TECHNICAL">Technical Document</option>
                    <option value="CERTIFICATION">Accreditation / Certification</option>
                    <option value="COMMERCIAL">Commercial / Pricing Documentation</option>
                    <option value="FACILITY_SPEC">Facility / Yard Specification</option>
                    <option value="GENERAL_CORPORATE">Corporate Policy & Procedures</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-graphite">Knowledge Scope</label>
                  <select
                    value={editedScope}
                    onChange={(e) => setEditedScope(e.target.value as any)}
                    className="w-full h-9 px-3 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none font-semibold"
                  >
                    <option value="COMPANY">Company Knowledge (Default - Company AI)</option>
                    <option value="OFFERING">Offering Knowledge (Linked to Offering)</option>
                    <option value="FACILITY">Facility Knowledge (Linked to Facility)</option>
                  </select>
                </div>
              </div>

              {/* Extracted Facts List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-graphite font-mono text-[11px] uppercase">
                    Extracted Structured Facts ({structuredFacts.length})
                  </span>
                  <span className="text-[10.5px] text-stone">Click edit to modify</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {structuredFacts.map((fact) => (
                    <div
                      key={fact.id}
                      className="p-3 rounded-xl bg-canvas border border-line space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono font-bold bg-white border border-line text-stone uppercase">
                            {fact.category}
                          </span>
                          <span className="font-bold text-graphite font-mono text-xs">
                            {fact.fieldLabel}
                          </span>
                        </div>

                        {editingFactId !== fact.id && (
                          <button
                            type="button"
                            onClick={() => handleStartEditFact(fact)}
                            className="text-stone hover:text-royal p-1"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {editingFactId === fact.id ? (
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={tempFactValue}
                            onChange={(e) => setTempFactValue(e.target.value)}
                            className="flex-1 h-7 px-2 rounded-lg border border-royal bg-white text-xs font-mono text-graphite focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveFact(fact.id)}
                            className="px-2.5 py-1 rounded-lg bg-royal text-white text-xs font-bold"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingFactId(null)}
                            className="px-2 py-1 text-stone text-xs hover:text-graphite"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="font-bold text-royal font-mono text-xs">
                          {fact.canonicalValue}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-line bg-canvas flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-line hover:bg-mist text-graphite text-xs font-bold transition shadow-2xs"
          >
            Cancel
          </button>

          {step === "REVIEW_AND_GROUND" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOKFViewerOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 text-cyan-400 hover:bg-slate-800 text-xs font-bold transition shadow-2xs flex items-center gap-1.5 border border-cyan-500/30"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Inspect OKF (.okf.md)</span>
              </button>

              <button
                type="button"
                id="btn-save-draft-knowledge"
                onClick={() => handleConfirmAndGround(false)}
                className="px-4 py-2 rounded-xl bg-white border border-line hover:bg-mist text-graphite text-xs font-bold transition shadow-2xs"
              >
                Save as Indexed Only
              </button>

              <button
                type="button"
                id="btn-confirm-ground-knowledge"
                onClick={() => handleConfirmAndGround(true)}
                className="px-5 py-2 rounded-xl bg-royal hover:bg-royal/90 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Confirm & Teach Company AI</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {isOKFViewerOpen && generatedOKFDoc && (
        <OKFDocumentViewerModal
          isOpen={isOKFViewerOpen}
          onClose={() => setIsOKFViewerOpen(false)}
          okfDoc={generatedOKFDoc}
        />
      )}

      {isDriveBrowserOpen && (
        <GoogleDriveBrowserModal
          isOpen={isDriveBrowserOpen}
          onClose={() => setIsDriveBrowserOpen(false)}
          onSelectFiles={handleDriveFilesSelected}
          multiSelect={true}
          mimeTypeFilter="documents"
        />
      )}
    </div>
  );
};
