import React, { useState, useEffect, useMemo } from "react";
import {
  Radio,
  Eye,
  Building2,
  Compass,
  Layers,
  BrainCircuit,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  RefreshCw,
  ExternalLink,
  Activity,
  AlertCircle,
  BarChart3,
  Info,
  CheckCircle2,
} from "lucide-react";
import { SectorConfig, CompanyProfile, SectorCity } from "@/lib/types";
import { getSectorConfig, getCityAnchor, isCompanyAnchor, getCompaniesInCity } from "@/lib/registry";
import {
  getAnchorVisibilityReport,
  subscribeAdvisorVisibility,
  formatAdvisorSourceLabel,
  AnchorVisibilityReport,
  AdvisorOpenSource,
  getAllAdvisorOpenEvents,
} from "@/lib/services/anchorVisibilityService";
import { SectorCityAdvisorDrawer } from "@/components/sector/SectorCityAdvisorDrawer";

interface AnchorRegistryVisibilityCardProps {
  companyId: string;
  config?: SectorConfig;
  className?: string;
  defaultCityId?: string;
}

export function AnchorRegistryVisibilityCard({
  companyId,
  config,
  className = "",
  defaultCityId,
}: AnchorRegistryVisibilityCardProps) {
  const activeConfig = useMemo(() => config || getSectorConfig("marine"), [config]);
  const [report, setReport] = useState<AnchorVisibilityReport>(() =>
    getAnchorVisibilityReport(companyId, activeConfig, defaultCityId)
  );
  const [testDrawerCity, setTestDrawerCity] = useState<SectorCity | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  // Subscribe to live telemetry events dispatched anywhere in the application
  useEffect(() => {
    const handleUpdate = () => {
      setReport(getAnchorVisibilityReport(companyId, activeConfig, defaultCityId));
    };

    // Initial load
    handleUpdate();

    const unsubscribe = subscribeAdvisorVisibility(handleUpdate);
    return () => unsubscribe();
  }, [companyId, activeConfig, defaultCityId, refreshIndex]);

  // Find all cities for which this company is the Anchor
  const anchorCities = useMemo(() => {
    const list: SectorCity[] = [];
    for (const city of activeConfig.explorer?.cities || []) {
      const anchorCred = getCityAnchor(activeConfig, city.id);
      if (
        anchorCred &&
        (anchorCred.company.id.toLowerCase() === companyId.toLowerCase() ||
          (anchorCred.company.slug &&
            anchorCred.company.slug.toLowerCase() === companyId.toLowerCase()))
      ) {
        list.push(city);
      }
    }
    return list;
  }, [activeConfig, companyId]);

  const targetCity = anchorCities[0] || activeConfig.explorer?.cities?.find((c) => c.id === (defaultCityId || "supplychain")) || activeConfig.explorer?.cities?.[0];
  const cityCompanies = useMemo(() => (targetCity ? getCompaniesInCity(activeConfig, targetCity.id) : []), [activeConfig, targetCity]);

  const isAnchorHolder = anchorCities.length > 0 || report.totalImpressions > 0;

  const handleClearTelemetry = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("mw_advisor_visibility_events_v1");
        setRefreshIndex((p) => p + 1);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const getSourceIcon = (source: AdvisorOpenSource) => {
    switch (source) {
      case "sector_city_page":
        return <Compass className="w-3.5 h-3.5 text-royal" />;
      case "directory_compact_strip":
        return <Layers className="w-3.5 h-3.5 text-indigo-600" />;
      case "company_page":
        return <Building2 className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div
      id="card-anchor-registry-visibility"
      className={`bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden font-sans transition-all ${className}`}
    >
      {/* Top Banner */}
      <div className="p-6 pb-5 border-b border-slate-100 bg-linear-to-r from-slate-50 to-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono bg-slate-900 text-white shadow-2xs">
                <Radio className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>LANDMARK ANCHOR TELEMETRY</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono text-royal bg-royal/10 border border-royal/20">
                {report.cityDomain}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Telemetry Active
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Registry Visibility & Anchor Exposure Report
            </h3>
            <p className="text-xs text-slate-500 font-light max-w-2xl">
              Transparent, real-time impression telemetry across all platform entry points where this registry's Anchor presence is surfaced.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            {targetCity && (
              <button
                type="button"
                id="btn-test-open-city-advisor"
                onClick={() => setTestDrawerCity(targetCity)}
                className="px-3 py-1.5 rounded-xl bg-royal hover:bg-royal-dark text-white text-xs font-semibold transition shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                title="Open Advisor to simulate live event capture"
              >
                <BrainCircuit className="w-3.5 h-3.5 text-royal-light" />
                <span>Test Advisor Open</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setRefreshIndex((p) => p + 1)}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition"
              title="Refresh telemetry"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Impressions */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-xs border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
              <span>Total Anchor Impressions</span>
              <Eye className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white tracking-tight">
              {report.totalImpressions}
            </div>
            <div className="text-[11px] text-slate-400">
              Advisor opens with Anchor greeting
            </div>
          </div>

          {/* Source 1: Sector City Page */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
              <span>Sector City Entrance</span>
              <Compass className="w-4 h-4 text-royal" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {report.bySource.sector_city_page}
            </div>
            <div className="text-[11px] text-slate-500">
              Direct city portal visitors
            </div>
          </div>

          {/* Source 2: Directory Filter Strip */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
              <span>Directory Filter Strip</span>
              <Layers className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {report.bySource.directory_compact_strip}
            </div>
            <div className="text-[11px] text-slate-500">
              Companies directory city facet
            </div>
          </div>

          {/* Source 3: Company Page Referrals (Part 1) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
              <span>Company Profiles</span>
              <Building2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {report.bySource.company_page}
            </div>
            <div className="text-[11px] text-slate-500">
              Pill triggers from enterprise profiles
            </div>
          </div>
        </div>

        {/* Live Event Activity Feed */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-700" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recent Genuine Impression Telemetry
              </h4>
            </div>
            {report.recentEvents.length > 0 && (
              <span className="text-[11px] text-slate-500 font-mono">
                {report.recentEvents.length} recorded events
              </span>
            )}
          </div>

          {report.recentEvents.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
              <Clock className="w-6 h-6 text-slate-400 mx-auto" />
              <div className="text-xs font-semibold text-slate-800">
                No telemetry recorded yet in this session
              </div>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Advisor opens are tracked live whenever visitors interact with the City Advisor from the Sector City entrance, Directory compact banner, or any company detail page.
              </p>
              {targetCity && (
                <button
                  type="button"
                  onClick={() => setTestDrawerCity(targetCity)}
                  className="mt-2 text-xs font-semibold text-royal hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  Trigger a test open now <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10.5px] uppercase tracking-wider text-slate-500 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3.5">Timestamp</th>
                      <th className="py-2.5 px-3.5">Trigger Source</th>
                      <th className="py-2.5 px-3.5">Registry Context</th>
                      <th className="py-2.5 px-3.5">Referring Entity</th>
                      <th className="py-2.5 px-3.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.recentEvents.map((evt) => (
                      <tr key={evt.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {new Date(evt.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-100 border border-slate-200 text-slate-800">
                            {getSourceIcon(evt.source)}
                            <span>{formatAdvisorSourceLabel(evt.source)}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-[11px] font-semibold text-royal whitespace-nowrap">
                          {evt.cityDomain}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-700 whitespace-nowrap">
                          {evt.referringCompanyName ? (
                            <span className="font-medium text-graphite">
                              {evt.referringCompanyName}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Direct Entry</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Surfaced</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Data Architecture Transparency Notice */}
        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1 text-[11.5px] leading-relaxed">
            <div className="font-bold text-amber-950">
              Telemetry Architecture & Measurement Transparency
            </div>
            <p className="text-amber-900/90 font-light">
              {report.telemetryNotice}
            </p>
            {report.recentEvents.length > 0 && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleClearTelemetry}
                  className="text-[10.5px] font-semibold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                >
                  Reset session telemetry data
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Test Advisor Drawer Modal */}
      {testDrawerCity && (
        <SectorCityAdvisorDrawer
          isOpen={!!testDrawerCity}
          onClose={() => setTestDrawerCity(null)}
          city={testDrawerCity}
          config={activeConfig}
          allCityCompanies={cityCompanies}
          entrySource="sector_city_page"
        />
      )}
    </div>
  );
}
