import React, { useState, useEffect } from "react";
import type { SectorConfig } from "@/lib/types";
import { LogoMark } from "@/components/digione/icons";
import {
  CheckCircle2,
  Circle,
  ShieldCheck,
  Brain,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  HardDrive,
  Building,
  Check,
  BookOpen,
  ArrowLeft,
  Lock,
  Globe,
  Sparkles,
  MessageSquare,
  Briefcase,
  Users,
} from "lucide-react";
import {
  getGettingStartedTenantState,
  type GettingStartedTenantState,
} from "@/lib/services/gettingStartedService";
import { getCurrentAuthSession } from "@/lib/services/securityService";

interface GettingStartedPageProps {
  config: SectorConfig;
}

export function GettingStartedPage({ config }: GettingStartedPageProps) {
  const [tenantState, setTenantState] = useState<GettingStartedTenantState>(() =>
    getGettingStartedTenantState()
  );
  const [activePhaseIndex, setActivePhaseIndex] = useState<number>(0);

  // Re-calculate tenant state on mount to ensure 100% Tenant Isolation
  useEffect(() => {
    const freshAuth = getCurrentAuthSession();
    const freshState = getGettingStartedTenantState(freshAuth);
    setTenantState(freshState);
    if (freshState.nextRecommendedPhase >= 1 && freshState.nextRecommendedPhase <= 5) {
      setActivePhaseIndex(freshState.nextRecommendedPhase - 1);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const currentPhase = tenantState.phases[activePhaseIndex] || tenantState.phases[0];

  const handleActionClick = (moduleKey: string) => {
    window.location.href = `/studio?module=${moduleKey}`;
  };

  const getPhaseActionKey = (phaseNum: number): string => {
    switch (phaseNum) {
      case 1:
        return "IDENTITY";
      case 2:
        return "PROFILE";
      case 3:
        return "COMPANY_AI";
      case 4:
        return "OFFERINGS";
      case 5:
        return "CONNECT";
      default:
        return "IDENTITY";
    }
  };

  const getPhasePrimaryBtnLabel = (phaseNum: number): string => {
    switch (phaseNum) {
      case 1:
        return "Establish Digital Identity →";
      case 2:
        return "Complete Company Profile →";
      case 3:
        return "Activate Company AI →";
      case 4:
        return "Publish Your Offerings →";
      case 5:
        return "Open Connect & Trade →";
      default:
        return "Open Company Studio →";
    }
  };

  const getPhaseDynamicNextText = (phaseNum: number): string => {
    switch (phaseNum) {
      case 1:
        return "Establish your verified digital identity in Company Studio.";
      case 2:
        return "Complete your company profile and Sector City positioning.";
      case 3:
        return "Connect your authorized company knowledge.";
      case 4:
        return "Publish your first verified product or service.";
      case 5:
        return "Start receiving and managing commercial inquiries.";
      default:
        return "Proceed to Company Studio to manage setup.";
    }
  };

  const getPhaseCurrentLabel = (phaseNum: number): string => {
    switch (phaseNum) {
      case 1:
        return "Current Phase: 01 — Identity";
      case 2:
        return "Current Phase: 02 — Profile";
      case 3:
        return "Current Phase: 03 — Company AI";
      case 4:
        return "Current Phase: 04 — Offerings";
      case 5:
        return "Current Phase: 05 — Trade";
      default:
        return "Current Phase: 01 — Identity";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-graphite font-sans flex flex-col selection:bg-royal selection:text-white">
      
      {/* EXECUTIVE STANDALONE TOP BRAND BAR (NO WEBSITE HEADER/FOOTER) */}
      <header className="bg-white border-b border-line px-4 sm:px-8 py-3.5 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Brand Identity & Title */}
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2.5 text-graphite hover:opacity-90 transition">
              <LogoMark className="w-8 h-8 text-royal shrink-0" />
              <div className="flex flex-col">
                <span className="font-extrabold text-sm tracking-tight text-graphite leading-tight">
                  MarineWorld.City
                </span>
                <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                  Executive Platform Guide
                </span>
              </div>
            </a>
          </div>

          {/* Clean Return/Studio Navigation */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleActionClick("IDENTITY")}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Company Studio</span>
            </button>
          </div>

        </div>
      </header>

      {/* MAIN EXECUTIVE ONBOARDING GUIDE CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* EXECUTIVE SUBHEADER BAR (HERO) */}
        <div className="bg-white rounded-2xl border border-line p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-extrabold text-royal uppercase tracking-wider bg-royal/10 px-2.5 py-0.5 rounded-full">
                PLATFORM GUIDE
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Business Onboarding
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-graphite tracking-tight">
              Build Your Verified Marine Business Presence
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              Create your verified company presence with your identity, profile, products, services, AI Advisors and direct commercial connectivity.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
            <button
              type="button"
              onClick={() => handleActionClick("IDENTITY")}
              className="px-5 py-3 rounded-xl bg-royal text-white font-bold text-xs hover:bg-royal/90 transition shadow-2xs cursor-pointer flex items-center gap-2"
            >
              <span>Enter Company Studio →</span>
            </button>
          </div>
        </div>

        {/* COMPACT 1-SENTENCE JOURNEY SUMMARY BAR */}
        <div className="bg-white rounded-xl border border-line px-5 py-3.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-royal font-extrabold tracking-tight text-xs sm:text-sm">
            <span>Identify</span>
            <span className="text-slate-300">→</span>
            <span>Position</span>
            <span className="text-slate-300">→</span>
            <span>Activate</span>
            <span className="text-slate-300">→</span>
            <span>Publish</span>
            <span className="text-slate-300">→</span>
            <span>Trade</span>
          </div>
          <div className="text-slate-600 font-semibold text-center sm:text-right text-[12px]">
            Five simple steps to establish your company's verified digital business presence.
          </div>
        </div>

        {/* THREE STRUCTURAL COLUMNS (LEFT - CENTER - RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ========================================================================= */}
          {/* LEFT COLUMN: GETTING STARTED NAVIGATION (lg:col-span-3)                    */}
          {/* ========================================================================= */}
          <div className="lg:col-span-3 space-y-4">
            
            <div className="bg-white rounded-2xl border border-line p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  SETUP PHASES
                </span>
                <span className="text-xs font-extrabold text-royal">
                  01 – 05
                </span>
              </div>

              {/* 5 Primary Phase Items */}
              <div className="space-y-2">
                {tenantState.phases.map((phase, idx) => {
                  const isActive = idx === activePhaseIndex;
                  const isCompleted = phase.status === "COMPLETE";
                  const isInProgress = phase.status === "IN_PROGRESS";

                  return (
                    <button
                      key={phase.id}
                      type="button"
                      onClick={() => setActivePhaseIndex(idx)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isActive
                          ? "border-royal bg-royal/5 shadow-2xs ring-1 ring-royal/30"
                          : "border-line bg-white hover:border-slate-300 hover:bg-slate-50/80"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center font-extrabold text-xs transition-colors ${
                          isCompleted
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : isActive
                            ? "bg-royal text-white shadow-2xs"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : phase.phaseNumber}
                      </div>

                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 truncate">
                          0{phase.phaseNumber} — {phase.badgeLabel}
                        </div>
                        <div className={`text-xs font-bold truncate ${isActive ? "text-royal" : "text-graphite"}`}>
                          {phase.title}
                        </div>
                        <div className="flex items-center gap-1.5 pt-0.5">
                          {isCompleted ? (
                            <span className="text-[10.5px] font-bold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Completed</span>
                            </span>
                          ) : isInProgress ? (
                            <span className="text-[10.5px] font-bold text-sky-700 flex items-center gap-1">
                              <Circle className="w-3.5 h-3.5 text-sky-600 fill-sky-200" />
                              <span>In Progress</span>
                            </span>
                          ) : (
                            <span className="text-[10.5px] font-semibold text-slate-400 flex items-center gap-1">
                              <Circle className="w-3.5 h-3.5 text-slate-300" />
                              <span>Not Started</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* New to MarineWorld Card */}
            <div className="bg-white rounded-2xl border border-line p-4 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-graphite font-bold text-xs">
                <BookOpen className="w-4 h-4 text-royal" />
                <span>New to MarineWorld?</span>
              </div>
              <p className="text-[11.5px] text-slate-500 leading-relaxed font-normal">
                Learn how our ecosystem helps you grow your maritime business through verified AI identity and direct trade connections.
              </p>
              <a
                href="/explore"
                className="inline-flex items-center gap-1 text-xs font-bold text-royal hover:underline pt-1"
              >
                <span>How MarineWorld Works</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* CENTER COLUMN: CURRENT LESSON (lg:col-span-6)                              */}
          {/* ========================================================================= */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Phase 03 Special Corporate Trust Banner */}
            {currentPhase.phaseNumber === 3 && (
              <div className="bg-sky-50/90 border border-sky-200 rounded-2xl p-5 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2.5 text-royal font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-5 h-5 text-royal" />
                  <span>YOUR COMPANY. YOUR KNOWLEDGE. YOUR CONTROL.</span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed font-semibold">
                  Your company decides which information Company AI can use. Connect approved sources such as Google Drive and choose the information you want to make available. Your company remains in control of its knowledge.
                </p>
                <div className="pt-1 flex items-center gap-2 text-[11.5px] font-bold text-slate-700 bg-white/80 p-2.5 rounded-xl border border-sky-200/80">
                  <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Your private company information is not used to train a public AI model.</span>
                </div>
              </div>
            )}

            {/* Current Lesson Hero Card */}
            <div className="bg-white rounded-2xl border border-line p-6 shadow-2xs space-y-6">
              
              {/* Header Badge & Title + Right Diagram */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
                <div className="space-y-1 max-w-md">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-royal bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-md inline-block">
                    PHASE 0{currentPhase.phaseNumber} — {currentPhase.badgeLabel}
                  </span>
                  <h2 className="text-xl font-extrabold text-graphite tracking-tight pt-1">
                    {currentPhase.phaseNumber === 1 && "Establish Your Digital Identity"}
                    {currentPhase.phaseNumber === 2 && "Complete Your Company Profile"}
                    {currentPhase.phaseNumber === 3 && "Activate Your Company AI"}
                    {currentPhase.phaseNumber === 4 && "Publish Your Offerings"}
                    {currentPhase.phaseNumber === 5 && "Connect & Trade"}
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {currentPhase.phaseNumber === 1 && "Verified company identity & Registry ID"}
                    {currentPhase.phaseNumber === 2 && "Capabilities, Sector City & company positioning"}
                    {currentPhase.phaseNumber === 3 && "Your company knowledge. Your control."}
                    {currentPhase.phaseNumber === 4 && "Products, services & verified specifications"}
                    {currentPhase.phaseNumber === 5 && "RFQs, inquiries & commercial opportunities"}
                  </p>
                </div>

                {/* Right Diagram Illustration */}
                <div className="p-3 bg-slate-50 border border-line rounded-xl shrink-0 self-start sm:self-center flex items-center gap-2">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                    <div className="p-1.5 bg-white rounded-lg border border-slate-200 text-sky-600">
                      <Building className="w-4 h-4" />
                    </div>
                    <span>→</span>
                    <div className="p-1.5 bg-white rounded-lg border border-slate-200 text-amber-600">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <span>→</span>
                    <div className="p-1.5 bg-white rounded-lg border border-slate-200 text-royal">
                      <Brain className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Learning Cards Grid (WHAT, WHY, HOW, EXAMPLE) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* 1. WHAT */}
                <div className="p-4 rounded-xl border border-line bg-slate-50/60 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-royal">
                    <span className="w-5 h-5 rounded-md bg-royal/10 flex items-center justify-center font-extrabold text-xs">?</span>
                    <span className="uppercase tracking-wider">WHAT</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {currentPhase.phaseNumber === 1 && "Create your official company identity on MarineWorld.City using your legal business information."}
                    {currentPhase.phaseNumber === 2 && "Tell MarineWorld.City what your company does, which maritime areas you serve and where your capabilities belong."}
                    {currentPhase.phaseNumber === 3 && "Connect the information your company chooses to use with its Company AI."}
                    {currentPhase.phaseNumber === 4 && "Publish the products and services your company offers to the MarineWorld business ecosystem."}
                    {currentPhase.phaseNumber === 5 && "Connect with buyers, suppliers and business partners and manage incoming commercial opportunities."}
                  </p>
                </div>

                {/* 2. WHY */}
                <div className="p-4 rounded-xl border border-line bg-slate-50/60 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                    <span className="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center font-extrabold text-xs text-emerald-800">✓</span>
                    <span className="uppercase tracking-wider">WHY</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {currentPhase.phaseNumber === 1 && "A verified identity helps customers, buyers and business partners recognize your company as a real and trusted business within the MarineWorld ecosystem."}
                    {currentPhase.phaseNumber === 2 && "A complete profile brings together who you are, what you do, where you operate and the capabilities you provide, helping the right buyers and partners discover your company where your business is most relevant."}
                    {currentPhase.phaseNumber === 3 && "Company AI can provide more useful and relevant answers when it understands your company’s information, products, services and procedures."}
                    {currentPhase.phaseNumber === 4 && "Clear and structured offerings make it easier for buyers and partners to understand what you provide and when to contact you."}
                    {currentPhase.phaseNumber === 5 && "Turn company visibility into real business relationships by providing direct channels for incoming commercial inquiries."}
                  </p>
                </div>

                {/* 3. HOW */}
                <div className="p-4 rounded-xl border border-line bg-slate-50/60 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-800">
                    <span className="w-5 h-5 rounded-md bg-sky-100 flex items-center justify-center font-extrabold text-xs text-sky-800">≡</span>
                    <span className="uppercase tracking-wider">HOW</span>
                  </div>
                  <ol className="text-xs text-slate-600 space-y-1 font-medium">
                    {currentPhase.phaseNumber === 1 && (
                      <>
                        <li>1. Confirm your legal company name.</li>
                        <li>2. Verify your business registration details.</li>
                        <li>3. Add your headquarters and primary company information.</li>
                        <li>4. Establish your primary company contacts.</li>
                      </>
                    )}
                    {currentPhase.phaseNumber === 2 && (
                      <>
                        <li>1. Choose your primary Sector City.</li>
                        <li>2. Select your main business areas.</li>
                        <li>3. Add your core capabilities.</li>
                        <li>4. Describe your company and facilities.</li>
                      </>
                    )}
                    {currentPhase.phaseNumber === 3 && (
                      <>
                        <li>1. Connect an authorized company source such as Google Drive.</li>
                        <li>2. Select the information you want to make available.</li>
                        <li>3. Review the selected knowledge areas.</li>
                        <li>4. Activate Company AI.</li>
                      </>
                    )}
                    {currentPhase.phaseNumber === 4 && (
                      <>
                        <li>1. Create a product or service.</li>
                        <li>2. Add the important specifications.</li>
                        <li>3. Enable its dedicated AI Advisor.</li>
                        <li>4. Review and publish it.</li>
                      </>
                    )}
                    {currentPhase.phaseNumber === 5 && (
                      <>
                        <li>1. Open Connect & Trade.</li>
                        <li>2. Review incoming inquiries and RFQs.</li>
                        <li>3. Respond to relevant opportunities.</li>
                        <li>4. Explore Digital Property if greater ecosystem visibility is desired.</li>
                      </>
                    )}
                  </ol>
                </div>

                {/* 4. EXAMPLE */}
                <div className="p-4 rounded-xl border border-line bg-slate-50/60 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                    <span className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center font-extrabold text-xs text-amber-800">☆</span>
                    <span className="uppercase tracking-wider">EXAMPLE</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {currentPhase.phaseNumber === 1 && "A shipyard confirms its legal company information and receives a verified business identity on MarineWorld.City."}
                    {currentPhase.phaseNumber === 2 && "An offshore equipment supplier selects its relevant Sector City, adds its capabilities and becomes easier to discover by companies looking for those services."}
                    {currentPhase.phaseNumber === 3 && "A marine engineering company connects its approved technical manuals, project documentation and company procedures. Its Company AI can use those approved sources when assisting the company."}
                    {currentPhase.phaseNumber === 4 && "A marine equipment manufacturer publishes a propulsion system together with its specifications, documentation and commercial information."}
                    {currentPhase.phaseNumber === 5 && "A customer discovers a marine equipment product, asks its AI Advisor for information and submits an inquiry. The company receives and manages the opportunity directly in Company Studio."}
                  </p>
                </div>

              </div>

              {/* SPECIAL CONCEPT EXPLANATION CARDS DEPENDING ON PHASE */}
              {currentPhase.phaseNumber === 1 && (
                <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-royal">
                    <Globe className="w-4 h-4 text-royal" />
                    <span>Your MarineWorld Company Address</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    Your verified company receives its own digital address within the MarineWorld ecosystem, establishing your official presence across all Sector Cities.
                  </p>
                  <div className="p-2.5 bg-white border border-sky-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <span className="text-slate-500 font-bold uppercase text-[10.5px]">Example Company URL</span>
                    <code className="font-sans font-bold text-royal bg-slate-100 px-2.5 py-1 rounded border border-slate-200 text-xs">
                      company-name.sectorcity.marineworld.city
                    </code>
                  </div>
                </div>
              )}

              {currentPhase.phaseNumber === 4 && (
                <div className="p-4 rounded-xl border border-royal/20 bg-royal/5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-royal">
                    <Sparkles className="w-4 h-4 text-royal" />
                    <span>Product & Service AI Advisors</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    Every published product or service can become an AI-assisted business experience, helping customers understand the offering and take the next step.
                  </p>
                  
                  {/* Generic Flow Diagram */}
                  <div className="pt-1 text-[11px] font-bold text-slate-600 flex flex-wrap items-center gap-1.5 bg-white p-2.5 rounded-lg border border-royal/20">
                    <span className="bg-slate-100 px-2 py-0.5 rounded border">Product / Service</span>
                    <span>→</span>
                    <span className="bg-royal/10 text-royal px-2 py-0.5 rounded border border-royal/20">AI Advisor</span>
                    <span>→</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded border">Customer Questions</span>
                    <span>→</span>
                    <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">Information / Inquiry / RFQ</span>
                    <span>→</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded border">Company</span>
                  </div>

                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-graphite">
                      <span>Example: Marine Propulsion System</span>
                      <span className="text-[10.5px] text-royal font-extrabold bg-royal/10 px-2 py-0.5 rounded">AI ADVISOR READY</span>
                    </div>
                    <p className="text-[11px] text-slate-600 italic">
                      "Ask about specifications, applications, suitability, documentation and commercial information."
                    </p>
                  </div>
                </div>
              )}

              {/* PRODUCT PREVIEW AREA */}
              <div className="space-y-3 pt-2 border-t border-line">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    PRODUCT PREVIEW (EXAMPLE STATE)
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    Example Company Studio View
                  </span>
                </div>

                {/* Interactive/realistic Preview Mockup */}
                <div className="border border-line rounded-xl bg-slate-50 p-4 space-y-3 shadow-2xs">
                  {currentPhase.phaseNumber === 3 ? (
                    // Knowledge & Google Drive Preview
                    <div className="space-y-3 bg-white p-4 rounded-lg border border-line">
                      <div className="flex items-center justify-between border-b border-line/70 pb-3">
                        <div>
                          <span className="font-bold text-xs text-graphite">Example Knowledge Sources</span>
                          <p className="text-[11px] text-slate-500">Connect authorized sources for your Company AI.</p>
                        </div>
                        <span className="px-2.5 py-1 bg-royal text-white rounded-md text-[10.5px] font-bold">+ Connect Source</span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-slate-50 border border-line rounded-lg text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-200 flex items-center justify-center text-amber-600 font-bold text-xs">
                            GD
                          </div>
                          <div>
                            <span className="font-bold text-graphite">Google Drive Connection</span>
                            <p className="text-[11px] text-slate-500">Authorized source • 4 folders selected</p>
                          </div>
                        </div>

                        <div className="text-right space-y-0.5">
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            Connected (Example)
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] uppercase text-slate-500 font-bold">Selected Knowledge Areas</span>
                        <div className="flex flex-wrap gap-1.5">
                          {["Technical Manuals", "Project Documentation", "Certificates", "Policies & Procedures"].map((tag) => (
                            <span key={tag} className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded text-[11px] font-semibold">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : currentPhase.phaseNumber === 1 ? (
                    // Identity Preview
                    <div className="space-y-2 bg-white p-4 rounded-lg border border-line text-xs">
                      <div className="flex items-center justify-between border-b pb-2 border-line">
                        <div>
                          <span className="font-bold text-graphite block">Example / Verified Company</span>
                          <span className="text-[11px] text-slate-500">Company Identity Preview</span>
                        </div>
                        <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">EXAMPLE / VERIFIED REGISTRY ID</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <div><span className="text-slate-500">Registry ID:</span> <span className="font-bold text-graphite">REG-8820-EXMP</span></div>
                        <div><span className="text-slate-500">Status:</span> <span className="font-bold text-emerald-700">EXAMPLE / VERIFIED COMPANY</span></div>
                      </div>
                    </div>
                  ) : currentPhase.phaseNumber === 2 ? (
                    // Profile Preview
                    <div className="space-y-2 bg-white p-4 rounded-lg border border-line text-xs">
                      <span className="font-bold text-graphite block">Sector City Positioning (Example)</span>
                      <div className="p-3 bg-slate-50 border border-line rounded flex items-center justify-between">
                        <div>
                          <span className="font-bold text-royal">Shipyard & Repair City</span>
                          <p className="text-[11px] text-slate-500">Primary Business Area: Marine Engineering</p>
                        </div>
                        <span className="text-[10.5px] font-bold bg-royal/10 text-royal px-2.5 py-0.5 rounded">POSITIONED</span>
                      </div>
                    </div>
                  ) : currentPhase.phaseNumber === 4 ? (
                    // Offerings Preview
                    <div className="space-y-2 bg-white p-4 rounded-lg border border-line text-xs">
                      <div className="flex items-center justify-between border-b pb-2 border-line">
                        <span className="font-bold text-graphite">Published Offerings Catalog (Example)</span>
                        <span className="text-[11px] text-royal font-bold">4 PUBLISHED ITEMS</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded border border-line flex items-center justify-between text-[11px]">
                        <div>
                          <span className="font-bold text-graphite block">Marine Propulsion System</span>
                          <span className="text-[10.5px] text-slate-500">AI Advisor Enabled • Verified Specifications</span>
                        </div>
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10.5px]">AI-READY</span>
                      </div>
                    </div>
                  ) : (
                    // Connect & Trade Preview
                    <div className="space-y-2.5 bg-white p-4 rounded-lg border border-line text-xs">
                      <div className="flex items-center justify-between border-b pb-2 border-line">
                        <span className="font-bold text-graphite">Ecosystem Connect & Trade (Example)</span>
                        <span className="text-[11px] text-emerald-700 font-bold">ACTIVE INBOX</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded border border-line text-[11px] flex justify-between items-center">
                        <div>
                          <span className="font-bold text-graphite">Commercial Inquiry / RFQ</span>
                          <p className="text-[10.5px] text-slate-500">Direct B2B inquiry from customer AI Advisor interaction</p>
                        </div>
                        <span className="text-sky-800 bg-sky-50 px-2 py-0.5 rounded text-[10.5px] font-bold">CONNECTED</span>
                      </div>

                      {/* OPTIONAL DIGITAL PROPERTY EXPLANATION CARD */}
                      <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-lg text-[11px] space-y-1">
                        <span className="font-bold text-amber-900 block">Optional Digital Property</span>
                        <p className="text-[11px] text-amber-800 leading-snug font-normal">
                          Reserve a visible digital location within a relevant Sector City if greater ecosystem visibility is desired.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* OUTCOME BOX */}
              <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/90 space-y-1">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                  OUTCOME
                </div>
                <div className="text-xs font-extrabold text-emerald-950">
                  {currentPhase.phaseNumber === 1 && "Verified Company"}
                  {currentPhase.phaseNumber === 2 && "Discoverable Company Profile"}
                  {currentPhase.phaseNumber === 3 && "Company AI Layer"}
                  {currentPhase.phaseNumber === 4 && "AI-Ready Products & Services"}
                  {currentPhase.phaseNumber === 5 && "Direct Business Connectivity"}
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                  {currentPhase.phaseNumber === 1 && "Your company now has a trusted digital identity, Registry ID, and dedicated digital address within MarineWorld.City."}
                  {currentPhase.phaseNumber === 2 && "Your company profile brings together who you are, what you do, where you operate and the capabilities you provide in the right maritime business context."}
                  {currentPhase.phaseNumber === 3 && "Your Company AI can now work with the information your company has authorized under your complete control."}
                  {currentPhase.phaseNumber === 4 && "Your products and services are structured, verified and ready to be discovered, understood and engaged with through AI."}
                  {currentPhase.phaseNumber === 5 && "Your company can receive, manage and develop customer inquiries, RFQs and commercial opportunities through Company Studio."}
                </p>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => handleActionClick(getPhaseActionKey(currentPhase.phaseNumber))}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-royal text-white font-bold text-xs hover:bg-royal/90 transition shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{getPhasePrimaryBtnLabel(currentPhase.phaseNumber)}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleActionClick("STUDIO")}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Open Company Studio</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: LIVE COMPANY PROGRESS (lg:col-span-3)                         */}
          {/* ========================================================================= */}
          <div className="lg:col-span-3 space-y-4">
            
            <div className="bg-white rounded-2xl border border-line p-5 shadow-2xs space-y-4">
              
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    YOUR LIVE PROGRESS
                  </span>
                  <span className="text-xs font-extrabold text-royal">
                    {tenantState.completedCount} / 5 Completed
                  </span>
                </div>

                {/* Contextual line below progress indicator */}
                <div className="text-[11px] font-bold text-royal bg-royal/5 border border-royal/20 px-2.5 py-1 rounded-md mt-1.5">
                  {getPhaseCurrentLabel(currentPhase.phaseNumber)}
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 mt-2">
                  <div
                    className="h-full bg-royal transition-all duration-500 rounded-full"
                    style={{ width: `${tenantState.progressPercentage}%` }}
                  />
                </div>

                <div className="text-[11px] text-slate-500 font-bold text-right pt-1 truncate">
                  {tenantState.companyName}
                </div>
              </div>

              {/* CHECKLIST */}
              <div className="border-t border-line pt-3 space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">
                  CHECKLIST
                </span>

                <div className="space-y-2 text-xs font-medium">
                  {tenantState.phases.map((p) => {
                    const isDone = p.status === "COMPLETE";
                    const isProgress = p.status === "IN_PROGRESS";

                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between p-2 rounded-lg border transition ${
                          isDone
                            ? "bg-emerald-50/60 border-emerald-200/80 text-emerald-950"
                            : isProgress
                            ? "bg-sky-50/60 border-sky-200/80 text-sky-950 font-bold"
                            : "bg-slate-50 border-line text-slate-500"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : isProgress ? (
                            <Circle className="w-4 h-4 text-sky-600 fill-sky-200 shrink-0 animate-pulse" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                          )}
                          <span className="truncate text-[11.5px]">
                            0{p.phaseNumber} {
                              p.phaseNumber === 1 ? "Establish Digital Identity" :
                              p.phaseNumber === 2 ? "Complete Company Profile" :
                              p.phaseNumber === 3 ? "Activate Company AI" :
                              p.phaseNumber === 4 ? "Publish Your Offerings" :
                              "Connect & Trade"
                            }
                          </span>
                        </div>

                        <span className={`text-[10.5px] font-bold shrink-0 ml-1 ${
                          isDone ? "text-emerald-700" : isProgress ? "text-sky-700" : "text-slate-400"
                        }`}>
                          {isDone ? "Completed" : isProgress ? "In Progress" : "Not Started"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* DYNAMIC NEXT RECOMMENDED STEP */}
              <div className="border-t border-line pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-royal block">
                    NEXT RECOMMENDED STEP
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    PHASE 0{currentPhase.phaseNumber}
                  </span>
                </div>

                <p className="text-xs font-bold text-graphite leading-snug">
                  {getPhaseDynamicNextText(currentPhase.phaseNumber)}
                </p>

                <button
                  type="button"
                  onClick={() => handleActionClick(getPhaseActionKey(currentPhase.phaseNumber))}
                  className="w-full py-2.5 px-3 rounded-xl bg-royal text-white font-bold text-xs hover:bg-royal/90 transition shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{getPhasePrimaryBtnLabel(currentPhase.phaseNumber)}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

          </div>

        </div>

        {/* ========================================================================= */}
        {/* PUBLIC PRESENCE vs PRIVATE WORKSPACE CONCEPTUAL CALLOUT                     */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-line p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-royal bg-royal/10 px-2.5 py-0.5 rounded-full">
                YOUR BUSINESS PRESENCE
              </span>
              <h3 className="text-lg font-extrabold text-graphite tracking-tight pt-1">
                Public Business Presence vs. Private Workspace
              </h3>
            </div>
            <p className="text-xs text-slate-500 max-w-md">
              Your public business presence is visible to the market. Your Company Studio is where your team manages it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            
            {/* Public Company Page */}
            <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/50 space-y-2">
              <div className="flex items-center gap-2 font-bold text-royal text-sm">
                <Globe className="w-4 h-4 text-royal" />
                <span>MarineWorld Company Page</span>
                <span className="text-[10px] uppercase font-extrabold bg-sky-100 text-sky-800 px-2 py-0.5 rounded ml-auto">Public Market View</span>
              </div>
              <p className="text-slate-600 leading-relaxed font-medium">
                Allows buyers, partners, and customers to discover your company, explore products & services, interact with AI Advisors, and submit direct inquiries.
              </p>
              <div className="pt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-600">
                <span className="bg-white border border-sky-200 px-2 py-0.5 rounded">Company Address</span>
                <span className="bg-white border border-sky-200 px-2 py-0.5 rounded">Offerings Catalog</span>
                <span className="bg-white border border-sky-200 px-2 py-0.5 rounded">AI Advisors</span>
                <span className="bg-white border border-sky-200 px-2 py-0.5 rounded">Direct Reach</span>
              </div>
            </div>

            {/* Private Company Studio */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center gap-2 font-bold text-graphite text-sm">
                <Briefcase className="w-4 h-4 text-royal" />
                <span>Company Studio</span>
                <span className="text-[10px] uppercase font-extrabold bg-slate-200 text-slate-700 px-2 py-0.5 rounded ml-auto">Private Workspace</span>
              </div>
              <p className="text-slate-600 leading-relaxed font-medium">
                Allows your authorized team to manage company information, business profile, approved Company AI knowledge, products, AI Advisors, and incoming commercial opportunities.
              </p>
              <div className="pt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-600">
                <span className="bg-white border border-slate-200 px-2 py-0.5 rounded">Registry & Identity</span>
                <span className="bg-white border border-slate-200 px-2 py-0.5 rounded">Knowledge Controls</span>
                <span className="bg-white border border-slate-200 px-2 py-0.5 rounded">RFQs & Inquiries</span>
                <span className="bg-white border border-slate-200 px-2 py-0.5 rounded">Team Management</span>
              </div>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* NEW SECTION: WHAT YOUR COMPANY GETS (6 OUTCOME CARDS)                      */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-line p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-royal bg-royal/10 px-2.5 py-0.5 rounded-full">
                BUSINESS OUTCOMES
              </span>
              <h3 className="text-xl font-extrabold text-graphite tracking-tight pt-1">
                What Your Company Gets
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500 hidden sm:inline-block">
              Six Core Business Capabilities
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Card 01 */}
            <div className="p-4 rounded-xl border border-line bg-slate-50/80 space-y-2 hover:border-royal/40 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-royal bg-royal/10 px-2 py-0.5 rounded">01</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <h4 className="font-extrabold text-sm text-graphite">VERIFIED COMPANY</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Your verified business identity and Registry ID within the MarineWorld ecosystem.
              </p>
            </div>

            {/* Card 02 */}
            <div className="p-4 rounded-xl border border-line bg-slate-50/80 space-y-2 hover:border-royal/40 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-royal bg-royal/10 px-2 py-0.5 rounded">02</span>
                <Globe className="w-4 h-4 text-sky-600" />
              </div>
              <h4 className="font-extrabold text-sm text-graphite">COMPANY ADDRESS</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Your own digital address within the MarineWorld ecosystem.
              </p>
            </div>

            {/* Card 03 */}
            <div className="p-4 rounded-xl border border-line bg-slate-50/80 space-y-2 hover:border-royal/40 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-royal bg-royal/10 px-2 py-0.5 rounded">03</span>
                <Brain className="w-4 h-4 text-purple-600" />
              </div>
              <h4 className="font-extrabold text-sm text-graphite">COMPANY AI</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Your approved company knowledge, completely under your control.
              </p>
            </div>

            {/* Card 04 */}
            <div className="p-4 rounded-xl border border-line bg-slate-50/80 space-y-2 hover:border-royal/40 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-royal bg-royal/10 px-2 py-0.5 rounded">04</span>
                <Sparkles className="w-4 h-4 text-amber-600" />
              </div>
              <h4 className="font-extrabold text-sm text-graphite">AI ADVISORS</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Help customers understand your products and services and take the next step.
              </p>
            </div>

            {/* Card 05 */}
            <div className="p-4 rounded-xl border border-line bg-slate-50/80 space-y-2 hover:border-royal/40 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-royal bg-royal/10 px-2 py-0.5 rounded">05</span>
                <Users className="w-4 h-4 text-royal" />
              </div>
              <h4 className="font-extrabold text-sm text-graphite">DIRECT REACH</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Customers and business partners can reach your company through approved business channels.
              </p>
            </div>

            {/* Card 06 */}
            <div className="p-4 rounded-xl border border-line bg-slate-50/80 space-y-2 hover:border-royal/40 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-royal bg-royal/10 px-2 py-0.5 rounded">06</span>
                <MessageSquare className="w-4 h-4 text-emerald-600" />
              </div>
              <h4 className="font-extrabold text-sm text-graphite">COMMERCIAL OPPORTUNITIES</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Receive and manage inquiries, RFQs and business opportunities through Company Studio.
              </p>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}
