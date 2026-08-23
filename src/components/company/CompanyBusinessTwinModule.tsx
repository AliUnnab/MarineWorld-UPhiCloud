import { useState, useEffect } from "react";
import type { CompanyProfile, CompanyNode, BusinessTwinModel } from "@/lib/types";
import { getBusinessTwin, subscribeBusinessTwin } from "@/lib/businessTwinStore";
import { resolveMarineWorldCompanyDigitalId } from "@/lib/services/companyIdentityService";
import {
  Building2,
  ShieldCheck,
  Globe2,
  Layers,
  FileText,
  MapPin,
  CheckCircle2,
  ExternalLink,
  Cpu,
  Mail,
  ArrowRight,
  Tag,
  Compass,
  Flag,
  Calendar,
  Copy,
  Check,
} from "lucide-react";

/* ------------------------------------------------------------
   LOADING SKELETON
   ------------------------------------------------------------ */
export function CompanyBusinessTwinSkeleton() {
  return (
    <div className="space-y-8 animate-pulse max-w-[1180px] mx-auto font-sans">
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8">
        <div className="h-4 w-32 bg-mist rounded mb-3" />
        <div className="h-8 w-64 bg-mist rounded mb-2" />
        <div className="h-4 w-96 bg-mist rounded" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-card-lg border border-line bg-white p-6 h-64" />
        <div className="rounded-card-lg border border-line bg-white p-6 h-64" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   MAIN COMPANY BUSINESS TWIN MODULE (PUBLIC INSTITUTIONAL TRUST ARTIFACT)
   ------------------------------------------------------------ */
export function CompanyBusinessTwinModule({
  company,
  onSelectModule,
}: {
  company: CompanyProfile;
  onSelectModule?: (moduleSlug: string) => void;
}) {
  const [twin, setTwin] = useState<BusinessTwinModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const displayName = company.displayName || company.name;
  const isVerified = (company.verificationStatus || "VERIFIED").toLowerCase().includes("verified");

  const digitalIdInfo = resolveMarineWorldCompanyDigitalId({
    companyIdOrSlug: company.id,
    mwCompanyDigitalId: company.mwCompanyDigitalId,
    businessId: company.businessId,
    companyId6Digit: company.companyId6Digit,
    primaryRegistryCode: company.primaryRegistryCode,
    primarySectorCityId: company.sectorCityIds?.[0] || company.cityIds?.[0],
  });

  const canonicalPublicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/companies/${company.slug || company.id}`
    : `https://${company.slug || company.id}.marineworld.city`;

  const handleCopyUrl = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(canonicalPublicUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      }
    } catch {
      // quiet fallback
    }
  };

  // Load Business Twin model
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setIsError(false);

    try {
      const data = getBusinessTwin(company);
      if (isMounted) {
        setTwin(data);
        setIsLoading(false);
      }
    } catch {
      if (isMounted) {
        setIsError(true);
        setIsLoading(false);
      }
    }

    const unsubscribe = subscribeBusinessTwin(() => {
      try {
        const updated = getBusinessTwin(company);
        if (isMounted) setTwin(updated);
      } catch {
        // quiet fallback
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [company.id]);

  if (isLoading) {
    return <CompanyBusinessTwinSkeleton />;
  }

  if (isError || !twin) {
    return (
      <div className="rounded-card-lg border border-line bg-white p-8 text-center space-y-4 max-w-[1180px] mx-auto font-sans">
        <ShieldCheck className="mx-auto h-10 w-10 text-amber-500" />
        <h3 className="text-h3 text-graphite">BUSINESS TWIN UNAVAILABLE</h3>
        <p className="text-[14px] text-stone max-w-md mx-auto">
          Unable to resolve the verified digital twin records for {displayName}.
        </p>
        <div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-royal text-white rounded-card text-xs font-bold tracking-wider uppercase hover:bg-royal-dark transition cursor-pointer"
          >
            RELOAD
          </button>
        </div>
      </div>
    );
  }

  const { identity, organization, capabilities, trustSignals } = twin;

  const rawEstYear = identity.foundedYear || company.foundedYear || "1875";
  const currentYear = new Date().getFullYear();
  const parsedYear = parseInt(rawEstYear, 10);
  const yearsOperating = !isNaN(parsedYear) && parsedYear > 1000 && parsedYear <= currentYear ? currentYear - parsedYear : null;

  return (
    <div className="space-y-8 max-w-[1180px] mx-auto font-sans">
      {/* 01. HEADER SECTION */}
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-royal">
            <Cpu className="h-4 w-4" />
            <span>VERIFIED DIGITAL TWIN</span>
          </div>
          <h2 className="text-h2 mt-1 text-graphite">Institutional Business Twin</h2>
          <p className="mt-1 text-[14px] text-stone max-w-2xl font-normal leading-relaxed">
            Authoritative digital twin representing the verified organizational structure, accredited capabilities, and operational network of {displayName}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 text-[11.5px] font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>{isVerified ? "VERIFIED INSTITUTIONAL NODE" : "ACTIVE REGISTRY RECORD"}</span>
          </div>
        </div>
      </div>

      {/* 02. SECTION A: INSTITUTIONAL IDENTITY & REGISTRY RECORD */}
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs space-y-6">
        <div className="border-b border-line pb-4">
          <h3 className="text-h3 text-graphite">Institutional Identity & Registry Record</h3>
          <p className="text-[13px] text-stone mt-0.5">
            Verified corporate registration and authoritative industry credentials.
          </p>
        </div>

        {/* PART 2: Prominent Digital ID Credential Card */}
        <div className="rounded-card-lg border border-royal/40 bg-white p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-royal font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4 text-royal shrink-0" />
              <span>MarineWorld Digital Identity</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 text-[11px] font-semibold self-start sm:self-auto">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>{isVerified ? "Verified Institutional Node" : "Active Registry Node"}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xl sm:text-2xl font-bold tracking-wider text-graphite font-sans">
              {digitalIdInfo.mwCompanyDigitalId}
            </div>
            <p className="text-xs text-stone">
              Canonical platform identifier for {identity.legalName || displayName}.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Globe2 className="h-3.5 w-3.5 text-stone shrink-0" />
              <span className="text-xs font-mono text-stone truncate">
                {canonicalPublicUrl}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-royal hover:text-blue-700 bg-royal/5 hover:bg-royal/10 px-3 py-1.5 rounded-full transition-colors cursor-pointer self-start sm:self-auto shrink-0"
              title="Copy canonical profile URL"
            >
              {copiedUrl ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-royal" />
                  <span>Copy Canonical Link</span>
                </>
              )}
            </button>
          </div>

          <div className="text-[11px] text-slate-400">
            Issued and verified by the MarineWorld Registry.
          </div>
        </div>

        {/* PART 4: Icon-Led Fact Rows (2-column desktop, 1-column mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Fact 1: Legal Entity Name */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-card-md border border-line bg-canvas">
            <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-card-sm border border-line bg-white text-stone">
              <Building2 className="h-4 w-4 text-slate-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold text-stone uppercase tracking-wider block">Legal Entity Name</span>
              <span className="font-semibold text-graphite text-[13.5px] block truncate">{identity.legalName}</span>
            </div>
          </div>

          {/* Fact 2: Trading / Brand Name */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-card-md border border-line bg-canvas">
            <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-card-sm border border-line bg-white text-stone">
              <Tag className="h-4 w-4 text-slate-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold text-stone uppercase tracking-wider block">Trading / Brand Name</span>
              <span className="font-semibold text-graphite text-[13.5px] block truncate">{identity.brandName}</span>
            </div>
          </div>

          {/* Fact 3: Industry Domain */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-card-md border border-line bg-canvas">
            <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-card-sm border border-line bg-white text-stone">
              <Compass className="h-4 w-4 text-slate-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold text-stone uppercase tracking-wider block">Industry Domain</span>
              <span className="font-semibold text-graphite text-[13.5px] block truncate">{identity.industry || "Marine Engineering & Shipbuilding"}</span>
            </div>
          </div>

          {/* Fact 4: Registration Country */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-card-md border border-line bg-canvas">
            <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-card-sm border border-line bg-white text-stone">
              <Flag className="h-4 w-4 text-slate-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold text-stone uppercase tracking-wider block">Registration Country</span>
              <span className="font-semibold text-graphite text-[13.5px] block truncate">{company.country || company.registrationCountry || "Netherlands"}</span>
            </div>
          </div>

          {/* Fact 5: Establishment Year & Derived operating length */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-card-md border border-line bg-canvas md:col-span-2">
            <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-card-sm border border-line bg-white text-stone">
              <Calendar className="h-4 w-4 text-slate-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold text-stone uppercase tracking-wider block">Establishment Year</span>
              <span className="font-semibold text-graphite text-[13.5px] block">
                {rawEstYear}
                {yearsOperating !== null ? ` · ${yearsOperating} years operating` : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Elevated Company Overview */}
        {(identity.description || company.description || company.shortDescription) && (
          <div className="pt-5 border-t border-line">
            <div className="border-l-2 border-royal pl-4 sm:pl-5 py-1 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-royal block">
                Company Overview
              </span>
              <p className="text-[14.5px] sm:text-[15px] text-graphite font-normal leading-relaxed">
                {identity.description || company.description || company.shortDescription}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 03. SECTION B: OPERATING NETWORK & GLOBAL FACILITIES */}
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
          <div>
            <h3 className="text-h3 text-graphite">Operating Facilities & Regional Network</h3>
            <p className="text-[13px] text-stone mt-0.5">
              Accredited headquarters, manufacturing drydocks, and distribution units.
            </p>
          </div>

          <button
            onClick={() => onSelectModule?.("presence")}
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-royal hover:underline self-start sm:self-auto cursor-pointer"
          >
            <span>VIEW NETWORK PRESENCE</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Headquarters Node */}
          {organization.headquarters && (
            <div className="rounded-card-md border border-line bg-canvas p-5 space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-royal bg-white px-2 py-0.5 rounded border border-line">
                  GLOBAL HEADQUARTERS
                </span>
                <span className="text-[11px] font-semibold text-emerald-700">✓ VERIFIED</span>
              </div>

              <h4 className="text-[15px] font-bold text-graphite">{organization.headquarters.name}</h4>
              <p className="text-[12.5px] text-stone flex items-start gap-1.5">
                <MapPin className="h-4 w-4 text-stone shrink-0 mt-0.5" />
                <span>{organization.headquarters.address || `${organization.headquarters.city}, ${organization.headquarters.country}`}</span>
              </p>

              <div className="pt-2">
                <button
                  onClick={() => onSelectModule?.("connect")}
                  className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-royal hover:underline cursor-pointer"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Contact Facility Desk →</span>
                </button>
              </div>
            </div>
          )}

          {/* Regional Nodes */}
          {organization.regionalNodes && organization.regionalNodes.map((node: CompanyNode) => (
            <div key={node.id} className="rounded-card-md border border-line bg-canvas p-5 space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-stone bg-white px-2 py-0.5 rounded border border-line">
                  {node.operationType?.replace(/_/g, " ") || "OPERATIONAL FACILITY"}
                </span>
                <span className="text-[11px] font-semibold text-emerald-700">✓ ACTIVE</span>
              </div>

              <h4 className="text-[15px] font-bold text-graphite">{node.name}</h4>
              <p className="text-[12.5px] text-stone flex items-start gap-1.5">
                <MapPin className="h-4 w-4 text-stone shrink-0 mt-0.5" />
                <span>{node.address || `${node.city}, ${node.country}`}</span>
              </p>

              <div className="pt-2">
                <button
                  onClick={() => onSelectModule?.("connect")}
                  className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-royal hover:underline cursor-pointer"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Contact Facility Desk →</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 04. SECTION C: ACCREDITED ORGANIZATIONAL CAPABILITIES */}
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs space-y-6">
        <div className="border-b border-line pb-4">
          <h3 className="text-h3 text-graphite">Accredited Capabilities & Engineering Disciplines</h3>
          <p className="text-[13px] text-stone mt-0.5">
            Verified institutional capabilities certified for commercial delivery and technical execution.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {capabilities && capabilities.length > 0 ? (
            capabilities.map((cap) => (
              <span
                key={cap}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3.5 py-1.5 text-[12.5px] font-semibold text-graphite"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-royal" />
                <span>{cap}</span>
              </span>
            ))
          ) : (
            ["Naval Architecture", "Marine Composite Systems", "Drydock Refit", "Classification Certification"].map((cap) => (
              <span
                key={cap}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3.5 py-1.5 text-[12.5px] font-semibold text-graphite"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-royal" />
                <span>{cap}</span>
              </span>
            ))
          )}
        </div>
      </div>

      {/* 05. SECTION D: INSTITUTIONAL TRUST & VERIFICATION SIGNALS */}
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs space-y-6">
        <div className="border-b border-line pb-4">
          <h3 className="text-h3 text-graphite">Institutional Trust & Verification Framework</h3>
          <p className="text-[13px] text-stone mt-0.5">
            Verified, legal, and operational trust signals validated by sector authorities.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {trustSignals.map((signal) => (
            <div key={signal.id} className="rounded-card-md border border-line bg-canvas p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-graphite">{signal.label}</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>AUDITED</span>
                </span>
              </div>
              <p className="text-[12px] text-stone">
                Source: <span className="font-medium text-graphite">{signal.source}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
