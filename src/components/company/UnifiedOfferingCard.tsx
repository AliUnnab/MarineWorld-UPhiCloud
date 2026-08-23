import React, { useState } from "react";
import { ArrowUpRight, CheckCircle2, Globe2, Sparkles, Package, Building2 } from "lucide-react";
import type { CompanyOffering, CompanyProfile } from "@/lib/types";

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
  onClick: () => void;
  index?: number;
}

export function UnifiedOfferingCard({
  offering,
  company,
  isFeatured = false,
  onClick,
  index = 0,
}: UnifiedOfferingCardProps) {
  const [imageError, setImageError] = useState(false);

  const displayName = company.displayName || company.name || "Company Node";

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

  return (
    <article
      onClick={onClick}
      className={`group relative flex flex-col justify-between rounded-card-md sm:rounded-card-lg bg-white overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer font-sans ${
        isFeatured
          ? "border-2 border-royal shadow-2xs"
          : "border border-line shadow-2xs hover:border-royal/50"
      }`}
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

        {/* Gradient Overlay for Top Badges Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-transparent pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          {/* Availability Badge in Success Role */}
          <span className="inline-flex items-center gap-1.5 rounded-card-xs bg-emerald-50/95 border border-emerald-200/90 px-2.5 py-1 text-[10px] font-mono font-bold text-emerald-800 shadow-2xs backdrop-blur-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="uppercase tracking-wider">
              {offering.status ? `VERIFIED ${offering.status}` : "VERIFIED AVAILABLE"}
            </span>
          </span>

          {/* Top-Right "Featured" Badge ONLY if featured */}
          {isFeatured && (
            <span className="inline-flex items-center gap-1.5 rounded-card-xs bg-royal text-white px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider shadow-2xs">
              <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
              <span>FEATURED</span>
            </span>
          )}
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
          <h3 className="text-lg sm:text-xl font-bold text-graphite tracking-tight group-hover:text-royal transition-colors leading-snug">
            {offering.name}
          </h3>
          <div className="text-xs font-mono text-stone font-medium">
            {refCode}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
          {offering.shortDescription || offering.detailedDescription || `Verified commercial offering provided directly by ${displayName}.`}
        </p>

        {/* Two-Column Standardized Meta Row */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-card-xs bg-canvas border border-line text-xs font-sans mt-auto">
          <div>
            <span className="text-[10px] font-bold uppercase text-stone tracking-wider block mb-0.5">
              Sector node
            </span>
            <span className="font-bold text-royal flex items-center gap-1 text-[11px] truncate">
              <Globe2 className="w-3.5 h-3.5 text-royal shrink-0" />
              <span className="truncate">{sectorCityLabel}</span>
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase text-stone tracking-wider block mb-0.5">
              Verification
            </span>
            <span className="font-bold text-emerald-800 flex items-center gap-1 text-[11px] truncate">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">Audit Verified</span>
            </span>
          </div>
        </div>

        {/* Footer Row */}
        <div className="pt-3 border-t border-line/60 flex items-center justify-between gap-3 font-sans">
          {/* Left: Small Company Avatar + Name */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-card-xs bg-canvas border border-line font-mono text-[9px] font-bold text-slate-700 shadow-2xs">
              {company.initials || displayName.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-xs font-semibold text-slate-700 truncate max-w-[130px]">
              {displayName}
            </span>
          </div>

          {/* Right: Single Action Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-card-xs bg-slate-900 hover:bg-royal text-white px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer shadow-2xs font-sans shrink-0"
          >
            <span>View offering</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </article>
  );
}
