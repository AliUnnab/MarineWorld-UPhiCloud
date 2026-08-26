import React, { useState, useEffect, useRef } from "react";
import type { CompanyOffering, CompanyProfile, CompanyEntity, SectorCity, IndustryDomainEntity } from "@/lib/types";
import { submitCommercialInquiry, submitOfficialOfferRequest } from "@/lib/connectStore";
import { getCurrentAuthSession } from "@/lib/services/securityService";
import { checkFormAbuse, sanitizeInputString, isValidEmailAddress } from "@/lib/security/abuseProtection";
import {
  X,
  ShieldCheck,
  Send,
  Building,
  CheckCircle2,
  ExternalLink,
  Handshake,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  FileText,
  Anchor,
  HelpCircle,
  MessageSquare,
} from "lucide-react";

export interface CommercialInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  offering: CompanyOffering;
  parentCompany: CompanyProfile | CompanyEntity;
  primaryCity?: SectorCity;
  parentDomain?: IndustryDomainEntity;
  initialMode?: "INQUIRY" | "OFFICIAL_OFFER";
  onOpenAIAdvisor?: (prefillPrompt?: string) => void;
}

export function CommercialInquiryModal({
  isOpen,
  onClose,
  offering,
  parentCompany,
  primaryCity,
  parentDomain,
  initialMode = "INQUIRY",
  onOpenAIAdvisor,
}: CommercialInquiryModalProps) {
  const [activeStage, setActiveStage] = useState<"INQUIRY" | "OFFICIAL_OFFER">(initialMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [submittedData, setSubmittedData] = useState<{
    referenceId: string;
    stage: "INQUIRY" | "OFFICIAL_OFFER";
  } | null>(null);

  // Initial Form State
  const [fullName, setFullName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [quantityOrScope, setQuantityOrScope] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [message, setMessage] = useState("");

  // Official Offer Stage Specific State
  const [incoterms, setIncoterms] = useState("FCA");
  const [deliveryPort, setDeliveryPort] = useState("");
  const [customEngineeringReq, setCustomEngineeringReq] = useState("");
  const [commercialRequirements, setCommercialRequirements] = useState("");
  const [deliveryTimeline, setDeliveryTimeline] = useState("");
  const [warrantyRequirements, setWarrantyRequirements] = useState("Standard OEM 24-Month Marine Warranty");

  // Accessibility & Focus Trap Refs
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Seamless Stage Switching with state preservation
  const handleSwitchStage = (newStage: "INQUIRY" | "OFFICIAL_OFFER") => {
    if (newStage === "OFFICIAL_OFFER") {
      if (!deliveryPort && deliveryLocation) {
        setDeliveryPort(deliveryLocation);
      }
    } else {
      if (!deliveryLocation && deliveryPort) {
        setDeliveryLocation(deliveryPort);
      }
    }
    setActiveStage(newStage);
  };

  // Sync initial mode & reset on open
  useEffect(() => {
    if (isOpen) {
      setActiveStage(initialMode);
      setSubmittedData(null);
      setIsSubmitting(false);

      // Sync delivery location to delivery port if already present
      if (deliveryLocation && !deliveryPort) {
        setDeliveryPort(deliveryLocation);
      }

      // Prepopulate default message if blank
      if (!message) {
        const offeringTypeLabel = offering.type === "service" ? "service" : "product";
        setMessage(
          `We are interested in your ${offeringTypeLabel} "${offering.name}". Please confirm commercial availability, batch lead time, and technical compliance for our operations.`
        );
      }
    }
  }, [isOpen, initialMode, offering]);

  // Focus trap and keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";

    // Focus initial input inside modal
    const focusTimeout = setTimeout(() => {
      const firstInput = modalContainerRef.current?.querySelector<HTMLElement>(
        "input:not([disabled]), textarea:not([disabled]), button:not([disabled])"
      );
      firstInput?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && modalContainerRef.current) {
        const focusableElements = modalContainerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const focusable = Array.from(focusableElements).filter(
          (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement
        );

        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || !modalContainerRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement || !modalContainerRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(focusTimeout);
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
      previousActiveElementRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const companyDisplayName =
    parentCompany.displayName || (parentCompany as any).name || parentCompany.legalName || "Verified Provider";
  const companySlug = (parentCompany as any).slug || parentCompany.id;
  const isCompanyVerified = String((parentCompany as any).verificationStatus || "VERIFIED").toLowerCase().includes("verified");
  const logoSrc = (parentCompany as any).logoUrl || (parentCompany as any).logo || null;
  const sectorCityName =
    primaryCity?.domain || primaryCity?.slug || (parentCompany as any).sectorCityIds?.[0] || "Global Registry";
  const canonicalSlug = offering.slug || (offering as any).productCode || `offering-${(offering.id || "").slice(-6)}`;
  const offeringCode = (offering as any).productCode || (offering as any).code || canonicalSlug.toUpperCase();
  const offeringTypeLabel = offering.type ? offering.type.toUpperCase() : "OFFERING";

  // Derive Canonical URL
  const origin = typeof window !== "undefined" ? window.location.origin : "https://marineworld.city";
  const canonicalUrl = `${origin}/offerings/${offering.slug || canonicalSlug}`;

  // Submit Initial Commercial Inquiry
  const handleSubmitInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = sanitizeInputString(fullName);
    const cleanEmail = sanitizeInputString(businessEmail);
    const cleanOrg = sanitizeInputString(organization);
    const cleanMsg = sanitizeInputString(message);
    const cleanQty = sanitizeInputString(quantityOrScope);
    const cleanLocation = sanitizeInputString(deliveryLocation);

    if (!cleanName || !cleanEmail || !cleanOrg || !cleanMsg) {
      setFormError("Please fill in all mandatory fields (Full Name, Business Email, Organization, Message).");
      return;
    }

    if (!isValidEmailAddress(cleanEmail)) {
      setFormError("Please provide a valid institutional or business email address.");
      return;
    }

    const abuseCheck = checkFormAbuse({
      formId: `inquiry_modal_${offering.id}`,
      honeypotValue: honeypot,
    });

    if (!abuseCheck.allowed) {
      setFormError(abuseCheck.reason || "Submission temporarily throttled. Please wait a moment.");
      return;
    }

    setIsSubmitting(true);

    try {
      const session = getCurrentAuthSession();
      const currentUid = session.uid || "usr-owner-001";

      const createdInquiry = submitCommercialInquiry({
        companyId: parentCompany.id,
        companySlug,
        companyName: companyDisplayName,
        requesterId: currentUid,
        offeringId: offering.id,
        offeringType: offering.type || "product",
        offeringName: offering.name,
        offeringCode,
        canonicalUrl,
        sectorCity: primaryCity?.slug || "general",
        industryDomain: parentDomain?.slug || "marine",
        requesterName: cleanName,
        businessEmail: cleanEmail,
        organization: cleanOrg,
        quantityOrScope: cleanQty || undefined,
        deliveryLocation: cleanLocation || undefined,
        message: cleanMsg,
      });

      setTimeout(() => {
        setIsSubmitting(false);
        setSubmittedData({
          referenceId: createdInquiry.inquiryId,
          stage: "INQUIRY",
        });
      }, 500);
    } catch (err: any) {
      setIsSubmitting(false);
      setFormError(err?.message || "Failed to submit inquiry. Please try again.");
    }
  };

  // Submit Official Offer Request
  const handleSubmitOfficialOffer = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = sanitizeInputString(fullName);
    const cleanEmail = sanitizeInputString(businessEmail);
    const cleanOrg = sanitizeInputString(organization);
    const cleanMsg = sanitizeInputString(message);
    const cleanQty = sanitizeInputString(quantityOrScope);
    const cleanPort = sanitizeInputString(deliveryPort || deliveryLocation);

    if (!cleanName || !cleanEmail || !cleanOrg) {
      setFormError("Please fill in all mandatory identity fields (Full Name, Business Email, Organization).");
      return;
    }

    if (!isValidEmailAddress(cleanEmail)) {
      setFormError("Please provide a valid institutional or business email address.");
      return;
    }

    const abuseCheck = checkFormAbuse({
      formId: `offer_modal_${offering.id}`,
      honeypotValue: honeypot,
    });

    if (!abuseCheck.allowed) {
      setFormError(abuseCheck.reason || "Submission temporarily throttled. Please wait a moment.");
      return;
    }

    setIsSubmitting(true);

    try {
      const session = getCurrentAuthSession();
      const currentUid = session.uid || "usr-owner-001";

      const createdOffer = submitOfficialOfferRequest({
        companyId: parentCompany.id,
        companySlug,
        companyName: companyDisplayName,
        requesterId: currentUid,
        offeringId: offering.id,
        offeringType: offering.type || "product",
        offeringName: offering.name,
        offeringCode,
        canonicalUrl,
        sectorCity: primaryCity?.slug || "general",
        industryDomain: parentDomain?.slug || "marine",
        requesterName: cleanName,
        businessEmail: cleanEmail,
        organization: cleanOrg,
        incoterms,
        deliveryPort: cleanPort || undefined,
        quantityOrScope: cleanQty || undefined,
        engineeringRequirements: sanitizeInputString(customEngineeringReq) || undefined,
        commercialRequirements: sanitizeInputString(commercialRequirements) || undefined,
        deliveryTimeline: sanitizeInputString(deliveryTimeline) || undefined,
        warrantyRequirements: sanitizeInputString(warrantyRequirements) || undefined,
        message: cleanMsg || undefined,
      });

      setTimeout(() => {
        setIsSubmitting(false);
        setSubmittedData({
          referenceId: createdOffer.offerRequestId,
          stage: "OFFICIAL_OFFER",
        });
      }, 600);
    } catch (err: any) {
      setIsSubmitting(false);
      setFormError(err?.message || "Failed to submit request. Please try again.");
    }
  };

  return (
    <div
      id="commercial-inquiry-portal-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs font-sans animate-in fade-in duration-200"
    >
      <div
        ref={modalContainerRef}
        className="relative w-full max-w-2xl bg-white rounded-card-md sm:rounded-card-lg border border-line shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="commercial-inquiry-title"
      >
        {/* TOP CONTEXT BAR (Permanent Context Preservation) */}
        <div className="bg-canvas border-b border-line px-5 py-3.5 sm:px-6 sm:py-4 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono font-bold text-royal uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-royal" />
              <span>COMMERCIAL INQUIRY</span>
              <span className="text-slate-300">•</span>
              <span className="text-stone font-semibold">{offeringTypeLabel}</span>
              <span className="text-slate-300">•</span>
              <span className="text-stone font-semibold">{sectorCityName}</span>
            </div>

            <button
              type="button"
              id="btn-close-commercial-inquiry"
              aria-label="Close commercial inquiry dialog"
              onClick={onClose}
              className="p-1.5 text-stone hover:text-graphite hover:bg-white rounded-md transition cursor-pointer focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Offering Title + Muted Ref Slug Caption (Fix 1 & Fix 3) */}
          <div className="space-y-0.5">
            <h2
              id="commercial-inquiry-title"
              className="text-base sm:text-lg font-extrabold text-graphite tracking-tight uppercase leading-snug break-words"
            >
              {offering.name}
            </h2>
            <p className="text-[11px] font-mono text-stone">
              Ref: {canonicalSlug}
            </p>
          </div>

          {/* Elevated Company Identity Card (Fix 2) */}
          <div className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-card-md border border-line bg-white shadow-2xs">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              {/* Medallion Avatar with double-ring accent border */}
              <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-royal p-[2px] bg-white shadow-2xs">
                <div className="flex h-full w-full items-center justify-center rounded-full border border-line bg-canvas overflow-hidden font-sans text-xs font-bold text-graphite">
                  {logoSrc && !logoError ? (
                    <img
                      src={logoSrc}
                      alt={companyDisplayName}
                      className="h-full w-full object-contain p-0.5 rounded-full"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <span>{(parentCompany as any).initials || companyDisplayName.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
              </div>

              {/* Name and Inline Verified */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-graphite text-[13px] sm:text-[13.5px] truncate">
                    {companyDisplayName}
                  </span>
                  {isCompanyVerified && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 whitespace-nowrap">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right side: View company button */}
            <a
              href={`/companies/${companySlug}`}
              target="_blank"
              rel="noopener noreferrer"
              id="btn-view-company-from-inquiry"
              className="inline-flex items-center gap-1 rounded-card-xs border border-line bg-white hover:bg-slate-50 text-slate-700 hover:text-royal px-2.5 py-1 text-xs font-semibold transition cursor-pointer shrink-0 shadow-2xs focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
              aria-label={`View ${companyDisplayName} company profile`}
            >
              <span>View company</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-stone" />
            </a>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* SINGLE MODE SWITCH TOGGLE (Unified control between Quick Inquiry and Official Offer) */}
          {!submittedData && (
            <div className="p-1 bg-canvas rounded-card-xs border border-line flex items-center gap-1">
              <button
                type="button"
                id="tab-inquiry-mode"
                aria-label="Switch to Quick Inquiry mode"
                onClick={() => handleSwitchStage("INQUIRY")}
                className={`flex-1 py-1.5 px-3 rounded-card-xs text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden ${
                  activeStage === "INQUIRY"
                    ? "bg-white text-royal border border-line shadow-2xs"
                    : "text-stone hover:text-graphite hover:bg-white/50"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Quick Inquiry</span>
              </button>
              <button
                type="button"
                id="tab-official-offer-mode"
                aria-label="Switch to Official Offer (RFQ) mode"
                onClick={() => handleSwitchStage("OFFICIAL_OFFER")}
                className={`flex-1 py-1.5 px-3 rounded-card-xs text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden ${
                  activeStage === "OFFICIAL_OFFER"
                    ? "bg-white text-royal border border-line shadow-2xs"
                    : "text-stone hover:text-graphite hover:bg-white/50"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Official Offer (RFQ)</span>
              </button>
            </div>
          )}

          {/* SUCCESS DISPATCHED SCREEN */}
          {submittedData ? (
            <div className="py-6 sm:py-8 text-center space-y-4 max-w-md mx-auto animate-in fade-in">
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-graphite uppercase tracking-tight">
                  {submittedData.stage === "OFFICIAL_OFFER"
                    ? "OFFICIAL OFFER REQUEST REGISTERED"
                    : "COMMERCIAL INQUIRY DISPATCHED"}
                </h3>
                <p className="text-xs text-stone mt-1 leading-relaxed">
                  Your transmission has been logged and routed directly to the verified commercial desk of{" "}
                  <strong className="text-graphite">{companyDisplayName}</strong>.
                </p>
              </div>

              <div className="p-4 bg-canvas rounded-card-xs border border-line text-left font-mono text-[11.5px] space-y-2 text-stone">
                <div className="flex justify-between border-b border-line/60 pb-1.5">
                  <span className="text-mute">Transmission Ref:</span>
                  <span className="font-bold text-royal">{submittedData.referenceId}</span>
                </div>
                <div className="flex justify-between border-b border-line/60 pb-1.5">
                  <span className="text-mute">Recipient:</span>
                  <span className="font-semibold text-graphite">{companyDisplayName}</span>
                </div>
                <div className="flex justify-between border-b border-line/60 pb-1.5">
                  <span className="text-mute">Offering:</span>
                  <span className="font-semibold text-graphite truncate max-w-[200px]">{offering.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mute">Response SLA:</span>
                  <span className="font-bold text-emerald-700">&le; 24 Operating Hours</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href="/workspace/inquiries"
                  onClick={(e) => {
                    e.preventDefault();
                    onClose();
                    window.history.pushState({}, "", "/workspace/inquiries");
                    window.dispatchEvent(new PopStateEvent("popstate"));
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-card-xs bg-royal hover:bg-royal-dark text-white text-xs font-bold transition shadow-xs text-center uppercase tracking-wider inline-flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Track in My Inquiries</span>
                </a>
                <button
                  type="button"
                  id="btn-return-offering-view"
                  aria-label="Return to offering view"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-card-xs border border-line bg-white hover:bg-canvas text-graphite text-xs font-bold transition text-center uppercase tracking-wider cursor-pointer focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
                >
                  Return to Offering
                </button>
              </div>
            </div>
          ) : activeStage === "INQUIRY" ? (
            /* ============================================================
               1. INITIAL COMMERCIAL INQUIRY FORM (FAST FIRST CONTACT)
               ============================================================ */
            <form onSubmit={handleSubmitInquiry} className="space-y-4">
              {/* Invisible Honeypot */}
              <input
                type="text"
                name="inquiry_bot_trap"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                className="sr-only"
                aria-hidden="true"
              />

              {formError && (
                <div className="p-3 rounded-card-xs bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
                  {formError}
                </div>
              )}

              {/* Need Help Deciding Callout (Fix 4) */}
              {onOpenAIAdvisor && (
                <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-card-sm bg-soft/70 border border-royal/15 text-xs text-stone">
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageSquare className="w-3.5 h-3.5 text-royal shrink-0" />
                    <span className="font-medium text-slate-700 truncate">Not sure what to request?</span>
                  </div>
                  <button
                    type="button"
                    id="btn-consult-ai-advisor"
                    aria-label="Consult specialist about commercial scope"
                    onClick={() => {
                      onClose();
                      onOpenAIAdvisor(`What is the availability, lead time, and typical commercial scope for ${offering.name}?`);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-royal hover:underline cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
                  >
                    <span>Consult specialist</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Grid 1: Full Name & Business Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="input-inquiry-fullname" className="block text-[11px] font-mono font-bold text-graphite uppercase mb-1">
                    FULL NAME <span className="text-royal">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    id="input-inquiry-fullname"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alexander Wright"
                    className="w-full px-3 py-2 text-xs border border-line rounded-card-xs focus:outline-none focus:border-royal focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden bg-white transition"
                  />
                </div>

                <div>
                  <label htmlFor="input-inquiry-email" className="block text-[11px] font-mono font-bold text-graphite uppercase mb-1">
                    BUSINESS EMAIL <span className="text-royal">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    id="input-inquiry-email"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    placeholder="e.g. a.wright@maritimecompany.com"
                    className="w-full px-3 py-2 text-xs border border-line rounded-card-xs focus:outline-none focus:border-royal focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden bg-white transition"
                  />
                </div>
              </div>

              {/* Grid 2: Company / Organization & Quantity / Scope */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="input-inquiry-organization" className="block text-[11px] font-mono font-bold text-graphite uppercase mb-1">
                    COMPANY / ORGANIZATION <span className="text-royal">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    id="input-inquiry-organization"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="e.g. Southampton Fleet Operations"
                    className="w-full px-3 py-2 text-xs border border-line rounded-card-xs focus:outline-none focus:border-royal focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden bg-white transition"
                  />
                </div>

                <div>
                  <label htmlFor="input-inquiry-quantity" className="block text-[11px] font-mono font-bold text-graphite uppercase mb-1">
                    QUANTITY / SCOPE
                  </label>
                  <input
                    type="text"
                    id="input-inquiry-quantity"
                    value={quantityOrScope}
                    onChange={(e) => setQuantityOrScope(e.target.value)}
                    placeholder="e.g. 1 Unit / Batch of 500 / Turnkey"
                    className="w-full px-3 py-2 text-xs border border-line rounded-card-xs focus:outline-none focus:border-royal focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden bg-white transition"
                  />
                </div>
              </div>

              {/* Optional Field: Target Delivery / Location */}
              <div>
                <label htmlFor="input-inquiry-location" className="block text-[11px] font-mono font-bold text-graphite uppercase mb-1">
                  TARGET DELIVERY / LOCATION <span className="text-stone font-normal text-[10px] lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  id="input-inquiry-location"
                  value={deliveryLocation}
                  onChange={(e) => setDeliveryLocation(e.target.value)}
                  placeholder="e.g. Port of Rotterdam / Singapore Hub / On-site shipyard"
                  className="w-full px-3 py-2 text-xs border border-line rounded-card-xs focus:outline-none focus:border-royal focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden bg-white transition"
                />
              </div>

              {/* Message / Requirement */}
              <div>
                <label htmlFor="input-inquiry-message" className="block text-[11px] font-mono font-bold text-graphite uppercase mb-1">
                  MESSAGE / REQUIREMENT <span className="text-royal">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  id="input-inquiry-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Briefly state your timeline, technical considerations, or questions for the provider..."
                  className="w-full px-3 py-2 text-xs border border-line rounded-card-xs focus:outline-none focus:border-royal focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden bg-white resize-none transition"
                />
              </div>

              {/* CTAs & Clarification */}
              <div className="pt-2 space-y-2.5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  {/* Primary CTA */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    id="btn-send-commercial-inquiry"
                    aria-label="Send commercial inquiry"
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-card-xs bg-royal hover:bg-royal-dark text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs uppercase tracking-wider disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? "TRANSMITTING..." : "SEND COMMERCIAL INQUIRY"}</span>
                  </button>

                  {/* Secondary Action: Switch to Official Offer Request (Preserves all entered data) */}
                  <button
                    type="button"
                    id="btn-switch-to-official-offer"
                    aria-label="Switch to Official Offer (RFQ) mode with current details preserved"
                    onClick={() => handleSwitchStage("OFFICIAL_OFFER")}
                    className="px-4 py-2.5 rounded-card-xs border border-line bg-canvas hover:bg-soft text-graphite hover:text-royal font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
                  >
                    <FileText className="w-3.5 h-3.5 text-stone" />
                    <span>REQUEST OFFICIAL OFFER</span>
                  </button>
                </div>

                {/* One-line clarifying hint */}
                <p className="text-[11px] text-stone text-left leading-relaxed">
                  Quick inquiry sends a direct supplier message; Official Offer configures formal specification &amp; milestone contract terms.
                </p>
              </div>
            </form>
          ) : (
            /* ============================================================
               2. OFFICIAL OFFER FLOW (ADVANCED COMMERCIAL REQUEST STAGE)
               ============================================================ */
            <form onSubmit={handleSubmitOfficialOffer} className="space-y-4">
              {/* Invisible Honeypot */}
              <input
                type="text"
                name="offer_bot_trap"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                className="sr-only"
                aria-hidden="true"
              />

              {formError && (
                <div className="p-3 rounded-card-xs bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
                  {formError}
                </div>
              )}

              {/* Inherited Contact Fields (Pre-filled, no duplication) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="input-offer-fullname" className="block text-[10.5px] font-mono font-bold text-graphite uppercase mb-1">
                    FULL NAME <span className="text-royal">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    id="input-offer-fullname"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full px-2.5 py-1.5 text-xs border border-line rounded-card-xs focus:outline-none focus:border-royal focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="input-offer-email" className="block text-[10.5px] font-mono font-bold text-graphite uppercase mb-1">
                    BUSINESS EMAIL <span className="text-royal">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    id="input-offer-email"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    placeholder="Work Email"
                    className="w-full px-2.5 py-1.5 text-xs border border-line rounded-card-xs focus:outline-none focus:border-royal focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="input-offer-organization" className="block text-[10.5px] font-mono font-bold text-graphite uppercase mb-1">
                    ORGANIZATION <span className="text-royal">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    id="input-offer-organization"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="Organization"
                    className="w-full px-2.5 py-1.5 text-xs border border-line rounded-card-xs focus:outline-none focus:border-royal focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden bg-white"
                  />
                </div>
              </div>

              {/* Advanced Procurement Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="select-offer-incoterms" className="block text-[11px] font-mono font-bold text-graphite uppercase mb-1">
                    PREFERRED INCOTERMS
                  </label>
                  <select
                    id="select-offer-incoterms"
                    value={incoterms}
                    onChange={(e) => setIncoterms(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-line rounded-card-xs focus:outline-none focus:border-royal focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden bg-white"
                  >
                    <option value="FCA">FCA — Free Carrier (Standard)</option>
                    <option value="CIF">CIF — Cost, Insurance & Freight</option>
                    <option value="DAP">DAP — Delivered at Place</option>
                    <option value="EXW">EXW — Ex Works</option>
                    <option value="FOB">FOB — Free on Board</option>
                    <option value="CIP">CIP — Carriage and Insurance Paid</option>
                    <option value="DDP">DDP — Delivered Duty Paid</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="input-offer-port" className="block text-[11px] font-mono font-bold text-graphite uppercase mb-1">
                    DELIVERY PORT / TARGET HUB
                  </label>
                  <input
                    type="text"
                    id="input-offer-port"
                    value={deliveryPort}
                    onChange={(e) => setDeliveryPort(e.target.value)}
                    placeholder="e.g. Port of Rotterdam / Port of Houston"
                    className="w-full px-3 py-2 text-xs border border-line rounded-card-xs focus:outline-none focus:border-royal focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="input-offer-quantity" className="block text-[11px] font-mono font-bold text-graphite uppercase mb-1">
                    QUANTITY / FLEET SCOPE
                  </label>
                  <input
                    type="text"
                    id="input-offer-quantity"
                    value={quantityOrScope}
                    onChange={(e) => setQuantityOrScope(e.target.value)}
                    placeholder="e.g. 2 Ship Sets / Fleet Program (10 vessels)"
                    className="w-full px-3 py-2 text-xs border border-line rounded-card-xs focus:outline-none focus:border-royal focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="input-offer-timeline" className="block text-[11px] font-mono font-bold text-graphite uppercase mb-1">
                    DELIVERY TIMELINE / TARGET MILESTONE
                  </label>
                  <input
                    type="text"
                    id="input-offer-timeline"
                    value={deliveryTimeline}
                    onChange={(e) => setDeliveryTimeline(e.target.value)}
                    placeholder="e.g. Q4 2026 Mobilization / 30 Days SLA"
                    className="w-full px-3 py-2 text-xs border border-line rounded-card-xs focus:outline-none focus:border-royal focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden bg-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="textarea-offer-engineering" className="block text-[11px] font-mono font-bold text-graphite uppercase mb-1">
                  CUSTOM ENGINEERING REQUIREMENTS
                </label>
                <textarea
                  rows={2}
                  id="textarea-offer-engineering"
                  value={customEngineeringReq}
                  onChange={(e) => setCustomEngineeringReq(e.target.value)}
                  placeholder="Specify depth rating, classification society witnessing (DNV/ABS/Lloyd's), power voltages, interface telemetry..."
                  className="w-full px-3 py-2 text-xs border border-line rounded-card-xs focus:outline-none focus:border-royal focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden bg-white resize-none"
                />
              </div>

              <div>
                <label htmlFor="textarea-offer-commercial" className="block text-[11px] font-mono font-bold text-graphite uppercase mb-1">
                  COMMERCIAL & WARRANTY / CONTRACT REQUIREMENTS
                </label>
                <textarea
                  rows={2}
                  id="textarea-offer-commercial"
                  value={commercialRequirements}
                  onChange={(e) => setCommercialRequirements(e.target.value)}
                  placeholder="Payment milestones preference (30/70 LC), extended warranty period, sovereign compliance..."
                  className="w-full px-3 py-2 text-xs border border-line rounded-card-xs focus:outline-none focus:border-royal focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden bg-white resize-none"
                />
              </div>

              {/* Action Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  id="btn-submit-official-offer-request"
                  aria-label="Submit official offer request"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-card-xs bg-royal hover:bg-royal-dark text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs uppercase tracking-wider disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-royal focus-visible:outline-hidden"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "TRANSMITTING..." : "SUBMIT OFFICIAL OFFER REQUEST"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

