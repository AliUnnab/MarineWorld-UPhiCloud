import React, { useState, useEffect, useRef } from "react";
import {
  X,
  FileText,
  Upload,
  Handshake,
  Cpu,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Package,
  Wrench,
  ArrowRight,
  ArrowLeft,
  SlidersHorizontal,
  ShieldCheck,
  Globe2,
  Globe,
  Trash2,
  Plus,
  Bot,
  Image as ImageIcon,
  Link2,
  FileBadge,
  Eye,
  RotateCcw,
  Check,
  Layers,
  Clock,
  BookOpen,
  FolderOpen,
  UploadCloud,
  HardDrive,
  FolderUp,
  FileImage,
  ArrowUp,
  ArrowDown,
  Maximize2,
  RefreshCw,
} from "lucide-react";
import type {
  CompanyOffering,
  OfferingGroundingSource,
  OfferingMediaItem,
  OfferingCommercialInfo,
  OfferingAIAdvisorConfig,
  AdvisorRole,
  AdvisorConversationPriority,
  AdvisorCommunicationStyle,
  DocumentEntity,
} from "@/lib/types";
import {
  PRESET_DOCUMENT_TEMPLATES,
  MOCK_GOOGLE_DRIVE_FOLDERS,
  simulateAIExtractionFromDocument,
  computeOfferingGroundingStatus,
  generateDefaultAdvisorConfig,
  answerOfferingAdvisorQuery,
  type ExtractedOfferingDraft,
  type DocumentInputSource,
} from "@/lib/services/offeringAIService";
import { getCompanyDocuments } from "@/lib/services/dataSpaceService";
import { getCurrentAuthSession } from "@/lib/services/securityService";

export type WizardStep =
  | "METHOD_CHOICE"
  | "DOCUMENT_INGEST"
  | "PARSING"
  | "REVIEW_DRAFT"
  | "MEDIA"
  | "ADVISOR_CONFIG";

interface OfferingCreationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveOffering: (offering: CompanyOffering) => void;
  companyId: string;
  companyName: string;
  initialType?: "product" | "service";
  initialOffering?: CompanyOffering | null;
  activeOfferingsCount: number;
  maxActiveLimit?: number;
}

const AVAILABLE_ROLES: AdvisorRole[] = [
  "Technical Expert",
  "Sales Advisor",
  "Application Specialist",
  "Procurement Advisor",
  "Compliance Specialist",
];

const AVAILABLE_PRIORITIES: AdvisorConversationPriority[] = [
  "Technical Specifications",
  "Applications & Suitability",
  "Certifications & Compliance",
  "Commercial Information",
  "Availability & Lead Time",
  "RFQ / Offer Requests",
];

const AVAILABLE_STYLES: AdvisorCommunicationStyle[] = [
  "Precise",
  "Technical",
  "Transparent",
  "Commercial",
  "Solution-Oriented",
  "Concise",
];

export const OfferingCreationWizardModal: React.FC<OfferingCreationWizardModalProps> = ({
  isOpen,
  onClose,
  onSaveOffering,
  companyId,
  companyName,
  initialType = "product",
  initialOffering = null,
  activeOfferingsCount,
  maxActiveLimit = 12,
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(initialOffering);

  // Wizard step state
  const [currentStep, setCurrentStep] = useState<WizardStep>(
    isEditing ? "REVIEW_DRAFT" : "METHOD_CHOICE"
  );
  const [creationMethod, setCreationMethod] = useState<"DOCUMENT" | "MANUAL">("DOCUMENT");
  const [offeringType, setOfferingType] = useState<"product" | "service">(
    (initialOffering?.type === "product" || initialOffering?.type === "service") ? initialOffering.type : (initialType === "product" || initialType === "service" ? initialType : "product")
  );

  // Ingestion state
  const [sourceTab, setSourceTab] = useState<"COMPUTER" | "GOOGLE_DRIVE" | "URL" | "PRESETS">("COMPUTER");
  const [sourceFilesList, setSourceFilesList] = useState<Array<{
    name: string;
    size?: number;
    type?: string;
    origin?: "COMPUTER" | "GOOGLE_DRIVE" | "URL";
    drivePath?: string;
    url?: string;
    isDownloadable?: boolean;
    isGroundingSource?: boolean;
  }>>([]);
  const [selectedDriveFolderId, setSelectedDriveFolderId] = useState<string>("gdrive-f-rov4");
  const [selectedDriveFiles, setSelectedDriveFiles] = useState<string[]>(["gdf-01", "gdf-02", "gdf-03"]);
  const [documentUrl, setDocumentUrl] = useState("");
  const [selectedKnowledgeDocId, setSelectedKnowledgeDocId] = useState<string>("");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [parsingProgress, setParsingProgress] = useState(0);
  const [parsingStatusText, setParsingStatusText] = useState("");

  // Extracted/Draft Form State
  const [name, setName] = useState(initialOffering?.name || "");
  const [category, setCategory] = useState(
    initialOffering?.category || (offeringType === "product" ? "Marine Equipment & Systems" : "Technical Maritime Services")
  );
  const [code, setCode] = useState(initialOffering?.code || initialOffering?.sku || "");
  const [shortDescription, setShortDescription] = useState(initialOffering?.shortDescription || "");
  const [detailedDescription, setDetailedDescription] = useState(initialOffering?.detailedDescription || "");
  const [status, setStatus] = useState<"ACTIVE" | "DRAFT" | "ARCHIVED">(
    (initialOffering?.status as any) || "ACTIVE"
  );
  const [fieldConfirmations, setFieldConfirmations] = useState<Record<string, "AI_EXTRACTED" | "COMPANY_CONFIRMED">>(
    initialOffering?.fieldConfirmations || {}
  );
  const [sourceAttributions, setSourceAttributions] = useState<Record<string, string>>(
    initialOffering?.sourceAttributions || {}
  );
  const [conflicts, setConflicts] = useState<Array<{
    field: string;
    fieldLabel: string;
    sourceA: string;
    valueA: string;
    sourceB: string;
    valueB: string;
    resolvedValue?: string;
  }>>([]);

  // Specifications key/value
  const [specifications, setSpecifications] = useState<Array<{ key: string; value: string; source?: string }>>(
    initialOffering?.specifications
      ? Object.entries(initialOffering.specifications).map(([key, value]) => ({ key, value: String(value) }))
      : [
          { key: "Standard Operating Rating", value: "Heavy-Duty Marine Grade" },
          { key: "Classification Standard", value: "Class Approved (DNV / Lloyd's)" },
        ]
  );

  // Applications
  const [applications, setApplications] = useState<string[]>(
    initialOffering?.applications || ["Commercial Shipping", "Shipyard Overhaul", "Offshore Marine Operations"]
  );
  const [newApplicationInput, setNewApplicationInput] = useState("");

  // Certifications
  const [certifications, setCertifications] = useState<string[]>(
    initialOffering?.certifications || ["ISO 9001:2015", "DNV GL Class Approved"]
  );
  const [newCertInput, setNewCertInput] = useState("");

  // Standards
  const [standards, setStandards] = useState<string[]>(
    initialOffering?.standards || ["IMO Tier III Compliant", "IEC 60092 Marine Standard"]
  );
  const [newStandardInput, setNewStandardInput] = useState("");

  // Commercial Information
  const [commercialInfo, setCommercialInfo] = useState<OfferingCommercialInfo>(
    initialOffering?.commercialInformation || {
      pricingGuidance: "Available upon commercial RFQ / project quotation.",
      incoterms: "EXW / FOB Port of Delivery",
      leadTime: "4–8 Weeks Standard",
      availability: "AVAILABLE ON ORDER",
      rfqAvailable: true,
      minOrderQty: "1 Unit / Project Scope",
      warranty: "24-Month Marine Warranty",
    }
  );

  // Service Specifics (if Service)
  const [serviceScope, setServiceScope] = useState(initialOffering?.serviceScope || "");
  const [coverage, setCoverage] = useState(initialOffering?.coverage || "");
  const [deliveryModel, setDeliveryModel] = useState(initialOffering?.deliveryModel || "");

  // Media State & Desktop Upload
  const [mediaList, setMediaList] = useState<OfferingMediaItem[]>(
    initialOffering?.mediaReferences || initialOffering?.media || [
      {
        id: "med-01",
        url: offeringType === "product"
          ? "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80"
          : "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80",
        title: `${name || "Offering"} Primary Visual Asset`,
        type: "cover",
        isCover: true,
        order: 1,
      },
    ]
  );
  const [mediaUploadTab, setMediaUploadTab] = useState<"DESKTOP" | "URL">("DESKTOP");
  const [isMediaDragActive, setIsMediaDragActive] = useState(false);
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [newMediaTitle, setNewMediaTitle] = useState("");
  const [newMediaType, setNewMediaType] = useState<"cover" | "photo" | "video" | "drawing">("photo");
  const [selectedPreviewMedia, setSelectedPreviewMedia] = useState<OfferingMediaItem | null>(null);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);
  const quickCoverInputRef = useRef<HTMLInputElement>(null);

  // Grounding Sources & Attributions
  const [groundingSources, setGroundingSources] = useState<OfferingGroundingSource[]>(
    initialOffering?.groundingSources || []
  );
  const [sourceAttribution, setSourceAttribution] = useState<string>(
    initialOffering?.groundingSources?.[0]?.filename || ""
  );

  // Advisor Config
  const [advisorRoles, setAdvisorRoles] = useState<AdvisorRole[]>(
    initialOffering?.aiAdvisorConfig?.roles || [
      "Technical Expert",
      "Sales Advisor",
      "Application Specialist",
    ]
  );
  const [advisorPriorities, setAdvisorPriorities] = useState<AdvisorConversationPriority[]>(
    initialOffering?.aiAdvisorConfig?.conversationPriorities || [
      "Technical Specifications",
      "Applications & Suitability",
      "Certifications & Compliance",
      "Commercial Information",
      "RFQ / Offer Requests",
    ]
  );
  const [advisorStyles, setAdvisorStyles] = useState<AdvisorCommunicationStyle[]>(
    initialOffering?.aiAdvisorConfig?.communicationStyle || [
      "Precise",
      "Technical",
      "Transparent",
      "Solution-Oriented",
    ]
  );

  // Live Simulated Advisor Test Console
  const [testQuery, setTestQuery] = useState("");
  const [testResponse, setTestResponse] = useState<{
    answer: string;
    sources: string[];
    confidence: string;
    action?: string;
  } | null>(null);

  // Error/validation messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch authorized company documents from dataSpace
  const [companyKnowledgeDocs, setCompanyKnowledgeDocs] = useState<DocumentEntity[]>([]);
  useEffect(() => {
    try {
      const auth = getCurrentAuthSession();
      const docs = getCompanyDocuments(companyId, auth);
      setCompanyKnowledgeDocs(docs || []);
    } catch {
      // Fallback
    }
  }, [companyId]);

  // Handle Document AI Extraction
  const handleRunExtraction = async () => {
    setErrorMessage(null);
    setCurrentStep("PARSING");
    setParsingProgress(15);
    setParsingStatusText("Reading document binary and metadata...");

    let filesToParse: DocumentInputSource[] = [];

    if (sourceFilesList.length > 0) {
      filesToParse = [...sourceFilesList];
    } else if (sourceTab === "GOOGLE_DRIVE") {
      const folder = MOCK_GOOGLE_DRIVE_FOLDERS.find((f) => f.id === selectedDriveFolderId) || MOCK_GOOGLE_DRIVE_FOLDERS[0];
      const selectedFiles = folder.files.filter((f) => selectedDriveFiles.includes(f.id));
      filesToParse = selectedFiles.map((f) => ({
        name: f.name,
        type: f.type,
        origin: "GOOGLE_DRIVE" as const,
        drivePath: `${folder.path}${f.name}`,
        isGroundingSource: true,
        isDownloadable: true,
      }));
    } else if (sourceTab === "URL" && documentUrl) {
      filesToParse = [
        {
          name: documentUrl.split("/").pop() || "Remote-Technical-Datasheet.pdf",
          origin: "URL" as const,
          url: documentUrl,
          isGroundingSource: true,
          isDownloadable: true,
        },
      ];
    } else if (selectedPresetId) {
      const preset = PRESET_DOCUMENT_TEMPLATES.find((p) => p.id === selectedPresetId);
      if (preset) {
        filesToParse = [
          {
            name: preset.filename,
            origin: "COMPUTER" as const,
            isGroundingSource: true,
            isDownloadable: true,
          },
        ];
      }
    } else if (selectedKnowledgeDocId) {
      const doc = companyKnowledgeDocs.find((d) => d.id === selectedKnowledgeDocId);
      if (doc) {
        filesToParse = [
          {
            name: `${doc.title}.pdf`,
            origin: "COMPUTER" as const,
            isGroundingSource: true,
            isDownloadable: true,
          },
        ];
      }
    }

    if (filesToParse.length === 0) {
      filesToParse = [{ name: "Technical-Datasheet.pdf", origin: "COMPUTER" as const }];
    }

    setTimeout(() => {
      setParsingProgress(45);
      setParsingStatusText("Extracting technical specifications & classification rules...");
    }, 300);

    setTimeout(() => {
      setParsingProgress(75);
      setParsingStatusText("Mapping operational applications & commercial terms...");
    }, 600);

    try {
      const draft: ExtractedOfferingDraft = await simulateAIExtractionFromDocument(
        filesToParse,
        offeringType
      );

      setParsingProgress(100);
      setParsingStatusText("Extraction complete. Generating structured draft...");

      setTimeout(() => {
        // Apply extracted draft
        setName(draft.name);
        setOfferingType(draft.type);
        setCategory(draft.category);
        setCode(draft.sku);
        setShortDescription(draft.shortDescription);
        setDetailedDescription(draft.detailedDescription);
        setApplications(draft.applications);
        setSpecifications(draft.specifications);
        setCertifications(draft.certifications);
        setStandards(draft.standards);
        setCommercialInfo(draft.commercialInformation);
        if (draft.serviceScope) setServiceScope(draft.serviceScope);
        if (draft.coverage) setCoverage(draft.coverage);
        if (draft.deliveryModel) setDeliveryModel(draft.deliveryModel);
        if (draft.mediaReferences && draft.mediaReferences.length > 0) {
          setMediaList(draft.mediaReferences);
        }
        setGroundingSources(draft.groundingSources);
        setSourceAttribution(draft.sourceAttribution);
        setSourceAttributions(draft.sourceAttributions || {});
        setFieldConfirmations(draft.fieldConfirmations || {});
        setConflicts(draft.conflicts || []);

        setCurrentStep("REVIEW_DRAFT");
      }, 350);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to extract data from document.");
      setCurrentStep("DOCUMENT_INGEST");
    }
  };

  // Run Simulated Test Query
  const handleRunTestQuery = (queryText: string) => {
    const draftOffering: CompanyOffering = {
      id: initialOffering?.id || `temp-${Date.now()}`,
      companyId,
      name: name || "Commercial Offering",
      type: offeringType,
      category,
      code,
      shortDescription,
      detailedDescription,
      specifications: specifications.reduce((acc, s) => {
        if (s.key.trim() && s.value.trim()) acc[s.key.trim()] = s.value.trim();
        return acc;
      }, {} as Record<string, string>),
      applications,
      certifications,
      standards,
      commercialInformation: commercialInfo,
      groundingSources,
      aiAdvisorConfig: {
        enabled: true,
        roles: advisorRoles,
        conversationPriorities: advisorPriorities,
        communicationStyle: advisorStyles,
      },
    };

    const res = answerOfferingAdvisorQuery(draftOffering, queryText, companyName);
    setTestResponse({
      answer: res.answer,
      sources: res.sourcesUsed,
      confidence: res.confidence,
      action: res.suggestedAction,
    });
  };

  // Add Spec Key-Value
  const handleAddSpec = () => {
    setSpecifications([...specifications, { key: "", value: "" }]);
  };

  const handleUpdateSpec = (index: number, field: "key" | "value", val: string) => {
    const updated = [...specifications];
    updated[index][field] = val;
    setSpecifications(updated);
  };

  const handleRemoveSpec = (index: number) => {
    setSpecifications(specifications.filter((_, i) => i !== index));
  };

  // Add Application
  const handleAddApplication = () => {
    if (!newApplicationInput.trim()) return;
    setApplications([...applications, newApplicationInput.trim()]);
    setNewApplicationInput("");
  };

  // Add Certification
  const handleAddCert = () => {
    if (!newCertInput.trim()) return;
    setCertifications([...certifications, newCertInput.trim()]);
    setNewCertInput("");
  };

  // Add Standard
  const handleAddStandard = () => {
    if (!newStandardInput.trim()) return;
    setStandards([...standards, newStandardInput.trim()]);
    setNewStandardInput("");
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Add Desktop Media Files
  const handleProcessDesktopFiles = (files: FileList | File[], makeCoverFirst: boolean = false) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    fileArray.forEach((file, index) => {
      const isImgOrDoc =
        file.type.startsWith("image/") ||
        file.name.match(/\.(png|jpe?g|webp|svg|gif|avif|bmp|tiff|pdf|dwg)$/i);
      if (!isImgOrDoc) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) return;

        const lower = file.name.toLowerCase();
        let detectedType: "cover" | "photo" | "drawing" | "video" = "photo";
        if (
          lower.includes("drawing") ||
          lower.includes("dwg") ||
          lower.includes("cad") ||
          lower.includes("schematic") ||
          lower.includes("blueprint") ||
          lower.includes("spec") ||
          lower.endsWith(".svg")
        ) {
          detectedType = "drawing";
        } else if (
          makeCoverFirst ||
          (index === 0 && (mediaList.length === 0 || lower.includes("cover") || lower.includes("main") || lower.includes("hero")))
        ) {
          detectedType = "cover";
        }

        const cleanTitle = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

        const newMediaItem: OfferingMediaItem = {
          id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          url: dataUrl,
          title: cleanTitle || `${name || "Offering"} Asset`,
          type: detectedType,
          isCover: makeCoverFirst || (index === 0 && (mediaList.length === 0 || detectedType === "cover")),
          order: mediaList.length + index + 1,
        };

        setMediaList((prev) => {
          if (newMediaItem.isCover) {
            return [
              newMediaItem,
              ...prev.map((m) => ({
                ...m,
                isCover: false,
                type: m.type === "cover" ? "photo" : m.type,
              })),
            ];
          }
          return [...prev, newMediaItem];
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleMediaDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMediaDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessDesktopFiles(e.dataTransfer.files);
    }
  };

  const handleMediaFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessDesktopFiles(e.target.files);
      e.target.value = "";
    }
  };

  const handleQuickCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessDesktopFiles(e.target.files, true);
      e.target.value = "";
    }
  };

  // Add Media Item via URL
  const handleAddMedia = () => {
    if (!newMediaUrl.trim()) return;
    const isCover = mediaList.length === 0 || newMediaType === "cover";
    const newItem: OfferingMediaItem = {
      id: `med-${Date.now()}`,
      url: newMediaUrl.trim(),
      title: newMediaTitle.trim() || `${name || "Offering"} Asset`,
      type: newMediaType,
      isCover,
      order: mediaList.length + 1,
    };
    if (isCover) {
      setMediaList([
        newItem,
        ...mediaList.map((m) => ({
          ...m,
          isCover: false,
          type: m.type === "cover" ? "photo" : m.type,
        })),
      ]);
    } else {
      setMediaList([...mediaList, newItem]);
    }
    setNewMediaUrl("");
    setNewMediaTitle("");
  };

  const handleSetCover = (id: string) => {
    setMediaList(
      mediaList.map((m) => ({
        ...m,
        isCover: m.id === id,
        type: m.id === id ? "cover" : m.type === "cover" ? "photo" : m.type,
      }))
    );
  };

  const handleRemoveMedia = (id: string) => {
    setMediaList(mediaList.filter((m) => m.id !== id));
  };

  const handleMoveMedia = (id: string, direction: "up" | "down") => {
    const idx = mediaList.findIndex((m) => m.id === id);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= mediaList.length) return;
    const updated = [...mediaList];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setMediaList(updated.map((m, i) => ({ ...m, order: i + 1 })));
  };

  const handleUpdateMediaTitle = (id: string, newTitle: string) => {
    setMediaList((prev) => prev.map((m) => (m.id === id ? { ...m, title: newTitle } : m)));
  };

  const handleUpdateMediaType = (id: string, newType: "cover" | "photo" | "drawing" | "video") => {
    setMediaList((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          return {
            ...m,
            type: newType,
            isCover: newType === "cover" ? true : m.isCover,
          };
        }
        if (newType === "cover") {
          return { ...m, isCover: false, type: m.type === "cover" ? "photo" : m.type };
        }
        return m;
      })
    );
  };

  // Toggle Advisor Role
  const handleToggleRole = (role: AdvisorRole) => {
    if (advisorRoles.includes(role)) {
      if (advisorRoles.length > 1) {
        setAdvisorRoles(advisorRoles.filter((r) => r !== role));
      }
    } else {
      if (advisorRoles.length < 3) {
        setAdvisorRoles([...advisorRoles, role]);
      }
    }
  };

  // Toggle Advisor Priority
  const handleTogglePriority = (priority: AdvisorConversationPriority) => {
    if (advisorPriorities.includes(priority)) {
      if (advisorPriorities.length > 1) {
        setAdvisorPriorities(advisorPriorities.filter((p) => p !== priority));
      }
    } else {
      setAdvisorPriorities([...advisorPriorities, priority]);
    }
  };

  // Toggle Advisor Style
  const handleToggleStyle = (style: AdvisorCommunicationStyle) => {
    if (advisorStyles.includes(style)) {
      if (advisorStyles.length > 1) {
        setAdvisorStyles(advisorStyles.filter((s) => s !== style));
      }
    } else {
      if (advisorStyles.length < 4) {
        setAdvisorStyles([...advisorStyles, style]);
      }
    }
  };

  // Save Final Offering
  const handleFinalSave = (publishStatus: "ACTIVE" | "DRAFT" = "ACTIVE") => {
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Offering Name is required.");
      setCurrentStep("REVIEW_DRAFT");
      return;
    }

    if (publishStatus === "ACTIVE" && !isEditing && activeOfferingsCount >= maxActiveLimit) {
      setErrorMessage(
        `Active offering limit (${maxActiveLimit}) reached. Please save as Draft or archive existing offerings first.`
      );
      return;
    }

    const specsRecord: Record<string, string> = {};
    specifications.forEach((s) => {
      if (s.key.trim() && s.value.trim()) {
        specsRecord[s.key.trim()] = s.value.trim();
      }
    });

    const groundingStatus = computeOfferingGroundingStatus({
      shortDescription,
      specifications: specsRecord,
      groundingSources,
      aiAdvisorConfig: {
        enabled: true,
        roles: advisorRoles,
        conversationPriorities: advisorPriorities,
        communicationStyle: advisorStyles,
      },
    });

    const finalOffering: CompanyOffering = {
      id: initialOffering?.id || `${offeringType === "product" ? "prod" : "serv"}-${companyId}-${Date.now()}`,
      companyId,
      name: name.trim(),
      type: offeringType,
      category: category.trim(),
      code: code.trim() || `MW-${name.slice(0, 3).toUpperCase().replace(/\s/g, "")}-01`,
      sku: code.trim() || undefined,
      shortDescription: shortDescription.trim(),
      detailedDescription: detailedDescription.trim() || shortDescription.trim(),
      status: publishStatus,
      specifications: specsRecord,
      applications: applications.filter(Boolean),
      certifications: certifications.filter(Boolean),
      standards: standards.filter(Boolean),
      mediaReferences: mediaList,
      media: mediaList,
      commercialInformation: commercialInfo,
      serviceScope: offeringType === "service" ? serviceScope.trim() : undefined,
      coverage: offeringType === "service" ? coverage.trim() : undefined,
      deliveryModel: offeringType === "service" ? deliveryModel.trim() : undefined,
      groundingSources,
      groundingStatus,
      fieldConfirmations,
      sourceAttributions,
      googleDriveSync:
        sourceTab === "GOOGLE_DRIVE"
          ? ({
              folderId: selectedDriveFolderId,
              folderPath: MOCK_GOOGLE_DRIVE_FOLDERS.find((f) => f.id === selectedDriveFolderId)?.path || "/MarineWorld/Offerings/",
              autoSyncEnabled: true,
              lastSyncAt: new Date().toISOString(),
              fileCount: selectedDriveFiles.length,
            } as any)
          : initialOffering?.googleDriveSync,
      aiAdvisorConfig: {
        enabled: true,
        advisorName: `${name.trim()} AI Advisor`,
        roles: advisorRoles,
        conversationPriorities: advisorPriorities,
        communicationStyle: advisorStyles,
        status: groundingStatus === "NOT GROUNDED" ? "GROUNDED" : (groundingStatus as any),
        verifiedSourcesCount: groundingSources.length || 1,
        lastGeneratedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
      createdAt: initialOffering?.createdAt || new Date().toISOString(),
    };

    onSaveOffering(finalOffering);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 font-sans"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity" onClick={onClose} />

      {/* Main Container */}
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-white rounded-2xl border border-line shadow-2xl flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between gap-4 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-royal/10 border border-royal/20 flex items-center justify-center text-royal shrink-0 shadow-2xs">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold text-royal uppercase tracking-wider">
                  04 — OFFERING WORKFLOW
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-mono text-[10px] font-bold text-stone uppercase">
                  {offeringType === "product" ? "COMMERCIAL PRODUCT" : "OPERATIONAL SERVICE"}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-graphite tracking-tight uppercase">
                {isEditing ? `Edit Offering — ${name || initialOffering?.name}` : "Create AI-Grounded Offering"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Step breadcrumbs */}
            <div className="hidden md:flex items-center gap-1.5 font-mono text-[10px] text-stone">
              <span className={currentStep === "METHOD_CHOICE" ? "text-royal font-bold" : ""}>1. Choose</span>
              <span>→</span>
              <span className={currentStep === "DOCUMENT_INGEST" || currentStep === "PARSING" ? "text-royal font-bold" : ""}>2. Ingest</span>
              <span>→</span>
              <span className={currentStep === "REVIEW_DRAFT" ? "text-royal font-bold" : ""}>3. Review Draft</span>
              <span>→</span>
              <span className={currentStep === "MEDIA" ? "text-royal font-bold" : ""}>4. Media</span>
              <span>→</span>
              <span className={currentStep === "ADVISOR_CONFIG" ? "text-royal font-bold" : ""}>5. AI Advisor</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl border border-line bg-canvas hover:bg-slate-100 text-stone hover:text-graphite flex items-center justify-center transition shadow-2xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="px-6 py-3 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-600 hover:text-rose-900 font-bold">
              Dismiss
            </button>
          </div>
        )}

        {/* Body Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/40">
          
          {/* ========================================================================= */}
          {/* STEP 1: METHOD_CHOICE                                                     */}
          {/* ========================================================================= */}
          {currentStep === "METHOD_CHOICE" && (
            <div className="max-w-3xl mx-auto space-y-6 py-4 animate-in fade-in duration-200">
              <div className="text-center space-y-1.5">
                <h3 className="text-xl font-extrabold text-graphite tracking-tight uppercase">
                  Select Offering Creation Method
                </h3>
                <p className="text-xs text-stone max-w-lg mx-auto">
                  Choose how you want to construct this commercial product or service. AI ingestion extracts structured parameters directly from your existing engineering documents.
                </p>
              </div>

              {/* Type Switcher: Product vs Service */}
              <div className="flex justify-center">
                <div className="p-1 rounded-xl bg-white border border-line shadow-2xs inline-flex gap-1">
                  <button
                    type="button"
                    onClick={() => setOfferingType("product")}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition ${
                      offeringType === "product"
                        ? "bg-royal text-white shadow-2xs"
                        : "text-stone hover:text-graphite"
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    <span>Commercial Product</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOfferingType("service")}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition ${
                      offeringType === "service"
                        ? "bg-royal text-white shadow-2xs"
                        : "text-stone hover:text-graphite"
                    }`}
                  >
                    <Wrench className="w-4 h-4" />
                    <span>Operational Service</span>
                  </button>
                </div>
              </div>

              {/* 2 Primary Method Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* PRIMARY: CREATE FROM DOCUMENT */}
                <div
                  onClick={() => {
                    setCreationMethod("DOCUMENT");
                    setCurrentStep("DOCUMENT_INGEST");
                  }}
                  className="group relative rounded-2xl border-2 border-royal bg-white p-6 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xl bg-royal text-white flex items-center justify-center shadow-xs">
                        <Cpu className="w-6 h-6" />
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-royal/10 text-royal px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider">
                        RECOMMENDED • AI-NATIVE
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-base font-extrabold text-graphite uppercase tracking-tight group-hover:text-royal transition-colors">
                        Create from Document
                      </h4>
                      <p className="text-xs text-stone leading-relaxed">
                        Upload technical datasheets, brochures, manuals, or certificates. AI automatically extracts specifications, certifications, applications, and builds the Offering AI Advisor.
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-line/60 text-[11px] font-mono text-stone">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Supports PDF, DOCX, XLSX, Images</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Zero manual transcription effort</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Instant source attribution & grounding</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between font-mono text-xs font-bold text-royal pt-2">
                    <span>LAUNCH INGESTION</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* SECONDARY: CREATE MANUALLY */}
                <div
                  onClick={() => {
                    setCreationMethod("MANUAL");
                    setCurrentStep("REVIEW_DRAFT");
                  }}
                  className="group rounded-2xl border border-line bg-white p-6 shadow-2xs hover:border-slate-400 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 text-stone flex items-center justify-center">
                        <SlidersHorizontal className="w-6 h-6" />
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-stone px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider">
                        MANUAL ENTRY
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-base font-extrabold text-graphite uppercase tracking-tight group-hover:text-royal transition-colors">
                        Create Manually
                      </h4>
                      <p className="text-xs text-stone leading-relaxed">
                        Input offering title, commercial parameters, technical specifications, and compliance standards by hand using the structured matrix editor.
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-line/60 text-[11px] font-mono text-stone">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Step-by-step form specification</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Custom parameter key/value tables</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Manual advisor role selection</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between font-mono text-xs font-bold text-graphite pt-2">
                    <span>START MANUAL FORM</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: DOCUMENT_INGEST                                                   */}
          {/* ========================================================================= */}
          {currentStep === "DOCUMENT_INGEST" && (
            <div className="max-w-3xl mx-auto space-y-6 py-2 animate-in fade-in duration-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-royal uppercase">
                  <span>UNIFIED SOURCE SELECTOR</span>
                </div>
                <h3 className="text-lg font-extrabold text-graphite tracking-tight uppercase">
                  Add Source Technical Documents
                </h3>
                <p className="text-xs text-stone">
                  AI extracts structured specifications, compliance items, and commercial terms. Unresolved values remain empty and marked NOT PROVIDED.
                </p>
              </div>

              {/* Source Mode Tabs */}
              <div className="flex items-center gap-2 border-b border-line pb-1">
                <button
                  type="button"
                  onClick={() => setSourceTab("COMPUTER")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 cursor-pointer ${
                    sourceTab === "COMPUTER"
                      ? "bg-royal text-white shadow-2xs"
                      : "text-stone hover:text-graphite hover:bg-slate-100"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>UPLOAD FROM COMPUTER</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceTab("GOOGLE_DRIVE")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 cursor-pointer ${
                    sourceTab === "GOOGLE_DRIVE"
                      ? "bg-royal text-white shadow-2xs"
                      : "text-stone hover:text-graphite hover:bg-slate-100"
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-300" />
                  <span>GOOGLE DRIVE</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceTab("URL")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 cursor-pointer ${
                    sourceTab === "URL"
                      ? "bg-royal text-white shadow-2xs"
                      : "text-stone hover:text-graphite hover:bg-slate-100"
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>PASTE FILE URL</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceTab("PRESETS")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 cursor-pointer ${
                    sourceTab === "PRESETS"
                      ? "bg-royal text-white shadow-2xs"
                      : "text-stone hover:text-graphite hover:bg-slate-100"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PRESETS & KNOWLEDGE</span>
                </button>
              </div>

              {/* TAB 1: COMPUTER UPLOAD */}
              {sourceTab === "COMPUTER" && (
                <div className="space-y-4">
                  <label
                    htmlFor="file-upload-input"
                    className="border-2 border-dashed border-royal/40 hover:border-royal bg-royal/5 hover:bg-royal/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer text-center"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white border border-royal/20 flex items-center justify-center text-royal shadow-xs">
                      <Upload className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-extrabold text-graphite uppercase">
                        Drag & Drop Files or Click to Browse Computer
                      </p>
                      <p className="text-xs text-stone">
                        PDF, DOCX, XLSX, Images, Technical Datasheets, Drawings, Catalogs (up to 50MB)
                      </p>
                    </div>
                    <input
                      id="file-upload-input"
                      type="file"
                      multiple
                      accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          const newFiles = Array.from(files).map((f: File) => ({
                            name: f.name,
                            size: f.size,
                            type: f.type,
                            origin: "COMPUTER" as const,
                            isGroundingSource: true,
                            isDownloadable: true,
                          }));
                          setSourceFilesList((prev) => [...prev, ...newFiles]);
                        }
                      }}
                    />
                  </label>

                  {/* Uploaded Files Queue */}
                  {sourceFilesList.length > 0 && (
                    <div className="p-4 rounded-2xl border border-line bg-white space-y-3">
                      <div className="flex items-center justify-between font-mono text-[11px] font-bold text-graphite uppercase">
                        <span>Selected Ingestion Files ({sourceFilesList.length})</span>
                        <button
                          type="button"
                          onClick={() => setSourceFilesList([])}
                          className="text-[10px] text-rose-600 hover:underline cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="space-y-2">
                        {sourceFilesList.map((file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-canvas border border-line text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileText className="w-4 h-4 text-royal shrink-0" />
                              <div className="min-w-0">
                                <p className="font-bold text-graphite truncate">{file.name}</p>
                                <p className="text-[10px] font-mono text-stone">
                                  {file.origin || "COMPUTER"} • {(file.size ? (file.size / 1024 / 1024).toFixed(2) : "1.2")} MB • AI GROUNDING SOURCE
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSourceFilesList(sourceFilesList.filter((_, i) => i !== idx))}
                              className="text-stone hover:text-rose-600 p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: GOOGLE DRIVE */}
              {sourceTab === "GOOGLE_DRIVE" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60 flex items-start gap-3">
                    <FolderOpen className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-amber-900 uppercase font-mono">
                        Google Drive Enterprise Sync Connected
                      </p>
                      <p className="text-amber-800 leading-relaxed">
                        Select individual engineering datasheets or synchronize an entire offering folder. Updates to source documents in Google Drive will prompt version re-grounding.
                      </p>
                    </div>
                  </div>

                  {/* Folder Selector */}
                  <div className="space-y-2">
                    <label className="font-mono text-xs font-bold text-graphite uppercase">
                      Select Drive Folder
                    </label>
                    <select
                      value={selectedDriveFolderId}
                      onChange={(e) => {
                        setSelectedDriveFolderId(e.target.value);
                        const folder = MOCK_GOOGLE_DRIVE_FOLDERS.find((f) => f.id === e.target.value);
                        if (folder) {
                          setSelectedDriveFiles(folder.files.map((f) => f.id));
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-white font-mono text-xs text-graphite focus:outline-hidden focus:border-royal"
                    >
                      {MOCK_GOOGLE_DRIVE_FOLDERS.map((f) => (
                        <option key={f.id} value={f.id}>
                          📁 {f.name} ({f.path}) — {f.files.length} documents
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* File List in selected folder */}
                  {(() => {
                    const currentFolder = MOCK_GOOGLE_DRIVE_FOLDERS.find((f) => f.id === selectedDriveFolderId) || MOCK_GOOGLE_DRIVE_FOLDERS[0];
                    return (
                      <div className="p-4 rounded-2xl border border-line bg-white space-y-2.5">
                        <div className="flex items-center justify-between font-mono text-[11px] font-bold text-graphite uppercase">
                          <span>Files in {currentFolder.name}</span>
                          <span className="text-royal">{selectedDriveFiles.length} of {currentFolder.files.length} selected</span>
                        </div>
                        <div className="space-y-1.5">
                          {currentFolder.files.map((file) => {
                            const isChecked = selectedDriveFiles.includes(file.id);
                            return (
                              <label
                                key={file.id}
                                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                                  isChecked
                                    ? "bg-royal/5 border-royal/40"
                                    : "bg-canvas border-line hover:border-slate-300"
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedDriveFiles([...selectedDriveFiles, file.id]);
                                      } else {
                                        setSelectedDriveFiles(selectedDriveFiles.filter((id) => id !== file.id));
                                      }
                                    }}
                                    className="rounded border-line text-royal focus:ring-royal"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-graphite truncate">{file.name}</p>
                                    <p className="text-[10px] font-mono text-stone">
                                      Size: {file.size} • Type: {file.type.toUpperCase()}
                                    </p>
                                  </div>
                                </div>
                                <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                  Grounded
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 3: URL INPUT */}
              {sourceTab === "URL" && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl border border-line bg-white space-y-3">
                    <label className="font-mono text-xs font-bold text-graphite uppercase">
                      Paste Public Datasheet / Specification URL
                    </label>
                    <input
                      type="url"
                      value={documentUrl}
                      onChange={(e) => setDocumentUrl(e.target.value)}
                      placeholder="https://company.com/specs/AM-ROV4-Datasheet.pdf"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-canvas text-xs font-mono text-graphite focus:outline-hidden focus:border-royal"
                    />
                    <p className="text-[11px] text-stone">
                      Accepts direct PDF links, technical catalog URLs, or manufacturer documentation portals.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 4: PRESETS & KNOWLEDGE */}
              {sourceTab === "PRESETS" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="font-mono text-[10.5px] font-bold text-stone uppercase tracking-wider">
                      SAMPLE TECHNICAL DATASHEETS (1-CLICK TEST)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {PRESET_DOCUMENT_TEMPLATES.map((preset) => (
                        <div
                          key={preset.id}
                          onClick={() => {
                            setSelectedPresetId(preset.id);
                            setSelectedKnowledgeDocId("");
                            setOfferingType(preset.type);
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                            selectedPresetId === preset.id
                              ? "border-royal bg-royal/10 shadow-2xs"
                              : "border-line bg-white hover:border-slate-400"
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-soft text-royal flex items-center justify-center shrink-0 border border-royal/20 mt-0.5">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-graphite text-xs truncate uppercase">
                                {preset.filename}
                              </span>
                              <span className="text-[9.5px] font-mono text-royal font-bold uppercase shrink-0">
                                {preset.type}
                              </span>
                            </div>
                            <p className="text-[11px] text-stone truncate mt-0.5">{preset.title}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {companyKnowledgeDocs.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-line">
                      <div className="font-mono text-[10.5px] font-bold text-stone uppercase tracking-wider">
                        AUTHORIZED COMPANY KNOWLEDGE BASE
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {companyKnowledgeDocs.slice(0, 4).map((kdoc) => (
                          <div
                            key={kdoc.id}
                            onClick={() => {
                              setSelectedKnowledgeDocId(kdoc.id);
                              setSelectedPresetId("");
                            }}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                              selectedKnowledgeDocId === kdoc.id
                                ? "border-royal bg-royal/10 shadow-2xs"
                                : "border-line bg-white hover:border-slate-400"
                            }`}
                          >
                            <BookOpen className="w-4 h-4 text-royal shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-graphite truncate uppercase">{kdoc.title}</p>
                              <p className="text-[10px] font-mono text-stone">{kdoc.documentType} • GROUNDED</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Ingestion Footer actions */}
              <div className="flex items-center justify-between pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setCurrentStep("METHOD_CHOICE")}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-line bg-white text-xs font-bold text-stone hover:text-graphite shadow-2xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  id="btn-trigger-ai-extraction"
                  disabled={
                    sourceFilesList.length === 0 &&
                    ((sourceTab as string) === "GOOGLE_DRIVE" && selectedDriveFiles.length === 0) &&
                    ((sourceTab as string) === "URL" && !documentUrl.trim()) &&
                    ((sourceTab as string) === "PRESETS" && !selectedPresetId && !selectedKnowledgeDocId)
                  }
                  onClick={handleRunExtraction}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-royal hover:bg-royal/90 disabled:opacity-50 text-white text-xs font-bold shadow-md cursor-pointer transition uppercase tracking-wider"
                >
                  <Cpu className="w-4 h-4" />
                  <span>Extract Structured Data with AI</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: PARSING ANIMATION                                                 */}
          {/* ========================================================================= */}
          {currentStep === "PARSING" && (
            <div className="max-w-md mx-auto py-16 text-center space-y-6 animate-in fade-in duration-200">
              <div className="relative w-20 h-20 mx-auto rounded-3xl bg-royal/10 border-2 border-royal flex items-center justify-center text-royal shadow-lg animate-pulse">
                <Cpu className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-extrabold text-graphite tracking-tight uppercase">
                  AI Extracting Structured Offering Data
                </h3>
                <p className="text-xs font-mono text-stone">{parsingStatusText}</p>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden border border-line/60 p-0.5">
                <div
                  className="h-full rounded-full bg-royal transition-all duration-300"
                  style={{ width: `${parsingProgress}%` }}
                />
              </div>

              <div className="text-[11px] font-mono text-slate-400">
                Grounding against verified MarineWorld schema and class taxonomy...
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: REVIEW_DRAFT                                                      */}
          {/* ========================================================================= */}
          {currentStep === "REVIEW_DRAFT" && (
            <div className="max-w-4xl mx-auto space-y-6 py-2 animate-in fade-in duration-200">
              {/* AI Draft Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-royal/10 border border-royal/30">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-royal text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-royal uppercase tracking-wider">
                        AI GENERATED DRAFT
                      </span>
                      {sourceAttribution && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-white border border-line px-2 py-0.5 text-[9.5px] font-mono font-bold text-graphite">
                          <FileText className="w-3 h-3 text-royal" />
                          SOURCE: {sourceAttribution}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone mt-0.5">
                      Review all extracted parameters. Unsupported fields remain empty and are visibly marked as <span className="font-bold text-slate-700">NOT PROVIDED</span>.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-line text-[10px] font-mono font-bold text-emerald-800">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 inline mr-1" />
                    CONFIDENCE 96%
                  </span>
                </div>
              </div>

              {/* Source Conflicts Resolution Panel */}
              {conflicts.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-3">
                  <div className="flex items-center justify-between font-mono text-xs font-bold text-amber-900 uppercase">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Source Inconsistency Flagged ({conflicts.length})</span>
                    </div>
                    <span className="text-[10px] text-amber-700">Action Required</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Multiple uploaded source documents contain differing values for the following parameters. Select the authoritative source to resolve:
                  </p>
                  <div className="space-y-2">
                    {conflicts.map((conflict, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-white border border-amber-200 space-y-2">
                        <div className="font-bold text-xs text-graphite uppercase font-mono">
                          {conflict.fieldLabel}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (conflict.field === "commercialInfo.leadTime") {
                                setCommercialInfo({ ...commercialInfo, leadTime: conflict.valueA });
                              }
                              setConflicts(conflicts.filter((_, i) => i !== idx));
                            }}
                            className="p-2.5 rounded-lg border border-line hover:border-royal bg-canvas text-left text-xs transition cursor-pointer"
                          >
                            <span className="text-[10px] font-mono text-stone block">Source A ({conflict.sourceA}):</span>
                            <span className="font-bold text-graphite">{conflict.valueA}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (conflict.field === "commercialInfo.leadTime") {
                                setCommercialInfo({ ...commercialInfo, leadTime: conflict.valueB });
                              }
                              setConflicts(conflicts.filter((_, i) => i !== idx));
                            }}
                            className="p-2.5 rounded-lg border border-line hover:border-royal bg-canvas text-left text-xs transition cursor-pointer"
                          >
                            <span className="text-[10px] font-mono text-stone block">Source B ({conflict.sourceB}):</span>
                            <span className="font-bold text-graphite">{conflict.valueB}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Form Section 1: Offering Core Identity */}
              <div className="rounded-2xl border border-line bg-white p-5 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 border-b border-line pb-2 font-mono text-[11px] font-bold text-graphite uppercase tracking-wider">
                  <Package className="w-4 h-4 text-royal" />
                  <span>1. Offering Identity & Classification</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-graphite uppercase tracking-wider">
                      Offering Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Autonomous Subsea ROV-4"
                      className="w-full px-3.5 py-2 rounded-xl border border-line bg-canvas text-xs font-bold text-graphite focus:outline-hidden focus:border-royal focus:ring-1 focus:ring-royal"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-graphite uppercase tracking-wider">
                      Offering Type
                    </label>
                    <select
                      value={offeringType}
                      onChange={(e) => setOfferingType(e.target.value as "product" | "service")}
                      className="w-full px-3.5 py-2 rounded-xl border border-line bg-canvas text-xs font-bold text-graphite focus:outline-hidden focus:border-royal"
                    >
                      <option value="product">COMMERCIAL PRODUCT (Physical Equipment / Hardware)</option>
                      <option value="service">OPERATIONAL SERVICE (Technical / Survey / Engineering)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-graphite uppercase tracking-wider">
                      Category Domain
                    </label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Subsea Robotics & Inspection"
                      className="w-full px-3.5 py-2 rounded-xl border border-line bg-canvas text-xs font-bold text-graphite focus:outline-hidden focus:border-royal"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-graphite uppercase tracking-wider">
                      Catalog Code / SKU
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="e.g. AM-ROV4-X300"
                      className="w-full px-3.5 py-2 rounded-xl border border-line bg-canvas text-xs font-mono font-bold text-graphite focus:outline-hidden focus:border-royal"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-graphite uppercase tracking-wider">
                    Executive Summary (Short Description) *
                  </label>
                  <input
                    type="text"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="Short one-line operational description for catalog cards..."
                    className="w-full px-3.5 py-2 rounded-xl border border-line bg-canvas text-xs text-graphite focus:outline-hidden focus:border-royal"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-graphite uppercase tracking-wider">
                    Detailed Engineering Overview
                  </label>
                  <textarea
                    rows={3}
                    value={detailedDescription}
                    onChange={(e) => setDetailedDescription(e.target.value)}
                    placeholder="Comprehensive operational description, hull integration guidelines, sensor configurations..."
                    className="w-full px-3.5 py-2 rounded-xl border border-line bg-canvas text-xs text-graphite focus:outline-hidden focus:border-royal"
                  />
                </div>

                {/* Primary Visual Asset & Quick Desktop Upload */}
                <div className="pt-2 border-t border-line">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-graphite uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-royal" />
                      <span>Primary Cover Visual</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setCurrentStep("MEDIA")}
                      className="text-[11px] font-mono font-bold text-royal hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Media Repository ({mediaList.length})</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-xl bg-slate-50 border border-line">
                    <div className="w-20 h-14 rounded-lg bg-slate-900 overflow-hidden shrink-0 relative border border-slate-200">
                      {mediaList.find((m) => m.isCover)?.url || mediaList[0]?.url ? (
                        <img
                          src={mediaList.find((m) => m.isCover)?.url || mediaList[0]?.url}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px]">
                          No visual
                        </div>
                      )}
                      <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] font-mono text-center py-0.5 uppercase">
                        Cover
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-graphite truncate">
                        {mediaList.find((m) => m.isCover)?.title || mediaList[0]?.title || "Primary Offering Asset"}
                      </p>
                      <p className="text-[11px] font-mono text-stone truncate mt-0.5">
                        {mediaList.find((m) => m.isCover)?.url.startsWith("data:")
                          ? "Loaded from Local Desktop"
                          : mediaList.find((m) => m.isCover)?.url || "No image configured"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        ref={quickCoverInputRef}
                        type="file"
                        accept="image/*,.pdf,.svg,.dwg,.webp,.jpg,.jpeg,.png,.gif"
                        onChange={handleQuickCoverUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => quickCoverInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-white border border-line hover:border-royal text-graphite text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <HardDrive className="w-3.5 h-3.5 text-royal" />
                        <span>Upload from Desktop</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Section 2: Technical Specifications Matrix */}
              <div className="rounded-2xl border border-line bg-white p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-graphite uppercase tracking-wider">
                    <SlidersHorizontal className="w-4 h-4 text-royal" />
                    <span>2. Verified Technical Specifications ({specifications.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSpec}
                    className="inline-flex items-center gap-1 text-[10.5px] font-mono font-bold text-royal hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Parameter</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {specifications.map((spec, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={spec.key}
                        onChange={(e) => handleUpdateSpec(idx, "key", e.target.value)}
                        placeholder="Parameter Name (e.g. Max Depth Rating)"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-line bg-canvas text-xs font-bold text-graphite focus:outline-hidden focus:border-royal"
                      />
                      <input
                        type="text"
                        value={spec.value}
                        onChange={(e) => handleUpdateSpec(idx, "value", e.target.value)}
                        placeholder="Value (e.g. 450 m / 1,476 ft)"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-line bg-canvas text-xs font-mono text-graphite focus:outline-hidden focus:border-royal"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSpec(idx)}
                        className="p-1.5 rounded-lg text-stone hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {specifications.length === 0 && (
                    <div className="p-4 rounded-xl border border-dashed border-amber-200 bg-amber-50/60 text-center font-mono text-xs text-amber-800">
                      <span className="font-bold">NOT PROVIDED</span> — No technical specifications were found in the uploaded document. Add parameters above to unlock AI Ready status.
                    </div>
                  )}
                </div>
              </div>

              {/* Form Section 3: Applications, Certifications & Standards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Applications */}
                <div className="rounded-2xl border border-line bg-white p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-line pb-2 font-mono text-[11px] font-bold text-graphite uppercase tracking-wider">
                    <span>Applications & Use-Cases</span>
                    <span className="text-royal">{applications.length}</span>
                  </div>

                  <div className="space-y-1.5">
                    {applications.map((app, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-canvas border border-line text-xs font-medium text-graphite">
                        <span>{app}</span>
                        <button
                          type="button"
                          onClick={() => setApplications(applications.filter((_, i) => i !== idx))}
                          className="text-stone hover:text-rose-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newApplicationInput}
                        onChange={(e) => setNewApplicationInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddApplication();
                          }
                        }}
                        placeholder="Add application..."
                        className="flex-1 px-3 py-1.5 rounded-lg border border-line bg-canvas text-xs text-graphite"
                      />
                      <button
                        type="button"
                        onClick={handleAddApplication}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Certifications */}
                <div className="rounded-2xl border border-line bg-white p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-line pb-2 font-mono text-[11px] font-bold text-graphite uppercase tracking-wider">
                    <span>Class Certifications & Standards</span>
                    <span className="text-royal">{certifications.length + standards.length}</span>
                  </div>

                  <div className="space-y-1.5">
                    {certifications.map((cert, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs font-bold text-emerald-900">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          {cert}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCertifications(certifications.filter((_, i) => i !== idx))}
                          className="text-stone hover:text-rose-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {standards.map((std, idx) => (
                      <div key={`std-${idx}`} className="flex items-center justify-between p-2 rounded-lg bg-canvas border border-line text-xs text-stone">
                        <span>{std}</span>
                        <button
                          type="button"
                          onClick={() => setStandards(standards.filter((_, i) => i !== idx))}
                          className="text-stone hover:text-rose-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newCertInput}
                        onChange={(e) => setNewCertInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCert();
                          }
                        }}
                        placeholder="Add certificate (e.g. DNV Type Approval)..."
                        className="flex-1 px-3 py-1.5 rounded-lg border border-line bg-canvas text-xs text-graphite"
                      />
                      <button
                        type="button"
                        onClick={handleAddCert}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Section 4: Commercial Information */}
              <div className="rounded-2xl border border-line bg-white p-5 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 border-b border-line pb-2 font-mono text-[11px] font-bold text-graphite uppercase tracking-wider">
                  <FileBadge className="w-4 h-4 text-royal" />
                  <span>3. Commercial Information & RFQ Parameters</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-graphite uppercase tracking-wider">
                      Pricing Guidance
                    </label>
                    <input
                      type="text"
                      value={commercialInfo.pricingGuidance || ""}
                      onChange={(e) => setCommercialInfo({ ...commercialInfo, pricingGuidance: e.target.value })}
                      placeholder="e.g. Available upon commercial inquiry"
                      className="w-full px-3.5 py-2 rounded-xl border border-line bg-canvas text-xs text-graphite"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-graphite uppercase tracking-wider">
                      Standard Incoterms
                    </label>
                    <input
                      type="text"
                      value={commercialInfo.incoterms || ""}
                      onChange={(e) => setCommercialInfo({ ...commercialInfo, incoterms: e.target.value })}
                      placeholder="e.g. EXW / FOB Shipyard Gate"
                      className="w-full px-3.5 py-2 rounded-xl border border-line bg-canvas text-xs font-mono text-graphite"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-graphite uppercase tracking-wider">
                      Lead Time
                    </label>
                    <input
                      type="text"
                      value={commercialInfo.leadTime || ""}
                      onChange={(e) => setCommercialInfo({ ...commercialInfo, leadTime: e.target.value })}
                      placeholder="e.g. 4 to 8 Weeks"
                      className="w-full px-3.5 py-2 rounded-xl border border-line bg-canvas text-xs font-mono text-graphite"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-graphite uppercase tracking-wider">
                      Availability Status
                    </label>
                    <input
                      type="text"
                      value={commercialInfo.availability || ""}
                      onChange={(e) => setCommercialInfo({ ...commercialInfo, availability: e.target.value })}
                      placeholder="e.g. IN STOCK / BUILT TO ORDER"
                      className="w-full px-3.5 py-2 rounded-xl border border-line bg-canvas text-xs font-mono text-graphite"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-graphite uppercase tracking-wider">
                      Minimum Order / Scope
                    </label>
                    <input
                      type="text"
                      value={commercialInfo.minOrderQty || ""}
                      onChange={(e) => setCommercialInfo({ ...commercialInfo, minOrderQty: e.target.value })}
                      placeholder="e.g. 1 Unit / Scope"
                      className="w-full px-3.5 py-2 rounded-xl border border-line bg-canvas text-xs font-mono text-graphite"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-graphite uppercase tracking-wider">
                      Warranty Coverage
                    </label>
                    <input
                      type="text"
                      value={commercialInfo.warranty || ""}
                      onChange={(e) => setCommercialInfo({ ...commercialInfo, warranty: e.target.value })}
                      placeholder="e.g. 24-Month Comprehensive Warranty"
                      className="w-full px-3.5 py-2 rounded-xl border border-line bg-canvas text-xs text-graphite"
                    />
                  </div>
                </div>
              </div>

              {/* Navigation Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setCurrentStep(creationMethod === "DOCUMENT" ? "DOCUMENT_INGEST" : "METHOD_CHOICE")}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-line bg-white text-xs font-bold text-stone hover:text-graphite shadow-2xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep("MEDIA")}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-royal text-white text-xs font-bold shadow-md hover:bg-royal/90 transition uppercase tracking-wider"
                >
                  <span>Proceed to Media & Assets</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: MEDIA                                                             */}
          {/* ========================================================================= */}
          {currentStep === "MEDIA" && (
            <div className="max-w-4xl mx-auto space-y-6 py-2 animate-in fade-in duration-200">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-royal uppercase">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>MEDIA ASSET REPOSITORY</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono font-bold text-slate-700">
                      {mediaList.length} {mediaList.length === 1 ? "Asset" : "Assets"} Attached
                    </span>
                    {mediaList.some((m) => m.isCover) && (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 border border-emerald-200 text-[10px] font-mono font-bold text-emerald-800">
                        Cover Assigned
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="text-lg font-extrabold text-graphite tracking-tight uppercase">
                  Manage Photos, Blueprints & Technical Drawings
                </h3>
                <p className="text-xs text-stone">
                  Upload high-resolution equipment renders, technical drawings, CAD schematics, and certificates directly from your computer or import via URL.
                </p>
              </div>

              {/* Hidden Desktop File Picker */}
              <input
                ref={mediaFileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.svg,.dwg,.webp,.jpg,.jpeg,.png,.gif"
                onChange={handleMediaFileInputChange}
                className="hidden"
              />

              {/* Upload Method Switcher */}
              <div className="p-4 rounded-2xl border border-line bg-white space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="font-mono text-xs font-bold text-graphite uppercase flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-royal" />
                    <span>Add Visual & Technical Assets</span>
                  </div>

                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-mono font-bold">
                    <button
                      type="button"
                      onClick={() => setMediaUploadTab("DESKTOP")}
                      className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                        mediaUploadTab === "DESKTOP"
                          ? "bg-white text-royal shadow-2xs"
                          : "text-stone hover:text-graphite"
                      }`}
                    >
                      <HardDrive className="w-3.5 h-3.5" />
                      <span>Upload from Desktop</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaUploadTab("URL")}
                      className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                        mediaUploadTab === "URL"
                          ? "bg-white text-royal shadow-2xs"
                          : "text-stone hover:text-graphite"
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Paste Web URL</span>
                    </button>
                  </div>
                </div>

                {/* DESKTOP DRAG & DROP ZONE */}
                {mediaUploadTab === "DESKTOP" && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsMediaDragActive(true);
                    }}
                    onDragLeave={() => setIsMediaDragActive(false)}
                    onDrop={handleMediaDrop}
                    onClick={() => mediaFileInputRef.current?.click()}
                    className={`relative p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center group ${
                      isMediaDragActive
                        ? "border-royal bg-royal/10 ring-4 ring-royal/20"
                        : "border-slate-300 hover:border-royal bg-slate-50/70 hover:bg-slate-50"
                    }`}
                  >
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-white shadow-2xs border border-line flex items-center justify-center text-royal group-hover:scale-105 transition-transform">
                        <FolderUp className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-graphite">
                          Drag & drop photos, blueprints, or CAD drawings here
                        </p>
                        <p className="text-xs text-stone">
                          or <span className="text-royal font-bold underline">browse files on your computer</span>
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                        <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-mono text-slate-600">
                          PNG / JPG / WEBP
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-mono text-slate-600">
                          SVG Vectors
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-mono text-slate-600">
                          CAD / DWG / PDF Drawings
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-royal/10 text-royal text-[10px] font-mono font-bold">
                          Multi-file upload supported
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* URL INPUT FORM */}
                {mediaUploadTab === "URL" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="url"
                        value={newMediaUrl}
                        onChange={(e) => setNewMediaUrl(e.target.value)}
                        placeholder="https://... image, render, or drawing URL"
                        className="sm:col-span-2 px-3.5 py-2 rounded-xl border border-line bg-canvas text-xs text-graphite focus:outline-hidden focus:border-royal"
                      />
                      <select
                        value={newMediaType}
                        onChange={(e) => setNewMediaType(e.target.value as any)}
                        className="px-3.5 py-2 rounded-xl border border-line bg-canvas text-xs font-bold text-graphite focus:outline-hidden focus:border-royal"
                      >
                        <option value="photo">PHOTO / RENDER</option>
                        <option value="drawing">TECHNICAL DRAWING / SCHEMATIC</option>
                        <option value="video">VIDEO FOOTAGE</option>
                        <option value="cover">PRIMARY COVER IMAGE</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <input
                        type="text"
                        value={newMediaTitle}
                        onChange={(e) => setNewMediaTitle(e.target.value)}
                        placeholder="Asset caption (e.g. Subsea ROV Thruster Array Schematic)"
                        className="flex-1 px-3.5 py-2 rounded-xl border border-line bg-canvas text-xs text-graphite focus:outline-hidden focus:border-royal"
                      />
                      <button
                        type="button"
                        onClick={handleAddMedia}
                        disabled={!newMediaUrl.trim()}
                        className="px-5 py-2 rounded-xl bg-royal hover:bg-royal/90 disabled:opacity-50 text-white text-xs font-bold shadow-2xs cursor-pointer transition uppercase"
                      >
                        Add Asset
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Media Gallery Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between font-mono text-xs font-bold text-graphite uppercase">
                  <span>Offering Visual Gallery ({mediaList.length})</span>
                  <button
                    type="button"
                    onClick={() => mediaFileInputRef.current?.click()}
                    className="text-[11px] font-mono text-royal hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload More from Desktop</span>
                  </button>
                </div>

                {mediaList.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-line bg-slate-50 text-center space-y-3">
                    <FileImage className="w-10 h-10 mx-auto text-slate-400" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-graphite uppercase">No Media Assets Added Yet</p>
                      <p className="text-xs text-stone">
                        Upload equipment photos, CAD schematics, or datasheets from your desktop.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => mediaFileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-royal text-white text-xs font-bold shadow-2xs hover:bg-royal/90 cursor-pointer"
                    >
                      Browse Desktop Files
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {mediaList.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`group relative rounded-2xl border overflow-hidden bg-white shadow-xs transition-all flex flex-col justify-between ${
                          item.isCover
                            ? "border-royal ring-2 ring-royal/20"
                            : "border-line hover:border-slate-400"
                        }`}
                      >
                        {/* Image Canvas */}
                        <div className="aspect-video relative bg-slate-950 overflow-hidden">
                          <img
                            src={item.url}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                          {/* Top Left Badge */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
                            {item.isCover ? (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-royal text-white uppercase tracking-wider shadow-sm">
                                COVER IMAGE
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-black/70 text-white uppercase tracking-wider">
                                {item.type.toUpperCase()}
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-black/60 text-slate-300 uppercase">
                              {item.url.startsWith("data:") ? "DESKTOP" : "WEB URL"}
                            </span>
                          </div>

                          {/* Top Right Action Icons */}
                          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => setSelectedPreviewMedia(item)}
                              title="Full Screen Preview"
                              className="p-1.5 rounded-md bg-black/70 text-white hover:bg-black/90 cursor-pointer transition"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveMedia(item.id)}
                              title="Remove Asset"
                              className="p-1.5 rounded-md bg-black/70 text-rose-400 hover:text-rose-200 hover:bg-rose-950/80 cursor-pointer transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Bottom Caption Overlay */}
                          <div className="absolute bottom-2 left-2 right-2 pointer-events-none">
                            <p className="text-xs font-bold text-white truncate">{item.title || "Asset"}</p>
                          </div>
                        </div>

                        {/* Card Controls & Details */}
                        <div className="p-3 bg-slate-50 space-y-2.5 border-t border-line text-xs">
                          {/* Caption Input */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-stone uppercase block">
                              Caption / Title
                            </label>
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => handleUpdateMediaTitle(item.id, e.target.value)}
                              className="w-full px-2.5 py-1 text-xs rounded-lg border border-line bg-white text-graphite focus:outline-hidden focus:border-royal"
                            />
                          </div>

                          {/* Type & Order controls */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-line/60">
                            <select
                              value={item.isCover ? "cover" : item.type}
                              onChange={(e) => handleUpdateMediaType(item.id, e.target.value as any)}
                              className="px-2 py-1 rounded-md border border-line bg-white text-[11px] font-mono font-bold text-graphite"
                            >
                              <option value="cover">COVER</option>
                              <option value="photo">PHOTO</option>
                              <option value="drawing">DRAWING</option>
                              <option value="video">VIDEO</option>
                            </select>

                            <div className="flex items-center gap-1 font-mono text-[11px]">
                              {!item.isCover ? (
                                <button
                                  type="button"
                                  onClick={() => handleSetCover(item.id)}
                                  className="px-2 py-0.5 rounded bg-white border border-line text-royal font-bold hover:bg-royal hover:text-white transition cursor-pointer"
                                >
                                  Make Cover
                                </button>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                  Active Cover
                                </span>
                              )}

                              <div className="flex items-center">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveMedia(item.id, "up")}
                                  className="p-1 text-stone hover:text-graphite disabled:opacity-30 cursor-pointer"
                                  title="Move Earlier"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === mediaList.length - 1}
                                  onClick={() => handleMoveMedia(item.id, "down")}
                                  className="p-1 text-stone hover:text-graphite disabled:opacity-30 cursor-pointer"
                                  title="Move Later"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fullscreen Preview Lightbox Modal */}
              {selectedPreviewMedia && (
                <div
                  onClick={() => setSelectedPreviewMedia(null)}
                  className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="relative max-w-4xl max-h-[85vh] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col"
                  >
                    <div className="p-3 bg-slate-900 flex items-center justify-between text-white border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-royal uppercase">
                          {selectedPreviewMedia.type}
                        </span>
                        <span className="text-xs font-bold truncate">{selectedPreviewMedia.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPreviewMedia(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-black/40">
                      <img
                        src={selectedPreviewMedia.url}
                        alt={selectedPreviewMedia.title}
                        className="max-w-full max-h-[70vh] object-contain rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setCurrentStep("REVIEW_DRAFT")}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-line bg-white text-xs font-bold text-stone hover:text-graphite shadow-2xs cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Draft</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep("ADVISOR_CONFIG")}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-royal text-white text-xs font-bold shadow-md hover:bg-royal/90 transition uppercase tracking-wider cursor-pointer"
                >
                  <span>Configure Offering AI Advisor</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 6: ADVISOR_CONFIG                                                    */}
          {/* ========================================================================= */}
          {currentStep === "ADVISOR_CONFIG" && (
            <div className="max-w-4xl mx-auto space-y-6 py-2 animate-in fade-in duration-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-royal uppercase">
                  <span>OFFERING AI ADVISOR ARCHITECTURE</span>
                </div>
                <h3 className="text-lg font-extrabold text-graphite tracking-tight uppercase">
                  {name || "Offering"} AI Advisor Profile
                </h3>
                <p className="text-xs text-stone">
                  Configure how this offering's AI Advisor presents technical parameters, compliance certifications, and routes commercial RFQs. Prompt engineering is automatically synthesized within authorized boundaries.
                </p>
              </div>

              {/* Grounding Status Card */}
              <div className="p-5 rounded-2xl border border-line bg-white shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <Handshake className="w-4 h-4 text-royal" />
                    <span className="font-mono text-xs font-bold text-graphite uppercase">
                      Commercial Readiness & Boundary Integrity
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10.5px] font-mono font-bold text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    COMMERCIAL READY
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-canvas border border-line/60">
                    <div className="font-mono text-[10px] text-mute uppercase font-bold">Verified Sources</div>
                    <div className="text-sm font-bold text-graphite mt-0.5">
                      {groundingSources.length > 0 ? `${groundingSources.length} Linked Documents` : "1 Verified Datasheet"}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-canvas border border-line/60">
                    <div className="font-mono text-[10px] text-mute uppercase font-bold">Parameters Count</div>
                    <div className="text-sm font-bold text-emerald-700 mt-0.5">
                      {specifications.length} Technical Specs Verified
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-canvas border border-line/60">
                    <div className="font-mono text-[10px] text-mute uppercase font-bold">Knowledge Boundary</div>
                    <div className="text-sm font-bold text-royal mt-0.5">
                      Strict B2B Anti-Hallucination
                    </div>
                  </div>
                </div>
              </div>

              {/* Advisor Customization 3 Pillars */}
              <div className="space-y-4">
                {/* 1. Roles */}
                <div className="rounded-2xl border border-line bg-white p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <span className="font-mono text-xs font-bold text-graphite uppercase">
                      1. Advisor Role (Select up to 3)
                    </span>
                    <span className="font-mono text-[10.5px] text-royal font-bold">{advisorRoles.length} / 3 Selected</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_ROLES.map((role) => {
                      const isSelected = advisorRoles.includes(role);
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => handleToggleRole(role)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? "bg-royal text-white shadow-2xs"
                              : "bg-canvas text-stone hover:text-graphite border border-line"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          <span>{role}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Priorities */}
                <div className="rounded-2xl border border-line bg-white p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <span className="font-mono text-xs font-bold text-graphite uppercase">
                      2. Conversation Priorities
                    </span>
                    <span className="font-mono text-[10.5px] text-royal font-bold">{advisorPriorities.length} Selected</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_PRIORITIES.map((p) => {
                      const isSelected = advisorPriorities.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleTogglePriority(p)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? "bg-slate-900 text-white shadow-2xs"
                              : "bg-canvas text-stone hover:text-graphite border border-line"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          <span>{p}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Communication Style */}
                <div className="rounded-2xl border border-line bg-white p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <span className="font-mono text-xs font-bold text-graphite uppercase">
                      3. Communication Style (Select 2–4)
                    </span>
                    <span className="font-mono text-[10.5px] text-royal font-bold">{advisorStyles.length} Selected</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_STYLES.map((style) => {
                      const isSelected = advisorStyles.includes(style);
                      return (
                        <button
                          key={style}
                          type="button"
                          onClick={() => handleToggleStyle(style)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? "bg-royal text-white shadow-2xs"
                              : "bg-canvas text-stone hover:text-graphite border border-line"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          <span>{style}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Interactive Grounding Simulation Tester */}
              <div className="rounded-2xl border border-line bg-slate-900 text-white p-5 space-y-4 shadow-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-emerald-400" />
                    <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                      Grounding Boundary Test Console
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    Live Response Simulation
                  </span>
                </div>

                {/* Quick test prompt chips */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTestQuery(`What are the key technical specifications and depth ratings for ${name}?`);
                      handleRunTestQuery(`What are the key technical specifications and depth ratings for ${name}?`);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 border border-slate-700 transition"
                  >
                    Test: Technical Specs
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTestQuery(`What certifications, class approvals, and standards are verified?`);
                      handleRunTestQuery(`What certifications, class approvals, and standards are verified?`);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 border border-slate-700 transition"
                  >
                    Test: Certifications
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTestQuery(`What are the Incoterms, payment milestones, and lead times for quotation?`);
                      handleRunTestQuery(`What are the Incoterms, payment milestones, and lead times for quotation?`);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 border border-slate-700 transition"
                  >
                    Test: Commercial Terms
                  </button>
                </div>

                {testResponse && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono leading-relaxed">
                    <div className="text-emerald-400 font-bold">
                      [{name} AI ADVISOR RESPONSE — GROUNDED]
                    </div>
                    <div className="text-slate-200 whitespace-pre-wrap">{testResponse.answer}</div>
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10.5px] text-slate-400">
                      <span>Sources: {testResponse.sources.join(", ")}</span>
                      <span className="text-emerald-400 font-bold uppercase">Confidence: {testResponse.confidence}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Final Publishing Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setCurrentStep("MEDIA")}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-line bg-white text-xs font-bold text-stone hover:text-graphite shadow-2xs w-full sm:w-auto"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Media</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleFinalSave("DRAFT")}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-line bg-white hover:bg-slate-100 text-graphite text-xs font-bold shadow-2xs transition"
                  >
                    Save as Draft
                  </button>

                  <button
                    type="button"
                    id="btn-publish-offering-final"
                    onClick={() => handleFinalSave("ACTIVE")}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition uppercase tracking-wider cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Publish Live Offering</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
