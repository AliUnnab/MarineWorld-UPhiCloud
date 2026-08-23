import React, { useState, useEffect } from "react";
import { CompanyProfile, CompanyEntity } from "@/lib/types";
import { marineSector } from "@/lib/sectors/marine";
import { getCompanyBySlug } from "@/lib/registry";
import {
  saveCompanyRecordSync,
  getCompanyRecordSync,
  findAllCompaniesSync,
} from "@/lib/repositories/companyRepository";
import {
  resolveMarineWorldCompanyDigitalId,
  getPrimaryRegistryNodeInfo,
} from "@/lib/services/companyIdentityService";
import {
  Building2,
  CheckCircle2,
  MapPin,
  Globe,
  Mail,
  Phone,
  Edit3,
  Save,
  AlertCircle,
  Lock,
  Layers,
  FileText,
  Globe2,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

const AVAILABLE_SECTOR_CITIES = [
  { id: "supplychain", label: "Supply Chain & Logistics" },
  { id: "shipyard", label: "Shipyard & Refit Engineering" },
  { id: "charter", label: "Yacht Charter & Fleet Ops" },
  { id: "brokerage", label: "Yacht Brokerage & Sales" },
  { id: "procurement", label: "Marine Equipment Procurement" },
  { id: "marina", label: "Marina & Docking Hub" },
];

const AVAILABLE_REGIONAL_EDITIONS = [
  { code: "MEDITERRANEAN", label: "Mediterranean Edition" },
  { code: "NORTH_EUROPE", label: "Northern Europe Edition" },
  { code: "NORTH_AMERICA", label: "North America Edition" },
  { code: "CARIBBEAN", label: "Caribbean Edition" },
  { code: "MIDDLE_EAST", label: "Middle East Edition" },
  { code: "ASIA_PACIFIC", label: "Asia Pacific Edition" },
];

interface CompanyIdentityViewProps {
  companyId: string;
  onProfileUpdated?: (updated: CompanyProfile) => void;
}

export function CompanyIdentityView({ companyId, onProfileUpdated }: CompanyIdentityViewProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Load canonical company profile
  const resolvedProfile = getCompanyBySlug(marineSector, companyId) || ({
    id: companyId,
    name: "Enterprise Company",
    displayName: "Enterprise Company",
    legalName: "Enterprise Company Ltd",
    industry: "Marine Services",
    country: "Netherlands",
    city: "Rotterdam",
  } as CompanyProfile);

  const initialDigitalIdInfo = resolveMarineWorldCompanyDigitalId({
    companyIdOrSlug: resolvedProfile.id,
    mwCompanyDigitalId: resolvedProfile.mwCompanyDigitalId,
    businessId: resolvedProfile.businessId,
    companyId6Digit: resolvedProfile.companyId6Digit,
    primaryRegistryCode: resolvedProfile.primaryRegistryCode,
    primarySectorCityId: resolvedProfile.sectorCityIds?.[0],
  });

  const [formData, setFormData] = useState({
    displayName: resolvedProfile.displayName || resolvedProfile.name || "",
    legalName: resolvedProfile.legalName || resolvedProfile.name || "",
    brandName: resolvedProfile.tradingName || (resolvedProfile as any).brandName || resolvedProfile.name || "",
    mwCompanyDigitalId: initialDigitalIdInfo.mwCompanyDigitalId,
    primaryRegistryCode: initialDigitalIdInfo.primaryRegistryCode,
    primaryRegistryNode: initialDigitalIdInfo.primaryRegistryNode,
    companyId6Digit: initialDigitalIdInfo.companyId6Digit,
    logoUrl: resolvedProfile.logoUrl || resolvedProfile.coverImage || "",
    verificationStatus: resolvedProfile.verificationStatus || "VERIFIED",

    primarySectorCategory: resolvedProfile.primarySectorCategory || resolvedProfile.industry || "Marine Services",
    secondarySectorCategories: resolvedProfile.secondarySectorCategories?.join(", ") || "Marine Equipment, Logistics",
    sectorCityIds: resolvedProfile.sectorCityIds || resolvedProfile.cityIds || ["supplychain"],
    regionalEditions: resolvedProfile.regionalEditions || [resolvedProfile.region || "MEDITERRANEAN"],
    country: resolvedProfile.country || "Netherlands",
    headquartersCity: resolvedProfile.headquartersCity || resolvedProfile.city || "Rotterdam",

    registrationNumber: resolvedProfile.registrationNumber || "NL-89201144",
    foundedYear: resolvedProfile.foundedYear ? String(resolvedProfile.foundedYear) : "2018",
    corporateDescription: resolvedProfile.corporateDescription || resolvedProfile.description || resolvedProfile.shortDescription || "",
    websiteUrl: resolvedProfile.website || (resolvedProfile as any).websiteUrl || "https://marineworld.city",
    officialEmail: resolvedProfile.officialEmail || `contact@${resolvedProfile.slug || resolvedProfile.id}.com`,
    officialPhone: resolvedProfile.officialPhone || "+31 10 495 2000",
  });

  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Re-sync form state when companyId changes
  useEffect(() => {
    const prof = getCompanyBySlug(marineSector, companyId);
    if (prof) {
      const digInfo = resolveMarineWorldCompanyDigitalId({
        companyIdOrSlug: prof.id,
        mwCompanyDigitalId: prof.mwCompanyDigitalId,
        businessId: prof.businessId,
        companyId6Digit: prof.companyId6Digit,
        primaryRegistryCode: prof.primaryRegistryCode,
        primarySectorCityId: prof.sectorCityIds?.[0],
      });

      setFormData({
        displayName: prof.displayName || prof.name || "",
        legalName: prof.legalName || prof.name || "",
        brandName: prof.tradingName || (prof as any).brandName || prof.name || "",
        mwCompanyDigitalId: digInfo.mwCompanyDigitalId,
        primaryRegistryCode: digInfo.primaryRegistryCode,
        primaryRegistryNode: digInfo.primaryRegistryNode,
        companyId6Digit: digInfo.companyId6Digit,
        logoUrl: prof.logoUrl || prof.coverImage || "",
        verificationStatus: prof.verificationStatus || "VERIFIED",

        primarySectorCategory: prof.primarySectorCategory || prof.industry || "Marine Services",
        secondarySectorCategories: prof.secondarySectorCategories?.join(", ") || "Marine Equipment, Logistics",
        sectorCityIds: prof.sectorCityIds || prof.cityIds || ["supplychain"],
        regionalEditions: prof.regionalEditions || [prof.region || "MEDITERRANEAN"],
        country: prof.country || "Netherlands",
        headquartersCity: prof.headquartersCity || prof.city || "Rotterdam",

        registrationNumber: prof.registrationNumber || "NL-89201144",
        foundedYear: prof.foundedYear ? String(prof.foundedYear) : "2018",
        corporateDescription: prof.corporateDescription || prof.description || prof.shortDescription || "",
        websiteUrl: prof.website || (prof as any).websiteUrl || "https://marineworld.city",
        officialEmail: prof.officialEmail || `contact@${prof.slug || prof.id}.com`,
        officialPhone: prof.officialPhone || "+31 10 495 2000",
      });
    }
  }, [companyId]);

  const toggleSectorCity = (cityId: string) => {
    setFormData((prev) => {
      const exists = prev.sectorCityIds.includes(cityId);
      const updated = exists
        ? prev.sectorCityIds.filter((c) => c !== cityId)
        : [...prev.sectorCityIds, cityId];
      return { ...prev, sectorCityIds: updated.length > 0 ? updated : [cityId] };
    });
  };

  const toggleRegionalEdition = (editionCode: string) => {
    setFormData((prev) => {
      const exists = prev.regionalEditions.includes(editionCode);
      const updated = exists
        ? prev.regionalEditions.filter((e) => e !== editionCode)
        : [...prev.regionalEditions, editionCode];
      return { ...prev, regionalEditions: updated.length > 0 ? updated : [editionCode] };
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // 1. Required Fields Validation
    if (!formData.displayName.trim()) {
      setValidationError("Company Display Name is required.");
      return;
    }
    if (!formData.legalName.trim()) {
      setValidationError("Legal Registered Name is required.");
      return;
    }
    if (!formData.country.trim()) {
      setValidationError("Country is required.");
      return;
    }
    if (!formData.headquartersCity.trim()) {
      setValidationError("Headquarters City is required.");
      return;
    }
    if (!formData.primarySectorCategory.trim()) {
      setValidationError("Primary Sector Category is required.");
      return;
    }

    // 2. Valid HTTPS URL Validation
    if (formData.websiteUrl.trim() && !formData.websiteUrl.trim().toLowerCase().startsWith("https://")) {
      setValidationError("Website URL must start with valid HTTPS protocol (e.g. https://company.com).");
      return;
    }

    const existingRecord = getCompanyRecordSync(resolvedProfile.id) || getCompanyRecordSync(resolvedProfile.slug || resolvedProfile.id);

    const secondarySectors = formData.secondarySectorCategories
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Immutable MarineWorld Digital ID remains strictly preserved
    const updatedEntity: Partial<CompanyEntity> & CompanyEntity = {
      ...(existingRecord as CompanyEntity),
      id: resolvedProfile.id,
      slug: resolvedProfile.slug || resolvedProfile.id.toLowerCase(),
      businessId: formData.mwCompanyDigitalId,
      mwCompanyDigitalId: formData.mwCompanyDigitalId,
      primaryRegistryCode: formData.primaryRegistryCode,
      primaryRegistryNode: formData.primaryRegistryNode,
      companyId6Digit: formData.companyId6Digit,
      organizationType: resolvedProfile.organizationType || existingRecord?.organizationType || "COMPANY",
      platformId: "marineworld",
      sectorId: resolvedProfile.industryDomainIds?.[0] || existingRecord?.sectorId || "marine",
      primarySectorCategory: formData.primarySectorCategory,
      secondarySectorCategories: secondarySectors,
      primarySectorCityId: formData.sectorCityIds[0] || "supplychain",
      sectorCityIds: formData.sectorCityIds,
      regionalEditions: formData.regionalEditions,
      country: formData.country,
      headquartersCity: formData.headquartersCity,
      city: formData.headquartersCity,
      legalName: formData.legalName,
      displayName: formData.displayName,
      brandName: formData.brandName || formData.displayName,
      description: formData.corporateDescription || `${formData.displayName} maritime enterprise.`,
      corporateDescription: formData.corporateDescription,
      shortDescription: formData.corporateDescription.slice(0, 160) || `${formData.displayName} corporate profile.`,
      industry: formData.primarySectorCategory,
      logoUrl: formData.logoUrl,
      websiteUrl: formData.websiteUrl,
      website: formData.websiteUrl,
      email: formData.officialEmail,
      officialEmail: formData.officialEmail,
      phone: formData.officialPhone,
      officialPhone: formData.officialPhone,
      registrationNumber: formData.registrationNumber,
      foundedYear: formData.foundedYear,
      status: existingRecord?.status || "ACTIVE",
      verificationStatus: (formData.verificationStatus as any) || "VERIFIED",
      updatedAt: new Date().toISOString(),
      createdAt: existingRecord?.createdAt || new Date().toISOString(),
    };

    saveCompanyRecordSync(updatedEntity);

    const updatedProfile: CompanyProfile = {
      ...resolvedProfile,
      name: formData.displayName,
      displayName: formData.displayName,
      legalName: formData.legalName,
      tradingName: formData.brandName,
      mwCompanyDigitalId: formData.mwCompanyDigitalId,
      primaryRegistryCode: formData.primaryRegistryCode,
      primaryRegistryNode: formData.primaryRegistryNode,
      companyId6Digit: formData.companyId6Digit,
      businessId: formData.mwCompanyDigitalId,
      industry: formData.primarySectorCategory,
      primarySectorCategory: formData.primarySectorCategory,
      secondarySectorCategories: secondarySectors,
      country: formData.country,
      city: formData.headquartersCity,
      headquartersCity: formData.headquartersCity,
      location: `${formData.headquartersCity}, ${formData.country}`,
      cityIds: formData.sectorCityIds,
      sectorCityIds: formData.sectorCityIds,
      regionalEditions: formData.regionalEditions,
      registrationNumber: formData.registrationNumber,
      foundedYear: formData.foundedYear,
      shortDescription: formData.corporateDescription.slice(0, 160),
      description: formData.corporateDescription,
      corporateDescription: formData.corporateDescription,
      officialEmail: formData.officialEmail,
      officialPhone: formData.officialPhone,
      website: formData.websiteUrl,
      verificationStatus: formData.verificationStatus as any,
    };

    setSaveSuccess(true);
    if (onProfileUpdated) {
      onProfileUpdated(updatedProfile);
    }

    setTimeout(() => {
      setSaveSuccess(false);
      setIsEditing(false);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* CANONICAL MARINEWORLD DIGITAL ID PRESENTATION CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-950 text-white flex items-center justify-center font-mono font-bold text-lg shrink-0 border border-slate-700 shadow-xs overflow-hidden">
              {formData.logoUrl ? (
                <img
                  src={formData.logoUrl}
                  alt={formData.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                resolvedProfile.initials || formData.displayName.slice(0, 2).toUpperCase() || "MW"
              )}
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                CANONICAL COMPANY IDENTITY
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight mt-0.5">
                {formData.displayName}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Legal Registered Name: <span className="text-slate-200 font-semibold">{formData.legalName}</span>
              </p>
            </div>
          </div>

          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-5 py-2.5 rounded-xl bg-royal text-white hover:bg-blue-600 font-semibold text-xs transition-colors flex items-center gap-2 self-start sm:self-auto shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>EDIT IDENTITY</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setValidationError(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 font-semibold text-xs transition-colors flex items-center gap-2 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>SAVE COMPANY PROFILE</span>
              </button>
            </div>
          )}
        </div>

        {/* IMMUTABLE ID + PRIMARY REGISTRY NODE BOXES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Box 1: MW Digital ID */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                CANONICAL MARINEWORLD ID
              </span>
              <span className="text-[9px] px-2.5 py-0.5 rounded bg-royal/20 text-blue-400 font-mono font-bold flex items-center gap-1 border border-royal/30">
                <Lock className="w-3 h-3 text-blue-400" />
                <span>IMMUTABLE MARINEWORLD ID</span>
              </span>
            </div>
            <div className="text-2xl font-mono font-black tracking-wider text-blue-400">
              {formData.mwCompanyDigitalId}
            </div>
            <div className="text-[10px] text-slate-400">
              Permanent organizational identity • Never changes across Sector Cities or regional expansions
            </div>
          </div>

          {/* Box 2: Primary Registry Node */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                PRIMARY REGISTRY NODE
              </span>
              <span className="text-[9px] px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-semibold">
                READ-ONLY
              </span>
            </div>
            <div className="text-lg font-mono font-bold text-slate-100 flex items-center gap-2">
              <Globe2 className="w-5 h-5 text-royal shrink-0" />
              <span>{formData.primaryRegistryNode}</span>
            </div>
            <div className="text-[10px] text-slate-400">
              Primary indexing anchor code • {formData.primaryRegistryCode}
            </div>
          </div>
        </div>
      </div>

      {/* Banner / Status Alerts */}
      {validationError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2.5 font-medium shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2.5 font-medium shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Canonical Company Profile successfully persisted to Firestore and updated across system layers.</span>
        </div>
      )}

      {/* Main Canonical Profile Content */}
      {!isEditing ? (
        /* READ-ONLY VIEW */
        <div className="space-y-6">
          {/* SECTION 1: IDENTITY */}
          <div className="bg-white border border-line rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-royal" />
                <h3 className="text-sm font-bold text-graphite uppercase tracking-wider">IDENTITY</h3>
              </div>
              <span className="text-[11px] font-mono font-bold text-stone">{formData.mwCompanyDigitalId}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-50/80 border border-line/60 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-stone uppercase tracking-wider block">Company Display Name</span>
                <div className="text-sm font-bold text-graphite">{formData.displayName}</div>
              </div>

              <div className="p-4 bg-slate-50/80 border border-line/60 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-stone uppercase tracking-wider block">Legal Registered Name</span>
                <div className="text-sm font-bold text-graphite">{formData.legalName}</div>
              </div>

              <div className="p-4 bg-slate-50/80 border border-line/60 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-stone uppercase tracking-wider block">Brand / Trading Name</span>
                <div className="text-xs font-semibold text-graphite">{formData.brandName || formData.displayName}</div>
              </div>

              <div className="p-4 bg-slate-50/80 border border-line/60 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-stone uppercase tracking-wider block">MarineWorld Company ID (Immutable)</span>
                <div className="text-xs font-mono font-bold text-royal flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>{formData.mwCompanyDigitalId}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50/80 border border-line/60 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-stone uppercase tracking-wider block">Logo URL</span>
                <div className="text-xs font-mono text-stone truncate">{formData.logoUrl || "Default Institutional Icon"}</div>
              </div>

              <div className="p-4 bg-slate-50/80 border border-line/60 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-stone uppercase tracking-wider block">Verification Status</span>
                <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{formData.verificationStatus}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: CLASSIFICATION */}
          <div className="bg-white border border-line rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-royal" />
                <h3 className="text-sm font-bold text-graphite uppercase tracking-wider">CLASSIFICATION</h3>
              </div>
              <span className="text-[11px] text-stone">Regional & Sector Taxonomies</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-50/80 border border-line/60 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-stone uppercase tracking-wider block">Primary Sector Category</span>
                <div className="text-xs font-bold text-graphite">{formData.primarySectorCategory}</div>
              </div>

              <div className="p-4 bg-slate-50/80 border border-line/60 rounded-xl space-y-1 sm:col-span-2">
                <span className="text-[10px] font-bold text-stone uppercase tracking-wider block">Secondary Sector Categories</span>
                <div className="text-xs font-semibold text-stone">{formData.secondarySectorCategories}</div>
              </div>

              <div className="p-4 bg-slate-50/80 border border-line/60 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-stone uppercase tracking-wider block">Country</span>
                <div className="text-xs font-semibold text-graphite flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-stone" />
                  <span>{formData.country}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50/80 border border-line/60 rounded-xl space-y-1 sm:col-span-2">
                <span className="text-[10px] font-bold text-stone uppercase tracking-wider block">Headquarters City</span>
                <div className="text-xs font-semibold text-graphite flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-stone" />
                  <span>{formData.headquartersCity}</span>
                </div>
              </div>
            </div>

            {/* Sector Cities & Regional Editions Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div className="p-4 bg-slate-50/80 border border-line/60 rounded-xl space-y-2">
                <span className="text-[10px] font-bold text-stone uppercase tracking-wider block">
                  Sector Cities ({formData.sectorCityIds.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {formData.sectorCityIds.map((cId) => {
                    const label = AVAILABLE_SECTOR_CITIES.find((sc) => sc.id === cId)?.label || cId;
                    return (
                      <span key={cId} className="px-2.5 py-1 rounded-lg bg-white border border-line text-graphite text-[11px] font-mono font-semibold">
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 bg-slate-50/80 border border-line/60 rounded-xl space-y-2">
                <span className="text-[10px] font-bold text-stone uppercase tracking-wider block">
                  Regional Editions ({formData.regionalEditions.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {formData.regionalEditions.map((ed) => {
                    const label = AVAILABLE_REGIONAL_EDITIONS.find((r) => r.code === ed)?.label || ed;
                    return (
                      <span key={ed} className="px-2.5 py-1 rounded-lg bg-royal/10 text-royal border border-royal/20 text-[11px] font-mono font-semibold">
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: CORPORATE */}
          <div className="bg-white border border-line rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-royal" />
                <h3 className="text-sm font-bold text-graphite uppercase tracking-wider">CORPORATE</h3>
              </div>
              <span className="text-[11px] text-stone">Registry & Official Contacts</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-50/80 border border-line/60 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-stone uppercase tracking-wider block">Registration Number</span>
                <div className="text-xs font-mono font-bold text-graphite">{formData.registrationNumber}</div>
              </div>

              <div className="p-4 bg-slate-50/80 border border-line/60 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-stone uppercase tracking-wider block">Founded Year</span>
                <div className="text-xs font-semibold text-graphite">{formData.foundedYear}</div>
              </div>

              <div className="p-4 bg-slate-50/80 border border-line/60 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-stone uppercase tracking-wider block">Website URL (HTTPS)</span>
                <a
                  href={formData.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-royal hover:underline truncate flex items-center gap-1"
                >
                  <span className="truncate">{formData.websiteUrl}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>

              <div className="p-4 bg-slate-50/80 border border-line/60 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-stone uppercase tracking-wider block">Official Email</span>
                <div className="text-xs font-medium text-graphite truncate">{formData.officialEmail}</div>
              </div>

              <div className="p-4 bg-slate-50/80 border border-line/60 rounded-xl space-y-1 sm:col-span-2">
                <span className="text-[10px] font-bold text-stone uppercase tracking-wider block">Official Phone</span>
                <div className="text-xs font-medium text-graphite truncate">{formData.officialPhone}</div>
              </div>
            </div>

            <div className="p-4 bg-slate-50/80 border border-line/60 rounded-xl space-y-1 text-xs">
              <span className="text-[10px] font-bold text-stone uppercase tracking-wider block">Corporate Description</span>
              <p className="text-stone leading-relaxed font-normal">
                {formData.corporateDescription}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* EDITABLE FORM */
        <form onSubmit={handleSave} className="space-y-6">
          {/* EDIT SECTION 1: IDENTITY */}
          <div className="bg-white border border-line rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-royal" />
                <h3 className="text-sm font-bold text-graphite uppercase tracking-wider">EDIT IDENTITY</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-graphite block mb-1">
                  Company Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full bg-white border border-line rounded-xl px-3.5 py-2.5 text-xs text-graphite focus:outline-none focus:border-royal"
                  placeholder="e.g. Crest Group Materials"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-graphite block mb-1">
                  Legal Registered Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.legalName}
                  onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                  className="w-full bg-white border border-line rounded-xl px-3.5 py-2.5 text-xs text-graphite focus:outline-none focus:border-royal"
                  placeholder="e.g. Crest Group Materials B.V."
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-graphite block mb-1">
                  Brand / Trading Name
                </label>
                <input
                  type="text"
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                  className="w-full bg-white border border-line rounded-xl px-3.5 py-2.5 text-xs text-graphite focus:outline-none focus:border-royal"
                  placeholder="e.g. Crest Group"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-graphite block mb-1 flex items-center gap-1">
                  <span>MarineWorld Digital ID</span>
                  <Lock className="w-3 h-3 text-amber-600" />
                  <span className="text-[9px] text-amber-600 font-bold uppercase">(Immutable ID)</span>
                </label>
                <input
                  type="text"
                  disabled
                  value={formData.mwCompanyDigitalId}
                  className="w-full bg-slate-100 border border-line rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-graphite block mb-1">
                  Logo URL
                </label>
                <input
                  type="text"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  className="w-full bg-white border border-line rounded-xl px-3.5 py-2.5 text-xs text-graphite focus:outline-none focus:border-royal"
                  placeholder="https://images.unsplash.com/... or /icon.png"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-graphite block mb-1">
                  Verification Status
                </label>
                <select
                  value={formData.verificationStatus}
                  onChange={(e) => setFormData({ ...formData, verificationStatus: e.target.value })}
                  className="w-full bg-white border border-line rounded-xl px-3.5 py-2.5 text-xs text-graphite focus:outline-none focus:border-royal"
                >
                  <option value="VERIFIED">VERIFIED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="UNVERIFIED">UNVERIFIED</option>
                </select>
              </div>
            </div>
          </div>

          {/* EDIT SECTION 2: CLASSIFICATION */}
          <div className="bg-white border border-line rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-royal" />
                <h3 className="text-sm font-bold text-graphite uppercase tracking-wider">EDIT CLASSIFICATION</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-graphite block mb-1">
                  Primary Sector Category *
                </label>
                <input
                  type="text"
                  required
                  value={formData.primarySectorCategory}
                  onChange={(e) => setFormData({ ...formData, primarySectorCategory: e.target.value })}
                  className="w-full bg-white border border-line rounded-xl px-3.5 py-2.5 text-xs text-graphite focus:outline-none focus:border-royal"
                  placeholder="e.g. Marine Logistics & Port Operations"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-graphite block mb-1">
                  Secondary Sector Categories (Comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.secondarySectorCategories}
                  onChange={(e) => setFormData({ ...formData, secondarySectorCategories: e.target.value })}
                  className="w-full bg-white border border-line rounded-xl px-3.5 py-2.5 text-xs text-graphite focus:outline-none focus:border-royal"
                  placeholder="e.g. Technical Vessel Provisioning, Charter Fleet Support"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-graphite block mb-1">
                  Country *
                </label>
                <input
                  type="text"
                  required
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full bg-white border border-line rounded-xl px-3.5 py-2.5 text-xs text-graphite focus:outline-none focus:border-royal"
                  placeholder="e.g. Netherlands, Türkiye, USA, Italy"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-graphite block mb-1">
                  Headquarters City *
                </label>
                <input
                  type="text"
                  required
                  value={formData.headquartersCity}
                  onChange={(e) => setFormData({ ...formData, headquartersCity: e.target.value })}
                  className="w-full bg-white border border-line rounded-xl px-3.5 py-2.5 text-xs text-graphite focus:outline-none focus:border-royal"
                  placeholder="e.g. Rotterdam, Göcek, Fort Lauderdale, Genoa"
                />
              </div>
            </div>

            {/* Sector Cities Multi-Select */}
            <div className="space-y-1.5 pt-2">
              <label className="text-[11px] font-semibold text-graphite block">
                Sector Cities (Multi-select)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AVAILABLE_SECTOR_CITIES.map((c) => {
                  const active = formData.sectorCityIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleSectorCity(c.id)}
                      className={`px-3 py-2 rounded-xl text-[11px] font-semibold border text-left transition-colors flex items-center justify-between ${
                        active
                          ? "bg-royal/10 border-royal text-royal font-bold"
                          : "bg-slate-50 border-line text-stone hover:text-graphite"
                      }`}
                    >
                      <span>{c.label}</span>
                      {active && <CheckCircle2 className="w-3.5 h-3.5 text-royal shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Regional Editions Multi-Select */}
            <div className="space-y-1.5 pt-2">
              <label className="text-[11px] font-semibold text-graphite block">
                Regional Editions (Multi-select)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AVAILABLE_REGIONAL_EDITIONS.map((r) => {
                  const active = formData.regionalEditions.includes(r.code);
                  return (
                    <button
                      key={r.code}
                      type="button"
                      onClick={() => toggleRegionalEdition(r.code)}
                      className={`px-3 py-2 rounded-xl text-[11px] font-semibold border text-left transition-colors flex items-center justify-between ${
                        active
                          ? "bg-royal/10 border-royal text-royal font-bold"
                          : "bg-slate-50 border-line text-stone hover:text-graphite"
                      }`}
                    >
                      <span>{r.label}</span>
                      {active && <CheckCircle2 className="w-3.5 h-3.5 text-royal shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* EDIT SECTION 3: CORPORATE */}
          <div className="bg-white border border-line rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-royal" />
                <h3 className="text-sm font-bold text-graphite uppercase tracking-wider">EDIT CORPORATE</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-graphite block mb-1">
                  Registration Number
                </label>
                <input
                  type="text"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  className="w-full bg-white border border-line rounded-xl px-3.5 py-2.5 text-xs text-graphite focus:outline-none focus:border-royal"
                  placeholder="e.g. NL-89201144"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-graphite block mb-1">
                  Founded Year
                </label>
                <input
                  type="text"
                  value={formData.foundedYear}
                  onChange={(e) => setFormData({ ...formData, foundedYear: e.target.value })}
                  className="w-full bg-white border border-line rounded-xl px-3.5 py-2.5 text-xs text-graphite focus:outline-none focus:border-royal"
                  placeholder="e.g. 2018"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-graphite block mb-1">
                  Website URL (Must start with https://)
                </label>
                <input
                  type="url"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  className="w-full bg-white border border-line rounded-xl px-3.5 py-2.5 text-xs text-graphite focus:outline-none focus:border-royal"
                  placeholder="https://company.com"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-graphite block mb-1">
                  Official Email
                </label>
                <input
                  type="email"
                  value={formData.officialEmail}
                  onChange={(e) => setFormData({ ...formData, officialEmail: e.target.value })}
                  className="w-full bg-white border border-line rounded-xl px-3.5 py-2.5 text-xs text-graphite focus:outline-none focus:border-royal"
                  placeholder="contact@company.com"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-graphite block mb-1">
                  Official Phone
                </label>
                <input
                  type="tel"
                  value={formData.officialPhone}
                  onChange={(e) => setFormData({ ...formData, officialPhone: e.target.value })}
                  className="w-full bg-white border border-line rounded-xl px-3.5 py-2.5 text-xs text-graphite focus:outline-none focus:border-royal"
                  placeholder="+31 10 495 2000"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-graphite block mb-1">
                  Corporate Description
                </label>
                <textarea
                  rows={4}
                  value={formData.corporateDescription}
                  onChange={(e) => setFormData({ ...formData, corporateDescription: e.target.value })}
                  className="w-full bg-white border border-line rounded-xl px-3.5 py-2.5 text-xs text-graphite focus:outline-none focus:border-royal leading-relaxed"
                  placeholder="Comprehensive corporate description, enterprise operations, and maritime capabilities..."
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border border-line rounded-2xl flex items-center justify-end gap-3 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setValidationError(null);
              }}
              className="px-5 py-2.5 border border-line rounded-xl text-xs font-semibold text-stone hover:text-graphite transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-royal text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>SAVE COMPANY PROFILE</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
