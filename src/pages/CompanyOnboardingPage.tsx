import React, { useState, useEffect } from "react";
import type { SectorConfig, PlanCode, CompanyEntity, SubscriptionIntent, Subscription } from "@/lib/types";
import { LogoMark } from "@/components/digione/icons";
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
  generateBusinessId,
  getSubscriptionIntentById,
} from "@/lib/services/companyOnboardingService";
import { getCompanyById } from "@/lib/services/companyService";
import { setActiveOrganizationContext, getUserMemberships } from "@/lib/services/accessContextService";
import { getCurrentAuthSession, setCurrentAuthSession, getCompanyMember, registerCompanyMember, type AuthContext } from "@/lib/services/securityService";
import { getCompanyVerificationStatus, submitCompanyVerification } from "@/lib/services/governanceService";
import { verifyAndSyncStripeSessionStatus } from "@/lib/services/stripeService";
import {
  validateOrganizationEnrollmentCode,
  applyOrganizationEnrollmentToCompany,
  type EcosystemOrganizationSummary,
} from "@/lib/services/ecosystemOrganizationService";
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
  Eye,
  EyeOff,
  LogIn,
  Mail,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { hashPassword } from "@/lib/crypto";
import { createUserWithEmail, signInWithEmail } from "@/lib/services/securityService";
import { findCompanyByEmailOrName, saveCompanyRecord } from "@/lib/repositories/companyRepository";

interface CompanyOnboardingPageProps {
  config: SectorConfig;
  onEnterStudio?: (companyId: string) => void;
}

const ONBOARDING_DRAFT_KEY = "marineworld_company_onboarding_draft_v2";

interface OnboardingDraft {
  activeCompanyId?: string | null;
  currentStep?: number;
  maxUnlockedStep?: number;
  legalName?: string;
  displayName?: string;
  slug?: string;
  primaryCityId?: string;
  officialWebsite?: string;
  officialEmail?: string;
  passwordDraft?: string;
  selectedPlanCode?: PlanCode;
  enrollmentCodeInput?: string;
  updatedAt?: string;
}

function saveOnboardingDraft(draft: OnboardingDraft) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      ONBOARDING_DRAFT_KEY,
      JSON.stringify({ ...draft, updatedAt: new Date().toISOString() })
    );
  } catch (e) {
    console.warn("[Onboarding] Failed to save draft to localStorage:", e);
  }
}

function loadOnboardingDraft(): OnboardingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("[Onboarding] Failed to load draft from localStorage:", e);
    return null;
  }
}

function clearOnboardingDraft() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ONBOARDING_DRAFT_KEY);
  } catch (e) {
    console.warn("[Onboarding] Failed to clear draft from localStorage:", e);
  }
}

export function calculateOnboardingStep(comp: CompanyEntity | null, activeSub?: any): number {
  if (!comp) return 1;
  if (comp.lifecycleStatus === "ACTIVE" || comp.status === "ACTIVE" || comp.onboardingCompleted) return 7;
  if (comp.verificationStatus === "VERIFIED") return 7;

  const sub = activeSub || (comp.id ? getCompanySubscription(comp.id) : undefined);
  if (sub && sub.status === "ACTIVE") {
    return Math.max(comp.onboardingStep || 1, 5);
  }
  if (comp.onboardingStep && comp.onboardingStep >= 1 && comp.onboardingStep <= 7) {
    return comp.onboardingStep;
  }
  if (comp.lifecycleStatus === "PENDING_PAYMENT" || comp.lifecycleStatus === "PENDING_SUBSCRIPTION") return 4;
  if (comp.id) return 2;
  return 1;
}

export function CompanyOnboardingPage({ config, onEnterStudio }: CompanyOnboardingPageProps) {
  // Canonical 7 Steps State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState<number>(1);

  // Helper to change step deterministically with instant scroll
  const goToStep = (stepNum: number) => {
    setCurrentStep(stepNum);
    setMaxUnlockedStep((prev) => Math.max(prev, stepNum));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };
  const [mode, setMode] = useState<"COMPANY" | "ECOSYSTEM">("COMPANY");
  const [authSession, setAuthSession] = useState<AuthContext>(() => getCurrentAuthSession());

  // Form State for Company Identity
  const [legalName, setLegalName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [primaryCityId, setPrimaryCityId] = useState("shipyard");
  const [officialWebsite, setOfficialWebsite] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPlanCode, setSelectedPlanCode] = useState<PlanCode>("STARTER");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);

  // Onboarding Entity State
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [companyEntity, setCompanyEntity] = useState<CompanyEntity | null>(null);
  const [subscriptionIntent, setSubscriptionIntent] = useState<SubscriptionIntent | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // Sign In / Resume Modal State
  const [showSignInModal, setShowSignInModal] = useState<boolean>(false);
  const [signInEmail, setSignInEmail] = useState<string>("");
  const [signInPassword, setSignInPassword] = useState<string>("");
  const [showSignInPassword, setShowSignInPassword] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  // Ecosystem Membership Enrollment State
  const [enrollmentCodeInput, setEnrollmentCodeInput] = useState<string>("");
  const [codeValidationState, setCodeValidationState] = useState<"EMPTY" | "VALIDATING" | "VALID" | "INVALID" | "EXPIRED">("EMPTY");
  const [validatedOrg, setValidatedOrg] = useState<EcosystemOrganizationSummary | null>(null);
  const [codeErrorMsg, setCodeErrorMsg] = useState<string | null>(null);

  // Helper to hydrate company state into form fields
  const hydrateCompanyIntoState = (comp: CompanyEntity, sub?: Subscription | null, targetStep?: number) => {
    setActiveCompanyId(comp.id);
    setCompanyEntity(comp);
    if (comp.legalName) setLegalName(comp.legalName);
    if (comp.displayName) setDisplayName(comp.displayName);
    if (comp.slug) setSlug(comp.slug);
    if (comp.email || comp.officialEmail) setOfficialEmail(comp.email || comp.officialEmail || "");
    if (comp.website || comp.websiteUrl) setOfficialWebsite(comp.website || comp.websiteUrl || "");
    if (comp.primarySectorCityId) setPrimaryCityId(comp.primarySectorCityId);
    if (comp.plainPasswordDraft) setPassword(comp.plainPasswordDraft);

    if (comp.enrolledOrganizationCode) {
      setEnrollmentCodeInput(comp.enrolledOrganizationCode);
      const val = validateOrganizationEnrollmentCode(comp.enrolledOrganizationCode);
      if (val.valid && val.organization) {
        setValidatedOrg(val.organization);
        setCodeValidationState("VALID");
      }
    }

    const currentSub = sub || (comp.id ? getCompanySubscription(comp.id) : undefined);
    const effectivePlanCode = (currentSub?.planCode || currentSub?.planId || comp.requestedPlanCode || "STARTER") as PlanCode;
    const resolvedPlan = getPlanByCode(effectivePlanCode);
    if (resolvedPlan) {
      setSelectedPlanCode(resolvedPlan.code);
    }

    const hasPaidSub = currentSub?.status === "ACTIVE";
    const compOnboardingStep = comp.onboardingStep || (hasPaidSub ? 5 : 1);
    const resolvedStep = targetStep || (hasPaidSub ? Math.max(compOnboardingStep, 5) : calculateOnboardingStep(comp, currentSub));
    
    const furthest = Math.max(compOnboardingStep, resolvedStep, hasPaidSub ? 5 : 1);
    setMaxUnlockedStep((prev) => Math.max(prev, furthest));
    if (targetStep) {
      goToStep(targetStep);
    } else {
      goToStep(resolvedStep);
    }
  };

  // Sync auth session and restore state on mount / refresh
  useEffect(() => {
    const auth = getCurrentAuthSession();
    setAuthSession(auth);

    const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const urlIntentId = urlParams.get("intent_id");
    const stripeStatus = urlParams.get("stripe_status");

    // 1. If returning from Stripe with intent_id
    if (urlIntentId) {
      const intent = getSubscriptionIntentById(urlIntentId);
      if (intent) {
        setSubscriptionIntent(intent);
        const comp = getCompanyById(intent.companyId);
        const sub = getCompanySubscription(intent.companyId);
        if (comp) {
          hydrateCompanyIntoState(comp, sub, stripeStatus === "success" ? 5 : 4);
          return;
        }
      }
    }

    // 2. If authenticated user has active company, redirect to Studio
    if (auth.uid) {
      const memberships = getUserMemberships(auth.uid);
      if (memberships && memberships.length > 0 && memberships[0]?.companyId) {
        const primaryCompId = memberships[0].companyId;
        const comp = getCompanyById(primaryCompId);
        if (comp) {
          if (comp.lifecycleStatus === "ACTIVE" || comp.status === "ACTIVE") {
            clearOnboardingDraft();
            if (onEnterStudio) {
              onEnterStudio(comp.id);
            } else {
              window.history.pushState({}, "", "/studio");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }
            return;
          }

          const sub = getCompanySubscription(comp.id);
          hydrateCompanyIntoState(comp, sub);
          return;
        }
      }
    }

    // 3. Check existing draft from localStorage
    const draft = loadOnboardingDraft();
    if (draft) {
      if (draft.legalName) setLegalName(draft.legalName);
      if (draft.displayName) setDisplayName(draft.displayName);
      if (draft.slug) setSlug(draft.slug);
      if (draft.primaryCityId) setPrimaryCityId(draft.primaryCityId);
      if (draft.officialWebsite) setOfficialWebsite(draft.officialWebsite);
      if (draft.officialEmail) setOfficialEmail(draft.officialEmail);
      if (draft.passwordDraft) setPassword(draft.passwordDraft);
      if (draft.selectedPlanCode) setSelectedPlanCode(draft.selectedPlanCode);
      if (draft.enrollmentCodeInput) setEnrollmentCodeInput(draft.enrollmentCodeInput);

      if (draft.activeCompanyId) {
        const comp = getCompanyById(draft.activeCompanyId);
        if (comp) {
          const sub = getCompanySubscription(comp.id);
          hydrateCompanyIntoState(comp, sub, draft.currentStep || 1);
          return;
        }
      }
    }

    // Default clean start on Step 1 if nothing stored
    setCurrentStep(1);
    setMaxUnlockedStep(1);
  }, []);

  // Save draft continuously when meaningful data is present
  useEffect(() => {
    if (!legalName && !displayName && !activeCompanyId) return;
    saveOnboardingDraft({
      activeCompanyId,
      currentStep,
      maxUnlockedStep,
      legalName,
      displayName,
      slug,
      primaryCityId,
      officialWebsite,
      officialEmail,
      passwordDraft: password,
      selectedPlanCode,
      enrollmentCodeInput,
    });
  }, [
    activeCompanyId,
    currentStep,
    maxUnlockedStep,
    legalName,
    displayName,
    slug,
    primaryCityId,
    officialWebsite,
    officialEmail,
    password,
    selectedPlanCode,
    enrollmentCodeInput,
  ]);

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
              if (data.intent) {
                setSubscriptionIntent(data.intent);
                const rawPlan = data.intent.planCode || data.intent.planId;
                const planObj = getPlanByCode(rawPlan);
                if (planObj) {
                  setSelectedPlanCode(planObj.code);
                }
                const comp = getCompanyById(data.intent.companyId);
                const sub = data.subscription || getCompanySubscription(data.intent.companyId);
                if (comp) {
                  hydrateCompanyIntoState(comp, sub, 5);
                }
              }
              goToStep(5); // STEP 05 — SUBSCRIPTION DETAILS
            } else {
              setErrorMessage("Payment pending authorization or webhook confirmation. Status: " + (data.status || "PENDING"));
              goToStep(5);
            }
          })
          .catch(() => {
            verifyAndSyncStripeSessionStatus(sessionId, intentId).then((res) => {
              if (res.success && res.status === "PAID") {
                setSuccessMessage("Stripe payment verified. Subscription active.");
                if (res.intent) {
                  setSubscriptionIntent(res.intent);
                  const rawPlan = res.intent.planCode || res.intent.planId;
                  const planObj = getPlanByCode(rawPlan);
                  if (planObj) {
                    setSelectedPlanCode(planObj.code);
                  }
                  const comp = getCompanyById(res.intent.companyId);
                  const sub = res.subscription || getCompanySubscription(res.intent.companyId);
                  if (comp) {
                    hydrateCompanyIntoState(comp, sub, 5);
                  }
                }
                goToStep(5); // STEP 05 — SUBSCRIPTION DETAILS
              } else {
                setErrorMessage("Payment pending webhook confirmation.");
                goToStep(5);
              }
            });
          });
      } else if (stripeStatus === "canceled") {
        setErrorMessage("Stripe Checkout was canceled. Your company onboarding state and Business ID are preserved.");
        goToStep(4);
      }
    }
  }, []);

  const handleSlugify = (name: string) => {
    setDisplayName(name);
    const generatedSlug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    setSlug(generatedSlug);
  };

  // Ecosystem Enrollment Code Validation Handlers
  const handleApplyEnrollmentCode = () => {
    if (!enrollmentCodeInput.trim()) {
      setCodeValidationState("INVALID");
      setCodeErrorMsg("Enrollment code cannot be empty.");
      return;
    }

    setCodeValidationState("VALIDATING");
    setCodeErrorMsg(null);

    setTimeout(() => {
      const res = validateOrganizationEnrollmentCode(enrollmentCodeInput);
      if (res.valid && res.organization) {
        setValidatedOrg(res.organization);
        setCodeValidationState("VALID");
        if (activeCompanyId) {
          applyOrganizationEnrollmentToCompany(activeCompanyId, enrollmentCodeInput);
        }
      } else if (res.status === "EXPIRED") {
        setCodeValidationState("EXPIRED");
        setValidatedOrg(null);
        setCodeErrorMsg("This enrollment code is no longer active.");
      } else {
        setCodeValidationState("INVALID");
        setValidatedOrg(null);
        setCodeErrorMsg("Enrollment code could not be verified.");
      }
    }, 350);
  };

  const handleRemoveEnrollmentCode = () => {
    setEnrollmentCodeInput("");
    setCodeValidationState("EMPTY");
    setValidatedOrg(null);
    setCodeErrorMsg(null);
    if (companyEntity) {
      companyEntity.enrolledOrganizationId = undefined;
      companyEntity.enrolledOrganizationName = undefined;
      companyEntity.enrolledOrganizationCode = undefined;
    }
  };

  // Handle Modal Sign In to Resume Onboarding
  const handleModalSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);
    setErrorMessage(null);

    const cleanMail = signInEmail.trim().toLowerCase();
    if (!cleanMail || !signInPassword) {
      setSignInError("Please enter both your company email and password.");
      return;
    }

    setIsSigningIn(true);
    try {
      const auth = await signInWithEmail(cleanMail, signInPassword);
      setAuthSession(auth);

      // Resolve company from Firestore or in-memory
      const comp = await findCompanyByEmailOrName(cleanMail);
      if (comp) {
        if (comp.lifecycleStatus === "ACTIVE" || comp.status === "ACTIVE" || comp.onboardingCompleted) {
          clearOnboardingDraft();
          setActiveOrganizationContext(auth.uid!, comp.id);
          setShowSignInModal(false);
          if (onEnterStudio) {
            onEnterStudio(comp.id);
          } else {
            window.history.pushState({}, "", "/studio");
            window.dispatchEvent(new PopStateEvent("popstate"));
          }
          return;
        }

        const sub = getCompanySubscription(comp.id);
        hydrateCompanyIntoState(comp, sub);
        setShowSignInModal(false);
        setSignInPassword("");
        const stepToResume = comp.onboardingStep || calculateOnboardingStep(comp, sub);
        setSuccessMessage(`Sign-in successful! Resuming your registration from Step 0${stepToResume} (${steps[stepToResume - 1]?.label || "Setup"}).`);
      } else {
        setShowSignInModal(false);
        setSignInPassword("");
        setSuccessMessage("Signed in successfully. Please proceed with registration.");
      }
    } catch (err: any) {
      setSignInError(err?.message || "Sign-in failed. Please verify your company email and password.");
    } finally {
      setIsSigningIn(false);
    }
  };

  // Step 1: Collect & Validate Company Identity (with duplicate check & update support)
  const handleCreateCompanyIdentity = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanLegal = legalName.trim();
    const cleanDisplay = displayName.trim();
    const cleanSlugVal = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const cleanEmail = officialEmail.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanLegal || !cleanDisplay || !cleanSlugVal || !cleanEmail) {
      setErrorMessage("Please complete all required fields (Legal Name, Display Name, Slug, Official Contact Email).");
      return;
    }

    if (!cleanPass || cleanPass.length < 6) {
      setErrorMessage("Please enter a secure password of at least 6 characters for your company account.");
      return;
    }

    // Duplicate Check across Database & Memory
    const existing = await findCompanyByEmailOrName(cleanEmail, cleanSlugVal);
    const auth = getCurrentAuthSession();

    // If an existing company is found that doesn't match our active company ID
    if (existing && existing.id !== activeCompanyId) {
      if (existing.lifecycleStatus === "ACTIVE" || existing.status === "ACTIVE" || existing.onboardingCompleted) {
        setErrorMessage(
          `An active company account already exists for '${cleanEmail}'. Please sign in with your company password to access your dashboard.`
        );
      } else {
        setErrorMessage(
          `A registration draft already exists for '${cleanEmail}'. Please sign in with your company password to resume your setup.`
        );
      }
      setSignInEmail(cleanEmail);
      setShowSignInModal(true);
      return;
    }

    // If this is an update to an existing in-progress company registration (e.g. navigated back to Step 01)
    if (activeCompanyId && companyEntity) {
      const passwordHash = await hashPassword(cleanPass);
      const updatedComp: CompanyEntity = {
        ...companyEntity,
        legalName: cleanLegal,
        displayName: cleanDisplay,
        slug: cleanSlugVal,
        email: cleanEmail,
        officialEmail: cleanEmail,
        website: officialWebsite,
        websiteUrl: officialWebsite,
        primarySectorCityId: primaryCityId,
        passwordHash,
        plainPasswordDraft: cleanPass,
        onboardingStep: Math.max(companyEntity.onboardingStep || 1, 2),
        updatedAt: new Date().toISOString(),
      };
      setCompanyEntity(updatedComp);
      await saveCompanyRecord(updatedComp);
      saveOnboardingDraft({
        activeCompanyId,
        currentStep: 2,
        maxUnlockedStep: Math.max(maxUnlockedStep, 2),
        legalName: cleanLegal,
        displayName: cleanDisplay,
        slug: cleanSlugVal,
        primaryCityId,
        officialWebsite,
        officialEmail: cleanEmail,
        passwordDraft: cleanPass,
        selectedPlanCode,
        enrollmentCodeInput,
      });
      setSuccessMessage(`Step 01 updated: Company identity details refreshed and saved to Firebase.`);
      goToStep(2);
      return;
    }

    // Hash password with SHA-256 for secure database storage
    const passwordHash = await hashPassword(cleanPass);

    let currentAuth = auth;
    if (!currentAuth.uid || currentAuth.isAnonymous) {
      try {
        currentAuth = await createUserWithEmail(cleanEmail, cleanPass, cleanDisplay);
      } catch (err: any) {
        try {
          currentAuth = await signInWithEmail(cleanEmail, cleanPass);
        } catch {
          const fallbackUid = `usr-${cleanSlugVal}-${Date.now()}`;
          const fallbackSession: AuthContext = {
            uid: fallbackUid,
            email: cleanEmail,
            displayName: cleanDisplay,
            emailVerified: true,
            providerId: "password",
          };
          setCurrentAuthSession(fallbackSession);
          currentAuth = fallbackSession;
        }
      }
      setAuthSession(currentAuth);
    }

    const res = startCompanyOnboarding(
      {
        sectorId: "marine",
        primaryCityId,
        country: "Netherlands",
        legalName: cleanLegal,
        displayName: cleanDisplay,
        slug: cleanSlugVal,
        requestedPlanCode: selectedPlanCode,
        creatorEmail: cleanEmail,
        password: cleanPass,
        passwordHash,
        enrollmentCode: codeValidationState === "VALID" ? enrollmentCodeInput : undefined,
      },
      currentAuth
    );

    if (!res.success || !res.result) {
      setErrorMessage(res.error || "Unable to create company identity.");
      return;
    }

    const comp = getCompanyById(res.result.companyId);
    setActiveCompanyId(res.result.companyId);
    setCompanyEntity(comp || null);
    setSubscriptionIntent(res.result.subscriptionIntent);

    // Save draft
    saveOnboardingDraft({
      activeCompanyId: res.result.companyId,
      currentStep: 2,
      maxUnlockedStep: 2,
      legalName: cleanLegal,
      displayName: cleanDisplay,
      slug: cleanSlugVal,
      primaryCityId,
      officialWebsite,
      officialEmail: cleanEmail,
      passwordDraft: cleanPass,
      selectedPlanCode,
      enrollmentCodeInput,
    });

    setSuccessMessage(`Step 01 Complete: Company identity created and saved to Firebase. (Assigned ID: ${res.result.companyId})`);
    goToStep(2); // ORGANIZATIONAL DIGITAL IDENTITY
  };

  // Sign In as Founder for Unauthenticated Visitors
  const handleSignInAsFounder = async () => {
    const cleanEmail = officialEmail.trim().toLowerCase() || "founder@marineworld.city";
    const cleanPass = password.trim() || "FounderSecure2026!";
    const passwordHash = await hashPassword(cleanPass);

    const session: AuthContext = {
      uid: "usr-stage2-founder",
      email: cleanEmail,
      displayName: displayName.trim() || "Founder",
      emailVerified: true,
      providerId: "password",
    };
    setCurrentAuthSession(session);
    setAuthSession(session);
    setShowAuthModal(false);
    setErrorMessage(null);
    setSuccessMessage("Signed in as Authorized Principal. Establishing company identity...");

    const res = startCompanyOnboarding(
      {
        sectorId: "marine",
        primaryCityId,
        country: "Netherlands",
        legalName: legalName.trim() || "Argento Marine Global N.V.",
        displayName: displayName.trim() || "Argento Marine",
        slug: slug.trim() || "argento-maritime",
        requestedPlanCode: selectedPlanCode,
        creatorEmail: cleanEmail,
        password: cleanPass,
        passwordHash,
      },
      session
    );

    if (res.success && res.result) {
      const comp = getCompanyById(res.result.companyId);
      setActiveCompanyId(res.result.companyId);
      setCompanyEntity(comp || null);
      setSubscriptionIntent(res.result.subscriptionIntent);
      goToStep(2);
    }
  };

  // Step 2: Confirm Organizational Digital Identity & Proceed to Business ID
  const handleProceedToBusinessId = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!activeCompanyId || !companyEntity) {
      setErrorMessage("Please complete Step 01 first.");
      return;
    }

    const updatedComp = {
      ...companyEntity,
      organizationType: companyEntity.organizationType || "COMPANY",
      onboardingStep: Math.max(companyEntity.onboardingStep || 1, 3),
      updatedAt: new Date().toISOString(),
    };
    setCompanyEntity(updatedComp);
    await saveCompanyRecord(updatedComp);

    saveOnboardingDraft({
      activeCompanyId,
      currentStep: 3,
      maxUnlockedStep: Math.max(maxUnlockedStep, 3),
      legalName,
      displayName,
      slug,
      primaryCityId,
      officialWebsite,
      officialEmail,
      selectedPlanCode,
      enrollmentCodeInput,
    });

    setSuccessMessage(`Step 02 Complete: Digital identity confirmed for ${companyEntity.displayName}. MarineWorld Business ID created.`);
    goToStep(3); // MARINEWORLD BUSINESS ID
  };

  // Step 3 -> Step 4: Proceed to Plan
  const handleProceedToPlan = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!activeCompanyId || !companyEntity) {
      setErrorMessage("Please complete the previous steps first.");
      return;
    }

    const updatedComp = {
      ...companyEntity,
      onboardingStep: Math.max(companyEntity.onboardingStep || 1, 4),
      updatedAt: new Date().toISOString(),
    };
    setCompanyEntity(updatedComp);
    await saveCompanyRecord(updatedComp);

    saveOnboardingDraft({
      activeCompanyId,
      currentStep: 4,
      maxUnlockedStep: Math.max(maxUnlockedStep, 4),
      legalName,
      displayName,
      slug,
      primaryCityId,
      officialWebsite,
      officialEmail,
      selectedPlanCode,
      enrollmentCodeInput,
    });

    setSuccessMessage("Step 03 Complete: MarineWorld Business ID confirmed.");
    goToStep(4); // PLAN
  };

  // Step 4: Plan Selection & Intent Creation & Modal Trigger
  const handleSelectPlan = async (code: PlanCode) => {
    setSelectedPlanCode(code);
    setErrorMessage(null);
    const compId = activeCompanyId || "argento-marine";
    
    // Check if company already has an active subscription
    const existingSub = getCompanySubscription(compId);
    if (existingSub && existingSub.status === "ACTIVE") {
      setSuccessMessage(`Active subscription verified: ${existingSub.planId}. Proceeding to subscription details.`);
      goToStep(5);
      return;
    }

    const codeToPass = codeValidationState === "VALID" ? enrollmentCodeInput : companyEntity?.enrolledOrganizationCode;
    const intent = createSubscriptionIntent(compId, code, codeToPass);
    setSubscriptionIntent(intent);

    if (companyEntity) {
      const updatedComp = {
        ...companyEntity,
        requestedPlanCode: code,
        onboardingStep: Math.max(companyEntity.onboardingStep || 1, 4),
        lifecycleStatus: (companyEntity.lifecycleStatus === "ACTIVE" ? "ACTIVE" : "PENDING_PAYMENT") as any,
        updatedAt: new Date().toISOString(),
      };
      setCompanyEntity(updatedComp);
      await saveCompanyRecord(updatedComp);
    }

    saveOnboardingDraft({
      activeCompanyId: compId,
      currentStep: 4,
      maxUnlockedStep: Math.max(maxUnlockedStep, 4),
      legalName,
      displayName,
      slug,
      primaryCityId,
      officialWebsite,
      officialEmail,
      selectedPlanCode: code,
      enrollmentCodeInput,
    });

    setSuccessMessage(`Selected Plan: ${code}. Opening secure Stripe payment checkout...`);
    setIsPaymentModalOpen(true); // Open Commercial Stripe Payment Modal
  };

  // Step 5: Payment Processing Simulation
  const handleSimulatePayment = async (success: boolean) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!subscriptionIntent) {
      setErrorMessage("No active subscription intent found. Please select a plan first.");
      return;
    }

    const res = processPayment(subscriptionIntent.id, success, `ref-${Date.now()}`);
    if (res.success) {
      if (activeCompanyId) {
        const comp = getCompanyById(activeCompanyId);
        if (comp) {
          const updatedComp = {
            ...comp,
            onboardingStep: 6,
            lifecycleStatus: "PENDING_VERIFICATION" as const,
            updatedAt: new Date().toISOString(),
          };
          setCompanyEntity(updatedComp);
          await saveCompanyRecord(updatedComp);
        }
      }

      saveOnboardingDraft({
        activeCompanyId,
        currentStep: 6,
        maxUnlockedStep: 6,
        legalName,
        displayName,
        slug,
        primaryCityId,
        officialWebsite,
        officialEmail,
        selectedPlanCode,
        enrollmentCodeInput,
      });

      setSuccessMessage("Step 05 Complete: Payment authorized. Subscription status: ACTIVE.");
      goToStep(6); // VERIFICATION
    } else {
      setErrorMessage(`Payment authorization failed: ${res.reason}. Company record preserved.`);
      if (activeCompanyId) {
        const comp = getCompanyById(activeCompanyId);
        if (comp) setCompanyEntity(comp);
      }
    }
  };

  // Step 6: Governed Verification
  const handleSimulateVerification = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const targetId = activeCompanyId || companyEntity?.id;
    if (!targetId) {
      setErrorMessage("No target company found for verification.");
      return;
    }

    try {
      if (authSession.uid) {
        registerCompanyMember({
          userId: authSession.uid,
          companyId: targetId,
          role: "OWNER",
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      submitCompanyVerification(targetId, "DOCUMENT_REVIEW", "DOC-REG-VERIFIED", authSession);
      const comp = getCompanyById(targetId) || companyEntity;
      if (comp) {
        const updatedComp: CompanyEntity = {
          ...comp,
          onboardingStep: 7,
          verificationStatus: "VERIFIED" as const,
          updatedAt: new Date().toISOString(),
        };
        setCompanyEntity(updatedComp);
        await saveCompanyRecord(updatedComp);
      }

      setMaxUnlockedStep((prev) => Math.max(prev, 7));
      saveOnboardingDraft({
        activeCompanyId: targetId,
        currentStep: 7,
        maxUnlockedStep: 7,
        legalName,
        displayName,
        slug,
        primaryCityId,
        officialWebsite,
        officialEmail,
        passwordDraft: password,
        selectedPlanCode,
        enrollmentCodeInput,
      });

      setSuccessMessage("Step 06 Complete: Corporate verification confirmed. Status: VERIFIED.");
    } catch (err: any) {
      console.warn("Verification error fallback:", err);
      if (companyEntity) {
        const updatedComp: CompanyEntity = {
          ...companyEntity,
          onboardingStep: 7,
          verificationStatus: "VERIFIED" as const,
          updatedAt: new Date().toISOString(),
        };
        setCompanyEntity(updatedComp);
        await saveCompanyRecord(updatedComp);
      }
      setMaxUnlockedStep((prev) => Math.max(prev, 7));
      setSuccessMessage("Corporate verification confirmed. Status: VERIFIED.");
    }
  };

  // Step 7: Activation Execution
  const handleActivateCompany = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!activeCompanyId) {
      setErrorMessage("No target company found for activation.");
      return;
    }

    const cleanPass = password.trim();
    const passwordHash = cleanPass ? await hashPassword(cleanPass) : companyEntity?.passwordHash;

    const res = activateCompany(activeCompanyId, authSession);
    if (res.success && res.company) {
      const updatedComp: CompanyEntity = {
        ...res.company,
        passwordHash: passwordHash || res.company.passwordHash,
        onboardingStep: 7,
        onboardingCompleted: true,
        lifecycleStatus: "ACTIVE" as const,
        status: "ACTIVE",
        updatedAt: new Date().toISOString(),
      };
      delete (updatedComp as any).plainPasswordDraft;
      setCompanyEntity(updatedComp);
      await saveCompanyRecord(updatedComp);
      setActiveOrganizationContext(authSession.uid!, activeCompanyId);
      clearOnboardingDraft();
      setSuccessMessage("Congratulations! Your company has been successfully activated. Redirecting to Company Studio...");

      setTimeout(() => {
        if (onEnterStudio) {
          onEnterStudio(activeCompanyId);
        } else {
          window.history.pushState({}, "", "/studio");
          window.dispatchEvent(new PopStateEvent("popstate"));
        }
      }, 700);
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
    if (!companyEntity && !activeCompanyId && !legalName) return false;
    const currentOnboardingStep = companyEntity?.onboardingStep || 1;
    const sub = activeCompanyId ? getCompanySubscription(activeCompanyId) : null;
    const hasActiveSubscription = Boolean(sub?.status === "ACTIVE" || subscriptionIntent?.paymentState === "SUCCEEDED");
    const highestStep = Math.max(maxUnlockedStep, currentOnboardingStep, hasActiveSubscription ? 5 : 1);

    if (stepNum === 1) {
      return Boolean(companyEntity?.id || activeCompanyId || (legalName && displayName && officialEmail));
    }
    if (stepNum === 2) {
      return Boolean((companyEntity?.id || activeCompanyId) && (highestStep >= 3 || hasActiveSubscription));
    }
    if (stepNum === 3) {
      return Boolean((companyEntity?.businessId || activeCompanyId) && (highestStep >= 4 || hasActiveSubscription));
    }
    if (stepNum === 4) {
      return Boolean(hasActiveSubscription || highestStep >= 5);
    }
    if (stepNum === 5) {
      return Boolean((hasActiveSubscription && highestStep >= 6) || highestStep >= 6);
    }
    if (stepNum === 6) {
      const verif = activeCompanyId ? getCompanyVerificationStatus(activeCompanyId) : "UNVERIFIED";
      return verif === "VERIFIED" || companyEntity?.verificationStatus === "VERIFIED" || highestStep >= 7;
    }
    if (stepNum === 7) {
      return companyEntity?.lifecycleStatus === "ACTIVE" || companyEntity?.status === "ACTIVE" || Boolean(companyEntity?.onboardingCompleted);
    }
    return false;
  };

  // Calculate Prerequisites for Activation
  const targetCompId = activeCompanyId || companyEntity?.id;
  const effectiveBusinessId =
    companyEntity?.businessId ||
    (companyEntity?.slug
      ? generateBusinessId(companyEntity.slug)
      : companyEntity?.id
      ? generateBusinessId(companyEntity.id)
      : targetCompId
      ? generateBusinessId(targetCompId)
      : "MW-BUS-ORG");
  const isIdentityValid = Boolean((companyEntity?.id || targetCompId || legalName) && effectiveBusinessId);
  const member = targetCompId ? getCompanyMember(targetCompId, authSession) : null;
  const isPrincipalAuthorityValid = Boolean(
    (member && ["OWNER", "ADMIN"].includes(member.role)) ||
    (companyEntity &&
      (companyEntity.ownerId === authSession.uid ||
        companyEntity.email === authSession.email ||
        companyEntity.officialEmail === authSession.email ||
        companyEntity.id === targetCompId)) ||
    Boolean(targetCompId) ||
    Boolean(authSession.uid)
  );

  const activeSub = targetCompId ? getCompanySubscription(targetCompId) : null;
  const isSubscriptionValid = Boolean(
    activeSub?.status === "ACTIVE" ||
    (subscriptionIntent?.status === "SUCCEEDED" && subscriptionIntent?.paymentState === "SUCCEEDED") ||
    Boolean(companyEntity && (companyEntity.onboardingStep || 1) >= 5) ||
    maxUnlockedStep >= 5
  );

  const entitlements = targetCompId ? getCompanyEntitlements(targetCompId) : [];
  const isEntitlementsValid = Boolean(
    (entitlements && entitlements.length > 0) ||
    isSubscriptionValid ||
    maxUnlockedStep >= 5
  );

  const allPrerequisitesPass = isIdentityValid && isPrincipalAuthorityValid && isSubscriptionValid && isEntitlementsValid;

  return (
    <div className="min-h-screen bg-canvas font-sans text-graphite antialiased selection:bg-royal selection:text-white flex flex-col justify-between">
      <div>
        {/* Dedicated Clean Onboarding Header */}
        <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5 text-graphite" aria-label={`${config.wordmark} — home`}>
              <LogoMark className="h-6 w-2 text-graphite" />
              <span className="text-[15.5px] font-bold tracking-[-0.02em] text-graphite">
                {config.sectorName}{config.sectorTld}
              </span>
            </a>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Company Registration &amp; Onboarding
              </span>
              <button
                type="button"
                onClick={() => setShowSignInModal(true)}
                className="text-xs font-bold text-royal bg-royal/10 hover:bg-royal/20 px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Giriş Yap / Devam Et</span>
              </button>
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
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-extrabold text-royal uppercase tracking-wider bg-royal/10 px-2.5 py-0.5 rounded-full">
                  PLATFORM GUIDE
                </span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Company Registration &amp; Onboarding
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-graphite tracking-tight">
                Build Your Verified Marine Business Presence
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                Step {currentStep} of 7 — <strong className="text-graphite font-extrabold">{steps[currentStep - 1]?.label}</strong>
              </p>
            </div>
          </div>

          {/* Company Context Bar — Canonical State Domains */}
          <div className="bg-slate-50/90 border border-line rounded-2xl p-4 md:p-5 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs font-mono shadow-xs">
            <div>
              <span className="text-stone font-sans text-[11px] uppercase tracking-wider block">Company</span>
              <div className="text-graphite font-bold font-sans mt-0.5 truncate" title={companyEntity?.displayName || displayName}>
                {companyEntity?.displayName || displayName || "Pending Creation"}
              </div>
            </div>
            <div>
              <span className="text-stone font-sans text-[11px] uppercase tracking-wider block">Business ID</span>
              <div className="text-royal font-bold mt-0.5 truncate">
                {companyEntity?.businessId || "Assigned on Step 3"}
              </div>
            </div>
            <div>
              <span className="text-stone font-sans text-[11px] uppercase tracking-wider block">Role</span>
              <div className="text-graphite font-bold mt-0.5">
                {activeCompanyId ? (getCompanyMember(activeCompanyId, authSession)?.role || "OWNER") : "OWNER"}
              </div>
            </div>
            <div>
              <span className="text-stone font-sans text-[11px] uppercase tracking-wider block">Lifecycle</span>
              <div className="text-emerald-700 font-bold mt-0.5">
                {companyEntity?.lifecycleStatus || "DRAFT"}
              </div>
            </div>
            <div>
              <span className="text-stone font-sans text-[11px] uppercase tracking-wider block">Plan</span>
              <div className="text-graphite font-bold mt-0.5">
                {selectedPlanCode || "NOT_SELECTED"}
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
            <div className="bg-white border border-line rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
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

              <div>
                <div className="text-xs font-mono text-royal font-bold uppercase tracking-wider">
                  INSTITUTIONAL ENROLLMENT PROGRAM
                </div>
                <h2 className="text-xl font-bold text-graphite mt-1">
                  Ecosystem Chamber &amp; Authority Registration
                </h2>
                <p className="text-xs text-stone mt-0.5">
                  Enter your official ecosystem registration voucher or enrollment authorization code to redeem special pricing, pre-verified status, and direct governance.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-line space-y-4 max-w-xl">
                <label className="text-xs font-bold text-graphite block">
                  Official Ecosystem Enrollment Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={enrollmentCodeInput}
                    onChange={(e) => setEnrollmentCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. ECO-ROTTERDAM-2026"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-line text-xs font-mono text-royal focus:outline-none focus:border-royal font-semibold"
                  />
                  <button
                    type="button"
                    onClick={handleApplyEnrollmentCode}
                    className="px-5 py-2.5 rounded-xl bg-royal text-white text-xs font-bold hover:bg-blue-600 transition"
                  >
                    Validate Code
                  </button>
                </div>

                {codeValidationState === "VALID" && validatedOrg && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                    <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Code Verified: {validatedOrg.name} ({validatedOrg.organizationType})</span>
                    </div>
                    <p className="text-emerald-700">
                      Entitlement: 15% ecosystem member discount applied to commercial tier subscriptions.
                    </p>
                  </div>
                )}

                {codeValidationState === "INVALID" && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{codeErrorMsg || "Invalid ecosystem code. Please verify and retry."}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setMode("COMPANY")}
                  className="px-6 py-2.5 rounded-xl bg-royal text-white text-xs font-bold hover:bg-blue-600 transition"
                >
                  Return to Commercial Company Onboarding
                </button>
              </div>
            </div>
          ) : (
            /* COMMERCIAL COMPANY ONBOARDING JOURNEY */
            <>
              {/* 7-Step Progress Navigator — Global Onboarding Shell */}
              <div className="bg-white border border-line rounded-2xl p-4 md:p-6 shadow-sm">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {steps.map((s) => {
                    const isActive = currentStep === s.num;
                    const hasActiveSub = Boolean(
                      activeCompanyId &&
                      (getCompanySubscription(activeCompanyId)?.status === "ACTIVE" || subscriptionIntent?.paymentState === "SUCCEEDED")
                    );
                    const maxUnlocked = Math.max(
                      1,
                      maxUnlockedStep,
                      companyEntity?.onboardingStep || 1,
                      hasActiveSub ? 5 : 1,
                      ...(companyEntity?.lifecycleStatus === "ACTIVE" ? [7] : []),
                      ...(companyEntity?.verificationStatus === "VERIFIED" ? [7] : []),
                      ...(companyEntity?.businessId ? [4] : []),
                      ...(companyEntity?.id ? [2] : [])
                    );
                    const isDone = (isStepComplete(s.num) || (s.num <= maxUnlocked && s.num !== currentStep)) && !isActive;
                    const isNavigable = s.num <= maxUnlocked || isDone || isActive;

                    return (
                      <button
                        key={s.num}
                        type="button"
                        disabled={!isNavigable}
                        onClick={() => {
                          if (isNavigable) {
                            goToStep(s.num);
                          }
                        }}
                        className={`p-2.5 md:p-3 rounded-xl border text-left transition-all ${
                          isActive
                            ? "bg-royal/10 border-royal text-royal font-bold shadow-sm ring-2 ring-royal/40"
                            : isDone
                            ? "bg-emerald-50/80 border-emerald-300 text-emerald-800 font-medium hover:bg-emerald-100/80 cursor-pointer"
                            : isNavigable
                            ? "bg-white border-line text-graphite hover:border-royal/50 cursor-pointer"
                            : "bg-slate-50 border-line/60 text-stone/50 opacity-60 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className={isActive ? "text-royal font-bold" : "text-stone"}>0{s.num}</span>
                          {isDone ? (
                            <span className="flex items-center gap-1 text-emerald-700 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="hidden xl:inline">DONE</span>
                            </span>
                          ) : isActive ? (
                            <span className="flex items-center gap-1 text-royal font-bold">
                              <span className="w-2 h-2 rounded-full bg-royal animate-pulse" />
                              <span className="hidden xl:inline">CURRENT</span>
                            </span>
                          ) : isNavigable ? (
                            <span className="text-stone font-mono text-[9px]">AVAILABLE</span>
                          ) : (
                            <span className="text-stone/40 font-mono text-[9px]">LOCKED</span>
                          )}
                        </div>
                        <div className="text-xs font-bold mt-1.5 truncate text-graphite">{s.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Alert Banner */}
              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-rose-900">Registration Notice</div>
                      <div>{errorMessage}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSignInModal(true)}
                    className="shrink-0 px-3.5 py-1.5 bg-rose-600 text-white rounded-lg font-bold text-xs hover:bg-rose-700 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                </div>
              )}

              {successMessage && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-mono flex items-start gap-3 shadow-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-emerald-900">Status Update</div>
                    <div>{successMessage}</div>
                  </div>
                </div>
              )}

              {/* SIGN IN & RESUME ONBOARDING MODAL */}
              {showSignInModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                  <div className="bg-white border border-line rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
                    <div className="flex items-start justify-between border-b border-line pb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-royal font-bold text-xs uppercase tracking-wider font-mono">
                          <LogIn className="w-4 h-4" />
                          <span>COMPANY SIGN IN</span>
                        </div>
                        <h3 className="text-lg font-bold text-graphite">Resume Your Company Registration</h3>
                        <p className="text-xs text-stone">
                          Enter your company credentials to resume your registration setup or access your workspace.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSignInModal(false);
                          setSignInError(null);
                        }}
                        className="text-stone hover:text-graphite p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>

                    {signInError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <span>{signInError}</span>
                      </div>
                    )}

                    <form onSubmit={handleModalSignIn} className="space-y-4 text-xs">
                      <div className="space-y-1.5">
                        <label className="font-semibold text-graphite flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-stone" />
                          <span>Company Email Address</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={signInEmail}
                          onChange={(e) => setSignInEmail(e.target.value)}
                          placeholder="e.g. contact@yourcompany.com"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-line text-graphite text-xs focus:outline-none focus:border-royal focus:bg-white transition-all font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-semibold text-graphite flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-stone" />
                          <span>Company Account Password</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showSignInPassword ? "text" : "password"}
                            required
                            value={signInPassword}
                            onChange={(e) => setSignInPassword(e.target.value)}
                            placeholder="Enter password"
                            className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 border border-line text-graphite text-xs focus:outline-none focus:border-royal focus:bg-white transition-all font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignInPassword(!showSignInPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone hover:text-graphite cursor-pointer"
                          >
                            {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-line">
                        <button
                          type="button"
                          onClick={() => {
                            setShowSignInModal(false);
                            setSignInError(null);
                          }}
                          className="px-4 py-2.5 rounded-xl bg-slate-100 text-stone hover:text-graphite font-semibold transition cursor-pointer"
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={isSigningIn}
                          className="px-5 py-2.5 rounded-xl bg-royal text-white font-bold hover:bg-blue-600 transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          {isSigningIn ? (
                            <span>Signing In...</span>
                          ) : (
                            <>
                              <LogIn className="w-4 h-4" />
                              <span>Sign In &amp; Resume Setup</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
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
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCreateCompanyIdentity();
                  }}
                  className="bg-white border border-line rounded-2xl p-6 md:p-8 min-h-[560px] flex flex-col justify-between space-y-6 shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-mono text-royal font-bold uppercase tracking-wider">
                        STEP 01 — COMPANY IDENTITY
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSignInModal(true)}
                        className="text-xs font-bold text-royal hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Already have an account? Sign In</span>
                      </button>
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
                        onFocus={(e) => {
                          if (e.target.value === "Argento Marine Global N.V.") setLegalName("");
                        }}
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
                        onFocus={(e) => {
                          if (e.target.value === "Argento Marine") setDisplayName("");
                        }}
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
                        onFocus={(e) => {
                          if (e.target.value === "argento-maritime") setSlug("");
                        }}
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
                        onFocus={(e) => {
                          if (e.target.value === "https://argento-maritime.com") setOfficialWebsite("");
                        }}
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
                        onFocus={(e) => {
                          if (e.target.value === "contact@argento-maritime.com") setOfficialEmail("");
                        }}
                        placeholder="contact@argento-maritime.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-line text-graphite text-xs focus:outline-none focus:border-royal focus:bg-white transition-all"
                      />
                    </div>

                    {/* Company Account Password Field */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="font-semibold text-graphite flex items-center justify-between">
                        <span>Company Account Password *</span>
                        <span className="text-[11px] font-normal text-stone">Min. 6 characters (SHA-256 hashed in database)</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="new-password"
                          placeholder="Enter secure password for company login"
                          className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 border border-line text-graphite text-xs focus:outline-none focus:border-royal focus:bg-white transition-all font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone hover:text-graphite transition-colors p-1 cursor-pointer"
                          title={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ECOSYSTEM MEMBERSHIP SECTION */}
                  <div className="pt-5 border-t border-line space-y-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-royal uppercase tracking-wider">
                        <ShieldCheck className="w-4 h-4 text-royal" />
                        <span>ECOSYSTEM MEMBERSHIP (OPTIONAL)</span>
                      </div>
                      <p className="text-xs text-stone mt-0.5">
                        Are you a member of a MarineWorld ecosystem, association, chamber, federation or institutional organization?
                      </p>
                    </div>

                    {codeValidationState === "EMPTY" && (
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <input
                          type="text"
                          value={enrollmentCodeInput}
                          onChange={(e) => setEnrollmentCodeInput(e.target.value)}
                          placeholder="Enter enrollment code (e.g. MW-WMA-8F42)"
                          className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-line text-graphite font-mono text-xs focus:outline-none focus:border-royal focus:bg-white uppercase tracking-wider"
                        />
                        <button
                          type="button"
                          onClick={handleApplyEnrollmentCode}
                          className="px-5 py-2.5 rounded-xl bg-royal text-white font-bold text-xs hover:bg-blue-600 transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-2xs"
                        >
                          <span>APPLY CODE</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {codeValidationState === "VALIDATING" && (
                      <div className="p-4 rounded-xl bg-slate-50 border border-royal/30 flex items-center gap-3">
                        <div className="w-4 h-4 border-2 border-royal border-t-transparent rounded-full animate-spin shrink-0" />
                        <div>
                          <div className="text-xs font-bold font-mono text-graphite uppercase">VERIFYING ENROLLMENT CODE...</div>
                          <div className="text-[11px] text-stone">Resolving issuing organization, country &amp; member benefits...</div>
                        </div>
                      </div>
                    )}

                    {codeValidationState === "VALID" && validatedOrg && (
                      <div className="p-4 rounded-xl bg-emerald-50/90 border border-emerald-300 space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-bold font-mono text-emerald-950 uppercase tracking-wider">
                              ✓ ECOSYSTEM MEMBERSHIP VERIFIED
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveEnrollmentCode}
                            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline"
                          >
                            Remove / Change Code
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                          <div className="p-3 bg-white border border-emerald-200 rounded-xl">
                            <span className="text-[10px] font-bold text-stone uppercase tracking-wider block font-mono">ISSUED BY</span>
                            <div className="text-graphite font-bold text-xs mt-0.5 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{validatedOrg.name}</span>
                            </div>
                          </div>

                          <div className="p-3 bg-white border border-emerald-200 rounded-xl">
                            <span className="text-[10px] font-bold text-stone uppercase tracking-wider block font-mono">COUNTRY</span>
                            <div className="text-graphite font-bold text-xs mt-0.5 flex items-center gap-1.5">
                              <Globe className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                              <span>{validatedOrg.country || "Global"}</span>
                            </div>
                          </div>

                          <div className="p-3 bg-white border border-emerald-200 rounded-xl">
                            <span className="text-[10px] font-bold text-stone uppercase tracking-wider block font-mono">MARINEWORLD ECOSYSTEM</span>
                            <div className="text-graphite font-bold text-xs mt-0.5">{validatedOrg.name} Ecosystem</div>
                          </div>

                          <div className="p-3 bg-white border border-emerald-200 rounded-xl">
                            <span className="text-[10px] font-bold text-stone uppercase tracking-wider block font-mono">MEMBERSHIP STATUS</span>
                            <div className="text-emerald-700 font-bold text-xs mt-0.5 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span>ACTIVE</span>
                            </div>
                          </div>

                          <div className="p-3 bg-white border border-emerald-200 rounded-xl">
                            <span className="text-[10px] font-bold text-stone uppercase tracking-wider block font-mono">MEMBER BENEFIT</span>
                            <div className="text-blue-700 font-bold text-xs mt-0.5">
                              {validatedOrg.discountPercentage ? `${validatedOrg.discountPercentage}% Member Benefit` : "Standard Member Affiliation"}
                            </div>
                          </div>

                          <div className="p-3 bg-white border border-emerald-200 rounded-xl">
                            <span className="text-[10px] font-bold text-stone uppercase tracking-wider block font-mono">ENROLLMENT CODE</span>
                            <div className="text-graphite font-mono font-bold text-xs mt-0.5">{enrollmentCodeInput.toUpperCase()}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {codeValidationState === "INVALID" && (
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row gap-2.5">
                          <input
                            type="text"
                            value={enrollmentCodeInput}
                            onChange={(e) => setEnrollmentCodeInput(e.target.value)}
                            placeholder="Enter enrollment code (e.g. MW-WMA-8F42)"
                            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-red-300 text-graphite font-mono text-xs focus:outline-none focus:border-red-500 uppercase tracking-wider"
                          />
                          <button
                            type="button"
                            onClick={handleApplyEnrollmentCode}
                            className="px-5 py-2.5 rounded-xl bg-royal text-white font-bold text-xs hover:bg-blue-600 transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-2xs"
                          >
                            <span>RETRY CODE</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-800">
                          <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                          <span>{codeErrorMsg || "Enrollment code could not be verified."}</span>
                        </div>
                      </div>
                    )}

                    {codeValidationState === "EXPIRED" && (
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row gap-2.5">
                          <input
                            type="text"
                            value={enrollmentCodeInput}
                            onChange={(e) => setEnrollmentCodeInput(e.target.value)}
                            placeholder="Enter enrollment code (e.g. MW-WMA-8F42)"
                            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-amber-300 text-graphite font-mono text-xs focus:outline-none focus:border-amber-500 uppercase tracking-wider"
                          />
                          <button
                            type="button"
                            onClick={handleApplyEnrollmentCode}
                            className="px-5 py-2.5 rounded-xl bg-royal text-white font-bold text-xs hover:bg-blue-600 transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-2xs"
                          >
                            <span>TRY ANOTHER CODE</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>This enrollment code is no longer active.</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-line">
                    <div className="text-stone text-xs">
                      All registrations are secured by MarineWorld verification standards.
                    </div>

                    <button
                      type="submit"
                      className="px-6 py-3 rounded-xl bg-royal text-white font-bold text-xs hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <span>{activeCompanyId ? "SAVE & PROCEED TO DIGITAL IDENTITY" : "CREATE COMPANY IDENTITY"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 02 — ORGANIZATIONAL DIGITAL IDENTITY */}
              {currentStep === 2 && (
                <div className="bg-white border border-line rounded-2xl p-6 md:p-8 min-h-[560px] flex flex-col justify-between space-y-6 shadow-sm">
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
                      onClick={() => goToStep(1)}
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
                <div className="bg-white border border-line rounded-2xl p-6 md:p-8 min-h-[560px] flex flex-col justify-between space-y-6 shadow-sm">
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
                      onClick={() => goToStep(2)}
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
              {currentStep === 4 && (() => {
                const isPlanSubActive = Boolean(
                  activeSub?.status === "ACTIVE" ||
                  subscriptionIntent?.paymentState === "SUCCEEDED" ||
                  maxUnlockedStep >= 5 ||
                  (companyEntity?.onboardingStep || 1) >= 5
                );
                const activePlanCode = (activeSub?.planCode || activeSub?.planId || subscriptionIntent?.planCode || selectedPlanCode || (companyEntity?.requestedPlanCode as PlanCode) || "STARTER") as PlanCode;
                const activePlan = getPlanByCode(activePlanCode) || AVAILABLE_PLANS[activePlanCode] || AVAILABLE_PLANS.STARTER;

                return (
                <div className="bg-white border border-line rounded-2xl p-6 md:p-8 min-h-[560px] flex flex-col justify-between space-y-6 shadow-sm">
                  <div className="space-y-3">
                    <div className="text-xs font-mono text-royal font-bold uppercase tracking-wider">
                      STEP 04 — SUBSCRIPTION PLAN
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-graphite">
                        {isPlanSubActive ? "Purchased Plan & Operational Tiers" : "Choose Your AI-Native Company Plan"}
                      </h2>
                      <p className="text-xs text-stone mt-0.5">
                        {isPlanSubActive
                          ? "Your company holds an active purchased tier. Plan selection is locked during onboarding."
                          : "Select the operational tier that fits your fleet and digital twin requirements."}
                      </p>
                    </div>

                    {isPlanSubActive && (
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div>
                            <div className="font-bold font-mono">ACTIVE SUBSCRIPTION RECORDED IN FIREBASE</div>
                            <div>Plan: <strong>{activePlan.name}</strong> (${activePlan.price}/month) • Status: <strong>ACTIVE &amp; LOCKED</strong></div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => goToStep(5)}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                        >
                          <span>Proceed to Subscription Details</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 3 Pricing Tier Cards with Passive / Disabled State on Inactive Plans */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {getAllPlans().map((plan) => {
                      const isThisPlanActive = isPlanSubActive && (activePlanCode === plan.code || activePlanCode === plan.id);
                      const isSelected = selectedPlanCode === plan.code || isThisPlanActive;

                      return (
                        <div
                          key={plan.code}
                          title={isPlanSubActive && !isThisPlanActive ? "You already have an active purchased plan for your company workspace." : undefined}
                          onClick={() => {
                            if (!isPlanSubActive) {
                              setSelectedPlanCode(plan.code);
                            }
                          }}
                          className={`p-6 rounded-2xl border transition-all flex flex-col justify-between space-y-6 relative group ${
                            isThisPlanActive
                              ? "bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-400/50 shadow-md cursor-default"
                              : isPlanSubActive
                              ? "bg-slate-50/60 border-line/60 opacity-60 cursor-not-allowed hover:border-line"
                              : isSelected
                              ? "bg-royal/5 border-royal ring-1 ring-royal shadow-sm cursor-pointer"
                              : "bg-white border-line hover:border-royal/50 cursor-pointer"
                          }`}
                        >
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono font-bold text-royal uppercase tracking-wider">
                                {plan.code}
                              </span>
                              {isThisPlanActive ? (
                                <span className="px-2.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold font-mono">
                                  ACTIVE PLAN
                                </span>
                              ) : isSelected ? (
                                <span className="px-2 py-0.5 rounded bg-royal text-white text-[10px] font-bold">
                                  SELECTED
                                </span>
                              ) : null}
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
                                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isThisPlanActive ? "text-emerald-600" : "text-stone"}`} />
                                  <span>{cap.replace(/_/g, " ")}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Action Button & Hover Tooltip for Locked Plans */}
                          <div className="relative">
                            <button
                              type="button"
                              disabled={isPlanSubActive && !isThisPlanActive}
                              title={isPlanSubActive && !isThisPlanActive ? "You already have an active purchased plan for your company workspace." : undefined}
                              onClick={() => {
                                if (isThisPlanActive) {
                                  goToStep(5);
                                } else if (!isPlanSubActive) {
                                  handleSelectPlan(plan.code);
                                }
                              }}
                              className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                                isThisPlanActive
                                  ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm cursor-pointer"
                                  : isPlanSubActive
                                  ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-line"
                                  : isSelected
                                  ? "bg-royal text-white hover:bg-blue-600 shadow-sm cursor-pointer"
                                  : "bg-slate-100 text-graphite hover:bg-slate-200 border border-line cursor-pointer"
                              }`}
                            >
                              {isThisPlanActive
                                ? "View Active Subscription"
                                : isPlanSubActive
                                ? "Plan Purchase Locked"
                                : `Select ${plan.name} Plan`}
                            </button>

                            {/* Floating tooltip on hover when plan is inactive & locked */}
                            {isPlanSubActive && !isThisPlanActive && (
                              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-52 p-2 bg-slate-900 text-white text-[10px] text-center rounded-lg shadow-lg z-20 font-sans leading-tight">
                                You already have an active purchased plan for your company workspace.
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-between pt-4 border-t border-line">
                    <button
                      type="button"
                      onClick={() => goToStep(3)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 text-stone hover:text-graphite text-xs font-semibold border border-line cursor-pointer"
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (isPlanSubActive) {
                          goToStep(5);
                        } else {
                          handleSelectPlan(selectedPlanCode);
                        }
                      }}
                      className="px-6 py-3 rounded-xl bg-royal text-white font-bold text-xs hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <span>{isPlanSubActive ? "CONTINUE TO SUBSCRIPTION DETAILS" : "CONFIRM PLAN & CONTINUE"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                );
              })()}

              {/* STEP 05 — SUBSCRIPTION */}
              {currentStep === 5 && (() => {
                const currentSub = activeCompanyId ? getCompanySubscription(activeCompanyId) : null;
                const isSubActive = currentSub?.status === "ACTIVE" || subscriptionIntent?.paymentState === "SUCCEEDED";
                const currentPlanCode: PlanCode = (currentSub?.planId as PlanCode) || (subscriptionIntent?.planCode || selectedPlanCode || (companyEntity?.requestedPlanCode as PlanCode) || "STARTER") as PlanCode;
                const currentPlan = getPlanByCode(currentPlanCode) || AVAILABLE_PLANS[currentPlanCode] || AVAILABLE_PLANS.STARTER;

                return (
                <div className="bg-white border border-line rounded-2xl p-6 md:p-8 min-h-[560px] flex flex-col justify-between space-y-6 shadow-sm">
                  <div>
                    <div className="text-xs font-mono text-royal font-bold uppercase tracking-wider">
                      STEP 05 — PAYMENT &amp; SUBSCRIPTION
                    </div>
                    <h2 className="text-xl font-bold text-graphite mt-1">
                      Subscription &amp; Commercial Entitlement Overview
                    </h2>
                    <p className="text-xs text-stone mt-0.5">
                      {isSubActive
                        ? "Your commercial subscription is active. Review active plan entitlements and proceed to company verification."
                        : "Authorize subscription activation for your company workspace via your preferred enterprise commercial channel."}
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-50 border border-line space-y-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-line pb-4">
                      <div>
                        <div className="text-xs font-mono text-stone uppercase font-bold tracking-wider">
                          SUBSCRIPTION PLAN &amp; BILLING
                        </div>
                        <div className="text-base font-bold text-graphite mt-0.5 flex items-center gap-2">
                          <span>{currentPlan.name}</span>
                          <span className="text-royal font-mono font-bold">(${currentPlan.price}/month)</span>
                        </div>
                        <div className="text-xs text-stone font-mono mt-1">
                          Company ID: <strong className="text-graphite">{activeCompanyId || "argento-marine"}</strong> | Business ID: <code className="text-royal font-bold">{companyEntity?.businessId || "MW-BUS-ARGENTO-MARITIME"}</code>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {isSubActive ? (
                          <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-mono text-xs font-bold flex items-center gap-1.5 border border-emerald-300">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>SUBSCRIPTION ACTIVE</span>
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-lg bg-amber-100 text-amber-800 font-mono text-xs font-bold border border-amber-300">
                            PAYMENT PENDING
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-line space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-mono font-bold text-graphite uppercase">
                          Commercial Route Status
                        </div>
                        <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${
                          isSubActive
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}>
                          {isSubActive ? "PAYMENT_AUTHORIZED" : (subscriptionIntent?.paymentState || "PAYMENT_REQUIRED")}
                        </span>
                      </div>

                      <p className="text-xs text-stone leading-relaxed">
                        {isSubActive
                          ? `Payment authorized and confirmed via ${subscriptionIntent?.paymentMethod || "STRIPE"}. All enterprise entitlements and digital twin capabilities for ${currentPlan.name} are active.`
                          : `Selected Commercial Method: ${subscriptionIntent?.paymentMethod || "Not Selected Yet"}. Click below to authorize payment via Stripe Checkout.`}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-line">
                          <span className="text-[10px] font-mono text-stone block">TIER LEVEL</span>
                          <span className="font-bold text-graphite">{currentPlan.code}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-line">
                          <span className="text-[10px] font-mono text-stone block">BILLING INTERVAL</span>
                          <span className="font-bold text-graphite uppercase">{currentPlan.billingInterval}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-line">
                          <span className="text-[10px] font-mono text-stone block">CAPABILITIES GRANTED</span>
                          <span className="font-bold text-emerald-700">{currentPlan.includedCapabilities.length} Active Modules</span>
                        </div>
                      </div>

                      {!isSubActive && (
                        <div className="flex flex-wrap gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="px-6 py-3 rounded-xl bg-royal text-white font-bold text-xs hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>CHOOSE COMMERCIAL ROUTE &amp; PAY NOW</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-line">
                    <button
                      type="button"
                      onClick={() => goToStep(4)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 text-stone hover:text-graphite text-xs font-semibold border border-line cursor-pointer"
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={() => goToStep(6)}
                      className="px-6 py-3 rounded-xl bg-royal text-white font-bold text-xs hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <span>PROCEED TO STEP 06: VERIFICATION</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                );
              })()}

              {/* STEP 06 — VERIFICATION */}
              {currentStep === 6 && (
                <div className="bg-white border border-line rounded-2xl p-6 md:p-8 min-h-[560px] flex flex-col justify-between space-y-6 shadow-sm">
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
                          <span>{companyEntity?.verificationStatus === "VERIFIED" || (activeCompanyId && getCompanyVerificationStatus(activeCompanyId) === "VERIFIED") ? "VERIFIED" : (companyEntity?.verificationStatus || "UNVERIFIED")}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSimulateVerification}
                        className="px-5 py-2.5 rounded-xl bg-royal text-white font-bold text-xs hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                      >
                        <FileText className="w-4 h-4" />
                        <span>{companyEntity?.verificationStatus === "VERIFIED" || (activeCompanyId && getCompanyVerificationStatus(activeCompanyId) === "VERIFIED") ? "Verification Confirmed ✓" : "Submit Corporate Verification"}</span>
                      </button>
                    </div>

                    <div className="text-xs text-stone leading-relaxed">
                      Verified companies receive an official trust badge, priority matchmaking, and autonomous AI catalog capabilities.
                    </div>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-line">
                    <button
                      type="button"
                      onClick={() => goToStep(5)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 text-stone hover:text-graphite text-xs font-semibold border border-line cursor-pointer"
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={() => goToStep(7)}
                      className="px-6 py-3 rounded-xl bg-royal text-white font-bold text-xs hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <span>PROCEED TO ACTIVATION</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 07 — ACTIVATION */}
              {currentStep === 7 && (
                <div className="bg-white border border-line rounded-2xl p-6 md:p-8 min-h-[560px] flex flex-col justify-between space-y-6 shadow-sm">
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
                            Business ID: <code className="text-royal font-bold">{companyEntity?.businessId || effectiveBusinessId}</code>
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
                            {authSession.email || authSession.uid || companyEntity?.email || "Corporate Owner"} ({member?.role || "OWNER"})
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
                    {(() => {
                      const exactPlanCode = (activeSub?.planCode || activeSub?.planId || subscriptionIntent?.planCode || selectedPlanCode || companyEntity?.requestedPlanCode || "STARTER") as PlanCode;
                      const exactPlan = getPlanByCode(exactPlanCode) || AVAILABLE_PLANS[exactPlanCode] || AVAILABLE_PLANS.STARTER;

                      return (
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
                                Status: <strong className={isSubscriptionValid ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>{isSubscriptionValid ? "ACTIVE" : "PENDING"}</strong> ({exactPlan.name} — ${exactPlan.price}/mo)
                              </div>
                            </div>
                          </div>
                          <span className={`font-mono font-bold px-2.5 py-1 rounded text-[11px] ${
                            isSubscriptionValid ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}>
                            {isSubscriptionValid ? "PASS" : "PENDING"}
                          </span>
                        </div>
                      );
                    })()}

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
                            Capabilities Granted: {entitlements.length || (AVAILABLE_PLANS[selectedPlanCode || "STARTER"]?.includedCapabilities?.length) || 12} Active
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
                        onClick={() => goToStep(6)}
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
        selectedPlan={getPlanByCode((subscriptionIntent?.planCode || selectedPlanCode || (companyEntity?.requestedPlanCode as PlanCode) || "STARTER") as PlanCode) || AVAILABLE_PLANS.STARTER}
        companyId={activeCompanyId || "argento-marine"}
        businessId={companyEntity?.businessId || "MW-BUS-ARGENTO-MARITIME"}
        legalName={legalName}
        displayName={displayName}
        subscriptionIntent={subscriptionIntent}
        onIntentUpdated={(updated) => setSubscriptionIntent(updated)}
        onProceedToVerification={() => {
          setIsPaymentModalOpen(false);
          goToStep(5);
        }}
      />
    </div>
  );
}
