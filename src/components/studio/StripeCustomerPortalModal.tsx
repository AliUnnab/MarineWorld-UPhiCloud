import React, { useState } from "react";
import {
  ExternalLink,
  X,
  CreditCard,
  ShieldCheck,
  FileText,
  Building2,
  CheckCircle2,
  ArrowUpRight,
  Clock,
  Download,
  Receipt,
  Sparkles,
  Lock,
} from "lucide-react";
import {
  getCompanyPaymentMethods,
  getCompanyInvoices,
  StripePaymentMethodRecord,
} from "@/lib/services/commercialBillingService";

interface StripeCustomerPortalModalProps {
  companyId: string;
  companyName: string;
  memberRole: string;
  customerId?: string;
  onClose: () => void;
  onOpenAddPaymentMethod?: () => void;
}

export function StripeCustomerPortalModal({
  companyId,
  companyName,
  memberRole,
  customerId = "cus_argento_corp_01",
  onClose,
  onOpenAddPaymentMethod,
}: StripeCustomerPortalModalProps) {
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "PAYMENT_METHODS" | "INVOICES" | "TAX_INFO">("OVERVIEW");
  const paymentMethods = getCompanyPaymentMethods(companyId);
  const platformInvoices = getCompanyInvoices(companyId).filter((i) => i.domain === "PLATFORM" || i.billingMethod === "STRIPE");

  const [taxId, setTaxId] = useState("EU-VAT-TR98200192");
  const [billingAddress, setBillingAddress] = useState("Levent Financial District, Tower 4, Istanbul, Turkey");
  const [savedTaxNotice, setSavedTaxNotice] = useState(false);

  const isOwnerOrAdmin = memberRole === "OWNER" || memberRole === "ADMIN";

  const handleSaveTaxInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwnerOrAdmin) return;
    setSavedTaxNotice(true);
    setTimeout(() => setSavedTaxNotice(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in font-sans text-slate-900">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* HEADER */}
        <div className="bg-slate-50/80 text-slate-900 p-6 border-b border-slate-200 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                  STRIPE BILLING PORTAL
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                  PORTAL SESSION
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight mt-0.5">
                Stripe Customer Billing Portal
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {companyName} &bull; Customer Reference: <span className="font-mono text-slate-700 font-semibold">{customerId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PORTAL NAVIGATION TABS */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50/60 px-6 gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("OVERVIEW")}
            className={`py-3.5 border-b-2 transition ${
              activeTab === "OVERVIEW"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Subscription Overview
          </button>
          <button
            onClick={() => setActiveTab("PAYMENT_METHODS")}
            className={`py-3.5 border-b-2 transition ${
              activeTab === "PAYMENT_METHODS"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Payment Methods ({paymentMethods.length})
          </button>
          <button
            onClick={() => setActiveTab("INVOICES")}
            className={`py-3.5 border-b-2 transition ${
              activeTab === "INVOICES"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Invoices & Receipts
          </button>
          <button
            onClick={() => setActiveTab("TAX_INFO")}
            className={`py-3.5 border-b-2 transition ${
              activeTab === "TAX_INFO"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Tax & Legal Entity
          </button>
        </div>

        {/* PORTAL BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
          {activeTab === "OVERVIEW" && (
            <div className="space-y-6">
              {/* CURRENT ACTIVE PLAN */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase font-bold text-blue-600 tracking-wider">
                      Authoritative Software Plan
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">
                      AI-Native Growth Plan
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-light">
                      Annual recurring corporate subscription with 15 seats and AI Advisor.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200/80">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Interval</span>
                    <span className="font-semibold text-slate-800">Annual Billing</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Rate</span>
                    <span className="font-mono font-bold text-slate-900">$10,788.00 / year</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Next Renewal</span>
                    <span className="font-mono text-slate-800 font-semibold">18 Aug 2027</span>
                  </div>
                </div>
              </div>

              {/* DEFAULT CARD PREVIEW */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-8 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center">
                    VISA
                  </div>
                  <div>
                    <div className="font-mono font-bold text-slate-900">
                      Corporate Visa ending in •••• 4242
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Auto-renews subscription &bull; Expires 08/2029
                    </div>
                  </div>
                </div>
                {isOwnerOrAdmin && (
                  <button
                    onClick={onOpenAddPaymentMethod}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Change Method
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === "PAYMENT_METHODS" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">Vaulted Payment Instruments</h3>
                {isOwnerOrAdmin && (
                  <button
                    onClick={onOpenAddPaymentMethod}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Add New Card
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {paymentMethods.map((pm) => (
                  <div
                    key={pm.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between hover:border-slate-300 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-8 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center uppercase">
                        {pm.brand}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">
                            •••• •••• •••• {pm.last4}
                          </span>
                          {pm.isDefault && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Expires {String(pm.expMonth).padStart(2, "0")}/{pm.expYear} &bull; {pm.cardholderName || companyName}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{pm.id}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "INVOICES" && (
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 text-sm">Stripe Invoicing Ledger</h3>
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Invoice Number</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {platformInvoices.map((inv) => (
                      <tr key={inv.invoiceId} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 text-slate-500">{new Date(inv.issueDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">${inv.total.toLocaleString()} {inv.currency}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <a
                            href={inv.pdfUrl || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "TAX_INFO" && (
            <form onSubmit={handleSaveTaxInfo} className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Tax / VAT Registration ID
                  </label>
                  <input
                    type="text"
                    disabled={!isOwnerOrAdmin}
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Official Registered Billing Address
                  </label>
                  <input
                    type="text"
                    disabled={!isOwnerOrAdmin}
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {savedTaxNotice && (
                  <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Tax information saved to Stripe customer record.</span>
                  </div>
                )}

                {isOwnerOrAdmin && (
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    Update Tax Information
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" /> Authorized Stripe Customer Portal Link
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
          >
            Return to Studio
          </button>
        </div>
      </div>
    </div>
  );
}
