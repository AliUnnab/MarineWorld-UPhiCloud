import { useState } from "react";
import type { CompanyProfile, SectorCity, IndustryDomainEntity, SectorConfig } from "@/lib/types";
import { getCompanyProductBySlug, getCompanyServiceBySlug } from "@/lib/registry";
import { CompanySovereignHeader } from "./CompanySovereignHeader";
import { CompanySolutionsModule } from "./CompanySolutionsModule";
import { CompanyDashboardView } from "./CompanyDashboardView";
import { CompanyConnectPortalModal } from "./CompanyConnectPortalModal";
import { ShareProtocolModal } from "./ShareProtocolModal";
import { CompanyBusinessTwinAIModal } from "./CompanyBusinessTwinAIModal";
import {
  CompanyPresenceModule,
  CompanyConnectModule,
  CompanyBusinessTwinModule,
} from "./CompanyModules";
import { DigiContainer } from "@/components/digione/primitives";
import { resolveMarineWorldCompanyDigitalId, buildCanonicalCompanyUrl } from "@/lib/services/companyIdentityService";
import {
  CheckCircle2,
  Lock,
  Globe2,
  LayoutDashboard,
  Package,
  Cpu,
  Link2,
  Share2,
} from "lucide-react";

export function CompanyOperatingShell({
  company,
  primaryCity,
  parentDomain,
  config,
  activeModule = "company",
  selectedProductSlug,
  selectedServiceSlug,
  onSelectModule,
}: {
  company: CompanyProfile;
  primaryCity?: SectorCity;
  parentDomain?: IndustryDomainEntity;
  config?: SectorConfig;
  activeModule?: string;
  selectedProductSlug?: string;
  selectedServiceSlug?: string;
  onSelectModule: (moduleSlug: string) => void;
  onSelectProduct?: (productSlug: string | undefined) => void;
  onSelectService?: (serviceSlug: string | undefined) => void;
}) {
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isTwinModalOpen, setIsTwinModalOpen] = useState(false);

  const totalOfferings = (company.offerings?.length ?? 0) ||
    ((company.products?.length ?? 0) + (company.services?.length ?? 0));

  const selectedProduct = selectedProductSlug ? getCompanyProductBySlug(company, selectedProductSlug) : undefined;
  const selectedService = selectedServiceSlug ? getCompanyServiceBySlug(company, selectedServiceSlug) : undefined;

  // Resolve immutable MarineWorld Company Digital ID credential
  const digitalIdInfo = resolveMarineWorldCompanyDigitalId({
    companyIdOrSlug: company.id,
    mwCompanyDigitalId: company.mwCompanyDigitalId,
    businessId: company.businessId,
    companyId6Digit: company.companyId6Digit,
    primaryRegistryCode: company.primaryRegistryCode,
    primarySectorCityId: company.sectorCityIds?.[0] || company.cityIds?.[0] || primaryCity?.id,
  });

  const displayName = company.displayName || company.name || "Enterprise Company";
  const legalName = company.legalName || company.name;
  const isVerified = String(company.verificationStatus || "VERIFIED").toLowerCase().includes("verified");
  const headquartersCity = company.headquartersCity || company.city || "Rotterdam";
  const country = company.country || company.registrationCountry || "Netherlands";

  // Authoritative Canonical Company URL (e.g. https://unabil.shipyard.marineworld.city/)
  const canonicalCompanyUrl = buildCanonicalCompanyUrl(
    company,
    primaryCity?.id || company.primarySectorCityId || company.sectorCityIds?.[0]
  );

  const renderActiveModule = () => {
    switch (activeModule) {
      case "company":
      case "overview":
      case "corporate":
        return (
          <CompanyDashboardView
            company={company}
            primaryCity={primaryCity}
            parentDomain={parentDomain}
            config={config}
            onSelectModule={onSelectModule}
            onOpenConnectModal={() => setIsConnectModalOpen(true)}
            onOpenTwinModal={() => setIsTwinModalOpen(true)}
            onOpenShareModal={() => setIsShareModalOpen(true)}
          />
        );
      case "offerings":
      case "showroom":
      case "solutions":
      case "products":
      case "services":
        return <CompanySolutionsModule company={company} />;
      case "presence":
      case "sector-city":
      case "network":
        return (
          <CompanyPresenceModule
            company={company}
            primaryCity={primaryCity}
            parentDomain={parentDomain}
            config={config}
          />
        );
      case "business-twin":
      case "chat":
      case "ai":
        return <CompanyBusinessTwinModule company={company} onSelectModule={onSelectModule} />;
      case "connect":
        return (
          <CompanyConnectModule
            company={company}
            primaryCity={primaryCity}
            parentDomain={parentDomain}
            config={config}
            productSlug={selectedProductSlug}
            serviceSlug={selectedServiceSlug}
          />
        );
      default:
        return (
          <CompanyDashboardView
            company={company}
            primaryCity={primaryCity}
            parentDomain={parentDomain}
            config={config}
            onSelectModule={onSelectModule}
            onOpenConnectModal={() => setIsConnectModalOpen(true)}
            onOpenTwinModal={() => setIsTwinModalOpen(true)}
            onOpenShareModal={() => setIsShareModalOpen(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-canvas pb-24 font-sans">
      {/* 01. Two-Layer Sovereign Navigation (Platform Chrome + Company Shell with persistent identity strip & tabs) */}
      <CompanySovereignHeader
        company={company}
        primaryCity={primaryCity}
        parentDomain={parentDomain}
        activeModule={activeModule}
        selectedProductName={selectedProduct?.name}
        selectedServiceName={selectedService?.name}
        onSelectModule={onSelectModule}
        offeringsCount={totalOfferings}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        onOpenTwinModal={() => setIsTwinModalOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
      />

      {/* 02. Main Company Operating Workspace Shell */}
      <div className="py-6 sm:py-8 md:py-10">
        <DigiContainer>
          <main aria-label="Company Active Module" className="w-full">
            {renderActiveModule()}
          </main>
        </DigiContainer>
      </div>

      {/* Real Company Connect Portal Modal / Slide-over Drawer */}
      <CompanyConnectPortalModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        company={company}
        primaryCity={primaryCity}
        parentDomain={parentDomain}
      />

      {/* Share Modal */}
      <ShareProtocolModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={`Share ${displayName}`}
        url={canonicalCompanyUrl}
        description="Anyone with this link can view this company page."
      />

      {/* Autonomous Company Business Twin AI Representative Modal */}
      <CompanyBusinessTwinAIModal
        isOpen={isTwinModalOpen}
        onClose={() => setIsTwinModalOpen(false)}
        company={company}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        onSelectModule={onSelectModule}
      />
    </div>
  );
}

