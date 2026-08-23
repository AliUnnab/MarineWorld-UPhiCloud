import React, { useState, useMemo, useEffect } from "react";
import { marineSector } from "@/lib/sectors/marine";
import { CANONICAL_CITY_REGIONS } from "@/lib/services/propertyService";
import {
  getAllCommercialInventory,
  getAllCommercialAgreements,
  getAllReservationIntents,
  getAllCommercialOffers,
  getCommercialAuditLogs,
  reviewReservationIntent,
  createCommercialOffer,
  confirmProviderPayment,
  activateCommercialAgreement,
  suspendCommercialAgreement,
  expireCommercialAgreement,
  createPropertyHold,
  releasePropertyHold,
  resolvePublicPropertyVisibility,
  CommercialDigitalProperty,
  CommercialAgreement,
  CommercialOffer,
  CommercialReservationIntent,
  CommercialAuditRecord,
  CommercialPropertyTier,
  CommercialStatus,
  calculateTermDates,
} from "@/lib/services/commercialPropertyService";
import {
  getAllBillingRecords,
  getAllStripeRecords,
  getAllGoogleCloudRecords,
  getAllInvoices,
  getAllPayments,
  getAllCommercialBillingSummary,
  CommercialInvoice,
  CommercialPayment,
  BillingMethod,
} from "@/lib/services/commercialBillingService";
import { CommercialInvoiceModal } from "@/components/studio/CommercialInvoiceModal";
import {
  Building2,
  FileText,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Layers,
  MapPin,
  Clock,
  Search,
  Filter,
  DollarSign,
  Calendar,
  Lock,
  RefreshCw,
  Eye,
  Check,
  ChevronRight,
  History,
  Activity,
  Award,
  Cloud,
  CreditCard,
  Send,
  Zap,
  Sliders,
} from "lucide-react";

export function MarineWorldCommercialConsolePage({
  initialTab = "RESERVATIONS",
}: {
  initialTab?: "RESERVATIONS" | "OFFERS" | "AGREEMENTS" | "DUAL_BILLING" | "INVENTORY_PORTFOLIO" | "AUDIT_LEDGER";
}) {
  const [activeTab, setActiveTab] = useState<
    "RESERVATIONS" | "OFFERS" | "AGREEMENTS" | "DUAL_BILLING" | "INVENTORY_PORTFOLIO" | "AUDIT_LEDGER"
  >(initialTab);
  const [operatorEmail, setOperatorEmail] = useState("commercial-ops@marineworld.city");

  // Filter States
  const [cityFilter, setCityFilter] = useState("ALL");
  const [regionFilter, setRegionFilter] = useState("ALL");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Action Modals / Selected Items
  const [selectedAgreement, setSelectedAgreement] = useState<CommercialAgreement | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<CommercialDigitalProperty | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<CommercialReservationIntent | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<CommercialOffer | null>(null);

  // Offer Creation State for Deal Desk
  const [isCreatingOffer, setIsCreatingOffer] = useState(false);
  const [offerCompanyId, setOfferCompanyId] = useState("");
  const [offerCompanyName, setOfferCompanyName] = useState("");
  const [offerPropertyKey, setOfferPropertyKey] = useState("");
  const [offerPrice, setOfferPrice] = useState<number>(45000);
  const [offerTermMonths, setOfferTermMonths] = useState<number>(12);
  const [offerAutoRenew, setOfferAutoRenew] = useState<boolean>(true);
  const [offerConditions, setOfferConditions] = useState<string>(
    "Guaranteed priority digital real estate placement\nSector City multi-region edition validation\nDirect Interactive Digital Operating Environment Launch"
  );

  // Feedback Messages
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const config = marineSector;
  const cities = config.explorer.cities;

  // Data Loading
  const properties = useMemo(() => getAllCommercialInventory(), [refreshTrigger]);
  const agreements = useMemo(() => getAllCommercialAgreements(), [refreshTrigger]);
  const reservationIntents = useMemo(() => getAllReservationIntents(), [refreshTrigger]);
  const offers = useMemo(() => getAllCommercialOffers(), [refreshTrigger]);
  const auditLogs = useMemo(() => getCommercialAuditLogs(), [refreshTrigger]);
  const billingRecords = useMemo(() => getAllBillingRecords(), [refreshTrigger]);
  const stripeRecords = useMemo(() => getAllStripeRecords(), [refreshTrigger]);
  const googleCloudRecords = useMemo(() => getAllGoogleCloudRecords(), [refreshTrigger]);
  const invoices = useMemo(() => getAllInvoices(), [refreshTrigger]);
  const payments = useMemo(() => getAllPayments(), [refreshTrigger]);
  const billingSummary = useMemo(() => getAllCommercialBillingSummary(agreements), [agreements, refreshTrigger]);

  const [selectedInvoice, setSelectedInvoice] = useState<CommercialInvoice | null>(null);
  const [billingSubTab, setBillingSubTab] = useState<"ALL" | "INVOICES" | "PAYMENTS" | "STRIPE" | "GOOGLE_CLOUD" | "OVERDUE">("ALL");

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      const matchesCity = cityFilter === "ALL" || p.cityId === cityFilter;
      const matchesTier = tierFilter === "ALL" || p.tier === tierFilter;
      const matchesStatus = statusFilter === "ALL" || p.commercialStatus === statusFilter;
      const matchesQuery =
        !searchQuery ||
        p.canonicalPropertyKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slotId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.cityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        Boolean(p.tenantCompanyName && p.tenantCompanyName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCity && matchesTier && matchesStatus && matchesQuery;
    });
  }, [properties, cityFilter, tierFilter, statusFilter, searchQuery]);

  // KPIs
  const totalGrossInventory = properties.length;
  const activeAgreementsCount = agreements.filter((a) => a.contractStatus === "ACTIVE").length;
  const pendingDealsCount = reservationIntents.filter((r) => r.status === "PENDING_REVIEW" || r.status === "UNDER_COMMERCIAL_REVIEW").length;
  const totalActiveAnnualRevenue = agreements
    .filter((a) => a.contractStatus === "ACTIVE")
    .reduce((acc, a) => acc + a.annualRate, 0);

  // Intent Review Handler -> Opens Offer Form Pre-filled
  const handleOpenOfferFromIntent = (intent: CommercialReservationIntent) => {
    setSelectedIntent(intent);
    setOfferPropertyKey(intent.canonicalPropertyKey);
    setOfferCompanyId(intent.companyId);
    setOfferCompanyName(intent.companyId.replace("-", " ").toUpperCase());
    setOfferPrice(intent.commercialTermsSnapshot.price);
    setOfferTermMonths(intent.commercialTermsSnapshot.termLengthMonths);
    setOfferAutoRenew(intent.commercialTermsSnapshot.autoRenew);
    setIsCreatingOffer(true);
  };

  // Submit Deal Desk Offer
  const handleIssueOffer = () => {
    if (!offerPropertyKey || !offerCompanyId) {
      showFeedback("error", "Property Key and Tenant Company ID are required.");
      return;
    }

    const conditionsArray = offerConditions
      .split("\n")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const res = createCommercialOffer({
      canonicalPropertyKey: offerPropertyKey,
      companyId: offerCompanyId,
      companyName: offerCompanyName || offerCompanyId,
      annualRate: offerPrice,
      currency: "USD",
      termMonths: offerTermMonths,
      autoRenew: offerAutoRenew,
      conditions: conditionsArray,
      operatorEmail,
      reservationIntentId: selectedIntent?.intentId,
    });

    if (res.success && res.offer) {
      showFeedback("success", `Commercial Offer #${res.offer.offerId} successfully issued to ${offerCompanyId}.`);
      setIsCreatingOffer(false);
      setSelectedIntent(null);
      handleRefresh();
      setActiveTab("OFFERS");
    } else {
      showFeedback("error", res.error || "Failed to create commercial offer.");
    }
  };

  // Confirm Payment & Entitlements Webhook Simulator
  const handleConfirmPaymentWebhook = async (agreementId: string) => {
    const res = await confirmProviderPayment(agreementId, operatorEmail, "MOCK_TRANSACTION_PAYMENT_SETTLED");
    if (res.success) {
      showFeedback("success", `Payment and cloud entitlement confirmed for Agreement ${agreementId}. Status advanced to PAYMENT_CONFIRMED.`);
      handleRefresh();
    } else {
      showFeedback("error", res.error || "Failed to confirm payment.");
    }
  };

  // Activate Agreement
  const handleActivateAgreement = (agreementId: string) => {
    const res = activateCommercialAgreement(agreementId, operatorEmail);
    if (res.success) {
      showFeedback("success", `Commercial Agreement ${agreementId} is now ACTIVE! Commercial asset ownership is live.`);
      handleRefresh();
    } else {
      showFeedback("error", res.error || "Failed to activate agreement.");
    }
  };

  // Suspend Agreement
  const handleSuspendAgreement = (agreementId: string) => {
    const res = suspendCommercialAgreement(agreementId, operatorEmail, "Commercial compliance review / operator action");
    if (res.success) {
      showFeedback("success", `Agreement ${agreementId} suspended.`);
      handleRefresh();
    } else {
      showFeedback("error", res.error || "Failed to suspend agreement.");
    }
  };

  // Expire Agreement
  const handleExpireAgreement = (agreementId: string) => {
    const res = expireCommercialAgreement(agreementId, operatorEmail);
    if (res.success) {
      showFeedback("success", `Agreement ${agreementId} marked as EXPIRED.`);
      handleRefresh();
    } else {
      showFeedback("error", res.error || "Failed to expire agreement.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 selection:bg-blue-600 selection:text-white">
      {/* TOP NOTIFICATION / FEEDBACK */}
      {feedback && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-2xl border shadow-2xl flex items-center gap-3 text-xs font-semibold animate-fade-in ${
            feedback.type === "success"
              ? "bg-emerald-950/90 border-emerald-500 text-emerald-200"
              : "bg-rose-950/90 border-rose-500 text-rose-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-blue-400 uppercase bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800">
                  Institutional Operator Console
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Phase 4.15 &bull; Deal Desk</span>
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight mt-0.5">
                MarineWorld Commercial Operations & Dual Billing
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400 text-[10px] font-mono">OP:</span>
              <span className="font-mono text-white text-[11px]">{operatorEmail}</span>
            </div>
            <button
              onClick={handleRefresh}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* METRIC STRIP */}
        <div className="max-w-7xl mx-auto px-6 py-3 border-t border-slate-800/60 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Asset Inventory</div>
            <div className="text-base font-bold text-white mt-0.5">{totalGrossInventory} Digital Slots</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Active Commercial Leases</div>
            <div className="text-base font-bold text-emerald-400 mt-0.5">{activeAgreementsCount} Active Leases</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Inbound Deal Desk Queue</div>
            <div className="text-base font-bold text-blue-400 mt-0.5">{pendingDealsCount} Intents Pending</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Annual Commercial Run-Rate</div>
            <div className="text-base font-bold text-white mt-0.5">${totalActiveAnnualRevenue.toLocaleString()} USD / yr</div>
          </div>
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab("RESERVATIONS")}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "RESERVATIONS"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Clock className="w-4 h-4" />
            Reservation Intents ({reservationIntents.length})
          </button>

          <button
            onClick={() => setActiveTab("OFFERS")}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "OFFERS"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="w-4 h-4" />
            Commercial Offers ({offers.length})
          </button>

          <button
            onClick={() => setActiveTab("AGREEMENTS")}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "AGREEMENTS"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Executed Agreements ({agreements.length})
          </button>

          <button
            onClick={() => setActiveTab("DUAL_BILLING")}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "DUAL_BILLING"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Dual Billing Rails ({billingRecords.length})
          </button>

          <button
            onClick={() => setActiveTab("INVENTORY_PORTFOLIO")}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "INVENTORY_PORTFOLIO"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4" />
            Master Inventory Matrix ({properties.length})
          </button>

          <button
            onClick={() => setActiveTab("AUDIT_LEDGER")}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "AUDIT_LEDGER"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <History className="w-4 h-4" />
            Audit Ledger ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* MAIN CONTENT PANELS */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* ========================================================= */}
        {/* TAB 1: RESERVATIONS INTENTS DESK */}
        {/* ========================================================= */}
        {activeTab === "RESERVATIONS" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-3xl border border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  Inbound Commercial Reservation Queue
                </h3>
                <p className="text-xs text-slate-400 font-light mt-0.5">
                  Tenant companies submit reservation intents to reserve specific Landmark, Flagship, or Presence digital slots. Reservation intents are not binding contracts until formalized into an issued Commercial Offer.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedIntent(null);
                  setOfferPropertyKey("NOR::GLOBAL::LM-01");
                  setOfferCompanyId("argento-marine");
                  setOfferCompanyName("Argento Marine");
                  setIsCreatingOffer(true);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider shadow-lg transition-all flex items-center gap-2 shrink-0"
              >
                <FileText className="w-4 h-4" /> Issue Custom Offer
              </button>
            </div>

            {reservationIntents.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-500 text-xs">
                No reservation intents currently in the queue.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {reservationIntents.map((intent) => (
                  <div
                    key={intent.intentId}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-6 rounded-3xl transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/80 px-2.5 py-1 rounded-lg border border-blue-800">
                          {intent.canonicalPropertyKey}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                            intent.status === "PENDING_REVIEW"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : intent.status === "UNDER_COMMERCIAL_REVIEW"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              : intent.status === "OFFER_CREATED"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          {intent.status}
                        </span>
                        <span className="text-xs text-slate-400">
                          Tenant: <strong className="text-white font-semibold">{intent.companyId}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-400 pt-1">
                        <div>
                          <span className="text-[10px] uppercase block font-bold text-slate-500">Requested Rate</span>
                          <span className="font-bold text-emerald-400 text-sm">
                            ${intent.commercialTermsSnapshot.price.toLocaleString()} {intent.commercialTermsSnapshot.currency} / yr
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase block font-bold text-slate-500">Requested Term</span>
                          <span className="text-white font-semibold">{intent.commercialTermsSnapshot.termLengthMonths} Months</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase block font-bold text-slate-500">Auto Renew</span>
                          <span className="text-blue-300">{(intent as any).autoRenew ? "Enabled" : "Disabled"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase block font-bold text-slate-500">Requested At</span>
                          <span className="font-mono text-slate-300">{new Date(intent.requestedAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {intent.notes && (
                        <div className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 italic">
                          "{intent.notes}"
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {intent.status === "PENDING_REVIEW" && (
                        <button
                          onClick={() => {
                            reviewReservationIntent({
                              intentId: intent.intentId,
                              operatorActor: operatorEmail,
                              action: "REVIEW",
                            });
                            handleOpenOfferFromIntent(intent);
                          }}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg"
                        >
                          <Send className="w-4 h-4" /> Issue Offer &rarr;
                        </button>
                      )}

                      {intent.status === "UNDER_COMMERCIAL_REVIEW" && (
                        <button
                          onClick={() => handleOpenOfferFromIntent(intent)}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg"
                        >
                          <FileText className="w-4 h-4" /> Formalize Offer &rarr;
                        </button>
                      )}

                      {intent.status === "OFFER_CREATED" && (
                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 bg-emerald-950/50 px-3 py-1.5 rounded-xl border border-emerald-800">
                          <CheckCircle2 className="w-4 h-4" /> Offer Active
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: COMMERCIAL OFFERS DESK */}
        {/* ========================================================= */}
        {activeTab === "OFFERS" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-3xl border border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Commercial Offers Registry
                </h3>
                <p className="text-xs text-slate-400 font-light mt-0.5">
                  Formal, immutable commercial offers issued by the Deal Desk. Once accepted by the tenant company, they advance to executed agreements with selected billing rails.
                </p>
              </div>
            </div>

            {offers.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-500 text-xs">
                No commercial offers currently registered.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {offers.map((offer) => (
                  <div
                    key={offer.offerId}
                    className="bg-slate-900 border border-slate-800 p-6 rounded-3xl transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/80 px-2.5 py-1 rounded-lg border border-blue-800">
                          {offer.canonicalPropertyKey}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                            offer.status === "ISSUED"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              : offer.status === "ACCEPTED"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : offer.status === "DECLINED"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : "bg-slate-500/20 text-slate-300 border border-slate-500/30"
                          }`}
                        >
                          OFFER {offer.status}
                        </span>
                        <span className="text-xs text-slate-300">
                          Tenant: <strong className="text-white">{offer.companyName}</strong> ({offer.companyId})
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-400 pt-1">
                        <div>
                          <span className="text-[10px] uppercase block font-bold text-slate-500">Annual Rate</span>
                          <span className="font-bold text-emerald-400 text-sm">
                            ${offer.annualRate.toLocaleString()} {offer.currency}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase block font-bold text-slate-500">Total Contract Value</span>
                          <span className="font-bold text-white text-sm">
                            ${offer.totalContractValue.toLocaleString()} {offer.currency}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase block font-bold text-slate-500">Term</span>
                          <span className="text-slate-300 font-semibold">{offer.termMonths} Months</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase block font-bold text-slate-500">Expires At</span>
                          <span className="font-mono text-slate-300">{new Date(offer.expiresAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {offer.conditions && offer.conditions.length > 0 && (
                        <div className="text-[11px] text-slate-400 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                          <span className="text-slate-500 font-bold uppercase text-[9px] block mb-1">Entitlements:</span>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {offer.conditions.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-mono text-slate-500">OFFER ID: {offer.offerId}</div>
                      <div className="text-[10px] text-slate-400 mt-1">Issued by {(offer as any).issuedBy || "MarineWorld Enterprise Commercial desk"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: EXECUTED AGREEMENTS & DEAL DESK */}
        {/* ========================================================= */}
        {activeTab === "AGREEMENTS" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-3xl border border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Commercial Agreements & Lifecycle Activation
                </h3>
                <p className="text-xs text-slate-400 font-light mt-0.5">
                  Binding commercial contracts. Activation requires PAYMENT_CONFIRMED (via Stripe settlement or Google Cloud Marketplace entitlement active).
                </p>
              </div>
            </div>

            {agreements.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-500 text-xs">
                No commercial agreements currently executed.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {agreements.map((ag) => (
                  <div
                    key={ag.agreementId}
                    className="bg-slate-900 border border-slate-800 p-6 rounded-3xl transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                  >
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/80 px-2.5 py-1 rounded-lg border border-blue-800">
                          {ag.canonicalPropertyKey}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                            ag.contractStatus === "ACTIVE"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : ag.contractStatus === "PAYMENT_CONFIRMED"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              : ag.contractStatus === "PAYMENT_PENDING"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : ag.contractStatus === "EXPIRED"
                              ? "bg-slate-500/20 text-slate-300 border border-slate-500/30"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          CONTRACT: {ag.contractStatus}
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                          {ag.billingMethod === "GOOGLE_CLOUD_MARKETPLACE" ? (
                            <>
                              <Cloud className="w-3 h-3 text-blue-400" />
                              GOOGLE CLOUD MARKETPLACE
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-3 h-3 text-indigo-400" />
                              STRIPE DIRECT
                            </>
                          )}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-white">{ag.companyName} ({ag.companyId})</h4>
                        <div className="text-xs text-slate-400">
                          {ag.tier} Tier &bull; {ag.cityId.toUpperCase()} &bull; Region: {ag.regionCode}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-400 pt-1 border-t border-slate-800/80">
                        <div>
                          <span className="text-[10px] uppercase block font-bold text-slate-500">Annual Rate</span>
                          <span className="font-bold text-emerald-400 text-sm">
                            ${ag.annualRate.toLocaleString()} {ag.currency}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase block font-bold text-slate-500">Total Contract</span>
                          <span className="font-bold text-white text-sm">
                            ${ag.totalContractValue.toLocaleString()} {ag.currency}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase block font-bold text-slate-500">Term Dates</span>
                          <span className="font-mono text-slate-300">
                            {new Date(ag.startDate).toLocaleDateString()} &rarr; {new Date(ag.endDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase block font-bold text-slate-500">Provider Billing Ref</span>
                          <span className="font-mono text-[10px] text-slate-300 truncate block">
                            {ag.billingAgreementRef || ag.billingSubscriptionRef || ag.billingCustomerRef || "PENDING"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-2 shrink-0">
                      {ag.contractStatus === "PAYMENT_PENDING" && (
                        <button
                          onClick={() => handleConfirmPaymentWebhook(ag.agreementId)}
                          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md"
                        >
                          <Zap className="w-3.5 h-3.5" /> Confirm Payment / Entitlement
                        </button>
                      )}

                      {ag.contractStatus === "PAYMENT_CONFIRMED" && (
                        <button
                          onClick={() => handleActivateAgreement(ag.agreementId)}
                          className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Activate Agreement & Holding
                        </button>
                      )}

                      {ag.contractStatus === "ACTIVE" && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSuspendAgreement(ag.agreementId)}
                            className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-colors"
                          >
                            Suspend
                          </button>
                          <button
                            onClick={() => handleExpireAgreement(ag.agreementId)}
                            className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-colors"
                          >
                            Expire
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: DUAL BILLING RAILS & RECONCILIATION */}
        {/* ========================================================= */}
        {activeTab === "DUAL_BILLING" && (
          <div className="space-y-6">
            {/* BILLING KPI ROW */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Active ARR</div>
                <div className="text-xl font-mono font-bold text-white">
                  ${((billingSummary as any).totalAnnualRate || 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-400 font-medium">Contracted Annual Run Rate</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Contract Value</div>
                <div className="text-xl font-mono font-bold text-blue-400">
                  ${((billingSummary as any).totalContractValue || 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">Multi-Year Commitments</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Collected</div>
                <div className="text-xl font-mono font-bold text-emerald-400">
                  ${((billingSummary as any).totalPaidAmount || billingSummary.totalPaymentsReceived || 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-400 font-medium">{(billingSummary as any).paymentsCount || billingSummary.paidInvoicesCount || 0} Settled Payments</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Receivables</div>
                <div className="text-xl font-mono font-bold text-amber-400">
                  ${((billingSummary as any).outstandingBalance || billingSummary.totalOpenAmount || 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-amber-400 font-medium">{billingSummary.openInvoicesCount} Open Invoices</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-1 col-span-2 lg:col-span-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Renewals (180 Days)</div>
                <div className="text-xl font-mono font-bold text-purple-400">
                  {(billingSummary as any).upcomingRenewalsCount || billingSummary.renewalsDueCount || 0}
                </div>
                <div className="text-[10px] text-purple-400 font-medium">Agreements Approaching</div>
              </div>
            </div>

            {/* BILLING SUB-NAV */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
              <button
                onClick={() => setBillingSubTab("ALL")}
                className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${
                  billingSubTab === "ALL"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                Overview & Rails
              </button>
              <button
                onClick={() => setBillingSubTab("INVOICES")}
                className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${
                  billingSubTab === "INVOICES"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                Invoices ({invoices.length})
              </button>
              <button
                onClick={() => setBillingSubTab("PAYMENTS")}
                className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${
                  billingSubTab === "PAYMENTS"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                Payments Ledger ({payments.length})
              </button>
              <button
                onClick={() => setBillingSubTab("GOOGLE_CLOUD")}
                className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${
                  billingSubTab === "GOOGLE_CLOUD"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                Google Cloud SaaS ({googleCloudRecords.length})
              </button>
              <button
                onClick={() => setBillingSubTab("STRIPE")}
                className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${
                  billingSubTab === "STRIPE"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                Stripe Subscriptions ({stripeRecords.length})
              </button>
            </div>

            {/* SUBTAB CONTENT */}
            {billingSubTab === "ALL" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* GOOGLE CLOUD MARKETPLACE RECORDS */}
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                          <Cloud className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">Google Cloud Marketplace SaaS</h4>
                          <div className="text-[10px] text-slate-400 uppercase">Private Offers & Entitlements ({googleCloudRecords.length})</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Enterprise Rail
                      </span>
                    </div>

                    {googleCloudRecords.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-xs">No active Google Cloud billing records.</div>
                    ) : (
                      <div className="space-y-3">
                        {googleCloudRecords.map((gc: any) => (
                          <div key={gc.recordId || gc.agreementId} className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-blue-400 font-bold text-[11px]">{gc.agreementId}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                                {gc.entitlementStatus || gc.status || "ACTIVE"}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-slate-400 text-[11px]">
                              <div>Company: <strong className="text-slate-200">{gc.companyId}</strong></div>
                              <div>Billing Account: <strong className="text-slate-200">{gc.cloudBillingAccountId}</strong></div>
                              <div>Offer ID: <strong className="text-slate-200">{gc.privateOfferId}</strong></div>
                              <div>Usage Sync: <strong className="text-emerald-400 font-mono">{gc.lastUsageReportedAt ? new Date(gc.lastUsageReportedAt).toLocaleDateString() : "Active"}</strong></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* STRIPE CORPORATE SUBSCRIPTION RECORDS */}
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">Stripe Corporate Subscriptions</h4>
                          <div className="text-[10px] text-slate-400 uppercase">Recurring Invoicing ({stripeRecords.length})</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Direct Rail
                      </span>
                    </div>

                    {stripeRecords.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-xs">No active Stripe corporate subscriptions.</div>
                    ) : (
                      <div className="space-y-3">
                        {stripeRecords.map((st: any) => (
                          <div key={st.recordId || st.agreementId} className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-indigo-400 font-bold text-[11px]">{st.agreementId}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                                {st.subscriptionStatus || st.status || "ACTIVE"}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-slate-400 text-[11px]">
                              <div>Company: <strong className="text-slate-200">{st.companyId}</strong></div>
                              <div>Customer: <strong className="text-slate-200">{st.customerId}</strong></div>
                              <div>Subscription: <strong className="text-slate-200">{st.subscriptionId}</strong></div>
                              <div>Invoice Status: <strong className="text-emerald-400">{st.latestInvoiceStatus || "PAID"}</strong></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* RECENT INVOICES SUMMARY TABLE */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                      Recent Normalized Invoices Across All Tenants
                    </h4>
                    <button
                      onClick={() => setBillingSubTab("INVOICES")}
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      View All ({invoices.length}) <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                          <th className="py-2.5 px-3">Invoice Number</th>
                          <th className="py-2.5 px-3">Company</th>
                          <th className="py-2.5 px-3">Property Slot</th>
                          <th className="py-2.5 px-3">Rail</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Total</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {invoices.slice(0, 5).map((inv) => (
                          <tr key={inv.invoiceId} className="hover:bg-slate-950/40 transition-colors">
                            <td className="py-3 px-3 font-mono text-white font-bold">{inv.invoiceNumber}</td>
                            <td className="py-3 px-3 font-medium text-slate-200">{inv.companyId}</td>
                            <td className="py-3 px-3 font-mono text-[11px] text-blue-400">{inv.propertyKey}</td>
                            <td className="py-3 px-3">
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                {inv.billingMethod}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                  inv.status === "PAID"
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : inv.status === "OPEN"
                                    ? "bg-blue-500/20 text-blue-300"
                                    : "bg-rose-500/20 text-rose-300"
                                }`}
                              >
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-white">
                              ${inv.total.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => setSelectedInvoice(inv)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                              >
                                Inspect
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* FULL INVOICES SUBTAB */}
            {billingSubTab === "INVOICES" && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  All System Commercial Invoices ({invoices.length})
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                        <th className="py-2.5 px-3">Invoice Number</th>
                        <th className="py-2.5 px-3">Company ID</th>
                        <th className="py-2.5 px-3">Property Key</th>
                        <th className="py-2.5 px-3">Billing Method</th>
                        <th className="py-2.5 px-3">Issue Date</th>
                        <th className="py-2.5 px-3">Due Date</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {invoices.map((inv) => (
                        <tr key={inv.invoiceId} className="hover:bg-slate-950/40 transition-colors">
                          <td className="py-3 px-3 font-mono text-white font-bold">{inv.invoiceNumber}</td>
                          <td className="py-3 px-3 font-medium text-slate-200">{inv.companyId}</td>
                          <td className="py-3 px-3 font-mono text-[11px] text-blue-400">{inv.propertyKey}</td>
                          <td className="py-3 px-3">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {inv.billingMethod}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-400">{new Date(inv.issueDate).toLocaleDateString()}</td>
                          <td className="py-3 px-3 text-slate-400">{new Date(inv.dueDate).toLocaleDateString()}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                inv.status === "PAID"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : inv.status === "OPEN"
                                  ? "bg-blue-500/20 text-blue-300"
                                  : "bg-rose-500/20 text-rose-300"
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-white">
                            ${inv.total.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                            >
                              Inspect Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PAYMENTS SUBTAB */}
            {billingSubTab === "PAYMENTS" && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  All System Settled Payments ({payments.length})
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                        <th className="py-2.5 px-3">Payment ID</th>
                        <th className="py-2.5 px-3">Company</th>
                        <th className="py-2.5 px-3">Agreement ID</th>
                        <th className="py-2.5 px-3">Provider</th>
                        <th className="py-2.5 px-3">Paid Date</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {payments.map((p) => (
                        <tr key={p.paymentId} className="hover:bg-slate-950/40 transition-colors">
                          <td className="py-3 px-3 font-mono text-emerald-400 font-bold">{p.paymentId}</td>
                          <td className="py-3 px-3 font-medium text-slate-200">{p.companyId}</td>
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-400">{p.agreementId}</td>
                          <td className="py-3 px-3">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {p.provider}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-400">{new Date(p.paidAt).toLocaleDateString()}</td>
                          <td className="py-3 px-3">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                            ${p.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* GOOGLE CLOUD ONLY SUBTAB */}
            {billingSubTab === "GOOGLE_CLOUD" && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-blue-400" />
                  Google Cloud Marketplace SaaS Records ({googleCloudRecords.length})
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {googleCloudRecords.map((gc: any) => (
                    <div key={gc.recordId || gc.agreementId} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-mono text-blue-400 font-bold">{gc.agreementId}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300">
                          {gc.entitlementStatus || gc.status || "ACTIVE"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-slate-400 text-xs">
                        <div>Company ID: <strong className="text-slate-200">{gc.companyId}</strong></div>
                        <div>Billing Account: <strong className="text-slate-200">{gc.cloudBillingAccountId}</strong></div>
                        <div>Private Offer: <strong className="text-slate-200">{gc.privateOfferId}</strong></div>
                        <div>Org ID: <strong className="text-slate-200">{gc.cloudOrgId || "—"}</strong></div>
                        <div>Contact: <strong className="text-slate-200">{gc.cloudBillingContact || "—"}</strong></div>
                        <div>Order Ref: <strong className="text-slate-200">{gc.marketplaceOrderId || "—"}</strong></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STRIPE ONLY SUBTAB */}
            {billingSubTab === "STRIPE" && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  Stripe Corporate Subscription Records ({stripeRecords.length})
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stripeRecords.map((st: any) => (
                    <div key={st.recordId || st.agreementId} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-mono text-indigo-400 font-bold">{st.agreementId}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300">
                          {st.subscriptionStatus || st.status || "ACTIVE"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-slate-400 text-xs">
                        <div>Company ID: <strong className="text-slate-200">{st.companyId}</strong></div>
                        <div>Customer: <strong className="text-slate-200">{st.customerId}</strong></div>
                        <div>Subscription: <strong className="text-slate-200">{st.subscriptionId}</strong></div>
                        <div>Interval: <strong className="text-slate-200 uppercase">{st.billingInterval || "annual"}</strong></div>
                        <div>Price: <strong className="text-slate-200 font-mono">${(st.amount || 0).toLocaleString()} / {st.billingInterval || "yr"}</strong></div>
                        <div>Invoice: <strong className="text-emerald-400">{st.latestInvoiceStatus || "PAID"}</strong></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: MASTER INVENTORY MATRIX */}
        {/* ========================================================= */}
        {activeTab === "INVENTORY_PORTFOLIO" && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800 flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                <Search className="w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter by Slot ID, City, or Tenant Company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs text-white focus:outline-none placeholder:text-slate-500"
                />
              </div>

              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs font-medium text-slate-300"
              >
                <option value="ALL">All Sector Cities</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.domain}
                  </option>
                ))}
              </select>

              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs font-medium text-slate-300"
              >
                <option value="ALL">All Tiers</option>
                <option value="LANDMARK">Tier 1: Landmark</option>
                <option value="FLAGSHIP">Tier 2: Flagship</option>
                <option value="PRESENCE">Tier 3: Presence</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs font-medium text-slate-300"
              >
                <option value="ALL">All Commercial Statuses</option>
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="RESERVED">RESERVED</option>
                <option value="HELD">HELD</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((prop) => (
                <div
                  key={prop.canonicalPropertyKey}
                  className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold tracking-widest text-blue-400 uppercase bg-blue-950/80 px-2.5 py-1 rounded-lg border border-blue-800">
                        {prop.canonicalPropertyKey}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          prop.commercialStatus === "AVAILABLE"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : prop.commercialStatus === "ACTIVE"
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            : prop.commercialStatus === "RESERVED"
                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {prop.commercialStatus}
                      </span>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">
                        {prop.tier} &bull; {prop.regionCode}
                      </div>
                      <h4 className="text-sm font-bold text-white mt-0.5">{prop.propertyName}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">{prop.frontageDescription}</p>
                    </div>

                    {prop.tenantCompanyId ? (
                      <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 text-xs space-y-1">
                        <div className="text-[10px] font-bold uppercase text-slate-400">Current Occupant:</div>
                        <div className="font-semibold text-white">{prop.tenantCompanyName || prop.tenantCompanyId}</div>
                      </div>
                    ) : (
                      <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800/40 text-xs text-slate-500 italic">
                        No active commercial tenant
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400">${prop.price.toLocaleString()} {prop.currency}</span>
                    <span className="text-slate-500 text-[10px]">{prop.termOptions[0]?.termMonths || 12}M Standard</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: IMMUTABLE AUDIT LEDGER */}
        {/* ========================================================= */}
        {activeTab === "AUDIT_LEDGER" && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-blue-400" />
                Immutable Commercial Operations Audit Ledger
              </h3>
              <p className="text-xs text-slate-400 font-light mt-0.5">
                Every reservation intent, offer issuance, agreement execution, payment webhook, and activation event is logged permanently with verified deterministic event identifiers.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] border-b border-slate-800 font-bold">
                    <tr>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Event Type</th>
                      <th className="p-4">Actor</th>
                      <th className="p-4">Property Key</th>
                      <th className="p-4">Company</th>
                      <th className="p-4">State Transition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {auditLogs.map((log) => (
                      <tr key={log.auditId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-800 rounded font-bold">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4 text-slate-300">{log.actor}</td>
                        <td className="p-4 text-blue-400 font-bold">{(log as any).canonicalPropertyKey || (log as any).resourceKey || log.action}</td>
                        <td className="p-4 text-slate-300">{log.companyId}</td>
                        <td className="p-4 text-emerald-400">
                          {log.metadata?.previousStatus && log.metadata?.newStatus
                            ? `${log.metadata.previousStatus} → ${log.metadata.newStatus}`
                            : log.agreementId || "LOGGED"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* CREATE DEAL DESK OFFER MODAL */}
        {/* ========================================================= */}
        {isCreatingOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in font-sans">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Deal Desk: Issue Commercial Offer</h3>
                    <p className="text-xs text-slate-400">Generate an immutable commercial offer snapshot for tenant acceptance.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreatingOffer(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Canonical Property Key
                    </label>
                    <input
                      type="text"
                      value={offerPropertyKey}
                      onChange={(e) => setOfferPropertyKey(e.target.value)}
                      placeholder="e.g. NOR::GLOBAL::LM-01"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Tenant Company ID
                    </label>
                    <input
                      type="text"
                      value={offerCompanyId}
                      onChange={(e) => setOfferCompanyId(e.target.value)}
                      placeholder="e.g. argento-marine"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Annual Rate (USD)
                    </label>
                    <input
                      type="number"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Term (Months)
                    </label>
                    <select
                      value={offerTermMonths}
                      onChange={(e) => setOfferTermMonths(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={12}>12 Months</option>
                      <option value={24}>24 Months</option>
                      <option value={36}>36 Months</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Auto Renewal
                    </label>
                    <select
                      value={offerAutoRenew ? "true" : "false"}
                      onChange={(e) => setOfferAutoRenew(e.target.value === "true")}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Special Conditions & Entitlements (one per line)
                  </label>
                  <textarea
                    value={offerConditions}
                    onChange={(e) => setOfferConditions(e.target.value)}
                    rows={3}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingOffer(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleIssueOffer}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg flex items-center gap-2"
                >
                  <Send className="w-4 h-4" /> Issue Immutable Offer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* INVOICE INSPECTION MODAL */}
        {selectedInvoice && (
          <CommercialInvoiceModal
            invoice={selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
            onPaymentRecorded={() => handleRefresh()}
          />
        )}
      </main>
    </div>
  );
}
