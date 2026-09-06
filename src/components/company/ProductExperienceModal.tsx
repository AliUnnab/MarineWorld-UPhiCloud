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
  Package,
  Wrench,
} from "lucide-react";
import type { CompanyOffering, CompanyProfile } from "@/lib/types";
import { getCompanyProducts, getCompanyServices } from "@/lib/registry";
import { ShareProtocolModal } from "./ShareProtocolModal";
import { CommercialInquiryModal } from "./CommercialInquiryModal";
import { answerOfferingAdvisorQuery, answerOfferingAdvisorQueryAsync, resolvePdfAsBase64, pdfBase64Cache, stripOKFTerminology } from "@/lib/services/offeringAIService";
import { initializeCanonicalOfferingDefaults } from "@/lib/services/offeringEntityService";
import type { OKFDocument } from "@/lib/types/okf";
import { buildOKFDocument, getCompanyOKFDocuments } from "@/lib/services/okfService";
import { OKFDocumentViewerModal } from "@/components/studio/knowledge/OKFDocumentViewerModal";
import { getCurrentAuthSession, subscribeAuthState, isCompanyOwner } from "@/lib/services/securityService";
import { resolveAccessContext } from "@/lib/services/accessContextService";
import type { AuthContext } from "@/lib/auth/developmentAuthProvider";
import { buildOKFSchemaOrg, injectOKFMetaAndLinks, injectJsonLd } from "@/lib/services/schemaOrgService";

export type ModalTab = "overview" | "media" | "downloads" | "company";

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
  isOwner?: boolean;
}

export function ProductExperienceModal({
  offering: initialOffering,
  company,
  onClose,
  allOfferings: providedOfferings,
  onOpenConnectModal,
  onSelectOffering,
  isOwner: propIsOwner,
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
            coverImage: (p as any).coverImage || (p as any).primaryImage || (p as any).imageUrl || p.mediaReferences?.[0]?.url,
            mediaReferences: p.mediaReferences || (p as any).media || [],
            media: (p as any).media,
            gallery: (p as any).gallery,
            groundingSources: (p as any).groundingSources,
            commercialInformation: (p as any).commercialInformation,
            applications: (p as any).applications,
            certifications: (p as any).certifications,
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
            coverImage: (s as any).coverImage || (s as any).primaryImage || (s as any).imageUrl || s.mediaReferences?.[0]?.url,
            mediaReferences: s.mediaReferences || (s as any).media || [],
            media: (s as any).media,
            gallery: (s as any).gallery,
            groundingSources: (s as any).groundingSources,
            commercialInformation: (s as any).commercialInformation,
            applications: (s as any).applications,
            certifications: (s as any).certifications,
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

  // Track active auth session & check if current user is owner of this offering's company
  const [authSession, setAuthSession] = useState<AuthContext>(() => getCurrentAuthSession());

  useEffect(() => {
    const unsubscribe = subscribeAuthState((newAuth) => {
      setAuthSession(newAuth);
    });
    return () => unsubscribe();
  }, []);

  const isCompanyOwnerViewer = useMemo(() => {
    if (typeof propIsOwner === "boolean") return propIsOwner;
    if (!authSession || !authSession.uid) return false;

    const targetCompanyId = company?.id || activeOffering?.companyId;

    // 1. Direct match with company profile ownerId
    if (company?.ownerId && company.ownerId === authSession.uid) {
      return true;
    }

    // 2. Canonical isCompanyOwner check
    if (targetCompanyId && isCompanyOwner(targetCompanyId, authSession)) {
      return true;
    }

    // 3. Check accessContext active organization or memberships
    try {
      const accessCtx = resolveAccessContext(authSession);
      if (
        accessCtx.activeOrganization &&
        (accessCtx.activeOrganization.companyId === targetCompanyId ||
          accessCtx.activeOrganization.organizationId === targetCompanyId) &&
        accessCtx.activeOrganization.role === "OWNER"
      ) {
        return true;
      }

      if (
        accessCtx.availableMemberships &&
        accessCtx.availableMemberships.some(
          (m) =>
            (m.companyId === targetCompanyId || m.organizationId === targetCompanyId) &&
            m.role === "OWNER" &&
            m.memberStatus === "ACTIVE"
        )
      ) {
        return true;
      }
    } catch {
      // Ignore resolution issues
    }

    // 4. Contact / official company email match
    const compEmail =
      (company as any)?.officialEmail || (company as any)?.email || (company as any)?.contactEmail;
    if (
      compEmail &&
      authSession.email &&
      compEmail.trim().toLowerCase() === authSession.email.trim().toLowerCase()
    ) {
      return true;
    }

    return false;
  }, [propIsOwner, authSession, company, activeOffering?.companyId]);

  const [isOKFModalOpen, setIsOKFModalOpen] = useState(false);
  const [firestoreOKFDoc, setFirestoreOKFDoc] = useState<OKFDocument | null>(null);

  // Fetch Firestore OKF documents on mount or offering change (accessible to all viewers for AI and SEO grounding)
  useEffect(() => {
    if (company?.id) {
      getCompanyOKFDocuments(company.id)
        .then((docs) => {
          const match = docs.find(
            (d) =>
              d.offeringId === activeOffering.id ||
              d.title.toLowerCase().trim() === activeOffering.name.toLowerCase().trim() ||
              (activeOffering.name && d.title.toLowerCase().includes(activeOffering.name.toLowerCase()))
          );
          if (match) {
            setFirestoreOKFDoc(match);
          }
        })
        .catch((err) => console.warn("[ProductExperienceModal] OKF fetch error:", err));
    }
  }, [company?.id, activeOffering.id, activeOffering.name]);

  // Sealed OKF Document Resolution for this offering
  const activeOfferingOKFDoc = useMemo<OKFDocument>(() => {
    if (firestoreOKFDoc) return firestoreOKFDoc;
    if (activeOffering.okfDocument) return activeOffering.okfDocument;

    const specsArray: any[] = [];
    if (activeOffering.specifications) {
      Object.entries(activeOffering.specifications).forEach(([k, v]) => {
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
      ...(activeOffering.groundingSources || []),
      ...(activeOffering.sourceDocuments || []),
    ];
    const fullExtracted = docSources.map((d) => d.extractedText || d.summary || "").filter(Boolean).join("\n\n");

    return buildOKFDocument({
      documentId: `okf-offering-${activeOffering.id}`,
      title: activeOffering.name,
      entityType: activeOffering.type === "service" ? "SERVICE" : "PRODUCT",
      companyId: company.id,
      companySlug: company.slug,
      offeringId: activeOffering.id,
      offeringSlug: activeOffering.slug,
      sourceOrigin: "LOCAL_UPLOAD",
      originalFileName: `${activeOffering.name}_Technical_Datasheet.pdf`,
      summaryText: activeOffering.shortDescription || activeOffering.detailedDescription || `${activeOffering.name} verified engineering specification.`,
      rawContent: fullExtracted || `${activeOffering.name}\n${activeOffering.shortDescription || ""}\n${activeOffering.detailedDescription || ""}`,
      specifications: specsArray,
      certifications: activeOffering.certifications || [],
      commercialParameters: {
        price: activeOffering.price || activeOffering.commercialInformation?.price,
        currency: activeOffering.currency || activeOffering.commercialInformation?.currency || "USD",
        pricingModel: activeOffering.commercialInformation?.pricingType || "Fixed",
        leadTimeDays: activeOffering.commercialInformation?.leadTime ? parseInt(activeOffering.commercialInformation.leadTime) || undefined : undefined,
      },
      operationalBoundaries: activeOffering.applications || [],
      confidenceScore: 0.99,
    });
  }, [activeOffering, company, firestoreOKFDoc]);




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

  // Multi-item Media Gallery Generation from Real Uploaded Offering Media
  const primaryCoverImg = (activeOffering as any).coverImage || (activeOffering as any).primaryImage;

  const mediaGallery: MediaItem[] = useMemo(() => {
    const items: MediaItem[] = [];

    // Check canonical mediaReferences first, then media / gallery
    const customMedia =
      (activeOffering as any).mediaReferences ||
      (activeOffering as any).media ||
      (activeOffering as any).gallery;

    if (Array.isArray(customMedia) && customMedia.length > 0) {
      customMedia.forEach((m: any, idx: number) => {
        if (!m || (!m.url && !m.src)) return;
        const rawUrl = m.url || m.src;
        const lowerUrl = rawUrl.toLowerCase();
        const isDoc =
          lowerUrl.includes(".pdf") ||
          lowerUrl.includes(".docx") ||
          lowerUrl.includes(".xlsx") ||
          lowerUrl.includes(".txt") ||
          lowerUrl.includes(".dwg") ||
          m.type === "drawing" ||
          m.type === "document" ||
          m.type === "datasheet";

        // Filter out non-photo documents so they don't corrupt the photo gallery
        if (isDoc) return;

        const url = formatMediaImageUrl(rawUrl);
        const type: "photo" | "technical_drawing" | "video" =
          m.type === "video"
            ? "video"
            : "photo";
        const typeLabel =
          type === "video"
            ? "Video"
            : "Photo";

        items.push({
          id: m.id || `m-${idx}`,
          type,
          typeLabel,
          title: m.title || m.caption || `${activeOffering.name} Photo ${idx + 1}`,
          url,
          badgeTag: m.isCover ? "COVER IMAGE" : (m.type || typeLabel).toUpperCase(),
        });
      });
    }

    if (
      primaryCoverImg &&
      !primaryCoverImg.toLowerCase().includes(".pdf") &&
      !items.some((i) => i.url === formatMediaImageUrl(primaryCoverImg))
    ) {
      items.unshift({
        id: "primary-photo",
        type: "photo",
        typeLabel: "Cover Photo",
        title: `${activeOffering.name} — Cover Asset`,
        url: formatMediaImageUrl(primaryCoverImg),
        badgeTag: "PRIMARY COVER",
      });
    }

    return items;
  }, [activeOffering, primaryCoverImg]);

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

  // Derive Key Specifications from actual offering specifications
  const keySpecs = useMemo(() => {
    const specs = activeOffering.specifications || {};
    const entries = Object.entries(specs);
    
    const list = entries.length > 0
      ? entries.map(([k, v]) => ({ label: k, value: String(v) }))
      : [];

    const priceVal = activeOffering.price || activeOffering.commercialInformation?.price;
    const currencyVal = activeOffering.currency || activeOffering.commercialInformation?.currency || "USD";
    const symbol = currencyVal === "EUR" ? "€" : currencyVal === "TRY" ? "₺" : currencyVal === "GBP" ? "£" : "$";
    const formattedPrice = priceVal
      ? (priceVal.includes("$") || priceVal.includes("€") || priceVal.includes("₺") || priceVal.includes("£") ? priceVal : `${symbol}${priceVal}`)
      : activeOffering.commercialInformation?.pricingGuidance;

    if (formattedPrice) {
      list.unshift({ label: "PRICE / GUIDANCE", value: formattedPrice });
    }

    if (list.length === 0 || (list.length === 1 && formattedPrice)) {
      if (activeOffering.category) {
        list.push({ label: "CATEGORY", value: activeOffering.category });
      }
      if (activeOffering.commercialInformation?.leadTime) {
        list.push({ label: "LEAD TIME", value: activeOffering.commercialInformation.leadTime });
      }
      if (activeOffering.certifications && activeOffering.certifications.length > 0) {
        list.push({ label: "CERTIFICATIONS", value: activeOffering.certifications.join(" • ") });
      }
      if (activeOffering.commercialInformation?.incoterms) {
        list.push({ label: "INCOTERMS", value: activeOffering.commercialInformation.incoterms });
      }
    }
    return list;
  }, [activeOffering]);

  const allSpecEntries = useMemo(() => {
    return Object.entries(activeOffering.specifications || {});
  }, [activeOffering]);

  // Certified Real Engineering Documents (Grounding Sources & Attached PDF Blueprints)
  const downloadDocs = useMemo(() => {
    const docs: Array<{
      id: string;
      title: string;
      type: string;
      size: string;
      badge: string;
      code: string;
      url?: string;
      isDrive?: boolean;
    }> = [];

    // Add Grounding Sources
    if (Array.isArray(activeOffering.groundingSources)) {
      activeOffering.groundingSources.forEach((src, idx) => {
        const isDrive = src.origin === "GOOGLE_DRIVE" || Boolean(src.drivePath) || src.url?.includes("drive.google.com");
        docs.push({
          id: src.id || `gsrc-${idx}`,
          title: src.title || src.filename || `${activeOffering.name} Datasheet`,
          type: (src.fileType || "PDF SPEC").toUpperCase(),
          size: src.size || "1.5 MB",
          badge: isDrive ? "GOOGLE DRIVE" : "VERIFIED DOC",
          code: src.filename || `DOC-${offeringCode}-${idx + 1}`,
          url: src.url,
          isDrive,
        });
      });
    }

    // Add PDF Blueprints / Documents from media references if not already in list
    const mediaSources =
      (activeOffering as any).mediaReferences ||
      (activeOffering as any).media ||
      [];
    if (Array.isArray(mediaSources)) {
      mediaSources.forEach((m: any, idx: number) => {
        const lower = (m.url || "").toLowerCase();
        const isDoc =
          lower.includes(".pdf") ||
          lower.includes(".docx") ||
          lower.includes(".xlsx") ||
          lower.includes(".txt") ||
          m.type === "drawing" ||
          m.type === "document";

        if (isDoc && !docs.some((d) => d.url === m.url)) {
          const isDrive = m.url?.includes("drive.google.com");
          docs.push({
            id: m.id || `med-pdf-${idx}`,
            title: m.title || `${activeOffering.name} — Technical Blueprint / Schematic`,
            type: lower.includes(".xlsx") ? "XLSX SPREADSHEET" : lower.includes(".docx") ? "DOCX SPEC" : "PDF DOCUMENT",
            size: "Technical Doc",
            badge: isDrive ? "GOOGLE DRIVE" : "TECHNICAL RESOURCE",
            code: `CAD-${offeringCode}-${idx + 1}`,
            url: m.url,
            isDrive,
          });
        }
      });
    }

    return docs;
  }, [activeOffering, offeringCode]);

  // Scroll chat
  useEffect(() => {
    if (chatMessages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isGenerating]);

  // Send message to AI Advisor
  const handleSendMessage = async (textToSend?: string) => {
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

    try {
      // Enrich grounding sources with cached base64 from memory or sessionStorage
      const sourcesWithB64 = (activeOffering.groundingSources || []).map((src) => {
        if ((src as any).base64Data) return src;
        const fromCache = pdfBase64Cache.get(src.filename) || pdfBase64Cache.get(src.title) || pdfBase64Cache.get(activeOffering.id);
        const fromSession = typeof sessionStorage !== "undefined"
          ? (sessionStorage.getItem(`mw_pdf_${src.filename}`) || sessionStorage.getItem(`mw_pdf_${src.title}`) || sessionStorage.getItem(`mw_pdf_${activeOffering.id}`))
          : null;
        if (fromCache || fromSession) {
          return {
            ...src,
            base64Data: fromCache || fromSession,
          };
        }
        return src;
      });

      const enrichedForAdvisor: CompanyOffering = {
        ...activeOffering,
        groundingSources: sourcesWithB64,
        okfDocument: activeOfferingOKFDoc,
      };
      const response = await generateAdvisorAnswer(q, enrichedForAdvisor, displayName, sectorCityLabel);
      
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
              incotermsRules: activeOffering.commercialInformation?.incoterms || "EXW / FOB Shipyard Gate",
              jurisdiction: sectorCityLabel,
              milestonePricing: "30% Advance Deposit / 70% Milestone Settlement upon FAT",
              leadTime: activeOffering.commercialInformation?.leadTime || "Standard production slot",
              warranty: activeOffering.commercialInformation?.warranty || "24-Month Marine Guarantee",
            }
          : undefined,
        sources: response.sources,
        actionSuggestion: response.action,
      };
      setChatMessages((prev) => [...prev, advisorMsg]);
    } catch (err) {
      console.warn("[ProductExperienceModal] Advisor answer error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Consolidated Quick Prompt Chips (NO DUPLICATES, NO REDUNDANT RFQ CHIP)
  const quickPromptChips = useMemo(() => [
    { label: "Technical Specs", query: `What are the certified technical specifications and operational parameters for ${activeOffering.name}?` },
    { label: "Suitability & Applications", query: `What are the primary operational applications and vessel use cases for ${activeOffering.name}?` },
    { label: "Compliance & Class", query: `Which classification society approvals (DNV, ABS, LR) and standards apply to ${activeOffering.name}?` },
    { label: "Availability & Delivery", query: `What is the delivery timeline, production lead time, and availability?` },
    { label: "Commercial Terms & Pricing", query: `What are the commercial milestone terms, pricing guidance, and Incoterms?` },
  ], [activeOffering]);

  // File Download / Open Handler
  const handleDownloadDoc = (docTitle: string, docCode: string, docUrl?: string) => {
    if (docUrl) {
      window.open(docUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const content = `=================================================================\n` +
      `MARINEWORLD CANONICAL RECORD — OFFICIAL TECHNICAL SPECIFICATION\n` +
      `Entity: ${activeOffering.name}\n` +
      `Reference ID: ${docCode}\n` +
      `Issuing Node: ${displayName} (${sectorCityLabel})\n` +
      `Verification Timestamp: ${new Date().toISOString()}\n` +
      `=================================================================\n\n` +
      `EXECUTIVE SUMMARY:\n${activeOffering.shortDescription || activeOffering.description || ""}\n\n` +
      `SPECIFICATION PARAMETERS:\n` +
      Object.entries(activeOffering.specifications || {}).map(([k, v]) => `• ${k}: ${v}`).join("\n") +
      `\n\nCOMMERCIAL & INCOTERMS RULES:\n` +
      `• Delivery Basis: ${activeOffering.commercialInformation?.incoterms || "EXW / FOB"}\n` +
      `• Lead Time: ${activeOffering.commercialInformation?.leadTime || "Standard"}\n` +
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

  // Construct direct link to this offering modal based on current origin & routing
  const directOfferingUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const origin = window.location.origin;
    const compSlug =
      company?.slug ||
      company?.id ||
      activeOffering?.companySlug ||
      activeOffering?.companyId ||
      "company";
    const offSlug =
      activeOffering?.slug ||
      activeOffering?.id ||
      activeOffering?.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
      "offering";
    const isServiceType = activeOffering?.type === "service";
    const moduleName = isServiceType ? "services" : "products";

    const basePath = window.location.pathname.startsWith("/company/") ? "/company" : "/companies";
    return `${origin}${basePath}/${encodeURIComponent(compSlug)}/${moduleName}/${encodeURIComponent(offSlug)}`;
  }, [company, activeOffering]);

  // Stage 14.5 — Universal AI & Google SEO Rich Metadata / JSON-LD Injection
  // Exposes 100% of the OKF dataset (specifications, certifications, boundaries, commercial parameters)
  // to Googlebot, GPTBot, ClaudeBot, PerplexityBot, Gemini, and search engines.
  useEffect(() => {
    if (!activeOfferingOKFDoc) return;
    const schema = buildOKFSchemaOrg(activeOfferingOKFDoc, company, directOfferingUrl);
    injectJsonLd(schema, "okf-offering-dataset-jsonld");

    const cleanupMeta = injectOKFMetaAndLinks(activeOfferingOKFDoc, company, directOfferingUrl);
    return () => {
      cleanupMeta();
      const s = document.getElementById("okf-offering-dataset-jsonld");
      if (s && s.parentNode) {
        s.parentNode.removeChild(s);
      }
    };
  }, [activeOfferingOKFDoc, company, directOfferingUrl]);

  const handleCopyLink = async () => {
    if (!directOfferingUrl) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(directOfferingUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = directOfferingUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.warn("Failed to copy link:", err);
    }
  };

  const canonicalUrl = activeOffering.canonicalUrl || directOfferingUrl;

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
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 rounded-card-xs bg-white border border-line px-2.5 py-1 text-[11px] font-bold text-graphite hover:text-royal hover:border-royal transition cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
              title={`Copy direct link: ${directOfferingUrl}`}
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
                { id: "downloads", label: `DOCUMENTS (${downloadDocs.length})`, icon: FolderDown },
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

                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <h1
                        id="product-modal-title"
                        className="text-xl sm:text-2xl font-extrabold text-graphite tracking-tight leading-snug uppercase font-sans"
                      >
                        {activeOffering.name}
                      </h1>

                      {(() => {
                        const priceVal = activeOffering.price || activeOffering.commercialInformation?.price;
                        const currencyVal = activeOffering.currency || activeOffering.commercialInformation?.currency || "USD";
                        const symbol = currencyVal === "EUR" ? "€" : currencyVal === "TRY" ? "₺" : currencyVal === "GBP" ? "£" : "$";
                        const formattedPrice = priceVal
                          ? (priceVal.includes("$") || priceVal.includes("€") || priceVal.includes("₺") || priceVal.includes("£") ? priceVal : `${symbol}${priceVal}`)
                          : activeOffering.commercialInformation?.pricingGuidance;
                        if (!formattedPrice) return null;
                        return (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-bold text-sm shadow-2xs">
                            <span className="text-[10px] text-emerald-600 font-medium">PRICE:</span>
                            <span>{formattedPrice}</span>
                          </span>
                        );
                      })()}
                    </div>

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
                          if (mediaGallery.length > 0) {
                            setLightboxIndex(activeMediaIndex);
                            setIsLightboxOpen(true);
                          }
                        }
                      }}
                      onClick={() => {
                        if (mediaGallery.length > 0) {
                          setLightboxIndex(activeMediaIndex);
                          setIsLightboxOpen(true);
                        }
                      }}
                      className="group relative w-full h-52 sm:h-60 rounded-card-md overflow-hidden bg-slate-950 border border-line shadow-xs cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
                    >
                      {mediaGallery.length === 0 ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-900">
                          <ImageIcon className="w-10 h-10 text-slate-600 mb-2" />
                          <p className="text-xs font-bold text-slate-300 uppercase tracking-wide">No Visual Media Uploaded</p>
                          <p className="text-[10.5px] text-slate-500 mt-1">Photos and technical drawings added in Studio will appear here</p>
                        </div>
                      ) : mediaGallery[activeMediaIndex]?.url?.toLowerCase().includes(".pdf") ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-white">
                          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3 shadow-inner group-hover:scale-105 transition-transform">
                            <FileText className="w-7 h-7" />
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-white max-w-[85%] truncate mb-1">
                            {mediaGallery[activeMediaIndex]?.title}
                          </p>
                          <span className="text-[9.5px] font-mono text-rose-400 font-extrabold uppercase tracking-wider bg-rose-950/60 px-2.5 py-1 rounded border border-rose-800/50">
                            PDF BLUEPRINT / SCHEMATIC
                          </span>
                        </div>
                      ) : !failedImages[mediaGallery[activeMediaIndex]?.url] ? (
                        <img
                          src={mediaGallery[activeMediaIndex]?.url}
                          alt={mediaGallery[activeMediaIndex]?.title}
                          onError={() => handleImageError(mediaGallery[activeMediaIndex]?.url)}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-900">
                          <ImageIcon className="w-10 h-10 text-slate-600 mb-2" />
                          <p className="text-xs font-bold text-slate-300">Image Record Unavailable</p>
                          <p className="text-[10.5px] text-slate-500 mt-1">{mediaGallery[activeMediaIndex]?.title}</p>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 pointer-events-none" />

                      {/* Top Left Media Type Badge */}
                      {mediaGallery.length > 0 && (
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
                      )}

                      {/* Top Right Position Counter & Enlarge Hint */}
                      {mediaGallery.length > 0 && (
                        <div className="absolute top-3 right-3 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-card-xs bg-slate-950/80 backdrop-blur-md text-white text-[10.5px] font-mono font-bold border border-white/20 shadow-xs">
                            {activeMediaIndex + 1} / {mediaGallery.length}
                          </span>
                          <div className="w-7 h-7 rounded-card-xs bg-slate-950/80 backdrop-blur-md text-white flex items-center justify-center border border-white/20 group-hover:bg-royal transition">
                            <Maximize2 className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      )}

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
                        const isPdf = m.url?.toLowerCase().includes(".pdf") || m.type === "technical_drawing";
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setActiveMediaIndex(idx)}
                            className={`group relative w-20 h-14 rounded-card-xs overflow-hidden border transition shrink-0 cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden ${
                              isActive
                                ? "border-royal ring-2 ring-royal/40 shadow-sm scale-105"
                                : "border-line opacity-75 hover:opacity-100 hover:border-slate-400"
                            }`}
                            title={m.title}
                            aria-label={`View thumbnail ${idx + 1} of ${mediaGallery.length}: ${m.title}`}
                          >
                            {isPdf ? (
                              <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-1 text-center group-hover:bg-slate-850 transition-colors">
                                <div className="w-6 h-6 rounded-md bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-0.5">
                                  <FileText className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-[7.5px] font-mono font-bold text-rose-300 uppercase tracking-tighter truncate max-w-[90%]">
                                  PDF
                                </span>
                              </div>
                            ) : !failedImages[m.url] ? (
                              <img src={m.url} alt={m.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-400">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}

                            <div className="absolute inset-0 bg-black/15 group-hover:bg-transparent transition" />

                            <span className={`absolute bottom-0.5 left-0.5 px-1 py-0.2 rounded text-[7.5px] font-bold uppercase tracking-tighter ${
                              isPdf ? "bg-rose-950/95 text-rose-300 border border-rose-800/60" : "bg-slate-950/90 text-white"
                            }`}>
                              {isPdf ? "PDF" : m.type === "video" ? "VIDEO" : "PHOTO"}
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
                      className="flex items-center justify-center gap-2 rounded-card-xs bg-royal hover:bg-royal-dark text-white px-4 py-3 text-xs font-extrabold transition shadow-2xs cursor-pointer uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
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
                    <div className="flex flex-wrap items-center justify-between border-b border-line pb-1.5 gap-2">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-royal" />
                        <h3 className="text-[10.5px] font-bold text-graphite uppercase tracking-[0.14em]">
                          {isService ? "Key Service Attributes" : "Key Specifications"}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        {isCompanyOwnerViewer && (
                          <button
                            type="button"
                            onClick={() => setIsOKFModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 text-cyan-400 hover:bg-slate-800 border border-cyan-500/30 text-[10.5px] font-mono font-bold transition shadow-2xs"
                            title="Inspect Open Knowledge Format and Google Knowledge Catalog Seal (Only visible to you)"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                            <span>SEALED OKF DATASHEET</span>
                            <span className="text-[9.5px] font-sans font-medium text-cyan-300/80 normal-case tracking-normal">
                              (Only visible to you)
                            </span>
                          </button>
                        )}

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
                      <span>Certified Engineering Documents ({downloadDocs.length})</span>
                    </h3>
                  </div>

                  {downloadDocs.length === 0 ? (
                    <div className="p-8 rounded-card-md border border-dashed border-slate-300 bg-slate-50 text-center space-y-2">
                      <FolderDown className="w-8 h-8 mx-auto text-slate-400" />
                      <p className="text-xs font-bold text-graphite uppercase">No Official Documents Attached</p>
                      <p className="text-xs text-stone">
                        Datasheets, certifications and blueprints uploaded in Studio will appear here for direct access.
                      </p>
                    </div>
                  ) : (
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
                            onClick={() => handleDownloadDoc(doc.title, doc.code, doc.url)}
                            className="inline-flex items-center gap-1.5 rounded-card-xs bg-canvas hover:bg-slate-950 hover:text-white text-graphite px-3 py-1.5 text-xs font-bold transition cursor-pointer shrink-0 ml-3 border border-line focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
                            aria-label={`Download ${doc.title} (${doc.code})`}
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline uppercase tracking-wider">{doc.url ? "Open / View" : "Download"}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                            {/* Exact Answer Rendered with clean Markdown / Bullet Points */}
                            {renderAdvisorMessageText(msg.text)}

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
                                    className="inline-flex items-center gap-1.5 rounded-card-xs bg-royal hover:bg-royal-dark text-white px-3 py-1.5 text-xs font-bold transition shadow-2xs cursor-pointer uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
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
                                    className="inline-flex items-center gap-1.5 rounded-card-xs bg-royal hover:bg-royal-dark text-white px-3 py-1.5 text-xs font-bold transition shadow-2xs cursor-pointer uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
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
                  className="px-3.5 py-1.5 rounded-card-xs bg-royal hover:bg-royal-dark text-white disabled:opacity-40 disabled:hover:bg-royal transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
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
              const rawImage =
                (item as any).coverImage ||
                (item as any).primaryImage ||
                (item as any).imageUrl ||
                item.mediaReferences?.find((m: any) => m.isCover)?.url ||
                item.mediaReferences?.[0]?.url ||
                (item as any).media?.[0]?.url ||
                (item as any).gallery?.[0]?.url ||
                "";
              const isPdf = Boolean(rawImage && rawImage.toLowerCase().includes(".pdf"));

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveOfferingRaw(item);
                    if (onSelectOffering) onSelectOffering(item);
                  }}
                  className={`flex items-center gap-2 p-1.5 pr-3 rounded-card-sm border transition-all shrink-0 cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden ${
                    isCurrent
                      ? "bg-white border-royal ring-1 ring-royal/30 shadow-xs"
                      : "bg-white/80 border-line hover:border-slate-300 hover:bg-white"
                  }`}
                  aria-label={`View offering: ${item.name}`}
                >
                  <div className="w-9 h-7 rounded-card-xs overflow-hidden bg-slate-100 border border-line flex items-center justify-center shrink-0">
                    {isPdf ? (
                      <div className="w-full h-full bg-slate-900 text-rose-400 flex items-center justify-center">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                    ) : rawImage ? (
                      <img
                        src={rawImage}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100 text-stone flex items-center justify-center">
                        {item.type === "service" ? (
                          <Wrench className="w-3.5 h-3.5" />
                        ) : (
                          <Package className="w-3.5 h-3.5" />
                        )}
                      </div>
                    )}
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

              <div className="flex-1 flex flex-col items-center justify-center p-2 max-h-[62vh] min-h-0 bg-canvas/50 rounded-card-md border border-line/60 mx-2 overflow-auto">
                {mediaGallery[lightboxIndex]?.url?.toLowerCase().includes(".pdf") ? (
                  <div className="w-full h-full flex flex-col items-center justify-center space-y-3 p-4">
                    <iframe
                      src={getEmbeddableDocumentUrl(mediaGallery[lightboxIndex]?.url)}
                      title={mediaGallery[lightboxIndex]?.title || "PDF Document"}
                      className="w-full h-[55vh] rounded-xl border border-slate-300 bg-white shadow-sm"
                    />
                    <div className="flex items-center justify-between w-full px-2 text-xs text-stone">
                      <span>Official PDF Blueprint Document</span>
                      <a
                        href={mediaGallery[lightboxIndex]?.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded-lg bg-royal text-white font-bold flex items-center gap-1.5 hover:bg-royal/90 transition shadow-2xs text-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in New Tab</span>
                      </a>
                    </div>
                  </div>
                ) : !failedImages[mediaGallery[lightboxIndex]?.url] ? (
                  <div className="relative max-h-full max-w-full flex items-center justify-center">
                    <img
                      src={formatMediaImageUrl(mediaGallery[lightboxIndex]?.url)}
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
                {mediaGallery.map((m, idx) => {
                  const isPdf = m.url?.toLowerCase().includes(".pdf") || m.type === "technical_drawing";
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setLightboxIndex(idx)}
                      className={`w-14 h-10 rounded-card-xs overflow-hidden border transition cursor-pointer shrink-0 relative focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden ${
                        lightboxIndex === idx ? "border-royal ring-2 ring-royal/30 shadow-xs" : "border-line opacity-60 hover:opacity-100"
                      }`}
                      aria-label={`Jump to media ${idx + 1}: ${m.title}`}
                    >
                      {isPdf ? (
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center text-rose-400">
                          <FileText className="w-4 h-4" />
                        </div>
                      ) : (
                        <img src={m.url} alt={m.title} className="w-full h-full object-cover" />
                      )}
                    </button>
                  );
                })}
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
        url={directOfferingUrl || canonicalUrl || ""}
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

      {/* Sealed OKF Document & Knowledge Catalog Seal Inspector Modal */}
      {isCompanyOwnerViewer && isOKFModalOpen && (
        <OKFDocumentViewerModal
          isOpen={isOKFModalOpen}
          onClose={() => setIsOKFModalOpen(false)}
          okfDoc={activeOfferingOKFDoc}
        />
      )}

      {/* 
        Stage 14.5 — Universal AI & Google SEO Semantic Grounding Microdata Section
        Accessible to Googlebot, GPTBot, ClaudeBot, Gemini, Perplexity, and Web Crawlers.
        Injects full microdata & technical specifications directly into the DOM tree.
      */}
      <section
        id="okf-structured-dataset"
        className="sr-only"
        aria-label="Authoritative Technical Datasheet for AI and Search Engine Indexing"
        itemScope
        itemType={activeOffering.type === "service" ? "https://schema.org/Service" : "https://schema.org/Product"}
      >
        <meta itemProp="name" content={activeOfferingOKFDoc.title} />
        <meta itemProp="description" content={activeOfferingOKFDoc.summaryText} />
        <meta itemProp="sku" content={activeOfferingOKFDoc.knowledgeCatalogSeal.sealId} />
        <meta itemProp="url" content={directOfferingUrl} />
        <span itemProp="brand" itemScope itemType="https://schema.org/Organization">
          <meta itemProp="name" content={displayName} />
        </span>

        <h2>{activeOfferingOKFDoc.title} — Verified Engineering Datasheet</h2>
        <p>{activeOfferingOKFDoc.summaryText}</p>

        <div>
          <h3>Google Knowledge Catalog Seal & Digital Notarization</h3>
          <p>Seal ID: {activeOfferingOKFDoc.knowledgeCatalogSeal.sealId}</p>
          <p>Cryptographic Digest SHA-256: {activeOfferingOKFDoc.knowledgeCatalogSeal.hashSha256}</p>
          <p>Status: {activeOfferingOKFDoc.knowledgeCatalogSeal.status}</p>
          <p>Authority: {activeOfferingOKFDoc.knowledgeCatalogSeal.authority}</p>
          <p>Source Origin: {activeOfferingOKFDoc.lineage.sourceOrigin} ({activeOfferingOKFDoc.lineage.originalFileName || "Direct Input"})</p>
        </div>

        {activeOfferingOKFDoc.specifications.length > 0 && (
          <div>
            <h3>Verified Technical Specifications</h3>
            <table>
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Value</th>
                  <th>Unit</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {activeOfferingOKFDoc.specifications.map((spec, idx) => (
                  <tr key={idx} itemProp="additionalProperty" itemScope itemType="https://schema.org/PropertyValue">
                    <td itemProp="name">{spec.label || spec.key}</td>
                    <td itemProp="value">{spec.value}</td>
                    <td>{spec.unit || ""}</td>
                    <td itemProp="valueReference">{(spec.confidence * 100).toFixed(0)}% AI Verified</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeOfferingOKFDoc.certifications.length > 0 && (
          <div>
            <h3>Certifications & Class Standards</h3>
            <ul>
              {activeOfferingOKFDoc.certifications.map((cert, idx) => (
                <li key={idx} itemProp="hasCertification" itemScope itemType="https://schema.org/Certification">
                  <span itemProp="name">{cert}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeOfferingOKFDoc.commercialParameters && (
          <div itemProp="offers" itemScope itemType="https://schema.org/Offer">
            <h3>Commercial Terms</h3>
            <p>
              Price: <span itemProp="price">{activeOfferingOKFDoc.commercialParameters.price || "Contact for Quote"}</span>{" "}
              <span itemProp="priceCurrency">{activeOfferingOKFDoc.commercialParameters.currency || "USD"}</span>
            </p>
            <p>Pricing Model: {activeOfferingOKFDoc.commercialParameters.pricingModel || "Standard"}</p>
            {activeOfferingOKFDoc.commercialParameters.leadTimeDays && (
              <p>Lead Time: {activeOfferingOKFDoc.commercialParameters.leadTimeDays} days</p>
            )}
          </div>
        )}

        {activeOfferingOKFDoc.operationalBoundaries && activeOfferingOKFDoc.operationalBoundaries.length > 0 && (
          <div>
            <h3>Operational Scope & Applications</h3>
            <ul>
              {activeOfferingOKFDoc.operationalBoundaries.map((b, idx) => (
                <li key={idx}>{b}</li>
              ))}
            </ul>
          </div>
        )}

        <article>
          <h3>Open Knowledge Format Raw Specification</h3>
          <pre>{activeOfferingOKFDoc.fullOkfMarkdown}</pre>
        </article>
      </section>
    </div>
  );
}

/**
 * Intelligent Grounded Response Generator for Product/Service AI Advisor
 */
async function generateAdvisorAnswer(
  query: string,
  offering: CompanyOffering,
  companyName: string,
  sectorCity?: string
): Promise<{
  text: string;
  detailedNotes?: string;
  sources: string[];
  action?: { label: string; type: "DOWNLOAD_PDF" | "RFQ" | "SPECS" | "AVAILABILITY" };
}> {
  const result = await answerOfferingAdvisorQueryAsync(offering, query, companyName, sectorCity);
  
  let action: { label: string; type: "DOWNLOAD_PDF" | "RFQ" | "SPECS" | "AVAILABILITY" } | undefined;
  if (result.suggestedAction === "REQUEST_OFFER" || result.suggestedAction === "COMMERCIAL_RFQ") {
    action = { label: "Request official offer", type: "RFQ" };
  } else if (result.suggestedAction === "VIEW_SPECS") {
    action = { label: "View Full Specs", type: "SPECS" };
  } else if (result.suggestedAction === "REQUEST_AVAILABILITY") {
    action = { label: "Request Availability / Slot", type: "AVAILABILITY" };
  }

  return {
    text: stripOKFTerminology(result.answer),
    detailedNotes: result.detailedNotes ? stripOKFTerminology(result.detailedNotes) : undefined,
    sources: (result.sourcesUsed || []).map(stripOKFTerminology),
    action,
  };
}

/**
 * Text renderer helper to parse markdown bold, italic, code, and bullet lists cleanly without raw asterisks
 */
function renderAdvisorMessageText(text: string) {
  if (!text) return null;

  const lines = text.split("\n");
  return (
    <div className="space-y-2 text-[12.5px] leading-relaxed text-slate-800">
      {lines.map((rawLine, idx) => {
        const trimmed = rawLine.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Detect if line is a bullet item (e.g., "* ", "- ", "• ", "  * ", "* *", etc.)
        const isSubBullet = rawLine.startsWith("    ") || rawLine.startsWith("\t") || rawLine.startsWith("  *") || rawLine.startsWith("  -");
        const isBullet = isSubBullet || trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* *");

        // Clean out leading bullet symbols from text content
        let contentLine = trimmed;
        if (isBullet) {
          contentLine = contentLine.replace(/^(\*\s*|\-\s*|•\s*)+/, "").trim();
        }

        // Parse inline markdown: **bold**, `code`, *italic*
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
              <code key={pIdx} className="font-mono text-royal bg-canvas border border-line px-1 py-0.5 rounded text-[11px]">
                {part.slice(1, -1)}
              </code>
            );
          }
          // Clean stray asterisks from text parts
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

        return (
          <p key={idx} className="leading-relaxed text-slate-800">
            {parsedContent}
          </p>
        );
      })}
    </div>
  );
}
