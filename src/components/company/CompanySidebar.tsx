import React from "react";
import type { IconName } from "@/lib/types";
import { Icon } from "@/components/digione/icons";
import {
  LayoutDashboard,
  Building2,
  Layers,
  Globe2,
  ShieldCheck,
  Cpu,
  Link2,
  MessageSquare,
  ChevronRight,
  Lock,
} from "lucide-react";

export interface NavigationNavItem {
  id: string;
  label: string;
  icon: IconName | string;
  meta?: string;
  badge?: string;
  disabled?: boolean;
}

export interface NavigationNavSection {
  title?: string;
  items: NavigationNavItem[];
}

export const defaultCompanyNavigationConfig: NavigationNavSection[] = [
  {
    title: "PUBLIC DIGITAL HEADQUARTERS",
    items: [
      {
        id: "overview",
        label: "OVERVIEW",
        icon: "dashboard",
        meta: "Executive Summary & Operations",
      },
      {
        id: "offerings",
        label: "OFFERINGS",
        icon: "cube",
        meta: "Products, Services & Capabilities",
      },
      {
        id: "presence",
        label: "PRESENCE",
        icon: "globe",
        meta: "Sector Cities & Nodes",
      },
      {
        id: "identity",
        label: "IDENTITY",
        icon: "shield",
        meta: "Corporate Entity & Verification",
      },
      {
        id: "connect",
        label: "CONNECT",
        icon: "connect",
        meta: "Direct RFQ & Engagement",
      },
    ],
  },
];

const ITEM_ICONS: Record<string, React.ReactNode> = {
  overview: <LayoutDashboard className="w-4 h-4 shrink-0 text-royal" />,
  company: <LayoutDashboard className="w-4 h-4 shrink-0 text-royal" />,
  offerings: <Layers className="w-4 h-4 shrink-0 text-royal" />,
  showroom: <Layers className="w-4 h-4 shrink-0 text-royal" />,
  solutions: <Layers className="w-4 h-4 shrink-0 text-royal" />,
  presence: <Globe2 className="w-4 h-4 shrink-0 text-royal" />,
  identity: <ShieldCheck className="w-4 h-4 shrink-0 text-royal" />,
  corporate: <ShieldCheck className="w-4 h-4 shrink-0 text-royal" />,
  "business-twin": <Cpu className="w-4 h-4 shrink-0 text-royal" />,
  connect: <Link2 className="w-4 h-4 shrink-0 text-royal" />,
};

function isItemActive(itemId: string, activeModule: string): boolean {
  if (itemId === activeModule) return true;

  switch (itemId) {
    case "overview":
    case "company":
      return activeModule === "overview" || activeModule === "company";
    case "offerings":
    case "showroom":
    case "solutions":
      return activeModule === "offerings" || activeModule === "showroom" || activeModule === "solutions" || activeModule === "products" || activeModule === "services";
    case "presence":
      return activeModule === "sector-city" || activeModule === "network" || activeModule === "presence";
    case "identity":
    case "corporate":
    case "governance":
      return activeModule === "identity" || activeModule === "corporate" || activeModule === "governance";
    case "business-twin":
      return activeModule === "chat" || activeModule === "ai" || activeModule === "business-twin";
    case "connect":
      return activeModule === "connect";
    default:
      return false;
  }
}

export function CompanySidebar({
  activeModule,
  onSelectModule,
  navConfig = defaultCompanyNavigationConfig,
  totalOfferings = 0,
}: {
  activeModule: string;
  onSelectModule: (moduleSlug: string) => void;
  navConfig?: NavigationNavSection[];
  totalOfferings?: number;
}) {
  const allItems = navConfig.flatMap((section) => section.items);

  return (
    <aside aria-label="Company Digital Headquarters Navigation" className="w-full lg:w-72 shrink-0">
      {/* Mobile Accordion / Dropdown Selector */}
      <div className="block lg:hidden mb-6 rounded-2xl border border-line bg-white p-4 shadow-2xs">
        <label htmlFor="company-module-select" className="block font-mono text-[10px] font-bold uppercase tracking-widest text-royal mb-2">
          PUBLIC DIGITAL HEADQUARTERS
        </label>
        <div className="relative">
          <select
            id="company-module-select"
            value={activeModule}
            onChange={(e) => onSelectModule(e.target.value)}
            className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-xs font-bold text-graphite focus:border-royal focus:outline-none"
          >
            {allItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label} — {item.meta}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Desktop Editorial Sidebar Navigation */}
      <div className="hidden lg:block space-y-4 sticky top-20 rounded-2xl border border-line bg-white p-5 shadow-2xs">
        {/* Navigation Header */}
        <div className="border-b border-line pb-4 space-y-1">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-royal block">
            DIGITAL HEADQUARTERS
          </span>
          <h3 className="font-sans text-sm font-black text-graphite tracking-tight">
            Company Navigation
          </h3>
        </div>

        {/* Navigation Items List */}
        <nav aria-label="Company Public Sections" className="space-y-2">
          {allItems.map((item) => {
            const active = isItemActive(item.id, activeModule);
            const iconNode = ITEM_ICONS[item.id] || <Icon name={item.icon as IconName} className="w-4 h-4 shrink-0" />;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectModule(item.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group ${
                  active
                    ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                    : "bg-white border-line/80 text-stone hover:bg-slate-50 hover:border-slate-300 hover:text-graphite"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                      active ? "bg-slate-800 text-white" : "bg-slate-100/80 text-slate-700 group-hover:bg-royal/10 group-hover:text-royal"
                    }`}
                  >
                    {React.cloneElement(iconNode as React.ReactElement<{ className?: string }>, {
                      className: `w-4 h-4 shrink-0 ${active ? "text-white" : "text-royal"}`,
                    })}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-sans text-xs font-bold tracking-tight block truncate ${active ? "text-white" : "text-graphite"}`}>
                        {item.label}
                      </span>
                    </div>
                    {item.meta && (
                      <span className={`font-mono text-[10px] block truncate mt-0.5 ${active ? "text-slate-300" : "text-stone"}`}>
                        {item.meta}
                      </span>
                    )}
                  </div>
                </div>

                {/* Counter Badge for OFFERINGS */}
                {(item.id === "offerings" || item.id === "showroom" || item.id === "solutions") && totalOfferings > 0 ? (
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      active ? "bg-royal text-white" : "bg-slate-100 text-royal"
                    }`}
                  >
                    {totalOfferings}
                  </span>
                ) : (
                  <ChevronRight
                    className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                      active ? "text-slate-300 translate-x-0.5" : "text-slate-300 group-hover:text-slate-500"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Institutional Credential Box */}
        <div className="pt-4 border-t border-line/80">
          <div className="p-3 bg-slate-50 border border-line rounded-xl space-y-1 font-mono text-[10px] text-stone">
            <div className="flex items-center gap-1.5 font-bold text-graphite uppercase tracking-wider">
              <Lock className="w-3 h-3 text-royal" />
              <span>PUBLIC DIGITAL NODE</span>
            </div>
            <p className="text-stone leading-relaxed text-[9.5px]">
              Verified public record on MarineWorld Network.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
