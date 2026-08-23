import { useState, useMemo, useEffect } from "react";
import type { CompanyProfile, SectorCity, IndustryDomainEntity, SectorConfig, ServiceEntity } from "@/lib/types";
import { getCompanyServices, getCompanyServiceBySlug, getServiceBySlug } from "@/lib/registry";
import { injectJsonLd, buildServiceSchema } from "@/lib/services/schemaOrgService";
import { Icon } from "@/components/digione/icons";
import { DigiBadge, DigiButton } from "@/components/digione/primitives";
import { ServiceAIAdvisor } from "./ServiceAIAdvisor";
import { SaveEntityButton } from "@/components/foundation/SaveEntityButton";
import { AddToCollectionButton } from "@/components/foundation/AddToCollectionButton";
import { Copy, Check, Share2, ExternalLink } from "lucide-react";
import { ShareProtocolModal } from "./ShareProtocolModal";

/* ------------------------------------------------------------
   SERVICE VISUAL IMAGE COMPONENT WITH GALLERY SUPPORT
   ------------------------------------------------------------ */
export function ServiceVisualImage({
  service,
  activeImageSrc,
  className = "w-full h-full object-cover",
  containerClassName = "aspect-video w-full overflow-hidden rounded-card-md border border-line bg-canvas",
}: {
  service: ServiceEntity;
  activeImageSrc?: string;
  className?: string;
  containerClassName?: string;
}) {
  const [imageError, setImageError] = useState(false);

  const imageSrc = useMemo(() => {
    if (activeImageSrc) return activeImageSrc;
    if (service.primaryImage) return service.primaryImage;
    if (service.images && service.images.length > 0 && service.images[0]) return service.images[0];
    if (service.gallery && service.gallery.length > 0 && service.gallery[0]) return service.gallery[0];
    return undefined;
  }, [service, activeImageSrc]);

  useEffect(() => {
    setImageError(false);
  }, [imageSrc]);

  if (!imageSrc || imageError) {
    return (
      <div className={`${containerClassName} flex flex-col items-center justify-center p-6 text-center`}>
        <div className="h-12 w-12 rounded-full bg-white border border-line flex items-center justify-center text-royal mb-2 shadow-xs">
          <Icon name="briefcase" className="h-6 w-6" />
        </div>
        <span className="font-mono text-[11px] font-bold text-graphite uppercase tracking-wide truncate max-w-[200px]">
          {service.name}
        </span>
        <span className="font-mono text-[9.5px] text-mute mt-0.5">
          {imageError ? "VISUAL FEED UNAVAILABLE" : "SPECIALIZED SERVICE GRAPHIC"}
        </span>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <img
        src={imageSrc}
        alt={service.name}
        onError={() => setImageError(true)}
        className={`${className} group-hover:scale-105 transition-transform duration-300`}
      />
    </div>
  );
}

/* ------------------------------------------------------------
   LOADING SKELETON
   ------------------------------------------------------------ */
export function CompanyServicesSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8">
        <div className="h-4 w-28 bg-mist rounded mb-3" />
        <div className="h-8 w-48 bg-mist rounded mb-2" />
        <div className="h-4 w-96 bg-mist rounded" />
      </div>

      {/* Filter Bar Skeleton */}
      <div className="rounded-card-md border border-line bg-white p-4 h-14" />

      {/* Grid Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-card-lg border border-line bg-white p-6 h-80" />
        <div className="rounded-card-lg border border-line bg-white p-6 h-80" />
        <div className="rounded-card-lg border border-line bg-white p-6 h-80" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   MAIN COMPANY SERVICES MODULE
   ------------------------------------------------------------ */
export function CompanyServicesModule({
  company,
  primaryCity,
  parentDomain,
  config,
  selectedServiceSlug,
  onSelectService,
  isLoading = false,
  isError = false,
  onRetry,
}: {
  company: CompanyProfile;
  primaryCity?: SectorCity;
  parentDomain?: IndustryDomainEntity;
  config?: SectorConfig;
  selectedServiceSlug?: string;
  onSelectService?: (serviceSlug: string | undefined) => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedAvailability, setSelectedAvailability] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"featured" | "name" | "type">("featured");
  const [retryState, setRetryState] = useState(false);
  const [internalServiceSlug, setInternalServiceSlug] = useState<string | undefined>(selectedServiceSlug);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copiedDetailUrl, setCopiedDetailUrl] = useState(false);
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);
  const [sharingService, setSharingService] = useState<ServiceEntity | null>(null);

  // Sync internal service slug if controlled from parent
  const activeServiceSlug = selectedServiceSlug !== undefined ? selectedServiceSlug : internalServiceSlug;

  const handleSetServiceSlug = (slug: string | undefined) => {
    setInternalServiceSlug(slug);
    setActiveImageIndex(0);
    if (onSelectService) {
      onSelectService(slug);
    }
  };

  const services = useMemo(() => getCompanyServices(company), [company]);

  // Resolve raw service by slug across company or global registry
  const rawService = useMemo(() => {
    if (!activeServiceSlug) return undefined;
    const inCompany = getCompanyServiceBySlug(company, activeServiceSlug);
    if (inCompany) return inCompany;
    return getServiceBySlug(activeServiceSlug);
  }, [company, activeServiceSlug]);

  const selectedService = useMemo(() => {
    if (rawService && company?.id && (rawService.companyId === company.id || !rawService.companyId)) {
      return rawService;
    }
    return undefined;
  }, [rawService, company?.id]);

  // Inject Schema.org JSON-LD when service detail is active
  useEffect(() => {
    if (selectedService) {
      injectJsonLd(buildServiceSchema(selectedService as any, company as any));
    }
  }, [selectedService, company]);

  // Extract unique service types and categories for filters
  const serviceTypes = useMemo(() => {
    const types = new Set<string>();
    services.forEach((s) => {
      if (s.serviceType) types.add(s.serviceType);
    });
    return Array.from(types);
  }, [services]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    services.forEach((s) => {
      if (s.category) cats.add(s.category);
    });
    return Array.from(cats);
  }, [services]);

  // Filter & sort service listing
  const filteredServices = useMemo(() => {
    return services
      .filter((s) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = s.name ? s.name.toLowerCase().includes(q) : false;
          const matchesType = s.serviceType ? s.serviceType.toLowerCase().includes(q) : false;
          const matchesCat = s.category ? s.category.toLowerCase().includes(q) : false;
          const matchesDesc = s.shortDescription ? s.shortDescription.toLowerCase().includes(q) : false;
          const matchesCaps = s.capabilities
            ? s.capabilities.some((c) => c && c.toLowerCase().includes(q))
            : false;
          if (!matchesName && !matchesType && !matchesCat && !matchesDesc && !matchesCaps) return false;
        }

        if (selectedType !== "ALL" && s.serviceType !== selectedType) {
          return false;
        }

        if (selectedCategory !== "ALL" && s.category !== selectedCategory) {
          return false;
        }

        if (selectedAvailability !== "ALL" && (s.availability || "AVAILABLE") !== selectedAvailability) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === "type") {
          return (a.serviceType || "").localeCompare(b.serviceType || "");
        }
        return 0;
      });
  }, [services, searchQuery, selectedType, selectedCategory, selectedAvailability, sortBy]);

  if (isLoading) {
    return <CompanyServicesSkeleton />;
  }

  if (isError || retryState) {
    return (
      <div className="rounded-card-lg border border-line bg-white p-8 md:p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-800 mb-4 border border-amber-200">
          <Icon name="briefcase" className="h-6 w-6" />
        </div>
        <h3 className="text-h3 text-graphite uppercase font-mono">SERVICES COULD NOT BE LOADED</h3>
        <p className="mt-2 text-[14px] text-stone max-w-md mx-auto">
          Unable to resolve service specifications and capabilities for {company.name}.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <DigiButton
            onClick={() => {
              setRetryState(false);
              if (onRetry) onRetry();
            }}
            icon="exchange"
          >
            TRY AGAIN
          </DigiButton>
        </div>
      </div>
    );
  }

  // Controlled State: SERVICE_NOT_FOUND (Slug provided, but no service exists in registry)
  if (activeServiceSlug && !rawService) {
    return (
      <div className="rounded-card-lg border border-line bg-white p-8 md:p-12 text-center shadow-xs animate-page-enter">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-800 mb-4 border border-amber-200">
          <Icon name="briefcase" className="h-6 w-6 text-amber-700" />
        </div>
        <span className="font-mono text-[10.5px] font-bold text-amber-800 uppercase tracking-widest block mb-1">
          SERVICE_NOT_FOUND
        </span>
        <h3 className="text-h3 text-graphite font-mono uppercase">SERVICE RECORD NOT FOUND</h3>
        <p className="mt-2 text-[14px] text-stone max-w-md mx-auto">
          No service matching reference <code className="bg-canvas px-1.5 py-0.5 rounded font-mono font-bold text-graphite">{activeServiceSlug}</code> was found in the service catalog.
        </p>
        <div className="mt-6 flex justify-center">
          <DigiButton onClick={() => handleSetServiceSlug(undefined)} icon="arrowRight">
            RETURN TO SERVICES CATALOG
          </DigiButton>
        </div>
      </div>
    );
  }

  // Controlled State: SERVICE_INVALID_COMPANY_CONTEXT (Service exists, but belongs to a different company)
  if (activeServiceSlug && rawService && company?.id && rawService.companyId && rawService.companyId !== company.id) {
    return (
      <div className="rounded-card-lg border border-line bg-white p-8 md:p-12 text-center shadow-xs animate-page-enter">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-700 mb-4 border border-red-200">
          <Icon name="shield" className="h-6 w-6 text-red-600" />
        </div>
        <span className="font-mono text-[10.5px] font-bold text-red-700 uppercase tracking-widest block mb-1">
          SERVICE_INVALID_COMPANY_CONTEXT
        </span>
        <h3 className="text-h3 text-graphite font-mono uppercase">SERVICE / COMPANY MISMATCH DENIED</h3>
        <p className="mt-2 text-[14px] text-stone max-w-md mx-auto">
          Service <strong className="text-graphite">{rawService.name}</strong> is registered under a different company and cannot be viewed in {company?.name || "this company"}'s context. Cross-tenant service access is restricted.
        </p>
        <div className="mt-6 flex justify-center">
          <DigiButton onClick={() => handleSetServiceSlug(undefined)} icon="arrowRight">
            RETURN TO {(company?.name || "COMPANY").toUpperCase()} CATALOG
          </DigiButton>
        </div>
      </div>
    );
  }

  const companySlug = company.slug ?? company.id;

  /* ------------------------------------------------------------
     VIEW A: SINGLE SERVICE DETAIL VIEW
     ------------------------------------------------------------ */
  if (selectedService) {
    const availability = selectedService.availability || "AVAILABLE";

    // Collect canonical gallery images
    const galleryImages: string[] = [];
    if (selectedService.primaryImage) galleryImages.push(selectedService.primaryImage);
    if (selectedService.images) {
      selectedService.images.forEach((img) => {
        if (img && !galleryImages.includes(img)) galleryImages.push(img);
      });
    }
    if (selectedService.gallery) {
      selectedService.gallery.forEach((img) => {
        if (img && !galleryImages.includes(img)) galleryImages.push(img);
      });
    }

    const currentImageSrc = galleryImages.length > 0 ? galleryImages[activeImageIndex] || galleryImages[0] : undefined;

    return (
      <div className="space-y-8 animate-page-enter">
        {/* Navigation & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
          <button
            onClick={() => handleSetServiceSlug(undefined)}
            className="inline-flex items-center gap-2 font-mono text-[12px] font-bold text-royal hover:underline self-start cursor-pointer"
          >
            <Icon name="arrowRight" className="h-3.5 w-3.5 rotate-180" />
            <span>BACK TO ALL SERVICES</span>
          </button>

          <div className="flex items-center gap-2 font-mono text-[11px] text-mute">
            <span>SERVICE REF:</span>
            <span className="font-bold text-graphite">{selectedService.id.toUpperCase()}</span>
          </div>
        </div>

        {/* Service Detail Main Container */}
        <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs">
          {/* Top Canonical Offering Banner */}
          <div className="rounded-card-md border border-line bg-canvas/70 p-3 font-mono text-[11px] flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-royal bg-soft px-2 py-0.5 rounded border border-royal/20 shrink-0">
                CANONICAL OFFERING
              </span>
              {selectedService.canonicalUrl ? (
                <a
                  href={selectedService.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-graphite hover:text-royal hover:underline truncate select-all transition"
                  title={selectedService.canonicalUrl}
                >
                  {selectedService.canonicalUrl}
                </a>
              ) : (
                <span className="text-amber-700 italic font-medium">
                  Generating canonical link…
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (selectedService.canonicalUrl) {
                    navigator.clipboard.writeText(selectedService.canonicalUrl);
                    setCopiedDetailUrl(true);
                    setTimeout(() => setCopiedDetailUrl(false), 2000);
                  }
                }}
                className="inline-flex items-center gap-1 rounded bg-white border border-line px-2.5 py-1 text-[10px] font-bold text-graphite hover:text-royal hover:border-royal transition cursor-pointer shadow-2xs"
                title="Copy canonical URL"
              >
                {copiedDetailUrl ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedDetailUrl ? "COPIED" : "COPY URL"}</span>
              </button>

              {selectedService.canonicalUrl && (
                <button
                  type="button"
                  onClick={() => setSharingService(selectedService)}
                  className="inline-flex items-center gap-1 rounded bg-white border border-line px-2.5 py-1 text-[10px] font-bold text-graphite hover:text-royal hover:border-royal transition cursor-pointer shadow-2xs"
                  title="Share canonical offering"
                >
                  <Share2 className="w-3 h-3" />
                  <span>SHARE</span>
                </button>
              )}
            </div>
          </div>

          {/* Header info */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-line pb-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] mb-2">
                <span className="rounded bg-soft px-2.5 py-0.5 font-bold text-royal uppercase">
                  {selectedService.category}
                </span>
                {selectedService.serviceType && (
                  <span className="rounded bg-canvas border border-line px-2.5 py-0.5 font-semibold text-stone">
                    {selectedService.serviceType}
                  </span>
                )}
              </div>

              <h1 className="text-h1 text-graphite mt-1">{selectedService.name}</h1>
              <p className="mt-3 text-[15px] font-medium text-stone max-w-3xl leading-relaxed">
                {selectedService.shortDescription}
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <DigiBadge variant={availability === "AVAILABLE" ? "soft" : "neutral"}>
                  {availability === "AVAILABLE" ? "✓ AVAILABLE" : availability}
                </DigiBadge>
                <SaveEntityButton
                  type="service"
                  id={selectedService.id}
                  companyId={company.id}
                  businessId={company.businessId}
                  size="sm"
                />
                <AddToCollectionButton
                  type="service"
                  id={selectedService.id}
                  companyId={company.id}
                  businessId={company.businessId}
                  entityName={selectedService.name}
                  size="sm"
                />
              </div>
              <span className="font-mono text-[10.5px] text-mute">CANONICAL SERVICE RECORD</span>
            </div>
          </div>

          {/* Service Detail Body Grid */}
          <div className="mt-8 grid gap-8 lg:grid-cols-12">
            {/* Left Column: Visual Gallery, Service Areas & Certifications */}
            <div className="lg:col-span-5 space-y-6">
              {/* Main Visual Display & Gallery Thumbnails */}
              <div className="space-y-3">
                <ServiceVisualImage
                  service={selectedService}
                  activeImageSrc={currentImageSrc}
                  containerClassName="w-full aspect-video overflow-hidden rounded-card-md border border-line bg-canvas shadow-xs"
                />

                {/* Interactive Gallery Thumbnails */}
                {galleryImages.length > 1 && (
                  <div className="space-y-1.5">
                    <span className="font-mono text-[10px] font-bold text-mute uppercase block tracking-wider">
                      SERVICE GALLERY ({galleryImages.length} VIEWS)
                    </span>
                    <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                      {galleryImages.map((imgUrl, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImageIndex(idx)}
                          className={`min-h-[48px] min-w-[48px] h-12 w-12 rounded-card-sm overflow-hidden border-2 transition-all cursor-pointer ${
                            activeImageIndex === idx ? "border-royal ring-2 ring-royal/20" : "border-line opacity-75 hover:opacity-100"
                          }`}
                        >
                          <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Service Areas */}
              {selectedService.serviceAreas && selectedService.serviceAreas.length > 0 && (
                <div className="rounded-card-md border border-line bg-white p-5">
                  <div className="flex items-center gap-2 border-b border-line pb-3 mb-3 font-mono text-[11px] font-bold text-graphite uppercase tracking-wider">
                    <Icon name="pin" className="h-4 w-4 text-royal" />
                    <span>SERVICE DEPLOYMENT REGIONS</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                    {selectedService.serviceAreas.map((area, idx) => (
                      <span key={idx} className="rounded bg-canvas border border-line px-2.5 py-1 text-stone font-semibold">
                        📍 {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {selectedService.certifications && selectedService.certifications.length > 0 && (
                <div className="rounded-card-md border border-line bg-white p-5">
                  <div className="flex items-center gap-2 border-b border-line pb-3 mb-3 font-mono text-[11px] font-bold text-graphite uppercase tracking-wider">
                    <Icon name="shield" className="h-4 w-4 text-royal" />
                    <span>SERVICE ACCREDITATIONS</span>
                  </div>
                  <div className="space-y-2 font-mono text-[11.5px]">
                    {selectedService.certifications.map((cert, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded bg-canvas border border-line px-3 py-2">
                        <span className="font-semibold text-graphite">{cert.name}</span>
                        <span className="font-bold text-emerald-600 text-[10.5px]">✓ {cert.status || "VERIFIED"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Full Overview, Capabilities & Request Service CTA */}
            <div className="lg:col-span-7 space-y-6">
              {/* Overview & Description */}
              <div>
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-royal mb-2">
                  SERVICE OVERVIEW
                </h3>
                <p className="text-[14px] leading-relaxed text-stone">
                  {selectedService.description || selectedService.shortDescription}
                </p>
              </div>

              {/* Core Capabilities List */}
              {selectedService.capabilities && selectedService.capabilities.length > 0 && (
                <div className="rounded-card-md border border-line bg-white p-5">
                  <div className="flex items-center justify-between border-b border-line pb-3 mb-3">
                    <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-graphite">
                      VERIFIED SERVICE CAPABILITIES
                    </h3>
                    <span className="font-mono text-[10.5px] text-mute">{selectedService.capabilities.length} CAPABILITIES</span>
                  </div>
                  <ul className="space-y-2 font-sans text-[13.5px]">
                    {selectedService.capabilities.map((cap, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-graphite font-medium">
                        <Icon name="check" className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Service Attributes Table */}
              {selectedService.attributes && selectedService.attributes.length > 0 && (
                <div className="rounded-card-md border border-line bg-white p-5">
                  <div className="flex items-center justify-between border-b border-line pb-3 mb-3">
                    <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-graphite">
                      SERVICE PARAMETER MATRIX
                    </h3>
                    <span className="font-mono text-[10.5px] text-mute">STRUCTURED SPEC</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 font-mono text-[11.5px]">
                    {selectedService.attributes.map((attr) => (
                      <div key={attr.key} className="rounded bg-canvas border border-line p-3">
                        <span className="text-[10px] text-mute uppercase block">{attr.label}</span>
                        <span className="font-bold text-graphite text-[12.5px] mt-0.5 block">
                          {String(attr.value)} {attr.unit ? attr.unit : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Provider Info */}
              <div className="rounded-card-md border border-line bg-canvas p-5">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute block font-bold">
                  CANONICAL SERVICE PROVIDER
                </span>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-graphite text-[15px]">{company.name}</h4>
                    <span className="font-mono text-[11px] text-stone block mt-0.5">
                      Registry ID: {company.id.toUpperCase()} • {primaryCity?.domain ?? company.city}
                    </span>
                  </div>
                  <a
                    href={`/companies/${companySlug}/corporate`}
                    className="inline-flex items-center gap-1 font-mono text-[11.5px] font-bold text-royal hover:underline shrink-0"
                  >
                    <span>View Profile</span>
                    <Icon name="arrowRight" className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              {/* Request Service CTA */}
              <div className="pt-2">
                <DigiButton
                  variant="primary"
                  className="w-full justify-center py-3.5"
                  icon="exchange"
                  onClick={() => {
                    const connectPath = `/companies/${companySlug}/connect?service=${selectedService.slug}`;
                    window.history.pushState({}, "", connectPath);
                    window.dispatchEvent(new Event("popstate"));
                  }}
                >
                  REQUEST PROPOSAL & SCHEDULE {selectedService.name.toUpperCase()}
                </DigiButton>
              </div>
            </div>
          </div>
        </div>

        {/* Service AI Advisor */}
        <ServiceAIAdvisor
          service={selectedService}
          company={company}
          onInquire={(serv) => {
            const connectPath = `/companies/${companySlug}/connect?service=${serv.slug}`;
            window.history.pushState({}, "", connectPath);
            window.dispatchEvent(new Event("popstate"));
          }}
        />
      </div>
    );
  }

  /* ------------------------------------------------------------
     VIEW B: SERVICES CATALOG LISTING VIEW
     ------------------------------------------------------------ */
  return (
    <div className="space-y-8">
      {/* 01. SERVICES PAGE HEADER */}
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-6">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-royal">
              <Icon name="briefcase" className="h-4 w-4" />
              <span>SPECIALIZED SERVICES CATALOG</span>
            </div>
            <h1 className="text-h1 mt-1 text-graphite">Services</h1>
            <p className="mt-2 text-[14.5px] font-medium text-stone max-w-2xl">
              Discover maritime engineering, inspection, and operational services offered by {company.name}.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
            <span className="rounded-full bg-soft border border-line px-3.5 py-1.5 font-extrabold text-royal">
              {services.length} {services.length === 1 ? "SERVICE" : "SERVICES"}
            </span>
          </div>
        </div>

        {/* 02. SEARCH, FILTER & SORTING CONTROLS */}
        <div className="mt-6 pt-2">
          <div className="grid gap-3 md:grid-cols-12 font-mono text-[12px]">
            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search services by name, type, or capability..."
                className="w-full rounded-card-sm border border-line bg-canvas px-3.5 py-2.5 pl-9 text-[13px] text-graphite placeholder:text-mute focus:outline-none focus:border-royal transition-colors"
              />
              <Icon name="search" className="absolute left-3 top-3 h-4 w-4 text-mute" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-3 text-mute hover:text-graphite font-bold text-[11px]"
                >
                  CLEAR
                </button>
              )}
            </div>

            {/* Service Type Filter */}
            {serviceTypes.length > 1 && (
              <div className="md:col-span-3">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full rounded-card-sm border border-line bg-canvas px-3 py-2.5 text-[12px] text-graphite font-semibold focus:outline-none focus:border-royal"
                >
                  <option value="ALL">All Service Types ({services.length})</option>
                  {serviceTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort Selector */}
            <div className={serviceTypes.length > 1 ? "md:col-span-3" : "md:col-span-6"}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full rounded-card-sm border border-line bg-canvas px-3 py-2.5 text-[12px] text-graphite font-semibold focus:outline-none focus:border-royal"
              >
                <option value="featured">Sort by: Featured Services</option>
                <option value="name">Sort by: Name (A-Z)</option>
                <option value="type">Sort by: Service Type</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 03. SERVICE CARDS GRID OR EMPTY STATES */}
      {services.length === 0 ? (
        /* Empty State */
        <div className="rounded-card-lg border border-line bg-white p-8 md:p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-canvas text-stone mb-4 border border-line">
            <Icon name="briefcase" className="h-6 w-6 text-mute" />
          </div>
          <h3 className="text-h3 text-graphite">NO SERVICES OFFERED</h3>
          <p className="mt-2 text-[14px] text-stone max-w-md mx-auto">
            No public services have been registered for {company.name} in this catalog yet.
          </p>
        </div>
      ) : filteredServices.length === 0 ? (
        /* Search Empty State */
        <div className="rounded-card-lg border border-line bg-white p-8 text-center">
          <h3 className="text-h3 text-graphite">NO MATCHING SERVICES FOUND</h3>
          <p className="mt-2 text-[14px] text-stone">
            No services match the active search term "{searchQuery}".
          </p>
          <div className="mt-5">
            <DigiButton
              onClick={() => {
                setSearchQuery("");
                setSelectedType("ALL");
                setSelectedCategory("ALL");
                setSelectedAvailability("ALL");
              }}
              icon="exchange"
            >
              CLEAR ALL FILTERS
            </DigiButton>
          </div>
        </div>
      ) : (
        /* Service Cards Grid */
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => {
            const avail = service.availability || "AVAILABLE";
            const capsPreview = service.capabilities ? service.capabilities.slice(0, 3) : [];

            return (
              <div
                key={service.id}
                className="rounded-card-lg border border-line bg-white p-6 shadow-xs flex flex-col justify-between hover:border-royal/50 transition-all duration-200 group"
              >
                <div>
                  {/* Category & Status Eyebrow */}
                  <div className="flex items-center justify-between border-b border-line pb-3 mb-3 font-mono text-[10.5px]">
                    <span className="font-bold text-royal uppercase bg-soft px-2 py-0.5 rounded truncate max-w-[170px]">
                      {service.category}
                    </span>
                    <span className="font-semibold text-stone">
                      {avail === "AVAILABLE" ? "✓ AVAILABLE" : avail}
                    </span>
                  </div>

                  {/* Service Visual Image */}
                  <ServiceVisualImage
                    service={service}
                    containerClassName="aspect-video w-full overflow-hidden rounded-card-md border border-line bg-canvas mb-3.5"
                  />

                  {/* Service Type Tag & Title */}
                  {service.serviceType && (
                    <span className="font-mono text-[10.5px] font-bold text-mute block mb-1">
                      TYPE: {service.serviceType}
                    </span>
                  )}
                  <h3 className="text-h3 text-graphite group-hover:text-royal transition-colors">
                    {service.name}
                  </h3>

                  {/* Short Description */}
                  <p className="mt-2.5 text-[13.5px] text-stone leading-relaxed line-clamp-3">
                    {service.shortDescription}
                  </p>

                  {/* Capabilities Preview */}
                  {capsPreview.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-line/60 space-y-1 font-mono text-[11px]">
                      {capsPreview.map((cap, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-stone truncate">
                          <span className="text-royal font-bold">•</span>
                          <span className="truncate">{cap}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Canonical URL Row */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3.5 rounded-card-xs border border-line bg-canvas/70 p-2.5 font-mono text-[10px]"
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-mute">
                        CANONICAL URL
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (service.canonicalUrl) {
                              navigator.clipboard.writeText(service.canonicalUrl);
                              setCopiedCardId(service.id);
                              setTimeout(() => setCopiedCardId(null), 2000);
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded bg-white border border-line px-2 py-0.5 text-[9px] font-bold text-graphite hover:text-royal hover:border-royal transition cursor-pointer shadow-2xs"
                          title="Copy canonical URL"
                        >
                          {copiedCardId === service.id ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                          <span>{copiedCardId === service.id ? "COPIED" : "COPY URL"}</span>
                        </button>

                        {service.canonicalUrl && (
                          <>
                            <a
                              href={service.canonicalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-0.5 rounded bg-white border border-line px-2 py-0.5 text-[9px] font-bold text-graphite hover:text-royal hover:border-royal transition cursor-pointer shadow-2xs"
                              title="Open canonical link"
                            >
                              <span>OPEN</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSharingService(service);
                              }}
                              className="inline-flex items-center gap-1 rounded bg-white border border-line px-2 py-0.5 text-[9px] font-bold text-graphite hover:text-royal hover:border-royal transition cursor-pointer shadow-2xs"
                              title="Share canonical offering"
                            >
                              <Share2 className="w-2.5 h-2.5" />
                              <span>SHARE</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {service.canonicalUrl ? (
                      <a
                        href={service.canonicalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="font-semibold text-graphite hover:text-royal hover:underline truncate block select-all transition"
                        title={service.canonicalUrl}
                      >
                        {service.canonicalUrl}
                      </a>
                    ) : (
                      <span className="text-amber-700 italic font-medium block">
                        Generating canonical link…
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action */}
                <div className="mt-6 pt-4 border-t border-line flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <SaveEntityButton
                      type="service"
                      id={service.id}
                      companyId={company.id}
                      businessId={company.businessId}
                      size="sm"
                    />
                    <AddToCollectionButton
                      type="service"
                      id={service.id}
                      companyId={company.id}
                      businessId={company.businessId}
                      entityName={service.name}
                      variant="icon"
                    />
                  </div>
                  <button
                    onClick={() => handleSetServiceSlug(service.slug)}
                    className="inline-flex items-center gap-1 font-mono text-[12px] font-bold text-royal group-hover:underline cursor-pointer"
                  >
                    <span>VIEW SERVICE</span>
                    <Icon name="arrowRight" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share Modal */}
      {sharingService && sharingService.canonicalUrl && (
        <ShareProtocolModal
          isOpen={!!sharingService}
          onClose={() => setSharingService(null)}
          title={`Share ${sharingService.name}`}
          url={sharingService.canonicalUrl}
          description="Anyone with this link can view this offering."
        />
      )}
    </div>
  );
}
