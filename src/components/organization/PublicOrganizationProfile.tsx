import React, { useState, useMemo } from "react";
import { LogoMark } from "@/components/digione/icons";
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  Globe,
  BookOpen,
  FileCheck,
  Users,
  Search,
  ExternalLink,
  ChevronRight,
  MapPin,
  Mail,
  Send,
  Layers,
  ArrowRight,
  Lock,
  Landmark,
  BadgeCheck,
  FileText,
  Compass,
  Briefcase,
  Sparkles,
  ArrowUpRight,
  Info,
} from "lucide-react";
import type { SectorConfig } from "@/lib/types";
import {
  type EcosystemOrganizationSummary,
  getEcosystemMembers,
  getEcosystemOrganizationById,
} from "@/lib/services/ecosystemOrganizationService";
import { PageMetadata } from "@/components/foundation/PageMetadata";

export type PublicOrgTab =
  | "overview"
  | "identity"
  | "members"
  | "governance"
  | "knowledge"
  | "presence"
  | "connect";

interface PublicOrganizationProfileProps {
  organization: EcosystemOrganizationSummary;
  config?: SectorConfig;
  initialTab?: string;
  isEmbeddedPreview?: boolean;
  onNavigateUrl?: (url: string) => void;
}

export function PublicOrganizationProfile({
  organization,
  config,
  initialTab = "overview",
  isEmbeddedPreview = false,
  onNavigateUrl,
}: PublicOrganizationProfileProps) {
  // Normalize initial tab
  const normalizeTab = (tabStr?: string): PublicOrgTab => {
    if (!tabStr) return "overview";
    const lower = tabStr.toLowerCase();
    if (lower === "identity" || lower === "corporate" || lower === "about") return "overview";
    if (lower === "members" || lower === "network") return "members";
    if (lower === "governance" || lower === "accreditation") return "governance";
    if (lower === "knowledge" || lower === "publications" || lower === "articles") return "knowledge";
    if (lower === "presence" || lower === "cities" || lower === "jurisdiction") return "presence";
    if (lower === "connect" || lower === "contact" || lower === "secretariat") return "connect";
    return "overview";
  };

  const [activeTab, setActiveTab] = useState<PublicOrgTab>(normalizeTab(initialTab));
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedCityFilter, setSelectedCityFilter] = useState("ALL");
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [inquiryModalTitle, setInquiryModalTitle] = useState("Institutional Inquiry");
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({
    name: "",
    email: "",
    company: "",
    topic: "Membership Accreditation",
    message: "",
  });

  const openInquiryModal = (
    topic: string = "Membership Accreditation",
    defaultMessage: string = "",
    titleOverride?: string
  ) => {
    setInquiryModalTitle(
      titleOverride ||
        (topic === "Membership Accreditation"
          ? "Accredited Membership Application"
          : topic === "Directives & Standards"
          ? "Technical Document / Directive Request"
          : topic === "Regulatory Policy"
          ? "Regulatory Policy & Standards Inquiry"
          : "Institutional Secretariat Inquiry")
    );
    setInquiryForm({
      name: "",
      email: "",
      company: "",
      topic,
      message: defaultMessage,
    });
    setInquiryModalOpen(true);
  };

  const navigateTo = (url: string) => {
    if (onNavigateUrl) {
      onNavigateUrl(url);
    } else {
      window.history.pushState({}, "", url);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const handleTabChange = (tab: PublicOrgTab) => {
    setActiveTab(tab);
    if (!isEmbeddedPreview) {
      const newUrl = `/companies/${organization.slug}/${tab === "overview" ? "" : tab}`;
      window.history.pushState({}, "", newUrl);
    }
  };

  // Real enrolled member companies pulled directly from ecosystem services
  const members = useMemo(() => {
    return getEcosystemMembers(organization.id);
  }, [organization.id]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        memberSearch === "" ||
        m.companyName.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.legalName.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.city.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.country.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.industry.toLowerCase().includes(memberSearch.toLowerCase());

      const matchesCity =
        selectedCityFilter === "ALL" ||
        m.sectorCityId?.toLowerCase() === selectedCityFilter.toLowerCase();

      return matchesSearch && matchesCity;
    });
  }, [members, memberSearch, selectedCityFilter]);

  // Unique sector cities among members
  const memberSectorCities = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => {
      if (m.sectorCityId) set.add(m.sectorCityId);
    });
    return Array.from(set);
  }, [members]);

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInquirySubmitted(true);
    setTimeout(() => {
      setInquiryModalOpen(false);
      setInquirySubmitted(false);
      setInquiryForm({
        name: "",
        email: "",
        company: "",
        topic: "Membership Accreditation",
        message: "",
      });
    }, 2000);
  };

  // Human friendly org type label
  const orgTypeLabel = useMemo(() => {
    switch (organization.organizationType) {
      case "ASSOCIATION":
        return "International Trade Association";
      case "CHAMBER":
        return "Maritime Chamber of Commerce";
      case "FEDERATION":
        return "Global Maritime Federation";
      case "INSTITUTION":
        return "Research & Academic Institution";
      case "PUBLIC_ORGANIZATION":
        return "Public Port & Maritime Authority";
      default:
        return organization.organizationType.replace(/_/g, " ");
    }
  }, [organization.organizationType]);

  const primarySectorCitySlug = useMemo(() => {
    switch (organization.organizationType) {
      case "ASSOCIATION":
        return "associations";
      case "CHAMBER":
        return "chambers";
      case "FEDERATION":
        return "governance";
      case "INSTITUTION":
        return "marineai";
      case "PUBLIC_ORGANIZATION":
        return "portops";
      default:
        return "governance";
    }
  }, [organization.organizationType]);

  const primarySectorCityDomain = useMemo(() => {
    switch (organization.organizationType) {
      case "ASSOCIATION":
        return "ASSOCIATIONS.CITY";
      case "CHAMBER":
        return "CHAMBERS.CITY";
      case "FEDERATION":
        return "GOVERNANCE.CITY";
      case "INSTITUTION":
        return "MARINEAI.CITY";
      case "PUBLIC_ORGANIZATION":
        return "PORTOPS.CITY";
      default:
        return "GOVERNANCE.CITY";
    }
  }, [organization.organizationType]);

  return (
    <div className={`min-h-screen ${isEmbeddedPreview ? "bg-transparent p-0" : "bg-canvas text-graphite pb-24"}`}>
      {!isEmbeddedPreview && (
        <PageMetadata
          title={`${organization.name} | Institutional Organization Profile | MarineWorld.City`}
          description={organization.aboutDescription}
          canonicalUrl={`https://marineworld.city/companies/${organization.slug}`}
        />
      )}

      {/* TOP NAVIGATION / SOVEREIGN BRAND BAR (When in standalone page mode) */}
      {!isEmbeddedPreview && (
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-line shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo("/");
                }}
                className="flex items-center gap-2.5 group text-graphite hover:opacity-85 transition-opacity"
              >
                <LogoMark className="h-6 w-2 text-graphite" />
                <span className="font-sans text-[16px] font-bold tracking-tight text-graphite">
                  MarineWorld.City
                </span>
              </a>

              <span className="text-line text-lg font-light hidden sm:inline">/</span>

              <a
                href="/companies"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo("/companies");
                }}
                className="text-xs font-semibold text-stone hover:text-royal transition hidden sm:inline"
              >
                Registry
              </a>

              <span className="text-line text-lg font-light hidden sm:inline">/</span>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-royal/10 text-royal-dark border border-royal/20">
                <Landmark className="w-3 h-3 text-royal" />
                <span className="uppercase">{primarySectorCityDomain}</span>
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <a
                href={`/${primarySectorCitySlug}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo(`/${primarySectorCitySlug}`);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-royal/30 bg-royal/5 hover:bg-royal/10 text-royal text-xs font-bold transition shadow-2xs"
              >
                <span>Explore {primarySectorCityDomain}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => openInquiryModal("General Secretariat Inquiry", "", "Institutional Secretariat Inquiry")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-royal hover:bg-royal-dark text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Connect &amp; Inquire</span>
                <span className="sm:hidden">Connect</span>
              </button>

              <a
                href={`/ecosystem/dashboard?orgId=${organization.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo(`/ecosystem/dashboard?orgId=${organization.id}`);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-line bg-slate-50 hover:bg-slate-100 text-stone hover:text-graphite text-[11px] font-bold transition"
                title="Open Private Ecosystem Hub Management"
              >
                <Lock className="w-3 h-3 text-stone" />
                <span className="hidden md:inline">Ecosystem Hub</span>
              </a>
            </div>
          </div>
        </header>
      )}

      {/* MAIN CONTAINER */}
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${isEmbeddedPreview ? "mt-0" : "mt-6 sm:mt-8"} space-y-6`}>
        
        {/* INSTITUTIONAL SOVEREIGN HEADER CARD */}
        <section className="bg-white rounded-3xl border border-line shadow-xs overflow-hidden">
          {/* Top Institutional Status Bar (Clean Light Corporate Theme) */}
          <div className="bg-slate-50/90 border-b border-line px-6 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-royal/10 border border-royal/20 text-royal font-mono text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-royal" />
                <span>INSTITUTIONAL REGISTRY RECORD</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-[11px] font-bold tracking-wider uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>OFFICIALLY ACCREDITED</span>
              </span>
            </div>

            <div className="flex items-center gap-2 text-stone text-xs font-mono">
              <ShieldCheck className="w-4 h-4 text-royal" />
              <span>Sovereign Identity Ledger</span>
            </div>
          </div>

          {/* Identity Info Strip */}
          <div className="p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                {/* Organization Initials Avatar */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-royal/5 border-2 border-royal/20 shadow-2xs flex items-center justify-center font-black text-royal text-2xl sm:text-3xl shrink-0 uppercase">
                  {organization.name.substring(0, 2).toUpperCase()}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-graphite tracking-tight">
                      {organization.name}
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-royal/10 text-royal-dark border border-royal/20">
                      <BadgeCheck className="w-3.5 h-3.5 text-royal" />
                      <span>Verified Institution</span>
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-semibold text-stone flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>{organization.legalName}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono text-royal font-bold">
                      {organization.businessId}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1 text-slate-600">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {organization.country}
                    </span>
                  </p>

                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    <span className="px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-royal bg-royal/5 border border-royal/20">
                      {orgTypeLabel}
                    </span>
                    {organization.officialWebsite && (
                      <a
                        href={organization.officialWebsite}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-semibold text-stone hover:text-royal flex items-center gap-1 transition"
                      >
                        <Globe className="w-3 h-3 text-slate-400" />
                        <span>{organization.officialWebsite.replace(/^https?:\/\//, "")}</span>
                        <ArrowUpRight className="w-2.5 h-2.5 text-slate-400" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2 md:pt-0">
                <button
                  type="button"
                  onClick={() => openInquiryModal("General Secretariat Inquiry", "", "Institutional Secretariat Inquiry")}
                  className="px-4 py-2.5 rounded-xl bg-royal hover:bg-royal-dark text-white text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>Institutional Inquiry</span>
                </button>
                <a
                  href={`/${primarySectorCitySlug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo(`/${primarySectorCitySlug}`);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-line bg-slate-50 hover:bg-slate-100 text-graphite text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <span>{primarySectorCityDomain}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </a>
              </div>
            </div>

            {/* REAL ECOSYSTEM METRICS STRIP */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-6 border-t border-line">
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-line/80 hover:bg-royal/5 hover:border-royal/20 transition group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-stone uppercase tracking-wider">
                    Accredited Members
                  </span>
                  <Users className="w-4 h-4 text-royal" />
                </div>
                <div className="text-2xl font-black text-graphite tracking-tight group-hover:text-royal transition">
                  {organization.totalMembersCount.toLocaleString()}
                </div>
                <div className="text-[10px] text-mute font-medium mt-0.5">
                  Verified Maritime Enterprises
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 border border-line/80 hover:bg-royal/5 hover:border-royal/20 transition group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-stone uppercase tracking-wider">
                    Sector Cities
                  </span>
                  <Globe className="w-4 h-4 text-royal" />
                </div>
                <div className="text-2xl font-black text-graphite tracking-tight group-hover:text-royal transition">
                  {organization.activeSectorCitiesCount}
                </div>
                <div className="text-[10px] text-mute font-medium mt-0.5">
                  Ecosystem Hub Jurisdictions
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 border border-line/80 hover:bg-royal/5 hover:border-royal/20 transition group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-stone uppercase tracking-wider">
                    Knowledge Base
                  </span>
                  <BookOpen className="w-4 h-4 text-royal" />
                </div>
                <div className="text-2xl font-black text-graphite tracking-tight group-hover:text-royal transition">
                  {organization.knowledgeArticlesCount}
                </div>
                <div className="text-[10px] text-mute font-medium mt-0.5">
                  Standards &amp; Policy Articles
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 border border-line/80 hover:bg-royal/5 hover:border-royal/20 transition group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-stone uppercase tracking-wider">
                    Publications
                  </span>
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-graphite tracking-tight group-hover:text-royal transition">
                  {organization.publicationsCount}
                </div>
                <div className="text-[10px] text-mute font-medium mt-0.5">
                  Official Reports &amp; Directives
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* NAVIGATION TABS BAR */}
        <div className="border-b border-line flex items-center gap-2 overflow-x-auto no-scrollbar pt-2">
          <button
            type="button"
            onClick={() => handleTabChange("overview")}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "overview"
                ? "border-royal text-royal"
                : "border-transparent text-stone hover:text-graphite"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Overview &amp; Identity</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("members")}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "members"
                ? "border-royal text-royal"
                : "border-transparent text-stone hover:text-graphite"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Accredited Members</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-stone font-mono">
              {organization.totalMembersCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("governance")}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "governance"
                ? "border-royal text-royal"
                : "border-transparent text-stone hover:text-graphite"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Governance &amp; Standards</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("knowledge")}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "knowledge"
                ? "border-royal text-royal"
                : "border-transparent text-stone hover:text-graphite"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Knowledge Base</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-stone font-mono">
              {organization.knowledgeArticlesCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("presence")}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "presence"
                ? "border-royal text-royal"
                : "border-transparent text-stone hover:text-graphite"
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Jurisdiction &amp; Cities</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("connect")}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "connect"
                ? "border-royal text-royal"
                : "border-transparent text-stone hover:text-graphite"
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Secretariat &amp; Inquiries</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW & IDENTITY */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* ABOUT & CAPABILITIES CARD */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-3xl border border-line p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h2 className="text-base font-extrabold text-graphite tracking-tight flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-royal" />
                    <span>About the Organization</span>
                  </h2>
                  <p className="mt-3 text-sm text-graphite/90 leading-relaxed font-normal">
                    {organization.aboutDescription}
                  </p>
                </div>

                <div className="pt-6 border-t border-line space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone">
                    Institutional Capabilities &amp; Mandate
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {organization.capabilities.map((cap, i) => (
                      <span
                        key={i}
                        className="px-3.5 py-1.5 bg-slate-50 hover:bg-royal/5 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-royal" />
                        <span>{cap}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-line grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-line space-y-1">
                    <div className="text-[11px] font-bold text-stone uppercase">
                      Principal Authority &amp; Secretariat
                    </div>
                    <div className="text-sm font-extrabold text-graphite">
                      {organization.principalAuthorityName}
                    </div>
                    <div className="text-xs text-stone font-medium">
                      {organization.principalAuthorityRole}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-line space-y-1">
                    <div className="text-[11px] font-bold text-stone uppercase">
                      Official Contact Domain
                    </div>
                    <div className="text-sm font-mono font-bold text-royal">
                      @{organization.officialEmailDomain}
                    </div>
                    <div className="text-xs text-stone font-medium">
                      {organization.officialContactEmail}
                    </div>
                  </div>
                </div>
              </div>

              {/* SIDEBAR: VERIFICATION & CREDENTIALS CARD */}
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-line p-6 shadow-xs space-y-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-royal" />
                    <span>Official Registry Ledger</span>
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-line">
                      <span className="text-stone">Entity Type:</span>
                      <span className="font-bold text-graphite uppercase">
                        {organization.organizationType.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-line">
                      <span className="text-stone">Business ID:</span>
                      <span className="font-mono font-bold text-royal">
                        {organization.businessId}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-line">
                      <span className="text-stone">Jurisdiction:</span>
                      <span className="font-bold text-graphite">{organization.country}</span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-line">
                      <span className="text-stone">Verification State:</span>
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        VERIFIED ACTIVE
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-line">
                      <span className="text-stone">Member Code:</span>
                      <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {organization.enrollmentCode}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        openInquiryModal(
                          "Membership Accreditation",
                          `Formal request to apply for enterprise accreditation and register under ${organization.name} governance framework (Ref Code: ${organization.enrollmentCode}).`,
                          "Accredited Membership Application"
                        )
                      }
                      className="w-full py-2.5 rounded-xl bg-royal hover:bg-royal-dark text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Request Accreditation</span>
                    </button>
                  </div>
                </div>

                <div className="p-5 bg-royal/5 border border-royal/20 rounded-3xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-royal">
                    <Info className="w-4 h-4 text-royal shrink-0" />
                    <span>Managing This Organization?</span>
                  </div>
                  <p className="text-xs text-stone leading-relaxed">
                    Accredited secretariat officials can manage member onboarding and accreditation in the private Ecosystem Hub.
                  </p>
                  <a
                    href={`/ecosystem/dashboard?orgId=${organization.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigateTo(`/ecosystem/dashboard?orgId=${organization.id}`);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-royal hover:underline pt-1"
                  >
                    <span>Launch Ecosystem Hub →</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACCREDITED MEMBERS DIRECTORY */}
        {activeTab === "members" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl border border-line p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-extrabold text-graphite tracking-tight flex items-center gap-2">
                    <Users className="w-4 h-4 text-royal" />
                    <span>Accredited Member Enterprises ({organization.totalMembersCount})</span>
                  </h2>
                  <p className="text-xs text-stone mt-1">
                    Commercial maritime companies verified and accredited under the {organization.name} governance framework.
                  </p>
                </div>

                {/* Filter controls */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-stone absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search members..."
                      className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-line rounded-xl focus:outline-hidden focus:border-royal w-44 sm:w-56"
                    />
                  </div>

                  {memberSectorCities.length > 1 && (
                    <select
                      value={selectedCityFilter}
                      onChange={(e) => setSelectedCityFilter(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-slate-50 border border-line rounded-xl focus:outline-hidden focus:border-royal text-graphite font-semibold"
                    >
                      <option value="ALL">All Sector Cities</option>
                      {memberSectorCities.map((c) => (
                        <option key={c} value={c}>
                          {c.toUpperCase()}.CITY
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Members Table / Grid */}
              <div className="divide-y divide-line border border-line rounded-2xl overflow-hidden">
                {filteredMembers.slice(0, 30).map((m) => (
                  <div
                    key={m.memberId}
                    className="p-4 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-royal text-sm shrink-0 uppercase">
                        {m.companyName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <a
                            href={`/companies/${m.companyId}`}
                            onClick={(e) => {
                              e.preventDefault();
                              navigateTo(`/companies/${m.companyId}`);
                            }}
                            className="text-sm font-bold text-graphite hover:text-royal transition"
                          >
                            {m.companyName}
                          </a>
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            ACCREDITED
                          </span>
                        </div>
                        <div className="text-xs text-stone flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          <span>{m.legalName}</span>
                          <span>•</span>
                          <span>{m.city}, {m.country}</span>
                          <span>•</span>
                          <span className="font-mono text-royal text-[11px] uppercase">
                            {m.sectorCityId}.CITY
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <a
                        href={`/companies/${m.companyId}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigateTo(`/companies/${m.companyId}`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-royal/10 hover:bg-royal hover:text-white text-royal text-xs font-bold transition flex items-center gap-1"
                      >
                        <span>View Operating Environment</span>
                        <ArrowRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}

                {filteredMembers.length === 0 && (
                  <div className="p-8 text-center text-xs text-stone">
                    No member companies match your search criteria.
                  </div>
                )}
              </div>

              {filteredMembers.length > 30 && (
                <div className="text-center pt-2 text-xs text-stone">
                  Showing 30 of {filteredMembers.length} accredited members.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: GOVERNANCE & STANDARDS */}
        {activeTab === "governance" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl border border-line p-6 sm:p-8 shadow-xs space-y-6">
              <div>
                <h2 className="text-base font-extrabold text-graphite tracking-tight flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-royal" />
                  <span>Institutional Governance &amp; Standards</span>
                </h2>
                <p className="text-xs text-stone mt-1">
                  Official standards, policy directives, and accreditation frameworks administered by {organization.name}.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-5 rounded-2xl border border-line bg-slate-50/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-graphite">
                    <FileText className="w-4 h-4 text-royal" />
                    <span>Maritime Standards &amp; Accreditation Protocol</span>
                  </div>
                  <p className="text-xs text-stone leading-relaxed">
                    Formal registry requirements and accreditation procedures aligned with international maritime governance.
                  </p>
                  <span className="inline-block text-[10.5px] font-mono font-bold text-royal">
                    STANDARD REF: {organization.slug.toUpperCase()}-STD-01
                  </span>
                </div>

                <div className="p-5 rounded-2xl border border-line bg-slate-50/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-graphite">
                    <ShieldCheck className="w-4 h-4 text-royal" />
                    <span>Digital Twin Interoperability Directive</span>
                  </div>
                  <p className="text-xs text-stone leading-relaxed">
                    Framework for real-time telemetry verification, autonomous navigation clearances, and sovereign data exchange.
                  </p>
                  <span className="inline-block text-[10.5px] font-mono font-bold text-royal">
                    DIRECTIVE REF: {organization.slug.toUpperCase()}-DIR-2026
                  </span>
                </div>

                <div className="p-5 rounded-2xl border border-line bg-slate-50/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-graphite">
                    <BadgeCheck className="w-4 h-4 text-royal" />
                    <span>Member Code of Commercial Conduct</span>
                  </div>
                  <p className="text-xs text-stone leading-relaxed">
                    Ethical guidelines and operational requirements mandatory for all enrolled commercial enterprises.
                  </p>
                  <span className="inline-block text-[10.5px] font-mono font-bold text-royal">
                    CODE: {organization.enrollmentCode}
                  </span>
                </div>

                <div className="p-5 rounded-2xl border border-line bg-slate-50/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-graphite">
                    <Landmark className="w-4 h-4 text-royal" />
                    <span>Cross-Border Maritime Settlement Charter</span>
                  </div>
                  <p className="text-xs text-stone leading-relaxed">
                    Arbitration procedures and verified business interaction governance within the MarineWorld infrastructure.
                  </p>
                  <span className="inline-block text-[10.5px] font-mono font-bold text-royal">
                    CHARTER: {organization.businessId}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: KNOWLEDGE BASE & PUBLICATIONS */}
        {activeTab === "knowledge" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl border border-line p-6 sm:p-8 shadow-xs space-y-6">
              <div>
                <h2 className="text-base font-extrabold text-graphite tracking-tight flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-royal" />
                  <span>Knowledge Base &amp; Publications ({organization.knowledgeArticlesCount + organization.publicationsCount})</span>
                </h2>
                <p className="text-xs text-stone mt-1">
                  Research publications, technical whitepapers, and industry intelligence issued by {organization.name}.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {[
                  {
                    title: "2026 Global Maritime Decarbonization Roadmap",
                    type: "Official Publication",
                    date: "January 2026",
                    ref: "PUB-2026-01",
                  },
                  {
                    title: "Port Automation & Electronic Clearance Protocol v3",
                    type: "Technical Standard",
                    date: "November 2025",
                    ref: "STD-2025-04",
                  },
                  {
                    title: "Autonomous Fleet Navigation & AI Twin Safety Matrix",
                    type: "Research Whitepaper",
                    date: "October 2025",
                    ref: "RES-2025-12",
                  },
                  {
                    title: "North-West European Maritime Trade & Supply Resilience",
                    type: "Economic Report",
                    date: "August 2025",
                    ref: "REP-2025-08",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-line bg-slate-50/60 hover:bg-slate-100/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-bold text-graphite">{item.title}</div>
                      <div className="text-xs text-stone flex items-center gap-2 mt-0.5">
                        <span className="font-semibold text-royal">{item.type}</span>
                        <span>•</span>
                        <span>{item.date}</span>
                        <span>•</span>
                        <span className="font-mono text-[11px] text-mute">{item.ref}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        openInquiryModal(
                          "Directives & Standards",
                          `Request official release copy of technical directive: ${item.title} (Ref: ${item.ref}) from ${organization.name}.`,
                          "Institutional Document Request"
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-white border border-line text-graphite hover:border-royal hover:text-royal text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-center shadow-2xs cursor-pointer"
                    >
                      <span>Request Document</span>
                      <ExternalLink className="w-3 h-3 text-stone" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: JURISDICTION & CITIES */}
        {activeTab === "presence" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl border border-line p-6 sm:p-8 shadow-xs space-y-6">
              <div>
                <h2 className="text-base font-extrabold text-graphite tracking-tight flex items-center gap-2">
                  <Compass className="w-4 h-4 text-royal" />
                  <span>Sector Cities &amp; Jurisdiction ({organization.activeSectorCitiesCount})</span>
                </h2>
                <p className="text-xs text-stone mt-1">
                  Active sector cities across MarineWorld where {organization.name} operates official accreditation frameworks.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                {[
                  "ASSOCIATIONS.CITY",
                  "GOVERNANCE.CITY",
                  "REGISTRIES.CITY",
                  "CHAMBERS.CITY",
                  "SUPPLYCHAIN.CITY",
                  "PORTOPS.CITY",
                  "SHIPBUILDING.CITY",
                  "MARINEAI.CITY",
                ].map((cityDomain, idx) => {
                  const citySlug = cityDomain.replace(/\.CITY$/i, "").toLowerCase();
                  return (
                    <a
                      key={idx}
                      href={`/${citySlug}`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigateTo(`/${citySlug}`);
                      }}
                      className="p-4 rounded-2xl bg-slate-50 border border-line hover:border-royal hover:bg-royal/5 transition text-center space-y-1 group"
                    >
                      <Globe className="w-5 h-5 text-royal mx-auto mb-1 group-hover:scale-110 transition-transform" />
                      <div className="font-mono text-xs font-bold text-graphite group-hover:text-royal transition">
                        {cityDomain}
                      </div>
                      <div className="text-[10px] text-stone font-medium">
                        Active Jurisdiction
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SECRETARIAT & INQUIRIES */}
        {activeTab === "connect" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl border border-line p-6 sm:p-8 shadow-xs space-y-6">
              <div>
                <h2 className="text-base font-extrabold text-graphite tracking-tight flex items-center gap-2">
                  <Mail className="w-4 h-4 text-royal" />
                  <span>Executive Secretariat &amp; Inquiries</span>
                </h2>
                <p className="text-xs text-stone mt-1">
                  Direct contact channels for institutional collaboration, member enrollment, and standards compliance.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="p-6 bg-slate-50 rounded-2xl border border-line space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone">
                    Secretariat Headquarters
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-stone block">Organization Name:</span>
                      <span className="font-bold text-graphite">{organization.legalName}</span>
                    </div>

                    <div>
                      <span className="text-stone block">Principal Executive Authority:</span>
                      <span className="font-bold text-graphite">
                        {organization.principalAuthorityName} ({organization.principalAuthorityRole})
                      </span>
                    </div>

                    <div>
                      <span className="text-stone block">Official Contact Email:</span>
                      <a
                        href={`mailto:${organization.officialContactEmail}`}
                        className="font-mono font-bold text-royal hover:underline"
                      >
                        {organization.officialContactEmail}
                      </a>
                    </div>

                    <div>
                      <span className="text-stone block">Official Website:</span>
                      <a
                        href={organization.officialWebsite}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-royal hover:underline flex items-center gap-1"
                      >
                        <span>{organization.officialWebsite}</span>
                        <ExternalLink className="w-3 h-3 text-royal" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-royal/5 rounded-2xl border border-royal/20 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-royal">
                    Send Secretariat Inquiry
                  </h3>
                  <p className="text-xs text-stone">
                    Submit formal correspondence regarding membership accreditation, partnership, or regulatory coordination.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      openInquiryModal(
                        "Secretariat Partnership",
                        "",
                        "Institutional Secretariat Inquiry"
                      )
                    }
                    className="w-full py-3 rounded-xl bg-royal hover:bg-royal-dark text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Send className="w-4 h-4" />
                    <span>Open Inquiry Form</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* INSTITUTIONAL INQUIRY MODAL */}
      {inquiryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-line shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-royal" />
                <h3 className="text-base font-extrabold text-graphite">
                  {inquiryModalTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInquiryModalOpen(false)}
                className="text-stone hover:text-graphite font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            {inquirySubmitted ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-extrabold text-graphite">
                  Inquiry Dispatched to Secretariat
                </h4>
                <p className="text-xs text-stone max-w-sm mx-auto">
                  Your communication has been formally transmitted to the secretariat of {organization.name}. An accredited representative will reply via your registered domain.
                </p>
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-graphite">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={inquiryForm.name}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                    placeholder="e.g. Captain Marcus Vance"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-line rounded-xl focus:outline-hidden focus:border-royal text-graphite font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-graphite">Official Business Email</label>
                  <input
                    type="email"
                    required
                    value={inquiryForm.email}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                    placeholder="e.g. m.vance@shipping-corp.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-line rounded-xl focus:outline-hidden focus:border-royal text-graphite font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-graphite">Organization / Company Name</label>
                  <input
                    type="text"
                    required
                    value={inquiryForm.company}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, company: e.target.value })}
                    placeholder="e.g. North Sea Marine Logistics"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-line rounded-xl focus:outline-hidden focus:border-royal text-graphite font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-graphite">Inquiry Category</label>
                  <select
                    value={inquiryForm.topic}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, topic: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-line rounded-xl focus:outline-hidden focus:border-royal text-graphite font-medium"
                  >
                    <option value="Membership Accreditation">Membership &amp; Accreditation Application</option>
                    <option value="Regulatory Policy">Regulatory Policy &amp; Standards Inquiries</option>
                    <option value="Directives & Standards">Knowledge Base &amp; Technical Directives</option>
                    <option value="Secretariat Partnership">Secretariat Institutional Coordination</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-graphite">Correspondence Message</label>
                  <textarea
                    rows={3}
                    required
                    value={inquiryForm.message}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                    placeholder="Detail your inquiry or request for accreditation..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-line rounded-xl focus:outline-hidden focus:border-royal text-graphite font-medium"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setInquiryModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-line text-stone hover:text-graphite font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-royal hover:bg-royal-dark text-white font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit to Secretariat</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
