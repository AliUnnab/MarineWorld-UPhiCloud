import React from "react";
import {
  Layers,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import type { EcosystemOrganizationSummary } from "@/lib/services/ecosystemOrganizationService";
import { PublicOrganizationProfile } from "@/components/organization/PublicOrganizationProfile";

interface EcosystemIdentityViewProps {
  organization: EcosystemOrganizationSummary;
  onNavigateUrl?: (url: string) => void;
}

export function EcosystemIdentityView({
  organization,
  onNavigateUrl,
}: EcosystemIdentityViewProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-royal uppercase tracking-widest mb-1">
            <Layers className="w-4 h-4 text-royal" />
            <span>AI-Native Organization Identity</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            PUBLIC ORGANIZATION PROFILE
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Your organization maintains its own public AI-Native presence inside MarineWorld.
          </p>
        </div>

        <button
          onClick={() => {
            if (onNavigateUrl) onNavigateUrl(`/companies/${organization.slug}`);
          }}
          className="px-4 py-2.5 rounded-xl bg-royal hover:bg-royal-dark text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer self-start sm:self-center"
        >
          <span>Open Public Organization Page</span>
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* PRIVATE VS PUBLIC CLARIFICATION CARD */}
      <div className="p-4 bg-royal/5 border border-royal/20 rounded-2xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-royal shrink-0 mt-0.5" />
        <p className="text-xs font-medium text-royal-dark leading-relaxed">
          <strong className="font-extrabold">Ecosystem Hub vs Public Profile:</strong> You are currently inside your private <span className="font-extrabold uppercase">MarineWorld Ecosystem Hub</span> (operating environment for managing member onboarding and accreditation). Public users view your AI-Native Organization page at <code className="font-mono bg-royal/10 px-1.5 py-0.5 rounded text-royal-dark">/companies/{organization.slug}</code>.
        </p>
      </div>

      {/* CANONICAL PUBLIC ORGANIZATION PROFILE PREVIEW */}
      <PublicOrganizationProfile
        organization={organization}
        isEmbeddedPreview={true}
        onNavigateUrl={onNavigateUrl}
      />
    </div>
  );
}

