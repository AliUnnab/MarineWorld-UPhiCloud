import { useEffect, useState } from "react";
import { marineSector as MARITIME_CONFIG } from "@/lib/sectors/marine";
import { LandingPage } from "@/pages/LandingPage";
import { PropertyGovernancePage } from "@/pages/PropertyGovernancePage";
import { ExplorePage } from "@/pages/ExplorePage";
import { SectorCitiesPage } from "@/pages/SectorCitiesPage";
import { IndustryDomainsPage } from "@/pages/IndustryDomainsPage";
import { IndustryDomainPage } from "@/pages/IndustryDomainPage";
import { SectorCityDirectoryPage } from "@/pages/SectorCityDirectoryPage";
import { SectorCityEntrancePage } from "@/pages/SectorCityEntrancePage";
import { SectorCityDetailsPage } from "@/pages/SectorCityDetailsPage";
import { CompanyPage } from "@/pages/CompanyPage";
import { CityEntrancePage } from "@/pages/CityEntrancePage";
import { CompanyOnboardingPage } from "@/pages/CompanyOnboardingPage";
import { CompanyStudioShell } from "@/components/studio/CompanyStudioShell";
import { LoginPage } from "@/pages/LoginPage";
import { PersonalLoginPage } from "@/pages/PersonalLoginPage";
import { PersonalWorkspacePage } from "@/pages/PersonalWorkspacePage";
import { AccessGatewayPage } from "@/pages/AccessGatewayPage";
import { EcosystemOrganizationPage } from "@/pages/EcosystemOrganizationPage";
import { AccessContextBar } from "@/components/foundation/AccessContextBar";
import { CityEntrancePrototype } from "@/pages/CityEntrancePrototype";
import { FlagshipPropertyPage } from "@/pages/FlagshipPropertyPage";
import { MarineWorldCommercialConsolePage } from "@/pages/MarineWorldCommercialConsolePage";
import { MarineWorldBillingPage } from "@/pages/MarineWorldBillingPage";
import { OfferingStandalonePage } from "@/pages/OfferingStandalonePage";
import { BillingSubView } from "@/components/studio/CompanyStudioBillingView";
import { CompaniesDirectoryPage } from "@/pages/CompaniesDirectoryPage";
import { InstitutionalLegalPage, type LegalDocTab } from "@/pages/InstitutionalLegalPage";
import { GettingStartedPage } from "@/pages/GettingStartedPage";
import { GlobalErrorBoundary } from "@/components/foundation/GlobalErrorBoundary";
import { CookieConsentBanner } from "@/components/foundation/CookieConsentBanner";
import { PublicOrganizationProfile } from "@/components/organization/PublicOrganizationProfile";
import {
  getEcosystemOrganizationById,
  isInstitutionalOrganization,
} from "@/lib/services/ecosystemOrganizationService";

export default function App() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);

    // Intercept client-side link clicks for seamless SPA routing
    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");

      // Internal routing intercept for links starting with /
      if (href && href.startsWith("/") && !href.startsWith("//")) {
        e.preventDefault();
        try {
          const url = new URL(href, window.location.origin);
          window.history.pushState({}, "", href);
          setPath(url.pathname);
          if (url.hash) {
            const el = document.querySelector(url.hash);
            if (el) {
              el.scrollIntoView({ behavior: "smooth" });
              return;
            }
          }
          window.scrollTo({ top: 0, behavior: "smooth" });
        } catch {
          window.history.pushState({}, "", href);
          setPath(href);
        }
      }
    };

    document.addEventListener("click", handleLinkClick);
    return () => {
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("click", handleLinkClick);
    };
  }, []);

  const config = MARITIME_CONFIG;

  const renderContent = () => {
    // CANONICAL STANDALONE PRODUCT & SERVICE ROUTES ({slug}.{sector}.marineworld.city / /products/:slug / /services/:slug):
    if (path.startsWith("/products/") || path.startsWith("/services/") || path.startsWith("/offerings/")) {
      const parts = path.split("/").filter(Boolean);
      const offeringSlug = parts[1];
      if (offeringSlug) {
        return (
          <OfferingStandalonePage
            config={config}
            slug={offeringSlug}
            onNavigate={(newPath) => {
              window.history.pushState({}, "", newPath);
              setPath(newPath);
            }}
          />
        );
      }
    }

    // Check URL query parameter simulation for standalone offering
    const searchParams = new URLSearchParams(window.location.search);
    const queryOfferingSlug = searchParams.get("offering") || searchParams.get("product") || searchParams.get("service") || searchParams.get("slug");
    if (queryOfferingSlug) {
      return (
        <OfferingStandalonePage
          config={config}
          slug={queryOfferingSlug}
          onNavigate={(newPath) => {
            window.history.pushState({}, "", newPath);
            setPath(newPath);
          }}
        />
      );
    }

    // Check Subdomain format e.g. {slug}.{sector}.marineworld.city
    const hostname = window.location.hostname;
    if (
      hostname.includes(".marineworld.city") &&
      !hostname.startsWith("www.") &&
      !hostname.startsWith("app.") &&
      hostname !== "marineworld.city"
    ) {
      const cleanSubdomain = hostname.replace(".marineworld.city", "");
      const parts = cleanSubdomain.split(".");
      if (parts.length >= 1 && parts[0] && parts[0] !== "localhost") {
        return (
          <OfferingStandalonePage
            config={config}
            slug={parts[0]}
            sectorCityHint={parts[1]}
            onNavigate={(newPath) => {
              window.history.pushState({}, "", newPath);
              setPath(newPath);
            }}
          />
        );
      }
    }

    // VISUAL PROTOTYPE ROUTE (ISOLATED)
    if (path === "/city-entrance-prototype") {
      return <CityEntrancePrototype />;
    }

    // CANONICAL DEDICATED GETTING STARTED ROUTE:
    if (
      path === "/getting-started" ||
      path === "/getting-started/" ||
      path === "/resources/getting-started" ||
      path === "/guide"
    ) {
      return <GettingStartedPage config={config} />;
    }

    // CANONICAL INSTITUTIONAL LEGAL & GOVERNANCE ROUTES:
    if (
      path === "/terms" ||
      path === "/acceptable-use" ||
      path === "/aup" ||
      path === "/intellectual-property" ||
      path === "/ip" ||
      path === "/platform-license" ||
      path === "/license" ||
      path === "/privacy" ||
      path === "/security" ||
      path === "/cookies" ||
      path === "/legal" ||
      path === "/contact"
    ) {
      let tab: LegalDocTab = "terms";
      if (path === "/acceptable-use" || path === "/aup") tab = "acceptable-use";
      else if (path === "/intellectual-property" || path === "/ip") tab = "intellectual-property";
      else if (path === "/platform-license" || path === "/license") tab = "platform-license";
      else if (path === "/privacy") tab = "privacy";
      else if (path === "/security") tab = "security";
      else if (path === "/cookies") tab = "cookies";
      else if (path === "/contact") tab = "contact";

      return (
        <InstitutionalLegalPage
          config={config}
          initialTab={tab}
          onNavigate={(newPath) => {
            window.history.pushState({}, "", newPath);
            setPath(newPath);
          }}
        />
      );
    }

    // CANONICAL ACCESS GATEWAY ROUTE:
    if (path === "/gateway" || path === "/access" || path === "/enter") {
      return (
        <AccessGatewayPage
          onNavigate={(newPath) => {
            window.history.pushState({}, "", newPath);
            setPath(newPath);
          }}
        />
      );
    }

    // CANONICAL ECOSYSTEM ORGANIZATION ROUTES:
    if (path === "/ecosystem" || path === "/ecosystem/access" || path === "/ecosystem/dashboard") {
      return (
        <EcosystemOrganizationPage
          onNavigate={(newPath) => {
            window.history.pushState({}, "", newPath);
            setPath(newPath);
          }}
        />
      );
    }

    // CANONICAL PERSONAL LOGIN ROUTE:
    if (path === "/login/personal") {
      return (
        <PersonalLoginPage
          onNavigate={(newPath) => {
            window.history.pushState({}, "", newPath);
            setPath(newPath);
          }}
          onLoginSuccess={() => {
            window.history.pushState({}, "", "/workspace");
            setPath("/workspace");
          }}
        />
      );
    }

    // CANONICAL PERSONAL WORKSPACE & VISITOR ROUTES:
    if (
      path.startsWith("/workspace") ||
      path.startsWith("/visitor") ||
      path === "/saved/companies" ||
      path === "/saved/products" ||
      path === "/saved/services" ||
      path === "/workspace/inquiries" ||
      path === "/inquiries" ||
      path === "/collections" ||
      path === "/workspace/collections" ||
      path === "/activity" ||
      path === "/workspace/activity" ||
      path === "/account"
    ) {
      let initialTab: "overview" | "companies" | "products" | "services" | "inquiries" | "collections" | "activity" | "account" = "overview";
      
      // Check search params first
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get("tab");
      if (tabParam === "saved-companies" || tabParam === "companies") initialTab = "companies";
      else if (tabParam === "saved-products" || tabParam === "products") initialTab = "products";
      else if (tabParam === "saved-services" || tabParam === "services") initialTab = "services";
      else if (tabParam === "inquiries" || tabParam === "my-inquiries") initialTab = "inquiries";
      else if (tabParam === "collections" || tabParam === "curated") initialTab = "collections";
      else if (tabParam === "activity" || tabParam === "history") initialTab = "activity";
      else if (tabParam === "account" || tabParam === "profile") initialTab = "account";
      else if (path === "/saved/companies") initialTab = "companies";
      else if (path === "/saved/products") initialTab = "products";
      else if (path === "/saved/services") initialTab = "services";
      else if (path === "/workspace/inquiries" || path === "/inquiries") initialTab = "inquiries";
      else if (path === "/collections" || path === "/workspace/collections") initialTab = "collections";
      else if (path === "/activity" || path === "/workspace/activity") initialTab = "activity";
      else if (path === "/account") initialTab = "account";

      return (
        <PersonalWorkspacePage
          initialTab={initialTab}
          onNavigate={(newPath) => {
            window.history.pushState({}, "", newPath);
            setPath(newPath.split("?")[0]);
          }}
        />
      );
    }

    // CANONICAL AUTHENTICATION & LOGIN ROUTE:
    if (path === "/login") {
      return (
        <LoginPage
          onNavigate={(newPath) => {
            window.history.pushState({}, "", newPath);
            setPath(newPath);
          }}
          onLoginSuccess={() => {
            window.history.pushState({}, "", "/studio");
            setPath("/studio");
          }}
        />
      );
    }

    // CANONICAL GOVERNANCE ROUTE:
    if (path === "/governance/properties") {
      return <PropertyGovernancePage />;
    }

    // CANONICAL INSTITUTIONAL BILLING & INVOICE ROUTES:
    if (
      path === "/invoices" ||
      path === "/invoice" ||
      path.startsWith("/invoices/") ||
      path.startsWith("/invoice/") ||
      path === "/billing" ||
      path === "/billing/invoices" ||
      path === "/billing/invoice" ||
      path === "/billing/payments" ||
      path === "/billing/payment" ||
      path === "/billing/subscription" ||
      path === "/billing/subscriptions" ||
      path === "/billing/agreements" ||
      path === "/billing/commercial-agreements" ||
      path === "/billing/methods" ||
      path === "/billing/payment-methods" ||
      path === "/company/billing" ||
      path === "/company/invoices" ||
      path.startsWith("/billing/")
    ) {
      let initialSubView: BillingSubView = "OVERVIEW";
      let agreementId: string | undefined = undefined;

      if (path === "/invoices" || path === "/invoice" || path === "/billing/invoices" || path === "/billing/invoice" || path === "/company/invoices" || path.startsWith("/invoices/") || path.startsWith("/invoice/")) {
        initialSubView = "INVOICES";
      } else if (path === "/billing/payments" || path === "/billing/payment") {
        initialSubView = "PAYMENTS";
      } else if (path === "/billing/subscription" || path === "/billing/subscriptions") {
        initialSubView = "PLATFORM_SUBSCRIPTION";
      } else if (path === "/billing/agreements" || path === "/billing/commercial-agreements") {
        initialSubView = "COMMERCIAL_AGREEMENTS";
      } else if (path === "/billing/methods" || path === "/billing/payment-methods") {
        initialSubView = "PAYMENT_METHODS";
      } else if (path.startsWith("/billing/")) {
        const parts = path.split("/").filter(Boolean);
        if (parts.length > 1 && !["invoices", "invoice", "payments", "payment", "subscription", "subscriptions", "agreements", "commercial-agreements", "methods", "payment-methods"].includes(parts[1])) {
          agreementId = parts[1];
          initialSubView = "AGREEMENT_DETAIL";
        }
      }

      return (
        <MarineWorldBillingPage
          initialSubView={initialSubView}
          agreementId={agreementId}
          onNavigate={(newPath) => {
            window.history.pushState({}, "", newPath);
            setPath(newPath);
          }}
        />
      );
    }

    // CANONICAL COMMERCIAL OPERATIONS ROUTES:
    if (path === "/commercial/properties" || path === "/commercial/inventory") {
      return <MarineWorldCommercialConsolePage initialTab="INVENTORY_PORTFOLIO" />;
    }
    if (path === "/commercial/agreements") {
      return <MarineWorldCommercialConsolePage initialTab="AGREEMENTS" />;
    }
    if (path === "/commercial/audit") {
      return <MarineWorldCommercialConsolePage initialTab="AUDIT_LEDGER" />;
    }
    if (path === "/commercial/billing" || path === "/commercial/marketplace") {
      return <MarineWorldCommercialConsolePage initialTab="DUAL_BILLING" />;
    }
    if (path === "/commercial" || path.startsWith("/commercial/")) {
      return <MarineWorldCommercialConsolePage initialTab="RESERVATIONS" />;
    }

    // CANONICAL ONBOARDING & STUDIO ROUTES:
    if (path === "/company/onboarding" || path === "/onboarding" || path === "/ecosystem/onboarding") {
      return (
        <CompanyOnboardingPage
          config={config}
          onEnterStudio={() => {
            window.history.pushState({}, "", "/studio");
            setPath("/studio");
          }}
        />
      );
    }

    if (path.startsWith("/studio")) {
      const parts = path.split("/").filter(Boolean);
      const initialModule = parts.length > 1 ? parts[1].toUpperCase() : undefined;
      
      return (
        <CompanyStudioShell
          initialModule={initialModule as any}
          onExitStudio={() => {
            window.history.pushState({}, "", "/");
            setPath("/");
          }}
          onNavigateToPublicPage={(companyId) => {
            window.history.pushState({}, "", `/companies/${companyId}`);
            setPath(`/companies/${companyId}`);
          }}
        />
      );
    }

    // ROUTE HIERARCHY MATCHING:
    // 1. /explore -> Global Maritime Discovery Layer & Ecosystem Explorer
    if (path === "/explore" || path === "/explore/") {
      return <ExplorePage config={config} />;
    }

    // 2. /cities -> Canonical 82 Sector City Directory
    if (path === "/cities" || path === "/cities/") {
      return <SectorCitiesPage config={config} />;
    }

    // 3. /sectors (or /categories, legacy /industries) -> Maritime Registry Taxonomy (8 Master Industry Domains)
    if (
      path === "/sectors" ||
      path === "/sectors/" ||
      path === "/industries" ||
      path === "/industries/" ||
      path === "/industries/maritime" ||
      path === "/categories"
    ) {
      return <IndustryDomainsPage config={config} />;
    }

    // 4. /companies -> Verified AI-Native Maritime Companies & General Products/Services Catalogs
    if (
      path === "/companies" ||
      path === "/companies/" ||
      path === "/network" ||
      path === "/products" ||
      path === "/services" ||
      path === "/offerings"
    ) {
      return <CompaniesDirectoryPage config={config} />;
    }

    // 2. /industries/:domainSlug -> Industry Domain Detail
    if (path.startsWith("/industries/")) {
      const parts = path.split("/").filter(Boolean);
      const domainSlug = parts[1] || "maritime-services";
      return <IndustryDomainPage config={config} domainSlug={domainSlug} />;
    }

    // 3. /cities/:citySlug / details -> Sector City Details
    if (path.startsWith("/cities/") && path.endsWith("/details")) {
      const parts = path.split("/").filter(Boolean);
      const citySlug = parts[1] || "shipyard";
      return <SectorCityDetailsPage config={config} citySlug={citySlug} />;
    }

    // 3.0. /cities/:citySlug / directory -> Sector City Directory
    if (path.startsWith("/cities/") && path.endsWith("/directory")) {
      const parts = path.split("/").filter(Boolean);
      const citySlug = parts[1] || "shipyard";
      return <SectorCityDirectoryPage config={config} citySlug={citySlug} />;
    }

    // 3.1. /cities/:citySlug / :regionSlug -> Sector City Entrance
    if (path.startsWith("/cities/")) {
      const parts = path.split("/").filter(Boolean);
      const citySlug = parts[1] || "shipyard";
      const regionSlug = parts[2] || undefined;
      return <SectorCityEntrancePage config={config} citySlug={citySlug} regionSlug={regionSlug} />;
    }

    // 3.5. /properties/flagship -> Flagship Digital Property
    if (path.startsWith("/properties/flagship")) {
      const url = new URL(window.location.href);
      const cityId = url.searchParams.get("city") || "charter";
      const regionSlug = url.searchParams.get("region") || "mediterranean";
      return <FlagshipPropertyPage config={config} cityId={cityId} regionSlug={regionSlug} />;
    }

    // 4. /companies/:companySlug / :moduleSlug / :productSlug | :serviceSlug (or /company/:slug) -> Company Operating Environment or Public Organization Profile
    if (path.startsWith("/companies/") || path.startsWith("/company/")) {
      const parts = path.split("/").filter(Boolean);
      const companySlug = parts[1] || "crest-group-materials";
      const moduleSlug = parts[2] || "solutions";
      const searchParams = new URLSearchParams(window.location.search);
      const queryProduct = searchParams.get("product") || searchParams.get("offering") || undefined;
      const queryService = searchParams.get("service") || searchParams.get("offering") || undefined;
      const productSlug = parts[2] === "products" ? (parts[3] || queryProduct) : queryProduct;
      const serviceSlug = parts[2] === "services" ? (parts[3] || queryService) : queryService;

      const institutionalOrg = getEcosystemOrganizationById(companySlug);
      const isInstitutional =
        Boolean(institutionalOrg) ||
        isInstitutionalOrganization(companySlug);

      if (isInstitutional) {
        const orgData = institutionalOrg || getEcosystemOrganizationById(companySlug);
        if (orgData) {
          return (
            <PublicOrganizationProfile
              key={orgData.slug || orgData.id}
              organization={orgData}
              config={config}
              initialTab={moduleSlug}
            />
          );
        }
      }

      return (
        <CompanyPage
          key={companySlug}
          config={config}
          companySlug={companySlug}
          initialModule={moduleSlug}
          initialProductSlug={productSlug}
          initialServiceSlug={serviceSlug}
        />
      );
    }

    // 5. /enter/:citySlug -> Portal Registration / Entrance Form
    if (path.startsWith("/enter/")) {
      const parts = path.split("/").filter(Boolean);
      const cityId = parts[1] || "shipyard";
      return <CityEntrancePage config={config} cityId={cityId} />;
    }

    // Default root route -> MarineWorld Master Landing Page
    return <LandingPage config={config} />;
  };

  return (
    <GlobalErrorBoundary>
      {renderContent()}
      <CookieConsentBanner />
    </GlobalErrorBoundary>
  );
}
