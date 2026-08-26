import React, { useState } from "react";
import type { SectorConfig } from "@/lib/types";
import {
  ShieldCheck,
  FileText,
  Lock,
  Cookie,
  Mail,
  Building2,
  ChevronRight,
  ArrowLeft,
  Scale,
  Server,
  Award,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  FileCode,
} from "lucide-react";
import { GlobalFooter } from "@/components/foundation/GlobalFooter";

export type LegalDocTab =
  | "terms"
  | "acceptable-use"
  | "intellectual-property"
  | "platform-license"
  | "privacy"
  | "security"
  | "cookies"
  | "contact";

interface InstitutionalLegalPageProps {
  config: SectorConfig;
  initialTab?: LegalDocTab;
  onNavigate?: (path: string) => void;
}

export function InstitutionalLegalPage({
  config,
  initialTab = "terms",
  onNavigate,
}: InstitutionalLegalPageProps) {
  const [activeTab, setActiveTab] = useState<LegalDocTab>(initialTab);

  const navigateTo = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const navItems: { id: LegalDocTab; label: string; icon: React.ElementType }[] = [
    { id: "terms", label: "Terms of Service", icon: FileText },
    { id: "acceptable-use", label: "Acceptable Use Policy", icon: ShieldCheck },
    { id: "intellectual-property", label: "Intellectual Property Policy", icon: Award },
    { id: "platform-license", label: "Platform License", icon: KeyRound },
    { id: "privacy", label: "Privacy Policy (GDPR)", icon: Lock },
    { id: "security", label: "Security Framework", icon: Server },
    { id: "cookies", label: "Cookie Notice", icon: Cookie },
    { id: "contact", label: "Secretariat & Contacts", icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-canvas text-graphite antialiased font-sans flex flex-col justify-between">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-line px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              id="btn-legal-back"
              onClick={() => navigateTo("/")}
              className="p-2 rounded-xl text-stone hover:text-graphite hover:bg-mist transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to MarineWorld
            </button>
            <div className="h-4 w-px bg-line" />
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-royal" />
              <span className="font-mono text-xs font-extrabold uppercase text-graphite tracking-tight">
                Institutional Governance &amp; Legal Framework
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-stone font-mono">
            <span className="hidden sm:inline">EFFECTIVE DATE:</span>
            <strong className="text-graphite">AUGUST 2026</strong>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-10 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Navigation Sidebar */}
          <aside className="lg:col-span-4 xl:col-span-3 space-y-3">
            <div className="p-4 rounded-2xl bg-white border border-line shadow-xs">
              <h2 className="text-xs font-mono font-extrabold text-stone uppercase tracking-wider mb-3">
                Legal Documents
              </h2>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`btn-legal-tab-${item.id}`}
                      onClick={() => {
                        setActiveTab(item.id);
                        window.history.pushState({}, "", `/${item.id}`);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                        isActive
                          ? "bg-royal text-white shadow-2xs"
                          : "text-stone hover:text-graphite hover:bg-mist"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Operating Entity & Framework Badges */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-3">
              <div className="flex items-center gap-2 text-royal font-bold">
                <Building2 className="w-4 h-4 shrink-0" />
                <span>Commercial Operating Entity</span>
              </div>
              <p className="text-graphite font-semibold text-[11.5px] leading-snug">
                Agrento Maritime Worldwide LLC
              </p>
              <p className="text-stone text-[11px] leading-relaxed">
                Wyoming, United States. Operating under exclusive commercial license from DigiOne IP Holding LLC (Sheridan, Wyoming, United States).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
              <div className="flex items-center gap-2 text-royal font-bold">
                <Award className="w-4 h-4 shrink-0" />
                <span>IP Ownership</span>
              </div>
              <p className="text-stone text-[11px] leading-relaxed">
                DigiOne IP Holding LLC (Sheridan, Wyoming, United States) holds exclusive copyright and trademark registrations with the U.S. Copyright Office (USCO).
              </p>
            </div>
          </aside>

          {/* Document Viewport */}
          <article className="lg:col-span-8 xl:col-span-9 bg-white border border-line rounded-3xl p-8 sm:p-12 shadow-xs text-graphite leading-relaxed">
            {/* 1. TERMS OF SERVICE */}
            {activeTab === "terms" && (
              <div className="space-y-8">
                <div className="border-b border-line pb-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-royal/10 text-royal mb-3">
                    <FileText className="w-3.5 h-3.5" />
                    DIGIONE SECTOR CITY BYLAWS &amp; OPERATING TERMS
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-graphite tracking-tight">
                    Institutional Terms of Service
                  </h1>
                  <p className="text-stone text-xs font-mono mt-1 font-semibold">
                    Version 2.4 — Updated August 2026
                  </p>
                </div>

                <div className="prose prose-slate max-w-none text-xs sm:text-sm text-stone space-y-6">
                  <p className="text-graphite leading-relaxed font-medium bg-slate-50 p-4 rounded-xl border border-line">
                    These Terms of Service (&quot;Terms&quot;) constitute a binding agreement between <strong>Agrento Maritime Worldwide LLC</strong>, a Wyoming, United States limited liability company, operating MarineWorld.City under an exclusive commercial license from <strong>DigiOne IP Holding LLC</strong> (Sheridan, Wyoming, United States) (&quot;MarineWorld.City,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;the Registry&quot;), and any enterprise, authority, operator, or individual accessing or using the platform (&quot;Participant,&quot; &quot;Registrant,&quot; or &quot;you&quot;).
                  </p>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">1. Scope of the Platform</h2>
                    <p>
                      MarineWorld.City is a sovereign B2B maritime civic-registry and commercial operating network operated under the DigiOne Sector City Framework. The platform facilitates verified digital operating environments (&quot;Company Studios&quot;), canonical sector registries, digital twins, and structured commercial inquiries (&quot;RFQs&quot;) among accredited maritime enterprises, authorities, and operators.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">2. Definitions</h2>
                    <ul className="list-disc pl-5 space-y-1.5">
                      <li><strong>&quot;Company Studio&quot;</strong> — the private, tenant-scoped operating environment through which a Registrant manages its digital identity, offerings, and commercial interactions.</li>
                      <li><strong>&quot;Sector City&quot;</strong> — a canonical, domain-specific registry environment within MarineWorld.City organizing companies by industry capability.</li>
                      <li><strong>&quot;Digital Twin&quot; / &quot;AI Twin&quot;</strong> — an AI-native interface grounded in a Registrant&apos;s own submitted data.</li>
                      <li><strong>&quot;RFQ&quot;</strong> — a structured Request for Quotation or service inquiry issued through the platform.</li>
                      <li><strong>&quot;Ecosystem Hub&quot;</strong> — the institutional administration environment for Associations, Chambers, Federations, Registries, and Governance Bodies.</li>
                      <li><strong>&quot;Registrant&quot;</strong> — any enterprise or institution operating a Company Studio or institutional profile.</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">3. Eligibility &amp; Account Registration</h2>
                    <p>
                      You must be authorized to act on behalf of the enterprise or institution you represent. Registration requires accurate, current, and complete information. You are responsible for the confidentiality of your credentials and all activity under your account.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">4. Institutional Identity &amp; Verification</h2>
                    <p>
                      Every participant operating a registered Company Studio must undergo domain ownership validation and legal corporate authorization. Misrepresentation of authorized representation or provision of fraudulent marine classification certificates is grounds for immediate registry revocation.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">5. Acceptable Use</h2>
                    <p>
                      See the Acceptable Use Policy, incorporated here by reference, for the complete rules governing platform conduct, security, and compliance.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">6. Commercial Inquiries &amp; Transactions</h2>
                    <p>
                      Commercial offers, RFQs, and lease agreements initiated on MarineWorld.City represent binding intent expressions between sovereign corporate entities. MarineWorld.City provides the infrastructure through which these expressions are exchanged but is not a party to, and does not guarantee the performance of, any resulting agreement between Participants.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">7. Fees, Billing &amp; Payment Processing</h2>
                    <p>
                      Commercial billing for digital properties and platform subscriptions is processed through Stripe, a PCI DSS-compliant payment processor. Payment card data is tokenized by Stripe and does not transit or reside on MarineWorld.City servers. Fees, once paid, are non-refundable except where required by applicable law or expressly stated at purchase.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">8. Intellectual Property &amp; Digital Assets</h2>
                    <p>
                      All intellectual property in the MarineWorld.City platform, including its name, architecture, visual identity, and underlying framework, is owned exclusively by DigiOne IP Holding LLC (Sheridan, Wyoming, United States) and registered with the U.S. Copyright Office. Agrento Maritime Worldwide LLC operates the platform under an exclusive commercial license from DigiOne IP Holding LLC and holds no independent ownership of that IP. Separately, Participants retain full sovereign ownership over all uploaded engineering diagrams, technical specifications, and proprietary data assets — MarineWorld.City and DigiOne IP Holding LLC make no claim over registrant IP, and AI-grounded models access tenant data strictly within designated tenant permissions.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">9. AI-Native Features</h2>
                    <p>
                      Digital Twins and other AI-native features are grounded in Registrant-provided data. MarineWorld.City does not guarantee the accuracy, completeness, or commercial suitability of any AI-generated response; Registrants remain responsible for the accuracy of the data they submit.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">10. Third-Party Services</h2>
                    <p>
                      Your use of integrated third-party services (including payment processors and identity providers) is governed by their own terms.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">11. Disclaimer of Warranties</h2>
                    <p>
                      The platform is provided &quot;as is&quot; and &quot;as available.&quot; To the fullest extent permitted by law, MarineWorld.City disclaims all warranties, express or implied, including merchantability, fitness for a particular purpose, and non-infringement.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">12. Limitation of Liability</h2>
                    <p>
                      To the fullest extent permitted by law, Agrento Maritime Worldwide LLC and DigiOne IP Holding LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from use of the platform or any transaction conducted through it.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">13. Indemnification</h2>
                    <p>
                      You agree to indemnify and hold harmless Agrento Maritime Worldwide LLC, DigiOne IP Holding LLC, and their officers and affiliates from any claim arising from your breach of these Terms, your submitted content, or your use of the platform.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">14. Suspension &amp; Termination</h2>
                    <p>
                      MarineWorld.City may suspend or terminate access, including revocation of registry status, for violation of these Terms, submission of fraudulent information, or conduct threatening platform integrity or security.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">15. Governing Law &amp; Jurisdiction</h2>
                    <p>
                      These Terms are governed by the laws of the State of Wyoming, United States, without regard to conflict-of-law principles. Any legal action shall be brought exclusively in the state or federal courts located in Wyoming, United States.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">16. Force Majeure</h2>
                    <p>
                      Neither party is liable for delay or failure to perform resulting from causes beyond its reasonable control.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">17. Changes to These Terms</h2>
                    <p>
                      MarineWorld.City may update these Terms; material changes are reflected in the &quot;Updated&quot; date above. Continued use after changes take effect constitutes acceptance.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">18. Severability &amp; Entire Agreement</h2>
                    <p>
                      If any provision is found unenforceable, the remaining provisions remain in effect. These Terms, together with the Acceptable Use Policy, Intellectual Property Policy, Platform License, Privacy Policy, Security Framework, and Cookie Notice, constitute the entire agreement.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">19. Assignment</h2>
                    <p>
                      You may not assign your rights under these Terms without prior written consent. MarineWorld.City may assign these Terms in connection with a merger, acquisition, or sale of assets.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">20. Notices &amp; Contact</h2>
                    <p>
                      Questions may be directed to the Registry Secretariat at{" "}
                      <a href="mailto:registry@marineworld.city" className="text-royal font-bold hover:underline">
                        registry@marineworld.city
                      </a>.
                    </p>
                  </section>

                  <div className="pt-6 border-t border-line text-[11px] text-stone font-mono space-y-1">
                    <p>Protected by U.S. copyright law and applicable international intellectual property laws.</p>
                    <p className="font-bold text-graphite">Wyoming · United States</p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. ACCEPTABLE USE POLICY */}
            {activeTab === "acceptable-use" && (
              <div className="space-y-8">
                <div className="border-b border-line pb-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-royal/10 text-royal mb-3">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    PLATFORM INTEGRITY &amp; GOVERNANCE
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-graphite tracking-tight">
                    ACCEPTABLE USE POLICY
                  </h1>
                  <p className="text-stone text-xs font-mono mt-1 font-semibold">
                    Core Business Infrastructure Standards
                  </p>
                </div>

                <div className="prose prose-slate max-w-none text-xs sm:text-sm text-stone space-y-6">
                  <p className="text-graphite font-medium">
                    MarineWorld provides digital business infrastructure only.
                  </p>

                  <div className="bg-slate-50 p-5 rounded-2xl border border-line space-y-3">
                    <p className="font-bold text-graphite text-xs uppercase tracking-wider">
                      MarineWorld does not:
                    </p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone">
                      {[
                        "Participate in negotiations",
                        "Approve commercial agreements",
                        "Verify product quality",
                        "Guarantee supplier performance",
                        "Guarantee customer performance",
                        "Mediate commercial disputes",
                        "Act as an escrow service",
                        "Process payments",
                        "Take commissions from transactions",
                      ].map((item) => (
                        <li key={item} className="flex items-center gap-2 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-stone shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p className="font-medium text-graphite">
                    All commercial relationships exist exclusively between participating organizations.
                  </p>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">Security</h2>
                    <p>Users must not attempt to:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Bypass authentication</li>
                      <li>Share account credentials</li>
                      <li>Access another organization&apos;s workspace</li>
                      <li>Copy confidential business information</li>
                      <li>Reverse engineer platform components</li>
                      <li>Interfere with platform availability</li>
                      <li>Abuse system resources</li>
                    </ul>
                    <p className="pt-2">
                      Organizations are responsible for maintaining the confidentiality of their own credentials and internal access permissions.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">Compliance</h2>
                    <p>All users must comply with applicable:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>International laws</li>
                      <li>National laws</li>
                      <li>Export regulations</li>
                      <li>Import regulations</li>
                      <li>Intellectual property laws</li>
                      <li>Privacy laws</li>
                      <li>Maritime regulations</li>
                      <li>Trade compliance requirements</li>
                    </ul>
                    <p className="pt-2">
                      Each organization is solely responsible for ensuring its own legal compliance.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">Enforcement</h2>
                    <p>MarineWorld reserves the right to:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Remove content</li>
                      <li>Suspend user accounts</li>
                      <li>Suspend organizations</li>
                    </ul>
                    <p className="pt-2">
                      MarineWorld may take these actions without prior notice where necessary to protect platform integrity, security or legal compliance.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">Reporting Violations</h2>
                    <p>Organizations are encouraged to report suspected violations involving:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Intellectual property infringement</li>
                      <li>Trademark misuse</li>
                      <li>Fraudulent organizations</li>
                      <li>False company identities</li>
                      <li>Security incidents</li>
                      <li>Platform abuse</li>
                      <li>Illegal activities</li>
                    </ul>
                    <p className="pt-2">
                      Reports may be submitted through the MarineWorld Compliance Office at{" "}
                      <a href="mailto:security@marineworld.city" className="text-royal font-bold hover:underline">
                        security@marineworld.city
                      </a>.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">Governing Law</h2>
                    <p>
                      This Acceptable Use Policy shall be governed exclusively by the laws of the State of Wyoming, United States. Any dispute relating to this policy shall be subject to the exclusive jurisdiction of the competent courts located in the State of Wyoming, United States.
                    </p>
                  </section>
                </div>
              </div>
            )}

            {/* 3. INTELLECTUAL PROPERTY POLICY */}
            {activeTab === "intellectual-property" && (
              <div className="space-y-8">
                <div className="border-b border-line pb-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-royal/10 text-royal mb-3">
                    <Award className="w-3.5 h-3.5" />
                    USCO REGISTERED INTELLECTUAL PROPERTY
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-graphite tracking-tight">
                    INTELLECTUAL PROPERTY POLICY
                  </h1>
                  <p className="text-stone text-xs font-mono mt-1 font-semibold">
                    Proprietary Framework Ownership &amp; Protections
                  </p>
                </div>

                <div className="prose prose-slate max-w-none text-xs sm:text-sm text-stone space-y-6">
                  <section className="space-y-3">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">
                      Intellectual Property Ownership
                    </h2>
                    <p className="text-graphite leading-relaxed">
                      MarineWorld®, the AI-Native Company Architecture™, Digital Business Identity™, Digital Business Twin™, Company AI™, UPhi.Cloud™, and the complete enterprise operating framework are proprietary intellectual property owned exclusively by <strong>DigiOne IP Holding LLC</strong> (Sheridan, Wyoming, United States).
                    </p>
                    <p>
                      The software architecture, operational methodologies, visual systems, documentation, AI operating concepts, enterprise workflows, and proprietary business framework are protected under United States intellectual property laws and are registered with the United States Copyright Office (USCO).
                    </p>
                    <p>
                      MarineWorld.City is built on the UNIVABIL Protocol™, DigiOne IP Holding LLC&apos;s registered AI-native business interface framework, licensed for operation as a Sector City implementation under the DigiOne Sector City Framework.
                    </p>
                    <p>
                      No portion of the MarineWorld platform, architecture, visual identity, documentation, operational framework or proprietary technology may be copied, reproduced, modified, reverse engineered, redistributed or commercially exploited without prior written authorization from DigiOne IP Holding LLC.
                    </p>
                  </section>

                  <div className="p-5 rounded-2xl bg-slate-50 border border-line space-y-2 text-xs">
                    <div className="font-bold text-graphite">Source of Truth Notice</div>
                    <p className="text-stone">
                      DigiOne IP Holding LLC retains exclusive global ownership of all platform IP. Agrento Maritime Worldwide LLC operates the commercial platform under an exclusive commercial operating license.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 4. PLATFORM LICENSE */}
            {activeTab === "platform-license" && (
              <div className="space-y-8">
                <div className="border-b border-line pb-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-royal/10 text-royal mb-3">
                    <KeyRound className="w-3.5 h-3.5" />
                    COMMERCIAL OPERATING AUTHORIZATION
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-graphite tracking-tight">
                    PLATFORM LICENSE
                  </h1>
                  <p className="text-stone text-xs font-mono mt-1 font-semibold">
                    Exclusive Commercial Operating Grant
                  </p>
                </div>

                <div className="prose prose-slate max-w-none text-xs sm:text-sm text-stone space-y-6">
                  <section className="space-y-3">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">Platform License</h2>
                    <p className="text-graphite leading-relaxed">
                      MarineWorld.city operates under an exclusive commercial operating license granted by <strong>DigiOne IP Holding LLC</strong> (Sheridan, Wyoming, United States) to <strong>Agrento Maritime Worldwide LLC</strong> (Wyoming, United States).
                    </p>
                    <p>
                      This license grants Agrento Maritime Worldwide LLC the right to operate MarineWorld.City as a Sector City implementation of the UNIVABIL Protocol™, in accordance with the DigiOne Sector City Framework.
                    </p>
                    <p>
                      Agrento Maritime Worldwide LLC is the authorized commercial operator responsible for licensing, commercial operations and platform administration.
                    </p>
                    <p>
                      All intellectual property ownership remains exclusively with DigiOne IP Holding LLC.
                    </p>
                    <p>
                      MarineWorld operates through the UPhi.Cloud Enterprise Operating Infrastructure and is fully optimized for the Google Ecosystem.
                    </p>
                  </section>

                  <div className="p-5 rounded-2xl bg-royal/5 border border-royal/20 space-y-2 text-xs">
                    <div className="font-bold text-royal">Authorized Operational Operator</div>
                    <p className="text-stone">
                      <strong>Agrento Maritime Worldwide LLC</strong> · Wyoming, United States · Operating License Ref: DIGIONE-AGRENTO-MW-2026
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 5. PRIVACY POLICY & GDPR */}
            {activeTab === "privacy" && (
              <div className="space-y-8">
                <div className="border-b border-line pb-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-3">
                    <Lock className="w-3.5 h-3.5" />
                    GDPR &amp; GLOBAL DATA PRIVACY COMPLIANCE
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-graphite tracking-tight">
                    Privacy Policy &amp; Data Protection
                  </h1>
                  <p className="text-stone text-xs font-mono mt-1 font-semibold">
                    International Standard Compliance — Updated August 2026
                  </p>
                </div>

                <div className="prose prose-slate max-w-none text-xs sm:text-sm text-stone space-y-6">
                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">1. Who We Are</h2>
                    <p>
                      Agrento Maritime Worldwide LLC, a Wyoming, United States limited liability company, operates MarineWorld.City under license from DigiOne IP Holding LLC (Sheridan, Wyoming, United States). For the purposes of applicable data protection law, Agrento Maritime Worldwide LLC acts as the <strong>Data Controller</strong> for registrant account credentials and as a <strong>Data Processor</strong> for institutional enterprise data spaces managed on behalf of Registrants.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">2. Legal Basis for Processing</h2>
                    <p>We process personal data under the following legal bases, depending on the purpose:</p>
                    <ul className="list-disc pl-5 space-y-1.5">
                      <li><strong>Contractual necessity</strong> (GDPR Art. 6(1)(b)) — to create and operate your account, Company Studio, or institutional profile.</li>
                      <li><strong>Legitimate interest</strong> (GDPR Art. 6(1)(f)) — to maintain platform security, prevent fraud, and operate registry verification.</li>
                      <li><strong>Consent</strong> (GDPR Art. 6(1)(a)) — for optional communications (e.g. marketing updates), where applicable; you may withdraw consent at any time.</li>
                      <li><strong>Legal obligation</strong> (GDPR Art. 6(1)(c)) — where processing is required to comply with applicable law.</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">3. Information We Collect</h2>
                    <ul className="list-disc pl-5 space-y-1.5">
                      <li><strong>Institutional Profile Data:</strong> Enterprise name, IMO/VAT registration IDs, registered port/headquarters address, and verified corporate domains.</li>
                      <li><strong>Authorized Operator Data:</strong> Email address, professional display name, authenticated provider tokens (Google OAuth / Firebase Auth), and role authorization levels.</li>
                      <li><strong>Operational Logs:</strong> Transaction timestamps, audit event hashes, and telemetry logs required for governance verification.</li>
                      <li><strong>Commercial Interaction Data:</strong> RFQs, inquiries, and messages exchanged through the platform between Registrants.</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">4. How We Use AI Features and Automated Processing</h2>
                    <p>
                      MarineWorld.City&apos;s AI Twin and RFQ-routing features process Registrant-provided data to answer inquiries and route commercial requests to matching suppliers. This routing is a matching/discovery function and does not make legal or similarly significant decisions about individuals without human involvement. You may request more information about how a specific AI-assisted match or response was generated by contacting the Registry Secretariat.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">5. International Data Transfers</h2>
                    <p>
                      MarineWorld.City is operated from the United States and serves Registrants and users in multiple countries, including within the European Economic Area (EEA) and United Kingdom. Where personal data is transferred from the EEA/UK to the United States or another country without an adequacy decision, we rely on <span className="font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">[NEEDS INPUT: specify the actual transfer mechanism in place — e.g. Standard Contractual Clauses (SCCs) approved by the European Commission, or another valid GDPR transfer mechanism]</span>. This section must be completed with your actual legal safeguard before this policy is published for EEA/UK users.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">6. EU/UK Representative</h2>
                    <p className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 font-mono text-[11.5px] text-amber-900 leading-relaxed">
                      [NEEDS INPUT: If MarineWorld.City processes personal data of EEA or UK individuals at scale, GDPR Article 27 / UK GDPR may require appointing a representative established in the EU/UK. State the appointed representative&apos;s name and contact details here, or confirm with counsel that this requirement does not apply to your current scale of operations before removing this section.]
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">7. Data Retention</h2>
                    <p>
                      We retain personal data for as long as necessary to provide the platform and fulfill the purposes described in this policy, and thereafter for <span className="font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">[NEEDS INPUT: specify actual retention periods per data category — e.g. account data retained for the duration of an active registration plus a defined period after closure; audit/telemetry logs retained for a defined compliance period]</span> to meet legal, accounting, or reporting obligations.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">8. Sub-Processors &amp; Third-Party Sharing</h2>
                    <p>We share data with a limited number of service providers who process data on our behalf, including:</p>
                    <ul className="list-disc pl-5 space-y-1.5">
                      <li><strong>Stripe</strong> — payment processing (PCI DSS compliant).</li>
                      <li><strong>Google OAuth / Firebase</strong> — authentication services.</li>
                    </ul>
                    <p className="text-[11.5px] font-mono text-amber-800 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/80 mt-2">
                      [NEEDS INPUT: list any additional sub-processors actually in use — e.g. hosting/cloud infrastructure, analytics, email delivery — before publishing, so this list is complete and accurate.]
                    </p>
                    <p className="pt-2 font-medium text-graphite">
                      We do not sell personal data to third parties.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">9. Data Subject Rights</h2>
                    <p>
                      Depending on your jurisdiction, you may have rights to access, rectify, export, restrict, object to, or erase your personal data, and rights related to automated processing. Institutional users possess these rights upon verification of authorized corporate standing. Requests are processed by the Registry Secretariat within 30 days via{" "}
                      <a href="mailto:privacy@marineworld.city" className="text-royal font-bold hover:underline">
                        privacy@marineworld.city
                      </a>.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">10. Regional Privacy Rights</h2>
                    <p>In addition to GDPR (EEA) and UK GDPR rights, residents of certain jurisdictions have additional statutory rights, including:</p>
                    <ul className="list-disc pl-5 space-y-1.5">
                      <li><strong>California, United States</strong> — rights under the CCPA/CPRA, including the right to know, delete, correct, and opt out of the sale/sharing of personal information (MarineWorld.City does not sell personal information).</li>
                      <li><strong>Brazil</strong> — rights under the LGPD.</li>
                      <li><strong>Singapore</strong> — rights under the PDPA.</li>
                    </ul>
                    <p className="text-[11.5px] font-mono text-amber-800 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/80 mt-2">
                      [NEEDS INPUT: as country-specific licensing expands, add the relevant regional privacy law for each newly licensed country.]
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">11. Right to Lodge a Complaint</h2>
                    <p>
                      If you believe your personal data has been processed unlawfully, you have the right to lodge a complaint with your local data protection supervisory authority, in addition to contacting us directly.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">12. Security</h2>
                    <p>
                      Personal data is protected using the measures described in our Security Framework, including tenant-scoped access controls and encrypted payment processing.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">13. Children&apos;s Privacy</h2>
                    <p>
                      MarineWorld.City is a business-to-business platform intended for use by authorized adult representatives of enterprises and institutions. It is not directed to, and we do not knowingly collect personal data from, individuals under the age of 18.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">14. Changes to This Policy</h2>
                    <p>
                      We may update this Privacy Policy from time to time. Material changes will be reflected in the &quot;Updated&quot; date above.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">15. Contact</h2>
                    <p>
                      Data Protection Officer / Privacy inquiries:{" "}
                      <a href="mailto:privacy@marineworld.city" className="text-royal font-bold hover:underline">
                        privacy@marineworld.city
                      </a>
                    </p>
                  </section>

                  <div className="pt-6 border-t border-line text-[11px] text-stone font-mono space-y-1">
                    <p>Protected by U.S. copyright law and applicable international intellectual property laws.</p>
                    <p className="font-bold text-graphite">Wyoming · United States</p>
                  </div>
                </div>
              </div>
            )}

            {/* 6. SECURITY FRAMEWORK */}
            {activeTab === "security" && (
              <div className="space-y-8">
                <div className="border-b border-line pb-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-royal/10 text-royal mb-3">
                    <Server className="w-3.5 h-3.5" />
                    INFORMATION SECURITY FRAMEWORK
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-graphite tracking-tight">
                    Multi-Tenant Architecture &amp; Access Controls
                  </h1>
                  <p className="text-stone text-xs font-mono mt-1 font-semibold">
                    Updated August 2026
                  </p>
                </div>

                <div className="prose prose-slate max-w-none text-xs sm:text-sm text-stone space-y-6">
                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">1. Tenant Isolation</h2>
                    <p>
                      Company data spaces, engineering documents, team member rosters, and commercial records are partitioned by immutable tenant identifiers. MarineWorld.City&apos;s architecture is designed so that no tenant&apos;s data is accessible outside its own authorized context, with authorization checks applied at the data-access layer.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">2. Encrypted Transmission</h2>
                    <p>
                      Data transmitted between your browser and MarineWorld.City is encrypted in transit using industry-standard TLS/HTTPS.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">3. Payment Security</h2>
                    <p>
                      All payment processing is handled through Stripe, a PCI DSS Level-1 certified payment processor. Payment card numbers and security codes are tokenized directly by Stripe and never touch or transit MarineWorld.City application servers.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">4. Authentication</h2>
                    <p>
                      Account access is secured through authenticated identity providers (Google OAuth / Firebase Authentication) rather than platform-managed passwords alone.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">5. Audit Ledger</h2>
                    <p>
                      Governance transitions, verification approvals, and commercial property publications generate structured audit events, including actor identity, timestamp, and prior state, supporting institutional accountability and traceability.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">6. Incident Response</h2>
                    <p>
                      In the event of a confirmed security incident affecting registrant data, MarineWorld.City is committed to notifying affected Registrants and, where legally required, the relevant supervisory authority, without undue delay and in accordance with applicable law.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">7. Responsible Disclosure</h2>
                    <p>
                      If you believe you have found a security vulnerability, please report it to{" "}
                      <a href="mailto:security@marineworld.city" className="text-royal font-bold hover:underline">
                        security@marineworld.city
                      </a>{" "}
                      before any public disclosure. We will acknowledge your report and work to address confirmed issues promptly.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-graphite">8. Contact</h2>
                    <p>
                      Security inquiries:{" "}
                      <a href="mailto:security@marineworld.city" className="text-royal font-bold hover:underline">
                        security@marineworld.city
                      </a>
                    </p>
                  </section>

                  <div className="pt-6 border-t border-line text-[11px] text-stone font-mono space-y-1">
                    <p>Protected by U.S. copyright law and applicable international intellectual property laws.</p>
                    <p className="font-bold text-graphite">Wyoming · United States</p>
                  </div>
                </div>
              </div>
            )}

            {/* 7. COOKIE NOTICE */}
            {activeTab === "cookies" && (
              <div className="space-y-8">
                <div className="border-b border-line pb-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 mb-3">
                    <Cookie className="w-3.5 h-3.5" />
                    COOKIE NOTICE &amp; SESSION STORAGE
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-graphite tracking-tight">
                    Cookie &amp; Storage Policy
                  </h1>
                  <h2 className="text-sm font-semibold text-stone mt-0.5">
                    Transparent Session &amp; Preference Disclosures
                  </h2>
                  <p className="text-stone text-xs font-mono mt-1 font-semibold">
                    Updated August 2026
                  </p>
                </div>

                <div className="prose prose-slate max-w-none text-xs sm:text-sm text-stone space-y-6">
                  <p>
                    MarineWorld.City uses local session storage and essential cookies to maintain secure authenticated sessions and remember workspace preferences. This policy works together with our Privacy Policy, which governs how we handle any personal data collected through these technologies.
                  </p>

                  <section className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-graphite">1. Essential Session Storage</h3>
                    <p>
                      Used for authentication tokens, active company context, and security gating. Required for platform operation — these cannot be disabled without affecting your ability to sign in and use the platform.
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Purpose:</strong> Authentication, session security, tenant context.</li>
                      <li><strong>Type:</strong> First-party, essential.</li>
                      <li><strong>Duration:</strong> Session-based or until sign-out.</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-graphite">2. Workspace Preferences</h3>
                    <p>
                      Used to preserve active filter choices, saved sector cities, and inquiry drafts across browser sessions.
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Purpose:</strong> Functional — remembering your workspace settings.</li>
                      <li><strong>Type:</strong> First-party, functional.</li>
                      <li><strong>Duration:</strong> Persists across sessions until cleared by you or your browser.</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-graphite">3. Analytics</h3>
                    <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 font-mono text-[11.5px] text-amber-900 leading-relaxed space-y-2">
                      <p>
                        <strong>[NEEDS RESOLUTION — see note below.]</strong> If applicable: MarineWorld.City uses <span className="underline decoration-amber-500 font-bold">[NEEDS INPUT: name the actual analytics tool, e.g. Google Analytics]</span> to understand aggregate platform usage. These cookies are only set with your consent via the cookie consent banner and can be withdrawn at any time.
                      </p>
                      <p>
                        If not applicable: this section and the corresponding &quot;Analytics&quot; option in the consent banner should be removed.
                      </p>
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-graphite">4. Third-Party Advertising Cookies</h3>
                    <p>
                      MarineWorld.City does not use third-party advertising or cross-site tracking cookies.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-graphite">5. Managing Your Preferences</h3>
                    <p>
                      You can manage your cookie and storage preferences at any time through the consent banner shown on your first visit, or by adjusting your browser&apos;s storage/cookie settings directly. Disabling essential storage will prevent you from remaining signed in.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-graphite">6. Changes to This Policy</h3>
                    <p>
                      We may update this Cookie Notice from time to time. Material changes will be reflected in the &quot;Updated&quot; date above.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-graphite">7. Contact</h3>
                    <p>
                      Questions about this policy may be directed to{" "}
                      <a href="mailto:registry@marineworld.city" className="text-royal font-bold hover:underline">
                        registry@marineworld.city
                      </a>.
                    </p>
                  </section>

                  <div className="pt-6 border-t border-line text-[11px] text-stone font-mono space-y-1">
                    <p>Protected by U.S. copyright law and applicable international intellectual property laws.</p>
                    <p className="font-bold text-graphite">Wyoming · United States</p>
                  </div>
                </div>
              </div>
            )}

            {/* 8. CONTACT & SECRETARIAT */}
            {activeTab === "contact" && (
              <div className="space-y-8">
                <div className="border-b border-line pb-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-royal/10 text-royal mb-3">
                    <Mail className="w-3.5 h-3.5" />
                    REGISTRY SECRETARIAT &amp; SUPPORT DESK
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-graphite tracking-tight">
                    Institutional Contacts
                  </h1>
                  <p className="text-stone text-xs font-mono mt-1 font-semibold">
                    Official Communications &amp; Legal Notifications
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-5 rounded-2xl bg-canvas border border-line space-y-2">
                    <div className="font-mono text-[11px] font-bold text-stone uppercase">General Registry Inquiries</div>
                    <div className="font-bold text-graphite">Registry Secretariat</div>
                    <a href="mailto:registry@marineworld.city" className="text-royal hover:underline text-xs block font-mono font-semibold">
                      registry@marineworld.city
                    </a>
                  </div>

                  <div className="p-5 rounded-2xl bg-canvas border border-line space-y-2">
                    <div className="font-mono text-[11px] font-bold text-stone uppercase">Data Protection Officer (DPO)</div>
                    <div className="font-bold text-graphite">Privacy &amp; GDPR Compliance</div>
                    <a href="mailto:privacy@marineworld.city" className="text-royal hover:underline text-xs block font-mono font-semibold">
                      privacy@marineworld.city
                    </a>
                  </div>

                  <div className="p-5 rounded-2xl bg-canvas border border-line space-y-2">
                    <div className="font-mono text-[11px] font-bold text-stone uppercase">Commercial Operations</div>
                    <div className="font-bold text-graphite">Billing &amp; Property Leases</div>
                    <a href="mailto:commercial@marineworld.city" className="text-royal hover:underline text-xs block font-mono font-semibold">
                      commercial@marineworld.city
                    </a>
                  </div>

                  <div className="p-5 rounded-2xl bg-canvas border border-line space-y-2">
                    <div className="font-mono text-[11px] font-bold text-stone uppercase">Security &amp; Abuse Response</div>
                    <div className="font-bold text-graphite">Trust &amp; Safety Desk</div>
                    <a href="mailto:security@marineworld.city" className="text-royal hover:underline text-xs block font-mono font-semibold">
                      security@marineworld.city
                    </a>
                  </div>
                </div>

                <div className="mt-8 p-6 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="font-bold text-graphite">Legal Entity &amp; Operating Headquarters</div>
                  <p className="text-stone">
                    <strong>Agrento Maritime Worldwide LLC</strong>
                    <br />
                    State of Wyoming, United States
                    <br />
                    Commercial Operator of MarineWorld.City under Exclusive License from DigiOne IP Holding LLC (Sheridan, Wyoming, United States)
                  </p>
                </div>
              </div>
            )}
          </article>
        </div>
      </main>

      {/* Footer */}
      <GlobalFooter config={config} tone="dark" />
    </div>
  );
}
