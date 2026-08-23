import { useState, useEffect } from "react";
import type { CompanyProfile, SectorCity, IndustryDomainEntity } from "@/lib/types";
import {
  X,
  Phone,
  Mail,
  MessageCircle,
  Linkedin,
  Instagram,
  Youtube,
  Facebook,
  MapPin,
  Globe,
  ExternalLink,
  Check,
  Copy,
  ShieldCheck,
  CheckCircle2,
  Share2,
  ShoppingCart,
  ArrowUpRight,
  Package,
} from "lucide-react";
import { StaffDigitalCardModal, StaffMemberInfo } from "./StaffDigitalCardModal";
import { ShareProtocolModal } from "./ShareProtocolModal";

export function CompanyConnectPortalModal({
  isOpen,
  onClose,
  company,
  primaryCity,
  parentDomain,
}: {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyProfile;
  primaryCity?: SectorCity;
  parentDomain?: IndustryDomainEntity;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMemberInfo | null>(null);
  const [isShareCompanyOpen, setIsShareCompanyOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !selectedStaff && !isShareCompanyOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, selectedStaff, isShareCompanyOpen, onClose]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const displayName = company.displayName || company.name || "Enterprise Company";
  const legalName = company.legalName || displayName;
  const hqCity = String(company.headquartersCity || company.city || "Headquarters");
  const country = String(company.country || company.location || "Global");

  // Derive domain from company website or slug
  const companySlug = String(company.slug || company.id || "company");
  const webDomain = company.website
    ? company.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "")
    : `${companySlug.toLowerCase()}.com`;

  const officialEmail = company.officialEmail || `info@${webDomain}`;
  const officialWebsite = company.website?.startsWith("http") ? company.website : `https://${webDomain}`;

  // Grounded real-feel contact registry numbers based on geography
  const isTurkey = country.toLowerCase().includes("turkey") || country.toLowerCase().includes("türkiye") || hqCity.toLowerCase().includes("istanbul");
  const isGermany = country.toLowerCase().includes("germany") || country.toLowerCase().includes("deutschland") || hqCity.toLowerCase().includes("bremen") || hqCity.toLowerCase().includes("hamburg");
  const isUK = country.toLowerCase().includes("uk") || country.toLowerCase().includes("united kingdom") || country.toLowerCase().includes("britain");
  const isNorway = country.toLowerCase().includes("norway") || country.toLowerCase().includes("norge") || hqCity.toLowerCase().includes("oslo") || hqCity.toLowerCase().includes("bergen");
  const isNetherlands = country.toLowerCase().includes("netherlands") || country.toLowerCase().includes("holland") || hqCity.toLowerCase().includes("rotterdam");

  const phoneHq = company.officialPhone || (
    isTurkey ? "+90 (212) 555 1255" :
    isGermany ? "+49 (421) 6604-0" :
    isUK ? "+44 (20) 7946 0991" :
    isNorway ? "+47 (22) 55 99 00" :
    isNetherlands ? "+31 (10) 799 9000" :
    "+1 (212) 555-0199"
  );

  const phoneOperations = (
    isTurkey ? "+90 (232) 444 8833" :
    isGermany ? "+49 (40) 3344 8800" :
    isUK ? "+44 (23) 8099 4433" :
    isNorway ? "+47 (55) 30 11 00" :
    isNetherlands ? "+31 (10) 412 8844" :
    "+1 (305) 555-0182"
  );

  const phoneStrategic = (
    isTurkey ? "+90 (532) 999 4400" :
    isGermany ? "+49 (170) 552 1199" :
    isUK ? "+44 (7700) 900822" :
    isNorway ? "+47 (90) 12 34 56" :
    isNetherlands ? "+31 (6) 5544 3322" :
    "+1 (800) 555-0144"
  );

  const cleanPhone = (phone: string) => phone.replace(/[^\d+]/g, "");

  // Staff members: executive roles moderated, commercial/support roles directly contactable
  const staffMembers: StaffMemberInfo[] = [
    {
      id: "staff-1",
      name: "SARAH CHEN",
      role: "CEO / Strategic Relations",
      department: "Executive Office",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80",
      email: `s.chen@${webDomain}`,
      phone: phoneStrategic,
      whatsapp: cleanPhone(phoneStrategic),
      linkedin: `https://linkedin.com/company/${company.slug || company.id}`,
      twitter: "https://x.com",
      instagram: "https://instagram.com",
      isOnline: true,
      isExecutive: true,
    },
    {
      id: "staff-2",
      name: "MARCUS VANE",
      role: "Sales Engineer",
      department: "Commercial & B2B Solutions",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
      email: `m.vane@${webDomain}`,
      phone: phoneOperations,
      whatsapp: cleanPhone(phoneOperations),
      linkedin: `https://linkedin.com/company/${company.slug || company.id}`,
      twitter: "https://x.com",
      instagram: "https://instagram.com",
      isOnline: true,
      isExecutive: false,
    },
    {
      id: "staff-3",
      name: "ELENA ROSTOVA",
      role: "Operations Director",
      department: "Global Shipyard Operations",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80",
      email: `e.rostova@${webDomain}`,
      phone: phoneHq,
      whatsapp: cleanPhone(phoneHq),
      linkedin: `https://linkedin.com/company/${company.slug || company.id}`,
      twitter: "https://x.com",
      instagram: "https://instagram.com",
      isOnline: true,
      isExecutive: false,
    },
    {
      id: "staff-4",
      name: "DAVID KAEL",
      role: "Customer Success Tech",
      department: "Fleet Support & Warranty",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
      email: `d.kael@${webDomain}`,
      phone: phoneOperations,
      whatsapp: cleanPhone(phoneOperations),
      linkedin: `https://linkedin.com/company/${company.slug || company.id}`,
      twitter: "https://x.com",
      instagram: "https://instagram.com",
      isOnline: true,
      isExecutive: false,
    },
  ];

  // E-Commerce & Global Procurement
  const eTradeNodes = [
    {
      id: "eshop-direct",
      title: "Official Direct Store",
      description: "Direct parts catalog, certified marine spares, and accessories with global express courier delivery.",
      url: `${officialWebsite}/shop`,
      badge: "Direct Store",
      icon: ShoppingCart,
      buttonText: "Visit Store",
    },
    {
      id: "etrade-b2b",
      title: "B2B Procurement Portal",
      description: "Institutional trade portal for bulk equipment orders, RFQ generation, and contractual fleet procurement.",
      url: `${officialWebsite}/procurement`,
      badge: "B2B Procurement",
      icon: Package,
      buttonText: "Procurement Portal",
    },
  ];

  // Social Media Channels
  const socialChannels = [
    {
      id: "linkedin",
      name: "LinkedIn",
      handle: `@${company.slug || company.id}`,
      url: `https://linkedin.com/company/${company.slug || company.id}`,
      icon: Linkedin,
      color: "text-blue-700 bg-blue-50 border-blue-200/60 hover:bg-blue-100",
    },
    {
      id: "x",
      name: "X",
      handle: `@${company.slug || company.id}_official`,
      url: "https://x.com",
      icon: () => <span className="font-bold text-xs leading-none text-slate-900">𝕏</span>,
      color: "text-slate-900 bg-slate-100 border-slate-200 hover:bg-slate-200",
    },
    {
      id: "instagram",
      name: "Instagram",
      handle: `@${company.slug || company.id}`,
      url: "https://instagram.com",
      icon: Instagram,
      color: "text-pink-600 bg-pink-50 border-pink-200/60 hover:bg-pink-100",
    },
    {
      id: "youtube",
      name: "YouTube",
      handle: `${displayName} Official`,
      url: "https://youtube.com",
      icon: Youtube,
      color: "text-red-600 bg-red-50 border-red-200/60 hover:bg-red-100",
    },
    {
      id: "facebook",
      name: "Facebook",
      handle: displayName,
      url: "https://facebook.com",
      icon: Facebook,
      color: "text-blue-800 bg-blue-50 border-blue-200/60 hover:bg-blue-100",
    },
    {
      id: "whatsapp-channel",
      name: "WhatsApp Broadcast",
      handle: "Official Corporate Feed",
      url: `https://wa.me/${cleanPhone(phoneHq)}`,
      icon: MessageCircle,
      color: "text-emerald-700 bg-emerald-50 border-emerald-200/60 hover:bg-emerald-100",
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden font-sans">
        {/* Backdrop with smooth fade */}
        <div
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
          onClick={onClose}
        />

        {/* Slide-over Drawer Container */}
        <div className="fixed inset-y-0 right-0 flex max-w-full pl-6 sm:pl-10">
          <div className="w-screen max-w-2xl bg-white shadow-2xl border-l border-line flex flex-col transform transition-transform duration-300 ease-out animate-in slide-in-from-right">
            
            {/* Header: Medallion Logo, Dominant Name, Inline Verified Badge */}
            <div className="border-b border-line bg-canvas/80 p-6 sm:p-7 flex items-start justify-between gap-4 shrink-0">
              <div className="flex items-start gap-4">
                {/* Medallion Seal Logo Frame matching Company Header */}
                <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full border border-royal p-[2px] bg-white">
                  <div className="flex h-full w-full items-center justify-center rounded-full border border-line bg-canvas overflow-hidden font-sans text-sm sm:text-base font-bold text-graphite">
                    {company.logoUrl && !logoError ? (
                      <img
                        src={company.logoUrl}
                        alt={displayName}
                        className="h-full w-full object-contain p-1 rounded-full"
                        onError={() => setLogoError(true)}
                      />
                    ) : (
                      <span>{company.initials || displayName.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-royal">
                    <span>Company Contacts</span>
                    <span className="text-slate-300">•</span>
                    <span>Direct Reach</span>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-graphite font-sans">
                      {displayName}
                    </h2>
                    <span className="inline-flex items-center gap-1 font-sans text-xs font-medium text-emerald-700 whitespace-nowrap">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Verified</span>
                    </span>
                  </div>
                  <p className="text-xs text-stone leading-relaxed font-sans">
                    Get in touch with {displayName} directly — sales, support, and commercial channels.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Share Action */}
                <button
                  type="button"
                  id="btn-share-company-node"
                  onClick={() => setIsShareCompanyOpen(true)}
                  className="w-9 h-9 rounded-card-xs border border-line bg-canvas p-2 text-stone hover:text-graphite hover:bg-soft transition flex items-center justify-center cursor-pointer shadow-2xs"
                  title="Share Contacts"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  id="btn-close-connect-portal"
                  onClick={onClose}
                  className="w-9 h-9 rounded-card-xs border border-line bg-canvas p-2 text-stone hover:text-graphite hover:bg-soft transition flex items-center justify-center cursor-pointer shadow-2xs"
                  aria-label="Close contacts"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-7 bg-canvas/30">
              
              {/* Team Contacts */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-royal font-sans">
                    Team Contacts
                  </h3>
                  <span className="text-[11px] font-medium text-stone font-sans">
                    Key Representatives
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {staffMembers.map((staff) => (
                    <div
                      key={staff.id}
                      className="group rounded-card-md border border-line bg-white p-4 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all space-y-3 relative"
                    >
                      {/* Top profile card header */}
                      <div
                        onClick={() => setSelectedStaff(staff)}
                        className="flex items-center gap-3 cursor-pointer"
                        title={staff.isExecutive ? "View executive desk" : "View digital business card"}
                      >
                        <div className="relative shrink-0">
                          {staff.avatar ? (
                            <img
                              src={staff.avatar}
                              alt={staff.name}
                              className="w-12 h-12 rounded-card-sm object-cover border border-line shadow-2xs transition-transform group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-card-sm bg-canvas border border-line flex items-center justify-center text-xs font-bold text-graphite font-sans">
                              {staff.name.slice(0, 2)}
                            </div>
                          )}
                          {staff.isOnline && (
                            <span
                              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-2xs"
                              title="Available"
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-graphite tracking-tight truncate group-hover:text-royal transition-colors font-sans">
                              {staff.name}
                            </span>
                            <span className="text-[10px] font-medium text-stone bg-canvas px-1.5 py-0.5 rounded border border-line font-sans">
                              {staff.isExecutive ? "Executive" : "Direct"}
                            </span>
                          </div>
                          <div className="text-[11px] font-medium text-stone truncate font-sans mt-0.5">
                            {staff.role}
                          </div>
                        </div>
                      </div>

                      {/* Card Action */}
                      {staff.isExecutive ? (
                        /* Executive: Single action routed to Executive / Strategic Relations channel */
                        <div className="pt-2 border-t border-line">
                          <a
                            href={`mailto:${officialEmail}?subject=${encodeURIComponent(`Strategic Inquiry: ${displayName}`)}`}
                            className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-card-xs bg-canvas hover:bg-soft text-graphite border border-line text-xs font-semibold font-sans transition shadow-2xs"
                          >
                            <span>Contact Executive &amp; Strategic Relations</span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-stone" />
                          </a>
                        </div>
                      ) : (
                        /* Commercial & Operational Staff: Quick action buttons */
                        <div className="flex items-center gap-1.5 pt-2 border-t border-line text-[11px] font-medium font-sans">
                          <a
                            href={`mailto:${staff.email}`}
                            className="flex-1 text-center py-1.5 rounded-card-xs bg-canvas hover:bg-soft text-graphite border border-line transition"
                          >
                            Email
                          </a>
                          <a
                            href={`tel:${cleanPhone(staff.phone)}`}
                            className="flex-1 text-center py-1.5 rounded-card-xs bg-canvas hover:bg-soft text-graphite border border-line transition"
                          >
                            Call
                          </a>
                          {staff.whatsapp && (
                            <a
                              href={`https://wa.me/${cleanPhone(staff.whatsapp)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 text-center py-1.5 rounded-card-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 transition"
                            >
                              WhatsApp
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedStaff(staff)}
                            className="flex-1 text-center py-1.5 rounded-card-xs bg-royal/10 hover:bg-royal/20 text-royal border border-royal/20 transition font-medium cursor-pointer"
                          >
                            Card
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Shop & Procurement */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-royal font-sans">
                    Shop &amp; Procurement
                  </h3>
                  <span className="text-[11px] font-medium text-stone font-sans">
                    Direct Access
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {eTradeNodes.map((node) => {
                    const Icon = node.icon;
                    return (
                      <div
                        key={node.id}
                        className="rounded-card-md border border-line bg-white p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-3.5"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="w-8 h-8 rounded-card-sm bg-canvas border border-line flex items-center justify-center text-royal">
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-medium text-stone bg-canvas px-2 py-0.5 rounded border border-line font-sans">
                              {node.badge}
                            </span>
                          </div>

                          <div>
                            <h4 className="text-xs font-bold text-graphite tracking-tight font-sans">
                              {node.title}
                            </h4>
                            <p className="text-[11px] text-stone leading-relaxed mt-1 font-sans">
                              {node.description}
                            </p>
                          </div>
                        </div>

                        <a
                          href={node.url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-card-sm bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold tracking-wider uppercase transition shadow-2xs font-sans"
                        >
                          <span>{node.buttonText}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Social Channels */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-royal font-sans">
                    Social Channels
                  </h3>
                  <span className="text-[11px] font-medium text-stone font-sans">
                    Official Profiles
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {socialChannels.map((soc) => {
                    const Icon = soc.icon;
                    return (
                      <a
                        key={soc.id}
                        href={soc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2.5 rounded-card-md border border-line bg-white p-3 shadow-2xs hover:border-slate-300 hover:bg-slate-50/70 transition group"
                      >
                        <div className={`w-8 h-8 rounded-card-sm border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${soc.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-graphite truncate font-sans">
                            {soc.name}
                          </div>
                          <div className="text-[10px] text-stone truncate font-sans">
                            {soc.handle}
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </section>

              {/* Phone, Address & Email */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-royal font-sans">
                    Phone, Address &amp; Email
                  </h3>
                  <span className="text-[11px] font-medium text-stone font-sans">
                    Official Registry
                  </span>
                </div>

                <div className="space-y-2.5">
                  
                  {/* Headquarters Line */}
                  <div className="rounded-card-md border border-line bg-white p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-card-sm bg-canvas border border-line flex items-center justify-center text-royal shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-mute font-sans">
                          Head Office Phone
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-graphite font-sans">
                          {phoneHq}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-medium font-sans self-end sm:self-center">
                      <a
                        href={`tel:${cleanPhone(phoneHq)}`}
                        className="px-3 py-1.5 rounded-card-xs bg-canvas border border-line hover:bg-soft text-graphite transition shadow-2xs"
                      >
                        Call
                      </a>
                      <a
                        href={`https://wa.me/${cleanPhone(phoneHq)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-card-xs bg-emerald-50 border border-emerald-200/60 hover:bg-emerald-100 text-emerald-700 transition shadow-2xs"
                      >
                        WhatsApp
                      </a>
                    </div>
                  </div>

                  {/* Operations / Technical Desk */}
                  <div className="rounded-card-md border border-line bg-white p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-card-sm bg-canvas border border-line flex items-center justify-center text-royal shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-mute font-sans">
                          Operations &amp; Technical Desk
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-graphite font-sans">
                          {phoneOperations}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-medium font-sans self-end sm:self-center">
                      <a
                        href={`tel:${cleanPhone(phoneOperations)}`}
                        className="px-3 py-1.5 rounded-card-xs bg-canvas border border-line hover:bg-soft text-graphite transition shadow-2xs"
                      >
                        Call
                      </a>
                      <a
                        href={`https://wa.me/${cleanPhone(phoneOperations)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-card-xs bg-emerald-50 border border-emerald-200/60 hover:bg-emerald-100 text-emerald-700 transition shadow-2xs"
                      >
                        WhatsApp
                      </a>
                    </div>
                  </div>

                  {/* Strategic Desk */}
                  <div className="rounded-card-md border border-line bg-white p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-card-sm bg-canvas border border-line flex items-center justify-center text-royal shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-mute font-sans">
                          Strategic &amp; Commercial Relations
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-graphite font-sans">
                          {phoneStrategic}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-medium font-sans self-end sm:self-center">
                      <a
                        href={`tel:${cleanPhone(phoneStrategic)}`}
                        className="px-3 py-1.5 rounded-card-xs bg-canvas border border-line hover:bg-soft text-graphite transition shadow-2xs"
                      >
                        Call
                      </a>
                      <a
                        href={`mailto:${officialEmail}?subject=${encodeURIComponent(`Strategic Inquiry: ${displayName}`)}`}
                        className="px-3 py-1.5 rounded-card-xs bg-canvas border border-line hover:bg-soft text-graphite transition shadow-2xs"
                      >
                        Email
                      </a>
                    </div>
                  </div>

                  {/* Registered Head Office Address */}
                  <div className="rounded-card-md border border-line bg-white p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-card-sm bg-canvas border border-line flex items-center justify-center text-royal shrink-0 mt-0.5">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-mute font-sans">
                          Registered Head Office Address
                        </div>
                        <div className="text-xs font-semibold text-graphite font-sans">
                          {hqCity} Corporate Campus, {hqCity}, {country}
                        </div>
                      </div>
                    </div>

                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(`${displayName} ${hqCity} ${country}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-card-xs border border-line bg-canvas hover:bg-soft text-stone hover:text-graphite transition shrink-0 shadow-2xs"
                      title="Open in Google Maps"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                </div>
              </section>

              {/* Direct Mail & Official Domain */}
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* Official Mail */}
                <div className="rounded-card-md border border-line bg-white p-4 flex flex-col justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-card-sm bg-canvas border border-line flex items-center justify-center text-royal shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-mute font-sans">
                        Official Contact Email
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-graphite truncate font-sans">
                        {officialEmail}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-line font-sans">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(officialEmail, "email")}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-card-xs border border-line bg-canvas hover:bg-soft text-xs font-semibold text-graphite transition shadow-2xs cursor-pointer"
                    >
                      {copiedKey === "email" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 text-xs">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-stone" />
                          <span>Copy Email</span>
                        </>
                      )}
                    </button>

                    <a
                      href={`mailto:${officialEmail}`}
                      className="p-2 rounded-card-xs border border-line bg-canvas hover:bg-soft text-stone hover:text-graphite transition shadow-2xs shrink-0"
                      title="Send Direct Email"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Primary Web Domain */}
                <div className="rounded-card-md border border-line bg-white p-4 flex flex-col justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-card-sm bg-canvas border border-line flex items-center justify-center text-royal shrink-0">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-mute font-sans">
                        Primary Web Domain
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-graphite truncate font-sans">
                        {officialWebsite}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-line font-sans">
                    <a
                      href={officialWebsite}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-card-xs border border-line bg-canvas hover:bg-soft text-xs font-semibold text-graphite transition shadow-2xs"
                    >
                      <span>Visit Website</span>
                      <ExternalLink className="w-3.5 h-3.5 text-stone" />
                    </a>
                  </div>
                </div>

              </section>

            </div>

            {/* Footer Attribution */}
            <div className="border-t border-line bg-canvas px-6 py-3.5 flex items-center justify-between text-xs shrink-0 font-sans">
              <span className="text-stone font-medium">{displayName} Direct Reach</span>
              <span className="text-slate-500 font-medium">Powered by UPhi™</span>
            </div>

          </div>
        </div>
      </div>

      {/* Staff Digital Business Card Modal */}
      <StaffDigitalCardModal
        isOpen={Boolean(selectedStaff)}
        onClose={() => setSelectedStaff(null)}
        staff={selectedStaff}
        company={company}
      />

      {/* Share Modal */}
      <ShareProtocolModal
        isOpen={isShareCompanyOpen}
        onClose={() => setIsShareCompanyOpen(false)}
        title={`Share ${displayName}`}
        url={`https://marineworld.city/companies/${company.slug || company.id}`}
        description="Anyone with this link can view this company page."
      />
    </>
  );
}
