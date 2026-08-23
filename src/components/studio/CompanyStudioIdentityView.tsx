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
} from "lucide-react";
import type { CompanyEntity, CompanyProfile } from "@/lib/types";
import { getCompanyById, saveCompany } from "@/lib/services/companyService";
import { updateBusinessIdentity } from "@/lib/businessTwinStore";
import { resolveMarineWorldCompanyDigitalId } from "@/lib/services/companyIdentityService";
import { marineSector } from "@/lib/sectors/marine";
import { getCompanyBySlug } from "@/lib/registry";
import { recordIdentityAudit } from "@/lib/services/auditService";

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

  // Load canonical company record
  const canonicalCompany =
    getCompanyById(companyId) ||
    (getCompanyBySlug(marineSector, companyId) as unknown as CompanyEntity);

  const initialDigitalId = useMemo(() => {
    return resolveMarineWorldCompanyDigitalId({
      companyIdOrSlug: canonicalCompany?.id || companyId,
      mwCompanyDigitalId: (canonicalCompany as any)?.mwCompanyDigitalId,
      businessId: canonicalCompany?.businessId,
      companyId6Digit: (canonicalCompany as any)?.companyId6Digit,
      primaryRegistryCode: (canonicalCompany as any)?.primaryRegistryCode,
      primarySectorCityId: canonicalCompany?.sectorCityIds?.[0],
    });
  }, [canonicalCompany, companyId]);

  const [formData, setFormData] = useState({
    legalName: canonicalCompany?.legalName || canonicalCompany?.displayName || "",
    brandName: canonicalCompany?.brandName || canonicalCompany?.displayName || "",
    registrationNumber: (canonicalCompany as any)?.registrationNumber || "NL-89201144",
    registrationAuthority: (canonicalCompany as any)?.registrationAuthority || "Chamber of Commerce (KvK)",
    country: canonicalCompany?.country || "Netherlands",
    city: canonicalCompany?.city || "Rotterdam",
    officialEmail: canonicalCompany?.email || `contact@${canonicalCompany?.slug || companyId}.com`,
    officialPhone: canonicalCompany?.phone || "+31 10 555 0190",
    shortDescription: canonicalCompany?.shortDescription || "",
    description: canonicalCompany?.description || "",
    logoUrl: canonicalCompany?.logo || "",
  });

  useEffect(() => {
    const comp =
      getCompanyById(companyId) ||
      (getCompanyBySlug(marineSector, companyId) as unknown as CompanyEntity);
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
        logoUrl: comp.logo || "",
      });
    }
  }, [companyId]);

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
              <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-left">
                  <div className="text-[11px] uppercase tracking-wider font-mono">IDENTITY READY</div>
                  <div className="text-[10px] font-normal text-emerald-700">Verified core credentials in order</div>
                </div>
              </div>
            ) : (
              <div className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2 shadow-2xs">
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

        {/* Brand Mark / Initials */}
        <div className="p-4 rounded-xl bg-canvas border border-line space-y-3">
          <div className="text-xs font-bold text-graphite flex items-center justify-between">
            <span>Company Brand Mark / Initials</span>
            <span className="text-[10px] font-mono text-stone font-normal">
              Vector Monogram or Image URL
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-royal/10 border border-royal/20 text-royal flex items-center justify-center font-bold text-lg shrink-0">
              {formData.logoUrl && formData.logoUrl.startsWith("http") ? (
                <img
                  src={formData.logoUrl}
                  alt={formData.brandName || "Logo"}
                  className="w-full h-full rounded-2xl object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                formData.logoUrl ||
                (formData.brandName || formData.legalName || "MW")
                  .slice(0, 2)
                  .toUpperCase()
              )}
            </div>

            <div className="flex-1 space-y-1">
              <input
                type="text"
                id="input-logo-url"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                placeholder="Logo URL or 2-character monogram (e.g. AM)"
                className="w-full h-10 px-3.5 rounded-lg border border-line bg-white focus:border-royal focus:outline-none text-xs text-graphite font-mono transition"
              />
              <p className="text-[10px] text-stone">
                Rendered across the public institutional passport, offering AI advisor headers, and Sector City directories.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Save Action Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-line">
          <div className="text-xs text-stone">
            {isSavedIdentityReady ? (
              <span className="text-emerald-700 font-medium flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                All required institutional identity fields are complete & saved.
              </span>
            ) : (
              <span className="text-amber-800 font-medium flex items-center gap-1 font-mono">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                Missing: {missingFields.length > 0 ? missingFields.join(", ") : "Save to apply changes"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Saved
              </span>
            )}
            <button
              type="submit"
              id="identity-btn-save-bottom"
              className="px-6 py-2 bg-royal hover:bg-royal/90 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm min-h-[40px]"
            >
              <Save className="w-4 h-4" />
              Save Identity
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
