import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Compass,
  X,
  Send,
  Building2,
  ShieldCheck,
  ArrowRight,
  Search,
  CheckCircle2,
  Zap,
  Award,
  User,
  ArrowUpRight,
  MessageSquare,
  Check,
  Radio,
} from "lucide-react";
import type { SectorConfig, SectorCity, CompanyProfile } from "@/lib/types";
import { resolveRegionEdition, type CityRegionEdition } from "@/lib/services/propertyService";
import { getCityAnchor, type CityAnchorCredential, isCompanyAnchor, isCompanyFlagship } from "@/lib/registry";
import { recordAdvisorOpenEvent, type AdvisorOpenSource } from "@/lib/services/anchorVisibilityService";

export interface SectorCityAdvisorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  city: SectorCity;
  parentDomainName?: string;
  activeRegionEdition?: CityRegionEdition;
  allCityCompanies?: CompanyProfile[];
  config: SectorConfig;
  onNavigateUrl?: (url: string) => void;
  cityAnchor?: CityAnchorCredential | null;
  entrySource?: AdvisorOpenSource;
  referringCompanyId?: string;
  referringCompanyName?: string;
}

export interface SectorCityAdvisorCompactStripProps {
  city: SectorCity;
  config: SectorConfig;
  allCityCompanies?: CompanyProfile[];
  activeRegionEdition?: CityRegionEdition;
  parentDomainName?: string;
  onNavigateUrl?: (url: string) => void;
  cityAnchor?: CityAnchorCredential | null;
  className?: string;
  entrySource?: AdvisorOpenSource;
}

interface MessageItem {
  id: string;
  sender: "user" | "advisor";
  text: string;
  timestamp: string;
  confidence?: "HIGH" | "MEDIUM" | "LOW";
  recommendedCompanies?: CompanyProfile[];
  actionLink?: {
    label: string;
    url: string;
  };
}

/**
 * SectorCityAdvisorDrawer — The canonical AI Advisor and City Guide
 * Unified single source of truth for city guidance, Gemini-assisted discovery,
 * verified directory lookup, capability matrix, and participation onboarding.
 */
export function SectorCityAdvisorDrawer({
  isOpen,
  onClose,
  city,
  parentDomainName = "MARINETECH",
  activeRegionEdition: customActiveRegionEdition,
  allCityCompanies = [],
  config,
  onNavigateUrl,
  cityAnchor,
  entrySource = "sector_city_page",
  referringCompanyId,
  referringCompanyName,
}: SectorCityAdvisorDrawerProps) {
  const activeRegionEdition = useMemo(() => {
    if (customActiveRegionEdition) return customActiveRegionEdition;
    return resolveRegionEdition(city.id || city.slug, "global");
  }, [customActiveRegionEdition, city]);

  const [activeTab, setActiveTab] = useState<"chat" | "directory" | "capabilities" | "presence">("chat");
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [directorySearch, setDirectorySearch] = useState("");
  const [capabilityFilter, setCapabilityFilter] = useState<string | null>(null);

  // Single source of truth for city anchor
  const resolvedAnchor = useMemo(() => {
    if (cityAnchor !== undefined) return cityAnchor;
    return getCityAnchor(config, city.id || city.slug);
  }, [cityAnchor, config, city]);

  // Construct dynamic anchor-aware welcome message
  const buildWelcomeMessage = () => {
    const anchorName = resolvedAnchor?.company?.displayName || resolvedAnchor?.company?.name;
    const anchorSnippet = anchorName
      ? `\n\nThis registry's current Anchor is **${anchorName}**.`
      : "";

    return `Welcome! I am the **${city.domain}** (🌐 ${activeRegionEdition.name}) Sector City AI Advisor.${anchorSnippet}\n\nI am here to guide you through **${allCityCompanies.length} verified enterprises and operators** in this sector city, match technical capabilities, and accelerate your commercial inquiries.`;
  };

  // Initialize messages with anchor-aware welcome greeting
  const [messages, setMessages] = useState<MessageItem[]>(() => [
    {
      id: "msg-welcome",
      sender: "advisor",
      text: buildWelcomeMessage(),
      confidence: "HIGH",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  // Update initial welcome message whenever drawer is opened or anchor/city context updates
  useEffect(() => {
    if (isOpen) {
      setMessages((prev) => {
        const welcomeText = buildWelcomeMessage();
        if (prev.length === 0 || prev[0].id === "msg-welcome") {
          return [
            {
              id: "msg-welcome",
              sender: "advisor",
              text: welcomeText,
              confidence: "HIGH",
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
            ...prev.filter((m) => m.id !== "msg-welcome"),
          ];
        }
        return prev;
      });
    }
  }, [isOpen, city.domain, activeRegionEdition.name, resolvedAnchor, allCityCompanies.length]);

  // Track genuine visibility / open event for Anchor reporting
  const trackedRef = useRef(false);
  useEffect(() => {
    if (isOpen && !trackedRef.current) {
      trackedRef.current = true;
      recordAdvisorOpenEvent({
        cityId: city.id || city.slug,
        cityDomain: city.domain,
        source: entrySource,
        referringCompanyId,
        referringCompanyName,
        anchorCompanyId: resolvedAnchor?.company?.id,
        anchorCompanyName: resolvedAnchor?.company?.displayName || resolvedAnchor?.company?.name,
      });
    } else if (!isOpen) {
      trackedRef.current = false;
    }
  }, [
    isOpen,
    city.id,
    city.slug,
    city.domain,
    entrySource,
    referringCompanyId,
    referringCompanyName,
    resolvedAnchor,
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, activeTab]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Extract unique capabilities across all companies in this city
  const cityCapabilities = Array.from(
    new Set(
      allCityCompanies.flatMap((c) => c.capabilities || [c.industry || "Maritime Technology"])
    )
  ).slice(0, 12);

  const navigateTo = (path: string) => {
    if (onNavigateUrl) {
      onNavigateUrl(path);
    } else {
      window.location.href = path;
    }
  };

  const handleQuickPrompt = (promptText: string) => {
    handleAsk(promptText);
  };

  const handleAsk = (queryText: string) => {
    if (!queryText.trim() || loading) return;

    const userMsg: MessageItem = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: queryText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setLoading(true);

    setTimeout(() => {
      const q = queryText.toLowerCase();
      let responseText = "";
      let matchedCompanies: CompanyProfile[] = [];
      let actionLink: { label: string; url: string } | undefined = undefined;

      // Intelligent matchers
      if (
        q.includes("company") ||
        q.includes("companies") ||
        q.includes("firm") ||
        q.includes("enterprise") ||
        q.includes("list") ||
        q.includes("who") ||
        q.includes("operator")
      ) {
        matchedCompanies = allCityCompanies.slice(0, 5);
        responseText = `There are **${allCityCompanies.length} verified enterprises** operating within **${city.domain}**.\n\nBelow are some featured operators and their technical specializations. You can inspect any enterprise profile or initiate a direct RFQ (Request for Quote).`;
        actionLink = {
          label: "Browse All Companies",
          url: "#directory",
        };
      } else if (
        q.includes("rfq") ||
        q.includes("quote") ||
        q.includes("proposal") ||
        q.includes("pricing") ||
        q.includes("contact") ||
        q.includes("inquiry") ||
        q.includes("order")
      ) {
        matchedCompanies = allCityCompanies.slice(0, 3);
        responseText = `Submitting a B2B Request for Quote (RFQ) to **${city.domain}** members is streamlined:\n\n1. Select any verified company and click **'Initiate RFQ'** on their profile.\n2. Enter your technical specifications, volume requirements, and project timeline.\n3. Your inquiry routes directly to the company's accredited B2B desk and Sovereign AI Twin.`;
      } else if (
        q.includes("participate") ||
        q.includes("onboarding") ||
        q.includes("join") ||
        q.includes("register") ||
        q.includes("presence") ||
        q.includes("parcel") ||
        q.includes("office") ||
        q.includes("lease")
      ) {
        responseText = `To establish your company's commercial digital presence in **${city.domain}** Sector City:\n\n1. **Corporate Registration**: Create your Sovereign Digital Identity in Company Studio.\n2. **Commercial Parcel Allocation**: Claim your digital property in the ${activeRegionEdition.name} edition.\n3. **Catalog & AI Twin**: Upload technical datasheets; your Grounded AI Advisor configures automatically.\n\nClick below to begin the onboarding process.`;
        actionLink = {
          label: "Establish Commercial Presence",
          url: "/onboarding",
        };
      } else {
        // Keyword search against companies & capabilities
        const keywords = q.split(" ").filter((k) => k.length > 2);
        const filtered = allCityCompanies.filter((c) => {
          const compText = `${c.name} ${c.description || ""} ${(c.capabilities || []).join(" ")} ${c.industry || ""}`.toLowerCase();
          return keywords.some((kw) => compText.includes(kw));
        });

        if (filtered.length > 0) {
          matchedCompanies = filtered.slice(0, 4);
          responseText = `Found **${filtered.length} verified enterprises** matching your search criteria:\n\nThe following companies provide the verified technical capabilities and certified solutions you requested.`;
        } else {
          matchedCompanies = allCityCompanies.slice(0, 3);
          responseText = `Your inquiry has been processed against the **${city.domain}** Sector City Registry.\n\n${city.description || "This sector city unites leading maritime engineering, logistics, and technology providers."}\n\nExplore featured accredited enterprises active in this jurisdiction below.`;
        }
      }

      const advisorMsg: MessageItem = {
        id: `adv-${Date.now()}`,
        sender: "advisor",
        text: responseText,
        confidence: "HIGH",
        recommendedCompanies: matchedCompanies.length > 0 ? matchedCompanies : undefined,
        actionLink,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, advisorMsg]);
      setLoading(false);
    }, 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk(inputQuery);
    }
  };

  // Directory filter
  const filteredDirectoryCompanies = allCityCompanies.filter((c) => {
    const matchesSearch =
      !directorySearch.trim() ||
      c.name.toLowerCase().includes(directorySearch.toLowerCase()) ||
      (c.capabilities || []).some((cap) => cap.toLowerCase().includes(directorySearch.toLowerCase())) ||
      (c.city || "").toLowerCase().includes(directorySearch.toLowerCase()) ||
      (c.industry || "").toLowerCase().includes(directorySearch.toLowerCase());

    const matchesCap =
      !capabilityFilter ||
      (c.capabilities || []).includes(capabilityFilter) ||
      c.industry === capabilityFilter;

    return matchesSearch && matchesCap;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[540px] md:w-[600px] lg:w-[660px] bg-white shadow-2xl border-l border-slate-200 flex flex-col h-full animate-in slide-in-from-right duration-300">
        
        {/* ========================================================================= */}
        {/* CORPORATE DRAWER HEADER (LIGHT INSTITUTIONAL SURFACE)                     */}
        {/* ========================================================================= */}
        <div className="bg-white text-graphite p-5 sm:p-6 shrink-0 relative overflow-hidden border-b border-line">
          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-royal/10 border border-royal/20 text-royal flex items-center justify-center shadow-xs shrink-0">
                <Compass className="w-6 h-6 text-royal" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-graphite font-sans">
                    {city.domain} Guide & AI Advisor
                  </h2>
                </div>
                <p className="text-xs text-stone mt-1 flex items-center gap-1.5 font-medium">
                  <span>🌐 {activeRegionEdition.name}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-stone">{parentDomainName}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-graphite shrink-0 cursor-pointer"
              title="Close Guide Drawer (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Badges Bar */}
          <div className="mt-4 pt-3 border-t border-line/80 flex items-center justify-between text-[11px] text-stone gap-2 flex-wrap font-mono">
            <div className="flex items-center gap-1.5 text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="font-semibold">SOVEREIGN REGISTRY GROUNDED</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {resolvedAnchor && (
                <div className="flex items-center gap-1.5 text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-300 font-sans text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  <span className="font-bold text-slate-600 uppercase tracking-wider text-[9.5px]">Anchor:</span>
                  <button
                    onClick={() => navigateTo(`/companies/${resolvedAnchor.company.slug || resolvedAnchor.company.id}`)}
                    className="text-royal hover:underline font-bold"
                  >
                    {resolvedAnchor.company.displayName || resolvedAnchor.company.name}
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-300 font-sans text-[11px]">
                <Building2 className="w-3 h-3 text-slate-600" />
                <span className="font-bold text-graphite">{allCityCompanies.length}</span>
                <span className="text-slate-600">Verified Firms</span>
              </div>
            </div>
          </div>

          {/* Drawer Navigation Tabs */}
          <div className="mt-4 flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-line text-xs font-semibold">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "chat"
                  ? "bg-white text-royal shadow-xs font-bold border border-line/60"
                  : "text-stone hover:text-graphite hover:bg-white/60"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>City AI Advisor</span>
            </button>

            <button
              onClick={() => setActiveTab("directory")}
              className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "directory"
                  ? "bg-white text-royal shadow-xs font-bold border border-line/60"
                  : "text-stone hover:text-graphite hover:bg-white/60"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Companies ({allCityCompanies.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("capabilities")}
              className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "capabilities"
                  ? "bg-white text-royal shadow-xs font-bold border border-line/60"
                  : "text-stone hover:text-graphite hover:bg-white/60"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Capabilities</span>
            </button>

            <button
              onClick={() => setActiveTab("presence")}
              className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "presence"
                  ? "bg-white text-royal shadow-xs font-bold border border-line/60"
                  : "text-stone hover:text-graphite hover:bg-white/60"
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Participation Guide</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB CONTENT 1: AI GUIDANCE CHAT                                          */}
        {/* ========================================================================= */}
        {activeTab === "chat" && (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
            {/* Quick Prompts Bar */}
            <div className="p-3 sm:p-4 bg-white border-b border-slate-200 shrink-0 overflow-x-auto">
              <div className="flex items-center gap-2 min-w-max">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-royal" /> QUICK INQUIRIES:
                </span>
                <button
                  onClick={() => handleQuickPrompt(`List all verified enterprises operating in ${city.domain}`)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-royal/5 hover:text-royal hover:border-royal/30 border border-slate-200 rounded-full text-xs font-medium text-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                >
                  🏢 All City Enterprises
                </button>
                <button
                  onClick={() => handleQuickPrompt(`Recommend verified technical service providers and manufacturers in ${city.domain}`)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-royal/5 hover:text-royal hover:border-royal/30 border border-slate-200 rounded-full text-xs font-medium text-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                >
                  🛠️ Technical Suppliers
                </button>
                <button
                  onClick={() => handleQuickPrompt("How do I submit an RFQ or commercial inquiry to companies in this sector city?")}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-royal/5 hover:text-royal hover:border-royal/30 border border-slate-200 rounded-full text-xs font-medium text-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                >
                  📑 RFQ & Sourcing Process
                </button>
                <button
                  onClick={() => handleQuickPrompt(`How can my company establish a commercial presence in ${city.domain} Sector City?`)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-royal/5 hover:text-royal hover:border-royal/30 border border-slate-200 rounded-full text-xs font-medium text-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                >
                  🌐 Register Commercial Presence
                </button>
              </div>
            </div>

            {/* Chat Messages Stream */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3.5 ${
                    msg.sender === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  {/* Avatar */}
                  {msg.sender === "user" ? (
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs text-xs font-bold">
                      <User className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-royal to-royal-dark text-white flex items-center justify-center shrink-0 shadow-xs ring-2 ring-royal/15">
                      <Compass className="w-4 h-4 text-white" />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-slate-900 text-white rounded-tr-none shadow-xs"
                        : "bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-2xs"
                    }`}
                  >
                    {/* Formatting text */}
                    <div className="space-y-2 whitespace-pre-line">
                      {msg.text.split("\n\n").map((paragraph, pIdx) => (
                        <p key={pIdx}>
                          {paragraph.split("**").map((chunk, cIdx) =>
                            cIdx % 2 === 1 ? (
                              <strong key={cIdx} className={msg.sender === "user" ? "font-bold text-white" : "font-bold text-slate-900"}>
                                {chunk}
                              </strong>
                            ) : (
                              chunk
                            )
                          )}
                        </p>
                      ))}
                    </div>

                    {/* Recommended Companies Cards Embed */}
                    {msg.recommendedCompanies && msg.recommendedCompanies.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                        <p className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                          MATCHED SECTOR ENTERPRISES:
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                          {msg.recommendedCompanies.map((comp) => (
                            <div
                              key={comp.id}
                              className="p-3 bg-slate-50 hover:bg-royal/5/50 border border-slate-200 hover:border-royal/30 rounded-xl transition-all flex items-center justify-between gap-3 group"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-royal">
                                    {comp.displayName || comp.name}
                                  </h4>
                                  {isCompanyAnchor(comp) && (
                                    <span className="bg-slate-100 border border-slate-300 text-slate-800 px-1.5 py-0.2 rounded-full text-[9px] font-bold">
                                      Anchor
                                    </span>
                                  )}
                                  <CheckCircle2 className="w-3.5 h-3.5 text-royal shrink-0" />
                                </div>
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                  {comp.capabilities?.[0] || comp.industry || comp.city || "Verified Enterprise"}
                                </p>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => navigateTo(`/companies/${comp.slug || comp.id}`)}
                                  className="px-2.5 py-1 bg-white hover:bg-slate-900 hover:text-white text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <span>View Company</span>
                                  <ArrowUpRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Link Button */}
                    {msg.actionLink && (
                      <div className="mt-3 pt-2">
                        <button
                          onClick={() => {
                            if (msg.actionLink?.url === "#directory") {
                              setActiveTab("directory");
                            } else {
                              navigateTo(msg.actionLink!.url);
                            }
                          }}
                          className="px-3 py-1.5 bg-royal hover:bg-royal-dark text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <span>{msg.actionLink.label}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Timestamp & Confidence */}
                    <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between font-mono">
                      <span>{msg.timestamp}</span>
                      {msg.confidence && (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Grounded High Precision
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-3 text-slate-500 text-xs font-mono p-3 bg-white border border-slate-200 rounded-2xl w-max shadow-2xs">
                  <div className="w-4 h-4 rounded-full border-2 border-royal border-t-transparent animate-spin" />
                  <span>Sector City AI Advisor is analyzing registry...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask about ${city.domain} enterprises, capabilities, or B2B sourcing...`}
                  className="w-full bg-slate-50 border border-slate-200 rounded-full pl-4 pr-12 py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-royal focus:bg-white transition-all shadow-inner"
                />
                <button
                  onClick={() => handleAsk(inputQuery)}
                  disabled={!inputQuery.trim() || loading}
                  className="absolute right-1.5 p-2 bg-slate-900 hover:bg-royal disabled:opacity-40 text-white rounded-full transition-colors cursor-pointer shadow-xs"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-mono text-center mt-2">
                MarineWorld Sovereign Registry • Grounded Multi-Tenant Intelligence
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB CONTENT 2: VERIFIED COMPANIES DIRECTORY                              */}
        {/* ========================================================================= */}
        {activeTab === "directory" && (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
            {/* Search and Filters */}
            <div className="p-4 bg-white border-b border-slate-200 shrink-0 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  placeholder="Search company name, capability, or location..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-royal"
                />
                {directorySearch && (
                  <button
                    onClick={() => setDirectorySearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Capability Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  onClick={() => setCapabilityFilter(null)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors ${
                    !capabilityFilter
                      ? "bg-slate-900 text-white font-bold"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All ({allCityCompanies.length})
                </button>
                {cityCapabilities.map((cap) => (
                  <button
                    key={cap}
                    onClick={() => setCapabilityFilter(capabilityFilter === cap ? null : cap)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors ${
                      capabilityFilter === cap
                        ? "bg-royal text-white font-bold"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cap}
                  </button>
                ))}
              </div>
            </div>

            {/* Companies List */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {filteredDirectoryCompanies.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 my-4">
                  <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No enterprises found matching criteria.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Try resetting search or capability filters.</p>
                </div>
              ) : (
                filteredDirectoryCompanies.map((comp) => {
                  const isAnchor = isCompanyAnchor(comp);
                  const isFlagship = isCompanyFlagship(comp);
                  return (
                    <div
                      key={comp.id}
                      className="p-4 bg-white border border-slate-200 hover:border-royal/40 rounded-2xl transition-all shadow-2xs hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900 group-hover:text-royal transition-colors">
                            {comp.displayName || comp.name}
                          </h3>
                          {isAnchor ? (
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-sans font-bold bg-slate-100 text-slate-800 border border-slate-300">
                              Anchor
                            </span>
                          ) : isFlagship ? (
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-sans font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              FLAGSHIP
                            </span>
                          ) : null}
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-royal/5 text-royal border border-royal/20">
                            VERIFIED TENANT
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2">
                          {comp.description || `${comp.name} is a certified enterprise operating within ${city.domain}.`}
                        </p>

                        {/* Capabilities pills */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {(comp.capabilities || ["Maritime Engineering"]).slice(0, 3).map((cap, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium"
                            >
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => navigateTo(`/companies/${comp.slug || comp.id}`)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-royal text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <span>View Company</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB CONTENT 3: CAPABILITIES & SUPPLY CHAIN MATRIX                       */}
        {/* ========================================================================= */}
        {activeTab === "capabilities" && (
          <div className="flex-1 p-5 overflow-y-auto bg-slate-50 space-y-4">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2">
              <h3 className="text-xs font-bold font-mono text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-royal" />
                SECTOR CITY CAPABILITY MATRIX
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Verified engineering, manufacturing, logistics, and service capabilities available within {city.domain} are mapped below.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cityCapabilities.map((cap, idx) => {
                const count = allCityCompanies.filter((c) =>
                  (c.capabilities || []).includes(cap) || c.industry === cap
                ).length;

                return (
                  <div
                    key={idx}
                    className="p-4 bg-white border border-slate-200 hover:border-royal/30 rounded-2xl transition-all shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-7 h-7 rounded-lg bg-royal/5 text-royal font-bold text-xs flex items-center justify-center border border-royal/20">
                        0{idx + 1}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {count > 0 ? `${count} Enterprises` : "Active Module"}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900">{cap}</h4>

                    <button
                      onClick={() => {
                        setActiveTab("directory");
                        setCapabilityFilter(cap);
                      }}
                      className="text-[11px] font-bold text-royal hover:text-royal-dark inline-flex items-center gap-1 cursor-pointer pt-1"
                    >
                      <span>View Matching Companies</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB CONTENT 4: ESTABLISH PRESENCE & PARTICIPATION GUIDE                 */}
        {/* ========================================================================= */}
        {activeTab === "presence" && (
          <div className="flex-1 p-5 overflow-y-auto bg-slate-50 space-y-4">
            <div className="p-5 bg-white border border-royal/30 text-graphite rounded-2xl shadow-xs space-y-3 relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-royal/10 border border-royal/20 text-royal flex items-center justify-center">
                <Award className="w-5 h-5 text-royal" />
              </div>
              <h3 className="text-sm font-bold tracking-tight text-graphite">
                Establish Commercial Presence in {city.domain}
              </h3>
              <p className="text-xs text-stone leading-relaxed">
                Deploy your sovereign enterprise presence within the MarineWorld ecosystem to reach procurement directors, fleet operators, and global buyers across the {activeRegionEdition.name} market.
              </p>
              <button
                onClick={() => navigateTo("/onboarding")}
                className="mt-2 px-4 py-2 bg-royal hover:bg-royal-dark text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>Start Company Onboarding</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Step Roadmap */}
            <div className="bg-white border border-line rounded-2xl p-5 shadow-2xs space-y-4">
              <h4 className="text-xs font-mono font-bold text-graphite uppercase tracking-wider">
                STEP-BY-STEP ONBOARDING ROADMAP
              </h4>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3 p-3 bg-canvas rounded-xl border border-line">
                  <span className="w-6 h-6 rounded-full bg-royal text-white flex items-center justify-center shrink-0 font-bold text-[11px]">
                    1
                  </span>
                  <div>
                    <h5 className="font-bold text-graphite">1. Sovereign Company Profile</h5>
                    <p className="text-stone text-[11px] mt-0.5">
                      Register your official corporate entity, accredited certifications, and technical capabilities in Company Studio.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-canvas rounded-xl border border-line">
                  <span className="w-6 h-6 rounded-full bg-royal text-white flex items-center justify-center shrink-0 font-bold text-[11px]">
                    2
                  </span>
                  <div>
                    <h5 className="font-bold text-graphite">2. Sector Parcel & City Allocation</h5>
                    <p className="text-stone text-[11px] mt-0.5">
                      Activate your commercial digital property (Showroom, Engineering Lab, Terminal) in {city.domain}.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-canvas rounded-xl border border-line">
                  <span className="w-6 h-6 rounded-full bg-royal text-white flex items-center justify-center shrink-0 font-bold text-[11px]">
                    3
                  </span>
                  <div>
                    <h5 className="font-bold text-graphite">3. Grounded AI Twin Activation</h5>
                    <p className="text-stone text-[11px] mt-0.5">
                      Upload product datasheets and technical catalogs. Your AI Advisor answers 24/7 client inquiries autonomously.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/**
 * SectorCityAdvisorCompactStrip — Portable compact banner for single-city directory views.
 * Reuses the exact same underlying SectorCityAdvisorDrawer component and data source.
 */
export function SectorCityAdvisorCompactStrip({
  city,
  config,
  allCityCompanies = [],
  activeRegionEdition: customActiveRegionEdition,
  parentDomainName = "MARINETECH",
  onNavigateUrl,
  cityAnchor,
  className = "",
}: SectorCityAdvisorCompactStripProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const activeRegionEdition = useMemo(() => {
    if (customActiveRegionEdition) return customActiveRegionEdition;
    return resolveRegionEdition(city.id || city.slug, "global");
  }, [customActiveRegionEdition, city]);

  // Single source of truth for city anchor credential
  const resolvedAnchor = useMemo(() => {
    if (cityAnchor !== undefined) return cityAnchor;
    return getCityAnchor(config, city.id || city.slug);
  }, [cityAnchor, config, city]);

  return (
    <>
      <div
        id="sector-city-advisor-compact-strip"
        className={`rounded-2xl bg-white border border-line p-3.5 sm:p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3.5 font-sans transition-all ${className}`}
      >
        <div className="flex items-center gap-3.5 flex-wrap flex-1 min-w-0">
          {/* Icon Badge */}
          <div className="w-10 h-10 rounded-xl bg-royal/10 border border-royal/20 text-royal flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5 text-royal" />
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-graphite tracking-tight">
                {city.domain} Guide & AI Advisor
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-stone flex-wrap font-sans">
              <span className="inline-flex items-center gap-1 font-medium">
                <Building2 className="w-3.5 h-3.5 text-mute" />
                <strong className="text-graphite font-semibold">{allCityCompanies.length}</strong> Verified Firms
              </span>

              {resolvedAnchor && (
                <>
                  <span className="text-mute">•</span>
                  <span
                    id="compact-strip-anchor-credential"
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-[11px] text-slate-800 font-medium"
                  >
                    <Radio className="w-3 h-3 text-slate-600 shrink-0" />
                    <span className="font-bold uppercase tracking-wider text-[9.5px]">Anchor:</span>
                    <a
                      href={`/companies/${resolvedAnchor.company.slug || resolvedAnchor.company.id}`}
                      className="font-bold text-royal hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {resolvedAnchor.company.displayName || resolvedAnchor.company.name}
                    </a>
                  </span>
                </>
              )}

              <span className="text-mute hidden sm:inline">•</span>
              <span className="text-mute text-[11px] hidden sm:inline">
                🌐 {activeRegionEdition?.name || "Global Edition"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
          <button
            id="btn-open-city-advisor-panel"
            onClick={() => setIsDrawerOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-royal text-white text-xs font-bold transition shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-white" />
            <span>Open Guide & AI Advisor</span>
          </button>

          <a
            href={`/cities/${city.slug}`}
            className="px-3 py-2 rounded-xl border border-line bg-slate-50 hover:bg-white hover:border-slate-300 text-xs font-semibold text-graphite transition inline-flex items-center gap-1"
          >
            <span>Visit City Entrance</span>
            <ArrowRight className="w-3.5 h-3.5 text-mute" />
          </a>
        </div>
      </div>

      {/* Shared Slide-over Drawer Modal */}
      <SectorCityAdvisorDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        city={city}
        parentDomainName={parentDomainName}
        activeRegionEdition={activeRegionEdition}
        allCityCompanies={allCityCompanies}
        config={config}
        onNavigateUrl={onNavigateUrl}
        cityAnchor={resolvedAnchor}
        entrySource="directory_compact_strip"
      />
    </>
  );
}
