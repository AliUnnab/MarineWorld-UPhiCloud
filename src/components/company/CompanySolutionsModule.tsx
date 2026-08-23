import { useState } from "react";
import type { CompanyOffering, CompanyProfile } from "@/lib/types";
import { UnifiedOfferingCard } from "./UnifiedOfferingCard";
import { ProductExperienceModal } from "./ProductExperienceModal";
import { EmptyState } from "@/components/foundation/EmptyState";
import { Package, CheckCircle2 } from "lucide-react";

export function CompanySolutionsModule({ company }: { company: CompanyProfile }) {
  const [selectedOffering, setSelectedOffering] = useState<CompanyOffering | null>(null);

  // 1. Gather and normalize all published offerings
  const rawOfferings: CompanyOffering[] = company.offerings ?? [];
  const normalizedOfferings: CompanyOffering[] = [...rawOfferings];

  // Fallback normalization if company.offerings array is empty
  if (normalizedOfferings.length === 0) {
    if (company.products && company.products.length > 0) {
      company.products.forEach((pName, idx) => {
        normalizedOfferings.push({
          id: `${company.id}-prod-${idx}`,
          companyId: company.id,
          name: pName,
          type: "product",
          category: "Products & Goods",
          shortDescription: `${pName} supplied directly by ${company.displayName || company.name} under verified marine class standards.`,
          status: "AVAILABLE",
        });
      });
    }

    if (company.services && company.services.length > 0) {
      company.services.forEach((sName, idx) => {
        normalizedOfferings.push({
          id: `${company.id}-serv-${idx}`,
          companyId: company.id,
          name: sName,
          type: "service",
          category: "Operational Services",
          shortDescription: `${sName} provided by ${company.displayName || company.name} across ${company.headquartersCity || "global nodes"}.`,
          status: "ACTIVE",
        });
      });
    }

    if (company.capabilities && company.capabilities.length > 0 && normalizedOfferings.length === 0) {
      company.capabilities.forEach((cName, idx) => {
        normalizedOfferings.push({
          id: `${company.id}-cap-${idx}`,
          companyId: company.id,
          name: cName,
          type: "capability",
          category: "Enterprise Capabilities",
          shortDescription: `Audit-verified enterprise capability of ${company.displayName || company.name}.`,
          status: "SPECIFICATION",
        });
      });
    }
  }

  const totalCount = normalizedOfferings.length;
  const displayName = company.displayName || company.name;

  // Single-offering vs multi-offering logic
  const isSingleOffering = totalCount === 1;
  const featuredOffering = normalizedOfferings[0];
  const remainingOfferings = totalCount > 1 ? normalizedOfferings.slice(1) : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-200 font-sans">
      
      {/* ========================================================================= */}
      {/* 01. SLIM INTRO STRIP (COMPACT SECTION HEADER & SUMMARY COUNT)              */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-line bg-white px-5 py-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-royal/10 text-royal font-bold">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-royal uppercase tracking-widest">
                OFFERINGS
              </span>
              <span className="text-line">•</span>
              <span className="font-sans text-xs font-semibold text-graphite">
                {totalCount} {totalCount === 1 ? "published offering" : "published offerings"}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Commercial products, technical services, and enterprise capabilities published by {displayName}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-800 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verified Registry Node</span>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 02. NO OFFERINGS EMPTY STATE                                              */}
      {/* ========================================================================= */}
      {totalCount === 0 && (
        <EmptyState
          icon="cube"
          title={`No showroom items published`}
          description={`${displayName} has not listed any offerings in this registry node yet.`}
        />
      )}

      {/* ========================================================================= */}
      {/* 03. SINGLE OFFERING DISPLAY (EXACTLY ONE CARD — NO DUPLICATION)           */}
      {/* ========================================================================= */}
      {isSingleOffering && featuredOffering && (
        <section aria-label="Published Offering" className="space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <div className="flex items-center gap-2 font-mono text-[10.5px] font-bold text-slate-700 uppercase tracking-widest">
              <Package className="w-3.5 h-3.5 text-royal" />
              <span>PUBLISHED OFFERING</span>
            </div>
            <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              1 ITEM TOTAL
            </span>
          </div>

          <div className="max-w-2xl">
            <UnifiedOfferingCard
              offering={featuredOffering}
              company={company}
              isFeatured={true}
              index={0}
              onClick={() => setSelectedOffering(featuredOffering)}
            />
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 04. MULTI-OFFERING DISPLAY (FEATURED CARD + GRID OF REMAINING CARDS)     */}
      {/* ========================================================================= */}
      {!isSingleOffering && totalCount > 1 && (
        <div className="space-y-8">
          
          {/* Flagship / Featured Offering */}
          {featuredOffering && (
            <section id="featured-offering" className="space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <div className="flex items-center gap-2 font-mono text-[10.5px] font-bold text-royal uppercase tracking-widest">
                  <Package className="w-3.5 h-3.5 text-royal" />
                  <span>FEATURED OFFERING</span>
                </div>
                <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  FLAGSHIP EXHIBIT
                </span>
              </div>

              <div className="max-w-2xl">
                <UnifiedOfferingCard
                  offering={featuredOffering}
                  company={company}
                  isFeatured={true}
                  index={0}
                  onClick={() => setSelectedOffering(featuredOffering)}
                />
              </div>
            </section>
          )}

          {/* Remaining Catalog Grid */}
          {remainingOfferings.length > 0 && (
            <section id="catalog-offerings" className="space-y-4 pt-4 border-t border-line">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <div className="flex items-center gap-2 font-mono text-[10.5px] font-bold text-slate-700 uppercase tracking-widest">
                  <Package className="w-3.5 h-3.5 text-slate-500" />
                  <span>ADDITIONAL OFFERINGS</span>
                </div>
                <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {remainingOfferings.length} {remainingOfferings.length === 1 ? "ITEM" : "ITEMS"}
                </span>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {remainingOfferings.map((item, idx) => (
                  <UnifiedOfferingCard
                    key={item.id}
                    offering={item}
                    company={company}
                    isFeatured={false}
                    index={idx + 1}
                    onClick={() => setSelectedOffering(item)}
                  />
                ))}
              </div>
            </section>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* 05. PRODUCT EXPERIENCE / DETAIL MODAL                                    */}
      {/* ========================================================================= */}
      {selectedOffering && (
        <ProductExperienceModal
          offering={selectedOffering}
          company={company}
          allOfferings={normalizedOfferings}
          onClose={() => setSelectedOffering(null)}
        />
      )}

    </div>
  );
}
