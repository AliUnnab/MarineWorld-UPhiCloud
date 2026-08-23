import { useState } from "react";
import type { CompanyProfile, SectorCity, IndustryDomainEntity, SectorConfig, CompanyOffering } from "@/lib/types";
import { resolveMarineWorldCompanyDigitalId } from "@/lib/services/companyIdentityService";
import {
  Globe2,
  Cpu,
  ArrowUpRight,
  ChevronRight,
  Sparkles,
  Radio,
  Layers,
  Send,
  Building2,
  Database,
  Bot,
  MessageSquareCode,
  Users,
} from "lucide-react";
import { ProductExperienceModal } from "./ProductExperienceModal";

export function CompanyDashboardView({
  company,
  primaryCity,
  parentDomain,
  config,
  onSelectModule,
  onOpenConnectModal,
  onOpenTwinModal,
  onOpenShareModal,
}: {
  company: CompanyProfile;
  primaryCity?: SectorCity;
  parentDomain?: IndustryDomainEntity;
  config?: SectorConfig;
  onSelectModule: (moduleSlug: string) => void;
  onOpenConnectModal?: () => void;
  onOpenTwinModal?: () => void;
  onOpenShareModal?: () => void;
}) {
  const [selectedOfferingModal, setSelectedOfferingModal] = useState<CompanyOffering | null>(null);
  const displayName = company.displayName || company.name || "Enterprise Company";
  const legalName = company.legalName || company.name || displayName;
  const headquartersCity = company.headquartersCity || "International Maritime Hub";
  const country = company.country || "Global";
  const isVerified = String(company.verificationStatus || "VERIFIED").toLowerCase().includes("verified");
  const operatingStatus = company.operatingStatus || "ACTIVE";
  
  const digitalIdInfo = resolveMarineWorldCompanyDigitalId({
    companyIdOrSlug: company.id,
    mwCompanyDigitalId: company.mwCompanyDigitalId,
    businessId: company.businessId,
    companyId6Digit: company.companyId6Digit,
    primaryRegistryCode: company.primaryRegistryCode,
    primarySectorCityId: company.sectorCityIds?.[0] || company.cityIds?.[0] || primaryCity?.id,
  });

  const primarySectorCategory = String(
    company.primarySectorCategory ||
    primaryCity?.category ||
    parentDomain?.name ||
    "Marine Logistics & Supply"
  );

  const regionalEdition = company.regionalEditions?.[0] || company.region || "MEDITERRANEAN";
  
  const sectorCityName = (primaryCity?.domain || primaryCity?.id || company.sectorCityIds?.[0] || "supplychain").toUpperCase();
  const formattedSectorCity = sectorCityName.endsWith(".CITY") ? sectorCityName : `${sectorCityName}.CITY`;

  // Operating nodes count
  const allNodes = new Set([...(company.sectorCityIds || []), ...(company.cityIds || [])]);
  const operatingNodesCount = Math.max(1, allNodes.size);

  // Total offerings count
  const totalOfferings = (company.offerings?.length ?? 0) ||
    ((company.products?.length ?? 0) + (company.services?.length ?? 0));

  // Canonical Single Description String (shown exactly once)
  const companyDescription =
    company.description ||
    company.corporateDescription ||
    company.shortDescription ||
    `${displayName} operates as an authorized institutional ${primarySectorCategory.toLowerCase()} enterprise within the MarineWorld global network.`;

  const [flagshipImageError, setFlagshipImageError] = useState(false);

  // 03 — FLAGSHIP COMPANY PRESENCE MEDIA
  const flagshipImage =
    company.coverImage ||
    (company as any).heroImageUrl ||
    "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=1600&q=80";

  // 04 — OPERATING PROFILE (Max 5 non-repeating institutional fields)
  const secondaryFocus = company.secondarySectorCategories?.join(", ") || 
    (company.capabilities && company.capabilities.length > 0 ? company.capabilities.slice(0, 2).join(", ") : undefined);
  const operatingModel = company.companyType || company.organizationType || "Enterprise Operating Node";
  const companyClassification = company.recordType === "PUBLIC_REGISTRY" ? "Public Registry Node" : "Verified Commercial Entity";

  // 07 — FEATURED OFFERING TEASER
  const rawOfferings: CompanyOffering[] = company.offerings ?? [];
  let featuredOffering: CompanyOffering | null = null;

  if (rawOfferings.length > 0) {
    featuredOffering = rawOfferings[0];
  } else if (company.products && company.products.length > 0) {
    featuredOffering = {
      id: "prod-featured-1",
      companyId: company.id || "comp-1",
      type: "product",
      category: "Maritime Technology",
      name: company.products[0],
      shortDescription: `${company.products[0]} engineered and maintained under verified marine class standards.`,
    };
  } else if (company.services && company.services.length > 0) {
    featuredOffering = {
      id: "serv-featured-1",
      companyId: company.id || "comp-1",
      type: "service",
      category: "Maritime Operations",
      name: company.services[0],
      shortDescription: `${company.services[0]} delivered across international maritime trade corridors.`,
    };
  }

  // 05 — AI-NATIVE ARCHITECTURE NODES (Continuous operating layer)
  const aiArchitectureNodes = [
    {
      id: "company",
      label: "COMPANY",
      icon: Building2,
      description: "Verified company identity and operating context.",
    },
    {
      id: "knowledge",
      label: "GROUNDED KNOWLEDGE",
      icon: Database,
      description: "Authorized company information connected to MarineWorld knowledge sources.",
    },
    {
      id: "ai",
      label: "COMPANY AI",
      icon: Bot,
      description: "Conversational intelligence grounded in the company's verified operating context.",
    },
    {
      id: "advisors",
      label: "OFFERING ADVISORS",
      icon: MessageSquareCode,
      description: "Dedicated AI access for published products and services.",
    },
    {
      id: "interaction",
      label: "LIVE INTERACTION",
      icon: Users,
      description: "Customers can communicate with the company through its active digital layer.",
    },
  ];

  return (
    <div id="company-overview" className="space-y-10 sm:space-y-12 animate-in fade-in duration-300 font-sans">

      {/* ========================================================================= */}
      {/* 01 — COMPANY OVERVIEW & STAT STRIP (NON-DUPLICATIVE OPERATIONAL COCKPIT)  */}
      {/* Contains single description and inline stat strip; no repeated identity   */}
      {/* ========================================================================= */}
      <section aria-label="Company Overview & Operational Status" className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        {/* Flat solid accent highlight */}
        <div className="h-0.5 w-full bg-royal" />

        {/* Hero Body: Muted contextual header + Single Description */}
        <div className="p-6 sm:p-7 lg:p-8 space-y-2.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[10.5px] font-bold text-slate-400 uppercase tracking-widest">
            <span>COMPANY OVERVIEW & OPERATIONAL STATUS</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-medium">{legalName}</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-normal">{headquartersCity}, {country}</span>
          </div>

          <p className="text-sm sm:text-base text-slate-700 font-normal leading-relaxed max-w-4xl pt-0.5">
            {companyDescription}
          </p>
        </div>

        {/* Integrated Inline Cohesive Stat Strip (Unified within the hero frame base) */}
        <div className="border-t border-slate-200/80 bg-slate-50/70">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 font-sans">
            
            {/* 1. Verification */}
            <div className="px-4 py-3 sm:py-3.5 space-y-0.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">VERIFICATION</div>
              <div className="text-xs sm:text-[13px] font-semibold text-graphite flex items-center gap-1.5 truncate">
                <span className={`h-2 w-2 rounded-full shrink-0 ${isVerified ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="truncate">{isVerified ? "Verified Node" : "Pending"}</span>
              </div>
            </div>

            {/* 2. Operating Status */}
            <div className="px-4 py-3 sm:py-3.5 space-y-0.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">OPERATING STATUS</div>
              <div className="text-xs sm:text-[13px] font-semibold text-graphite flex items-center gap-1.5 truncate">
                <span className="h-2 w-2 rounded-full shrink-0 bg-blue-500" />
                <span className="truncate">{operatingStatus === "ACTIVE" ? "Live" : operatingStatus}</span>
              </div>
            </div>

            {/* 3. AI State */}
            <div className="px-4 py-3 sm:py-3.5 space-y-0.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI STATE</div>
              <div className="text-xs sm:text-[13px] font-semibold text-royal flex items-center gap-1.5 truncate">
                <Sparkles className="w-3.5 h-3.5 text-royal shrink-0" />
                <span className="truncate">AI Grounded</span>
              </div>
            </div>

            {/* 4. Network Presence */}
            <div className="px-4 py-3 sm:py-3.5 space-y-0.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NETWORK PRESENCE</div>
              <div className="text-xs sm:text-[13px] font-semibold text-graphite flex items-center gap-1.5 truncate">
                <Globe2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{operatingNodesCount} Active {operatingNodesCount === 1 ? 'Node' : 'Nodes'}</span>
              </div>
            </div>

            {/* 5. Offerings */}
            <div className="px-4 py-3 sm:py-3.5 space-y-0.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">OFFERINGS</div>
              <div className="text-xs sm:text-[13px] font-semibold text-graphite flex items-center gap-1.5 truncate">
                <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{totalOfferings} {totalOfferings === 1 ? 'Offering' : 'Offerings'}</span>
              </div>
            </div>

            {/* 6. Connect */}
            <div className="px-4 py-3 sm:py-3.5 space-y-0.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CONNECT CHANNEL</div>
              <div className="text-xs sm:text-[13px] font-semibold text-emerald-700 flex items-center gap-1.5 truncate">
                <Radio className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Available</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 02 — FLAGSHIP COMPANY PRESENCE (REAL-WORLD OPERATIONAL STATEMENT)         */}
      {/* ========================================================================= */}
      <section aria-labelledby="section-flagship-title" className="space-y-2.5">
        <div className="font-sans text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span id="section-flagship-title">FLAGSHIP COMPANY PRESENCE</span>
        </div>

        <div className="relative w-full h-[300px] sm:h-[380px] lg:h-[420px] rounded-xl overflow-hidden border border-line bg-slate-900 shadow-sm">
          {!flagshipImageError && flagshipImage ? (
            <img
              src={flagshipImage}
              alt="Real-World Company Operating Presence"
              onError={() => setFlagshipImageError(true)}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white font-sans">
              <Building2 className="w-12 h-12 text-slate-500 mb-3" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">No facility image uploaded yet</span>
              <span className="text-[11px] text-slate-400 mt-1 max-w-sm">
                Physical operational facilities and marine infrastructure maintained under verified international standards.
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-transparent pointer-events-none" />
          
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 space-y-1.5 text-white font-sans pointer-events-none">
            <div className="font-sans text-[10px] font-semibold uppercase tracking-widest text-white/80">
              REAL-WORLD OPERATING PRESENCE
            </div>
            <p className="text-sm sm:text-base text-white/95 max-w-2xl font-light leading-relaxed">
              Physical operational facilities, marine yards, and engineering logistics infrastructure maintained under verified international standards.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 03 — OPERATING PROFILE (COMPACT INSTITUTIONAL FACT SHEET — MAX 5 FIELDS)  */}
      {/* ========================================================================= */}
      <section aria-labelledby="section-profile-title" className="space-y-2.5">
        <div className="font-sans text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span id="section-profile-title">OPERATING PROFILE</span>
        </div>

        <div className="rounded-lg border border-line bg-white shadow-2xs overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-line text-xs font-sans">
            
            {/* Field 1: PRIMARY INDUSTRY */}
            <div className="p-3.5 sm:p-4 space-y-1">
              <div className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold">Primary Industry</div>
              <div className="font-semibold text-graphite truncate">{primarySectorCategory}</div>
            </div>

            {/* Field 2: SECTOR FOCUS */}
            <div className="p-3.5 sm:p-4 space-y-1">
              <div className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold">Sector Focus</div>
              <div className="font-medium text-graphite truncate">
                {secondaryFocus || "Commercial Marine Operations"}
              </div>
            </div>

            {/* Field 3: REGIONAL SCOPE */}
            <div className="p-3.5 sm:p-4 space-y-1">
              <div className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold">Regional Scope</div>
              <div className="font-medium text-graphite truncate">{regionalEdition}</div>
            </div>

            {/* Field 4: OPERATING MODEL */}
            <div className="p-3.5 sm:p-4 space-y-1">
              <div className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold">Operating Model</div>
              <div className="font-medium text-graphite truncate">{operatingModel}</div>
            </div>

            {/* Field 5: COMPANY CLASSIFICATION */}
            <div className="p-3.5 sm:p-4 space-y-1">
              <div className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold">Classification</div>
              <div className="font-medium text-graphite truncate">{companyClassification}</div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 04 — AI-NATIVE COMPANY (CONTINUOUS HORIZONTAL OPERATING ARCHITECTURE)     */}
      {/* ========================================================================= */}
      <section aria-labelledby="section-ai-title" className="rounded-xl border border-line bg-slate-50/70 p-6 sm:p-8 space-y-6 shadow-2xs">
        <div className="space-y-1">
          <div className="font-sans text-[10px] font-bold text-royal uppercase tracking-widest">
            OPERATING ARCHITECTURE
          </div>
          <h3 id="section-ai-title" className="text-xl sm:text-2xl font-bold tracking-tight text-graphite">
            AI-NATIVE COMPANY
          </h3>
          <p className="text-xs sm:text-sm text-stone font-normal">
            A grounded digital operating layer for the company inside MarineWorld.
          </p>
        </div>

        {/* Continuous Horizontal System Flow */}
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 lg:gap-2">
            {aiArchitectureNodes.map((node, index) => {
              const Icon = node.icon;
              return (
                <div
                  key={node.id}
                  className="relative flex flex-col justify-between rounded-lg border border-line bg-white p-4 shadow-2xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-sans text-[10px] font-bold text-graphite uppercase tracking-wider">
                        <Icon className="w-3.5 h-3.5 text-royal shrink-0" />
                        <span>{node.label}</span>
                      </div>
                      <span className="font-sans text-[9px] text-slate-400 font-bold">
                        0{index + 1}
                      </span>
                    </div>

                    <p className="text-xs text-stone font-sans leading-relaxed">
                      {node.description}
                    </p>
                  </div>

                  {index < aiArchitectureNodes.length - 1 && (
                    <div className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-slate-300">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 05 — NETWORK SIGNATURE (ONTOLOGICAL PROVENANCE & ACCESS)                 */}
      {/* ========================================================================= */}
      <section aria-labelledby="section-network-signature" className="pt-8 border-t border-line space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div id="section-network-signature" className="font-sans text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              NETWORK SIGNATURE
            </div>
            <div className="flex flex-wrap items-center gap-2 font-sans text-xs text-stone">
              <span className="text-slate-500 font-semibold">MARINEWORLD</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="text-slate-500">CATEGORY</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="text-graphite font-medium">{parentDomain?.name?.toUpperCase() || "DOMAIN"}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="text-royal font-semibold">{formattedSectorCity}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="text-graphite font-bold">{displayName.toUpperCase()}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectModule("presence")}
            className="inline-flex items-center gap-1.5 font-sans text-xs font-bold text-royal hover:underline shrink-0 self-start sm:self-center cursor-pointer"
          >
            <span>VIEW NETWORK PRESENCE</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 06 — FEATURED OFFERING (RESTRAINED SINGLE-ROW TEASER)                      */}
      {/* ========================================================================= */}
      {featuredOffering && (
        <section aria-labelledby="section-offering-teaser" className="pt-8 border-t border-line">
          <div className="rounded-lg border border-line bg-white p-5 sm:p-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <div id="section-offering-teaser" className="font-sans text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  FEATURED OFFERING
                </div>
                <div className="text-base font-bold text-graphite tracking-tight">
                  {featuredOffering.name}
                </div>
                <p className="text-xs sm:text-sm text-stone leading-relaxed">
                  {featuredOffering.shortDescription}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOfferingModal(featuredOffering)}
                className="inline-flex items-center gap-1.5 font-sans text-xs font-bold text-royal hover:underline shrink-0 self-start sm:self-center cursor-pointer"
              >
                <span>OPEN OFFERING</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>
      )}

      {selectedOfferingModal && (
        <ProductExperienceModal
          offering={selectedOfferingModal}
          company={company}
          onClose={() => setSelectedOfferingModal(null)}
          onOpenConnectModal={onOpenConnectModal}
        />
      )}

      {/* ========================================================================= */}
      {/* 07 — LIVE COMPANY (FINAL CONVERSION DOORWAY)                              */}
      {/* ========================================================================= */}
      <section aria-labelledby="section-ask-title" className="pt-8 border-t border-line">
        <div className="rounded-xl border border-line bg-white p-6 sm:p-8 lg:p-10 shadow-2xs space-y-6">
          <div className="font-sans text-[10px] font-bold text-royal uppercase tracking-widest">
            LIVE COMPANY
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <h3 id="section-ask-title" className="text-xl sm:text-2xl font-bold text-graphite tracking-tight">
                ASK THIS COMPANY
              </h3>
              <p className="text-sm sm:text-base text-stone leading-relaxed font-light">
                &ldquo;Talk directly to the company&apos;s verified AI operating layer.&rdquo;
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                id="btn-live-company-ai-twin"
                onClick={() => {
                  if (onOpenTwinModal) {
                    onOpenTwinModal();
                  } else {
                    onSelectModule("business-twin");
                  }
                }}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer font-sans"
              >
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                <span>OPEN COMPANY AI</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                id="btn-live-company-connect"
                onClick={() => {
                  if (onOpenConnectModal) {
                    onOpenConnectModal();
                  } else {
                    onSelectModule("connect");
                  }
                }}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-xs font-bold text-graphite hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer font-sans"
              >
                <Send className="w-3.5 h-3.5 text-slate-400" />
                <span>CONNECT</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

