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
  Folder,
  FolderOpen,
  UploadCloud,
  HardDrive,
  FolderUp,
  FileImage,
  ArrowUp,
  ArrowDown,
  Maximize2,
  RefreshCw,
  ExternalLink,
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
  simulateAIExtractionFromDocument,
  extractOfferingWithGemini,
  computeOfferingGroundingStatus,
  generateDefaultAdvisorConfig,
  answerOfferingAdvisorQuery,
  cachePdfBase64,
  type ExtractedOfferingDraft,
  type DocumentInputSource,
} from "@/lib/services/offeringAIService";
import {
  openGoogleDrivePicker,
  requestGoogleAccessToken,
  parseGoogleDriveLink,
  fetchGoogleDriveFileBase64,
  fetchGoogleDriveFileContent,
  SERVICE_ACCOUNT_EMAIL,
  DEFAULT_ROOT_WORKSPACE,
  type GoogleDriveSelectedFile,
} from "@/lib/services/googleDriveService";
import { getCompanyDocuments } from "@/lib/services/dataSpaceService";
import { getCurrentAuthSession } from "@/lib/services/securityService";
import {
  uploadFileToStorage,
  deleteFileFromStorage,
  validateStorageFile,
} from "@/lib/services/storageService";
import type { OKFDocument } from "@/lib/types/okf";
import { buildOKFDocument, saveOKFDocumentToFirestore } from "@/lib/services/okfService";
import { OKFDocumentViewerModal } from "@/components/studio/knowledge/OKFDocumentViewerModal";
import { GoogleDriveBrowserModal } from "@/components/studio/knowledge/GoogleDriveBrowserModal";

export const formatMediaImageUrl = (url?: string): string => {
  if (!url) return "";
  const match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }
  return url;
};

export const getEmbeddableDocumentUrl = (url?: string): string => {
  if (!url) return "";
  const match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  if (url.includes("firebasestorage.googleapis.com") || url.endsWith(".pdf")) {
    return url;
  }
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
};

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
  "Commercial Terms",
  "Class & Certification",
  "Applications & Integrations",
];

const SUGGESTED_PARAMETERS = [
  "Dimensions (L x W x H)",
  "Weight (Air / Water)",
  "Power / Operating Voltage",
  "Max Depth Rating",
  "Operating Temperature",
  "Material / Alloy Grade",
  "Payload Capacity",
  "Flow Rate / Speed",
  "Communication Protocol",
  "Class Approval / Standard",
  "Warranty Period",
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
    base64Data?: string;
  }>>([]);
  const [selectedDriveFolderId, setSelectedDriveFolderId] = useState<string>("gdrive-f-rov4");
  const [driveLinkInput, setDriveLinkInput] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [selectedKnowledgeDocId, setSelectedKnowledgeDocId] = useState<string>("");
  const [parsingProgress, setParsingProgress] = useState<number>(0);
  const [parsingStatusText, setParsingStatusText] = useState<string>("Reading document binary and metadata...");
  const [isOpeningDrivePicker, setIsOpeningDrivePicker] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [isDriveBrowserOpen, setIsDriveBrowserOpen] = useState(false);
  const [driveBrowserMode, setDriveBrowserMode] = useState<"documents" | "media">("documents");

  // OKF Inspector state
  const [isOKFViewerOpen, setIsOKFViewerOpen] = useState(false);
  const [offeringOKFDoc, setOfferingOKFDoc] = useState<OKFDocument | null>(null);

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

  // Specifications key/value (Starts empty unless edited or AI extracted)
  const [specifications, setSpecifications] = useState<Array<{ key: string; value: string; source?: string }>>(
    initialOffering?.specifications
      ? (Array.isArray(initialOffering.specifications)
          ? (initialOffering.specifications as any)
          : Object.entries(initialOffering.specifications).map(([key, value]) => ({ key, value: String(value) })))
      : []
  );

  // Applications
  const [applications, setApplications] = useState<string[]>(
    initialOffering?.applications || []
  );
  const [newApplicationInput, setNewApplicationInput] = useState("");

  // Certifications
  const [certifications, setCertifications] = useState<string[]>(
    initialOffering?.certifications || []
  );
  const [newCertInput, setNewCertInput] = useState("");

  // Standards
  const [standards, setStandards] = useState<string[]>(
    initialOffering?.standards || []
  );
  const [newStandardInput, setNewStandardInput] = useState("");

  // Commercial Information & Pricing
  const [price, setPrice] = useState<string>(
    initialOffering?.price || initialOffering?.commercialInformation?.price || ""
  );
  const [currency, setCurrency] = useState<string>(
    initialOffering?.currency || initialOffering?.commercialInformation?.currency || "USD"
  );
  const [pricingType, setPricingType] = useState<string>(
    initialOffering?.commercialInformation?.pricingType || "FIXED"
  );
  const [commercialInfo, setCommercialInfo] = useState<OfferingCommercialInfo>(
    initialOffering?.commercialInformation || {
      pricingGuidance: "",
      incoterms: "EXW / FOB",
      leadTime: "",
      availability: "AVAILABLE ON ORDER",
      rfqAvailable: true,
      minOrderQty: "1 Unit",
      warranty: "",
    }
  );

  // Service Specifics (if Service)
  const [serviceScope, setServiceScope] = useState(initialOffering?.serviceScope || "");
  const [coverage, setCoverage] = useState(initialOffering?.coverage || "");
  const [deliveryModel, setDeliveryModel] = useState(initialOffering?.deliveryModel || "");

  // Media State & Desktop Upload (Starts empty unless already uploaded/saved in data storage)
  const [mediaList, setMediaList] = useState<OfferingMediaItem[]>(
    initialOffering?.mediaReferences || initialOffering?.media || []
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

  if (!isOpen) return null;

  // Handle Document AI Extraction
  const handleRunExtraction = async () => {
    setErrorMessage(null);
    setCurrentStep("PARSING");
    setParsingProgress(15);
    setParsingStatusText("Reading document binary and metadata...");

    let filesToParse: DocumentInputSource[] = [];

    if (sourceFilesList.length > 0) {
      filesToParse = [...sourceFilesList];
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
        setName(draft.name || "");
        setOfferingType(draft.type || "product");
        setCategory(draft.category || "Marine Equipment & Systems");
        setCode(draft.sku || "");
        setShortDescription(draft.shortDescription || "");
        setDetailedDescription(draft.detailedDescription || "");
        setApplications(draft.applications || []);
        setSpecifications(draft.specifications || []);
        setCertifications(draft.certifications || []);
        setStandards(draft.standards || []);

        if (draft.commercialInformation) {
          setCommercialInfo(draft.commercialInformation);
          if (draft.commercialInformation.price) {
            setPrice(draft.commercialInformation.price);
          } else if (draft.commercialInformation.pricingGuidance) {
            setPrice(draft.commercialInformation.pricingGuidance);
          }
          if (draft.commercialInformation.currency) {
            setCurrency(draft.commercialInformation.currency);
          }
          if (draft.commercialInformation.pricingType) {
            setPricingType(draft.commercialInformation.pricingType);
          }
        }

        if (draft.serviceScope) setServiceScope(draft.serviceScope);
        if (draft.coverage) setCoverage(draft.coverage);
        if (draft.deliveryModel) setDeliveryModel(draft.deliveryModel);
        if (draft.mediaReferences && draft.mediaReferences.length > 0) {
          setMediaList(draft.mediaReferences);
        }
        setGroundingSources(draft.groundingSources || []);
        setSourceAttribution(draft.sourceAttribution || "");
        setSourceAttributions(draft.sourceAttributions || {});
        setFieldConfirmations(draft.fieldConfirmations || {});
        setConflicts(draft.conflicts || []);

        if (draft.okfDocument) {
          setOfferingOKFDoc(draft.okfDocument);
        }

        setCurrentStep("REVIEW_DRAFT");
      }, 350);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to extract data from document.");
      setCurrentStep("DOCUMENT_INGEST");
    }
  };

  const handleDriveFilesSelected = (files: GoogleDriveSelectedFile[]) => {
    const images: GoogleDriveSelectedFile[] = [];
    const documents: GoogleDriveSelectedFile[] = [];

    files.forEach((f) => {
      const lower = f.name.toLowerCase();
      const isImg =
        f.mimeType.includes("image") ||
        /\.(png|jpe?g|webp|svg|gif|avif|bmp)$/i.test(lower);

      if (isImg) {
        images.push(f);
      } else {
        documents.push(f);
      }
    });

    // 1. Add images strictly to Visual Media Gallery (mediaList)
    if (images.length > 0) {
      const newMediaItems: OfferingMediaItem[] = images.map((f, i) => {
        const cleanTitle = f.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

        return {
          id: `med-gdrive-${Date.now()}-${i}`,
          url: f.url || `https://drive.google.com/file/d/${f.id}/view`,
          title: cleanTitle,
          type: "photo",
          isCover: mediaList.length === 0 && i === 0,
          order: mediaList.length + i + 1,
        };
      });
      setMediaList((prev) => [...prev, ...newMediaItems]);
    }

    // 2. Add documents (PDFs, DOCX, etc.) strictly to Technical Documents (sourceFilesList & groundingSources)
    if (documents.length > 0) {
      setSourceFilesList((prev) => [
        ...prev,
        ...documents.map((picked) => ({
          name: picked.name,
          size: picked.sizeBytes,
          origin: "GOOGLE_DRIVE" as const,
          drivePath: picked.url || `Google Drive / ${picked.name}`,
          url: picked.url,
          isGroundingSource: true,
          isDownloadable: true,
        })),
      ]);

      const newSources: OfferingGroundingSource[] = documents.map((f, i) => ({
        id: `src-gdrive-${Date.now()}-${i}`,
        title: f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
        filename: f.name,
        fileType: f.name.split(".").pop()?.toUpperCase() || "PDF",
        size: f.sizeBytes ? `${(f.sizeBytes / 1024 / 1024).toFixed(1)} MB` : "Drive Document",
        url: f.url || `https://drive.google.com/file/d/${f.id}/view`,
        drivePath: f.url || `Google Drive / ${f.name}`,
        uploadedAt: new Date().toISOString(),
        sourceConfidence: 100,
        extractedFieldsCount: 1,
        syncStatus: "SYNCED",
        syncEnabled: true,
        isDownloadableDocument: true,
        isGroundingSource: true,
      }));
      setGroundingSources((prev) => [...prev.filter((s) => !documents.some((d) => d.name === s.filename)), ...newSources]);

      // Immediately ingest file content, create OKF, and save to Firestore
      documents.forEach(async (doc) => {
        try {
          const [b64, textContent] = await Promise.all([
            fetchGoogleDriveFileBase64(doc.id).catch(() => null),
            fetchGoogleDriveFileContent(doc.id, doc.mimeType).catch(() => ""),
          ]);

          if (b64 || textContent) {
            if (b64) {
              cachePdfBase64(doc.name, b64);
              cachePdfBase64(doc.name.toLowerCase(), b64);
              cachePdfBase64(doc.id, b64);
              if (doc.url) cachePdfBase64(doc.url, b64);
            }

            setSourceFilesList((prev) =>
              prev.map((s) => {
                if (s.name === doc.name) {
                  return {
                    ...s,
                    base64Data: b64 || (s as any).base64Data,
                    content: textContent || s.content,
                  };
                }
                return s;
              })
            );

            setGroundingSources((prev) =>
              prev.map((s) => {
                if (s.filename === doc.name) {
                  return {
                    ...s,
                    base64Data: b64 || (s as any).base64Data,
                    extractedText: textContent || s.extractedText,
                    summary: textContent ? textContent.slice(0, 500) : s.summary,
                  };
                }
                return s;
              })
            );

            // Create and persist OKF Document to Firestore
            const okfDoc = buildOKFDocument({
              title: doc.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
              companyId: effectiveCompanyId,
              offeringId: initialOffering?.id,
              entityType: offeringType === "service" ? "SERVICE" : "PRODUCT",
              specifications: [],
              certifications: [],
              operationalBoundaries: [],
              rawText: textContent || `${doc.name} Technical Document`,
              sourceOrigin: "GOOGLE_DRIVE",
            });

            await saveOKFDocumentToFirestore(okfDoc);
          }
        } catch (e) {
          console.warn("[OfferingCreationWizardModal] Background Firestore OKF ingestion:", e);
        }
      });
    }

    setDriveError(null);
  };

  const handleLaunchGoogleDrivePicker = async () => {
    setIsOpeningDrivePicker(true);
    setDriveError(null);
    setDriveBrowserMode("documents");
    try {
      await requestGoogleAccessToken();
      setIsDriveBrowserOpen(true);
    } catch (err: any) {
      console.warn("[OfferingCreationWizardModal] Opening Drive Explorer:", err);
      setIsDriveBrowserOpen(true);
    } finally {
      setIsOpeningDrivePicker(false);
    }
  };

  const handleApplyDriveLink = () => {
    if (!driveLinkInput.trim()) return;
    const parsed = parseGoogleDriveLink(driveLinkInput.trim());
    if (parsed.isValid && parsed.fileId) {
      setSourceFilesList([
        {
          name: `Google_Drive_Doc_${parsed.fileId.slice(0, 6)}.pdf`,
          origin: "GOOGLE_DRIVE",
          drivePath: driveLinkInput.trim(),
          url: driveLinkInput.trim(),
          isGroundingSource: true,
          isDownloadable: true,
        },
      ]);
      setDriveError(null);
    } else {
      setDriveError("Invalid Google Drive link format.");
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

  const handleAddSpecWithKey = (keyName: string = "", defaultValue: string = "") => {
    setSpecifications((prev) => [...prev, { key: keyName, value: defaultValue }]);
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

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        const base64 = res.includes(",") ? res.split(",")[1] : res;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSelectDocumentFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const newFiles: Array<{
      name: string;
      size: number;
      type: string;
      origin: "COMPUTER";
      isGroundingSource: boolean;
      isDownloadable: boolean;
      base64Data?: string;
    }> = [];

    const newSources: OfferingGroundingSource[] = [];

    for (const f of fileArray) {
      let b64: string | undefined;
      try {
        b64 = await readFileAsBase64(f);
        if (b64) {
          cachePdfBase64(f.name, b64);
          cachePdfBase64(f.name.toLowerCase(), b64);
        }
      } catch (err) {
        console.warn("Could not read file base64:", err);
      }

      newFiles.push({
        name: f.name,
        size: f.size,
        type: f.type,
        origin: "COMPUTER",
        isGroundingSource: true,
        isDownloadable: true,
        base64Data: b64,
      });

      const cleanTitle = f.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      newSources.push({
        id: `src-local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: cleanTitle,
        filename: f.name,
        fileType: f.name.split(".").pop()?.toUpperCase() || "PDF",
        size: formatFileSize(f.size),
        uploadedAt: new Date().toISOString(),
        sourceConfidence: 100,
        extractedFieldsCount: 1,
        syncStatus: "SYNCED",
        syncEnabled: true,
        isDownloadableDocument: true,
        isGroundingSource: true,
        base64Data: b64,
      });
    }

    setSourceFilesList((prev) => [...prev, ...newFiles]);
    setGroundingSources((prev) => [
      ...prev.filter((s) => !newFiles.some((nf) => nf.name === s.filename)),
      ...newSources,
    ]);
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Add Desktop Media Files (Photos, Blueprints, PDF Schematics, CAD Renders)
  const handleProcessDesktopFiles = async (files: FileList | File[], makeCoverFirst: boolean = false) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    for (let index = 0; index < fileArray.length; index++) {
      const file = fileArray[index];
      const lower = file.name.toLowerCase();
      const isImg =
        file.type.startsWith("image/") ||
        file.name.match(/\.(png|jpe?g|webp|svg|gif|avif|bmp)$/i);
      const isDoc =
        file.type === "application/pdf" ||
        file.name.match(/\.(pdf|docx?|xlsx?|txt|dwg|dxf|cad|step|stp)$/i);

      if (!isImg && !isDoc) continue;

      const cleanTitle = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      try {
        if (isImg) {
          const isCover = makeCoverFirst || (index === 0 && (mediaList.length === 0 || lower.includes("cover") || lower.includes("main")));
          const res = await uploadFileToStorage(file, {
            companyId,
            categoryFolder: "offerings",
            subFolder: (initialOffering?.id || name || "offering").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            fileRole: isCover ? "cover" : "photo",
          });

          const newMediaItem: OfferingMediaItem = {
            id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            url: res.url,
            title: cleanTitle || `${name || "Offering"} Photo`,
            type: isCover ? "cover" : "photo",
            isCover,
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
        } else if (isDoc) {
          let b64: string | undefined;
          try {
            b64 = await readFileAsBase64(file);
            if (b64) {
              cachePdfBase64(file.name, b64);
              cachePdfBase64(file.name.toLowerCase(), b64);
              cachePdfBase64(cleanTitle, b64);
            }
          } catch {
            // base64 fallback
          }

          const res = await uploadFileToStorage(file, {
            companyId,
            categoryFolder: "offerings",
            subFolder: (initialOffering?.id || name || "offering").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            fileRole: "drawing",
          });

          const newSource: OfferingGroundingSource = {
            id: `src-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            title: cleanTitle,
            filename: file.name,
            fileType: file.name.split(".").pop()?.toUpperCase() || "PDF",
            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            url: res.url,
            uploadedAt: new Date().toISOString(),
            sourceConfidence: 100,
            extractedFieldsCount: 1,
            syncStatus: "SYNCED",
            syncEnabled: true,
            isDownloadableDocument: true,
            isGroundingSource: true,
            base64Data: b64,
          };

          setGroundingSources((prev) => [
            ...prev.filter((s) => s.filename !== file.name),
            newSource,
          ]);

          setSourceFilesList((prev) => [
            ...prev.filter((s) => s.name !== file.name),
            {
              name: file.name,
              size: file.size,
              origin: "COMPUTER",
              url: res.url,
              base64Data: b64,
              isGroundingSource: true,
              isDownloadable: true,
            },
          ]);

          // Asynchronously extract full text, specs, and OKF from the document using Gemini
          if (b64) {
            extractOfferingWithGemini({
              name: file.name,
              size: file.size,
              type: file.type || "application/pdf",
              origin: "COMPUTER",
              base64Data: b64,
            }, offeringType).then(async (draft) => {
              if (draft) {
                const fullText = (draft.groundingSources?.[0]?.extractedText) || draft.detailedDescription || draft.shortDescription;
                setGroundingSources((prev) =>
                  prev.map((s) =>
                    s.filename === file.name
                      ? {
                          ...s,
                          extractedText: fullText,
                          summary: draft.shortDescription || draft.detailedDescription,
                          extractedFieldsCount: draft.extractedFieldsCount,
                        }
                      : s
                  )
                );

                if (draft.specifications && draft.specifications.length > 0) {
                  setSpecifications((prevSpecs) => {
                    const existingKeys = new Set(prevSpecs.map((sp) => sp.key.toLowerCase().trim()));
                    const newSpecsToAdd = draft.specifications.filter((sp) => !existingKeys.has(sp.key.toLowerCase().trim()));
                    return [...prevSpecs, ...newSpecsToAdd];
                  });
                }

                if (draft.okfDocument) {
                  setOfferingOKFDoc(draft.okfDocument);
                  await saveOKFDocumentToFirestore(draft.okfDocument).catch(console.warn);
                }
              }
            }).catch((err) => {
              console.warn("[OfferingCreationWizardModal] Background PDF extraction warning:", err);
            });
          }
        }
      } catch (uploadErr) {
        console.error("[OfferingCreationWizardModal] Media upload error:", uploadErr);
      }
    }
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

  const handleImportDriveMedia = async () => {
    setDriveBrowserMode("media");
    try {
      await requestGoogleAccessToken();
      setIsDriveBrowserOpen(true);
    } catch (err: any) {
      console.warn("[OfferingCreationWizardModal] Opening Drive Explorer for media:", err);
      setIsDriveBrowserOpen(true);
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
    setMediaList((prev) => {
      const target = prev.find((m) => m.id === id);
      if (target && target.url && target.url.includes("firebasestorage.app")) {
        deleteFileFromStorage(target.url).catch(() => {});
      }
      return prev.filter((m) => m.id !== id);
    });
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
      price: offeringType === "product" ? (price.trim() || undefined) : undefined,
      currency: offeringType === "product" ? (currency.trim() || "USD") : undefined,
      commercialInformation: {
        ...commercialInfo,
        price: offeringType === "product" ? (price.trim() || undefined) : undefined,
        currency: offeringType === "product" ? (currency.trim() || "USD") : undefined,
        pricingType: offeringType === "product" ? pricingType : undefined,
      },
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
              folderPath: selectedDriveFolderId ? `/GoogleDrive/Folders/${selectedDriveFolderId}` : "/MarineWorld/Offerings/",
              autoSyncEnabled: true,
              lastSyncAt: new Date().toISOString(),
              fileCount: sourceFilesList.filter((f) => f.origin === "GOOGLE_DRIVE").length,
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

    let updatedOKF: OKFDocument | undefined = undefined;
    if (offeringOKFDoc) {
      updatedOKF = {
        ...offeringOKFDoc,
        title: finalOffering.name,
        offeringId: finalOffering.id,
        offeringSlug: finalOffering.slug,
        entityType: finalOffering.type === "service" ? "SERVICE" : "PRODUCT",
        companyId,
      };
      saveOKFDocumentToFirestore(updatedOKF).catch((err) => {
        console.warn("[OfferingCreationWizardModal] Error saving OKF document:", err);
      });
      finalOffering.okfDocument = updatedOKF;
    }

    // Cache base64 data for all grounding files by offering ID and names
    groundingSources.forEach((src) => {
      const b64 = (src as any).base64Data;
      if (b64) {
        cachePdfBase64(finalOffering.id, b64);
        cachePdfBase64(finalOffering.name, b64);
        if (src.filename) cachePdfBase64(src.filename, b64);
        if (src.title) cachePdfBase64(src.title, b64);
      }
    });

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
                        <span>Supports PDF, DOCX, XLSX, Google Drive, Images</span>
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

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCreationMethod("DOCUMENT");
                          setCurrentStep("DOCUMENT_INGEST");
                          setSourceTab("GOOGLE_DRIVE");
                          handleLaunchGoogleDrivePicker();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 text-[11px] font-mono font-bold flex items-center gap-1.5 transition border border-amber-500/20"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
                        <span>Direct Google Drive Import</span>
                      </button>
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
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handleSelectDocumentFiles(e.dataTransfer.files);
                      }
                    }}
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
                          handleSelectDocumentFiles(files);
                        }
                      }}
                    />

                    <div className="pt-2 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSourceTab("GOOGLE_DRIVE");
                          handleLaunchGoogleDrivePicker();
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 text-xs font-mono font-bold flex items-center gap-2 border border-amber-500/30 transition shadow-2xs cursor-pointer"
                      >
                        <FolderOpen className="w-4 h-4 text-amber-600" />
                        <span>Or Import from Google Drive</span>
                      </button>
                    </div>
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
                      <p className="font-bold text-amber-900 uppercase font-mono flex items-center justify-between">
                        <span>Google Drive Enterprise Sync & Ingestion</span>
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded">CONNECTED</span>
                      </p>
                      <p className="text-amber-800 leading-relaxed">
                        Service Account: <code className="font-mono text-[10.5px] bg-white/60 px-1 py-0.5 rounded">{SERVICE_ACCOUNT_EMAIL}</code> | Root Workspace: <code className="font-mono text-[10.5px] bg-white/60 px-1 py-0.5 rounded">{DEFAULT_ROOT_WORKSPACE}</code>
                      </p>
                    </div>
                  </div>

                  {driveError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-800">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{driveError}</span>
                    </div>
                  )}

                  {/* Option A: Direct Drive Link */}
                  <div className="p-4 rounded-2xl border border-line bg-canvas space-y-3">
                    <label className="text-xs font-bold text-graphite block">
                      Option A: Paste Google Drive Share Link or File ID
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={driveLinkInput}
                        onChange={(e) => setDriveLinkInput(e.target.value)}
                        placeholder="https://drive.google.com/file/d/1A2B3C.../view"
                        className="flex-1 px-3 py-2 bg-white border border-line rounded-xl text-xs font-mono text-graphite focus:outline-hidden focus:border-royal"
                      />
                      <button
                        type="button"
                        onClick={handleApplyDriveLink}
                        disabled={!driveLinkInput.trim()}
                        className="px-4 py-2 rounded-xl bg-royal text-white text-xs font-bold hover:bg-royal/90 disabled:opacity-50 transition"
                      >
                        Add Drive File
                      </button>
                    </div>
                  </div>

                  {/* Option B: Google Drive Picker Trigger */}
                  <div className="p-5 rounded-2xl border border-dashed border-line bg-white space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-xs text-graphite uppercase font-mono">
                          Option B: Interactive Google Drive Picker
                        </h4>
                        <p className="text-xs text-stone mt-0.5">
                          Pick engineering specifications and datasheets directly from your Google Drive using Google Picker API.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleLaunchGoogleDrivePicker}
                        disabled={isOpeningDrivePicker}
                        className="px-4 py-2.5 bg-royal hover:bg-royal/90 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs transition shrink-0"
                      >
                        <Folder className="w-4 h-4" />
                        <span>{isOpeningDrivePicker ? "Opening Picker..." : "Browse Google Drive..."}</span>
                      </button>
                    </div>

                    {sourceFilesList.filter((f) => f.origin === "GOOGLE_DRIVE").length > 0 && (
                      <div className="space-y-2 pt-3 border-t border-line">
                        <span className="text-[11px] font-bold text-graphite uppercase font-mono">
                          Selected Drive Files ({sourceFilesList.filter((f) => f.origin === "GOOGLE_DRIVE").length})
                        </span>
                        <div className="space-y-1.5">
                          {sourceFilesList
                            .filter((f) => f.origin === "GOOGLE_DRIVE")
                            .map((file, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2.5 rounded-xl border border-royal/30 bg-royal/5"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <FileText className="w-4 h-4 text-royal shrink-0" />
                                  <span className="text-xs font-bold text-graphite truncate">{file.name}</span>
                                </div>
                                <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                  Ready to Parse
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: URL INPUT */}
              {sourceTab === "URL" && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl border border-line bg-white space-y-3">
                    <label className="font-mono text-xs font-bold text-graphite uppercase">
                      Paste Public Datasheet / Specification URL
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Globe className="w-4 h-4 text-stone absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="url"
                          placeholder="https://manufacturer.com/datasheet-vessel-spec.pdf"
                          value={documentUrl}
                          onChange={(e) => setDocumentUrl(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-line bg-canvas font-mono text-xs text-graphite focus:outline-hidden focus:border-royal"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-stone">
                      Accepts direct PDF links, technical catalog URLs, or manufacturer documentation portals.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 4: PRESETS & KNOWLEDGE */}
              {sourceTab === "PRESETS" && (
                <div className="space-y-4">
                  {companyKnowledgeDocs.length > 0 ? (
                    <div className="space-y-2">
                      <div className="font-mono text-[10.5px] font-bold text-stone uppercase tracking-wider">
                        AUTHORIZED COMPANY KNOWLEDGE BASE (FIRESTORE)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {companyKnowledgeDocs.map((kdoc) => (
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
                  ) : (
                    <div className="p-6 rounded-2xl border border-line bg-white text-center space-y-2">
                      <BookOpen className="w-8 h-8 text-stone mx-auto" />
                      <p className="text-xs font-bold text-graphite">No Knowledge Documents Found</p>
                      <p className="text-[11px] text-stone">
                        Upload or connect documents in Company Knowledge first, or use the Desktop Upload tab above.
                      </p>
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
                    !documentUrl.trim() &&
                    !selectedPresetId &&
                    !selectedKnowledgeDocId
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
                    <div className="w-20 h-14 rounded-lg bg-slate-900 overflow-hidden shrink-0 relative border border-slate-200 flex items-center justify-center">
                      {mediaList.find((m) => m.isCover)?.url || mediaList[0]?.url ? (
                        (mediaList.find((m) => m.isCover)?.url || mediaList[0]?.url)?.toLowerCase().includes(".pdf") ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-rose-400 p-1">
                            <FileText className="w-5 h-5" />
                            <span className="text-[8px] font-mono font-bold uppercase mt-0.5">PDF Asset</span>
                          </div>
                        ) : (
                          <img
                            src={mediaList.find((m) => m.isCover)?.url || mediaList[0]?.url}
                            alt="Cover preview"
                            className="w-full h-full object-cover"
                          />
                        )
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
                  <div>
                    <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-graphite uppercase tracking-wider">
                      <SlidersHorizontal className="w-4 h-4 text-royal" />
                      <span>2. Technical Specifications & Operating Parameters ({specifications.length})</span>
                    </div>
                    <p className="text-[11px] text-stone mt-0.5">
                      Define engineering attributes, physical dimensions, electrical ratings, depth capabilities, and tolerances.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddSpecWithKey("")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-royal text-white text-xs font-bold shadow-2xs hover:bg-royal/90 cursor-pointer transition shrink-0 uppercase"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Parameter +</span>
                  </button>
                </div>

                {/* Quick Add Suggestions Chips */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono font-bold text-stone uppercase tracking-wider flex items-center gap-1">
                    <span>Quick Suggestion Chips:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_PARAMETERS.map((param) => {
                      const alreadyExists = specifications.some((s) => s.key.toLowerCase().trim() === param.toLowerCase().trim());
                      return (
                        <button
                          key={param}
                          type="button"
                          onClick={() => handleAddSpecWithKey(param)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition cursor-pointer flex items-center gap-1 ${
                            alreadyExists
                              ? "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200"
                              : "bg-mist hover:bg-royal/10 border-line hover:border-royal/30 text-graphite hover:text-royal"
                          }`}
                        >
                          <Plus className="w-3 h-3 text-royal" />
                          <span>{param}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Specifications Rows */}
                <div className="space-y-2.5 pt-1">
                  {specifications.map((spec, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-line group hover:border-royal/30 transition">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-mono text-[10px] font-bold text-stone shrink-0">
                        #{idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={spec.key}
                          onChange={(e) => handleUpdateSpec(idx, "key", e.target.value)}
                          placeholder="Parameter Name (e.g. Dimensions, Operating Voltage, Weight...)"
                          className="w-full px-3 py-2 rounded-lg border border-line bg-white text-xs font-bold text-graphite focus:outline-hidden focus:border-royal shadow-2xs"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={spec.value}
                          onChange={(e) => handleUpdateSpec(idx, "value", e.target.value)}
                          placeholder="Value (e.g. 1200 x 800 mm, 24V DC, 450 m...)"
                          className="w-full px-3 py-2 rounded-lg border border-line bg-white text-xs font-mono text-graphite focus:outline-hidden focus:border-royal shadow-2xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSpec(idx)}
                        title="Delete parameter"
                        className="p-2 rounded-lg text-stone hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0 self-end sm:self-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {/* Empty state or Add more button */}
                  {specifications.length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center space-y-2">
                      <SlidersHorizontal className="w-8 h-8 mx-auto text-slate-400" />
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-graphite uppercase">No Parameters Defined</p>
                        <p className="text-xs text-stone">
                          Add technical parameters manually or choose from quick suggestion chips above.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddSpecWithKey("")}
                        className="px-4 py-2 rounded-xl bg-royal text-white text-xs font-bold shadow-2xs hover:bg-royal/90 cursor-pointer inline-flex items-center gap-1.5 uppercase"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Parameter +</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAddSpecWithKey("")}
                      className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 hover:border-royal bg-slate-50/50 hover:bg-royal/5 text-xs font-bold text-royal flex items-center justify-center gap-1.5 transition cursor-pointer uppercase"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Parameter +</span>
                    </button>
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
                {/* Form Section 4: Commercial Information & Pricing */}
                <div className="rounded-2xl border border-line bg-white p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-graphite uppercase tracking-wider">
                      <FileBadge className="w-4 h-4 text-royal" />
                      <span>3. Commercial Information & RFQ Parameters</span>
                    </div>
                    {offeringType === "product" && (
                      <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        COMMERCIAL PRICING ENABLED
                      </span>
                    )}
                  </div>

                  {/* Dedicated Product Price Row */}
                  {offeringType === "product" && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-line/80 space-y-3">
                      <div className="text-xs font-bold text-graphite uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Product Pricing & Currency</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* 1. Price Amount */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-graphite uppercase tracking-wider flex items-center justify-between">
                            <span>Price / Unit Price</span>
                            <span className="text-[10px] text-stone font-normal">e.g. 250.00</span>
                          </label>
                          <input
                            type="text"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder="e.g. 250.00 or $250"
                            className="w-full px-3.5 py-2 rounded-xl border border-line bg-white text-xs font-semibold text-graphite focus:border-royal focus:ring-1 focus:ring-royal/20"
                          />
                        </div>

                        {/* 2. Currency */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-graphite uppercase tracking-wider">
                            Currency
                          </label>
                          <select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl border border-line bg-white text-xs font-mono font-bold text-graphite focus:border-royal"
                          >
                            <option value="USD">USD ($ - US Dollar)</option>
                            <option value="EUR">EUR (€ - Euro)</option>
                            <option value="TRY">TRY (₺ - Turkish Lira)</option>
                            <option value="GBP">GBP (£ - British Pound)</option>
                            <option value="AED">AED (د.إ - UAE Dirham)</option>
                            <option value="SGD">SGD (S$ - Singapore Dollar)</option>
                          </select>
                        </div>

                        {/* 3. Pricing Model */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-graphite uppercase tracking-wider">
                            Pricing Model
                          </label>
                          <select
                            value={pricingType}
                            onChange={(e) => setPricingType(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl border border-line bg-white text-xs font-bold text-graphite focus:border-royal"
                          >
                            <option value="FIXED">Fixed Price (Unit)</option>
                            <option value="STARTING_FROM">Starting From</option>
                            <option value="UPON_REQUEST">Upon Request / RFQ</option>
                            <option value="TIERED">Volume Tiered</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-graphite uppercase tracking-wider">
                        Pricing Guidance / RFQ Note
                      </label>
                      <input
                        type="text"
                        value={commercialInfo.pricingGuidance || ""}
                        onChange={(e) => setCommercialInfo({ ...commercialInfo, pricingGuidance: e.target.value })}
                        placeholder={offeringType === "product" ? "e.g. Volume discounts available on RFQ" : "e.g. Available upon commercial inquiry"}
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
                <div className="flex flex-wrap items-center justify-between font-mono text-xs font-bold text-graphite uppercase gap-2">
                  <span>Offering Visual Gallery ({mediaList.length})</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleImportDriveMedia}
                      className="text-[11px] font-mono text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
                      <span>Import from Google Drive</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => mediaFileInputRef.current?.click()}
                      className="text-[11px] font-mono text-royal bg-royal/5 hover:bg-royal/10 border border-royal/30 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Upload from Desktop</span>
                    </button>
                  </div>
                </div>

                {mediaList.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-line bg-slate-50 text-center space-y-3">
                    <FileImage className="w-10 h-10 mx-auto text-slate-400" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-graphite uppercase">No Media Assets Added Yet</p>
                      <p className="text-xs text-stone">
                        Upload equipment photos, CAD schematics, or datasheets from your desktop or Google Drive.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleImportDriveMedia}
                        className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold shadow-2xs hover:bg-amber-700 cursor-pointer flex items-center gap-1.5"
                      >
                        <FolderOpen className="w-4 h-4" />
                        <span>Import from Google Drive</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => mediaFileInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-royal text-white text-xs font-bold shadow-2xs hover:bg-royal/90 cursor-pointer flex items-center gap-1.5"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Browse Desktop Files</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {mediaList.map((item, idx) => {
                      const isPdf =
                        item.url?.toLowerCase().includes(".pdf") ||
                        item.url?.toLowerCase().endsWith(".pdf") ||
                        item.title?.toLowerCase().endsWith(".pdf") ||
                        item.type === "drawing";

                      return (
                        <div
                          key={item.id}
                          className={`group relative rounded-2xl border overflow-hidden bg-white shadow-xs transition-all flex flex-col justify-between ${
                            item.isCover
                              ? "border-royal ring-2 ring-royal/20"
                              : "border-line hover:border-slate-400"
                          }`}
                        >
                          {/* Image or PDF Canvas */}
                          {item.url?.toLowerCase().includes(".pdf") ? (
                            <div
                              onClick={() => setSelectedPreviewMedia(item)}
                              className="aspect-video relative bg-slate-900 overflow-hidden flex flex-col items-center justify-center p-4 text-center cursor-pointer group-hover:bg-slate-850 transition-colors"
                            >
                              <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-1.5 shadow-inner group-hover:scale-105 transition-transform">
                                <FileText className="w-5 h-5" />
                              </div>
                              <p className="text-xs font-bold text-white max-w-[90%] truncate">
                                {item.title || "PDF Blueprint / Schematic"}
                              </p>
                              <span className="text-[8.5px] font-mono text-rose-400 font-extrabold uppercase mt-1 tracking-wider bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/50">
                                PDF BLUEPRINT / SCHEMATIC
                              </span>

                              {/* Top Left Badge */}
                              <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
                                {item.isCover ? (
                                  <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-royal text-white uppercase tracking-wider shadow-sm">
                                    COVER ASSET
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-black/70 text-white uppercase tracking-wider">
                                    PDF DRAWING
                                  </span>
                                )}
                              </div>

                              {/* Top Right Action Icons */}
                              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  title="Open PDF in new tab"
                                  className="p-1.5 rounded-md bg-black/80 text-white hover:bg-black cursor-pointer transition"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPreviewMedia(item);
                                  }}
                                  title="Full Screen Preview"
                                  className="p-1.5 rounded-md bg-black/80 text-white hover:bg-black cursor-pointer transition"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveMedia(item.id);
                                  }}
                                  title="Remove Asset"
                                  className="p-1.5 rounded-md bg-black/80 text-rose-400 hover:text-rose-200 hover:bg-rose-950/80 cursor-pointer transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
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
                          )}

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
                                <option value="drawing">DRAWING / PDF</option>
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
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ========================================================= */}
              {/* SECTION 2: ATTACHED TECHNICAL DOCUMENTS & GROUNDING FILES */}
              {/* ========================================================= */}
              <div className="space-y-3 pt-6 border-t border-line">
                <div className="flex flex-wrap items-center justify-between font-mono text-xs font-bold text-graphite uppercase gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>Technical Documents & Grounding Files ({groundingSources.length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDriveBrowserMode("documents");
                        setIsDriveBrowserOpen(true);
                      }}
                      className="text-[11px] font-mono text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Add Docs from Drive</span>
                    </button>
                    <label className="text-[11px] font-mono text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition">
                      <Plus className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Upload Document</span>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.docx,.xlsx,.txt,.dwg,.cad"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleProcessDesktopFiles(e.target.files);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {groundingSources.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-line bg-slate-50 text-center space-y-2">
                    <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-graphite uppercase">No Technical Documents Attached</p>
                    <p className="text-xs text-stone">
                      Attach datasheets, manuals, or certificates to ground this offering with verified data.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {groundingSources.map((source) => (
                      <div
                        key={source.id}
                        className="p-3.5 rounded-2xl border border-line bg-white shadow-2xs flex items-center justify-between gap-3 hover:border-emerald-300 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-graphite truncate" title={source.filename}>
                              {source.title || source.filename}
                            </p>
                            <p className="text-[10px] font-mono text-stone">
                              {source.fileType} • {source.size} • {source.origin || "DIRECT UPLOAD"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {source.url && (
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                              title="Download / View"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setGroundingSources((prev) => prev.filter((s) => s.id !== source.id));
                              setSourceFilesList((prev) => prev.filter((f) => f.name !== source.filename));
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                            title="Remove Document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fullscreen Preview Lightbox Modal (Supports both Images and PDF Documents) */}
              {selectedPreviewMedia && (
                <div
                  onClick={() => setSelectedPreviewMedia(null)}
                  className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-4xl max-h-[90vh] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col"
                  >
                    <div className="p-3.5 bg-slate-900 flex items-center justify-between text-white border-b border-slate-800">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs font-bold text-royal uppercase px-2 py-0.5 rounded bg-royal/10 border border-royal/20">
                          {selectedPreviewMedia.type}
                        </span>
                        <span className="text-xs font-bold truncate">{selectedPreviewMedia.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={selectedPreviewMedia.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1.5 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open in New Tab</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => setSelectedPreviewMedia(null)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto flex flex-col items-center justify-center p-4 bg-slate-950 min-h-[60vh]">
                      {selectedPreviewMedia.url?.toLowerCase().includes(".pdf") ||
                      selectedPreviewMedia.type === "drawing" ? (
                        <div className="w-full flex-1 flex flex-col items-center justify-center space-y-3">
                          <iframe
                            src={getEmbeddableDocumentUrl(selectedPreviewMedia.url)}
                            title={selectedPreviewMedia.title || "PDF Document"}
                            className="w-full h-[65vh] rounded-xl border border-slate-800 bg-white"
                          />
                          <div className="flex items-center justify-between w-full px-2 text-xs text-slate-400">
                            <span>
                              {selectedPreviewMedia.url?.includes("drive.google.com")
                                ? "Google Drive Document Resource"
                                : "Direct Technical Document Resource"}
                            </span>
                            <a
                              href={selectedPreviewMedia.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-1.5 rounded-lg bg-royal text-white font-bold flex items-center gap-1.5 hover:bg-royal/90 transition shadow-2xs text-xs"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open / Download in Google Drive</span>
                            </a>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={formatMediaImageUrl(selectedPreviewMedia.url)}
                          alt={selectedPreviewMedia.title}
                          className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                        />
                      )}
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
                  {offeringOKFDoc && (
                    <button
                      type="button"
                      onClick={() => setIsOKFViewerOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 text-cyan-400 hover:bg-slate-800 text-xs font-bold transition shadow-2xs flex items-center gap-1.5 border border-cyan-500/30"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Inspect OKF (.okf.md)</span>
                    </button>
                  )}

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

      {isOKFViewerOpen && offeringOKFDoc && (
        <OKFDocumentViewerModal
          isOpen={isOKFViewerOpen}
          onClose={() => setIsOKFViewerOpen(false)}
          okfDoc={offeringOKFDoc}
        />
      )}

      {isDriveBrowserOpen && (
        <GoogleDriveBrowserModal
          isOpen={isDriveBrowserOpen}
          onClose={() => setIsDriveBrowserOpen(false)}
          onSelectFiles={handleDriveFilesSelected}
          multiSelect={true}
          mimeTypeFilter={driveBrowserMode}
        />
      )}
    </div>
  );
};
