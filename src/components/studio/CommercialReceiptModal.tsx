import React from "react";
import {
  CommercialInvoice,
  CommercialPayment,
} from "@/lib/services/commercialBillingService";
import { getCompanyRecordSync } from "@/lib/repositories/companyRepository";
import {
  X,
  CheckCircle2,
  Receipt,
  CreditCard,
  Cloud,
  Printer,
  Building2,
  Calendar,
  ShieldCheck,
  Globe,
} from "lucide-react";

export function CommercialReceiptModal({
  payment,
  invoice,
  onClose,
}: {
  payment: CommercialPayment;
  invoice?: CommercialInvoice;
  onClose: () => void;
}) {
  const isGcp = payment.provider === "GOOGLE_CLOUD_MARKETPLACE";
  const company = getCompanyRecordSync(payment.companyId);
  const legalName = company?.legalName || company?.displayName || "Enterprise Organization";
  const country = company?.country || "Global / Multi-Jurisdiction";
  const hq = company?.city
    ? `${company.city}, ${company.country}`
    : "Corporate Headquarters";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in font-sans text-slate-900">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* MODAL HEADER */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center border bg-emerald-50 text-emerald-600 border-emerald-200">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                  MARINEWORLD.CITY
                </span>
                <span className="text-slate-300">&bull;</span>
                <span className="text-[10px] font-mono font-bold tracking-wider text-emerald-600 uppercase">
                  PAYMENT RECEIPT
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight mt-0.5">
                Receipt for {payment.paymentId}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              {payment.status}
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
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* PAID AMOUNT HERO CARD */}
          <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-center space-y-1">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-emerald-800 bg-emerald-100 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Payment Settled Successfully
            </div>
            <div className="text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
              ${(payment.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
              <span className="text-sm font-semibold text-slate-500">{payment.currency || "USD"}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Settled on {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString(undefined, { dateStyle: "long" }) : payment.createdAt ? new Date(payment.createdAt).toLocaleDateString(undefined, { dateStyle: "long" }) : "Completed"}
            </p>
          </div>

          {/* CUSTOMER & INVOICE DETAILS */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Customer & Entity
              </span>
              <span className="font-bold text-slate-900 text-[11px]">{legalName}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Invoice Reference
              </span>
              <span className="font-mono font-bold text-blue-600 text-[11px]">
                {invoice?.invoiceNumber || (payment.invoiceId ? `INV-${payment.invoiceId.slice(-8).toUpperCase()}` : "N/A")}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Billing Domain
              </span>
              <span className="font-bold text-slate-800 text-[11px]">
                {payment.domain === "PLATFORM" ? "Platform Software Subscription" : "Digital Property Placement"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Payment Rail / Provider
              </span>
              <span className="font-semibold text-slate-800 text-[11px] flex items-center gap-1.5">
                {isGcp ? (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-blue-600" /> Google Cloud Marketplace
                  </>
                ) : (
                  <>
                    <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> Stripe Corporate Direct
                  </>
                )}
              </span>
            </div>
          </div>

          {/* PAYMENT METHOD & SETTLEMENT REFERENCE */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Settlement Instrument & Audit Trail
            </span>

            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Payment Method</span>
                <span className="font-semibold text-slate-800">
                  {isGcp
                    ? "Google Cloud Billing Account"
                    : `${(payment.paymentMethodBrand || "Card").toUpperCase()} •••• ${payment.paymentMethodLast4 || "4242"}`}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Transaction Reference</span>
                <span className="font-mono text-slate-700 truncate block">
                  {payment.providerPaymentId || payment.reference || "pi_confirmed"}
                </span>
              </div>
            </div>

            {payment.notes && (
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-light italic">
                {payment.notes}
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Verified Settlement Record</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" /> Print Receipt
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
