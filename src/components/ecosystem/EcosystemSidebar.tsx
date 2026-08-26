import React, { useState } from "react";
import {
  Grid,
  Users,
  Ticket,
  ShieldCheck,
  Globe,
  Handshake,
  FileText,
  Settings,
  Building2,
  CheckCircle2,
  LogOut,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Layers,
} from "lucide-react";
import { LogoMark } from "@/components/digione/icons";
import type { EcosystemOrganizationSummary } from "@/lib/services/ecosystemOrganizationService";

export type EcosystemNavTab =
  | "overview"
  | "members"
  | "enrollment"
  | "verification"
  | "ecosystem"
  | "insights"
  | "reports"
  | "identity"
  | "settings";

interface EcosystemSidebarProps {
  activeTab: EcosystemNavTab;
  onTabChange: (tab: EcosystemNavTab) => void;
  organization: EcosystemOrganizationSummary;
  onSwitchContext?: () => void;
  onSignOut?: () => void;
  onNavigate?: (path: string) => void;
}

const NAV_ITEMS: { id: EcosystemNavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", icon: Grid },
  { id: "members", label: "Members", icon: Users },
  { id: "enrollment", label: "Enrollment", icon: Ticket },
  { id: "verification", label: "Verification", icon: ShieldCheck },
  { id: "ecosystem", label: "Ecosystem", icon: Globe },
  { id: "insights", label: "Insights", icon: Handshake },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "identity", label: "Organization Profile", icon: Layers },
  { id: "settings", label: "Settings", icon: Settings },
];

export function EcosystemSidebar({
  activeTab,
  onTabChange,
  organization,
  onSwitchContext,
  onSignOut,
  onNavigate,
}: EcosystemSidebarProps) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`${
        isCollapsed ? "w-20" : "w-64"
      } transition-all duration-300 ease-in-out bg-white border-r border-slate-200/90 flex flex-col h-screen sticky top-0 shrink-0 select-none z-30`}
    >
      {/* BRAND HEADER */}
      <div
        className={`p-4 border-b border-slate-100 flex items-center ${
          isCollapsed ? "justify-center flex-col gap-2" : "justify-between gap-2"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <LogoMark className="h-6 w-2 text-graphite shrink-0" />
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <span className="font-sans text-[15px] font-bold tracking-tight text-graphite truncate">
                  MarineWorld.City
                </span>
                <span className="rounded bg-mist px-1.5 py-0.5 font-sans text-[9px] font-semibold uppercase tracking-wider text-mute shrink-0">
                  SEC-01
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider truncate">
                  Ecosystem Hub
                </span>
                <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-all cursor-pointer shrink-0 border border-transparent hover:border-slate-200"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label="Toggle Sidebar"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          )}
        </button>
      </div>

      {/* NAVIGATION LINKS */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-2.5"
              } rounded-xl text-xs font-semibold transition-all text-left cursor-pointer group ${
                isActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                }`}
              />
              {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* BOTTOM ORGANIZATION IDENTITY CARD & MENU */}
      <div className="p-2.5 border-t border-slate-200/80 bg-slate-50/50 relative">
        {accountMenuOpen && (
          <div
            className={`absolute ${
              isCollapsed
                ? "left-full bottom-2 ml-2 w-56"
                : "bottom-full left-2 right-2 mb-2"
            } bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 space-y-1`}
          >
            <button
              onClick={() => {
                setAccountMenuOpen(false);
                if (onNavigate) onNavigate(`/companies/${organization.slug}`);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors text-left cursor-pointer"
            >
              <span>View Public Profile</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {onSwitchContext && (
              <button
                onClick={() => {
                  setAccountMenuOpen(false);
                  onSwitchContext();
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors text-left cursor-pointer"
              >
                <span>Switch Organization Context</span>
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}

            <div className="my-1 border-t border-slate-100" />

            {onSignOut && (
              <button
                onClick={() => {
                  setAccountMenuOpen(false);
                  onSignOut();
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
              >
                <span>Sign Out</span>
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
              </button>
            )}
          </div>
        )}

        <button
          onClick={() => setAccountMenuOpen(!accountMenuOpen)}
          title={isCollapsed ? `${organization.name} (${organization.principalAuthorityName})` : undefined}
          className={`w-full flex items-center ${
            isCollapsed ? "justify-center p-2" : "gap-3 p-2.5"
          } rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 transition-all text-left shadow-2xs group cursor-pointer`}
        >
          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
            {organization.name.substring(0, 2).toUpperCase()}
          </div>

          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {organization.name}
                  </h4>
                  <CheckCircle2 className="w-3.5 h-3.5 text-royal shrink-0" />
                </div>
                <p className="text-[10px] font-medium text-slate-500 truncate mt-0.5">
                  {organization.principalAuthorityName}
                </p>
              </div>

              <ChevronUp
                className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform ${
                  accountMenuOpen ? "rotate-180" : ""
                }`}
              />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
