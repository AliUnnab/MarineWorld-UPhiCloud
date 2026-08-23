import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Share2,
  Download,
  RotateCcw,
  Send,
  Handshake,
  CheckCircle2,
  Layers,
  Building2,
  FileText,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  FileBadge,
  SlidersHorizontal,
  Image as ImageIcon,
  FolderDown,
  Globe2,
  Check,
  Bookmark,
  MessageSquare,
  Play,
  Copy,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Eye,
  FileCode,
  Info,
  Clock,
  Anchor,
  Award,
  Truck,
  Compass,
  Zap,
  Gauge,
  Tag,
  ArrowUpRight,
} from "lucide-react";
import type { CompanyOffering, CompanyProfile } from "@/lib/types";
import { getCompanyProducts, getCompanyServices } from "@/lib/registry";
import { ShareProtocolModal } from "./ShareProtocolModal";
import { CommercialInquiryModal } from "./CommercialInquiryModal";
import { answerOfferingAdvisorQuery } from "@/lib/services/offeringAIService";
import { initializeCanonicalOfferingDefaults } from "@/lib/services/offeringEntityService";

export type ModalTab = "overview" | "media" | "downloads" | "company";

/**
 * Maps attribute labels to semantic icons consistent with the platform standard
 */
function getAttributeIcon(label: string): React.ComponentType<{ className?: string }> {
  const l = label.toLowerCase();
  if (
    l.includes("lead") ||
    l.includes("time") ||
    l.includes("schedule") ||
    l.includes("turnaround") ||
    l.includes("availability") ||
    l.includes("dispatch")
  ) {
    return Clock;
  }
  if (
    l.includes("scope") ||
    l.includes("vessel") ||
    l.includes("anchor") ||
    l.includes("marine") ||
    l.includes("drydock") ||
    l.includes("berth") ||
    l.includes("hull")
  ) {
    return Anchor;
  }
  if (
    l.includes("class") ||
    l.includes("compliance") ||
    l.includes("cert") ||
    l.includes("standard") ||
    l.includes("approval") ||
    l.includes("quality") ||
    l.includes("audit") ||
    l.includes("society")
  ) {
    return Award;
  }
  if (
    l.includes("delivery") ||
    l.includes("incoterm") ||
    l.includes("logistics") ||
    l.includes("shipping") ||
    l.includes("freight") ||
    l.includes("transport") ||
    l.includes("basis")
  ) {
    return Truck;
  }
  if (
    l.includes("application") ||
    l.includes("domain") ||
    l.includes("suitability") ||
    l.includes("sector") ||
    l.includes("category")
  ) {
    return Compass;
  }
  if (
    l.includes("power") ||
    l.includes("electric") ||
    l.includes("voltage") ||
    l.includes("energy") ||
    l.includes("current") ||
    l.includes("output") ||
    l.includes("kw") ||
    l.includes("hp")
  ) {
    return Zap;
  }
  if (
    l.includes("dimension") ||
    l.includes("capacity") ||
    l.includes("weight") ||
    l.includes("pressure") ||
    l.includes("speed") ||
    l.includes("gauge") ||
    l.includes("rating") ||
    l.includes("tolerance") ||
    l.includes("load") ||
    l.includes("size") ||
    l.includes("thrust") ||
    l.includes("diameter") ||
    l.includes("length")
  ) {
    return Gauge;
  }
  return Tag;
}

export interface MediaItem {
  id: string;
  type: "photo" | "technical_drawing" | "video";
  typeLabel: "Photo" | "Technical Drawing" | "Video";
  title: string;
  url: string;
  badgeTag: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "advisor";
  timestamp: string;
  text: string;
  detailedNotes?: string;
  outputTag?: string;
  isOfferSealed?: boolean;
  offerDetails?: {
    referenceCode: string;
    issuingEntity: string;
    incotermsRules?: string;
    jurisdiction: string;
    milestonePricing: string;
    leadTime?: string;
    warranty?: string;
  };
  sources?: string[];
  actionSuggestion?: {
    label: string;
    type: "DOWNLOAD_PDF" | "RFQ" | "SPECS" | "AVAILABILITY";
  };
}

interface ProductExperienceModalProps {
  offering: CompanyOffering;
  company: CompanyProfile;
  onClose: () => void;
  allOfferings?: CompanyOffering[];
  onOpenConnectModal?: (itemRef?: string) => void;
  onSelectOffering?: (offering: CompanyOffering) => void;
}

export function ProductExperienceModal({
  offering: initialOffering,
  company,
  onClose,
  allOfferings: providedOfferings,
  onOpenConnectModal,
  onSelectOffering,
}: ProductExperienceModalProps) {
  // Consolidate full catalogue of offerings for bottom browse strip
  const allOfferings = useMemo(() => {
    if (providedOfferings && providedOfferings.length > 0) {
      return providedOfferings.map((o) => initializeCanonicalOfferingDefaults(o, company));
    }
    const list: CompanyOffering[] = [];
    if (company.offerings && company.offerings.length > 0) {
      list.push(...company.offerings.map((o) => initializeCanonicalOfferingDefaults(o, company)));
    }
    const prods = getCompanyProducts(company);
    if (prods && prods.length > 0) {
      prods.forEach((p, idx) => {
        if (!list.some((item) => item.id === p.id || item.name === p.name)) {
          const offItem: CompanyOffering = {
            id: p.id || `${company.id}-prod-${idx}`,
            slug: p.slug,
            companyId: company.id,
            companySlug: p.companySlug || company.slug || company.id,
            name: p.name,
            type: "product",
            canonicalUrl: p.canonicalUrl,
            category: p.category || "Marine Propulsion & Systems",
            shortDescription: p.shortDescription || p.description || "Certified marine engineering equipment.",
            status: (p.availability as any) || "AVAILABLE",
            code: p.productCode || `PROP-${p.id.slice(0, 4).toUpperCase()}-${idx + 100}`,
            specifications: p.specifications as any,
          };
          list.push(initializeCanonicalOfferingDefaults(offItem, company));
        }
      });
    }
    const servs = getCompanyServices(company);
    if (servs && servs.length > 0) {
      servs.forEach((s, idx) => {
        if (!list.some((item) => item.id === s.id || item.name === s.name)) {
          const offItem: CompanyOffering = {
            id: s.id || `${company.id}-serv-${idx}`,
            slug: s.slug,
            companyId: company.id,
            companySlug: s.companySlug || company.slug || company.id,
            name: s.name,
            type: "service",
            canonicalUrl: s.canonicalUrl,
            category: s.category || "Naval Engineering & Drydock",
            shortDescription: s.shortDescription || s.description || "Comprehensive lifecycle marine operations.",
            status: "ACTIVE",
            code: `SRV-${company.id.slice(0, 3).toUpperCase()}-${idx + 200}`,
            specifications: (s as any).specifications,
          };
          list.push(initializeCanonicalOfferingDefaults(offItem, company));
        }
      });
    }
    if (list.length === 0) {
      list.push(initializeCanonicalOfferingDefaults(initialOffering, company));
    }
    return list;
  }, [company, providedOfferings, initialOffering]);

  // Active offering state
  const [activeOfferingRaw, setActiveOfferingRaw] = useState<CompanyOffering>(initialOffering);
  const [activeTab, setActiveTab] = useState<ModalTab>("overview");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [inquiryModalMode, setInquiryModalMode] = useState<"INQUIRY" | "OFFICIAL_OFFER">("INQUIRY");
  const [advisorInput, setAdvisorInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [showFullSpecs, setShowFullSpecs] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  // Focus trap refs
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const lightboxContainerRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Chat conversation state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Direct canonical entity resolution
  const activeOffering = useMemo(() => {
    return initializeCanonicalOfferingDefaults(activeOfferingRaw, company);
  }, [activeOfferingRaw, company]);

  const isService = activeOffering.type === "service";

  // Company identity variables
  const displayName = company.displayName || company.name || "Enterprise Shipyard";
  const logoSrc = company.logoUrl || (company as any).logo || null;
  const [logoError, setLogoError] = useState(false);
  const rawCityId = (Array.isArray(company.sectorCityIds) && company.sectorCityIds[0]) || 
                    (Array.isArray(company.cityIds) && company.cityIds[0]) || 
                    "brokerage";
  const primarySectorCityId = typeof rawCityId === "string" ? rawCityId : "brokerage";
  const sectorCityLabel = primarySectorCityId.toLowerCase().endsWith(".city")
    ? primarySectorCityId.toUpperCase()
    : `${primarySectorCityId.toUpperCase()}.CITY`;

  const offeringCode = activeOffering.code || `REF-${activeOffering.id.slice(-6).toUpperCase()}`;
  const isVerified = String(company.verificationStatus || "VERIFIED").toLowerCase().includes("verified");

  // Multi-item Media Gallery Generation
  const primaryCoverImg = (activeOffering as any).coverImage || (activeOffering as any).primaryImage;

  const mediaGallery: MediaItem[] = useMemo(() => {
    const items: MediaItem[] = [];

    // Check custom media arrays
    const customMedia = (activeOffering as any).media || (activeOffering as any).gallery;
    if (Array.isArray(customMedia) && customMedia.length > 0) {
      customMedia.forEach((m: any, idx: number) => {
        const type: "photo" | "technical_drawing" | "video" =
          m.type === "video" ? "video" : m.type === "drawing" || m.type === "technical_drawing" ? "technical_drawing" : "photo";
        const typeLabel = type === "video" ? "Video" : type === "technical_drawing" ? "Technical Drawing" : "Photo";
        items.push({
          id: m.id || `m-${idx}`,
          type,
          typeLabel,
          title: m.title || m.caption || `${activeOffering.name} Media ${idx + 1}`,
          url: m.url || m.src || "",
          badgeTag: m.tag || typeLabel.toUpperCase(),
        });
      });
    }

    if (primaryCoverImg && !items.some((i) => i.url === primaryCoverImg)) {
      items.unshift({
        id: "primary-photo",
        type: "photo",
        typeLabel: "Photo",
        title: isService ? `${activeOffering.name} — Operating Facility` : `${activeOffering.name} — High-Resolution Equipment Photo`,
        url: primaryCoverImg,
        badgeTag: "PRIMARY PHOTO",
      });
    }

    // Default rich media set if list is short
    if (items.length < 4) {
      if (isService) {
        if (!items.some((i) => i.id === "serv-photo-1")) {
          items.push({
            id: "serv-photo-1",
            type: "photo",
            typeLabel: "Photo",
            title: "Shipyard & Deepwater Berth Operations",
            url: "https://images.unsplash.com/photo-1586528116311-ad8ed7c50a92?auto=format&fit=crop&w=1200&q=80",
            badgeTag: "FACILITY PHOTO",
          });
        }
        if (!items.some((i) => i.type === "technical_drawing")) {
          items.push({
            id: "serv-drawing-1",
            type: "technical_drawing",
            typeLabel: "Technical Drawing",
            title: "Drydock General Arrangement & Cradle Clearance Plan",
            url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
            badgeTag: "GA & BERTH PLAN",
          });
        }
        if (!items.some((i) => i.id === "serv-photo-2")) {
          items.push({
            id: "serv-photo-2",
            type: "photo",
            typeLabel: "Photo",
            title: "Class Survey Telemetry & Inspection Rig",
            url: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80",
            badgeTag: "OPERATIONAL PHOTO",
          });
        }
        if (!items.some((i) => i.type === "video")) {
          items.push({
            id: "serv-video-1",
            type: "video",
            typeLabel: "Video",
            title: "Sea-Trial Operational Execution & Field Demo (4K)",
            url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
            badgeTag: "OPERATIONAL VIDEO",
          });
        }
      } else {
        if (!items.some((i) => i.id === "prod-photo-1")) {
          items.push({
            id: "prod-photo-1",
            type: "photo",
            typeLabel: "Photo",
            title: `${activeOffering.name} — Full System Assembly`,
            url: primaryCoverImg || "https://images.unsplash.com/photo-1586528116311-ad8ed7c50a92?auto=format&fit=crop&w=1200&q=80",
            badgeTag: "PRODUCT PHOTO",
          });
        }
        if (!items.some((i) => i.type === "technical_drawing")) {
          items.push({
            id: "prod-drawing-1",
            type: "technical_drawing",
            typeLabel: "Technical Drawing",
            title: "2D/3D CAD Blueprint & Mounting Dimension Envelope",
            url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
            badgeTag: "CAD BLUEPRINT",
          });
        }
        if (!items.some((i) => i.id === "prod-photo-2")) {
          items.push({
            id: "prod-photo-2",
            type: "photo",
            typeLabel: "Photo",
            title: "Shipyard Rigging & Test Bench Setup",
            url: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1200&q=80",
            badgeTag: "INSTALLATION PHOTO",
          });
        }
        if (!items.some((i) => i.type === "video")) {
          items.push({
            id: "prod-video-1",
            type: "video",
            typeLabel: "Video",
            title: "Hydrodynamic Propulsion Test & Torque Telemetry Video",
            url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
            badgeTag: "TESTING VIDEO",
          });
        }
      }
    }

    return items;
  }, [activeOffering, isService, primaryCoverImg]);

  // Fix 1: Helper to locate the first media item with non-empty URL and not failed
  const getFirstValidMediaIndex = (items: MediaItem[], failed: Record<string, boolean>) => {
    if (!items || items.length === 0) return 0;
    const idx = items.findIndex((m) => Boolean(m.url && m.url.trim() && !failed[m.url]));
    return idx !== -1 ? idx : 0;
  };

  // Sync if initialOffering prop changes externally
  useEffect(() => {
    setActiveOfferingRaw(initialOffering);
    setChatMessages([]);
    setShowFullSpecs(false);
    setExpandedNotes({});
  }, [initialOffering]);

  // Reset chat & select default valid media item when switching offering
  useEffect(() => {
    setChatMessages([]);
    setShowFullSpecs(false);
    setExpandedNotes({});
    const initialValidIdx = getFirstValidMediaIndex(mediaGallery, failedImages);
    setActiveMediaIndex(initialValidIdx);
  }, [activeOffering.id, mediaGallery]);

  const handleImageError = (url: string) => {
    setFailedImages((prev) => {
      const updated = { ...prev, [url]: true };
      setActiveMediaIndex((currentIdx) => {
        if (mediaGallery[currentIdx]?.url === url) {
          return getFirstValidMediaIndex(mediaGallery, updated);
        }
        return currentIdx;
      });
      setLightboxIndex((currentIdx) => {
        if (mediaGallery[currentIdx]?.url === url) {
          return getFirstValidMediaIndex(mediaGallery, updated);
        }
        return currentIdx;
      });
      return updated;
    });
  };

  // Open Lightbox handler with real content preference
  const handleOpenLightbox = (indexToOpen?: number) => {
    const targetIdx = typeof indexToOpen === "number" ? indexToOpen : activeMediaIndex;
    const item = mediaGallery[targetIdx];
    if (item && item.url && !failedImages[item.url]) {
      setLightboxIndex(targetIdx);
    } else {
      setLightboxIndex(getFirstValidMediaIndex(mediaGallery, failedImages));
    }
    setIsLightboxOpen(true);
  };

  // Focus Trap and Keyboard Navigation for Modal & Lightbox
  useEffect(() => {
    previousActiveElementRef.current = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";

    // Auto focus close button or first focusable control
    const focusTimeout = setTimeout(() => {
      const firstFocusable = modalContainerRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if (e.key === "Escape") {
        e.preventDefault();
        if (isLightboxOpen) {
          setIsLightboxOpen(false);
        } else {
          onClose();
        }
        return;
      }

      if (e.key === "Tab") {
        const activeContainer = isLightboxOpen ? lightboxContainerRef.current : modalContainerRef.current;
        if (!activeContainer) return;

        const focusableElements = activeContainer.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const focusable = Array.from(focusableElements).filter(
          (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement
        );

        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || !activeContainer.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement || !activeContainer.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
        return;
      }

      if (!isInput && e.key === "ArrowLeft") {
        e.preventDefault();
        if (isLightboxOpen) {
          setLightboxIndex((prev) => (prev - 1 + mediaGallery.length) % mediaGallery.length);
        } else {
          setActiveMediaIndex((prev) => (prev - 1 + mediaGallery.length) % mediaGallery.length);
        }
      } else if (!isInput && e.key === "ArrowRight") {
        e.preventDefault();
        if (isLightboxOpen) {
          setLightboxIndex((prev) => (prev + 1) % mediaGallery.length);
        } else {
          setActiveMediaIndex((prev) => (prev + 1) % mediaGallery.length);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(focusTimeout);
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleKeyDown);
      previousActiveElementRef.current?.focus();
    };
  }, [isLightboxOpen, mediaGallery.length, onClose]);

  // Derive Key Specifications
  const keySpecs = useMemo(() => {
    const specs = activeOffering.specifications || {};
    const entries = Object.entries(specs);
    
    if (entries.length > 0) {
      return entries.slice(0, 4).map(([k, v]) => ({ label: k, value: String(v) }));
    }

    if (isService) {
      return [
        { label: "SERVICE SCOPE", value: activeOffering.category || "Comprehensive Engineering" },
        { label: "STANDARD LEAD TIME", value: activeOffering.commercialInformation?.leadTime || "Immediate Dispatch" },
        { label: "CLASS COMPLIANCE", value: (activeOffering.certifications && activeOffering.certifications[0]) || "DNV / Lloyd's Approved" },
        { label: "DELIVERY BASIS", value: activeOffering.commercialInformation?.incoterms || "Global Port / Shipyard Gate" },
      ];
    }

    return [
      { label: "PRIMARY APPLICATION", value: (activeOffering.applications && activeOffering.applications[0]) || activeOffering.category || "Commercial Marine" },
      { label: "LEAD TIME", value: activeOffering.commercialInformation?.leadTime || "12–16 Weeks Standard" },
      { label: "CLASS SOCIETY", value: (activeOffering.certifications && activeOffering.certifications[0]) || "DNV • Lloyd's Register • ABS" },
      { label: "INCOTERMS", value: activeOffering.commercialInformation?.incoterms || "EXW / FOB Shipyard Gate" },
    ];
  }, [activeOffering, isService]);

  const allSpecEntries = useMemo(() => {
    return Object.entries(activeOffering.specifications || {});
  }, [activeOffering]);

  // Certified Engineering Documents
  const downloadDocs = useMemo(() => {
    return [
      {
        id: "doc-1",
        title: `${activeOffering.name} — Certified Technical Datasheet`,
        type: "PDF SPEC",
        size: "4.8 MB",
        badge: "VERIFIED",
        code: `DS-${offeringCode}`,
      },
      {
        id: "doc-2",
        title: `DNV & Lloyd's Register Type Approval Certificate`,
        type: "CLASS CERT",
        size: "2.1 MB",
        badge: "AUDITED",
        code: `CERT-LR-${offeringCode}`,
      },
      {
        id: "doc-3",
        title: `3D STEP CAD Blueprint & Spatial Envelope`,
        type: "CAD / STEP",
        size: "18.4 MB",
        badge: "3D ASSET",
        code: `CAD-${offeringCode}`,
      },
      {
        id: "doc-4",
        title: `Standard Incoterms EXW/FOB Milestone Billing Agreement`,
        type: "LEGAL SPEC",
        size: "1.3 MB",
        badge: "BIMCO COMPLIANT",
        code: `B2B-TERMS-${offeringCode}`,
      },
    ];
  }, [activeOffering, offeringCode]);

  // Scroll chat
  useEffect(() => {
    if (chatMessages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isGenerating]);

  // Send message to AI Advisor
  const handleSendMessage = (textToSend?: string) => {
    const q = (textToSend || advisorInput).trim();
    if (!q || isGenerating) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: q,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setAdvisorInput("");
    setIsGenerating(true);

    setTimeout(() => {
      const response = generateAdvisorAnswer(q, activeOffering, displayName);
      
      const isSealed = q.toLowerCase().includes("official offer") || q.toLowerCase().includes("commercial offer") || q.toLowerCase().includes("package");

      const advisorMsg: ChatMessage = {
        id: `adv-${Date.now()}`,
        sender: "advisor",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        outputTag: "OUT [AI]: ADVISOR DIRECTIVE",
        text: response.text,
        detailedNotes: response.detailedNotes,
        isOfferSealed: isSealed,
        offerDetails: isSealed
          ? {
              referenceCode: offeringCode,
              issuingEntity: displayName,
              incotermsRules: "EXW / FOB Shipyard Gate",
              jurisdiction: sectorCityLabel,
              milestonePricing: "30% Advance Deposit / 70% Milestone Settlement",
              leadTime: "12–16 Weeks Standard",
              warranty: "24-Month Marine Guarantee",
            }
          : undefined,
        sources: response.sources,
        actionSuggestion: response.action,
      };
      setChatMessages((prev) => [...prev, advisorMsg]);
      setIsGenerating(false);
    }, 400);
  };

  // Consolidated Quick Prompt Chips (NO DUPLICATES, NO REDUNDANT RFQ CHIP)
  const quickPromptChips = useMemo(() => [
    { label: "Technical Specs", query: `What are the certified technical specifications and operational parameters for ${activeOffering.name}?` },
    { label: "Suitability & Applications", query: `What are the primary operational applications and vessel use cases for ${activeOffering.name}?` },
    { label: "Compliance & Class", query: `Which classification society approvals (DNV, ABS, LR) and standards apply to ${activeOffering.name}?` },
    { label: "Availability & Delivery", query: `What is the delivery timeline, production lead time, and availability?` },
    { label: "Commercial Terms & Pricing", query: `What are the commercial milestone terms, pricing guidance, and Incoterms?` },
  ], [activeOffering]);

  // File Download Handler
  const handleDownloadDoc = (docTitle: string, docCode: string) => {
    const content = `=================================================================\n` +
      `MARINEWORLD CANONICAL RECORD — OFFICIAL TECHNICAL SPECIFICATION\n` +
      `Entity: ${activeOffering.name}\n` +
      `Reference ID: ${docCode}\n` +
      `Issuing Node: ${displayName} (${sectorCityLabel})\n` +
      `Verification Timestamp: ${new Date().toISOString()}\n` +
      `Class Societies: DNV / Lloyd's Register / Bureau Veritas / ABS\n` +
      `=================================================================\n\n` +
      `EXECUTIVE SUMMARY:\n${activeOffering.shortDescription}\n\n` +
      `SPECIFICATION PARAMETERS:\n` +
      Object.entries(activeOffering.specifications || {
        "Primary Application": "Commercial & High-End Marine Systems",
        "Operating Jurisdiction": sectorCityLabel,
        "Compliance Standard": "IMO Tier III / MARPOL Annex VI",
        "Standard Lead Time": "12–16 Weeks",
      }).map(([k, v]) => `• ${k}: ${v}`).join("\n") +
      `\n\nCOMMERCIAL & INCOTERMS RULES:\n` +
      `• Delivery Basis: EXW / FOB Shipyard Gate\n` +
      `• Settlement: 30% Contract Advance / 70% Milestone Settlement\n` +
      `• Warranty: 24 Months Certified Marine Guarantee\n` +
      `\n=================================================================\n` +
      `Digitally Sealed by MarineWorld Network Protocol.\n`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${String(activeOffering.name || "offering").toLowerCase().replace(/[^a-z0-9]/g, "-")}-${docCode}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const canonicalUrl = activeOffering.canonicalUrl;
  const isCanonicalReady = typeof canonicalUrl === "string" && canonicalUrl.startsWith("http");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 font-sans"
    >
      {/* Dark backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Main Dual-Pane Modal Container */}
      <div
        ref={modalContainerRef}
        tabIndex={-1}
        className="relative w-full max-w-7xl h-[94vh] max-h-[920px] bg-white rounded-card-lg border border-line shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-10 focus:outline-hidden"
      >
        
        {/* TOP COMPACT VERIFIED OFFERING RECORD BAR (FIX 1) */}
        <div className="px-6 py-2 bg-canvas/80 border-b border-line flex items-center justify-between gap-3 font-sans text-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-xs font-semibold text-graphite">
              Verified offering record
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={!isCanonicalReady}
              onClick={() => {
                if (isCanonicalReady) {
                  navigator.clipboard.writeText(canonicalUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-card-xs bg-white border border-line px-2.5 py-1 text-[11px] font-bold text-graphite hover:text-royal hover:border-royal transition cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
              title="Copy link"
              aria-label={copiedLink ? "Link copied" : "Copy link"}
            >
              {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-stone" />}
              <span>{copiedLink ? "COPIED" : "Copy link"}</span>
            </button>
          </div>
        </div>

        {/* TOP DUAL-PANE BODY AREA (LEFT: PRODUCT/SERVICE | RIGHT: AI ADVISOR) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-line">
          
          {/* LEFT PANE (50%): OFFERING SPECIFICATION RECORD */}
          <div className="flex-1 lg:w-1/2 flex flex-col overflow-hidden bg-white">
            
            {/* Header Bar */}
            <div className="px-6 py-3 border-b border-line flex items-center justify-between gap-4 shrink-0 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  id="btn-offering-modal-close"
                  onClick={onClose}
                  className="w-8 h-8 rounded-card-xs border border-line bg-canvas hover:bg-soft text-stone hover:text-graphite flex items-center justify-center transition shrink-0 cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
                  title="Close Modal"
                  aria-label="Close offering details modal"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-royal bg-soft px-2.5 py-1 rounded border border-royal/20">
                    {isService ? "SERVICE SPECIFICATION" : "PRODUCT SPECIFICATION"}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-stone">
                    {offeringCode}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs (OVERVIEW | MEDIA | DOCUMENTS | COMPANY) */}
            <div
              role="tablist"
              aria-label="Offering sections"
              className="px-6 py-2 bg-canvas border-b border-line flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0"
            >
              {[
                { id: "overview", label: "OVERVIEW", icon: Info },
                { id: "media", label: `MEDIA (${mediaGallery.length})`, icon: ImageIcon },
                { id: "downloads", label: "DOCUMENTS", icon: FolderDown },
                { id: "company", label: "COMPANY", icon: Building2 },
              ].map((tab) => {
                const isSelected = activeTab === tab.id;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isSelected}
                    aria-controls={`tabpanel-${tab.id}`}
                    type="button"
                    id={`btn-tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id as ModalTab)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-card-xs text-[10.5px] font-bold uppercase tracking-[0.12em] transition shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden ${
                      isSelected
                        ? "bg-white text-royal border border-line shadow-2xs"
                        : "text-stone hover:text-graphite hover:bg-white/60"
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5 text-royal" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Left Pane Tab Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div
                  role="tabpanel"
                  id="tabpanel-overview"
                  aria-labelledby="btn-tab-overview"
                  className="space-y-5 animate-in fade-in duration-150"
                >
                  
                  {/* KICKER LINE + TITLE + ELEVATED COMPANY IDENTITY CARD (FIX 2) */}
                  <div className="space-y-2.5">
                    {/* Quiet Kicker Line above the offering title */}
                    <div className="text-[11px] font-bold text-stone uppercase tracking-wider flex items-center gap-1.5 font-sans">
                      <span>{isService ? "Service specification" : "Product specification"}</span>
                      <span className="text-slate-300">·</span>
                      <span className="font-mono text-slate-500">Ref {offeringCode}</span>
                    </div>

                    <h1
                      id="product-modal-title"
                      className="text-xl sm:text-2xl font-extrabold text-graphite tracking-tight leading-snug uppercase font-sans"
                    >
                      {activeOffering.name}
                    </h1>

                    {/* Elevated Company Identity Card matching Business Twin standard */}
                    <div className="flex items-center justify-between gap-3 p-3 rounded-card-md border border-line bg-canvas">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Medallion avatar (double ring style) */}
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-royal p-[2px] bg-white shadow-2xs">
                          <div className="flex h-full w-full items-center justify-center rounded-full border border-line bg-canvas overflow-hidden font-sans text-xs font-bold text-graphite">
                            {logoSrc && !logoError ? (
                              <img
                                src={logoSrc}
                                alt={displayName}
                                className="h-full w-full object-contain p-0.5 rounded-full"
                                onError={() => setLogoError(true)}
                              />
                            ) : (
                              <span>{company.initials || displayName.slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                        </div>

                        {/* Name, inline verification, and quiet second line */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-graphite text-[13.5px] truncate">
                              {displayName}
                            </span>
                            {isVerified && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 whitespace-nowrap">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Verified</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-stone font-medium mt-0.5 truncate">
                            <span>{sectorCityLabel}</span>
                            <span className="text-slate-300">·</span>
                            <span className="truncate">{activeOffering.category}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right side: View company button */}
                      <button
                        type="button"
                        id="btn-view-company-from-offering"
                        onClick={() => {
                          const compPath = `/companies/${company.slug || company.id}`;
                          window.history.pushState({}, "", compPath);
                          window.dispatchEvent(new PopStateEvent("popstate"));
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 rounded-card-xs border border-line bg-white hover:bg-slate-50 text-slate-700 hover:text-royal px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer shrink-0 shadow-2xs focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
                        aria-label={`View ${displayName} company profile`}
                      >
                        <span>View company</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-stone" />
                      </button>
                    </div>

                    <p className="text-[13px] text-stone leading-relaxed">
                      {activeOffering.shortDescription}
                    </p>
                  </div>

                  {/* MEDIA GALLERY WITH THUMBNAILS & LIGHTBOX (PROBLEM 2 FIX) */}
                  <div className="space-y-2.5">
                    {/* Main Active Media Preview */}
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={`Open enlarged view of ${mediaGallery[activeMediaIndex]?.title || "media"}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setLightboxIndex(activeMediaIndex);
                          setIsLightboxOpen(true);
                        }
                      }}
                      onClick={() => {
                        setLightboxIndex(activeMediaIndex);
                        setIsLightboxOpen(true);
                      }}
                      className="group relative w-full h-52 sm:h-60 rounded-card-md overflow-hidden bg-slate-950 border border-line shadow-xs cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
                    >
                      {!failedImages[mediaGallery[activeMediaIndex]?.url] ? (
                        <img
                          src={mediaGallery[activeMediaIndex]?.url}
                          alt={mediaGallery[activeMediaIndex]?.title}
                          onError={() => handleImageError(mediaGallery[activeMediaIndex]?.url)}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-900">
                          <ImageIcon className="w-10 h-10 text-slate-600 mb-2" />
                          <p className="text-xs font-bold text-slate-300">No media uploaded yet</p>
                          <p className="text-[10.5px] text-slate-500 mt-1">Image record currently unavailable</p>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 pointer-events-none" />

                      {/* Top Left Media Type Badge */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-card-xs bg-royal text-white px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.12em] shadow-xs">
                          {mediaGallery[activeMediaIndex]?.type === "video" ? (
                            <Play className="w-3 h-3 fill-current" />
                          ) : mediaGallery[activeMediaIndex]?.type === "technical_drawing" ? (
                            <FileCode className="w-3 h-3" />
                          ) : (
                            <ImageIcon className="w-3 h-3" />
                          )}
                          <span>{mediaGallery[activeMediaIndex]?.typeLabel}</span>
                        </span>

                        <span className="inline-flex items-center rounded-card-xs bg-slate-900/80 backdrop-blur-md text-white/90 px-2 py-1 text-[9px] font-mono font-bold uppercase border border-white/10">
                          {mediaGallery[activeMediaIndex]?.badgeTag}
                        </span>
                      </div>

                      {/* Top Right Position Counter & Enlarge Hint */}
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-card-xs bg-slate-950/80 backdrop-blur-md text-white text-[10.5px] font-mono font-bold border border-white/20 shadow-xs">
                          {activeMediaIndex + 1} / {mediaGallery.length}
                        </span>
                        <div className="w-7 h-7 rounded-card-xs bg-slate-950/80 backdrop-blur-md text-white flex items-center justify-center border border-white/20 group-hover:bg-royal transition">
                          <Maximize2 className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      {/* Video Play Button Overlay if Video */}
                      {mediaGallery[activeMediaIndex]?.type === "video" && !failedImages[mediaGallery[activeMediaIndex]?.url] && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-12 h-12 rounded-full bg-white/95 text-royal flex items-center justify-center shadow-xl group-hover:scale-110 transition">
                            <Play className="w-6 h-6 fill-current ml-1" />
                          </div>
                        </div>
                      )}

                      {/* Bottom Info Title & Click to Enlarge Bar */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs pointer-events-none">
                        <p className="font-bold text-[11.5px] uppercase tracking-wider text-white truncate max-w-[80%]">
                          {mediaGallery[activeMediaIndex]?.title}
                        </p>
                        <span className="text-[10px] font-bold text-royal bg-white/90 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                          Click to enlarge
                        </span>
                      </div>
                    </div>

                    {/* Thumbnail Strip */}
                    <div
                      role="region"
                      aria-label="Media thumbnails"
                      className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 w-full max-w-full flex-nowrap"
                    >
                      {mediaGallery.map((m, idx) => {
                        const isActive = activeMediaIndex === idx;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setActiveMediaIndex(idx)}
                            className={`group relative w-20 h-14 rounded-card-xs overflow-hidden border transition shrink-0 cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden ${
                              isActive
                                ? "border-royal ring-2 ring-royal/30 shadow-xs scale-105"
                                : "border-line opacity-70 hover:opacity-100 hover:border-slate-400"
                            }`}
                            title={m.title}
                            aria-label={`View thumbnail ${idx + 1} of ${mediaGallery.length}: ${m.title}`}
                          >
                            {!failedImages[m.url] ? (
                              <img src={m.url} alt={m.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-400">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}

                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition" />

                            <span className="absolute bottom-0.5 left-0.5 px-1 py-0.2 rounded text-[7.5px] font-bold bg-slate-950/90 text-white uppercase tracking-tighter">
                              {m.type === "technical_drawing" ? "DRAWING" : m.type === "video" ? "VIDEO" : "PHOTO"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* TWO CLEARLY DIFFERENTIATED CTAs (PROBLEM 4 FIX) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Primary CTA (Solid fill): Formal RFQ */}
                    <button
                      type="button"
                      id="btn-request-official-offer"
                      onClick={() => {
                        setInquiryModalMode("OFFICIAL_OFFER");
                        setIsInquiryModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-2 rounded-card-xs bg-royal hover:bg-blue-700 text-white px-4 py-3 text-xs font-extrabold transition shadow-2xs cursor-pointer uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
                      aria-label="Request official offer for this offering"
                    >
                      <Bookmark className="w-4 h-4" />
                      <span>Request official offer</span>
                    </button>

                    {/* Secondary CTA (Outline/Ghost): Informal Question via Connect */}
                    <button
                      type="button"
                      id="btn-message-company"
                      onClick={() => {
                        if (onOpenConnectModal) {
                          onOpenConnectModal(activeOffering.name);
                        } else {
                          setInquiryModalMode("INQUIRY");
                          setIsInquiryModalOpen(true);
                        }
                      }}
                      className="flex items-center justify-center gap-2 rounded-card-xs border border-line bg-canvas hover:bg-soft text-graphite hover:text-royal px-4 py-3 text-xs font-extrabold transition shadow-2xs cursor-pointer uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
                      aria-label="Message company directly with an informal question"
                    >
                      <MessageSquare className="w-4 h-4 text-stone" />
                      <span>Message company</span>
                    </button>
                  </div>

                  {/* Key Specifications / Attributes (FIX 3: Icon-Led Fact Rows matching Business Twin standard) */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between border-b border-line pb-1.5">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-royal" />
                        <h3 className="text-[10.5px] font-bold text-graphite uppercase tracking-[0.14em]">
                          {isService ? "Key Service Attributes" : "Key Specifications"}
                        </h3>
                      </div>

                      {allSpecEntries.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowFullSpecs(!showFullSpecs)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-royal hover:underline cursor-pointer uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden rounded"
                          aria-expanded={showFullSpecs}
                        >
                          <span>{showFullSpecs ? "Hide Full Specs" : `View Full Specs (${allSpecEntries.length})`}</span>
                          {showFullSpecs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>

                    {/* 4 Highlight Metric Cards - Icon-Led Fact Rows matching Business Twin standard */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {keySpecs.map((item, idx) => {
                        const SpecIcon = getAttributeIcon(item.label);
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-3.5 p-3.5 rounded-card-md border border-line bg-canvas"
                          >
                            <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-card-sm border border-line bg-white text-stone shadow-2xs">
                              <SpecIcon className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[11px] font-bold text-stone uppercase tracking-wider block truncate">
                                {item.label}
                              </span>
                              <span className="font-semibold text-graphite text-[13.5px] block truncate">
                                {item.value}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Progressive Disclosure: Full Specifications Expansion */}
                    {showFullSpecs && allSpecEntries.length > 0 && (
                      <div className="p-4 rounded-card-sm border border-royal/30 bg-soft/40 space-y-3 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-royal">
                            Complete Specification Dataset
                          </span>
                          <span className="text-[10px] text-stone font-mono">
                            {allSpecEntries.length} Parameters
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          {allSpecEntries.map(([k, v], i) => {
                            const SpecIcon = getAttributeIcon(k);
                            return (
                              <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-card-xs bg-white border border-line">
                                <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-card-xs border border-line bg-canvas text-stone">
                                  <SpecIcon className="h-3.5 w-3.5 text-slate-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-[10px] font-bold text-stone uppercase tracking-wider block truncate">{k}</span>
                                  <span className="font-semibold text-graphite text-xs block truncate">{String(v)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TAB 2: MEDIA (ALL ITEMS GRID) */}
              {activeTab === "media" && (
                <div
                  role="tabpanel"
                  id="tabpanel-media"
                  aria-labelledby="btn-tab-media"
                  className="space-y-4 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <h3 className="text-[10.5px] font-bold text-graphite uppercase tracking-[0.14em] flex items-center gap-2">
                      <ImageIcon className="w-3.5 h-3.5 text-royal" />
                      <span>Media Assets & Drawings ({mediaGallery.length})</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {mediaGallery.map((m, idx) => (
                      <div
                        key={m.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Open media: ${m.title}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setActiveMediaIndex(idx);
                            setLightboxIndex(idx);
                            setIsLightboxOpen(true);
                          }
                        }}
                        onClick={() => {
                          setActiveMediaIndex(idx);
                          setLightboxIndex(idx);
                          setIsLightboxOpen(true);
                        }}
                        className={`group relative rounded-card-md overflow-hidden border transition cursor-pointer focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden ${
                          activeMediaIndex === idx ? "border-royal ring-1 ring-royal/20" : "border-line hover:border-slate-400"
                        }`}
                      >
                        <div className="aspect-video relative bg-slate-900">
                          {!failedImages[m.url] ? (
                            <img
                              src={m.url}
                              alt={m.title}
                              onError={() => handleImageError(m.url)}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-slate-400">
                              <ImageIcon className="w-8 h-8 text-slate-600 mb-1" />
                              <p className="text-[11px] font-bold text-slate-300">No media uploaded yet</p>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                          
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-card-xs text-[9px] font-bold bg-royal text-white uppercase tracking-wider">
                            {m.typeLabel}
                          </span>

                          {m.type === "video" && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-9 h-9 rounded-full bg-white/90 text-royal flex items-center justify-center shadow-md group-hover:scale-110 transition">
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              </div>
                            </div>
                          )}

                          <div className="absolute bottom-2 left-2 right-2">
                            <p className="text-[11px] font-bold text-white truncate uppercase">{m.title}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: DOCUMENTS */}
              {activeTab === "downloads" && (
                <div
                  role="tabpanel"
                  id="tabpanel-downloads"
                  aria-labelledby="btn-tab-downloads"
                  className="space-y-4 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <h3 className="text-[10.5px] font-bold text-graphite uppercase tracking-[0.14em] flex items-center gap-2">
                      <FolderDown className="w-3.5 h-3.5 text-royal" />
                      <span>Certified Engineering Documents</span>
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {downloadDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3.5 rounded-card-sm border border-line bg-white hover:border-royal/60 hover:shadow-2xs transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-card-xs bg-soft text-royal flex items-center justify-center shrink-0 border border-royal/20">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-bold text-graphite truncate uppercase">{doc.title}</p>
                            <div className="flex items-center gap-2 text-[10px] text-stone font-medium mt-0.5">
                              <span className="font-bold text-graphite">{doc.code}</span>
                              <span>•</span>
                              <span>{doc.size}</span>
                              <span>•</span>
                              <span className="text-emerald-600 font-bold uppercase">{doc.badge}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDownloadDoc(doc.title, doc.code)}
                          className="inline-flex items-center gap-1.5 rounded-card-xs bg-canvas hover:bg-slate-950 hover:text-white text-graphite px-3 py-1.5 text-xs font-bold transition cursor-pointer shrink-0 ml-3 border border-line focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
                          aria-label={`Download ${doc.title} (${doc.code})`}
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline uppercase tracking-wider">Download</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: COMPANY PROFILE (FIX 4: ENHANCED VISUAL HIERARCHY) */}
              {activeTab === "company" && (
                <div
                  role="tabpanel"
                  id="tabpanel-company"
                  aria-labelledby="btn-tab-company"
                  className="space-y-4 animate-in fade-in duration-150"
                >
                  <div className="p-5 rounded-card-md border border-line bg-canvas space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-line pb-3">
                      <div>
                        <span className="text-[9.5px] font-bold text-royal uppercase tracking-widest block">
                          ISSUING COMPANY
                        </span>
                        <h3 className="text-base font-extrabold text-graphite uppercase mt-0.5 tracking-tight">{displayName}</h3>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-card-xs bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        AUDIT VERIFIED
                      </span>
                    </div>

                    <div className="flex items-center gap-3.5">
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-royal p-[2px] bg-white shadow-2xs">
                        <div className="flex h-full w-full items-center justify-center rounded-full border border-line bg-canvas overflow-hidden font-sans text-sm font-bold text-graphite">
                          {logoSrc && !logoError ? (
                            <img
                              src={logoSrc}
                              alt={displayName}
                              className="h-full w-full object-contain p-0.5 rounded-full"
                              onError={() => setLogoError(true)}
                            />
                          ) : (
                            <span>{company.initials || displayName.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-graphite">{company.headquartersCity || "Rotterdam"}, {company.country || "Netherlands"}</p>
                        <p className="text-[11px] text-royal font-mono font-bold mt-0.5">{sectorCityLabel}</p>
                      </div>
                    </div>

                    <p className="text-[12.5px] text-stone leading-relaxed">
                      {company.description || `${displayName} is an accredited marine engineering corporation maintaining certified facilities across global maritime corridors.`}
                    </p>

                    <div className="pt-3 border-t border-line/70 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-card-xs bg-white text-royal text-[10.5px] font-bold border border-line shadow-2xs">
                          <Globe2 className="w-3.5 h-3.5 text-royal" />
                          {sectorCityLabel}
                        </span>
                      </div>

                      <button
                        type="button"
                        id="btn-open-company-profile"
                        onClick={() => {
                          const compPath = `/companies/${company.slug || company.id}`;
                          window.history.pushState({}, "", compPath);
                          window.dispatchEvent(new PopStateEvent("popstate"));
                          onClose();
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-card-xs bg-slate-950 hover:bg-slate-800 text-white text-[11px] font-bold uppercase tracking-wider transition shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
                        aria-label={`Open complete profile for ${displayName}`}
                      >
                        <span>OPEN COMPANY PROFILE</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* RIGHT PANE (50%): AI SPECIALIST ADVISOR WORKSPACE */}
          <div
            id="advisor-pane"
            className="flex-1 lg:w-1/2 flex flex-col bg-white overflow-hidden"
          >
            {/* Generic Short Header (Problem 1 Fix: No full title repetition) */}
            <div className="px-6 py-3.5 border-b border-line flex items-center justify-between gap-4 shrink-0 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-card-xs bg-royal/10 border border-royal/20 flex items-center justify-center text-royal shrink-0 shadow-2xs">
                  <Handshake className="w-4 h-4" />
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-graphite tracking-tight uppercase truncate">
                    {isService ? "Ask about this service" : "Ask about this product"}
                  </h3>
                  <p className="text-[11px] font-medium text-stone truncate">
                    Direct Commercial & Technical Advisory
                  </p>
                </div>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  id="btn-advisor-reset"
                  onClick={() => setChatMessages([])}
                  className="w-8 h-8 rounded-card-xs border border-line bg-canvas text-stone hover:text-royal hover:bg-soft transition flex items-center justify-center cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
                  title="Reset Conversation"
                  aria-label="Reset AI conversation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  id="btn-advisor-share"
                  onClick={() => setIsShareModalOpen(true)}
                  className="w-8 h-8 rounded-card-xs border border-line bg-canvas text-stone hover:text-royal hover:bg-soft transition flex items-center justify-center cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
                  title="Share Offering"
                  aria-label="Share offering details"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Conversation Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-canvas/30">
              
              {/* Initial Clean Workspace with SINGLE UNIFIED Quick-Prompt Chips (Problem 3 Fix) */}
              {chatMessages.length === 0 && (
                <div className="h-full flex flex-col justify-center items-center text-center p-2 sm:p-4 space-y-4 animate-in fade-in duration-200">
                  <div className="w-10 h-10 rounded-full bg-royal/10 text-royal flex items-center justify-center border border-royal/20 shadow-2xs">
                    <Handshake className="w-5 h-5" />
                  </div>

                  <div className="max-w-md space-y-1">
                    <h4 className="text-sm sm:text-base font-extrabold text-graphite uppercase tracking-tight">
                      HOW CAN I HELP?
                    </h4>
                    <p className="text-xs text-stone leading-relaxed">
                      Ask the {isService ? "service" : "product"} specialist about technical specifications, certified applications, class compliance, or commercial terms.
                    </p>
                  </div>

                  {/* Single Unified Quick Prompt Chips Row */}
                  <div className="w-full max-w-lg space-y-2 text-left">
                    <span className="text-[9.5px] font-bold uppercase tracking-widest text-mute block text-center">
                      QUICK ADVISORY TOPICS
                    </span>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {quickPromptChips.map((chip, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => handleSendMessage(chip.query)}
                          className="px-3 py-1.5 rounded-card-xs border border-line bg-white hover:border-royal hover:text-royal text-left text-[11px] font-bold text-graphite transition shadow-2xs cursor-pointer uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
                          aria-label={`Ask topic: ${chip.label}`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-[10.5px] text-mute font-medium">
                    Click any prompt or type a custom question below.
                  </p>
                </div>
              )}

              {/* Chat Message Stream */}
              {chatMessages.map((msg) => (
                <div key={msg.id} className="space-y-1 animate-in fade-in duration-150">
                  
                  {/* User Message */}
                  {msg.sender === "user" ? (
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-bold text-stone uppercase tracking-wider">
                        <span>YOU</span>
                        <span className="text-slate-300">•</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <div className="max-w-[90%] sm:max-w-[85%] rounded-card-md rounded-tr-xs bg-slate-950 text-white p-3.5 text-[12.5px] leading-relaxed font-medium shadow-xs">
                        {msg.text}
                      </div>
                    </div>
                  ) : (
                    /* Advisor Message */
                    <div className="flex flex-col items-start w-full">
                      <div className="flex items-center gap-1.5 mb-1 px-1 text-[10.5px] font-bold text-royal uppercase tracking-[0.14em]">
                        <span className="h-1.5 w-1.5 rounded-full bg-royal" />
                        <span>ADVISOR DIRECTIVE</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[10px] text-mute font-medium">{msg.timestamp}</span>
                      </div>

                      <div className="w-full rounded-card-md bg-white border border-line p-4 space-y-3 shadow-xs text-[12.5px] text-slate-800 leading-relaxed">
                        
                        {/* Sealed Offer Box if applicable */}
                        {msg.isOfferSealed && msg.offerDetails ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-graphite font-bold text-[13px] uppercase">
                              <FileBadge className="w-4 h-4 text-royal" />
                              <span>Commercial Package Configured</span>
                            </div>

                            <p className="leading-relaxed text-stone text-xs">
                              Official commercial parameters compiled under reference <strong className="font-mono text-royal">{msg.offerDetails.referenceCode}</strong>.
                            </p>

                            <div className="grid grid-cols-2 gap-2 p-2.5 rounded-card-xs border border-line bg-canvas text-[11px]">
                              <div>
                                <span className="text-mute font-bold uppercase text-[9px] block">Incoterms:</span>
                                <span className="font-semibold text-graphite truncate">{msg.offerDetails.incotermsRules}</span>
                              </div>
                              <div>
                                <span className="text-mute font-bold uppercase text-[9px] block">Milestones:</span>
                                <span className="font-semibold text-graphite truncate">{msg.offerDetails.milestonePricing}</span>
                              </div>
                            </div>

                            <div className="pt-1 flex items-center justify-between gap-3">
                              <p className="text-[10.5px] text-stone">
                                Digitally verified by {displayName}.
                              </p>
                              <button
                                type="button"
                                onClick={() => handleDownloadDoc(`B2B Offer - ${activeOffering.name}`, msg.offerDetails!.referenceCode)}
                                className="inline-flex items-center gap-1.5 rounded-card-xs bg-slate-950 hover:bg-slate-800 text-white px-3 py-1.5 text-xs font-bold transition shadow-2xs cursor-pointer uppercase tracking-wider shrink-0 focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
                                aria-label={`Export sealed offer ${msg.offerDetails.referenceCode} as PDF`}
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Export PDF</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {/* Exact Answer */}
                            <p className="leading-relaxed whitespace-pre-wrap text-graphite font-medium">{msg.text}</p>

                            {/* Expandable Deeper Context / Notes */}
                            {msg.detailedNotes && (
                              <div className="pt-1">
                                <button
                                  type="button"
                                  onClick={() => setExpandedNotes((prev) => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                                  className="inline-flex items-center gap-1 text-[10.5px] font-bold text-royal hover:underline cursor-pointer uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden rounded"
                                  aria-expanded={expandedNotes[msg.id]}
                                >
                                  <span>{expandedNotes[msg.id] ? "Hide Technical Context" : "View Details"}</span>
                                  {expandedNotes[msg.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                                {expandedNotes[msg.id] && (
                                  <div className="mt-1.5 p-2.5 rounded-card-xs bg-canvas border border-line text-xs text-stone leading-relaxed animate-in fade-in duration-150">
                                    {msg.detailedNotes}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Intelligent Action Buttons */}
                            {msg.actionSuggestion && (
                              <div className="pt-1 flex flex-wrap gap-2">
                                {msg.actionSuggestion.type === "RFQ" && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInquiryModalMode("OFFICIAL_OFFER");
                                      setIsInquiryModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-card-xs bg-royal hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-bold transition shadow-2xs cursor-pointer uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
                                    aria-label="Request official offer"
                                  >
                                    <Bookmark className="w-3.5 h-3.5" />
                                    <span>Request official offer</span>
                                  </button>
                                )}

                                {msg.actionSuggestion.type === "AVAILABILITY" && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleSendMessage(`Please provide detailed production slots, delivery lead times, and availability for ${activeOffering.name}.`);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-card-xs bg-royal hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-bold transition shadow-2xs cursor-pointer uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
                                    aria-label="Request production slots and availability schedule"
                                  >
                                    <Bookmark className="w-3.5 h-3.5" />
                                    <span>Request Availability Slot</span>
                                  </button>
                                )}

                                {msg.actionSuggestion.type === "SPECS" && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTab("overview");
                                      setShowFullSpecs(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-card-xs border border-line bg-canvas hover:bg-white text-graphite hover:text-royal px-3 py-1.5 text-xs font-bold transition shadow-2xs cursor-pointer uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
                                    aria-label="View full technical specifications"
                                  >
                                    <SlidersHorizontal className="w-3.5 h-3.5 text-royal" />
                                    <span>View Full Specifications</span>
                                  </button>
                                )}

                                {msg.actionSuggestion.type === "DOWNLOAD_PDF" && (
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadDoc(`Datasheet - ${activeOffering.name}`, offeringCode)}
                                    className="inline-flex items-center gap-1.5 rounded-card-xs bg-slate-950 hover:bg-slate-800 text-white px-3 py-1.5 text-xs font-bold transition shadow-2xs cursor-pointer uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
                                    aria-label="Download product datasheet PDF"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download Datasheet</span>
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Grounding Attribution */}
                            {msg.sources && (
                              <div className="pt-2 border-t border-line/60 flex flex-wrap items-center gap-1.5">
                                <span className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-mute">
                                  Source:
                                </span>
                                {msg.sources.map((s, idx) => (
                                  <span key={idx} className="inline-flex items-center gap-1 rounded-card-xs bg-canvas border border-line px-2 py-0.5 text-[9.5px] font-semibold text-stone">
                                    <ShieldCheck className="w-3 h-3 text-royal" />
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    </div>
                  )}

                </div>
              ))}

              {isGenerating && (
                <div className="space-y-1 animate-in fade-in duration-100">
                  <div className="flex items-center gap-2 px-1 text-[10.5px] font-bold text-royal uppercase tracking-[0.14em]">
                    <span className="h-1.5 w-1.5 rounded-full bg-royal animate-ping" />
                    <span>SYNTHESIZING GROUNDED ANSWER...</span>
                  </div>
                  <div className="rounded-card-md bg-white border border-line p-3.5 text-xs text-stone flex items-center gap-3 shadow-xs">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-royal animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-royal animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 rounded-full bg-royal animate-bounce [animation-delay:0.4s]" />
                    </div>
                    <span className="font-medium">Accessing verified technical data & terms...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Bottom Chat Input Bar */}
            <div className="p-3.5 bg-white border-t border-line shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2 rounded-card-sm border border-line bg-canvas p-1 shadow-2xs focus-within:border-royal focus-within:bg-white transition"
              >
                <input
                  ref={inputRef}
                  type="text"
                  id="input-product-ai-query"
                  aria-label="Ask about specifications, applications, class compliance, or commercial terms"
                  value={advisorInput}
                  onChange={(e) => setAdvisorInput(e.target.value)}
                  placeholder={`Ask about specs, applications, class compliance, or terms...`}
                  className="flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-graphite placeholder:text-mute focus:outline-none font-medium"
                  disabled={isGenerating}
                />

                <button
                  type="submit"
                  id="btn-product-ai-send"
                  disabled={!advisorInput.trim() || isGenerating}
                  className="px-3.5 py-1.5 rounded-card-xs bg-royal hover:bg-blue-700 text-white disabled:opacity-40 disabled:hover:bg-royal transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
                  title="Send Query"
                  aria-label="Send AI advisor query"
                >
                  <span>Transmit</span>
                  <Send className="w-3 h-3" />
                </button>
              </form>
            </div>

          </div>

        </div>

        {/* BOTTOM ROW: CATALOG ITEMS CAROUSEL (PROBLEM 5 FIX: SINGLE BROWSE STRIP) */}
        <div className="px-6 py-2.5 bg-canvas border-t border-line flex flex-col sm:flex-row sm:items-center gap-3 shrink-0 font-sans">
          <div className="shrink-0 leading-tight">
            <div className="text-[10px] font-bold text-graphite uppercase tracking-[0.12em]">
              MORE FROM {displayName}
            </div>
            <div className="text-[9px] font-bold text-royal uppercase tracking-wider">
              {sectorCityLabel}
            </div>
          </div>

          <div
            role="region"
            aria-label="Other offerings from company"
            className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5"
          >
            {allOfferings.map((item) => {
              const isCurrent = item.id === activeOffering.id || item.name === activeOffering.name;
              const itemImage = (item as any).coverImage ||
                (item as any).primaryImage ||
                `https://images.unsplash.com/photo-1586528116311-ad8ed7c50a92?auto=format&fit=crop&w=300&q=80`;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveOfferingRaw(item);
                    if (onSelectOffering) onSelectOffering(item);
                  }}
                  className={`flex items-center gap-2 p-1 pr-3 rounded-card-sm border transition-all shrink-0 cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden ${
                    isCurrent
                      ? "bg-white border-royal ring-1 ring-royal/30 shadow-xs"
                      : "bg-white/80 border-line hover:border-slate-300 hover:bg-white"
                  }`}
                  aria-label={`View offering: ${item.name}`}
                >
                  <div className="w-9 h-7 rounded-card-xs overflow-hidden bg-slate-200 shrink-0">
                    <img
                      src={itemImage}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 max-w-[130px] sm:max-w-[160px]">
                    <div className="text-[10.5px] font-bold text-graphite truncate uppercase">
                      {item.name}
                    </div>
                    <div className="text-[8.5px] font-semibold text-stone uppercase truncate">
                      {item.type === "service" ? "SERVICE" : "PRODUCT"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* LIGHTBOX OVERLAY (INSTITUTIONAL LIGHT THEME + ACCESSIBILITY FOCUS TRAP) */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged media view"
          className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 md:p-6 animate-in fade-in duration-200 font-sans"
        >
          <div
            ref={lightboxContainerRef}
            tabIndex={-1}
            className="relative w-full max-w-5xl h-[88vh] max-h-[820px] bg-white rounded-card-lg border border-line shadow-2xl flex flex-col justify-between p-4 sm:p-5 overflow-hidden animate-in zoom-in-95 duration-200 focus:outline-hidden"
          >
            {/* Lightbox Top Bar */}
            <div className="flex items-center justify-between gap-4 border-b border-line pb-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="px-2.5 py-1 rounded-card-xs bg-royal text-white text-[10px] font-bold uppercase tracking-wider shrink-0">
                  {mediaGallery[lightboxIndex]?.typeLabel}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-graphite truncate uppercase">
                    {mediaGallery[lightboxIndex]?.title}
                  </h3>
                  <p className="text-[11px] text-stone truncate font-medium">
                    {activeOffering.name} — <span className="font-semibold text-graphite">{displayName}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
                <span className="text-stone font-bold bg-canvas border border-line px-2.5 py-1 rounded-card-xs">
                  {lightboxIndex + 1} / {mediaGallery.length}
                </span>
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(false)}
                  className="w-8 h-8 rounded-card-xs border border-line bg-canvas hover:bg-soft text-stone hover:text-graphite flex items-center justify-center transition cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
                  title="Close Lightbox (Esc)"
                  aria-label="Close enlarged media lightbox"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lightbox Center Content */}
            <div className="flex-1 relative flex items-center justify-between my-3 overflow-hidden min-h-0">
              <button
                type="button"
                onClick={() => setLightboxIndex((prev) => (prev - 1 + mediaGallery.length) % mediaGallery.length)}
                className="w-10 h-10 rounded-full bg-white hover:bg-soft text-graphite hover:text-royal border border-line flex items-center justify-center transition shrink-0 z-10 cursor-pointer shadow-xs ml-1 focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
                title="Previous Media (Left Arrow)"
                aria-label="View previous media item"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex-1 flex flex-col items-center justify-center p-2 max-h-[62vh] min-h-0 bg-canvas/50 rounded-card-md border border-line/60 mx-2">
                {!failedImages[mediaGallery[lightboxIndex]?.url] ? (
                  <div className="relative max-h-full max-w-full flex items-center justify-center">
                    <img
                      src={mediaGallery[lightboxIndex]?.url}
                      alt={mediaGallery[lightboxIndex]?.title}
                      onError={() => handleImageError(mediaGallery[lightboxIndex]?.url)}
                      className="max-h-[58vh] max-w-[75vw] object-contain rounded-card-sm shadow-xs"
                    />
                    {mediaGallery[lightboxIndex]?.type === "video" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 rounded-card-sm">
                        <div className="w-14 h-14 rounded-full bg-white text-royal flex items-center justify-center shadow-xl hover:scale-110 transition">
                          <Play className="w-7 h-7 fill-current ml-1" />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full max-w-md h-64 rounded-card-md bg-canvas border border-line flex flex-col items-center justify-center p-6 text-center">
                    <ImageIcon className="w-10 h-10 text-stone mb-2" />
                    <p className="text-xs font-bold text-graphite">No media uploaded yet</p>
                    <p className="text-[11px] text-stone mt-1">Image preview record is currently unavailable</p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setLightboxIndex((prev) => (prev + 1) % mediaGallery.length)}
                className="w-10 h-10 rounded-full bg-white hover:bg-soft text-graphite hover:text-royal border border-line flex items-center justify-center transition shrink-0 z-10 cursor-pointer shadow-xs mr-1 focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
                title="Next Media (Right Arrow)"
                aria-label="View next media item"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Lightbox Bottom Strip */}
            <div className="flex items-center justify-between border-t border-line pt-3 gap-4 shrink-0">
              <div className="text-[11px] text-stone hidden sm:block font-sans">
                Use <kbd className="px-1.5 py-0.5 bg-canvas rounded border border-line font-mono text-[10px] text-graphite">←</kbd> <kbd className="px-1.5 py-0.5 bg-canvas rounded border border-line font-mono text-[10px] text-graphite">→</kbd> arrow keys to navigate, <kbd className="px-1.5 py-0.5 bg-canvas rounded border border-line font-mono text-[10px] text-graphite">Esc</kbd> to exit.
              </div>

              <div
                role="region"
                aria-label="Lightbox thumbnails"
                className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 w-full max-w-full flex-nowrap"
              >
                {mediaGallery.map((m, idx) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setLightboxIndex(idx)}
                    className={`w-14 h-10 rounded-card-xs overflow-hidden border transition cursor-pointer shrink-0 relative focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden ${
                      lightboxIndex === idx ? "border-royal ring-2 ring-royal/30 shadow-xs" : "border-line opacity-60 hover:opacity-100"
                    }`}
                    aria-label={`Jump to media ${idx + 1}: ${m.title}`}
                  >
                    <img src={m.url} alt={m.title} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareProtocolModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={`Share ${activeOffering.name}`}
        url={canonicalUrl || ""}
        description="Anyone with this link can view this offering."
      />

      {/* Commercial Inquiry & Official Offer Modal */}
      <CommercialInquiryModal
        isOpen={isInquiryModalOpen}
        onClose={() => setIsInquiryModalOpen(false)}
        offering={activeOffering}
        parentCompany={company}
        initialMode={inquiryModalMode}
        onOpenAIAdvisor={(prefillPrompt) => {
          setIsInquiryModalOpen(false);
          if (prefillPrompt) {
            handleSendMessage(prefillPrompt);
            if (window.innerWidth < 1024) {
              document.getElementById("advisor-pane")?.scrollIntoView({ behavior: "smooth" });
            }
          }
        }}
      />
    </div>
  );
}

/**
 * Intelligent Grounded Response Generator for Product/Service AI Advisor
 */
function generateAdvisorAnswer(
  query: string,
  offering: CompanyOffering,
  companyName: string
): {
  text: string;
  detailedNotes?: string;
  sources: string[];
  action?: { label: string; type: "DOWNLOAD_PDF" | "RFQ" | "SPECS" | "AVAILABILITY" };
} {
  const result = answerOfferingAdvisorQuery(offering, query, companyName);
  
  let action: { label: string; type: "DOWNLOAD_PDF" | "RFQ" | "SPECS" | "AVAILABILITY" } | undefined;
  if (result.suggestedAction === "REQUEST_OFFER" || result.suggestedAction === "COMMERCIAL_RFQ") {
    action = { label: "Request official offer", type: "RFQ" };
  } else if (result.suggestedAction === "VIEW_SPECS") {
    action = { label: "View Full Specs", type: "SPECS" };
  } else if (result.suggestedAction === "REQUEST_AVAILABILITY") {
    action = { label: "Request Availability / Slot", type: "AVAILABILITY" };
  }

  return {
    text: result.answer,
    detailedNotes: result.detailedNotes,
    sources: result.sourcesUsed,
    action,
  };
}
