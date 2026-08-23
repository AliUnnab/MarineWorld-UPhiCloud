import React from "react";
import {
  Building,
  ShieldCheck,
  MapPin,
  ExternalLink,
  Layers,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { CompanyProfile, CompanyEntity } from "@/lib/types";

interface OfferingParentCompanyBoxProps {
  parentCompany: CompanyProfile | CompanyEntity;
  sectorCity?: string;
  onConnectCompany: () => void;
}

export function OfferingParentCompanyBox({
  parentCompany,
  sectorCity,
  onConnectCompany,
}: OfferingParentCompanyBoxProps) {
  const companyDisplayName =
    parentCompany.displayName || (parentCompany as any).name || parentCompany.legalName || "MarineWorld Enterprise";
  const companySlug = (parentCompany as any).slug || parentCompany.id;
  const businessId = parentCompany.businessId || `MW-ENT-${parentCompany.id.slice(0, 6).toUpperCase()}`;
  const headquarters = (parentCompany as any).headquarters || (parentCompany as any).location || "Global Marine Hub";
  const city = sectorCity || parentCompany.sectorCityIds?.[0] || (parentCompany as any).cityIds?.[0] || "Shipyard";

  return (
    <section className="bg-white rounded-xl border border-line p-6 sm:p-7 space-y-4 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-canvas border border-line flex items-center justify-center text-royal font-mono font-bold text-base shadow-2xs">
            <Building className="w-6 h-6 text-royal" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone">
                PROVIDED BY
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>VERIFIED ENTERPRISE</span>
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-graphite mt-0.5">
              {companyDisplayName}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onConnectCompany}
            className="px-3.5 py-2 rounded-lg border border-line bg-canvas hover:bg-white text-xs font-semibold text-graphite transition cursor-pointer"
          >
            Direct Connect
          </button>
          <a
            href={`/companies/${companySlug}`}
            className="px-4 py-2 rounded-lg bg-royal hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs group"
          >
            <span>View Company Page</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-stone">
        <div className="p-3 rounded-lg bg-canvas border border-line/60">
          <span className="text-[10px] text-slate-500 block">BUSINESS REGISTRY ID:</span>
          <span className="font-bold text-graphite">{businessId}</span>
        </div>
        <div className="p-3 rounded-lg bg-canvas border border-line/60">
          <span className="text-[10px] text-slate-500 block">HEADQUARTERS:</span>
          <span className="font-bold text-graphite truncate block">{headquarters}</span>
        </div>
        <div className="p-3 rounded-lg bg-canvas border border-line/60">
          <span className="text-[10px] text-slate-500 block">SECTOR CITY HUB:</span>
          <span className="font-bold text-royal uppercase truncate block">{city}</span>
        </div>
      </div>
    </section>
  );
}
