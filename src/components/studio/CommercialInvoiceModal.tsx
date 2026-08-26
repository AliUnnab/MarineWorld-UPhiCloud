import React from "react";
import {
  CommercialInvoice,
  CommercialPayment,
} from "@/lib/services/commercialBillingService";
import { getCompanyRecordSync } from "@/lib/repositories/companyRepository";
import {
  FileText,
  Download,
  ExternalLink,
  X,
  Building2,
  CheckCircle2,
  AlertCircle,
  Cloud,
  CreditCard,
  Calendar,
  DollarSign,
  ShieldCheck,
  Hash,
  Clock,
  Globe,
  MapPin,
  Briefcase,
  Layers,
  ArrowUpRight,
} from "lucide-react";

export function CommercialInvoiceModal({
  invoice,
  payments = [],
  onClose,
  onPaymentRecorded,
}: {
  invoice: CommercialInvoice;
  payments?: CommercialPayment[];
  onClose: () => void;
  onPaymentRecorded?: () => void;
}) {
  const isStripe = invoice.provider === "STRIPE";
  const isGcp = invoice.provider === "GOOGLE_CLOUD_MARKETPLACE";
  const isPlatform = invoice.domain === "PLATFORM";

  const company = getCompanyRecordSync(invoice.companyId);
  const legalName = company?.legalName || company?.displayName || "Enterprise Organization";
  const country = company?.country || "Global / Multi-Jurisdiction";
  const hq = company?.city
    ? `${company.city}, ${company.country}`
    : "Corporate Headquarters";

  const matchingPayment = payments.find((p) => p.invoiceId === invoice.invoiceId || p.agreementId === invoice.agreementId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in font-sans text-slate-900">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* MODAL HEADER */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                isGcp
                  ? "bg-royal/5 text-royal border-royal/20"
                  : "bg-royal/5 text-royal border-royal/20"
              }`}
            >
              {isGcp ? <Cloud className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                  MARINEWORLD.CITY
                </span>
                <span className="text-slate-300">&bull;</span>
                <span className="text-[10px] font-mono font-bold tracking-wider text-royal uppercase">
                  COMMERCIAL INVOICE
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight mt-0.5">
                {invoice.invoiceNumber}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                invoice.status === "PAID"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : invoice.status === "OPEN"
                  ? "bg-royal/5 text-royal border border-royal/20"
                  : invoice.status === "DRAFT"
                  ? "bg-slate-100 text-slate-600 border border-slate-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {invoice.status}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* PROVIDER NOTICE / STATUS BANNER */}
          {isGcp ? (
            <div className="p-4 rounded-2xl bg-royal/5 border border-royal/20 space-y-2">
              <div className="flex items-center justify-between text-royal-dark">
                <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-royal" /> SOURCE: GOOGLE CLOUD MARKETPLACE
                </span>
                <span className="font-mono text-[11px] font-semibold text-royal-dark">
                  BILLING STATUS: {invoice.status}
                </span>
              </div>
              <p className="text-[11px] text-royal-dark/80 font-light leading-relaxed">
                This transaction is an authorized Enterprise SaaS Private Offer billed directly through your Google Cloud Billing Account. Google Cloud Marketplace processes the consolidated invoice and disbursement.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-royal/15 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-sans">BILLING ACCOUNT:</span>
                  <span className="font-bold text-slate-800">{invoice.cloudBillingAccountReference || "01A2B3-45C6D7-89E0F1"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-sans">MARKETPLACE OFFER / ORDER:</span>
                  <span className="font-bold text-slate-800">{invoice.privateOfferReference || "gcp-po-2026-arg-lm01"}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-royal" /> SOURCE: STRIPE CORPORATE DIRECT
                </span>
                <div className="flex items-center gap-2">
                  {invoice.isSimulated && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-200 text-slate-700 font-bold uppercase">
                      Simulated Ledger
                    </span>
                  )}
                  <span className="font-mono text-[11px] font-semibold text-emerald-700">
                    BILLING STATUS: {invoice.status}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-light leading-relaxed">
                Vaulted Stripe corporate recurring invoice with direct payment settlement.
              </p>
            </div>
          )}

          {/* CUSTOMER & ISSUER METADATA GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-200">
            {/* Customer Column */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Customer & Legal Entity
              </span>
              <div className="font-bold text-slate-900 text-sm">{legalName}</div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{company?.displayName || legalName}</span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span>{country} &bull; {hq}</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1">
                Company ID: {invoice.companyId}
              </div>
            </div>

            {/* Issuer Column */}
            <div className="space-y-1.5 sm:border-l sm:border-slate-200 sm:pl-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Invoice Details
              </span>
              <div className="flex justify-between">
                <span className="text-slate-500">Billing Domain:</span>
                <span className="font-bold text-slate-900 uppercase">
                  {isPlatform ? "Platform Subscription" : "Digital Property Commercial"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Billing Provider:</span>
                <span className="font-bold text-slate-900">
                  {isGcp ? "Google Cloud Marketplace" : "Stripe"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Date:</span>
                <span className="font-mono text-slate-900">
                  {invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Due Date:</span>
                <span className="font-mono text-slate-900">
                  {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "-"}
                </span>
              </div>
            </div>
          </div>

          {/* PROPERTY SPECIFIC METADATA (FOR PROPERTY INVOICES) */}
          {!isPlatform && (
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Digital Property & Agreement Specification
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Canonical Property Key</span>
                  <span className="font-mono font-bold text-slate-900">{invoice.propertyKey}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Commercial Agreement ID</span>
                  <span className="font-mono font-semibold text-royal">{invoice.agreementId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Placement Tier</span>
                  <span className="font-bold text-slate-800">
                    {invoice.propertyKey.includes("LM") ? "LANDMARK" : invoice.propertyKey.includes("FS") ? "FLAGSHIP" : "PRESENCE"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* LINE ITEMS TABLE */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-slate-900">
                      {invoice.notes || (isPlatform ? "MarineWorld Enterprise Software Plan" : `Digital Real Estate Commercial Agreement (${invoice.propertyKey})`)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {isPlatform
                        ? "15 Seats, Parametric Digital Twin, AI Maritime Intelligence & Dedicated Advisor"
                        : `Commercial placement & editorial rights on ${invoice.propertyKey}`}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-600">
                    {invoice.periodStart ? new Date(invoice.periodStart).toLocaleDateString() : new Date(invoice.issueDate).toLocaleDateString()} &ndash;{" "}
                    {invoice.periodEnd ? new Date(invoice.periodEnd).toLocaleDateString() : new Date(new Date(invoice.issueDate).getTime() + 365 * 86400000).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                    ${invoice.subtotal.toLocaleString()} {invoice.currency}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* INVOICE TOTALS BREAKDOWN */}
            <div className="p-4 bg-slate-50/60 border-t border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold text-slate-800">
                  ${invoice.subtotal.toLocaleString()} {invoice.currency}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Tax (0.00% Corporate Reverse Charge / SaaS):</span>
                <span className="font-mono font-semibold text-slate-800">$0.00 {invoice.currency}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold pt-2 border-t border-slate-200 text-sm">
                <span>Total Invoice Amount:</span>
                <span className="font-mono text-royal">
                  ${invoice.total.toLocaleString()} {invoice.currency}
                </span>
              </div>
            </div>
          </div>

          {/* PAYMENT SETTLEMENT DETAILS */}
          {matchingPayment && (
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Settled Payment Transaction
                </span>
                <span className="font-mono text-[11px] font-bold text-emerald-800">
                  ${matchingPayment.amount.toLocaleString()} {matchingPayment.currency}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px]">Payment ID:</span>
                  <span className="font-mono font-semibold text-slate-800">{matchingPayment.paymentId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Settled At:</span>
                  <span className="font-mono text-slate-800">
                    {matchingPayment.paidAt ? new Date(matchingPayment.paidAt).toLocaleDateString() : "Settled"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span>Immutable Institutional Finance Ledger</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {invoice.pdfUrl && (
              <a
                href={invoice.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </a>
            )}

            {isGcp ? (
              <a
                href="https://console.cloud.google.com/marketplace"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-royal hover:bg-royal-dark text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                View Marketplace Offer <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : invoice.hostedInvoiceUrl ? (
              <a
                href={invoice.hostedInvoiceUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-royal hover:bg-royal-dark text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                View Invoice <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
