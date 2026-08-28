import React, { useState } from "react";
import { CompanyProfile, CompanyEntity } from "@/lib/types";
import { marineSector } from "@/lib/sectors/marine";
import {
  saveCompanyRecordSync,
  getCompanyRecordSync,
  findAllCompaniesSync,
} from "@/lib/repositories/companyRepository";
import {
  Building2,
  CheckCircle2,
  X,
  MapPin,
  Globe2,
  Mail,
  Phone,
  Briefcase,
  ShieldCheck,
  Edit3,
  Save,
  AlertCircle,
  Lock,
  Layers,
  Globe,
  Anchor,
  FileText,
  Calendar,
  Upload,
  Image as ImageIcon,
  UploadCloud,
  Trash2,
} from "lucide-react";

import {
  uploadFileToStorage,
  deleteFileFromStorage,
  validateStorageFile,
} from "@/lib/services/storageService";

interface CanonicalCompanyProfileModalProps {
  company: CompanyProfile;
  isOpen: boolean;
  initialMode?: "VIEW" | "EDIT";
  onClose: () => void;
  onProfileUpdated?: (updated: CompanyProfile) => void;
}

const AVAILABLE_SECTOR_CITIES = marineSector.explorer.cities.map((c) => ({
  id: c.id,
  label: `${c.domain} · ${c.shortDescription}`,
}));

const AVAILABLE_REGIONAL_EDITIONS = [
  { code: "MEDITERRANEAN", label: "Mediterranean Edition" },
  { code: "NORTH_EUROPE", label: "Northern Europe Edition" },
  { code: "NORTH_AMERICA", label: "North America Edition" },
  { code: "CARIBBEAN", label: "Caribbean Edition" },
  { code: "MIDDLE_EAST", label: "Middle East Edition" },
  { code: "ASIA_PACIFIC", label: "Asia Pacific Edition" },
];

export function derive6DigitCompanyId(companyId: string, businessId?: string): string {
  if (businessId) {
    const match = businessId.match(/\d{6}/);
    if (match) return match[0];
  }
  const norm = (companyId || "comp").toLowerCase();
  if (norm.includes("argento")) return "100001";
  if (norm.includes("blueharbour")) return "100002";
  if (norm.includes("north-atlantic") || norm.includes("northatlantic")) return "100003";
  if (norm.includes("another")) return "100004";
  if (norm.includes("med-marine") || norm.includes("medmarine")) return "100005";

  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = (hash << 5) - hash + norm.charCodeAt(i);
    hash |= 0;
  }
  const num = Math.abs(hash) % 900000 + 100000;
  return num.toString();
}

export function CanonicalCompanyProfileModal({
  company,
  isOpen,
  initialMode = "VIEW",
  onClose,
  onProfileUpdated,
}: CanonicalCompanyProfileModalProps) {
  const [mode, setMode] = useState<"VIEW" | "EDIT">(initialMode);

  const initial6Digit = company.companyId6Digit || derive6DigitCompanyId(company.id, company.businessId);

  const [formData, setFormData] = useState({
    displayName: company.displayName || company.name || "",
    legalName: company.legalName || company.name || "",
    brandName: company.tradingName || (company as any).brandName || company.name || "",
    companyId6Digit: initial6Digit,
    logoUrl: company.logoUrl || (company as any).logo || "",
    coverImage: company.coverImage || (company as any).heroImageUrl || "",
    flagshipStatement: company.flagshipStatement || (company as any).coverImageCaption || "",
    verificationStatus: company.verificationStatus || "VERIFIED",

    primarySectorCategory: company.primarySectorCategory || company.industry || "Marine Services",
    secondarySectorCategories: company.secondarySectorCategories?.join(", ") || "Marine Equipment, Logistics",
    sectorCityIds: company.sectorCityIds || company.cityIds || ["supplychain"],
    regionalEditions: company.regionalEditions || [company.region || "MEDITERRANEAN"],
    country: company.country || "Netherlands",
    headquartersCity: company.headquartersCity || company.city || "Rotterdam",

    registrationNumber: company.registrationNumber || "NL-89201144",
    foundedYear: company.foundedYear || "2018",
    corporateDescription: company.description || company.corporateDescription || company.shortDescription || "",
    websiteUrl: company.website || (company as any).websiteUrl || "https://marineworld.city",
    officialEmail: company.officialEmail || `contact@${company.slug || company.id}.com`,
    officialPhone: company.officialPhone || "+31 10 495 2000",
  });

  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [logoUploadMsg, setLogoUploadMsg] = useState<string | null>(null);
  const [coverUploadMsg, setCoverUploadMsg] = useState<string | null>(null);

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateStorageFile(file, "IMAGE", 10 * 1024 * 1024);
    if (!validation.valid) {
      setLogoUploadMsg(validation.error || "Invalid logo image.");
      return;
    }

    try {
      setLogoUploadMsg("Uploading logo to Firebase Storage...");
      const previousUrl = formData.logoUrl;
      const res = await uploadFileToStorage(file, {
        companyId: company.id,
        categoryFolder: "brand",
        fileRole: "logo",
      });

      if (previousUrl && previousUrl.includes("firebasestorage.app")) {
        deleteFileFromStorage(previousUrl).catch(() => {});
      }

      setFormData((prev) => ({ ...prev, logoUrl: res.url }));
      setLogoUploadMsg(`Uploaded logo: ${file.name}`);
      setTimeout(() => setLogoUploadMsg(null), 4000);
    } catch (err: any) {
      setLogoUploadMsg(`Logo upload failed: ${err.message || "Error"}`);
    } finally {
      e.target.value = "";
    }
  };

  const handleCoverFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateStorageFile(file, "IMAGE", 25 * 1024 * 1024);
    if (!validation.valid) {
      setCoverUploadMsg(validation.error || "Invalid facility photo.");
      return;
    }

    try {
      setCoverUploadMsg("Uploading facility photo to Firebase Storage...");
      const previousCover = formData.coverImage;
      const res = await uploadFileToStorage(file, {
        companyId: company.id,
        categoryFolder: "brand",
        fileRole: "cover",
      });

      if (previousCover && previousCover.includes("firebasestorage.app")) {
        deleteFileFromStorage(previousCover).catch(() => {});
      }

      setFormData((prev) => ({ ...prev, coverImage: res.url }));
      setCoverUploadMsg(`Uploaded flagship photo: ${file.name}`);
      setTimeout(() => setCoverUploadMsg(null), 4000);
    } catch (err: any) {
      setCoverUploadMsg(`Facility photo upload failed: ${err.message || "Error"}`);
    } finally {
      e.target.value = "";
    }
  };

  if (!isOpen) return null;

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

    // 2. 6-Digit Company ID Validation
    const digitPattern = /^\d{6}$/;
    if (!digitPattern.test(formData.companyId6Digit)) {
      setValidationError("MarineWorld Company ID must be exactly 6 digits (e.g. 100001).");
      return;
    }

    // Immutability check: if existing company had a 6-digit ID, verify it wasn't mutated
    if (initial6Digit && formData.companyId6Digit !== initial6Digit) {
      setValidationError("6-Digit MarineWorld Company ID is immutable and cannot be changed.");
      return;
    }

    // Unique Company ID Validation across other companies
    const allCompanies = findAllCompaniesSync();
    const duplicate = allCompanies.find(
      (c) =>
        c.id !== company.id &&
        (c as any).companyId6Digit === formData.companyId6Digit
    );
    if (duplicate) {
      setValidationError(`Company ID ${formData.companyId6Digit} is already assigned to another enterprise.`);
      return;
    }

    // 3. Valid HTTPS URL Validation
    if (formData.websiteUrl.trim() && !formData.websiteUrl.trim().startsWith("https://")) {
      setValidationError("Website URL must start with valid HTTPS protocol (e.g. https://company.com).");
      return;
    }

    const existingRecord = getCompanyRecordSync(company.id) || getCompanyRecordSync(company.slug || company.id);

    const secondarySectors = formData.secondarySectorCategories
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const updatedEntity: Partial<CompanyEntity> & CompanyEntity = {
      ...(existingRecord as CompanyEntity),
      id: company.id,
      companyId6Digit: formData.companyId6Digit,
      slug: company.slug || company.id.toLowerCase(),
      businessId: `MW-BUS-${formData.companyId6Digit}`,
      organizationType: company.organizationType || existingRecord?.organizationType || "COMPANY",
      platformId: "marineworld",
      sectorId: company.industryDomainIds?.[0] || existingRecord?.sectorId || "marine",
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
      logo: formData.logoUrl,
      coverImage: formData.coverImage,
      heroImageUrl: formData.coverImage,
      flagshipStatement: formData.flagshipStatement,
      coverImageCaption: formData.flagshipStatement,
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
      ...company,
      name: formData.displayName,
      displayName: formData.displayName,
      legalName: formData.legalName,
      tradingName: formData.brandName,
      companyId6Digit: formData.companyId6Digit,
      businessId: `MW-BUS-${formData.companyId6Digit}`,
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
      setMode("VIEW");
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 antialiased">
      <div className="bg-white border border-line rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden animate-fadeIn">
        {/* Modal Header */}
        <div className="p-6 border-b border-line flex items-center justify-between shrink-0 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-base shrink-0 border border-slate-700 shadow-xs">
              {formData.logoUrl ? (
                <img
                  src={formData.logoUrl}
                  alt={formData.displayName}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                company.initials || formData.displayName.slice(0, 2).toUpperCase() || "MW"
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-stone uppercase tracking-widest">
                  CANONICAL COMPANY IDENTITY
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-royal/10 text-royal font-mono font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3 text-royal" />
                  <span>ID: {formData.companyId6Digit}</span>
                </span>
              </div>
              <h2 className="text-lg font-bold text-graphite tracking-tight mt-0.5">
                {mode === "VIEW" ? formData.displayName : "Edit Canonical Company Identity"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mode === "VIEW" ? (
              <button
                onClick={() => setMode("EDIT")}
                className="px-3.5 py-1.5 rounded-xl border border-line text-xs font-semibold text-graphite hover:bg-slate-100 flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Edit3 className="w-3.5 h-3.5 text-stone" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                onClick={() => setMode("VIEW")}
                className="px-3.5 py-1.5 rounded-xl border border-line text-xs font-semibold text-stone hover:text-graphite hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone hover:text-graphite hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {validationError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2.5 font-medium shadow-2xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2.5 font-medium shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Canonical Company Identity successfully persisted to Firestore and propagated.</span>
            </div>
          )}

          {/* VIEW MODE */}
          {mode === "VIEW" && (
            <div className="space-y-6 text-xs">
              {/* Single Source Banner */}
              <div className="p-4 bg-slate-50 border border-line/60 rounded-xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-royal shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-[11px] font-bold text-graphite uppercase tracking-wider">
                    SINGLE CANONICAL SOURCE OF TRUTH
                  </div>
                  <p className="text-stone leading-relaxed font-normal">
                    This canonical profile propagates automatically across Company Studio, Public Company Pages, Digital Property Builders, public projections, and commercial records.
                  </p>
                </div>
              </div>

              {/* 01. IDENTITY SECTION */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-royal uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  <span>01. CORPORATE IDENTITY</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3.5 bg-white border border-line rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-stone tracking-wider block">
                      Display Name
                    </span>
                    <div className="text-sm font-bold text-graphite">{formData.displayName}</div>
                  </div>

                  <div className="p-3.5 bg-white border border-line rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-stone tracking-wider block">
                      Legal Registered Name
                    </span>
                    <div className="text-sm font-bold text-graphite">{formData.legalName}</div>
                  </div>

                  <div className="p-3.5 bg-white border border-line rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-stone tracking-wider block">
                      Brand / Trading Name
                    </span>
                    <div className="text-xs font-semibold text-graphite">{formData.brandName}</div>
                  </div>

                  <div className="p-3.5 bg-white border border-line rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-stone tracking-wider block">
                      6-Digit Immutable Company ID
                    </span>
                    <div className="text-xs font-mono font-bold text-royal flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>{formData.companyId6Digit}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 02. CLASSIFICATION SECTION */}
              <div className="space-y-3 pt-2">
                <div className="text-[11px] font-bold text-royal uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  <span>02. SECTOR & REGIONAL CLASSIFICATION</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3.5 bg-white border border-line rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-stone tracking-wider block">
                      Primary Sector Category
                    </span>
                    <div className="text-xs font-semibold text-graphite">{formData.primarySectorCategory}</div>
                  </div>

                  <div className="p-3.5 bg-white border border-line rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-stone tracking-wider block">
                      Secondary Sector Categories
                    </span>
                    <div className="text-xs font-semibold text-stone">{formData.secondarySectorCategories}</div>
                  </div>

                  <div className="p-3.5 bg-white border border-line rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-stone tracking-wider block">
                      Country
                    </span>
                    <div className="text-xs font-semibold text-graphite flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-stone" />
                      <span>{formData.country}</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-white border border-line rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-stone tracking-wider block">
                      Headquarters City
                    </span>
                    <div className="text-xs font-semibold text-graphite flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-stone" />
                      <span>{formData.headquartersCity}</span>
                    </div>
                  </div>
                </div>

                {/* Multiple Sector Cities & Regional Editions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3.5 bg-white border border-line rounded-xl space-y-2">
                    <span className="text-[10px] uppercase font-bold text-stone tracking-wider block">
                      Sector Cities ({formData.sectorCityIds.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {formData.sectorCityIds.map((cId) => (
                        <span key={cId} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-mono font-semibold">
                          {cId}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 bg-white border border-line rounded-xl space-y-2">
                    <span className="text-[10px] uppercase font-bold text-stone tracking-wider block">
                      Regional Editions ({formData.regionalEditions.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {formData.regionalEditions.map((ed) => (
                        <span key={ed} className="px-2.5 py-1 rounded-lg bg-royal/10 text-royal text-[11px] font-mono font-semibold">
                          {ed}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 03. CORPORATE SECTION */}
              <div className="space-y-3 pt-2">
                <div className="text-[11px] font-bold text-royal uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  <span>03. CORPORATE REGISTRY & CONTACT</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 border border-line/60 rounded-xl space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-stone block">Registration Number</span>
                    <span className="font-mono font-bold text-graphite text-xs">{formData.registrationNumber}</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-line/60 rounded-xl space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-stone block">Founded Year</span>
                    <span className="font-semibold text-graphite text-xs">{formData.foundedYear}</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-line/60 rounded-xl space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-stone block">Website URL</span>
                    <a
                      href={formData.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-royal hover:underline truncate block text-xs"
                    >
                      {formData.websiteUrl}
                    </a>
                  </div>

                  <div className="p-3 bg-slate-50 border border-line/60 rounded-xl space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-stone block">Official Email</span>
                    <span className="font-medium text-graphite truncate block text-xs">{formData.officialEmail}</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-line/60 rounded-xl space-y-0.5 sm:col-span-2">
                    <span className="text-[9px] uppercase font-bold text-stone block">Official Phone</span>
                    <span className="font-medium text-graphite truncate block text-xs">{formData.officialPhone}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-line/60 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-stone tracking-wider block">
                    Corporate Description
                  </span>
                  <p className="text-stone leading-relaxed font-normal">
                    {formData.corporateDescription}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* EDIT MODE */}
          {mode === "EDIT" && (
            <form onSubmit={handleSave} className="space-y-6 text-xs">
              {/* SECTION 1: IDENTITY */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-royal uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-line">
                  <Building2 className="w-4 h-4" />
                  <span>IDENTITY</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-graphite block mb-1">
                      Company Display Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full bg-white border border-line rounded-xl px-3.5 py-2 text-xs text-graphite focus:outline-none focus:border-royal"
                      placeholder="e.g. Argento Marine"
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
                      className="w-full bg-white border border-line rounded-xl px-3.5 py-2 text-xs text-graphite focus:outline-none focus:border-royal"
                      placeholder="e.g. Argento Marine Yatçılık A.Ş."
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
                      className="w-full bg-white border border-line rounded-xl px-3.5 py-2 text-xs text-graphite focus:outline-none focus:border-royal"
                      placeholder="e.g. Argento Marine"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-graphite block mb-1 flex items-center gap-1">
                      <span>6-Digit MarineWorld Company ID</span>
                      <Lock className="w-3 h-3 text-amber-600" />
                      <span className="text-[9px] text-amber-600 font-bold uppercase">(Immutable)</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      value={formData.companyId6Digit}
                      className="w-full bg-slate-100 border border-line rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-700 cursor-not-allowed"
                    />
                  </div>

                  {/* Company Logo Editor */}
                  <div className="sm:col-span-2 bg-slate-50 border border-line p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-graphite flex items-center gap-1.5">
                        <span>COMPANY BRAND MARK / LOGO</span>
                      </label>
                      <span className="text-[10px] font-mono text-royal font-bold">DESKTOP UPLOAD READY</span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-white border border-line flex items-center justify-center shrink-0 overflow-hidden font-bold text-sm text-royal">
                        {formData.logoUrl && (formData.logoUrl.startsWith("http") || formData.logoUrl.startsWith("data:")) ? (
                          <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                        ) : (
                          <span>{(formData.brandName || "MW").slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>

                      <div className="flex-1 space-y-1.5 w-full">
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor="modal-logo-file"
                            className="px-3 py-1.5 bg-royal hover:bg-royal text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Logo File</span>
                            <input
                              type="file"
                              id="modal-logo-file"
                              accept="image/*"
                              onChange={handleLogoFileUpload}
                              className="hidden"
                            />
                          </label>
                          {logoUploadMsg && <span className="text-[10px] text-emerald-600 font-mono">{logoUploadMsg}</span>}
                        </div>
                        <input
                          type="text"
                          value={formData.logoUrl}
                          onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                          className="w-full bg-white border border-line rounded-lg px-3 py-1.5 text-xs text-graphite focus:outline-none focus:border-royal font-mono"
                          placeholder="Or specify Logo URL..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Flagship Company Presence Photo Editor */}
                  <div className="sm:col-span-2 bg-slate-50 border border-line p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-graphite flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-royal" />
                        <span>FLAGSHIP COMPANY PRESENCE PHOTO (COVER IMAGE)</span>
                      </label>
                      <span className="text-[10px] font-mono text-emerald-700 font-bold">16:9 BANNER MEDIA</span>
                    </div>

                    <div className="relative w-full h-36 rounded-lg overflow-hidden border border-line bg-slate-900">
                      {formData.coverImage ? (
                        <img src={formData.coverImage} alt="Flagship Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                          No Flagship Facility Photo Uploaded
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent pointer-events-none" />
                      <div className="absolute bottom-2.5 left-3 right-3 text-white text-xs font-sans pointer-events-none space-y-0.5">
                        <div className="font-mono text-[8px] uppercase tracking-widest text-emerald-400 font-bold">
                          REAL-WORLD OPERATING PRESENCE OVERLAY
                        </div>
                        <p className="text-[11px] text-white/95 font-light line-clamp-2 leading-snug">
                          {formData.flagshipStatement || "Physical operational facilities, marine yards, and engineering logistics infrastructure maintained under verified international standards."}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="modal-flagship-statement" className="text-[11px] font-bold text-graphite flex items-center justify-between">
                        <span>BANNER OVERLAY STATEMENT</span>
                        <span className="text-[9px] font-mono text-royal font-bold">LIVE OVERLAY TEXT</span>
                      </label>
                      <textarea
                        id="modal-flagship-statement"
                        rows={2}
                        value={formData.flagshipStatement}
                        onChange={(e) => setFormData({ ...formData, flagshipStatement: e.target.value })}
                        placeholder="Physical operational facilities, marine yards, and engineering logistics infrastructure maintained under verified international standards."
                        className="w-full p-2.5 rounded-lg border border-line bg-white focus:border-royal focus:outline-none text-xs text-graphite font-sans"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="modal-cover-file"
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Upload Facility Photo from Desktop</span>
                        <input
                          type="file"
                          id="modal-cover-file"
                          accept="image/*"
                          onChange={handleCoverFileUpload}
                          className="hidden"
                        />
                      </label>
                      {coverUploadMsg && <span className="text-[10px] text-emerald-600 font-mono">{coverUploadMsg}</span>}
                    </div>

                    <input
                      type="text"
                      value={formData.coverImage}
                      onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                      className="w-full bg-white border border-line rounded-lg px-3 py-1.5 text-xs text-graphite focus:outline-none focus:border-royal font-mono"
                      placeholder="Or specify Facility Image URL..."
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-graphite block mb-1">
                      Verification Status
                    </label>
                    <select
                      value={formData.verificationStatus}
                      onChange={(e) => setFormData({ ...formData, verificationStatus: e.target.value })}
                      className="w-full bg-white border border-line rounded-xl px-3.5 py-2 text-xs text-graphite focus:outline-none focus:border-royal"
                    >
                      <option value="VERIFIED">VERIFIED</option>
                      <option value="PENDING">PENDING</option>
                      <option value="UNVERIFIED">UNVERIFIED</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: CLASSIFICATION */}
              <div className="space-y-3 pt-2">
                <div className="text-[11px] font-bold text-royal uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-line">
                  <Layers className="w-4 h-4" />
                  <span>CLASSIFICATION</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-graphite block mb-1">
                      Primary Sector Category *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.primarySectorCategory}
                      onChange={(e) => setFormData({ ...formData, primarySectorCategory: e.target.value })}
                      className="w-full bg-white border border-line rounded-xl px-3.5 py-2 text-xs text-graphite focus:outline-none focus:border-royal"
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
                      className="w-full bg-white border border-line rounded-xl px-3.5 py-2 text-xs text-graphite focus:outline-none focus:border-royal"
                      placeholder="e.g. Refit Engineering, Yacht Provisioning"
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
                      className="w-full bg-white border border-line rounded-xl px-3.5 py-2 text-xs text-graphite focus:outline-none focus:border-royal"
                      placeholder="e.g. Netherlands, Türkiye, USA"
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
                      className="w-full bg-white border border-line rounded-xl px-3.5 py-2 text-xs text-graphite focus:outline-none focus:border-royal"
                      placeholder="e.g. Rotterdam, Göcek, Fort Lauderdale"
                    />
                  </div>
                </div>

                {/* Multiple Sector Cities Selection */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-semibold text-graphite block">
                    Belonging Sector Cities (Select all that apply)
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

                {/* Multiple Regional Editions Selection */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-semibold text-graphite block">
                    Regional Editions (Select all that apply)
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

              {/* SECTION 3: CORPORATE */}
              <div className="space-y-3 pt-2">
                <div className="text-[11px] font-bold text-royal uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-line">
                  <FileText className="w-4 h-4" />
                  <span>CORPORATE REGISTRY & CONTACT</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-graphite block mb-1">
                      Registration Number
                    </label>
                    <input
                      type="text"
                      value={formData.registrationNumber}
                      onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                      className="w-full bg-white border border-line rounded-xl px-3.5 py-2 text-xs text-graphite focus:outline-none focus:border-royal"
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
                      className="w-full bg-white border border-line rounded-xl px-3.5 py-2 text-xs text-graphite focus:outline-none focus:border-royal"
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
                      className="w-full bg-white border border-line rounded-xl px-3.5 py-2 text-xs text-graphite focus:outline-none focus:border-royal"
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
                      className="w-full bg-white border border-line rounded-xl px-3.5 py-2 text-xs text-graphite focus:outline-none focus:border-royal"
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
                      className="w-full bg-white border border-line rounded-xl px-3.5 py-2 text-xs text-graphite focus:outline-none focus:border-royal"
                      placeholder="+31 10 495 2000"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-graphite block mb-1">
                      Corporate Description
                    </label>
                    <textarea
                      rows={3}
                      value={formData.corporateDescription}
                      onChange={(e) => setFormData({ ...formData, corporateDescription: e.target.value })}
                      className="w-full bg-white border border-line rounded-xl px-3.5 py-2 text-xs text-graphite focus:outline-none focus:border-royal leading-relaxed"
                      placeholder="Comprehensive overview of corporate capabilities, enterprise registry, and maritime logistics operations..."
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-line flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setMode("VIEW")}
                  className="px-4 py-2 border border-line rounded-xl text-xs font-semibold text-stone hover:text-graphite transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-royal text-white rounded-xl text-xs font-semibold hover:bg-royal-dark transition-colors flex items-center gap-2 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Canonical Profile</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        {mode === "VIEW" && (
          <div className="p-4 border-t border-line bg-slate-50/60 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-stone">
              Canonical Identity updates propagate immediately across all Sector Cities and Digital Properties.
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
