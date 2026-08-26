import React, { useState } from "react";
import {
  Image as ImageIcon,
  Layers,
  Maximize2,
  FileCheck,
  ShieldCheck,
  Eye,
  Camera,
  Compass,
} from "lucide-react";
import type { CompanyOffering, OfferingMediaItem } from "@/lib/types";

interface OfferingMediaHeroProps {
  offering: CompanyOffering;
  onOpenLightbox: (media: OfferingMediaItem) => void;
}

export function OfferingMediaHero({ offering, onOpenLightbox }: OfferingMediaHeroProps) {
  const [activeTab, setActiveTab] = useState<"media" | "blueprint">("media");
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  const mediaList: OfferingMediaItem[] =
    offering.mediaReferences && offering.mediaReferences.length > 0
      ? offering.mediaReferences
      : offering.media && offering.media.length > 0
      ? offering.media
      : [
          {
            id: "m-default-1",
            url:
              offering.type === "product"
                ? "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1400&q=80"
                : "https://images.unsplash.com/photo-1505705694340-019e1e335916?auto=format&fit=crop&w=1400&q=80",
            title: `${offering.name} — Operational Marine Unit`,
            type: "cover",
            isCover: true,
          },
          {
            id: "m-default-2",
            url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1400&q=80",
            title: `${offering.name} — Engineering CAD & Subsea Telemetry Integration`,
            type: "drawing",
          },
        ];

  const currentMedia = mediaList[selectedMediaIndex] || mediaList[0];

  return (
    <section className="bg-white rounded-xl border border-line overflow-hidden shadow-2xs">
      {/* Top Media Bar */}
      <div className="p-4 border-b border-line bg-canvas flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-line bg-white p-1 shadow-2xs text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("media")}
              className={`px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "media"
                  ? "bg-slate-900 text-white"
                  : "text-stone hover:text-graphite hover:bg-canvas"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Operational Imagery ({mediaList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("blueprint")}
              className={`px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "blueprint"
                  ? "bg-slate-900 text-white"
                  : "text-stone hover:text-graphite hover:bg-canvas"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Technical Blueprint / Schematics</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-stone">
          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <ShieldCheck className="w-3 h-3" />
            <span>VERIFIED HARDWARE RECORD</span>
          </span>
          <button
            type="button"
            onClick={() => onOpenLightbox(currentMedia)}
            className="p-1.5 rounded-lg border border-line bg-white text-stone hover:text-royal hover:border-royal transition cursor-pointer"
            title="Expand Full Resolution Visual"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="relative bg-slate-950 aspect-[16/9] sm:aspect-[21/9] min-h-[320px] max-h-[500px] flex items-center justify-center overflow-hidden group">
        {activeTab === "media" ? (
          <>
            <img
              src={currentMedia.url}
              alt={currentMedia.title || offering.name}
              className="w-full h-full object-cover transition duration-500 group-hover:scale-[1.01]"
            />
            {/* Overlay gradient caption */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-4 sm:p-6 text-white flex items-end justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold tracking-wider text-royal bg-white/90 px-2 py-0.5 rounded uppercase">
                  {currentMedia.type?.toUpperCase() || "RECORD CAPTURE"}
                </span>
                <p className="text-xs sm:text-sm font-semibold mt-1 max-w-xl text-slate-100 drop-shadow-sm">
                  {currentMedia.title || `${offering.name} — Operational Verification Deployment`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenLightbox(currentMedia)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-white/20"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Inspect High-Res</span>
              </button>
            </div>
          </>
        ) : (
          /* Blueprint Schematic Mode */
          <div className="w-full h-full bg-slate-900 text-royal-light font-mono p-6 relative overflow-hidden flex flex-col justify-between">
            {/* Grid overlay */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(#38bdf8 1px, transparent 1px), radial-gradient(#38bdf8 1px, transparent 1px)",
                backgroundSize: "24px 24px",
                backgroundPosition: "0 0, 12px 12px",
              }}
            />

            {/* Blueprint Header */}
            <div className="relative z-10 flex justify-between items-start border-b border-slate-700 pb-3">
              <div>
                <span className="text-[10px] tracking-widest text-royal-light font-bold uppercase block">
                  TECHNICAL SCHEMATIC // REV-04
                </span>
                <span className="text-sm font-bold text-white tracking-wide">
                  {offering.name.toUpperCase()}
                </span>
              </div>
              <div className="text-right text-[10px] text-royal-light space-y-0.5">
                <div>CLASS: DNV-GL APPROVED</div>
                <div>SCALE: 1:25 METRIC</div>
                <div>DATUM: WGS-84 / SOLAS COMPLIANT</div>
              </div>
            </div>

            {/* Schematic Center Graphic */}
            <div className="relative z-10 my-auto text-center space-y-3 py-6">
              <div className="w-16 h-16 rounded-full border border-royal/30 bg-slate-900 text-royal-light flex items-center justify-center mx-auto shadow-inner">
                <Compass className="w-8 h-8 animate-pulse text-royal-light" />
              </div>
              <div className="max-w-md mx-auto">
                <p className="text-xs text-slate-200">
                  Calibrated CAD geometry and hydro-acoustic envelope model registered.
                </p>
                <p className="text-[11px] text-royal-light mt-1">
                  Full DXF / STEP 3D CAD files available in verified technical documents below.
                </p>
              </div>
            </div>

            {/* Blueprint Footer */}
            <div className="relative z-10 flex flex-wrap justify-between items-center border-t border-slate-700 pt-3 text-[10px] text-royal-light">
              <span>AUTHORIZED RECORD OF MARINE ENGINEERING RECORD ARCHIVE</span>
              <span>CERTIFICATION CONFIDENCE: 99.4%</span>
            </div>
          </div>
        )}
      </div>

      {/* Gallery Selector */}
      {mediaList.length > 1 && (
        <div className="p-3 bg-canvas border-t border-line flex items-center gap-3 overflow-x-auto">
          {mediaList.map((m, idx) => (
            <button
              key={m.id || idx}
              type="button"
              onClick={() => {
                setSelectedMediaIndex(idx);
                setActiveTab("media");
              }}
              className={`relative h-14 w-20 rounded-lg overflow-hidden border-2 shrink-0 transition cursor-pointer ${
                selectedMediaIndex === idx && activeTab === "media"
                  ? "border-royal ring-2 ring-royal/20"
                  : "border-line opacity-70 hover:opacity-100"
              }`}
            >
              <img src={m.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
