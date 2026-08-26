import React from "react";
import {
  Globe,
  Building2,
  MapPin,
  Layers,
  ArrowRight,
  PieChart,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import type {
  EcosystemOrganizationSummary,
  EcosystemMemberRecord,
} from "@/lib/services/ecosystemOrganizationService";

interface EcosystemIntelligenceViewProps {
  organization: EcosystemOrganizationSummary;
  members: EcosystemMemberRecord[];
  onNavigateTab: (tab: "members", filterOpts?: { sectorCity?: string; country?: string }) => void;
}

export function EcosystemIntelligenceView({
  organization,
  members,
  onNavigateTab,
}: EcosystemIntelligenceViewProps) {
  // Aggregate Sector Cities
  const sectorCityCounts: Record<string, number> = {};
  members.forEach((m) => {
    sectorCityCounts[m.sectorCityId] = (sectorCityCounts[m.sectorCityId] || 0) + 1;
  });
  const sortedSectorCities = Object.entries(sectorCityCounts).sort((a, b) => b[1] - a[1]);

  // Aggregate Countries
  const countryCounts: Record<string, number> = {};
  members.forEach((m) => {
    countryCounts[m.country] = (countryCounts[m.country] || 0) + 1;
  });
  const sortedCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]);

  // Aggregate Capabilities
  const capabilityCounts: Record<string, number> = {};
  members.forEach((m) => {
    m.capabilities.forEach((cap) => {
      capabilityCounts[cap] = (capabilityCounts[cap] || 0) + 1;
    });
  });
  const sortedCapabilities = Object.entries(capabilityCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-royal uppercase tracking-widest mb-1">
            <Globe className="w-4 h-4 text-royal" />
            <span>Geographic & Capability Footprint</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            ECOSYSTEM DISTRIBUTION
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Understand where your members operate across MarineWorld Sector Cities and international maritime corridors.
          </p>
        </div>
      </div>

      {/* THREE BREAKDOWN GRIDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SECTOR CITIES DISTRIBUTION */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-royal" />
              <span>Sector Cities</span>
            </h2>
            <span className="text-[11px] font-bold text-slate-500">
              {sortedSectorCities.length} Active
            </span>
          </div>

          <div className="space-y-2.5">
            {sortedSectorCities.map(([cityId, count]) => {
              const pct = Math.round((count / (members.length || 1)) * 100);
              return (
                <button
                  key={cityId}
                  onClick={() => onNavigateTab("members", { sectorCity: cityId })}
                  className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-royal/5/80 border border-slate-200/80 hover:border-royal/20 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="font-mono text-royal group-hover:text-royal-dark">
                      {cityId}.city
                    </span>
                    <span className="text-slate-900">{count} Members ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-royal h-full rounded-full group-hover:bg-royal-dark transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* COUNTRY DISTRIBUTION */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Top Countries</span>
            </h2>
            <span className="text-[11px] font-bold text-slate-500">
              {sortedCountries.length} Countries
            </span>
          </div>

          <div className="space-y-2.5">
            {sortedCountries.slice(0, 7).map(([countryName, count]) => {
              const pct = Math.round((count / (members.length || 1)) * 100);
              return (
                <button
                  key={countryName}
                  onClick={() => onNavigateTab("members", { country: countryName })}
                  className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50/80 border border-slate-200/80 hover:border-emerald-200 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="text-slate-900 group-hover:text-emerald-950">
                      {countryName}
                    </span>
                    <span className="text-slate-900">{count} Members ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full group-hover:bg-emerald-700 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* CAPABILITIES BREAKDOWN */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              <span>Industry Capabilities</span>
            </h2>
            <span className="text-[11px] font-bold text-slate-500">
              {sortedCapabilities.length} Capabilities
            </span>
          </div>

          <div className="space-y-2.5">
            {sortedCapabilities.slice(0, 7).map(([capabilityName, count]) => {
              return (
                <div
                  key={capabilityName}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs font-bold"
                >
                  <span className="text-slate-800">{capabilityName}</span>
                  <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-900 font-mono">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
