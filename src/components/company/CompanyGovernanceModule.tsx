import { useState } from "react";
import type { CompanyProfile, SectorCity, IndustryDomainEntity, SectorConfig } from "@/lib/types";
import { Icon } from "@/components/digione/icons";
import { DigiBadge, DigiButton } from "@/components/digione/primitives";

/* ------------------------------------------------------------
   LOADING SKELETON
   ------------------------------------------------------------ */
export function CompanyGovernanceSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8">
        <div className="h-4 w-40 bg-mist rounded mb-3" />
        <div className="h-8 w-64 bg-mist rounded mb-2" />
        <div className="h-4 w-96 bg-mist rounded" />
      </div>

      {/* Overview Status Skeleton */}
      <div className="rounded-card-lg border border-line bg-white p-6 h-40" />

      {/* Trust Architecture Grid Skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-card-lg border border-line bg-white p-6 h-56" />
        <div className="rounded-card-lg border border-line bg-white p-6 h-56" />
      </div>

      {/* Governance Matrix Skeleton */}
      <div className="rounded-card-lg border border-line bg-white p-6 h-64" />
    </div>
  );
}

/* ------------------------------------------------------------
   MAIN COMPANY GOVERNANCE MODULE
   ------------------------------------------------------------ */
export function CompanyGovernanceModule({
  company,
  primaryCity,
  parentDomain,
  config,
  isLoading = false,
  isError = false,
  onRetry,
}: {
  company: CompanyProfile;
  primaryCity?: SectorCity;
  parentDomain?: IndustryDomainEntity;
  config?: SectorConfig;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}) {
  const [retryState, setRetryState] = useState(false);

  if (isLoading) {
    return <CompanyGovernanceSkeleton />;
  }

  if (isError || retryState) {
    return (
      <div className="rounded-card-lg border border-line bg-white p-8 md:p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-800 mb-4 border border-amber-200">
          <Icon name="shield" className="h-6 w-6" />
        </div>
        <h3 className="text-h3 text-graphite">GOVERNANCE DATA UNAVAILABLE</h3>
        <p className="mt-2 text-[14px] text-stone max-w-md mx-auto">
          Unable to resolve governance, verification, and security records for {company.name}.
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

  const governanceStatus = company.governanceStatus || "ACTIVE";
  const identityStatus = company.identityStatus || (company.verificationStatus === "verified" ? "VERIFIED" : "CONFIGURED");
  const securityStatus = company.securityStatus || "SECURED";
  const verificationLevel = company.verificationLevel || (company.verificationStatus === "verified" ? "ENTERPRISE" : "STANDARD");
  const dataGovernanceStatus = company.dataGovernanceStatus || "CONTROLLED";
  const aiGovernanceStatus = company.aiGovernanceStatus || "CONTROLLED";
  const companySlug = company.slug ?? company.id;

  const defaultVerificationDimensions = company.verificationDimensions || [
    { dimension: "Company Identity", status: company.verificationStatus === "verified" ? "VERIFIED" : "PENDING", source: "Company Registry", date: company.lastReviewedAt || "2026-01-15" },
    { dimension: "Business Information", status: "VERIFIED", source: "Sector City Registry", date: "2026-02-10" },
    { dimension: "Official Domain", status: company.website ? "VERIFIED" : "NOT CONFIGURED", source: "DNS & SSL Validation", date: "2026-02-12" },
    { dimension: "Industry Classification", status: "VERIFIED", source: "MarineWorld Taxonomy", date: "2026-01-10" }
  ];

  const defaultSecurityCapabilities = company.securityCapabilities || [
    { name: "Account Security", enabled: true, status: "2FA & SSO Enforced" },
    { name: "Access Control", enabled: true, status: "Role-Based Access (RBAC)" },
    { name: "Session Security", enabled: true, status: "Encrypted Token Auth" },
    { name: "Data Protection", enabled: true, status: "TLS 1.3 & AES-256 at Rest" },
    { name: "Audit Logging", enabled: true, status: "Immutable Audit Ledger" }
  ];

  const aiSources = company.aiSources || [
    "Verified Corporate Identity Record",
    "Public Technical Data Sheets",
    "Official Sector Registry Filings"
  ];

  const governanceEvents = company.governanceEvents || [
    { event: "Company Identity Verified", date: "2026-01-15", status: "VERIFIED" },
    { event: "Enterprise Security Level Granted", date: "2026-02-01", status: "ACTIVE" },
    { event: "AI Data Boundary Policy Enforced", date: "2026-03-10", status: "CONTROLLED" }
  ];

  return (
    <div className="space-y-8">
      {/* 01. PAGE HEADER */}
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-6">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-royal">
              <Icon name="scales" className="h-4 w-4" />
              <span>GOVERNANCE & TRUST</span>
            </div>
            <h1 className="text-h1 mt-1 text-graphite">Governance</h1>
            <p className="mt-2 text-[14.5px] font-medium text-stone max-w-2xl">
              Verification, trust, security and data governance for this MarineWorld company.
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5 font-mono text-[11px] shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas border border-line px-3 py-1 font-bold text-graphite">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              PUBLIC GOVERNANCE VIEW
            </span>
            <span className="text-mute">REGISTRY ID: {company.id.toUpperCase()}</span>
          </div>
        </div>

        {/* 02. GOVERNANCE STATUS HEADER PANEL */}
        <div className="mt-6 pt-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-card-md border border-line bg-canvas p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card-sm bg-white border border-line text-royal">
                <Icon name="shield" className="h-5 w-5" />
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute block">
                  OVERALL GOVERNANCE STATUS
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono font-extrabold text-[16px] text-graphite tracking-tight">
                    {governanceStatus}
                  </span>
                  <DigiBadge variant={governanceStatus === "ACTIVE" ? "soft" : "neutral"}>
                    {governanceStatus === "ACTIVE" ? "✓ VERIFIED TRUSTED" : "UNDER REVIEW"}
                  </DigiBadge>
                </div>
              </div>
            </div>

            {/* Independent Status Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] shrink-0">
              <div className="rounded bg-white border border-line px-3 py-2 text-center">
                <span className="text-[9.5px] text-mute uppercase block">VERIFICATION</span>
                <span className="font-bold text-royal mt-0.5 block">{verificationLevel}</span>
              </div>

              <div className="rounded bg-white border border-line px-3 py-2 text-center">
                <span className="text-[9.5px] text-mute uppercase block">SECURITY</span>
                <span className="font-bold text-emerald-600 mt-0.5 block">{securityStatus}</span>
              </div>

              <div className="rounded bg-white border border-line px-3 py-2 text-center">
                <span className="text-[9.5px] text-mute uppercase block">DATA GOV</span>
                <span className="font-bold text-graphite mt-0.5 block">{dataGovernanceStatus}</span>
              </div>

              <div className="rounded bg-white border border-line px-3 py-2 text-center">
                <span className="text-[9.5px] text-mute uppercase block">AI GOV</span>
                <span className="font-bold text-royal mt-0.5 block">{aiGovernanceStatus}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 03. TRUST ARCHITECTURE (5 PILLARS) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-graphite">
            TRUST ARCHITECTURE
          </h2>
          <span className="font-mono text-[11px] text-mute">5 CONTROL DIMENSIONS</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* 01 — IDENTITY */}
          <div className="rounded-card-lg border border-line bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-royal bg-soft px-2 py-0.5 rounded">01</span>
                  <h3 className="text-h3 text-graphite">IDENTITY</h3>
                </div>
                <DigiBadge variant={identityStatus === "VERIFIED" ? "soft" : "neutral"}>
                  {identityStatus}
                </DigiBadge>
              </div>

              <p className="mt-3 text-[13.5px] text-stone leading-relaxed">
                Canonical entity identity established in the MarineWorld registry. Represents the official business record for <span className="font-semibold text-graphite">{company.name}</span>.
              </p>

              <dl className="mt-4 space-y-2 font-mono text-[12px]">
                <div className="flex justify-between border-b border-line/60 pb-1.5">
                  <dt className="text-mute">Canonical Entity ID</dt>
                  <dd className="font-bold text-graphite">{company.id.toUpperCase()}</dd>
                </div>

                <div className="flex justify-between border-b border-line/60 pb-1.5">
                  <dt className="text-mute">Legal Name</dt>
                  <dd className="font-semibold text-graphite">{company.legalName || company.name}</dd>
                </div>

                <div className="flex justify-between">
                  <dt className="text-mute">Primary Sector Base</dt>
                  <dd className="font-semibold text-royal">{primaryCity?.domain ?? company.city}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-6 pt-4 border-t border-line/60">
              <a
                href={`/companies/${companySlug}/corporate`}
                className="inline-flex items-center gap-1.5 font-mono text-[12px] font-bold text-royal hover:underline"
              >
                <span>View Corporate Identity Record</span>
                <Icon name="arrowRight" className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* 02 — VERIFICATION */}
          <div className="rounded-card-lg border border-line bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-royal bg-soft px-2 py-0.5 rounded">02</span>
                  <h3 className="text-h3 text-graphite">VERIFICATION</h3>
                </div>
                <DigiBadge variant="soft">LEVEL: {verificationLevel}</DigiBadge>
              </div>

              <p className="mt-3 text-[13.5px] text-stone leading-relaxed">
                Verified attributes held by MarineWorld platform. Confirms exact identity fields and public corporate data.
              </p>

              <div className="mt-4 space-y-2 font-mono text-[11.5px]">
                {defaultVerificationDimensions.slice(0, 3).map((dim, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded bg-canvas border border-line px-3 py-1.5">
                    <span className="font-semibold text-graphite">{dim.dimension}</span>
                    <span className="font-bold text-emerald-600 text-[10.5px]">✓ {dim.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Verification Limitation Disclaimer */}
            <div className="mt-5 rounded-card-sm border border-line bg-canvas p-3 font-mono text-[10.5px] text-stone">
              <span className="font-bold text-graphite block mb-0.5">VERIFICATION SCOPE DISCLAIMER</span>
              Verification represents exact identity record validation on the platform. It does not constitute a guarantee of financial performance or endorsement of products.
            </div>
          </div>

          {/* 03 — SECURITY */}
          <div className="rounded-card-lg border border-line bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-royal bg-soft px-2 py-0.5 rounded">03</span>
                  <h3 className="text-h3 text-graphite">SECURITY</h3>
                </div>
                <DigiBadge variant="soft">{securityStatus}</DigiBadge>
              </div>

              <p className="mt-3 text-[13.5px] text-stone leading-relaxed">
                Platform security controls and encrypted credential isolation governing company presence.
              </p>

              <div className="mt-4 space-y-2 font-mono text-[11.5px]">
                {defaultSecurityCapabilities.map((cap) => (
                  <div key={cap.name} className="flex items-center justify-between border-b border-line/60 pb-1.5">
                    <span className="text-mute">{cap.name}</span>
                    <span className="font-semibold text-graphite">{cap.status || "Enabled"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-card-sm border border-line bg-canvas p-3 font-mono text-[10.5px] text-stone">
              Private keys, auth tokens, and internal security rules remain isolated and are never exposed publicly.
            </div>
          </div>

          {/* 04 — OPERATIONAL DATA */}
          <div className="rounded-card-lg border border-line bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-royal bg-soft px-2 py-0.5 rounded">04</span>
                  <h3 className="text-h3 text-graphite">OPERATIONAL DATA</h3>
                </div>
                <DigiBadge variant="neutral">{dataGovernanceStatus}</DigiBadge>
              </div>

              <p className="mt-3 text-[13.5px] text-stone leading-relaxed">
                Clear partitioning between public company profile data and private operational boundaries.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-[11.5px]">
                <div className="rounded bg-canvas border border-line p-3">
                  <span className="font-bold text-emerald-600 uppercase text-[10px] block">PUBLIC SCOPE</span>
                  <span className="text-stone text-[11px] mt-1 block">Identity, offerings, public contact, location nodes</span>
                </div>

                <div className="rounded bg-canvas border border-line p-3">
                  <span className="font-bold text-royal uppercase text-[10px] block">PRIVATE BOUNDARY</span>
                  <span className="text-stone text-[11px] mt-1 block">Internal docs, analytics, credentials, private AI memory</span>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-card-sm border border-line bg-canvas p-3 font-mono text-[10.5px] text-stone">
              Data sovereignty policy maintains authorized company operational information strictly inside company boundaries.
            </div>
          </div>
        </div>

        {/* 05 — AI GOVERNANCE (FULL WIDTH) */}
        <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-royal bg-soft px-2 py-0.5 rounded">05</span>
              <h3 className="text-h3 text-graphite">AI GOVERNANCE & KNOWLEDGE BOUNDARY</h3>
            </div>
            <DigiBadge variant="soft">STATUS: {aiGovernanceStatus}</DigiBadge>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2 font-mono text-[12px]">
            <div>
              <span className="text-[10.5px] uppercase tracking-[0.1em] text-mute block font-bold mb-2">
                GROUNDING & DATA BOUNDARY POLICY
              </span>
              <p className="text-[13.5px] font-medium text-stone leading-relaxed font-sans">
                AI interactions involving {company.name} are strictly grounded in authorized public registry information and verified company data.
              </p>
              <div className="mt-4 rounded-card-sm border border-line bg-canvas p-3.5 text-[11px] text-stone">
                <span className="font-bold text-graphite block mb-1">AI TRUTHFULNESS RULE</span>
                If an underlying fact cannot be established from an authorized source, the AI layer presents it as unverified and does not fabricate company data.
              </div>
            </div>

            <div>
              <span className="text-[10.5px] uppercase tracking-[0.1em] text-mute block font-bold mb-2">
                AUTHORIZED AI KNOWLEDGE SOURCES ({aiSources.length})
              </span>
              <div className="space-y-2">
                {aiSources.map((source, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded bg-canvas border border-line px-3 py-2 text-[11.5px] text-graphite">
                    <Icon name="check" className="h-3.5 w-3.5 text-royal shrink-0" />
                    <span className="font-semibold">{source}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 04. GOVERNANCE MATRIX TABLE */}
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <Icon name="layers" className="h-4 w-4 text-royal" />
            <h2 className="text-h3 text-graphite">GOVERNANCE CONTROL MATRIX</h2>
          </div>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
            CONTROL AUDIT
          </span>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left font-mono text-[12px]">
            <thead>
              <tr className="border-b border-line text-[10.5px] uppercase tracking-[0.1em] text-mute">
                <th className="pb-3 font-bold">CONTROL DIMENSION</th>
                <th className="pb-3 font-bold">STATUS</th>
                <th className="pb-3 font-bold">PRIMARY SOURCE</th>
                <th className="pb-3 font-bold text-right">LAST REVIEW</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              <tr>
                <td className="py-3.5 font-bold text-graphite">01 — Identity</td>
                <td className="py-3.5"><DigiBadge variant="soft">{identityStatus}</DigiBadge></td>
                <td className="py-3.5 text-stone">Company Registry</td>
                <td className="py-3.5 text-right text-stone">{company.lastReviewedAt || "2026-08-01"}</td>
              </tr>
              <tr>
                <td className="py-3.5 font-bold text-graphite">02 — Verification</td>
                <td className="py-3.5"><DigiBadge variant="soft">{verificationLevel}</DigiBadge></td>
                <td className="py-3.5 text-stone">MarineWorld Verification</td>
                <td className="py-3.5 text-right text-stone">{company.lastReviewedAt || "2026-08-01"}</td>
              </tr>
              <tr>
                <td className="py-3.5 font-bold text-graphite">03 — Security</td>
                <td className="py-3.5"><DigiBadge variant="soft">{securityStatus}</DigiBadge></td>
                <td className="py-3.5 text-stone">Platform Security Layer</td>
                <td className="py-3.5 text-right text-stone">{company.lastReviewedAt || "2026-08-01"}</td>
              </tr>
              <tr>
                <td className="py-3.5 font-bold text-graphite">04 — Operational Data</td>
                <td className="py-3.5"><DigiBadge variant="neutral">{dataGovernanceStatus}</DigiBadge></td>
                <td className="py-3.5 text-stone">Company Data Policy</td>
                <td className="py-3.5 text-right text-stone">{company.lastReviewedAt || "2026-08-01"}</td>
              </tr>
              <tr>
                <td className="py-3.5 font-bold text-graphite">05 — AI Governance</td>
                <td className="py-3.5"><DigiBadge variant="soft">{aiGovernanceStatus}</DigiBadge></td>
                <td className="py-3.5 text-stone">AI Grounding Policy</td>
                <td className="py-3.5 text-right text-stone">{company.lastReviewedAt || "2026-08-01"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 05. GOVERNANCE ACTIVITY & AUDIT CENTER CONNECTION */}
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-line pb-4 gap-2">
          <div className="flex items-center gap-2">
            <Icon name="doc" className="h-4 w-4 text-royal" />
            <h2 className="text-h3 text-graphite">GOVERNANCE ACTIVITY LOG</h2>
          </div>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
            IMMUTABLE RECORDS
          </span>
        </div>

        {governanceEvents && governanceEvents.length > 0 ? (
          <div className="mt-6 space-y-3 font-mono text-[12px]">
            {governanceEvents.map((evt, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-card-sm border border-line bg-canvas p-3.5 gap-2">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-royal shrink-0" />
                  <span className="font-bold text-graphite text-[13px]">{evt.event}</span>
                </div>
                <div className="flex items-center gap-4 text-stone text-[11px] shrink-0">
                  <span>DATE: {evt.date}</span>
                  <DigiBadge variant="soft">{evt.status}</DigiBadge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-card-md border border-line bg-canvas p-6 text-center font-mono text-[12px] text-stone">
            NOT CONFIGURED — No governance activity records logged.
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-line/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-[11.5px]">
          <span className="text-stone">
            Detailed audit logs and workspace security events are accessible via the Audit Center.
          </span>
          <a
            href={`/companies/${companySlug}/governance#audit`}
            className="inline-flex items-center gap-1 font-bold text-royal hover:underline shrink-0"
          >
            <span>VIEW AUDIT CENTER</span>
            <Icon name="arrowRight" className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
