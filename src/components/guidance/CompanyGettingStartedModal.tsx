import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  Circle,
  Building2,
  ShieldCheck,
  Brain,
  Package,
  Radio,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Globe,
  HardDrive,
  Lock,
  Sparkles,
  Layers,
  FileText,
  BadgeCheck,
  Building,
  HelpCircle,
  BarChart3,
  Users,
} from "lucide-react";
import {
  getGettingStartedTenantState,
  type GettingStartedTenantState,
  type PhaseProgress,
} from "@/lib/services/gettingStartedService";
import { getCurrentAuthSession } from "@/lib/services/securityService";

interface CompanyGettingStartedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToStudioModule?: (moduleName: string) => void;
}

export function CompanyGettingStartedModal({
  isOpen,
  onClose,
  onNavigateToStudioModule,
}: CompanyGettingStartedModalProps) {
  const [tenantState, setTenantState] = useState<GettingStartedTenantState>(() =>
    getGettingStartedTenantState()
  );
  const [activePhaseIndex, setActivePhaseIndex] = useState<number>(0);

  // Re-calculate tenant state on open / auth change to ensure 100% Tenant Isolation (Test Scenario #20)
  useEffect(() => {
    if (isOpen) {
      const freshAuth = getCurrentAuthSession();
      const freshState = getGettingStartedTenantState(freshAuth);
      setTenantState(freshState);
      // Auto-set active phase to next recommended incomplete phase
      if (freshState.nextRecommendedPhase >= 1 && freshState.nextRecommendedPhase <= 5) {
        setActivePhaseIndex(freshState.nextRecommendedPhase - 1);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPhase = tenantState.phases[activePhaseIndex] || tenantState.phases[0];

  const handleActionClick = (moduleKey: string) => {
    onClose();
    if (onNavigateToStudioModule) {
      onNavigateToStudioModule(moduleKey);
    } else {
      window.location.href = `/studio?module=${moduleKey}`;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-graphite/70 backdrop-blur-md p-3 sm:p-6 animate-fadeIn font-sans">
      <div className="relative flex flex-col w-full max-w-7xl max-h-[94vh] bg-slate-50 border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
        {/* TOP INSTITUTIONAL HEADER BAR */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-line">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-royal text-white shadow-sm font-bold text-lg">
              MW
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-graphite tracking-tight">
                  MarineWorld.City — Corporate Getting Started & Setup Guide
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-sky-50 text-sky-800 border border-sky-200">
                  Platform Guidance
                </span>
              </div>
              <p className="text-xs text-stone mt-0.5">
                Institutional framework for digital identity, company AI, offerings, and ecosystem trade.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 text-stone hover:text-graphite hover:bg-slate-100 rounded-xl transition cursor-pointer"
            title="Close Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* THREE-COLUMN CORPORATE LEARNING LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden min-h-0">
          
          {/* COLUMN 1: LEFT PHASE STEPPER (lg:col-span-3) */}
          <div className="lg:col-span-3 bg-white border-r border-line p-5 overflow-y-auto flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-stone mb-4">
                <span>GUIDANCE PHASES</span>
                <span className="text-[11px] text-royal font-bold">01 - 05</span>
              </div>

              <div className="space-y-2">
                {tenantState.phases.map((phase, idx) => {
                  const isActive = idx === activePhaseIndex;
                  const isDone = phase.status === "COMPLETE";

                  return (
                    <button
                      key={phase.id}
                      onClick={() => setActivePhaseIndex(idx)}
                      className={`w-full text-left p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                        isActive
                          ? "bg-sky-50/80 border-royal text-graphite shadow-sm"
                          : "bg-white border-line hover:border-slate-300 text-stone hover:text-graphite"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                        ) : isActive ? (
                          <div className="w-5 h-5 rounded-full border-2 border-royal bg-white flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-royal" />
                          </div>
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-stone">
                            PHASE 0{phase.phaseNumber}
                          </span>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            isDone ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"
                          }`}>
                            {isDone ? "Done" : phase.badgeLabel}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-graphite truncate mt-0.5">
                          {phase.title}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ecosystem Membership Banner */}
            {tenantState.ecosystemMembership && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span>Ecosystem Membership</span>
                  <span className="text-emerald-700 font-bold">Active</span>
                </div>
                <div className="font-bold text-graphite text-xs">
                  {tenantState.ecosystemMembership.organizationName}
                </div>
                <div className="text-[11px] text-stone flex items-center justify-between">
                  <span>Code: <code className="font-mono text-royal font-bold">{tenantState.ecosystemMembership.enrollmentCode}</code></span>
                  <span>{tenantState.ecosystemMembership.country}</span>
                </div>
                <div className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 mt-1">
                  ✓ {tenantState.ecosystemMembership.memberBenefit}
                </div>
              </div>
            )}
          </div>

          {/* COLUMN 2: CENTER INSTRUCTIONAL LESSON (lg:col-span-6) */}
          <div className="lg:col-span-6 bg-slate-50 p-6 overflow-y-auto space-y-6">
            
            {/* LESSON HEADER */}
            <div className="bg-white border border-line rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md bg-royal text-white">
                  PHASE 0{currentPhase.phaseNumber} — {currentPhase.badgeLabel}
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                  currentPhase.status === "COMPLETE"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}>
                  {currentPhase.status === "COMPLETE" ? "✓ Phase Completed" : "In Progress"}
                </span>
              </div>

              <h1 className="text-xl font-bold text-graphite tracking-tight">
                {currentPhase.title}
              </h1>
              <p className="text-xs text-stone leading-relaxed">
                {currentPhase.subtitle}
              </p>
            </div>

            {/* WHAT & WHY */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-line rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-royal">
                  <HelpCircle className="w-4 h-4" /> WHAT
                </div>
                <p className="text-xs text-stone leading-relaxed">
                  {getPhaseWhatText(currentPhase.phaseNumber)}
                </p>
              </div>

              <div className="bg-white border border-line rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                  <ShieldCheck className="w-4 h-4" /> WHY
                </div>
                <p className="text-xs text-stone leading-relaxed">
                  {getPhaseWhyText(currentPhase.phaseNumber)}
                </p>
              </div>
            </div>

            {/* SPECIAL DATA CONTROL STATEMENT FOR PHASE 3 */}
            {currentPhase.phaseNumber === 3 && (
              <div className="bg-royal/5 border border-royal/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-royal">
                  <Lock className="w-4 h-4" /> YOUR COMPANY. YOUR KNOWLEDGE. YOUR CONTROL.
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  MarineWorld does <strong>NOT</strong> require companies to upload private information to "train a public AI model." Your data remains strictly under your company's ownership. Authorized knowledge connections (such as Google Drive) allow your Business Twin to ground responses accurately while retaining full security.
                </p>
              </div>
            )}

            {/* HOW STEP-BY-STEP */}
            <div className="bg-white border border-line rounded-xl p-5 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-graphite flex items-center gap-2">
                <Layers className="w-4 h-4 text-royal" /> HOW TO COMPLETE THIS STEP
              </div>

              <ol className="space-y-2.5 text-xs text-stone">
                {getPhaseHowSteps(currentPhase.phaseNumber).map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-graphite font-bold text-[11px] shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* REALISTIC EXAMPLE */}
            <div className="bg-white border border-line rounded-xl p-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  REALISTIC SCENARIO
                </span>
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-slate-100 text-slate-700 border border-slate-200">
                  EXAMPLE
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-graphite font-mono leading-relaxed">
                {getPhaseExampleText(currentPhase.phaseNumber)}
              </div>
            </div>

            {/* PRODUCT PREVIEW */}
            <div className="bg-white border border-line rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-graphite flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-royal" /> PRODUCT PREVIEW
                </span>
                <span className="text-[10px] text-stone">Actual Studio Interface</span>
              </div>

              <div className="border border-slate-200 rounded-lg bg-slate-50 p-4">
                {renderProductPreview(currentPhase.phaseNumber, tenantState)}
              </div>
            </div>

            {/* ACTION BUTTON */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => handleActionClick(getStudioModuleKey(currentPhase.phaseNumber))}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-royal text-white font-bold text-xs hover:bg-royal/90 transition shadow-sm cursor-pointer"
              >
                <span>{getPhaseActionLabel(currentPhase.phaseNumber)}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <span className="text-xs text-stone font-medium">
                {currentPhase.status === "COMPLETE" ? "✓ Verified & Active in Studio" : "Requires Action in Company Studio"}
              </span>
            </div>
          </div>

          {/* COLUMN 3: RIGHT LIVE PROGRESS PANEL (lg:col-span-3) */}
          <div className="lg:col-span-3 bg-white border-l border-line p-5 overflow-y-auto flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone">YOUR LIVE SETUP</div>
                  <div className="text-sm font-bold text-graphite truncate mt-0.5">{tenantState.companyName}</div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                  {tenantState.verificationStatus}
                </span>
              </div>

              {/* OVERALL PROGRESS METRIC */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-stone">Setup Progress</span>
                  <span className="text-royal text-sm font-extrabold">{tenantState.completedCount} / 5</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-royal h-full transition-all duration-500"
                    style={{ width: `${tenantState.progressPercentage}%` }}
                  />
                </div>
                <div className="text-[11px] text-stone text-right">
                  {tenantState.progressPercentage}% Complete
                </div>
              </div>

              {/* LIVE CHECKLIST */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone">5-Phase Checklist</div>
                {tenantState.phases.map((p) => (
                  <div
                    key={p.id}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                      p.status === "COMPLETE"
                        ? "bg-emerald-50/50 border-emerald-200 text-emerald-950"
                        : "bg-white border-line text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {p.status === "COMPLETE" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                      )}
                      <span className="font-semibold truncate">0{p.phaseNumber}. {p.title}</span>
                    </div>
                    <span className="text-[10px] font-bold shrink-0">
                      {p.status === "COMPLETE" ? "✓" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>

              {/* NEXT RECOMMENDED ACTION */}
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-800">
                  NEXT RECOMMENDED STEP
                </div>
                <div className="text-xs font-bold text-graphite">
                  Phase 0{tenantState.nextRecommendedPhase}: {tenantState.phases[tenantState.nextRecommendedPhase - 1]?.title}
                </div>
                <button
                  onClick={() => handleActionClick(getStudioModuleKey(tenantState.nextRecommendedPhase))}
                  className="w-full mt-2 py-2 px-3 bg-royal text-white rounded-lg text-xs font-bold hover:bg-royal/90 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Execute Step Now</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* SECURITY & TENANT ISOLATION FOOTER NOTE */}
            <div className="pt-4 border-t border-line text-[10px] text-stone space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-graphite">
                <Lock className="w-3 h-3 text-royal" />
                <span>Tenant Isolated & Enterprise Secured</span>
              </div>
              <p className="leading-normal">
                Progress evaluated strictly against current active context (<code className="font-mono">{tenantState.businessId}</code>).
              </p>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

// HELPER FUNCTIONS FOR INSTRUCTIONAL LESSON CONTENT

function getPhaseWhatText(phaseNumber: number): string {
  switch (phaseNumber) {
    case 1:
      return "The official digital entity inside MarineWorld.City, providing a verified Registry ID, sovereign ownership, and institutional credentialing.";
    case 2:
      return "A structured business profile representing your marine domain, capabilities, certifications, facilities, and primary Sector City positioning.";
    case 3:
      return "Your company's AI-native Business Twin grounded in authorized knowledge sources (e.g. Google Drive) to respond accurately to inquiries.";
    case 4:
      return "Digital showcase of your verified products, services, and technical solutions published for global marine ecosystem discovery.";
    case 5:
      return "Commercial inbox, RFQs, customer inquiries, and optional Sector City Digital Property placement for high-visibility trade.";
    default:
      return "";
  }
}

function getPhaseWhyText(phaseNumber: number): string {
  switch (phaseNumber) {
    case 1:
      return "Shipyards, vessel operators, and global buyers rely on verified digital identity for commercial compliance, trust, and risk mitigation.";
    case 2:
      return "Industry-specific taxonomy ensures your company appears in targeted search queries across sector cities like SHIPYARD.CITY and MARINA.CITY.";
    case 3:
      return "Automates pre-qualification and technical inquiry responses using grounded company documents while keeping all company data private.";
    case 4:
      return "Direct commercial discovery allowing global buyers to review technical spec sheets and initiate formal RFQs.";
    case 5:
      return "Enables real-time commercial negotiations, formal quotations, and high-value ecosystem relationships.";
    default:
      return "";
  }
}

function getPhaseHowSteps(phaseNumber: number): string[] {
  switch (phaseNumber) {
    case 1:
      return [
        "Open Company Studio → Identity tab.",
        "Enter official legal company name and business registration details.",
        "Complete corporate verification to receive your canonical Registry ID.",
        "Apply Ecosystem Organization Enrollment Code (if applicable) for member benefits.",
      ];
    case 2:
      return [
        "Select your primary Sector City (e.g. SHIPYARD.CITY, MARINA.CITY, PORT.CITY).",
        "Add core company description and primary marine sector taxonomy.",
        "List key facilities, operational locations, and ISO/maritime certifications.",
      ];
    case 3:
      return [
        "Open Company Studio → Knowledge tab.",
        "Connect authorized Google Drive folder or upload official spec sheets.",
        "Verify permission boundary to activate Business Twin AI capabilities.",
      ];
    case 4:
      return [
        "Open Company Studio → Offerings tab.",
        "Click 'Create Offering' and select Product or Service category.",
        "Fill in verified technical specifications and publish to MarineWorld directory.",
      ];
    case 5:
      return [
        "Access Company Studio → Connect inbox to monitor incoming RFQs and inquiries.",
        "Maintain active Direct Reach representatives for fast customer response.",
        "Optionally explore Sector City Digital Properties for high-visibility positioning.",
      ];
    default:
      return [];
  }
}

function getPhaseExampleText(phaseNumber: number): string {
  switch (phaseNumber) {
    case 1:
      return `EXAMPLE: "Argento Marine Engineering Ltd." completes verification. Registry ID: MW-REG-9082. Organization Enrollment: MW-UNNA-8720 (UNNAB Group, 20% Member Benefit).`;
    case 2:
      return `EXAMPLE: "Pacific Maritime Engineering" selects SHIPYARD.CITY as primary Sector City, listing capabilities: "Naval Architecture, Hull Retrofit, Hybrid Propulsion Overhaul".`;
    case 3:
      return `EXAMPLE: "Mediterranean Ship Repair" connects authorized Google Drive folder. Business Twin uses grounded technical manuals to answer buyer pre-qualification questions.`;
    case 4:
      return `EXAMPLE: "EcoPropulsion Systems" publishes "Hybrid Marine Engine 500kW" with verified technical blueprints and commercial spec sheet.`;
    case 5:
      return `EXAMPLE: "Aegean Yacht Refit" receives an RFQ for a 45m hull overhaul, responds via Studio Connect, and reserves a Digital Property in MARINA.CITY.`;
    default:
      return "";
  }
}

function getStudioModuleKey(phaseNumber: number): string {
  switch (phaseNumber) {
    case 1:
      return "IDENTITY";
    case 2:
      return "PROPERTIES";
    case 3:
      return "KNOWLEDGE";
    case 4:
      return "OFFERINGS";
    case 5:
      return "CONNECTIONS";
    default:
      return "IDENTITY";
  }
}

function getPhaseActionLabel(phaseNumber: number): string {
  switch (phaseNumber) {
    case 1:
      return "Open Identity →";
    case 2:
      return "Complete Profile →";
    case 3:
      return "Connect Knowledge & AI →";
    case 4:
      return "Create Offering →";
    case 5:
      return "Open Connect & Trade →";
    default:
      return "Open Studio →";
  }
}

function renderProductPreview(phaseNumber: number, state: GettingStartedTenantState) {
  switch (phaseNumber) {
    case 1:
      return (
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-royal" />
              <span className="font-bold text-graphite">{state.companyName}</span>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
              VERIFIED
            </span>
          </div>
          <div className="text-[11px] text-stone flex justify-between px-1">
            <span>Business ID: <code className="font-mono text-royal font-bold">{state.businessId}</code></span>
            <span>Ecosystem Code: <code className="font-mono text-slate-700">MW-UNNA-8720</code></span>
          </div>
        </div>
      );
    case 2:
      return (
        <div className="space-y-2 text-xs">
          <div className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-graphite">Sector City Assignment</span>
              <span className="text-royal font-bold">SHIPYARD.CITY</span>
            </div>
            <div className="text-[11px] text-stone">Primary Sector: Naval Architecture & Marine Engineering</div>
          </div>
        </div>
      );
    case 3:
      return (
        <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-royal font-bold">
              <HardDrive className="w-4 h-4" /> Google Drive Authorized Connection
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">CONNECTED</span>
          </div>
          <p className="text-[11px] text-stone">
            Grounded Business Twin AI active. No public model training. Full data ownership retained.
          </p>
        </div>
      );
    case 4:
      return (
        <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-graphite">Published Offering</span>
            <span className="px-2 py-0.5 text-[9px] font-bold bg-sky-50 text-sky-800 rounded">SPEC VERIFIED</span>
          </div>
          <div className="text-xs font-semibold text-royal">Marine Hybrid Propulsion Engine 500kW</div>
          <div className="text-[11px] text-stone">Technical spec sheet & commercial terms attached</div>
        </div>
      );
    case 5:
      return (
        <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-graphite">Connect Inbox & RFQ Portal</span>
            <span className="text-[10px] font-bold text-royal">Active Inbox</span>
          </div>
          <div className="text-[11px] text-stone flex justify-between">
            <span>Incoming Inquiries: <strong className="text-graphite">3 New</strong></span>
            <span>Digital Property: <strong className="text-slate-600">Optional</strong></span>
          </div>
        </div>
      );
    default:
      return null;
  }
}
