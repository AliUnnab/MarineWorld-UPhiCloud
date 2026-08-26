import React from "react";
import type { SectorConfig } from "@/lib/types";
import { Header } from "@/components/digione/Header";
import { Footer } from "@/components/digione/Footer";
import { SectorHero } from "@/components/sector/SectorHero";
import { SectorArchitecture } from "@/components/sector/SectorArchitecture";
import { SectorIntelligence } from "@/components/sector/SectorIntelligence";
import { SectorExplorer } from "@/components/sector/SectorExplorer";
import { SectorNetwork } from "@/components/sector/SectorNetwork";
import { SectorAI } from "@/components/sector/SectorAI";
import { SectorRegions } from "@/components/sector/SectorRegions";
import { SectorWorkflow } from "@/components/sector/SectorWorkflow";
import { SectorGovernance } from "@/components/sector/SectorGovernance";
import { SectorClosing } from "@/components/sector/SectorClosing";
import { ChevronUp, ChevronDown } from "lucide-react";

export function LandingPage({
  config,
  loading = false,
  empty = false,
  error = null,
}: {
  config: SectorConfig;
  loading?: boolean;
  empty?: boolean;
  error?: string | null;
}) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-canvas font-sans text-graphite antialiased relative" id="page-01-landing">
      <Header sectorName={config.sectorName} sectorCode={config.sectorCode} publicOnly />
      <main id="main-content">
        <SectorHero config={config} />
        {loading ? (
          <div id="landing-loading-state" className="py-20 text-center text-stone">
            <p className="font-mono text-xs uppercase tracking-widest">Loading MarineWorld Registry...</p>
          </div>
        ) : error ? (
          <div id="landing-error-state" className="py-20 text-center text-rose-600">
            <p className="font-mono text-xs uppercase tracking-widest">{error}</p>
          </div>
        ) : empty ? (
          <div id="landing-empty-state" className="py-20 text-center text-stone">
            <p className="font-mono text-xs uppercase tracking-widest">No sector registries available.</p>
          </div>
        ) : (
          <>
            <SectorArchitecture config={config} />
            <SectorIntelligence config={config} />
            <SectorExplorer config={config} />
            <SectorNetwork config={config} />
            <SectorAI config={config} />
            <SectorRegions config={config} />
            <SectorWorkflow config={config} />
            <SectorGovernance config={config} />
            <SectorClosing config={config} />
          </>
        )}
      </main>

      {/* LIGHTWEIGHT FLOATING QUICK SCROLL ARROWS */}
      <div
        className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-0.5 p-1 bg-white/60 hover:bg-white/90 backdrop-blur-md text-slate-600 hover:text-graphite rounded-xl border border-slate-200/80 shadow-md transition-all duration-300 opacity-75 hover:opacity-100 group"
        aria-label="Quick Scroll Controls"
      >
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Scroll to top"
          title="Scroll to top"
          className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-600 hover:text-royal transition cursor-pointer active:scale-95"
        >
          <ChevronUp className="w-4 h-4 stroke-[2]" />
        </button>
        <div className="w-3 h-px bg-slate-300/60" />
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label="Scroll to bottom"
          title="Scroll to bottom"
          className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-600 hover:text-royal transition cursor-pointer active:scale-95"
        >
          <ChevronDown className="w-4 h-4 stroke-[2]" />
        </button>
      </div>

      <Footer config={config} />
    </div>
  );
}
