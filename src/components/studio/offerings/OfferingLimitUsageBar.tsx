import React from "react";
import { AlertCircle, CheckCircle2, Package, Sparkles } from "lucide-react";

interface OfferingLimitUsageBarProps {
  activeCount: number;
  maxLimit?: number;
  totalProductsCount: number;
  totalServicesCount: number;
  archivedCount: number;
}

export const OfferingLimitUsageBar: React.FC<OfferingLimitUsageBarProps> = ({
  activeCount,
  maxLimit = 12,
  totalProductsCount,
  totalServicesCount,
  archivedCount,
}) => {
  const isAtLimit = activeCount >= maxLimit;
  const isNearLimit = activeCount >= maxLimit - 2;
  const percentage = Math.min(100, Math.round((activeCount / maxLimit) * 100));

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-xs space-y-3 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-royal/10 border border-royal/20 flex items-center justify-center text-royal shrink-0 shadow-2xs">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-stone uppercase tracking-wider">
                ACTIVE OFFERINGS CAPACITY
              </span>
              {isAtLimit ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[9.5px] font-mono font-bold text-rose-700">
                  <AlertCircle className="w-3 h-3" />
                  MAX LIMIT REACHED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9.5px] font-mono font-bold text-emerald-700">
                  <CheckCircle2 className="w-3 h-3" />
                  CAPACITY AVAILABLE
                </span>
              )}
            </div>
            <div className="text-xs text-stone mt-0.5">
              Maximum 12 active products and services combined. Archived offerings do not count toward this limit.
            </div>
          </div>
        </div>

        <div className="flex items-baseline gap-1.5 self-start sm:self-auto bg-slate-50 border border-line px-4 py-2 rounded-xl shadow-2xs">
          <span className="text-2xl font-black font-mono text-graphite tracking-tight">
            {activeCount}
          </span>
          <span className="text-xs font-mono font-bold text-stone">/</span>
          <span className="text-xs font-mono font-bold text-stone">{maxLimit}</span>
          <span className="text-[10px] font-mono font-bold text-stone ml-1 uppercase">ACTIVE</span>
        </div>
      </div>

      {/* Progress meter bar */}
      <div className="space-y-1.5 pt-1">
        <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden border border-line/60 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isAtLimit
                ? "bg-rose-500"
                : isNearLimit
                ? "bg-amber-500"
                : "bg-royal"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10.5px] font-mono text-stone">
          <div className="flex items-center gap-3">
            <span>{totalProductsCount} Products</span>
            <span>•</span>
            <span>{totalServicesCount} Services</span>
            {archivedCount > 0 && (
              <>
                <span>•</span>
                <span className="text-slate-400">{archivedCount} Archived (Free)</span>
              </>
            )}
          </div>
          <span className="font-bold text-graphite">{maxLimit - activeCount} Slots Remaining</span>
        </div>
      </div>
    </div>
  );
};
