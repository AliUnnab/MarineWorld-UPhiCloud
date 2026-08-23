import React, { useState } from "react";
import {
  CreditCard,
  Lock,
  ShieldCheck,
  X,
  AlertCircle,
  CheckCircle2,
  Building2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  createSetupIntent,
  confirmSetupIntent,
  StripePaymentMethodRecord,
} from "@/lib/services/commercialBillingService";

interface StripePaymentMethodModalProps {
  companyId: string;
  companyName: string;
  memberRole: string;
  billingPurpose?: "PLATFORM_SUBSCRIPTION" | "COMMERCIAL_AGREEMENT" | "GENERAL";
  agreementId?: string;
  agreementPropertyKey?: string;
  onSuccess: (paymentMethod: StripePaymentMethodRecord) => void;
  onClose: () => void;
}

export function StripePaymentMethodModal({
  companyId,
  companyName,
  memberRole,
  billingPurpose = "GENERAL",
  agreementId,
  agreementPropertyKey,
  onSuccess,
  onClose,
}: StripePaymentMethodModalProps) {
  const [setupIntent] = useState(() =>
    createSetupIntent({ companyId, billingPurpose, agreementId })
  );

  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [expDate, setExpDate] = useState("");
  const [cvc, setCvc] = useState("");
  const [country, setCountry] = useState("US");
  const [postalCode, setPostalCode] = useState("");
  const [setAsDefault, setSetAsDefault] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [confirmedMethod, setConfirmedMethod] = useState<StripePaymentMethodRecord | null>(null);

  const isOwnerOrAdmin = memberRole === "OWNER" || memberRole === "ADMIN";

  // Auto-detect card brand
  const getCardBrand = (num: string): { brand: string; label: string; color: string } => {
    const clean = num.replace(/\s+/g, "");
    if (clean.startsWith("4")) return { brand: "visa", label: "Visa Corporate", color: "text-blue-600" };
    if (/^(5[1-5]|2[2-7])/.test(clean)) return { brand: "mastercard", label: "Mastercard Commercial", color: "text-amber-600" };
    if (/^3[47]/.test(clean)) return { brand: "amex", label: "American Express Corporate", color: "text-sky-600" };
    if (/^(6011|65)/.test(clean)) return { brand: "discover", label: "Discover Enterprise", color: "text-orange-600" };
    return { brand: "card", label: "Corporate Card", color: "text-slate-500" };
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(" ") || raw;
    setCardNumber(formatted);
  };

  const handleExpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 3) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }
    setExpDate(raw);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isOwnerOrAdmin) {
      setErrorMessage("Unauthorized: Only Organization Owners or Billing Admins can attach payment methods.");
      return;
    }

    const cleanCard = cardNumber.replace(/\s+/g, "");
    if (cleanCard.length < 15) {
      setErrorMessage("Please enter a valid 15-16 digit corporate card number.");
      return;
    }

    if (!expDate || expDate.length < 5) {
      setErrorMessage("Please enter a valid expiration date (MM/YY).");
      return;
    }

    const [monthStr, yearStr] = expDate.split("/");
    const expMonth = parseInt(monthStr, 10);
    const expYear = 2000 + parseInt(yearStr, 10);

    if (expMonth < 1 || expMonth > 12) {
      setErrorMessage("Please enter a valid expiration month (01-12).");
      return;
    }

    if (!cardholderName.trim()) {
      setErrorMessage("Please provide the corporate cardholder or treasury name.");
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate client-side Stripe Elements SetupIntent confirmation
      await new Promise((resolve) => setTimeout(resolve, 800));

      const { brand } = getCardBrand(cleanCard);
      const last4 = cleanCard.slice(-4);

      const result = confirmSetupIntent({
        setupIntentId: setupIntent.id,
        companyId,
        brand,
        last4,
        expMonth,
        expYear,
        cardholderName: cardholderName.trim(),
        country,
        isDefault: setAsDefault,
        billingPurpose,
        agreementId,
        actorRole: memberRole,
      });

      if (!result.success || !result.paymentMethod) {
        throw new Error(result.error || "Failed to confirm SetupIntent with Stripe.");
      }

      setConfirmedMethod(result.paymentMethod);
      setIsComplete(true);
      setIsProcessing(false);

      setTimeout(() => {
        onSuccess(result.paymentMethod!);
      }, 1000);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || "An error occurred while vaulting the payment method.");
    }
  };

  const detected = getCardBrand(cardNumber);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in font-sans text-slate-900">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
        {/* MODAL HEADER */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                  STRIPE PAYMENT ELEMENT
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight mt-0.5">
                ADD CORPORATE PAYMENT METHOD
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 space-y-5 text-xs">
          {/* CONTEXT INFORMATION */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500">Company:</span>
              <span className="font-bold text-slate-900">{companyName}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500">Billing Purpose:</span>
              <span className="font-mono font-semibold text-blue-600">
                {billingPurpose === "PLATFORM_SUBSCRIPTION"
                  ? "Platform Software Subscription"
                  : billingPurpose === "COMMERCIAL_AGREEMENT"
                  ? `Commercial Property Agreement (${agreementPropertyKey || agreementId})`
                  : "General Corporate Billing"}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500">SetupIntent Token:</span>
              <span className="font-mono text-slate-600 text-[10px]">{setupIntent.id}</span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isComplete && confirmedMethod ? (
            <div className="p-6 text-center space-y-3 bg-emerald-50 border border-emerald-200 rounded-2xl animate-in zoom-in-95">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-emerald-900">
                Corporate Payment Method Saved
              </h4>
              <p className="text-xs text-emerald-700 font-mono">
                {confirmedMethod.brand.toUpperCase()} ending in •••• {confirmedMethod.last4}
              </p>
              <p className="text-[11px] text-emerald-600 font-light">
                Securely saved with Stripe for future authorized billing.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* CARD NUMBER */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                  Card Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="4000 1234 5678 9010"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    className="w-full pl-3.5 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span className={detected.color}>{detected.label}</span>
                  </div>
                </div>
              </div>

              {/* CARDHOLDER NAME */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                  Corporate Cardholder / Treasury Entity
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Argento Treasury Operations"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              {/* EXP DATE & CVC */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    Expiration Date
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="MM/YY"
                    maxLength={5}
                    value={expDate}
                    onChange={handleExpChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    CVC / CVV
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="•••"
                    maxLength={4}
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* COUNTRY & POSTAL */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    Billing Country
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  >
                    <option value="US">United States (USD)</option>
                    <option value="GB">United Kingdom (GBP)</option>
                    <option value="EU">European Union (EUR)</option>
                    <option value="TR">Turkey (TRY/USD)</option>
                    <option value="SG">Singapore (SGD)</option>
                    <option value="AE">United Arab Emirates (AED)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    Postal / ZIP Code
                  </label>
                  <input
                    type="text"
                    placeholder="10001"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* SET AS DEFAULT CHECKBOX */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="setDefaultPm"
                  checked={setAsDefault}
                  onChange={(e) => setSetAsDefault(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="setDefaultPm" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Set as default payment instrument for this organization
                </label>
              </div>

              {/* ENTERPRISE GUARANTEE & SECURITY NOTICE */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-2.5 text-[11px] text-slate-600">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Securely saved with Stripe for future authorized billing. Sensitive card credentials remain in Stripe's Level 1 PCI vault.
                </span>
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Vaulting with Stripe...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>SAVE PAYMENT METHOD</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
