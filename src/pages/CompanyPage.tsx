import { useState, useEffect } from "react";
import type { SectorConfig, CompanyEntity, CompanyProfile } from "@/lib/types";
import { PageMetadata } from "@/components/foundation/PageMetadata";
import { CompanyOperatingShell } from "@/components/company/CompanyOperatingShell";
import { EmptyState } from "@/components/foundation/EmptyState";
import { Icon } from "@/components/digione/icons";
import {
  getCompanyBySlug,
  getCompanyParentContext,
  getCompanyProductBySlug,
  getCompanyServiceBySlug,
} from "@/lib/registry";
import {
  getCompanyBySlug as getFirestoreCompanyBySlug,
  getCompanyById as getFirestoreCompanyById,
  getCompanyWithFullDetails,
} from "@/services/companyService";
import { getCurrentAuthSession } from "@/lib/services/securityService";
import {
  recordCompanyView,
  recordProductView,
  recordServiceView,
} from "@/lib/services/personalWorkspaceService";
import { buildCanonicalCompanyUrl } from "@/lib/services/companyIdentityService";
import { buildCanonicalOfferingUrl, fetchCompanyOfferingsAsync } from "@/lib/services/offeringEntityService";
import {
  buildCompanySchema,
  buildProductSchema,
  buildServiceSchema,
  injectJsonLd,
} from "@/lib/services/schemaOrgService";
import {
  getEcosystemOrganizationById,
  isInstitutionalOrganization,
  type EcosystemOrganizationSummary,
} from "@/lib/services/ecosystemOrganizationService";
import { PublicOrganizationProfile } from "@/components/organization/PublicOrganizationProfile";

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

  const [liveCompany, setLiveCompany] = useState<CompanyEntity | null>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(Boolean(resolvedSlug));
  const [companyFetchError, setCompanyFetchError] = useState<string | null>(null);

  // Asynchronously resolve company from Firestore with fallback to registry
  useEffect(() => {
    let isMounted = true;
    if (!resolvedSlug) {
      setIsLoadingCompany(false);
      return;
    }

    async function loadCompany() {
      setIsLoadingCompany(true);
      setCompanyFetchError(null);
      try {
        const found =
          (await getCompanyWithFullDetails(resolvedSlug!)) ||
          (await getFirestoreCompanyBySlug(resolvedSlug!)) ||
          (await getFirestoreCompanyById(resolvedSlug!));
        if (isMounted && found) {
          setLiveCompany(found);
          fetchCompanyOfferingsAsync(found.id).catch(() => {});
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn("[CompanyPage] Firestore company fetch fallback:", err);
          setCompanyFetchError(err?.message || "Failed to load live company data.");
        }
      } finally {
        if (isMounted) setIsLoadingCompany(false);
      }
    }

    loadCompany();

    return () => {
      isMounted = false;
    };
  }, [resolvedSlug]);

  // Check if target entity is an institutional organization
  const institutionalOrg = getEcosystemOrganizationById(resolvedSlug || companySlug || "");
  const isInstitutional =
    Boolean(institutionalOrg) ||
    isInstitutionalOrganization(resolvedSlug) ||
    isInstitutionalOrganization(companySlug);

  // Resolve company dynamically from live Firestore state
  const company =
    (liveCompany as unknown as CompanyProfile) ||
    (resolvedSlug ? getCompanyBySlug(config, resolvedSlug) : undefined);

  const effectiveIsInstitutional =
    isInstitutional ||
    (company && isInstitutionalOrganization(company));

  const orgData: EcosystemOrganizationSummary | undefined = effectiveIsInstitutional
    ? institutionalOrg ||
      (company
        ? ({
            id: company.id || company.slug,
            name: company.displayName || company.name,
            legalName: company.legalName || company.name,
            slug: company.slug || company.id,
            organizationType: (company.organizationType as any) || "ASSOCIATION",
            businessId: company.businessId || `MW-BUS-${company.companyId6Digit || "ORG"}`,
            verificationStatus: "VERIFIED",
            status: "HUB_ACTIVE",
            hubStatus: "ACTIVE",
            activationCode: "MW-ORG-2026",
            enrollmentCode: `MW-${String(company.slug || company.id).slice(0, 4).toUpperCase()}-2026`,
            ecosystemHubId: `hub-${company.slug || company.id}`,
            country: company.country || "Netherlands",
            registrationNumber: company.registrationNumber || (company as any).registrationNumber || "NL-89201144",
            officialWebsite: company.website || `https://www.${company.slug}.org`,
            principalAuthorityUserId: "usr-authority-lead",
            principalAuthorityName: "Executive Secretariat",
            principalAuthorityRole: "Institutional Director",
            officialEmailDomain: `${company.slug}.org`,
            officialContactEmail: company.officialEmail || `secretariat@${company.slug}.org`,
            discountPercentage: 20,
            totalMembersCount: (company as any).totalMembersCount || 500,
            activatedMembersCount: 380,
            verifiedMembersCount: 320,
            activeSectorCitiesCount: (company as any).activeSectorCitiesCount || (company.sectorCityIds?.length || 10),
            memberCompanyIds: [],
            aboutDescription: company.description || company.corporateDescription || "Institutional organization operating in the global marine ecosystem.",
            capabilities: company.capabilities || ["Institutional Governance", "Standards Accreditation", "Industry Collaboration"],
            knowledgeArticlesCount: 42,
            publicationsCount: 18,
          } as EcosystemOrganizationSummary)
        : undefined)
    : undefined;

  // Record personal visitor view activity (unconditional hook)
  useEffect(() => {
    if (effectiveIsInstitutional || !company) return;
    const session = getCurrentAuthSession();
    if (!session || !session.uid) return;

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
      recordCompanyView(session.uid, company.id, company.displayName || company.name || company.legalName || "Company", company.businessId);
    }
  }, [company?.id, selectedProductSlug, selectedServiceSlug, effectiveIsInstitutional]);

  // Resolve parent context (Primary Sector City & Industry Domain)
  const { primaryCity, parentDomain } = company
    ? getCompanyParentContext(config, company)
    : { primaryCity: undefined, parentDomain: undefined };

  const selectedProduct = company && selectedProductSlug ? getCompanyProductBySlug(company, selectedProductSlug) : undefined;
  const selectedService = company && selectedServiceSlug ? getCompanyServiceBySlug(company, selectedServiceSlug) : undefined;
  const canonicalSectorCity = primaryCity?.id || company?.primarySectorCityId || company?.sectorCityIds?.[0] || "shipyard";

  // Runtime JSON-LD Schema injection for external AI & machine discoverability (unconditional hook)
  useEffect(() => {
    if (effectiveIsInstitutional || !company) return;
    if (selectedProduct) {
      injectJsonLd(buildProductSchema(selectedProduct as any, company as unknown as CompanyEntity), "company-entity-jsonld");
    } else if (selectedService) {
      injectJsonLd(buildServiceSchema(selectedService as any, company as unknown as CompanyEntity), "company-entity-jsonld");
    } else {
      injectJsonLd(buildCompanySchema(company as unknown as CompanyEntity, undefined, company.products as any, company.services as any), "company-entity-jsonld");
    }
  }, [company, selectedProduct, selectedService, canonicalSectorCity, effectiveIsInstitutional]);

  // ALL HOOKS HAVE BEEN EXECUTED UNCONDITIONALLY. NOW WE CAN SAFELY BRANCH RENDER OUTPUT.

  if (isLoadingCompany) {
    return (
      <div className="min-h-screen bg-canvas font-sans flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-soft flex items-center justify-center text-royal mb-3 animate-pulse">
          <Icon name="building" className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-graphite">Loading Company Profile...</h2>
        <p className="text-xs text-stone mt-1">Verifying Sovereign Business Twin data via Firestore.</p>
      </div>
    );
  }

  if (effectiveIsInstitutional && orgData) {
    return (
      <PublicOrganizationProfile
        organization={orgData}
        config={config}
        initialTab={activeModule}
      />
    );
  }

  if (isLoadingCompany && !company) {
    const fallbackTitle = resolvedSlug
      ? `${resolvedSlug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())} | MarineWorld.City`
      : "Loading Company | MarineWorld.City";
    return (
      <div className="min-h-screen bg-canvas font-sans text-graphite py-20 flex items-center justify-center">
        <PageMetadata
          title={fallbackTitle}
          description="Loading verified maritime enterprise operating environment..."
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-royal/30 border-t-royal rounded-full animate-spin" />
          <div className="text-sm font-semibold text-slate-500">Loading company profile...</div>
        </div>
      </div>
    );
  }

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

  const companyName =
    company.displayName ||
    company.name ||
    (company as any).brandName ||
    company.legalName ||
    (resolvedSlug ? resolvedSlug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "Company");

  const cityDomain = primaryCity?.domain || (company.primarySectorCityId ? `${company.primarySectorCityId.toUpperCase()}.CITY` : "SECTOR CITY");
  const isProducts = activeModule === "products";
  const isServices = activeModule === "services";
  const isConnect = activeModule === "connect";
  const isPresence = activeModule === "presence";
  const isCorporate = activeModule === "corporate";
  const isGovernance = activeModule === "governance";

  const pageTitle = selectedProduct
    ? `${selectedProduct.name} | ${companyName} Products | MarineWorld.City`
    : selectedService
    ? `${selectedService.name} — ${companyName} | MarineWorld.City`
    : isConnect
    ? `${companyName} — Connect | MarineWorld.City`
    : isProducts
    ? `${companyName} — Products Catalog | MarineWorld.City`
    : isServices
    ? `${companyName} — Services | MarineWorld.City`
    : isGovernance
    ? `${companyName} — Governance | MarineWorld.City`
    : isCorporate
    ? `${companyName} — Corporate | MarineWorld.City`
    : isPresence
    ? `${companyName} — Presence | MarineWorld.City`
    : `${companyName} | ${cityDomain} | MarineWorld.City`;

  const pageDescription = selectedProduct
    ? `${selectedProduct.shortDescription} — Product specifications and data sheets from ${companyName}.`
    : selectedService
    ? `${selectedService.shortDescription} — Service specifications and capabilities from ${companyName}.`
    : isConnect
    ? `Initiate verified business interaction, technical RFQ routing, or formal connection requests with ${companyName}.`
    : isProducts
    ? `Canonical product catalog and technical specifications for ${companyName} within MarineWorld.City.`
    : isServices
    ? `Explore the services provided by ${companyName} within MarineWorld.City.`
    : isGovernance
    ? `Verification, trust, security and data governance records for ${companyName} within MarineWorld.City.`
    : isCorporate
    ? `The structured corporate identity and business profile for ${companyName} within MarineWorld.City.`
    : isPresence
    ? `Network presence and operational node mapping for ${companyName} across MarineWorld Sector Cities.`
    : `${companyName} — ${company.industry || "Marine & Maritime"} operating environment within ${cityDomain}.`;

  const companyCanonicalUrl = buildCanonicalCompanyUrl(company, canonicalSectorCity);

  const canonicalUrl = selectedProduct
    ? buildCanonicalOfferingUrl(selectedProduct.slug || selectedProduct.id || "product", company.slug || company.id || "company", canonicalSectorCity)
    : selectedService
    ? buildCanonicalOfferingUrl(selectedService.slug || selectedService.id || "service", company.slug || company.id || "company", canonicalSectorCity)
    : companyCanonicalUrl;

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
