import React, { useState, useEffect } from "react";
import {
  CommercialOffer,
  acceptCommercialOffer,
  declineCommercialOffer,
} from "@/lib/services/commercialPropertyService";
import { BillingMethod } from "@/lib/services/commercialBillingService";
import { getCompanyRecordSync } from "@/lib/repositories/companyRepository";
import {
  ShieldCheck,
  Building2,
  Calendar,
  DollarSign,
  Tag,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  MapPin,
  Lock,
  X,
  CreditCard,
  Cloud,
  ChevronRight,
  Info,
  Check,
} from "lucide-react";

export function CommercialOfferModal({
  offer,
  memberRole,
  userEmail,
  onClose,
  onUpdated,
}: {
  offer: CommercialOffer;
  memberRole: string;
  userEmail: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [billingMethod, setBillingMethod] = useState<BillingMethod>("GOOGLE_CLOUD_MARKETPLACE");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeclinePrompt, setShowDeclinePrompt] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Company Cloud Billing Info
  const company = getCompanyRecordSync(offer.companyId);
  const [cloudBillingAccountId, setCloudBillingAccountId] = useState(company?.cloudBillingAccountId || "01A2B3-45C6D7-89E0F1");
  const [cloudBillingOrganizationId, setCloudBillingOrganizationId] = useState(company?.cloudBillingOrganizationId || "organizations/4820019200");
  const [cloudBillingContact, setCloudBillingContact] = useState(company?.cloudBillingContact || userEmail || "procurement@argentomarine.com");

  const canAcceptOrDecline = memberRole === "OWNER" || memberRole === "ADMIN";

  const handleAccept = async () => {
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const res = await acceptCommercialOffer({
        offerId: offer.offerId,
        companyActor: userEmail || "company-admin",
        memberRole,
        billingMethod,
        billingContext: {
          cloudBillingAccountId: billingMethod === "GOOGLE_CLOUD_MARKETPLACE" ? cloudBillingAccountId : undefined,
          cloudBillingOrganizationId: billingMethod === "GOOGLE_CLOUD_MARKETPLACE" ? cloudBillingOrganizationId : undefined,
          cloudBillingContact: billingMethod === "GOOGLE_CLOUD_MARKETPLACE" ? cloudBillingContact : undefined,
          stripeCustomerId: billingMethod === "STRIPE" ? (company?.stripeCustomerId || `cus_${offer.companyId}`) : undefined,
        },
      });

      setIsProcessing(false);

      if (res.success) {
        if (billingMethod === "STRIPE" && res.agreement) {
          try {
            const checkoutRes = await fetch("/api/stripe/create-lease-checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                agreementId: res.agreement.agreementId,
                companyId: offer.companyId,
                actorEmail: userEmail,
              }),
            });
            const checkoutData = await checkoutRes.json();
            if (checkoutData.success && checkoutData.sessionUrl) {
              setSuccessMessage("Agreement created! Redirecting to secure Stripe Checkout...");
              setTimeout(() => {
                window.location.href = checkoutData.sessionUrl;
              }, 1000);
              return;
            }
          } catch (stripeErr) {
            console.warn("[CommercialOfferModal] Stripe Checkout API call skipped/fallback:", stripeErr);
          }
        }

        setSuccessMessage(
          billingMethod === "GOOGLE_CLOUD_MARKETPLACE"
            ? "Commercial offer accepted! Google Cloud Marketplace SaaS Private Offer prepared against Cloud Billing Account."
            : "Commercial offer accepted! Stripe enterprise billing session initialized."
        );
        setTimeout(() => {
          onUpdated();
          onClose();
        }, 1500);
      } else {
        setErrorMessage(res.error || "Failed to accept offer.");
      }
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err?.message || "An unexpected error occurred while accepting offer.");
    }
  };

  const handleDecline = () => {
    setErrorMessage(null);
    setIsProcessing(true);
    const res = declineCommercialOffer({
      offerId: offer.offerId,
      companyActor: userEmail || "company-admin",
      memberRole,
      reason: declineReason,
    });
    setIsProcessing(false);

    if (res.success) {
      setSuccessMessage("Commercial offer declined.");
      setTimeout(() => {
        onUpdated();
        onClose();
      }, 1200);
    } else {
      setErrorMessage(res.error || "Failed to decline offer.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl flex flex-col">
        {/* MODAL HEADER */}
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-royal/5 border border-royal/20 flex items-center justify-center text-royal">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                MarineWorld Commercial Operations &bull; Deal Desk
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Commercial Asset Offer: {offer.canonicalPropertyKey}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT BODY */}
        <div className="p-6 space-y-6">
          {/* SUCCESS / ERROR ALERTS */}
          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              {errorMessage}
            </div>
          )}

          {/* SECTION 1: IMMUTABLE COMMERCIAL SPECIFICATION */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-slate-300 uppercase">
                  Contract Asset Target
                </span>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-slate-300" />
                  {offer.canonicalPropertyKey}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-royal/15 text-slate-300 border border-royal/20 rounded-full text-[11px] font-bold uppercase">
                  {offer.tier} TIER
                </span>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[11px] font-bold uppercase">
                  OFFER {offer.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Tenant Company</div>
                <div className="font-semibold text-white mt-0.5">{offer.companyName || offer.companyId}</div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Sector City & Region</div>
                <div className="font-semibold text-white mt-0.5 capitalize">{offer.cityId} &bull; {offer.regionCode}</div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Annual Rate</div>
                <div className="font-semibold text-emerald-400 text-sm mt-0.5">${offer.annualRate.toLocaleString()} {offer.currency}</div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Total Contract Value</div>
                <div className="font-bold text-white text-sm mt-0.5">${offer.totalContractValue.toLocaleString()} {offer.currency}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-2 border-t border-slate-800/80">
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Contract Term</div>
                <div className="font-semibold text-white mt-0.5">{offer.termMonths} Months</div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Start Date</div>
                <div className="font-semibold text-white mt-0.5">{new Date(offer.startDate).toLocaleDateString()}</div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">End Date</div>
                <div className="font-semibold text-white mt-0.5">{new Date(offer.endDate).toLocaleDateString()}</div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Auto Renewal</div>
                <div className="font-semibold text-slate-300 mt-0.5">{offer.autoRenew ? "Enabled (Continuous Anchor)" : "Disabled"}</div>
              </div>
            </div>
          </div>

          {/* SECTION 2: SPECIAL CONDITIONS */}
          {offer.conditions && offer.conditions.length > 0 && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-royal" />
                Special Institutional Conditions & Entitlements
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                {offer.conditions.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* SECTION 3: DUAL BILLING RAIL SELECTION */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-royal" />
                Select Institutional Billing Rail
              </h4>
              <p className="text-xs text-slate-500 font-light mt-0.5">
                Choose how this commercial agreement will be billed. Both rails link to the same canonical contract.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* GOOGLE CLOUD MARKETPLACE OPTION */}
              <button
                type="button"
                onClick={() => setBillingMethod("GOOGLE_CLOUD_MARKETPLACE")}
                className={`p-5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                  billingMethod === "GOOGLE_CLOUD_MARKETPLACE"
                    ? "border-royal bg-royal/5 shadow-md ring-2 ring-royal/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-royal text-white flex items-center justify-center font-bold text-xs">
                        <Cloud className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-900 text-sm">Google Cloud Marketplace</span>
                    </div>
                    {billingMethod === "GOOGLE_CLOUD_MARKETPLACE" && (
                      <CheckCircle2 className="w-5 h-5 text-royal" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-light">
                    Pay directly against your existing Google Cloud Billing Account using enterprise committed spend / SaaS Private Offer.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-royal font-medium">
                  <span>SaaS Private Offer</span>
                  <span className="px-2 py-0.5 bg-royal/10 rounded-md font-bold">Enterprise Standard</span>
                </div>
              </button>

              {/* STRIPE DIRECT OPTION */}
              <button
                type="button"
                onClick={() => setBillingMethod("STRIPE")}
                className={`p-5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                  billingMethod === "STRIPE"
                    ? "border-royal bg-royal/5 shadow-md ring-2 ring-royal/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-royal text-white flex items-center justify-center font-bold text-xs">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-900 text-sm">Stripe Corporate Billing</span>
                    </div>
                    {billingMethod === "STRIPE" && (
                      <CheckCircle2 className="w-5 h-5 text-royal" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-light">
                    Direct corporate credit card or automated ACH subscription billing with recurring invoice receipts.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-royal font-medium">
                  <span>ACH & Corporate Cards</span>
                  <span className="px-2 py-0.5 bg-royal/10 rounded-md font-bold">Direct Rail</span>
                </div>
              </button>
            </div>

            {/* BILLING RAIL SPECIFIC CONTEXT INPUTS */}
            {billingMethod === "GOOGLE_CLOUD_MARKETPLACE" && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Cloud className="w-4 h-4 text-royal" />
                  Google Cloud Billing Account Details
                </div>
                <p className="text-[11px] text-slate-500">
                  The SaaS Private Offer will be prepared and issued to your organization's Google Cloud console.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Cloud Billing Account ID
                    </label>
                    <input
                      type="text"
                      value={cloudBillingAccountId}
                      onChange={(e) => setCloudBillingAccountId(e.target.value)}
                      placeholder="e.g. 01A2B3-45C6D7-89E0F1"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Cloud Organization ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={cloudBillingOrganizationId}
                      onChange={(e) => setCloudBillingOrganizationId(e.target.value)}
                      placeholder="organizations/123456789"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Procurement Contact Email
                  </label>
                  <input
                    type="email"
                    value={cloudBillingContact}
                    onChange={(e) => setCloudBillingContact(e.target.value)}
                    placeholder="procurement@company.com"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal/40"
                  />
                </div>
              </div>
            )}

            {billingMethod === "STRIPE" && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs text-slate-600 animate-fade-in">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <CreditCard className="w-4 h-4 text-royal" />
                  Stripe Corporate Subscription Summary
                </div>
                <p className="text-[11px] leading-relaxed">
                  Upon acceptance, an official commercial agreement record will be issued with automated annual subscription billing ({offer.currency} ${offer.annualRate.toLocaleString()}/yr). Invoices and receipts will be delivered to <strong className="text-slate-800">{userEmail}</strong>.
                </p>
              </div>
            )}
          </div>

          {/* DECLINE REASON PROMPT */}
          {showDeclinePrompt && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3 animate-fade-in">
              <div className="text-xs font-bold text-rose-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Decline Commercial Offer
              </div>
              <p className="text-xs text-rose-700">
                Please provide an optional reason for declining. The property slot will be released back to available inventory.
              </p>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Reason for declining..."
                rows={2}
                className="w-full p-2.5 bg-white border border-rose-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeclinePrompt(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDecline}
                  disabled={isProcessing}
                  className="px-4 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 disabled:opacity-50"
                >
                  Confirm Decline
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between sticky bottom-0 z-10">
          <div className="text-xs text-slate-500">
            {!canAcceptOrDecline ? (
              <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Requires Company OWNER or ADMIN role to execute
              </span>
            ) : (
              <span className="text-slate-600 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Authorized as <strong>{memberRole}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!showDeclinePrompt && canAcceptOrDecline && (
              <button
                type="button"
                onClick={() => setShowDeclinePrompt(true)}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50"
              >
                Decline Offer
              </button>
            )}

            <button
              type="button"
              onClick={handleAccept}
              disabled={!canAcceptOrDecline || isProcessing}
              className="px-6 py-2.5 bg-royal text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-royal-dark disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-royal/20"
            >
              {isProcessing ? "Processing..." : "Accept & Select Billing Rail"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
