import React from "react";
import {
  Compass,
  CheckCircle2,
  Anchor,
  Target,
  Zap,
  Shield,
  Layers,
  ArrowRight,
} from "lucide-react";
import type { CompanyOffering } from "@/lib/types";

interface OfferingExecutiveSummaryProps {
  offering: CompanyOffering;
}

export function OfferingExecutiveSummary({ offering }: OfferingExecutiveSummaryProps) {
  const applications = offering.applications && offering.applications.length > 0
    ? offering.applications
    : [
        "Offshore Subsea Asset Inspection & Mapping",
        "Deepwater Hull & Ballast Tank Survey",
        "Harbor & Port Hydrographic Assessment",
        "Renewable Offshore Wind Turbine Jacket Maintenance",
      ];

  const defaultAdvantages = [
    {
      title: "Sovereign Engineering Standard",
      description: "Class-certified manufacturing tolerance, calibrated for extreme marine salinity, hyperbaric depth, and thermal variance.",
    },
    {
      title: "Direct Digital Operating Twin",
      description: "Natively integrated with MarineWorld telemetry schemas, offering verified operational monitoring and predictive lifecycle logging.",
    },
    {
      title: "Verified Compliance & Type Approval",
      description: "Full regulatory adherence matching international classification society standards (DNV, ABS, Lloyd's Register).",
    },
  ];

  return (
    <section className="bg-white rounded-xl border border-line p-6 sm:p-8 space-y-6 shadow-2xs">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-royal block">
            OPERATIONAL ARCHITECTURE
          </span>
          <h2 className="text-xl font-bold text-graphite mt-0.5">Executive Summary & Positioning</h2>
        </div>
        <span className="text-xs font-mono text-stone">DOSSIER SECTION 01</span>
      </div>

      {/* Positioning & Detailed Description */}
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-canvas border border-line/80">
          <p className="text-sm font-semibold text-graphite leading-relaxed">
            {offering.shortDescription}
          </p>
        </div>

        <div className="text-xs sm:text-sm text-stone leading-relaxed space-y-3">
          {offering.detailedDescription ? (
            <p className="whitespace-pre-line">{offering.detailedDescription}</p>
          ) : (
            <p>
              {offering.name} is deployed as a premier verified {offering.type} within the {offering.sectorCity || "Shipyard"} sector city. Engineered for mission-critical maritime infrastructure, it combines high-performance subsea durability, deterministic telemetry interfaces, and complete compliance documentation.
            </p>
          )}
        </div>
      </div>

      {/* Target Operational Environments & Applications */}
      <div className="space-y-3 pt-2">
        <span className="text-xs font-bold font-mono text-graphite uppercase tracking-wider block">
          TARGET APPLICATIONS & DEPLOYMENT SCOPE
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {applications.map((app, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 p-3 rounded-lg bg-canvas border border-line/60 text-xs"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-graphite font-medium">{app}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Value Proposition & Technological Advantages */}
      <div className="space-y-3 pt-2 border-t border-line/60">
        <span className="text-xs font-bold font-mono text-graphite uppercase tracking-wider block">
          OPERATIONAL ADVANTAGES & VALUE PROPOSITION
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {defaultAdvantages.map((adv, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-canvas/60 border border-line/60 space-y-1.5"
            >
              <div className="w-7 h-7 rounded-md bg-white border border-line flex items-center justify-center text-royal shadow-2xs">
                <Target className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold text-graphite">{adv.title}</h3>
              <p className="text-[11px] text-stone leading-relaxed">{adv.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
