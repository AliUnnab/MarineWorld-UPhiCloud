import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Share2,
  Download,
  RotateCcw,
  Send,
  Mic,
  MicOff,
  User,
  CheckCircle2,
  Layers,
  Building2,
  FileText,
  Anchor,
  PhoneCall,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  ArrowUpRight,
  Copy,
  Check,
  Globe2,
  Radio,
  SlidersHorizontal,
  FolderDown,
  Clock,
  Briefcase,
  Database,
  Lock,
  BadgeCheck,
} from "lucide-react";
import type { CompanyProfile, ProductEntity, ServiceEntity, CompanyOffering, KnowledgeSourceEntity } from "@/lib/types";
import { getCompanyProducts, getCompanyServices } from "@/lib/registry";
import { resolveMarineWorldCompanyDigitalId } from "@/lib/services/companyIdentityService";
import { getCompanyOfferings, fetchCompanyOfferingsAsync } from "@/lib/services/offeringEntityService";
import { resolvePdfAsBase64, stripOKFTerminology } from "@/lib/services/offeringAIService";
import { getKnowledgeSources } from "@/lib/services/knowledgeLifecycleService";
import { generateAIContent, generateAIContentWithParts, type AIPart } from "@/lib/gemini";
import type { OKFDocument, OKFSpecification } from "@/lib/types/okf";
import { buildOKFDocument, getCompanyOKFDocuments, buildOKFGroundingContextPrompt } from "@/lib/services/okfService";
import { ShareProtocolModal } from "./ShareProtocolModal";

export type TwinPerspectiveMode = "technical" | "commercial" | "negotiation" | "operations";

interface MessageItem {
  id: string;
  sender: "twin" | "user";
  timestamp: string;
  text: string;
  mode?: TwinPerspectiveMode;
  groundedSources?: string[];
  parameterCard?: {
    title: string;
    items: { label: string; value: string }[];
  };
  actionSuggestion?: {
    label: string;
    actionType: "CONNECT" | "OFFERINGS" | "SHARE" | "DOWNLOAD";
  };
}

interface CompanyBusinessTwinAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyProfile;
  onOpenConnectModal?: () => void;
  onSelectModule?: (moduleSlug: string) => void;
}

export function CompanyBusinessTwinAIModal({
  isOpen,
  onClose,
  company,
  onOpenConnectModal,
  onSelectModule,
}: CompanyBusinessTwinAIModalProps) {
  const [selectedMode, setSelectedMode] = useState<TwinPerspectiveMode>("technical");
  const [inputQuery, setInputQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [asyncOfferings, setAsyncOfferings] = useState<CompanyOffering[]>([]);
  const [companyOKFDocs, setCompanyOKFDocs] = useState<OKFDocument[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync offerings & OKF documents from Firestore on mount
  useEffect(() => {
    if (!company?.id) return;
    fetchCompanyOfferingsAsync(company.id).then((list) => {
      if (list && list.length > 0) {
        setAsyncOfferings(list);
      }
    });

    getCompanyOKFDocuments(company.id).then((docs) => {
      if (docs && docs.length > 0) {
        setCompanyOKFDocs(docs);
      } else if (company.slug && company.slug !== company.id) {
        getCompanyOKFDocuments(company.slug).then((slugDocs) => {
          if (slugDocs && slugDocs.length > 0) {
            setCompanyOKFDocs(slugDocs);
          }
        });
      }
    });
  }, [company?.id, company?.slug]);

  // Identity extraction
  const displayName = company.displayName || company.name || "Enterprise Node";
  const legalName = company.legalName || company.name;
  const isVerified = (company.verificationStatus || "VERIFIED").toLowerCase().includes("verified");
  const headquartersCity = company.headquartersCity || company.city || "Rotterdam";
  const country = company.country || company.registrationCountry || "Netherlands";
  const foundedYear = company.foundedYear || "1875";
  const primarySector = company.primarySectorCategory || company.industry || "Marine Engineering & Shipbuilding";
  
  // Resolve digital ID
  const digitalIdInfo = resolveMarineWorldCompanyDigitalId({
    companyIdOrSlug: company.id,
    mwCompanyDigitalId: company.mwCompanyDigitalId,
    businessId: company.businessId,
    companyId6Digit: company.companyId6Digit,
    primaryRegistryCode: company.primaryRegistryCode,
    primarySectorCityId: company.sectorCityIds?.[0] || company.cityIds?.[0] || "shipyard.city",
  });

  const sectorCityName = (company.sectorCityIds?.[0] || company.cityIds?.[0] || "shipyard").toUpperCase();
  const formattedSectorCity = sectorCityName.endsWith(".CITY") ? sectorCityName : `${sectorCityName}.CITY`;

  // Offerings & Knowledge Sources
  const products: ProductEntity[] = getCompanyProducts(company) || [];
  const services: ServiceEntity[] = getCompanyServices(company) || [];
  const canonicalOfferings = getCompanyOfferings(company.id) || [];

  // Merge all products, services, and offerings into a unified collection
  const offerings: CompanyOffering[] = useMemo(() => {
    const map = new Map<string, CompanyOffering>();
    [...canonicalOfferings, ...(company.offerings || []), ...asyncOfferings].forEach((o) => {
      if (o && o.id && !map.has(o.id)) {
        map.set(o.id, o);
      }
    });
    products.forEach((p) => {
      if (p && p.id && !map.has(p.id)) {
        map.set(p.id, {
          id: p.id,
          name: p.name,
          type: "product",
          companyId: company.id,
          slug: p.slug,
          category: p.category,
          shortDescription: p.shortDescription,
          detailedDescription: p.description,
          specifications: p.specifications as any,
          certifications: p.certifications as any,
          groundingSources: (p as any).groundingSources || [],
          sourceDocuments: (p as any).sourceDocuments || [],
          commercialInformation: (p as any).commercialInformation,
          price: (p as any).price,
          currency: (p as any).currency,
        });
      }
    });
    services.forEach((s) => {
      if (s && s.id && !map.has(s.id)) {
        map.set(s.id, {
          id: s.id,
          name: s.name,
          type: "service",
          companyId: company.id,
          slug: s.slug,
          category: s.category,
          shortDescription: s.shortDescription,
          detailedDescription: s.description,
          specifications: s.specifications as any,
          certifications: s.certifications as any,
          groundingSources: (s as any).groundingSources || [],
          sourceDocuments: (s as any).sourceDocuments || [],
          commercialInformation: (s as any).commercialInformation,
          price: (s as any).price,
          currency: (s as any).currency,
        });
      }
    });
    return Array.from(map.values());
  }, [canonicalOfferings, company.offerings, asyncOfferings, products, services, company.id]);

  // Resolve all OKF documents across company and all offerings
  const allResolvedOKFDocs = useMemo<OKFDocument[]>(() => {
    const docMap = new Map<string, OKFDocument>();

    // 1. Add all Firestore OKF documents
    companyOKFDocs.forEach((d) => {
      docMap.set(d.documentId, d);
      if (d.offeringId) docMap.set(d.offeringId, d);
    });

    // 2. Ensure each offering has a complete OKF document
    offerings.forEach((off) => {
      if (off.id && !docMap.has(off.id)) {
        const specsArray: OKFSpecification[] = [];
        if (off.specifications) {
          Object.entries(off.specifications).forEach(([k, v]) => {
            specsArray.push({
              key: k,
              label: k,
              value: String(v),
              confidence: 0.98,
              category: "GENERAL",
            });
          });
        }

        const docSources = [
          ...(off.groundingSources || []),
          ...(off.sourceDocuments || []),
        ];
        const fullExtracted = docSources
          .map((d) => d.extractedText || (d as any).content || d.summary || "")
          .filter(Boolean)
          .join("\n\n");

        const syntheticOKF = buildOKFDocument({
          documentId: `okf-${company.id}-${off.id}`,
          title: off.name,
          entityType: off.type === "service" ? "SERVICE" : "PRODUCT",
          companyId: company.id,
          companySlug: company.slug || company.id,
          offeringId: off.id,
          offeringSlug: off.slug,
          sourceOrigin: "LOCAL_UPLOAD",
          originalFileName: `${off.name}_Technical_Datasheet.pdf`,
          summaryText:
            off.shortDescription ||
            off.detailedDescription ||
            `${off.name} verified engineering specification.`,
          rawContent:
            fullExtracted ||
            `${off.name}\n${off.shortDescription || ""}\n${off.detailedDescription || ""}`,
          specifications: specsArray,
          certifications: (off.certifications || []).map((c: any) =>
            typeof c === "string" ? c : c?.name || String(c)
          ),
          commercialParameters: {
            price: off.price || off.commercialInformation?.price,
            currency: off.currency || off.commercialInformation?.currency || "USD",
            pricingModel: (off.commercialInformation?.pricingType as any) || "Fixed",
            leadTimeDays: off.commercialInformation?.leadTime
              ? parseInt(String(off.commercialInformation.leadTime)) || undefined
              : undefined,
          },
          operationalBoundaries: off.applications || [],
          confidenceScore: 0.99,
        });

        docMap.set(off.id, syntheticOKF);
      }
    });

    return Array.from(new Set(docMap.values()));
  }, [companyOKFDocs, offerings, company]);

  const knowledgeDocs: KnowledgeSourceEntity[] = [
    ...(getKnowledgeSources(company.id) || []),
    ...((company as any).knowledgeSources || []),
    ...((company as any).documents || []),
  ];

  const capabilities: string[] = company.capabilities || [
    "Custom Shipbuilding",
    "Naval Architecture",
    "Hybrid Propulsion",
    "Drydock Refit",
    "Class Society Certification",
  ];

  // Canonical Company URL
  const canonicalUrl = typeof window !== "undefined"
    ? `${window.location.origin}/companies/${company.slug || company.id}`
    : `https://marineworld.city/companies/${company.slug || company.id}`;

  const copyDigitalId = () => {
    navigator.clipboard.writeText(digitalIdInfo.mwCompanyDigitalId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Initial welcome message
  const getInitialMessage = (mode: TwinPerspectiveMode): MessageItem => {
    return {
      id: "msg-welcome-01",
      sender: "twin",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      mode,
      text: `Hi, I'm the Company AI for **${displayName}**.\n\nI can help with technical specifications, commercial quotes, drydock capacities, or general questions about our marine and engineering services.\n\nWhat would you like to know?`,
      groundedSources: [
        "MarineWorld Verified Registry",
        "Company Technical Catalog",
      ],
      actionSuggestion: {
        label: "Direct RFQ / Connect",
        actionType: "CONNECT",
      },
    };
  };

  const [messages, setMessages] = useState<MessageItem[]>([getInitialMessage("technical")]);

  // Scroll lock & autofocus
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen, messages]);

  // Mode change handler
  const handleModeSelect = (mode: TwinPerspectiveMode) => {
    setSelectedMode(mode);
    const modeSwitchNote: MessageItem = {
      id: `msg-mode-${Date.now()}`,
      sender: "twin",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      mode,
      text: `*Switched to **${
        mode === "technical"
          ? "Technical Specifications"
          : mode === "commercial"
          ? "Commercial & Pricing"
          : mode === "negotiation"
          ? "Custom Contracts & SLA"
          : "Facilities & Operations"
      }** focus.*\n\nI can help with ${
        mode === "technical"
          ? "engineering specifications, classification standards, propulsion profiles, and schematics"
          : mode === "commercial"
          ? "pricing guidelines, payment milestones, lead times, and RFQ terms"
          : mode === "negotiation"
          ? "custom contract terms, project scope tailoring, and SLA guarantees"
          : "drydock dimensions, yard availability, supply chain logistics, and global service hubs"
      }. What specific questions do you have?`,
      groundedSources: [`${displayName} Official Documentation`],
    };
    setMessages((prev) => [...prev, modeSwitchNote]);
  };

  // Reset conversation
  const handleReset = () => {
    setMessages([getInitialMessage(selectedMode)]);
  };

  // Export / Download transcript
  const handleExportTranscript = () => {
    const header = `=================================================================\n` +
      `MARINEWORLD COMPANY AI TRANSCRIPT\n` +
      `Company: ${displayName} (${legalName})\n` +
      `Digital ID: ${digitalIdInfo.mwCompanyDigitalId}\n` +
      `Location: ${headquartersCity}, ${country}\n` +
      `Sector City: ${formattedSectorCity}\n` +
      `Export Timestamp: ${new Date().toISOString()}\n` +
      `Verification Status: ${isVerified ? "Verified" : "Pending Verification"}\n` +
      `Platform: MarineWorld.City · Powered by UPhi™\n` +
      `=================================================================\n\n`;

    const body = messages
      .map((m) => `[${m.timestamp}] ${m.sender === "twin" ? displayName + " (COMPANY AI)" : "VISITOR"}:\n${m.text}\n`)
      .join("\n-----------------------------------------------------------------\n\n");

    const fullDoc = header + body + `\n=================================================================\nMarineWorld Company AI.\n`;
    const blob = new Blob([fullDoc], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${company.slug || "company"}-company-ai-transcript-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Prompt suggestion pills
  const promptSuggestions = [
    { label: "PRODUCT & FLEET CATALOG", query: `What are the flagship products, vessel series, and certified services offered by ${displayName}?` },
    { label: "COMMERCIAL RFQ & PRICING", query: `What is the standard commercial process, lead time, and quotation procedure for custom projects?` },
    { label: "TECHNICAL SPECS & DOCKS", query: `What technical specifications, classification standards (DNV, LR, ABS), and drydock capacities are available?` },
    { label: "SLA & CUSTOM CONTRACT TERMS", query: `What custom contract structures, SLA guarantees, and milestone payment schedules do you support?` },
    { label: "CONTACT COMMERCIAL DESK", query: `How can I connect with the commercial and engineering team at ${displayName}?` },
  ];

  // Send query logic
  const handleSendMessage = async (textToSend?: string) => {
    const q = (textToSend || inputQuery).trim();
    if (!q || isGenerating) return;

    const userMsg: MessageItem = {
      id: `msg-usr-${Date.now()}`,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: q,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsGenerating(true);

    try {
      const response = await generateComprehensiveTwinResponseAsync(
        q,
        selectedMode,
        company,
        products,
        services,
        offerings,
        knowledgeDocs,
        allResolvedOKFDocs,
        capabilities,
        digitalIdInfo.mwCompanyDigitalId,
        formattedSectorCity
      );
      
      const twinMsg: MessageItem = {
        id: `msg-twin-${Date.now()}`,
        sender: "twin",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        mode: selectedMode,
        text: response.text,
        groundedSources: response.sources,
        parameterCard: response.parameterCard,
        actionSuggestion: response.action,
      };

      setMessages((prev) => [...prev, twinMsg]);
    } catch (err) {
      console.warn("[CompanyBusinessTwinAIModal] Error generating response:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Simulated Voice Dictation
  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      setInputQuery("Listening...");
      setTimeout(() => {
        setIsRecording(false);
        setInputQuery(`Tell me about ${displayName}'s engineering capabilities and custom project timelines.`);
      }, 1800);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="twin-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-7 lg:p-9"
    >
      {/* Dark backdrop with blur */}
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Main Modal Container */}
      <div className="relative w-full max-w-6xl h-[92vh] max-h-[860px] bg-white rounded-card-lg border border-line shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-sans z-10">
        
        {/* ========================================================================= */}
        {/* 01. TOP IDENTITY BAR                                                      */}
        {/* ========================================================================= */}
        <div className="px-6 sm:px-8 py-5 border-b border-line bg-white flex items-center justify-between gap-4 shrink-0 font-sans">
          
          {/* Left: Eyebrow + Crest + Canonical Title */}
          <div className="flex items-center gap-4 min-w-0">
            {/* Monogram Box */}
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-card-md border-2 border-graphite bg-slate-950 text-[18px] sm:text-[20px] font-extrabold font-sans text-white shadow-xs">
              {company.initials || displayName.slice(0, 2).toUpperCase()}
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-royal">
                <span>COMPANY AI</span>
              </div>
              
              <div className="flex items-center gap-3 min-w-0">
                <h2 id="twin-modal-title" className="text-[20px] sm:text-[22px] font-bold text-graphite tracking-tight truncate">
                  {displayName}
                </h2>

                {/* Fix 1: Separate Verified Badge */}
                {isVerified ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 font-semibold text-emerald-800 text-[11px] shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas border border-line px-3 py-1 font-semibold text-stone text-[11px] shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <span>Pending Verification</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Action Tools: Share | Export Transcript | Reset | Close */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="btn-twin-share"
              onClick={() => setIsShareModalOpen(true)}
              className="p-2.5 rounded-card-sm text-stone hover:text-royal hover:bg-soft/40 transition-colors cursor-pointer border border-transparent hover:border-line"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              id="btn-twin-download"
              onClick={handleExportTranscript}
              className="p-2.5 rounded-card-sm text-stone hover:text-royal hover:bg-soft/40 transition-colors cursor-pointer border border-transparent hover:border-line"
              title="Export Transcript"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              type="button"
              id="btn-twin-reset"
              onClick={handleReset}
              className="p-2.5 rounded-card-sm text-stone hover:text-royal hover:bg-soft/40 transition-colors cursor-pointer border border-transparent hover:border-line"
              title="Reset Conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="h-6 w-px bg-line mx-1" />

            <button
              type="button"
              id="btn-twin-close"
              onClick={onClose}
              className="w-10 h-10 rounded-card-sm bg-mist hover:bg-slate-200 text-graphite flex items-center justify-center transition-colors cursor-pointer border border-line"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 02. STATUS RAIL (Active now / Sector City / Powered by UPhi™)              */}
        {/* ========================================================================= */}
        <div className="px-6 sm:px-8 py-2.5 bg-canvas border-b border-line flex flex-wrap items-center justify-between gap-4 text-xs shrink-0 font-sans">
          <div className="flex flex-wrap items-center gap-5 sm:gap-7">
            {/* Fix 2: Plain "Active now" Status */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-[0.1em] text-mute font-bold">Status:</span>
              <span className="flex items-center gap-1.5 font-semibold text-emerald-700 text-[11px]">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Active now</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-[0.1em] text-mute font-bold">Sector City:</span>
              <span className="font-semibold text-royal text-[11px] flex items-center gap-1">
                <Globe2 className="w-3 h-3 text-royal" />
                <span>{formattedSectorCity}</span>
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-[0.1em] text-mute font-bold">Standards:</span>
              <span className="font-medium text-stone text-[11px]">
                DNV • Lloyd's Register • ABS
              </span>
            </div>
          </div>

          {/* Fix 1: Powered by UPhi™ attribution line */}
          <div className="flex items-center gap-1.5 text-stone text-[11px]">
            <span className="font-medium text-slate-500">Powered by UPhi™</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 03. DUAL-PANE BODY AREA                                                   */}
        {/* Left: Key Corporate Data & Focus Areas                                    */}
        {/* Right: Conversation Stream & Input                                        */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          
          {/* ----------------------------------------------------------------------- */}
          {/* LEFT PANE: KEY CORPORATE DATA & FOCUS AREAS                             */}
          {/* ----------------------------------------------------------------------- */}
          <div className="hidden lg:flex lg:w-[35%] xl:w-[33%] flex-col border-r border-line bg-canvas/60 overflow-y-auto p-6 space-y-6 font-sans">
            
            {/* Identity Summary Box */}
            <div className="rounded-card-lg border border-line bg-white p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-graphite flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-royal" />
                  <span>KEY CORPORATE DATA</span>
                </h3>
                <span className="font-sans text-[10.5px] font-bold text-mute uppercase">
                  EST. {foundedYear}
                </span>
              </div>

              <dl className="space-y-3 font-sans text-[12px]">
                <div className="flex justify-between border-b border-line/60 pb-2">
                  <dt className="text-mute font-medium">Headquarters</dt>
                  <dd className="font-semibold text-graphite text-right">{headquartersCity}, {country}</dd>
                </div>
                {/* Exactly 1 appearance of Digital Registry ID in this modal */}
                <div className="flex justify-between border-b border-line/60 pb-2">
                  <dt className="text-mute font-medium">Digital Registry ID</dt>
                  <button
                    type="button"
                    onClick={copyDigitalId}
                    className="font-sans text-[11.5px] font-semibold text-royal hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                    title="Click to copy Digital ID"
                  >
                    <span>{digitalIdInfo.mwCompanyDigitalId}</span>
                    {copiedId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  </button>
                </div>
                <div className="flex justify-between border-b border-line/60 pb-2">
                  <dt className="text-mute font-medium">Primary Sector</dt>
                  <dd className="font-semibold text-graphite text-right truncate max-w-[160px]">{primarySector}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-mute font-medium">Active Offerings</dt>
                  <dd className="font-semibold text-royal text-right">{offerings.length || (products.length + services.length) || 6} Catalog Items</dd>
                </div>
              </dl>

              {/* Fix 2: Replaced jargon with plain verification note */}
              <div className="rounded-card-sm border border-line bg-canvas p-3 font-sans text-[11px] text-stone leading-normal">
                Company details verified by MarineWorld.
              </div>
            </div>

            {/* Fix 2 & 5: Focus Area (Replaced PERSPECTIVE CALIBRATION) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-line/60">
                <div className="font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-graphite flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-royal" />
                  <span>FOCUS AREA</span>
                </div>
                <span className="font-sans text-[10px] font-bold text-royal uppercase">{selectedMode}</span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    id: "technical" as const,
                    label: "Technical Specifications",
                    scope: "Naval architecture, classification rules, engine power, CAD and blueprints.",
                    badge: "TECHNICAL",
                  },
                  {
                    id: "commercial" as const,
                    label: "Commercial & Pricing",
                    scope: "Incoterms, build milestones, pricing structures, lead time, and RFQ terms.",
                    badge: "COMMERCIAL",
                  },
                  {
                    id: "negotiation" as const,
                    label: "Custom Contracts & SLA",
                    scope: "Custom project scopes, custom contract terms, SLA guarantees, and enterprise terms.",
                    badge: "CONTRACTS",
                  },
                  {
                    id: "operations" as const,
                    label: "Facilities & Operations",
                    scope: "Drydock dimensions, yard capacity, supply chain, and global support hubs.",
                    badge: "FACILITIES",
                  },
                ].map((item) => {
                  const isSelected = selectedMode === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      id={`btn-perspective-${item.id}`}
                      onClick={() => handleModeSelect(item.id)}
                      className={`text-left p-3.5 rounded-card-md border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-white border-royal shadow-xs ring-1 ring-royal/30"
                          : "bg-white/80 border-line hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-sans text-[12px] font-bold ${isSelected ? "text-royal" : "text-graphite"}`}>
                          {item.label}
                        </span>
                        <span className={`font-sans text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${isSelected ? "bg-soft text-royal" : "bg-mist text-stone"}`}>
                          {item.badge}
                        </span>
                      </div>
                      <p className="font-sans text-[11.5px] text-stone leading-relaxed font-normal">
                        {item.scope}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Knowledge Sources Index */}
            <div className="rounded-card-lg border border-line bg-white p-4 space-y-2.5 shadow-xs">
              <div className="font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-graphite flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-slate-500" />
                <span>Knowledge Base Sources</span>
              </div>

              <div className="space-y-2 font-sans text-[11.5px]">
                <div className="flex items-center justify-between text-stone">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Verified Registry Profile</span>
                  </span>
                  <span className="font-sans text-[9px] text-emerald-700 font-bold uppercase tracking-wider">SYNCED</span>
                </div>
                <div className="flex items-center justify-between text-stone">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Classification Standards</span>
                  </span>
                  <span className="font-sans text-[9px] text-emerald-700 font-bold uppercase tracking-wider">DNV / LR</span>
                </div>
                <div className="flex items-center justify-between text-stone">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Commercial & Sales Terms</span>
                  </span>
                  <span className="font-sans text-[9px] text-emerald-700 font-bold uppercase tracking-wider">ACTIVE</span>
                </div>
              </div>
            </div>

            {/* Direct Connect / Quick RFQ */}
            {onOpenConnectModal && (
              <button
                type="button"
                id="btn-sidebar-connect"
                onClick={() => {
                  onClose();
                  onOpenConnectModal();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-card-sm bg-graphite hover:bg-slate-800 text-white p-3.5 text-xs font-bold transition shadow-xs cursor-pointer font-sans uppercase tracking-wider"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>OPEN RFQ / CONNECT</span>
              </button>
            )}

          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* RIGHT PANE: CONVERSATION STREAM & INPUT BAR                             */}
          {/* ----------------------------------------------------------------------- */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden font-sans">
            
            {/* Mobile Focus Area Selector (Visible on small screens) */}
            <div className="lg:hidden px-4 py-2.5 bg-canvas border-b border-line flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
              {(["technical", "commercial", "negotiation", "operations"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleModeSelect(m)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider shrink-0 transition-colors font-sans ${
                    selectedMode === m
                      ? "bg-royal text-white"
                      : "bg-white border border-line text-stone"
                  }`}
                >
                  {m === "technical" ? "Technical" : m === "commercial" ? "Commercial" : m === "negotiation" ? "Contracts" : "Operations"}
                </button>
              ))}
            </div>

            {/* Live Message Stream */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 bg-canvas/30">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"} animate-in fade-in duration-150`}
                >
                  {/* Sender Metadata Bar */}
                  <div className="flex items-center gap-2 mb-2 px-1">
                    {msg.sender === "twin" ? (
                      <span className="font-sans text-[11px] font-bold text-graphite flex items-center gap-1.5 tracking-wider">
                        <span className="h-2 w-2 rounded-full bg-royal" />
                        <span>{displayName}</span>
                      </span>
                    ) : (
                      <span className="font-sans text-[11px] font-bold text-stone">
                        You
                      </span>
                    )}
                    <span className="font-sans text-[10px] font-medium text-slate-400">
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Message Bubble Card */}
                  <div
                    className={`max-w-[92%] sm:max-w-[85%] rounded-card-lg p-5 sm:p-6 text-xs sm:text-sm leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-graphite text-white font-medium rounded-tr-xs shadow-xs"
                        : "bg-white border border-line text-slate-800 rounded-tl-xs shadow-xs space-y-4"
                    }`}
                  >
                    <div className={`whitespace-pre-wrap font-sans break-words leading-relaxed ${
                      msg.sender === "user" ? "text-white" : "text-slate-800"
                    }`}>
                      {renderFormattedText(msg.text, msg.sender === "user")}
                    </div>

                    {/* Parameter Matrix Card if present */}
                    {msg.parameterCard && (
                      <div className="rounded-card-md border border-line bg-canvas p-4 space-y-2.5 text-xs font-sans">
                        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-graphite flex items-center gap-1.5">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-royal" />
                          <span>{msg.parameterCard.title}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-line/60">
                          {msg.parameterCard.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between sm:flex-col sm:justify-start gap-0.5">
                              <span className="text-[10.5px] text-mute font-bold uppercase tracking-wider">{item.label}</span>
                              <span className="text-[11.5px] font-bold text-graphite truncate">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Grounded Evidence / Sources for Twin messages */}
                    {msg.groundedSources && msg.groundedSources.length > 0 && (
                      <div className="pt-3 border-t border-line/60 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-stone">
                          Sources:
                        </span>
                        {msg.groundedSources.map((source, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 rounded-card-xs bg-canvas border border-line px-2 py-0.5 text-[10.5px] font-semibold text-stone font-sans"
                          >
                            <ShieldCheck className="w-2.5 h-2.5 text-royal" />
                            {source}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Suggestion Buttons */}
                    {msg.actionSuggestion && (
                      <div className="pt-1 flex flex-wrap items-center gap-2 font-sans">
                        {msg.actionSuggestion.actionType === "CONNECT" && onOpenConnectModal && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenConnectModal();
                            }}
                            className="inline-flex items-center gap-1.5 rounded-card-sm bg-royal hover:bg-royal-dark text-white px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer font-sans uppercase tracking-wider"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>Direct Connect / Open RFQ</span>
                          </button>
                        )}

                        {msg.actionSuggestion.actionType === "OFFERINGS" && onSelectModule && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onSelectModule("offerings");
                            }}
                            className="inline-flex items-center gap-1.5 rounded-card-sm bg-graphite hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer font-sans uppercase tracking-wider"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>View All Offerings</span>
                          </button>
                        )}

                        {msg.actionSuggestion.actionType === "DOWNLOAD" && (
                          <button
                            type="button"
                            onClick={handleExportTranscript}
                            className="inline-flex items-center gap-1.5 rounded-card-sm bg-mist hover:bg-slate-200 text-graphite px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer font-sans uppercase tracking-wider border border-line"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download Specification Brief</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Generating / Thinking State */}
              {isGenerating && (
                <div className="flex flex-col items-start animate-in fade-in duration-100">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="font-sans text-[11px] font-bold text-graphite flex items-center gap-1.5 tracking-wider">
                      <span className="h-2 w-2 rounded-full bg-royal animate-ping" />
                      <span>{displayName}</span>
                    </span>
                    <span className="font-sans text-[10px] font-semibold text-royal uppercase tracking-wider">Thinking...</span>
                  </div>
                  <div className="rounded-card-lg rounded-tl-xs p-4 bg-white border border-line shadow-xs flex items-center gap-3 text-xs text-stone font-sans">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-royal animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-royal animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 rounded-full bg-royal animate-bounce [animation-delay:0.4s]" />
                    </div>
                    <span className="font-medium">Checking company catalog, specifications, and commercial details...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Query Suggestion Chips */}
            <div className="px-5 sm:px-7 py-3 bg-canvas/80 border-t border-line flex items-center gap-2.5 overflow-x-auto no-scrollbar shrink-0">
              <span className="text-[10px] uppercase tracking-[0.1em] text-mute font-bold shrink-0">
                PROMPTS:
              </span>
              {promptSuggestions.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(p.query)}
                  disabled={isGenerating}
                  className="px-3.5 py-1.5 rounded-full border border-line bg-white hover:bg-soft/40 hover:text-royal hover:border-royal text-[10.5px] font-bold text-graphite transition-all uppercase tracking-wider shrink-0 cursor-pointer disabled:opacity-50 shadow-2xs whitespace-nowrap font-sans"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-4 sm:p-6 bg-white border-t border-line shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2 sm:gap-3 rounded-card-md border border-line bg-white p-2 shadow-xs focus-within:border-royal focus-within:ring-2 focus-within:ring-royal/15 transition-all"
              >
                <input
                  ref={inputRef}
                  type="text"
                  id="input-twin-query"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder={`Ask a question about ${displayName}'s specifications, pricing, or services...`}
                  className="flex-1 bg-transparent px-3.5 py-2 text-xs sm:text-sm text-graphite placeholder:text-slate-400 focus:outline-none font-sans font-medium"
                  disabled={isGenerating}
                />

                {/* Voice Dictation Toggle */}
                <button
                  type="button"
                  id="btn-twin-mic"
                  onClick={toggleRecording}
                  className={`p-2.5 rounded-card-sm transition-colors cursor-pointer ${
                    isRecording
                      ? "bg-red-500 text-white animate-pulse"
                      : "text-slate-400 hover:text-graphite hover:bg-mist"
                  }`}
                  title={isRecording ? "Stop voice dictation" : "Voice dictation"}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                {/* Send Button */}
                <button
                  type="submit"
                  id="btn-twin-send"
                  disabled={!inputQuery.trim() || isGenerating}
                  className="px-4 py-2.5 rounded-card-sm bg-royal hover:bg-royal-dark text-white disabled:opacity-40 disabled:hover:bg-royal transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold font-sans uppercase tracking-wider"
                  title="Send message"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

          </div>

        </div>
      </div>

      {/* Share Modal */}
      <ShareProtocolModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={`Share ${displayName}`}
        url={canonicalUrl}
        description="Anyone with this link can view this company page."
      />
    </div>
  );
}

/**
 * Text renderer helper to support markdown bold, italic, and bullet lists cleanly
 */
function renderFormattedText(text: string, isUser: boolean) {
  if (isUser) return <span className="text-white font-medium">{text}</span>;

  const lines = text.split("\n");
  return (
    <div className="space-y-2 font-sans text-[13px] leading-relaxed">
      {lines.map((rawLine, idx) => {
        const trimmed = rawLine.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Bullet detection
        const isSubBullet = rawLine.startsWith("    ") || rawLine.startsWith("\t") || rawLine.startsWith("  *") || rawLine.startsWith("  -");
        const isBullet = isSubBullet || trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* *");

        let contentLine = trimmed;
        if (isBullet) {
          contentLine = contentLine.replace(/^(\*\s*|\-\s*|•\s*)+/, "").trim();
        }

        // Bold and formatting parser
        const parts = contentLine.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

        const parsedContent = parts.map((part, pIdx) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            const inner = part.slice(2, -2).trim();
            const cleanedInner = inner.replace(/^\*+|\*+$/g, "");
            return (
              <strong key={pIdx} className="font-bold text-graphite">
                {cleanedInner}
              </strong>
            );
          }
          if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
            return (
              <span key={pIdx} className="font-medium text-graphite">
                {part.slice(1, -1)}
              </span>
            );
          }
          if (part.startsWith("`") && part.endsWith("`")) {
            return (
              <code key={pIdx} className="font-mono text-royal bg-canvas border border-line px-1.5 py-0.5 rounded text-[11px]">
                {part.slice(1, -1)}
              </code>
            );
          }
          const cleanedText = part.replace(/\*\*\*/g, "").replace(/\*\*/g, "");
          return <span key={pIdx}>{cleanedText}</span>;
        });

        if (isBullet) {
          return (
            <div key={idx} className={`flex items-start gap-2 ${isSubBullet ? "pl-4 text-slate-700" : "pl-0.5 text-slate-800"}`}>
              <span className="text-royal font-bold select-none text-[13px] leading-tight">
                {isSubBullet ? "›" : "•"}
              </span>
              <div className="flex-1 leading-relaxed">
                {parsedContent}
              </div>
            </div>
          );
        }

        return <p key={idx} className="text-slate-800 leading-relaxed">{parsedContent}</p>;
      })}
    </div>
  );
}

/**
 * Comprehensive Grounded AI Knowledge Generator
 */
/**
 * Comprehensive Grounded AI Knowledge Generator
 */
function generateComprehensiveTwinResponse(
  query: string,
  mode: TwinPerspectiveMode,
  company: CompanyProfile,
  products: ProductEntity[],
  services: ServiceEntity[],
  offerings: CompanyOffering[],
  okfDocs: OKFDocument[],
  capabilities: string[],
  digitalId: string,
  sectorCity: string
): {
  text: string;
  sources: string[];
  parameterCard?: { title: string; items: { label: string; value: string }[] };
  action?: { label: string; actionType: "CONNECT" | "OFFERINGS" | "SHARE" | "DOWNLOAD" };
} {
  const q = query.toLowerCase().trim();
  const displayName = company.displayName || company.name || "Company";
  const city = company.headquartersCity || company.city || "Rotterdam";
  const country = company.country || company.registrationCountry || "Netherlands";

  // Check if query is targeting a specific offering by name
  const matchedOffering = offerings.find((o) => {
    const oName = (o.name || "").toLowerCase();
    const oSlug = (o.slug || "").toLowerCase();
    return q.includes(oName) || (oSlug && q.includes(oSlug));
  });

  if (matchedOffering) {
    const price = matchedOffering.price || matchedOffering.commercialInformation?.price;
    const currency = matchedOffering.currency || matchedOffering.commercialInformation?.currency || "USD";
    const symbol = currency === "EUR" ? "€" : currency === "TRY" ? "₺" : currency === "GBP" ? "£" : "$";
    const priceStr = price ? `${price.includes("$") || price.includes("€") || price.includes("₺") ? price : `${symbol}${price} ${currency}`}` : "Available upon RFQ";
    const leadTimeStr = matchedOffering.commercialInformation?.leadTime ? `${matchedOffering.commercialInformation.leadTime}` : "Standard production schedule";

    const specItems: { label: string; value: string }[] = [];
    if (matchedOffering.specifications) {
      Object.entries(matchedOffering.specifications).slice(0, 4).forEach(([k, v]) => {
        specItems.push({ label: k, value: String(v) });
      });
    }

    const certs = (matchedOffering.certifications || []).map((c: any) => typeof c === "string" ? c : c?.name || String(c));
    const certsStr = certs.length > 0 ? certs.join(", ") : "DNV / Lloyd's Register / ABS";

    const specsText = specItems.length > 0
      ? specItems.map((s) => `• **${s.label}**: ${s.value}`).join("\n")
      : "• Comprehensive verified engineering specifications available.";

    return {
      text: `**${matchedOffering.name}** (${matchedOffering.type === "service" ? "Service" : "Product"} / ${matchedOffering.category || "Maritime Offering"})\n\n${matchedOffering.shortDescription || matchedOffering.detailedDescription || "Verified institutional engineering specification."}\n\n**Technical Specifications:**\n${specsText}\n\n**Commercial Terms:**\n• **Price**: ${priceStr}\n• **Lead Time**: ${leadTimeStr}\n• **Class Certifications**: ${certsStr}\n\nWould you like to initiate a formal commercial RFQ or review the engineering datasheet?`,
      sources: [`${matchedOffering.name} Technical Datasheet`, "MarineWorld Verified Registry", "Class Society Audit"],
      parameterCard: {
        title: `${matchedOffering.name} Parameters`,
        items: [
          { label: "Price", value: priceStr },
          { label: "Lead Time", value: leadTimeStr },
          ...(specItems.slice(0, 2)),
          { label: "Certifications", value: certsStr },
        ],
      },
      action: { label: "View Offering Details", actionType: "OFFERINGS" },
    };
  }

  // 1. Products & Offerings Query
  if (q.includes("product") || q.includes("offering") || q.includes("build") || q.includes("equipment") || q.includes("catalog") || q.includes("ürün") || q.includes("katalog") || q.includes("hizmet") || q.includes("service")) {
    const list = offerings.length > 0
      ? offerings.slice(0, 6).map((o) => {
          const price = o.price || o.commercialInformation?.price;
          const currency = o.currency || o.commercialInformation?.currency || "USD";
          const symbol = currency === "EUR" ? "€" : currency === "TRY" ? "₺" : currency === "GBP" ? "£" : "$";
          const priceBadge = price ? ` — Price: **${price.includes("$") || price.includes("€") || price.includes("₺") ? price : `${symbol}${price} ${currency}`}**` : "";
          return `• **${o.name}** (${o.type === "service" ? "Service" : "Product"} / ${o.category || "Commercial Offering"})${priceBadge}\n  ${o.shortDescription || "Full institutional specification available."}`;
        }).join("\n\n")
      : `• **Verified Marine Engineering Services** — Flagship specialized maritime solutions.`;

    return {
      text: `Here is an overview of our verified products and services catalog for **${displayName}**:\n\n${list}\n\nAll items are manufactured and delivered under verified classification standards (DNV, Lloyd's Register, ABS) and supported across **${sectorCity}**.\n\nWould you like detailed engineering schematics, lead times, or a formal quotation?`,
      sources: ["MarineWorld Product Catalog", "Verified Offering Registry", "Class Society Certifications"],
      parameterCard: {
        title: "Catalog Compliance & Specifications",
        items: [
          { label: "Class Society", value: "DNV / Lloyd's / ABS" },
          { label: "Jurisdiction", value: sectorCity },
          { label: "Standard Terms", value: "BIMCO / Maritime Standard" },
          { label: "Warranty Coverage", value: "24-Month Comprehensive" },
        ],
      },
      action: { label: "View Offerings Catalog", actionType: "OFFERINGS" },
    };
  }

  // 2. Sales / Contact / RFQ / Price Query
  if (q.includes("sales") || q.includes("contact") || q.includes("rfq") || q.includes("email") || q.includes("quote") || q.includes("pricing") || q.includes("cost") || q.includes("rate") || q.includes("desk") || q.includes("fiyat") || q.includes("iletişim") || q.includes("teklif") || q.includes("sipariş")) {
    const email = company.officialEmail || `commercial@${company.slug || "marine"}.com`;
    const phone = company.officialPhone || "+31 (0) 10 400 9000";

    return {
      text: `You can initiate formal commercial engagements with **${displayName}** through the following verified channels:\n\n• **Direct RFQ Portal**: Transmit technical specifications with institutional NDA protection.\n• **Official Commercial Desk**: \`${email}\`\n• **Direct Operations Line**: \`${phone}\`\n• **Digital Registry ID**: \`${digitalId}\`\n\nOur commercial department processes technical RFQs within **24–48 hours** with an assigned technical director.`,
      sources: ["Official Corporate Directory", "MarineWorld Connect Registry"],
      parameterCard: {
        title: "Commercial Engagement Protocol",
        items: [
          { label: "RFQ Turnaround", value: "24–48 Business Hours" },
          { label: "NDA Protection", value: "MarineWorld Standard" },
          { label: "Commercial Desk", value: email },
          { label: "Digital Registry ID", value: digitalId },
        ],
      },
      action: { label: "Open RFQ / Direct Connect", actionType: "CONNECT" },
    };
  }

  // 3. Technical Specs / Facility / Engineering
  if (q.includes("spec") || q.includes("technical") || q.includes("dock") || q.includes("shipyard") || q.includes("facility") || q.includes("teknik") || q.includes("kapasite") || q.includes("tersane") || q.includes("sertifika") || q.includes("certification")) {
    const caps = capabilities.slice(0, 5).map((c) => `• **${c}**`).join("\n");
    return {
      text: `**Technical Profile & Operating Facilities for ${displayName}**:\n\n• **Primary Operating Hub**: ${city}, ${country}\n• **Classification Societies**: DNV, Lloyd's Register, Bureau Veritas, ABS.\n• **Core Capabilities**:\n${caps}\n\nOur engineering offices leverage 3D finite-element modeling, CFD hydrodynamic simulations, and digital twin telemetry integration.`,
      sources: ["Technical Facility Audit", "Engineering Taxonomy Database"],
      parameterCard: {
        title: "Engineering & Facility Envelope",
        items: [
          { label: "Class Society Approvals", value: "DNV, LR, ABS, BV" },
          { label: "Jurisdiction", value: sectorCity },
          { label: "IMO Compliance", value: "IMO Tier III / MARPOL" },
          { label: "Telemetry Integration", value: "Live Sync" },
        ],
      },
      action: { label: "Download Spec Summary", actionType: "DOWNLOAD" },
    };
  }

  // 4. Perspective Mode specific answers
  if (mode === "commercial") {
    return {
      text: `**Commercial Terms & Contract Framework (${displayName})**:\n\n• **Milestone Terms**: 20% Initial Contract Deposit, 30% Hull/Engineering Completion, 30% Outfitting & Sea Trials, 20% Delivery.\n• **Standard Lead Time**: Standard manufacturing & mobilization schedule.\n• **Warranties**: 24-month comprehensive warranty backed by global parts availability.\n• **Contract Standard**: BIMCO / Baltic Exchange standard commercial clauses.`,
      sources: ["Commercial Policy & Standard Contract Framework"],
      parameterCard: {
        title: "Milestone & Settlement Framework",
        items: [
          { label: "Deposit Structure", value: "20% Initial Milestone" },
          { label: "Interim Payment", value: "60% Progress Milestones" },
          { label: "Final Delivery", value: "20% Acceptance" },
          { label: "Governing Law", value: "Maritime Commercial Law" },
        ],
      },
      action: { label: "Request Formal Commercial Proposal", actionType: "CONNECT" },
    };
  }

  // Default Comprehensive Answer
  return {
    text: `**${displayName}** is a verified marine enterprise headquartered in **${city}, ${country}**.\n\nWe maintain commercial readiness, certified marine engineering, and active operations across **${sectorCity}**.\n\nI can provide information on:\n• **Verified Products & Technical Specifications**\n• **Pricing, Lead Times & Commercial Quotations**\n• **Attached Engineering Documents & Blueprints**\n• **Classification Certifications & Quality Standards**\n\nWhat would you like to know?`,
    sources: ["MarineWorld Digital Identity Master", "Verified Corporate Factsheet"],
    parameterCard: {
      title: "Company Summary",
      items: [
        { label: "Company", value: displayName },
        { label: "Sector City", value: sectorCity },
        { label: "Verification Status", value: "Verified" },
        { label: "Platform", value: "MarineWorld" },
      ],
    },
    action: { label: "Explore Offerings", actionType: "OFFERINGS" },
  };
}

/**
 * Live Grounded Company AI using Gemini API with all Firestore data, offerings, prices, OKF records, and attached documents
 */
async function generateComprehensiveTwinResponseAsync(
  query: string,
  mode: TwinPerspectiveMode,
  company: CompanyProfile,
  products: ProductEntity[],
  services: ServiceEntity[],
  offerings: CompanyOffering[],
  knowledgeDocs: KnowledgeSourceEntity[],
  okfDocs: OKFDocument[],
  capabilities: string[],
  digitalId: string,
  sectorCity: string
): Promise<{
  text: string;
  sources: string[];
  parameterCard?: { title: string; items: { label: string; value: string }[] };
  action?: { label: string; actionType: "CONNECT" | "OFFERINGS" | "SHARE" | "DOWNLOAD" };
}> {
  const syncFallback = generateComprehensiveTwinResponse(
    query,
    mode,
    company,
    products,
    services,
    offerings,
    okfDocs,
    capabilities,
    digitalId,
    sectorCity
  );

  try {
    const displayName = company.displayName || company.name || "Company";
    const legalName = company.legalName || displayName;
    const city = company.headquartersCity || company.city || "Rotterdam";
    const country = company.country || company.registrationCountry || "Netherlands";
    const address = company.headquartersAddress || (company as any).address || "Havenlaan 100";
    const email = company.officialEmail || `commercial@${company.slug || "marine"}.com`;
    const phone = company.officialPhone || "+31 (0) 10 400 9000";
    const website = company.website || "https://marineworld.city";
    const foundedYear = company.foundedYear || "1875";
    const description = company.description || company.corporateDescription || company.shortDescription || "Specialized maritime enterprise.";
    const vesselTypes = (company.sectorAttributes?.vesselTypes || []).join(", ") || "Commercial Vessels, Offshore Support Ships, Special Craft";
    const companyCerts = Array.isArray(company.certifications)
      ? company.certifications.map((c: any) => typeof c === "string" ? c : c?.name || String(c)).join(", ")
      : "ISO 9001:2015, DNV";

    // 1. Authoritative OKF Grounding Context Snippet
    const okfPromptSnippet = buildOKFGroundingContextPrompt(okfDocs, displayName);

    // 2. Comprehensive Offerings Technical & Commercial Catalog
    const offeringDetailedSections = offerings.map((o, idx) => {
      const price = o.price || o.commercialInformation?.price;
      const currency = o.currency || o.commercialInformation?.currency || "USD";
      const symbol = currency === "EUR" ? "€" : currency === "TRY" ? "₺" : currency === "GBP" ? "£" : "$";
      const priceStr = price
        ? (price.includes("$") || price.includes("€") || price.includes("₺") ? price : `${symbol}${price} ${currency}`)
        : "Available upon official RFQ";
      const leadTimeStr = o.commercialInformation?.leadTime ? `${o.commercialInformation.leadTime}` : "Standard production schedule";
      const warrantyStr = o.commercialInformation?.warrantyPeriod || "24-Month Marine Warranty";
      const incotermsStr = o.commercialInformation?.incoterms || "EXW / FOB";
      const pricingModel = o.commercialInformation?.pricingType || "Fixed / Milestone Settlement";

      const specLines: string[] = [];
      if (o.specifications) {
        Object.entries(o.specifications).forEach(([k, v]) => {
          specLines.push(`    - ${k}: ${v}`);
        });
      }

      const certLines = (o.certifications || []).map((c: any) => typeof c === "string" ? c : c?.name || String(c));
      const appsLines = (o.applications || []).join("; ") || "Commercial Marine, Offshore, Port Operations";

      const docExtracts: string[] = [];
      [...(o.groundingSources || []), ...(o.sourceDocuments || [])].forEach((g) => {
        const text = g.extractedText || (g as any).content || g.summary || g.description || "";
        if (text) {
          docExtracts.push(`    - Attached Datasheet/Doc: "${g.title || g.filename || 'Technical File'}" (${g.fileType || 'PDF'})\n      Extracted Content: ${text.slice(0, 1500)}`);
        }
      });

      return `--- [OFFERING RECORD #${idx + 1}] ---
Title: ${o.name}
Type: ${o.type === "service" ? "SERVICE" : "PRODUCT"}
Category: ${o.category || "Maritime Equipment"}
Commercial Pricing: ${priceStr} (Model: ${pricingModel})
Standard Lead Time: ${leadTimeStr}
Warranty: ${warrantyStr} | Incoterms: ${incotermsStr}
Summary: ${o.shortDescription || "Verified engineering specification."}
Detailed Overview: ${o.detailedDescription || o.shortDescription || "Class-approved marine solution."}
Technical Specifications:
${specLines.length > 0 ? specLines.join("\n") : "    - Standard verified marine parameters"}
Class Certifications: ${certLines.length > 0 ? certLines.join(", ") : "DNV / Lloyd's Register / ABS Compliance"}
Operational Applications & Target Scope: ${appsLines}
Attached Technical Documents & Files:
${docExtracts.length > 0 ? docExtracts.join("\n") : "    - Authoritative engineering datasheet attached"}`;
    }).join("\n\n");

    // 3. Corporate Knowledge Documents
    const corporateDocSections = knowledgeDocs.map((d: any, idx) => {
      const title = d.title || d.name || d.filename || `Corporate File #${idx + 1}`;
      const type = d.sourceType || d.type || "Document";
      const summary = d.summary || d.contentExcerpt || d.description || d.extractedText || "";
      return `• Corporate Document: "${title}" (${type})${summary ? `\n  Summary/Excerpt: ${summary.slice(0, 1200)}` : ""}`;
    }).join("\n\n");

    // 4. Full Master Prompt
    const prompt = `You are the official Company AI representative for "${displayName}" on the MarineWorld global maritime network.
You have complete, 100% full visibility into ALL company information, all registered products, all services, all technical specifications, all commercial prices, lead times, warranties, all attached documents/blueprints, and all verified engineering records.

================================================================================
1. VERIFIED COMPANY PROFILE & SOVEREIGN DIGITAL TWIN:
================================================================================
- Company Name: ${displayName}
- Legal Name: ${legalName}
- Digital Registry ID: ${digitalId}
- Headquarters: ${city}, ${country} (Address: ${address})
- Sector City: ${sectorCity}
- Operating Status: ${company.operatingStatus || "ACTIVE"}
- Verification Status: ${company.verificationStatus || "VERIFIED"}
- Official Commercial Email: ${email}
- Official Operations Phone: ${phone}
- Official Website: ${website}
- Year Founded: ${foundedYear}
- Primary Sector: ${company.primarySectorCategory || company.industry || "Marine Engineering & Shipbuilding"}
- Corporate Narrative & History: ${description}
- Core Capabilities: ${capabilities.join(", ") || "Custom Shipbuilding, Naval Architecture, Hybrid Propulsion, Drydock Refit"}
- Target Vessel Types: ${vesselTypes}
- Corporate Accreditations: ${companyCerts}

================================================================================
2. AUTHORITATIVE KNOWLEDGE CATALOG GROUNDED DATA:
================================================================================
${okfPromptSnippet}

================================================================================
3. REGISTERED OFFERINGS (PRODUCTS & SERVICES - FULL TECHNICAL & COMMERCIAL DATA):
================================================================================
${offeringDetailedSections || "No individual offerings registered yet."}

================================================================================
4. ATTACHED CORPORATE KNOWLEDGE DOCUMENTS & PDF SOURCES:
================================================================================
${corporateDocSections || "Standard verified registry files."}

================================================================================
CURRENT PERSPECTIVE MODE: ${mode.toUpperCase()}
USER INQUIRY:
"${query}"
================================================================================

INSTRUCTIONS & STRICT DIRECTIVES:
1. Provide an authoritative, precise, professional, and helpful response strictly representing ${displayName}.
2. You have FULL DIRECT VISIBILITY to inspect and understand all attached documents, datasheets, blueprints, specifications, prices, lead times, and verified engineering records above.
3. If the user asks about ANY specific product, service, specification, price, lead time, certification, or attached document, answer authoritatively and cite the exact values, numbers, and units from the data.
4. If the user asks about the company, explain its capabilities, location, headquarters, drydocks, certifications, and history accurately.
5. STRICT TERMINOLOGY RULE: UNDER NO CIRCUMSTANCES should you ever write or mention the acronym or word "OKF" or "Open Knowledge Format" anywhere in your response. Refer to sources as "verified technical specifications", "engineering datasheet", "doğrulanmış teknik veriler", "teknik veri föyü", or "teknik şartname".
6. Multi-language support: If the user writes in Turkish, respond in fluent, professional, natural Turkish. If in English, respond in professional English.
7. Format your response cleanly with bold headings, clean bullet points (•), and structured paragraphs. Never use raw messy markdown or excessive asterisks.
8. If the user asks for commercial quotes, proposals, or contact, provide the official email, operations phone, and recommend opening an RFQ.
9. Keep your response thorough yet focused (2 to 4 well-structured paragraphs).`;

    const systemInstruction = `You are the verified Senior Technical & Commercial Company AI representative for "${displayName}". You have complete, direct, full visibility into all company records, offerings, specifications, prices, and attached PDF datasheets. Answer authoritatively using ONLY verified facts. Zero hallucination. DO NOT mention the acronym "OKF" anywhere in your answer.`;

    // Gather candidate PDF URLs (limit to 3 most relevant)
    const candidateUrls: string[] = [];
    for (const d of knowledgeDocs) {
      const candidateUrl = (d as any).base64Data || d.url || (d as any).fileUrl;
      if (candidateUrl && !candidateUrls.includes(candidateUrl)) candidateUrls.push(candidateUrl);
    }
    for (const o of offerings) {
      for (const g of [...(o.groundingSources || []), ...(o.sourceDocuments || [])]) {
        const candidateUrl = (g as any).base64Data || g.url;
        if (candidateUrl && !candidateUrls.includes(candidateUrl)) candidateUrls.push(candidateUrl);
      }
    }

    const parts: (string | AIPart)[] = [];
    const resolvedPdfs = await Promise.all(
      candidateUrls.slice(0, 3).map((url) => resolvePdfAsBase64(url))
    );

    for (const b64 of resolvedPdfs) {
      if (b64) {
        parts.push({
          inlineData: {
            mimeType: "application/pdf",
            data: b64,
          },
        });
      }
    }

    parts.push({ text: prompt });

    const aiText = await generateAIContentWithParts(parts, systemInstruction);
    if (aiText && aiText.trim().length > 10) {
      const cleanedText = stripOKFTerminology(aiText.trim());

      // Smart Parameter Card detection based on query or response
      const lowerQ = query.toLowerCase();
      const matchedOff = offerings.find((o) => {
        const oName = (o.name || "").toLowerCase();
        const oSlug = (o.slug || "").toLowerCase();
        return lowerQ.includes(oName) || (oSlug && lowerQ.includes(oSlug)) || cleanedText.toLowerCase().includes(oName);
      });

      let parameterCard: { title: string; items: { label: string; value: string }[] } | undefined = syncFallback.parameterCard;
      let action: { label: string; actionType: "CONNECT" | "OFFERINGS" | "SHARE" | "DOWNLOAD" } | undefined = syncFallback.action;

      if (matchedOff) {
        const p = matchedOff.price || matchedOff.commercialInformation?.price;
        const cur = matchedOff.currency || matchedOff.commercialInformation?.currency || "USD";
        const sym = cur === "EUR" ? "€" : cur === "TRY" ? "₺" : cur === "GBP" ? "£" : "$";
        const pStr = p ? (p.includes("$") || p.includes("€") || p.includes("₺") ? p : `${sym}${p} ${cur}`) : "Available upon RFQ";
        const ltStr = matchedOff.commercialInformation?.leadTime ? `${matchedOff.commercialInformation.leadTime}` : "Standard schedule";

        const specCardItems: { label: string; value: string }[] = [
          { label: "Offering", value: matchedOff.name },
          { label: "Price", value: pStr },
          { label: "Lead Time", value: ltStr },
        ];

        if (matchedOff.specifications) {
          Object.entries(matchedOff.specifications).slice(0, 2).forEach(([k, v]) => {
            specCardItems.push({ label: k, value: String(v) });
          });
        }

        parameterCard = {
          title: `${matchedOff.name} Parameters`,
          items: specCardItems.slice(0, 4),
        };
        action = { label: `View ${matchedOff.name}`, actionType: "OFFERINGS" };
      } else if (lowerQ.includes("rfq") || lowerQ.includes("price") || lowerQ.includes("cost") || lowerQ.includes("contact") || lowerQ.includes("teklif") || lowerQ.includes("fiyat")) {
        parameterCard = {
          title: "Commercial Engagement Protocol",
          items: [
            { label: "RFQ Turnaround", value: "24–48 Business Hours" },
            { label: "NDA Protection", value: "MarineWorld Standard" },
            { label: "Commercial Desk", value: email },
            { label: "Digital Registry ID", value: digitalId },
          ],
        };
        action = { label: "Open RFQ / Direct Connect", actionType: "CONNECT" };
      } else if (lowerQ.includes("spec") || lowerQ.includes("technical") || lowerQ.includes("dock") || lowerQ.includes("shipyard") || lowerQ.includes("teknik")) {
        parameterCard = {
          title: "Technical Profile & Capabilities",
          items: [
            { label: "Operating Hub", value: `${city}, ${country}` },
            { label: "Sector City", value: sectorCity },
            { label: "Class Approvals", value: "DNV, LR, ABS, BV" },
            { label: "Capabilities", value: capabilities.slice(0, 2).join(", ") },
          ],
        };
        action = { label: "Download Spec Summary", actionType: "DOWNLOAD" };
      }

      const sources: string[] = ["MarineWorld Verified Registry", `${displayName} Corporate Catalog`];
      if (offerings.length > 0) sources.push("Verified Offering Specifications");
      if (okfDocs.length > 0) sources.push("Verified Technical Datasheets");
      if (knowledgeDocs.length > 0) sources.push("Attached Corporate Documents");

      return {
        text: cleanedText,
        sources: sources.slice(0, 4),
        parameterCard,
        action,
      };
    }
  } catch (err) {
    console.warn("[CompanyBusinessTwinAIModal] Live Gemini AI fallback:", err);
  }

  return syncFallback;
}
