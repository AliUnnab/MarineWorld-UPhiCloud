import { useState, useMemo, type FormEvent } from "react";
import type { CompanyProfile, SectorCity, IndustryDomainEntity, SectorConfig, InquiryEntity } from "@/lib/types";
import { getCompanyProductBySlug, getCompanyServiceBySlug } from "@/lib/registry";
import { getCurrentAuthSession } from "@/lib/services/securityService";
import { createInquiry } from "@/services/inquiryService";
import { resolveMarineWorldCompanyDigitalId } from "@/lib/services/companyIdentityService";
import { checkFormAbuse, sanitizeInputString, isValidEmailAddress } from "@/lib/security/abuseProtection";
import {
  Send,
  Building2,
  Mail,
  User,
  ShieldCheck,
  Clock,
  Lock,
  CheckCircle2,
  FileText,
  Layers,
  ArrowRight,
} from "lucide-react";

/* ------------------------------------------------------------
   LOADING SKELETON
   ------------------------------------------------------------ */
export function CompanyConnectSkeleton() {
  return (
    <div className="space-y-8 animate-pulse max-w-[1180px] mx-auto">
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8">
        <div className="h-4 w-32 bg-mist rounded mb-3" />
        <div className="h-8 w-64 bg-mist rounded mb-2" />
        <div className="h-4 w-96 bg-mist rounded" />
      </div>

      <div className="rounded-card-lg border border-line bg-white p-6 h-96" />
    </div>
  );
}

/* ------------------------------------------------------------
   MAIN COMPANY CONNECT MODULE (PUBLIC-SAFE COMMERCIAL RFQ FORM)
   ------------------------------------------------------------ */
export function CompanyConnectModule({
  company,
  primaryCity,
  parentDomain,
  config,
  productSlug,
  serviceSlug,
  isLoading = false,
  isError = false,
  onRetry,
}: {
  company: CompanyProfile;
  primaryCity?: SectorCity;
  parentDomain?: IndustryDomainEntity;
  config?: SectorConfig;
  productSlug?: string;
  serviceSlug?: string;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}) {
  const currentAuth = getCurrentAuthSession();

  // Parse effective product/service slug from props or URL search params
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const effectiveProductSlug = productSlug || searchParams?.get("product") || undefined;
  const effectiveServiceSlug = serviceSlug || searchParams?.get("service") || undefined;

  const targetProduct = useMemo(() => {
    return effectiveProductSlug ? getCompanyProductBySlug(company, effectiveProductSlug) : undefined;
  }, [company, effectiveProductSlug]);

  const targetService = useMemo(() => {
    return effectiveServiceSlug ? getCompanyServiceBySlug(company, effectiveServiceSlug) : undefined;
  }, [company, effectiveServiceSlug]);

  // Dynamic context subject
  const defaultSubject = useMemo(() => {
    if (targetProduct) return `Inquiry regarding ${targetProduct.name}`;
    if (targetService) return `Service Request: ${targetService.name}`;
    return `Commercial Inquiry for ${company.displayName || company.name}`;
  }, [targetProduct, targetService, company]);

  const defaultMessage = useMemo(() => {
    if (targetProduct) {
      return `Hello ${company.displayName || company.name} Team,\n\nWe are interested in your product "${targetProduct.name}" (Code: ${targetProduct.productCode || targetProduct.id}). Please provide technical datasheets, availability schedules, and commercial delivery options for our project.`;
    }
    if (targetService) {
      return `Hello ${company.displayName || company.name} Team,\n\nWe would like to request specifications, service availability, and schedule consultation for "${targetService.name}". Please share relevant method statements and lab/field deployment availability.`;
    }
    return `Hello ${company.displayName || company.name} Team,\n\nWe would like to initiate a formal commercial inquiry regarding your marine capabilities, technical specifications, and project availability.`;
  }, [targetProduct, targetService, company]);

  // Clean initial inputs — never hardcoded test data
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);
  const [contactMethod, setContactMethod] = useState<"Platform Message" | "Email">("Platform Message");
  const [requesterName, setRequesterName] = useState(currentAuth?.displayName || "");
  const [requesterEmail, setRequesterEmail] = useState(currentAuth?.email || "");
  const [requesterCompany, setRequesterCompany] = useState("");

  // Submission lifecycle states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedInquiry, setSubmittedInquiry] = useState<InquiryEntity | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Authoritative identity info
  const digitalIdInfo = resolveMarineWorldCompanyDigitalId({
    companyIdOrSlug: company.id,
    mwCompanyDigitalId: company.mwCompanyDigitalId,
    businessId: company.businessId,
    companyId6Digit: company.companyId6Digit,
    primaryRegistryCode: company.primaryRegistryCode,
    primarySectorCityId: company.sectorCityIds?.[0] || company.cityIds?.[0] || primaryCity?.id,
  });

  const [honeypot, setHoneypot] = useState("");

  const displayName = company.displayName || company.name;
  const isVerified = (company.verificationStatus || "VERIFIED").toLowerCase().includes("verified");
  const headquartersCity = company.headquartersCity || company.city || "Rotterdam";
  const country = company.country || company.registrationCountry || "Netherlands";

  // Handle Form Submission
  const handleSubmitInquiry = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const cleanEmail = sanitizeInputString(requesterEmail);
    const cleanName = sanitizeInputString(requesterName);
    const cleanMsg = sanitizeInputString(message);
    const cleanSubject = sanitizeInputString(subject);
    const cleanCompany = sanitizeInputString(requesterCompany);

    if (!cleanName || !cleanEmail || !cleanMsg) {
      setSubmitError("Please complete all required fields (Name, Business Email, and Message).");
      return;
    }

    if (!isValidEmailAddress(cleanEmail)) {
      setSubmitError("Please enter a valid institutional or business email address.");
      return;
    }

    const abuseCheck = checkFormAbuse({
      formId: `connect_${company.id}`,
      honeypotValue: honeypot,
    });

    if (!abuseCheck.allowed) {
      setSubmitError(abuseCheck.reason || "Submission temporarily throttled. Please try again in a few seconds.");
      return;
    }

    setIsSubmitting(true);

    try {
      const inqId = `inq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newInq = await createInquiry({
        id: inqId,
        companyId: company.id,
        companySlug: company.slug || company.id,
        companyName: company.name,
        requesterId: currentAuth?.uid || `usr-pub-${Date.now()}`,
        requesterName: cleanName,
        requesterEmail: cleanEmail,
        requesterCompany: cleanCompany || "Independent Maritime Buyer",
        productId: targetProduct?.id,
        productSlug: targetProduct?.slug,
        productName: targetProduct?.name,
        serviceId: targetService?.id,
        serviceSlug: targetService?.slug,
        serviceName: targetService?.name,
        sectorId: "marine",
        sectorCityId: primaryCity?.id || company.sectorCityIds?.[0] || "southampton",
        subject: cleanSubject,
        message: cleanMsg,
        source: targetProduct ? "PRODUCT" : targetService ? "SERVICE" : "COMPANY",
        contactMethod,
        priority: "HIGH",
      });

      setSubmittedInquiry(newInq);
      setIsSubmitting(false);
    } catch (err: any) {
      setIsSubmitting(false);
      setSubmitError(err?.message || "Unable to transmit inquiry. Please check your connection and try again.");
    }
  };

  const resetForm = () => {
    setSubmittedInquiry(null);
    setSubject(defaultSubject);
    setMessage(defaultMessage);
    setSubmitError(null);
  };

  if (isLoading) {
    return <CompanyConnectSkeleton />;
  }

  if (isError) {
    return (
      <div className="rounded-card-lg border border-line bg-white p-8 md:p-12 text-center max-w-[1180px] mx-auto">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-800 mb-4 border border-amber-200">
          <Mail className="h-6 w-6" />
        </div>
        <h3 className="text-h3 text-graphite">COMMERCIAL DESK TEMPORARILY OFFLINE</h3>
        <p className="mt-2 text-[14px] text-stone max-w-md mx-auto">
          Unable to establish direct communication channel with {displayName}.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => {
              if (onRetry) onRetry();
              else window.location.reload();
            }}
            className="px-4 py-2 bg-royal text-white rounded-card text-xs font-bold tracking-wider uppercase hover:bg-royal-dark transition cursor-pointer"
          >
            RECONNECT
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1180px] mx-auto font-sans">
      {/* 01. MODULE HEADER */}
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-royal">
            <Mail className="h-4 w-4" />
            <span>COMMERCIAL INQUIRY & RFQ PROTOCOL</span>
          </div>
          <h2 className="text-h2 mt-1 text-graphite">Direct Commercial Channel</h2>
          <p className="mt-1 text-[14px] text-stone max-w-2xl font-normal leading-relaxed">
            Initiate verified commercial inquiries, technical specification requests, or formal RFQs directly with {displayName}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 text-[11.5px] font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>DESK ACTIVE</span>
          </div>
        </div>
      </div>

      {/* 02. INQUIRY CONTEXT BANNER (IF TARGETING PRODUCT/SERVICE) */}
      {(targetProduct || targetService) && (
        <div className="rounded-card-lg border border-royal/30 bg-royal/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-royal text-white shadow-xs">
              {targetProduct ? <Layers className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-royal block">
                INQUIRY SCOPE / REFERENCED OFFERING
              </span>
              <h4 className="text-[15px] font-bold text-graphite">
                {targetProduct?.name || targetService?.name}
              </h4>
              <p className="text-[12px] text-stone">
                Category: {targetProduct?.category || targetService?.category || "Marine Equipment"} • Reference: {targetProduct?.productCode || targetProduct?.id || targetService?.id}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-royal bg-white border border-royal/20 px-3 py-1.5 rounded-card-sm">
              <ShieldCheck className="h-3.5 w-3.5" />
              Direct Offering Link Attached
            </span>
          </div>
        </div>
      )}

      {/* 03. MAIN LAYOUT: SUBMISSION FORM OR CONFIRMATION */}
      {submittedInquiry ? (
        /* SUCCESS CONFIRMATION STATE */
        <div className="rounded-card-lg border border-emerald-200 bg-white p-8 md:p-12 shadow-xs text-center space-y-6 animate-fade-in">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-xs">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <h3 className="text-h3 text-graphite">COMMERCIAL INQUIRY TRANSMITTED</h3>
            <p className="text-[14px] text-stone leading-relaxed">
              Your inquiry has been encrypted and routed directly to the verified commercial desk of <strong className="text-graphite font-semibold">{displayName}</strong>.
            </p>
          </div>

          <div className="rounded-card-md border border-line bg-canvas p-6 max-w-md mx-auto text-left space-y-3">
            <div className="flex justify-between items-center text-[12px] border-b border-line pb-2">
              <span className="text-stone font-medium">Reference Protocol ID:</span>
              <span className="font-mono font-bold text-graphite">{submittedInquiry.id}</span>
            </div>
            <div className="flex justify-between items-center text-[12px] border-b border-line pb-2">
              <span className="text-stone font-medium">Recipient:</span>
              <span className="font-semibold text-graphite">{displayName}</span>
            </div>
            <div className="flex justify-between items-center text-[12px] border-b border-line pb-2">
              <span className="text-stone font-medium">Requester Email:</span>
              <span className="font-semibold text-graphite">{submittedInquiry.requesterEmail}</span>
            </div>
            <div className="flex justify-between items-center text-[12px]">
              <span className="text-stone font-medium">Expected Response Window:</span>
              <span className="font-semibold text-emerald-700">Within 24–48 Hours</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={resetForm}
              className="px-6 py-2.5 bg-royal text-white rounded-card text-xs font-bold tracking-wider uppercase hover:bg-royal-dark transition cursor-pointer shadow-xs"
            >
              SUBMIT ANOTHER INQUIRY
            </button>
          </div>
        </div>
      ) : (
        /* PUBLIC INQUIRY SUBMISSION FORM */
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Form Area (2 cols) */}
          <div className="lg:col-span-2 rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs">
            <form onSubmit={handleSubmitInquiry} className="space-y-6">
              {/* Invisible Honeypot Trap for Spam Bots */}
              <input
                type="text"
                name="website_verification_trap"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                className="sr-only"
                aria-hidden="true"
              />

              {submitError && (
                <div className="rounded-card-md border border-red-200 bg-red-50 p-4 text-[13px] text-red-800">
                  {submitError}
                </div>
              )}

              {/* Requester Identity Fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="requester-name" className="block text-[11px] font-bold uppercase tracking-wider text-graphite mb-1.5">
                    YOUR FULL NAME <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4 w-4 text-stone" />
                    <input
                      id="requester-name"
                      type="text"
                      required
                      value={requesterName}
                      onChange={(e) => setRequesterName(e.target.value)}
                      placeholder="e.g. Alexander Wright"
                      className="w-full rounded-card border border-line bg-white pl-10 pr-3.5 py-2.5 text-[13px] text-graphite focus:border-royal focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="requester-email" className="block text-[11px] font-bold uppercase tracking-wider text-graphite mb-1.5">
                    BUSINESS EMAIL <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-stone" />
                    <input
                      id="requester-email"
                      type="email"
                      required
                      value={requesterEmail}
                      onChange={(e) => setRequesterEmail(e.target.value)}
                      placeholder="e.g. a.wright@maritimecompany.com"
                      className="w-full rounded-card border border-line bg-white pl-10 pr-3.5 py-2.5 text-[13px] text-graphite focus:border-royal focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Organization & Preferred Method */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="requester-company" className="block text-[11px] font-bold uppercase tracking-wider text-graphite mb-1.5">
                    ORGANIZATION / COMPANY
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-3 h-4 w-4 text-stone" />
                    <input
                      id="requester-company"
                      type="text"
                      value={requesterCompany}
                      onChange={(e) => setRequesterCompany(e.target.value)}
                      placeholder="e.g. Oceanic Fleet Operations"
                      className="w-full rounded-card border border-line bg-white pl-10 pr-3.5 py-2.5 text-[13px] text-graphite focus:border-royal focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-method" className="block text-[11px] font-bold uppercase tracking-wider text-graphite mb-1.5">
                    PREFERRED CONTACT PROTOCOL
                  </label>
                  <select
                    id="contact-method"
                    value={contactMethod}
                    onChange={(e) => setContactMethod(e.target.value as any)}
                    className="w-full rounded-card border border-line bg-white px-3.5 py-2.5 text-[13px] font-medium text-graphite focus:border-royal focus:outline-none transition-colors"
                  >
                    <option value="Platform Message">Verified Platform Message</option>
                    <option value="Email">Direct Corporate Email</option>
                  </select>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="inquiry-subject" className="block text-[11px] font-bold uppercase tracking-wider text-graphite mb-1.5">
                  SUBJECT / INQUIRY TITLE <span className="text-red-500">*</span>
                </label>
                <input
                  id="inquiry-subject"
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Bulk Procurement & Technical Specifications Request"
                  className="w-full rounded-card border border-line bg-white px-3.5 py-2.5 text-[13px] text-graphite focus:border-royal focus:outline-none transition-colors"
                />
              </div>

              {/* Specifications / Message */}
              <div>
                <label htmlFor="inquiry-message" className="block text-[11px] font-bold uppercase tracking-wider text-graphite mb-1.5">
                  SPECIFICATIONS & PROJECT REQUIREMENTS <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="inquiry-message"
                  required
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Provide project timeline, quantity, classification requirements, target delivery port, and technical questions..."
                  className="w-full rounded-card border border-line bg-white p-3.5 text-[13px] text-graphite focus:border-royal focus:outline-none leading-relaxed transition-colors"
                />
              </div>

              {/* Transmit Action */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-[12px] text-stone">
                  <Lock className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Encrypted transmission to authorized commercial representatives.</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 bg-royal text-white rounded-card text-xs font-bold tracking-wider uppercase hover:bg-royal-dark transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSubmitting ? "TRANSMITTING..." : "TRANSMIT INQUIRY"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Institutional Trust & Protocol Sidebar (1 col) */}
          <div className="space-y-6">
            {/* Verified Entity Card */}
            <div className="rounded-card-lg border border-line bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-stone">
                <ShieldCheck className="h-4 w-4 text-royal" />
                <span>VERIFIED RECIPIENT NODE</span>
              </div>

              <div>
                <h4 className="text-[16px] font-bold text-graphite">{displayName}</h4>
                <p className="text-[12px] text-stone mt-0.5">{company.legalName || displayName}</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-line text-[12px]">
                <div className="flex justify-between">
                  <span className="text-stone">Digital ID:</span>
                  <span className="font-mono font-bold text-graphite">{digitalIdInfo.mwCompanyDigitalId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone">Headquarters:</span>
                  <span className="font-medium text-graphite">{headquartersCity}, {country}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone">Registry Status:</span>
                  <span className="font-semibold text-emerald-700">{isVerified ? "Verified Institutional Node" : "Active Member"}</span>
                </div>
              </div>
            </div>

            {/* Protocol Guarantees */}
            <div className="rounded-card-lg border border-line bg-canvas p-6 space-y-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-graphite block">
                COMMERCIAL CHANNEL PROTOCOL
              </span>

              <ul className="space-y-3 text-[12.5px] text-stone">
                <li className="flex items-start gap-2.5">
                  <Clock className="h-4 w-4 text-royal shrink-0 mt-0.5" />
                  <span><strong>Response Time:</strong> Standard review timeframe is 24–48 business hours.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Confidentiality:</strong> Commercial inquiries and technical drawings remain confidential to the recipient entity.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Lock className="h-4 w-4 text-royal shrink-0 mt-0.5" />
                  <span><strong>Direct Routing:</strong> Inquiries bypass intermediaries and are assigned directly to authorized sales and engineering leads.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
