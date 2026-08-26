import React, { useState } from "react";
import { ArrowUpRight, CheckCircle2, Globe2, Award, Package, Building2 } from "lucide-react";
import type { CompanyOffering, CompanyProfile } from "@/lib/types";
import { SaveEntityButton } from "@/components/foundation/SaveEntityButton";
import { formatAvatarInitials } from "@/lib/registry";

const CANONICAL_SHOWROOM_IMAGES = [
  "https://images.unsplash.com/photo-1586528116311-ad8ed7c50a92?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
];

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

  // Determine image source
  const baseImage =
    (offering as any).coverImage ||
    CANONICAL_SHOWROOM_IMAGES[Math.abs(index) % CANONICAL_SHOWROOM_IMAGES.length];
  
  const imageUrl = baseImage.includes("unsplash") && !baseImage.includes("&sig=")
    ? `${baseImage}&sig=${offering.id?.replace(/[^0-9]/g, "").slice(0, 3) || index + 101}`
    : baseImage;

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
        <div className="relative w-full md:w-[58%] lg:w-[62%] shrink-0 min-h-[280px] md:min-h-[400px] bg-canvas overflow-hidden border-b md:border-b-0 md:border-r border-line">
          {!imageError && imageUrl ? (
            <img
              src={imageUrl}
              alt={offering.name}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-canvas flex flex-col items-center justify-center p-6 text-stone">
              <Building2 className="w-12 h-12 mb-2 text-stone" />
              <span className="text-xs font-bold uppercase tracking-wider">Facility Spec Record</span>
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
            {/* Category */}
            <div className="flex items-center gap-2 text-xs font-bold text-royal uppercase tracking-wider font-mono">
              <Package className="w-4 h-4 text-royal shrink-0" />
              <span className="truncate">{offering.category || offering.type || "Commercial Offering"}</span>
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
              <span className="text-[10px] font-bold uppercase text-stone tracking-wider block mb-0.5">
                SECTOR NODE
              </span>
              <span className="font-bold text-royal flex items-center gap-1.5 text-xs truncate">
                <Globe2 className="w-3.5 h-3.5 text-royal shrink-0" />
                <span className="truncate">{sectorCityLabel}</span>
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-stone tracking-wider block mb-0.5">
                VERIFICATION
              </span>
              <span className="font-bold text-emerald-800 flex items-center gap-1.5 text-xs truncate">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Audit Verified</span>
              </span>
            </div>
          </div>

          {/* Footer Row */}
          <div className="pt-3 border-t border-line/80 flex items-center justify-between gap-3 font-sans">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-canvas border border-line font-mono text-xs font-bold text-slate-700 uppercase shadow-2xs">
                {initials}
              </div>
              <span className="text-xs font-semibold text-slate-800 truncate max-w-[180px]">
                {displayName}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-graphite hover:bg-royal text-white px-5 py-2.5 text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
            >
              <span>View offering</span>
              <ArrowUpRight className="w-4 h-4" />
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
      <div className="relative w-full aspect-[16/10] bg-canvas overflow-hidden border-b border-line">
        {!imageError && imageUrl ? (
          <img
            src={imageUrl}
            alt={offering.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-canvas flex flex-col items-center justify-center p-4 text-stone">
            <Building2 className="w-8 h-8 mb-1.5 text-stone" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Facility Spec Record</span>
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
        
        {/* Eyebrow Category Label */}
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-royal tracking-wider uppercase font-sans">
          <Package className="w-3.5 h-3.5 text-royal shrink-0" />
          <span className="truncate">{offering.category || offering.type || "Commercial Offering"}</span>
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
