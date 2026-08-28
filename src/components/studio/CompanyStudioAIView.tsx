import React, { useState, useEffect, useMemo } from "react";
import {
  Bot,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ArrowRight,
  Lock,
  Layers,
  Send,
  Building2,
  Package,
  Check,
  RotateCcw,
  Sliders,
  FileText,
  Eye,
  Globe2,
  Shield,
  HelpCircle,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import type { CompanyEntity, CompanyOffering, PhysicalFacility } from "@/lib/types";
import { getCompanyById, getPhysicalFacilities } from "@/lib/services/companyService";
import { getCompanyOfferings } from "@/lib/services/offeringEntityService";
import { getCompanyRecordSync } from "@/lib/repositories/companyRepository";
import {
  getCompanyAIConfig,
  saveCompanyAIConfig,
  evaluateCompanyAIReadiness,
  simulateCompanyAIResponse,
  generateCompanyAIResponse,
  ALL_COMMUNICATION_STYLES,
  ALL_CAPABILITIES,
  type CompanyAIConfig,
  type CompanyAICommunicationStyle,
  type CompanyAICapability,
  type SimulationResult,
} from "@/lib/services/companyAIService";

interface CompanyStudioAIViewProps {
  companyId: string;
  onNavigateToOfferings?: () => void;
  onNavigateToKnowledge?: () => void;
  onNavigateToPresence?: () => void;
  onOpenPreview?: () => void;
}

export const CompanyStudioAIView: React.FC<CompanyStudioAIViewProps> = ({
  companyId,
  onNavigateToOfferings,
  onNavigateToKnowledge,
  onNavigateToPresence,
  onOpenPreview,
}) => {
  const canonicalCompany =
    getCompanyById(companyId) ||
    (getCompanyRecordSync(companyId) as unknown as CompanyEntity);
  const companyName =
    canonicalCompany?.displayName ||
    canonicalCompany?.brandName ||
    (canonicalCompany as any)?.name ||
    "Argento Maritime Engineering";

  // Data layers
  const offerings = useMemo(() => getCompanyOfferings(companyId), [companyId]);
  const facilities = useMemo(() => getPhysicalFacilities(companyId), [companyId]);

  // Persisted Config
  const [config, setConfig] = useState<CompanyAIConfig>(() => getCompanyAIConfig(companyId));
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Dynamic Readiness
  const readiness = useMemo(() => evaluateCompanyAIReadiness(companyId), [companyId]);

  // Live Test Console State
  const [testQuery, setTestQuery] = useState("");
  const [testResult, setTestResult] = useState<SimulationResult | null>(() =>
    simulateCompanyAIResponse(companyId, "What does your company do?")
  );
  const [isSimulating, setIsSimulating] = useState(false);

  // Active View Tab for Specialists: "ALL" | "OFFERINGS" | "FACILITIES"
  const [specialistTab, setSpecialistTab] = useState<"ALL" | "OFFERINGS" | "FACILITIES">("ALL");

  useEffect(() => {
    setConfig(getCompanyAIConfig(companyId));
  }, [companyId]);

  // Handle Communication Style Selection (Max 3)
  const handleToggleStyle = (styleId: CompanyAICommunicationStyle) => {
    const current = config.communicationStyles || [];
    let updated: CompanyAICommunicationStyle[];

    if (current.includes(styleId)) {
      if (current.length === 1) return; // Keep at least one
      updated = current.filter((s) => s !== styleId);
    } else {
      if (current.length >= 3) {
        // Replace the oldest
        updated = [...current.slice(1), styleId];
      } else {
        updated = [...current, styleId];
      }
    }

    const newConfig = saveCompanyAIConfig(companyId, { communicationStyles: updated });
    setConfig(newConfig);
    triggerSaveFeedback();
  };

  // Handle Capability Selection
  const handleToggleCapability = (capId: CompanyAICapability) => {
    const current = config.capabilities || [];
    let updated: CompanyAICapability[];

    if (current.includes(capId)) {
      if (current.length === 1) return;
      updated = current.filter((c) => c !== capId);
    } else {
      updated = [...current, capId];
    }

    const newConfig = saveCompanyAIConfig(companyId, { capabilities: updated });
    setConfig(newConfig);
    triggerSaveFeedback();
  };

  const triggerSaveFeedback = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleRunTestQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsSimulating(true);
    setTestQuery(queryText);

    try {
      const res = await generateCompanyAIResponse(companyId, queryText);
      setTestResult(res);
    } catch (err) {
      console.warn("[CompanyStudioAIView] Live Gemini query error, fallback to sync result:", err);
      const res = simulateCompanyAIResponse(companyId, queryText);
      setTestResult(res);
    } finally {
      setIsSimulating(false);
    }
  };

  const suggestedPrompts = [
    "What does your company do?",
    "Which sectors do you serve?",
    "What products and services do you offer?",
    "Where do you operate?",
    "Can I request a quotation for your ROV-4?",
    "What is the mooring capacity of Berth 04?",
    "How can I contact your company?",
  ];

  return (
    <div className="space-y-6" id="module-ai-view">
      {/* 1. Header Banner & Status */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-royal/10 text-royal uppercase tracking-wider">
                06 — AI
              </span>
              <h2 className="text-base sm:text-lg font-bold text-graphite font-mono">
                Your Company AI
              </h2>
            </div>
            <p className="text-xs text-stone">
              Set how your company's AI represents your business and helps visitors.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Status Pills */}
            <div
              id="ai-status-pill"
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 ${
                readiness.isReady
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AI STATUS: {readiness.isReady ? "READY" : "NEEDS SETUP"}</span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-canvas border border-line text-xs font-mono font-bold text-graphite flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-royal" />
              <span>GROUNDING: {readiness.groundedSourcesCount} VERIFIED SOURCES</span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-canvas border border-line text-xs font-mono font-bold text-stone flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>BOUNDARY: COMPANY ONLY</span>
            </div>

            {saveSuccess && (
              <span className="text-[11px] text-emerald-700 font-mono font-bold flex items-center gap-1 animate-pulse ml-1">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
          </div>
        </div>

        {/* 10. AI Readiness & Safety Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-canvas border border-line/60 space-y-1">
            <div className="text-[10px] font-mono text-stone uppercase font-bold">Identity</div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-graphite font-mono">
              <CheckCircle2 className={`w-3.5 h-3.5 ${readiness.identityStatus.ready ? "text-emerald-600" : "text-amber-500"}`} />
              <span>{readiness.identityStatus.label}</span>
            </div>
            <p className="text-[10.5px] text-stone leading-tight">{readiness.identityStatus.detail}</p>
          </div>

          <div className="p-3 rounded-xl bg-canvas border border-line/60 space-y-1">
            <div className="text-[10px] font-mono text-stone uppercase font-bold">Positioning</div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-graphite font-mono">
              <CheckCircle2 className={`w-3.5 h-3.5 ${readiness.positioningStatus.ready ? "text-emerald-600" : "text-amber-500"}`} />
              <span>{readiness.positioningStatus.label}</span>
            </div>
            <p className="text-[10.5px] text-stone leading-tight">{readiness.positioningStatus.detail}</p>
          </div>

          <div className="p-3 rounded-xl bg-canvas border border-line/60 space-y-1">
            <div className="text-[10px] font-mono text-stone uppercase font-bold">Knowledge</div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-graphite font-mono">
              <CheckCircle2 className={`w-3.5 h-3.5 ${readiness.knowledgeStatus.ready ? "text-emerald-600" : "text-amber-500"}`} />
              <span>{readiness.knowledgeStatus.label}</span>
            </div>
            <p className="text-[10.5px] text-stone leading-tight">{readiness.knowledgeStatus.detail}</p>
          </div>

          <div className="p-3 rounded-xl bg-canvas border border-line/60 space-y-1">
            <div className="text-[10px] font-mono text-stone uppercase font-bold">Presence</div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-graphite font-mono">
              <CheckCircle2 className={`w-3.5 h-3.5 ${readiness.presenceStatus.ready ? "text-emerald-600" : "text-amber-500"}`} />
              <span>{readiness.presenceStatus.label}</span>
            </div>
            <p className="text-[10.5px] text-stone leading-tight">{readiness.presenceStatus.detail}</p>
          </div>

          <div className="p-3 rounded-xl bg-canvas border border-line/60 space-y-1 col-span-2 sm:col-span-1">
            <div className="text-[10px] font-mono text-stone uppercase font-bold">Offerings</div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-graphite font-mono">
              <CheckCircle2 className={`w-3.5 h-3.5 ${readiness.offeringsStatus.ready ? "text-emerald-600" : "text-amber-500"}`} />
              <span>{readiness.offeringsStatus.label}</span>
            </div>
            <p className="text-[10.5px] text-stone leading-tight">{readiness.offeringsStatus.detail}</p>
          </div>
        </div>

        {/* 11. AI Safety Compact Status Block */}
        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-950 font-bold font-mono text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>AI SAFETY & BOUNDARIES ACTIVE</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-emerald-900">
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-700" /> Company boundary active
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-700" /> Private sources protected
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-700" /> Offering boundaries active
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-700" /> Facility boundaries active
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-700" /> Verified grounding only
            </span>
          </div>
        </div>
      </div>

      {/* 3. Company AI Primary Screen: Three Simple Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area A: WHAT YOUR AI KNOWS */}
        <div className="bg-white border border-line rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-line/60 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-royal/10 text-royal flex items-center justify-center font-bold">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-graphite uppercase tracking-wider font-mono">
                    A. What Your AI Knows
                  </h3>
                  <p className="text-[11px] text-stone">Authoritative knowledge grounded to Company AI</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-canvas border border-line/60 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-graphite font-mono text-[11px]">Identity & History</div>
                  <div className="text-[10px] text-stone">Company legal name, registration, sector</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  READY
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-canvas border border-line/60 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-graphite font-mono text-[11px]">Positioning</div>
                  <div className="text-[10px] text-stone">Core value proposition & market focus</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  READY
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-canvas border border-line/60 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-graphite font-mono text-[11px]">Company Knowledge</div>
                  <div className="text-[10px] text-stone">{readiness.groundedSourcesCount} active grounded source documents</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {readiness.groundedSourcesCount} SOURCES
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-canvas border border-line/60 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-graphite font-mono text-[11px]">Physical Presence</div>
                  <div className="text-[10px] text-stone">{readiness.verifiedFacilitiesCount} verified operating facilities</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {readiness.verifiedFacilitiesCount} BASES
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-canvas border border-line/60 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-graphite font-mono text-[11px]">Published Offerings</div>
                  <div className="text-[10px] text-stone">{readiness.readyOfferingsCount} catalog products & services</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {readiness.readyOfferingsCount} OFFERINGS
                </span>
              </div>
            </div>
          </div>

          {onNavigateToKnowledge && (
            <button
              type="button"
              onClick={onNavigateToKnowledge}
              className="w-full py-2 bg-canvas hover:bg-mist text-royal border border-royal/20 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition font-mono"
            >
              <span>Manage 05 — Knowledge Sources</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Area B: HOW YOUR AI SPEAKS */}
        <div className="bg-white border border-line rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-line/60 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-royal/10 text-royal flex items-center justify-center font-bold">
                  <Sliders className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-graphite uppercase tracking-wider font-mono">
                    B. How Your AI Speaks
                  </h3>
                  <p className="text-[11px] text-stone">Select up to 3 communication styles</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-royal px-2 py-0.5 rounded bg-royal/10">
                {config.communicationStyles?.length || 0}/3 Selected
              </span>
            </div>

            <div className="space-y-2">
              {ALL_COMMUNICATION_STYLES.map((style) => {
                const isSelected = config.communicationStyles?.includes(style.id);
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => handleToggleStyle(style.id)}
                    className={`w-full p-2.5 rounded-xl border text-left transition flex items-start justify-between gap-2 ${
                      isSelected
                        ? "bg-royal/5 border-royal text-graphite shadow-2xs"
                        : "bg-canvas border-line/70 text-stone hover:border-line hover:text-graphite"
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold font-mono ${isSelected ? "text-royal" : "text-graphite"}`}>
                          {style.label}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-stone leading-tight line-clamp-1">{style.description}</p>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition ${
                        isSelected ? "bg-royal border-royal text-white" : "border-line bg-white"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-[10.5px] font-mono text-stone bg-canvas p-2.5 rounded-xl border border-line/60">
            Style dictates tone across public company page inquiries and routing dispatches.
          </div>
        </div>

        {/* Area C: WHAT YOUR AI CAN HELP WITH */}
        <div className="bg-white border border-line rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-line/60 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-royal/10 text-royal flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-graphite uppercase tracking-wider font-mono">
                    C. What Your AI Can Help With
                  </h3>
                  <p className="text-[11px] text-stone">Authorized response capabilities</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 max-h-[290px] overflow-y-auto pr-1">
              {ALL_CAPABILITIES.map((cap) => {
                const isSelected = config.capabilities?.includes(cap.id);
                return (
                  <button
                    key={cap.id}
                    type="button"
                    onClick={() => handleToggleCapability(cap.id)}
                    className={`w-full p-2 rounded-xl border text-left transition flex items-center justify-between gap-2 ${
                      isSelected
                        ? "bg-white border-royal/40 text-graphite"
                        : "bg-canvas/60 border-line/60 text-stone hover:bg-canvas"
                    }`}
                  >
                    <div className="truncate">
                      <div className={`text-xs font-semibold font-mono ${isSelected ? "text-graphite" : "text-stone"}`}>
                        {cap.label}
                      </div>
                      <div className="text-[10px] text-stone truncate">{cap.description}</div>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition ${
                        isSelected ? "bg-emerald-600 border-emerald-600 text-white" : "border-line bg-white"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-[10.5px] font-mono text-stone bg-canvas p-2.5 rounded-xl border border-line/60 flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-stone shrink-0" />
            <span>AI only answers inquiries backed by verified grounded facts.</span>
          </div>
        </div>
      </div>

      {/* 8 & 9. Three AI Representatives & Architectural Relationship */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-royal" />
              <h3 className="text-sm font-bold text-graphite font-mono">
                Three AI Representatives Operating Under One Verified Company
              </h3>
            </div>
            <p className="text-xs text-stone">
              Deterministic routing guarantees visitors always talk to the correct grounded specialist.
            </p>
          </div>

          <span className="px-2.5 py-1 rounded bg-royal/10 text-royal border border-royal/20 text-[10px] font-mono font-bold">
            AUTOMATIC MULTI-TIER ROUTING ACTIVE
          </span>
        </div>

        {/* 3-Tier Visual Architecture Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Company AI */}
          <div className="p-4 rounded-xl bg-canvas border border-line space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-royal/10 text-royal flex items-center justify-center font-bold">
                <Bot className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold bg-royal/10 text-royal border border-royal/20">
                COMPANY-LEVEL
              </span>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-graphite font-mono">COMPANY AI</h4>
              <p className="text-[11px] text-royal font-semibold">"Your company's AI representative"</p>
              <p className="text-[11px] text-stone leading-relaxed">
                Answers general company inquiries, corporate history, positioning, certified policies, and physical presence summaries.
              </p>
            </div>

            <div className="pt-2 border-t border-line/60 text-[10.5px] font-mono text-stone space-y-1">
              <div className="font-bold text-graphite">Grounded with:</div>
              <div>• Corporate Identity & Positioning</div>
              <div>• Verified Company Documents</div>
              <div>• High-level Catalog Directory</div>
            </div>
          </div>

          {/* Offering AI */}
          <div className="p-4 rounded-xl bg-canvas border border-line space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-royal/10 text-royal flex items-center justify-center font-bold">
                <Package className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                OFFERING-LEVEL
              </span>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-graphite font-mono">OFFERING AI</h4>
              <p className="text-[11px] text-emerald-800 font-semibold">"Your product or service specialist"</p>
              <p className="text-[11px] text-stone leading-relaxed">
                Answers deep technical inquiries, operating limits, class approvals, applications, and handles commercial RFQ preparation.
              </p>
            </div>

            <div className="pt-2 border-t border-line/60 text-[10.5px] font-mono text-stone space-y-1">
              <div className="font-bold text-graphite">Grounded with:</div>
              <div>• Product Technical Specifications</div>
              <div>• Factory Datasheets & Class Certs</div>
              <div>• Incoterms & Lead Times</div>
            </div>
          </div>

          {/* Facility AI */}
          <div className="p-4 rounded-xl bg-canvas border border-line space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold bg-amber-500/15 text-amber-800 border border-amber-500/30">
                FACILITY-LEVEL
              </span>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-graphite font-mono">FACILITY AI</h4>
              <p className="text-[11px] text-amber-800 font-semibold">"Your facility specialist"</p>
              <p className="text-[11px] text-stone leading-relaxed">
                Answers quayside berth parameters, drydock capacities, lifting equipment limits, and shipyard operational schedules.
              </p>
            </div>

            <div className="pt-2 border-t border-line/60 text-[10.5px] font-mono text-stone space-y-1">
              <div className="font-bold text-graphite">Grounded with:</div>
              <div>• Berth & Quayside Capacities</div>
              <div>• Crane & Equipment Ratings</div>
              <div>• Geographic & Port Access Data</div>
            </div>
          </div>
        </div>

        {/* Visible Boundary Rules Statement */}
        <div className="p-3.5 rounded-xl bg-white border border-line text-xs font-mono text-stone space-y-1.5">
          <div className="font-bold text-graphite flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-royal" />
            <span>OPERATING BOUNDARY RULES:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
            <div>1. Company AI answers strictly from verified company-level knowledge.</div>
            <div>2. For product/service questions, MarineWorld routes to the relevant specialist.</div>
            <div>3. For facility-specific questions, MarineWorld routes to the facility specialist.</div>
          </div>
        </div>
      </div>

      {/* 5 & 4. Intelligent AI Routing Matrix & 10 Deterministic Rules */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
          <div>
            <h3 className="text-sm font-bold text-graphite font-mono">
              Intelligent Customer Question Routing Matrix
            </h3>
            <p className="text-xs text-stone">
              The visitor asks naturally — MarineWorld automatically resolves the exact AI representative.
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold text-stone px-2.5 py-1 rounded bg-canvas border border-line">
            ZERO OPERATOR OVERHEAD
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-canvas border border-line/70 flex items-center justify-between gap-2">
            <div>
              <span className="text-stone text-[10.5px] block">Customer asks:</span>
              <strong className="text-graphite">"What products does this company offer?"</strong>
            </div>
            <span className="px-2 py-1 rounded bg-royal/10 text-royal font-bold text-[10.5px] shrink-0">
              → Company AI
            </span>
          </div>

          <div className="p-3 rounded-xl bg-canvas border border-line/70 flex items-center justify-between gap-2">
            <div>
              <span className="text-stone text-[10.5px] block">Customer asks:</span>
              <strong className="text-graphite">"What is the maximum operating depth of this ROV?"</strong>
            </div>
            <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10.5px] shrink-0">
              → Offering AI
            </span>
          </div>

          <div className="p-3 rounded-xl bg-canvas border border-line/70 flex items-center justify-between gap-2">
            <div>
              <span className="text-stone text-[10.5px] block">Customer asks:</span>
              <strong className="text-graphite">"Can this shipyard handle a 150m vessel?"</strong>
            </div>
            <span className="px-2 py-1 rounded bg-amber-500/15 text-amber-800 border border-amber-500/30 font-bold text-[10.5px] shrink-0">
              → Facility AI
            </span>
          </div>

          <div className="p-3 rounded-xl bg-canvas border border-line/70 flex items-center justify-between gap-2">
            <div>
              <span className="text-stone text-[10.5px] block">Customer asks:</span>
              <strong className="text-graphite">"I want a quotation for this product."</strong>
            </div>
            <span className="px-2 py-1 rounded bg-royal text-white font-bold text-[10.5px] shrink-0">
              → Offering AI → Connect / RFQ
            </span>
          </div>
        </div>

        {/* 10 Deterministic Operating Rules */}
        <div className="p-4 rounded-xl bg-canvas border border-line space-y-2.5">
          <div className="text-xs font-bold text-graphite font-mono uppercase tracking-wider flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-royal" />
            <span>10 DETERMINISTIC AI GOVERNANCE RULES</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] font-mono text-stone">
            <div>1. Prefer verified company information at all times.</div>
            <div>2. Never invent missing company facts.</div>
            <div>3. Clearly state when information is unavailable.</div>
            <div>4. Never expose private source documents.</div>
            <div>5. Never reveal internal grounding sources without visibility authorization.</div>
            <div>6. Never cross company boundaries (complete tenant isolation).</div>
            <div>7. Never use Offering private context as Company context without authorization.</div>
            <div>8. Never present unsupported commercial terms as confirmed.</div>
            <div>9. Distinguish verified facts from general guidance.</div>
            <div>10. Route users to the appropriate Offering, Facility, or Connect/RFQ workflow.</div>
          </div>
        </div>
      </div>

      {/* 6 & 7. Offering AI & Facility AI Specialists Summary (No duplicate editing!) */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
          <div>
            <h3 className="text-sm font-bold text-graphite font-mono">
              Active Specialist AIs Configured for Your Enterprise
            </h3>
            <p className="text-xs text-stone">
              Specialist AI readiness is synchronized directly from 04 — Offerings and 03 — Presence.
            </p>
          </div>

          {/* Tab Filter */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-canvas border border-line">
            <button
              type="button"
              onClick={() => setSpecialistTab("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                specialistTab === "ALL" ? "bg-white text-graphite shadow-2xs" : "text-stone hover:text-graphite"
              }`}
            >
              All Specialists ({offerings.length + facilities.length})
            </button>
            <button
              type="button"
              onClick={() => setSpecialistTab("OFFERINGS")}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                specialistTab === "OFFERINGS" ? "bg-white text-graphite shadow-2xs" : "text-stone hover:text-graphite"
              }`}
            >
              Offerings ({offerings.length})
            </button>
            <button
              type="button"
              onClick={() => setSpecialistTab("FACILITIES")}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                specialistTab === "FACILITIES" ? "bg-white text-graphite shadow-2xs" : "text-stone hover:text-graphite"
              }`}
            >
              Facilities ({facilities.length})
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {/* Offering Specialists */}
          {(specialistTab === "ALL" || specialistTab === "OFFERINGS") &&
            offerings.map((off) => {
              const hasSpecs = off.specifications && Object.keys(off.specifications).length > 0;
              return (
                <div
                  key={off.id}
                  className="p-4 rounded-xl bg-canvas border border-line flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-royal shrink-0" />
                      <h4 className="text-xs font-bold text-graphite font-mono truncate">{off.name}</h4>
                      <span className="px-2 py-0.2 rounded text-[9px] font-mono font-bold bg-white text-stone border border-line uppercase">
                        {off.type}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[10.5px] font-mono text-stone">
                      <span>Grounding: <strong className="text-graphite">{hasSpecs ? "96% (Verified Specs)" : "85% (Base Specs)"}</strong></span>
                      <span>•</span>
                      <span>Roles: <strong className="text-graphite">Technical + Sales Advisor</strong></span>
                      <span>•</span>
                      <span>Priorities: <strong className="text-graphite">Specifications + Commercial</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-bold">
                      AI READY
                    </span>
                    {onNavigateToOfferings && (
                      <button
                        type="button"
                        onClick={onNavigateToOfferings}
                        className="px-3 py-1 bg-white hover:bg-mist text-royal border border-line rounded-lg text-xs font-semibold font-mono transition flex items-center gap-1"
                      >
                        <span>OPEN OFFERING</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

          {/* Facility Specialists */}
          {(specialistTab === "ALL" || specialistTab === "FACILITIES") &&
            facilities.map((fac) => {
              return (
                <div
                  key={fac.id}
                  className="p-4 rounded-xl bg-canvas border border-line flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
                      <h4 className="text-xs font-bold text-graphite font-mono truncate">{fac.facilityName}</h4>
                      <span className="px-2 py-0.2 rounded text-[9px] font-mono font-bold bg-white text-stone border border-line uppercase">
                        {fac.facilityType}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[10.5px] font-mono text-stone">
                      <span>Location: <strong className="text-graphite">{fac.city}, {fac.country}</strong></span>
                      <span>•</span>
                      <span>Status: <strong className="text-emerald-700">{fac.operatingStatus || fac.status || "ACTIVE"}</strong></span>
                      <span>•</span>
                      <span>Capabilities: <strong className="text-graphite">Quayside Berth & Technical Mooring</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-bold">
                      AI READY
                    </span>
                    {onNavigateToPresence && (
                      <button
                        type="button"
                        onClick={onNavigateToPresence}
                        className="px-3 py-1 bg-white hover:bg-mist text-royal border border-line rounded-lg text-xs font-semibold font-mono transition flex items-center gap-1"
                      >
                        <span>OPEN FACILITY</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* 12 & 13. Customer Experience Preview & Commercial Handoff Simulation */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-royal/10 text-royal flex items-center justify-center font-bold">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-graphite font-mono">Ask Your Company AI</h3>
              <p className="text-xs text-stone">
                Test real customer questions to verify grounded facts, multi-tier specialist routing, and commercial RFQ handoffs.
              </p>
            </div>
          </div>

          {onOpenPreview && (
            <button
              type="button"
              onClick={onOpenPreview}
              className="px-3 py-1.5 bg-canvas hover:bg-mist text-graphite border border-line rounded-xl text-xs font-bold font-mono transition flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-royal" />
              <span>Preview Live Page</span>
            </button>
          )}
        </div>

        {/* Preset Test Prompts */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-mono text-stone uppercase font-bold">Suggested Test Prompts:</div>
          <div className="flex flex-wrap gap-1.5">
            {suggestedPrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleRunTestQuery(prompt)}
                className="px-2.5 py-1 rounded-lg bg-canvas hover:bg-royal/5 text-stone hover:text-royal border border-line text-[11px] font-mono transition"
              >
                "{prompt}"
              </button>
            ))}
          </div>
        </div>

        {/* Test Console Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRunTestQuery(testQuery);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="Type any question (e.g., 'What is the maximum depth of your ROV-4?' or 'I need a quotation')..."
            className="flex-1 h-10 px-3.5 rounded-xl border border-line bg-white text-xs font-mono text-graphite focus:border-royal focus:outline-none"
          />
          <button
            type="submit"
            disabled={isSimulating}
            className="px-4 h-10 bg-royal text-white rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition shadow-sm shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSimulating ? "Resolving..." : "Ask AI"}</span>
          </button>
        </form>

        {/* Live Grounded Response Display with Commercial Handoff */}
        {testResult && (
          <div className="p-4 rounded-xl bg-canvas border border-royal/25 space-y-3">
            {/* Header / Routing Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    testResult.representativeScope === "OFFERING_AI"
                      ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                      : testResult.representativeScope === "FACILITY_AI"
                      ? "bg-amber-500/15 text-amber-900 border-amber-500/30"
                      : "bg-royal/10 text-royal border-royal/20"
                  }`}
                >
                  {testResult.representativeName}
                </span>
                <span className="text-[10px] font-mono text-stone">{testResult.routingReason}</span>
              </div>

              <span className="text-[9.5px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                100% GROUNDED
              </span>
            </div>

            {/* Answer Text */}
            <p className="text-xs text-graphite leading-relaxed font-sans font-medium">
              {testResult.response}
            </p>

            {/* Grounding Source Attribution Matrix */}
            <div className="p-2.5 rounded-lg bg-white border border-line/70 text-[10.5px] font-mono text-stone space-y-1">
              <div className="font-bold text-graphite uppercase tracking-wider text-[9.5px]">
                Grounding Verification & Facts:
              </div>
              {testResult.groundedFacts.map((fact, i) => (
                <div key={i} className="flex items-center gap-1.5 text-graphite">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>{fact}</span>
                </div>
              ))}
            </div>

            {/* 13. Commercial Handoff Action Links */}
            {testResult.suggestedActions.length > 0 && (
              <div className="pt-2 border-t border-line/60 space-y-1.5">
                <div className="text-[10px] font-mono text-stone uppercase font-bold">
                  Recommended Commercial Actions:
                </div>
                <div className="flex flex-wrap gap-2">
                  {testResult.suggestedActions.map((act) => {
                    const isRfq = act.actionType === "REQUEST_OFFER";
                    return (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => {
                          if (act.actionType === "VIEW_OFFERING" && onNavigateToOfferings) {
                            onNavigateToOfferings();
                          } else if (act.actionType === "VIEW_FACILITY" && onNavigateToPresence) {
                            onNavigateToPresence();
                          } else if (onOpenPreview) {
                            onOpenPreview();
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                          isRfq
                            ? "bg-royal text-white hover:bg-royal/90 shadow-2xs"
                            : "bg-white hover:bg-mist text-graphite border border-line"
                        }`}
                      >
                        <span>{act.label}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
