import React, { useState } from "react";
import { ArrowUpRight, CheckCircle2, Globe2, Award, Package, Building2, FileText, Wrench } from "lucide-react";
import type { CompanyOffering, CompanyProfile } from "@/lib/types";
import { SaveEntityButton } from "@/components/foundation/SaveEntityButton";
import { formatAvatarInitials } from "@/lib/registry";

export interface UnifiedOfferingCardProps {
  offering: CompanyOffering;
  company: CompanyProfile;
  isFeatured?: boolean;
  layout?: "horizontal" | "vertical";
  onClick: () => void;
  index?: number;
}

export function UnifiedOfferingCard({
  offering,
  company,
  isFeatured = false,
  layout,
  onClick,
  index = 0,
}: UnifiedOfferingCardProps) {
  const [imageError, setImageError] = useState(false);

  const displayName = company.displayName || company.name || "Company Node";
  const initials = formatAvatarInitials(company.initials, displayName);

  // Determine offering type for bookmarking
  const offeringType: "product" | "service" =
    offering.type === "service" || offering.id?.startsWith("serv-")
      ? "service"
      : "product";

  // Determine sector city label
  const rawCityId = (Array.isArray(company.sectorCityIds) && company.sectorCityIds[0]) || 
                    (Array.isArray(company.cityIds) && company.cityIds[0]) || 
                    "supplychain";
  const primarySectorCityId = typeof rawCityId === "string" ? rawCityId : "supplychain";
  const sectorCityLabel = primarySectorCityId.toLowerCase().endsWith(".city")
    ? primarySectorCityId.toUpperCase()
    : `${primarySectorCityId.toUpperCase()}.CITY`;

  // Determine real image / document source
  const rawImage =
    (offering as any).coverImage ||
    (offering as any).primaryImage ||
    (offering as any).imageUrl ||
    offering.mediaReferences?.find((m: any) => m.isCover)?.url ||
    offering.mediaReferences?.find((m: any) => m.type !== "drawing" && !m.url?.toLowerCase().includes(".pdf"))?.url ||
    offering.mediaReferences?.[0]?.url ||
    (offering as any).media?.find((m: any) => m.isCover)?.url ||
    (offering as any).media?.find((m: any) => m.type !== "drawing" && !m.url?.toLowerCase().includes(".pdf"))?.url ||
    (offering as any).media?.[0]?.url ||
    (Array.isArray((offering as any).gallery)
      ? typeof (offering as any).gallery[0] === "string"
        ? (offering as any).gallery[0]
        : (offering as any).gallery[0]?.url
      : undefined) ||
    (Array.isArray((offering as any).images)
      ? typeof (offering as any).images[0] === "string"
        ? (offering as any).images[0]
        : (offering as any).images[0]?.url
      : undefined) ||
    "";

  const isPdf = Boolean(rawImage && rawImage.toLowerCase().includes(".pdf"));
  const hasValidImage = Boolean(rawImage && !isPdf);

  // Price Calculation
  const priceVal = offering.price || offering.commercialInformation?.price;
  const currencyVal = offering.currency || offering.commercialInformation?.currency || "USD";
  const pricingType = offering.commercialInformation?.pricingType;
  const pricingGuidance = offering.commercialInformation?.pricingGuidance;

  let formattedPrice: string | null = null;
  if (priceVal) {
    const symbol = currencyVal === "EUR" ? "€" : currencyVal === "TRY" ? "₺" : currencyVal === "GBP" ? "£" : "$";
    const formattedAmount = priceVal.includes("$") || priceVal.includes("€") || priceVal.includes("₺") || priceVal.includes("£")
      ? priceVal
      : `${symbol}${priceVal}`;
    if (pricingType === "STARTING_FROM") {
      formattedPrice = `From ${formattedAmount}`;
    } else {
      formattedPrice = formattedAmount;
    }
  } else if (pricingGuidance) {
    formattedPrice = pricingGuidance;
  }

  // Standard reference ID
  const refCode = offering.code || `REF-${offering.id?.slice(-6).toUpperCase() || "100101"}`;

  // Decide effective layout: explicit layout or isFeatured
  const isHorizontal = layout === "horizontal" || (isFeatured && layout !== "vertical");

  // =========================================================================
  // HORIZONTAL / HERO FEATURED CARD LAYOUT (BÜYÜK UZUN YATAY KART)
  // =========================================================================
  if (isHorizontal) {
    return (
      <article
        onClick={onClick}
        className="group relative flex flex-col md:flex-row w-full rounded-2xl bg-white border border-line shadow-2xs hover:border-royal/50 hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer font-sans min-h-[380px]"
      >
        {/* 1. Large Image Container (Left side on desktop ~60% width) */}
        <div className="relative w-full md:w-[58%] lg:w-[62%] shrink-0 min-h-[280px] md:min-h-[400px] bg-slate-950 overflow-hidden border-b md:border-b-0 md:border-r border-line flex items-center justify-center">
          {isPdf ? (
            <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-8 text-center group-hover:bg-slate-850 transition-colors">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3.5 shadow-inner group-hover:scale-105 transition-transform">
                <FileText className="w-8 h-8" />
              </div>
              <p className="font-bold text-sm text-white uppercase tracking-wider max-w-[85%] truncate mb-1.5">
                {offering.name}
              </p>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-950/80 border border-rose-800/60 font-mono text-[10px] font-extrabold text-rose-400 uppercase tracking-widest shadow-sm">
                PDF BLUEPRINT & SPECIFICATION
              </span>
            </div>
          ) : hasValidImage && !imageError ? (
            <img
              src={rawImage}
              alt={offering.name}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-400">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
                {offeringType === "service" ? <Wrench className="w-7 h-7" /> : <Package className="w-7 h-7" />}
              </div>
              <p className="font-bold text-xs text-slate-300 uppercase tracking-wider max-w-[85%] truncate">
                {offering.name}
              </p>
              <span className="font-mono text-[9px] text-slate-500 mt-1 uppercase">
                {offeringType === "service" ? "SERVICE SPECIFICATION" : "PRODUCT SPECIFICATION"}
              </span>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-slate-950/20 pointer-events-none" />

          {/* Top Badges */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 z-10">
            {/* Availability Badge */}
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50/95 border border-emerald-200/90 px-3 py-1.5 text-xs font-mono font-bold text-emerald-800 shadow-sm backdrop-blur-md pointer-events-none">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="uppercase tracking-wider">
                {offering.status ? `VERIFIED ${offering.status}` : "VERIFIED AVAILABLE"}
              </span>
            </span>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-brass-soft border border-brass-border text-brass-dark px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider shadow-sm backdrop-blur-md pointer-events-none">
                <Award className="w-3.5 h-3.5 text-brass-dark shrink-0" />
                <span>FEATURED</span>
              </span>

              <div className="relative z-10" onClick={(e) => e.stopPropagation()}>
                <SaveEntityButton
                  type={offeringType}
                  id={offering.id}
                  companyId={company.id}
                  variant="icon"
                  size="sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Content Details (Right side on desktop) */}
        <div className="p-6 sm:p-8 flex flex-col justify-between flex-1 space-y-4">
          <div className="space-y-2">
            {/* Category & Price Row */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-xs font-bold text-royal uppercase tracking-wider font-mono">
                {offeringType === "service" ? (
                  <Wrench className="w-4 h-4 text-royal shrink-0" />
                ) : (
                  <Package className="w-4 h-4 text-royal shrink-0" />
                )}
                <span className="truncate">{offering.category || offering.type || "Commercial Offering"}</span>
              </div>

              {formattedPrice && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200/90 text-emerald-800 font-mono text-xs font-bold shadow-2xs">
                  <span className="text-[10px] text-emerald-600 uppercase font-semibold">PRICE:</span>
                  <span>{formattedPrice}</span>
                </div>
              )}
            </div>

            {/* Title */}
            <h3 className="text-2xl sm:text-3xl font-bold text-graphite tracking-tight group-hover:text-royal transition-colors leading-tight">
              {offering.name}
            </h3>

            {/* Ref Code */}
            <div className="text-xs font-mono text-stone font-semibold">
              {refCode}
            </div>

            {/* Description */}
            <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 pt-1">
              {offering.shortDescription || offering.detailedDescription || `Verified commercial offering provided directly by ${displayName}.`}
            </p>
          </div>

          {/* Meta Grid (2 columns) */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-canvas border border-line text-xs font-sans">
            <div>
              <span className="text-[9.5px] font-bold uppercase text-stone tracking-wider block mb-1">
                SECTOR NODE
              </span>
              <span className="font-bold text-royal flex items-center gap-1 text-xs truncate">
                <Globe2 className="w-3.5 h-3.5 text-royal shrink-0" />
                <span className="truncate">{sectorCityLabel}</span>
              </span>
            </div>

            <div>
              <span className="text-[9.5px] font-bold uppercase text-stone tracking-wider block mb-1">
                VERIFICATION
              </span>
              <span className="font-bold text-emerald-800 flex items-center gap-1 text-xs truncate">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Audit Verified</span>
              </span>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 border-t border-line/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-canvas border border-line font-mono text-[10px] font-bold text-slate-700 uppercase">
                {initials}
              </div>
              <span className="text-xs font-semibold text-slate-700 truncate max-w-[140px] sm:max-w-[180px]">
                {displayName}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-royal text-white px-4 py-2 text-xs font-bold transition-colors cursor-pointer shadow-xs font-sans shrink-0"
            >
              <span>Explore Offering</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </article>
    );
  }

  // =========================================================================
  // VERTICAL / STANDARD CATALOG CARD LAYOUT (KATALOG KARTI FOR SLIDER ROW)
  // =========================================================================
  return (
    <article
      onClick={onClick}
      className="group relative flex flex-col justify-between rounded-xl bg-white overflow-hidden transition-all duration-200 border border-line shadow-2xs hover:border-royal/60 hover:shadow-md cursor-pointer font-sans h-full min-w-[280px] sm:min-w-[310px] max-w-[340px]"
    >
      {/* 1. Image Header Section */}
      <div className="relative w-full aspect-[16/10] bg-slate-950 overflow-hidden border-b border-line flex items-center justify-center">
        {isPdf ? (
          <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-4 text-center group-hover:bg-slate-850 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-2 shadow-inner group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <p className="font-bold text-xs text-white uppercase tracking-wider max-w-[90%] truncate mb-1">
              {offering.name}
            </p>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800/60 font-mono text-[8.5px] font-extrabold text-rose-400 uppercase tracking-widest">
              PDF BLUEPRINT
            </span>
          </div>
        ) : hasValidImage && !imageError ? (
          <img
            src={rawImage}
            alt={offering.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-400">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mb-1.5 shadow-inner">
              {offeringType === "service" ? <Wrench className="w-5 h-5" /> : <Package className="w-5 h-5" />}
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 max-w-[90%] truncate">
              {offering.name}
            </span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-transparent pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50/95 border border-emerald-200/90 px-2.5 py-1 text-[10px] font-mono font-bold text-emerald-800 shadow-2xs backdrop-blur-xs pointer-events-none">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="uppercase tracking-wider">
              {offering.status ? `VERIFIED ${offering.status}` : "VERIFIED AVAILABLE"}
            </span>
          </span>

          <div className="relative z-10" onClick={(e) => e.stopPropagation()}>
            <SaveEntityButton
              type={offeringType}
              id={offering.id}
              companyId={company.id}
              variant="icon"
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* 2. Content Body */}
      <div className="p-5 flex flex-col flex-1 space-y-3.5">
        
        {/* Eyebrow Category & Price Label */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-royal tracking-wider uppercase font-sans">
            <Package className="w-3.5 h-3.5 text-royal shrink-0" />
            <span className="truncate">{offering.category || offering.type || "Commercial Offering"}</span>
          </div>

          {formattedPrice && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200/90 text-emerald-800 font-mono text-[10.5px] font-bold shadow-2xs">
              <span>{formattedPrice}</span>
            </span>
          )}
        </div>

        {/* Title & Reference Code */}
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-bold text-graphite tracking-tight group-hover:text-royal transition-colors leading-snug line-clamp-2">
            {offering.name}
          </h3>
          <div className="text-xs font-mono text-stone font-medium">
            {refCode}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
          {offering.shortDescription || offering.detailedDescription || `Verified commercial offering provided directly by ${displayName}.`}
        </p>

        {/* Two-Column Standardized Meta Row */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-canvas border border-line text-xs font-sans mt-auto">
          <div>
            <span className="text-[9px] font-bold uppercase text-stone tracking-wider block mb-0.5">
              SECTOR NODE
            </span>
            <span className="font-bold text-royal flex items-center gap-1 text-[10.5px] truncate">
              <Globe2 className="w-3 h-3 text-royal shrink-0" />
              <span className="truncate">{sectorCityLabel}</span>
            </span>
          </div>

          <div>
            <span className="text-[9px] font-bold uppercase text-stone tracking-wider block mb-0.5">
              VERIFICATION
            </span>
            <span className="font-bold text-emerald-800 flex items-center gap-1 text-[10.5px] truncate">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
              <span className="truncate">Audit Verified</span>
            </span>
          </div>
        </div>

        {/* Footer Row */}
        <div className="pt-3 border-t border-line/60 flex items-center justify-between gap-2 font-sans">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-canvas border border-line font-mono text-[9px] font-bold text-slate-700 uppercase">
              {initials}
            </div>
            <span className="text-xs font-semibold text-slate-700 truncate max-w-[110px]">
              {displayName}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 hover:bg-royal text-white px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer shadow-2xs font-sans shrink-0"
          >
            <span>View offering</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </article>
  );
}
