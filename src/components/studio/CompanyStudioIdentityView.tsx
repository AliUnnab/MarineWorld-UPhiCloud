import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Globe,
  Mail,
  Phone,
  Save,
  AlertCircle,
  Lock,
  Copy,
  Check,
  Sparkles,
  Info,
  Upload,
  Image as ImageIcon,
  UploadCloud,
  Trash2,
} from "lucide-react";
import type { CompanyEntity, CompanyProfile } from "@/lib/types";
import { getCompanyById, saveCompany } from "@/lib/services/companyService";
import { updateBusinessIdentity } from "@/lib/businessTwinStore";
import { resolveMarineWorldCompanyDigitalId } from "@/lib/services/companyIdentityService";
import { getCompanyRecordSync } from "@/lib/repositories/companyRepository";
import { recordIdentityAudit } from "@/lib/services/auditService";
import { getEnrolledOrganizationForCompany } from "@/lib/services/ecosystemOrganizationService";
import {
  uploadFileToStorage,
  deleteFileFromStorage,
  validateStorageFile,
} from "@/lib/services/storageService";

interface CompanyStudioIdentityViewProps {
  companyId: string;
  onSaved?: () => void;
}

export const CompanyStudioIdentityView: React.FC<CompanyStudioIdentityViewProps> = ({
  companyId,
  onSaved,
}) => {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Storage Upload state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoProgress, setLogoProgress] = useState(0);
  const [logoUploadMsg, setLogoUploadMsg] = useState<string | null>(null);

  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);
  const [coverUploadMsg, setCoverUploadMsg] = useState<string | null>(null);

  // Load canonical company record
  const canonicalCompany =
    getCompanyById(companyId) ||
    (getCompanyRecordSync(companyId) as unknown as CompanyEntity);

  const initialDigitalId = useMemo(() => {
    return resolveMarineWorldCompanyDigitalId({
      companyIdOrSlug: companyId,
      mwCompanyDigitalId: canonicalCompany?.mwCompanyDigitalId,
      businessId: canonicalCompany?.businessId,
      companyId6Digit: (canonicalCompany as any)?.companyId6Digit,
      primaryRegistryCode: (canonicalCompany as any)?.primaryRegistryCode,
      primarySectorCityId: (canonicalCompany as any)?.sectorCityIds?.[0] || (canonicalCompany as any)?.cityIds?.[0],
    });
  }, [canonicalCompany, companyId]);

  const [formData, setFormData] = useState({
    legalName: canonicalCompany?.legalName || canonicalCompany?.name || "",
    brandName: (canonicalCompany as any)?.tradingName || canonicalCompany?.displayName || canonicalCompany?.name || "",
    registrationNumber: (canonicalCompany as any)?.registrationNumber || "",
    jurisdiction: (canonicalCompany as any)?.jurisdiction || "European Union / Netherlands",
    registrationAuthority: (canonicalCompany as any)?.registrationAuthority || "Chamber of Commerce",
    country: canonicalCompany?.country || "Netherlands",
    city: canonicalCompany?.city || (canonicalCompany as any)?.headquartersCity || "Rotterdam",
    officialEmail: (canonicalCompany as any)?.officialEmail || "",
    officialPhone: (canonicalCompany as any)?.officialPhone || "",
    shortDescription: canonicalCompany?.shortDescription || "",
    description: canonicalCompany?.description || (canonicalCompany as any)?.corporateDescription || "",
    logoUrl: canonicalCompany?.logo || canonicalCompany?.logoUrl || "",
    coverImage: canonicalCompany?.coverImage || (canonicalCompany as any)?.heroImageUrl || "",
    flagshipStatement: canonicalCompany?.flagshipStatement || (canonicalCompany as any)?.coverImageCaption || "",
  });

  useEffect(() => {
    const comp =
      getCompanyById(companyId) ||
      (getCompanyRecordSync(companyId) as unknown as CompanyEntity);
    if (comp) {
      setFormData({
        legalName: comp.legalName || comp.displayName || "",
        brandName: comp.brandName || comp.displayName || "",
        registrationNumber: (comp as any)?.registrationNumber || "NL-89201144",
        registrationAuthority: (comp as any)?.registrationAuthority || "Chamber of Commerce (KvK)",
        country: comp.country || "Netherlands",
        city: comp.city || "Rotterdam",
        officialEmail: comp.email || `contact@${comp.slug || companyId}.com`,
        officialPhone: comp.phone || "+31 10 555 0190",
        shortDescription: comp.shortDescription || "",
        description: comp.description || "",
        logoUrl: comp.logo || comp.logoUrl || "",
        coverImage: comp.coverImage || (comp as any)?.heroImageUrl || "",
        flagshipStatement: comp.flagshipStatement || (comp as any)?.coverImageCaption || "",
      });
    }
  }, [companyId]);

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateStorageFile(file, "IMAGE", 10 * 1024 * 1024);
    if (!validation.valid) {
      setLogoUploadMsg(validation.error || "Invalid logo image.");
      return;
    }

    try {
      setIsUploadingLogo(true);
      setLogoProgress(0);
      setLogoUploadMsg("Uploading logo to Firebase Storage...");

      const previousUrl = formData.logoUrl;
      const res = await uploadFileToStorage(file, {
        companyId,
        categoryFolder: "brand",
        fileRole: "logo",
        onProgress: setLogoProgress,
      });

      if (previousUrl && previousUrl.includes("firebasestorage.app")) {
        deleteFileFromStorage(previousUrl).catch(() => {});
      }

      setFormData((prev) => ({ ...prev, logoUrl: res.url }));
      setLogoUploadMsg(`Logo successfully uploaded to Firebase Storage: ${file.name}`);
      setTimeout(() => setLogoUploadMsg(null), 4500);
    } catch (err: any) {
      console.error("[CompanyStudioIdentityView] Logo upload error:", err);
      setLogoUploadMsg(`Logo upload failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsUploadingLogo(false);
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
      setIsUploadingCover(true);
      setCoverProgress(0);
      setCoverUploadMsg("Uploading facility photo to Firebase Storage...");

      const previousCover = formData.coverImage;
      const res = await uploadFileToStorage(file, {
        companyId,
        categoryFolder: "brand",
        fileRole: "cover",
        onProgress: setCoverProgress,
      });

      if (previousCover && previousCover.includes("firebasestorage.app")) {
        deleteFileFromStorage(previousCover).catch(() => {});
      }

      setFormData((prev) => ({ ...prev, coverImage: res.url }));
      setCoverUploadMsg(`Facility photo successfully uploaded to Firebase Storage: ${file.name}`);
      setTimeout(() => setCoverUploadMsg(null), 4500);
    } catch (err: any) {
      console.error("[CompanyStudioIdentityView] Cover photo upload error:", err);
      setCoverUploadMsg(`Facility photo upload failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsUploadingCover(false);
      e.target.value = "";
    }
  };

  // Mandatory fields evaluation for real-time validation
  const missingFields = useMemo(() => {
    const missing: string[] = [];
    if (!formData.legalName || formData.legalName.trim().length < 2) missing.push("Legal Entity Name");
    if (!formData.country || formData.country.trim().length < 2) missing.push("Operating Country");
    if (!formData.city || formData.city.trim().length < 2) missing.push("Headquarters City");
    return missing;
  }, [formData.legalName, formData.country, formData.city]);

  // Saved canonical state validation
  const isSavedIdentityReady = useMemo(() => {
    if (!canonicalCompany) return false;
    const hasLegal = Boolean(canonicalCompany.legalName && canonicalCompany.legalName.trim().length >= 2);
    const hasCountry = Boolean(canonicalCompany.country && canonicalCompany.country.trim().length >= 2);
    const hasCity = Boolean(canonicalCompany.city && canonicalCompany.city.trim().length >= 2);
    return hasLegal && hasCountry && hasCity && missingFields.length === 0;
  }, [canonicalCompany, missingFields]);

  const handleCopy = (text: string, key: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.legalName.trim()) {
      setErrorMessage("Legal entity name is required to establish institutional identity.");
      return;
    }
    if (!formData.country.trim()) {
      setErrorMessage("Operating country is required.");
      return;
    }
    if (!formData.city.trim()) {
      setErrorMessage("Headquarters city is required.");
      return;
    }

    if (!canonicalCompany) {
      setErrorMessage("Company record could not be resolved.");
      return;
    }

    try {
      const updated: CompanyEntity = {
        ...canonicalCompany,
        legalName: formData.legalName.trim(),
        displayName: formData.brandName.trim() || formData.legalName.trim(),
        brandName: formData.brandName.trim(),
        country: formData.country.trim(),
        city: formData.city.trim(),
        shortDescription: formData.shortDescription.trim(),
        description: formData.description.trim(),
        logo: formData.logoUrl.trim(),
        logoUrl: formData.logoUrl.trim(),
        coverImage: formData.coverImage.trim(),
        heroImageUrl: formData.coverImage.trim(),
        flagshipStatement: formData.flagshipStatement.trim(),
        coverImageCaption: formData.flagshipStatement.trim(),
        email: formData.officialEmail.trim(),
        phone: formData.officialPhone.trim(),
        updatedAt: new Date().toISOString(),
      };

      saveCompany(updated);

      // Sync with twin store
      updateBusinessIdentity(updated as unknown as CompanyProfile, {
        legalName: formData.legalName.trim(),
        brandName: formData.brandName.trim(),
        shortDescription: formData.shortDescription.trim(),
        description: formData.description.trim(),
      });

      // Canonical Audit Ledger dispatch
      recordIdentityAudit(
        updated.id,
        "IDENTITY_UPDATED",
        updated.id,
        {
          previous: {
            legalName: canonicalCompany.legalName,
            brandName: (canonicalCompany as any)?.brandName || canonicalCompany.displayName,
            country: canonicalCompany.country,
            city: canonicalCompany.city,
          },
          next: {
            legalName: updated.legalName,
            brandName: updated.displayName,
            country: updated.country,
            city: updated.city,
          },
        },
        "Updated company legal identity and headquarters location"
      );

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
      if (onSaved) onSaved();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to update company identity.");
    }
  };

  return (
    <div className="space-y-6" id="module-01-identity-view">
      {/* 1. Page Header & Canonical Identity Message */}
      <div className="bg-white border border-line rounded-2xl p-6 md:p-8 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-royal font-bold uppercase tracking-wider">
              <span>MarineWorld.City</span>
              <span>•</span>
              <span>01 — Identity</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-graphite tracking-tight">
              Company Identity & Credentials
            </h1>
            <p className="text-sm font-medium text-stone">
              Establish your verified digital company identity inside MarineWorld.
            </p>
          </div>

          {/* Identity Readiness Status Badge */}
          <div className="shrink-0 flex items-center">
            {isSavedIdentityReady ? (
              <div key="status-badge-ready" className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-left">
                  <div className="text-[11px] uppercase tracking-wider font-mono">IDENTITY READY</div>
                  <div className="text-[10px] font-normal text-emerald-700">Verified core credentials in order</div>
                </div>
              </div>
            ) : (
              <div key="status-badge-progress" className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2 shadow-2xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="text-left">
                  <div className="text-[11px] uppercase tracking-wider font-mono">IDENTITY IN PROGRESS</div>
                  <div className="text-[10px] font-normal text-amber-800 font-mono">
                    Missing: {missingFields.length > 0 ? missingFields.join(", ") : "Save required to verify"}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Foundation Notice */}
        <p className="text-xs text-stone mt-3">
          These verified identity credentials establish the foundation for company verification, public company passport, sector positioning, AI grounding, and digital presence.
        </p>

        {/* 2. Compact 4-Question Purpose Area (Subtle supporting copy) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-5 border-t border-line/80">
          <div className="p-3 rounded-lg bg-canvas border border-line/50 space-y-0.5">
            <div className="text-[9px] font-mono font-bold text-royal uppercase tracking-wider">
              WHAT IS THIS?
            </div>
            <p className="text-[11px] text-stone leading-normal">
              Your company's verified institutional identity and legal credentials inside MarineWorld.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-canvas border border-line/50 space-y-0.5">
            <div className="text-[9px] font-mono font-bold text-royal uppercase tracking-wider">
              WHAT DO I PROVIDE?
            </div>
            <p className="text-[11px] text-stone leading-normal">
              Legal name, trading name, registration number, jurisdiction, headquarters and official contact.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-canvas border border-line/50 space-y-0.5">
            <div className="text-[9px] font-mono font-bold text-royal uppercase tracking-wider">
              WHAT IS ALREADY READY?
            </div>
            <p className="text-[11px] text-stone leading-normal">
              MarineWorld Business ID, Digital Identity ID, and registry node routing.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-canvas border border-line/50 space-y-0.5">
            <div className="text-[9px] font-mono font-bold text-royal uppercase tracking-wider">
              WHAT WILL THIS CHANGE?
            </div>
            <p className="text-[11px] text-stone leading-normal">
              Your public company passport, registry standing, verified identity and base grounding.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Layer A: SYSTEM-GENERATED DATA (Read-Only Authoritative) */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-mist text-graphite border border-line uppercase">
                LAYER A • SYSTEM-GENERATED DATA
              </span>
              <span className="text-xs font-bold text-graphite">
                Authoritative Registry Identifiers
              </span>
            </div>
            <p className="text-[11px] text-stone mt-0.5">
              Immutable system identifiers generated by MarineWorld Protocol registry.
            </p>
          </div>
          <span className="self-start sm:self-auto px-2 py-0.5 text-[10px] font-mono font-bold text-royal bg-royal/10 border border-royal/20 rounded flex items-center gap-1">
            <Lock className="w-3 h-3 text-royal" />
            READ-ONLY
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* MarineWorld Business ID */}
          <div className="p-4 rounded-xl bg-canvas border border-line flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono font-bold text-stone uppercase tracking-wider mb-1">
                MarineWorld Business ID
              </div>
              <div className="font-mono font-bold text-graphite text-sm truncate">
                {canonicalCompany?.businessId || "MW-BUS-N/A"}
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-line/60">
              <span className="text-[10px] text-stone font-mono">Global Entity ID</span>
              <button
                type="button"
                onClick={() => handleCopy(canonicalCompany?.businessId || "MW-BUS-N/A", "busId")}
                className="text-stone hover:text-royal p-1 rounded hover:bg-mist transition flex items-center gap-1 text-[10px] font-mono"
                title="Copy Business ID"
              >
                {copiedKey === "busId" ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copiedKey === "busId" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Digital Identity ID */}
          <div className="p-4 rounded-xl bg-canvas border border-line flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono font-bold text-stone uppercase tracking-wider mb-1">
                Digital Identity ID
              </div>
              <div className="font-mono font-bold text-royal text-sm truncate">
                {initialDigitalId.mwCompanyDigitalId}
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-line/60">
              <span className="text-[10px] text-stone font-mono">Deterministic Hash</span>
              <button
                type="button"
                onClick={() => handleCopy(initialDigitalId.mwCompanyDigitalId, "digId")}
                className="text-stone hover:text-royal p-1 rounded hover:bg-mist transition flex items-center gap-1 text-[10px] font-mono"
                title="Copy Digital ID"
              >
                {copiedKey === "digId" ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copiedKey === "digId" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Primary Registry Node */}
          <div className="p-4 rounded-xl bg-canvas border border-line flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono font-bold text-stone uppercase tracking-wider mb-1">
                Primary Registry Node
              </div>
              <div className="font-mono font-bold text-graphite text-sm truncate">
                {initialDigitalId.primaryRegistryNode}
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-line/60">
              <span className="text-[10px] text-emerald-700 font-bold font-mono">
                CODE: {initialDigitalId.primaryRegistryCode}
              </span>
              <span className="text-[10px] text-stone font-mono">Rotterdam Node</span>
            </div>
          </div>

          {/* Ecosystem Membership Affiliation */}
          {(() => {
            const enrolledOrg = getEnrolledOrganizationForCompany(companyId);
            if (!enrolledOrg) return null;
            return (
              <div className="p-4 rounded-xl bg-royal/5 border border-royal/20 flex flex-col justify-between md:col-span-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono font-bold text-royal-dark uppercase tracking-wider mb-0.5">
                      ECOSYSTEM MEMBERSHIP AFFILIATION
                    </div>
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2 mt-1">
                      <Building2 className="w-4 h-4 text-royal shrink-0" />
                      <span>{enrolledOrg.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-royal text-white uppercase">
                        VERIFIED MEMBER
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-stone uppercase block">INSPECTION STATUS</span>
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 justify-end mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>AUTHENTICATED</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-royal/20 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-stone font-sans">Issuing Country:</span>
                    <div className="text-graphite font-bold">{enrolledOrg.country || "Global"}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone font-sans">Organization Type:</span>
                    <div className="text-graphite font-bold">{enrolledOrg.organizationType || "ASSOCIATION"}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone font-sans">Member Discount:</span>
                    <div className="text-royal font-bold">{enrolledOrg.discountPercentage ? `${enrolledOrg.discountPercentage}% Benefit` : "Standard Affiliation"}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone font-sans">Enrollment Code:</span>
                    <div className="text-graphite font-bold">{enrolledOrg.enrollmentCode || "MW-MEMBER"}</div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* 4. Layer B: COMPANY-PROVIDED DATA (Institutional Registry Form) */}
      <form
        onSubmit={handleSave}
        className="bg-white border border-line rounded-2xl p-6 md:p-8 shadow-2xs space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200 uppercase">
                LAYER B • COMPANY-PROVIDED DATA
              </span>
              <h2 className="text-base font-bold text-graphite">
                Institutional Registry Credentials
              </h2>
            </div>
            <p className="text-xs text-stone">
              Establish and maintain legal credentials, jurisdiction, and official points of contact.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Saved
              </span>
            )}
            <button
              type="submit"
              id="identity-btn-save"
              className="px-5 py-2 bg-royal hover:bg-royal/90 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm min-h-[40px]"
            >
              <Save className="w-4 h-4" />
              Save Identity
            </button>
          </div>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Form Fields Section 1: Entity Name & Trading */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label
              htmlFor="input-legal-name"
              className="text-xs font-bold text-graphite flex items-center justify-between"
            >
              <span>Legal Entity Name *</span>
              <span className="text-[10px] font-mono text-stone font-normal">
                Official Registered Name
              </span>
            </label>
            <input
              type="text"
              id="input-legal-name"
              value={formData.legalName}
              onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
              placeholder="e.g. Argento Marine Global B.V."
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite font-medium transition"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="input-brand-name"
              className="text-xs font-bold text-graphite flex items-center justify-between"
            >
              <span>Trading / Brand Name</span>
              <span className="text-[10px] font-mono text-stone font-normal">
                Commercial Display Name
              </span>
            </label>
            <input
              type="text"
              id="input-brand-name"
              value={formData.brandName}
              onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
              placeholder="e.g. Argento Marine"
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite font-medium transition"
            />
          </div>
        </div>

        {/* Form Fields Section 2: Registration Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label
              htmlFor="input-reg-number"
              className="text-xs font-bold text-graphite flex items-center justify-between"
            >
              <span>Commercial Registration Number</span>
              <span className="text-[10px] font-mono text-stone font-normal">
                KvK, Companies House, EIN
              </span>
            </label>
            <input
              type="text"
              id="input-reg-number"
              value={formData.registrationNumber}
              onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
              placeholder="e.g. NL-89201144"
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite font-mono transition"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="input-reg-authority"
              className="text-xs font-bold text-graphite flex items-center justify-between"
            >
              <span>Registration Authority / Registry</span>
              <span className="text-[10px] font-mono text-stone font-normal">
                Jurisdiction Registry Body
              </span>
            </label>
            <input
              type="text"
              id="input-reg-authority"
              value={formData.registrationAuthority}
              onChange={(e) => setFormData({ ...formData, registrationAuthority: e.target.value })}
              placeholder="e.g. Chamber of Commerce (KvK) / Commercial Court"
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite transition"
            />
          </div>
        </div>

        {/* Form Fields Section 3: Country & Headquarters City */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label
              htmlFor="input-country"
              className="text-xs font-bold text-graphite flex items-center justify-between"
            >
              <span>Operating Country *</span>
              <span className="text-[10px] font-mono text-stone font-normal">
                Legal Domicile
              </span>
            </label>
            <input
              type="text"
              id="input-country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              placeholder="e.g. Netherlands"
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite transition"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="input-city"
              className="text-xs font-bold text-graphite flex items-center justify-between"
            >
              <span>Headquarters City *</span>
              <span className="text-[10px] font-mono text-stone font-normal">
                Primary Municipality
              </span>
            </label>
            <input
              type="text"
              id="input-city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="e.g. Rotterdam"
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite transition"
              required
            />
          </div>
        </div>

        {/* Form Fields Section 4: Official Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label
              htmlFor="input-email"
              className="text-xs font-bold text-graphite flex items-center justify-between"
            >
              <span>Official Contact Email</span>
              <span className="text-[10px] font-mono text-stone font-normal">
                Institutional Inquiries
              </span>
            </label>
            <input
              type="email"
              id="input-email"
              value={formData.officialEmail}
              onChange={(e) => setFormData({ ...formData, officialEmail: e.target.value })}
              placeholder="contact@enterprise.com"
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite transition"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="input-phone"
              className="text-xs font-bold text-graphite flex items-center justify-between"
            >
              <span>Official Telephony</span>
              <span className="text-[10px] font-mono text-stone font-normal">
                Direct Line / Switchboard
              </span>
            </label>
            <input
              type="tel"
              id="input-phone"
              value={formData.officialPhone}
              onChange={(e) => setFormData({ ...formData, officialPhone: e.target.value })}
              placeholder="+31 10 555 0190"
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite transition"
            />
          </div>
        </div>

        {/* Executive Short Description */}
        <div className="space-y-1.5">
          <label
            htmlFor="input-short-desc"
            className="text-xs font-bold text-graphite flex items-center justify-between"
          >
            <span>Executive Short Description</span>
            <span className="text-[10px] font-mono text-stone font-normal">
              One-liner for registry passport & directory indexes
            </span>
          </label>
          <input
            type="text"
            id="input-short-desc"
            value={formData.shortDescription}
            onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
            placeholder="e.g. Autonomous subsea survey systems, propulsion technology, and robotic vessel engineering."
            className="w-full h-11 px-3.5 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite transition"
          />
        </div>

        {/* Corporate Description */}
        <div className="space-y-1.5">
          <label
            htmlFor="input-full-desc"
            className="text-xs font-bold text-graphite flex items-center justify-between"
          >
            <span>Corporate Description</span>
            <span className="text-[10px] font-mono text-stone font-normal">
              Full background for AI grounding & official presence
            </span>
          </label>
          <textarea
            id="input-full-desc"
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Comprehensive description of your enterprise capabilities, fleet technologies, compliance accreditations, and market leadership..."
            className="w-full p-3.5 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite transition leading-relaxed"
          />
        </div>

        {/* BRAND MARK / LOGO EDITOR */}
        <div className="p-5 rounded-xl bg-canvas border border-line space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-graphite flex items-center gap-1.5">
                <span>COMPANY BRAND MARK / LOGO</span>
                <span className="text-[10px] font-mono text-royal font-bold uppercase bg-royal/10 px-2 py-0.5 rounded">
                  PASSPORT LOGO
                </span>
              </div>
              <p className="text-[11px] text-stone mt-0.5">
                Rendered across public company pages, executive headers, AI advisor cards, and sector city directories.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white border-2 border-line text-royal flex items-center justify-center font-bold text-xl shrink-0 shadow-2xs overflow-hidden relative group">
              {formData.logoUrl && (formData.logoUrl.startsWith("http") || formData.logoUrl.startsWith("data:")) ? (
                <img
                  src={formData.logoUrl}
                  alt={formData.brandName || "Logo"}
                  className="w-full h-full object-contain p-1.5"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="font-mono text-xl">
                  {formData.logoUrl || (formData.brandName || formData.legalName || "MW").slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 space-y-2.5 w-full">
              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor="logo-desktop-input"
                  className="px-4 py-2 bg-royal hover:bg-royal text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Logo from Desktop</span>
                  <input
                    type="file"
                    id="logo-desktop-input"
                    accept="image/*"
                    onChange={handleLogoFileUpload}
                    className="hidden"
                  />
                </label>

                {formData.logoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, logoUrl: "" }));
                      setLogoUploadMsg(null);
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Logo</span>
                  </button>
                )}
              </div>

              {logoUploadMsg && (
                <div className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{logoUploadMsg}</span>
                </div>
              )}

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-stone uppercase block">Or specify image URL / 2-char monogram</span>
                <input
                  type="text"
                  id="input-logo-url"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/... or monogram (e.g. AM)"
                  className="w-full h-10 px-3.5 rounded-lg border border-line bg-white focus:border-royal focus:outline-none text-xs text-graphite font-mono transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* FLAGSHIP COMPANY PRESENCE PHOTO EDITOR */}
        <div className="p-5 rounded-xl bg-canvas border border-line space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-graphite flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-royal" />
                <span>FLAGSHIP COMPANY PRESENCE PHOTO (COVER / FACILITY IMAGE)</span>
              </div>
              <p className="text-[11px] text-stone mt-0.5">
                Featured at the top of your public Company Page in the <strong className="text-graphite">FLAGSHIP COMPANY PRESENCE</strong> banner (showing physical yards, vessels, or engineering facilities).
              </p>
            </div>
            <span className="text-[10px] font-mono text-emerald-700 font-bold uppercase bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md hidden sm:inline-block">
              PUBLIC BANNER MEDIA
            </span>
          </div>

          {/* Large Banner Preview */}
          <div className="relative w-full h-44 sm:h-52 rounded-xl overflow-hidden border border-line bg-slate-900 shadow-2xs group">
            {formData.coverImage ? (
              <img
                src={formData.coverImage}
                alt="Flagship Company Presence Banner"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
                <ImageIcon className="w-10 h-10 text-slate-600 mb-2" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">No Flagship Facility Photo Uploaded</span>
                <span className="text-[11px] text-slate-500 mt-0.5">Upload a photo below to feature your real-world yard, vessel, or office facility.</span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent pointer-events-none" />
            <div className="absolute bottom-3 left-4 right-4 text-white text-xs font-sans pointer-events-none space-y-1">
              <div className="font-mono text-[9px] uppercase tracking-widest text-emerald-400 font-bold flex items-center justify-between">
                <span>PREVIEW: REAL-WORLD OPERATING PRESENCE</span>
                <span className="text-[9px] bg-slate-950/70 border border-white/20 px-1.5 py-0.5 rounded text-white/90 font-mono">16:9 Banner</span>
              </div>
              <p className="text-xs sm:text-sm text-white/95 font-light line-clamp-2 leading-relaxed">
                {formData.flagshipStatement || "Physical operational facilities, marine yards, and engineering logistics infrastructure maintained under verified international standards."}
              </p>
            </div>
          </div>

          {/* Banner Overlay Statement Editor */}
          <div className="p-3.5 bg-slate-900/5 rounded-xl border border-line space-y-2">
            <label htmlFor="input-flagship-statement" className="text-xs font-bold text-graphite flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>BANNER OVERLAY STATEMENT</span>
              </span>
              <span className="text-[10px] font-mono text-royal font-bold">LIVE OVERLAY TEXT</span>
            </label>
            <textarea
              id="input-flagship-statement"
              rows={2}
              value={formData.flagshipStatement}
              onChange={(e) => setFormData({ ...formData, flagshipStatement: e.target.value })}
              placeholder="Physical operational facilities, marine yards, and engineering logistics infrastructure maintained under verified international standards."
              className="w-full p-3 rounded-lg border border-line bg-white focus:border-royal focus:outline-none text-xs text-graphite transition leading-relaxed font-sans"
            />
            <p className="text-[10px] text-stone">
              This statement renders live on top of your Flagship Company Presence banner across public institutional pages.
            </p>
          </div>

          {/* Upload Controls */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <label
                htmlFor="cover-desktop-input"
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition shadow-2xs"
              >
                <UploadCloud className="w-4 h-4 text-emerald-400" />
                <span>Upload Facility Photo from Desktop</span>
                <input
                  type="file"
                  id="cover-desktop-input"
                  accept="image/*"
                  onChange={handleCoverFileUpload}
                  className="hidden"
                />
              </label>

              {formData.coverImage && (
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, coverImage: "" }));
                    setCoverUploadMsg(null);
                  }}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Photo</span>
                </button>
              )}
            </div>

            {coverUploadMsg && (
              <div className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{coverUploadMsg}</span>
              </div>
            )}

            {/* URL Input */}
            <div className="space-y-1">
              <label htmlFor="input-cover-url" className="text-[10px] font-mono text-stone uppercase block">
                Or specify image URL directly
              </label>
              <input
                type="text"
                id="input-cover-url"
                value={formData.coverImage}
                onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full h-10 px-3.5 rounded-lg border border-line bg-white focus:border-royal focus:outline-none text-xs text-graphite font-mono transition"
              />
            </div>

            {/* Sample Facility Photo Presets */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-mono text-stone uppercase block">
                Or select a curated maritime facility preset photo:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  {
                    label: "Drydock Shipyard",
                    url: "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=1200&q=80",
                  },
                  {
                    label: "Port Logistics Terminal",
                    url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80",
                  },
                  {
                    label: "Autonomous Fleet Base",
                    url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
                  },
                  {
                    label: "Subsea Offshore Yard",
                    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
                  },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, coverImage: preset.url }));
                      setCoverUploadMsg(`Selected preset: ${preset.label}`);
                    }}
                    className={`p-1.5 rounded-lg border text-left flex items-center gap-2 transition ${
                      formData.coverImage === preset.url
                        ? "border-royal bg-royal/5 ring-1 ring-royal"
                        : "border-line bg-white hover:border-slate-300"
                    }`}
                  >
                    <img src={preset.url} alt={preset.label} className="w-10 h-7 rounded object-cover shrink-0" />
                    <span className="text-[10px] font-medium text-graphite truncate">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Save Action Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-line">
          <div className="text-xs text-stone">
            {isSavedIdentityReady ? (
              <span key="identity-ready-msg" className="text-emerald-700 font-medium flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>All required institutional identity fields are complete &amp; saved.</span>
              </span>
            ) : (
              <span key="identity-missing-msg" className="text-amber-800 font-medium flex items-center gap-1 font-mono">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Missing: {missingFields.length > 0 ? missingFields.join(", ") : "Save to apply changes"}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span key="save-success-tag" className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Saved</span>
              </span>
            )}
            <button
              type="submit"
              id="identity-btn-save-bottom"
              className="px-6 py-2 bg-royal hover:bg-royal/90 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm min-h-[40px]"
            >
              <Save className="w-4 h-4" />
              <span>Save Identity</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
