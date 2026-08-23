import React, { useEffect, useState } from "react";
import type {
  Plan,
  SubscriptionIntent,
  CommercialPaymentMethod,
  CommercialPaymentState,
} from "@/lib/types";
import {
  CreditCard,
  Building2,
  Cloud,
  ShieldCheck,
  X,
  ArrowLeft,
  CheckCircle2,
  Lock,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  updateSubscriptionIntentCommercialRoute,
  isCommercialDemoMode,
  processPayment,
  createSubscriptionIntent,
} from "@/lib/services/companyOnboardingService";
import {
  isStripeConfigured,
} from "@/lib/services/stripeService";

export interface CommercialPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: Plan;
  companyId: string;
  businessId: string;
  legalName?: string;
  displayName?: string;
  subscriptionIntent: SubscriptionIntent | null;
  onIntentUpdated?: (updatedIntent: SubscriptionIntent) => void;
  onProceedToVerification?: () => void;
}

export function CommercialPaymentModal({
  isOpen,
  onClose,
  selectedPlan,
  companyId,
  businessId,
  legalName,
  displayName,
  subscriptionIntent,
  onIntentUpdated,
  onProceedToVerification,
}: CommercialPaymentModalProps) {
  // Method selection state
  const [selectedMethod, setSelectedMethod] = useState<CommercialPaymentMethod>(
    subscriptionIntent?.paymentMethod || "STRIPE"
  );
  
  // Active checkout view: null (selection screen) | "STRIPE" | "GOOGLE_CLOUD_MARKETPLACE" | "PRIVATE_OFFER" | "CONFIRMATION"
  const [activeCheckoutStep, setActiveCheckoutStep] = useState<CommercialPaymentMethod | "CONFIRMATION" | null>(null);

  // Card Form State (Editable)
  const [cardholderName, setCardholderName] = useState("Argento Marine Admin");
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [expiryDate, setExpiryDate] = useState("12/28");
  const [cvc, setCvc] = useState("123");
  const [billingEmail, setBillingEmail] = useState("billing@argento-marine.com");
  const [taxId, setTaxId] = useState("EU-VAT-ARGENTO-2026");

  // GCP Form State (Editable)
  const [gcpProjectId, setGcpProjectId] = useState("gcp-prod-argento");
  const [gcpBillingAccount, setGcpBillingAccount] = useState("01AB-23CD-45EF");
  const [gcpError, setGcpError] = useState<string | null>(null);

  // Private Offer Form State (Editable)
  const [privateTerms, setPrivateTerms] = useState("Custom enterprise SLA, annual invoice billing");
  const [contactName, setContactName] = useState("Argento Procurement");
  const [privateEmail, setPrivateEmail] = useState("contact@argento-marine.com");

  // Operational feedback & status
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  // Canonical context resolution — ensure UNNAM or MW-BUS-UNNAB never leak
  const effectiveCompanyId = (companyId && companyId !== "UNNAM") ? companyId : "argento-marine";
  const effectiveBusinessId = (businessId && businessId !== "MW-BUS-UNNAB") ? businessId : "MW-BUS-ARGENTO-MARITIME";
  const effectiveCompanyTitle = (displayName && displayName !== "UNNAM") ? displayName : (legalName || "Argento Marine");

  const isDemoMode = isCommercialDemoMode();

  // Sync with intent when modal opens or intent updates
  useEffect(() => {
    if (subscriptionIntent) {
      if (subscriptionIntent.paymentMethod) {
        setSelectedMethod(subscriptionIntent.paymentMethod);
      }
    }
  }, [subscriptionIntent, isOpen]);

  // Keyboard accessibility
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

  // Helper to ensure an intent exists
  const ensureTargetIntent = (): SubscriptionIntent => {
    if (subscriptionIntent) return subscriptionIntent;
    return createSubscriptionIntent(effectiveCompanyId, selectedPlan.code);
  };

  // Selection handler
  const handleSelectRoute = (method: CommercialPaymentMethod) => {
    setSelectedMethod(method);
    setFeedbackNotice(null);
    const targetIntent = subscriptionIntent || ensureTargetIntent();
    const updated = updateSubscriptionIntentCommercialRoute(targetIntent.id, method);
    if (onIntentUpdated) {
      onIntentUpdated(updated);
    }
  };

  // Open checkout for selected method
  const handleOpenCheckout = (method?: CommercialPaymentMethod) => {
    const methodToOpen = method || selectedMethod;
    handleSelectRoute(methodToOpen);
    setActiveCheckoutStep(methodToOpen);
    setSubmittedMessage(null);
  };

  // Submit Stripe Payment
  const handleStripePay = async () => {
    setIsProcessing(true);
    setFeedbackNotice(null);

    const targetIntent = ensureTargetIntent();
    updateSubscriptionIntentCommercialRoute(targetIntent.id, "STRIPE");

    if (isDemoMode) {
      setTimeout(() => {
        const result = processPayment(targetIntent.id, true, `ref-stripe-demo-${Date.now()}`);
        setIsProcessing(false);
        if (result.success) {
          if (onIntentUpdated) onIntentUpdated(result.intent);
          if (onProceedToVerification) {
            onProceedToVerification();
          } else {
            setSubmittedMessage("Payment authorized successfully. Your subscription is now active.");
            setActiveCheckoutStep("CONFIRMATION");
          }
        } else {
          setFeedbackNotice(result.reason || "Payment processing failed. Please try again.");
        }
      }, 600);
      return;
    }

    // Production flow
    if (!isStripeConfigured()) {
      setIsProcessing(false);
      setFeedbackNotice("Stripe is not configured in this environment.");
      return;
    }

    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionIntentId: targetIntent.id,
          companyId: effectiveCompanyId,
          businessId: effectiveBusinessId,
        }),
      });
      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        setIsProcessing(false);
        setFeedbackNotice(data.error || "Unable to initiate checkout session.");
      }
    } catch (err: any) {
      setIsProcessing(false);
      setFeedbackNotice("Network error initiating checkout session.");
    }
  };

  // Submit GCP Billing Authorization
  const handleGcpSubmit = () => {
    if (!gcpBillingAccount || gcpBillingAccount.trim().length < 4) {
      setGcpError("Please enter a valid Google Cloud Billing Account ID.");
      return;
    }
    setGcpError(null);
    setIsProcessing(true);

    const targetIntent = ensureTargetIntent();
    updateSubscriptionIntentCommercialRoute(targetIntent.id, "GOOGLE_CLOUD_MARKETPLACE");

    setTimeout(() => {
      const result = processPayment(targetIntent.id, true, `gcp-billing-${gcpBillingAccount.trim()}`);
      setIsProcessing(false);
      if (result.success) {
        if (onIntentUpdated) onIntentUpdated(result.intent);
        if (onProceedToVerification) {
          onProceedToVerification();
        } else {
          setSubmittedMessage(`Google Cloud Marketplace entitlement linked to Billing Account ${gcpBillingAccount}.`);
          setActiveCheckoutStep("CONFIRMATION");
        }
      } else {
        setFeedbackNotice(result.reason || "Google Cloud Billing authorization failed.");
      }
    }, 600);
  };

  // Submit Private Offer Request
  const handlePrivateOfferSubmit = () => {
    setIsProcessing(true);
    const targetIntent = ensureTargetIntent();
    const updated = updateSubscriptionIntentCommercialRoute(targetIntent.id, "PRIVATE_OFFER");

    setTimeout(() => {
      setIsProcessing(false);
      if (onIntentUpdated) onIntentUpdated(updated);
      setSubmittedMessage("Your private offer request has been submitted.");
      setActiveCheckoutStep("CONFIRMATION");
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-xs transition-opacity overflow-y-auto font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="enterprise-checkout-title"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-card-lg border border-line shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* ==================== LAYER 1: METHOD SELECTION ==================== */}
        {activeCheckoutStep === null && (
          <div className="flex flex-col">
            {/* Header */}
            <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-line flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-royal mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>COMMERCIAL PROTOCOL</span>
                  <span className="text-slate-300">•</span>
                  <span>ENTERPRISE BILLING DESK</span>
                </div>
                <h2
                  id="enterprise-checkout-title"
                  className="text-xl sm:text-2xl font-extrabold text-graphite tracking-tight uppercase"
                >
                  Choose Payment Settlement
                </h2>
                <p className="text-xs text-stone mt-0.5">
                  Select a commercial settlement route for {effectiveCompanyTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="w-9 h-9 rounded-card-xs border border-line bg-canvas p-2 text-stone hover:text-graphite hover:bg-soft transition flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selected Plan Summary Card */}
            <div className="px-6 sm:px-8 py-4 bg-canvas border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-royal tracking-[0.14em] uppercase">
                  SELECTED TIER
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-base font-extrabold text-graphite uppercase">{selectedPlan.name}</span>
                  <span className="text-xs font-bold text-stone">
                    ${selectedPlan.price} / {selectedPlan.billingInterval.toLowerCase()}
                  </span>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs text-graphite font-bold block">
                  {effectiveCompanyTitle}
                </span>
                <span className="text-[10.5px] text-mute font-mono block">
                  {effectiveBusinessId}
                </span>
              </div>
            </div>

            {/* Method Options */}
            <div className="p-6 sm:px-8 space-y-3 max-h-[60vh] overflow-y-auto">
              {/* Option 1: Pay Online (Stripe) */}
              <div
                onClick={() => handleOpenCheckout("STRIPE")}
                className={`p-4 rounded-card-md border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  selectedMethod === "STRIPE"
                    ? "bg-canvas border-slate-900 ring-1 ring-slate-900 shadow-xs"
                    : "bg-white border-line hover:border-slate-400 hover:bg-soft"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-card-sm flex items-center justify-center ${selectedMethod === "STRIPE" ? "bg-slate-950 text-white" : "bg-canvas border border-line text-stone"}`}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-graphite uppercase">Pay Online Direct</h3>
                    <p className="text-xs text-stone mt-0.5">Instant credit/debit card settlement via Stripe</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-royal uppercase flex items-center gap-1">
                    Select <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>

              {/* Option 2: Google Cloud Marketplace */}
              <div
                onClick={() => handleOpenCheckout("GOOGLE_CLOUD_MARKETPLACE")}
                className={`p-4 rounded-card-md border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  selectedMethod === "GOOGLE_CLOUD_MARKETPLACE"
                    ? "bg-canvas border-slate-900 ring-1 ring-slate-900 shadow-xs"
                    : "bg-white border-line hover:border-slate-400 hover:bg-soft"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-card-sm flex items-center justify-center ${selectedMethod === "GOOGLE_CLOUD_MARKETPLACE" ? "bg-slate-950 text-white" : "bg-canvas border border-line text-stone"}`}>
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-graphite uppercase">Google Cloud Marketplace</h3>
                    <p className="text-xs text-stone mt-0.5">Drawdown against your GCP enterprise commitment</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-royal uppercase flex items-center gap-1">
                    Select <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>

              {/* Option 3: Private Offer */}
              <div
                onClick={() => handleOpenCheckout("PRIVATE_OFFER")}
                className={`p-4 rounded-card-md border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  selectedMethod === "PRIVATE_OFFER"
                    ? "bg-canvas border-slate-900 ring-1 ring-slate-900 shadow-xs"
                    : "bg-white border-line hover:border-slate-400 hover:bg-soft"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-card-sm flex items-center justify-center ${selectedMethod === "PRIVATE_OFFER" ? "bg-slate-950 text-white" : "bg-canvas border border-line text-stone"}`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-graphite uppercase">Private Enterprise Contract</h3>
                    <p className="text-xs text-stone mt-0.5">Custom invoicing, master services agreement (MSA) &amp; SLA</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-royal uppercase flex items-center gap-1">
                    Select <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 sm:px-8 py-4 bg-canvas border-t border-line flex items-center justify-between">
              {isDemoMode ? (
                <span className="text-xs text-stone flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-royal" />
                  <span>Demo sandbox · Simulated settlement</span>
                </span>
              ) : (
                <span className="text-xs text-stone flex items-center gap-1.5 font-medium">
                  <Lock className="w-3.5 h-3.5 text-stone" />
                  <span>Encrypted 256-bit institutional checkout</span>
                </span>
              )}

              <button
                type="button"
                onClick={() => handleOpenCheckout()}
                className="px-6 py-2.5 rounded-card-sm bg-slate-950 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}

        {/* ==================== LAYER 2: STRIPE CARD CHECKOUT ==================== */}
        {activeCheckoutStep === "STRIPE" && (
          <div className="flex flex-col font-sans">
            {/* Header */}
            <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveCheckoutStep(null)}
                  className="w-9 h-9 rounded-card-xs border border-line bg-canvas p-2 text-stone hover:text-graphite hover:bg-soft transition flex items-center justify-center cursor-pointer"
                  aria-label="Back to payment methods"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-royal font-sans">
                    DIRECT STRIPE CHANNEL
                  </div>
                  <h2 className="text-xl font-extrabold text-graphite tracking-tight uppercase font-sans">
                    Card Checkout
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isDemoMode && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-card-xs bg-canvas text-stone text-xs font-bold border border-line">
                    Demo Mode · Sandbox
                  </span>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close modal"
                  className="w-9 h-9 rounded-card-xs border border-line bg-canvas p-2 text-stone hover:text-graphite hover:bg-soft transition flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 sm:px-8 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Order Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-card-md bg-canvas border border-line text-xs font-sans">
                <div>
                  <span className="text-mute font-bold uppercase text-[9.5px] block">Company</span>
                  <span className="font-bold text-graphite truncate block mt-0.5">{effectiveCompanyTitle}</span>
                  <code className="text-[10px] text-mute font-mono block mt-0.5">{effectiveBusinessId}</code>
                </div>
                <div>
                  <span className="text-mute font-bold uppercase text-[9.5px] block">Plan Tier</span>
                  <span className="font-bold text-graphite block mt-0.5 uppercase">{selectedPlan.name}</span>
                </div>
                <div>
                  <span className="text-mute font-bold uppercase text-[9.5px] block">Billing Cycle</span>
                  <span className="font-bold text-graphite block mt-0.5 uppercase">{selectedPlan.billingInterval}</span>
                </div>
                <div>
                  <span className="text-mute font-bold uppercase text-[9.5px] block">Settlement Price</span>
                  <span className="font-bold text-graphite block mt-0.5">${selectedPlan.price} / mo</span>
                </div>
              </div>

              {/* Editable Card Information Form */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-bold text-royal tracking-[0.14em] uppercase font-sans">
                  Cardholder Credentials
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-graphite mb-1 uppercase font-sans">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-card-sm border border-line bg-canvas text-sm font-medium text-graphite focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                      placeholder="Name on card"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-graphite mb-1 uppercase font-sans">
                      Card Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full px-3.5 py-2.5 pr-10 rounded-card-sm border border-line bg-canvas text-sm font-mono text-graphite focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                        placeholder="4242 4242 4242 4242"
                      />
                      <CreditCard className="w-4 h-4 text-stone absolute right-3.5 top-3.5 pointer-events-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-graphite mb-1 uppercase font-sans">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-card-sm border border-line bg-canvas text-sm font-mono text-graphite focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                        placeholder="MM/YY"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-graphite mb-1 uppercase font-sans">
                        CVC / CVV
                      </label>
                      <input
                        type="text"
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-card-sm border border-line bg-canvas text-sm font-mono text-graphite focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                        placeholder="123"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Corporate Billing Address */}
              <div className="space-y-3 pt-2 border-t border-line">
                <h3 className="text-xs font-bold text-royal tracking-[0.14em] uppercase font-sans">
                  Corporate Invoicing
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-graphite mb-1 uppercase font-sans">
                      Billing Email
                    </label>
                    <input
                      type="email"
                      value={billingEmail}
                      onChange={(e) => setBillingEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-card-sm border border-line bg-canvas text-sm font-medium text-graphite focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-graphite mb-1 uppercase font-sans">
                      Tax ID / VAT Number
                    </label>
                    <input
                      type="text"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-card-sm border border-line bg-canvas text-sm font-medium text-graphite focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Total & Checkout CTA */}
              {feedbackNotice && (
                <div className="p-3 rounded-card-sm bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
                  {feedbackNotice}
                </div>
              )}

              <div className="p-4 rounded-card-md bg-slate-950 text-white flex items-center justify-between font-sans">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Total Due Today</span>
                  <span className="text-lg font-extrabold text-white">${selectedPlan.price} USD</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveCheckoutStep(null)}
                    className="px-4 py-2.5 rounded-card-xs border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleStripePay}
                    disabled={isProcessing}
                    className="px-5 py-2.5 rounded-card-xs bg-white hover:bg-slate-100 text-slate-950 text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs flex items-center gap-2 cursor-pointer"
                  >
                    {isProcessing ? "Processing..." : `Authorize $${selectedPlan.price}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== LAYER 2: GOOGLE CLOUD MARKETPLACE ==================== */}
        {activeCheckoutStep === "GOOGLE_CLOUD_MARKETPLACE" && (
          <div className="flex flex-col font-sans">
            {/* Header */}
            <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveCheckoutStep(null)}
                  className="w-9 h-9 rounded-card-xs border border-line bg-canvas p-2 text-stone hover:text-graphite hover:bg-soft transition flex items-center justify-center cursor-pointer"
                  aria-label="Back to payment methods"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-royal">
                    GCP ENTERPRISE CHANNEL
                  </div>
                  <h2 className="text-xl font-extrabold text-graphite tracking-tight uppercase">
                    Google Cloud Billing
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="w-9 h-9 rounded-card-xs border border-line bg-canvas p-2 text-stone hover:text-graphite hover:bg-soft transition flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 sm:px-8 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Order Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-card-md bg-canvas border border-line text-xs font-sans">
                <div>
                  <span className="text-mute font-bold uppercase text-[9.5px] block">Company</span>
                  <span className="font-bold text-graphite truncate block mt-0.5">{effectiveCompanyTitle}</span>
                  <code className="text-[10px] text-mute font-mono block mt-0.5">{effectiveBusinessId}</code>
                </div>
                <div>
                  <span className="text-mute font-bold uppercase text-[9.5px] block">Plan Tier</span>
                  <span className="font-bold text-graphite block mt-0.5 uppercase">{selectedPlan.name}</span>
                </div>
                <div>
                  <span className="text-mute font-bold uppercase text-[9.5px] block">Billing Cycle</span>
                  <span className="font-bold text-graphite block mt-0.5 uppercase">{selectedPlan.billingInterval}</span>
                </div>
                <div>
                  <span className="text-mute font-bold uppercase text-[9.5px] block">Catalog Price</span>
                  <span className="font-bold text-graphite block mt-0.5">${selectedPlan.price} / mo</span>
                </div>
              </div>

              {/* GCP Form Fields */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-bold text-royal tracking-[0.14em] uppercase font-sans">
                  GCP Entitlement Coordinates
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-graphite mb-1 uppercase font-sans">
                      Google Cloud Project ID
                    </label>
                    <input
                      type="text"
                      value={gcpProjectId}
                      onChange={(e) => setGcpProjectId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-card-sm border border-line bg-canvas text-sm font-mono text-graphite focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                      placeholder="gcp-prod-argento"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-graphite mb-1 uppercase font-sans">
                      Google Cloud Billing Account ID
                    </label>
                    <input
                      type="text"
                      value={gcpBillingAccount}
                      onChange={(e) => setGcpBillingAccount(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-card-sm border border-line bg-canvas text-sm font-mono text-graphite focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                      placeholder="01AB-23CD-45EF"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-graphite mb-1 uppercase font-sans">
                      Tax ID / VAT Number
                    </label>
                    <input
                      type="text"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-card-sm border border-line bg-canvas text-sm font-medium text-graphite focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                    />
                  </div>
                </div>

                {gcpError && (
                  <div className="p-3 rounded-card-sm bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
                    {gcpError}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 rounded-card-md bg-slate-950 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Drawdown Billing</span>
                  <span className="text-lg font-extrabold text-white">${selectedPlan.price} USD</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveCheckoutStep(null)}
                    className="px-4 py-2.5 rounded-card-xs border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleGcpSubmit}
                    disabled={isProcessing}
                    className="px-5 py-2.5 rounded-card-xs bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs flex items-center gap-2 cursor-pointer"
                  >
                    {isProcessing ? "Authorizing..." : "Link GCP Entitlement"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== LAYER 2: PRIVATE COMMERCIAL OFFER ==================== */}
        {activeCheckoutStep === "PRIVATE_OFFER" && (
          <div className="flex flex-col font-sans">
            {/* Header */}
            <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveCheckoutStep(null)}
                  className="w-9 h-9 rounded-card-xs border border-line bg-canvas p-2 text-stone hover:text-graphite hover:bg-soft transition flex items-center justify-center cursor-pointer"
                  aria-label="Back to payment methods"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-royal">
                    BESPOKE ENTERPRISE
                  </div>
                  <h2 className="text-xl font-extrabold text-graphite tracking-tight uppercase">
                    Private Commercial Offer
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="w-9 h-9 rounded-card-xs border border-line bg-canvas p-2 text-stone hover:text-graphite hover:bg-soft transition flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 sm:px-8 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Order Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-card-md bg-canvas border border-line text-xs font-sans">
                <div>
                  <span className="text-mute font-bold uppercase text-[9.5px] block">Company</span>
                  <span className="font-bold text-graphite truncate block mt-0.5">{effectiveCompanyTitle}</span>
                  <code className="text-[10px] text-mute font-mono block mt-0.5">{effectiveBusinessId}</code>
                </div>
                <div>
                  <span className="text-mute font-bold uppercase text-[9.5px] block">Plan Tier</span>
                  <span className="font-bold text-graphite block mt-0.5 uppercase">{selectedPlan.name}</span>
                </div>
                <div>
                  <span className="text-mute font-bold uppercase text-[9.5px] block">Billing Cycle</span>
                  <span className="font-bold text-graphite block mt-0.5 uppercase">{selectedPlan.billingInterval}</span>
                </div>
                <div>
                  <span className="text-mute font-bold uppercase text-[9.5px] block">Catalog Price</span>
                  <span className="font-bold text-graphite block mt-0.5">${selectedPlan.price} / mo</span>
                </div>
              </div>

              {/* Private Offer Form Fields */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-bold text-royal tracking-[0.14em] uppercase font-sans">
                  Commercial Contact &amp; Custom Terms
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-graphite mb-1 uppercase font-sans">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-card-sm border border-line bg-canvas text-sm font-medium text-graphite focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                      placeholder="Procurement contact"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-graphite mb-1 uppercase font-sans">
                      Business Email
                    </label>
                    <input
                      type="email"
                      value={privateEmail}
                      onChange={(e) => setPrivateEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-card-sm border border-line bg-canvas text-sm font-medium text-graphite focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                      placeholder="contact@argento-marine.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-graphite mb-1 uppercase font-sans">
                      Requested Custom Terms / SLA
                    </label>
                    <textarea
                      rows={3}
                      value={privateTerms}
                      onChange={(e) => setPrivateTerms(e.target.value)}
                      className="w-full p-3.5 rounded-card-sm border border-line bg-canvas text-sm font-medium text-graphite focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                      placeholder="Describe custom SLA, payment terms, or enterprise invoicing requirements..."
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 rounded-card-md bg-slate-950 text-white flex items-center justify-between font-sans">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Enterprise Quote</span>
                  <span className="text-sm font-extrabold text-white">Custom Private Terms</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveCheckoutStep(null)}
                    className="px-4 py-2.5 rounded-card-xs border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handlePrivateOfferSubmit}
                    disabled={isProcessing}
                    className="px-5 py-2.5 rounded-card-xs bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs flex items-center gap-2 cursor-pointer"
                  >
                    {isProcessing ? "Submitting..." : "Submit Offer Request"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== CONFIRMATION VIEW ==================== */}
        {activeCheckoutStep === "CONFIRMATION" && (
          <div className="p-8 text-center space-y-5 font-sans">
            <div className="w-12 h-12 rounded-card-md bg-slate-950 text-white flex items-center justify-center mx-auto border border-line shadow-xs">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>

            <div className="space-y-1">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-royal">
                COMMERCIAL SETTLEMENT LOGGED
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-graphite uppercase">
                {submittedMessage || "Request Submitted"}
              </h2>
              <p className="text-xs text-stone max-w-md mx-auto">
                Company {effectiveCompanyTitle} ({effectiveBusinessId}) is registered under plan {selectedPlan.name}.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-card-sm bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
