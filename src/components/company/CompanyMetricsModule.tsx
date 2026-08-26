import { useState, useEffect, useMemo } from "react";
import type { CompanyProfile, MetricsTimePeriod, CompanyMetricsData } from "@/lib/types";
import { getCompanyMetrics, subscribeMetrics, exportCompanyMetricsCSV } from "@/lib/metricsStore";
import { Icon } from "@/components/digione/icons";
import { DigiBadge, DigiButton, DigiIconContainer, InteractiveRow } from "@/components/digione/primitives";
import { EmptyState } from "@/components/foundation/EmptyState";

/* ------------------------------------------------------------
   LOADING SKELETON
   ------------------------------------------------------------ */
export function CompanyMetricsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8">
        <div className="h-4 w-32 bg-mist rounded mb-3" />
        <div className="h-8 w-64 bg-mist rounded mb-2" />
        <div className="h-4 w-96 bg-mist rounded" />
      </div>

      {/* KPI Row Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-card-md border border-line bg-white p-5 space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-3 w-20 bg-mist rounded" />
              <div className="h-8 w-8 bg-mist rounded-lg" />
            </div>
            <div className="h-8 w-24 bg-mist rounded" />
            <div className="h-3 w-32 bg-mist rounded" />
          </div>
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="rounded-card-lg border border-line bg-white p-6 h-80">
        <div className="h-5 w-40 bg-mist rounded mb-4" />
        <div className="h-56 bg-canvas rounded" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   ACTIVITY TREND SVG CHART
   ------------------------------------------------------------ */
function ActivityTrendChart({
  trendData,
  timePeriod,
}: {
  trendData: CompanyMetricsData["activityTrend"];
  timePeriod: MetricsTimePeriod;
}) {
  const [metricMode, setMetricMode] = useState<"ALL" | "INQUIRIES" | "VIEWS">("ALL");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!trendData || trendData.length === 0) {
    return (
      <div className="rounded-card-md border border-line bg-canvas p-12 text-center">
        <Icon name="chart" className="mx-auto h-8 w-8 text-stone/40 mb-3" />
        <p className="font-mono text-[12px] font-bold text-stone uppercase tracking-[0.1em]">
          NOT ENOUGH DATA YET
        </p>
        <p className="text-[13px] text-stone/80 mt-1">
          Historical trend chart requires at least 24 hours of recorded activity.
        </p>
      </div>
    );
  }

  // Determine maximum Y value
  const values = trendData.map((d) =>
    metricMode === "INQUIRIES"
      ? d.inquiries
      : metricMode === "VIEWS"
      ? d.profileViews + d.productViews + d.serviceViews
      : d.totalActivity
  );

  const maxValue = Math.max(...values, 5); // min ceiling of 5
  const chartHeight = 180;
  const chartWidth = 720;
  const paddingX = 40;
  const paddingY = 20;

  const drawableWidth = chartWidth - paddingX * 2;
  const drawableHeight = chartHeight - paddingY * 2;

  // Generate SVG path coordinates
  const points = values.map((val, idx) => {
    const x = paddingX + (idx / Math.max(1, values.length - 1)) * drawableWidth;
    const y = chartHeight - paddingY - (val / maxValue) * drawableHeight;
    return { x, y, val, data: trendData[idx] };
  });

  const pathString = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaString = `${pathString} L ${points[points.length - 1].x.toFixed(
    1
  )} ${(chartHeight - paddingY).toFixed(1)} L ${paddingX} ${(chartHeight - paddingY).toFixed(1)} Z`;

  return (
    <div className="space-y-4">
      {/* Chart Metric Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-line">
        <div className="flex items-center gap-1.5 bg-canvas p-1 rounded-card-sm border border-line">
          <button
            onClick={() => setMetricMode("ALL")}
            className={`px-3 py-1 text-[11px] font-mono font-bold rounded transition-all ${
              metricMode === "ALL"
                ? "bg-white text-royal shadow-xs border border-line"
                : "text-stone hover:text-graphite"
            }`}
          >
            ALL ACTIVITY
          </button>
          <button
            onClick={() => setMetricMode("INQUIRIES")}
            className={`px-3 py-1 text-[11px] font-mono font-bold rounded transition-all ${
              metricMode === "INQUIRIES"
                ? "bg-white text-royal shadow-xs border border-line"
                : "text-stone hover:text-graphite"
            }`}
          >
            INQUIRIES ONLY
          </button>
          <button
            onClick={() => setMetricMode("VIEWS")}
            className={`px-3 py-1 text-[11px] font-mono font-bold rounded transition-all ${
              metricMode === "VIEWS"
                ? "bg-white text-royal shadow-xs border border-line"
                : "text-stone hover:text-graphite"
            }`}
          >
            VIEWS & VISITS
          </button>
        </div>

        <span className="font-mono text-[11px] text-stone">
          PERIOD: {timePeriod} ({trendData.length} BUCKETS)
        </span>
      </div>

      {/* SVG Chart Stage */}
      <div className="relative w-full overflow-hidden bg-canvas rounded-card-md border border-line p-4 md:p-6">
        {/* Tooltip Overlay */}
        {hoveredIdx !== null && points[hoveredIdx] && (
          <div
            className="absolute z-20 pointer-events-none rounded bg-graphite text-white p-2.5 text-[11.5px] font-mono shadow-md border border-white/20"
            style={{
              left: Math.min(Math.max(10, points[hoveredIdx].x - 60), chartWidth - 140),
              top: Math.max(10, points[hoveredIdx].y - 65),
            }}
          >
            <p className="font-bold text-electric">{points[hoveredIdx].data.date}</p>
            <p className="text-white/90 font-semibold mt-0.5">
              {metricMode === "INQUIRIES"
                ? `Inquiries: ${points[hoveredIdx].val}`
                : metricMode === "VIEWS"
                ? `Views: ${points[hoveredIdx].val}`
                : `Total Events: ${points[hoveredIdx].val}`}
            </p>
          </div>
        )}

        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto overflow-visible"
          aria-label="Company activity trend line chart"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0D3868" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0D3868" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines */}
          {[0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight - paddingY - ratio * drawableHeight;
            return (
              <line
                key={ratio}
                x1={paddingX}
                y1={y}
                x2={chartWidth - paddingX}
                y2={y}
                stroke="#E4E4E7"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
            );
          })}

          {/* Area Fill */}
          <path d={areaString} fill="url(#chartGradient)" />

          {/* Main Trend Line */}
          <path d={pathString} fill="none" stroke="#0D3868" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Interactive Data Circles */}
          {points.map((p, idx) => (
            <g key={idx} className="cursor-pointer">
              <circle
                cx={p.x}
                cy={p.y}
                r={hoveredIdx === idx ? 6 : 3.5}
                className={`transition-all duration-150 ${
                  hoveredIdx === idx ? "fill-electric stroke-white stroke-2" : "fill-royal stroke-white stroke-1"
                }`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            </g>
          ))}
        </svg>

        {/* X-Axis Labels */}
        <div className="flex justify-between items-center mt-2 px-6 font-mono text-[10.5px] text-stone">
          <span>{trendData[0]?.date}</span>
          <span>{trendData[Math.floor(trendData.length / 2)]?.date}</span>
          <span>{trendData[trendData.length - 1]?.date}</span>
        </div>
      </div>

      {/* Accessible Text Summary for Screen Readers */}
      <p className="sr-only">
        Company activity trend summary: Activity peaks at {maxValue} events over the {timePeriod} period.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------
   MAIN COMPANY METRICS MODULE
   ------------------------------------------------------------ */
export function CompanyMetricsModule({
  company,
  onSelectModule,
}: {
  company: CompanyProfile;
  onSelectModule?: (moduleSlug: string) => void;
}) {
  const [timePeriod, setTimePeriod] = useState<MetricsTimePeriod>("30D");
  const [activeContentTab, setActiveContentTab] = useState<"PRODUCTS" | "SERVICES">("PRODUCTS");
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [metrics, setMetrics] = useState<CompanyMetricsData | null>(null);

  // Load metrics deterministically on mount or company/period change
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setIsError(false);

    try {
      const data = getCompanyMetrics(company, timePeriod);
      if (isMounted) {
        setMetrics(data);
        setIsLoading(false);
      }
    } catch (err) {
      if (isMounted) {
        setIsError(true);
        setIsLoading(false);
      }
    }

    // Subscribe to store updates for real-time reactivity
    const unsubscribe = subscribeMetrics(() => {
      try {
        const updated = getCompanyMetrics(company, timePeriod);
        if (isMounted) setMetrics(updated);
      } catch (e) {
        // quiet fallback
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [company.id, timePeriod]);

  if (isLoading) {
    return <CompanyMetricsSkeleton />;
  }

  if (isError || !metrics) {
    return (
      <div className="rounded-card-lg border border-line bg-white p-8 text-center space-y-4">
        <Icon name="shield" className="mx-auto h-10 w-10 text-amber-500" />
        <h3 className="text-h3 text-graphite">METRICS COULD NOT BE LOADED</h3>
        <p className="text-[14px] text-stone max-w-md mx-auto">
          An error occurred while aggregating company performance events. Please verify network access and try again.
        </p>
        <div>
          <DigiButton onClick={() => setTimePeriod((p) => p)} icon="exchange">
            TRY AGAIN
          </DigiButton>
        </div>
      </div>
    );
  }

  // Handle Honest Empty State for New Companies
  if (metrics.isEmptyState) {
    return (
      <div className="space-y-8">
        {/* Module Header */}
        <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-royal">
              <Icon name="chart" className="h-4 w-4" />
              <span>07 / METRICS</span>
            </div>
            <h2 className="text-h2 mt-1 text-graphite">Company Performance</h2>
            <p className="mt-1.5 text-[14px] text-stone max-w-2xl">
              Understand how your company is being discovered, engaged with, and connected to across MarineWorld.City.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-stone bg-mist px-3 py-1.5 rounded border border-line">
              🔒 Private Business Analytics
            </span>
          </div>
        </div>

        <EmptyState
          icon="chart"
          title="YOUR DIGITAL PRESENCE IS STARTING"
          description="Metrics will appear as customers discover and interact with your company across MarineWorld.City."
          action={{
            label: "Explore Company Products",
            href: `#products`,
            onClick: () => onSelectModule?.("products"),
          }}
        />
      </div>
    );
  }

  const { kpis, connectMetrics, healthSignal, profileCompletenessScore, profileCompletenessItems } = metrics;

  return (
    <div className="space-y-8">
      {/* 01. PAGE HEADER */}
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-royal">
            <Icon name="chart" className="h-4 w-4" />
            <span>07 / METRICS</span>
          </div>
          <h2 className="text-h2 mt-1 text-graphite">Company Performance</h2>
          <p className="mt-1 text-[14px] text-stone max-w-2xl">
            Understand how your company is being discovered, engaged with, and connected to across MarineWorld.City.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time Period Filter Controls */}
          <div className="flex items-center bg-canvas p-1 rounded-card-sm border border-line font-mono text-[11.5px]">
            {(["7D", "30D", "90D", "12M"] as MetricsTimePeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={`px-3 py-1.5 font-bold rounded transition-all ${
                  timePeriod === period
                    ? "bg-white text-royal shadow-xs border border-line"
                    : "text-stone hover:text-graphite"
                }`}
              >
                {period}
              </button>
            ))}
          </div>

          {/* Export CSV Button */}
          <DigiButton
            onClick={() => exportCompanyMetricsCSV(metrics)}
            variant="secondary"
            icon="doc"
          >
            EXPORT METRICS
          </DigiButton>
        </div>
      </div>

      {/* 02. PRIMARY KPI ROW (Mandated Priority: Inquiries -> Profile Views -> Product Views -> Service Views) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: INQUIRIES (Top Priority) */}
        <div className="rounded-card-md border-2 border-royal/20 bg-white p-5 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-royal">
              1. BUSINESS INQUIRIES
            </span>
            <DigiIconContainer icon="connect" mode="royal" size={36} />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-[28px] font-extrabold text-graphite font-mono tracking-tight">
              {kpis.inquiries.current}
            </span>
            {kpis.inquiries.percentChange !== null ? (
              <span
                className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                  kpis.inquiries.percentChange >= 0
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {kpis.inquiries.percentChange >= 0 ? `+${kpis.inquiries.percentChange}%` : `${kpis.inquiries.percentChange}%`}
              </span>
            ) : (
              <span className="font-mono text-[10px] text-stone bg-mist px-1.5 py-0.5 rounded">
                NO COMPARISON DATA
              </span>
            )}
          </div>
          <p className="mt-2 text-[11.5px] text-stone">
            vs previous {timePeriod} ({kpis.inquiries.previous} prior)
          </p>
        </div>

        {/* KPI 2: PROFILE VIEWS */}
        <div className="rounded-card-md border border-line bg-white p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-stone">
              2. PROFILE VIEWS
            </span>
            <DigiIconContainer icon="building" mode="white" size={36} />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-[28px] font-extrabold text-graphite font-mono tracking-tight">
              {kpis.profileViews.current.toLocaleString()}
            </span>
            {kpis.profileViews.percentChange !== null ? (
              <span
                className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                  kpis.profileViews.percentChange >= 0
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {kpis.profileViews.percentChange >= 0 ? `+${kpis.profileViews.percentChange}%` : `${kpis.profileViews.percentChange}%`}
              </span>
            ) : (
              <span className="font-mono text-[10px] text-stone bg-mist px-1.5 py-0.5 rounded">
                NO COMPARISON DATA
              </span>
            )}
          </div>
          <p className="mt-2 text-[11.5px] text-stone">
            vs previous {timePeriod} ({kpis.profileViews.previous} prior)
          </p>
        </div>

        {/* KPI 3: PRODUCT VIEWS */}
        <div className="rounded-card-md border border-line bg-white p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-stone">
              3. PRODUCT VIEWS
            </span>
            <DigiIconContainer icon="cube" mode="white" size={36} />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-[28px] font-extrabold text-graphite font-mono tracking-tight">
              {kpis.productViews.current.toLocaleString()}
            </span>
            {kpis.productViews.percentChange !== null ? (
              <span
                className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                  kpis.productViews.percentChange >= 0
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {kpis.productViews.percentChange >= 0 ? `+${kpis.productViews.percentChange}%` : `${kpis.productViews.percentChange}%`}
              </span>
            ) : (
              <span className="font-mono text-[10px] text-stone bg-mist px-1.5 py-0.5 rounded">
                NO COMPARISON DATA
              </span>
            )}
          </div>
          <p className="mt-2 text-[11.5px] text-stone">
            vs previous {timePeriod} ({kpis.productViews.previous} prior)
          </p>
        </div>

        {/* KPI 4: SERVICE VIEWS */}
        <div className="rounded-card-md border border-line bg-white p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-stone">
              4. SERVICE VIEWS
            </span>
            <DigiIconContainer icon="briefcase" mode="white" size={36} />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-[28px] font-extrabold text-graphite font-mono tracking-tight">
              {kpis.serviceViews.current.toLocaleString()}
            </span>
            {kpis.serviceViews.percentChange !== null ? (
              <span
                className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                  kpis.serviceViews.percentChange >= 0
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {kpis.serviceViews.percentChange >= 0 ? `+${kpis.serviceViews.percentChange}%` : `${kpis.serviceViews.percentChange}%`}
              </span>
            ) : (
              <span className="font-mono text-[10px] text-stone bg-mist px-1.5 py-0.5 rounded">
                NO COMPARISON DATA
              </span>
            )}
          </div>
          <p className="mt-2 text-[11.5px] text-stone">
            vs previous {timePeriod} ({kpis.serviceViews.previous} prior)
          </p>
        </div>
      </div>

      {/* 03. ACTIVITY TREND CHART */}
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-royal">
              <Icon name="chart" className="h-4 w-4" />
              <span>ENGAGEMENT TIMELINE</span>
            </div>
            <h3 className="text-h3 text-graphite mt-0.5">Company Activity</h3>
          </div>
        </div>

        <ActivityTrendChart trendData={metrics.activityTrend} timePeriod={timePeriod} />
      </div>

      {/* 04. CONNECT PERFORMANCE & CONVERSION */}
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-line">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-royal">
              <Icon name="connect" className="h-4 w-4" />
              <span>COMMERCIAL CONVERSION</span>
            </div>
            <h3 className="text-h3 text-graphite mt-1">CONNECT PERFORMANCE</h3>
            <p className="text-[13px] text-stone mt-0.5">
              Business connection volume, response velocity, and lead origin attribution.
            </p>
          </div>

          <div>
            <DigiButton
              onClick={() => onSelectModule?.("connect")}
              variant="primary"
              icon="connect"
            >
              VIEW CONNECT INBOX
            </DigiButton>
          </div>
        </div>

        {/* Connect Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-card-sm bg-canvas p-4 border border-line">
            <span className="font-mono text-[10.5px] text-stone uppercase block">Total Inquiries</span>
            <span className="text-[22px] font-bold font-mono text-graphite block mt-1">
              {connectMetrics.totalInquiries}
            </span>
          </div>

          <div className="rounded-card-sm bg-canvas p-4 border border-line">
            <span className="font-mono text-[10.5px] text-stone uppercase block">Active In Progress</span>
            <span className="text-[22px] font-bold font-mono text-amber-700 block mt-1">
              {connectMetrics.inProgressInquiries + connectMetrics.openInquiries}
            </span>
          </div>

          <div className="rounded-card-sm bg-canvas p-4 border border-line">
            <span className="font-mono text-[10.5px] text-stone uppercase block">Resolved / Closed</span>
            <span className="text-[22px] font-bold font-mono text-emerald-700 block mt-1">
              {connectMetrics.resolvedInquiries + connectMetrics.closedInquiries}
            </span>
          </div>

          <div className="rounded-card-sm bg-canvas p-4 border border-line">
            <span className="font-mono text-[10.5px] text-stone uppercase block">Avg First Response</span>
            <span className="text-[22px] font-bold font-mono text-royal block mt-1">
              {connectMetrics.avgFirstResponseHours ? `${connectMetrics.avgFirstResponseHours} hrs` : "N/A"}
            </span>
          </div>
        </div>

        {/* Status Distribution & Source Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Status Distribution */}
          <div className="rounded-card-md border border-line bg-canvas p-5 space-y-3">
            <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-graphite flex items-center justify-between">
              <span>STATUS DISTRIBUTION</span>
              <span>{connectMetrics.totalInquiries} RECORDS</span>
            </h4>

            {/* Stacked Progress Bar */}
            <div className="h-3 w-full bg-mist rounded-full overflow-hidden flex">
              {connectMetrics.statusDistribution.map((st) => (
                <div
                  key={st.status}
                  style={{ width: `${st.percentage}%` }}
                  className={`h-full transition-all ${
                    st.status === "NEW"
                      ? "bg-royal"
                      : st.status === "OPEN"
                      ? "bg-electric"
                      : st.status === "IN_PROGRESS"
                      ? "bg-amber-500"
                      : st.status === "RESOLVED"
                      ? "bg-emerald-500"
                      : "bg-stone/40"
                  }`}
                  title={`${st.label}: ${st.count} (${st.percentage}%)`}
                />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 text-[12px]">
              {connectMetrics.statusDistribution.map((st) => (
                <div key={st.status} className="flex items-center justify-between font-mono">
                  <span className="text-stone">{st.label}:</span>
                  <span className="font-bold text-graphite">
                    {st.count} <span className="text-stone font-normal">({st.percentage}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Inquiry Origin Source Breakdown */}
          <div className="rounded-card-md border border-line bg-canvas p-5 space-y-3">
            <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-graphite">
              INQUIRY ORIGIN ATTRIBUTION
            </h4>

            <div className="space-y-2.5">
              {connectMetrics.sourceBreakdown.map((src) => (
                <div key={src.source} className="space-y-1">
                  <div className="flex justify-between text-[12px] font-mono">
                    <span className="text-stone">{src.label}</span>
                    <span className="font-bold text-graphite">
                      {src.count} <span className="text-stone font-normal">({src.percentage}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-mist rounded-full overflow-hidden">
                    <div
                      className="h-full bg-royal rounded-full transition-all duration-300"
                      style={{ width: `${src.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Connection Conversion Funnel */}
        <div className="rounded-card-md border border-line bg-canvas p-5 space-y-3">
          <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-graphite flex items-center justify-between">
            <span>CONNECTION CONVERSION FUNNEL</span>
            <span className="text-royal font-bold">
              CONVERSION RATE: {connectMetrics.conversionFunnel.viewToInquiryRate}%
            </span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
            <div className="rounded bg-white p-3 border border-line text-center">
              <span className="font-mono text-[10px] text-stone uppercase block">1. Profile Views</span>
              <span className="font-mono text-[16px] font-bold text-graphite mt-0.5 block">
                {connectMetrics.conversionFunnel.profileViews}
              </span>
            </div>
            <div className="rounded bg-white p-3 border border-line text-center">
              <span className="font-mono text-[10px] text-stone uppercase block">2. Product/Service Views</span>
              <span className="font-mono text-[16px] font-bold text-graphite mt-0.5 block">
                {connectMetrics.conversionFunnel.productServiceViews}
              </span>
            </div>
            <div className="rounded bg-white p-3 border border-line text-center">
              <span className="font-mono text-[10px] text-stone uppercase block">3. CTA Engagement</span>
              <span className="font-mono text-[16px] font-bold text-graphite mt-0.5 block">
                {connectMetrics.conversionFunnel.ctaClicks}
              </span>
            </div>
            <div className="rounded bg-royal/10 p-3 border border-royal/30 text-center">
              <span className="font-mono text-[10px] text-royal uppercase font-bold block">4. Inquiries</span>
              <span className="font-mono text-[16px] font-bold text-royal mt-0.5 block">
                {connectMetrics.conversionFunnel.inquiries}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 05. TOP PERFORMING CONTENT (Products & Services) */}
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-royal">
              <Icon name="cube" className="h-4 w-4" />
              <span>ATTENTION & ENGAGEMENT</span>
            </div>
            <h3 className="text-h3 text-graphite mt-1">TOP PERFORMING CONTENT</h3>
          </div>

          <div className="flex items-center bg-canvas p-1 rounded-card-sm border border-line font-mono text-[11.5px]">
            <button
              onClick={() => setActiveContentTab("PRODUCTS")}
              className={`px-3 py-1.5 font-bold rounded transition-all ${
                activeContentTab === "PRODUCTS"
                  ? "bg-white text-royal shadow-xs border border-line"
                  : "text-stone hover:text-graphite"
              }`}
            >
              PRODUCTS ({metrics.topProducts.length})
            </button>
            <button
              onClick={() => setActiveContentTab("SERVICES")}
              className={`px-3 py-1.5 font-bold rounded transition-all ${
                activeContentTab === "SERVICES"
                  ? "bg-white text-royal shadow-xs border border-line"
                  : "text-stone hover:text-graphite"
              }`}
            >
              SERVICES ({metrics.topServices.length})
            </button>
          </div>
        </div>

        {activeContentTab === "PRODUCTS" ? (
          <div className="space-y-3">
            {metrics.topProducts.length > 0 ? (
              metrics.topProducts.map((prod) => (
                <InteractiveRow
                  key={prod.id}
                  icon="cube"
                  title={prod.name}
                  subtitle={prod.category ? `Category: ${prod.category}` : "Product Catalog Entry"}
                  badge={<DigiBadge variant="soft">PRODUCT</DigiBadge>}
                  onClick={() => onSelectModule?.("products")}
                  meta={
                    <div className="font-mono text-right">
                      <span className="text-[13px] font-bold text-graphite block">
                        {prod.views} VIEWS
                      </span>
                      <span className="text-[11.5px] text-stone">
                        {prod.inquiries} Inquiries ({prod.conversionRate}% Conv)
                      </span>
                    </div>
                  }
                />
              ))
            ) : (
              <p className="text-[13px] text-stone py-4 text-center">No products published in company catalog.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {metrics.topServices.length > 0 ? (
              metrics.topServices.map((serv) => (
                <InteractiveRow
                  key={serv.id}
                  icon="briefcase"
                  title={serv.name}
                  subtitle={serv.category ? `Category: ${serv.category}` : "Service Capability Record"}
                  badge={<DigiBadge variant="neutral">SERVICE</DigiBadge>}
                  onClick={() => onSelectModule?.("services")}
                  meta={
                    <div className="font-mono text-right">
                      <span className="text-[13px] font-bold text-graphite block">
                        {serv.views} VIEWS
                      </span>
                      <span className="text-[11.5px] text-stone">
                        {serv.inquiries} Inquiries ({serv.conversionRate}% Conv)
                      </span>
                    </div>
                  }
                />
              ))
            ) : (
              <p className="text-[13px] text-stone py-4 text-center">No services published in company catalog.</p>
            )}
          </div>
        )}
      </div>

      {/* 06. COMPANY HEALTH SIGNAL & PROFILE COMPLETENESS */}
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-royal">
              <Icon name="shield" className="h-4 w-4" />
              <span>REGISTRY QUALITY</span>
            </div>
            <h3 className="text-h3 text-graphite mt-1">DIGITAL PRESENCE HEALTH</h3>
            <p className="text-[13px] text-stone mt-0.5">
              Deterministic verification and completeness parameters for optimal discovery in MarineWorld.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`font-mono text-[12px] font-extrabold px-3 py-1.5 rounded-full border ${
                healthSignal === "STRONG"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : healthSignal === "HEALTHY"
                  ? "bg-royal/5 text-royal-dark border-royal/30"
                  : healthSignal === "DEVELOPING"
                  ? "bg-amber-50 text-amber-800 border-amber-300"
                  : "bg-stone-100 text-stone-700 border-stone-300"
              }`}
            >
              SIGNAL: {healthSignal}
            </span>
            <span className="font-mono text-[16px] font-bold text-graphite">
              {profileCompletenessScore}%
            </span>
          </div>
        </div>

        {/* Completeness Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-[12px] font-mono">
            <span className="text-stone">Canonical Profile Completion Score</span>
            <span className="font-bold text-graphite">{profileCompletenessScore} / 100</span>
          </div>
          <div className="h-3 w-full bg-canvas border border-line rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                profileCompletenessScore >= 85
                  ? "bg-emerald-600"
                  : profileCompletenessScore >= 70
                  ? "bg-royal"
                  : "bg-amber-500"
              }`}
              style={{ width: `${profileCompletenessScore}%` }}
            />
          </div>
        </div>

        {/* Checklist Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {profileCompletenessItems.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-card-sm border text-[12.5px] flex items-center justify-between gap-3 ${
                item.completed ? "bg-emerald-50/50 border-emerald-200" : "bg-canvas border-line"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`h-5 w-5 rounded-full inline-flex items-center justify-center shrink-0 font-bold text-[10px] ${
                    item.completed ? "bg-emerald-600 text-white" : "bg-stone-200 text-stone-600"
                  }`}
                >
                  {item.completed ? "✓" : "!"}
                </span>
                <span className={`truncate ${item.completed ? "text-graphite font-medium" : "text-stone"}`}>
                  {item.label}
                </span>
              </div>
              <span className="font-mono text-[10.5px] text-stone shrink-0 bg-white px-2 py-0.5 rounded border border-line">
                {item.impact}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
