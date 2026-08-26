import React, { useState, useEffect } from "react";
import {
  getEcosystemOrganizationById,
  getOrganizationForUser,
  getEcosystemMembers,
  getEcosystemFunnelMetrics,
  type EcosystemOrganizationSummary,
} from "@/lib/services/ecosystemOrganizationService";
import {
  getCurrentAuthSession,
  signOutCurrentUser,
  subscribeAuthState,
} from "@/lib/services/securityService";
import { getActiveOrganizationContext } from "@/lib/services/accessContextService";
import type { OrganizationEntityType } from "@/lib/types";

import { EcosystemSidebar, type EcosystemNavTab } from "@/components/ecosystem/EcosystemSidebar";
import { EcosystemHeaderMobile } from "@/components/ecosystem/EcosystemHeaderMobile";
import { EcosystemEntryPage } from "@/components/ecosystem/EcosystemEntryPage";
import { EcosystemInviteModal } from "@/components/ecosystem/EcosystemInviteModal";
import { EcosystemAuthModal } from "@/components/ecosystem/EcosystemAuthModal";

import { EcosystemOverviewView } from "@/components/ecosystem/views/EcosystemOverviewView";
import { EcosystemMembersView } from "@/components/ecosystem/views/EcosystemMembersView";
import { EcosystemEnrollmentView } from "@/components/ecosystem/views/EcosystemEnrollmentView";
import { EcosystemVerificationView } from "@/components/ecosystem/views/EcosystemVerificationView";
import { EcosystemIntelligenceView } from "@/components/ecosystem/views/EcosystemIntelligenceView";
import { EcosystemInsightsView } from "@/components/ecosystem/views/EcosystemInsightsView";
import { EcosystemReportsView } from "@/components/ecosystem/views/EcosystemReportsView";
import { EcosystemIdentityView } from "@/components/ecosystem/views/EcosystemIdentityView";
import { EcosystemSettingsView } from "@/components/ecosystem/views/EcosystemSettingsView";

interface EcosystemOrganizationPageProps {
  onNavigate?: (path: string) => void;
}

export function EcosystemOrganizationPage({ onNavigate }: EcosystemOrganizationPageProps) {
  const navigateTo = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  // Extract initial tab from URL search query if available (e.g. ?tab=members)
  const getTabFromUrl = (): EcosystemNavTab => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab") as EcosystemNavTab;
    const validTabs: EcosystemNavTab[] = [
      "overview",
      "members",
      "enrollment",
      "verification",
      "ecosystem",
      "insights",
      "reports",
      "identity",
      "settings",
    ];
    return validTabs.includes(tabParam) ? tabParam : "overview";
  };

  const [activeTab, setActiveTab] = useState<EcosystemNavTab>(getTabFromUrl());
  const [activeOrg, setActiveOrg] = useState<EcosystemOrganizationSummary | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState<boolean>(false);
  const [switcherModalOpen, setSwitcherModalOpen] = useState<boolean>(false);

  // Resolve active ecosystem organization context strictly by authenticated tenant
  const refreshContext = () => {
    const currentAuth = getCurrentAuthSession();

    if (!currentAuth.uid) {
      // Unauthenticated -> Must go through Ecosystem Entry Page
      setActiveOrg(null);
      return;
    }

    const org = getOrganizationForUser(currentAuth.uid);
    if (org && (org.status === "HUB_ACTIVE" || org.hubStatus === "ACTIVE" || org.verificationStatus === "VERIFIED")) {
      setActiveOrg(org);
    } else {
      // User is authenticated but has no active Ecosystem Hub tenant
      setActiveOrg(null);
    }
  };

  useEffect(() => {
    refreshContext();
    const unsub = subscribeAuthState(() => {
      refreshContext();
    });
    return () => unsub();
  }, []);

  const handleTabChange = (tab: EcosystemNavTab) => {
    setActiveTab(tab);
    window.history.pushState({}, "", `/ecosystem/dashboard?tab=${tab}`);
  };

  const handleSwitchContext = () => {
    setSwitcherModalOpen(true);
  };

  const handleSignOut = () => {
    signOutCurrentUser();
    setActiveOrg(null);
  };

  const handleAuthSuccess = (org: EcosystemOrganizationSummary) => {
    setActiveOrg(org);
  };

  // IF NO ACTIVE AUTHENTICATED ECOSYSTEM HUB TENANT -> RENDER ENTRY / ONBOARDING PAGE
  if (!activeOrg) {
    return (
      <EcosystemEntryPage
        onSuccess={handleAuthSuccess}
        onNavigateUrl={navigateTo}
      />
    );
  }

  const members = getEcosystemMembers(activeOrg.id);
  const funnelMetrics = getEcosystemFunnelMetrics(activeOrg.id);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col lg:flex-row antialiased">
      {/* DESKTOP PERSISTENT NAVIGATION SIDEBAR */}
      <div className="hidden lg:block">
        <EcosystemSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          organization={activeOrg}
          onSwitchContext={handleSwitchContext}
          onSignOut={handleSignOut}
          onNavigate={navigateTo}
        />
      </div>

      {/* MOBILE COLLAPSIBLE NAVIGATION HEADER */}
      <EcosystemHeaderMobile
        activeTab={activeTab}
        onTabChange={handleTabChange}
        organization={activeOrg}
        onSwitchContext={handleSwitchContext}
        onSignOut={handleSignOut}
        onNavigate={navigateTo}
      />

      {/* MAIN HUB WORKSPACE CONTENT */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto w-full">
        {activeTab === "overview" && (
          <EcosystemOverviewView
            organization={activeOrg}
            funnelMetrics={funnelMetrics}
            recentMembers={members}
            onNavigateTab={handleTabChange}
            onNavigateUrl={navigateTo}
            onInviteModalOpen={() => setInviteModalOpen(true)}
          />
        )}

        {activeTab === "members" && (
          <EcosystemMembersView
            organization={activeOrg}
            onNavigateUrl={navigateTo}
            onInviteModalOpen={() => setInviteModalOpen(true)}
          />
        )}

        {activeTab === "enrollment" && (
          <EcosystemEnrollmentView
            organization={activeOrg}
            funnelMetrics={funnelMetrics}
            onInviteModalOpen={() => setInviteModalOpen(true)}
          />
        )}

        {activeTab === "verification" && (
          <EcosystemVerificationView
            organization={activeOrg}
            members={members}
            onNavigateUrl={navigateTo}
          />
        )}

        {activeTab === "ecosystem" && (
          <EcosystemIntelligenceView
            organization={activeOrg}
            members={members}
            onNavigateTab={(tab) => handleTabChange(tab)}
          />
        )}

        {activeTab === "insights" && (
          <EcosystemInsightsView
            organization={activeOrg}
            onNavigateUrl={navigateTo}
          />
        )}

        {activeTab === "reports" && (
          <EcosystemReportsView
            organization={activeOrg}
            members={members}
          />
        )}

        {activeTab === "identity" && (
          <EcosystemIdentityView
            organization={activeOrg}
            onNavigateUrl={navigateTo}
          />
        )}

        {activeTab === "settings" && (
          <EcosystemSettingsView
            organization={activeOrg}
          />
        )}
      </main>

      {/* MODALS */}
      <EcosystemInviteModal
        isOpen={inviteModalOpen}
        organization={activeOrg}
        onClose={() => setInviteModalOpen(false)}
      />

      <EcosystemAuthModal
        isOpen={switcherModalOpen}
        currentOrgId={activeOrg.id}
        onClose={() => setSwitcherModalOpen(false)}
        onSuccess={(org) => {
          setActiveOrg(org);
          setSwitcherModalOpen(false);
        }}
      />
    </div>
  );
}
