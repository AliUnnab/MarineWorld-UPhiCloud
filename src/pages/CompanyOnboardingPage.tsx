import React, { useState, useEffect } from "react";
import type { SectorConfig, PlanCode, CompanyEntity, SubscriptionIntent } from "@/lib/types";
import { LogoMark } from "@/components/digione/icons";
import { GlobalFooter } from "@/components/foundation/GlobalFooter";
import { CommercialPaymentModal } from "@/components/company/CommercialPaymentModal";
import {
  startCompanyOnboarding,
  activateCompany,
  getAllPlans,
  getPlanByCode,
  AVAILABLE_PLANS,
  createSubscriptionIntent,
  processPayment,
  getCompanySubscription,
  getCompanyEntitlements,
} from "@/lib/services/companyOnboardingService";
import { getCompanyById } from "@/lib/services/companyService";
import { setActiveOrganizationContext, getUserMemberships } from "@/lib/services/accessContextService";
import { getCurrentAuthSession, setCurrentAuthSession, getCompanyMember, type AuthContext } from "@/lib/services/securityService";
import { getCompanyVerificationStatus, submitCompanyVerification } from "@/lib/services/governanceService";
import { verifyAndSyncStripeSessionStatus } from "@/lib/services/stripeService";
import {
  Building2,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  CreditCard,
  FileText,
  Lock,
  Globe,
  UserCheck,
  XCircle,
  HelpCircle,
} from "lucide-react";

interface CompanyOnboardingPageProps {
  config: SectorConfig;
  onEnterStudio?: (companyId: string) => void;
}

export function CompanyOnboardingPage({ config, onEnterStudio }: CompanyOnboardingPageProps) {
  // 7 Canonical Steps:
  // 1: COMPANY IDENTITY
  // 2: ORGANIZATIONAL DIGITAL IDENTITY
  // 3: MARINEWORLD BUSINESS ID
  // 4: PLAN
  // 5: SUBSCRIPTION
  // 6: VERIFICATION
  // 7: ACTIVATION
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [mode, setMode] = useState<"COMPANY" | "ECOSYSTEM">("COMPANY");
  const [authSession, setAuthSession] = useState<AuthContext>(() => getCurrentAuthSession());

  // Form State for Company Identity
  const [legalName, setLegalName] = useState("Argento Marine Global N.V.");
  const [displayName, setDisplayName] = useState("Argento Marine");
  const [slug, setSlug] = useState("argento-maritime");
  const [primaryCityId, setPrimaryCityId] = useState("shipyard");
  const [officialWebsite, setOfficialWebsite] = useState("https://argento-maritime.com");
  const [officialEmail, setOfficialEmail] = useState("contact@argento-maritime.com");
  const [selectedPlanCode, setSelectedPlanCode] = useState<PlanCode>("GROWTH");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);

  // Onboarding Entity State
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [companyEntity, setCompanyEntity] = useState<CompanyEntity | null>(null);
  const [subscriptionIntent, setSubscriptionIntent] = useState<SubscriptionIntent | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // Sync auth session and restore canonical company lifecycle state on refresh/mount
  useEffect(() => {
    const auth = getCurrentAuthSession();
    setAuthSession(auth);

    if (auth.uid) {
      const memberships = getUserMemberships(auth.uid);
      if (memberships && memberships.length > 0 && memberships[0]?.companyId) {
        const primaryCompId = memberships[0].companyId;
        const comp = getCompanyById(primaryCompId);
        if (comp) {
          setActiveCompanyId(comp.id);
          setCompanyEntity(comp);
          setLegalName(comp.legalName);
          setDisplayName(comp.displayName);
          setSlug(comp.slug);
          if (comp.email) setOfficialEmail(comp.email);
          if (comp.website) setOfficialWebsite(comp.website);

          // Resolve current onboarding step dynamically from canonical state
          const sub = getCompanySubscription(comp.id);
          const verif = comp.verificationStatus;

          if (comp.lifecycleStatus === "ACTIVE") {
            setCurrentStep(7); // ACTIVATION
          } else if (verif === "VERIFIED") {
            setCurrentStep(7); // ACTIVATION
          } else if (sub?.status === "ACTIVE") {
            setCurrentStep(6); // VERIFICATION
          } else if (comp.lifecycleStatus === "PENDING_PAYMENT") {
            setCurrentStep(5); // SUBSCRIPTION
          } else if (comp.businessId) {
            setCurrentStep(3); // BUSINESS ID
          } else if (comp.id) {
            setCurrentStep(2); // ORGANIZATIONAL DIGITAL IDENTITY
          }
        }
      }
    }
  }, []);

  // Handle return parameters from Stripe Checkout redirect
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const stripeStatus = urlParams.get("stripe_status");
    const sessionId = urlParams.get("session_id");
    const intentId = urlParams.get("intent_id");

    if (stripeStatus && intentId) {
      if (stripeStatus === "success" && sessionId) {
        fetch(`/api/stripe/session-status?session_id=${encodeURIComponent(sessionId)}&intent_id=${encodeURIComponent(intentId)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.status === "PAID") {
              setSuccessMessage("Stripe payment authorized & verified. Subscription active.");
              if (data.intent) setSubscriptionIntent(data.intent);
              setCurrentStep(6); // PROCEED TO VERIFICATION
            } else {
              setErrorMessage("Payment pending authorization or webhook confirmation. Status: " + (data.status || "PENDING"));
              setCurrentStep(5);
            }
          })
          .catch(() => {
            verifyAndSyncStripeSessionStatus(sessionId, intentId).then((res) => {
              if (res.success && res.status === "PAID") {
                setSuccessMessage("Stripe payment verified. Subscription active.");
                if (res.intent) setSubscriptionIntent(res.intent);
                setCurrentStep(6);
              } else {
                setErrorMessage("Payment pending webhook confirmation.");
                setCurrentStep(5);
              }
            });
          });
      } else if (stripeStatus === "canceled") {
        setErrorMessage("Stripe Checkout was canceled. Your company onboarding state and Business ID are preserved.");
        setCurrentStep(5);
      }
    }
  }, []);

  const handleSlugify = (name: string) => {
    setDisplayName(name);
    const generatedSlug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    setSlug(generatedSlug);
  };

  // Step 1: Collect & Validate Company Identity
  const handleCreateCompanyIdentity = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const auth = getCurrentAuthSession();
    if (!auth.uid) {
      setShowAuthModal(true);
      setErrorMessage("Authentication required: Sign in to register your company as authorized principal.");
      return;
    }

    if (!legalName || !displayName || !slug) {
      setErrorMessage("Please complete all required company identity fields (Legal Name, Display Name, Slug).");
      return;
    }

    const res = startCompanyOnboarding(
      {
        sectorId: "marine",
        primaryCityId,
        country: "Netherlands",
        legalName,
        displayName,
        slug,
        requestedPlanCode: selectedPlanCode,
        creatorEmail: officialEmail,
      },
      auth
    );

    if (!res.success || !res.result) {
      setErrorMessage(res.error || "Failed to create company identity.");
      return;
    }

    const comp = getCompanyById(res.result.companyId);
    setActiveCompanyId(res.result.companyId);
    setCompanyEntity(comp || null);
    setSubscriptionIntent(res.result.subscriptionIntent);
    setSuccessMessage(`Company identity established. Assigned ID: ${res.result.companyId}`);
    setCurrentStep(2); // ORGANIZATIONAL DIGITAL IDENTITY
  };

  // Sign In as Founder for Unauthenticated Visitors
  const handleSignInAsFounder = () => {
    const session: AuthContext = {
      uid: "usr-stage2-founder",
      email: officialEmail || "founder@marineworld.city",
      emailVerified: true,
    };
    setCurrentAuthSession(session);
    setAuthSession(session);
    setShowAuthModal(false);
    setErrorMessage(null);
    setSuccessMessage("Authenticated as Authorized Principal. Establishing company identity...");

    const res = startCompanyOnboarding(
      {
        sectorId: "marine",
        primaryCityId,
        country: "Netherlands",
        legalName,
        displayName,
        slug,
        requestedPlanCode: selectedPlanCode,
        creatorEmail: officialEmail || "founder@marineworld.city",
      },
      session
    );

    if (res.success && res.result) {
      const comp = getCompanyById(res.result.companyId);
      setActiveCompanyId(res.result.companyId);
      setCompanyEntity(comp || null);
      setSubscriptionIntent(res.result.subscriptionIntent);
      setCurrentStep(2);
    }
  };

  // Step 2: Confirm Organizational Digital Identity & Proceed to Business ID
  const handleProceedToBusinessId = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!activeCompanyId || !companyEntity) {
      setErrorMessage("Please complete Step 1 first.");
      return;
    }
    setSuccessMessage(`Digital identity confirmed for ${companyEntity.displayName}. MarineWorld Business ID generated.`);
    setCurrentStep(3); // MARINEWORLD BUSINESS ID
  };

  // Step 3 -> Step 4: Proceed to Plan
  const handleProceedToPlan = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setCurrentStep(4); // PLAN
  };

  // Step 4: Plan Selection & Intent Creation & Modal Trigger
  const handleSelectPlan = (code: PlanCode) => {
    setSelectedPlanCode(code);
    setErrorMessage(null);
    const compId = activeCompanyId || "argento-marine";
    const intent = createSubscriptionIntent(compId, code);
    setSubscriptionIntent(intent);
    setSuccessMessage(`Selected Plan: ${code}. Subscription Intent created.`);
    setCurrentStep(5); // SUBSCRIPTION
    setIsPaymentModalOpen(true); // Open Commercial Payment Method Modal
  };

  // Step 5: Payment Processing Simulation
  const handleSimulatePayment = (success: boolean) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!subscriptionIntent) {
      setErrorMessage("Subscription intent missing. Please select a plan first.");
      return;
    }

    const res = processPayment(subscriptionIntent.id, success, `ref-${Date.now()}`);
    if (res.success) {
      setSuccessMessage("Payment authorization confirmed. Subscription state updated to ACTIVE.");
      if (activeCompanyId) {
        const comp = getCompanyById(activeCompanyId);
        if (comp) setCompanyEntity(comp);
      }
      setCurrentStep(6); // VERIFICATION
    } else {
      setErrorMessage(`Payment authorization failed: ${res.reason}. Your company record is safely preserved.`);
      if (activeCompanyId) {
        const comp = getCompanyById(activeCompanyId);
        if (comp) setCompanyEntity(comp);
      }
    }
  };

  // Step 6: Governed Verification
  const handleSimulateVerification = () => {
    if (!activeCompanyId) return;
    submitCompanyVerification(activeCompanyId, "DOCUMENT_REVIEW", "DOC-REG-VERIFIED", authSession);
    const comp = getCompanyById(activeCompanyId);
    if (comp) setCompanyEntity(comp);
    setSuccessMessage("Official company verification approved. Status updated to VERIFIED.");
  };

  // Step 7: Activation Execution
  const handleActivateCompany = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!activeCompanyId) {
      setErrorMessage("No active company found for activation.");
      return;
    }

    const res = activateCompany(activeCompanyId, authSession);
    if (res.success && res.company) {
      setCompanyEntity(res.company);
      setActiveOrganizationContext(authSession.uid!, activeCompanyId);
      setSuccessMessage("Company successfully activated! Enterprise entitlements and Company Studio unlocked.");
    } else {
      setErrorMessage(`Activation failed: ${res.reason}`);
    }
  };

  // Enter Studio Callback / Navigation
  const handleEnterStudio = () => {
    if (activeCompanyId) {
      if (onEnterStudio) {
        onEnterStudio(activeCompanyId);
      } else {
        window.history.pushState({}, "", "/studio");
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    }
  };

  // 7 Canonical Steps
  const steps = [
    { num: 1, key: "IDENTITY", label: "COMPANY IDENTITY" },
    { num: 2, key: "ORGANIZATION", label: "DIGITAL IDENTITY" },
    { num: 3, key: "BUSINESS_ID", label: "BUSINESS ID" },
    { num: 4, key: "PLAN", label: "PLAN" },
    { num: 5, key: "SUBSCRIPTION", label: "SUBSCRIPTION" },
    { num: 6, key: "VERIFICATION", label: "VERIFICATION" },
    { num: 7, key: "ACTIVATION", label: "ACTIVATION" },
  ];

  // Helper to determine step completion status from state
  const isStepComplete = (stepNum: number): boolean => {
    if (!companyEntity && !activeCompanyId) return false;
    if (stepNum === 1) return Boolean(companyEntity?.id);
    if (stepNum === 2) return Boolean(companyEntity?.id && companyEntity?.organizationType);
    if (stepNum === 3) return Boolean(companyEntity?.businessId);
    if (stepNum === 4) return Boolean(subscriptionIntent || companyEntity?.businessId);
    if (stepNum === 5) {
      const sub = activeCompanyId ? getCompanySubscription(activeCompanyId) : null;
      return sub?.status === "ACTIVE";
    }
    if (stepNum === 6) {
      const verif = activeCompanyId ? getCompanyVerificationStatus(activeCompanyId) : "UNVERIFIED";
      return verif === "VERIFIED";
    }
    if (stepNum === 7) {
      return companyEntity?.lifecycleStatus === "ACTIVE";
    }
    return false;
  };

  // Calculate Prerequisites for Activation
  const isIdentityValid = Boolean(companyEntity?.id && companyEntity?.businessId);
  const member = activeCompanyId ? getCompanyMember(activeCompanyId, authSession) : null;
  const isPrincipalAuthorityValid = Boolean(member && ["OWNER", "ADMIN"].includes(member.role));
  const activeSub = activeCompanyId ? getCompanySubscription(activeCompanyId) : null;
  const isSubscriptionValid = activeSub?.status === "ACTIVE";
  const entitlements = activeCompanyId ? getCompanyEntitlements(activeCompanyId) : [];
  const isEntitlementsValid = entitlements.length > 0 && entitlements.some((e) => e.status === "ACTIVE");

  const allPrerequisitesPass = isIdentityValid && isPrincipalAuthorityValid && isSubscriptionValid && isEntitlementsValid;

  return (
    <div className="min-h-screen bg-canvas font-sans text-graphite antialiased selection:bg-royal selection:text-white flex flex-col justify-between">
      <div>
        {/* Dedicated Clean Onboarding Header */}
        <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5" aria-label={`${config.wordmark} — home`}>
              <LogoMark className="h-8 w-8" />
              <span className="text-[15.5px] font-semibold tracking-[-0.02em] text-graphite">
                {config.sectorName}
                <span className="text-royal">{config.sectorTld}</span>
              </span>
            </a>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block text-xs font-semibold text-stone">
                Company Registration &amp; Onboarding
              </span>
              <a
                href="/"
                className="text-xs font-semibold text-stone hover:text-graphite px-3.5 py-1.5 border border-line rounded-lg bg-white hover:bg-slate-50 transition"
              >
                Exit to MarineWorld
              </a>
            </div>
          </div>
        </header>

        <main className="pt-8 md:pt-10 pb-20 px-4 max-w-6xl mx-auto space-y-8">
          {/* Header Banner & Corporate Context Area */}
          <div className="bg-white border border-line rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-royal/10 text-royal border border-royal/20 uppercase tracking-widest">
                  COMPANY ONBOARDING
                </span>
                <span className="text-stone font-mono text-xs">| MarineWorld.City</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-graphite tracking-tight">
                CREATE YOUR AI-NATIVE COMPANY
              </h1>
              <p className="text-xs md:text-sm text-stone max-w-2xl leading-relaxed">
                Step {currentStep} of 7 — <strong className="text-graphite">{steps[currentStep - 1]?.label}</strong>
              </p>
            </div>
          </div>

          {/* Access Context Summary Card */}
          <div className="bg-slate-50/80 border border-line rounded-2xl p-4 md:p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-stone font-sans">Current Step:</span>
              <div className="text-royal font-bold mt-0.5">{steps[currentStep - 1]?.label}</div>
            </div>
            <div>
              <span className="text-stone font-sans">Company:</span>
              <div className="text-graphite font-bold font-sans mt-0.5 truncate">
                {companyEntity?.displayName || displayName || "Pending Creation"}
              </div>
            </div>
            <div>
              <span className="text-stone font-sans">Business ID:</span>
              <div className="text-graphite font-bold mt-0.5">
                {companyEntity?.businessId || "Assigned on Step 3"}
              </div>
            </div>
            <div>
              <span className="text-stone font-sans">Account Status:</span>
              <div className="text-emerald-700 font-bold mt-0.5">
                {companyEntity?.lifecycleStatus || "REGISTRATION"}
              </div>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex flex-wrap items-center justify-between border-b border-line pb-4 gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMode("COMPANY")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  mode === "COMPANY"
                    ? "bg-royal text-white shadow-sm"
                    : "bg-white text-stone hover:text-graphite border border-line"
                }`}
              >
                <Building2 className="w-4 h-4" />
                Commercial AI-Native Company Onboarding
              </button>

              <button
                type="button"
                onClick={() => setMode("ECOSYSTEM")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  mode === "ECOSYSTEM"
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "bg-white text-stone hover:text-graphite border border-line"
                }`}
              >
                <Globe className="w-4 h-4" />
                FOR ASSOCIATIONS, CHAMBERS &amp; INSTITUTIONS
              </button>
            </div>

            {activeCompanyId && (
              <div className="text-xs font-mono text-royal bg-white px-3.5 py-1.5 rounded-xl border border-line shadow-sm flex items-center gap-2">
                <span className="text-stone font-sans">Active Workspace:</span>
                <span className="font-bold">{displayName}</span>
              </div>
            )}
          </div>

          {/* ECOSYSTEM INSTITUTIONAL ENTRY VIEW */}
          {mode === "ECOSYSTEM" ? (
            <div className="bg-white border border-line rounded-2xl p-8 space-y-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-line pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-graphite">
                    FOR ASSOCIATIONS, CHAMBERS &amp; INSTITUTIONS
                  </h2>
                  <p className="text-xs text-stone mt-0.5">
                    Dedicated onboarding portal for Maritime Associations, Port Authorities, Chambers of Commerce, and Public Bodies.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
                <div className="p-4 rounded-xl bg-slate-50 border border-line space-y-1">
                  <div className="text-emerald-800 font-bold">1. Application &amp; Proof</div>
                  <div className="text-stone text-[11px]">Submit statutory authority document and charter credentials.</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-line space-y-1">
                  <div className="text-emerald-800 font-bold">2. Institutional Email Domain</div>
                  <div className="text-stone text-[11px]">Verify institutional domain email (e.g. directorate@port.org).</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-line space-y-1">
                  <div className="text-emerald-800 font-bold">3. Public Governance Audit</div>
                  <div className="text-stone text-[11px]">Audit institutional authority and community charter.</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-line space-y-1">
                  <div className="text-emerald-800 font-bold">4. Ecosystem Portal</div>
                  <div className="text-stone text-[11px]">Direct access to Sector City governance and institutional features.</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Ecosystem Boundary Isolation:</span> Official institutions operate in a dedicated institutional context with specialized governance workflows.
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setMode("COMPANY")}
                  className="px-5 py-2.5 rounded-xl bg-royal text-white font-bold text-xs hover:bg-blue-600 transition-colors shadow-sm"
                >
                  Return to Commercial Company Onboarding
                </button>
              </div>
            </div>
          ) : (
            /* COMMERCIAL COMPANY ONBOARDING JOURNEY */
            <>
              {/* 7-Step Progress Header */}
              <div className="bg-white border border-line rounded-2xl p-4 md:p-6 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
                  {steps.map((s) => {
                    const isActive = currentStep === s.num;
                    const isDone = isStepComplete(s.num) || currentStep > s.num;

                    return (
                      <button
                        key={s.num}
                        type="button"
                        onClick={() => {
                          if (isDone || isActive || s.num === currentStep - 1) {
                            setCurrentStep(s.num);
                          }
                        }}
                        className={`p-2.5 md:p-3 rounded-xl border text-left transition-all ${
                          isActive
                            ? "bg-royal/10 border-royal text-royal font-bold shadow-sm ring-1 ring-royal/30"
                            : isDone
                            ? "bg-emerald-50/70 border-emerald-200 text-emerald-800 font-medium"
                            : "bg-slate-50 border-line text-stone opacity-70 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span>0{s.num}</span>
                          {isDone ? (
                            <span className="flex items-center gap-1 text-emerald-700 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="hidden xl:inline">DONE</span>
                            </span>
                          ) : isActive ? (
                            <span className="flex items-center gap-1 text-royal font-bold">
                              <span className="w-2 h-2 rounded-full bg-royal animate-pulse" />
                              <span className="hidden xl:inline">CURRENT</span>
                            </span>
                          ) : (
                            <span className="text-stone font-mono text-[9px]">STEP</span>
                          )}
                        </div>
                        <div className="text-[11px] font-semibold mt-1 truncate">{s.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Error / Feedback Banners */}
              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-rose-900">Registration Notice</div>
                    <div>{errorMessage}</div>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-mono flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-emerald-900">Status Update</div>
                    <div>{successMessage}</div>
                  </div>
                </div>
              )}

              {/* AUTH MODAL FOR UNAUTHENTICATED VISITORS */}
              {showAuthModal && (
                <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 space-y-4 text-xs text-amber-900 shadow-sm">
                  <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                    <Lock className="w-5 h-5 text-amber-700" />
                    AUTHENTICATION REQUIRED TO REGISTER COMPANY
                  </div>
                  <p className="text-stone leading-relaxed">
                    Please sign in as authorized principal to establish and operate your company workspace on MarineWorld.
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleSignInAsFounder}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors flex items-center gap-2 shadow-sm"
                    >
                      <UserCheck className="w-4 h-4" />
                      Sign In as Principal &amp; Continue Registration
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAuthModal(false)}
                      className="px-4 py-2.5 rounded-xl bg-white border border-line text-stone hover:text-graphite font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 01 — COMPANY IDENTITY */}
              {currentStep === 1 && (
                <div className="bg-white border border-line rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
                  <div>
                    <div className="text-xs font-mono text-royal font-bold uppercase tracking-wider">
                      STEP 01 — COMPANY IDENTITY
                    </div>
                    <h2 className="text-xl font-bold text-graphite mt-1">
                      Enter Company Business Details
                    </h2>
                    <p className="text-xs text-stone mt-0.5">
                      Provide official legal company name, commercial display name, sector city, and contact details.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-graphite">Legal Company Name *</label>
                      <input
                        type="text"
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                        placeholder="e.g. Argento Marine Global N.V."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-line text-graphite text-xs focus:outline-none focus:border-royal focus:bg-white font-medium transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-graphite">Display Name *</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => handleSlugify(e.target.value)}
                        placeholder="e.g. Argento Marine"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-line text-graphite text-xs focus:outline-none focus:border-royal focus:bg-white font-medium transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-graphite">Company URL Slug *</label>
                      <input
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                        placeholder="e.g. argento-maritime"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-line font-mono text-royal text-xs focus:outline-none focus:border-royal focus:bg-white transition-all font-semibold"
                      />
                      <div className="text-[11px] text-mute font-mono">Route: /companies/{slug || "slug"}</div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-graphite">Primary Sector City *</label>
                      <select
                        value={primaryCityId}
                        onChange={(e) => setPrimaryCityId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-line text-graphite text-xs focus:outline-none focus:border-royal focus:bg-white font-medium transition-all"
                      >
                        <option value="shipyard">Shipyard City (Shipbuilding &amp; Repair)</option>
                        <option value="port-authority">Port City (Port Operations &amp; Logistics)</option>
                        <option value="offshore">Offshore City (Energy &amp; Subsea Operations)</option>
                        <option value="maritime-services">Logistics City (Maritime Trade &amp; Cargo)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-graphite">Official Website</label>
                      <input
                        type="text"
                        value={officialWebsite}
                        onChange={(e) => setOfficialWebsite(e.target.value)}
                        placeholder="https://argento-maritime.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-line text-graphite text-xs focus:outline-none focus:border-royal focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-graphite">Official Contact Email *</label>
                      <input
                        type="email"
                        value={officialEmail}
                        onChange={(e) => setOfficialEmail(e.target.value)}
                        placeholder="contact@argento-maritime.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-line text-graphite text-xs focus:outline-none focus:border-royal focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-line">
                    <div className="text-stone text-xs">
                      All registrations are secured by MarineWorld verification standards.
                    </div>

                    <button
                      type="button"
                      onClick={handleCreateCompanyIdentity}
                      className="px-6 py-3 rounded-xl bg-royal text-white font-bold text-xs hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm"
                    >
                      <span>CREATE COMPANY IDENTITY</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 02 — ORGANIZATIONAL DIGITAL IDENTITY */}
              {currentStep === 2 && (
                <div className="bg-white border border-line rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
                  <div>
                    <div className="text-xs font-mono text-royal font-bold uppercase tracking-wider">
                      STEP 02 — ORGANIZATIONAL DIGITAL IDENTITY
                    </div>
                    <h2 className="text-xl font-bold text-graphite mt-1">
                      Confirm Organizational Profile
                    </h2>
                    <p className="text-xs text-stone mt-0.5">
                      Review your company details before generating your immutable MarineWorld Business Identifier.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-royal/5 border border-royal/20 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                      <div className="p-3 bg-white border border-line rounded-xl">
                        <span className="text-stone font-sans">Organization Type:</span>
                        <div className="text-graphite font-bold text-sm mt-0.5">{companyEntity?.organizationType || "COMPANY"}</div>
                      </div>

                      <div className="p-3 bg-white border border-line rounded-xl">
                        <span className="text-stone font-sans">Company Name:</span>
                        <div className="text-graphite font-bold text-sm mt-0.5 font-sans">{companyEntity?.legalName || legalName}</div>
                      </div>

                      <div className="p-3 bg-white border border-line rounded-xl">
                        <span className="text-stone font-sans">Assigned Company ID:</span>
                        <div className="text-royal font-bold text-sm mt-0.5">{companyEntity?.id || activeCompanyId || "comp-argento-maritime"}</div>
                      </div>

                      <div className="p-3 bg-white border border-line rounded-xl">
                        <span className="text-stone font-sans">Authorized Principal:</span>
                        <div className="text-graphite font-bold text-sm mt-0.5">{authSession.email || authSession.uid || "usr-owner-001"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-line">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 text-stone hover:text-graphite text-xs font-semibold border border-line"
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={handleProceedToBusinessId}
                      className="px-6 py-3 rounded-xl bg-royal text-white font-bold text-xs hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm"
                    >
                      <span>CONFIRM &amp; PROCEED TO BUSINESS ID</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 03 — MARINEWORLD BUSINESS ID */}
              {currentStep === 3 && (
                <div className="bg-white border border-line rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
                  <div>
                    <div className="text-xs font-mono text-royal font-bold uppercase tracking-wider">
                      STEP 03 — MARINEWORLD BUSINESS ID
                    </div>
                    <h2 className="text-xl font-bold text-graphite mt-1">
                      MarineWorld Business Identifier
                    </h2>
                    <p className="text-xs text-stone mt-0.5">
                      Globally unique identifier bound to your company across all maritime cities and commercial contracts.
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-royal/30 rounded-2xl p-6 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-mono text-royal uppercase tracking-widest font-bold">
                        MARINEWORLD BUSINESS ID
                      </div>
                      <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-royal text-white uppercase tracking-wider">
                        OFFICIAL IDENTIFIER
                      </span>
                    </div>

                    <div className="text-2xl md:text-3xl font-extrabold font-mono text-graphite tracking-wider py-1">
                      {companyEntity?.businessId || "MW-BUS-ARGENTO-MARITIME"}
                    </div>

                    <div className="text-xs text-stone flex items-center gap-2 pt-1 border-t border-royal/10">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Registered for: <code className="text-graphite font-bold bg-white px-1.5 py-0.5 rounded border border-line">{companyEntity?.displayName || "Argento Marine"}</code></span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-line text-xs space-y-2 text-stone">
                    <div className="font-bold text-royal font-mono text-[11px] uppercase tracking-wider">
                      Identifier Guarantees
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-stone">
                      <li><strong className="text-graphite">Globally Unique:</strong> Ensures distinctive authority across MarineWorld.City.</li>
                      <li><strong className="text-graphite">Immutable:</strong> Permanent anchor for verified digital assets, catalog entries, and commercial twins.</li>
                      <li><strong className="text-graphite">Portable:</strong> Preserved across domain changes, tier upgrades, and multi-city operations.</li>
                    </ul>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-line">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 text-stone hover:text-graphite text-xs font-semibold border border-line"
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={handleProceedToPlan}
                      className="px-6 py-3 rounded-xl bg-royal text-white font-bold text-xs hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm"
                    >
                      <span>PROCEED TO PLAN SELECTION</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 04 — PLAN */}
              {currentStep === 4 && (
                <div className="bg-white border border-line rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
                  <div>
                    <div className="text-xs font-mono text-royal font-bold uppercase tracking-wider">
                      STEP 04 — SUBSCRIPTION PLAN
                    </div>
                    <h2 className="text-xl font-bold text-graphite mt-1">
                      Choose Your AI-Native Company Plan
                    </h2>
                    <p className="text-xs text-stone mt-0.5">
                      Select the operational tier that fits your fleet and digital twin requirements.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {getAllPlans().map((plan) => {
                      const isSelected = selectedPlanCode === plan.code;
                      return (
                        <div
                          key={plan.code}
                          onClick={() => setSelectedPlanCode(plan.code)}
                          className={`p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-6 ${
                            isSelected
                              ? "bg-royal/5 border-royal ring-1 ring-royal shadow-sm"
                              : "bg-white border-line hover:border-royal/50"
                          }`}
                        >
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono font-bold text-royal uppercase tracking-wider">
                                {plan.code}
                              </span>
                              {isSelected && (
                                <span className="px-2 py-0.5 rounded bg-royal text-white text-[10px] font-bold">
                                  SELECTED
                                </span>
                              )}
                            </div>

                            <div>
                              <h3 className="text-lg font-bold text-graphite">{plan.name}</h3>
                              <div className="mt-2 flex items-baseline gap-1">
                                <span className="text-3xl font-extrabold text-graphite">${plan.price}</span>
                                <span className="text-xs text-stone font-mono">/month</span>
                              </div>
                            </div>

                            <div className="space-y-2 pt-4 border-t border-line text-xs">
                              <div className="text-stone font-semibold mb-1">Capabilities:</div>
                              {plan.includedCapabilities.map((cap) => (
                                <div key={cap} className="flex items-center gap-2 text-graphite">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>{cap.replace(/_/g, " ")}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSelectPlan(plan.code)}
                            className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                              isSelected
                                ? "bg-royal text-white hover:bg-blue-600 shadow-sm"
                                : "bg-slate-100 text-graphite hover:bg-slate-200 border border-line"
                            }`}
                          >
                            Select {plan.name} Plan
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-between pt-4 border-t border-line">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 text-stone hover:text-graphite text-xs font-semibold border border-line"
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectPlan(selectedPlanCode)}
                      className="px-6 py-3 rounded-xl bg-royal text-white font-bold text-xs hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm"
                    >
                      <span>CONFIRM PLAN &amp; CONTINUE</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 05 — SUBSCRIPTION */}
              {currentStep === 5 && (
                <div className="bg-white border border-line rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
                  <div>
                    <div className="text-xs font-mono text-royal font-bold uppercase tracking-wider">
                      STEP 05 — PAYMENT &amp; SUBSCRIPTION
                    </div>
                    <h2 className="text-xl font-bold text-graphite mt-1">
                      Choose Commercial Route &amp; Confirm Subscription
                    </h2>
                    <p className="text-xs text-stone mt-0.5">
                      Authorize subscription activation for your company workspace via your preferred enterprise commercial channel.
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-50 border border-line space-y-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-line pb-4">
                      <div>
                        <div className="text-xs font-mono text-stone uppercase font-bold tracking-wider">
                          SELECTED PLAN &amp; BILLING
                        </div>
                        <div className="text-base font-bold text-graphite mt-0.5">
                          {getPlanByCode(selectedPlanCode)?.name || selectedPlanCode} (${getPlanByCode(selectedPlanCode)?.price || 899}/month)
                        </div>
                        <div className="text-xs text-stone font-mono mt-1">
                          Company ID: <strong className="text-graphite">{activeCompanyId || "argento-marine"}</strong> | Business ID: <code className="text-royal font-bold">{companyEntity?.businessId || "MW-BUS-ARGENTO-MARITIME"}</code>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span className="px-3 py-1 rounded-lg bg-royal/10 text-royal font-mono text-xs font-bold">
                          {subscriptionIntent?.paymentMethod ? `${subscriptionIntent.paymentMethod}` : "INTENT CREATED"}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-line space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-mono font-bold text-graphite uppercase">
                          Commercial Route Status
                        </div>
                        <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {subscriptionIntent?.paymentState || "SELECTION_REQUIRED"}
                        </span>
                      </div>

                      <p className="text-xs text-stone leading-relaxed">
                        Selected Commercial Method: <strong className="text-graphite">{subscriptionIntent?.paymentMethod || "Not Selected Yet"}</strong>. Select Pay Online (Stripe), Google Cloud Marketplace, or Private Offer to finalize commercial intent.
                      </p>

                      <div className="flex flex-wrap gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsPaymentModalOpen(true)}
                          className="px-5 py-2.5 rounded-xl bg-royal text-white font-bold text-xs hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>CHOOSE COMMERCIAL ROUTE</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSimulatePayment(true)}
                          className="px-5 py-2.5 rounded-xl bg-slate-100 text-graphite font-bold text-xs hover:bg-slate-200 border border-line transition-all flex items-center gap-2"
                        >
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Simulate Authorization (Dev Mode)</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-line">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 text-stone hover:text-graphite text-xs font-semibold border border-line"
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentStep(6)}
                      className="px-6 py-3 rounded-xl bg-royal text-white font-bold text-xs hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm"
                    >
                      <span>PROCEED TO VERIFICATION</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 06 — VERIFICATION */}
              {currentStep === 6 && (
                <div className="bg-white border border-line rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
                  <div>
                    <div className="text-xs font-mono text-royal font-bold uppercase tracking-wider">
                      STEP 06 — OFFICIAL COMPANY VERIFICATION
                    </div>
                    <h2 className="text-xl font-bold text-graphite mt-1">
                      Company Trust &amp; Governance Verification
                    </h2>
                    <p className="text-xs text-stone mt-0.5">
                      Verify official corporate registry details to grant verified commercial trust status.
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-line rounded-xl p-6 space-y-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-line pb-4">
                      <div>
                        <div className="text-xs font-mono text-stone uppercase font-semibold">Verification Status:</div>
                        <div className="text-xl font-bold font-mono mt-1 text-emerald-800 flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-600" />
                          <span>{activeCompanyId ? getCompanyVerificationStatus(activeCompanyId) : "UNVERIFIED"}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSimulateVerification}
                        className="px-5 py-2.5 rounded-xl bg-royal text-white font-bold text-xs hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Submit Corporate Verification</span>
                      </button>
                    </div>

                    <div className="text-xs text-stone leading-relaxed">
                      Verified companies receive an official trust badge, priority matchmaking, and autonomous AI catalog capabilities.
                    </div>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-line">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(5)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 text-stone hover:text-graphite text-xs font-semibold border border-line"
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentStep(7)}
                      className="px-6 py-3 rounded-xl bg-royal text-white font-bold text-xs hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm"
                    >
                      <span>PROCEED TO ACTIVATION</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 07 — ACTIVATION */}
              {currentStep === 7 && (
                <div className="bg-white border border-line rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
                  <div>
                    <div className="text-xs font-mono text-royal font-bold uppercase tracking-wider">
                      STEP 07 — ACTIVATION &amp; ACCESS
                    </div>
                    <h2 className="text-xl font-bold text-graphite mt-1">
                      Activate AI-Native Company Workspace
                    </h2>
                    <p className="text-xs text-stone mt-0.5">
                      Verify activation prerequisites and launch your Company Studio.
                    </p>
                  </div>

                  {/* Prerequisites Evaluation */}
                  <div className="bg-slate-50 border border-line rounded-xl p-6 space-y-3 text-xs">
                    <div className="text-xs font-mono font-bold text-graphite uppercase tracking-wider mb-2">
                      ACTIVATION PREREQUISITES
                    </div>

                    {/* 1. Identity Valid */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-line shadow-xs">
                      <div className="flex items-center gap-3">
                        {isIdentityValid ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600" />
                        )}
                        <div>
                          <div className="font-bold text-graphite">1. Company Identity &amp; Business ID</div>
                          <div className="text-stone font-mono text-[11px]">
                            {companyEntity?.businessId ? `Business ID: ${companyEntity.businessId}` : "Company ID / Business ID Pending"}
                          </div>
                        </div>
                      </div>
                      <span className={`font-mono font-bold px-2.5 py-1 rounded text-[11px] ${
                        isIdentityValid ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
                      }`}>
                        {isIdentityValid ? "PASS" : "PENDING"}
                      </span>
                    </div>

                    {/* 2. Principal Authority Valid */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-line shadow-xs">
                      <div className="flex items-center gap-3">
                        {isPrincipalAuthorityValid ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600" />
                        )}
                        <div>
                          <div className="font-bold text-graphite">2. Authorized Principal Account</div>
                          <div className="text-stone font-mono text-[11px]">
                            {authSession.email || authSession.uid} ({member?.role || "OWNER"})
                          </div>
                        </div>
                      </div>
                      <span className={`font-mono font-bold px-2.5 py-1 rounded text-[11px] ${
                        isPrincipalAuthorityValid ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
                      }`}>
                        {isPrincipalAuthorityValid ? "PASS" : "PENDING"}
                      </span>
                    </div>

                    {/* 3. Subscription Valid */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-line shadow-xs">
                      <div className="flex items-center gap-3">
                        {isSubscriptionValid ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                        )}
                        <div>
                          <div className="font-bold text-graphite">3. Active Plan Subscription</div>
                          <div className="text-stone font-mono text-[11px]">
                            Status: {activeSub?.status || "ACTIVE"} ({activeSub?.planCode || selectedPlanCode})
                          </div>
                        </div>
                      </div>
                      <span className={`font-mono font-bold px-2.5 py-1 rounded text-[11px] ${
                        isSubscriptionValid ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"
                      }`}>
                        {isSubscriptionValid ? "PASS" : "PENDING"}
                      </span>
                    </div>

                    {/* 4. Entitlements Valid */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-line shadow-xs">
                      <div className="flex items-center gap-3">
                        {isEntitlementsValid ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                        )}
                        <div>
                          <div className="font-bold text-graphite">4. Commercial Entitlements</div>
                          <div className="text-stone font-mono text-[11px]">
                            Capabilities Granted: {entitlements.length || 6} Active
                          </div>
                        </div>
                      </div>
                      <span className={`font-mono font-bold px-2.5 py-1 rounded text-[11px] ${
                        isEntitlementsValid ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"
                      }`}>
                        {isEntitlementsValid ? "PASS" : "PENDING"}
                      </span>
                    </div>
                  </div>

                  {/* Company Activation State Banner */}
                  {companyEntity?.lifecycleStatus === "ACTIVE" ? (
                    <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                          <div>
                            <div className="text-xs font-mono font-bold text-emerald-800 uppercase">
                              COMPANY STATUS: ACTIVE
                            </div>
                            <div className="text-base font-bold text-emerald-950">
                              {displayName} ({companyEntity.businessId})
                            </div>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-emerald-700 text-white font-mono text-xs font-bold">
                          STUDIO READY
                        </span>
                      </div>

                      <div className="text-xs text-emerald-900 leading-relaxed font-mono">
                        Company is fully active. You now have complete access to the Company Studio, AI Advisor, and catalog management.
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={handleEnterStudio}
                          className="px-6 py-3 rounded-xl bg-royal text-white font-bold text-xs hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm"
                        >
                          <span>OPEN COMPANY STUDIO</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between pt-4 border-t border-line">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(6)}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 text-stone hover:text-graphite text-xs font-semibold border border-line"
                      >
                        Back
                      </button>

                      <button
                        type="button"
                        onClick={handleActivateCompany}
                        disabled={!allPrerequisitesPass}
                        className={`px-6 py-3 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-sm ${
                          allPrerequisitesPass
                            ? "bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
                            : "bg-stone/30 text-stone/70 border border-line cursor-not-allowed"
                        }`}
                      >
                        <span>ACTIVATE COMPANY &amp; UNLOCK STUDIO</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <CommercialPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        selectedPlan={getPlanByCode(selectedPlanCode) || AVAILABLE_PLANS.GROWTH}
        companyId={activeCompanyId || "argento-marine"}
        businessId={companyEntity?.businessId || "MW-BUS-ARGENTO-MARITIME"}
        legalName={legalName}
        displayName={displayName}
        subscriptionIntent={subscriptionIntent}
        onIntentUpdated={(updated) => setSubscriptionIntent(updated)}
        onProceedToVerification={() => {
          setIsPaymentModalOpen(false);
          setCurrentStep(6);
        }}
      />

      <GlobalFooter config={config} tone="light" />
    </div>
  );
}
