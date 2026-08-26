import React, { useState, useMemo } from "react";
import { marineSector } from "@/lib/sectors/marine";
import {
  CANONICAL_CITY_REGIONS,
  DigitalPropertySlot,
} from "@/lib/services/propertyService";
import {
  getAllCommercialInventory,
  getCompanyCommercialHoldings,
  getCompanyReservationIntents,
  getCompanyCommercialAgreements,
  getCompanyCommercialOffers,
  CommercialDigitalProperty,
  CommercialReservationIntent,
  CommercialAgreement,
  CommercialOffer,
  CommercialPropertyTier,
  CommercialStatus,
  calculateTermDates,
} from "@/lib/services/commercialPropertyService";
import {
  getCompanyRecordSync,
  updateCompanyBillingConfig,
} from "@/lib/repositories/companyRepository";
import {
  Building2,
  ArrowRight,
  Eye,
  CheckCircle2,
  ShieldCheck,
  Check,
  MapPin,
  Tag,
  DollarSign,
  Calendar,
  Layers,
  Filter,
  Search,
  Lock,
  Sparkles,
  ExternalLink,
  FileText,
  Clock,
  RefreshCw,
  AlertCircle,
  History,
  Cloud,
  CreditCard,
  Settings,
  ChevronRight,
  Receipt,
  Radio,
} from "lucide-react";
import { CommercialPropertyDetailModal } from "./CommercialPropertyDetailModal";
import { CommercialOfferModal } from "./CommercialOfferModal";
import { CompanyStudioPropertyEditor } from "./CompanyStudioPropertyEditor";
import { CompanyStudioBillingView } from "./CompanyStudioBillingView";
import { AnchorRegistryVisibilityCard } from "./AnchorRegistryVisibilityCard";

export function CompanyStudioPropertiesView({
  companyId,
  memberRole,
  userEmail = "authorized_member",
}: {
  companyId: string;
  memberRole: string;
  userEmail?: string;
}) {
  const [activeTab, setActiveTab] = useState<
    "MY_PROPERTIES" | "VISIBILITY" | "INVENTORY" | "OFFERS" | "AGREEMENTS" | "RESERVATIONS" | "BILLING" | "RENEWALS"
  >("MY_PROPERTIES");

  const [selectedCityId, setSelectedCityId] = useState<string>("ALL");
  const [selectedRegionCode, setSelectedRegionCode] = useState<string>("ALL");
  const [selectedTier, setSelectedTier] = useState<string>("ALL");
  const [selectedAvailability, setSelectedAvailability] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [detailModalProperty, setDetailModalProperty] = useState<CommercialDigitalProperty | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<CommercialOffer | null>(null);

  const [editingSlot, setEditingSlot] = useState<{
    slot: DigitalPropertySlot;
    cityId: string;
    regionCode: string;
  } | null>(null);

  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Company Billing Config Form State
  const companyRecord = getCompanyRecordSync(companyId);
  const [cloudBillingAccount, setCloudBillingAccount] = useState(
    companyRecord?.cloudBillingAccountId || "01A2B3-45C6D7-89E0F1"
  );
  const [cloudOrgId, setCloudOrgId] = useState(
    companyRecord?.cloudBillingOrganizationId || "organizations/4820019200"
  );
  const [procurementEmail, setProcurementEmail] = useState(
    companyRecord?.cloudBillingContact || userEmail || "procurement@argentomarine.com"
  );
  const [saveBillingMsg, setSaveBillingMsg] = useState<string | null>(null);

  const config = marineSector;
  const cities = config.explorer.cities;
  const canModify = memberRole === "OWNER" || memberRole === "ADMIN";

  // Load datasets
  const allInventory = useMemo(() => {
    return getAllCommercialInventory();
  }, [refreshTrigger]);

  const companyHoldings = useMemo(() => {
    return getCompanyCommercialHoldings(companyId);
  }, [companyId, refreshTrigger]);

  const companyReservations = useMemo(() => {
    return getCompanyReservationIntents(companyId);
  }, [companyId, refreshTrigger]);

  const companyAgreements = useMemo(() => {
    return getCompanyCommercialAgreements(companyId);
  }, [companyId, refreshTrigger]);

  const companyOffers = useMemo(() => {
    return getCompanyCommercialOffers(companyId);
  }, [companyId, refreshTrigger]);

  const renewalApproachingAgreements = useMemo(() => {
    return companyAgreements.filter((ag) => {
      if (ag.contractStatus !== "ACTIVE") return false;
      const end = new Date(ag.endDate).getTime();
      const now = Date.now();
      const daysUntilEnd = (end - now) / (1000 * 3600 * 24);
      return daysUntilEnd <= 180; // Within 6 months
    });
  }, [companyAgreements]);

  // Filtered inventory list
  const filteredInventory = useMemo(() => {
    return allInventory.filter((prop) => {
      if (selectedCityId !== "ALL" && prop.cityId.toLowerCase() !== selectedCityId.toLowerCase()) {
        return false;
      }
      if (selectedRegionCode !== "ALL" && prop.regionCode.toUpperCase() !== selectedRegionCode.toUpperCase()) {
        return false;
      }
      if (selectedTier !== "ALL" && prop.tier !== selectedTier) {
        return false;
      }
      if (selectedAvailability !== "ALL" && prop.availabilityStatus !== selectedAvailability) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = prop.propertyName.toLowerCase().includes(q);
        const matchKey = prop.canonicalPropertyKey.toLowerCase().includes(q);
        const matchDesc = prop.frontageDescription.toLowerCase().includes(q);
        if (!matchName && !matchKey && !matchDesc) return false;
      }
      return true;
    });
  }, [allInventory, selectedCityId, selectedRegionCode, selectedTier, selectedAvailability, searchQuery]);

  const handleLaunchEditor = (slot: DigitalPropertySlot, cityId: string, regionCode: string) => {
    setEditingSlot({ slot, cityId, regionCode });
  };

  const handleDataRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSaveBillingConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyBillingConfig(companyId, {
      cloudBillingAccountId: cloudBillingAccount,
      cloudBillingOrganizationId: cloudOrgId,
      cloudBillingContact: procurementEmail,
      googleMarketplaceEnabled: true,
    });
    setSaveBillingMsg("Google Cloud Billing Account configuration saved successfully.");
    setTimeout(() => setSaveBillingMsg(null), 3000);
  };

  if (editingSlot) {
    return (
      <CompanyStudioPropertyEditor
        slot={editingSlot.slot}
        config={config}
        companyId={companyId}
        cityId={editingSlot.cityId}
        regionCode={editingSlot.regionCode}
        onClose={() => setEditingSlot(null)}
      />
    );
  }

  return (
    <div className="space-y-8 font-sans animate-fade-in pb-16">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
            <span>Corporate Asset Portfolio</span>
            <span>&bull;</span>
            <span className="text-royal">Digital Real Estate Inventory</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-royal" />
            Digital Properties & Commercial Deals
          </h1>
          <p className="text-xs text-slate-500 font-light mt-1 max-w-3xl">
            Acquire, manage, and govern high-visibility Landmark, Flagship, and Presence digital real estate assets across MarineWorld Sector Cities with dual billing support (Stripe & Google Cloud Marketplace).
          </p>
        </div>

        {/* PUBLIC VISIBILITY RULE BANNER */}
        <div className="flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-2xl border border-slate-800 shrink-0">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-[11px] leading-tight">
            <div className="font-bold text-white uppercase text-[10px] tracking-wider">Public Visibility Rule</div>
            <div className="text-slate-400 mt-0.5">
              <span className="text-emerald-400 font-semibold">Commercial ACTIVE</span> +{" "}
              <span className="text-slate-300 font-semibold">Governance PUBLISHED</span> = <span className="text-white font-bold">Public Viewport</span>
            </div>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("MY_PROPERTIES")}
          className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "MY_PROPERTIES"
              ? "border-royal text-royal"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Building2 className="w-4 h-4" />
          My Properties ({companyHoldings.length})
        </button>

        <button
          id="tab-btn-registry-visibility"
          onClick={() => setActiveTab("VISIBILITY")}
          className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "VISIBILITY"
              ? "border-royal text-royal"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Radio className="w-4 h-4 text-emerald-600" />
          Registry Visibility
        </button>

        <button
          onClick={() => setActiveTab("INVENTORY")}
          className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "INVENTORY"
              ? "border-royal text-royal"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Layers className="w-4 h-4" />
          Sector City Inventory ({allInventory.length})
        </button>

        <button
          onClick={() => setActiveTab("OFFERS")}
          className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 relative ${
            activeTab === "OFFERS"
              ? "border-royal text-royal"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <FileText className="w-4 h-4" />
          Commercial Offers ({companyOffers.length})
          {companyOffers.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-royal animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("AGREEMENTS")}
          className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "AGREEMENTS"
              ? "border-royal text-royal"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <History className="w-4 h-4" />
          Agreements ({companyAgreements.length})
        </button>

        <button
          onClick={() => setActiveTab("RESERVATIONS")}
          className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "RESERVATIONS"
              ? "border-royal text-royal"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Clock className="w-4 h-4" />
          Reservations ({companyReservations.length})
        </button>

        <button
          onClick={() => setActiveTab("BILLING")}
          className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "BILLING"
              ? "border-royal text-royal"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Receipt className="w-4 h-4" />
          Billing & Payments
        </button>

        <button
          onClick={() => setActiveTab("RENEWALS")}
          className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "RENEWALS"
              ? "border-royal text-royal"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          Renewals ({renewalApproachingAgreements.length})
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. MY PROPERTIES TAB (ACTIVE HOLDINGS ONLY) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "MY_PROPERTIES" && (
        <div className="space-y-6">
          {/* Surface Live Registry Visibility Telemetry for Anchor / Property holders */}
          <AnchorRegistryVisibilityCard companyId={companyId} config={marineSector} className="mb-6" />

          {companyHoldings.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-3xl space-y-4 max-w-xl mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-royal/10 text-royal flex items-center justify-center mx-auto">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Active Property Holdings</h3>
              <p className="text-xs text-slate-500 font-light leading-relaxed">
                Your company does not currently hold active commercial digital real estate in MarineWorld Sector Cities. Explore available inventory to reserve Landmark and Showroom slots.
              </p>
              <button
                onClick={() => setActiveTab("INVENTORY")}
                className="px-5 py-2.5 bg-royal hover:bg-royal-dark text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-md inline-flex items-center gap-2"
              >
                EXPLORE SECTOR CITY INVENTORY <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companyHoldings.map((prop) => (
                <div
                  key={`${prop.cityId}-${prop.regionCode}-${prop.slotId}`}
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold tracking-widest text-royal uppercase bg-royal/5 px-2.5 py-1 rounded-lg border border-royal/20">
                        {prop.canonicalPropertyKey}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ACTIVE HOLDING
                      </span>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">
                        {prop.tier} &bull; {prop.regionCode}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">{prop.propertyName}</h3>
                      <p className="text-xs text-slate-500 font-light mt-1 line-clamp-2">
                        {prop.frontageDescription}
                      </p>
                    </div>

                    {prop.termDetails && (
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-slate-500 text-[11px]">
                          <span>Active Term:</span>
                          <span className="font-semibold text-slate-800">
                            {prop.termDetails.termLengthMonths} Months
                          </span>
                        </div>
                        {prop.termDetails.endDate && (
                          <div className="flex items-center justify-between text-slate-500 text-[11px]">
                            <span>Renewal Date:</span>
                            <span className="font-mono text-slate-700">
                              {new Date(prop.termDetails.endDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
                          <span>Auto-Renewal:</span>
                          <span className="text-royal font-semibold">
                            {prop.termDetails.autoRenew ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setDetailModalProperty(prop)}
                      className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Details
                    </button>
                    <button
                      onClick={() => {
                        const dummySlot: DigitalPropertySlot = {
                          slotId: prop.slotId,
                          slotCode: prop.canonicalPropertyKey,
                          tier: prop.tier as any,
                          tierName: prop.tierName,
                          state: "PUBLISHED",
                          locationName: prop.propertyName,
                        };
                        handleLaunchEditor(dummySlot, prop.cityId, prop.regionCode);
                      }}
                      className="px-4 py-2 bg-royal hover:bg-royal-dark text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      STUDIO BUILDER &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* REGISTRY VISIBILITY TELEMETRY TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "VISIBILITY" && (
        <div className="space-y-6">
          <AnchorRegistryVisibilityCard companyId={companyId} config={marineSector} />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. INVENTORY EXPLORER TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "INVENTORY" && (
        <div className="space-y-6">
          {/* FILTER CONTROLS */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-white px-3 py-2 rounded-xl border border-slate-200">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search slot ID, city, tier, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-900 focus:outline-none"
              />
            </div>

            <select
              value={selectedCityId}
              onChange={(e) => setSelectedCityId(e.target.value)}
              className="bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700"
            >
              <option value="ALL">All Sector Cities</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.domain}
                </option>
              ))}
            </select>

            <select
              value={selectedRegionCode}
              onChange={(e) => setSelectedRegionCode(e.target.value)}
              className="bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700"
            >
              <option value="ALL">All Geographic Editions</option>
              {CANONICAL_CITY_REGIONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>

            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700"
            >
              <option value="ALL">All Tiers</option>
              <option value="LANDMARK">Tier 1: Landmark</option>
              <option value="FLAGSHIP">Tier 2: Flagship</option>
              <option value="PRESENCE">Tier 3: Presence</option>
            </select>

            <select
              value={selectedAvailability}
              onChange={(e) => setSelectedAvailability(e.target.value)}
              className="bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700"
            >
              <option value="ALL">All Availability</option>
              <option value="AVAILABLE">Available</option>
              <option value="ACTIVE">Occupied (Active)</option>
              <option value="RESERVED">Reserved</option>
              <option value="HELD">Held</option>
            </select>
          </div>

          {/* INVENTORY GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInventory.map((prop) => {
              const isHeldByMe =
                prop.tenantCompanyId === companyId || prop.tenantCompanyId?.toLowerCase() === companyId.toLowerCase();

              return (
                <div
                  key={`${prop.cityId}-${prop.regionCode}-${prop.slotId}`}
                  className={`bg-white rounded-3xl border transition-all flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md ${
                    isHeldByMe ? "border-royal/30 ring-1 ring-royal/15" : "border-slate-200"
                  }`}
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold tracking-widest text-slate-600 uppercase bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        {prop.canonicalPropertyKey}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          prop.availabilityStatus === "AVAILABLE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : prop.availabilityStatus === "ACTIVE"
                            ? "bg-royal/5 text-royal border border-royal/20"
                            : prop.availabilityStatus === "HELD"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {prop.availabilityStatus}
                      </span>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">
                        {prop.tier} &bull; {prop.regionCode}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">{prop.propertyName}</h3>
                      <p className="text-xs text-slate-500 font-light mt-1 line-clamp-2">
                        {prop.frontageDescription}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold">Pricing</span>
                        <span className="font-bold text-slate-900">
                          ${prop.price.toLocaleString()} {prop.currency}
                        </span>{" "}
                        <span className="text-slate-400 text-[10px]">/ {prop.billingPeriod.toLowerCase()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold">Commitment</span>
                        <span className="text-slate-700 font-medium">{prop.termOptions[0]?.termMonths || 12}M Standard</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setDetailModalProperty(prop)}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Property & Terms
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. COMMERCIAL OFFERS TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "OFFERS" && (
        <div className="space-y-6">
          {companyOffers.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-3xl space-y-3 max-w-xl mx-auto">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">No Pending Commercial Offers</h3>
              <p className="text-xs text-slate-500 font-light">
                When MarineWorld commercial operations issues a formal deal offer following your reservation intent, it will appear here for company review and execution.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {companyOffers.map((offer) => (
                <div
                  key={offer.offerId}
                  className="p-6 rounded-3xl bg-white border border-royal/20 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold tracking-widest text-royal bg-royal/5 px-2.5 py-0.5 rounded border border-royal/20">
                        {offer.canonicalPropertyKey}
                      </span>
                      <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-royal text-white uppercase tracking-widest">
                        FORMAL OFFER ISSUED
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{offer.tier} TIER &bull; {offer.cityId.toUpperCase()} ({offer.regionCode})</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-600 pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold">Annual Rate</span>
                        <span className="font-bold text-emerald-600 text-sm">
                          ${offer.annualRate.toLocaleString()} {offer.currency}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold">Contract Value</span>
                        <span className="font-bold text-slate-900 text-sm">
                          ${offer.totalContractValue.toLocaleString()} {offer.currency}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold">Term Length</span>
                        <span className="font-semibold text-slate-800">{offer.termMonths} Months</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold">Expires On</span>
                        <span className="font-mono text-slate-700">{new Date(offer.expiresAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                    <button
                      onClick={() => setSelectedOffer(offer)}
                      className="w-full md:w-auto px-6 py-3 bg-royal hover:bg-royal-dark text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2"
                    >
                      <FileText className="w-4 h-4" /> Review & Select Billing Rail &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. AGREEMENTS PORTFOLIO TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "AGREEMENTS" && (
        <div className="space-y-6">
          {companyAgreements.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-3xl text-slate-500 text-xs">
              No formal commercial agreement records found for this company.
            </div>
          ) : (
            <div className="space-y-4">
              {companyAgreements.map((ag) => (
                <div
                  key={ag.agreementId}
                  className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold tracking-widest text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                        {ag.canonicalPropertyKey}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          ag.contractStatus === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : ag.contractStatus === "PAYMENT_CONFIRMED"
                            ? "bg-royal/5 text-royal border border-royal/20"
                            : ag.contractStatus === "PAYMENT_PENDING"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : ag.contractStatus === "EXPIRED"
                            ? "bg-slate-100 text-slate-600 border border-slate-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}
                      >
                        CONTRACT: {ag.contractStatus}
                      </span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase flex items-center gap-1">
                        {ag.billingMethod === "GOOGLE_CLOUD_MARKETPLACE" ? (
                          <>
                            <Cloud className="w-3 h-3 text-royal" />
                            GOOGLE CLOUD MARKETPLACE
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-3 h-3 text-royal" />
                            STRIPE BILLING
                          </>
                        )}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-600 pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold">Agreement Ref</span>
                        <span className="font-mono text-[10px]">{ag.agreementId}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold">Annual Rate</span>
                        <span className="font-semibold text-slate-900">${ag.annualRate.toLocaleString()} {ag.currency}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold">Contract Term</span>
                        <span>{new Date(ag.startDate).toLocaleDateString()} – {new Date(ag.endDate).toLocaleDateString()} ({ag.termMonths}M)</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold">Provider Ref</span>
                        <span className="font-mono text-[10px] text-slate-700 truncate block">
                          {ag.billingSubscriptionRef || ag.billingAgreementRef || ag.billingCustomerRef || "PENDING"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">Total Value</span>
                    <span className="text-base font-bold text-slate-900">
                      ${ag.totalContractValue.toLocaleString()} {ag.currency}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. RESERVATIONS INTENTS TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "RESERVATIONS" && (
        <div className="space-y-6">
          {companyReservations.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-3xl text-slate-500 text-xs">
              No active reservation intents found. Explore inventory to place a commercial reservation intent.
            </div>
          ) : (
            <div className="space-y-4">
              {companyReservations.map((intent) => (
                <div
                  key={intent.intentId}
                  className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold tracking-widest text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                        {intent.canonicalPropertyKey}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          intent.status === "OFFER_CREATED"
                            ? "bg-royal/5 text-royal border border-royal/20"
                            : intent.status === "UNDER_COMMERCIAL_REVIEW"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : intent.status === "PENDING_REVIEW"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        RESERVATION: {intent.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      Requested by <span className="font-semibold text-slate-900">{intent.requestedBy}</span> on{" "}
                      {new Date(intent.requestedAt).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-slate-500">
                      Snapshot: {intent.commercialTermsSnapshot.tier} &bull; ${intent.commercialTermsSnapshot.price.toLocaleString()} {intent.commercialTermsSnapshot.currency} / {intent.commercialTermsSnapshot.billingPeriod.toLowerCase()} &bull; {intent.commercialTermsSnapshot.termLengthMonths}M Term
                    </div>
                    {intent.notes && (
                      <p className="text-xs text-slate-500 italic mt-1">"{intent.notes}"</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {intent.status === "OFFER_CREATED" && (
                      <button
                        onClick={() => setActiveTab("OFFERS")}
                        className="px-4 py-2 bg-royal text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-royal-dark shadow-sm flex items-center gap-1.5"
                      >
                        View Issued Offer <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div className="text-xs text-slate-400 font-mono">
                      {intent.intentId}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. RENEWALS MANAGEMENT TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "RENEWALS" && (
        <div className="space-y-6">
          <div className="p-5 bg-royal/5 border border-royal/20 rounded-3xl text-xs text-royal-dark space-y-1">
            <h4 className="font-bold uppercase tracking-wider text-[10px]">Continuous Digital Real Estate Entitlement</h4>
            <p>
              Properties nearing term completion (within 180 days) enter the renewal window. Renewing guarantees uninterrupted anchor frontage and rolls forward verified creative governance assets.
            </p>
          </div>

          {renewalApproachingAgreements.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-3xl text-slate-500 text-xs">
              No property agreements currently approaching renewal window.
            </div>
          ) : (
            <div className="space-y-4">
              {renewalApproachingAgreements.map((ag) => (
                <div
                  key={ag.agreementId}
                  className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold tracking-widest text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                        {ag.canonicalPropertyKey}
                      </span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                        RENEWAL ELIGIBLE
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      Term Ends: {new Date(ag.endDate).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-slate-500">
                      Current Rate: ${ag.annualRate.toLocaleString()} {ag.currency} / yr &bull; Auto-renew: {ag.autoRenew ? "Enabled" : "Disabled"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => alert("Renewal request submitted to MarineWorld Commercial Deal Desk.")}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
                    >
                      Request Renewal Offer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. BILLING & PAYMENTS TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "BILLING" && (
        <div className="pt-2">
          <CompanyStudioBillingView
            companyId={companyId}
            memberRole={memberRole}
            userEmail={userEmail}
          />
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailModalProperty && (
        <CommercialPropertyDetailModal
          property={detailModalProperty}
          config={config}
          companyId={companyId}
          canModify={canModify}
          onClose={() => setDetailModalProperty(null)}
          onReservationCreated={(intent) => {
            handleDataRefresh();
            setActiveTab("RESERVATIONS");
          }}
          onLaunchEditor={handleLaunchEditor}
        />
      )}

      {/* OFFER MODAL */}
      {selectedOffer && (
        <CommercialOfferModal
          offer={selectedOffer}
          memberRole={memberRole}
          userEmail={userEmail}
          onClose={() => setSelectedOffer(null)}
          onUpdated={() => {
            handleDataRefresh();
            setActiveTab("AGREEMENTS");
          }}
        />
      )}
    </div>
  );
}
