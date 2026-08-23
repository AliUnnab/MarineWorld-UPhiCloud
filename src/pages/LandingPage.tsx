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
  return (
    <div className="min-h-screen bg-canvas font-sans text-graphite antialiased" id="page-01-landing">
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
      <Footer config={config} />
    </div>
  );
}
