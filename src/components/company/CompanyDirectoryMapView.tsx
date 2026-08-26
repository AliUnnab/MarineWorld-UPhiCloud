import { useState, useMemo } from "react";
import type { CompanyProfile } from "@/lib/types";
import { Building2, MapPin, CheckCircle2, ArrowRight, Cpu, Layers, Globe2 } from "lucide-react";
import { SaveEntityButton } from "@/components/foundation/SaveEntityButton";
import { formatAvatarInitials, isCompanyAnchor } from "@/lib/registry";

interface MapViewProps {
  companies: CompanyProfile[];
  onSelectCompany?: (company: CompanyProfile) => void;
}

export function CompanyDirectoryMapView({ companies, onSelectCompany }: MapViewProps) {
  const [selectedCompany, setSelectedCompany] = useState<CompanyProfile | null>(null);
  const [activeRegion, setActiveRegion] = useState<string>("all");

  const regions = useMemo(() => {
    const map = new Map<string, number>();
    companies.forEach((c) => {
      const reg = c.region || "Global";
      map.set(reg, (map.get(reg) || 0) + 1);
    });
    return [
      { id: "all", name: "All Regions", count: companies.length },
      ...Array.from(map.entries()).map(([name, count]) => ({ id: name, name, count })),
    ];
  }, [companies]);

  const filtered = useMemo(() => {
    if (activeRegion === "all") return companies;
    return companies.filter((c) => c.region === activeRegion);
  }, [companies, activeRegion]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      {/* Map Header Toolbar */}
      <div className="border-b border-slate-200 bg-slate-50/70 p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-royal" />
          <span className="text-xs font-bold font-mono tracking-wider text-slate-800 uppercase">
            Geographic Maritime Hubs ({filtered.length} Nodes Plotted)
          </span>
        </div>

        {/* Region selector chips */}
        <div className="flex flex-wrap gap-1.5">
          {regions.slice(0, 6).map((reg) => (
            <button
              key={reg.id}
              onClick={() => setActiveRegion(reg.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                activeRegion === reg.id
                  ? "bg-royal text-white shadow-xs font-semibold"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {reg.name} ({reg.count})
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Map Visual Stage */}
      <div className="relative aspect-[21/9] min-h-[360px] max-h-[500px] w-full bg-slate-900 overflow-hidden flex items-center justify-center select-none">
        {/* Graticule & Blueprint Lines */}
        <svg
          className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          {/* Latitude lines */}
          <line x1="0" y1="20%" x2="100%" y2="20%" stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="3,3" />
          <line x1="0" y1="40%" x2="100%" y2="40%" stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="3,3" />
          <line x1="0" y1="60%" x2="100%" y2="60%" stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="3,3" />
          <line x1="0" y1="80%" x2="100%" y2="80%" stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="3,3" />
        </svg>

        {/* Schematic World Silhouette Contour */}
        <svg
          viewBox="0 0 100 60"
          className="absolute inset-0 w-full h-full text-slate-800/80 fill-current opacity-40 pointer-events-none"
          preserveAspectRatio="none"
        >
          {/* North America */}
          <path d="M 12 12 Q 22 8 28 16 Q 24 24 20 28 Q 14 26 12 12 Z" />
          {/* South America */}
          <path d="M 26 34 Q 36 36 34 48 Q 28 52 25 40 Z" />
          {/* Europe */}
          <path d="M 45 10 Q 56 8 58 18 Q 50 24 45 18 Z" />
          {/* Africa */}
          <path d="M 46 25 Q 58 24 56 42 Q 48 48 46 25 Z" />
          {/* Asia */}
          <path d="M 60 10 Q 82 8 84 28 Q 70 34 60 22 Z" />
          {/* Australia */}
          <path d="M 80 44 Q 90 42 88 52 Q 80 54 80 44 Z" />
        </svg>

        {/* Company Node Pins */}
        <div className="absolute inset-0 p-4">
          {filtered.map((comp) => {
            const mapX = (comp as any).mapX ?? 50;
            const mapY = (comp as any).mapY ?? 30;
            const isSelected = selectedCompany?.id === comp.id;

            return (
              <button
                key={comp.id}
                onClick={() => {
                  setSelectedCompany(comp);
                  if (onSelectCompany) onSelectCompany(comp);
                }}
                style={{
                  left: `${Math.min(95, Math.max(5, mapX))}%`,
                  top: `${Math.min(90, Math.max(10, mapY))}%`,
                }}
                className={`group absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-200 z-10 ${
                  isSelected ? "z-30 scale-125" : "hover:scale-110"
                }`}
                title={`${comp.displayName || comp.name} (${comp.location || comp.city})`}
              >
                <div className="relative flex items-center justify-center">
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-md transition-colors ${
                      (comp as any).presenceTier === "FLAGSHIP"
                        ? "bg-amber-400"
                        : comp.verificationStatus === "verified"
                        ? "bg-royal"
                        : "bg-slate-400"
                    }`}
                  />
                  {isSelected && (
                    <span className="absolute -inset-1 rounded-full border-2 border-cyan-400 animate-ping opacity-75" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Map Legend */}
        <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-sm border border-slate-800 rounded-xl px-3 py-2 text-[10px] text-slate-300 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Flagship Property</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-royal" />
            <span>Verified Enterprise</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Registry Listing</span>
          </div>
        </div>
      </div>

      {/* Selected Company Preview Drawer */}
      {selectedCompany && (
        <div className="border-t border-slate-200 bg-slate-50 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs font-bold text-royal text-sm uppercase">
              {selectedCompany.coverImage || selectedCompany.logoUrl ? (
                <img
                  src={selectedCompany.coverImage || selectedCompany.logoUrl}
                  alt={selectedCompany.displayName || selectedCompany.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{formatAvatarInitials(selectedCompany.initials, selectedCompany.displayName || selectedCompany.name)}</span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">
                  {selectedCompany.displayName || selectedCompany.name}
                </h4>
                {isCompanyAnchor(selectedCompany) && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-800 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-full">
                    Anchor
                  </span>
                )}
                {selectedCompany.verificationStatus === "verified" && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-royal bg-royal/10 border border-royal/20 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    VERIFIED
                  </span>
                )}
                {selectedCompany.aiStatus === "twin" && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <Cpu className="w-3 h-3 text-emerald-600" />
                    TWIN READY
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                <span className="font-mono text-royal font-semibold uppercase">{selectedCompany.industry}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {selectedCompany.location || selectedCompany.country}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <SaveEntityButton
              type="company"
              id={selectedCompany.id || selectedCompany.slug}
              variant="icon"
              size="sm"
            />
            <button
              onClick={() => setSelectedCompany(null)}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium"
            >
              Close
            </button>
            <a
              href={`/companies/${selectedCompany.slug || selectedCompany.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-royal hover:bg-royal-dark text-white text-xs font-bold shadow-xs transition"
            >
              <span>EXPLORE COMPANY</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
