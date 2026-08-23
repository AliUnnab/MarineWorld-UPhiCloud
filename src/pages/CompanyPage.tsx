import { useState, useEffect } from "react";
import type { SectorConfig, CompanyEntity } from "@/lib/types";
import { PageMetadata } from "@/components/foundation/PageMetadata";
import { CompanyOperatingShell } from "@/components/company/CompanyOperatingShell";
import { EmptyState } from "@/components/foundation/EmptyState";
import {
  getCompanyBySlug,
  getCompanyParentContext,
  getCompanyProductBySlug,
  getCompanyServiceBySlug,
} from "@/lib/registry";
import { getCurrentAuthSession } from "@/lib/services/securityService";
import {
  recordCompanyView,
  recordProductView,
  recordServiceView,
} from "@/lib/services/personalWorkspaceService";
import { buildCanonicalCompanyUrl } from "@/lib/services/companyIdentityService";
import { buildCanonicalOfferingUrl } from "@/lib/services/offeringEntityService";
import {
  buildCompanySchema,
  buildProductSchema,
  buildServiceSchema,
  injectJsonLd,
} from "@/lib/services/schemaOrgService";

export function CompanyPage({
  config,
  companySlug,
  initialModule = "company",
  initialProductSlug,
  initialServiceSlug,
}: {
  config: SectorConfig;
  companySlug?: string;
  initialModule?: string;
  initialProductSlug?: string;
  initialServiceSlug?: string;
}) {
  const [activeModule, setActiveModule] = useState(initialModule);
  const [selectedProductSlug, setSelectedProductSlug] = useState<string | undefined>(initialProductSlug);
  const [selectedServiceSlug, setSelectedServiceSlug] = useState<string | undefined>(initialServiceSlug);

  useEffect(() => {
    setActiveModule(initialModule);
    setSelectedProductSlug(initialProductSlug);
    setSelectedServiceSlug(initialServiceSlug);
  }, [initialModule, initialProductSlug, initialServiceSlug]);

  // Extract slug from URL if not passed explicitly
  let resolvedSlug = companySlug;
  if (!resolvedSlug && typeof window !== "undefined") {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts[0] === "company" && parts[1]) {
      resolvedSlug = parts[1];
    }
  }

  // Resolve company dynamically from registry
  const company = getCompanyBySlug(config, resolvedSlug) || config?.network?.companies?.[0];

  // Record personal visitor view activity
  useEffect(() => {
    const session = getCurrentAuthSession();
    if (!session || !session.uid || !company) return;

    if (selectedProductSlug) {
      const prod = getCompanyProductBySlug(company, selectedProductSlug);
      if (prod) {
        recordProductView(session.uid, company.id, prod.id, prod.name, company.businessId);
      }
    } else if (selectedServiceSlug) {
      const serv = getCompanyServiceBySlug(company, selectedServiceSlug);
      if (serv) {
        recordServiceView(session.uid, company.id, serv.id, serv.name, company.businessId);
      }
    } else {
      recordCompanyView(session.uid, company.id, company.name, company.businessId);
    }
  }, [company?.id, selectedProductSlug, selectedServiceSlug]);

  if (!company) {
    return (
      <div className="min-h-screen bg-canvas font-sans text-graphite py-20">
        <PageMetadata
          title="Company Not Found | MarineWorld.City"
          description="The requested company operating environment could not be found in the registry."
        />
        <div className="mx-auto max-w-4xl px-4">
          <EmptyState
            icon="building"
            title="Company Operating Environment Not Found"
            description={`No company registered with slug "${companySlug}" in the MarineWorld registry.`}
            action={{ label: "Return to Companies Registry", href: "/#network" }}
          />
        </div>
      </div>
    );
  }

  // Resolve parent context (Primary Sector City & Industry Domain)
  const { primaryCity, parentDomain } = getCompanyParentContext(config, company);

  const handleSelectModule = (moduleSlug: string) => {
    setActiveModule(moduleSlug);
    if (moduleSlug !== "products") {
      setSelectedProductSlug(undefined);
    }
    if (moduleSlug !== "services") {
      setSelectedServiceSlug(undefined);
    }
    const newPath = `/companies/${company.slug ?? company.id}/${moduleSlug}`;
    window.history.pushState({}, "", newPath);
  };

  const handleSelectProduct = (productSlug: string | undefined) => {
    setSelectedProductSlug(productSlug);
    const companyBase = `/companies/${company.slug ?? company.id}/products`;
    const newPath = productSlug ? `${companyBase}/${productSlug}` : companyBase;
    window.history.pushState({}, "", newPath);
  };

  const handleSelectService = (serviceSlug: string | undefined) => {
    setSelectedServiceSlug(serviceSlug);
    const companyBase = `/companies/${company.slug ?? company.id}/services`;
    const newPath = serviceSlug ? `${companyBase}/${serviceSlug}` : companyBase;
    window.history.pushState({}, "", newPath);
  };

  const selectedProduct = company && selectedProductSlug ? getCompanyProductBySlug(company, selectedProductSlug) : undefined;
  const selectedService = company && selectedServiceSlug ? getCompanyServiceBySlug(company, selectedServiceSlug) : undefined;

  const cityDomain = primaryCity?.domain ?? "SECTOR CITY";
  const isProducts = activeModule === "products";
  const isServices = activeModule === "services";
  const isConnect = activeModule === "connect";
  const isPresence = activeModule === "presence";
  const isCorporate = activeModule === "corporate";
  const isGovernance = activeModule === "governance";

  const pageTitle = selectedProduct
    ? `${selectedProduct.name} | ${company.name} Products | MarineWorld.City`
    : selectedService
    ? `${selectedService.name} — ${company.name} | MarineWorld.City`
    : isConnect
    ? `${company.name} — Connect | MarineWorld.City`
    : isProducts
    ? `${company.name} — Products Catalog | MarineWorld.City`
    : isServices
    ? `${company.name} — Services | MarineWorld.City`
    : isGovernance
    ? `${company.name} — Governance | MarineWorld.City`
    : isCorporate
    ? `${company.name} — Corporate | MarineWorld.City`
    : isPresence
    ? `${company.name} — Presence | MarineWorld.City`
    : `${company.name} | ${cityDomain} | MarineWorld.City`;

  const pageDescription = selectedProduct
    ? `${selectedProduct.shortDescription} — Product specifications and data sheets from ${company.name}.`
    : selectedService
    ? `${selectedService.shortDescription} — Service specifications and capabilities from ${company.name}.`
    : isConnect
    ? `Initiate verified business interaction, technical RFQ routing, or formal connection requests with ${company.name}.`
    : isProducts
    ? `Canonical product catalog and technical specifications for ${company.name} within MarineWorld.City.`
    : isServices
    ? `Explore the services provided by ${company.name} within MarineWorld.City.`
    : isGovernance
    ? `Verification, trust, security and data governance records for ${company.name} within MarineWorld.City.`
    : isCorporate
    ? `The structured corporate identity and business profile for ${company.name} within MarineWorld.City.`
    : isPresence
    ? `Network presence and operational node mapping for ${company.name} across MarineWorld Sector Cities.`
    : `${company.name} — ${company.industry} operating environment within ${cityDomain}.`;

  const canonicalSectorCity = primaryCity?.id || company.primarySectorCityId || company.sectorCityIds?.[0] || "shipyard";
  const companyCanonicalUrl = buildCanonicalCompanyUrl(company, canonicalSectorCity);

  const canonicalUrl = selectedProduct
    ? buildCanonicalOfferingUrl(selectedProduct.slug || selectedProduct.id || "product", company.slug || company.id || "company", canonicalSectorCity)
    : selectedService
    ? buildCanonicalOfferingUrl(selectedService.slug || selectedService.id || "service", company.slug || company.id || "company", canonicalSectorCity)
    : companyCanonicalUrl;

  // Runtime JSON-LD Schema injection for external AI & machine discoverability
  useEffect(() => {
    if (!company) return;
    if (selectedProduct) {
      injectJsonLd(buildProductSchema(selectedProduct as any, company as unknown as CompanyEntity), "company-entity-jsonld");
    } else if (selectedService) {
      injectJsonLd(buildServiceSchema(selectedService as any, company as unknown as CompanyEntity), "company-entity-jsonld");
    } else {
      injectJsonLd(buildCompanySchema(company as unknown as CompanyEntity, undefined, company.products as any, company.services as any), "company-entity-jsonld");
    }
  }, [company, selectedProduct, selectedService, canonicalSectorCity]);

  return (
    <div className="min-h-screen bg-canvas font-sans text-graphite">
      <PageMetadata
        title={pageTitle}
        description={pageDescription}
        canonicalUrl={canonicalUrl}
      />
      <CompanyOperatingShell
        company={company}
        primaryCity={primaryCity}
        parentDomain={parentDomain}
        config={config}
        activeModule={activeModule}
        selectedProductSlug={selectedProductSlug}
        selectedServiceSlug={selectedServiceSlug}
        onSelectModule={handleSelectModule}
        onSelectProduct={handleSelectProduct}
        onSelectService={handleSelectService}
      />
    </div>
  );
}
