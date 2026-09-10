import React, { useState } from "react";
import {
  Package,
  Wrench,
  Layers,
  ShieldCheck,
  Globe,
  Copy,
  Check,
  Building,
  Handshake,
  ExternalLink,
  Share2,
  Bookmark,
  CheckCircle2,
} from "lucide-react";
import type { CompanyOffering, CompanyProfile, CompanyEntity } from "@/lib/types";
import { SaveEntityButton } from "@/components/foundation/SaveEntityButton";
import { AddToCollectionButton } from "@/components/foundation/AddToCollectionButton";

interface OfferingEntityHeaderProps {
  offering: CompanyOffering;
  parentCompany: CompanyProfile | CompanyEntity;
  canonicalUrl: string;
  onOpenShare: () => void;
  onRequestOffer: () => void;
  onOpenRFQ: () => void;
}

export function OfferingEntityHeader({
  offering,
  parentCompany,
  canonicalUrl,
  onOpenShare,
  onRequestOffer,
  onOpenRFQ,
}: OfferingEntityHeaderProps) {
  const [copied, setCopied] = useState(false);
  const isProduct = offering.type?.toLowerCase() === "product" || !offering.type;
  const isService = offering.type?.toLowerCase() === "service";
  const TypeIcon = isProduct ? Package : isService ? Wrench : Layers;

  const companyDisplayName =
    parentCompany.displayName || (parentCompany as any).name || parentCompany.legalName || "MarineWorld Enterprise";
  const companySlug = (parentCompany as any).slug || parentCompany.id;

  const productRoute = isProduct
    ? `/products/${offering.slug || offering.id}`
    : `/services/${offering.slug || offering.id}`;

  const currentHost =
    typeof window !== "undefined" && window.location.host
      ? window.location.host
      : "marineworld.city";

  const currentOrigin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://marineworld.city";

  const publicShareableUrl = `${currentOrigin}${productRoute}`;
  const displayCanonicalUrl = `${currentHost}${productRoute}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicShareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const groundingStatus = offering.groundingStatus || "AI READY";

  return (
    <header className="bg-white border-b border-line">
      {/* Top Protocol & Sovereignty Banner */}
      <div className="border-b border-line/60 bg-canvas px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-stone">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-royal/10 text-royal font-bold border border-royal/20 uppercase tracking-wider text-[10px]">
              U-Commerce | EaaS
            </span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-graphite uppercase">
              {offering.sectorCity || "SHIPYARD.CITY"}
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-stone">
              {offering.industryDomain || "MARITIME SYSTEMS"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 text-[10px]">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>SOVEREIGN GROUNDED ENTITY</span>
            </div>
            <span className="hidden md:inline text-slate-400 font-normal">
              REF: {offering.code || offering.sku || `MW-${offering.id.slice(0, 8).toUpperCase()}`}
            </span>
          </div>
        </div>
      </div>

      {/* Main Entity Title & Actions Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Left: Identity & Hierarchy */}
          <div className="space-y-3 flex-1 min-w-0">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-canvas border border-line text-[11px] font-mono font-bold text-graphite uppercase tracking-wider">
                <TypeIcon className="w-3.5 h-3.5 text-royal" />
                {isProduct ? "INTERACTIVE SHOWROOM" : (offering.type?.toUpperCase() || "OFFERING")}
              </span>

              <span className="px-2.5 py-1 rounded-md bg-canvas border border-line text-[11px] font-mono text-stone">
                {offering.category}
              </span>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Handshake className="w-3 h-3 text-emerald-600" />
                VERIFIED OFFERING
              </span>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-graphite tracking-tight leading-tight">
                {offering.name}
              </h1>
            </div>

            {/* Parent company & verified credentials line */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-stone">
              <div className="flex items-center gap-1.5">
                <span className="text-stone">Authorized & Managed by</span>
                <a
                  href={`/companies/${companySlug}`}
                  className="font-bold text-graphite hover:text-royal transition inline-flex items-center gap-1 group"
                >
                  <Building className="w-3.5 h-3.5 text-royal" />
                  <span>{companyDisplayName}</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </div>

              <span className="text-slate-300 hidden sm:inline">&bull;</span>

              <div className="flex items-center gap-1.5 text-[11px] font-mono text-stone">
                <span className="text-slate-500">CANONICAL:</span>
                <a
                  href={productRoute}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-graphite hover:text-royal hover:underline transition inline-flex items-center gap-1 group"
                  title="Open canonical offering URL in new tab"
                >
                  <span>{displayCanonicalUrl}</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-royal transition-colors" />
                </a>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-1 hover:bg-canvas rounded text-stone hover:text-royal transition cursor-pointer"
                  title="Copy shareable offering URL"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
                {copied && (
                  <span className="text-[10px] font-mono text-emerald-600 font-bold ml-0.5">
                    COPIED
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Institutional Commercial Action Triggers */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start">
            <SaveEntityButton
              type={offering.type === "product" ? "product" : "service"}
              id={offering.id}
              companyId={parentCompany.id}
              businessId={parentCompany.businessId}
              variant="button"
              size="md"
            />

            <button
              type="button"
              onClick={onOpenShare}
              className="px-3.5 py-2 rounded-lg border border-line bg-white text-xs font-semibold text-stone hover:text-graphite hover:bg-canvas transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5 text-stone" />
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={onOpenRFQ}
              className="px-4 py-2 rounded-lg border border-line bg-white text-xs font-semibold text-graphite hover:bg-canvas transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span>Commercial RFQ</span>
            </button>

            <button
              type="button"
              onClick={onRequestOffer}
              className="px-5 py-2 rounded-lg bg-royal hover:bg-royal-dark text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <span>Request Official Offer</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
