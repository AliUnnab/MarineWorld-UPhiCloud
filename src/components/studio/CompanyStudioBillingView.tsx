import React, { useState, useMemo } from "react";
import {
  CommercialInvoice,
  CommercialPayment,
  getCompanyInvoices,
  getCompanyPayments,
  getCompanyBillingSummary,
  getStripeBillingRecord,
  getGoogleCloudBillingRecord,
  getCompanyPaymentMethods,
  getDefaultPaymentMethod,
  setDefaultPaymentMethod,
  removePaymentMethod,
  StripePaymentMethodRecord,
  getCompanyContractualValue,
  getCompanyUnifiedBillingHistory,
} from "@/lib/services/commercialBillingService";
import {
  getCompanyCommercialAgreements,
  CommercialAgreement,
} from "@/lib/services/commercialPropertyService";
import {
  getCompanySubscription,
  getPlanByCode,
  getCompanyEntitlements,
} from "@/lib/services/companyOnboardingService";
import {
  getCompanyRecordSync,
  updateCompanyBillingConfig,
} from "@/lib/repositories/companyRepository";
import {
  Receipt,
  FileText,
  CreditCard,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Download,
  Filter,
  Search,
  Building2,
  ShieldCheck,
  RefreshCw,
  Layers,
  Calendar,
  DollarSign,
  ChevronRight,
  Sparkles,
  Lock,
  Eye,
  Settings,
  ArrowLeft,
  Briefcase,
  Plus,
  Trash2,
  Star,
  Zap,
  Globe,
  HelpCircle,
} from "lucide-react";
import { CommercialInvoiceModal } from "./CommercialInvoiceModal";
import { CommercialReceiptModal } from "./CommercialReceiptModal";
import { StripePaymentMethodModal } from "./StripePaymentMethodModal";
import { StripeCustomerPortalModal } from "./StripeCustomerPortalModal";

export type BillingSubView =
  | "OVERVIEW"
  | "PLATFORM_SUBSCRIPTION"
  | "COMMERCIAL_AGREEMENTS"
  | "INVOICES"
  | "PAYMENTS"
  | "PAYMENT_METHODS"
  | "AGREEMENT_DETAIL";

export function CompanyStudioBillingView({
  companyId,
  memberRole = "OWNER",
  userEmail = "authorized_finance_operator",
  initialSubView = "OVERVIEW",
  initialAgreementId,
  onNavigateToAgreement,
  onNavigateToPropertyEditor,
}: {
  companyId: string;
  memberRole?: string;
  userEmail?: string;
  initialSubView?: BillingSubView | string;
  initialAgreementId?: string;
  onNavigateToAgreement?: (agreementId: string) => void;
  onNavigateToPropertyEditor?: (propertyKey: string) => void;
}) {
  // Normalize initial view
  const normalizedInitialView: BillingSubView = useMemo(() => {
    if (initialAgreementId) return "AGREEMENT_DETAIL";
    if (initialSubView === "SUBSCRIPTION" || initialSubView === "subscriptions" || initialSubView === "PLATFORM_SUBSCRIPTION") {
      return "PLATFORM_SUBSCRIPTION";
    }
    if (initialSubView === "METHODS" || initialSubView === "payment-methods" || initialSubView === "PAYMENT_METHODS") {
      return "PAYMENT_METHODS";
    }
    if (initialSubView === "AGREEMENTS" || initialSubView === "agreements" || initialSubView === "COMMERCIAL_AGREEMENTS") {
      return "COMMERCIAL_AGREEMENTS";
    }
    if (initialSubView === "INVOICES" || initialSubView === "invoices") return "INVOICES";
    if (initialSubView === "PAYMENTS" || initialSubView === "payments") return "PAYMENTS";
    return "OVERVIEW";
  }, [initialSubView, initialAgreementId]);

  const [activeSubView, setActiveSubView] = useState<BillingSubView>(normalizedInitialView);
  const [selectedAgreementId, setSelectedAgreementId] = useState<string | null>(
    initialAgreementId || null
  );
  const [selectedInvoice, setSelectedInvoice] = useState<CommercialInvoice | null>(null);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<CommercialPayment | null>(null);

  // Modals state
  const [isAddPaymentMethodOpen, setIsAddPaymentMethodOpen] = useState(false);
  const [paymentMethodPurpose, setPaymentMethodPurpose] = useState<
    "PLATFORM_SUBSCRIPTION" | "COMMERCIAL_AGREEMENT" | "GENERAL"
  >("PLATFORM_SUBSCRIPTION");
  const [paymentMethodAgreementId, setPaymentMethodAgreementId] = useState<string | undefined>(undefined);
  const [paymentMethodPropertyKey, setPaymentMethodPropertyKey] = useState<string | undefined>(undefined);
  const [isCustomerPortalOpen, setIsCustomerPortalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterProvider, setFilterProvider] = useState<string>("ALL");
  const [filterDomain, setFilterDomain] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Company Profile Information
  const companyRecord = getCompanyRecordSync(companyId);
  const [cloudBillingAccount, setCloudBillingAccount] = useState(
    companyRecord?.cloudBillingAccountId || "01A2B3-45C6D7-89E0F1"
  );
  const [cloudOrgId, setCloudOrgId] = useState(
    companyRecord?.cloudBillingOrganizationId || "organizations/4820019200"
  );

  const canModifyBilling = memberRole === "OWNER" || memberRole === "ADMIN";

  // Data fetching (Strict Tenant Scoping)
  const canonicalSubscription = getCompanySubscription(companyId);
  const companyPlan = getPlanByCode(canonicalSubscription?.planCode || "GROWTH");
  const companyEntitlements = getCompanyEntitlements(companyId);

  // All commercial agreements for company
  const allAgreements = useMemo(() => {
    return getCompanyCommercialAgreements(companyId);
  }, [companyId, refreshTrigger]);

  // Valid active / confirmed agreements (ignoring draft reservations / deals)
  const validAgreements = useMemo(() => {
    const validStatuses = [
      "ACCEPTED",
      "CONTRACT_PENDING",
      "PAYMENT_PENDING",
      "PAYMENT_CONFIRMED",
      "ACTIVE",
    ];
    return allAgreements.filter((ag) => validStatuses.includes(ag.contractStatus));
  }, [allAgreements]);

  const invoices = useMemo(() => {
    return getCompanyInvoices(companyId);
  }, [companyId, refreshTrigger]);

  const payments = useMemo(() => {
    return getCompanyPayments(companyId);
  }, [companyId, refreshTrigger]);

  const paymentMethods = useMemo(() => {
    return getCompanyPaymentMethods(companyId);
  }, [companyId, refreshTrigger]);

  const defaultPaymentMethod = useMemo(() => {
    return getDefaultPaymentMethod(companyId);
  }, [companyId, refreshTrigger]);

  const billingSummary = useMemo(() => {
    return getCompanyBillingSummary(companyId, allAgreements);
  }, [companyId, allAgreements, refreshTrigger]);

  const contractualValue = useMemo(() => {
    return getCompanyContractualValue(companyId);
  }, [companyId, refreshTrigger]);

  // Unified Chronological History Ledger
  const unifiedHistory = useMemo(() => {
    interface HistoryItem {
      id: string;
      date: string;
      domain: "PLATFORM" | "PROPERTY";
      type: "INVOICE" | "PAYMENT" | "MARKETPLACE_ORDER";
      provider: "STRIPE" | "GOOGLE_CLOUD_MARKETPLACE";
      reference: string;
      description: string;
      amount: number;
      currency: string;
      status: string;
      rawInvoice?: CommercialInvoice;
      rawPayment?: CommercialPayment;
    }

    const items: HistoryItem[] = [];

    // Invoices
    invoices.forEach((inv) => {
      items.push({
        id: `hist-inv-${inv.invoiceId}`,
        date: inv.issueDate,
        domain: inv.domain || (inv.propertyKey === "PLATFORM_SUBSCRIPTION" ? "PLATFORM" : "PROPERTY"),
        type: "INVOICE",
        provider: inv.provider,
        reference: inv.invoiceNumber,
        description: inv.notes || (inv.domain === "PLATFORM" ? "Platform Software Subscription" : `Real Estate Lease (${inv.propertyKey})`),
        amount: inv.total,
        currency: inv.currency,
        status: inv.status,
        rawInvoice: inv,
      });
    });

    // Payments
    payments.forEach((pmt) => {
      items.push({
        id: `hist-pmt-${pmt.paymentId}`,
        date: pmt.paidAt || pmt.createdAt,
        domain: pmt.domain || (pmt.propertyKey === "PLATFORM_SUBSCRIPTION" ? "PLATFORM" : "PROPERTY"),
        type: "PAYMENT",
        provider: pmt.provider,
        reference: pmt.paymentId,
        description: pmt.reference || "Invoice Settlement",
        amount: pmt.amount,
        currency: pmt.currency,
        status: pmt.status,
        rawPayment: pmt,
      });
    });

    // Sort descending by date
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, payments]);

  // Selected Agreement for Detail View
  const selectedAgreement = useMemo(() => {
    if (!selectedAgreementId) return null;
    return validAgreements.find((ag) => ag.agreementId === selectedAgreementId) || null;
  }, [selectedAgreementId, validAgreements]);

  // Handlers for Stripe payment method mutations
  const handleSetDefaultPaymentMethod = (pmId: string) => {
    if (!canModifyBilling) return;
    const res = setDefaultPaymentMethod(companyId, pmId, memberRole);
    if (res.success) {
      setRefreshTrigger((prev) => prev + 1);
      setActionFeedback("Default payment method updated successfully.");
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const handleRemovePaymentMethod = (pmId: string) => {
    if (!canModifyBilling) return;
    const res = removePaymentMethod(companyId, pmId, memberRole);
    if (res.success) {
      setRefreshTrigger((prev) => prev + 1);
      setActionFeedback("Payment method removed from vault.");
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const openAddPaymentMethodForSubscription = () => {
    setPaymentMethodPurpose("PLATFORM_SUBSCRIPTION");
    setPaymentMethodAgreementId(undefined);
    setPaymentMethodPropertyKey(undefined);
    setIsAddPaymentMethodOpen(true);
  };

  const openAddPaymentMethodForAgreement = (agreement: CommercialAgreement) => {
    setPaymentMethodPurpose("COMMERCIAL_AGREEMENT");
    setPaymentMethodAgreementId(agreement.agreementId);
    setPaymentMethodPropertyKey(agreement.canonicalPropertyKey);
    setIsAddPaymentMethodOpen(true);
  };

  const openAddPaymentMethodGeneral = () => {
    setPaymentMethodPurpose("GENERAL");
    setPaymentMethodAgreementId(undefined);
    setPaymentMethodPropertyKey(undefined);
    setIsAddPaymentMethodOpen(true);
  };

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return (invoices || []).filter((inv) => {
      if (!inv) return false;
      const invoiceNumber = inv.invoiceNumber || "";
      const propertyKey = inv.propertyKey || "";
      const notes = inv.notes || "";
      const q = (searchQuery || "").toLowerCase();

      const matchesSearch =
        q === "" ||
        invoiceNumber.toLowerCase().includes(q) ||
        propertyKey.toLowerCase().includes(q) ||
        notes.toLowerCase().includes(q);

      const matchesProvider =
        filterProvider === "ALL" || inv.provider === filterProvider;

      const matchesDomain =
        filterDomain === "ALL" ||
        inv.domain === filterDomain ||
        (filterDomain === "PLATFORM" && propertyKey === "PLATFORM_SUBSCRIPTION") ||
        (filterDomain === "PROPERTY" && propertyKey !== "PLATFORM_SUBSCRIPTION");

      const matchesStatus =
        filterStatus === "ALL" || inv.status === filterStatus;

      return matchesSearch && matchesProvider && matchesDomain && matchesStatus;
    });
  }, [invoices, searchQuery, filterProvider, filterDomain, filterStatus]);

  // Platform Invoices
  const platformInvoices = useMemo(() => {
    return (invoices || []).filter(
      (i) => i && (i.domain === "PLATFORM" || i.propertyKey === "PLATFORM_SUBSCRIPTION")
    );
  }, [invoices]);

  // Property Invoices
  const propertyInvoices = useMemo(() => {
    return (invoices || []).filter(
      (i) => i && (i.domain === "PROPERTY" || i.propertyKey !== "PLATFORM_SUBSCRIPTION")
    );
  }, [invoices]);

  return (
    <div className="space-y-8 animate-fade-in font-sans text-slate-900">
      {/* 1. INSTITUTIONAL TOP BAR & CONTEXT */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-slate-400">
              MARINEWORLD FINANCE CENTER
            </span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-blue-600">
              {companyRecord?.displayName || "Enterprise Organization"}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Billing, Invoicing & Corporate Payments
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl font-light leading-relaxed">
            Institutional management for canonical software platform plans, digital property lease agreements, and dual-rail settlement via Stripe and Google Cloud Marketplace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsCustomerPortalOpen(true)}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-2xs"
          >
            <CreditCard className="w-3.5 h-3.5 text-slate-600" />
            <span>Manage Stripe Billing</span>
          </button>

          {canModifyBilling && (
            <button
              onClick={openAddPaymentMethodGeneral}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Payment Method</span>
            </button>
          )}
        </div>
      </div>

      {/* ACTION FEEDBACK TOAST */}
      {actionFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 text-xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{actionFeedback}</span>
        </div>
      )}

      {/* 2. CANONICAL NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => {
            setActiveSubView("OVERVIEW");
            setSelectedAgreementId(null);
          }}
          className={`px-4 py-3 text-xs font-bold rounded-t-xl transition flex items-center gap-2 whitespace-nowrap border-b-2 ${
            activeSubView === "OVERVIEW"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>OVERVIEW</span>
        </button>

        <button
          onClick={() => {
            setActiveSubView("PLATFORM_SUBSCRIPTION");
            setSelectedAgreementId(null);
          }}
          className={`px-4 py-3 text-xs font-bold rounded-t-xl transition flex items-center gap-2 whitespace-nowrap border-b-2 ${
            activeSubView === "PLATFORM_SUBSCRIPTION"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>PLATFORM SUBSCRIPTION</span>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-blue-50 text-blue-700 font-mono">
            Active
          </span>
        </button>

        <button
          onClick={() => {
            setActiveSubView("COMMERCIAL_AGREEMENTS");
            setSelectedAgreementId(null);
          }}
          className={`px-4 py-3 text-xs font-bold rounded-t-xl transition flex items-center gap-2 whitespace-nowrap border-b-2 ${
            activeSubView === "COMMERCIAL_AGREEMENTS"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>COMMERCIAL AGREEMENTS</span>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-slate-100 text-slate-700 font-mono">
            {validAgreements.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveSubView("INVOICES");
            setSelectedAgreementId(null);
          }}
          className={`px-4 py-3 text-xs font-bold rounded-t-xl transition flex items-center gap-2 whitespace-nowrap border-b-2 ${
            activeSubView === "INVOICES"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>INVOICES</span>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-slate-100 text-slate-700 font-mono">
            {invoices.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveSubView("PAYMENTS");
            setSelectedAgreementId(null);
          }}
          className={`px-4 py-3 text-xs font-bold rounded-t-xl transition flex items-center gap-2 whitespace-nowrap border-b-2 ${
            activeSubView === "PAYMENTS"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>PAYMENTS</span>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-slate-100 text-slate-700 font-mono">
            {payments.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveSubView("PAYMENT_METHODS");
            setSelectedAgreementId(null);
          }}
          className={`px-4 py-3 text-xs font-bold rounded-t-xl transition flex items-center gap-2 whitespace-nowrap border-b-2 ${
            activeSubView === "PAYMENT_METHODS"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>PAYMENT METHODS & CLOUD ACCOUNTS</span>
        </button>

        {activeSubView === "AGREEMENT_DETAIL" && selectedAgreement && (
          <button
            className="px-4 py-3 text-xs font-bold rounded-t-xl transition flex items-center gap-2 whitespace-nowrap border-b-2 border-indigo-600 text-indigo-700 bg-white"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>AGREEMENT DETAIL ({selectedAgreement.canonicalPropertyKey})</span>
          </button>
        )}
      </div>

      {/* 3. TAB 1: OVERVIEW */}
      {activeSubView === "OVERVIEW" && (
        <div className="space-y-8">
          {/* SUMMARY CARDS GRID - Institutional Light UI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Platform Plan */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  PLATFORM PLAN
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {contractualValue?.platformSubscriptionStatus || "ACTIVE"}
                </span>
              </div>
              <div>
                <div className="text-base font-bold text-slate-900">
                  {contractualValue?.platformPlanName || "AI-Native Growth"}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 font-mono">
                  ${(contractualValue?.platformAnnualValue ?? 10788).toLocaleString()} USD / year &bull; Stripe
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Next Renewal:</span>
                <span className="font-mono text-slate-800 font-semibold">
                  {contractualValue?.nextRenewalDate
                    ? new Date(contractualValue.nextRenewalDate).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "18 Aug 2027"}
                </span>
              </div>
            </div>

            {/* Card 2: Active Property Agreements */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  PROPERTY AGREEMENTS
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                  {contractualValue?.propertyAgreementsCount ?? 0} Active
                </span>
              </div>
              <div>
                <div className="text-base font-bold text-slate-900 font-mono">
                  ${(contractualValue?.propertyAnnualValue ?? 0).toLocaleString()} USD
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Annual Real Estate Commitment
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Total Contract Value:</span>
                <span className="font-mono text-slate-800 font-semibold truncate max-w-[140px]">
                  ${(contractualValue?.totalContractualValue ?? (contractualValue?.platformAnnualValue ?? 0) + (contractualValue?.propertyAnnualValue ?? 0)).toLocaleString()} / yr
                </span>
              </div>
            </div>

            {/* Card 3: Next Payment */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  NEXT SCHEDULED PAYMENT
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                  Auto-Debited
                </span>
              </div>
              <div>
                <div className="text-base font-bold text-slate-900">
                  $10,788.00 USD
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Due 18 Aug 2027 &bull; Annual Renewal
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Last Payment:</span>
                <span className="font-mono text-emerald-700 font-semibold">$10,788.00 (18 Aug 2026)</span>
              </div>
            </div>

            {/* Card 4: Outstanding Balance */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  OUTSTANDING BALANCE
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Settled
                </span>
              </div>
              <div>
                <div className="text-base font-bold text-emerald-700">
                  $0.00 USD
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  All accounts in good standing
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Compliance:</span>
                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Fully Verified
                </span>
              </div>
            </div>
          </div>

          {/* DUAL DOMAIN HIGHLIGHT PANELS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* DOMAIN A: PLATFORM SUBSCRIPTION SUMMARY */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      DOMAIN A: PLATFORM SUBSCRIPTION
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    {companyPlan.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-light">
                    Canonical MarineWorld organization software license & entitlements.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Annual Rate</span>
                  <span className="font-mono font-bold text-slate-900">$10,788 / year</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Seats / Capacity</span>
                  <span className="font-bold text-slate-900">15 Active Seats</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Billing Method</span>
                  <span className="font-semibold text-slate-900">Stripe Auto-Pay</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-6 rounded bg-slate-900 text-white font-mono font-bold text-[10px] flex items-center justify-center">
                    VISA
                  </div>
                  <div>
                    <span className="font-mono font-bold text-slate-800">Visa ending in •••• 4242</span>
                    <span className="text-[11px] text-slate-500 block">Default Organization Payment Instrument</span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveSubView("PLATFORM_SUBSCRIPTION")}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  Details <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* DOMAIN B: COMMERCIAL REAL ESTATE AGREEMENTS SUMMARY */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      DOMAIN B: DIGITAL REAL ESTATE
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    Commercial Property Agreements
                  </h3>
                  <p className="text-xs text-slate-500 font-light">
                    Independent real estate leases across Sector Cities.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {validAgreements.length} Agreement{validAgreements.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-2.5">
                {validAgreements.map((ag) => (
                  <div
                    key={ag.agreementId}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">
                          {ag.canonicalPropertyKey}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                          {ag.tier}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {ag.billingMethod === "GOOGLE_CLOUD_MARKETPLACE" ? "Google Cloud Marketplace" : "Stripe Billing"} &bull; ${(ag.annualRate ?? 0).toLocaleString()}/yr
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedAgreementId(ag.agreementId);
                        setActiveSubView("AGREEMENT_DETAIL");
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition"
                    >
                      View Agreement
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">Total Property Commitment:</span>
                <span className="font-mono font-bold text-slate-900">
                  ${validAgreements.reduce((acc, a) => acc + (a.annualRate || 0), 0).toLocaleString()} USD / yr
                </span>
              </div>
            </div>
          </div>

          {/* UNIFIED CHRONOLOGICAL BILLING HISTORY TABLE */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Unified Chronological Billing History
                </h3>
                <p className="text-xs text-slate-500 font-light mt-0.5">
                  Consolidated ledger across Platform and Property billing domains.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveSubView("INVOICES")}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  All Invoices
                </button>
                <button
                  onClick={() => setActiveSubView("PAYMENTS")}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  All Payments
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Domain</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Reference / Description</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unifiedHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3.5 font-mono text-slate-600 whitespace-nowrap">
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            item.domain === "PLATFORM"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          }`}
                        >
                          {item.domain}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-700 whitespace-nowrap">
                        {item.type}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          {item.provider === "GOOGLE_CLOUD_MARKETPLACE" ? (
                            <>
                              <Cloud className="w-3.5 h-3.5 text-blue-600" /> Google Cloud
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> Stripe
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 font-mono text-[11px]">
                          {item.reference}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {item.description}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        ${(item.amount ?? 0).toLocaleString()} {item.currency || "USD"}
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            item.status === "PAID" || item.status === "SUCCEEDED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : item.status === "OPEN"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {item.rawPayment && (
                            <button
                              onClick={() => setSelectedPaymentForReceipt(item.rawPayment!)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                            >
                              <Receipt className="w-3 h-3 text-slate-500" />
                              <span>Receipt</span>
                            </button>
                          )}
                          {item.rawInvoice ? (
                            <button
                              onClick={() => setSelectedInvoice(item.rawInvoice!)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition"
                            >
                              Invoice
                            </button>
                          ) : !item.rawPayment ? (
                            <span className="text-slate-400 font-mono text-[11px]">Settled</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: PLATFORM SUBSCRIPTION */}
      {activeSubView === "PLATFORM_SUBSCRIPTION" && (
        <div className="space-y-8">
          {/* PRIMARY PLATFORM PLAN CARD - Light Institutional Architecture */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    CANONICAL COMPANY PLAN
                  </span>
                  <span className="text-slate-300">&bull;</span>
                  <span className="text-xs font-semibold text-slate-600">
                    Software Subscription Domain
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {companyPlan.name}
                </h2>
                <p className="text-xs text-slate-500 max-w-xl font-light">
                  Enterprise platform software plan empowering digital twin configuration, maritime intelligence copilot, and global sector access.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ACTIVE
                </span>
              </div>
            </div>

            {/* SUBSCRIPTION ATTRIBUTES GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Annual Commitment</span>
                <span className="font-mono font-bold text-slate-900 text-sm">$10,788 USD</span>
                <span className="text-[11px] text-slate-500 block">Billed annually ($899/mo)</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Next Renewal</span>
                <span className="font-mono font-bold text-slate-900 text-sm">18 Aug 2027</span>
                <span className="text-[11px] text-slate-500 block">Annual auto-renewal</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Workspace Seats</span>
                <span className="font-bold text-slate-900 text-sm">15 Active Seats</span>
                <span className="text-[11px] text-slate-500 block">Unlimited viewers</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Billing Engine Rail</span>
                <span className="font-bold text-slate-900 text-sm">Stripe Recurring</span>
                <span className="text-[11px] text-slate-500 block">Direct PCI Vault</span>
              </div>
            </div>

            {/* PAYMENT METHOD STRIP & ACTIONS */}
            <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-8 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center">
                  VISA
                </div>
                <div>
                  <div className="font-mono font-bold text-slate-900 text-xs">
                    Corporate Visa ending in •••• 4242
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Auto-debited on annual anniversary renewal &bull; Expires 08/2029
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {canModifyBilling && (
                  <button
                    onClick={openAddPaymentMethodForSubscription}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                    <span>Update Payment Method</span>
                  </button>
                )}

                <button
                  onClick={() => setIsCustomerPortalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <span>Manage Subscription</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* INCLUDED WORKSPACE CAPABILITIES */}
            <div className="pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-3">
                Included Organization Entitlements
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {companyPlan.includedCapabilities.map((capability, i) => (
                  <div
                    key={i}
                    className="p-3 bg-white rounded-xl border border-slate-200 flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-slate-700 font-medium">{capability.replace(/_/g, " ")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PLATFORM SUBSCRIPTION INVOICES */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Platform Subscription Invoices
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Invoice Number</th>
                    <th className="px-4 py-3">Billing Period</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {platformInvoices.map((inv) => (
                    <tr key={inv.invoiceId} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3.5 text-slate-600 font-mono">
                        {inv.periodStart ? new Date(inv.periodStart).toLocaleDateString() : new Date(inv.issueDate).toLocaleDateString()} &ndash;{" "}
                        {inv.periodEnd ? new Date(inv.periodEnd).toLocaleDateString() : new Date(new Date(inv.issueDate).getTime() + 365 * 86400000).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800">Stripe Recurring</td>
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900">${(inv.total ?? 0).toLocaleString()} {inv.currency || "USD"}</td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                        >
                          View Invoice
                        </button>
                        {inv.pdfUrl && (
                          <a
                            href={inv.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> PDF
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 3: COMMERCIAL AGREEMENTS */}
      {activeSubView === "COMMERCIAL_AGREEMENTS" && (
        <div className="space-y-8">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Active Commercial Real Estate Agreements
                </h2>
                <p className="text-xs text-slate-500 font-light mt-0.5">
                  Official lease contracts for digital real estate across Sector Cities.
                </p>
              </div>

              <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full font-mono text-xs font-bold border border-slate-200">
                {validAgreements.length} Active Agreement{validAgreements.length !== 1 ? "s" : ""}
              </span>
            </div>

            {validAgreements.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Building2 className="w-10 h-10 mx-auto text-slate-300" />
                <p className="font-semibold text-slate-700">No active commercial agreements.</p>
                <p className="text-xs">Browse the Sector City Entrance or Deal Desk to reserve digital properties.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {validAgreements.map((ag) => (
                  <div
                    key={ag.agreementId}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-base text-slate-900">
                            {ag.canonicalPropertyKey}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                            {ag.tier}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {ag.contractStatus}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          Sector City: <span className="font-semibold text-slate-800">{ag.cityId.toUpperCase()}</span> &bull; Region: <span className="font-semibold text-slate-800">{ag.regionCode}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-mono font-bold text-slate-900">
                          ${(ag.annualRate ?? 0).toLocaleString()} USD / yr
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Term: {ag.termMonths} Months ({new Date(ag.startDate).getFullYear()} - {new Date(ag.endDate).getFullYear()})
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-medium">Billing Rail:</span>
                        {ag.billingMethod === "GOOGLE_CLOUD_MARKETPLACE" ? (
                          <span className="font-semibold text-blue-700 flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                            <Cloud className="w-3.5 h-3.5 text-blue-600" />
                            Google Cloud Marketplace Private Offer
                          </span>
                        ) : (
                          <span className="font-semibold text-indigo-700 flex items-center gap-1.5 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                            <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                            Stripe Corporate Direct Invoicing
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {ag.billingMethod === "STRIPE" && canModifyBilling && (
                          <button
                            onClick={() => openAddPaymentMethodForAgreement(ag)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                          >
                            Update Card
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedAgreementId(ag.agreementId);
                            setActiveSubView("AGREEMENT_DETAIL");
                          }}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-2xs"
                        >
                          Agreement Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. TAB 4: INVOICES */}
      {activeSubView === "INVOICES" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Canonical Corporate Invoices
                </h2>
                <p className="text-xs text-slate-500 font-light mt-0.5">
                  Audited invoices for software subscriptions and digital property agreements.
                </p>
              </div>

              {/* SEARCH & FILTERS */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search invoices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition w-44"
                  />
                </div>

                <select
                  value={filterDomain}
                  onChange={(e) => setFilterDomain(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Domains</option>
                  <option value="PLATFORM">Platform Subscription</option>
                  <option value="PROPERTY">Property Commercial</option>
                </select>

                <select
                  value={filterProvider}
                  onChange={(e) => setFilterProvider(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Providers</option>
                  <option value="STRIPE">Stripe</option>
                  <option value="GOOGLE_CLOUD_MARKETPLACE">Google Cloud</option>
                </select>
              </div>
            </div>

            {/* INVOICE LEDGER TABLE */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Invoice Number</th>
                    <th className="px-4 py-3">Domain</th>
                    <th className="px-4 py-3">Description / Agreement</th>
                    <th className="px-4 py-3">Provider Rail</th>
                    <th className="px-4 py-3">Issue Date</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.invoiceId} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            inv.domain === "PLATFORM"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          }`}
                        >
                          {inv.domain}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">
                          {inv.domain === "PLATFORM" ? "Platform Software Subscription" : inv.propertyKey}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {inv.notes || "Commercial invoice"}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          {inv.provider === "GOOGLE_CLOUD_MARKETPLACE" ? (
                            <>
                              <Cloud className="w-3.5 h-3.5 text-blue-600" /> Google Cloud
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> Stripe
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-600 whitespace-nowrap">
                        {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-600 whitespace-nowrap">
                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        ${(inv.total ?? 0).toLocaleString()} {inv.currency || "USD"}
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            inv.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : inv.status === "OPEN"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                        >
                          View Invoice
                        </button>
                        {inv.pdfUrl && (
                          <a
                            href={inv.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> PDF
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB 5: PAYMENTS */}
      {activeSubView === "PAYMENTS" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Canonical Corporate Payments
                </h2>
                <p className="text-xs text-slate-500 font-light mt-0.5">
                  Immutable settlement logs across all commercial rails.
                </p>
              </div>

              <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full font-mono text-xs font-bold border border-slate-200">
                {payments.length} Settled Payment{payments.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Payment ID</th>
                    <th className="px-4 py-3">Invoice Reference</th>
                    <th className="px-4 py-3">Domain</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Paid Date</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((pmt) => (
                    <tr key={pmt.paymentId} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {pmt.paymentId}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-blue-600 whitespace-nowrap">
                        {pmt.invoiceId || "Direct Settlement"}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            pmt.domain === "PLATFORM"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          }`}
                        >
                          {pmt.domain}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          {pmt.provider === "GOOGLE_CLOUD_MARKETPLACE" ? (
                            <>
                              <Cloud className="w-3.5 h-3.5 text-blue-600" /> Google Cloud
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> Stripe
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-600 whitespace-nowrap">
                        {pmt.paidAt ? new Date(pmt.paidAt).toLocaleDateString() : pmt.createdAt ? new Date(pmt.createdAt).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        ${(pmt.amount ?? 0).toLocaleString()} {pmt.currency || "USD"}
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {pmt.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedPaymentForReceipt(pmt)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                          >
                            <Receipt className="w-3 h-3 text-slate-500" />
                            <span>Receipt</span>
                          </button>
                          {pmt.invoiceId && (
                            <button
                              onClick={() => {
                                const matchingInv = invoices.find((i) => i.invoiceId === pmt.invoiceId);
                                if (matchingInv) setSelectedInvoice(matchingInv);
                              }}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition"
                            >
                              Invoice
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 8. TAB 6: PAYMENT METHODS & CLOUD ACCOUNTS */}
      {activeSubView === "PAYMENT_METHODS" && (
        <div className="space-y-8">
          {/* SECTION 1: STRIPE CORPORATE DIRECT CARD VAULT */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    RAIL 1: STRIPE CORPORATE DIRECT
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Vaulted Payment Instruments
                </h2>
                <p className="text-xs text-slate-500 font-light">
                  Tokenized credit cards and automated settlement instruments powered by Stripe.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsCustomerPortalOpen(true)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Stripe Customer Portal</span>
                </button>

                {canModifyBilling && (
                  <button
                    onClick={openAddPaymentMethodGeneral}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Corporate Card</span>
                  </button>
                )}
              </div>
            </div>

            {/* PAYMENT METHODS LIST */}
            <div className="space-y-3">
              {paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-9 rounded-xl bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center uppercase tracking-wider">
                      {pm.brand}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          •••• •••• •••• {pm.last4}
                        </span>
                        {pm.isDefault && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                            Default Organization Method
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-600 font-mono">
                          {pm.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500">
                        Expires {String(pm.expMonth).padStart(2, "0")}/{pm.expYear} &bull; {pm.cardholderName || companyRecord?.displayName} &bull; <span className="font-mono text-[11px] text-slate-400">{pm.id}</span>
                      </div>
                    </div>
                  </div>

                  {canModifyBilling && (
                    <div className="flex items-center gap-2">
                      {!pm.isDefault && (
                        <button
                          onClick={() => handleSetDefaultPaymentMethod(pm.id)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                        >
                          Make Default
                        </button>
                      )}

                      {paymentMethods.length > 1 && (
                        <button
                          onClick={() => handleRemovePaymentMethod(pm.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                          title="Remove Card from Vault"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* SECURITY & PCI GUARANTEE */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3 text-xs text-slate-600">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">PCI DSS Level 1 Certified Tokenization</span>
                <span className="font-light leading-relaxed">
                  MarineWorld operates under a strict zero-knowledge card data policy. Sensitive Primary Account Numbers (PAN) and CVC codes are tokenized directly via Stripe Elements into Level-1 PCI compliant vaults.
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: GOOGLE CLOUD MARKETPLACE CLOUD BILLING CARD */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    RAIL 2: GOOGLE CLOUD MARKETPLACE
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Google Cloud Marketplace Billing Account
                </h2>
                <p className="text-xs text-slate-500 font-light">
                  Direct billing against your organization's Google Cloud commitment and consolidated invoices.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="https://console.cloud.google.com/billing"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
                >
                  <span>View Cloud Billing</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <a
                  href="https://console.cloud.google.com/marketplace"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <span>View Marketplace Offer</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* GCP BILLING ACCOUNT SPECIFICATIONS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Cloud Billing Account</span>
                <span className="font-mono font-bold text-slate-900 text-xs">{cloudBillingAccount}</span>
                <span className="text-[11px] text-slate-500 block">Authorized Enterprise Account</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Google Cloud Organization</span>
                <span className="font-mono font-bold text-slate-900 text-xs">{cloudOrgId}</span>
                <span className="text-[11px] text-slate-500 block">Verified Parent Organization</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Marketplace Private Offer</span>
                <span className="font-mono font-bold text-slate-900 text-xs">gcp-po-2026-arg-lm01</span>
                <span className="text-[11px] text-emerald-700 font-semibold block">Accepted & Entitled</span>
              </div>
            </div>

            {/* INSTITUTIONAL GCP CONSOLE NOTICE */}
            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between text-blue-900 font-bold">
                <span className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-blue-600" />
                  Direct Google Cloud Invoicing & Drawdown
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800 border border-blue-300">
                  NO CREDIT CARD REQUIRED
                </span>
              </div>
              <p className="text-slate-600 font-light leading-relaxed">
                When digital property placements or software subscriptions are provisioned via Google Cloud Marketplace Private Offers, payment is processed automatically through your consolidated Google Cloud invoice. No separate credit card input or payment authorization is required inside MarineWorld.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 9. SUB-VIEW: AGREEMENT DETAIL */}
      {activeSubView === "AGREEMENT_DETAIL" && selectedAgreement && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setActiveSubView("COMMERCIAL_AGREEMENTS");
                setSelectedAgreementId(null);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Agreements
            </button>

            <span className="font-mono text-xs text-slate-500 font-semibold">
              Agreement ID: {selectedAgreement.agreementId}
            </span>
          </div>

          {/* AGREEMENT HEADER CARD */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    DIGITAL REAL ESTATE AGREEMENT
                  </span>
                  <span className="text-slate-300">&bull;</span>
                  <span className="text-xs font-semibold text-slate-600">
                    {selectedAgreement.cityId.toUpperCase()} &bull; {selectedAgreement.regionCode}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {selectedAgreement.canonicalPropertyKey}
                </h2>
                <p className="text-xs text-slate-500 font-light">
                  {selectedAgreement.notes || "Commercial lease agreement for digital property placement."}
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                {selectedAgreement.contractStatus}
              </span>
            </div>

            {/* AGREEMENT SPECIFICATIONS GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Annual Commitment</span>
                <span className="font-mono font-bold text-slate-900 text-sm">${(selectedAgreement.annualRate ?? 0).toLocaleString()} USD</span>
                <span className="text-[11px] text-slate-500 block">Billed annually</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Contract Term</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{selectedAgreement.termMonths} Months</span>
                <span className="text-[11px] text-slate-500 block">{new Date(selectedAgreement.startDate).toLocaleDateString()} &ndash; {new Date(selectedAgreement.endDate).toLocaleDateString()}</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Placement Tier</span>
                <span className="font-bold text-blue-600 text-sm">{selectedAgreement.tier}</span>
                <span className="text-[11px] text-slate-500 block">Sector City Showroom</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Billing Provider</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selectedAgreement.billingMethod === "GOOGLE_CLOUD_MARKETPLACE" ? "Google Cloud" : "Stripe"}
                </span>
                <span className="text-[11px] text-slate-500 block">{selectedAgreement.billingMethod}</span>
              </div>
            </div>

            {/* PAYMENT RAIL SPECIFIC FOR THIS AGREEMENT */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  Payment Instrument & Billing Configuration
                </span>

                {selectedAgreement.billingMethod === "STRIPE" && canModifyBilling && (
                  <button
                    onClick={() => openAddPaymentMethodForAgreement(selectedAgreement)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                  >
                    Change Card
                  </button>
                )}
              </div>

              {selectedAgreement.billingMethod === "STRIPE" ? (
                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-7 rounded bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center">
                      VISA
                    </div>
                    <div>
                      <div className="font-mono font-bold text-slate-900">
                        Corporate Visa ending in •••• 4242
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Auto-debited on annual agreement anniversary
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                    VAULTED
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-1">
                  <div className="font-bold text-blue-900 flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-blue-600" /> Google Cloud Marketplace Private Offer Order
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Billed directly against Google Cloud Billing Account <span className="font-mono font-semibold">{selectedAgreement.billingCustomerRef || "01A2B3-45C6D7-89E0F1"}</span> under Entitlement <span className="font-mono font-semibold">{selectedAgreement.billingSubscriptionRef || "ent-mw-argento-482001"}</span>.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* AGREEMENT INVOICE LEDGER */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Invoices for this Agreement
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Invoice Number</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices
                    .filter((inv) => inv.agreementId === selectedAgreement.agreementId)
                    .map((inv) => (
                      <tr key={inv.invoiceId} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 text-slate-600 font-mono">{new Date(inv.issueDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{inv.provider}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">${(inv.total ?? 0).toLocaleString()} {inv.currency || "USD"}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                          >
                            View Invoice
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

      {/* 10. MODALS */}
      {/* A. Corporate Commercial Invoice Modal */}
      {selectedInvoice && (
        <CommercialInvoiceModal
          invoice={selectedInvoice}
          payments={payments}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* A2. Corporate Commercial Receipt Modal */}
      {selectedPaymentForReceipt && (
        <CommercialReceiptModal
          payment={selectedPaymentForReceipt}
          invoice={invoices.find((i) => i.invoiceId === selectedPaymentForReceipt.invoiceId)}
          onClose={() => setSelectedPaymentForReceipt(null)}
        />
      )}

      {/* B. Add Corporate Payment Method Modal (SetupIntent flow) */}
      {isAddPaymentMethodOpen && (
        <StripePaymentMethodModal
          companyId={companyId}
          companyName={companyRecord?.displayName || "Enterprise Organization"}
          memberRole={memberRole}
          billingPurpose={paymentMethodPurpose}
          agreementId={paymentMethodAgreementId}
          agreementPropertyKey={paymentMethodPropertyKey}
          onSuccess={(pm) => {
            setIsAddPaymentMethodOpen(false);
            setRefreshTrigger((prev) => prev + 1);
            setActionFeedback(`Payment method (${pm.brand.toUpperCase()} •••• ${pm.last4}) saved successfully.`);
            setTimeout(() => setActionFeedback(null), 3500);
          }}
          onClose={() => setIsAddPaymentMethodOpen(false)}
        />
      )}

      {/* C. Stripe Customer Portal Modal */}
      {isCustomerPortalOpen && (
        <StripeCustomerPortalModal
          companyId={companyId}
          companyName={companyRecord?.displayName || "Enterprise Organization"}
          memberRole={memberRole}
          customerId="cus_argento_corp_01"
          onOpenAddPaymentMethod={() => {
            setIsCustomerPortalOpen(false);
            openAddPaymentMethodGeneral();
          }}
          onClose={() => setIsCustomerPortalOpen(false)}
        />
      )}
    </div>
  );
}
