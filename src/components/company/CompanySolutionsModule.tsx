import { useState, useEffect, useRef } from "react";
import type { CompanyOffering, CompanyProfile } from "@/lib/types";
import { UnifiedOfferingCard } from "./UnifiedOfferingCard";
import { ProductExperienceModal } from "./ProductExperienceModal";
import { EmptyState } from "@/components/foundation/EmptyState";
import { Package, CheckCircle2, ChevronLeft, ChevronRight, Globe2 } from "lucide-react";
import { getCompanyOfferings, fetchCompanyOfferingsAsync } from "@/lib/services/offeringEntityService";

export function CompanySolutionsModule({
  company,
  initialOfferingSlug,
  onSelectProduct,
  onSelectService,
}: {
  company: CompanyProfile;
  initialOfferingSlug?: string;
  onSelectProduct?: (slug?: string) => void;
  onSelectService?: (slug?: string) => void;
}) {
  const [selectedOffering, setSelectedOffering] = useState<CompanyOffering | null>(null);
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);
  const [asyncOfferings, setAsyncOfferings] = useState<CompanyOffering[]>([]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync offerings directly from Firestore on mount
  useEffect(() => {
    if (!company?.id) return;
    fetchCompanyOfferingsAsync(company.id).then((list) => {
      if (list && list.length > 0) {
        setAsyncOfferings(list);
      }
    });
  }, [company?.id]);

  // 1. Gather canonical offerings from service, Firestore async state, and company state
  const canonicalList = getCompanyOfferings(company.id) || [];
  const rawOfferings: CompanyOffering[] = company.offerings ?? [];
  
  // Merge and deduplicate offerings
  const offeringMap = new Map<string, CompanyOffering>();
  [...canonicalList, ...rawOfferings, ...asyncOfferings].forEach((off) => {
    if (off && off.id && !offeringMap.has(off.id)) {
      offeringMap.set(off.id, off);
    }
  });

  const normalizedOfferings: CompanyOffering[] = Array.from(offeringMap.values());

  // Fallback normalization if no offerings found in state
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

  // Auto-select offering when initialOfferingSlug or query params match
  useEffect(() => {
    const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const targetSlug = initialOfferingSlug || searchParams.get("product") || searchParams.get("service") || searchParams.get("offering") || searchParams.get("slug");
    
    if (targetSlug && normalizedOfferings.length > 0) {
      const match = normalizedOfferings.find(
        (o) =>
          o.id === targetSlug ||
          (o as any).slug === targetSlug ||
          o.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === targetSlug.toLowerCase() ||
          o.name.toLowerCase() === targetSlug.toLowerCase() ||
          targetSlug.toLowerCase().includes(o.id.toLowerCase()) ||
          o.id.toLowerCase().includes(targetSlug.toLowerCase())
      );
      if (match) {
        setSelectedOffering(match);
      }
    }
  }, [initialOfferingSlug, normalizedOfferings.length]);

  const totalCount = normalizedOfferings.length;
  const displayName = company.displayName || company.name;

  // Derive featured items (top 3 or all if < 3)
  const featuredOfferings = normalizedOfferings.length > 0 ? normalizedOfferings.slice(0, Math.min(4, normalizedOfferings.length)) : [];
  const currentFeatured = featuredOfferings[activeFeaturedIndex % (featuredOfferings.length || 1)] || normalizedOfferings[0];

  // Featured slide navigation controls
  const handlePrevFeatured = () => {
    setActiveFeaturedIndex((prev) => (prev > 0 ? prev - 1 : featuredOfferings.length - 1));
  };

  const handleNextFeatured = () => {
    setActiveFeaturedIndex((prev) => (prev < featuredOfferings.length - 1 ? prev + 1 : 0));
  };

  // Horizontal catalog scroll controls
  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -340, behavior: "smooth" });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 340, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-200 font-sans pb-8">
      
      {/* ========================================================================= */}
      {/* 01. NO OFFERINGS EMPTY STATE                                              */}
      {/* ========================================================================= */}
      {totalCount === 0 && (
        <EmptyState
          icon="cube"
          title={`No showroom items published`}
          description={`${displayName} has not listed any offerings in this registry node yet.`}
        />
      )}

      {totalCount > 0 && (
        <>
          {/* ========================================================================= */}
          {/* 02. SECTION 1: FEATURED OFFERINGS (SLIDER AREA WITH BÜYÜK YATAY KART)      */}
          {/* ========================================================================= */}
          <section id="featured-offerings-section" className="space-y-4">
            
            {/* Header row with Title, View All & Slider Arrows */}
            <div className="flex items-center justify-between border-b border-line/80 pb-3">
              <div className="flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-royal" />
                <span className="font-mono text-xs font-bold text-graphite uppercase tracking-widest">
                  FEATURED OFFERINGS
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("all-offerings-section");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-royal transition-colors cursor-pointer"
                >
                  View all
                </button>

                {featuredOfferings.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePrevFeatured}
                      aria-label="Previous Featured Offering"
                      className="p-1.5 rounded-full border border-line bg-white text-graphite hover:bg-slate-100 transition shadow-2xs cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextFeatured}
                      aria-label="Next Featured Offering"
                      className="p-1.5 rounded-full border border-line bg-white text-graphite hover:bg-slate-100 transition shadow-2xs cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Large Horizontal Featured Showcase Card */}
            {currentFeatured && (
              <div className="relative">
                <UnifiedOfferingCard
                  offering={currentFeatured}
                  company={company}
                  isFeatured={true}
                  layout="horizontal"
                  index={activeFeaturedIndex}
                  onClick={() => setSelectedOffering(currentFeatured)}
                />
              </div>
            )}

            {/* Featured Pagination Dots */}
            {featuredOfferings.length > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                {featuredOfferings.map((_, idx) => (
                  <button
                    key={`dot-${idx}`}
                    onClick={() => setActiveFeaturedIndex(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      idx === activeFeaturedIndex
                        ? "w-6 bg-royal"
                        : "w-2 bg-slate-300 hover:bg-slate-400"
                    }`}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ========================================================================= */}
          {/* 03. SECTION 2: ALL OFFERINGS (SAĞA VE SOLA KAYAN KATALOG ROW)              */}
          {/* ========================================================================= */}
          <section id="all-offerings-section" className="space-y-4 pt-2">
            
            {/* Header row with Title, View All & Slider Controls */}
            <div className="flex items-center justify-between border-b border-line/80 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-graphite" />
                <span className="font-mono text-xs font-bold text-graphite uppercase tracking-widest">
                  ALL OFFERINGS
                </span>
                <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono text-[10px] font-bold">
                  {totalCount}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
                  {totalCount} total items
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleScrollLeft}
                    aria-label="Scroll left catalog"
                    className="p-1.5 rounded-full border border-line bg-white text-graphite hover:bg-slate-100 transition shadow-2xs cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleScrollRight}
                    aria-label="Scroll right catalog"
                    className="p-1.5 rounded-full border border-line bg-white text-graphite hover:bg-slate-100 transition shadow-2xs cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Horizontal Scrollable Row for Catalog Cards (Sağa ve Sola Kayan) */}
            <div className="relative group">
              <div
                ref={scrollContainerRef}
                className="flex gap-5 overflow-x-auto scrollbar-none snap-x snap-mandatory py-2 px-0.5 scroll-smooth"
              >
                {normalizedOfferings.map((item, idx) => (
                  <div
                    key={item.id}
                    className="shrink-0 snap-start w-[280px] sm:w-[320px] lg:w-[340px]"
                  >
                    <UnifiedOfferingCard
                      offering={item}
                      company={company}
                      isFeatured={false}
                      layout="vertical"
                      index={idx}
                      onClick={() => setSelectedOffering(item)}
                    />
                  </div>
                ))}
              </div>
            </div>

          </section>

          {/* ========================================================================= */}
          {/* 04. BOTTOM SUMMARY BAR                                                   */}
          {/* ========================================================================= */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-line bg-canvas px-5 py-3.5 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-royal/10 text-royal font-bold">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-graphite">
                  OFFERINGS {totalCount} total offerings published
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Commercial products, technical services, and enterprise capabilities published by {displayName}.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-800 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>VERIFIED REGISTRY NODE</span>
              </span>
            </div>
          </div>
        </>
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
