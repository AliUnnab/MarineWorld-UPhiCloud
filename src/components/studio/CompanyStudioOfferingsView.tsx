import React, { useState, useEffect, useMemo } from "react";
import {
  Package,
  Wrench,
  Cpu,
  Plus,
  Edit2,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle2,
  Bot,
  ExternalLink,
  ShieldCheck,
  FileText,
  Layers,
  ChevronRight,
  Eye,
  Archive,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import type {
  CompanyEntity,
  CompanyOffering,
  CompanyProfile,
} from "@/lib/types";
import { getCompanyById, saveCompany } from "@/lib/services/companyService";
import { CANONICAL_CAPABILITIES_TAXONOMY, updateCompanyCapabilities } from "@/lib/businessTwinStore";
import { getCompanyRecordSync, getCompanyRecord } from "@/lib/repositories/companyRepository";
import {
  getCompanyOfferings,
  fetchCompanyOfferingsAsync,
  saveCanonicalOffering,
  publishOffering,
  archiveOffering,
  deleteOffering,
  deleteOfferingAsync,
  MAX_ACTIVE_OFFERINGS_PER_COMPANY,
  countActiveOfferings,
} from "@/lib/services/offeringEntityService";
import { OfferingLimitUsageBar } from "./offerings/OfferingLimitUsageBar";
import { OfferingCardItem } from "./offerings/OfferingCardItem";
import { OfferingCreationWizardModal } from "./offerings/OfferingCreationWizardModal";
import { ProductExperienceModal } from "@/components/company/ProductExperienceModal";

type OfferingTab = "PRODUCTS" | "SERVICES" | "CAPABILITIES" | "ALL" | "ARCHIVED";

interface CompanyStudioOfferingsViewProps {
  companyId: string;
  onSaved?: () => void;
  onNavigateToAI?: () => void;
}

export const CompanyStudioOfferingsView: React.FC<CompanyStudioOfferingsViewProps> = ({
  companyId,
  onSaved,
  onNavigateToAI,
}) => {
  const canonicalCompany = getCompanyById(companyId) || (getCompanyRecordSync(companyId) as unknown as CompanyEntity);
  const [activeTab, setActiveTab] = useState<OfferingTab>("ALL");

  // Canonical offerings state
  const [offerings, setOfferings] = useState<CompanyOffering[]>([]);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  
  // Wizard Modal state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardType, setWizardType] = useState<"product" | "service">("product");
  const [editingOffering, setEditingOffering] = useState<CompanyOffering | null>(null);

  // Live Public Preview state
  const [livePreviewOffering, setLivePreviewOffering] = useState<CompanyOffering | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const reloadOfferings = async () => {
    const list = getCompanyOfferings(companyId);
    setOfferings(list);

    try {
      const asyncList = await fetchCompanyOfferingsAsync(companyId);
      if (asyncList && asyncList.length > 0) {
        setOfferings(asyncList);
      }
      const comp = (await getCompanyRecord(companyId)) || getCompanyById(companyId) || (getCompanyRecordSync(companyId) as unknown as CompanyEntity);
      if (comp) {
        setCapabilities(
          (comp as any)?.capabilities?.length > 0
            ? (comp as any).capabilities
            : ["MANUFACTURING", "ENGINEERING & DESIGN", "MAINTENANCE", "SYSTEM INTEGRATION"]
        );
      }
    } catch {
      // Fallback already populated
    }
  };

  useEffect(() => {
    reloadOfferings();
  }, [companyId]);

  // Derived counts
  const productsList = useMemo(() => offerings.filter((o) => o.type === "product" && (o.status as string)?.toUpperCase() !== "ARCHIVED"), [offerings]);
  const servicesList = useMemo(() => offerings.filter((o) => o.type === "service" && (o.status as string)?.toUpperCase() !== "ARCHIVED"), [offerings]);
  const archivedList = useMemo(
    () => offerings.filter((o) => (o.status as string)?.toUpperCase() === "ARCHIVED"),
    [offerings]
  );
  
  // Active count = Products + Services combined that are NOT archived and NOT draft
  const activeOfferings = useMemo(
    () => offerings.filter((o) => {
      const s = (o.status as string)?.toUpperCase();
      return s !== "ARCHIVED" && s !== "DRAFT";
    }),
    [offerings]
  );

  const activeCount = activeOfferings.length;
  const maxActiveLimit = 12;

  // Filtered offerings based on active tab
  const displayedOfferings = useMemo(() => {
    switch (activeTab) {
      case "PRODUCTS":
        return productsList;
      case "SERVICES":
        return servicesList;
      case "ARCHIVED":
        return archivedList;
      case "ALL":
      default:
        return offerings.filter((o) => (o.status as string)?.toUpperCase() !== "ARCHIVED");
    }
  }, [offerings, activeTab, productsList, servicesList, archivedList]);

  // Open creation wizard
  const handleOpenCreateWizard = (type: "product" | "service") => {
    if (activeCount >= maxActiveLimit) {
      setErrorMessage(`Active offering limit (${maxActiveLimit}) reached. You can archive an existing offering or save new ones as Draft.`);
    } else {
      setErrorMessage(null);
    }
    setWizardType(type);
    setEditingOffering(null);
    setIsWizardOpen(true);
  };

  // Open edit wizard
  const handleEditOffering = (offering: CompanyOffering) => {
    setEditingOffering(offering);
    setWizardType(offering.type as "product" | "service");
    setIsWizardOpen(true);
  };

  // Handle Save from wizard
  const handleSaveOfferingFromWizard = (savedOffering: CompanyOffering) => {
    const result = saveCanonicalOffering(savedOffering);
    if (!result.success) {
      setErrorMessage(result.error || "Failed to save offering.");
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    const currentList = getCompanyOfferings(companyId);
    setOfferings(currentList);

    setSuccessMessage(`Offering "${savedOffering.name}" saved successfully.`);
    setTimeout(() => setSuccessMessage(null), 3500);
    if (onSaved) onSaved();
  };

  // Change Offering Status (Active / Draft / Archive / Publish)
  const handleStatusChange = (offeringId: string, newStatus: "ACTIVE" | "DRAFT" | "ARCHIVED") => {
    if (newStatus === "ARCHIVED") {
      const res = archiveOffering(companyId, offeringId);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to archive offering.");
        setTimeout(() => setErrorMessage(null), 4000);
        return;
      }
      setOfferings(getCompanyOfferings(companyId));
      setSuccessMessage("Offering moved to Archive.");
      setTimeout(() => setSuccessMessage(null), 3000);
      if (onSaved) onSaved();
      return;
    }

    if (newStatus === "ACTIVE") {
      const res = publishOffering(companyId, offeringId);
      if (!res.success) {
        setErrorMessage(res.error || "Cannot activate offering.");
        setTimeout(() => setErrorMessage(null), 5000);
        return;
      }
      setOfferings(getCompanyOfferings(companyId));
      setSuccessMessage("Offering published & live on canonical URL.");
      setTimeout(() => setSuccessMessage(null), 3000);
      if (onSaved) onSaved();
      return;
    }

    // Setting to DRAFT
    const target = offerings.find((o) => o.id === offeringId);
    if (target) {
      saveCanonicalOffering({ ...target, status: "DRAFT", publishState: "DRAFT" });
      setOfferings(getCompanyOfferings(companyId));
      setSuccessMessage("Offering status set to DRAFT.");
      setTimeout(() => setSuccessMessage(null), 3000);
      if (onSaved) onSaved();
    }
  };

  // Delete Offering
  const handleDeleteOffering = async (offeringId: string) => {
    if (confirm("Bu teklifi (ürün/hizmet), bağlı tüm görsel ve belgeleri ile birlikte kalıcı olarak silmek istediğinize emin misiniz?")) {
      try {
        await deleteOfferingAsync(companyId, offeringId);
        const updated = await fetchCompanyOfferingsAsync(companyId);
        setOfferings(updated);
        setSuccessMessage("Teklif ve ilgili tüm dosyalar Firestore & Storage üzerinden kalıcı olarak silindi.");
        setTimeout(() => setSuccessMessage(null), 3000);
        if (onSaved) onSaved();
      } catch (err: any) {
        setErrorMessage(`Silme işlemi başarısız: ${err?.message || "Bilinmeyen hata"}`);
        setTimeout(() => setErrorMessage(null), 4000);
      }
    }
  };

  // Toggle Capability
  const toggleCapability = (cap: string) => {
    const updatedCaps = capabilities.includes(cap)
      ? capabilities.filter((c) => c !== cap)
      : [...capabilities, cap];

    setCapabilities(updatedCaps);
    if (canonicalCompany) {
      updateCompanyCapabilities(canonicalCompany as any, updatedCaps);
      const compUpdated = {
        ...canonicalCompany,
        capabilities: updatedCaps,
      };
      saveCompany(compUpdated as any);
    }
  };

  return (
    <div className="space-y-6 font-sans" id="module-offerings-view">
      {/* 4-Question Information Architecture Banner */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-royal/10 text-royal uppercase tracking-wider">
              04 — OFFERINGS
            </span>
            <span className="text-xs font-bold text-graphite uppercase tracking-wider">
              Commercial Products, Services & AI Advisors
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-graphite border border-line">
              {offerings.length} TOTAL OFFERINGS
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-canvas border border-line/60 space-y-1">
            <div className="font-bold text-graphite uppercase tracking-wider text-[10px]">
              WHAT IS THIS?
            </div>
            <p className="text-stone leading-relaxed">
              Your company's published commercial solutions across physical products, operational services, and capabilities.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas border border-line/60 space-y-1">
            <div className="font-bold text-graphite uppercase tracking-wider text-[10px]">
              WHAT DO I NEED TO PROVIDE?
            </div>
            <p className="text-stone leading-relaxed">
              Upload datasheets, certificates or manuals. AI extracts specifications, certifications, and grounds the Offering AI Advisor.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas border border-line/60 space-y-1">
            <div className="font-bold text-graphite uppercase tracking-wider text-[10px]">
              WHAT IS ALREADY READY?
            </div>
            <p className="text-stone leading-relaxed">
              Dedicated Offering AI Advisor generated for every grounded offering without manual prompt engineering.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas border border-line/60 space-y-1">
            <div className="font-bold text-graphite uppercase tracking-wider text-[10px]">
              WHAT WILL THIS CHANGE?
            </div>
            <p className="text-stone leading-relaxed">
              Live public product experience, instant specification downloads, and sealed commercial B2B RFQ routing.
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-700 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Section 1: Active Offerings Usage Meter (Max 12 Limit) */}
      <OfferingLimitUsageBar
        activeCount={activeCount}
        maxLimit={maxActiveLimit}
        totalProductsCount={productsList.length}
        totalServicesCount={servicesList.length}
        archivedCount={archivedList.length}
      />

      {/* Navigation Tabs & Primary Create Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-line pb-3">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="tab-offerings-all"
            onClick={() => setActiveTab("ALL")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "ALL"
                ? "bg-royal text-white shadow-2xs"
                : "bg-white text-stone hover:bg-slate-50 hover:text-graphite border border-line"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>All Offerings</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-white/20">
              {offerings.filter((o) => (o.status as string)?.toUpperCase() !== "ARCHIVED").length}
            </span>
          </button>

          <button
            type="button"
            id="tab-offerings-products"
            onClick={() => setActiveTab("PRODUCTS")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "PRODUCTS"
                ? "bg-royal text-white shadow-2xs"
                : "bg-white text-stone hover:bg-slate-50 hover:text-graphite border border-line"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Products</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-white/20">
              {productsList.length}
            </span>
          </button>

          <button
            type="button"
            id="tab-offerings-services"
            onClick={() => setActiveTab("SERVICES")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "SERVICES"
                ? "bg-royal text-white shadow-2xs"
                : "bg-white text-stone hover:bg-slate-50 hover:text-graphite border border-line"
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Services</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-white/20">
              {servicesList.length}
            </span>
          </button>

          <button
            type="button"
            id="tab-offerings-capabilities"
            onClick={() => setActiveTab("CAPABILITIES")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "CAPABILITIES"
                ? "bg-royal text-white shadow-2xs"
                : "bg-white text-stone hover:bg-slate-50 hover:text-graphite border border-line"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Core Capabilities</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-white/20">
              {capabilities.length}
            </span>
          </button>

          <button
            type="button"
            id="tab-offerings-archived"
            onClick={() => setActiveTab("ARCHIVED")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "ARCHIVED"
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-white text-stone hover:bg-slate-50 hover:text-graphite border border-line"
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archived</span>
            <span className="text-[10px] font-mono">({archivedList.length})</span>
          </button>
        </div>

        {/* Action Buttons: Add Product / Add Service (Both trigger AI-Native Ingestion Wizard) */}
        {activeTab !== "CAPABILITIES" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-add-product"
              onClick={() => handleOpenCreateWizard("product")}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-royal hover:bg-royal/90 text-white text-xs font-bold shadow-2xs transition uppercase tracking-wider cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>

            <button
              type="button"
              id="btn-add-service"
              onClick={() => handleOpenCreateWizard("service")}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs transition uppercase tracking-wider cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Service</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {activeTab === "CAPABILITIES" ? (
        /* Core Capabilities Matrix */
        <div className="rounded-2xl border border-line bg-white p-6 shadow-xs space-y-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-royal uppercase">
              <span>ENTERPRISE CAPABILITIES</span>
            </div>
            <h3 className="text-base font-extrabold text-graphite tracking-tight uppercase">
              Sector Capabilities Taxonomy
            </h3>
            <p className="text-xs text-stone">
              Select verified organizational capabilities. Core capabilities remain outside the 12-active product/service limit.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
            {CANONICAL_CAPABILITIES_TAXONOMY.map((cap) => {
              const isSelected = capabilities.includes(cap);
              return (
                <div
                  key={cap}
                  onClick={() => toggleCapability(cap)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 select-none ${
                    isSelected
                      ? "border-royal bg-royal/10 text-royal shadow-2xs"
                      : "border-line bg-canvas hover:border-slate-300 text-stone hover:text-graphite"
                  }`}
                >
                  <span className="text-xs font-bold uppercase tracking-wider">{cap}</span>
                  {isSelected ? (
                    <CheckCircle2 className="w-4 h-4 text-royal shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Products / Services List */
        <div className="space-y-4">
          {displayedOfferings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedOfferings.map((offering) => (
                <OfferingCardItem
                  key={offering.id}
                  offering={offering}
                  onEdit={handleEditOffering}
                  onViewLive={(off) => setLivePreviewOffering(off)}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDeleteOffering}
                />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center rounded-2xl border-2 border-dashed border-line bg-white space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-royal/10 text-royal flex items-center justify-center mx-auto shadow-2xs">
                <Package className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h4 className="text-base font-extrabold text-graphite uppercase">
                  No {activeTab.toLowerCase()} Found
                </h4>
                <p className="text-xs text-stone">
                  {activeTab === "ARCHIVED"
                    ? "No archived offerings. Active and draft offerings can be archived to free up catalog capacity."
                    : "Create an offering from documents or datasheets with AI extraction."}
                </p>
              </div>
              {activeTab !== "ARCHIVED" && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleOpenCreateWizard(activeTab === "SERVICES" ? "service" : "product")}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-royal text-white text-xs font-bold shadow-md hover:bg-royal/90 transition uppercase tracking-wider cursor-pointer"
                  >
                    <Cpu className="w-4 h-4" />
                    <span>Create with AI Ingestion</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Creation & Editing Wizard Modal */}
      {isWizardOpen && (
        <OfferingCreationWizardModal
          isOpen={isWizardOpen}
          onClose={() => {
            setIsWizardOpen(false);
            setEditingOffering(null);
          }}
          onSaveOffering={handleSaveOfferingFromWizard}
          companyId={companyId}
          companyName={canonicalCompany?.displayName || canonicalCompany?.legalName || canonicalCompany?.brandName || "MarineWorld Enterprise"}
          initialType={wizardType}
          initialOffering={editingOffering}
          activeOfferingsCount={activeCount}
          maxActiveLimit={maxActiveLimit}
        />
      )}

      {/* Live Public Offering Modal (For instant testing and live verification) */}
      {livePreviewOffering && canonicalCompany && (
        <ProductExperienceModal
          offering={livePreviewOffering}
          company={canonicalCompany as unknown as CompanyProfile}
          allOfferings={offerings}
          onClose={() => setLivePreviewOffering(null)}
          onSelectOffering={(off) => setLivePreviewOffering(off)}
        />
      )}
    </div>
  );
};
