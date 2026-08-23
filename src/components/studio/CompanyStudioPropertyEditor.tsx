import React, { useState, useEffect, useMemo } from "react";
import { SectorConfig, CompanyProfile } from "@/lib/types";
import { DigitalPropertySlot, CANONICAL_CITY_REGIONS } from "@/lib/services/propertyService";
import { SectorCityEntranceV2 } from "@/pages/SectorCityEntranceV2";
import {
  Building2,
  Save,
  Send,
  Eye,
  Image as ImageIcon,
  Briefcase,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Lock,
  ArrowRight,
  Sparkles,
  Bot,
  Layers,
  MapPin,
  Globe2,
  CheckCircle2,
  Clock,
  FileEdit,
  Monitor,
  Tablet,
  Smartphone,
  ChevronRight,
  Info,
  X,
  ArrowLeft,
  Check,
} from "lucide-react";
import {
  getCompanyDraftOrActive,
  saveDraft,
  submitForReview,
  PropertyCreativeStatus,
  PropertyCreativeRevision,
  CreativeData,
} from "@/lib/services/propertyGovernanceService";
import { getCompanyProducts, getCompanyServices, getCompanyBySlug, formatCompactLocation } from "@/lib/registry";
import { CanonicalCompanyProfileModal } from "./CanonicalCompanyProfileModal";
import { PropertyMediaManager } from "./PropertyMediaManager";

export type { CreativeData };

type CreativeNavSection = "brand" | "messaging" | "offering" | "cta" | "media" | "aitwin";

export function CompanyStudioPropertyEditor({
  companyId,
  config,
  slot,
  cityId,
  regionCode,
  onClose,
}: {
  companyId: string;
  config: SectorConfig;
  slot: DigitalPropertySlot;
  cityId: string;
  regionCode: string;
  onClose: () => void;
}) {
  const [creative, setCreative] = useState<CreativeData>({
    headline: "Welcome to our Regional Showroom",
    subheadline: "Pioneering solutions for maritime infrastructure and operations",
    description: "Discover our specialized marine portfolio, vessel specifications, and certified maritime services tailored for regional excellence.",
    ctaLabel: "EXPLORE SHOWROOM",
    ctaHref: `/companies/${companyId}`,
  });

  const [status, setStatus] = useState<PropertyCreativeStatus>("DRAFT");
  const [activeMode, setActiveMode] = useState<"BUILDER" | "PREVIEW">("BUILDER");
  const [activeCreativeSection, setActiveCreativeSection] = useState<CreativeNavSection>("brand");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [revision, setRevision] = useState<PropertyCreativeRevision | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const [profileModalState, setProfileModalState] = useState<{ open: boolean; mode: "VIEW" | "EDIT" }>({
    open: false,
    mode: "VIEW",
  });
  const [profileVersion, setProfileVersion] = useState<number>(0);

  const city = useMemo(() => config.explorer.cities.find((c) => c.id === cityId), [config, cityId]);
  const region = useMemo(
    () => CANONICAL_CITY_REGIONS.find((r) => r.code === regionCode) || CANONICAL_CITY_REGIONS[0],
    [regionCode]
  );

  const company: CompanyProfile | undefined = useMemo(
    () => getCompanyBySlug(config, companyId),
    [config, companyId, profileVersion]
  );

  const products = useMemo(() => (company ? getCompanyProducts(company) : []), [company, profileVersion]);
  const services = useMemo(() => (company ? getCompanyServices(company) : []), [company, profileVersion]);

  // Profile completeness check
  const isProfileIncomplete = useMemo(() => {
    if (!company) return true;
    return (
      !company.name ||
      !company.industry ||
      (!company.description && !company.shortDescription) ||
      !company.city ||
      !company.country
    );
  }, [company]);

  useEffect(() => {
    const existing = getCompanyDraftOrActive(companyId, slot.slotId);
    if (existing) {
      setRevision(existing);
      setStatus(existing.status);
      if (existing.creative) {
        setCreative(existing.creative);
      }
    }
  }, [companyId, slot.slotId]);

  const handleSaveDraft = () => {
    const comp = getCompanyBySlug(config, companyId);
    if (!comp) return;

    const businessId = `MW-BUS-${companyId.toUpperCase()}`;
    const saved = saveDraft(companyId, businessId, slot.slotId, cityId, regionCode, slot.tier, creative);
    setRevision(saved);
    setStatus(saved.status);
    setSaveSuccessNotice("Draft changes saved successfully.");
    setTimeout(() => setSaveSuccessNotice(null), 3500);
  };

  const handleSubmitReview = () => {
    if (status !== "DRAFT" && status !== "REVISION_REQUIRED" && status !== "REJECTED") return;

    if (isProfileIncomplete) {
      setProfileModalState({ open: true, mode: "EDIT" });
      alert("Your digital properties use your canonical company identity. Complete the missing company information before this property can be submitted.");
      return;
    }

    handleSaveDraft();
    const res = submitForReview(companyId, slot.slotId);
    if (res.success && res.revision) {
      setRevision(res.revision);
      setStatus(res.revision.status);
      setSaveSuccessNotice("Property creative submitted for governance review.");
      setTimeout(() => setSaveSuccessNotice(null), 4500);
    } else {
      alert("Submission error: " + (res.error || "Please verify your input before submitting."));
    }
  };

  const isReadOnly =
    status === "SUBMITTED" ||
    status === "IN_REVIEW" ||
    status === "APPROVED" ||
    status === "PUBLISHED";

  // Canonical presentation names
  const cityName = city ? ((city as any).name || (city as any).displayName ? `${((city as any).name || (city as any).displayName).toUpperCase()}.CITY` : city.domain) : `${cityId.toUpperCase()}.CITY`;
  const editionName = region ? region.name : `${regionCode} Edition`;
  const tierDisplayName =
    slot.tier === "LANDMARK"
      ? "Tier 1 · City Landmark"
      : slot.tier === "FLAGSHIP"
      ? "Tier 2 · Regional Flagship"
      : "Tier 3 · Industry Presence";

  const tierEditorialTag =
    slot.tier === "LANDMARK"
      ? "CITY LANDMARK"
      : slot.tier === "FLAGSHIP"
      ? "REGIONAL FLAGSHIP"
      : "INDUSTRY PRESENCE";

  const isVerified =
    company?.verificationStatus === "verified" ||
    (company?.verificationStatus as string)?.toUpperCase() === "VERIFIED";

  const governanceStages: { label: string; key: PropertyCreativeStatus }[] = [
    { label: "Draft", key: "DRAFT" },
    { label: "Submitted", key: "SUBMITTED" },
    { label: "In Review", key: "IN_REVIEW" },
    { label: "Approved", key: "APPROVED" },
    { label: "Published", key: "PUBLISHED" },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#fafbfc] overflow-hidden font-sans text-graphite">
      {/* -------------------------------------------------------------
          SCREEN HEADER (INSTITUTIONAL & CALM)
      ------------------------------------------------------------- */}
      <header className="h-16 bg-white border-b border-line px-4 sm:px-6 flex items-center justify-between z-30 shrink-0">
        {/* Left: Return & Context */}
        <div className="flex items-center gap-3 md:gap-5 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-line text-xs font-semibold text-stone hover:text-graphite hover:bg-slate-50 transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Return to</span> Properties
          </button>
          <div className="h-5 w-px bg-line shrink-0 hidden sm:block" />
          <div className="min-w-0">
            <h1 className="text-sm md:text-base font-semibold text-graphite tracking-tight truncate">
              Digital Property Builder
            </h1>
            <p className="text-[11px] text-stone truncate hidden sm:block">
              {cityName} · {editionName}
            </p>
          </div>
        </div>

        {/* Right: Top-Level Switcher & Governance Status */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Top-Level Switcher: BUILDER | LIVE PREVIEW */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-line/60">
            <button
              onClick={() => setActiveMode("BUILDER")}
              className={`px-3.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                activeMode === "BUILDER"
                  ? "bg-white text-graphite shadow-xs font-bold"
                  : "text-stone hover:text-graphite"
              }`}
            >
              BUILDER
            </button>
            <button
              onClick={() => setActiveMode("PREVIEW")}
              className={`px-3.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                activeMode === "PREVIEW"
                  ? "bg-white text-royal shadow-xs font-bold"
                  : "text-stone hover:text-graphite"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>LIVE PREVIEW</span>
            </button>
          </div>

          {/* Minimal Governance Status Indicator */}
          <div
            className={`px-3 py-1 text-[11px] font-semibold rounded-lg uppercase tracking-wider hidden sm:flex items-center gap-1.5 ${
              status === "PUBLISHED"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : status === "APPROVED"
                ? "bg-blue-50 text-blue-800 border border-blue-200"
                : status === "SUBMITTED" || status === "IN_REVIEW"
                ? "bg-indigo-50 text-indigo-800 border border-indigo-200"
                : status === "REVISION_REQUIRED"
                ? "bg-amber-50 text-amber-800 border border-amber-200"
                : status === "REJECTED"
                ? "bg-rose-50 text-rose-800 border border-rose-200"
                : "bg-slate-100 text-slate-700 border border-slate-200"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status === "PUBLISHED"
                  ? "bg-emerald-500"
                  : status === "APPROVED"
                  ? "bg-blue-500"
                  : status === "SUBMITTED" || status === "IN_REVIEW"
                  ? "bg-indigo-500 animate-pulse"
                  : status === "REVISION_REQUIRED"
                  ? "bg-amber-500"
                  : status === "REJECTED"
                  ? "bg-rose-500"
                  : "bg-slate-400"
              }`}
            />
            {status.replace("_", " ")}
          </div>
        </div>
      </header>

      {/* Success / Alert Toast */}
      {saveSuccessNotice && (
        <div className="bg-emerald-700 text-white px-4 py-2 text-xs font-medium text-center shadow-md animate-fadeIn shrink-0 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {saveSuccessNotice}
        </div>
      )}

      {/* -------------------------------------------------------------
          MAIN CONTENT VIEW AREA
      ------------------------------------------------------------- */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        {/* =========================================================
            MODE 1: BUILDER WORKSPACE
        ========================================================= */}
        {activeMode === "BUILDER" && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-10">
              
              {/* -------------------------------------------------------------
                  1. PROPERTY HEADER (INSTITUTIONAL & IMMUTABLE)
              ------------------------------------------------------------- */}
              <section className="bg-white border border-line rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <span className="text-[10px] font-bold text-stone uppercase tracking-widest">
                    DIGITAL PROPERTY
                  </span>
                  <span className="text-[11px] font-medium text-stone flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-stone/70" />
                    Registry Immutable
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-semibold text-graphite tracking-tight">
                      {cityName}
                    </h2>
                    <p className="text-sm font-medium text-stone mt-0.5">
                      {editionName}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-royal/5 border border-royal/20 text-royal text-xs font-semibold rounded-lg">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {tierDisplayName}
                    </div>
                    <p className="text-[11px] text-stone mt-1">Verified Digital Property</p>
                  </div>
                </div>
              </section>

              {/* -------------------------------------------------------------
                  2. YOUR COMPANY (CORPORATE IDENTITY BLOCK)
              ------------------------------------------------------------- */}
              <section className="bg-white border border-line rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <span className="text-[10px] font-bold text-stone uppercase tracking-widest">
                    YOUR COMPANY
                  </span>
                  <span className="text-[11px] font-medium text-stone flex items-center gap-1">
                    Canonical Profile Binding
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    {/* Company Logo or Initials */}
                    <div className="w-14 h-14 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg tracking-wider shrink-0 shadow-xs overflow-hidden">
                      {company?.coverImage ? (
                        <img
                          src={company.coverImage}
                          alt={company.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        company?.initials || company?.name?.slice(0, 2).toUpperCase() || "MW"
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-graphite">
                          {company?.displayName || company?.legalName || company?.name || "Company"}
                        </h3>
                        {isVerified && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Check className="w-3 h-3" />
                            Verified
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-stone flex-wrap">
                        <span>
                          {formatCompactLocation(company?.country, company?.city || company?.location)}
                        </span>
                        <span>·</span>
                        <span>{company?.industry || "Marine Services"}</span>
                      </div>
                      {company?.legalName && company.legalName !== company.name && (
                        <div className="text-[11px] text-stone">
                          Legal: <span className="font-medium text-graphite">{company.legalName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Profile Action Button */}
                  <button
                    type="button"
                    onClick={() => setProfileModalState({ open: true, mode: "VIEW" })}
                    className="self-start sm:self-center px-4 py-2 border border-line rounded-xl text-xs font-semibold text-graphite hover:bg-slate-50 transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <span>VIEW COMPANY PROFILE</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Profile Incomplete Banner (conditional) */}
                {isProfileIncomplete && (
                  <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>PROFILE COMPLETION REQUIRED</span>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed font-normal">
                      Your digital properties use your canonical company identity. Complete the missing company information before this property can be submitted.
                    </p>
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setProfileModalState({ open: true, mode: "EDIT" })}
                        className="text-xs font-semibold text-amber-900 hover:text-amber-950 underline flex items-center gap-1"
                      >
                        COMPLETE COMPANY PROFILE →
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* -------------------------------------------------------------
                  3. PROPERTY RELATIONSHIP (EDITORIAL PRESENTATION)
              ------------------------------------------------------------- */}
              <section className="bg-white border border-line rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
                <div className="border-b border-line pb-3">
                  <span className="text-[10px] font-bold text-stone uppercase tracking-widest">
                    YOUR DIGITAL PRESENCE
                  </span>
                </div>

                <div className="bg-slate-50/70 border border-line/60 rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  {/* Company Info */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                      {company?.coverImage ? (
                        <img
                          src={company.coverImage}
                          alt={company.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        company?.initials || company?.name?.slice(0, 2).toUpperCase() || "MW"
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-stone uppercase tracking-wider block">
                        Commercial Presence Of
                      </span>
                      <span className="text-base font-semibold text-graphite block">
                        {company?.displayName || company?.legalName || company?.name || "Company Profile"}
                      </span>
                      <div className="text-xs text-stone font-normal mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{formatCompactLocation(company?.country, company?.city || company?.location)}</span>
                        {company?.industry && (
                          <>
                            <span>·</span>
                            <span>{company.industry}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Destination Property Info */}
                  <div className="sm:text-right space-y-0.5">
                    <div className="text-sm font-semibold text-graphite uppercase">
                      {cityName}
                    </div>
                    <div className="text-xs text-stone">
                      {editionName}
                    </div>
                    <div className="text-xs font-bold text-royal pt-1 uppercase tracking-wider">
                      {tierEditorialTag}
                    </div>
                    <div className="text-[11px] text-stone">
                      Verified Digital Property
                    </div>
                  </div>
                </div>
              </section>

              {/* -------------------------------------------------------------
                  GOVERNANCE FEEDBACK (WHEN REVISION REQUIRED OR REJECTED)
              ------------------------------------------------------------- */}
              {(status === "REVISION_REQUIRED" || status === "REJECTED") && (
                <section className="bg-amber-50 border border-amber-300 rounded-2xl p-6 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                    <AlertCircle className="w-4 h-4 text-amber-700" />
                    <span>GOVERNANCE FEEDBACK</span>
                  </div>
                  <div className="text-xs text-amber-800 leading-relaxed bg-white/70 p-4 rounded-xl border border-amber-200/60 font-sans">
                    {revision?.reviewNotes ||
                      "Please update the creative messaging and ensure headlines accurately represent your verified offering in this regional edition."}
                  </div>
                  <p className="text-[11px] text-amber-700 italic">
                    The creative editor is unlocked. Modify the necessary fields below and submit for re-evaluation.
                  </p>
                </section>
              )}

              {/* -------------------------------------------------------------
                  4. PROPERTY CREATIVE (DEDICATED CREATIVE WORKSPACE)
              ------------------------------------------------------------- */}
              <section className="bg-white border border-line rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-stone uppercase tracking-widest block">
                      PROPERTY CREATIVE
                    </span>
                    <span className="text-xs text-stone font-normal mt-0.5 block">
                      Configure your commercial presentation in this Sector City edition
                    </span>
                  </div>
                  {isReadOnly && (
                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                      Locked during review
                    </span>
                  )}
                </div>

                {/* Creative Navigation Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                  {[
                    { id: "brand" as CreativeNavSection, label: "Brand & Hero", icon: ImageIcon },
                    { id: "messaging" as CreativeNavSection, label: "Messaging", icon: FileEdit },
                    { id: "offering" as CreativeNavSection, label: "Featured Offering", icon: Briefcase },
                    { id: "cta" as CreativeNavSection, label: "Business CTA", icon: ExternalLink },
                    { id: "media" as CreativeNavSection, label: "Media", icon: Globe2 },
                    { id: "aitwin" as CreativeNavSection, label: "AI Twin", icon: Bot },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeCreativeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveCreativeSection(item.id)}
                        className={`px-3.5 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap text-xs font-semibold transition-all shrink-0 ${
                          isActive
                            ? "bg-slate-900 text-white shadow-xs"
                            : "bg-slate-50 text-stone hover:text-graphite hover:bg-slate-100"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                {/* Tab Content Panels */}
                <div className="bg-slate-50/70 border border-line/60 rounded-xl p-5 sm:p-6 space-y-5">
                  {/* Tab 1: BRAND & HERO */}
                  {activeCreativeSection === "brand" && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-xs font-semibold text-graphite uppercase tracking-wider">
                            Showcase Headline
                          </label>
                          <span className="text-[10px] text-stone">Max 60 characters</span>
                        </div>
                        <input
                          type="text"
                          value={creative.headline || ""}
                          onChange={(e) => setCreative({ ...creative, headline: e.target.value })}
                          disabled={isReadOnly}
                          maxLength={60}
                          placeholder="e.g. Premier Regional Marine Engineering & Refit"
                          className="w-full bg-white border border-line rounded-xl px-4 py-2.5 text-xs text-graphite placeholder:text-stone/40 focus:outline-none focus:border-royal transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-xs font-semibold text-graphite uppercase tracking-wider">
                            Subheadline & Value Proposition
                          </label>
                          <span className="text-[10px] text-stone">Max 120 characters</span>
                        </div>
                        <input
                          type="text"
                          value={creative.subheadline || ""}
                          onChange={(e) => setCreative({ ...creative, subheadline: e.target.value })}
                          disabled={isReadOnly}
                          maxLength={120}
                          placeholder="e.g. Certified shipyard facilities delivering bespoke superyacht services"
                          className="w-full bg-white border border-line rounded-xl px-4 py-2.5 text-xs text-graphite placeholder:text-stone/40 focus:outline-none focus:border-royal transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  )}

                  {/* Tab 2: MESSAGING */}
                  {activeCreativeSection === "messaging" && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-xs font-semibold text-graphite uppercase tracking-wider">
                            Property Commercial Statement
                          </label>
                          <span className="text-[10px] text-stone">Max 350 characters</span>
                        </div>
                        <textarea
                          rows={4}
                          value={creative.description || ""}
                          onChange={(e) => setCreative({ ...creative, description: e.target.value })}
                          disabled={isReadOnly}
                          maxLength={350}
                          placeholder="Describe your capabilities, regional fleet availability, and specialized maritime focus..."
                          className="w-full bg-white border border-line rounded-xl px-4 py-3 text-xs text-graphite placeholder:text-stone/40 focus:outline-none focus:border-royal transition-all disabled:bg-slate-100 disabled:cursor-not-allowed leading-relaxed"
                        />
                      </div>
                    </div>
                  )}

                  {/* Tab 3: FEATURED OFFERING */}
                  {activeCreativeSection === "offering" && (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-graphite uppercase tracking-wider block">
                          Link to Verified Catalog Offering
                        </label>
                        <p className="text-xs text-stone font-normal">
                          Feature a primary product or service from your company catalog directly on your digital property.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {/* Offering Type */}
                        <div>
                          <label className="text-[11px] font-semibold text-stone block mb-1">Offering Type</label>
                          <select
                            disabled={isReadOnly}
                            value={creative.featuredOfferingType || "PRODUCT"}
                            onChange={(e) =>
                              setCreative({
                                ...creative,
                                featuredOfferingType: e.target.value as "PRODUCT" | "SERVICE",
                                featuredOfferingName: "",
                              })
                            }
                            className="w-full bg-white border border-line rounded-xl px-3 py-2 text-xs text-graphite focus:outline-none focus:border-royal disabled:bg-slate-100"
                          >
                            <option value="PRODUCT">Product</option>
                            <option value="SERVICE">Service</option>
                          </select>
                        </div>

                        {/* Selected Item */}
                        <div>
                          <label className="text-[11px] font-semibold text-stone block mb-1">Select Item</label>
                          <select
                            disabled={isReadOnly}
                            value={creative.featuredOfferingName || ""}
                            onChange={(e) =>
                              setCreative({
                                ...creative,
                                featuredOfferingName: e.target.value,
                              })
                            }
                            className="w-full bg-white border border-line rounded-xl px-3 py-2 text-xs text-graphite focus:outline-none focus:border-royal disabled:bg-slate-100"
                          >
                            <option value="">-- Select from company catalog --</option>
                            {creative.featuredOfferingType === "SERVICE"
                              ? services.map((s) => (
                                  <option key={s.id} value={s.name}>
                                    {s.name}
                                  </option>
                                ))
                              : products.map((p) => (
                                  <option key={p.id} value={p.name}>
                                    {p.name}
                                  </option>
                                ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 4: BUSINESS CTA */}
                  {activeCreativeSection === "cta" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-graphite uppercase tracking-wider block mb-1.5">
                            Action Button Label
                          </label>
                          <input
                            type="text"
                            value={creative.ctaLabel || ""}
                            onChange={(e) => setCreative({ ...creative, ctaLabel: e.target.value })}
                            disabled={isReadOnly}
                            placeholder="e.g. EXPLORE SHOWROOM"
                            className="w-full bg-white border border-line rounded-xl px-4 py-2.5 text-xs text-graphite placeholder:text-stone/40 focus:outline-none focus:border-royal disabled:bg-slate-100"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-graphite uppercase tracking-wider block mb-1.5">
                            Destination URL / Path
                          </label>
                          <input
                            type="text"
                            value={creative.ctaHref || ""}
                            onChange={(e) => setCreative({ ...creative, ctaHref: e.target.value })}
                            disabled={isReadOnly}
                            placeholder={`/companies/${companyId}`}
                            className="w-full bg-white border border-line rounded-xl px-4 py-2.5 text-xs text-graphite placeholder:text-stone/40 focus:outline-none focus:border-royal disabled:bg-slate-100"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 5: MEDIA ASSETS */}
                  {activeCreativeSection === "media" && (
                    <PropertyMediaManager
                      creative={creative}
                      onChange={setCreative}
                      isReadOnly={isReadOnly}
                      companyId={companyId}
                      slotId={slot.slotId}
                    />
                  )}

                  {/* Tab 6: AI TWIN */}
                  {activeCreativeSection === "aitwin" && (
                    <div className="space-y-3 text-xs">
                      <div className="p-4 bg-royal/5 border border-royal/20 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 font-bold text-royal text-xs">
                          <Bot className="w-4 h-4" />
                          <span>AI Twin Neural Connection</span>
                        </div>
                        <p className="text-stone leading-relaxed font-normal">
                          Your company's verified business twin is automatically linked to this property. Public visitors can query your vessel specs, compliance certifications, and availability in real time.
                        </p>
                        <div className="flex items-center gap-2 pt-1 font-semibold text-emerald-800">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>Neural Knowledge Base: Synchronized with Company Profile</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* -------------------------------------------------------------
                  6. GOVERNANCE LIFECYCLE & ACTION BAR
              ------------------------------------------------------------- */}
              <section className="bg-white border border-line rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <span className="text-[10px] font-bold text-stone uppercase tracking-widest">
                    GOVERNANCE LIFECYCLE
                  </span>
                  <span className="text-xs font-semibold text-graphite uppercase tracking-wide">
                    Status: <span className="text-royal">{status.replace("_", " ")}</span>
                  </span>
                </div>

                {/* Minimal 5-Stage Tracker */}
                <div className="grid grid-cols-5 gap-2 text-center">
                  {governanceStages.map((stage, idx) => {
                    const isCurrent = status === stage.key;
                    const isPast =
                      (stage.key === "DRAFT" && status !== "DRAFT") ||
                      (stage.key === "SUBMITTED" &&
                        ["IN_REVIEW", "APPROVED", "PUBLISHED"].includes(status)) ||
                      (stage.key === "IN_REVIEW" && ["APPROVED", "PUBLISHED"].includes(status)) ||
                      (stage.key === "APPROVED" && status === "PUBLISHED");

                    return (
                      <div
                        key={stage.key}
                        className={`p-3 rounded-xl text-xs transition-all ${
                          isCurrent
                            ? "bg-slate-900 text-white font-bold shadow-xs"
                            : isPast
                            ? "bg-slate-100 text-graphite font-semibold border border-line/60"
                            : "bg-slate-50 text-stone/60 font-normal"
                        }`}
                      >
                        <div className="text-[9px] uppercase tracking-wider opacity-70 mb-0.5">0{idx + 1}</div>
                        <div className="truncate">{stage.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Timestamps */}
                {revision?.submittedAt && (
                  <div className="pt-2 text-[11px] text-stone flex items-center justify-between border-t border-line/40">
                    <span>Submitted: {new Date(revision.submittedAt).toLocaleDateString()}</span>
                    {revision?.publishedAt && (
                      <span>Published: {new Date(revision.publishedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                )}

                {/* Action Buttons (Strictly Company-Side Only) */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    disabled={isReadOnly}
                    onClick={handleSaveDraft}
                    className="flex-1 h-11 border border-line rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-stone uppercase tracking-wider hover:text-graphite hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    SAVE DRAFT
                  </button>
                  <button
                    disabled={status !== "DRAFT" && status !== "REVISION_REQUIRED" && status !== "REJECTED"}
                    onClick={handleSubmitReview}
                    className="flex-1 h-11 bg-royal text-white rounded-xl flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider hover:bg-blue-700 shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                    SUBMIT FOR REVIEW
                  </button>
                  <button
                    onClick={() => setActiveMode("PREVIEW")}
                    className="sm:w-auto px-5 h-11 bg-slate-100 hover:bg-slate-200 text-graphite rounded-xl flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider transition-all"
                  >
                    <Eye className="w-4 h-4" />
                    <span>PREVIEW IN CITY</span>
                  </button>
                </div>
              </section>

            </div>
          </div>
        )}

        {/* =========================================================
            MODE 2: FULL-SCALE LIVE PUBLIC PREVIEW
        ========================================================= */}
        {activeMode === "PREVIEW" && (
          <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
            {/* Preview Control Bar */}
            <div className="h-14 bg-slate-900 border-b border-white/10 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20 text-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveMode("BUILDER")}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Builder</span>
                </button>
                <div className="h-4 w-px bg-white/20 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold text-white tracking-wide">
                    Live Public Property Experience
                  </span>
                  <span className="text-slate-400 hidden md:inline">
                    · {cityName} ({editionName})
                  </span>
                </div>
              </div>

              {/* Device Switcher */}
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setPreviewDevice("desktop")}
                  className={`p-1.5 rounded-lg transition-all ${
                    previewDevice === "desktop" ? "bg-white/20 text-white" : "text-slate-400 hover:text-white"
                  }`}
                  title="Desktop Viewport"
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewDevice("tablet")}
                  className={`p-1.5 rounded-lg transition-all ${
                    previewDevice === "tablet" ? "bg-white/20 text-white" : "text-slate-400 hover:text-white"
                  }`}
                  title="Tablet Viewport"
                >
                  <Tablet className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewDevice("mobile")}
                  className={`p-1.5 rounded-lg transition-all ${
                    previewDevice === "mobile" ? "bg-white/20 text-white" : "text-slate-400 hover:text-white"
                  }`}
                  title="Mobile Viewport"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Real Public Preview Viewport */}
            <div className="flex-1 overflow-y-auto bg-slate-950 flex items-start justify-center p-0 md:p-6">
              <div
                className={`w-full transition-all duration-300 ${
                  previewDevice === "desktop"
                    ? "max-w-full h-full"
                    : previewDevice === "tablet"
                    ? "max-w-[768px] my-6 rounded-2xl border border-white/20 shadow-2xl overflow-hidden min-h-[900px]"
                    : "max-w-[390px] my-6 rounded-3xl border-2 border-white/20 shadow-2xl overflow-hidden min-h-[844px]"
                }`}
              >
                {city && (
                  <SectorCityEntranceV2
                    config={config}
                    citySlug={city.slug}
                    regionSlug={region.slug}
                    previewCreativeOverride={{
                      slotId: slot.slotId,
                      creative: creative,
                      companyId: companyId,
                      companyProfile: company,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------
          CANONICAL COMPANY PROFILE MODAL (CANONICAL IDENTITY SOURCING)
      ------------------------------------------------------------- */}
      {company && (
        <CanonicalCompanyProfileModal
          company={company}
          isOpen={profileModalState.open}
          initialMode={profileModalState.mode}
          onClose={() => setProfileModalState({ open: false, mode: "VIEW" })}
          onProfileUpdated={() => setProfileVersion((v) => v + 1)}
        />
      )}
    </div>
  );
}
