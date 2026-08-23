import React from "react";
import {
  FileText,
  Send,
  Building,
  ShieldCheck,
  Clock,
  Truck,
  Layers,
  HelpCircle,
  Share2,
  Lock,
} from "lucide-react";
import type { CompanyOffering, CompanyProfile, CompanyEntity } from "@/lib/types";

interface OfferingCommercialBarProps {
  offering: CompanyOffering;
  parentCompany: CompanyProfile | CompanyEntity;
  onRequestOffer: () => void;
  onOpenRFQ: () => void;
  onConnectCompany: () => void;
  onOpenShare: () => void;
}

export function OfferingCommercialBar({
  offering,
  parentCompany,
  onRequestOffer,
  onOpenRFQ,
  onConnectCompany,
  onOpenShare,
}: OfferingCommercialBarProps) {
  const comm = offering.commercialInformation || {};
  const incoterms = comm.incoterms || "FCA (Free Carrier)";
  const leadTime = comm.leadTime || "3–6 Weeks (Built to Order)";
  const availability = comm.availability || "Active Production Line";
  const minOrder = comm.minOrderQty || "1 Unit";
  const warranty = comm.warranty || "24-Month Marine Class Guarantee";

  return (
    <section className="bg-white rounded-xl border border-line p-6 sm:p-8 space-y-6 shadow-2xs">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-royal block">
            INSTITUTIONAL COMMERCIAL TERMS
          </span>
          <h2 className="text-xl font-bold text-graphite mt-0.5">Commercial Framework & Procurement</h2>
        </div>
        <span className="text-xs font-mono text-stone">B2B SOVEREIGN RECORD</span>
      </div>

      {/* Commercial Metadata Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 font-mono text-xs">
        <div className="p-3.5 rounded-xl bg-canvas border border-line/80 space-y-1">
          <span className="text-[10px] text-slate-500 block uppercase">INCOTERMS</span>
          <span className="font-bold text-graphite block truncate">{incoterms}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-canvas border border-line/80 space-y-1">
          <span className="text-[10px] text-slate-500 block uppercase">LEAD TIME</span>
          <span className="font-bold text-graphite block truncate">{leadTime}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-canvas border border-line/80 space-y-1">
          <span className="text-[10px] text-slate-500 block uppercase">STATUS</span>
          <span className="font-bold text-emerald-700 block truncate">{availability}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-canvas border border-line/80 space-y-1">
          <span className="text-[10px] text-slate-500 block uppercase">MIN SCOPE</span>
          <span className="font-bold text-graphite block truncate">{minOrder}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-canvas border border-line/80 space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[10px] text-slate-500 block uppercase">WARRANTY</span>
          <span className="font-bold text-graphite block truncate">{warranty}</span>
        </div>
      </div>

      {/* Pricing Guidance Note */}
      <div className="p-4 rounded-xl bg-slate-50 border border-line text-xs text-stone flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-royal shrink-0" />
          <span>
            <strong>Institutional Milestone Pricing:</strong> {comm.pricingGuidance || "Structured on custom engineering specifications, fleet volume, and delivery destination."}
          </span>
        </div>
        <span className="text-[10.5px] font-mono text-slate-500 shrink-0">NO INTERMEDIARY FEES</span>
      </div>

      {/* Primary Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
        <button
          type="button"
          onClick={onRequestOffer}
          className="p-3.5 rounded-xl bg-royal hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
        >
          <Send className="w-4 h-4" />
          <span>Request Official Offer</span>
        </button>

        <button
          type="button"
          onClick={onOpenRFQ}
          className="p-3.5 rounded-xl bg-graphite hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
        >
          <FileText className="w-4 h-4" />
          <span>Commercial RFQ</span>
        </button>

        <button
          type="button"
          onClick={onConnectCompany}
          className="p-3.5 rounded-xl border border-line bg-white hover:bg-canvas text-graphite font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
        >
          <Building className="w-4 h-4 text-royal" />
          <span>Connect with Company</span>
        </button>

        <button
          type="button"
          onClick={onOpenShare}
          className="p-3.5 rounded-xl border border-line bg-white hover:bg-canvas text-stone hover:text-graphite font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
        >
          <Share2 className="w-4 h-4 text-stone" />
          <span>Share Record</span>
        </button>
      </div>
    </section>
  );
}
