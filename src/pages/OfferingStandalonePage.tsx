import React, { useState, useEffect } from "react";
import type { SectorConfig, OfferingGroundingSource, OfferingMediaItem } from "@/lib/types";
import {
  resolveCanonicalOffering,
  resolveCanonicalOfferingAsync,
  ResolvedCanonicalOffering,
} from "@/lib/services/offeringEntityService";
import { getCurrentAuthSession } from "@/lib/services/securityService";
import { recordProductView, recordServiceView } from "@/lib/services/personalWorkspaceService";
import { injectJsonLd, buildProductSchema, buildServiceSchema } from "@/lib/services/schemaOrgService";

import { OfferingEntityHeader } from "@/components/offering/OfferingEntityHeader";
import { OfferingMediaHero } from "@/components/offering/OfferingMediaHero";
import { OfferingExecutiveSummary } from "@/components/offering/OfferingExecutiveSummary";
import { OfferingTechnicalRecord } from "@/components/offering/OfferingTechnicalRecord";
import { OfferingDocumentsSection } from "@/components/offering/OfferingDocumentsSection";
import { OfferingAIAdvisorPanel } from "@/components/offering/OfferingAIAdvisorPanel";
import { OfferingCommercialBar } from "@/components/offering/OfferingCommercialBar";
import { OfferingParentCompanyBox } from "@/components/offering/OfferingParentCompanyBox";
import {
  RequestOfferModal,
  CommercialRFQModal,
  DocumentViewerModal,
  MediaLightboxModal,
  ShareOfferingModal,
} from "@/components/offering/OfferingModals";
import { CompanyConnectPortalModal } from "@/components/company/CompanyConnectPortalModal";

import {
  ChevronRight,
  ShieldCheck,
  Building,
  ArrowLeft,
  Home,
  Layers,
  AlertCircle,
  ExternalLink,
  Package,
} from "lucide-react";

interface OfferingStandalonePageProps {
  config: SectorConfig;
  slug: string;
  sectorCityHint?: string;
  companyHint?: string;
  onNavigate?: (path: string) => void;
}

export function OfferingStandalonePage({
  config,
  slug,
  sectorCityHint,
  companyHint,
  onNavigate,
}: OfferingStandalonePageProps) {
  const effectiveCompanyHint =
    companyHint ||
    (() => {
      if (typeof window !== "undefined") {
        const parts = window.location.pathname.split("/").filter(Boolean);
        if ((parts[0] === "companies" || parts[0] === "company") && parts[1]) {
          return parts[1];
        }
      }
      return undefined;
    })();

  const [resolved, setResolved] = useState<ResolvedCanonicalOffering | null>(() =>
    resolveCanonicalOffering(slug, sectorCityHint, effectiveCompanyHint)
  );
  const [isLoading, setIsLoading] = useState<boolean>(() => !resolved);

  // Modals state
  const [isRequestOfferOpen, setIsRequestOfferOpen] = useState(false);
  const [isRFQOpen, setIsRFQOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [activeViewerDoc, setActiveViewerDoc] = useState<OfferingGroundingSource | null>(null);
  const [activeLightboxMedia, setActiveLightboxMedia] = useState<OfferingMediaItem | null>(null);

  useEffect(() => {
    let isMounted = true;
    const syncRes = resolveCanonicalOffering(slug, sectorCityHint, effectiveCompanyHint);
    if (syncRes) {
      setResolved(syncRes);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    resolveCanonicalOfferingAsync(slug, sectorCityHint, effectiveCompanyHint)
      .then((asyncRes) => {
        if (isMounted) {
          setResolved(asyncRes);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn("[OfferingStandalonePage] Async resolution error:", err);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [slug, sectorCityHint, effectiveCompanyHint]);

  // Record workspace view & inject structured JSON-LD
  useEffect(() => {
    if (!resolved) return;
    const { offering, parentCompany, canonicalUrl } = resolved;

    // Document Title
    const companyDisplayName =
      parentCompany.displayName || (parentCompany as any).name || parentCompany.legalName || "MarineWorld";
    document.title = `${offering.name} — ${companyDisplayName} | MarineWorld`;

    // Record view in personal workspace
    const session = getCurrentAuthSession();
    if (session && session.uid) {
      if (offering.type === "product") {
        recordProductView(
          session.uid,
          parentCompany.id,
          offering.id,
          offering.name,
          parentCompany.businessId
        );
      } else {
        recordServiceView(
          session.uid,
          parentCompany.id,
          offering.id,
          offering.name,
          parentCompany.businessId
        );
      }
    }

    // Inject structured SEO schema
    if (offering.type === "product") {
      const schema = buildProductSchema(
        offering as any,
        parentCompany as any
      );
      injectJsonLd(schema);
    } else if (offering.type === "service") {
      const schema = buildServiceSchema(
        offering as any,
        parentCompany as any
      );
      injectJsonLd(schema);
    }
  }, [resolved]);

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col font-sans text-graphite">
        <header className="bg-white border-b border-line px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 text-sm font-bold text-graphite hover:text-royal transition">
              <Home className="w-4 h-4 text-royal" />
              <span>MarineWorld Ecosystem</span>
            </a>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-xl border border-line p-8 text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-royal/10 text-royal flex items-center justify-center mx-auto animate-pulse">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-graphite">Loading Maritime Offering Record</h1>
              <p className="text-xs text-stone mt-1">
                Synchronizing <code className="font-mono font-semibold text-royal">{slug}</code> from sovereign registry...
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 404 / Unresolved State
  if (!resolved) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col font-sans text-graphite">
        <header className="bg-white border-b border-line px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 text-sm font-bold text-graphite hover:text-royal transition">
              <Home className="w-4 h-4 text-royal" />
              <span>MarineWorld Ecosystem</span>
            </a>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-xl border border-line p-8 text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-graphite">Offering Record Not Found</h1>
              <p className="text-xs text-stone mt-1">
                The identifier <code className="font-mono font-semibold text-royal">{slug}</code> is not registered in the sovereign maritime registry or may be archived.
              </p>
            </div>
            <div className="pt-2">
              <a
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-royal text-white text-xs font-bold hover:bg-blue-700 transition shadow-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Ecosystem</span>
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { offering, parentCompany, canonicalUrl, sectorCity, industryDomain } = resolved;
  const companyDisplayName =
    parentCompany.displayName || (parentCompany as any).name || parentCompany.legalName || "MarineWorld Enterprise";
  const companySlug = (parentCompany as any).slug || parentCompany.id;

  return (
    <div className="min-h-screen bg-canvas flex flex-col font-sans text-graphite antialiased">
      {/* Global Navigation & Breadcrumb Bar */}
      <nav className="bg-white border-b border-line sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs text-stone truncate font-mono">
            <a href="/" className="text-stone hover:text-royal transition flex items-center gap-1">
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">MarineWorld</span>
            </a>
            <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
            <a
              href={`/cities/${sectorCity || "shipyard"}`}
              className="text-stone hover:text-royal transition uppercase truncate"
            >
              {sectorCity || "Shipyard"}.city
            </a>
            <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
            <a
              href={`/companies/${companySlug}`}
              className="text-stone hover:text-royal transition truncate font-medium max-w-[120px] sm:max-w-none"
            >
              {companyDisplayName}
            </a>
            <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
            <span className="text-graphite font-bold truncate max-w-[140px] sm:max-w-[240px]">
              {offering.name}
            </span>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`/companies/${companySlug}`}
              className="px-3 py-1.5 rounded-lg border border-line bg-canvas hover:bg-white text-xs font-semibold text-graphite transition flex items-center gap-1.5"
            >
              <Building className="w-3.5 h-3.5 text-royal" />
              <span className="hidden sm:inline">Company Profile</span>
            </a>
            <button
              type="button"
              onClick={() => setIsRequestOfferOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-royal hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Request Offer
            </button>
          </div>
        </div>
      </nav>

      {/* 1. ENTITY HEADER */}
      <OfferingEntityHeader
        offering={offering}
        parentCompany={parentCompany}
        canonicalUrl={canonicalUrl}
        onOpenShare={() => setIsShareOpen(true)}
        onRequestOffer={() => setIsRequestOfferOpen(true)}
        onOpenRFQ={() => setIsRFQOpen(true)}
      />

      {/* Main Structural Body */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1">
        {/* 2. HERO / MEDIA AREA */}
        <OfferingMediaHero
          offering={offering}
          onOpenLightbox={(media) => setActiveLightboxMedia(media)}
        />

        {/* 6. DEDICATED AI ADVISOR (CORE DIFFERENTIATOR - PROMINENTLY POSITIONED) */}
        <OfferingAIAdvisorPanel
          offering={offering}
          parentCompany={parentCompany}
          onRequestOffer={() => setIsRequestOfferOpen(true)}
          onOpenRFQ={() => setIsRFQOpen(true)}
          onConnectCompany={() => setIsConnectOpen(true)}
        />

        {/* 3. EXECUTIVE SUMMARY */}
        <OfferingExecutiveSummary offering={offering} />

        {/* 4. TECHNICAL RECORD & SPECIFICATIONS */}
        <OfferingTechnicalRecord offering={offering} />

        {/* 5. AUTHORIZED DOCUMENTS & ATTACHMENTS */}
        <OfferingDocumentsSection
          offering={offering}
          onViewDocument={(doc) => setActiveViewerDoc(doc)}
        />

        {/* 7. INSTITUTIONAL COMMERCIAL ACTIONS & TERMS */}
        <OfferingCommercialBar
          offering={offering}
          parentCompany={parentCompany}
          onRequestOffer={() => setIsRequestOfferOpen(true)}
          onOpenRFQ={() => setIsRFQOpen(true)}
          onConnectCompany={() => setIsConnectOpen(true)}
          onOpenShare={() => setIsShareOpen(true)}
        />

        {/* 8. PARENT COMPANY CONTEXT */}
        <OfferingParentCompanyBox
          parentCompany={parentCompany}
          sectorCity={sectorCity}
          onConnectCompany={() => setIsConnectOpen(true)}
        />
      </main>

      {/* Institutional Footer */}
      <footer className="bg-white border-t border-line mt-12 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-stone">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-graphite">MarineWorld.City</span>
            <span>&bull;</span>
            <a
              href="https://uphi.cloud"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone hover:text-graphite font-sans transition-colors"
            >
              <span className="font-bold text-graphite">UPhi.Cloud</span> — AI-Native Industry & Enterprise Platform
            </a>
          </div>
          <div className="flex items-center gap-4">
            <span>CANONICAL: {canonicalUrl.replace("https://", "")}</span>
            <span>&bull;</span>
            <span className="text-emerald-700 font-semibold">STATUS: VERIFIED LIVE</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <RequestOfferModal
        isOpen={isRequestOfferOpen}
        onClose={() => setIsRequestOfferOpen(false)}
        offering={offering}
        parentCompany={parentCompany}
      />

      <CommercialRFQModal
        isOpen={isRFQOpen}
        onClose={() => setIsRFQOpen(false)}
        offering={offering}
        parentCompany={parentCompany}
      />

      <DocumentViewerModal
        isOpen={!!activeViewerDoc}
        onClose={() => setActiveViewerDoc(null)}
        document={activeViewerDoc}
        offeringName={offering.name}
      />

      <MediaLightboxModal
        isOpen={!!activeLightboxMedia}
        onClose={() => setActiveLightboxMedia(null)}
        activeMedia={activeLightboxMedia}
        offeringName={offering.name}
      />

      <ShareOfferingModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        offering={offering}
        canonicalUrl={canonicalUrl}
      />

      <CompanyConnectPortalModal
        isOpen={isConnectOpen}
        onClose={() => setIsConnectOpen(false)}
        company={parentCompany as any}
      />
    </div>
  );
}
