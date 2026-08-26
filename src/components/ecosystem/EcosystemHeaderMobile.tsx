import React, { useState } from "react";
import { Menu, X, ShieldCheck, Building2, LogOut, ExternalLink } from "lucide-react";
import { LogoMark } from "@/components/digione/icons";
import type { EcosystemOrganizationSummary } from "@/lib/services/ecosystemOrganizationService";
import type { EcosystemNavTab } from "./EcosystemSidebar";

interface EcosystemHeaderMobileProps {
  activeTab: EcosystemNavTab;
  onTabChange: (tab: EcosystemNavTab) => void;
  organization: EcosystemOrganizationSummary;
  onSwitchContext?: () => void;
  onSignOut?: () => void;
  onNavigate?: (path: string) => void;
}

const NAV_ITEMS: { id: EcosystemNavTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "members", label: "Members" },
  { id: "enrollment", label: "Enrollment" },
  { id: "verification", label: "Verification" },
  { id: "ecosystem", label: "Ecosystem" },
  { id: "insights", label: "Insights" },
  { id: "reports", label: "Reports" },
  { id: "identity", label: "Organization Profile" },
  { id: "settings", label: "Settings" },
];

export function EcosystemHeaderMobile({
  activeTab,
  onTabChange,
  organization,
  onSwitchContext,
  onSignOut,
  onNavigate,
}: EcosystemHeaderMobileProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <header className="lg:hidden bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-2.5">
        <LogoMark className="h-6 w-2 text-graphite shrink-0" />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-sans text-[15px] font-bold tracking-tight text-graphite">
              MarineWorld.City
            </span>
            <span className="rounded bg-mist px-1.5 py-0.5 font-sans text-[9px] font-semibold uppercase tracking-wider text-mute">
              SEC-01
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <h1 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider leading-none">
              Ecosystem Hub
            </h1>
            <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
          </div>
        </div>
      </div>

      <button
        onClick={() => setDrawerOpen(!drawerOpen)}
        className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 transition-colors cursor-pointer"
        aria-label="Toggle navigation drawer"
      >
        {drawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* MOBILE COLLAPSIBLE DRAWER */}
      {drawerOpen && (
        <div className="fixed inset-0 top-16 bg-slate-950/50 backdrop-blur-xs z-50 flex flex-col animate-in fade-in duration-150">
          <div className="bg-white border-b border-slate-200 p-4 space-y-2 overflow-y-auto max-h-[85vh]">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {organization.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-slate-900 truncate">
                  {organization.name}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {organization.principalAuthorityName}
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-royal bg-royal/5 px-2 py-0.5 rounded border border-royal/20">
                Verified
              </span>
            </div>

            <nav className="grid grid-cols-1 gap-1 py-2">
              {NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      setDrawerOpen(false);
                    }}
                    className={`min-h-[48px] px-4 rounded-xl text-xs font-bold flex items-center justify-between text-left transition-colors cursor-pointer ${
                      isActive
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  if (onNavigate) onNavigate(`/companies/${organization.slug}`);
                }}
                className="w-full min-h-[48px] flex items-center justify-between px-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800"
              >
                <span>View Organization Public Profile</span>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </button>

              {onSwitchContext && (
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    onSwitchContext();
                  }}
                  className="w-full min-h-[48px] flex items-center justify-between px-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <span>Switch Organization Context</span>
                  <Building2 className="w-4 h-4 text-slate-400" />
                </button>
              )}

              {onSignOut && (
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    onSignOut();
                  }}
                  className="w-full min-h-[48px] flex items-center justify-between px-4 bg-rose-50 border border-rose-200/80 rounded-xl text-xs font-bold text-rose-700"
                >
                  <span>Sign Out</span>
                  <LogOut className="w-4 h-4 text-rose-600" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
